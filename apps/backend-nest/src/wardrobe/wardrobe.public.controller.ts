import { Controller, Get, Param } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { SkipAuth } from '../auth/skip-auth.decorator';

@Controller('wardrobe')
export class WardrobePublicController {
  constructor(private readonly service: WardrobeService) {}

  // Public endpoint for viewing other users' wardrobe count
  @SkipAuth()
  @Get('count/:userId')
  async getPublicWardrobeCount(@Param('userId') userId: string) {
    const items = await this.service.getItemsByUser(userId);
    return { count: items.length };
  }
}
