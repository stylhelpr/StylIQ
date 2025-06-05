import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';

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
}

///////////

// import { Controller, Delete, Get, Param, Body } from '@nestjs/common';
// import { WardrobeService } from './wardrobe.service';
// import { DeleteItemDto } from './dto/delete-item.dto';

// @Controller('wardrobe')
// export class WardrobeController {
//   constructor(private readonly service: WardrobeService) {}

//   @Get(':userId')
//   getAll(@Param('userId') userId: string) {
//     return this.service.getAllItems(userId);
//   }

//   @Delete()
//   delete(@Body() dto: DeleteItemDto) {
//     return this.service.deleteItem(dto);
//   }
// }
