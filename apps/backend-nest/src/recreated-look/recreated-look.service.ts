import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class RecreatedLookService {
  private pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  async saveRecreatedLook(
    userId: string,
    data: { source_image_url: string; generated_outfit: any; tags?: string[] },
  ) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO recreated_looks (user_id, source_image_url, generated_outfit, tags, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id;
      `;
      const values = [
        userId,
        data.source_image_url,
        data.generated_outfit,
        data.tags || [],
      ];
      const result = await client.query(query, values);
      return { success: true, id: result.rows[0].id };
    } catch (err) {
      console.error('[RecreatedLookService] saveRecreatedLook failed:', err);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  }

  async getRecentRecreatedLooks(userId: string, limit = 20) {
    const client = await this.pool.connect();
    try {
      const query = `
      SELECT id, source_image_url, generated_outfit, tags, created_at
      FROM recreated_looks
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
      const result = await client.query(query, [userId, limit]);
      return { data: result.rows };
    } catch (err) {
      console.error(
        '[RecreatedLookService] getRecentRecreatedLooks failed:',
        err,
      );
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  }
}
