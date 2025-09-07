export class UpdateStyleProfileDto {
  body_type?: string;
  skin_tone?: string;
  undertone?: string;
  climate?: string;
  favorite_colors?: string[];
  disliked_styles?: string[];
  style_keywords?: string[];
  budget_level?: string;
  preferred_brands?: string[];
  daily_activities?: string[];
  goals?: string; // ✅ FIXED HERE
}
