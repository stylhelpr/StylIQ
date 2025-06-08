import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateScheduledOutfitDto } from './dto/create-scheduled-outfit.dto';
import { UpdateScheduledOutfitDto } from './dto/update-scheduled-outfit.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class ScheduledOutfitService {
  async create(dto: CreateScheduledOutfitDto) {
    const { user_id, outfit_id, outfit_type, scheduled_for, location, notes } =
      dto;

    if (outfit_type === 'custom') {
      const res = await pool.query(
        `INSERT INTO scheduled_outfits (
          user_id, custom_outfit_id, scheduled_for, location, notes
        ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [user_id, outfit_id, scheduled_for, location, notes],
      );
      return res.rows[0];
    } else if (outfit_type === 'ai') {
      const res = await pool.query(
        `INSERT INTO scheduled_outfits (
          user_id, ai_outfit_id, scheduled_for, location, notes
        ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [user_id, outfit_id, scheduled_for, location, notes],
      );
      return res.rows[0];
    } else {
      throw new Error('Invalid outfit_type. Must be "custom" or "ai".');
    }
  }

  async getByUser(userId: string) {
    const res = await pool.query(
      `
      SELECT so.id, so.scheduled_for, so.notes, so.created_at,
             COALESCE(os.name, co.name) AS outfit_name,
             COALESCE(os.rating, 0) AS rating
      FROM scheduled_outfits so
      LEFT JOIN outfit_suggestions os ON so.ai_outfit_id = os.id
      LEFT JOIN custom_outfits co ON so.custom_outfit_id = co.id
      WHERE so.user_id = $1
      ORDER BY so.scheduled_for ASC
      `,
      [userId],
    );
    return res.rows;
  }

  async update(id: string, dto: UpdateScheduledOutfitDto) {
    const entries = Object.entries(dto);
    const fields = entries.map(([key], i) => `${key} = $${i + 2}`);
    const values = entries.map(([, value]) => value);

    const res = await pool.query(
      `UPDATE scheduled_outfits
       SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, ...values],
    );

    return res.rows[0];
  }

  async delete(id: string) {
    await pool.query(`DELETE FROM scheduled_outfits WHERE id = $1`, [id]);
    return { message: 'Deleted' };
  }
}

///////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateScheduledOutfitDto } from './dto/create-scheduled-outfit.dto';
// import { UpdateScheduledOutfitDto } from './dto/update-scheduled-outfit.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class ScheduledOutfitService {
//   async create(dto: CreateScheduledOutfitDto) {
//     const { user_id, outfit_id, outfit_type, scheduled_for, location, notes } =
//       dto;

//     const column =
//       outfit_type === 'custom' ? 'custom_outfit_id' : 'ai_outfit_id';

//     const res = await pool.query(
//       `INSERT INTO scheduled_outfits (
//         user_id, ${column}, scheduled_for, location, notes
//       ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
//       [user_id, outfit_id, scheduled_for, location, notes],
//     );

//     return res.rows[0];
//   }

//   async getByUser(userId: string) {
//     const res = await pool.query(
//       `
//       SELECT so.id, so.scheduled_for, so.notes, so.created_at,
//              COALESCE(os.name, co.name) AS outfit_name,
//              COALESCE(os.rating, 0) AS rating
//       FROM scheduled_outfits so
//       LEFT JOIN outfit_suggestions os ON so.ai_outfit_id = os.id
//       LEFT JOIN custom_outfits co ON so.custom_outfit_id = co.id
//       WHERE so.user_id = $1
//       ORDER BY so.scheduled_for ASC
//       `,
//       [userId],
//     );
//     return res.rows;
//   }

//   async update(id: string, dto: UpdateScheduledOutfitDto) {
//     const entries = Object.entries(dto);
//     const fields = entries.map(([key], i) => `${key} = $${i + 2}`);
//     const values = entries.map(([, value]) => value);

//     const res = await pool.query(
//       `UPDATE scheduled_outfits
//        SET ${fields.join(', ')}, updated_at = now()
//        WHERE id = $1 RETURNING *`,
//       [id, ...values],
//     );

//     return res.rows[0];
//   }

//   async delete(id: string) {
//     await pool.query(`DELETE FROM scheduled_outfits WHERE id = $1`, [id]);
//     return { message: 'Deleted' };
//   }
// }

//////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateScheduledOutfitDto } from './dto/create-scheduled-outfit.dto';
// import { UpdateScheduledOutfitDto } from './dto/update-scheduled-outfit.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class ScheduledOutfitService {
//   async create(dto: CreateScheduledOutfitDto) {
//     const { user_id, outfit_id, outfit_type, scheduled_for, location, notes } =
//       dto;

//     const column =
//       outfit_type === 'custom' ? 'custom_outfit_id' : 'ai_outfit_id';

//     const res = await pool.query(
//       `INSERT INTO scheduled_outfits (
//         user_id, ${column}, scheduled_for, location, notes
//       ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
//       [user_id, outfit_id, scheduled_for, location, notes],
//     );

//     return res.rows[0];
//   }

//   async getByUser(userId: string) {
//     const res = await pool.query(
//       `
//     SELECT so.*,
//            co.name AS custom_outfit_name, co.rating AS custom_outfit_rating,
//            ao.name AS ai_outfit_name, ao.rating AS ai_outfit_rating
//     FROM scheduled_outfits so
//     LEFT JOIN custom_outfits co ON so.custom_outfit_id = co.id
//     LEFT JOIN outfit_suggestions ao ON so.ai_outfit_id = ao.id
//     WHERE so.user_id = $1
//     ORDER BY so.scheduled_for ASC
//     `,
//       [userId],
//     );

//     return res.rows.map((row) => ({
//       ...row,
//       outfit_name:
//         row.custom_outfit_name || row.ai_outfit_name || 'Unnamed Outfit',
//       rating: row.custom_outfit_rating ?? row.ai_outfit_rating,
//     }));
//   }

//   async delete(id: string) {
//     await pool.query(`DELETE FROM scheduled_outfits WHERE id = $1`, [id]);
//     return { message: 'Deleted' };
//   }
// }
