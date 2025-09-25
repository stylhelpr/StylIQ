// apps/backend-nest/src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Firebase Admin init ────────────────────────────────────
// ✅ Always prefer new secret path first, fallback to legacy vars
const FIREBASE_SERVICE_ACCOUNT =
  process.env.NOTIFICATIONS_FIREBASE2 ||
  process.env.NOTIFICATIONS_FIREBASE ||
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const EXPECTED_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID;
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || '';

if (!admin.apps.length) {
  let credential: admin.credential.Credential | undefined;
  let loadedPath = 'n/a';
  let projectIdFromKey = 'n/a';

  if (FIREBASE_SERVICE_ACCOUNT) {
    // ✅ Assume env var is already a full path — do NOT join/calc
    loadedPath = FIREBASE_SERVICE_ACCOUNT;
    const json = JSON.parse(fs.readFileSync(loadedPath, 'utf8'));
    projectIdFromKey = json.project_id || 'n/a';
    credential = admin.credential.cert(json);
  } else {
    throw new Error('Firebase Admin credentials missing.');
  }

  admin.initializeApp({
    credential,
    projectId: FIREBASE_PROJECT_ID || undefined,
  });

  const appOpts: any = (admin as any).app().options || {};
  console.log('🔐 Firebase Admin initialized', {
    loadedPath,
    adminProjectId:
      FIREBASE_PROJECT_ID || appOpts.projectId || projectIdFromKey,
    keyProjectId: projectIdFromKey,
    senderIdExpected: EXPECTED_SENDER_ID ?? 'n/a',
    iosBundleId: IOS_BUNDLE_ID || '(unset)',
  });
}

// ── APNs topic (bundle id) for iOS ─────────────────────────
const APNS_TOPIC = IOS_BUNDLE_ID || ''; // e.g., 'com.stylhelpr.stylhelpr'

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
  // ── Register token ────────────────────────────────────────
  async registerToken(dto: {
    user_id: string;
    device_token: string;
    platform: 'ios' | 'android';
    sender_id?: string;
    project_id?: string;
  }) {
    const { user_id, device_token, platform, sender_id, project_id } = dto;

    console.log('📥 registerToken called with', {
      user_id,
      platform,
      sender_id,
      project_id,
      token_prefix: device_token?.slice(0, 12) + '…',
    });

    if (!user_id || !device_token) {
      return { ok: false, error: 'user_id and device_token are required' };
    }

    if (EXPECTED_SENDER_ID && sender_id && sender_id !== EXPECTED_SENDER_ID) {
      console.warn(
        `⚠️ sender_id mismatch; expected=${EXPECTED_SENDER_ID} got=${sender_id}`,
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

    await pool.query(
      `DELETE FROM push_tokens WHERE user_id=$1 AND platform=$2`,
      [user_id, platform],
    );

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

    console.log('✅ token upserted:', {
      user_id: res.rows[0]?.user_id,
      token_prefix: res.rows[0]?.token?.slice(0, 12) + '…',
      platform: res.rows[0]?.platform,
      sender_id: res.rows[0]?.sender_id,
      project_id: res.rows[0]?.project_id,
    });

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
    const prefs = await this.getPreferences(user_id);
    if (prefs && prefs.push_enabled === false) {
      console.log('🔕 push disabled by preferences');
      return { sent: 0, detail: [] };
    }

    const tokens = await this.findTokensForUser(user_id);
    console.log(
      '📦 found tokens',
      tokens.map((t) => ({ token: t.token.slice(0, 24) + '…' })),
    );
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
          ...(APNS_TOPIC ? { 'apns-topic': APNS_TOPIC } : {}),
        },
        payload: {
          aps: { sound: 'default' },
        },
      },
    };
  }

  private buildBackgroundDataMessage(
    token: string,
    payload: PushPayload,
  ): admin.messaging.Message {
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
          ...(APNS_TOPIC ? { 'apns-topic': APNS_TOPIC } : {}),
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
    try {
      const alertMsg = this.buildAlertMessage(token, payload);
      const id1 = await admin.messaging().send(alertMsg);

      const bgMsg = this.buildBackgroundDataMessage(token, payload);
      const id2 = await admin.messaging().send(bgMsg);

      console.log('✅ FCM sent (alert, bg):', { id1, id2 });
      return { ok: true };
    } catch (e: any) {
      console.error('❌ FCM Messaging error:', e);
      const msg: string =
        e?.errorInfo?.message ||
        e?.message ||
        e?.toString?.() ||
        'Unknown error';
      return { ok: false, error: msg };
    }
  }

  // ── Debug ────────────────────────────────────────────────
  async debug(user_id?: string) {
    const appOpts: any = (admin as any).app().options || {};
    const cfg = {
      adminProjectId: FIREBASE_PROJECT_ID || appOpts.projectId,
      senderIdExpected: EXPECTED_SENDER_ID || '(unset)',
      iosBundleId: IOS_BUNDLE_ID || '(unset)',
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

///////////////////////

// // apps/backend-nest/src/notifications/notifications.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import * as admin from 'firebase-admin';
// import * as fs from 'fs';
// import * as path from 'path';

// type PushPayload = {
//   title: string;
//   body: string;
//   data?: Record<string, string | number | boolean | null | undefined>;
// };

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ── Firebase Admin init ────────────────────────────────────
// const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
// const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
// const EXPECTED_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID;
// const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || '';

// if (!admin.apps.length) {
//   let credential: admin.credential.Credential | undefined;
//   let loadedPath = 'n/a';
//   let projectIdFromKey = 'n/a';

//   if (FIREBASE_SERVICE_ACCOUNT) {
//     const p = path.isAbsolute(FIREBASE_SERVICE_ACCOUNT)
//       ? FIREBASE_SERVICE_ACCOUNT
//       : path.join(process.cwd(), FIREBASE_SERVICE_ACCOUNT);
//     loadedPath = p;
//     const json = JSON.parse(fs.readFileSync(p, 'utf8'));
//     projectIdFromKey = json.project_id || 'n/a';
//     credential = admin.credential.cert(json);
//   } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//     loadedPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
//     credential = admin.credential.applicationDefault();
//   } else {
//     throw new Error('Firebase Admin credentials missing.');
//   }

//   admin.initializeApp({
//     credential,
//     projectId: FIREBASE_PROJECT_ID || undefined,
//   });

//   const appOpts: any = (admin as any).app().options || {};
//   console.log('🔐 Firebase Admin initialized', {
//     loadedPath,
//     adminProjectId:
//       FIREBASE_PROJECT_ID || appOpts.projectId || projectIdFromKey,
//     keyProjectId: projectIdFromKey,
//     senderIdExpected: EXPECTED_SENDER_ID ?? 'n/a',
//     iosBundleId: IOS_BUNDLE_ID || '(unset)',
//   });
// }

// // ── APNs topic (bundle id) for iOS ─────────────────────────
// const APNS_TOPIC = IOS_BUNDLE_ID || ''; // e.g., 'com.stylhelpr.stylhelpr'

// // helper: FCM requires string map for "data"
// function toStringMap(obj?: Record<string, any>): Record<string, string> {
//   const out: Record<string, string> = {};
//   if (!obj) return out;
//   for (const [k, v] of Object.entries(obj)) {
//     out[k] = v == null ? '' : String(v);
//   }
//   return out;
// }

// @Injectable()
// export class NotificationsService {
//   // ── Register token ────────────────────────────────────────
//   async registerToken(dto: {
//     user_id: string;
//     device_token: string;
//     platform: 'ios' | 'android';
//     sender_id?: string;
//     project_id?: string;
//   }) {
//     const { user_id, device_token, platform, sender_id, project_id } = dto;

//     console.log('📥 registerToken called with', {
//       user_id,
//       platform,
//       sender_id,
//       project_id,
//       token_prefix: device_token?.slice(0, 12) + '…',
//     });

//     if (!user_id || !device_token) {
//       return { ok: false, error: 'user_id and device_token are required' };
//     }

//     if (EXPECTED_SENDER_ID && sender_id && sender_id !== EXPECTED_SENDER_ID) {
//       console.warn(
//         `⚠️ sender_id mismatch; expected=${EXPECTED_SENDER_ID} got=${sender_id}`,
//       );
//     }

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS push_tokens (
//         user_id    uuid    NOT NULL,
//         token      text    NOT NULL,
//         platform   text    NOT NULL,
//         sender_id  text,
//         project_id text,
//         updated_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);
//     await pool.query(`
//       CREATE UNIQUE INDEX IF NOT EXISTS ux_push_tokens_user_token
//       ON push_tokens (user_id, token);
//     `);

//     // Keep one token per user & platform to avoid stale tokens
//     await pool.query(
//       `DELETE FROM push_tokens WHERE user_id=$1 AND platform=$2`,
//       [user_id, platform],
//     );

//     const res = await pool.query(
//       `
//       INSERT INTO push_tokens (user_id, token, platform, sender_id, project_id, updated_at)
//       VALUES ($1,$2,$3,$4,$5,now())
//       ON CONFLICT (user_id, token)
//       DO UPDATE SET
//         platform   = EXCLUDED.platform,
//         sender_id  = COALESCE(EXCLUDED.sender_id,  push_tokens.sender_id),
//         project_id = COALESCE(EXCLUDED.project_id, push_tokens.project_id),
//         updated_at = now()
//       RETURNING user_id, token, platform, sender_id, project_id, updated_at;
//       `,
//       [user_id, device_token, platform, sender_id ?? null, project_id ?? null],
//     );

//     console.log('✅ token upserted:', {
//       user_id: res.rows[0]?.user_id,
//       token_prefix: res.rows[0]?.token?.slice(0, 12) + '…',
//       platform: res.rows[0]?.platform,
//       sender_id: res.rows[0]?.sender_id,
//       project_id: res.rows[0]?.project_id,
//     });

//     return { ok: true, token: res.rows[0] };
//   }

//   // ── Preferences ───────────────────────────────────────────
//   async upsertPreferences(p: {
//     user_id: string;
//     push_enabled?: boolean;
//     following_realtime?: boolean;
//     brands_realtime?: boolean;
//     breaking_realtime?: boolean;
//     digest_hour?: number;
//   }) {
//     const {
//       user_id,
//       push_enabled = true,
//       following_realtime = false,
//       brands_realtime = false,
//       breaking_realtime = true,
//       digest_hour = 8,
//     } = p;

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS notification_preferences (
//         user_id uuid PRIMARY KEY,
//         push_enabled boolean,
//         following_realtime boolean,
//         brands_realtime boolean,
//         breaking_realtime boolean,
//         digest_hour int
//       );
//     `);

//     await pool.query(
//       `
//       INSERT INTO notification_preferences (user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour)
//       VALUES ($1,$2,$3,$4,$5,$6)
//       ON CONFLICT (user_id)
//       DO UPDATE SET
//         push_enabled=$2,
//         following_realtime=$3,
//         brands_realtime=$4,
//         breaking_realtime=$5,
//         digest_hour=$6;
//       `,
//       [
//         user_id,
//         push_enabled,
//         following_realtime,
//         brands_realtime,
//         breaking_realtime,
//         digest_hour,
//       ],
//     );

//     return { ok: true };
//   }

//   async getPreferences(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT * FROM notification_preferences WHERE user_id = $1`,
//       [user_id],
//     );
//     return rows[0] ?? null;
//   }

//   // ── Follows ───────────────────────────────────────────────
//   async getFollows(user_id: string) {
//     await this.ensureFollowTables();
//     const { rows } = await pool.query(
//       `SELECT value AS source FROM follow_subscriptions WHERE user_id=$1 AND kind='source' ORDER BY value ASC`,
//       [user_id],
//     );
//     return { sources: rows.map((r) => r.source) };
//   }

//   async follow(user_id: string, source: string) {
//     await this.ensureFollowTables();
//     const key = (source || '').trim();
//     if (!key) return { ok: false };
//     await pool.query(
//       `INSERT INTO follow_subscriptions (user_id, kind, value)
//        VALUES ($1,'source',$2)
//        ON CONFLICT (user_id, kind, value) DO NOTHING`,
//       [user_id, key],
//     );
//     return { ok: true };
//   }

//   async unfollow(user_id: string, source: string) {
//     await this.ensureFollowTables();
//     await pool.query(
//       `DELETE FROM follow_subscriptions WHERE user_id=$1 AND kind='source' AND value=$2`,
//       [user_id, (source || '').trim()],
//     );
//     return { ok: true };
//   }

//   private async ensureFollowTables() {
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS follow_subscriptions (
//         user_id uuid NOT NULL,
//         kind    text NOT NULL,
//         value   text NOT NULL,
//         PRIMARY KEY (user_id, kind, value)
//       );
//     `);
//   }

//   // ── Token helpers ─────────────────────────────────────────
//   async findTokensForUser(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT token, platform, sender_id, project_id, updated_at
//          FROM push_tokens
//         WHERE user_id = $1
//         ORDER BY updated_at DESC`,
//       [user_id],
//     );
//     return rows;
//   }

//   // ── Send push to a user (used by /test and production) ────
//   async sendPushToUser(
//     user_id: string,
//     title: string,
//     body: string,
//     data?: Record<string, string>,
//   ) {
//     const prefs = await this.getPreferences(user_id);
//     if (prefs && prefs.push_enabled === false) {
//       console.log('🔕 push disabled by preferences');
//       return { sent: 0, detail: [] };
//     }

//     const tokens = await this.findTokensForUser(user_id);
//     console.log(
//       '📦 found tokens',
//       tokens.map((t) => ({ token: t.token.slice(0, 24) + '…' })),
//     );
//     if (!tokens.length) return { sent: 0, detail: [] };

//     let sent = 0;
//     const detail: Array<{ token: string; ok: boolean; err?: string }> = [];

//     for (const t of tokens) {
//       const res = await this.sendToToken(t.token, { title, body, data });
//       if (res.ok) sent++;
//       else {
//         // purge permanent/bad tokens so they don't break future sends
//         const m = (res.error || '').toLowerCase();
//         if (
//           m.includes('senderid mismatch') ||
//           m.includes('mismatched-credential') ||
//           m.includes('registration-token-not-registered') ||
//           m.includes('invalid-argument')
//         ) {
//           await pool.query(`DELETE FROM push_tokens WHERE token = $1`, [
//             t.token,
//           ]);
//         }
//       }
//       detail.push({ token: t.token, ok: res.ok, err: res.error });
//     }
//     return { sent, detail };
//   }

//   // ── Notify everyone who follows a source (REAL flow) ──────
//   async notifyFollowersOfSourceArticle(input: {
//     source: string;
//     title: string;
//     url?: string;
//     image?: string;
//   }) {
//     const { source, title, url, image } = input;
//     await this.ensureFollowTables();

//     // Only users who: follow this source + have push_enabled=true + following_realtime=true
//     const { rows: users } = await pool.query(
//       `
//       SELECT u.user_id
//       FROM follow_subscriptions u
//       JOIN notification_preferences p ON p.user_id = u.user_id
//       WHERE u.kind='source'
//         AND u.value = $1
//         AND COALESCE(p.push_enabled, true) = true
//         AND COALESCE(p.following_realtime, false) = true
//       `,
//       [source],
//     );

//     let total = 0;
//     for (const u of users) {
//       const res = await this.sendPushToUser(
//         u.user_id,
//         `New from ${source}`,
//         title,
//         {
//           type: 'article',
//           source,
//           title,
//           url: url ?? '',
//           image: image ?? '',
//         },
//       );
//       total += res.sent;
//     }
//     return { followers: users.length, notifications_sent: total };
//   }

//   // ── Build FCM messages ────────────────────────────────────
//   private buildAlertMessage(
//     token: string,
//     payload: PushPayload,
//   ): admin.messaging.Message {
//     return {
//       token,
//       notification: { title: payload.title, body: payload.body },
//       data: toStringMap(payload.data),
//       android: {
//         priority: 'high',
//         notification: { sound: 'default' },
//       },
//       apns: {
//         headers: {
//           'apns-push-type': 'alert',
//           'apns-priority': '10',
//           ...(APNS_TOPIC ? { 'apns-topic': APNS_TOPIC } : {}),
//         },
//         payload: {
//           aps: { sound: 'default' },
//         },
//       },
//     };
//   }

//   private buildBackgroundDataMessage(
//     token: string,
//     payload: PushPayload,
//   ): admin.messaging.Message {
//     // IMPORTANT: no "notification" block; data-only so iOS will deliver to headless JS
//     return {
//       token,
//       data: toStringMap({
//         title: payload.title,
//         message: payload.body,
//         ...(payload.data ?? {}),
//         _kind: 'background_persist',
//       }),
//       android: {
//         priority: 'high',
//       },
//       apns: {
//         headers: {
//           'apns-push-type': 'background',
//           'apns-priority': '5', // background
//           ...(APNS_TOPIC ? { 'apns-topic': APNS_TOPIC } : {}),
//         },
//         payload: {
//           aps: {
//             'content-available': 1,
//           },
//         },
//       },
//     };
//   }

//   // ── Raw send via Firebase (dual-send: alert + background) ─
//   private async sendToToken(
//     token: string,
//     payload: PushPayload,
//   ): Promise<{ ok: boolean; error?: string }> {
//     try {
//       // 1) Show the banner (alert)
//       const alertMsg = this.buildAlertMessage(token, payload);
//       const id1 = await admin.messaging().send(alertMsg);

//       // 2) Deliver a silent data copy so RN background handler can persist it
//       const bgMsg = this.buildBackgroundDataMessage(token, payload);
//       const id2 = await admin.messaging().send(bgMsg);

//       console.log('✅ FCM sent (alert, bg):', { id1, id2 });
//       return { ok: true };
//     } catch (e: any) {
//       console.error('❌ FCM Messaging error:', e);
//       const msg: string =
//         e?.errorInfo?.message ||
//         e?.message ||
//         e?.toString?.() ||
//         'Unknown error';
//       return { ok: false, error: msg };
//     }
//   }

//   // ── Debug ─────────────────────────────────────────────────
//   async debug(user_id?: string) {
//     const appOpts: any = (admin as any).app().options || {};
//     const cfg = {
//       adminProjectId: FIREBASE_PROJECT_ID || appOpts.projectId,
//       senderIdExpected: EXPECTED_SENDER_ID || '(unset)',
//       iosBundleId: IOS_BUNDLE_ID || '(unset)',
//     };

//     let tokens: any[] = [];
//     if (user_id) tokens = await this.findTokensForUser(user_id);

//     const tokensRedacted = tokens.map((t) => ({
//       ...t,
//       token: t.token.slice(0, 12) + '…',
//     }));
//     const distinctSenderIds = [
//       ...new Set(tokens.map((t) => t.sender_id || '(null)')),
//     ];
//     return {
//       cfg,
//       tokenCount: tokens.length,
//       distinctSenderIds,
//       tokens: tokensRedacted,
//     };
//   }
// }

/////////////////////

// // apps/backend-nest/src/notifications/notifications.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import * as admin from 'firebase-admin';
// import * as fs from 'fs';
// import * as path from 'path';

// type PushPayload = {
//   title: string;
//   body: string;
//   data?: Record<string, string | number | boolean | null | undefined>;
// };

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ── Firebase Admin init ────────────────────────────────────
// const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
// const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
// const EXPECTED_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID;
// const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || '';

// if (!admin.apps.length) {
//   let credential: admin.credential.Credential | undefined;
//   let loadedPath = 'n/a';
//   let projectIdFromKey = 'n/a';

//   if (FIREBASE_SERVICE_ACCOUNT) {
//     const p = path.isAbsolute(FIREBASE_SERVICE_ACCOUNT)
//       ? FIREBASE_SERVICE_ACCOUNT
//       : path.join(process.cwd(), FIREBASE_SERVICE_ACCOUNT);
//     loadedPath = p;
//     const json = JSON.parse(fs.readFileSync(p, 'utf8'));
//     projectIdFromKey = json.project_id || 'n/a';
//     credential = admin.credential.cert(json);
//   } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//     loadedPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
//     credential = admin.credential.applicationDefault();
//   } else {
//     throw new Error('Firebase Admin credentials missing.');
//   }

//   admin.initializeApp({
//     credential,
//     projectId: FIREBASE_PROJECT_ID || undefined,
//   });

//   const appOpts: any = (admin as any).app().options || {};
//   console.log('🔐 Firebase Admin initialized', {
//     loadedPath,
//     adminProjectId:
//       FIREBASE_PROJECT_ID || appOpts.projectId || projectIdFromKey,
//     keyProjectId: projectIdFromKey,
//     senderIdExpected: EXPECTED_SENDER_ID ?? 'n/a',
//     iosBundleId: IOS_BUNDLE_ID || '(unset)',
//   });
// }

// // ── APNs topic (bundle id) for iOS ─────────────────────────
// const APNS_TOPIC = IOS_BUNDLE_ID || ''; // e.g., 'com.stylhelpr.stylhelpr'

// // helper: FCM requires string map for "data"
// function toStringMap(obj?: Record<string, any>): Record<string, string> {
//   const out: Record<string, string> = {};
//   if (!obj) return out;
//   for (const [k, v] of Object.entries(obj)) {
//     out[k] = v == null ? '' : String(v);
//   }
//   return out;
// }

// @Injectable()
// export class NotificationsService {
//   // ── Register token ────────────────────────────────────────
//   async registerToken(dto: {
//     user_id: string;
//     device_token: string;
//     platform: 'ios' | 'android';
//     sender_id?: string;
//     project_id?: string;
//   }) {
//     const { user_id, device_token, platform, sender_id, project_id } = dto;

//     console.log('📥 registerToken called with', {
//       user_id,
//       platform,
//       sender_id,
//       project_id,
//       token_prefix: device_token?.slice(0, 12) + '…',
//     });

//     if (!user_id || !device_token) {
//       return { ok: false, error: 'user_id and device_token are required' };
//     }

//     if (EXPECTED_SENDER_ID && sender_id && sender_id !== EXPECTED_SENDER_ID) {
//       console.warn(
//         `⚠️ sender_id mismatch; expected=${EXPECTED_SENDER_ID} got=${sender_id}`,
//       );
//     }

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS push_tokens (
//         user_id    uuid    NOT NULL,
//         token      text    NOT NULL,
//         platform   text    NOT NULL,
//         sender_id  text,
//         project_id text,
//         updated_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);
//     await pool.query(`
//       CREATE UNIQUE INDEX IF NOT EXISTS ux_push_tokens_user_token
//       ON push_tokens (user_id, token);
//     `);

//     // Keep one token per user & platform to avoid stale tokens
//     await pool.query(
//       `DELETE FROM push_tokens WHERE user_id=$1 AND platform=$2`,
//       [user_id, platform],
//     );

//     const res = await pool.query(
//       `
//       INSERT INTO push_tokens (user_id, token, platform, sender_id, project_id, updated_at)
//       VALUES ($1,$2,$3,$4,$5,now())
//       ON CONFLICT (user_id, token)
//       DO UPDATE SET
//         platform   = EXCLUDED.platform,
//         sender_id  = COALESCE(EXCLUDED.sender_id,  push_tokens.sender_id),
//         project_id = COALESCE(EXCLUDED.project_id, push_tokens.project_id),
//         updated_at = now()
//       RETURNING user_id, token, platform, sender_id, project_id, updated_at;
//       `,
//       [user_id, device_token, platform, sender_id ?? null, project_id ?? null],
//     );

//     console.log('✅ token upserted:', {
//       user_id: res.rows[0]?.user_id,
//       token_prefix: res.rows[0]?.token?.slice(0, 12) + '…',
//       platform: res.rows[0]?.platform,
//       sender_id: res.rows[0]?.sender_id,
//       project_id: res.rows[0]?.project_id,
//     });

//     return { ok: true, token: res.rows[0] };
//   }

//   // ── Preferences ───────────────────────────────────────────
//   async upsertPreferences(p: {
//     user_id: string;
//     push_enabled?: boolean;
//     following_realtime?: boolean;
//     brands_realtime?: boolean;
//     breaking_realtime?: boolean;
//     digest_hour?: number;
//   }) {
//     const {
//       user_id,
//       push_enabled = true,
//       following_realtime = false,
//       brands_realtime = false,
//       breaking_realtime = true,
//       digest_hour = 8,
//     } = p;

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS notification_preferences (
//         user_id uuid PRIMARY KEY,
//         push_enabled boolean,
//         following_realtime boolean,
//         brands_realtime boolean,
//         breaking_realtime boolean,
//         digest_hour int
//       );
//     `);

//     await pool.query(
//       `
//       INSERT INTO notification_preferences (user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour)
//       VALUES ($1,$2,$3,$4,$5,$6)
//       ON CONFLICT (user_id)
//       DO UPDATE SET
//         push_enabled=$2,
//         following_realtime=$3,
//         brands_realtime=$4,
//         breaking_realtime=$5,
//         digest_hour=$6;
//       `,
//       [
//         user_id,
//         push_enabled,
//         following_realtime,
//         brands_realtime,
//         breaking_realtime,
//         digest_hour,
//       ],
//     );

//     return { ok: true };
//   }

//   async getPreferences(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT * FROM notification_preferences WHERE user_id = $1`,
//       [user_id],
//     );
//     return rows[0] ?? null;
//   }

//   // ── Follows ───────────────────────────────────────────────
//   async getFollows(user_id: string) {
//     await this.ensureFollowTables();
//     const { rows } = await pool.query(
//       `SELECT value AS source FROM follow_subscriptions WHERE user_id=$1 AND kind='source' ORDER BY value ASC`,
//       [user_id],
//     );
//     return { sources: rows.map((r) => r.source) };
//   }

//   async follow(user_id: string, source: string) {
//     await this.ensureFollowTables();
//     const key = (source || '').trim();
//     if (!key) return { ok: false };
//     await pool.query(
//       `INSERT INTO follow_subscriptions (user_id, kind, value)
//        VALUES ($1,'source',$2)
//        ON CONFLICT (user_id, kind, value) DO NOTHING`,
//       [user_id, key],
//     );
//     return { ok: true };
//   }

//   async unfollow(user_id: string, source: string) {
//     await this.ensureFollowTables();
//     await pool.query(
//       `DELETE FROM follow_subscriptions WHERE user_id=$1 AND kind='source' AND value=$2`,
//       [user_id, (source || '').trim()],
//     );
//     return { ok: true };
//   }

//   private async ensureFollowTables() {
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS follow_subscriptions (
//         user_id uuid NOT NULL,
//         kind    text NOT NULL,
//         value   text NOT NULL,
//         PRIMARY KEY (user_id, kind, value)
//       );
//     `);
//   }

//   // ── Token helpers ─────────────────────────────────────────
//   async findTokensForUser(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT token, platform, sender_id, project_id, updated_at
//          FROM push_tokens
//         WHERE user_id = $1
//         ORDER BY updated_at DESC`,
//       [user_id],
//     );
//     return rows;
//   }

//   // ── Send push to a user (used by /test and production) ────
//   async sendPushToUser(
//     user_id: string,
//     title: string,
//     body: string,
//     data?: Record<string, string>,
//   ) {
//     const prefs = await this.getPreferences(user_id);
//     if (prefs && prefs.push_enabled === false) {
//       console.log('🔕 push disabled by preferences');
//       return { sent: 0, detail: [] };
//     }

//     const tokens = await this.findTokensForUser(user_id);
//     console.log(
//       '📦 found tokens',
//       tokens.map((t) => ({ token: t.token.slice(0, 24) + '…' })),
//     );
//     if (!tokens.length) return { sent: 0, detail: [] };

//     let sent = 0;
//     const detail: Array<{ token: string; ok: boolean; err?: string }> = [];

//     for (const t of tokens) {
//       const res = await this.sendToToken(t.token, { title, body, data });
//       if (res.ok) sent++;
//       else {
//         // purge permanent/bad tokens so they don't break future sends
//         const m = (res.error || '').toLowerCase();
//         if (
//           m.includes('senderid mismatch') ||
//           m.includes('mismatched-credential') ||
//           m.includes('registration-token-not-registered') ||
//           m.includes('invalid-argument')
//         ) {
//           await pool.query(`DELETE FROM push_tokens WHERE token = $1`, [
//             t.token,
//           ]);
//         }
//       }
//       detail.push({ token: t.token, ok: res.ok, err: res.error });
//     }
//     return { sent, detail };
//   }

//   // ── Notify everyone who follows a source (REAL flow) ──────
//   async notifyFollowersOfSourceArticle(input: {
//     source: string;
//     title: string;
//     url?: string;
//     image?: string;
//   }) {
//     const { source, title, url, image } = input;
//     await this.ensureFollowTables();

//     // Only users who: follow this source + have push_enabled=true + following_realtime=true
//     const { rows: users } = await pool.query(
//       `
//       SELECT u.user_id
//       FROM follow_subscriptions u
//       JOIN notification_preferences p ON p.user_id = u.user_id
//       WHERE u.kind='source'
//         AND u.value = $1
//         AND COALESCE(p.push_enabled, true) = true
//         AND COALESCE(p.following_realtime, false) = true
//       `,
//       [source],
//     );

//     let total = 0;
//     for (const u of users) {
//       const res = await this.sendPushToUser(
//         u.user_id,
//         `New from ${source}`,
//         title,
//         {
//           type: 'article',
//           source,
//           title,
//           url: url ?? '',
//           image: image ?? '',
//         },
//       );
//       total += res.sent;
//     }
//     return { followers: users.length, notifications_sent: total };
//   }

//   // ── Build FCM messages ────────────────────────────────────
//   private buildAlertMessage(
//     token: string,
//     payload: PushPayload,
//   ): admin.messaging.Message {
//     return {
//       token,
//       notification: { title: payload.title, body: payload.body },
//       data: toStringMap(payload.data),
//       android: {
//         priority: 'high',
//         notification: { sound: 'default' },
//       },
//       apns: {
//         headers: {
//           'apns-push-type': 'alert',
//           'apns-priority': '10',
//           ...(APNS_TOPIC ? { 'apns-topic': APNS_TOPIC } : {}),
//         },
//         payload: {
//           aps: { sound: 'default' },
//         },
//       },
//     };
//   }

//   private buildBackgroundDataMessage(
//     token: string,
//     payload: PushPayload,
//   ): admin.messaging.Message {
//     // IMPORTANT: no "notification" block; data-only so iOS will deliver to headless JS
//     return {
//       token,
//       data: toStringMap({
//         title: payload.title,
//         message: payload.body,
//         ...(payload.data ?? {}),
//         _kind: 'background_persist',
//       }),
//       android: {
//         priority: 'high',
//       },
//       apns: {
//         headers: {
//           'apns-push-type': 'background',
//           'apns-priority': '5', // background
//           ...(APNS_TOPIC ? { 'apns-topic': APNS_TOPIC } : {}),
//         },
//         payload: {
//           aps: {
//             'content-available': 1,
//           },
//         },
//       },
//     };
//   }

//   // ── Raw send via Firebase (dual-send: alert + background) ─
//   private async sendToToken(
//     token: string,
//     payload: PushPayload,
//   ): Promise<{ ok: boolean; error?: string }> {
//     try {
//       // 1) Show the banner (alert)
//       const alertMsg = this.buildAlertMessage(token, payload);
//       const id1 = await admin.messaging().send(alertMsg);

//       // 2) Deliver a silent data copy so RN background handler can persist it
//       const bgMsg = this.buildBackgroundDataMessage(token, payload);
//       const id2 = await admin.messaging().send(bgMsg);

//       console.log('✅ FCM sent (alert, bg):', { id1, id2 });
//       return { ok: true };
//     } catch (e: any) {
//       console.error('❌ FCM Messaging error:', e);
//       const msg: string =
//         e?.errorInfo?.message ||
//         e?.message ||
//         e?.toString?.() ||
//         'Unknown error';
//       return { ok: false, error: msg };
//     }
//   }

//   // ── Debug ─────────────────────────────────────────────────
//   async debug(user_id?: string) {
//     const appOpts: any = (admin as any).app().options || {};
//     const cfg = {
//       adminProjectId: FIREBASE_PROJECT_ID || appOpts.projectId,
//       senderIdExpected: EXPECTED_SENDER_ID || '(unset)',
//       iosBundleId: IOS_BUNDLE_ID || '(unset)',
//     };

//     let tokens: any[] = [];
//     if (user_id) tokens = await this.findTokensForUser(user_id);

//     const tokensRedacted = tokens.map((t) => ({
//       ...t,
//       token: t.token.slice(0, 12) + '…',
//     }));
//     const distinctSenderIds = [
//       ...new Set(tokens.map((t) => t.sender_id || '(null)')),
//     ];
//     return {
//       cfg,
//       tokenCount: tokens.length,
//       distinctSenderIds,
//       tokens: tokensRedacted,
//     };
//   }
// }

///////////////////

// // apps/backend-nest/src/notifications/notifications.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import * as admin from 'firebase-admin';
// import * as fs from 'fs';
// import * as path from 'path';

// type PushPayload = {
//   title: string;
//   body: string;
//   data?: Record<string, string>;
// };

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ── Firebase Admin init ────────────────────────────────────
// const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT; // path to json
// const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
// const EXPECTED_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID;
// const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || '';

// if (!admin.apps.length) {
//   let credential: admin.credential.Credential | undefined;
//   let loadedPath = 'n/a';
//   let projectIdFromKey = 'n/a';

//   if (FIREBASE_SERVICE_ACCOUNT) {
//     const p = path.isAbsolute(FIREBASE_SERVICE_ACCOUNT)
//       ? FIREBASE_SERVICE_ACCOUNT
//       : path.join(process.cwd(), FIREBASE_SERVICE_ACCOUNT);
//     loadedPath = p;
//     const json = JSON.parse(fs.readFileSync(p, 'utf8'));
//     projectIdFromKey = json.project_id || 'n/a';
//     credential = admin.credential.cert(json);
//   } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//     loadedPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
//     credential = admin.credential.applicationDefault();
//   } else {
//     throw new Error('Firebase Admin credentials missing.');
//   }

//   admin.initializeApp({
//     credential,
//     projectId: FIREBASE_PROJECT_ID || undefined,
//   });

//   const appOpts: any = (admin as any).app().options || {};
//   console.log('🔐 Firebase Admin initialized', {
//     loadedPath,
//     adminProjectId:
//       FIREBASE_PROJECT_ID || appOpts.projectId || projectIdFromKey,
//     keyProjectId: projectIdFromKey,
//     senderIdExpected: EXPECTED_SENDER_ID ?? 'n/a',
//     iosBundleId: IOS_BUNDLE_ID || '(unset)',
//   });
// }

// @Injectable()
// export class NotificationsService {
//   // ── Register token ────────────────────────────────────────
//   async registerToken(dto: {
//     user_id: string;
//     device_token: string;
//     platform: 'ios' | 'android';
//     sender_id?: string;
//     project_id?: string;
//   }) {
//     const { user_id, device_token, platform, sender_id, project_id } = dto;

//     console.log('📥 registerToken called with', {
//       user_id,
//       platform,
//       sender_id,
//       project_id,
//       token_prefix: device_token?.slice(0, 12) + '…',
//     });

//     if (!user_id || !device_token) {
//       return { ok: false, error: 'user_id and device_token are required' };
//     }

//     if (EXPECTED_SENDER_ID && sender_id && sender_id !== EXPECTED_SENDER_ID) {
//       console.warn(
//         `⚠️ sender_id mismatch; expected=${EXPECTED_SENDER_ID} got=${sender_id}`,
//       );
//     }

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS push_tokens (
//         user_id    uuid    NOT NULL,
//         token      text    NOT NULL,
//         platform   text    NOT NULL,
//         sender_id  text,
//         project_id text,
//         updated_at timestamptz NOT NULL DEFAULT now()
//       );
//     `);
//     await pool.query(`
//       CREATE UNIQUE INDEX IF NOT EXISTS ux_push_tokens_user_token
//       ON push_tokens (user_id, token);
//     `);

//     // Keep **one** token per user & platform to avoid stale tokens looping
//     await pool.query(
//       `DELETE FROM push_tokens WHERE user_id=$1 AND platform=$2`,
//       [user_id, platform],
//     );

//     const res = await pool.query(
//       `
//       INSERT INTO push_tokens (user_id, token, platform, sender_id, project_id, updated_at)
//       VALUES ($1,$2,$3,$4,$5,now())
//       ON CONFLICT (user_id, token)
//       DO UPDATE SET
//         platform   = EXCLUDED.platform,
//         sender_id  = COALESCE(EXCLUDED.sender_id,  push_tokens.sender_id),
//         project_id = COALESCE(EXCLUDED.project_id, push_tokens.project_id),
//         updated_at = now()
//       RETURNING user_id, token, platform, sender_id, project_id, updated_at;
//       `,
//       [user_id, device_token, platform, sender_id ?? null, project_id ?? null],
//     );

//     console.log('✅ token upserted:', {
//       user_id: res.rows[0]?.user_id,
//       token_prefix: res.rows[0]?.token?.slice(0, 12) + '…',
//       platform: res.rows[0]?.platform,
//       sender_id: res.rows[0]?.sender_id,
//       project_id: res.rows[0]?.project_id,
//     });

//     return { ok: true, token: res.rows[0] };
//   }

//   // ── Preferences ───────────────────────────────────────────
//   async upsertPreferences(p: {
//     user_id: string;
//     push_enabled?: boolean;
//     following_realtime?: boolean;
//     brands_realtime?: boolean;
//     breaking_realtime?: boolean;
//     digest_hour?: number;
//   }) {
//     const {
//       user_id,
//       push_enabled = true,
//       following_realtime = false,
//       brands_realtime = false,
//       breaking_realtime = true,
//       digest_hour = 8,
//     } = p;

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS notification_preferences (
//         user_id uuid PRIMARY KEY,
//         push_enabled boolean,
//         following_realtime boolean,
//         brands_realtime boolean,
//         breaking_realtime boolean,
//         digest_hour int
//       );
//     `);

//     await pool.query(
//       `
//       INSERT INTO notification_preferences (user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour)
//       VALUES ($1,$2,$3,$4,$5,$6)
//       ON CONFLICT (user_id)
//       DO UPDATE SET
//         push_enabled=$2,
//         following_realtime=$3,
//         brands_realtime=$4,
//         breaking_realtime=$5,
//         digest_hour=$6;
//       `,
//       [
//         user_id,
//         push_enabled,
//         following_realtime,
//         brands_realtime,
//         breaking_realtime,
//         digest_hour,
//       ],
//     );

//     return { ok: true };
//   }

//   async getPreferences(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT * FROM notification_preferences WHERE user_id = $1`,
//       [user_id],
//     );
//     return rows[0] ?? null;
//   }

//   // ── Follows ───────────────────────────────────────────────
//   async getFollows(user_id: string) {
//     await this.ensureFollowTables();
//     const { rows } = await pool.query(
//       `SELECT value AS source FROM follow_subscriptions WHERE user_id=$1 AND kind='source' ORDER BY value ASC`,
//       [user_id],
//     );
//     return { sources: rows.map((r) => r.source) };
//   }

//   async follow(user_id: string, source: string) {
//     await this.ensureFollowTables();
//     const key = (source || '').trim();
//     if (!key) return { ok: false };
//     await pool.query(
//       `INSERT INTO follow_subscriptions (user_id, kind, value)
//        VALUES ($1,'source',$2)
//        ON CONFLICT (user_id, kind, value) DO NOTHING`,
//       [user_id, key],
//     );
//     return { ok: true };
//   }

//   async unfollow(user_id: string, source: string) {
//     await this.ensureFollowTables();
//     await pool.query(
//       `DELETE FROM follow_subscriptions WHERE user_id=$1 AND kind='source' AND value=$2`,
//       [user_id, (source || '').trim()],
//     );
//     return { ok: true };
//   }

//   private async ensureFollowTables() {
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS follow_subscriptions (
//         user_id uuid NOT NULL,
//         kind    text NOT NULL,
//         value   text NOT NULL,
//         PRIMARY KEY (user_id, kind, value)
//       );
//     `);
//   }

//   // ── Token helpers ─────────────────────────────────────────
//   async findTokensForUser(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT token, platform, sender_id, project_id, updated_at
//          FROM push_tokens
//         WHERE user_id = $1
//         ORDER BY updated_at DESC`,
//       [user_id],
//     );
//     return rows;
//   }

//   // ── Send push to a user (used by /test and production) ────
//   async sendPushToUser(
//     user_id: string,
//     title: string,
//     body: string,
//     data?: Record<string, string>,
//   ) {
//     const prefs = await this.getPreferences(user_id);
//     if (prefs && prefs.push_enabled === false) {
//       console.log('🔕 push disabled by preferences');
//       return { sent: 0, detail: [] };
//     }

//     const tokens = await this.findTokensForUser(user_id);
//     console.log(
//       '📦 found tokens',
//       tokens.map((t) => ({ token: t.token.slice(0, 24) + '…' })),
//     );
//     if (!tokens.length) return { sent: 0, detail: [] };

//     let sent = 0;
//     const detail: Array<{ token: string; ok: boolean; err?: string }> = [];

//     for (const t of tokens) {
//       const res = await this.sendToToken(t.token, { title, body, data });
//       if (res.ok) sent++;
//       else {
//         // purge permanent/bad tokens so they don't break future sends
//         const m = (res.error || '').toLowerCase();
//         if (
//           m.includes('senderid mismatch') ||
//           m.includes('mismatched-credential') ||
//           m.includes('registration-token-not-registered') ||
//           m.includes('invalid-argument')
//         ) {
//           await pool.query(`DELETE FROM push_tokens WHERE token = $1`, [
//             t.token,
//           ]);
//         }
//       }
//       detail.push({ token: t.token, ok: res.ok, err: res.error });
//     }
//     return { sent, detail };
//   }

//   // ── Notify everyone who follows a source (REAL flow) ──────
//   async notifyFollowersOfSourceArticle(input: {
//     source: string;
//     title: string;
//     url?: string;
//     image?: string;
//   }) {
//     const { source, title, url, image } = input;
//     await this.ensureFollowTables();

//     // Only users who: follow this source + have push_enabled=true + following_realtime=true
//     const { rows: users } = await pool.query(
//       `
//       SELECT u.user_id
//       FROM follow_subscriptions u
//       JOIN notification_preferences p ON p.user_id = u.user_id
//       WHERE u.kind='source'
//         AND u.value = $1
//         AND COALESCE(p.push_enabled, true) = true
//         AND COALESCE(p.following_realtime, false) = true
//       `,
//       [source],
//     );

//     let total = 0;
//     for (const u of users) {
//       const res = await this.sendPushToUser(
//         u.user_id,
//         `New from ${source}`,
//         title,
//         {
//           type: 'article',
//           source,
//           title,
//           url: url ?? '',
//           image: image ?? '',
//         },
//       );
//       total += res.sent;
//     }
//     return { followers: users.length, notifications_sent: total };
//   }

//   // ── Raw send via Firebase ─────────────────────────────────
//   private async sendToToken(
//     token: string,
//     payload: PushPayload,
//   ): Promise<{ ok: boolean; error?: string }> {
//     try {
//       const id = await admin.messaging().send({
//         token,
//         notification: { title: payload.title, body: payload.body },
//         data: payload.data ?? {},
//         android: { priority: 'high', notification: { sound: 'default' } },
//         apns: {
//           headers: { 'apns-push-type': 'alert', 'apns-priority': '10' },
//           payload: { aps: { sound: 'default' } },
//         },
//       });
//       console.log('✅ FCM sent:', id);
//       return { ok: true };
//     } catch (e: any) {
//       console.error('❌ FCM Messaging error:', e);
//       const msg: string =
//         e?.errorInfo?.message ||
//         e?.message ||
//         e?.toString?.() ||
//         'Unknown error';
//       return { ok: false, error: msg };
//     }
//   }

//   // ── Debug ─────────────────────────────────────────────────
//   async debug(user_id?: string) {
//     const appOpts: any = (admin as any).app().options || {};
//     const cfg = {
//       adminProjectId: FIREBASE_PROJECT_ID || appOpts.projectId,
//       senderIdExpected: EXPECTED_SENDER_ID || '(unset)',
//       iosBundleId: IOS_BUNDLE_ID || '(unset)',
//     };

//     let tokens: any[] = [];
//     if (user_id) tokens = await this.findTokensForUser(user_id);

//     const tokensRedacted = tokens.map((t) => ({
//       ...t,
//       token: t.token.slice(0, 12) + '…',
//     }));
//     const distinctSenderIds = [
//       ...new Set(tokens.map((t) => t.sender_id || '(null)')),
//     ];
//     return {
//       cfg,
//       tokenCount: tokens.length,
//       distinctSenderIds,
//       tokens: tokensRedacted,
//     };
//   }
// }
