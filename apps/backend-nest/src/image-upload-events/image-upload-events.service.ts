import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateImageUploadEventDto } from './dto/create-image-upload-event.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class ImageUploadEventsService {
  async create(dto: CreateImageUploadEventDto) {
    const {
      user_id,
      wardrobe_item_id,
      file_name,
      width,
      height,
      ai_tags,
      embedding_vector,
    } = dto;

    const res = await pool.query(
      `INSERT INTO image_upload_events (
        user_id, wardrobe_item_id, file_name, width, height, ai_tags, embedding_vector
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        user_id,
        wardrobe_item_id,
        file_name,
        width,
        height,
        ai_tags,
        embedding_vector,
      ],
    );

    return res.rows[0];
  }

  async getByUser(userId: string) {
    const res = await pool.query(
      `SELECT * FROM image_upload_events WHERE user_id = $1 ORDER BY processed_at DESC`,
      [userId],
    );
    return res.rows;
  }
}
