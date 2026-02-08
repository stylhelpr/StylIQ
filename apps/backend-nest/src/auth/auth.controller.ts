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
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SkipAuth } from './skip-auth.decorator';
import { pool } from '../db/pool';

@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for auth endpoints
@Controller('auth')
export class AuthController {
  @SkipAuth() // Test endpoint - public
  @Get('test')
  getTest() {
    return { message: 'GET /auth/test is working' };
  }

  @SkipAuth() // Test endpoint - public
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
    const userId = (req.user as any)?.userId;
    if (!userId) return { error: 'Missing userId in token' };

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

    // where clause uses userId from the JWT
    const whereParamIndex = i;
    values.push(userId);

    const sql = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${whereParamIndex}
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
    const userId = (req.user as any)?.userId;
    if (!userId) {
      console.error(
        '[/auth/profile] Missing userId in token - JWT validation should have failed',
      );
      return { error: 'Missing userId in token' };
    }

    // userId is already the internal UUID from jwt.strategy.ts
    // This ID was resolved STRICTLY from auth0_sub - no email fallback, no caching
    console.log('[/auth/profile] Returning userId:', userId);
    return { uuid: userId };
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
