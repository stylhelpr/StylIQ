export class TrackItemDto {
  url: string;
  title: string;
  currentPrice: number;
  targetPrice?: number; // Alert when price drops below this
  brand?: string;
  source: string; // e.g., 'ASOS', 'Zara'
}

export class UpdatePriceAlertDto {
  targetPrice?: number;
  enabled?: boolean;
}

export class UpdatePriceDto {
  price: number; // User manually enters current price they see
}
