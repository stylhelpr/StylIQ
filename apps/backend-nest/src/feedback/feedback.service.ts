import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class FeedbackService {
  async rate(dto: CreateFeedbackDto) {
    const { user_id, outfit_id, rating, notes } = dto;

    const numericRating = rating === 'like' ? 5 : 1; // or whatever scale you want

    const res = await pool.query(
      `INSERT INTO outfit_feedback (user_id, outfit_id, rating, notes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, outfit_id, numericRating, notes],
    );

    return res.rows[0];
  }
}
