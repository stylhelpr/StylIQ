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
import { ScheduledOutfitService } from './scheduled-outfit.service';
import { CreateScheduledOutfitDto } from './dto/create-scheduled-outfit.dto';
import { UpdateScheduledOutfitDto } from './dto/update-scheduled-outfit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('scheduled-outfits')
export class ScheduledOutfitController {
  constructor(private readonly service: ScheduledOutfitService) {}

  @Post()
  create(@Req() req, @Body() dto: Omit<CreateScheduledOutfitDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.create({ user_id, ...dto });
  }

  @Get('history')
  getHistory(@Req() req) {
    const userId = req.user.userId;
    return this.service.getHistory(userId);
  }

  @Get('worn-counts')
  getWornCounts(@Req() req) {
    const userId = req.user.userId;
    return this.service.getWornCounts(userId);
  }

  @Get()
  getUserSchedule(@Req() req) {
    const userId = req.user.userId;
    return this.service.getByUser(userId);
  }

  @Put(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledOutfitDto,
  ) {
    const userId = req.user.userId;
    return this.service.update(id, userId, dto);
  }

  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.service.delete(id, userId);
  }

  @Delete()
  async deleteByUserAndOutfit(@Req() req, @Body() body: { outfit_id: string }) {
    const user_id = req.user.userId;
    return this.service.deleteByUserAndOutfit(user_id, body.outfit_id);
  }

  @Post(':id/worn')
  markAsWorn(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.service.markAsWorn(id, userId);
  }

  @Delete(':id/worn')
  unmarkAsWorn(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.service.unmarkAsWorn(id, userId);
  }
}
