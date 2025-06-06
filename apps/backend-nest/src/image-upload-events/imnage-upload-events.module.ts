import { Module } from '@nestjs/common';
import { ImageUploadEventsController } from './image-upload-events.controller';
import { ImageUploadEventsService } from './image-upload-events.service';

@Module({
  controllers: [ImageUploadEventsController],
  providers: [ImageUploadEventsService],
})
export class ImageUploadEventsModule {}
