/**
 * Learning Events Service
 *
 * Handles logging of user outcome events for the cross-system learning loop.
 *
 * Key guarantees:
 * - Never blocks user actions (timeout-based best-effort)
 * - Never throws exceptions that propagate to callers
 * - Respects user consent (checked before every insert)
 * - Circuit breaker prevents cascading failures
 */

import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../db/pool';
import { ConsentCache } from './consent-cache';
import {
  LEARNING_FLAGS,
  EVENT_LOGGING_CONFIG,
} from '../config/feature-flags';
import {
  CreateLearningEventInput,
  EVENT_SIGNAL_DEFAULTS,
  LearningEventType,
  ExtractedFeatures,
  EntityType,
  SignalPolarity,
} from './dto/learning-event.dto';

@Injectable()
export class LearningEventsService {
  private readonly logger = new Logger(LearningEventsService.name);

  // Circuit breaker state
  private circuitOpen = false;
  private consecutiveFailures = 0;
  private circuitOpenedAt = 0;

  constructor(private readonly consentCache: ConsentCache) {}

  /**
   * Log a learning event.
   *
   * This method is fire-and-forget: it will never throw and will never
   * block for more than EVENT_LOGGING_CONFIG.TIMEOUT_MS milliseconds.
   *
   * @param input Event data to log
   */
  async logEvent(input: CreateLearningEventInput): Promise<void> {
    // Early exit if events are disabled
    if (!LEARNING_FLAGS.EVENTS_ENABLED) {
      return;
    }

    // Circuit breaker check
    if (this.circuitOpen) {
      if (
        Date.now() - this.circuitOpenedAt <
        EVENT_LOGGING_CONFIG.CIRCUIT_BREAKER_RESET_MS
      ) {
        return; // Silently skip while circuit is open
      }
      // Try to reset circuit
      this.circuitOpen = false;
      this.consecutiveFailures = 0;
      this.logger.log('[LearningEvents] Circuit breaker reset, retrying');
    }

    // Consent check (cached)
    try {
      const hasConsent = await this.consentCache.check(input.userId);
      if (!hasConsent) {
        return; // Silent no-op, not a failure
      }
    } catch (error) {
      // Consent check failed - don't log event
      this.logger.warn(
        `[LearningEvents] Consent check failed for ${input.userId}: ${error.message}`,
      );
      return;
    }

    // Best-effort write with timeout
    const timeoutPromise = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), EVENT_LOGGING_CONFIG.TIMEOUT_MS),
    );

    const insertPromise = this.insertEvent(input);

    try {
      const result = await Promise.race([insertPromise, timeoutPromise]);

      if (result === 'timeout') {
        this.handleFailure('timeout', input.userId);
        return;
      }

      // Success - reset failure counter
      this.consecutiveFailures = 0;
    } catch (error) {
      this.handleFailure(error.message, input.userId);
    }
  }

  /**
   * Convenience method for logging with default signal values.
   */
  async logEventWithDefaults(
    userId: string,
    eventType: LearningEventType,
    entityType: EntityType,
    entityId: string | undefined,
    extractedFeatures: ExtractedFeatures,
    sourceFeature: string,
    options?: {
      entitySignature?: string;
      context?: Record<string, any>;
      clientEventId?: string;
    },
  ): Promise<void> {
    const defaults = EVENT_SIGNAL_DEFAULTS[eventType];

    await this.logEvent({
      userId,
      eventType,
      entityType,
      entityId,
      entitySignature: options?.entitySignature,
      signalPolarity: defaults.polarity,
      signalWeight: defaults.weight,
      extractedFeatures,
      context: options?.context,
      sourceFeature,
      clientEventId: options?.clientEventId,
    });
  }

  /**
   * Get event count for a user (for debugging/admin).
   */
  async getEventCount(userId: string): Promise<number> {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) FROM user_learning_events WHERE user_id = $1',
        [userId],
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      this.logger.error(`[LearningEvents] getEventCount failed: ${error.message}`);
      return 0;
    }
  }

  /**
   * Delete all events for a user (GDPR/consent revocation).
   */
  async deleteUserEvents(userId: string): Promise<number> {
    try {
      const result = await pool.query(
        'DELETE FROM user_learning_events WHERE user_id = $1 RETURNING id',
        [userId],
      );
      this.logger.log(
        `[LearningEvents] Deleted ${result.rowCount} events for user ${userId}`,
      );
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error(
        `[LearningEvents] deleteUserEvents failed: ${error.message}`,
      );
      throw error; // Deletion failures should propagate
    }
  }

  /**
   * Insert event into database.
   */
  private async insertEvent(input: CreateLearningEventInput): Promise<void> {
    await pool.query(
      `INSERT INTO user_learning_events (
        user_id,
        event_type,
        event_ts,
        entity_type,
        entity_id,
        entity_signature,
        signal_polarity,
        signal_weight,
        context,
        extracted_features,
        source_feature,
        client_event_id,
        schema_version
      ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)
      ON CONFLICT (user_id, client_event_id) WHERE client_event_id IS NOT NULL
      DO NOTHING`,
      [
        input.userId,
        input.eventType,
        input.entityType,
        input.entityId || null,
        input.entitySignature || null,
        input.signalPolarity,
        input.signalWeight,
        JSON.stringify(input.context || {}),
        JSON.stringify(input.extractedFeatures),
        input.sourceFeature,
        input.clientEventId || null,
      ],
    );
  }

  /**
   * Handle logging failure - update circuit breaker state.
   */
  private handleFailure(reason: string, userId: string): void {
    this.consecutiveFailures++;
    this.logger.warn(
      `[LearningEvents] Event logging failed for ${userId}: ${reason} (failures: ${this.consecutiveFailures})`,
    );

    if (
      this.consecutiveFailures >= EVENT_LOGGING_CONFIG.CIRCUIT_BREAKER_THRESHOLD
    ) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
      this.logger.error(
        '[LearningEvents] Circuit breaker OPENED due to consecutive failures',
      );
    }
  }

  /**
   * Get circuit breaker status (for health checks).
   */
  getCircuitBreakerStatus(): {
    isOpen: boolean;
    consecutiveFailures: number;
    openedAt: number | null;
  } {
    return {
      isOpen: this.circuitOpen,
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.circuitOpen ? this.circuitOpenedAt : null,
    };
  }
}
