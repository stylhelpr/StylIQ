import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { SavedLookService } from './saved-look.service';
import { CreateSavedLookDto } from './dto/create-saved-look.dto';
import { UpdateSavedLookDto } from './dto/update-saved-look.dto';

@Controller('saved-looks')
export class SavedLookController {
  constructor(private readonly service: SavedLookService) {}

  @Post()
  create(@Body() dto: CreateSavedLookDto) {
    return this.service.create(dto);
  }

  @Get(':userId')
  getUserLooks(@Param('userId') userId: string) {
    console.log('📡 GET /saved-looks/:userId hit →', userId);
    return this.service.getByUser(userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSavedLookDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

/////////////////

// import {
//   Controller,
//   Get,
//   Post,
//   Put,
//   Delete,
//   Param,
//   Body,
// } from '@nestjs/common';
// import { SavedLookService } from './saved-look.service';
// import { CreateSavedLookDto } from './dto/create-saved-look.dto';
// import { UpdateSavedLookDto } from './dto/update-saved-look.dto';

// @Controller('saved-looks')
// export class SavedLookController {
//   constructor(private readonly service: SavedLookService) {}

//   @Post()
//   create(@Body() dto: CreateSavedLookDto) {
//     return this.service.create(dto);
//   }

//   @Get(':userId')
//   getUserLooks(@Param('userId') userId: string) {
//     return this.service.getByUser(userId);
//   }

//   @Put(':id')
//   update(@Param('id') id: string, @Body() dto: UpdateSavedLookDto) {
//     return this.service.update(id, dto);
//   }

//   @Delete(':id')
//   delete(@Param('id') id: string) {
//     return this.service.delete(id);
//   }
// }
