import { Controller, Get, Query } from '@nestjs/common';
import { ProductSearchService } from './product-search.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productSearchService: ProductSearchService) {}

  // GET /api/products/search?q=outfit
  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) return [];
    return this.productSearchService.search(query);
  }
}

//////////////

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
