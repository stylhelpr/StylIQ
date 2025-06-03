import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateCustomOutfitDto } from './dto/create-custom-outfit.dto';
import { UpdateCustomOutfitDto } from './dto/update-custom-outfit.dto';

const pool = new Pool();

@Injectable()
export class CustomOutfitService {
  async create(dto: CreateCustomOutfitDto) {
    const { user_id, name, top_id, bottom_id, shoes_id, accessory_ids, notes } =
      dto;

    const res = await pool.query(
      `INSERT INTO custom_outfits (
        user_id, name, top_id, bottom_id, shoes_id, accessory_ids, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user_id, name, top_id, bottom_id, shoes_id, accessory_ids, notes],
    );

    return res.rows[0];
  }

  async getByUser(userId: string) {
    const res = await pool.query(
      `SELECT * FROM custom_outfits WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return res.rows;
  }

  async update(id: string, dto: UpdateCustomOutfitDto) {
    const fields = Object.entries(dto).map(([key], i) => `${key} = $${i + 2}`);
    const values = Object.values(dto);
    const query = `UPDATE custom_outfits
      SET ${fields.join(', ')}, updated_at = now()
      WHERE id = $1 RETURNING *`;

    const res = await pool.query(query, [id, ...values]);
    return res.rows[0];
  }

  async delete(id: string) {
    await pool.query(`DELETE FROM custom_outfits WHERE id = $1`, [id]);
    return { message: 'Deleted' };
  }
}
