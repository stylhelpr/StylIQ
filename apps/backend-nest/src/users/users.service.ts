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

    try {
      const res = await pool.query(
        `INSERT INTO users (auth0_sub, first_name, last_name, email, profile_picture, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [auth0_sub, first_name, last_name, email, profile_picture],
      );

      console.log('🟢 USER CREATED:', res.rows[0]);
      return res.rows[0];
    } catch (error) {
      console.error('🔥 ERROR CREATING USER:', error);
      throw error;
    }
  }

  async sync(dto: CreateUserDto) {
    console.log('🔵 SYNC SERVICE CALLED WITH:', dto);

    const existing = await pool.query(
      'SELECT * FROM users WHERE auth0_sub = $1',
      [dto.auth0_sub],
    );

    if (existing.rowCount > 0) {
      console.log('🟢 USER EXISTS:', existing.rows[0]);
      return existing.rows[0];
    }

    console.log('🟠 INSERTING NEW USER...');
    const user = await this.create(dto);

    console.log('🟣 CREATING DEFAULT STYLE PROFILE FOR USER ID:', user.id);

    try {
      await pool.query(`INSERT INTO style_profiles (user_id) VALUES ($1)`, [
        user.id,
      ]);
      console.log('✅ STYLE PROFILE CREATED');
    } catch (error) {
      console.error('❌ ERROR CREATING STYLE PROFILE:', error);
      throw error;
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const fields = Object.entries(dto).map(([key], i) => `${key} = $${i + 2}`);
    const values = Object.values(dto);

    const res = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );

    return res.rows[0];
  }

  async delete(id: string) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return { success: true };
  }
}

/////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class UsersService {
//   async findById(id: string) {
//     const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
//     return res.rows[0];
//   }

//   async findByAuth0Sub(sub: string) {
//     const res = await pool.query('SELECT * FROM users WHERE auth0_sub = $1', [
//       sub,
//     ]);
//     return res.rows[0];
//   }

//   async create(dto: CreateUserDto) {
//     const { auth0_sub, first_name, last_name, email, profile_picture } = dto;
//     const res = await pool.query(
//       `INSERT INTO users (auth0_sub, first_name, last_name, email, profile_picture)
//        VALUES ($1, $2, $3, $4, $5)
//        RETURNING *`,
//       [auth0_sub, first_name, last_name, email, profile_picture],
//     );
//     return res.rows[0];
//   }

//   async update(id: string, dto: UpdateUserDto) {
//     const fields = Object.entries(dto).map(([key], i) => `${key} = $${i + 2}`);
//     const values = Object.values(dto);

//     const res = await pool.query(
//       `UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
//       [id, ...values],
//     );
//     return res.rows[0];
//   }

//   async delete(id: string) {
//     await pool.query('DELETE FROM users WHERE id = $1', [id]);
//     return { success: true };
//   }
// }
