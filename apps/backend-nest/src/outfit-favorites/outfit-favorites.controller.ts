import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { OutfitFavoritesService } from './outfit-favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { RemoveFavoriteDto } from './dto/remove-favorite.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipAuth } from '../auth/skip-auth.decorator';

@Controller('outfit-favorites')
export class OutfitFavoritesController {
  constructor(private readonly service: OutfitFavoritesService) {}

  // Public endpoint for viewing other users' favorites count
  @SkipAuth()
  @Get('count/:userId')
  getPublicFavoritesCount(@Param('userId') userId: string) {
    return this.service.getUserFavoritesCount(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('add')
  async addFavorite(@Req() req, @Body() dto: Omit<AddFavoriteDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.addFavorite({ user_id, ...dto });
  }

  @UseGuards(JwtAuthGuard)
  @Post('remove')
  async removeFavorite(@Req() req, @Body() dto: Omit<RemoveFavoriteDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.removeFavorite({ user_id, ...dto });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getFavorites(@Req() req) {
    const user_id = req.user.userId;
    return this.service.getFavorites(user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('count')
  getUserFavoritesCount(@Req() req) {
    const userId = req.user.userId;
    return this.service.getUserFavoritesCount(userId);
  }
}
