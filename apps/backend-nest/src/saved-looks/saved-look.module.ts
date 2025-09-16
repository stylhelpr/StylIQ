import { Module } from '@nestjs/common';
import { SavedLookController } from './saved-look.controller';
import { SavedLookService } from './saved-look.service';

@Module({
  controllers: [SavedLookController],
  providers: [SavedLookService],
})
export class SavedLookModule {}
