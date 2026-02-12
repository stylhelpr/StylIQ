import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { TripsController } from './trips.controller';
import { WeatherService } from './weather.service';

@Module({
  controllers: [WeatherController, TripsController],
  providers: [WeatherService],
})
export class WeatherModule {}
