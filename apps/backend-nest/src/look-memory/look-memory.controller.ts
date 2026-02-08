import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LookMemoryService } from './look-memory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users/:userId/look-memory')
export class LookMemoryController {
  constructor(private readonly lookMemoryService: LookMemoryService) {}

  @Post()
  async createLookMemory(
    @Req() req,
    @Body()
    body: {
      image_url: string;
      ai_tags: string[];
      query_used: string;
      result_clicked?: string;
    },
  ) {
    const userId = req.user.userId;
    return this.lookMemoryService.createLookMemory(userId, body);
  }

  @Get()
  async getLookMemory(@Req() req, @Query('limit') limit?: string) {
    const userId = req.user.userId;
    try {
      const data = await this.lookMemoryService.getLookMemory(
        userId,
        Number(limit) || 20,
      );
      return { success: true, data };
    } catch (error) {
      console.error('[LookMemoryController] getLookMemory failed:', error);
      throw new HttpException(
        { success: false, message: 'Failed to fetch look memory' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

/////////////////

// import { Controller, Post, Body, Param } from '@nestjs/common';
// import { LookMemoryService } from './look-memory.service';

// @Controller('users/:userId/look-memory')
// export class LookMemoryController {
//   constructor(private readonly lookMemoryService: LookMemoryService) {}

//   @Post()
//   async createLookMemory(
//     @Param('userId') userId: string,
//     @Body()
//     body: {
//       image_url: string;
//       ai_tags: string[];
//       query_used: string;
//       result_clicked?: string;
//     },
//   ) {
//     return this.lookMemoryService.createLookMemory(userId, body);
//   }
// }
