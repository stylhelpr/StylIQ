import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { UpdateMeasurementsDto } from './dto/update-measurements.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class StyleProfilesService {
  async updateMeasurements(userId: string, dto: UpdateMeasurementsDto) {
    const { chest, waist, hip, shoulder_width, inseam } = dto;

    const result = await pool.query(
      `
      UPDATE style_profiles
      SET
        chest = $1,
        waist = $2,
        hip = $3,
        shoulder_width = $4,
        inseam = $5,
        updated_at = NOW()
      WHERE user_id = $6
      RETURNING *;
      `,
      [chest, waist, hip, shoulder_width, inseam, userId],
    );

    return result.rows[0];
  }
}
