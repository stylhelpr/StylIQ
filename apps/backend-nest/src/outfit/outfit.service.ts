import { Injectable, NotFoundException } from '@nestjs/common';
import { SuggestOutfitDto } from './dto/suggest-outfit.dto';
import { OutfitFeedbackDto } from './dto/outfit-feedback.dto';
import { FavoriteOutfitDto } from './dto/favorite-outfit.dto';
import { pool } from '../db/pool';

@Injectable()
export class OutfitService {
  async suggestOutfit(dto: SuggestOutfitDto) {
    const {
      user_id,
      prompt,
      name,
      thumbnail_url,
      top_id,
      bottom_id,
      shoes_id,
      accessory_ids,
      weather_data,
      location,
    } = dto;

    // 🔍 Debug log to verify input (you can remove later)
    // console.log('🧠 SuggestOutfit incoming IDs:', {
    //   top_id,
    //   bottom_id,
    //   shoes_id,
    // });

    // 🚨 Enforce presence of required wardrobe IDs
    if (!top_id || !bottom_id || !shoes_id) {
      throw new Error(
        `Missing required wardrobe IDs. Received: top_id=${top_id}, bottom_id=${bottom_id}, shoes_id=${shoes_id}`,
      );
    }

    const res = await pool.query(
      `INSERT INTO outfit_suggestions (
      user_id, prompt, name, thumbnail_url,
      top_id, bottom_id, shoes_id,
      accessory_ids, weather_data, location
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
      [
        user_id,
        prompt,
        name,
        thumbnail_url,
        top_id,
        bottom_id,
        shoes_id,
        accessory_ids,
        weather_data,
        location,
      ],
    );

    return res.rows[0];
  }

  async getSuggestions(userId: string) {
    // Ensure occasion column exists
    await pool.query(`
      ALTER TABLE outfit_suggestions ADD COLUMN IF NOT EXISTS occasion TEXT
    `);

    const res = await pool.query(
      `
      SELECT
        o.*,
        so.scheduled_for,
        t.id AS top_id, t.name AS top_name, t.image_url AS top_image_url,
        b.id AS bottom_id, b.name AS bottom_name, b.image_url AS bottom_image_url,
        s.id AS shoes_id, s.name AS shoes_name, s.image_url AS shoes_image_url
      FROM outfit_suggestions o
      LEFT JOIN wardrobe_items t ON o.top_id = t.id
      LEFT JOIN wardrobe_items b ON o.bottom_id = b.id
      LEFT JOIN wardrobe_items s ON o.shoes_id = s.id
      LEFT JOIN (
        SELECT DISTINCT ON (ai_outfit_id)
          ai_outfit_id, scheduled_for
        FROM scheduled_outfits
        WHERE user_id = $1
        ORDER BY ai_outfit_id, scheduled_for DESC
      ) so ON so.ai_outfit_id = o.id
      WHERE o.user_id = $1
      ORDER BY o.suggested_at DESC
      `,
      [userId],
    );

    return res.rows.map((row) => ({
      id: row.id,
      name: row.name ?? '',
      createdAt: row.suggested_at,
      plannedDate: row.scheduled_for ?? null,
      notes: row.notes ?? '',
      rating: row.rating ?? null,
      thumbnailUrl: row.thumbnail_url ?? '',
      prompt: row.prompt ?? '',
      occasion: row.occasion ?? null,
      top: {
        id: row.top_id,
        name: row.top_name,
        image: row.top_image_url,
      },
      bottom: {
        id: row.bottom_id,
        name: row.bottom_name,
        image: row.bottom_image_url,
      },
      shoes: {
        id: row.shoes_id,
        name: row.shoes_name,
        image: row.shoes_image_url,
      },
    }));
  }

  async getSuggestionById(id: string) {
    const res = await pool.query(
      'SELECT * FROM outfit_suggestions WHERE id = $1',
      [id],
    );
    return res.rows[0] ?? { message: 'Not found' };
  }

  async submitFeedback(dto: OutfitFeedbackDto) {
    const { user_id, outfit_id, rating, notes } = dto;
    const res = await pool.query(
      `INSERT INTO outfit_feedback (
        user_id, outfit_id, rating, notes
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [user_id, outfit_id, rating, notes],
    );
    return res.rows[0];
  }

  async favoriteOutfit(dto: FavoriteOutfitDto) {
    const { user_id, outfit_id } = dto;
    await pool.query(
      `INSERT INTO outfit_favorites (user_id, outfit_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [user_id, outfit_id],
    );
    return { message: 'Favorited' };
  }

  async unfavoriteOutfit(dto: FavoriteOutfitDto) {
    const { user_id, outfit_id } = dto;
    await pool.query(
      `DELETE FROM outfit_favorites WHERE user_id = $1 AND outfit_id = $2`,
      [user_id, outfit_id],
    );
    return { message: 'Unfavorited' };
  }

  async getFavorites(userId: string) {
    const res = await pool.query(
      `SELECT o.*
       FROM outfit_suggestions o
       JOIN outfit_favorites f ON o.id = f.outfit_id
       WHERE f.user_id = $1
       ORDER BY o.suggested_at DESC`,
      [userId],
    );
    return res.rows;
  }

  async getCustomOutfits(userId: string) {
    // Ensure occasion column exists
    await pool.query(`
      ALTER TABLE custom_outfits ADD COLUMN IF NOT EXISTS occasion TEXT
    `);

    const res = await pool.query(
      `
    SELECT
      co.id,
      co.name,
      co.created_at,
      co.notes,
      co.rating,
      co.occasion,

      t.id AS top_id,
      t.name AS top_name,
      t.image_url AS top_image_url,

      b.id AS bottom_id,
      b.name AS bottom_name,
      b.image_url AS bottom_image_url,

      s.id AS shoes_id,
      s.name AS shoes_name,
      s.image_url AS shoes_image_url

    FROM custom_outfits co
    LEFT JOIN wardrobe_items t ON co.top_id = t.id
    LEFT JOIN wardrobe_items b ON co.bottom_id = b.id
    LEFT JOIN wardrobe_items s ON co.shoes_id = s.id
    WHERE co.user_id = $1
    ORDER BY co.created_at DESC
    `,
      [userId],
    );

    // console.log('🧵 CUSTOM OUTFIT DB ROWS:', res.rows);

    return res.rows.map((row) => ({
      id: row.id,
      name: row.name ?? '',
      createdAt: new Date(row.created_at).toISOString(),
      notes: row.notes ?? '',
      rating: row.rating ?? null,
      thumbnailUrl: row.thumbnail_url ?? '',
      occasion: row.occasion ?? null,
      top: row.top_id
        ? {
            id: row.top_id,
            name: row.top_name,
            image: row.top_image_url,
          }
        : null,
      bottom: row.bottom_id
        ? {
            id: row.bottom_id,
            name: row.bottom_name,
            image: row.bottom_image_url,
          }
        : null,
      shoes: row.shoes_id
        ? {
            id: row.shoes_id,
            name: row.shoes_name,
            image: row.shoes_image_url,
          }
        : null,
    }));
  }

  async deleteOutfit(id: string, userId: string) {
    // Delete from AI-generated outfits (ownership enforced)
    const suggestionsResult = await pool.query(
      `DELETE FROM outfit_suggestions WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    );

    // Delete from custom outfits (ownership enforced)
    const customResult = await pool.query(
      `DELETE FROM custom_outfits WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    );

    // If neither table had a matching row owned by this user, throw 404
    if (suggestionsResult.rowCount === 0 && customResult.rowCount === 0) {
      throw new NotFoundException('Outfit not found');
    }

    // Clean up related data (these are scoped by outfit_id, not user-owned directly)
    await pool.query(`DELETE FROM outfit_feedback WHERE outfit_id = $1`, [id]);
    await pool.query(`DELETE FROM outfit_favorites WHERE outfit_id = $1`, [id]);

    return { message: 'Deleted from database' };
  }

  async updateOutfitName(
    table: 'custom' | 'suggestions',
    id: string,
    name: string,
  ) {
    const tableName =
      table === 'custom' ? 'custom_outfits' : 'outfit_suggestions';

    await pool.query(`UPDATE ${tableName} SET name = $1 WHERE id = $2`, [
      name,
      id,
    ]);

    return { message: 'Outfit name updated' };
  }

  async updateOutfit(
    table: 'custom' | 'suggestions',
    id: string,
    userId: string,
    name?: string,
    occasion?: string,
  ) {
    const tableName =
      table === 'custom' ? 'custom_outfits' : 'outfit_suggestions';

    // Ensure occasion column exists (migration)
    await pool.query(`
      ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS occasion TEXT
    `);

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (occasion !== undefined) {
      updates.push(`occasion = $${paramIndex}`);
      values.push(occasion || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return { message: 'Nothing to update' };
    }

    values.push(id);
    const idParamIndex = paramIndex;
    paramIndex++;
    values.push(userId);
    const userIdParamIndex = paramIndex;

    const result = await pool.query(
      `UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = $${idParamIndex} AND user_id = $${userIdParamIndex} RETURNING id`,
      values,
    );

    if (result.rowCount === 0) {
      throw new NotFoundException('Outfit not found');
    }

    return { message: 'Outfit updated' };
  }

  async markAsWorn(outfitId: string, outfitType: 'custom' | 'ai', userId: string) {
    const columnName = outfitType === 'custom' ? 'custom_outfit_id' : 'ai_outfit_id';

    // Insert a worn record with scheduled_for set to epoch (1970-01-01) so it doesn't appear on calendar
    // Only worn_at matters for the count
    // Also set notified_at to NOW() so the notification cron job skips this manual entry
    const { rows } = await pool.query(
      `
      INSERT INTO scheduled_outfits (user_id, ${columnName}, scheduled_for, worn_at, notified_at)
      VALUES ($1, $2, '1970-01-01'::timestamptz, NOW(), NOW())
      RETURNING *
      `,
      [userId, outfitId],
    );

    return rows[0];
  }

  async unmarkWorn(outfitId: string, outfitType: 'custom' | 'ai', userId: string) {
    const columnName = outfitType === 'custom' ? 'custom_outfit_id' : 'ai_outfit_id';

    // Delete the most recent worn record for this outfit
    const { rows } = await pool.query(
      `
      DELETE FROM scheduled_outfits
      WHERE id = (
        SELECT id FROM scheduled_outfits
        WHERE user_id = $1 AND ${columnName} = $2 AND worn_at IS NOT NULL
        ORDER BY worn_at DESC
        LIMIT 1
      )
      RETURNING *
      `,
      [userId, outfitId],
    );

    return rows[0] ?? { message: 'No worn record to remove' };
  }
}
