// apps/backend-nest/src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService], // <- important
})
export class NotificationsModule {}

/////////////////

// import { Module } from '@nestjs/common';
// import { NotificationsController } from './notifications.controller';
// import { NotificationsService } from './notifications.service';

// @Module({
//   controllers: [NotificationsController],
//   providers: [NotificationsService],
// })
// export class NotificationsModule {}
