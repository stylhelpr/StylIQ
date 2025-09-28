import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FeedsCronService } from './feeds.cron';
import { NotificationsModule } from '../notifications/notifications.module';
import { FeedDiscoverController } from './feeds.discover.controller';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  providers: [FeedsCronService],
  controllers: [FeedDiscoverController], // ✅ Add this line
})
export class FeedsModule {}

/////////////////

// import { Module } from '@nestjs/common';
// import { ScheduleModule } from '@nestjs/schedule';
// import { FeedsCronService } from './feeds.cron';
// import { NotificationsModule } from '../notifications/notifications.module';

// @Module({
//   imports: [ScheduleModule.forRoot(), NotificationsModule],
//   providers: [FeedsCronService],
// })
// export class FeedsModule {}
