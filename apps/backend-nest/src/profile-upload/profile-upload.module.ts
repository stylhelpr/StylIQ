import { Module } from '@nestjs/common';
import { ProfileUploadController } from './profile-upload.controller';
import { ProfileUploadService } from './profile-upload.service';

@Module({
  controllers: [ProfileUploadController],
  providers: [ProfileUploadService],
})
export class ProfileUploadModule {}
