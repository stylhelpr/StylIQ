import { Module } from '@nestjs/common';
import { OutfitFavoritesController } from './outfit-favorites.controller';
import { OutfitFavoritesService } from './outfit-favorites.service';
import { LearningModule } from '../learning/learning.module';

@Module({
  imports: [LearningModule],
  controllers: [OutfitFavoritesController],
  providers: [OutfitFavoritesService],
})
export class OutfitFavoritesModule {}
