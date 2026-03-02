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
  NotFoundException,
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

  @Get('note/:id')
  async getNote(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    const note = await this.service.getById(id, userId);
    if (!note) {
      throw new NotFoundException();
    }
    return note;
  }

  @Get(':userId')
  getUserNotes(@Req() req) {
    const userId = req.user.userId;
    return this.service.getByUser(userId);
  }

  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateSavedNoteDto,
  ) {
    const userId = req.user.userId;
    const note = await this.service.update(id, userId, dto);
    if (!note) {
      throw new NotFoundException();
    }
    return note;
  }

  @Patch(':id')
  async partialUpdate(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateSavedNoteDto,
  ) {
    const userId = req.user.userId;
    const note = await this.service.update(id, userId, dto);
    if (!note) {
      throw new NotFoundException();
    }
    return note;
  }

  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    const deleted = await this.service.delete(id, userId);
    if (!deleted) {
      throw new NotFoundException();
    }
    return { message: 'Deleted' };
  }
}
