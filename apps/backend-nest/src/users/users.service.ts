import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class UsersService {
  async findById(id: string) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0];
  }

  async findByAuth0Sub(sub: string) {
    const res = await pool.query('SELECT * FROM users WHERE auth0_sub = $1', [
      sub,
    ]);
    return res.rows[0];
  }

  async create(dto: CreateUserDto) {
    const { auth0_sub, first_name, last_name, email, profile_picture } = dto;
    const res = await pool.query(
      `INSERT INTO users (auth0_sub, first_name, last_name, email, profile_picture)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [auth0_sub, first_name, last_name, email, profile_picture],
    );
    return res.rows[0];
  }

  async update(id: string, dto: UpdateUserDto) {
    const fields = Object.entries(dto).map(([key], i) => `${key} = $${i + 2}`);
    const values = Object.values(dto);

    const res = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return res.rows[0];
  }

  async delete(id: string) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return { success: true };
  }
}
