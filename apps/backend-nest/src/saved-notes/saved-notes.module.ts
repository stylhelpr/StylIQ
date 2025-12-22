import { Module } from '@nestjs/common';
import { SavedNotesController } from './saved-notes.controller';
import { SavedNotesService } from './saved-notes.service';

@Module({
  controllers: [SavedNotesController],
  providers: [SavedNotesService],
  exports: [SavedNotesService],
})
export class SavedNotesModule {}
