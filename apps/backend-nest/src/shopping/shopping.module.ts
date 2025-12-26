import { Module } from '@nestjs/common';
import { ShoppingAnalyticsService } from './shopping-analytics.service';
import { ShoppingAnalyticsController } from './shopping-analytics.controller';
import { DatabaseService } from '../db/database.service';

@Module({
  controllers: [ShoppingAnalyticsController],
  providers: [ShoppingAnalyticsService, DatabaseService],
  exports: [ShoppingAnalyticsService],
})
export class ShoppingModule {}
