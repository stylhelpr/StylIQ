import {
  Controller,
  Get,
  Query,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  private readonly logger = new Logger(WeatherController.name);

  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  async getCurrentWeather(
    @Query('lat') latStr?: string,
    @Query('lng') lngStr?: string,
    @Query('city') city?: string,
    @Query('day') day?: string,
  ) {
    try {
      let lat: number;
      let lng: number;
      let cityName: string | undefined;

      if (city?.trim()) {
        const geo = await this.weatherService.geocode(city.trim());
        lat = geo.lat;
        lng = geo.lng;
        cityName = geo.formattedAddress;
      } else if (latStr && lngStr) {
        lat = parseFloat(latStr);
        lng = parseFloat(lngStr);
        if (isNaN(lat) || isNaN(lng)) {
          throw new BadRequestException('lat and lng must be valid numbers');
        }
      } else {
        throw new BadRequestException(
          'Provide either city or lat+lng query parameters',
        );
      }

      const result =
        day === 'tomorrow'
          ? await this.weatherService.getTomorrowWeather(lat, lng)
          : await this.weatherService.getCurrentWeather(lat, lng);

      if (cityName) result.city = cityName;

      return result;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Current weather fetch failed:', err);
      throw new InternalServerErrorException(
        `Unable to fetch current weather: ${err.message}`,
      );
    }
  }

  @Get()
  async getWeather(@Query('city') city: string) {
    if (!city?.trim()) {
      throw new BadRequestException('city query parameter is required');
    }

    try {
      return await this.weatherService.getWeather(city.trim());
    } catch (err) {
      this.logger.error(`Weather fetch failed for "${city}":`, err);
      throw new InternalServerErrorException(
        `Unable to fetch weather for "${city}"`,
      );
    }
  }
}
