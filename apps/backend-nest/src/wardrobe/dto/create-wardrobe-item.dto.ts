// Lightweight unions
export type Seasonality = 'SS' | 'FW' | 'ALL_SEASON';
export type Layering = 'BASE' | 'MID' | 'SHELL' | 'ACCENT';
export type Pattern =
  | 'SOLID'
  | 'STRIPE'
  | 'CHECK'
  | 'HERRINGBONE'
  | 'WINDOWPANE'
  | 'FLORAL'
  | 'DOT'
  | 'CAMO'
  | 'ABSTRACT'
  | 'OTHER';
export type PatternScale = 'subtle' | 'medium' | 'bold';
export type Thickness = 'thin' | 'medium' | 'thick';
export type SizeSystem = 'US' | 'EU' | 'UK' | 'alpha';

export class CreateWardrobeItemDto {
  user_id: string;
  image_url: string;
  gsutil_uri: string;
  name?: string;
  main_category: string;
  subcategory?: string;
  color?: string;
  material?: string;
  fit?: string;
  size?: string;
  brand?: string;
  metadata?: Record<string, any>;
  width?: number;
  height?: number;
  tags?: string[];

  // enrichment fields
  formality_range_small?: number;
  seasonality?: Seasonality;
  layering?: Layering;

  dominant_hex?: string;
  palette_hex?: string[];
  color_family?: string;
  pattern?: Pattern;
  pattern_scale?: PatternScale;

  fabric_primary?: string;
  fabric_blend?: Array<{ material: string; percent: number }>;
  stretch_pct?: number;
  thickness?: Thickness;
  thermal_rating?: number;
  breathability?: number;
  rain_ok?: boolean;
  wind_ok?: boolean;

  size_system?: SizeSystem;
  measurements?: Record<string, number>;

  care_symbols?: string[];
  wash_temp_c?: number;
  dry_clean?: boolean;
  iron_ok?: boolean;

  wear_count?: number;
  last_worn_at?: string; // ISO8601
  rotation_priority?: -1 | 0 | 1;
}

export class UpdateWardrobeItemDto {
  // base
  name?: string;
  main_category?: string;
  subcategory?: string;
  color?: string;
  material?: string;
  fit?: string;
  size?: string;
  brand?: string;
  metadata?: Record<string, any>;
  width?: number;
  height?: number;
  tags?: string[];

  // enrichment
  formality_range_small?: number;
  seasonality?: Seasonality;
  layering?: Layering;

  dominant_hex?: string;
  palette_hex?: string[];
  color_family?: string;
  pattern?: Pattern;
  pattern_scale?: PatternScale;

  fabric_primary?: string;
  fabric_blend?: Array<{ material: string; percent: number }>;
  stretch_pct?: number;
  thickness?: Thickness;
  thermal_rating?: number;
  breathability?: number;
  rain_ok?: boolean;
  wind_ok?: boolean;

  size_system?: SizeSystem;
  measurements?: Record<string, number>;

  care_symbols?: string[];
  wash_temp_c?: number;
  dry_clean?: boolean;
  iron_ok?: boolean;

  wear_count?: number;
  last_worn_at?: string; // ISO8601
  rotation_priority?: -1 | 0 | 1;
}

//////////////////

// // apps/backend-nest/src/wardrobe/dto/create-wardrobe-item.dto.ts
// export class CreateWardrobeItemDto {
//   user_id: string;
//   image_url: string;
//   gsutil_uri: string;
//   name?: string;
//   main_category: string;
//   subcategory?: string;
//   color?: string;
//   material?: string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   metadata?: Record<string, any>;
//   width?: number;
//   height?: number;
//   tags?: string[];
// }
