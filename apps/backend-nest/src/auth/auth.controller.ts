// src/auth/auth.controller.ts
import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
// import { FastifyRequest } from 'fastify'; // ✅ Correct type for Fastify
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

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: Request) {
    console.log('🧠 req.user:', req.user);

    const auth0Sub = (req.user as any)?.sub;
    console.log('🔍 Extracted sub:', auth0Sub);

    if (!auth0Sub) {
      return { error: 'Missing auth0_sub in token' };
    }

    try {
      const result = await pool.query(
        'SELECT id FROM users WHERE auth0_sub = $1 LIMIT 1',
        [auth0Sub],
      );

      console.log('📦 DB Result:', result.rows);

      if (result.rows.length === 0) {
        return { error: 'User not found in DB' };
      }

      const user = result.rows[0];
      console.log('✅ User found:', user);

      return { uuid: user.id };
    } catch (err) {
      console.error('❌ DB error in /auth/profile:', err);
      return { error: 'Internal server error' };
    }
  }
}
