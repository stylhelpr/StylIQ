import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { OutfitFavoritesService } from './outfit-favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { RemoveFavoriteDto } from './dto/remove-favorite.dto';

@Controller('outfit-favorites')
export class OutfitFavoritesController {
  constructor(private readonly service: OutfitFavoritesService) {}

  @Post()
  async addFavorite(@Body() dto: AddFavoriteDto) {
    return this.service.addFavorite(dto);
  }

  @Delete()
  async removeFavorite(@Body() dto: RemoveFavoriteDto) {
    return this.service.removeFavorite(dto);
  }

  @Get()
  async getFavorites(@Query('user_id') user_id: string) {
    return this.service.getFavorites(user_id);
  }
}
