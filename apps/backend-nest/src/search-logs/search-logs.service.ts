import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateSearchLogDto } from './dto/create-search-log.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class SearchLogsService {
  async create(dto: CreateSearchLogDto) {
    const { user_id, prompt, result_count } = dto;
    const query = `
      INSERT INTO search_logs (user_id, prompt, result_count)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const res = await pool.query(query, [user_id, prompt, result_count]);
    return res.rows[0];
  }

  async getByUser(userId: string) {
    const res = await pool.query(
      `SELECT * FROM search_logs WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return res.rows;
  }
}
