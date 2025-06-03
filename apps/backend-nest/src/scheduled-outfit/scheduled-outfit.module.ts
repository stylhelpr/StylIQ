import { Module } from '@nestjs/common';
import { ScheduledOutfitController } from './scheduled-outfit.controller';
import { ScheduledOutfitService } from './scheduled-outfit.service';

@Module({
  controllers: [ScheduledOutfitController],
  providers: [ScheduledOutfitService],
})
export class ScheduledOutfitModule {}
