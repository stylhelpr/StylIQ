import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsUUID,
  ValidateNested,
  IsBoolean,
  IsIn,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// Bookmark DTOs
export class PriceHistoryDto {
  @IsNumber()
  price: number;

  @IsNumber()
  date: number;
}

export class BookmarkDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  faviconUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  price?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => PriceHistoryDto)
  priceHistory?: PriceHistoryDto[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  sizesViewed?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  colorsViewed?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  viewCount?: number;

  @IsOptional()
  @IsNumber()
  lastViewedAt?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  emotionAtSave?: string; // GOLD #5: mood when saved

  @IsOptional()
  @IsObject()
  bodyMeasurementsAtTime?: Record<string, any>; // GOLD #8: body measurements when viewing

  @IsOptional()
  @IsNumber()
  createdAt?: number;

  @IsOptional()
  @IsNumber()
  updatedAt?: number;
}

// History DTOs
export class HistoryEntryDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dwellTimeSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scrollDepthPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  visitCount?: number;

  @IsOptional()
  @IsNumber()
  visitedAt?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string; // GOLD #3: cross-session tracking

  @IsOptional()
  @IsBoolean()
  isCartPage?: boolean; // GOLD #3b: cart page flag

  @IsOptional()
  @IsObject()
  bodyMeasurementsAtTime?: Record<string, any>; // GOLD #8: body measurements when viewing
}

// Cart Event DTOs
export class CartItemDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;
}

export class CartEventDto {
  @IsString()
  @IsIn(['add', 'remove', 'checkout_start', 'checkout_complete', 'cart_view'])
  type: 'add' | 'remove' | 'checkout_start' | 'checkout_complete' | 'cart_view';

  @IsNumber()
  timestamp: number;

  @IsString()
  @MaxLength(2048)
  cartUrl: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  itemCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cartValue?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items?: CartItemDto[];
}

export class CartHistoryDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(2048)
  cartUrl: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CartEventDto)
  events: CartEventDto[];

  @IsBoolean()
  abandoned: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeToCheckout?: number;

  @IsOptional()
  @IsNumber()
  createdAt?: number;

  @IsOptional()
  @IsNumber()
  updatedAt?: number;
}

// Collection DTOs
export class CollectionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  bookmarkIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  bookmarkUrls?: string[]; // Preferred over bookmarkIds - URLs are consistent between client/server

  @IsOptional()
  @IsNumber()
  createdAt?: number;

  @IsOptional()
  @IsNumber()
  updatedAt?: number;
}

// Browser Tab DTOs
export class BrowserTabDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsString()
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsNumber()
  createdAt?: number;

  @IsOptional()
  @IsNumber()
  updatedAt?: number;
}

// Sync request/response DTOs
export class SyncRequestDto {
  @IsOptional()
  @IsNumber()
  lastSyncTimestamp?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BookmarkDto)
  bookmarks?: BookmarkDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => HistoryEntryDto)
  history?: HistoryEntryDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CollectionDto)
  collections?: CollectionDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CartHistoryDto)
  cartHistory?: CartHistoryDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BrowserTabDto)
  tabs?: BrowserTabDto[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  currentTabId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  deletedBookmarkUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  deletedCollectionIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TimeToActionDto)
  timeToActionEvents?: TimeToActionDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ProductInteractionDto)
  productInteractions?: ProductInteractionDto[];
}

export class SyncResponseDto {
  bookmarks: BookmarkDto[];
  history: HistoryEntryDto[];
  collections: CollectionDto[];
  cartHistory: CartHistoryDto[];
  tabs: BrowserTabDto[];
  currentTabId: string | null;
  serverTimestamp: number;
  limits: {
    maxBookmarks: number;
    maxHistoryDays: number;
    maxCollections: number;
    currentBookmarkCount: number;
    currentCollectionCount: number;
  };
}

export class DeleteBookmarkDto {
  @IsString()
  @MaxLength(2048)
  url: string;
}

// Time-to-Action DTO (GOLD metric persistence)
export class TimeToActionDto {
  // ✅ FIX #3: IDEMPOTENCY - client_event_id for deduplication
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientEventId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;

  @IsString()
  @MaxLength(2048)
  productUrl: string;

  @IsString()
  @IsIn(['bookmark', 'cart'])
  actionType: 'bookmark' | 'cart';

  @IsNumber()
  @Min(0)
  seconds: number;

  @IsNumber()
  timestamp: number;
}

// Product Interaction DTO (GOLD metric persistence)
export class ProductInteractionDto {
  // ✅ FIX #3: IDEMPOTENCY - client_event_id for deduplication
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientEventId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;

  @IsString()
  @MaxLength(2048)
  productUrl: string;

  @IsString()
  @IsIn([
    'view',
    'add_to_cart',
    'bookmark',
    'size_click',
    'color_click',
    'image_long_press',
    'price_check',
    'scroll',
    'share',
  ])
  interactionType:
    | 'view'
    | 'add_to_cart'
    | 'bookmark'
    | 'size_click'
    | 'color_click'
    | 'image_long_press'
    | 'price_check'
    | 'scroll'
    | 'share';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  bodyMeasurementsAtTime?: Record<string, any>;

  @IsNumber()
  timestamp: number;
}
