import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class StyleProfileService {
  async getProfile(userId: string) {
    let profileRes = await pool.query(
      'SELECT * FROM style_profiles WHERE user_id = $1',
      [userId],
    );

    if (profileRes.rowCount === 0) {
      await pool.query('INSERT INTO style_profiles (user_id) VALUES ($1)', [
        userId,
      ]);

      profileRes = await pool.query(
        'SELECT * FROM style_profiles WHERE user_id = $1',
        [userId],
      );
    }

    return profileRes.rows[0];
  }

  async updateProfile(userId: string, dto: UpdateStyleProfileDto) {
    // Remove null or undefined fields to avoid overwriting with nulls
    const filteredEntries = Object.entries(dto).filter(
      ([, val]) => val !== null && val !== undefined,
    );

    if (filteredEntries.length === 0) {
      console.warn('⚠️ No valid fields to update.');
      return;
    }

    const keys = filteredEntries.map(([key]) => key);
    const values = filteredEntries.map(([, val]) => val);

    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    console.log('👀 Writing values to DB:', {
      userId,
      ...Object.fromEntries(filteredEntries),
    });

    const query = `
  INSERT INTO style_profiles (user_id, ${keys.join(', ')})
  VALUES ($1, ${values.map((_, i) => `$${i + 2}`).join(', ')})
  ON CONFLICT (user_id)
  DO UPDATE SET ${setClause}, updated_at = now()
  RETURNING *;
`;
    const result = await pool.query(query, [userId, ...values]);

    console.log('✅ Saved to DB:', result.rows[0]);
    console.log('✅ DB response:', result.rows[0]);
    return result.rows[0];
  }
}

////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class StyleProfileService {
//   async getProfile(userId: string) {
//     let profileRes = await pool.query(
//       'SELECT * FROM style_profiles WHERE user_id = $1',
//       [userId],
//     );

//     if (profileRes.rowCount === 0) {
//       await pool.query('INSERT INTO style_profiles (user_id) VALUES ($1)', [
//         userId,
//       ]);

//       profileRes = await pool.query(
//         'SELECT * FROM style_profiles WHERE user_id = $1',
//         [userId],
//       );
//     }

//     return profileRes.rows[0];
//   }

//   async updateProfile(userId: string, dto: UpdateStyleProfileDto) {
//     const entries = Object.entries(dto);
//     const values = entries.map(([, val]) => val);
//     const keys = entries.map(([key]) => key);

//     const setClause = entries
//       .map(([key], i) => `${key} = $${i + 2}`)
//       .join(', ');

//     const query = `
//       INSERT INTO style_profiles (user_id, ${keys.join(', ')})
//       VALUES ($1, ${values.map((_, i) => `$${i + 2}`).join(', ')})
//       ON CONFLICT (user_id)
//       DO UPDATE SET ${setClause ? `${setClause}, ` : ''}updated_at = now()
//       RETURNING *;
//     `;

//     const res = await pool.query(query, [userId, ...values]);
//     return res.rows[0];
//   }
// }
