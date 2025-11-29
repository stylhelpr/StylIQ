import { Controller, Patch, Body, Param } from '@nestjs/common';
import { StyleProfilesService } from './style-profiles.service';
import { UpdateMeasurementsDto } from './dto/update-measurements.dto';

@Controller('style-profiles')
export class StyleProfilesController {
  constructor(private readonly styleProfilesService: StyleProfilesService) {}

  @Patch(':userId')
  updateMeasurements(
    @Param('userId') userId: string,
    @Body() dto: UpdateMeasurementsDto,
  ) {
    return this.styleProfilesService.updateMeasurements(userId, dto);
  }
}
