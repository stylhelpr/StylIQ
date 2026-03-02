import { Controller, Post, Body } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly weatherService: WeatherService) {}

  @Post('resolve-location')
  async resolveLocation(@Body() body: { query: string }) {
    if (!body.query?.trim()) return [];
    return this.weatherService.searchLocations(body.query.trim());
  }
}
