import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('presign')
  async getPresignedUrl(
    @Query('userId') userId: string,
    @Query('filename') filename: string,
  ) {
    console.log('📥 Request received for presign:', { userId, filename });

    try {
      const result = await this.uploadService.generatePresignedUrl(
        userId,
        filename,
      );
      console.log('✅ Presign success:', result);
      return result;
    } catch (error) {
      console.error('❌ Presign generation failed:', error);
      throw error; // Or: throw new InternalServerErrorException('Presign URL generation failed');
    }
  }

  @Post('complete')
  async saveToDatabase(@Body() body: any) {
    console.log('📦 Received POST /upload/complete:', body); // <== Add this
    return await this.uploadService.saveWardrobeItem(body);
  }
}

/////////////

// import { Controller, Post, Body } from '@nestjs/common';
// import { UploadService } from './upload.service';
// import { UploadDto } from './dto/upload.dto';

// @Controller('upload')
// export class UploadController {
//   constructor(private readonly service: UploadService) {}

//   @Post()
//   async upload(@Body() dto: UploadDto) {
//     return this.service.handleUpload(dto);
//   }
// }
