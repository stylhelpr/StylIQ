// apps/backend-nest/src/scheduled-outfit/scheduled-outfit.module.ts
import { Module } from '@nestjs/common';
import { ScheduledOutfitController } from './scheduled-outfit.controller';
import { ScheduledOutfitService } from './scheduled-outfit.service';
import { OutfitCronService } from './outfit-cron.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule], // ⬅️ for NotificationsService
  controllers: [ScheduledOutfitController],
  providers: [ScheduledOutfitService, OutfitCronService],
})
export class ScheduledOutfitModule {}

///////////////////

// import { Module } from '@nestjs/common';
// import { ScheduledOutfitController } from './scheduled-outfit.controller';
// import { ScheduledOutfitService } from './scheduled-outfit.service';

// @Module({
//   controllers: [ScheduledOutfitController],
//   providers: [ScheduledOutfitService],
// })
// export class ScheduledOutfitModule {}
