import { Injectable } from '@nestjs/common';
import { CreateSavedNoteDto } from './dto/create-saved-note.dto';
import { UpdateSavedNoteDto } from './dto/update-saved-note.dto';
import { pool } from '../db/pool';

@Injectable()
export class SavedNotesService {
  async create(dto: CreateSavedNoteDto) {
    const { user_id, url, title, content, tags, color, image_url } = dto;
    const res = await pool.query(
      `INSERT INTO saved_notes (user_id, url, title, content, tags, color, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, url ?? null, title ?? null, content ?? null, tags ?? null, color ?? null, image_url ?? null],
    );
    return res.rows[0];
  }

  async getByUser(userId: string) {
    const res = await pool.query(
      `SELECT * FROM saved_notes
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
    return res.rows;
  }

  async getById(id: string, userId: string) {
    const res = await pool.query(
      `SELECT * FROM saved_notes WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return res.rows[0] || null;
  }

  async update(id: string, userId: string, dto: UpdateSavedNoteDto) {
    const entries = Object.entries(dto).filter(
      ([_, value]) => value !== undefined,
    );
    if (entries.length === 0) {
      return this.getById(id, userId);
    }

    const fields = entries.map(([key], i) => `${key} = $${i + 3}`);
    const values = entries.map(([_, value]) => value);

    const res = await pool.query(
      `UPDATE saved_notes
       SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values],
    );
    return res.rows[0] || null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM saved_notes WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}
