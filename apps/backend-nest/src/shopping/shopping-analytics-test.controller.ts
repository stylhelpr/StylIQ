import {
  Controller,
  Post,
  Body,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ShoppingAnalyticsService } from './shopping-analytics.service';
import {
  ShoppingAnalyticsEventBatchDto,
  ShoppingAnalyticsEventAckDto,
} from './dto/shopping-analytics.dto';

/**
 * TEST CONTROLLER: No authentication required.
 * Uses hardcoded test user for development/testing only.
 */
@Controller('shopping/analytics/test')
export class ShoppingAnalyticsTestController {
  private logger = new Logger(ShoppingAnalyticsTestController.name);

  constructor(private analyticsService: ShoppingAnalyticsService) {}

  @Post('events/batch')
  @HttpCode(200)
  async ingestEventsBatchTest(
    @Body() dto: ShoppingAnalyticsEventBatchDto,
  ): Promise<ShoppingAnalyticsEventAckDto> {
    // Hardcoded test user
    const userId = '2e7b4297-72e4-4152-90bb-f00432c88ab7';

    this.logger.log(
      `[Analytics Test] user_id=${userId}, event_count=${dto.events.length}`,
    );

    if (dto.events.length === 0) {
      throw new BadRequestException('events array must not be empty');
    }

    if (dto.events.length > 1000) {
      throw new BadRequestException('events array must not exceed 1000 items');
    }

    const payloadSize = JSON.stringify(dto).length;
    if (payloadSize > 5 * 1024 * 1024) {
      throw new BadRequestException('batch payload exceeds 5MB limit');
    }

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
        `[Analytics Test] Error: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}
