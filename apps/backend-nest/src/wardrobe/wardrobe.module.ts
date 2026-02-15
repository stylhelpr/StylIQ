import { Module } from '@nestjs/common';
import { WardrobeController } from './wardrobe.controller';
import { WardrobePublicController } from './wardrobe.public.controller';
import { WardrobeService } from './wardrobe.service';
import { VertexModule } from '../vertex/vertex.module';
import { LearningModule } from '../learning/learning.module';

@Module({
  imports: [VertexModule, LearningModule],
  controllers: [WardrobePublicController, WardrobeController],
  providers: [WardrobeService],
})
export class WardrobeModule {}
