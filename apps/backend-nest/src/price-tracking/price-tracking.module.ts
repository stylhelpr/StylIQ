import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PriceTrackingService } from './price-tracking.service';
import { PriceTrackingController } from './price-tracking.controller';
import { DatabaseService } from '../db/database.service';
import { PriceCheckCronService } from './price-check-cron.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PriceTrackingController],
  providers: [PriceTrackingService, PriceCheckCronService, DatabaseService],
  exports: [PriceTrackingService],
})
export class PriceTrackingModule {}
