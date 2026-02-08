// apps/backend-nest/src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { pool } from '../db/pool';
import { getSecretJson, getSecret, secretExists } from '../config/secrets';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  [key: string]: any;
};

// Lazy Firebase initialization
let firebaseInitialized = false;
let firebaseProjectId: string | null = null;
let expectedSenderId: string | null = null;
let iosBundleId: string = '';

function initializeFirebase(): void {
  if (firebaseInitialized) return;

  let credential: admin.credential.Credential;
  let projectIdFromKey = 'n/a';

  if (secretExists('FIREBASE_SERVICE_ACCOUNT_JSON')) {
    const json = getSecretJson<FirebaseServiceAccount>(
      'FIREBASE_SERVICE_ACCOUNT_JSON',
    );
    projectIdFromKey = json.project_id || 'n/a';
    credential = admin.credential.cert(json as admin.ServiceAccount);
  } else {
    throw new Error(
      'Firebase Admin credentials missing. Expected FIREBASE_SERVICE_ACCOUNT_JSON secret.',
    );
  }

  // Optional config secrets
  if (secretExists('FIREBASE_PROJECT_ID')) {
    firebaseProjectId = getSecret('FIREBASE_PROJECT_ID');
  }
  if (secretExists('FIREBASE_MESSAGING_SENDER_ID')) {
    expectedSenderId = getSecret('FIREBASE_MESSAGING_SENDER_ID');
  }
  if (secretExists('IOS_BUNDLE_ID')) {
    iosBundleId = getSecret('IOS_BUNDLE_ID');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential,
      projectId: firebaseProjectId || projectIdFromKey || undefined,
    });
  }

  firebaseInitialized = true;
}

function getApnsTopic(): string {
  if (!firebaseInitialized) initializeFirebase();
  return iosBundleId;
}

function getExpectedSenderId(): string | null {
  if (!firebaseInitialized) initializeFirebase();
  return expectedSenderId;
}

function getFirebaseProjectId(): string | null {
  if (!firebaseInitialized) initializeFirebase();
  return firebaseProjectId;
}

// helper: FCM requires string map for "data"
function toStringMap(obj?: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!obj) return out;
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v == null ? '' : String(v);
  }
  return out;
}

@Injectable()
export class NotificationsService {
  constructor() {
    // Defer Firebase init to first use
  }

  private ensureFirebase(): void {
    initializeFirebase();
  }

  // ── Register token ────────────────────────────────────────
  async registerToken(dto: {
    user_id: string;
    device_token: string;
    platform: 'ios' | 'android';
    sender_id?: string;
    project_id?: string;
  }) {
    const { user_id, device_token, platform, sender_id, project_id } = dto;

    if (!user_id || !device_token) {
      return { ok: false, error: 'user_id and device_token are required' };
    }

    const expSenderId = getExpectedSenderId();
    if (expSenderId && sender_id && sender_id !== expSenderId) {
      console.warn(
        `⚠️ sender_id mismatch; expected=${expSenderId} got=${sender_id}`,
      );
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        user_id    uuid    NOT NULL,
        token      text    NOT NULL,
        platform   text    NOT NULL,
        sender_id  text,
        project_id text,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_push_tokens_user_token
      ON push_tokens (user_id, token);
    `);

    // Delete any existing token for this user+platform
    await pool.query(
      `DELETE FROM push_tokens WHERE user_id=$1 AND platform=$2`,
      [user_id, platform],
    );

    // Also delete this token if it belongs to a different user (device switched accounts)
    await pool.query(`DELETE FROM push_tokens WHERE token=$1 AND user_id!=$2`, [
      device_token,
      user_id,
    ]);

    const res = await pool.query(
      `
      INSERT INTO push_tokens (user_id, token, platform, sender_id, project_id, updated_at)
      VALUES ($1,$2,$3,$4,$5,now())
      ON CONFLICT (user_id, token)
      DO UPDATE SET
        platform   = EXCLUDED.platform,
        sender_id  = COALESCE(EXCLUDED.sender_id,  push_tokens.sender_id),
        project_id = COALESCE(EXCLUDED.project_id, push_tokens.project_id),
        updated_at = now()
      RETURNING user_id, token, platform, sender_id, project_id, updated_at;
      `,
      [user_id, device_token, platform, sender_id ?? null, project_id ?? null],
    );

    return { ok: true, token: res.rows[0] };
  }

  // ── Preferences ───────────────────────────────────────────
  async upsertPreferences(p: {
    user_id: string;
    push_enabled?: boolean;
    following_realtime?: boolean;
    brands_realtime?: boolean;
    breaking_realtime?: boolean;
    digest_hour?: number;
  }) {
    const {
      user_id,
      push_enabled = true,
      following_realtime = false,
      brands_realtime = false,
      breaking_realtime = true,
      digest_hour = 8,
    } = p;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id uuid PRIMARY KEY,
        push_enabled boolean,
        following_realtime boolean,
        brands_realtime boolean,
        breaking_realtime boolean,
        digest_hour int
      );
    `);

    await pool.query(
      `
      INSERT INTO notification_preferences (user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (user_id)
      DO UPDATE SET
        push_enabled=$2,
        following_realtime=$3,
        brands_realtime=$4,
        breaking_realtime=$5,
        digest_hour=$6;
      `,
      [
        user_id,
        push_enabled,
        following_realtime,
        brands_realtime,
        breaking_realtime,
        digest_hour,
      ],
    );

    return { ok: true };
  }

  async getPreferences(user_id: string) {
    const { rows } = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [user_id],
    );
    return rows[0] ?? null;
  }

  // ── Follows ───────────────────────────────────────────────
  async getFollows(user_id: string) {
    await this.ensureFollowTables();
    const { rows } = await pool.query(
      `SELECT value AS source FROM follow_subscriptions WHERE user_id=$1 AND kind='source' ORDER BY value ASC`,
      [user_id],
    );
    return { sources: rows.map((r) => r.source) };
  }

  async follow(user_id: string, source: string) {
    await this.ensureFollowTables();
    const key = (source || '').trim();
    if (!key) return { ok: false };
    await pool.query(
      `INSERT INTO follow_subscriptions (user_id, kind, value)
       VALUES ($1,'source',$2)
       ON CONFLICT (user_id, kind, value) DO NOTHING`,
      [user_id, key],
    );
    return { ok: true };
  }

  async unfollow(user_id: string, source: string) {
    await this.ensureFollowTables();
    await pool.query(
      `DELETE FROM follow_subscriptions WHERE user_id=$1 AND kind='source' AND value=$2`,
      [user_id, (source || '').trim()],
    );
    return { ok: true };
  }

  private async ensureFollowTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follow_subscriptions (
        user_id uuid NOT NULL,
        kind    text NOT NULL,
        value   text NOT NULL,
        PRIMARY KEY (user_id, kind, value)
      );
    `);
  }

  // ── Token helpers ─────────────────────────────────────────
  async findTokensForUser(user_id: string) {
    const { rows } = await pool.query(
      `SELECT token, platform, sender_id, project_id, updated_at
         FROM push_tokens
        WHERE user_id = $1
        ORDER BY updated_at DESC`,
      [user_id],
    );
    return rows;
  }

  // ── Send push to a user (used by /test and production) ────
  async sendPushToUser(
    user_id: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    this.ensureFirebase();

    const prefs = await this.getPreferences(user_id);
    if (prefs && prefs.push_enabled === false) {
      console.log('🔕 push disabled by preferences');
      return { sent: 0, detail: [] };
    }

    const tokens = await this.findTokensForUser(user_id);
    // console.log(
    //   '📦 found tokens',
    //   tokens.map((t) => ({ token: t.token.slice(0, 24) + '…' })),
    // );
    if (!tokens.length) return { sent: 0, detail: [] };

    let sent = 0;
    const detail: Array<{ token: string; ok: boolean; err?: string }> = [];

    for (const t of tokens) {
      const res = await this.sendToToken(t.token, { title, body, data });
      if (res.ok) sent++;
      else {
        const m = (res.error || '').toLowerCase();
        if (
          m.includes('senderid mismatch') ||
          m.includes('mismatched-credential') ||
          m.includes('registration-token-not-registered') ||
          m.includes('invalid-argument')
        ) {
          await pool.query(`DELETE FROM push_tokens WHERE token = $1`, [
            t.token,
          ]);
          // console.log('🗑️ Deleted stale FCM token:', t.token.slice(0, 24) + '…');
        }
      }
      detail.push({ token: t.token, ok: res.ok, err: res.error });
    }
    return { sent, detail };
  }

  // ── Notify everyone who follows a source ──────────────────
  async notifyFollowersOfSourceArticle(input: {
    source: string;
    title: string;
    url?: string;
    image?: string;
  }) {
    const { source, title, url, image } = input;
    await this.ensureFollowTables();

    const { rows: users } = await pool.query(
      `
      SELECT u.user_id
      FROM follow_subscriptions u
      JOIN notification_preferences p ON p.user_id = u.user_id
      WHERE u.kind='source'
        AND u.value = $1
        AND COALESCE(p.push_enabled, true) = true
        AND COALESCE(p.following_realtime, false) = true
      `,
      [source],
    );

    let total = 0;
    for (const u of users) {
      const res = await this.sendPushToUser(
        u.user_id,
        `New from ${source}`,
        title,
        {
          type: 'article',
          source,
          title,
          url: url ?? '',
          image: image ?? '',
        },
      );
      total += res.sent;
    }
    return { followers: users.length, notifications_sent: total };
  }

  // ── Build FCM messages ────────────────────────────────────
  private buildAlertMessage(
    token: string,
    payload: PushPayload,
  ): admin.messaging.Message {
    const apnsTopic = getApnsTopic();
    return {
      token,
      notification: { title: payload.title, body: payload.body },
      data: toStringMap(payload.data),
      android: {
        priority: 'high',
        notification: { sound: 'default' },
      },
      apns: {
        headers: {
          'apns-push-type': 'alert',
          'apns-priority': '10',
          ...(apnsTopic ? { 'apns-topic': apnsTopic } : {}),
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: 'default',
            'mutable-content': 1,
          },
        },
      },
    };
  }

  private buildBackgroundDataMessage(
    token: string,
    payload: PushPayload,
  ): admin.messaging.Message {
    const apnsTopic = getApnsTopic();
    return {
      token,
      data: toStringMap({
        title: payload.title,
        message: payload.body,
        ...(payload.data ?? {}),
        _kind: 'background_persist',
      }),
      android: {
        priority: 'high',
      },
      apns: {
        headers: {
          'apns-push-type': 'background',
          'apns-priority': '5',
          ...(apnsTopic ? { 'apns-topic': apnsTopic } : {}),
        },
        payload: {
          aps: {
            'content-available': 1,
          },
        },
      },
    };
  }

  // ── Raw send via Firebase ────────────────────────────────
  private async sendToToken(
    token: string,
    payload: PushPayload,
  ): Promise<{ ok: boolean; error?: string }> {
    this.ensureFirebase();
    try {
      // Only send alert message - background data message was causing duplicates
      const alertMsg = this.buildAlertMessage(token, payload);
      const id1 = await admin.messaging().send(alertMsg);

      // console.log('✅ FCM sent (alert):', { id1 });
      return { ok: true };
    } catch (e: any) {
      console.error('❌ FCM Messaging error:', e);

      // Auto-cleanup invalid/expired tokens
      const errorCode = e?.errorInfo?.code;
      if (
        errorCode === 'messaging/registration-token-not-registered' ||
        errorCode === 'messaging/invalid-registration-token'
      ) {
        console.log(
          '🗑️ Removing invalid FCM token:',
          token.slice(0, 20) + '...',
        );
        await pool.query('DELETE FROM push_tokens WHERE token = $1', [token]);
      }

      const msg: string =
        e?.errorInfo?.message ||
        e?.message ||
        e?.toString?.() ||
        'Unknown error';
      return { ok: false, error: msg };
    }
  }

  async saveInboxItem(n: any) {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id text PRIMARY KEY,
      user_id uuid NOT NULL,
      title text,
      message text NOT NULL,
      timestamp timestamptz NOT NULL,
      category text,
      deeplink text,
      data jsonb,
      read boolean DEFAULT false
    );
  `);

    await pool.query(
      `
    INSERT INTO user_notifications (id, user_id, title, message, timestamp, category, deeplink, data, read)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (id) DO UPDATE SET
      read = COALESCE($9, user_notifications.read)
    `,
      [
        n.id,
        n.user_id,
        n.title,
        n.message,
        n.timestamp,
        n.category,
        n.deeplink,
        n.data || {},
        n.read ?? false,
      ],
    );

    return { ok: true };
  }

  async getInboxItems(user_id: string) {
    const result = await pool.query(
      `SELECT id, title, message, timestamp, category, deeplink, data, read
       FROM user_notifications
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT 200`,
      [user_id],
    );
    return result.rows;
  }

  async markRead(user_id: string, id: string) {
    await pool.query(
      `UPDATE user_notifications SET read = true WHERE user_id = $1 AND id = $2`,
      [user_id, id],
    );
    return { ok: true };
  }

  async markAllRead(user_id: string) {
    await pool.query(
      `UPDATE user_notifications SET read = true WHERE user_id = $1`,
      [user_id],
    );
    return { ok: true };
  }

  async clearAll(user_id: string) {
    await pool.query(`DELETE FROM user_notifications WHERE user_id = $1`, [
      user_id,
    ]);
    return { ok: true };
  }

  async deleteItem(user_id: string, id: string) {
    await pool.query(
      `DELETE FROM user_notifications WHERE user_id = $1 AND id = $2`,
      [user_id, id],
    );
    return { ok: true };
  }

  // ── Debug ────────────────────────────────────────────────
  async debug(user_id?: string) {
    this.ensureFirebase();
    const appOpts: any = (admin as any).app().options || {};
    const cfg = {
      adminProjectId: getFirebaseProjectId() || appOpts.projectId,
      senderIdExpected: getExpectedSenderId() || '(unset)',
      iosBundleId: getApnsTopic() || '(unset)',
    };

    let tokens: any[] = [];
    if (user_id) tokens = await this.findTokensForUser(user_id);

    const tokensRedacted = tokens.map((t) => ({
      ...t,
      token: t.token.slice(0, 12) + '…',
    }));
    const distinctSenderIds = [
      ...new Set(tokens.map((t) => t.sender_id || '(null)')),
    ];
    return {
      cfg,
      tokenCount: tokens.length,
      distinctSenderIds,
      tokens: tokensRedacted,
    };
  }
}
