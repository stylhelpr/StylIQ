import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PromptDto } from './dto/prompt.dto';

const pool = new Pool();

@Injectable()
export class AiService {
  async handlePrompt(dto: PromptDto) {
    const {
      user_id,
      prompt,
      ai_response_summary,
      location,
      weather,
      suggested_outfit_id,
    } = dto;

    const res = await pool.query(
      `
      INSERT INTO ai_prompts (
        user_id, prompt, ai_response_summary, location, weather, suggested_outfit_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `,
      [
        user_id,
        prompt,
        ai_response_summary,
        location,
        weather,
        suggested_outfit_id,
      ],
    );

    return { message: 'Prompt logged', prompt_id: res.rows[0].id };
  }
}
