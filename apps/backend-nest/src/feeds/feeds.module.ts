import { Module } from '@nestjs/common';
import { FeedScrapeController } from './feeds.scrape.controller';
import { FeedDiscoverController } from './feeds.discover.controller';
import { FeedsCronService } from './feeds.cron';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module';
import { FeedsScrapeService } from './feeds.scrap.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  controllers: [FeedDiscoverController, FeedScrapeController],
  providers: [FeedsCronService, FeedsScrapeService], // 👈 ADDED HERE
  exports: [FeedsScrapeService], // 👈 optional but good practice
})
export class FeedsModule {}

//////////////////

// import { Module } from '@nestjs/common';
// import { FeedScrapeController } from './feeds.scrape.controller';
// import { FeedDiscoverController } from './feeds.discover.controller';
// import { FeedsCronService } from './feeds.cron';
// import { ScheduleModule } from '@nestjs/schedule';
// import { NotificationsModule } from '../notifications/notifications.module';

// @Module({
//   imports: [ScheduleModule.forRoot(), NotificationsModule],
//   controllers: [FeedDiscoverController, FeedScrapeController],
//   providers: [FeedsCronService],
// })
// export class FeedsModule {}

//////////////////

// import { Module } from '@nestjs/common';
// import { ScheduleModule } from '@nestjs/schedule';
// import { FeedsCronService } from './feeds.cron';
// import { NotificationsModule } from '../notifications/notifications.module';
// import { FeedDiscoverController } from './feeds.discover.controller';

// @Module({
//   imports: [ScheduleModule.forRoot(), NotificationsModule],
//   providers: [FeedsCronService],
//   controllers: [FeedDiscoverController], // ✅ Add this line
// })
// export class FeedsModule {}

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
