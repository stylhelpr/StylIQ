import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { RegisterTokenDto } from './dto/register-token.dto';

const pool = new Pool();

@Injectable()
export class NotificationsService {
  async registerToken(dto: RegisterTokenDto) {
    const { user_id, device_token, platform } = dto;

    const res = await pool.query(
      `
      INSERT INTO push_tokens (user_id, device_token, platform)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, device_token)
      DO UPDATE SET updated_at = now()
      RETURNING *;
    `,
      [user_id, device_token, platform],
    );

    return { message: 'Push token registered', token: res.rows[0] };
  }
}
