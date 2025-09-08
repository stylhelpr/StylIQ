// apps/backend-nest/src/feedback/feedback.module.ts
import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService], // ← add this
})
export class FeedbackModule {}

/////////////////////

// import { Module } from '@nestjs/common';
// import { FeedbackController } from './feedback.controller';
// import { FeedbackService } from './feedback.service';

// @Module({
//   controllers: [FeedbackController],
//   providers: [FeedbackService],
// })
// export class FeedbackModule {}
