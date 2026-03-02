/**
 * Learning Module
 *
 * Cross-system learning infrastructure for improving AI recommendations
 * based on user outcomes (ratings, purchases, saves, etc.)
 *
 * Features:
 * - Event logging (user_learning_events table)
 * - State computation (user_fashion_state table)
 * - Consent management
 * - Background processing (cron jobs)
 *
 * Safety:
 * - All features are OFF by default (controlled by feature flags)
 * - Consent is required for any data collection
 * - Automatic fallback on any error
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { ConsentCache } from './consent-cache';
import { LearningEventsService } from './learning-events.service';
import { FashionStateService } from './fashion-state.service';
import { LearningCronService } from './learning.cron';
import { LearningController } from './learning.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [LearningController],
  providers: [
    ConsentCache,
    LearningEventsService,
    FashionStateService,
    LearningCronService,
  ],
  exports: [ConsentCache, LearningEventsService, FashionStateService],
})
export class LearningModule {}
