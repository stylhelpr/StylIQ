import { Module } from '@nestjs/common';
import { DatabaseService } from './db/database.service';

import { AuthModule } from './auth/auth.module'; // ✅ <— Add this
import { UsersModule } from './users/users.module';
import { ImageUploadEventsModule } from './image-upload-events/imnage-upload-events.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { StyleProfileModule } from './style-profile/style.profile.module';
import { OutfitModule } from './outfit/outfit.module';
import { AiModule } from './ai/ai.module';
import { UploadModule } from './upload/upload.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CustomOutfitModule } from './custom-outfit/custom-outfit.module';
import { ScheduledOutfitModule } from './scheduled-outfit/scheduled-outfit.module';
import { FeedbackModule } from './feedback/feedback.module';
import { SearchLogsModule } from './search-logs/search-logs.module';
import { UserSubscriptionsModule } from './user-subscriptions/user-subscriptions.module';
import { OutfitFavoritesModule } from './outfit-favorites/outfit-favorites.module';

import { GCSModule } from './gcs/gcs.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    WardrobeModule,
    StyleProfileModule,
    OutfitModule,
    AiModule,
    UploadModule,
    NotificationsModule,
    CustomOutfitModule,
    ScheduledOutfitModule,
    FeedbackModule,
    GCSModule,
    ImageUploadEventsModule,
    SearchLogsModule,
    UserSubscriptionsModule,
    OutfitFavoritesModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
