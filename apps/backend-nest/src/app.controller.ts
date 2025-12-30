import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { SkipAuth } from './auth/skip-auth.decorator';

@SkipAuth() // Health endpoints are public
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @SkipThrottle() // Health endpoint should not be throttled (monitoring/load balancers)
  @Get()
  getStatus() {
    return {
      status: 'OK',
      service: 'NestJS Backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
