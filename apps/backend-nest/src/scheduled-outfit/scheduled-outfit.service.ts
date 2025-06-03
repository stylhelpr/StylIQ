import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateScheduledOutfitDto } from './dto/create-scheduled-outfit.dto';
import { UpdateScheduledOutfitDto } from './dto/update-scheduled-outfit.dto';

const pool = new Pool();

@Injectable()
export class ScheduledOutfitService {
  async create(dto: CreateScheduledOutfitDto) {
    const { user_id, outfit_id, outfit_type, scheduled_for, location, notes } =
      dto;

    const res = await pool.query(
      `INSERT INTO scheduled_outfits (
        user_id, outfit_id, outfit_type, scheduled_for, location, notes
      ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_id, outfit_id, outfit_type, scheduled_for, location, notes],
    );

    return res.rows[0];
  }

  async getByUser(userId: string) {
    const res = await pool.query(
      `SELECT * FROM scheduled_outfits WHERE user_id = $1 ORDER BY scheduled_for ASC`,
      [userId],
    );
    return res.rows;
  }

  async update(id: string, dto: UpdateScheduledOutfitDto) {
    const fields = Object.entries(dto).map(([key], i) => `${key} = $${i + 2}`);
    const values = Object.values(dto);
    const query = `UPDATE scheduled_outfits
      SET ${fields.join(', ')}, updated_at = now()
      WHERE id = $1 RETURNING *`;

    const res = await pool.query(query, [id, ...values]);
    return res.rows[0];
  }

  async delete(id: string) {
    await pool.query(`DELETE FROM scheduled_outfits WHERE id = $1`, [id]);
    return { message: 'Deleted' };
  }
}
