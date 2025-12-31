import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OutfitFavoritesService } from './outfit-favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { RemoveFavoriteDto } from './dto/remove-favorite.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('outfit-favorites')
export class OutfitFavoritesController {
  constructor(private readonly service: OutfitFavoritesService) {}

  @Post('add')
  async addFavorite(@Req() req, @Body() dto: Omit<AddFavoriteDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.addFavorite({ user_id, ...dto });
  }

  @Post('remove')
  async removeFavorite(@Req() req, @Body() dto: Omit<RemoveFavoriteDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.removeFavorite({ user_id, ...dto });
  }

  @Get()
  async getFavorites(@Req() req) {
    const user_id = req.user.userId;
    return this.service.getFavorites(user_id);
  }

  @Get('count')
  getUserFavoritesCount(@Req() req) {
    const userId = req.user.userId;
    return this.service.getUserFavoritesCount(userId);
  }
}
