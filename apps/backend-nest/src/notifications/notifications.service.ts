// apps/backend-nest/src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Firebase Admin init ────────────────────────────────────
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT; // path to json
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const EXPECTED_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID;
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || '';

if (!admin.apps.length) {
  let credential: admin.credential.Credential | undefined;
  let loadedPath = 'n/a';
  let projectIdFromKey = 'n/a';

  if (FIREBASE_SERVICE_ACCOUNT) {
    const p = path.isAbsolute(FIREBASE_SERVICE_ACCOUNT)
      ? FIREBASE_SERVICE_ACCOUNT
      : path.join(process.cwd(), FIREBASE_SERVICE_ACCOUNT);
    loadedPath = p;
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    projectIdFromKey = json.project_id || 'n/a';
    credential = admin.credential.cert(json);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    loadedPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    credential = admin.credential.applicationDefault();
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

    // Keep **one** token per user & platform to avoid stale tokens looping
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
        // purge permanent/bad tokens so they don't break future sends
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

  // ── Notify everyone who follows a source (REAL flow) ──────
  async notifyFollowersOfSourceArticle(input: {
    source: string;
    title: string;
    url?: string;
    image?: string;
  }) {
    const { source, title, url, image } = input;
    await this.ensureFollowTables();

    // Only users who: follow this source + have push_enabled=true + following_realtime=true
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

  // ── Raw send via Firebase ─────────────────────────────────
  private async sendToToken(
    token: string,
    payload: PushPayload,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const id = await admin.messaging().send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: { priority: 'high', notification: { sound: 'default' } },
        apns: {
          headers: { 'apns-push-type': 'alert', 'apns-priority': '10' },
          payload: { aps: { sound: 'default' } },
        },
      });
      console.log('✅ FCM sent:', id);
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

  // ── Debug ─────────────────────────────────────────────────
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

///////////////////

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

// // ─────────────────────────────────────────────────────────────
// // Firebase Admin init (project is controlled by env variables)
// // ─────────────────────────────────────────────────────────────
// const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT; // absolute or relative path
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
//     throw new Error(
//       'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (path) or GOOGLE_APPLICATION_CREDENTIALS.',
//     );
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
//   // ─────────────────────────────────────────────────────────────
//   // Schema guards (idempotent)
//   // ─────────────────────────────────────────────────────────────
//   private async ensureTables() {
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
//       CREATE INDEX IF NOT EXISTS ix_push_tokens_user
//       ON push_tokens (user_id);
//     `);
//     await pool.query(`
//       CREATE UNIQUE INDEX IF NOT EXISTS ux_push_tokens_user_token
//       ON push_tokens (user_id, token);
//     `);
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
//   }

//   // ─────────────────────────────────────────────────────────────
//   // Register or update a device push token
//   //   • REPLACES existing tokens for the same (user, platform)
//   // ─────────────────────────────────────────────────────────────
//   async registerToken(body: {
//     user_id: string;
//     platform: 'ios' | 'android';
//     token?: string;
//     device_token?: string; // accept either key
//     sender_id?: string;
//     project_id?: string;
//   }) {
//     await this.ensureTables();

//     const user_id = body.user_id;
//     const platform = body.platform;
//     const device_token = body.token ?? body.device_token;
//     const sender_id = body.sender_id;
//     const project_id = body.project_id;

//     console.log('📥 registerToken called with', {
//       user_id,
//       platform,
//       sender_id,
//       project_id,
//       token_prefix: device_token?.slice(0, 12) + '…',
//     });

//     if (!user_id || !device_token || !platform) {
//       return { ok: false, error: 'user_id, platform, and token are required' };
//     }

//     if (EXPECTED_SENDER_ID && sender_id && sender_id !== EXPECTED_SENDER_ID) {
//       console.warn(
//         `⚠️ sender_id mismatch; expected=${EXPECTED_SENDER_ID} got=${sender_id}. Storing anyway; will purge on send.`,
//       );
//     }

//     const client = await pool.connect();
//     try {
//       await client.query('BEGIN');

//       // 🔑 The fix: keep only ONE token per (user, platform)
//       await client.query(
//         `DELETE FROM push_tokens WHERE user_id = $1 AND platform = $2`,
//         [user_id, platform],
//       );

//       await client.query(
//         `INSERT INTO push_tokens (user_id, token, platform, sender_id, project_id, updated_at)
//          VALUES ($1,$2,$3,$4,$5, now())
//          ON CONFLICT (user_id, token)
//          DO UPDATE SET
//            platform   = EXCLUDED.platform,
//            sender_id  = COALESCE(EXCLUDED.sender_id,  push_tokens.sender_id),
//            project_id = COALESCE(EXCLUDED.project_id, push_tokens.project_id),
//            updated_at = now()`,
//         [
//           user_id,
//           device_token,
//           platform,
//           sender_id ?? null,
//           project_id ?? null,
//         ],
//       );

//       await client.query('COMMIT');
//     } catch (e) {
//       await client.query('ROLLBACK');
//       throw e;
//     } finally {
//       client.release();
//     }

//     console.log('✅ token upserted:', {
//       user_id,
//       token_prefix: device_token.slice(0, 12) + '…',
//       platform,
//       sender_id,
//       project_id,
//     });

//     return { ok: true };
//   }

//   // ─────────────────────────────────────────────────────────────
//   // Preferences (upsert/get)
//   // ─────────────────────────────────────────────────────────────
//   async upsertPreferences(p: {
//     user_id: string;
//     push_enabled?: boolean;
//     following_realtime?: boolean;
//     brands_realtime?: boolean;
//     breaking_realtime?: boolean;
//     digest_hour?: number;
//   }) {
//     await this.ensureTables();

//     const {
//       user_id,
//       push_enabled = true,
//       following_realtime = false,
//       brands_realtime = false,
//       breaking_realtime = true,
//       digest_hour = 8,
//     } = p;

//     await pool.query(
//       `
//       INSERT INTO notification_preferences (
//         user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour
//       )
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
//     await this.ensureTables();
//     const { rows } = await pool.query(
//       `SELECT * FROM notification_preferences WHERE user_id = $1`,
//       [user_id],
//     );
//     return rows[0] ?? null;
//   }

//   // ─────────────────────────────────────────────────────────────
//   // Token helpers
//   // ─────────────────────────────────────────────────────────────
//   async findTokensForUser(user_id: string) {
//     await this.ensureTables();
//     const { rows } = await pool.query(
//       `SELECT DISTINCT token, platform, sender_id, project_id, updated_at
//          FROM push_tokens
//         WHERE user_id = $1
//         ORDER BY updated_at DESC`,
//       [user_id],
//     );
//     return rows;
//   }

//   // ─────────────────────────────────────────────────────────────
//   // Send test / one-off push
//   //   • Purges permanent-bad tokens on the fly
//   // ─────────────────────────────────────────────────────────────
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
//       if (res.ok) {
//         sent++;
//         detail.push({ token: t.token, ok: true });
//       } else {
//         detail.push({ token: t.token, ok: false, err: res.error });
//       }
//     }
//     return { sent, detail };
//   }

//   // ─────────────────────────────────────────────────────────────
//   // Notify followers for a source
//   // ─────────────────────────────────────────────────────────────
//   async notifyFollowersOfSourceArticle(input: {
//     source: string;
//     title: string;
//     url?: string;
//     image?: string;
//   }) {
//     await this.ensureTables();

//     const { source, title, url, image } = input;

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS follow_subscriptions (
//         user_id uuid NOT NULL,
//         kind text NOT NULL,
//         value text NOT NULL
//       );
//     `);

//     const { rows: users } = await pool.query(
//       `
//       SELECT u.user_id
//       FROM follow_subscriptions u
//       JOIN notification_preferences p ON p.user_id = u.user_id
//       WHERE u.kind = 'source'
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

//   // ─────────────────────────────────────────────────────────────
//   // Internal send via Firebase Admin (purges permanent-bad tokens)
//   // ─────────────────────────────────────────────────────────────
//   private isPermanentTokenFailure(code: string, msg: string) {
//     return (
//       code === 'messaging/mismatched-credential' ||
//       msg.includes('SenderId mismatch') ||
//       code === 'messaging/registration-token-not-registered' ||
//       msg.includes('registration-token-not-registered') ||
//       code === 'messaging/invalid-argument'
//     );
//   }

//   private stringifyData(data?: Record<string, any>): Record<string, string> {
//     const out: Record<string, string> = {};
//     for (const [k, v] of Object.entries(data || {})) {
//       out[k] = typeof v === 'string' ? v : JSON.stringify(v);
//     }
//     return out;
//   }

//   private async sendToToken(
//     token: string,
//     payload: PushPayload,
//   ): Promise<{ ok: boolean; error?: string }> {
//     try {
//       const message: admin.messaging.TokenMessage = {
//         token,
//         notification: { title: payload.title, body: payload.body },
//         data: this.stringifyData(payload.data),
//         android: {
//           priority: 'high',
//           notification: { sound: 'default' },
//         },
//         apns: {
//           headers: {
//             'apns-push-type': 'alert',
//             'apns-priority': '10',
//           },
//           payload: {
//             aps: { sound: 'default' },
//           },
//         },
//       };

//       const id = await admin.messaging().send(message);
//       console.log('✅ FCM sent:', id);
//       return { ok: true };
//     } catch (e: any) {
//       const code: string = String(e?.errorInfo?.code || '');
//       const msg: string =
//         e?.errorInfo?.message ||
//         e?.message ||
//         e?.toString?.() ||
//         'Unknown error';

//       console.error('❌ FCM Messaging error:', e);

//       // 🔥 Permanent token failure → purge it so we never hit it again
//       if (this.isPermanentTokenFailure(code, msg)) {
//         await pool.query(`DELETE FROM push_tokens WHERE token = $1`, [token]);
//       }

//       return { ok: false, error: msg || code };
//     }
//   }

//   // ─────────────────────────────────────────────────────────────
//   // Debug info
//   // ─────────────────────────────────────────────────────────────
//   async debug(user_id?: string) {
//     const appOpts: any = (admin as any).app().options || {};
//     const cfg = {
//       adminProjectId: FIREBASE_PROJECT_ID || appOpts.projectId,
//       senderIdExpected: EXPECTED_SENDER_ID || '(unset)',
//       iosBundleId: IOS_BUNDLE_ID || '(unset)',
//     };

//     let tokens: any[] = [];
//     if (user_id) {
//       tokens = await this.findTokensForUser(user_id);
//     }
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
//   data?: Record<string, string>;
// };

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ─────────────────────────────────────────────────────────────
// // Firebase Admin init (project is controlled by env variables)
// // ─────────────────────────────────────────────────────────────
// const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT; // absolute or relative path
// const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID; // e.g. "styliq-31da7"
// const EXPECTED_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID; // e.g. "1089605776939"
// const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || ''; // e.g. "com.styliq.app"

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
//     throw new Error(
//       'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (path) or GOOGLE_APPLICATION_CREDENTIALS.',
//     );
//   }

//   admin.initializeApp({
//     credential,
//     // If env project is set, prefer it; otherwise Admin will infer from key.
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
//   // ─────────────────────────────────────────────────────────────
//   // Register or update a device push token
//   // ─────────────────────────────────────────────────────────────
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

//     // Only LOG mismatches; DO NOT block storing (mismatch will fail at send-time anyway)
//     if (EXPECTED_SENDER_ID && sender_id && sender_id !== EXPECTED_SENDER_ID) {
//       console.warn(
//         `⚠️ sender_id mismatch; expected=${EXPECTED_SENDER_ID} got=${sender_id}. Token will still be stored.`,
//       );
//     }

//     // Ensure table/index exist (idempotent safety)
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

//   // ─────────────────────────────────────────────────────────────
//   // Preferences (upsert/get)
//   // ─────────────────────────────────────────────────────────────
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
//       INSERT INTO notification_preferences (
//         user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour
//       )
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

//   // ─────────────────────────────────────────────────────────────
//   // Token helpers
//   // ─────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────
//   // Send test / one-off push
//   // ─────────────────────────────────────────────────────────────
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
//       detail.push({
//         token: t.token,
//         ok: res.ok,
//         err: res.error,
//       });
//     }
//     return { sent, detail };
//   }

//   // ─────────────────────────────────────────────────────────────
//   // Notify followers for a source
//   // ─────────────────────────────────────────────────────────────
//   async notifyFollowersOfSourceArticle(input: {
//     source: string;
//     title: string;
//     url?: string;
//     image?: string;
//   }) {
//     const { source, title, url, image } = input;

//     // Defensive: ensure follows table exists
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS follow_subscriptions (
//         user_id uuid NOT NULL,
//         kind text NOT NULL,
//         value text NOT NULL
//       );
//     `);

//     const { rows: users } = await pool.query(
//       `
//       SELECT u.user_id
//       FROM follow_subscriptions u
//       JOIN notification_preferences p ON p.user_id = u.user_id
//       WHERE u.kind = 'source'
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

//   // ─────────────────────────────────────────────────────────────
//   // Internal send via Firebase Admin (returns error detail)
//   // ─────────────────────────────────────────────────────────────
//   private async sendToToken(
//     token: string,
//     payload: PushPayload,
//   ): Promise<{ ok: boolean; error?: string }> {
//     try {
//       const message: admin.messaging.TokenMessage = {
//         token,
//         notification: { title: payload.title, body: payload.body },
//         data: payload.data ?? {},
//         android: {
//           priority: 'high',
//           notification: { sound: 'default' },
//         },
//         apns: {
//           headers: {
//             'apns-push-type': 'alert',
//             'apns-priority': '10',
//           },
//           payload: {
//             aps: { sound: 'default' },
//           },
//         },
//       };

//       const id = await admin.messaging().send(message);
//       console.log('✅ FCM sent:', id);
//       return { ok: true };
//     } catch (e: any) {
//       // Log full object so we can see errorInfo/code on server
//       console.error('❌ FCM Messaging error:', e);
//       const msg: string =
//         e?.errorInfo?.message ||
//         e?.message ||
//         e?.toString?.() ||
//         'Unknown error';
//       return { ok: false, error: msg };
//     }
//   }

//   // ─────────────────────────────────────────────────────────────
//   // Debug info
//   // ─────────────────────────────────────────────────────────────
//   async debug(user_id?: string) {
//     const appOpts: any = (admin as any).app().options || {};
//     const cfg = {
//       adminProjectId: FIREBASE_PROJECT_ID || appOpts.projectId,
//       senderIdExpected: EXPECTED_SENDER_ID || '(unset)',
//       iosBundleId: IOS_BUNDLE_ID || '(unset)',
//     };

//     let tokens: any[] = [];
//     if (user_id) {
//       tokens = await this.findTokensForUser(user_id);
//     }
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

/////////////////

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

// // ─────────────────────────────────────────────────────────────
// // Firebase Admin init (project is controlled by env variables)
// // ─────────────────────────────────────────────────────────────
// const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT; // absolute or relative path
// const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID; // e.g. "styliq-31da7"
// const EXPECTED_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID; // e.g. "1089605776939"

// if (!admin.apps.length) {
//   let credential: admin.credential.Credential | undefined;

//   if (FIREBASE_SERVICE_ACCOUNT) {
//     const p = path.isAbsolute(FIREBASE_SERVICE_ACCOUNT)
//       ? FIREBASE_SERVICE_ACCOUNT
//       : path.join(process.cwd(), FIREBASE_SERVICE_ACCOUNT);
//     const json = JSON.parse(fs.readFileSync(p, 'utf8'));
//     credential = admin.credential.cert(json);
//   } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//     // Let Admin SDK read from GOOGLE_APPLICATION_CREDENTIALS
//     credential = admin.credential.applicationDefault();
//   } else {
//     throw new Error(
//       'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (path) or GOOGLE_APPLICATION_CREDENTIALS.',
//     );
//   }

//   admin.initializeApp({
//     credential,
//     projectId: FIREBASE_PROJECT_ID || undefined,
//   });

//   const opts: any = (admin as any).app().options || {};
//   console.log('🔥 Firebase Admin initialized:', {
//     projectId: FIREBASE_PROJECT_ID || opts.projectId,
//     clientEmail: (credential as any)?.clientEmail ?? 'n/a',
//     senderIdExpected: EXPECTED_SENDER_ID ?? 'n/a',
//   });
// }

// @Injectable()
// export class NotificationsService {
//   // ─────────────────────────────────────────────────────────────
//   // Register or update a device push token
//   // ─────────────────────────────────────────────────────────────
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

//     // Only LOG mismatches; DO NOT block storing (mismatch will fail at send-time anyway)
//     if (EXPECTED_SENDER_ID && sender_id && sender_id !== EXPECTED_SENDER_ID) {
//       console.warn(
//         `⚠️ sender_id mismatch; expected=${EXPECTED_SENDER_ID} got=${sender_id}. Token will still be stored.`,
//       );
//     }

//     // Ensure table/index exist (idempotent safety)
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

//   // ─────────────────────────────────────────────────────────────
//   // Preferences (upsert/get)
//   // ─────────────────────────────────────────────────────────────
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
//       INSERT INTO notification_preferences (
//         user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour
//       )
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

//   // ─────────────────────────────────────────────────────────────
//   // Token helpers
//   // ─────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────
//   // Send test / one-off push
//   // ─────────────────────────────────────────────────────────────
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
//     const detail: Array<{ token: string; ok: boolean; err?: any }> = [];
//     for (const t of tokens) {
//       const ok = await this.sendToToken(t.token, { title, body, data });
//       if (ok) sent++;
//       detail.push({ token: t.token, ok });
//     }
//     return { sent, detail };
//   }

//   // ─────────────────────────────────────────────────────────────
//   // Notify followers for a source (unchanged pattern)
//   // ─────────────────────────────────────────────────────────────
//   async notifyFollowersOfSourceArticle(input: {
//     source: string;
//     title: string;
//     url?: string;
//     image?: string;
//   }) {
//     const { source, title, url, image } = input;

//     // Ensure prefs table exists (defensive)
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS follow_subscriptions (
//         user_id uuid NOT NULL,
//         kind text NOT NULL,
//         value text NOT NULL
//       );
//     `);

//     const { rows: users } = await pool.query(
//       `
//       SELECT u.user_id
//       FROM follow_subscriptions u
//       JOIN notification_preferences p ON p.user_id = u.user_id
//       WHERE u.kind = 'source'
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

//   // ─────────────────────────────────────────────────────────────
//   // Internal send via Firebase Admin
//   // ─────────────────────────────────────────────────────────────
//   private async sendToToken(
//     token: string,
//     payload: PushPayload,
//   ): Promise<boolean> {
//     try {
//       const message: admin.messaging.TokenMessage = {
//         token,
//         notification: { title: payload.title, body: payload.body },
//         data: payload.data ?? {},
//       };

//       const id = await admin.messaging().send(message);
//       console.log('✅ FCM sent:', id);
//       return true;
//     } catch (e: any) {
//       // Print full error object for troubleshooting (includes errorInfo/code)
//       console.error('❌ FCM Messaging error:', e);
//       return false;
//     }
//   }

//   // ─────────────────────────────────────────────────────────────
//   // Debug info
//   // ─────────────────────────────────────────────────────────────
//   async debug(user_id?: string) {
//     const adminOpts: any = (admin as any).app().options || {};
//     const cfg = {
//       adminProjectId: FIREBASE_PROJECT_ID || adminOpts.projectId,
//       senderIdExpected: EXPECTED_SENDER_ID || '(unset)',
//     };

//     let tokens: any[] = [];
//     if (user_id) {
//       tokens = await this.findTokensForUser(user_id);
//     }
//     const distinctSenderIds = [
//       ...new Set(tokens.map((t) => t.sender_id || '(null)')),
//     ];
//     return { cfg, tokenCount: tokens.length, distinctSenderIds, tokens };
//   }
// }

//////////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import * as admin from 'firebase-admin';
// import { join } from 'path';
// import * as fs from 'fs';

// type PushPayload = {
//   title: string;
//   body: string;
//   data?: Record<string, string>;
// };

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ------- Firebase Admin init with robust fallbacks -------
// function initAdminOnce() {
//   if (admin.apps.length) return;

//   // Prefer GOOGLE_APPLICATION_CREDENTIALS (path) or FIREBASE_SERVICE_ACCOUNT_JSON (inline JSON)
//   try {
//     if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
//       const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
//       admin.initializeApp({ credential: admin.credential.cert(json) });
//       console.log(
//         '🔥 Firebase Admin: initialized from FIREBASE_SERVICE_ACCOUNT_JSON',
//       );
//       return;
//     }
//   } catch (e) {
//     console.warn('⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
//   }

//   if (
//     process.env.GOOGLE_APPLICATION_CREDENTIALS &&
//     fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
//   ) {
//     admin.initializeApp({ credential: admin.credential.applicationDefault() });
//     console.log(
//       '🔥 Firebase Admin: initialized from GOOGLE_APPLICATION_CREDENTIALS',
//     );
//     return;
//   }

//   // Fallback: local service-account.json next to compiled files
//   const localPath = join(__dirname, '../../service-account.json');
//   if (fs.existsSync(localPath)) {
//     admin.initializeApp({
//       credential: admin.credential.cert(require(localPath)),
//     });
//     console.log('🔥 Firebase Admin: initialized from service-account.json');
//     return;
//   }

//   // Last resort (will likely fail for messaging)
//   admin.initializeApp();
//   console.log(
//     '🔥 Firebase Admin: initialized with default app (no explicit creds)',
//   );
// }
// initAdminOnce();

// @Injectable()
// export class NotificationsService {
//   // Save/Update a token (we allow both FCM and APNs to be stored)
//   async registerToken(dto: {
//     user_id: string;
//     device_token: string;
//     platform: 'ios' | 'android';
//   }) {
//     const { user_id, device_token, platform } = dto;
//     console.log('📥 registerToken called with', dto);

//     const res = await pool.query(
//       `
//       INSERT INTO push_tokens (user_id, token, platform, updated_at)
//       VALUES ($1, $2, $3, now())
//       ON CONFLICT (user_id, token)
//       DO UPDATE SET updated_at = now()
//       RETURNING user_id, token, platform, updated_at;
//       `,
//       [user_id, device_token, platform],
//     );

//     console.log('✅ token upserted:', res.rows[0]);
//     return { message: 'Push token registered', token: res.rows[0] };
//   }

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

//     await pool.query(
//       `
//       INSERT INTO notification_preferences (
//         user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour
//       )
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

//     console.log('✅ prefs upserted for', user_id);
//     return { message: 'Preferences saved' };
//   }

//   async getPreferences(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT * FROM notification_preferences WHERE user_id = $1`,
//       [user_id],
//     );
//     return rows[0] ?? null;
//   }

//   async sendPushToUser(
//     user_id: string,
//     title: string,
//     body: string,
//     data?: Record<string, string>,
//   ) {
//     const prefs = await this.getPreferences(user_id);
//     if (prefs && prefs.push_enabled === false) {
//       console.log('⏭️ push disabled for', user_id);
//       return { sent: 0, debug: 'push_disabled' };
//     }

//     const { rows: tokens } = await pool.query(
//       `SELECT token FROM push_tokens WHERE user_id = $1 ORDER BY updated_at DESC`,
//       [user_id],
//     );
//     console.log('📦 found tokens', tokens);

//     if (!tokens.length) return { sent: 0, debug: 'no_tokens' };

//     let sent = 0;
//     const debug: any[] = [];

//     for (const row of tokens) {
//       const token: string = row.token;

//       // Skip obvious APNs raw tokens when using FCM Admin (send only to FCM reg tokens)
//       const isRawApns = /^[A-Fa-f0-9]{64}$/.test(token);
//       if (isRawApns) {
//         console.log(
//           '🍏 Skipping raw APNs token (expect FCM reg token):',
//           token.slice(0, 12) + '…',
//         );
//         debug.push({ token: 'apns_skipped' });
//         continue;
//       }

//       const ok = await this.sendViaAdminFCM(token, { title, body, data });
//       debug.push({ token: token.slice(0, 16) + '…', ok });
//       if (ok) sent++;
//     }

//     return { sent, debug };
//   }

//   // Send using Firebase Admin SDK (which bridges to APNs using your APNs key in Firebase console)
//   private async sendViaAdminFCM(
//     token: string,
//     payload: PushPayload,
//   ): Promise<boolean> {
//     try {
//       const message: admin.messaging.Message = {
//         token,
//         notification: { title: payload.title, body: payload.body },
//         data: payload.data ?? {},
//         apns: {
//           headers: { 'apns-priority': '10' },
//           payload: { aps: { sound: 'default' } },
//         },
//       };

//       const id = await admin.messaging().send(message, true);
//       console.log('✅ FCM sent:', id);
//       return true;
//     } catch (e: any) {
//       // Print everything useful from FirebaseError
//       const info = e && e.errorInfo ? e.errorInfo : null;
//       console.error('❌ FCM Messaging error:', {
//         code: e?.code,
//         message: e?.message,
//         errorInfo: info,
//         stack: e?.stack?.split('\n').slice(0, 3).join(' | '),
//       });
//       return false;
//     }
//   }
// }

///////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import * as admin from 'firebase-admin';
// import { join } from 'path';

// type PushPayload = {
//   title: string;
//   body: string;
//   data?: Record<string, string>;
// };

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ✅ Initialize Firebase Admin only once
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(
//       require(join(__dirname, '../../service-account.json')),
//     ),
//   });
// }

// @Injectable()
// export class NotificationsService {
//   // ✅ Register or update a device push token
//   async registerToken(dto: {
//     user_id: string;
//     device_token: string;
//     platform: 'ios' | 'android';
//   }) {
//     const { user_id, device_token, platform } = dto;
//     console.log('📥 registerToken called with', dto);

//     const res = await pool.query(
//       `
//       INSERT INTO push_tokens (user_id, token, platform, updated_at)
//       VALUES ($1, $2, $3, now())
//       ON CONFLICT (user_id, token)
//       DO UPDATE SET updated_at = now()
//       RETURNING *;
//       `,
//       [user_id, device_token, platform],
//     );

//     return { message: 'Push token registered', token: res.rows[0] };
//   }

//   // ✅ Upsert a user’s notification preferences
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

//     await pool.query(
//       `
//       INSERT INTO notification_preferences (
//         user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour
//       )
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

//     return { message: 'Preferences saved' };
//   }

//   // ✅ Fetch a user’s notification preferences
//   async getPreferences(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT * FROM notification_preferences WHERE user_id = $1`,
//       [user_id],
//     );
//     return rows[0] ?? null;
//   }

//   // ✅ Send a push to a single user (used by your Fashion Feed events)
//   async sendPushToUser(
//     user_id: string,
//     title: string,
//     body: string,
//     data?: Record<string, string>,
//   ) {
//     const prefs = await this.getPreferences(user_id);
//     if (prefs && prefs.push_enabled === false) return { sent: 0 };

//     const { rows: tokens } = await pool.query(
//       `SELECT token FROM push_tokens WHERE user_id = $1`,
//       [user_id],
//     );
//     if (!tokens.length) return { sent: 0 };

//     let sent = 0;
//     for (const t of tokens) {
//       const ok = await this.sendToToken(t.token, { title, body, data });
//       if (ok) sent++;
//     }
//     return { sent };
//   }

//   // ✅ Notify everyone who follows a given source (used by Fashion Feed ingestion)
//   async notifyFollowersOfSourceArticle(input: {
//     source: string;
//     title: string;
//     url?: string;
//     image?: string;
//   }) {
//     const { source, title, url, image } = input;

//     const { rows: users } = await pool.query(
//       `
//       SELECT u.user_id
//       FROM follow_subscriptions u
//       JOIN notification_preferences p ON p.user_id = u.user_id
//       WHERE u.kind = 'source'
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

//   // ─────────────────────────────────────────────────────────────
//   // Internal: send to a single device token via Firebase Admin SDK
//   // ─────────────────────────────────────────────────────────────
//   private async sendToToken(
//     token: string,
//     payload: PushPayload,
//   ): Promise<boolean> {
//     try {
//       const message = {
//         token,
//         notification: {
//           title: payload.title,
//           body: payload.body,
//         },
//         data: payload.data ?? {},
//       };

//       const id = await admin.messaging().send(message);
//       console.log('✅ FCM sent:', id);
//       return true;
//     } catch (e: any) {
//       console.error('❌ FCM error:', e?.message || e);
//       return false;
//     }
//   }
// }

////////////////

// // apps/backend-nest/src/notifications/notifications.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';

// type PushPayload = {
//   title: string;
//   body: string;
//   data?: Record<string, string>;
// };

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class NotificationsService {
//   // ✅ Register or update a device push token
//   async registerToken(dto: {
//     user_id: string;
//     device_token: string;
//     platform: 'ios' | 'android';
//   }) {
//     const { user_id, device_token, platform } = dto;

//     console.log('📥 registerToken called with', dto);

//     const res = await pool.query(
//       `
//   INSERT INTO push_tokens (user_id, token, platform, updated_at)
//   VALUES ($1, $2, $3, now())
//   ON CONFLICT (user_id, token)
//   DO UPDATE SET updated_at = now()
//   RETURNING *;
//   `,
//       [user_id, device_token, platform],
//     );

//     return { message: 'Push token registered', token: res.rows[0] };
//   }

//   // ✅ Upsert a user’s notification preferences
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

//     await pool.query(
//       `
//       INSERT INTO notification_preferences (
//         user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour
//       )
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

//     return { message: 'Preferences saved' };
//   }

//   // ✅ Fetch a user’s notification preferences
//   async getPreferences(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT * FROM notification_preferences WHERE user_id = $1`,
//       [user_id],
//     );
//     return rows[0] ?? null;
//   }

//   // ✅ Send a push to a single user (used by your Fashion Feed events)
//   async sendPushToUser(
//     user_id: string,
//     title: string,
//     body: string,
//     data?: Record<string, string>,
//   ) {
//     // Check preferences first (push_enabled)
//     const prefs = await this.getPreferences(user_id);
//     if (prefs && prefs.push_enabled === false) return { sent: 0 };

//     const { rows: tokens } = await pool.query(
//       `SELECT token FROM push_tokens WHERE user_id = $1`,
//       [user_id],
//     );
//     if (!tokens.length) return { sent: 0 };

//     let sent = 0;
//     for (const t of tokens) {
//       const ok = await this.sendToToken(t.token, { title, body, data });
//       if (ok) sent++;
//     }
//     return { sent };
//   }

//   // ✅ Notify everyone who follows a given source (used by Fashion Feed ingestion)
//   async notifyFollowersOfSourceArticle(input: {
//     source: string; // e.g. "Vogue"
//     title: string; // article title
//     url?: string; // deeplink
//     image?: string; // optional image url
//   }) {
//     const { source, title, url, image } = input;

//     // Find users who follow this source and want realtime following notifications
//     const { rows: users } = await pool.query(
//       `
//       SELECT u.user_id
//       FROM follow_subscriptions u
//       JOIN notification_preferences p ON p.user_id = u.user_id
//       WHERE u.kind = 'source'
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

//   // ─────────────────────────────────────────────────────────────
//   // Internal: send to a single device token via FCM (Node 18+ global fetch)
//   // ─────────────────────────────────────────────────────────────
//   private async sendToToken(
//     token: string,
//     payload: PushPayload,
//   ): Promise<boolean> {
//     try {
//       const resp = await fetch('https://fcm.googleapis.com/fcm/send', {
//         method: 'POST',
//         headers: {
//           Authorization: `key=${process.env.FCM_SERVER_KEY}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           to: token,
//           notification: {
//             title: payload.title,
//             body: payload.body,
//           },
//           data: payload.data ?? {},
//         }),
//       });
//       if (!resp.ok) {
//         const text = await resp.text().catch(() => '');
//         console.warn('FCM error:', resp.status, text);
//         return false;
//       }
//       return true;
//     } catch (e: any) {
//       console.error('FCM exception:', e?.message || e);
//       return false;
//     }
//   }
// }

///////////////////

// // apps/backend-nest/src/notifications/notifications.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';

// type PushPayload = {
//   title: string;
//   body: string;
//   data?: Record<string, string>;
// };

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class NotificationsService {
//   // ✅ Register or update a device push token
//   async registerToken(dto: {
//     user_id: string;
//     device_token: string;
//     platform: 'ios' | 'android';
//   }) {
//     const { user_id, device_token, platform } = dto;

//     console.log('📥 registerToken called with', dto);

//     const res = await pool.query(
//       `
//   INSERT INTO push_tokens (user_id, token, platform, updated_at)
//   VALUES ($1, $2, $3, now())
//   ON CONFLICT (user_id, token)
//   DO UPDATE SET updated_at = now()
//   RETURNING *;
//   `,
//       [user_id, device_token, platform],
//     );

//     return { message: 'Push token registered', token: res.rows[0] };
//   }

//   // ✅ Upsert a user’s notification preferences
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

//     await pool.query(
//       `
//       INSERT INTO notification_preferences (
//         user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour
//       )
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

//     return { message: 'Preferences saved' };
//   }

//   // ✅ Fetch a user’s notification preferences
//   async getPreferences(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT * FROM notification_preferences WHERE user_id = $1`,
//       [user_id],
//     );
//     return rows[0] ?? null;
//   }

//   // ✅ Send a push to a single user (used by your Fashion Feed events)
//   async sendPushToUser(
//     user_id: string,
//     title: string,
//     body: string,
//     data?: Record<string, string>,
//   ) {
//     // Check preferences first (push_enabled)
//     const prefs = await this.getPreferences(user_id);
//     if (prefs && prefs.push_enabled === false) return { sent: 0 };

//     const { rows: tokens } = await pool.query(
//       `SELECT token FROM push_tokens WHERE user_id = $1`,
//       [user_id],
//     );
//     if (!tokens.length) return { sent: 0 };

//     let sent = 0;
//     for (const t of tokens) {
//       const ok = await this.sendToToken(t.token, { title, body, data });
//       if (ok) sent++;
//     }
//     return { sent };
//   }

//   // ✅ Notify everyone who follows a given source (used by Fashion Feed ingestion)
//   async notifyFollowersOfSourceArticle(input: {
//     source: string; // e.g. "Vogue"
//     title: string; // article title
//     url?: string; // deeplink
//     image?: string; // optional image url
//   }) {
//     const { source, title, url, image } = input;

//     // Find users who follow this source and want realtime following notifications
//     const { rows: users } = await pool.query(
//       `
//       SELECT u.user_id
//       FROM follow_subscriptions u
//       JOIN notification_preferences p ON p.user_id = u.user_id
//       WHERE u.kind = 'source'
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

//   // ─────────────────────────────────────────────────────────────
//   // Internal: send to a single device token via FCM (Node 18+ global fetch)
//   // ─────────────────────────────────────────────────────────────
//   private async sendToToken(
//     token: string,
//     payload: PushPayload,
//   ): Promise<boolean> {
//     try {
//       const resp = await fetch('https://fcm.googleapis.com/fcm/send', {
//         method: 'POST',
//         headers: {
//           Authorization: `key=${process.env.FCM_SERVER_KEY}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           to: token,
//           notification: {
//             title: payload.title,
//             body: payload.body,
//           },
//           data: payload.data ?? {},
//         }),
//       });
//       if (!resp.ok) {
//         const text = await resp.text().catch(() => '');
//         console.warn('FCM error:', resp.status, text);
//         return false;
//       }
//       return true;
//     } catch (e: any) {
//       console.error('FCM exception:', e?.message || e);
//       return false;
//     }
//   }
// }

////////////////

// // apps/backend-nest/src/notifications/notifications.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { RegisterTokenDto } from './dto/register-token.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class NotificationsService {
//   // ✅ Register or update a device push token
//   async registerToken(dto: RegisterTokenDto) {
//     const { user_id, device_token, platform } = dto;

//     const res = await pool.query(
//       `
//       INSERT INTO push_tokens (user_id, token, platform)
//       VALUES ($1, $2, $3)
//       ON CONFLICT (user_id, token)
//       DO UPDATE SET updated_at = now()
//       RETURNING *;
//       `,
//       [user_id, device_token, platform],
//     );

//     return { message: 'Push token registered', token: res.rows[0] };
//   }

//   // ✅ Upsert a user’s notification preferences
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

//     await pool.query(
//       `
//       INSERT INTO notification_preferences (
//         user_id, push_enabled, following_realtime, brands_realtime, breaking_realtime, digest_hour
//       )
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

//     return { message: 'Preferences saved' };
//   }

//   // ✅ Fetch a user’s notification preferences
//   async getPreferences(user_id: string) {
//     const { rows } = await pool.query(
//       `SELECT * FROM notification_preferences WHERE user_id = $1`,
//       [user_id],
//     );
//     return rows[0] ?? null;
//   }
// }

/////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { RegisterTokenDto } from './dto/register-token.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class NotificationsService {
//   async registerToken(dto: RegisterTokenDto) {
//     const { user_id, device_token, platform } = dto;

//     const res = await pool.query(
//       `
//       INSERT INTO push_tokens (user_id, token, platform)
//       VALUES ($1, $2, $3)
//       ON CONFLICT (user_id, token)
//       DO UPDATE SET updated_at = now()
//       RETURNING *;

//     `,
//       [user_id, device_token, platform],
//     );

//     return { message: 'Push token registered', token: res.rows[0] };
//   }
// }
