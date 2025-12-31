import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProfileUploadService } from './profile-upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('profile-upload')
export class ProfileUploadController {
  constructor(private readonly profileUploadService: ProfileUploadService) {}

  @Get('presign')
  async getPresignedUrl(
    @Req() req,
    @Query('filename') filename: string,
    @Query('contentType') contentType: string = 'image/jpeg',
  ) {
    const userId = req.user.userId;
    return this.profileUploadService.generateProfilePresignedUrl(
      userId,
      filename,
      contentType,
    );
  }

  @Post('complete')
  async saveProfilePhoto(
    @Req() req,
    @Body() body: { image_url: string; object_key: string },
  ) {
    const user_id = req.user.userId;
    const { image_url, object_key } = body || {};
    if (!image_url || !object_key) {
      throw new BadRequestException('image_url, object_key required');
    }
    return this.profileUploadService.saveProfilePhoto(
      user_id,
      image_url,
      object_key,
    );
  }
}
