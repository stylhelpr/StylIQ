import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  FORMALITY_FLOOR_VALUES,
  WALKABILITY_REQUIREMENT_VALUES,
  SILHOUETTE_PREFERENCE_VALUES,
  CARE_TOLERANCE_VALUES,
  METAL_PREFERENCE_VALUES,
  CONTRAST_PREFERENCE_VALUES,
  FOOTWEAR_COMFORT_VALUES,
  FOOT_WIDTH_VALUES,
  TREND_APPETITE_VALUES,
} from '../style-profile.constants';

export class UpdateStyleProfileDto {
  // Appearance
  @IsOptional()
  @IsString()
  body_type?: string;

  @IsOptional()
  @IsString()
  skin_tone?: string;

  @IsOptional()
  @IsString()
  undertone?: string;

  @IsOptional()
  @IsString()
  hair_color?: string;

  @IsOptional()
  @IsString()
  eye_color?: string;

  @IsOptional()
  @IsString()
  proportions?: string;

  // Climate
  @IsOptional()
  @IsString()
  climate?: string;

  // Measurements - use @Type to transform strings to numbers
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  chest?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  waist?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shoulder_width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  inseam?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shoe_size?: number;

  @IsOptional()
  @IsObject()
  all_measurements?: Record<string, number>;

  // Preferences (arrays)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favorite_colors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  color_preferences?: string[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @IsString({ each: true })
  disliked_styles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  style_keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  style_preferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fit_preferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferred_brands?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  daily_activities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shopping_habits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  personality_traits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fabric_preferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  occasions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  style_icons?: string[];

  // Budget & Fashion - use @Type to transform strings to numbers
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget_level?: number; // deprecated, kept for backward compatibility

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget_min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget_max?: number;

  @IsOptional()
  @IsString()
  fashion_confidence?: string;

  @IsOptional()
  @IsString()
  fashion_boldness?: string;

  @IsOptional()
  @IsString()
  @IsIn(TREND_APPETITE_VALUES)
  trend_appetite?: string;

  // Goals & Notes
  @IsOptional()
  @IsString()
  goals?: string;

  @IsOptional()
  @IsString()
  lifestyle_notes?: string;

  // Unit preference
  @IsOptional()
  @IsString()
  unit_preference?: string;

  // Flexible JSONB for sizes, clothing types, etc.
  @IsOptional()
  @IsObject()
  prefs_jsonb?: Record<string, any>;

  // Profile completion
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_style_profile_complete?: boolean;

  // ── P0: Hard constraints ──

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverage_no_go?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoid_colors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoid_materials?: string[];

  @IsOptional()
  @IsString()
  @IsIn(FORMALITY_FLOOR_VALUES)
  formality_floor?: string;

  @IsOptional()
  @IsString()
  @IsIn(WALKABILITY_REQUIREMENT_VALUES)
  walkability_requirement?: string;

  // ── P1: Preference granularity ──

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pattern_preferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoid_patterns?: string[];

  @IsOptional()
  @IsString()
  @IsIn(SILHOUETTE_PREFERENCE_VALUES)
  silhouette_preference?: string;

  @IsOptional()
  @IsString()
  @IsIn(CARE_TOLERANCE_VALUES)
  care_tolerance?: string;

  @IsOptional()
  @IsString()
  @IsIn(METAL_PREFERENCE_VALUES)
  metal_preference?: string;

  @IsOptional()
  @IsString()
  @IsIn(CONTRAST_PREFERENCE_VALUES)
  contrast_preference?: string;

  @IsOptional()
  @IsString()
  @IsIn(FOOTWEAR_COMFORT_VALUES)
  footwear_comfort?: string;

  @IsOptional()
  @IsString()
  @IsIn(FOOT_WIDTH_VALUES)
  foot_width?: string;
}
