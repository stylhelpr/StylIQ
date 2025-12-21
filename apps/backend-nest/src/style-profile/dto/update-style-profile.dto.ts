export class UpdateStyleProfileDto {
  // Appearance
  body_type?: string;
  skin_tone?: string;
  undertone?: string;
  hair_color?: string;
  eye_color?: string;
  proportions?: string;

  // Climate
  climate?: string;

  // Measurements
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  shoulder_width?: number;
  inseam?: number;
  shoe_size?: number;
  all_measurements?: Record<string, number>;

  // Preferences (arrays)
  favorite_colors?: string[];
  color_preferences?: string[];
  disliked_styles?: string[];
  style_keywords?: string[];
  style_preferences?: string[];
  fit_preferences?: string[];
  preferred_brands?: string[];
  daily_activities?: string[];
  shopping_habits?: string[];
  personality_traits?: string[];
  fabric_preferences?: string[];
  occasions?: string[];
  style_icons?: string[];

  // Budget & Fashion
  budget_level?: number; // deprecated, kept for backward compatibility
  budget_min?: number;
  budget_max?: number;
  fashion_confidence?: string;
  fashion_boldness?: string;
  trend_appetite?: string;

  // Goals & Notes
  goals?: string;
  lifestyle_notes?: string;

  // Unit preference
  unit_preference?: string;

  // Flexible JSONB for sizes, clothing types, etc.
  prefs_jsonb?: Record<string, any>;

  // Profile completion
  is_style_profile_complete?: boolean;
}
