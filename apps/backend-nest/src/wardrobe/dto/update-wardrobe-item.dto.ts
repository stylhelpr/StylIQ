import { CreateWardrobeItemDto } from './create-wardrobe-item.dto';

// Hotfix: make Update = Partial<Create>
export type UpdateWardrobeItemDto = Partial<CreateWardrobeItemDto>;

/////////////

// // apps/backend-nest/src/wardrobe/dto/update-wardrobe-item.dto.ts
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

// export class UpdateWardrobeItemDto {
//   name?: string;
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

//   style_descriptors?: string[];
//   style_archetypes?: string[];
//   anchor_role?: AnchorRole;
//   pattern?: Pattern;
//   pattern_scale?: PatternScale;
//   dominant_hex?: string;
//   palette_hex?: string[];
//   color_family?: string;
//   color_temp?: ColorTemp;
//   contrast_profile?: ContrastProfile;

//   occasion_tags?: string[];
//   dress_code?: DressCode;
//   formality_score?: number;
//   formality_range_small?: number;

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

//   fabric_primary?: string;
//   fabric_blend?: Array<{ material: string; percent: number }>;
//   stretch_pct?: number;
//   thickness?: Thickness;
//   size_system?: SizeSystem;
//   size_label?: string;
//   measurements?: Record<string, number>;

//   care_symbols?: string[];
//   wash_temp_c?: number;
//   dry_clean?: boolean;
//   iron_ok?: boolean;

//   wear_count?: number;
//   last_worn_at?: string;
//   rotation_priority?: number;

//   purchase_date?: string;
//   purchase_price?: number;
//   retailer?: string;
//   country_of_origin?: string;

//   goes_with_ids?: string[];
//   avoid_with_ids?: string[];
//   user_rating?: number;
//   fit_confidence?: number;
//   outfit_feedback?: any[];
//   disliked_features?: string[];

//   ai_title?: string;
//   ai_description?: string;
//   ai_key_attributes?: string[];
//   ai_confidence?: number;

//   constraints?: string[];
// }

/////////////

// // update-wardrobe-item.dto.ts
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

// export class UpdateWardrobeItemDto {
//   // 🔑 Core
//   name?: string;
//   main_category?: string;
//   subcategory?: string;
//   color?: string;
//   material?: string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   tags?: string[];
//   metadata?: Record<string, any>;
//   width?: number;
//   height?: number;
//   image_url?: string;
//   gsutil_uri?: string;
//   object_key?: string;

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
//   formality_range_small?: number; // legacy knob

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
//   fabric_primary?: string;
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
//   goes_with_ids?: string[];
//   avoid_with_ids?: string[];

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

////////////

// export class UpdateWardrobeItemDto {
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
//   gsutil_uri?: string; // 👈 added
// }

///////////

// export class UpdateWardrobeItemDto {
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
//   gsutil_uri?: string; // 👈 add this
// }
