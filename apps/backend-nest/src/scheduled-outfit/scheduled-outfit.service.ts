import { Injectable } from '@nestjs/common';
import { CreateScheduledOutfitDto } from './dto/create-scheduled-outfit.dto';
import { UpdateScheduledOutfitDto } from './dto/update-scheduled-outfit.dto';
import { pool } from '../db/pool';

@Injectable()
export class ScheduledOutfitService {
  async create(dto: CreateScheduledOutfitDto) {
    const { user_id, outfit_id, outfit_type, scheduled_for, location, notes } =
      dto;

    const safeLocation = location ?? '';
    const safeNotes = notes ?? '';

    if (outfit_type === 'custom') {
      const res = await pool.query(
        `
        INSERT INTO scheduled_outfits (
          user_id, custom_outfit_id, scheduled_for, location, notes, worn_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *;
        `,
        [user_id, outfit_id, scheduled_for, safeLocation, safeNotes],
      );
      return res.rows[0];
    } else if (outfit_type === 'ai') {
      const res = await pool.query(
        `
        INSERT INTO scheduled_outfits (
          user_id, ai_outfit_id, scheduled_for, location, notes, worn_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *;
        `,
        [user_id, outfit_id, scheduled_for, safeLocation, safeNotes],
      );
      return res.rows[0];
    } else {
      throw new Error('Invalid outfit_type. Must be "custom" or "ai".');
    }
  }

  async getByUser(userId: string) {
    try {
      const result = await pool.query(
        `
        SELECT 
          os.id,
          os.user_id,
          os.custom_outfit_id,
          os.ai_outfit_id,
          os.scheduled_for,
          os.created_at,
          os.notified_at,
          co.name AS custom_name,
          ai.name AS ai_name
        FROM scheduled_outfits os
        LEFT JOIN custom_outfits    co ON os.custom_outfit_id = co.id
        LEFT JOIN outfit_suggestions ai ON os.ai_outfit_id    = ai.id
        WHERE os.user_id = $1
        ORDER BY os.scheduled_for ASC;
        `,
        [userId],
      );

      return result.rows;
    } catch (err) {
      console.error('❌ getByUser failed:', err);
      throw new Error('Failed to fetch scheduled outfits');
    }
  }

  async update(id: string, userId: string, dto: UpdateScheduledOutfitDto) {
    const entries = Object.entries(dto);
    if (entries.length === 0) {
      const { rows } = await pool.query(
        `UPDATE scheduled_outfits SET updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId],
      );
      return rows[0];
    }

    const fields = entries.map(([key], i) => `${key} = $${i + 3}`);
    const values = entries.map(([, value]) => value);

    // If scheduled_for is changing, clear notified_at to re-arm the alert
    const shouldClearNotified = Object.prototype.hasOwnProperty.call(
      dto,
      'scheduled_for',
    );

    const sql = `
      UPDATE scheduled_outfits
         SET ${fields.join(', ')}
           ${shouldClearNotified ? ', notified_at = NULL' : ''}
           , updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *;
    `;

    const res = await pool.query(sql, [id, userId, ...values]);
    return res.rows[0];
  }

  async delete(id: string, userId: string) {
    // Only delete if it's not a worn-tracking entry (epoch date entries are for worn counts)
    // Enforce ownership via user_id check
    await pool.query(
      `DELETE FROM scheduled_outfits WHERE id = $1 AND user_id = $2 AND scheduled_for > '1980-01-01'::timestamptz`,
      [id, userId],
    );
    return { message: 'Deleted' };
  }

  async deleteByUserAndOutfit(userId: string, outfitId: string) {
    // Only delete calendar entries, not worn-tracking entries (epoch date = worn count only)
    const res = await pool.query(
      `
      DELETE FROM scheduled_outfits
      WHERE user_id = $1
        AND (custom_outfit_id = $2 OR ai_outfit_id = $2)
        AND scheduled_for > '1980-01-01'::timestamptz
      RETURNING *;
      `,
      [userId, outfitId],
    );

    return { message: 'Deleted', rowsAffected: res.rowCount };
  }

  // ─────────────────────────────────────────────────────────
  // Helpers for cron-driven notifications
  // ─────────────────────────────────────────────────────────

  /** Fetch up to `limit` outfits due for notification (notified_at is NULL and scheduled_for <= now). */
  async getDue(limit = 500): Promise<
    Array<{
      id: string;
      user_id: string;
      scheduled_for: string;
      outfit_name: string | null;
    }>
  > {
    const { rows } = await pool.query(
      `
      SELECT
        so.id,
        so.user_id,
        so.scheduled_for,
        COALESCE(co.name, ai.name, 'your planned outfit') AS outfit_name
      FROM scheduled_outfits so
      LEFT JOIN custom_outfits    co ON so.custom_outfit_id = co.id
      LEFT JOIN outfit_suggestions ai ON so.ai_outfit_id    = ai.id
      WHERE so.notified_at IS NULL
        AND so.scheduled_for <= now()
      ORDER BY so.scheduled_for ASC
      LIMIT $1;
      `,
      [limit],
    );
    return rows;
  }

  /** Mark a batch of scheduled outfit rows as notified now. */
  async markNotified(ids: string[]) {
    if (!ids?.length) return { updated: 0 };
    const { rowCount } = await pool.query(
      `UPDATE scheduled_outfits SET notified_at = now() WHERE id = ANY($1::uuid[])`,
      [ids],
    );
    return { updated: rowCount };
  }

  /** Get outfit history - past scheduled outfits (excludes manual worn entries with epoch date) */
  async getHistory(userId: string) {
    const { rows } = await pool.query(
      `
      SELECT
        os.id,
        os.scheduled_for,
        os.worn_at,
        COALESCE(co.name, ai.name, 'Unnamed Outfit') AS outfit_name
      FROM scheduled_outfits os
      LEFT JOIN custom_outfits    co ON os.custom_outfit_id = co.id
      LEFT JOIN outfit_suggestions ai ON os.ai_outfit_id    = ai.id
      WHERE os.user_id = $1
        AND os.scheduled_for < NOW()
        AND os.scheduled_for > '1980-01-01'::timestamptz
      ORDER BY os.scheduled_for DESC;
      `,
      [userId],
    );
    return rows;
  }

  /** Mark a scheduled outfit as worn */
  async markAsWorn(id: string, userId: string) {
    const { rows } = await pool.query(
      `UPDATE scheduled_outfits SET worn_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId],
    );
    return rows[0];
  }

  /** Unmark a scheduled outfit as worn */
  async unmarkAsWorn(id: string, userId: string) {
    const { rows } = await pool.query(
      `UPDATE scheduled_outfits SET worn_at = NULL WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId],
    );
    return rows[0];
  }

  /** Get worn counts for all outfits for a user */
  async getWornCounts(userId: string) {
    const { rows } = await pool.query(
      `
      SELECT
        COALESCE(custom_outfit_id, ai_outfit_id) AS outfit_id,
        COUNT(*) FILTER (WHERE worn_at IS NOT NULL) AS times_worn
      FROM scheduled_outfits
      WHERE user_id = $1
      GROUP BY COALESCE(custom_outfit_id, ai_outfit_id)
      `,
      [userId],
    );
    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (row.outfit_id) {
        counts[row.outfit_id] = parseInt(row.times_worn, 10);
      }
    }
    // console.log('📊 getWornCounts for', userId, ':', counts);
    return counts;
  }
}

///////////////////

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

//     if (outfit_type === 'custom') {
//       const safeLocation = location ?? '';
//       const safeNotes = notes ?? '';

//       const res = await pool.query(
//         `
//     INSERT INTO scheduled_outfits (
//       user_id, custom_outfit_id, scheduled_for, location, notes
//     ) VALUES ($1, $2, $3, $4, $5)
//     ON CONFLICT (user_id, custom_outfit_id)
//     DO UPDATE SET
//       scheduled_for = EXCLUDED.scheduled_for,
//       location = EXCLUDED.location,
//       notes = EXCLUDED.notes,
//       updated_at = NOW()
//     RETURNING *`,
//         [user_id, outfit_id, scheduled_for, safeLocation, safeNotes],
//       );
//       return res.rows[0];
//     } else if (outfit_type === 'ai') {
//       const safeLocation = location ?? '';
//       const safeNotes = notes ?? '';

//       const res = await pool.query(
//         `
//     INSERT INTO scheduled_outfits (
//       user_id, ai_outfit_id, scheduled_for, location, notes
//     ) VALUES ($1, $2, $3, $4, $5)
//     ON CONFLICT (user_id, ai_outfit_id)
//     DO UPDATE SET
//       scheduled_for = EXCLUDED.scheduled_for,
//       location = EXCLUDED.location,
//       notes = EXCLUDED.notes,
//       updated_at = NOW()
//     RETURNING *`,
//         [user_id, outfit_id, scheduled_for, safeLocation, safeNotes],
//       );
//       return res.rows[0];
//     } else {
//       throw new Error('Invalid outfit_type. Must be "custom" or "ai".');
//     }
//   }

//   async getByUser(userId: string) {
//     try {
//       const result = await pool.query(
//         `
//       SELECT
//         os.id,
//         os.user_id,
//         os.custom_outfit_id,
//         os.ai_outfit_id,
//         os.scheduled_for,
//         os.created_at,
//         co.name AS custom_name,
//         ai.name AS ai_name
//       FROM scheduled_outfits os
//       LEFT JOIN custom_outfits co ON os.custom_outfit_id = co.id
//       LEFT JOIN outfit_suggestions ai ON os.ai_outfit_id = ai.id
//       WHERE os.user_id = $1
//       ORDER BY os.scheduled_for ASC
//       `,
//         [userId],
//       );

//       return result.rows;
//     } catch (err) {
//       console.error('❌ getByUser failed:', err);
//       throw new Error('Failed to fetch scheduled outfits');
//     }
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

//   async deleteByUserAndOutfit(userId: string, outfitId: string) {
//     const res = await pool.query(
//       `
//     DELETE FROM scheduled_outfits
//     WHERE user_id = $1 AND (custom_outfit_id = $2 OR ai_outfit_id = $2)
//     RETURNING *
//     `,
//       [userId, outfitId],
//     );

//     return { message: 'Deleted', rowsAffected: res.rowCount };
//   }
// }
