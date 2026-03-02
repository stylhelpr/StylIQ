// src/style-profile/style-profile.controller.ts
import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { StyleProfileService } from './style-profile.service';
import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('style-profile')
export class StyleProfileController {
  constructor(private readonly service: StyleProfileService) {}

  @Get()
  async getProfile(@Req() req) {
    const profile = await this.service.getProfile(req.user.userId);
    return profile || {};
  }

  @Put()
  updateProfile(@Req() req, @Body() dto: UpdateStyleProfileDto) {
    return this.service.updateProfile(req.user.userId, dto);
  }

  @Get('brands')
  async getPreferredBrands(@Req() req) {
    const brands = await this.service.getPreferredBrands(req.user.userId);
    return { brands };
  }

  // Public routes for viewing other users' profiles
  @Get('by-user-id/:userId')
  async getProfileByUserId(@Param('userId') userId: string) {
    const profile = await this.service.getProfileByUserId(userId);
    return profile || {};
  }

  @Get('by-user-id/:userId/brands')
  async getBrandsByUserId(@Param('userId') userId: string) {
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
