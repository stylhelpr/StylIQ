// src/saved-look/saved-look.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SavedLookService } from './saved-look.service';
import { CreateSavedLookDto } from './dto/create-saved-look.dto';
import { UpdateSavedLookDto } from './dto/update-saved-look.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('saved-looks')
export class SavedLookController {
  constructor(private readonly service: SavedLookService) {}

  @Post()
  create(@Req() req, @Body() dto: Omit<CreateSavedLookDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.create({ user_id, ...dto });
  }

  @Get(':userId')
  getUserLooks(@Req() req) {
    const userId = req.user.userId;
    return this.service.getByUser(userId);
  }

  @Put(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateSavedLookDto) {
    const userId = req.user.userId;
    return this.service.update(id, userId, dto);
  }

  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.service.delete(id, userId);
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
//     console.log('📡 GET /saved-looks/:userId hit →', userId);
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
