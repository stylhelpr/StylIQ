import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
  IsISO8601,
  IsUUID,
  Matches,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ShoppingEventType {
  PAGE_VIEW = 'page_view',
  SCROLL_DEPTH = 'scroll_depth',
  BOOKMARK = 'bookmark',
  CART_ADD = 'cart_add',
  CART_REMOVE = 'cart_remove',
  PURCHASE = 'purchase',
  SIZE_CLICK = 'size_click',
  COLOR_CLICK = 'color_click',
  PRICE_CHECK = 'price_check',
}

export class ShoppingAnalyticsEventDto {
  @IsUUID()
  client_event_id: string; // ✅ Client-generated UUID (idempotency key)

  @IsEnum(ShoppingEventType)
  event_type: ShoppingEventType;

  @IsISO8601()
  event_ts: string; // ISO 8601, e.g., "2024-01-15T10:30:45.123Z"

  @IsString()
  @MaxLength(2000)
  @Matches(/^https?:\/\//) // Must start with http:// or https://
  canonical_url: string; // ✅ NO query params, NO hash (validated)

  @IsString()
  @MaxLength(255)
  domain: string; // Extracted from canonical_url

  @IsString()
  @IsOptional()
  @MaxLength(200)
  title_sanitized?: string; // HTML-stripped, max 200 chars

  @IsString()
  @IsOptional()
  @MaxLength(100)
  session_id?: string; // Client session ID

  @IsObject()
  payload: Record<string, any>; // Event-specific fields

  // Validator: reject if URL contains query params
  constructor() {
    this.validateCanonicalUrl();
  }

  private validateCanonicalUrl() {
    if (
      this.canonical_url?.includes('?') ||
      this.canonical_url?.includes('#')
    ) {
      throw new Error('canonical_url must not contain query params or hash');
    }
  }
}

export class ShoppingAnalyticsEventBatchDto {
  @ValidateNested({ each: true })
  @Type(() => ShoppingAnalyticsEventDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(1000) // Max 1000 events per batch
  events: ShoppingAnalyticsEventDto[];

  @IsString()
  @MaxLength(255)
  client_id: string; // Device ID / session UUID (for rate limiting, not auth)

  @IsNumber()
  @IsOptional()
  client_batch_timestamp_ms?: number; // When batch sent (client time)
}

export class ShoppingAnalyticsEventAckDto {
  accepted_client_event_ids: string[]; // ✅ client_event_ids that were accepted
  duplicate_count: number; // Events rejected due to idempotency conflict
  rejected: Array<{
    client_event_id: string;
    reason: string;
  }>; // Events that failed validation
  server_timestamp_ms: number; // For clock sync
  skipped_reason?: string; // If set, batch was skipped (e.g., 'no_consent')
}
