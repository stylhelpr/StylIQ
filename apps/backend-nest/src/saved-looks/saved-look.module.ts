import { Module } from '@nestjs/common';
import { SavedLookController } from './saved-look.controller';
import { SavedLookService } from './saved-look.service';
import { LearningModule } from '../learning/learning.module';

@Module({
  imports: [LearningModule],
  controllers: [SavedLookController],
  providers: [SavedLookService],
})
export class SavedLookModule {}
