import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { SavedNotesService } from './saved-notes.service';
import { CreateSavedNoteDto } from './dto/create-saved-note.dto';
import { UpdateSavedNoteDto } from './dto/update-saved-note.dto';

@Controller('saved-notes')
export class SavedNotesController {
  constructor(private readonly service: SavedNotesService) {}

  @Post()
  create(@Body() dto: CreateSavedNoteDto) {
    return this.service.create(dto);
  }

  @Get(':userId')
  getUserNotes(@Param('userId') userId: string) {
    return this.service.getByUser(userId);
  }

  @Get('note/:id')
  getNote(@Param('id') id: string) {
    return this.service.getById(id);
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
