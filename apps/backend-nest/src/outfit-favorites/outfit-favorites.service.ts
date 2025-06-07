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

    await pool.query(
      `
        INSERT INTO outfit_favorites (user_id, outfit_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, outfit_id) DO NOTHING
      `,
      [user_id, outfit_id],
    );

    return { message: 'Favorited' };
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
        SELECT o.*
        FROM outfit_favorites f
        JOIN outfit_suggestions o ON o.id = f.outfit_id
        WHERE f.user_id = $1
        ORDER BY f.saved_at DESC
      `,
      [user_id],
    );

    return result.rows;
  }
}
