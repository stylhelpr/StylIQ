import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ScheduledOutfitService } from './scheduled-outfit.service';
import { CreateScheduledOutfitDto } from './dto/create-scheduled-outfit.dto';
import { UpdateScheduledOutfitDto } from './dto/update-scheduled-outfit.dto';

@Controller('scheduled-outfits')
export class ScheduledOutfitController {
  constructor(private readonly service: ScheduledOutfitService) {}

  @Post()
  create(@Body() dto: CreateScheduledOutfitDto) {
    return this.service.create(dto);
  }

  @Get(':userId')
  getUserSchedule(@Param('userId') userId: string) {
    return this.service.getByUser(userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduledOutfitDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Delete()
  async deleteByUserAndOutfit(
    @Body() body: { user_id: string; outfit_id: string },
  ) {
    return this.service.deleteByUserAndOutfit(body.user_id, body.outfit_id);
  }
}
