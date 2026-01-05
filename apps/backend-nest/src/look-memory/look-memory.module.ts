import { Module } from '@nestjs/common';
import { LookMemoryController } from './look-memory.controller';
import { LookMemoryService } from './look-memory.service';
import { LearningModule } from '../learning/learning.module';

@Module({
  imports: [LearningModule],
  controllers: [LookMemoryController],
  providers: [LookMemoryService],
  exports: [LookMemoryService],
})
export class LookMemoryModule {}
