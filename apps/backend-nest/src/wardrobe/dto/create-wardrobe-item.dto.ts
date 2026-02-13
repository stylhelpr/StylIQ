import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Nested DTO for fabric blend
class FabricBlendDto {
  @IsString()
  material: string;

  @IsNumber()
  percent: number;
}

// Nested DTO for outfit feedback
class OutfitFeedbackItemDto {
  @IsString()
  outfit_id: string;

  @IsBoolean()
  liked: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reason_codes?: string[];
}

export class CreateWardrobeItemDto {
  // Core
  @IsString()
  user_id!: string;

  @IsString()
  image_url!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  gsutil_uri?: string;

  @IsOptional()
  @IsString()
  object_key?: string;

  @IsOptional()
  @IsString()
  processed_image_url?: string;

  @IsOptional()
  @IsString()
  processed_gsutil_uri?: string;

  @IsOptional()
  @IsString()
  ai_title?: string;

  @IsOptional()
  @IsString()
  ai_description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ai_key_attributes?: string[];

  @IsOptional()
  @IsNumber()
  ai_confidence?: number;

  // Categorization
  @IsIn([
    'Tops',
    'Bottoms',
    'Outerwear',
    'Shoes',
    'Accessories',
    'Undergarments',
    'Activewear',
    'Formalwear',
    'Loungewear',
    'Sleepwear',
    'Swimwear',
    'Maternity',
    'Unisex',
    'Costumes',
    'TraditionalWear',
    'Dresses',
    'Skirts',
    'Bags',
    'Headwear',
    'Jewelry',
    'Other',
  ])
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
    | 'TraditionalWear'
    | 'Dresses'
    | 'Skirts'
    | 'Bags'
    | 'Headwear'
    | 'Jewelry'
    | 'Other';

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  style_descriptors?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(['Classic', 'Minimal', 'Street', 'Prep', 'Avant-Garde'], { each: true })
  style_archetypes?: (
    | 'Classic'
    | 'Minimal'
    | 'Street'
    | 'Prep'
    | 'Avant-Garde'
  )[];

  @IsOptional()
  @IsIn(['Hero', 'Neutral', 'Connector'])
  anchor_role?: 'Hero' | 'Neutral' | 'Connector';

  // Occasion & Formality
  @IsOptional()
  @IsArray()
  @IsIn(['Work', 'DateNight', 'Travel', 'Gym'], { each: true })
  occasion_tags?: ('Work' | 'DateNight' | 'Travel' | 'Gym')[];

  @IsOptional()
  @IsIn([
    'UltraCasual',
    'Casual',
    'SmartCasual',
    'BusinessCasual',
    'Business',
    'BlackTie',
  ])
  dress_code?:
    | 'UltraCasual'
    | 'Casual'
    | 'SmartCasual'
    | 'BusinessCasual'
    | 'Business'
    | 'BlackTie';

  @IsOptional()
  @IsNumber()
  formality_score?: number;

  // Color & Palette
  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  dominant_hex?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  palette_hex?: string[];

  @IsOptional()
  @IsIn([
    'Black',
    'White',
    'Blue',
    'Red',
    'Green',
    'Yellow',
    'Brown',
    'Gray',
    'Navy',
    'Beige',
    'Purple',
    'Orange',
  ])
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

  @IsOptional()
  @IsIn(['Warm', 'Cool', 'Neutral'])
  color_temp?: 'Warm' | 'Cool' | 'Neutral';

  @IsOptional()
  @IsIn(['Low', 'Medium', 'High'])
  contrast_profile?: 'Low' | 'Medium' | 'High';

  // Material & Construction
  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FabricBlendDto)
  fabric_blend?: Array<{ material: string; percent: number }>;

  @IsOptional()
  @IsIn(['Slim', 'Regular', 'Oversized'])
  fit?: 'Slim' | 'Regular' | 'Oversized';

  @IsOptional()
  @IsNumber()
  stretch_pct?: number;

  @IsOptional()
  @IsNumber()
  thickness?: number;

  @IsOptional()
  @IsNumber()
  thermal_rating?: number;

  @IsOptional()
  @IsNumber()
  breathability?: number;

  @IsOptional()
  @IsNumber()
  fabric_weight_gsm?: number;

  @IsOptional()
  @IsIn(['Low', 'Med', 'High'])
  wrinkle_resistance?: 'Low' | 'Med' | 'High';

  @IsOptional()
  @IsIn(['2-way', '4-way'])
  stretch_direction?: '2-way' | '4-way';

  // Pattern
  @IsOptional()
  @IsIn([
    'Solid',
    'Striped',
    'Check',
    'Herringbone',
    'Windowpane',
    'Floral',
    'Dot',
    'Camo',
    'Abstract',
    'Other',
  ])
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

  @IsOptional()
  @IsIn(['Micro', 'Medium', 'Bold'])
  pattern_scale?: 'Micro' | 'Medium' | 'Bold';

  // Silhouette & Cut
  @IsOptional()
  @IsString()
  neckline?: string;

  @IsOptional()
  @IsString()
  collar_type?: string;

  @IsOptional()
  @IsString()
  sleeve_length?: string;

  @IsOptional()
  @IsString()
  hem_style?: string;

  @IsOptional()
  @IsString()
  rise?: string;

  @IsOptional()
  @IsString()
  leg?: string;

  @IsOptional()
  @IsNumber()
  inseam_in?: number;

  @IsOptional()
  @IsBoolean()
  cuff?: boolean;

  @IsOptional()
  @IsString()
  lapel?: string;

  @IsOptional()
  @IsString()
  closure?: string;

  @IsOptional()
  @IsString()
  length_class?: string;

  @IsOptional()
  @IsString()
  shoe_style?: string;

  @IsOptional()
  @IsString()
  sole?: string;

  @IsOptional()
  @IsString()
  toe_shape?: string;

  // Seasonality & Layering
  @IsOptional()
  @IsIn(['Spring', 'Summer', 'Fall', 'Winter', 'AllSeason'])
  seasonality?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'AllSeason';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seasonality_arr?: string[];

  @IsOptional()
  @IsIn(['Base', 'Mid', 'Outer'])
  layering?: 'Base' | 'Mid' | 'Outer';

  // Climate & Conditions
  @IsOptional()
  @IsBoolean()
  rain_ok?: boolean;

  @IsOptional()
  @IsBoolean()
  wind_ok?: boolean;

  @IsOptional()
  @IsString()
  waterproof_rating?: string;

  @IsOptional()
  @IsNumber()
  climate_sweetspot_f_min?: number;

  @IsOptional()
  @IsNumber()
  climate_sweetspot_f_max?: number;

  // Sizing
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  size_label?: string;

  @IsOptional()
  @IsIn(['US', 'EU', 'UK'])
  size_system?: 'US' | 'EU' | 'UK';

  @IsOptional()
  @IsObject()
  measurements?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  // Care
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  care_symbols?: string[];

  @IsOptional()
  @IsNumber()
  wash_temp_c?: number;

  @IsOptional()
  @IsBoolean()
  dry_clean?: boolean;

  @IsOptional()
  @IsBoolean()
  iron_ok?: boolean;

  // Usage
  @IsOptional()
  @IsNumber()
  wear_count?: number;

  @IsOptional()
  @IsString()
  last_worn_at?: string;

  @IsOptional()
  @IsNumber()
  rotation_priority?: number;

  // Commerce
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  retailer?: string;

  @IsOptional()
  @IsString()
  purchase_date?: string;

  @IsOptional()
  @IsNumber()
  purchase_price?: number;

  @IsOptional()
  @IsString()
  country_of_origin?: string;

  @IsOptional()
  @IsIn(['New', 'Like New', 'Good', 'Worn', 'Damaged'])
  condition?: 'New' | 'Like New' | 'Good' | 'Worn' | 'Damaged';

  @IsOptional()
  @IsString()
  defects_notes?: string;

  // Pairing & Feedback
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goes_with_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoid_with_ids?: string[];

  @IsOptional()
  @IsNumber()
  user_rating?: number;

  @IsOptional()
  @IsNumber()
  fit_confidence?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutfitFeedbackItemDto)
  outfit_feedback?: {
    outfit_id: string;
    liked: boolean;
    reason_codes?: string[];
  }[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disliked_features?: string[];

  // Location
  @IsOptional()
  @IsString()
  location_id?: string;

  // System
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  constraints?: string; // ✅ single string
}

export type UpdateWardrobeItemDto = Partial<CreateWardrobeItemDto>;
