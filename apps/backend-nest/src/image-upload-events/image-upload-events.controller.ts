import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ImageUploadEventsService } from './image-upload-events.service';
import { CreateImageUploadEventDto } from './dto/create-image-upload-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('image-upload-events')
export class ImageUploadEventsController {
  constructor(private readonly service: ImageUploadEventsService) {}

  @Post()
  create(@Req() req, @Body() dto: Omit<CreateImageUploadEventDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.create(user_id, dto);
  }

  @Get()
  getByUser(@Req() req) {
    const userId = req.user.userId;
    return this.service.getByUser(userId);
  }
}
