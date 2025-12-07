import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PriceTrackingService } from './price-tracking.service';
import { TrackItemDto, UpdatePriceAlertDto, UpdatePriceDto } from './dto/track-item.dto';

@Controller('api/price-tracking')
export class PriceTrackingController {
  constructor(private readonly priceTrackingService: PriceTrackingService) {}

  @Post('track')
  @UseGuards(AuthGuard('jwt'))
  async addTracking(@Request() req: any, @Body() item: TrackItemDto) {
    const userId = req.user.sub;
    return this.priceTrackingService.addPriceTracking(userId, item);
  }

  @Get('alerts')
  @UseGuards(AuthGuard('jwt'))
  async getAlerts(@Request() req: any) {
    const userId = req.user.sub;
    return this.priceTrackingService.getPriceAlerts(userId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async updateAlert(
    @Request() req: any,
    @Param('id') id: number,
    @Body() update: UpdatePriceAlertDto,
  ) {
    const userId = req.user.sub;
    return this.priceTrackingService.updatePriceAlert(userId, id, update);
  }

  @Put(':id/price')
  @UseGuards(AuthGuard('jwt'))
  async updatePrice(
    @Request() req: any,
    @Param('id') id: number,
    @Body() priceUpdate: UpdatePriceDto,
  ) {
    const userId = req.user.sub;
    return this.priceTrackingService.updatePrice(userId, id, priceUpdate);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async removeTracking(@Request() req: any, @Param('id') id: number) {
    const userId = req.user.sub;
    return this.priceTrackingService.removePriceTracking(userId, id);
  }

  @Get(':id/history')
  @UseGuards(AuthGuard('jwt'))
  async getPriceHistory(@Param('id') id: number) {
    return this.priceTrackingService.getPriceHistory(id);
  }
}
