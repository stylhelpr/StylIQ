import { Module } from '@nestjs/common';
import { OutfitFavoritesController } from './outfit-favorites.controller';
import { OutfitFavoritesService } from './outfit-favorites.service';

@Module({
  controllers: [OutfitFavoritesController],
  providers: [OutfitFavoritesService],
})
export class OutfitFavoritesModule {}
