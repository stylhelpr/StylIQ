import { Module } from '@nestjs/common';
import { CustomOutfitController } from './custom-outfit.controller';
import { CustomOutfitService } from './custom-outfit.service';

@Module({
  controllers: [CustomOutfitController],
  providers: [CustomOutfitService],
})
export class CustomOutfitModule {}
