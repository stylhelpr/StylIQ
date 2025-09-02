export class UpdateWardrobeItemDto {
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
  gsutil_uri?: string; // 👈 add this
}
