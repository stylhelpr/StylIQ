import { Module, MiddlewareConsumer } from '@nestjs/common';
import { DatabaseService } from './db/database.service';
import { AuthMiddleware } from './auth/auth.middleware';

import { UsersModule } from './users/users.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { StyleProfileModule } from './style-profile/style.profile.module';
import { OutfitModule } from './outfit/outfit.module';
import { AiModule } from './ai/ai.module';
import { UploadModule } from './upload/upload.module';
import { PineconeModule } from './pinecone/pinecone.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CustomOutfitModule } from './custom-outfit/custom-outfit.module';
import { ScheduledOutfitModule } from './scheduled-outfit/scheduled-outfit.module';
import { FeedbackModule } from './feedback/feedback.module'; // ✅ ADD THIS

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    UsersModule,
    WardrobeModule,
    StyleProfileModule,
    OutfitModule,
    AiModule,
    UploadModule,
    PineconeModule,
    NotificationsModule,
    CustomOutfitModule,
    ScheduledOutfitModule,
    FeedbackModule, // ✅ ALSO ADD HERE
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
