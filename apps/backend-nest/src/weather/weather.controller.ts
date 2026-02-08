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
