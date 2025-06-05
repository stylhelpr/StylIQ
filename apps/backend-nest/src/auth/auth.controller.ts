import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { FastifyRequest } from 'fastify';

@Controller('auth')
export class AuthController {
  @Get('test')
  getTest() {
    return { message: 'GET /auth/test is working (unprotected)' };
  }

  @Post('test')
  postTest(@Body() body: any) {
    return {
      message: 'POST /auth/test received data',
      received: body,
    };
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  getProtected(@Req() req: FastifyRequest) {
    // @ts-ignore
    return {
      message: 'GET /auth/protected is working (protected)',
      user: req.user,
    };
  }
}
