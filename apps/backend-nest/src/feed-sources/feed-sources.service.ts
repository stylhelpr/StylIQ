import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

type SourceInput = { name?: string; url: string; enabled?: boolean };

@Injectable()
export class FeedSourcesService {
  // ────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────
  private trimOrEmpty(v?: string) {
    return (v ?? '').trim();
  }

  // ────────────────────────────────────────────────────────────────
  // Queries
  // ────────────────────────────────────────────────────────────────
  async findAll(userId: string) {
    const { rows } = await pool.query(
      `SELECT id, name, url, enabled
         FROM user_feed_sources
        WHERE user_id = $1
        ORDER BY created_at ASC`,
      [userId],
    );
    return rows;
  }

  /**
   * Replace a user's sources in an idempotent way:
   * - Dedup incoming by URL
   * - Upsert (ON CONFLICT (user_id, url))
   * - Delete rows not in the incoming set
   */
  async replaceAll(userId: string, sources: SourceInput[]) {
    const client = await pool.connect();
    try {
      // 1) Dedupe by URL (trim), keep first occurrence
      const byUrl = new Map<
        string,
        { name: string; url: string; enabled: boolean }
      >();
      for (const s of sources ?? []) {
        const url = this.trimOrEmpty(s?.url);
        if (!url) continue;
        if (!byUrl.has(url)) {
          byUrl.set(url, {
            name: this.trimOrEmpty(s?.name),
            url,
            enabled: s?.enabled ?? true,
          });
        }
      }
      const list = Array.from(byUrl.values());
      const urls = list.map((s) => s.url);

      await client.query('BEGIN');

      if (list.length) {
        // 2) Upsert all rows for this user
        const values: string[] = [];
        const params: any[] = [];
        list.forEach((s, i) => {
          const base = i * 4;
          values.push(
            `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`,
          );
          params.push(userId, s.name, s.url, s.enabled);
        });

        await client.query(
          `
          INSERT INTO user_feed_sources (user_id, name, url, enabled)
          VALUES ${values.join(',')}
          ON CONFLICT (user_id, url)
          DO UPDATE SET
            name       = COALESCE(NULLIF(EXCLUDED.name, ''), user_feed_sources.name),
            enabled    = EXCLUDED.enabled,
            updated_at = NOW()
          `,
          params,
        );

        // 3) Remove any rows for this user that are not in the new set
        await client.query(
          `
          DELETE FROM user_feed_sources
           WHERE user_id = $1
             AND url NOT IN (SELECT unnest($2::text[]))
          `,
          [userId, urls],
        );
      } else {
        // Empty replace → clear all rows for this user
        await client.query(`DELETE FROM user_feed_sources WHERE user_id = $1`, [
          userId,
        ]);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return this.findAll(userId);
  }

  /**
   * Create or enable/update a single source without throwing on duplicates.
   */
  async create(
    userId: string,
    body: { name: string; url: string; enabled?: boolean },
  ) {
    const name = this.trimOrEmpty(body?.name);
    const url = this.trimOrEmpty(body?.url);
    const enabled = body?.enabled ?? true;

    const { rows } = await pool.query(
      `
      INSERT INTO user_feed_sources (user_id, name, url, enabled)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, url)
      DO UPDATE SET
        name       = COALESCE(NULLIF(EXCLUDED.name, ''), user_feed_sources.name),
        enabled    = EXCLUDED.enabled,
        updated_at = NOW()
      RETURNING id, name, url, enabled
      `,
      [userId, name, url, enabled],
    );
    return rows[0];
  }

  /**
   * Update name/enabled for a specific row, scoped by user.
   */
  async update(
    userId: string,
    id: string,
    body: Partial<{ name: string; enabled: boolean }>,
  ) {
    const fields: string[] = [];
    const values: any[] = [id, userId]; // $1=id, $2=userId

    if (body.name !== undefined) {
      values.push(this.trimOrEmpty(body.name)); // $3...
      fields.push(`name = $${values.length}`);
    }
    if (body.enabled !== undefined) {
      values.push(body.enabled); // $4...
      fields.push(`enabled = $${values.length}`);
    }

    // No fields to update → return current row (no-op)
    if (fields.length === 0) {
      const { rows } = await pool.query(
        `SELECT id, name, url, enabled
           FROM user_feed_sources
          WHERE id = $1 AND user_id = $2`,
        [id, userId],
      );
      return rows[0];
    }

    const sql = `
      UPDATE user_feed_sources
         SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, name, url, enabled
    `;

    const { rows } = await pool.query(sql, values);
    return rows[0];
  }

  async remove(userId: string, id: string) {
    await pool.query(
      `DELETE FROM user_feed_sources WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return { success: true };
  }
}

////////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class FeedSourcesService {
//   async findAll(userId: string) {
//     const { rows } = await pool.query(
//       `SELECT id, name, url, enabled
//          FROM user_feed_sources
//         WHERE user_id = $1
//         ORDER BY created_at ASC`,
//       [userId],
//     );
//     return rows;
//   }

//   async replaceAll(userId: string, sources: any[]) {
//     const client = await pool.connect();
//     try {
//       await client.query('BEGIN');
//       await client.query(`DELETE FROM user_feed_sources WHERE user_id = $1`, [
//         userId,
//       ]);

//       for (const s of sources) {
//         await client.query(
//           `INSERT INTO user_feed_sources (user_id, name, url, enabled)
//              VALUES ($1, $2, $3, $4)`,
//           [userId, s.name, s.url, s.enabled ?? true],
//         );
//       }

//       await client.query('COMMIT');
//     } catch (e) {
//       await client.query('ROLLBACK');
//       throw e;
//     } finally {
//       client.release();
//     }
//     return this.findAll(userId);
//   }

//   async create(
//     userId: string,
//     body: { name: string; url: string; enabled?: boolean },
//   ) {
//     const { rows } = await pool.query(
//       `INSERT INTO user_feed_sources (user_id, name, url, enabled)
//          VALUES ($1, $2, $3, $4)
//        RETURNING id, name, url, enabled`,
//       [userId, body.name, body.url, body.enabled ?? true],
//     );
//     return rows[0];
//   }

//   async update(
//     userId: string,
//     id: string,
//     body: Partial<{ name: string; enabled: boolean }>,
//   ) {
//     const fields: string[] = []; // ← typed
//     const values: any[] = [id, userId]; // $1=id, $2=userId

//     if (body.name !== undefined) {
//       values.push(body.name); // $3...
//       fields.push(`name = $${values.length}`);
//     }
//     if (body.enabled !== undefined) {
//       values.push(body.enabled); // $4...
//       fields.push(`enabled = $${values.length}`);
//     }

//     // Nothing to update? Return current row (no-op).
//     if (fields.length === 0) {
//       const { rows } = await pool.query(
//         `SELECT id, name, url, enabled
//            FROM user_feed_sources
//           WHERE id = $1 AND user_id = $2`,
//         [id, userId],
//       );
//       return rows[0];
//     }

//     const sql = `
//       UPDATE user_feed_sources
//          SET ${fields.join(', ')}, updated_at = now()
//        WHERE id = $1 AND user_id = $2
//        RETURNING id, name, url, enabled
//     `;

//     const { rows } = await pool.query(sql, values);
//     return rows[0];
//   }

//   async remove(userId: string, id: string) {
//     await pool.query(
//       `DELETE FROM user_feed_sources WHERE id = $1 AND user_id = $2`,
//       [id, userId],
//     );
//     return { success: true };
//   }
// }
