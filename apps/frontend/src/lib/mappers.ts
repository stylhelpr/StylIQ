import {WardrobeItem} from '../types/wardrobe';

export function mapApiWardrobeItem(apiItem: any): WardrobeItem {
  return {
    id: apiItem.id,
    name: apiItem.name,
    image: apiItem.image_url,
    mainCategory: apiItem.main_category,
    subCategory: apiItem.subcategory,
    material: apiItem.material,
    fit: apiItem.fit,
    color: apiItem.color,
    size: apiItem.size,
    brand: apiItem.brand ?? '',
    notes: apiItem.metadata?.notes ?? '',
    tags: apiItem.tags ?? [],
    favorite: apiItem.favorite ?? false,
    category: apiItem.category ?? apiItem.main_category, // fallback
    occasion: apiItem.occasion ?? '',
  };
}
