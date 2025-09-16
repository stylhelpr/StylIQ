import { Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class StyleProfileService {
  async getInternalUserId(auth0Sub: string): Promise<string> {
    const userRes = await pool.query(
      'SELECT id FROM users WHERE auth0_sub = $1',
      [auth0Sub],
    );

    if (userRes.rowCount === 0) {
      throw new NotFoundException(`User not found for sub: ${auth0Sub}`);
    }

    return userRes.rows[0].id;
  }

  async getProfile(auth0Sub: string) {
    const userId = await this.getInternalUserId(auth0Sub);

    let profileRes = await pool.query(
      'SELECT * FROM style_profiles WHERE user_id = $1',
      [userId],
    );

    if (profileRes.rowCount === 0) {
      await pool.query('INSERT INTO style_profiles (user_id) VALUES ($1)', [
        userId,
      ]);

      profileRes = await pool.query(
        'SELECT * FROM style_profiles WHERE user_id = $1',
        [userId],
      );
    }

    return profileRes.rows[0];
  }

  async updateProfile(auth0Sub: string, dto: UpdateStyleProfileDto) {
    const userId = await this.getInternalUserId(auth0Sub);

    const filteredEntries = Object.entries(dto).filter(
      ([, val]) => val !== null && val !== undefined,
    );

    if (filteredEntries.length === 0) {
      console.warn('⚠️ No valid fields to update.');
      return;
    }

    const keys = filteredEntries.map(([key]) => key);
    const values = filteredEntries.map(([, val]) => val);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    console.log('👀 Writing values to DB:', {
      userId,
      ...Object.fromEntries(filteredEntries),
    });

    const query = `
      INSERT INTO style_profiles (user_id, ${keys.join(', ')})
      VALUES ($1, ${values.map((_, i) => `$${i + 2}`).join(', ')})
      ON CONFLICT (user_id)
      DO UPDATE SET ${setClause}, updated_at = now()
      RETURNING *;
    `;

    const result = await pool.query(query, [userId, ...values]);
    console.log('✅ Saved to DB:', result.rows[0]);
    return result.rows[0];
  }
}
