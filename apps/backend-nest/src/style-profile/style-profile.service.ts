import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class StyleProfileService {
  async getProfile(userId: string) {
    const res = await pool.query(
      `SELECT * FROM style_profiles WHERE user_id = $1`,
      [userId],
    );
    return res.rows[0];
  }

  async updateProfile(userId: string, dto: UpdateStyleProfileDto) {
    const entries = Object.entries(dto);
    const values = entries.map(([, val]) => val);

    const keys = entries.map(([key]) => key);
    const setClause = entries
      .map(([key], i) => `${key} = $${i + 2}`)
      .join(', ');

    const query = `
      INSERT INTO style_profiles (user_id, ${keys.join(', ')})
      VALUES ($1, ${values.map((_, i) => `$${i + 2}`).join(', ')})
      ON CONFLICT (user_id)
      DO UPDATE SET ${setClause ? `${setClause}, ` : ''}updated_at = now()
      RETURNING *;
    `;

    const res = await pool.query(query, [userId, ...values]);
    return res.rows[0];
  }
}
