import { Injectable } from '@nestjs/common';
import { UpdateStyleProfileDto } from '../style-profile/dto/update-style-profile.dto';
import { pool } from '../db/pool';

@Injectable()
export class StyleProfilesService {
  async getMeasurements(userId: string) {
    const result = await pool.query(
      `
      SELECT
        chest,
        waist,
        hip,
        shoulder_width,
        inseam,
        height,
        weight,
        shoe_size,
        all_measurements,
        updated_at
      FROM style_profiles
      WHERE user_id = $1;
      `,
      [userId],
    );

    return result.rows[0] || null;
  }

  async updateMeasurements(userId: string, dto: UpdateStyleProfileDto) {
    const {
      chest,
      waist,
      hip,
      shoulder_width,
      inseam,
      height,
      weight,
      shoe_size,
      all_measurements,
    } = dto;

    const result = await pool.query(
      `
      UPDATE style_profiles
      SET
        chest = COALESCE($1, chest),
        waist = COALESCE($2, waist),
        hip = COALESCE($3, hip),
        shoulder_width = COALESCE($4, shoulder_width),
        inseam = COALESCE($5, inseam),
        height = COALESCE($6, height),
        weight = COALESCE($7, weight),
        shoe_size = COALESCE($8, shoe_size),
        all_measurements = COALESCE($9::jsonb, all_measurements),
        updated_at = NOW()
      WHERE user_id = $10
      RETURNING *;
      `,
      [
        chest,
        waist,
        hip,
        shoulder_width,
        inseam,
        height,
        weight,
        shoe_size,
        all_measurements ? JSON.stringify(all_measurements) : null,
        userId,
      ],
    );

    return result.rows[0];
  }
}
