// src/style-profile/style-profile.controller.ts
import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { StyleProfileService } from './style-profile.service';
import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

@Controller('style-profile')
export class StyleProfileController {
  constructor(private readonly service: StyleProfileService) {}

  @Get(':userId')
  async getProfile(@Param('userId') userId: string) {
    const profile = await this.service.getProfile(userId);
    console.log('✅ Returning style profile:', profile);
    return profile;
  }

  @Put(':userId')
  updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateStyleProfileDto,
  ) {
    return this.service.updateProfile(userId, dto);
  }

  // ✅ New route: preferred brands only
  @Get(':userId/brands')
  async getPreferredBrands(@Param('userId') userId: string) {
    const brands = await this.service.getPreferredBrands(userId);
    return { brands };
  }
}

//////////////////

// import { Controller, Get, Put, Param, Body } from '@nestjs/common';
// import { StyleProfileService } from './style-profile.service';
// import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

// @Controller('style-profile')
// export class StyleProfileController {
//   constructor(private readonly service: StyleProfileService) {}

//   @Get(':userId')
//   async getProfile(@Param('userId') userId: string) {
//     const profile = await this.service.getProfile(userId);
//     console.log('✅ Returning style profile:', profile);
//     return profile;
//   }

//   @Put(':userId')
//   updateProfile(
//     @Param('userId') userId: string,
//     @Body() dto: UpdateStyleProfileDto,
//   ) {
//     return this.service.updateProfile(userId, dto);
//   }
// }
