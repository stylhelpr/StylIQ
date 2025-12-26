import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShoppingAnalyticsService } from './shopping-analytics.service';
import {
  ShoppingAnalyticsEventBatchDto,
  ShoppingAnalyticsEventAckDto,
} from './dto/shopping-analytics.dto';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

@Controller('shopping/analytics')
@UseGuards(AuthGuard('jwt')) // JWT required: extracts user_id from token
@UseGuards(ThrottlerGuard) // Rate limiting
export class ShoppingAnalyticsController {
  private logger = new Logger(ShoppingAnalyticsController.name);

  constructor(private analyticsService: ShoppingAnalyticsService) {}

  /**
   * Batch ingest analytics events from mobile client.
   *
   * Security:
   * - JWT guard extracts user_id from token (never from body)
   * - Payload size limit: 5MB (enforced by NestJS middleware)
   * - Rate limit: 100 requests per 15 min per user
   * - Idempotency: enforced by unique constraint on (user_id, client_event_id)
   *
   * Response:
   * - 200 OK: events processed (some may be duplicates, still 200)
   * - 400 Bad Request: validation failed
   * - 429 Too Many Requests: rate limited
   * - 401 Unauthorized: invalid JWT
   */
  @Post('events/batch')
  @Throttle({ default: { limit: 100, ttl: 900000 } }) // 100 req/15 min
  @HttpCode(200)
  async ingestEventsBatch(
    @Body() dto: ShoppingAnalyticsEventBatchDto,
    @Request() req,
  ): Promise<ShoppingAnalyticsEventAckDto> {
    const userId = req.user.userId; // ✅ Internal UUID from JWT guard (not Auth0 sub)

    this.logger.log(
      `[Analytics Batch Ingest] user_id=${userId}, event_count=${dto.events.length}, client_id=${dto.client_id}`,
    );

    // Validate batch
    if (dto.events.length === 0) {
      throw new BadRequestException('events array must not be empty');
    }

    if (dto.events.length > 1000) {
      throw new BadRequestException('events array must not exceed 1000 items');
    }

    // Check payload size
    const payloadSize = JSON.stringify(dto).length;
    if (payloadSize > 5 * 1024 * 1024) {
      throw new BadRequestException('batch payload exceeds 5MB limit');
    }

    // Validate each event
    for (const event of dto.events) {
      if (!event.client_event_id) {
        throw new BadRequestException(
          'Each event must have a client_event_id (UUID)',
        );
      }

      if (
        event.canonical_url.includes('?') ||
        event.canonical_url.includes('#')
      ) {
        throw new BadRequestException(
          `Event ${event.client_event_id}: canonical_url contains query params or hash`,
        );
      }
    }

    try {
      const ack = await this.analyticsService.ingestEventsBatch(
        userId,
        dto.events,
      );
      return ack;
    } catch (err) {
      this.logger.error(
        `[Analytics Batch Ingest] Error: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  /**
   * GDPR: Delete all analytics for a user (soft-delete).
   */
  @Post('delete')
  @HttpCode(200)
  async deleteUserAnalytics(@Request() req) {
    const userId = req.user.userId; // ✅ Internal UUID

    const result = await this.analyticsService.deleteUserAnalytics(userId);
    return { deleted_count: result.deleted_count };
  }
}
