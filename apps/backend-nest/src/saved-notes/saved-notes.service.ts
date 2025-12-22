import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateSavedNoteDto } from './dto/create-saved-note.dto';
import { UpdateSavedNoteDto } from './dto/update-saved-note.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class SavedNotesService {
  async create(dto: CreateSavedNoteDto) {
    const { user_id, url, title, content, tags } = dto;
    const res = await pool.query(
      `INSERT INTO saved_notes (user_id, url, title, content, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, url ?? null, title ?? null, content ?? null, tags ?? null],
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

  async getById(id: string) {
    const res = await pool.query(
      `SELECT * FROM saved_notes WHERE id = $1`,
      [id],
    );
    return res.rows[0] || null;
  }

  async update(id: string, dto: UpdateSavedNoteDto) {
    const entries = Object.entries(dto).filter(
      ([_, value]) => value !== undefined,
    );
    if (entries.length === 0) {
      return this.getById(id);
    }

    const fields = entries.map(([key], i) => `${key} = $${i + 2}`);
    const values = entries.map(([_, value]) => value);

    const res = await pool.query(
      `UPDATE saved_notes
       SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, ...values],
    );
    return res.rows[0];
  }

  async delete(id: string) {
    const result = await pool.query(
      `DELETE FROM saved_notes WHERE id = $1`,
      [id],
    );
    return {
      message: result.rowCount && result.rowCount > 0 ? 'Deleted' : 'Not found',
    };
  }
}
