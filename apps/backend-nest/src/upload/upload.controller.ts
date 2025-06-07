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
    return await this.uploadService.generatePresignedUrl(userId, filename);
  }

  @Post('complete')
  async saveToDatabase(@Body() body: any) {
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
