import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StyleProfilesService } from './style-profiles.service';
import { UpdateStyleProfileDto } from '../style-profile/dto/update-style-profile.dto';

@Controller('style-profiles')
@UseGuards(AuthGuard('jwt'))
export class StyleProfilesController {
  constructor(private readonly styleProfilesService: StyleProfilesService) {}

  @Get(':userId')
  getMeasurements(@Req() req) {
    const userId = req.user.userId;
    return this.styleProfilesService.getMeasurements(userId);
  }

  @Put(':userId/measurements')
  updateMeasurements(
    @Req() req,
    @Body() dto: UpdateStyleProfileDto,
  ) {
    const userId = req.user.userId;
    return this.styleProfilesService.updateMeasurements(userId, dto);
  }
}
