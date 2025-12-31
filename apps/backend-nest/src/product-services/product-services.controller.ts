import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProductSearchService } from './product-search.service';
import { ShopbyProductSearchService } from './shopby-product-search.service';
import { SkipAuth } from '../auth/skip-auth.decorator';

@SkipAuth()
@Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productSearchService: ProductSearchService,
    private readonly shopbyProductSearchService: ShopbyProductSearchService,
  ) {}

  // GET /api/products/search?q=outfit
  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) return [];
    return this.productSearchService.search(query);
  }

  // GET /api/products/shopby?q=outfit
  @Get('shopby')
  async shopby(@Query('q') query: string) {
    if (!query) return [];
    return this.shopbyProductSearchService.search(query);
  }
}

////////////////

// import { Controller, Get, Query } from '@nestjs/common';
// import { ProductSearchService } from './product-search.service';

// @Controller('products')
// export class ProductsController {
//   constructor(private readonly productSearchService: ProductSearchService) {}

//   // GET /api/products/search?q=outfit
//   @Get('search')
//   async search(@Query('q') query: string) {
//     if (!query) return [];
//     return this.productSearchService.search(query);
//   }
// }
