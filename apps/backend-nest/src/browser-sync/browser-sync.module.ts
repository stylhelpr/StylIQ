import { Module } from '@nestjs/common';
import { BrowserSyncController } from './browser-sync.controller';
import { BrowserSyncService } from './browser-sync.service';
import { DatabaseService } from '../db/database.service';

@Module({
  controllers: [BrowserSyncController],
  providers: [BrowserSyncService, DatabaseService],
  exports: [BrowserSyncService],
})
export class BrowserSyncModule {}
