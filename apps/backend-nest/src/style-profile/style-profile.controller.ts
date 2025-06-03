import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { StyleProfileService } from './style-profile.service';
import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

@Controller('style-profile')
export class StyleProfileController {
  constructor(private readonly service: StyleProfileService) {}

  @Get(':userId')
  getProfile(@Param('userId') userId: string) {
    return this.service.getProfile(userId);
  }

  @Put(':userId')
  updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateStyleProfileDto,
  ) {
    return this.service.updateProfile(userId, dto);
  }
}
