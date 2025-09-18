import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { DiscoverService } from './discover.service';

@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  // 👇 put this BEFORE the :userId route
  @Get('refresh')
  async refresh() {
    await this.discoverService.refreshProducts();
    return { success: true };
  }

  @Get(':userId')
  async getRecommendedByUser(@Param('userId') userId: string) {
    return this.discoverService.getRecommended(userId);
  }

  @Get()
  async getRecommended(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('auth0Sub') auth0Sub?: string,
  ) {
    if (userId) return this.discoverService.getRecommended(userId);
    if (req.user?.sub || auth0Sub) {
      const internalId = await this.discoverService.getInternalUserId(
        req.user?.sub || auth0Sub,
      );
      return this.discoverService.getRecommended(internalId);
    }
    return this.discoverService.getRecommended('public');
  }
}

///////////////////

// import { Controller, Get, Param, Query, Req } from '@nestjs/common';
// import { DiscoverService } from './discover.service';

// @Controller('discover')
// export class DiscoverController {
//   constructor(private readonly discoverService: DiscoverService) {}

//   // ✅ Canonical path: internal userId everywhere (matches rest of your API)
//   @Get(':userId')
//   async getRecommendedByUser(@Param('userId') userId: string) {
//     return this.discoverService.getRecommended(userId);
//   }

//   // 🧩 Back-compat/optional: tolerate userId or auth0Sub on query or req.user
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
//     // Public fallback (optional): return generic feed
//     return this.discoverService.getRecommended('public');
//   }
// }
