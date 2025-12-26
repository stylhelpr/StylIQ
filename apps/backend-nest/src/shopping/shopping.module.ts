import { Module } from '@nestjs/common';
import { ShoppingAnalyticsService } from './shopping-analytics.service';
import { ShoppingAnalyticsController } from './shopping-analytics.controller';
import { ShoppingAnalyticsTestController } from './shopping-analytics-test.controller';
import { DatabaseService } from '../db/database.service';

@Module({
  controllers: [ShoppingAnalyticsController, ShoppingAnalyticsTestController],
  providers: [ShoppingAnalyticsService, DatabaseService],
  exports: [ShoppingAnalyticsService],
})
export class ShoppingModule {}
