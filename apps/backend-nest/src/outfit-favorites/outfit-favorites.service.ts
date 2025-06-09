import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { RemoveFavoriteDto } from './dto/remove-favorite.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class OutfitFavoritesService {
  async addFavorite(dto: AddFavoriteDto) {
    const { user_id, outfit_id } = dto;

    try {
      const result = await pool.query(
        `
      INSERT INTO outfit_favorites (user_id, outfit_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, outfit_id) DO NOTHING
      RETURNING *
      `,
        [user_id, outfit_id],
      );

      if (result.rows.length === 0) {
        console.log('⚠️ Favorite already exists:', { user_id, outfit_id });
        return { message: 'Already favorited' };
      }

      console.log('✅ Favorite added:', result.rows[0]);
      return { message: 'Favorited' };
    } catch (err) {
      console.error('❌ addFavorite failed:', err);
      throw err;
    }
  }

  async getUserFavoritesCount(userId: string) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM outfit_favorites WHERE user_id = $1`,
      [userId],
    );
    return { count: parseInt(result.rows[0].count, 10) };
  }

  async removeFavorite(dto: RemoveFavoriteDto) {
    const { user_id, outfit_id } = dto;

    await pool.query(
      `
      DELETE FROM outfit_favorites
      WHERE user_id = $1 AND outfit_id = $2
    `,
      [user_id, outfit_id],
    );

    return { message: 'Unfavorited' };
  }

  async getFavorites(user_id: string) {
    const result = await pool.query(
      `
    SELECT 
      o.id,
      o.name,
      f.saved_at::timestamptz AS favorited_on,
      NULL AS image_url,
      'suggestion' AS source
    FROM outfit_favorites f
    JOIN outfit_suggestions o ON o.id = f.outfit_id
    WHERE f.user_id = $1 AND f.outfit_type = 'suggestion'

    UNION ALL

    SELECT 
      c.id,
      c.name,
      f.saved_at::timestamptz AS favorited_on,
      NULL AS image_url,
      'custom' AS source
    FROM outfit_favorites f
    JOIN custom_outfits c ON c.id = f.outfit_id
    WHERE f.user_id = $1 AND f.outfit_type = 'custom'

    ORDER BY favorited_on DESC
    `,
      [user_id],
    );

    return result.rows;
  }
}
