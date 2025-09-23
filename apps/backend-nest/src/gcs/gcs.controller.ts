import { Controller, Post, Body } from '@nestjs/common';
import { GCSService } from './gcs.service';

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
