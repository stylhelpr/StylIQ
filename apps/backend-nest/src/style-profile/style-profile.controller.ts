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
}

//////////////

// import { Controller, Get, Put, Param, Body } from '@nestjs/common';
// import { StyleProfileService } from './style-profile.service';
// import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

// @Controller('style-profile')
// export class StyleProfileController {
//   constructor(private readonly service: StyleProfileService) {}

//   // Accept auth0_sub in the route
//   @Get(':auth0Sub')
//   async getProfile(@Param('auth0Sub') auth0Sub: string) {
//     const profile = await this.service.getProfileByAuth0Sub(auth0Sub);
//     console.log('✅ Returning style profile:', profile); // <-- Add this
//     return profile;
//   }

//   @Put(':auth0Sub')
//   updateProfile(
//     @Param('auth0Sub') auth0Sub: string,
//     @Body() dto: UpdateStyleProfileDto,
//   ) {
//     return this.service.updateProfileByAuth0Sub(auth0Sub, dto);
//   }
// }

///////////////

// import { Controller, Get, Put, Param, Body } from '@nestjs/common';
// import { StyleProfileService } from './style-profile.service';
// import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

// @Controller('style-profile')
// export class StyleProfileController {
//   constructor(private readonly service: StyleProfileService) {}

//   @Get(':userId')
//   getProfile(@Param('userId') userId: string) {
//     return this.service.getProfile(userId);
//   }

//   @Put(':userId')
//   updateProfile(
//     @Param('userId') userId: string,
//     @Body() dto: UpdateStyleProfileDto,
//   ) {
//     return this.service.updateProfile(userId, dto);
//   }
// }

///////////////

// import { Controller, Get, Put, Param, Body } from '@nestjs/common';
// import { StyleProfileService } from './style-profile.service';
// import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

// @Controller('style-profile')
// export class StyleProfileController {
//   constructor(private readonly service: StyleProfileService) {}

//   @Get(':userId')
//   getProfile(@Param('userId') userId: string) {
//     return this.service.getProfile(userId);
//   }

//   @Put(':userId')
//   updateProfile(
//     @Param('userId') userId: string,
//     @Body() dto: UpdateStyleProfileDto,
//   ) {
//     return this.service.updateProfile(userId, dto);
//   }
// }
