import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { DiscoverService } from './discover.service';

@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  // Get current week's recommendations
  @Get(':userId')
  async getRecommendedByUser(@Param('userId') userId: string) {
    return this.discoverService.getRecommended(userId);
  }

  // Get all saved products
  @Get(':userId/saved')
  async getSavedProducts(@Param('userId') userId: string) {
    return this.discoverService.getSavedProducts(userId);
  }

  // Save a product (add to favorites)
  @Post(':userId/save')
  async saveProduct(
    @Param('userId') userId: string,
    @Body('product_id') productId: string,
  ) {
    return this.discoverService.saveProduct(userId, productId);
  }

  // Unsave a product (remove from favorites)
  @Post(':userId/unsave')
  async unsaveProduct(
    @Param('userId') userId: string,
    @Body('product_id') productId: string,
  ) {
    return this.discoverService.unsaveProduct(userId, productId);
  }

  // Toggle saved state
  @Post(':userId/toggle-save')
  async toggleSaveProduct(
    @Param('userId') userId: string,
    @Body('product_id') productId: string,
  ) {
    return this.discoverService.toggleSaveProduct(userId, productId);
  }
}
