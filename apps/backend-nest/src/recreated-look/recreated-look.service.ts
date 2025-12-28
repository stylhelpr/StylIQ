import { Injectable } from '@nestjs/common';
import { pool } from '../db/pool';

@Injectable()
export class RecreatedLookService {
  private pool = pool;

  async saveRecreatedLook(
    userId: string,
    data: {
      source_image_url: string;
      generated_outfit: any;
      tags?: string[];
      name?: string;
    },
  ) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO recreated_looks (user_id, source_image_url, generated_outfit, tags, name, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id;
      `;
      const values = [
        userId,
        data.source_image_url,
        data.generated_outfit,
        data.tags || [],
        data.name || null,
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
      SELECT id, source_image_url, generated_outfit, tags, name, created_at
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

  async updateRecreatedLook(userId: string, lookId: string, name?: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE recreated_looks
        SET name = $3
        WHERE id = $1 AND user_id = $2
        RETURNING id, name;
      `;
      const result = await client.query(query, [lookId, userId, name || null]);
      if (result.rowCount === 0) {
        return { success: false, error: 'Look not found or not owned by user' };
      }
      return { success: true, data: result.rows[0] };
    } catch (err) {
      console.error('[RecreatedLookService] updateRecreatedLook failed:', err);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  }

  async deleteRecreatedLook(userId: string, lookId: string) {
    const client = await this.pool.connect();
    try {
      const query = `
        DELETE FROM recreated_looks
        WHERE id = $1 AND user_id = $2
        RETURNING id;
      `;
      const result = await client.query(query, [lookId, userId]);
      if (result.rowCount === 0) {
        return { success: false, error: 'Look not found or not owned by user' };
      }
      return { success: true, deletedId: lookId };
    } catch (err) {
      console.error('[RecreatedLookService] deleteRecreatedLook failed:', err);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  }
}
