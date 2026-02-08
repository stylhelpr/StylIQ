/**
 * Learning Cron Jobs
 *
 * Background jobs for:
 * 1. Recomputing stale user fashion states (every 15 minutes)
 * 2. Cleaning up old events (daily)
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { pool } from '../db/pool';
import { FashionStateService } from './fashion-state.service';
import { LEARNING_FLAGS } from '../config/feature-flags';

@Injectable()
export class LearningCronService {
  private readonly logger = new Logger(LearningCronService.name);
  private isRunning = false;

  constructor(private readonly fashionStateService: FashionStateService) {}

  /**
   * Recompute stale fashion states every 15 minutes.
   * Processes up to 100 users per run to avoid long-running jobs.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async recomputeStaleStates(): Promise<void> {
    // Skip if learning is disabled
    if (!LEARNING_FLAGS.EVENTS_ENABLED && !LEARNING_FLAGS.STATE_ENABLED) {
      return;
    }

    // Prevent overlapping runs (silently skip)
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const staleUserIds = await this.fashionStateService.getStaleUserIds(100);

      if (staleUserIds.length === 0) {
        this.logger.debug('[LearningCron] No stale states to recompute');
        return;
      }

      this.logger.log(
        `[LearningCron] Recomputing states for ${staleUserIds.length} users`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const userId of staleUserIds) {
        try {
          await this.fashionStateService.computeAndSaveState(userId);
          successCount++;
        } catch (error) {
          this.logger.warn(
            `[LearningCron] Failed to compute state for ${userId}: ${error.message}`,
          );
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[LearningCron] Completed: ${successCount} success, ${errorCount} errors in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`[LearningCron] Job failed: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up events older than 365 days.
   * Runs daily at 3 AM.
   */
  @Cron('0 3 * * *')
  async cleanupOldEvents(): Promise<void> {
    // Skip if learning is disabled
    if (!LEARNING_FLAGS.EVENTS_ENABLED) {
      return;
    }

    const startTime = Date.now();

    try {
      const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      const result = await pool.query(
        `DELETE FROM user_learning_events WHERE event_ts < $1 RETURNING id`,
        [cutoffDate],
      );

      const deletedCount = result.rowCount || 0;
      const duration = Date.now() - startTime;

      if (deletedCount > 0) {
        this.logger.log(
          `[LearningCron] Cleaned up ${deletedCount} old events in ${duration}ms`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[LearningCron] Event cleanup failed: ${error.message}`,
      );
    }
  }

  /**
   * Get cron job status for health checks.
   */
  getStatus(): { isRunning: boolean; lastRun?: Date } {
    return {
      isRunning: this.isRunning,
    };
  }
}
