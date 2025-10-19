import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ImageUploadEventsService } from './image-upload-events.service';
import { CreateImageUploadEventDto } from './dto/create-image-upload-event.dto';

@Controller('image-upload-events')
export class ImageUploadEventsController {
  constructor(private readonly service: ImageUploadEventsService) {}

  @Post()
  create(@Body() dto: CreateImageUploadEventDto) {
    return this.service.create(dto);
  }

  @Get(':userId')
  getByUser(@Param('userId') userId: string) {
    return this.service.getByUser(userId);
  }
}
