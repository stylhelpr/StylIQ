import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CustomOutfitService } from './custom-outfit.service';
import { CreateCustomOutfitDto } from './dto/create-custom-outfit.dto';
import { UpdateCustomOutfitDto } from './dto/update-custom-outfit.dto';

@Controller('custom-outfits')
export class CustomOutfitController {
  constructor(private readonly service: CustomOutfitService) {}

  @Post()
  create(@Body() dto: CreateCustomOutfitDto) {
    return this.service.create(dto);
  }

  @Get(':userId')
  getByUser(@Param('userId') userId: string) {
    return this.service.getByUser(userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomOutfitDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Get('count/:userId')
  getCountByUser(@Param('userId') userId: string) {
    return this.service.countByUser(userId);
  }
}

////////////

// import {
//   Controller,
//   Get,
//   Post,
//   Put,
//   Delete,
//   Param,
//   Body,
// } from '@nestjs/common';
// import { CustomOutfitService } from './custom-outfit.service';
// import { CreateCustomOutfitDto } from './dto/create-custom-outfit.dto';
// import { UpdateCustomOutfitDto } from './dto/update-custom-outfit.dto';

// @Controller('custom-outfits')
// export class CustomOutfitController {
//   constructor(private readonly service: CustomOutfitService) {}

//   @Post()
//   create(@Body() dto: CreateCustomOutfitDto) {
//     return this.service.create(dto);
//   }

//   @Get(':userId')
//   getUserOutfits(@Param('userId') userId: string) {
//     return this.service.getByUser(userId);
//   }

//   @Put(':id')
//   update(@Param('id') id: string, @Body() dto: UpdateCustomOutfitDto) {
//     return this.service.update(id, dto);
//   }

//   @Delete(':id')
//   delete(@Param('id') id: string) {
//     return this.service.delete(id);
//   }
// }
