//BELOW HERE IS LOGIC TO KEEP FOR BATCH UPLOAD ITEMS - KEEP VERSION 1

// apps/backend-nest/src/upload/upload.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('presign')
  async getPresignedUrl(
    @Query('userId') userId: string,
    @Query('filename') filename: string,
    @Query('contentType') contentType: string = 'image/jpeg',
  ) {
    const result = await this.uploadService.generatePresignedUrl(
      userId,
      filename,
      contentType,
    );
    return result; // { uploadUrl, publicUrl, gsutil_uri, objectKey }
  }

  @Post('complete')
  async saveToDatabase(
    @Body()
    body: {
      user_id: string;
      image_url: string;
      object_key: string;
      name: string;
      main_category: string;
      subcategory?: string;
      color?: string;
      material?: string;
      fit?: string;
      size?: string;
      brand?: string;
      tags?: string[];
      [k: string]: any;
    },
  ) {
    return this.uploadService.saveWardrobeItem(body);
  }

  @Post('complete-batch')
  async saveBatch(
    @Body()
    body: {
      items: Array<{
        user_id: string;
        image_url: string;
        object_key: string;
        name: string;
        main_category: string;
        subcategory?: string;
        color?: string;
        material?: string;
        fit?: string;
        size?: string;
        brand?: string;
        tags?: string[];
        [k: string]: any;
      }>;
    },
  ) {
    const { items } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items[] is required');
    }

    const results: any[] = [];
    for (const item of items) {
      const res = await this.uploadService.saveWardrobeItem(item);
      results.push(res);
    }
    return { count: results.length, results };
  }
}

//////////////////

//BELOW HERE IS LOGIC TO KEEP FOR SINGLE UPLOAD ITEMS - KEEP VERSION 2

// import { Body, Controller, Get, Post, Query } from '@nestjs/common';
// import { UploadService } from './upload.service';

// @Controller('upload')
// export class UploadController {
//   constructor(private readonly uploadService: UploadService) {}

//   /**
//    * Get a v4 signed URL to PUT the file to GCS.
//    * Example:
//    *   GET /api/upload/presign?userId=...&filename=shirt.png&contentType=image/png
//    */
//   @Get('presign')
//   async getPresignedUrl(
//     @Query('userId') userId: string,
//     @Query('filename') filename: string,
//     @Query('contentType') contentType: string = 'image/jpeg',
//   ) {
//     const result = await this.uploadService.generatePresignedUrl(
//       userId,
//       filename,
//       contentType,
//     );
//     return result; // { uploadUrl, publicUrl, gsutil_uri, objectKey }
//   }

//   /**
//    * Finalize upload: create the wardrobe item in DB + embed + upsert to Pinecone.
//    * Body must include required CreateWardrobeItemDto fields.
//    */
//   @Post('complete')
//   async saveToDatabase(
//     @Body()
//     body: {
//       user_id: string;
//       image_url: string; // from presign response.publicUrl
//       object_key: string; // from presign response.objectKey
//       name: string;
//       main_category: string;
//       subcategory?: string;
//       color?: string;
//       material?: string;
//       fit?: string;
//       size?: string;
//       brand?: string;
//       tags?: string[];
//       // optional enrichment fields are allowed too
//       [k: string]: any;
//     },
//   ) {
//     return this.uploadService.saveWardrobeItem(body);
//   }
// }

////////////////

//BELOW HERE IS LOGIC TO KEEP FOR SINGLE UPLOAD ITEMS - KEEP VERSION 1

// import { Body, Controller, Get, Post, Query } from '@nestjs/common';
// import { UploadService } from './upload.service';

// @Controller('upload')
// export class UploadController {
//   constructor(private readonly uploadService: UploadService) {}

//   @Get('presign')
//   async getPresignedUrl(
//     @Query('userId') userId: string,
//     @Query('filename') filename: string,
//   ) {
//     console.log('📥 Request received for presign:', { userId, filename });

//     try {
//       const result = await this.uploadService.generatePresignedUrl(
//         userId,
//         filename,
//       );
//       console.log('✅ Presign success:', result);
//       return result;
//     } catch (error) {
//       console.error('❌ Presign generation failed:', error);
//       throw error; // Or: throw new InternalServerErrorException('Presign URL generation failed');
//     }
//   }

//   @Post('complete')
//   async saveToDatabase(@Body() body: any) {
//     console.log('📦 Received POST /upload/complete:', body); // <== Add this
//     return await this.uploadService.saveWardrobeItem(body);
//   }
// }
