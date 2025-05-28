import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
