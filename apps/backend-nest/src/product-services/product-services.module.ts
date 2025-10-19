import { Module } from '@nestjs/common';
import { ProductsController } from './product-services.controller';
import { ProductSearchService } from './product-search.service';
import { ShopbyProductSearchService } from './shopby-product-search.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductSearchService, ShopbyProductSearchService],
  exports: [ProductSearchService, ShopbyProductSearchService],
})
export class ProductsModule {}

/////////////////////

// import { Module } from '@nestjs/common';
// import { ProductsController } from './product-services.controller';
// import { ProductSearchService } from './product-search.service';

// @Module({
//   controllers: [ProductsController],
//   providers: [ProductSearchService],
// })
// export class ProductsModule {}
