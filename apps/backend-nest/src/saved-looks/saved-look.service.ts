import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSavedLookDto } from './dto/create-saved-look.dto';
import { UpdateSavedLookDto } from './dto/update-saved-look.dto';
import { pool, safeQuery } from '../db/pool';

@Injectable()
export class SavedLookService {
  async create(dto: CreateSavedLookDto) {
    const { user_id, image_url, name } = dto;

    const res = await pool.query(
      `INSERT INTO saved_looks (user_id, image_url, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, image_url, name ?? null],
    );

    return res.rows[0];
  }

  async getByUser(userId: string) {
    // Use safeQuery to handle connection timeouts gracefully (returns [] on failure)
    const res = await safeQuery(
      `SELECT * FROM saved_looks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
    return res.rows;
  }

  async update(id: string, dto: UpdateSavedLookDto) {
    // 🔎 Filter out undefined or null values so partial updates work
    const entries = Object.entries(dto).filter(
      ([_, value]) => value !== undefined,
    );

    if (entries.length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const fields = entries.map(([key], i) => `${key} = $${i + 2}`);
    const values = entries.map(([, value]) => value);

    const res = await pool.query(
      `UPDATE saved_looks
       SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, ...values],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException(`Saved look with ID ${id} not found`);
    }

    return res.rows[0];
  }

  async delete(id: string) {
    const result = await pool.query(`DELETE FROM saved_looks WHERE id = $1`, [
      id,
    ]);
    return { message: result.rowCount > 0 ? 'Deleted' : 'Not found' };
  }
}

//////////////

// // src/saved-look/saved-look.service.ts
// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateSavedLookDto } from './dto/create-saved-look.dto';
// import { UpdateSavedLookDto } from './dto/update-saved-look.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class SavedLookService {
//   async create(dto: CreateSavedLookDto) {
//     const { user_id, image_url, name } = dto;

//     const res = await pool.query(
//       `INSERT INTO saved_looks (user_id, image_url, name)
//        VALUES ($1, $2, $3)
//        RETURNING *`,
//       [user_id, image_url, name ?? null],
//     );

//     return res.rows[0];
//   }

//   async getByUser(userId: string) {
//     const res = await pool.query(
//       `SELECT * FROM saved_looks
//        WHERE user_id = $1
//        ORDER BY created_at DESC`,
//       [userId],
//     );
//     console.log('✅ Saved looks found:', res.rows);
//     return res.rows;
//   }

//   async update(id: string, dto: UpdateSavedLookDto) {
//     const entries = Object.entries(dto);
//     if (entries.length === 0) return null;

//     const fields = entries.map(([key], i) => `${key} = $${i + 2}`);
//     const values = entries.map(([, value]) => value);

//     const res = await pool.query(
//       `UPDATE saved_looks
//        SET ${fields.join(', ')}, updated_at = now()
//        WHERE id = $1
//        RETURNING *`,
//       [id, ...values],
//     );

//     return res.rows[0];
//   }

//   async delete(id: string) {
//     const result = await pool.query(`DELETE FROM saved_looks WHERE id = $1`, [
//       id,
//     ]);
//     return { message: result.rowCount > 0 ? 'Deleted' : 'Not found' };
//   }
// }

//////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateSavedLookDto } from './dto/create-saved-look.dto';
// import { UpdateSavedLookDto } from './dto/update-saved-look.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class SavedLookService {
//   async create(dto: CreateSavedLookDto) {
//     const { user_id, image_url, name } = dto;

//     const res = await pool.query(
//       `INSERT INTO saved_looks (user_id, image_url, name)
//        VALUES ($1, $2, $3)
//        RETURNING *`,
//       [user_id, image_url, name ?? null],
//     );

//     return res.rows[0];
//   }

//   async getByUser(userId: string) {
//     const res = await pool.query(
//       `SELECT * FROM saved_looks
//        WHERE user_id = $1
//        ORDER BY created_at DESC`,
//       [userId],
//     );
//     console.log('✅ Saved looks found:', res.rows);
//     return res.rows;
//   }

//   async update(id: string, dto: UpdateSavedLookDto) {
//     const entries = Object.entries(dto);
//     if (entries.length === 0) return null;

//     const fields = entries.map(([key], i) => `${key} = $${i + 2}`);
//     const values = entries.map(([, value]) => value);

//     const res = await pool.query(
//       `UPDATE saved_looks
//        SET ${fields.join(', ')}, updated_at = now()
//        WHERE id = $1
//        RETURNING *`,
//       [id, ...values],
//     );

//     return res.rows[0];
//   }

//   async delete(id: string) {
//     await pool.query(`DELETE FROM saved_looks WHERE id = $1`, [id]);
//     return { message: 'Deleted' };
//   }
// }
