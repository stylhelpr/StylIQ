import { Controller, Post, Get, Delete, Patch, Param, Body, Query } from '@nestjs/common';
import { RecreatedLookService } from './recreated-look.service';

@Controller('users/:userId/recreated-looks')
export class RecreatedLookController {
  constructor(private readonly recreatedLookService: RecreatedLookService) {}

  @Post()
  async saveRecreatedLook(
    @Param('userId') userId: string,
    @Body()
    body: { source_image_url: string; generated_outfit: any; tags?: string[] },
  ) {
    return this.recreatedLookService.saveRecreatedLook(userId, body);
  }

  // 👇 ADD THIS
  @Get()
  async getRecentRecreatedLooks(
    @Param('userId') userId: string,
    @Query('limit') limit = '20',
  ) {
    return this.recreatedLookService.getRecentRecreatedLooks(
      userId,
      parseInt(limit, 10),
    );
  }

  @Patch(':lookId')
  async updateRecreatedLook(
    @Param('userId') userId: string,
    @Param('lookId') lookId: string,
    @Body() body: { name?: string },
  ) {
    return this.recreatedLookService.updateRecreatedLook(userId, lookId, body.name);
  }

  @Delete(':lookId')
  async deleteRecreatedLook(
    @Param('userId') userId: string,
    @Param('lookId') lookId: string,
  ) {
    return this.recreatedLookService.deleteRecreatedLook(userId, lookId);
  }
}
