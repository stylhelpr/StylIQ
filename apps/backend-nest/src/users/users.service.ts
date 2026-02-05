import { Injectable } from '@nestjs/common';
import { pool } from '../db/pool';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private isDefaultAvatar(url?: string | null): boolean {
    if (!url) return true;
    return (
      url.includes('gravatar.com') ||
      url.includes('cdn.auth0.com/avatars') ||
      url.includes('https://s.gravatar.com/avatar')
    );
  }

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

    // 🧼 Sanitize profile_picture before inserting — set to null if default
    const cleanedProfilePicture = this.isDefaultAvatar(profile_picture)
      ? null
      : profile_picture;

    try {
      const res = await pool.query(
        `INSERT INTO users (auth0_sub, first_name, last_name, email, profile_picture, created_at, learning_consent, learning_consent_ts)
         VALUES ($1, $2, $3, $4, $5, NOW(), true, NOW())
         RETURNING *`,
        [auth0_sub, first_name, last_name, email, cleanedProfilePicture],
      );

      // Log only user ID, never PII (email, name)
      // console.log('🟢 USER CREATED:', res.rows[0]?.id);
      return res.rows[0];
    } catch (error) {
      // Log error type only, not user data
      console.error('🔥 ERROR CREATING USER:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async sync(dto: CreateUserDto) {
    // DEBUG: Log auth0_sub to verify it's unique per account
    console.log('[UsersService.sync] INCOMING:', {
      auth0_sub: dto.auth0_sub,
      email: dto.email,
      first_name: dto.first_name,
      last_name: dto.last_name,
    });

    // 1️⃣ Find or create user
    const existing = await pool.query(
      'SELECT * FROM users WHERE auth0_sub = $1',
      [dto.auth0_sub],
    );

    let user = existing.rows[0];

    console.log('[UsersService.sync] EXISTING USER:', user ? {
      id: user.id,
      auth0_sub: user.auth0_sub,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    } : 'NOT FOUND - WILL CREATE NEW USER');

    if (user) {
      // EXISTING USER: Only update email (for account recovery purposes)
      // DO NOT update first_name/last_name - user may have customized these
      // The name from Google/Auth0 token should NOT overwrite user's profile
      const toUpdate: Partial<CreateUserDto> = {};
      if (dto.email && dto.email !== user.email) toUpdate.email = dto.email;
      // REMOVED: name updates - user's profile name is what THEY set, not Google

      // ✅ Only update profile_picture if:
      // - user has no picture yet, OR
      // - current one is a default avatar, OR
      // - new one is custom (non-default)
      if (
        dto.profile_picture &&
        dto.profile_picture !== user.profile_picture &&
        (this.isDefaultAvatar(user.profile_picture) ||
          !this.isDefaultAvatar(dto.profile_picture))
      ) {
        toUpdate.profile_picture = this.isDefaultAvatar(dto.profile_picture)
          ? null
          : dto.profile_picture;
      }

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

    // 2️⃣ Ensure style profile exists
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

    return { user, style_profile: style };
  }

  async update(id: string, dto: UpdateUserDto) {
    // 🛠️ Preserve profile_picture if not explicitly passed
    if (dto.profile_picture === undefined) {
      const current = await pool.query(
        'SELECT profile_picture FROM users WHERE id = $1',
        [id],
      );
      dto.profile_picture = current.rows[0]?.profile_picture || null;
    } else {
      // ✅ Apply same guard here to avoid overwriting with default
      const current = await pool.query(
        'SELECT profile_picture FROM users WHERE id = $1',
        [id],
      );
      const existingPic = current.rows[0]?.profile_picture;
      if (
        existingPic &&
        !this.isDefaultAvatar(existingPic) &&
        this.isDefaultAvatar(dto.profile_picture)
      ) {
        // Ignore request to overwrite a custom pic with a default one
        delete dto.profile_picture;
      } else if (this.isDefaultAvatar(dto.profile_picture)) {
        // If incoming value itself is a default avatar, null it
        dto.profile_picture = null;
      }
    }

    // ✅ Filter out undefined values
    const entries = Object.entries(dto).filter(([, v]) => v !== undefined);

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
//   private isDefaultAvatar(url?: string): boolean {
//     if (!url) return true;
//     return (
//       url.includes('gravatar.com') ||
//       url.includes('cdn.auth0.com/avatars') ||
//       url.includes('https://s.gravatar.com/avatar')
//     );
//   }

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

//     // 1️⃣ Find or create user
//     const existing = await pool.query(
//       'SELECT * FROM users WHERE auth0_sub = $1',
//       [dto.auth0_sub],
//     );

//     let user = existing.rows[0];

//     if (user) {
//       // Light refresh of basic fields if provided
//       const toUpdate: Partial<CreateUserDto> = {};
//       if (dto.email && dto.email !== user.email) toUpdate.email = dto.email;
//       if (
//         dto.first_name &&
//         dto.first_name !== user.first_name &&
//         dto.first_name !== dto.email
//       )
//         toUpdate.first_name = dto.first_name;
//       if (dto.last_name && dto.last_name !== user.last_name)
//         toUpdate.last_name = dto.last_name;

//       // ✅ Only update profile_picture if:
//       // - user has no picture yet, OR
//       // - current one is a default avatar, OR
//       // - new one is custom (non-default)
//       if (
//         dto.profile_picture &&
//         dto.profile_picture !== user.profile_picture &&
//         (this.isDefaultAvatar(user.profile_picture) ||
//           !this.isDefaultAvatar(dto.profile_picture))
//       ) {
//         toUpdate.profile_picture = dto.profile_picture;
//       }

//       if (Object.keys(toUpdate).length) {
//         const keys = Object.keys(toUpdate);
//         const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
//         const vals = keys.map((k) => (toUpdate as any)[k]);
//         const updated = await pool.query(
//           `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
//           [user.id, ...vals],
//         );
//         user = updated.rows[0];
//       }
//     } else {
//       user = await this.create(dto);
//     }

//     // 2️⃣ Ensure style profile exists
//     let style = await pool
//       .query('SELECT * FROM style_profiles WHERE user_id = $1 LIMIT 1', [
//         user.id,
//       ])
//       .then((r) => r.rows[0]);

//     if (!style) {
//       await pool.query('INSERT INTO style_profiles (user_id) VALUES ($1)', [
//         user.id,
//       ]);
//       style = await pool
//         .query('SELECT * FROM style_profiles WHERE user_id = $1 LIMIT 1', [
//           user.id,
//         ])
//         .then((r) => r.rows[0]);
//     }

//     return { user, style_profile: style };
//   }

//   async update(id: string, dto: UpdateUserDto) {
//     // 🛠️ Preserve profile_picture if not explicitly passed
//     if (dto.profile_picture === undefined) {
//       const current = await pool.query(
//         'SELECT profile_picture FROM users WHERE id = $1',
//         [id],
//       );
//       dto.profile_picture = current.rows[0]?.profile_picture || null;
//     } else {
//       // ✅ Apply same guard here to avoid overwriting with default /
//       const current = await pool.query(
//         'SELECT profile_picture FROM users WHERE id = $1',
//         [id],
//       );
//       const existingPic = current.rows[0]?.profile_picture;
//       if (
//         existingPic &&
//         !this.isDefaultAvatar(existingPic) &&
//         this.isDefaultAvatar(dto.profile_picture)
//       ) {
//         // Ignore request to overwrite a custom pic with a default one
//         delete dto.profile_picture;
//       }
//     }

//     // ✅ Filter out undefined values
//     const entries = Object.entries(dto).filter(([, v]) => v !== undefined);

//     if (entries.length === 0) {
//       const cur = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
//       return cur.rows[0];
//     }

//     const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`);
//     const values = entries.map(([, v]) => v);

//     const res = await pool.query(
//       `UPDATE users
//        SET ${setClauses.join(', ')}, updated_at = NOW()
//        WHERE id = $1
//        RETURNING *`,
//       [id, ...values],
//     );

//     return res.rows[0];
//   }

//   async delete(id: string) {
//     await pool.query('DELETE FROM users WHERE id = $1', [id]);
//     return { success: true };
//   }
// }

////////////////

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

//     // 1️⃣ Find or create user
//     const existing = await pool.query(
//       'SELECT * FROM users WHERE auth0_sub = $1',
//       [dto.auth0_sub],
//     );

//     let user = existing.rows[0];

//     if (user) {
//       // Light refresh of basic fields if provided
//       const toUpdate: Partial<CreateUserDto> = {};
//       if (dto.email && dto.email !== user.email) toUpdate.email = dto.email;
//       if (
//         dto.first_name &&
//         dto.first_name !== user.first_name &&
//         dto.first_name !== dto.email
//       )
//         toUpdate.first_name = dto.first_name;
//       if (dto.last_name && dto.last_name !== user.last_name)
//         toUpdate.last_name = dto.last_name;
//       if (dto.profile_picture && dto.profile_picture !== user.profile_picture)
//         toUpdate.profile_picture = dto.profile_picture;

//       if (Object.keys(toUpdate).length) {
//         const keys = Object.keys(toUpdate);
//         const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
//         const vals = keys.map((k) => (toUpdate as any)[k]);
//         const updated = await pool.query(
//           `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
//           [user.id, ...vals],
//         );
//         user = updated.rows[0];
//       }
//     } else {
//       user = await this.create(dto);
//     }

//     // 2️⃣ Ensure style profile exists
//     let style = await pool
//       .query('SELECT * FROM style_profiles WHERE user_id = $1 LIMIT 1', [
//         user.id,
//       ])
//       .then((r) => r.rows[0]);

//     if (!style) {
//       await pool.query('INSERT INTO style_profiles (user_id) VALUES ($1)', [
//         user.id,
//       ]);
//       style = await pool
//         .query('SELECT * FROM style_profiles WHERE user_id = $1 LIMIT 1', [
//           user.id,
//         ])
//         .then((r) => r.rows[0]);
//     }

//     return { user, style_profile: style };
//   }

//   async update(id: string, dto: UpdateUserDto) {
//     // 🛠️ Preserve profile_picture if not explicitly passed
//     if (dto.profile_picture === undefined) {
//       const current = await pool.query(
//         'SELECT profile_picture FROM users WHERE id = $1',
//         [id],
//       );
//       dto.profile_picture = current.rows[0]?.profile_picture || null;
//     }

//     // ✅ Filter out undefined values
//     const entries = Object.entries(dto).filter(([, v]) => v !== undefined);

//     if (entries.length === 0) {
//       const cur = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
//       return cur.rows[0];
//     }

//     const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`);
//     const values = entries.map(([, v]) => v);

//     const res = await pool.query(
//       `UPDATE users
//        SET ${setClauses.join(', ')}, updated_at = NOW()
//        WHERE id = $1
//        RETURNING *`,
//       [id, ...values],
//     );

//     return res.rows[0];
//   }

//   async delete(id: string) {
//     await pool.query('DELETE FROM users WHERE id = $1', [id]);
//     return { success: true };
//   }
// }

///////////////////

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

//   // src/users/users.service.ts
//   async sync(dto: CreateUserDto) {
//     console.log('🔵 SYNC SERVICE CALLED WITH:', dto);

//     // 1) Find or create user
//     const existing = await pool.query(
//       'SELECT * FROM users WHERE auth0_sub = $1',
//       [dto.auth0_sub],
//     );

//     let user = existing.rows[0];

//     if (user) {
//       // Light, safe refresh of basic fields if provided
//       const toUpdate: Partial<CreateUserDto> = {};
//       if (dto.email && dto.email !== user.email) toUpdate.email = dto.email;
//       if (
//         dto.first_name &&
//         dto.first_name !== user.first_name &&
//         dto.first_name !== dto.email
//       )
//         toUpdate.first_name = dto.first_name;
//       if (dto.last_name && dto.last_name !== user.last_name)
//         toUpdate.last_name = dto.last_name;
//       if (dto.profile_picture && dto.profile_picture !== user.profile_picture)
//         toUpdate.profile_picture = dto.profile_picture;

//       if (Object.keys(toUpdate).length) {
//         const keys = Object.keys(toUpdate);
//         const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
//         const vals = keys.map((k) => (toUpdate as any)[k]);
//         const updated = await pool.query(
//           `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
//           [user.id, ...vals],
//         );
//         user = updated.rows[0];
//       }
//     } else {
//       user = await this.create(dto);
//     }

//     // 2) Ensure a style profile exists
//     let style = await pool
//       .query('SELECT * FROM style_profiles WHERE user_id = $1 LIMIT 1', [
//         user.id,
//       ])
//       .then((r) => r.rows[0]);

//     if (!style) {
//       await pool.query('INSERT INTO style_profiles (user_id) VALUES ($1)', [
//         user.id,
//       ]);
//       style = await pool
//         .query('SELECT * FROM style_profiles WHERE user_id = $1 LIMIT 1', [
//           user.id,
//         ])
//         .then((r) => r.rows[0]);
//     }

//     // 3) Return both so the app has everything immediately
//     return { user, style_profile: style };
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
