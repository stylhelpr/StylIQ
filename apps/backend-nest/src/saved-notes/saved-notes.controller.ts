import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SavedNotesService } from './saved-notes.service';
import { CreateSavedNoteDto } from './dto/create-saved-note.dto';
import { UpdateSavedNoteDto } from './dto/update-saved-note.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('saved-notes')
export class SavedNotesController {
  constructor(private readonly service: SavedNotesService) {}

  @Post()
  create(@Req() req, @Body() dto: Omit<CreateSavedNoteDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.create({ user_id, ...dto });
  }

  // Static route must come before dynamic :userId
  @Get('note/:id')
  getNote(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Get(':userId')
  getUserNotes(@Req() req) {
    const userId = req.user.userId;
    return this.service.getByUser(userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSavedNoteDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id')
  partialUpdate(@Param('id') id: string, @Body() dto: UpdateSavedNoteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
