import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

const pool = new Pool();

@Injectable()
export class FeedbackService {
  async rate(dto: CreateFeedbackDto) {
    const { user_id, outfit_id, rating, notes } = dto;
    const res = await pool.query(
      `INSERT INTO outfit_feedback (user_id, outfit_id, rating, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, outfit_id, rating, notes],
    );
    return res.rows[0];
  }
}
