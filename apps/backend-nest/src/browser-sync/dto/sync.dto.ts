import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsUUID,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
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
  @ArrayMaxSize(200)
  @IsString({ each: true })
  deletedBookmarkUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  deletedCollectionIds?: string[];
}

export class SyncResponseDto {
  bookmarks: BookmarkDto[];
  history: HistoryEntryDto[];
  collections: CollectionDto[];
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
