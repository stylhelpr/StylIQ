// apps/backend-nest/src/feedback/feedback.service.ts
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { createHash } from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

type ItemBoostMap = Record<string, number>;

// Stored ratings: 5 = like, 1 = dislike
const LIKE_THRESHOLD = 4;
const DISLIKE_THRESHOLD = 2;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// RFC 4122 DNS namespace (stable); any constant namespace is fine
const UUID_NS_DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function uuidToBytes(u: string): Buffer {
  const hex = u.replace(/-/g, '');
  const out = Buffer.alloc(16);
  for (let i = 0; i < 16; i++)
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToUuid(b: Buffer): string {
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Deterministic UUID v5 from (namespace + name). */
function uuidv5(name: string, namespace = UUID_NS_DNS): string {
  const ns = uuidToBytes(namespace);
  const nameBytes = Buffer.from(name, 'utf8');
  const hash = createHash('sha1')
    .update(Buffer.concat([ns, nameBytes]))
    .digest();
  const bytes = hash.subarray(0, 16);
  // set version (5) and variant (RFC 4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

/** If outfit_id isn't a UUID, derive a stable v5 UUID from it (salted by user). */
function coerceToUuid(outfit_id: string, user_id?: string): string {
  if (UUID_RE.test(outfit_id)) return outfit_id;
  return uuidv5(`${user_id ?? ''}|${outfit_id}`);
}

@Injectable()
export class FeedbackService {
  /**
   * Persist a single user rating for an outfit.
   * Schema: outfit_feedback(user_id UUID, outfit_id UUID, rating INT, notes TEXT)
   * rating: 5 for 'like', 1 for 'dislike'
   */
  async rate(dto: CreateFeedbackDto) {
    const { user_id, outfit_id, rating, notes } = dto;
    const outfitUuid = coerceToUuid(outfit_id, user_id);
    const numericRating = rating === 'like' ? 5 : 1;

    const res = await pool.query(
      `INSERT INTO outfit_feedback (user_id, outfit_id, rating, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, outfitUuid, numericRating, notes ?? null],
    );

    return res.rows[0];
  }

  /**
   * Aggregate simple per-item boosts from prior feedback.
   * Preferred source: notes.selected_item_ids {top,bottom,shoes} (JSON string).
   * Fallback: notes.raw_outfit_id like "a:b:c" if you stored it; last resort split outfit_id (legacy).
   * Returns: map item_id -> cumulative boost (+1 per like, -1 per dislike).
   */
  async getUserItemBoosts(
    userId: string,
    limitRows = 500,
  ): Promise<ItemBoostMap> {
    const res = await pool.query(
      `SELECT outfit_id, rating, notes
         FROM outfit_feedback
        WHERE user_id = $1
        ORDER BY id DESC
        LIMIT $2`,
      [userId, limitRows],
    );

    const boosts: ItemBoostMap = {};

    for (const row of res.rows as Array<{
      outfit_id: string;
      rating: number;
      notes?: string | null;
    }>) {
      const delta =
        row.rating >= LIKE_THRESHOLD
          ? 1
          : row.rating <= DISLIKE_THRESHOLD
            ? -1
            : 0;
      if (!delta) continue;

      let added = false;

      // 1) Preferred: pull item ids from notes.selected_item_ids
      if (row.notes) {
        try {
          const parsed = JSON.parse(row.notes);
          const sel = parsed?.selected_item_ids;
          if (sel) {
            const ids = [sel.top, sel.bottom, sel.shoes]
              .map((x: unknown) => (typeof x === 'string' ? x.trim() : ''))
              .filter(Boolean);
            if (ids.length) {
              for (const id of ids) boosts[id] = (boosts[id] || 0) + delta;
              added = true;
            }
          }
        } catch {
          // ignore malformed JSON
        }
      }

      // 2) Fallback: if you stored raw_outfit_id "a:b:c" in notes
      if (!added && row.notes) {
        try {
          const parsed = JSON.parse(row.notes);
          const raw = parsed?.raw_outfit_id as string | undefined;
          if (raw && raw.includes(':')) {
            const ids = raw
              .split(':')
              .map((s) => s.trim())
              .filter(Boolean);
            for (const id of ids) boosts[id] = (boosts[id] || 0) + delta;
            added = true;
          }
        } catch {
          /* noop */
        }
      }

      // 3) Legacy last resort: split outfit_id if it actually contains ':' (old TEXT schema)
      if (
        !added &&
        typeof row.outfit_id === 'string' &&
        row.outfit_id.includes(':')
      ) {
        const ids = row.outfit_id
          .split(':')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const id of ids) boosts[id] = (boosts[id] || 0) + delta;
      }
    }

    return boosts;
  }
}

///////////////////

// // feedback.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateFeedbackDto } from './dto/create-feedback.dto';
// import { createHash } from 'crypto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// type ItemBoostMap = Record<string, number>;

// // You store 5 for like, 1 for dislike
// const LIKE_THRESHOLD = 4;
// const DISLIKE_THRESHOLD = 2;

// const UUID_RE =
//   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// // DNS namespace for UUID v5 (RFC 4122). Any stable namespace works.
// const UUID_NS_DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// function uuidToBytes(u: string): Buffer {
//   const hex = u.replace(/-/g, '');
//   const out = Buffer.alloc(16);
//   for (let i = 0; i < 16; i++) {
//     out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
//   }
//   return out;
// }

// function bytesToUuid(b: Buffer): string {
//   const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
//   return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
//     16,
//     20,
//   )}-${hex.slice(20)}`;
// }

// /** Deterministic UUID v5 from (namespace + name). */
// function uuidv5(name: string, namespace = UUID_NS_DNS): string {
//   const ns = uuidToBytes(namespace);
//   const nameBytes = Buffer.from(name, 'utf8');
//   const hash = createHash('sha1')
//     .update(Buffer.concat([ns, nameBytes]))
//     .digest();
//   const bytes = hash.subarray(0, 16);

//   // Set version (5) and variant (RFC 4122)
//   bytes[6] = (bytes[6] & 0x0f) | 0x50;
//   bytes[8] = (bytes[8] & 0x3f) | 0x80;

//   return bytesToUuid(bytes);
// }

// /** If outfit_id isn't a UUID, derive a stable v5 UUID from it (optionally salted by user). */
// function coerceToUuid(outfit_id: string, user_id?: string): string {
//   if (UUID_RE.test(outfit_id)) return outfit_id;
//   // Salt by user so two users rating the same combo don't collide unless you want that.
//   return uuidv5(`${user_id ?? ''}|${outfit_id}`);
// }

// @Injectable()
// export class FeedbackService {
//   /**
//    * Persist a single user rating for an outfit.
//    * Uses your existing schema: outfit_feedback(user_id UUID, outfit_id UUID, rating INT, notes TEXT)
//    * rating is written as 5 for 'like' and 1 for 'dislike'
//    */
//   async rate(dto: CreateFeedbackDto) {
//     const { user_id, outfit_id, rating, notes } = dto;

//     // 👉 Make outfit_id valid for UUID column
//     const outfitUuid = coerceToUuid(outfit_id, user_id);

//     const numericRating = rating === 'like' ? 5 : 1;

//     const res = await pool.query(
//       `INSERT INTO outfit_feedback (user_id, outfit_id, rating, notes)
//        VALUES ($1, $2, $3, $4)
//        RETURNING *`,
//       [user_id, outfitUuid, numericRating, notes ?? null],
//     );

//     return res.rows[0];
//   }

//   /**
//    * Aggregate simple per-item boosts from prior feedback.
//    * Preferred source: notes.selected_item_ids { top, bottom, shoes } (JSON string).
//    * Fallback: if outfit_id looked like "a:b:c" in older rows, split that.
//    */
//   async getUserItemBoosts(
//     userId: string,
//     limitRows = 500,
//   ): Promise<ItemBoostMap> {
//     const res = await pool.query(
//       `SELECT outfit_id, rating, notes
//          FROM outfit_feedback
//         WHERE user_id = $1
//         ORDER BY id DESC
//         LIMIT $2`,
//       [userId, limitRows],
//     );

//     const boosts: ItemBoostMap = {};
//     for (const row of res.rows as Array<{
//       outfit_id: string; // UUID string post-coercion
//       rating: number;
//       notes?: string | null;
//     }>) {
//       // determine delta (+1 like, -1 dislike)
//       const delta =
//         row.rating >= LIKE_THRESHOLD
//           ? 1
//           : row.rating <= DISLIKE_THRESHOLD
//             ? -1
//             : 0;
//       if (!delta) continue;

//       // Try reading item IDs from notes JSON (preferred)
//       let added = false;
//       if (row.notes) {
//         try {
//           const parsed = JSON.parse(row.notes);
//           const sel = parsed?.selected_item_ids;
//           if (sel) {
//             const ids = [sel.top, sel.bottom, sel.shoes]
//               .map((x: unknown) => (typeof x === 'string' ? x.trim() : ''))
//               .filter(Boolean);
//             if (ids.length) {
//               for (const id of ids) boosts[id] = (boosts[id] || 0) + delta;
//               added = true;
//             }
//           }
//         } catch {
//           // ignore bad JSON
//         }
//       }

//       // Fallback for legacy rows: if notes didn’t include selected_item_ids BUT the original
//       // outfit_id looked like "a:b:c" before coercion, you may have stored that format in notes.
//       // Optionally parse a "raw_outfit_id" you put in notes; else skip.
//       if (!added && row.notes) {
//         try {
//           const parsed = JSON.parse(row.notes);
//           const raw = parsed?.raw_outfit_id as string | undefined;
//           if (raw && raw.includes(':')) {
//             const ids = raw
//               .split(':')
//               .map((s) => s.trim())
//               .filter(Boolean);
//             for (const id of ids) boosts[id] = (boosts[id] || 0) + delta;
//             added = true;
//           }
//         } catch {
//           /* noop */
//         }
//       }

//       // Absolute last resort (legacy): if you truly stored "a:b:c" directly in outfit_id in older rows
//       // and schema was TEXT at that time. If current schema is UUID, this won't happen anymore.
//       if (
//         !added &&
//         typeof row.outfit_id === 'string' &&
//         row.outfit_id.includes(':')
//       ) {
//         const ids = row.outfit_id
//           .split(':')
//           .map((s) => s.trim())
//           .filter(Boolean);
//         for (const id of ids) boosts[id] = (boosts[id] || 0) + delta;
//       }
//     }

//     return boosts;
//   }
// }

//////////////

// // feedback.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateFeedbackDto } from './dto/create-feedback.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// type ItemBoostMap = Record<string, number>;

// // You currently store 5 for "like" and 1 for "dislike"
// const LIKE_THRESHOLD = 4;
// const DISLIKE_THRESHOLD = 2;

// @Injectable()
// export class FeedbackService {
//   /**
//    * Persist a single user rating for an outfit.
//    * Uses your existing schema: outfit_feedback(user_id, outfit_id, rating, notes)
//    * rating is written as 5 for 'like' and 1 for 'dislike'
//    */
//   async rate(dto: CreateFeedbackDto) {
//     const { user_id, outfit_id, rating, notes } = dto;
//     const numericRating = rating === 'like' ? 5 : 1;

//     const res = await pool.query(
//       `INSERT INTO outfit_feedback (user_id, outfit_id, rating, notes)
//        VALUES ($1, $2, $3, $4)
//        RETURNING *`,
//       [user_id, outfit_id, numericRating, notes ?? null],
//     );

//     return res.rows[0];
//   }

//   /**
//    * Aggregate simple per-item boosts from prior feedback.
//    * No schema changes required: relies on outfit_id pattern "topId:bottomId:shoesId".
//    * Returns a map of item_id -> cumulative boost (likes add +1, dislikes add -1).
//    */
//   async getUserItemBoosts(
//     userId: string,
//     limitRows = 500,
//   ): Promise<ItemBoostMap> {
//     const res = await pool.query(
//       `SELECT outfit_id, rating
//          FROM outfit_feedback
//         WHERE user_id = $1
//         ORDER BY id DESC
//         LIMIT $2`,
//       [userId, limitRows],
//     );

//     const boosts: ItemBoostMap = {};
//     for (const row of res.rows as Array<{
//       outfit_id: string;
//       rating: number;
//     }>) {
//       const ids = String(row.outfit_id || '')
//         .split(':')
//         .map((s) => s.trim())
//         .filter(Boolean);

//       // rating >= 4 → like (+1), rating <= 2 → dislike (-1), else 0
//       const delta =
//         row.rating >= LIKE_THRESHOLD
//           ? 1
//           : row.rating <= DISLIKE_THRESHOLD
//             ? -1
//             : 0;

//       for (const id of ids) {
//         boosts[id] = (boosts[id] || 0) + delta;
//       }
//     }

//     return boosts;
//   }
// }

////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateFeedbackDto } from './dto/create-feedback.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class FeedbackService {
//   async rate(dto: CreateFeedbackDto) {
//     const { user_id, outfit_id, rating, notes } = dto;

//     const numericRating = rating === 'like' ? 5 : 1; // or whatever scale you want

//     const res = await pool.query(
//       `INSERT INTO outfit_feedback (user_id, outfit_id, rating, notes)
//      VALUES ($1, $2, $3, $4) RETURNING *`,
//       [user_id, outfit_id, numericRating, notes],
//     );

//     return res.rows[0];
//   }
// }
