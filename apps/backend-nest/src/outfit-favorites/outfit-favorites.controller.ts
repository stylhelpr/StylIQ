import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import { OutfitFavoritesService } from './outfit-favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { RemoveFavoriteDto } from './dto/remove-favorite.dto';

@Controller('outfit-favorites')
export class OutfitFavoritesController {
  constructor(private readonly service: OutfitFavoritesService) {}

  @Post('add')
  async addFavorite(@Body() dto: AddFavoriteDto) {
    return this.service.addFavorite(dto);
  }

  @Post('remove')
  async removeFavorite(@Body() dto: RemoveFavoriteDto) {
    return this.service.removeFavorite(dto);
  }
  @Get()
  async getFavorites(@Query('user_id') user_id: string) {
    return this.service.getFavorites(user_id);
  }

  @Get('count/:userId')
  getUserFavoritesCount(@Param('userId') userId: string) {
    return this.service.getUserFavoritesCount(userId);
  }
}
