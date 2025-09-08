// apps/backend-nest/src/wardrobe/wardrobe.module.ts
import { Module } from '@nestjs/common';
import { WardrobeController } from './wardrobe.controller';
import { WardrobeService } from './wardrobe.service';
import { VertexModule } from '../vertex/vertex.module';
import { FeedbackModule } from '../feedback/feedback.module';

@Module({
  imports: [VertexModule, FeedbackModule], // ← add FeedbackModule
  controllers: [WardrobeController],
  providers: [WardrobeService],
  exports: [WardrobeService], // ← export WardrobeService
})
export class WardrobeModule {}

////////////////////

// import { Module } from '@nestjs/common';
// import { WardrobeController } from './wardrobe.controller';
// import { WardrobeService } from './wardrobe.service';
// import { VertexModule } from '../vertex/vertex.module';

// @Module({
//   imports: [VertexModule],
//   controllers: [WardrobeController],
//   providers: [WardrobeService],
// })
// export class WardrobeModule {}
