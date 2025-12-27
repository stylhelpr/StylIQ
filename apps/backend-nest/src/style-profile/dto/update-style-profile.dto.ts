import { IsString, IsOptional, IsNumber, IsArray, IsObject, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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
}
