import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Req,
  Param,
  Body,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripItemsDto } from './dto/update-trip-items.dto';

@Controller('trips')
export class TripsCrudController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateTripDto) {
    console.log('🔥 [TripsController] create() HIT');
    console.log('🔥 userId:', req.user?.userId);
    console.log('🔥 dto:', JSON.stringify(dto).slice(0, 500));
    const userId = req.user.userId;
    return this.tripsService.create(userId, dto);
  }

  @Get()
  findAll(@Req() req) {
    const userId = req.user.userId;
    return this.tripsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.tripsService.findOne(id, userId);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    console.log('🔥 [TripsController] delete() HIT');
    console.log('🔥 userId:', req.user?.userId);
    console.log('🔥 tripId:', id);
    const userId = req.user.userId;
    return this.tripsService.remove(id, userId);
  }

  @Patch(':id/items')
  replaceItems(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateTripItemsDto,
  ) {
    const userId = req.user.userId;
    return this.tripsService.replaceItems(id, userId, dto);
  }
}
