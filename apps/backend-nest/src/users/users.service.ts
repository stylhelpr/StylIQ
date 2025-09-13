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

  // src/users/users.service.ts
  async sync(dto: CreateUserDto) {
    console.log('🔵 SYNC SERVICE CALLED WITH:', dto);

    // 1) Find or create user
    const existing = await pool.query(
      'SELECT * FROM users WHERE auth0_sub = $1',
      [dto.auth0_sub],
    );

    let user = existing.rows[0];

    if (user) {
      // Light, safe refresh of basic fields if provided
      const toUpdate: Partial<CreateUserDto> = {};
      if (dto.email && dto.email !== user.email) toUpdate.email = dto.email;
      if (
        dto.first_name &&
        dto.first_name !== user.first_name &&
        dto.first_name !== dto.email
      )
        toUpdate.first_name = dto.first_name;
      if (dto.last_name && dto.last_name !== user.last_name)
        toUpdate.last_name = dto.last_name;
      if (dto.profile_picture && dto.profile_picture !== user.profile_picture)
        toUpdate.profile_picture = dto.profile_picture;

      if (Object.keys(toUpdate).length) {
        const keys = Object.keys(toUpdate);
        const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
        const vals = keys.map((k) => (toUpdate as any)[k]);
        const updated = await pool.query(
          `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [user.id, ...vals],
        );
        user = updated.rows[0];
      }
    } else {
      user = await this.create(dto);
    }

    // 2) Ensure a style profile exists
    let style = await pool
      .query('SELECT * FROM style_profiles WHERE user_id = $1 LIMIT 1', [
        user.id,
      ])
      .then((r) => r.rows[0]);

    if (!style) {
      await pool.query('INSERT INTO style_profiles (user_id) VALUES ($1)', [
        user.id,
      ]);
      style = await pool
        .query('SELECT * FROM style_profiles WHERE user_id = $1 LIMIT 1', [
          user.id,
        ])
        .then((r) => r.rows[0]);
    }

    // 3) Return both so the app has everything immediately
    return { user, style_profile: style };
  }

  async update(id: string, dto: UpdateUserDto) {
    // keep only defined values
    const entries = Object.entries(dto).filter(([, v]) => v !== undefined);

    // no fields? just return current row instead of generating bad SQL
    if (entries.length === 0) {
      const cur = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return cur.rows[0];
    }

    const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`);
    const values = entries.map(([, v]) => v);

    const res = await pool.query(
      `UPDATE users
       SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
      [id, ...values],
    );

    return res.rows[0];
  }

  async delete(id: string) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return { success: true };
  }
}

//////////////////

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

//     try {
//       const res = await pool.query(
//         `INSERT INTO users (auth0_sub, first_name, last_name, email, profile_picture, created_at)
//          VALUES ($1, $2, $3, $4, $5, NOW())
//          RETURNING *`,
//         [auth0_sub, first_name, last_name, email, profile_picture],
//       );

//       console.log('🟢 USER CREATED:', res.rows[0]);
//       return res.rows[0];
//     } catch (error) {
//       console.error('🔥 ERROR CREATING USER:', error);
//       throw error;
//     }
//   }

//   async sync(dto: CreateUserDto) {
//     console.log('🔵 SYNC SERVICE CALLED WITH:', dto);

//     const existing = await pool.query(
//       'SELECT * FROM users WHERE auth0_sub = $1',
//       [dto.auth0_sub],
//     );

//     if (existing.rowCount > 0) {
//       console.log('🟢 USER EXISTS:', existing.rows[0]);
//       return existing.rows[0];
//     }

//     console.log('🟠 INSERTING NEW USER...');
//     const user = await this.create(dto);

//     console.log('🟣 CREATING DEFAULT STYLE PROFILE FOR USER ID:', user.id);

//     try {
//       await pool.query(`INSERT INTO style_profiles (user_id) VALUES ($1)`, [
//         user.id,
//       ]);
//       console.log('✅ STYLE PROFILE CREATED');
//     } catch (error) {
//       console.error('❌ ERROR CREATING STYLE PROFILE:', error);
//       throw error;
//     }

//     return user;
//   }

//   async update(id: string, dto: UpdateUserDto) {
//     // keep only defined values
//     const entries = Object.entries(dto).filter(([, v]) => v !== undefined);

//     // no fields? just return current row instead of generating bad SQL
//     if (entries.length === 0) {
//       const cur = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
//       return cur.rows[0];
//     }

//     const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`);
//     const values = entries.map(([, v]) => v);

//     const res = await pool.query(
//       `UPDATE users
//        SET ${setClauses.join(', ')}, updated_at = NOW()
//      WHERE id = $1
//      RETURNING *`,
//       [id, ...values],
//     );

//     return res.rows[0];
//   }

//   async delete(id: string) {
//     await pool.query('DELETE FROM users WHERE id = $1', [id]);
//     return { success: true };
//   }
// }

/////////////////////

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

//     try {
//       const res = await pool.query(
//         `INSERT INTO users (auth0_sub, first_name, last_name, email, profile_picture, created_at)
//          VALUES ($1, $2, $3, $4, $5, NOW())
//          RETURNING *`,
//         [auth0_sub, first_name, last_name, email, profile_picture],
//       );

//       console.log('🟢 USER CREATED:', res.rows[0]);
//       return res.rows[0];
//     } catch (error) {
//       console.error('🔥 ERROR CREATING USER:', error);
//       throw error;
//     }
//   }

//   async sync(dto: CreateUserDto) {
//     console.log('🔵 SYNC SERVICE CALLED WITH:', dto);

//     const existing = await pool.query(
//       'SELECT * FROM users WHERE auth0_sub = $1',
//       [dto.auth0_sub],
//     );

//     if (existing.rowCount > 0) {
//       console.log('🟢 USER EXISTS:', existing.rows[0]);
//       return existing.rows[0];
//     }

//     console.log('🟠 INSERTING NEW USER...');
//     const user = await this.create(dto);

//     console.log('🟣 CREATING DEFAULT STYLE PROFILE FOR USER ID:', user.id);

//     try {
//       await pool.query(`INSERT INTO style_profiles (user_id) VALUES ($1)`, [
//         user.id,
//       ]);
//       console.log('✅ STYLE PROFILE CREATED');
//     } catch (error) {
//       console.error('❌ ERROR CREATING STYLE PROFILE:', error);
//       throw error;
//     }

//     return user;
//   }

//   async update(id: string, dto: UpdateUserDto) {
//     // keep only defined values
//     const entries = Object.entries(dto).filter(([, v]) => v !== undefined);

//     // no fields? just return current row instead of generating bad SQL
//     if (entries.length === 0) {
//       const cur = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
//       return cur.rows[0];
//     }

//     const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`);
//     const values = entries.map(([, v]) => v);

//     const res = await pool.query(
//       `UPDATE users
//        SET ${setClauses.join(', ')}, updated_at = NOW()
//      WHERE id = $1
//      RETURNING *`,
//       [id, ...values],
//     );

//     return res.rows[0];
//   }

//   async delete(id: string) {
//     await pool.query('DELETE FROM users WHERE id = $1', [id]);
//     return { success: true };
//   }
// }
