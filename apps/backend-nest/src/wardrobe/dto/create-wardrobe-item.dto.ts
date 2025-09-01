// apps/backend-nest/src/wardrobe/dto/create-wardrobe-item.dto.ts
export class CreateWardrobeItemDto {
  user_id: string;
  image_url: string;
  gsutil_uri: string;
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
  tags?: string[];
}

///////////////

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
// }
