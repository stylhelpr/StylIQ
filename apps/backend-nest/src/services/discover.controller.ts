import { Controller, Get, Param } from '@nestjs/common';
import { DiscoverService } from './discover.service';

@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  // keep this BEFORE :userId so "/refresh" isn't treated as a userId
  @Get('refresh')
  async refresh() {
    await this.discoverService.refreshProducts();
    return { success: true };
  }

  @Get(':userId')
  async getRecommendedByUser(@Param('userId') userId: string) {
    return this.discoverService.getRecommended(userId);
  }
}

////////////////////

// import { Controller, Get, Param, Query, Req } from '@nestjs/common';
// import { DiscoverService } from './discover.service';

// @Controller('discover')
// export class DiscoverController {
//   constructor(private readonly discoverService: DiscoverService) {}

//   // keep this BEFORE :userId so /refresh isn't treated as a userId
//   @Get('refresh')
//   async refresh() {
//     await this.discoverService.refreshProducts();
//     return { success: true };
//   }

//   @Get(':userId')
//   async getRecommendedByUser(@Param('userId') userId: string) {
//     return this.discoverService.getRecommended(userId);
//   }

//   @Get()
//   async getRecommended(
//     @Req() req: any,
//     @Query('userId') userId?: string,
//     @Query('auth0Sub') auth0Sub?: string,
//   ) {
//     if (userId) return this.discoverService.getRecommended(userId);
//     if (req.user?.sub || auth0Sub) {
//       const internalId = await this.discoverService.getInternalUserId(
//         req.user?.sub || auth0Sub,
//       );
//       return this.discoverService.getRecommended(internalId);
//     }
//     return this.discoverService.getRecommended('public');
//   }
// }

//////////////////

// import { Controller, Get, Param, Query, Req } from '@nestjs/common';
// import { DiscoverService } from './discover.service';

// @Controller('discover')
// export class DiscoverController {
//   constructor(private readonly discoverService: DiscoverService) {}

//   // 👇 put this BEFORE the :userId route
//   @Get('refresh')
//   async refresh() {
//     await this.discoverService.refreshProducts();
//     return { success: true };
//   }

//   @Get(':userId')
//   async getRecommendedByUser(@Param('userId') userId: string) {
//     return this.discoverService.getRecommended(userId);
//   }

//   @Get()
//   async getRecommended(
//     @Req() req: any,
//     @Query('userId') userId?: string,
//     @Query('auth0Sub') auth0Sub?: string,
//   ) {
//     if (userId) return this.discoverService.getRecommended(userId);
//     if (req.user?.sub || auth0Sub) {
//       const internalId = await this.discoverService.getInternalUserId(
//         req.user?.sub || auth0Sub,
//       );
//       return this.discoverService.getRecommended(internalId);
//     }
//     return this.discoverService.getRecommended('public');
//   }
// }

/////////////////

// import { Controller, Get, Param, Query, Req } from '@nestjs/common';
// import { DiscoverService } from './discover.service';

// @Controller('discover')
// export class DiscoverController {
//   constructor(private readonly discoverService: DiscoverService) {}

//   // 👇 put this BEFORE the :userId route
//   @Get('refresh')
//   async refresh() {
//     await this.discoverService.refreshProducts();
//     return { success: true };
//   }

//   @Get(':userId')
//   async getRecommendedByUser(@Param('userId') userId: string) {
//     return this.discoverService.getRecommended(userId);
//   }

//   @Get()
//   async getRecommended(
//     @Req() req: any,
//     @Query('userId') userId?: string,
//     @Query('auth0Sub') auth0Sub?: string,
//   ) {
//     if (userId) return this.discoverService.getRecommended(userId);
//     if (req.user?.sub || auth0Sub) {
//       const internalId = await this.discoverService.getInternalUserId(
//         req.user?.sub || auth0Sub,
//       );
//       return this.discoverService.getRecommended(internalId);
//     }
//     return this.discoverService.getRecommended('public');
//   }
// }
