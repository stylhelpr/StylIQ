import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class TrackItemDto {
  @IsString()
  url: string;

  @IsString()
  title: string;

  @IsNumber()
  currentPrice: number;

  @IsOptional()
  @IsNumber()
  targetPrice?: number; // Alert when price drops below this

  @IsOptional()
  @IsString()
  brand?: string;

  @IsString()
  source: string; // e.g., 'ASOS', 'Zara'
}

export class UpdatePriceAlertDto {
  @IsOptional()
  @IsNumber()
  targetPrice?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdatePriceDto {
  @IsNumber()
  price: number; // User manually enters current price they see
}
