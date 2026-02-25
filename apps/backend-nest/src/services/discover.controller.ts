import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  // Get current week's recommendations
  @Get(':userId')
  async getRecommendedByUser(@Req() req) {
    const userId = req.user.userId;
    const timezone = req.headers['x-user-timezone'] || 'UTC';
    return this.discoverService.getRecommended(userId, timezone);
  }

  // Get all saved products
  @Get(':userId/saved')
  async getSavedProducts(@Req() req) {
    const userId = req.user.userId;
    return this.discoverService.getSavedProducts(userId);
  }

  // Save a product (add to favorites)
  @Post(':userId/save')
  async saveProduct(@Req() req, @Body('product_id') productId: string) {
    const userId = req.user.userId;
    return this.discoverService.saveProduct(userId, productId);
  }

  // Unsave a product (remove from favorites)
  @Post(':userId/unsave')
  async unsaveProduct(@Req() req, @Body('product_id') productId: string) {
    const userId = req.user.userId;
    return this.discoverService.unsaveProduct(userId, productId);
  }

  // Toggle saved state
  @Post(':userId/toggle-save')
  async toggleSaveProduct(@Req() req, @Body('product_id') productId: string) {
    const userId = req.user.userId;
    return this.discoverService.toggleSaveProduct(userId, productId);
  }

  // Emit PRODUCT_CLICK learning event
  @Post(':userId/product-click')
  async productClick(@Req() req, @Body('product_id') productId: string) {
    const userId = req.user.userId;
    this.discoverService.emitProductClick(userId, productId);
    return { success: true };
  }

  // Emit ITEM_EXPLICITLY_DISMISSED learning event
  @Post(':userId/dismiss')
  async dismissProduct(@Req() req, @Body('product_id') productId: string) {
    const userId = req.user.userId;
    await this.discoverService.emitItemDismissed(userId, productId);
    return { success: true };
  }

  // Undo dismiss (clear disliked state)
  @Post(':userId/undo-dismiss')
  async undoDismissProduct(@Req() req, @Body('product_id') productId: string) {
    const userId = req.user.userId;
    await this.discoverService.undoItemDismissed(userId, productId);
    return { success: true };
  }
}
