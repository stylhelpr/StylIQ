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
import { AuthenticatedRequest } from '../auth/types/auth-user';
import { PriceTrackingService } from './price-tracking.service';
import {
  TrackItemDto,
  UpdatePriceAlertDto,
  UpdatePriceDto,
} from './dto/track-item.dto';

@Controller('api/price-tracking')
export class PriceTrackingController {
  constructor(private readonly priceTrackingService: PriceTrackingService) {}

  @Post('track')
  @UseGuards(AuthGuard('jwt'))
  async addTracking(
    @Request() req: AuthenticatedRequest,
    @Body() item: TrackItemDto,
  ) {
    const userId = req.user.userId;
    return this.priceTrackingService.addPriceTracking(userId, item);
  }

  @Get('alerts')
  @UseGuards(AuthGuard('jwt'))
  async getAlerts(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.priceTrackingService.getPriceAlerts(userId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async updateAlert(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
    @Body() update: UpdatePriceAlertDto,
  ) {
    const userId = req.user.userId;
    return this.priceTrackingService.updatePriceAlert(userId, id, update);
  }

  @Put(':id/price')
  @UseGuards(AuthGuard('jwt'))
  async updatePrice(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
    @Body() priceUpdate: UpdatePriceDto,
  ) {
    const userId = req.user.userId;
    return this.priceTrackingService.updatePrice(userId, id, priceUpdate);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async removeTracking(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
  ) {
    const userId = req.user.userId;
    return this.priceTrackingService.removePriceTracking(userId, id);
  }

  @Get(':id/history')
  @UseGuards(AuthGuard('jwt'))
  async getPriceHistory(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
  ) {
    const userId = req.user.userId;
    return this.priceTrackingService.getPriceHistory(userId, id);
  }
}
