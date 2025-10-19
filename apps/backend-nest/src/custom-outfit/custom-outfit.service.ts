import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateCustomOutfitDto } from './dto/create-custom-outfit.dto';
import { UpdateCustomOutfitDto } from './dto/update-custom-outfit.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class CustomOutfitService {
  async create(dto: CreateCustomOutfitDto) {
    const { user_id, name, top_id, bottom_id, shoes_id, accessory_ids, notes } =
      dto;

    const result = await pool.query(
      `INSERT INTO custom_outfits (
        user_id, name, top_id, bottom_id, shoes_id, accessory_ids, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [user_id, name, top_id, bottom_id, shoes_id, accessory_ids, notes],
    );

    return {
      message: 'Custom outfit created successfully',
      outfit: result.rows[0],
    };
  }

  async countByUser(userId: string): Promise<{ count: number }> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM custom_outfits WHERE user_id = $1',
      [userId],
    );
    return { count: Number(result.rows[0].count) };
  }

  async getByUser(userId: string) {
    const result = await pool.query(
      `SELECT * FROM custom_outfits WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows;
  }

  async update(id: string, dto: UpdateCustomOutfitDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    for (const key of Object.keys(dto) as (keyof UpdateCustomOutfitDto)[]) {
      const value = dto[key];
      if (value !== undefined) {
        fields.push(`${key} = $${++i}`);
        values.push(value);
      }
    }

    const query = `
    UPDATE custom_outfits
    SET ${fields.join(', ')}, updated_at = now()
    WHERE id = $1
    RETURNING *;
  `;

    const result = await pool.query(query, [id, ...values]);
    return {
      message: 'Custom outfit updated successfully',
      outfit: result.rows[0],
    };
  }

  async delete(id: string) {
    await pool.query(`DELETE FROM custom_outfits WHERE id = $1`, [id]);
    return { message: 'Custom outfit deleted successfully' };
  }
}
