import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool();

@Injectable()
export class UsersService {
  async upsertUser(sub: string, data: any) {
    const { first_name, last_name, email, profile_picture } = data;

    const result = await pool.query(
      `
      INSERT INTO users (auth0_sub, first_name, last_name, email, profile_picture)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (auth0_sub) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        profile_picture = EXCLUDED.profile_picture
      RETURNING *;
    `,
      [sub, first_name, last_name, email, profile_picture],
    );

    return result.rows[0];
  }

  findUserById(id: string) {
    // Optional helper method
    return { id, name: 'Placeholder' };
  }
}
