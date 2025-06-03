export class CreateWardrobeItemDto {
  user_id: string;
  image_url: string;
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
}
