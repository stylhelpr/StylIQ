import { Injectable } from '@nestjs/common';
import { pool } from '../db/pool';

@Injectable()
export class LookMemoryService {
  private pool = pool;

  async createLookMemory(
    userId: string,
    data: {
      image_url: string;
      ai_tags: string[];
      query_used: string;
      result_clicked?: string;
    },
  ) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO look_memories (user_id, image_url, ai_tags, query_used, result_clicked, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id;
      `;
      const values = [
        userId,
        data.image_url,
        data.ai_tags,
        data.query_used,
        data.result_clicked || null,
      ];
      const result = await client.query(query, values);
      return { success: true, id: result.rows[0].id };
    } catch (err) {
      console.error('[LookMemoryService] createLookMemory failed:', err);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  }

  // ✅ New GET query for “Recent Vibes”
  async getLookMemory(userId: string, limit = 20) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, image_url, ai_tags, query_used, result_clicked, created_at
        FROM look_memories
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2;
      `;
      const result = await client.query(query, [userId, limit]);
      return result.rows;
    } catch (err) {
      console.error('[LookMemoryService] getLookMemory failed:', err);
      throw err;
    } finally {
      client.release();
    }
  }
}

/////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';

// @Injectable()
// export class LookMemoryService {
//   private pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
//   });

//   async createLookMemory(
//     userId: string,
//     data: {
//       image_url: string;
//       ai_tags: string[];
//       query_used: string;
//       result_clicked?: string;
//     },
//   ) {
//     const client = await this.pool.connect();
//     try {
//       const query = `
//         INSERT INTO look_memories (user_id, image_url, ai_tags, query_used, result_clicked, created_at)
//         VALUES ($1, $2, $3, $4, $5, NOW())
//         RETURNING id;
//       `;
//       const values = [
//         userId,
//         data.image_url,
//         data.ai_tags,
//         data.query_used,
//         data.result_clicked || null,
//       ];
//       const result = await client.query(query, values);
//       return { success: true, id: result.rows[0].id };
//     } catch (err) {
//       console.error('[LookMemoryService] createLookMemory failed:', err);
//       return { success: false, error: err.message };
//     } finally {
//       client.release();
//     }
//   }
// }
