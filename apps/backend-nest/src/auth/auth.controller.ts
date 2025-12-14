// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Controller('auth')
export class AuthController {
  @Get('test')
  getTest() {
    return { message: 'GET /auth/test is working' };
  }

  @Post('test')
  postTest(@Body() body: any) {
    return {
      message: 'POST /auth/test received data',
      received: body,
    };
  }

  // User completes onboarding: update their row in `users`
  @UseGuards(JwtAuthGuard)
  @Patch('onboarding')
  async completeOnboarding(@Req() req: Request, @Body() body: any) {
    const auth0Sub = (req.user as any)?.sub;
    if (!auth0Sub) return { error: 'Missing auth0_sub in token' };

    // allow only these fields from the form
    const allowed = [
      'first_name',
      'last_name',
      'email',
      'profession',
      'fashion_level',
      'gender_presentation',
      // we'll also set onboarding_complete below
    ];

    const setClauses: string[] = [];
    const values: any[] = [];
    let i = 1;

    for (const k of allowed) {
      if (body[k] !== undefined) {
        setClauses.push(`${k} = $${i++}`);
        values.push(body[k]);
      }
    }

    // always flip onboarding_complete -> true
    setClauses.push(`onboarding_complete = TRUE`);

    // where clause uses auth0_sub from the JWT
    const whereParamIndex = i;
    values.push(auth0Sub);

    const sql = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE auth0_sub = $${whereParamIndex}
      RETURNING id, first_name, last_name, email, profession, fashion_level, gender_presentation, onboarding_complete;
    `;

    try {
      const result = await pool.query(sql, values);
      if (result.rowCount === 0) {
        return { error: 'User not found for this token' };
      }
      return { user: result.rows[0] };
    } catch (err) {
      console.error('❌ DB error in PATCH /auth/onboarding:', err);
      return { error: 'Internal server error' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: Request) {
    // console.log('🧠 req.user:', req.user);

    const auth0Sub = (req.user as any)?.sub;
    // console.log('🔍 Extracted sub:', auth0Sub);

    if (!auth0Sub) {
      return { error: 'Missing auth0_sub in token' };
    }

    try {
      const result = await pool.query(
        'SELECT id FROM users WHERE auth0_sub = $1 LIMIT 1',
        [auth0Sub],
      );

      // console.log('📦 DB Result:', result.rows);

      if (result.rows.length === 0) {
        return { error: 'User not found in DB' };
      }

      const user = result.rows[0];
      // console.log('✅ User found:', user);

      return { uuid: user.id };
    } catch (err) {
      console.error('❌ DB error in /auth/profile:', err);
      return { error: 'Internal server error' };
    }
  }
}

//////////////////

// // src/auth/auth.controller.ts
// import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
// // import { FastifyRequest } from 'fastify'; // ✅ Correct type for Fastify
// import { Request } from 'express';
// import { JwtAuthGuard } from './jwt-auth.guard';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Controller('auth')
// export class AuthController {
//   @Get('test')
//   getTest() {
//     return { message: 'GET /auth/test is working' };
//   }

//   @Post('test')
//   postTest(@Body() body: any) {
//     return {
//       message: 'POST /auth/test received data',
//       received: body,
//     };
//   }

//   @UseGuards(JwtAuthGuard)
//   @Get('profile')
//   async getProfile(@Req() req: Request) {
//     console.log('🧠 req.user:', req.user);

//     const auth0Sub = (req.user as any)?.sub;
//     console.log('🔍 Extracted sub:', auth0Sub);

//     if (!auth0Sub) {
//       return { error: 'Missing auth0_sub in token' };
//     }

//     try {
//       const result = await pool.query(
//         'SELECT id FROM users WHERE auth0_sub = $1 LIMIT 1',
//         [auth0Sub],
//       );

//       console.log('📦 DB Result:', result.rows);

//       if (result.rows.length === 0) {
//         return { error: 'User not found in DB' };
//       }

//       const user = result.rows[0];
//       console.log('✅ User found:', user);

//       return { uuid: user.id };
//     } catch (err) {
//       console.error('❌ DB error in /auth/profile:', err);
//       return { error: 'Internal server error' };
//     }
//   }
// }
