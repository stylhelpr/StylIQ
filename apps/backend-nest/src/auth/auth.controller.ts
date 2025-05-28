import { Controller, Get, Post, Body } from '@nestjs/common';

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
}
