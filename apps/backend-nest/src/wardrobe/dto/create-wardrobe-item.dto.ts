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
