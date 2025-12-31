import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { GCSService } from './gcs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('upload-url')
export class GCSController {
  constructor(private readonly gcsService: GCSService) {}

  @Post()
  async getUploadUrl(@Body() body: { fileName: string; contentType: string }) {
    const { fileName, contentType } = body;
    const signedUrl = await this.gcsService.generateSignedUploadUrl(
      fileName,
      contentType,
    );
    return { signedUrl };
  }
}
