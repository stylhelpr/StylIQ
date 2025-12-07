import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StyleProfilesService } from './style-profiles.service';
import { UpdateMeasurementsDto } from './dto/update-measurements.dto';

@Controller('style-profiles')
@UseGuards(AuthGuard('jwt'))
export class StyleProfilesController {
  constructor(private readonly styleProfilesService: StyleProfilesService) {}

  @Get(':userId')
  getMeasurements(@Param('userId') userId: string) {
    return this.styleProfilesService.getMeasurements(userId);
  }

  @Put(':userId/measurements')
  updateMeasurements(
    @Param('userId') userId: string,
    @Body() dto: UpdateMeasurementsDto,
  ) {
    return this.styleProfilesService.updateMeasurements(userId, dto);
  }
}
