import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ProfileUploadService } from './profile-upload.service';

@Controller('profile-upload')
export class ProfileUploadController {
  constructor(private readonly profileUploadService: ProfileUploadService) {}

  @Get('presign')
  async getPresignedUrl(
    @Query('userId') userId: string,
    @Query('filename') filename: string,
    @Query('contentType') contentType: string = 'image/jpeg',
  ) {
    return this.profileUploadService.generateProfilePresignedUrl(
      userId,
      filename,
      contentType,
    );
  }

  @Post('complete')
  async saveProfilePhoto(
    @Body() body: { user_id: string; image_url: string; object_key: string },
  ) {
    const { user_id, image_url, object_key } = body || {};
    if (!user_id || !image_url || !object_key) {
      throw new BadRequestException('user_id, image_url, object_key required');
    }
    return this.profileUploadService.saveProfilePhoto(
      user_id,
      image_url,
      object_key,
    );
  }
}
