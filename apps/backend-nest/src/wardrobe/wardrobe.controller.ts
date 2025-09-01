import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { DeleteItemDto } from './dto/delete-item.dto';

@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly service: WardrobeService) {}

  @Post()
  create(@Body() dto: CreateWardrobeItemDto) {
    return this.service.createItem(dto);
  }

  @Get(':user_id')
  getByUser(@Param('user_id') userId: string) {
    return this.service.getItemsByUser(userId);
  }

  @Get()
  getByUserQuery(@Query('user_id') userId: string) {
    return this.service.getItemsByUser(userId);
  }

  @Put(':item_id')
  update(@Param('item_id') itemId: string, @Body() dto: UpdateWardrobeItemDto) {
    return this.service.updateItem(itemId, dto);
  }

  @Delete()
  delete(@Body() dto: DeleteItemDto) {
    return this.service.deleteItem(dto);
  }

  @Post('suggest')
  suggest(@Body() body: { user_id: string; queryVec: number[] }) {
    return this.service.suggestOutfits(body.user_id, body.queryVec);
  }

  @Post('search-text')
  searchText(@Body() b: { user_id: string; q: string; topK?: number }) {
    return this.service.searchText(b.user_id, b.q, b.topK);
  }

  @Post('search-image')
  searchImage(@Body() b: { user_id: string; gcs_uri: string; topK?: number }) {
    return this.service.searchImage(b.user_id, b.gcs_uri, b.topK);
  }

  @Post('search-hybrid')
  searchHybrid(
    @Body() b: { user_id: string; q?: string; gcs_uri?: string; topK?: number },
  ) {
    return this.service.searchHybrid(b.user_id, b.q, b.gcs_uri, b.topK);
  }
}

/////////////////

// // apps/backend-nest/src/wardrobe/wardrobe.controller.ts
// import {
//   Controller,
//   Post,
//   Body,
//   Get,
//   Param,
//   Delete,
//   Put,
//   Query,
// } from '@nestjs/common';
// import { WardrobeService } from './wardrobe.service';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';

// @Controller('wardrobe')
// export class WardrobeController {
//   constructor(private readonly service: WardrobeService) {}

//   // -------------------
//   // CREATE
//   // -------------------
//   @Post()
//   create(@Body() dto: CreateWardrobeItemDto) {
//     return this.service.createItem(dto);
//   }

//   // -------------------
//   // READ
//   // -------------------
//   @Get(':user_id')
//   getByUser(@Param('user_id') userId: string) {
//     return this.service.getItemsByUser(userId);
//   }

//   @Get()
//   getByUserQuery(@Query('user_id') userId: string) {
//     return this.service.getItemsByUser(userId);
//   }

//   // -------------------
//   // UPDATE
//   // -------------------
//   @Put(':item_id')
//   update(@Param('item_id') itemId: string, @Body() dto: UpdateWardrobeItemDto) {
//     return this.service.updateItem(itemId, dto);
//   }

//   // -------------------
//   // DELETE
//   // -------------------
//   @Delete()
//   delete(@Body() dto: DeleteItemDto) {
//     return this.service.deleteItem(dto);
//   }

//   // -------------------
//   // SUGGEST OUTFITS (NEW)
//   // -------------------
//   @Post('suggest')
//   suggest(@Body() body: { user_id: string; queryVec: number[] }) {
//     return this.service.suggestOutfits(body.user_id, body.queryVec);
//   }

// }

///////////////

// import {
//   Controller,
//   Post,
//   Body,
//   Get,
//   Param,
//   Delete,
//   Put,
//   Query,
// } from '@nestjs/common';
// import { WardrobeService } from './wardrobe.service';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';

// @Controller('wardrobe')
// export class WardrobeController {
//   constructor(private readonly service: WardrobeService) {}

//   @Post()
//   create(@Body() dto: CreateWardrobeItemDto) {
//     return this.service.createItem(dto);
//   }

//   @Get(':user_id')
//   getByUser(@Param('user_id') userId: string) {
//     return this.service.getItemsByUser(userId);
//   }

//   @Get()
//   getByUserQuery(@Query('user_id') userId: string) {
//     return this.service.getItemsByUser(userId);
//   }

//   @Put(':item_id')
//   update(@Param('item_id') itemId: string, @Body() dto: UpdateWardrobeItemDto) {
//     return this.service.updateItem(itemId, dto);
//   }

//   @Delete()
//   delete(@Body() dto: DeleteItemDto) {
//     return this.service.deleteItem(dto);
//   }
// }
