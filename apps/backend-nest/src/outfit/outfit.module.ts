import { Module } from '@nestjs/common';
import { OutfitController } from './outfit.controller';
import { OutfitService } from './outfit.service';

@Module({
  controllers: [OutfitController],
  providers: [OutfitService],
})
export class OutfitModule {}
