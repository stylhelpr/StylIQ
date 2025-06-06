import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { SuggestOutfitDto } from './dto/suggest-outfit.dto';
import { OutfitFeedbackDto } from './dto/outfit-feedback.dto';
import { FavoriteOutfitDto } from './dto/favorite-outfit.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class OutfitService {
  async suggestOutfit(dto: SuggestOutfitDto) {
    const {
      user_id,
      prompt,
      top_id,
      bottom_id,
      shoes_id,
      accessory_ids,
      weather_data,
      location,
    } = dto;

    const res = await pool.query(
      `INSERT INTO outfit_suggestions (
        user_id, prompt, top_id, bottom_id, shoes_id,
        accessory_ids, weather_data, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        user_id,
        prompt,
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
    const res = await pool.query(
      'SELECT * FROM outfit_suggestions WHERE user_id = $1 ORDER BY suggested_at DESC',
      [userId],
    );
    return res.rows;
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
}
