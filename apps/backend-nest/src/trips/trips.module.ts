import { Module } from '@nestjs/common';
import { TripsCrudController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  controllers: [TripsCrudController],
  providers: [TripsService],
})
export class TripsModule {}
