import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { WardrobeModule } from '../wardrobe/wardrobe.module';
import { VertexModule } from '../vertex/vertex.module';

@Module({
  imports: [WardrobeModule, VertexModule],
  controllers: [UploadController],
  providers: [UploadService],
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
