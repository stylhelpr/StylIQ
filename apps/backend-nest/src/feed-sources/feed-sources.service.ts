import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class FeedSourcesService {
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

  async replaceAll(userId: string, sources: any[]) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM user_feed_sources WHERE user_id = $1`, [
        userId,
      ]);

      for (const s of sources) {
        await client.query(
          `INSERT INTO user_feed_sources (user_id, name, url, enabled)
             VALUES ($1, $2, $3, $4)`,
          [userId, s.name, s.url, s.enabled ?? true],
        );
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

  async create(
    userId: string,
    body: { name: string; url: string; enabled?: boolean },
  ) {
    const { rows } = await pool.query(
      `INSERT INTO user_feed_sources (user_id, name, url, enabled)
         VALUES ($1, $2, $3, $4)
       RETURNING id, name, url, enabled`,
      [userId, body.name, body.url, body.enabled ?? true],
    );
    return rows[0];
  }

  async update(
    userId: string,
    id: string,
    body: Partial<{ name: string; enabled: boolean }>,
  ) {
    const fields: string[] = []; // ← typed
    const values: any[] = [id, userId]; // $1=id, $2=userId

    if (body.name !== undefined) {
      values.push(body.name); // $3...
      fields.push(`name = $${values.length}`);
    }
    if (body.enabled !== undefined) {
      values.push(body.enabled); // $4...
      fields.push(`enabled = $${values.length}`);
    }

    // Nothing to update? Return current row (no-op).
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
         SET ${fields.join(', ')}, updated_at = now()
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
