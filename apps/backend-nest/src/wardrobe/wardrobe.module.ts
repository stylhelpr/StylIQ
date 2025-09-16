import { Module } from '@nestjs/common';
import { WardrobeController } from './wardrobe.controller';
import { WardrobeService } from './wardrobe.service';
import { VertexModule } from '../vertex/vertex.module';

@Module({
  imports: [VertexModule],
  controllers: [WardrobeController],
  providers: [WardrobeService],
})
export class WardrobeModule {}
