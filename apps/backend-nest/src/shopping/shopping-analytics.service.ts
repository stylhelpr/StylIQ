import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import {
  ShoppingAnalyticsEventDto,
  ShoppingAnalyticsEventAckDto,
} from './dto/shopping-analytics.dto';

@Injectable()
export class ShoppingAnalyticsService {
  private logger = new Logger(ShoppingAnalyticsService.name);

  constructor(private db: DatabaseService) {}

  /**
   * Check if user has granted analytics consent.
   * Default: NO CONSENT (conservative approach for GDPR/CCPA compliance)
   */
  private async hasAnalyticsConsent(userId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `SELECT analytics_consent FROM users WHERE id = $1`,
        [userId],
      );
      // Default to false if column doesn't exist or user not found
      return result.rows[0]?.analytics_consent === true;
    } catch {
      // If column doesn't exist yet, default to no consent
      return false;
    }
  }

  /**
   * Ingest batch of events from client.
   *
   * Guarantees:
   * - Consent-gated: events only stored if user has analytics_consent = true
   * - Idempotent: same client_event_id → only 1 row inserted
   * - Transactional: all-or-nothing
   * - Immutable: events never updated after insertion
   */
  async ingestEventsBatch(
    userId: string,
    events: ShoppingAnalyticsEventDto[],
  ): Promise<ShoppingAnalyticsEventAckDto> {
    // BLOCKER FIX: Check consent before ingesting analytics
    const hasConsent = await this.hasAnalyticsConsent(userId);
    if (!hasConsent) {
      this.logger.debug(
        `[Analytics] Skipped: user_id=${userId} has no consent`,
      );
      return {
        accepted_client_event_ids: [],
        duplicate_count: 0,
        rejected: [],
        server_timestamp_ms: Date.now(),
        skipped_reason: 'no_consent',
      };
    }

    const acceptedClientEventIds: string[] = [];
    const rejectedEvents: Array<{ client_event_id: string; reason: string }> =
      [];
    let duplicateCount = 0;

    // Get connection from pool
    const client = this.db.getClient();

    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

      for (const event of events) {
        try {
          const result = await client.query(
            `
            INSERT INTO shopping_analytics_events (
              user_id, client_event_id, event_type, event_ts,
              canonical_url, domain, title_sanitized, session_id, payload
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (user_id, client_event_id) DO NOTHING
            RETURNING id;
            `,
            [
              userId,
              event.client_event_id,
              event.event_type,
              new Date(event.event_ts),
              event.canonical_url,
              event.domain,
              event.title_sanitized || null,
              event.session_id || null,
              JSON.stringify(event.payload),
            ],
          );

          if (result.rows.length === 0) {
            // Duplicate: client_event_id already exists
            duplicateCount++;
            this.logger.debug(
              `[Duplicate] user_id=${userId}, client_event_id=${event.client_event_id}`,
            );
          } else {
            // New event inserted
            acceptedClientEventIds.push(event.client_event_id);
            this.logger.debug(
              `[Accepted] user_id=${userId}, event_type=${event.event_type}, client_event_id=${event.client_event_id}`,
            );
          }
        } catch (err) {
          rejectedEvents.push({
            client_event_id: event.client_event_id,
            reason: err.message,
          });
          this.logger.warn(
            `[Rejected] user_id=${userId}, client_event_id=${event.client_event_id}: ${err.message}`,
          );
        }
      }

      // Commit transaction
      await client.query('COMMIT');

      this.logger.log(
        `[Analytics Batch Summary] user_id=${userId}, accepted=${acceptedClientEventIds.length}, duplicates=${duplicateCount}, rejected=${rejectedEvents.length}`,
      );

      return {
        accepted_client_event_ids: acceptedClientEventIds,
        duplicate_count: duplicateCount,
        rejected: rejectedEvents,
        server_timestamp_ms: Date.now(),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error(
        `[Analytics Batch] Transaction failed: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  /**
   * GDPR: Soft-delete all analytics for a user.
   */
  async deleteUserAnalytics(
    userId: string,
  ): Promise<{ deleted_count: number }> {
    const result = await this.db.query(
      `UPDATE shopping_analytics_events
       SET is_deleted = TRUE
       WHERE user_id = $1 AND is_deleted = FALSE
       RETURNING id;`,
      [userId],
    );

    const deletedCount = result.rows.length;
    this.logger.log(
      `[GDPR Delete] user_id=${userId}, deleted_count=${deletedCount}`,
    );

    return { deleted_count: deletedCount };
  }
}
