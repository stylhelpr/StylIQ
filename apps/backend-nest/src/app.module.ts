// apps/backend-nest/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './db/database.service';

import { AuthModule } from './auth/auth.module';
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
import { SavedLookModule } from './saved-looks/saved-look.module';
import { GCSModule } from './gcs/gcs.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FeedSourcesModule } from './feed-sources/feed-sources.module';
import { DiscoverModule } from './services/discover.module';
import { ContactModule } from './contact/contact.module';
import { ProfileUploadModule } from './profile-upload/profile-upload.module';
import { FeedsModule } from './feeds/feeds.module';
import { ProductsModule } from './product-services/product-services.module';
import { LookMemoryModule } from './look-memory/look-memory.module';
import { StyleProfilesModule } from './style-profiles/style-profiles.module';
import { RecreatedLookModule } from './recreated-look/recreated-look.module';
import { ShareModule } from './share/share.module';
import { CalendarModule } from './calendar/calendar.module';
import { ConnectedAccountsModule } from './connected-accounts/connected-accounts.module';
import { PriceTrackingModule } from './price-tracking/price-tracking.module';
import { CommunityModule } from './community/community.module';
import { MessagingModule } from './messaging/messaging.module';
import { SavedNotesModule } from './saved-notes/saved-notes.module';

// ⬇️ Register the notifier so main.ts can app.get(ScheduledOutfitNotifier)
import { ScheduledOutfitNotifier } from './scheduled-outfit/scheduled-outfit.notifier';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    WardrobeModule,
    StyleProfileModule,
    OutfitModule,
    AiModule,
    UploadModule,
    NotificationsModule, // must be imported so NotificationsService is available
    CustomOutfitModule,
    ScheduledOutfitModule,
    FeedbackModule,
    GCSModule,
    ImageUploadEventsModule,
    SearchLogsModule,
    UserSubscriptionsModule,
    OutfitFavoritesModule,
    SavedLookModule,
    FeedSourcesModule,
    DiscoverModule,
    ContactModule,
    RecreatedLookModule,
    ProfileUploadModule,
    ProductsModule,
    LookMemoryModule,
    ShareModule,
    FeedsModule,
    CalendarModule,
    StyleProfilesModule,
    ConnectedAccountsModule,
    PriceTrackingModule,
    CommunityModule,
    MessagingModule,
    SavedNotesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseService,
    ScheduledOutfitNotifier, // ⬅️ add this
  ],
})
export class AppModule {}

///////////////////

// import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config'; // ⬅️ ADD THIS
// import { DatabaseService } from './db/database.service';

// import { AuthModule } from './auth/auth.module';
// import { UsersModule } from './users/users.module';
// import { ImageUploadEventsModule } from './image-upload-events/imnage-upload-events.module';
// import { WardrobeModule } from './wardrobe/wardrobe.module';
// import { StyleProfileModule } from './style-profile/style.profile.module';
// import { OutfitModule } from './outfit/outfit.module';
// import { AiModule } from './ai/ai.module';
// import { UploadModule } from './upload/upload.module';
// import { NotificationsModule } from './notifications/notifications.module';
// import { CustomOutfitModule } from './custom-outfit/custom-outfit.module';
// import { ScheduledOutfitModule } from './scheduled-outfit/scheduled-outfit.module';
// import { FeedbackModule } from './feedback/feedback.module';
// import { SearchLogsModule } from './search-logs/search-logs.module';
// import { UserSubscriptionsModule } from './user-subscriptions/user-subscriptions.module';
// import { OutfitFavoritesModule } from './outfit-favorites/outfit-favorites.module';
// import { SavedLookModule } from './saved-looks/saved-look.module';
// import { GCSModule } from './gcs/gcs.module';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// import { FeedSourcesModule } from './feed-sources/feed-sources.module';
// import { FeedsModule } from './feeds/feeds.module';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//       envFilePath: '.env', // ⬅️ LOADS YOUR .env FILE
//     }),
//     AuthModule,
//     UsersModule,
//     WardrobeModule,
//     StyleProfileModule,
//     OutfitModule,
//     AiModule,
//     UploadModule,
//     NotificationsModule,
//     CustomOutfitModule,
//     ScheduledOutfitModule,
//     FeedbackModule,
//     GCSModule,
//     ImageUploadEventsModule,
//     SearchLogsModule,
//     UserSubscriptionsModule,
//     OutfitFavoritesModule,
//     SavedLookModule,
//     FeedSourcesModule,
//   ],
//   controllers: [AppController],
//   providers: [AppService, DatabaseService],
// })
// export class AppModule {}
