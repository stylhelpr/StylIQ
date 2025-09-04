export class CreateWardrobeItemDto {
  // Core
  user_id!: string;
  image_url!: string;
  name!: string;
  gsutil_uri?: string;
  object_key?: string;

  ai_title?: string;
  ai_description?: string;
  ai_key_attributes?: string[];
  ai_confidence?: number;

  // Categorization
  main_category!:
    | 'Tops'
    | 'Bottoms'
    | 'Outerwear'
    | 'Shoes'
    | 'Accessories'
    | 'Undergarments'
    | 'Activewear'
    | 'Formalwear'
    | 'Loungewear'
    | 'Sleepwear'
    | 'Swimwear'
    | 'Maternity'
    | 'Unisex'
    | 'Costumes'
    | 'TraditionalWear';
  subcategory?: string;
  tags?: string[];
  style_descriptors?: string[];
  style_archetypes?: (
    | 'Classic'
    | 'Minimal'
    | 'Street'
    | 'Prep'
    | 'Avant-Garde'
  )[];
  anchor_role?: 'Hero' | 'Neutral' | 'Connector';

  // Occasion & Formality
  occasion_tags?: ('Work' | 'DateNight' | 'Travel' | 'Gym')[];
  dress_code?:
    | 'UltraCasual'
    | 'Casual'
    | 'SmartCasual'
    | 'BusinessCasual'
    | 'Business'
    | 'BlackTie';
  formality_score?: number;

  // Color & Palette
  color?: string;
  dominant_hex?: string;
  palette_hex?: string[];
  color_family?:
    | 'Black'
    | 'White'
    | 'Blue'
    | 'Red'
    | 'Green'
    | 'Yellow'
    | 'Brown'
    | 'Gray'
    | 'Navy'
    | 'Beige'
    | 'Purple'
    | 'Orange';
  color_temp?: 'Warm' | 'Cool' | 'Neutral';
  contrast_profile?: 'Low' | 'Medium' | 'High';

  // Material & Construction
  material?: string;
  fabric_blend?: Array<{ material: string; percent: number }>;
  fit?: 'Slim' | 'Regular' | 'Oversized';
  stretch_pct?: number;
  thickness?: number;
  thermal_rating?: number;
  breathability?: number;
  fabric_weight_gsm?: number;
  wrinkle_resistance?: 'Low' | 'Med' | 'High';
  stretch_direction?: '2-way' | '4-way';

  // Pattern
  pattern?:
    | 'Solid'
    | 'Striped'
    | 'Check'
    | 'Herringbone'
    | 'Windowpane'
    | 'Floral'
    | 'Dot'
    | 'Camo'
    | 'Abstract'
    | 'Other';
  pattern_scale?: 'Micro' | 'Medium' | 'Bold';

  // Silhouette & Cut
  neckline?: string;
  collar_type?: string;
  sleeve_length?: string;
  hem_style?: string;
  rise?: string;
  leg?: string;
  inseam_in?: number;
  cuff?: boolean;
  lapel?: string;
  closure?: string;
  length_class?: string;
  shoe_style?: string;
  sole?: string;
  toe_shape?: string;

  // Seasonality & Layering
  seasonality?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'AllSeason';
  seasonality_arr?: string[];
  layering?: 'Base' | 'Mid' | 'Outer';

  // Climate & Conditions
  rain_ok?: boolean;
  wind_ok?: boolean;
  waterproof_rating?: string;
  climate_sweetspot_f_min?: number;
  climate_sweetspot_f_max?: number;

  // Sizing
  size?: string;
  size_label?: string;
  size_system?: 'US' | 'EU' | 'UK';
  measurements?: Record<string, number>;
  width?: number;
  height?: number;

  // Care
  care_symbols?: string[];
  wash_temp_c?: number;
  dry_clean?: boolean;
  iron_ok?: boolean;

  // Usage
  wear_count?: number;
  last_worn_at?: string;
  rotation_priority?: number;

  // Commerce
  brand?: string;
  retailer?: string;
  purchase_date?: string;
  purchase_price?: number;
  country_of_origin?: string;
  condition?: 'New' | 'Like New' | 'Good' | 'Worn' | 'Damaged';
  defects_notes?: string;

  // Pairing & Feedback
  goes_with_ids?: string[];
  avoid_with_ids?: string[];
  user_rating?: number;
  fit_confidence?: number;
  outfit_feedback?: {
    outfit_id: string;
    liked: boolean;
    reason_codes?: string[];
  }[];
  disliked_features?: string[];

  // System
  metadata?: Record<string, any>;
  constraints?: string; // ✅ single string
}

export type UpdateWardrobeItemDto = Partial<CreateWardrobeItemDto>;

////////////////

// //create-wardrobe-item.dto.ts

// import {
//   Seasonality,
//   Layering,
//   Pattern,
//   PatternScale,
//   Thickness,
//   SizeSystem,
//   AnchorRole,
//   DressCode,
//   ColorTemp,
//   ContrastProfile,
//   WrinkleResistance,
//   StretchDirection,
// } from '../../types/wardrobe';

// export class CreateWardrobeItemDto {
//   // 🔑 Core
//   user_id: string;
//   image_url: string;
//   gsutil_uri: string;
//   object_key?: string;
//   name?: string;

//   // Base attributes
//   main_category: string;
//   subcategory?: string;
//   color?: string;
//   material?: string; // canonical (map UI.material or UI.fabricPrimary to this)
//   fit?: string;
//   size?: string;
//   brand?: string;
//   tags?: string[];
//   metadata?: Record<string, any>;
//   width?: number;
//   height?: number;

//   // 🎨 Visual & Styling
//   style_descriptors?: string[];
//   style_archetypes?: string[];
//   anchor_role?: AnchorRole;
//   pattern?: Pattern | string;
//   pattern_scale?: PatternScale;
//   dominant_hex?: string;
//   palette_hex?: string[];
//   color_family?: string;
//   color_temp?: ColorTemp;
//   contrast_profile?: ContrastProfile;

//   // 🎟️ Occasion & Formality
//   occasion_tags?: string[];
//   dress_code?: DressCode;
//   formality_score?: number; // 0–100
//   formality_range_small?: number; // legacy

//   // 🌦️ Weather & Seasonality
//   seasonality?: Seasonality;
//   seasonality_arr?: Seasonality[];
//   layering?: Layering;
//   thermal_rating?: number;
//   breathability?: number;
//   rain_ok?: boolean;
//   wind_ok?: boolean;
//   waterproof_rating?: string;
//   climate_sweetspot_f_min?: number;
//   climate_sweetspot_f_max?: number;

//   // 👖 Fit & Construction
//   stretch_pct?: number;
//   thickness?: Thickness;
//   fabric_primary?: string; // synonym if you need it
//   fabric_blend?: Array<{ material: string; percent: number }>;
//   fabric_weight_gsm?: number;
//   wrinkle_resistance?: WrinkleResistance;
//   stretch_direction?: StretchDirection;

//   // ✂️ Silhouette & Cut
//   neckline?: string;
//   collar_type?: string;
//   sleeve_length?: string;
//   hem_style?: string;
//   rise?: string;
//   leg?: string;
//   inseam_in?: number;
//   cuff?: boolean;
//   lapel?: string;
//   closure?: string;
//   length_class?: string;
//   shoe_style?: string;
//   sole?: string;
//   toe_shape?: string;

//   // 📏 Sizing extras
//   measurements?: Record<string, number>;
//   size_label?: string;
//   size_system?: SizeSystem;

//   // 🤖 AI Metadata
//   ai_title?: string;
//   ai_description?: string;
//   ai_key_attributes?: string[];
//   ai_confidence?: number;

//   // 🔁 Usage & Rotation
//   wear_count?: number;
//   last_worn_at?: string; // ISO8601
//   rotation_priority?: -1 | 0 | 1;

//   // 🧼 Care
//   condition?: string;
//   dry_clean?: boolean;
//   iron_ok?: boolean;
//   wash_temp_c?: number;
//   care_symbols?: string[];
//   defects_notes?: string;

//   // 🛍️ Purchase
//   purchase_date?: string; // ISO8601
//   purchase_price?: number;
//   retailer?: string;
//   country_of_origin?: string;

//   // 🔗 Pairing
//   goes_with_ids?: string[]; // UUID[]
//   avoid_with_ids?: string[]; // UUID[]

//   // 🧠 Feedback
//   user_rating?: number;
//   fit_confidence?: number;
//   outfit_feedback?: {
//     outfit_id: string;
//     liked: boolean;
//     reason_codes?: string[];
//   }[];
//   disliked_features?: string[];

//   // 🚫 Constraints
//   constraints?: string[];
// }

///////////////////

// // Lightweight unions
// export type Seasonality = 'SS' | 'FW' | 'ALL_SEASON';
// export type Layering = 'BASE' | 'MID' | 'SHELL' | 'ACCENT';
// export type Pattern =
//   | 'SOLID'
//   | 'STRIPE'
//   | 'CHECK'
//   | 'HERRINGBONE'
//   | 'WINDOWPANE'
//   | 'FLORAL'
//   | 'DOT'
//   | 'CAMO'
//   | 'ABSTRACT'
//   | 'OTHER';
// export type PatternScale = 'subtle' | 'medium' | 'bold';
// export type Thickness = 'thin' | 'medium' | 'thick';
// export type SizeSystem = 'US' | 'EU' | 'UK' | 'alpha';

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

//   // enrichment fields
//   formality_range_small?: number;
//   seasonality?: Seasonality;
//   layering?: Layering;

//   dominant_hex?: string;
//   palette_hex?: string[];
//   color_family?: string;
//   pattern?: Pattern;
//   pattern_scale?: PatternScale;

//   fabric_primary?: string;
//   fabric_blend?: Array<{ material: string; percent: number }>;
//   stretch_pct?: number;
//   thickness?: Thickness;
//   thermal_rating?: number;
//   breathability?: number;
//   rain_ok?: boolean;
//   wind_ok?: boolean;

//   size_system?: SizeSystem;
//   measurements?: Record<string, number>;

//   care_symbols?: string[];
//   wash_temp_c?: number;
//   dry_clean?: boolean;
//   iron_ok?: boolean;

//   wear_count?: number;
//   last_worn_at?: string; // ISO8601
//   rotation_priority?: -1 | 0 | 1;

//   // 💥 Newly added to match DB columns
//   size_label?: string;
//   seasonality_arr?: Seasonality[];
//   climate_sweetspot_f_min?: number;
//   climate_sweetspot_f_max?: number;
//   constraints?: string[];
//   purchase_date?: string; // ISO8601
//   purchase_price?: number;
//   retailer?: string;
//   country_of_origin?: string;
//   condition?: string;
//   defects_notes?: string;
//   style_descriptors?: string[];
//   ai_title?: string;
//   ai_description?: string;
//   ai_key_attributes?: string[];
//   ai_confidence?: number;
// }

// export class UpdateWardrobeItemDto {
//   // base
//   name?: string;
//   main_category?: string;
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

//   // enrichment
//   formality_range_small?: number;
//   seasonality?: Seasonality;
//   layering?: Layering;

//   dominant_hex?: string;
//   palette_hex?: string[];
//   color_family?: string;
//   pattern?: Pattern;
//   pattern_scale?: PatternScale;

//   fabric_primary?: string;
//   fabric_blend?: Array<{ material: string; percent: number }>;
//   stretch_pct?: number;
//   thickness?: Thickness;
//   thermal_rating?: number;
//   breathability?: number;
//   rain_ok?: boolean;
//   wind_ok?: boolean;

//   size_system?: SizeSystem;
//   measurements?: Record<string, number>;

//   care_symbols?: string[];
//   wash_temp_c?: number;
//   dry_clean?: boolean;
//   iron_ok?: boolean;

//   wear_count?: number;
//   last_worn_at?: string; // ISO8601
//   rotation_priority?: -1 | 0 | 1;

//   // 💥 Newly added to match DB columns
//   size_label?: string;
//   seasonality_arr?: Seasonality[];
//   climate_sweetspot_f_min?: number;
//   climate_sweetspot_f_max?: number;
//   constraints?: string[];
//   purchase_date?: string; // ISO8601
//   purchase_price?: number;
//   retailer?: string;
//   country_of_origin?: string;
//   condition?: string;
//   defects_notes?: string;
//   style_descriptors?: string[];
//   ai_title?: string;
//   ai_description?: string;
//   ai_key_attributes?: string[];
//   ai_confidence?: number;
// }

///////////////////

// // Lightweight unions
// export type Seasonality = 'SS' | 'FW' | 'ALL_SEASON';
// export type Layering = 'BASE' | 'MID' | 'SHELL' | 'ACCENT';
// export type Pattern =
//   | 'SOLID'
//   | 'STRIPE'
//   | 'CHECK'
//   | 'HERRINGBONE'
//   | 'WINDOWPANE'
//   | 'FLORAL'
//   | 'DOT'
//   | 'CAMO'
//   | 'ABSTRACT'
//   | 'OTHER';
// export type PatternScale = 'subtle' | 'medium' | 'bold';
// export type Thickness = 'thin' | 'medium' | 'thick';
// export type SizeSystem = 'US' | 'EU' | 'UK' | 'alpha';

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

//   // enrichment fields
//   formality_range_small?: number;
//   seasonality?: Seasonality;
//   layering?: Layering;

//   dominant_hex?: string;
//   palette_hex?: string[];
//   color_family?: string;
//   pattern?: Pattern;
//   pattern_scale?: PatternScale;

//   fabric_primary?: string;
//   fabric_blend?: Array<{ material: string; percent: number }>;
//   stretch_pct?: number;
//   thickness?: Thickness;
//   thermal_rating?: number;
//   breathability?: number;
//   rain_ok?: boolean;
//   wind_ok?: boolean;

//   size_system?: SizeSystem;
//   measurements?: Record<string, number>;

//   care_symbols?: string[];
//   wash_temp_c?: number;
//   dry_clean?: boolean;
//   iron_ok?: boolean;

//   wear_count?: number;
//   last_worn_at?: string; // ISO8601
//   rotation_priority?: -1 | 0 | 1;
// }

// export class UpdateWardrobeItemDto {
//   // base
//   name?: string;
//   main_category?: string;
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

//   // enrichment
//   formality_range_small?: number;
//   seasonality?: Seasonality;
//   layering?: Layering;

//   dominant_hex?: string;
//   palette_hex?: string[];
//   color_family?: string;
//   pattern?: Pattern;
//   pattern_scale?: PatternScale;

//   fabric_primary?: string;
//   fabric_blend?: Array<{ material: string; percent: number }>;
//   stretch_pct?: number;
//   thickness?: Thickness;
//   thermal_rating?: number;
//   breathability?: number;
//   rain_ok?: boolean;
//   wind_ok?: boolean;

//   size_system?: SizeSystem;
//   measurements?: Record<string, number>;

//   care_symbols?: string[];
//   wash_temp_c?: number;
//   dry_clean?: boolean;
//   iron_ok?: boolean;

//   wear_count?: number;
//   last_worn_at?: string; // ISO8601
//   rotation_priority?: -1 | 0 | 1;
// }

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
