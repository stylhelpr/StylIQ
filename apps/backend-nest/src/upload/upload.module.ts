import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { WardrobeService } from '../wardrobe/wardrobe.service';
import { VertexService } from '../vertex/vertex.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, WardrobeService, VertexService],
  exports: [UploadService],
})
export class UploadModule {}

//////////////

// import { Module } from '@nestjs/common';
// import { UploadController } from './upload.controller';
// import { UploadService } from './upload.service';

// @Module({
//   controllers: [UploadController],
//   providers: [UploadService],
// })
// export class UploadModule {}
