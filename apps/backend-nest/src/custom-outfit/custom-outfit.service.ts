import { Injectable } from '@nestjs/common';
import { CreateCustomOutfitDto } from './dto/create-custom-outfit.dto';
import { UpdateCustomOutfitDto } from './dto/update-custom-outfit.dto';
import { pool } from '../db/pool';

@Injectable()
export class CustomOutfitService {
  async create(dto: CreateCustomOutfitDto) {
    const {
      user_id,
      name,
      top_id,
      bottom_id,
      shoes_id,
      accessory_ids,
      notes,
      canvas_data,
      thumbnail_url,
    } = dto;

    const result = await pool.query(
      `INSERT INTO custom_outfits (
        user_id, name, top_id, bottom_id, shoes_id, accessory_ids, notes, canvas_data, thumbnail_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        user_id,
        name,
        top_id,
        bottom_id,
        shoes_id,
        accessory_ids,
        notes,
        canvas_data ? JSON.stringify(canvas_data) : null,
        thumbnail_url,
      ],
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

  async update(id: string, userId: string, dto: UpdateCustomOutfitDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 2;

    for (const key of Object.keys(dto) as (keyof UpdateCustomOutfitDto)[]) {
      const value = dto[key];
      if (value !== undefined) {
        fields.push(`${key} = $${++i}`);
        // Stringify JSONB fields for PostgreSQL
        if (key === 'canvas_data' || key === 'metadata') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (fields.length === 0) {
      const existing = await pool.query(
        `SELECT * FROM custom_outfits WHERE id = $1 AND user_id = $2`,
        [id, userId],
      );
      return {
        message: 'Custom outfit updated successfully',
        outfit: existing.rows[0] || null,
      };
    }

    const query = `
    UPDATE custom_outfits
    SET ${fields.join(', ')}, updated_at = now()
    WHERE id = $1 AND user_id = $2
    RETURNING *;
  `;

    const result = await pool.query(query, [id, userId, ...values]);
    return {
      message: 'Custom outfit updated successfully',
      outfit: result.rows[0] || null,
    };
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM custom_outfits WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}
