// apps/frontend/src/types/wardrobe.ts

export type WardrobeItem = {
  id: string;
  name: string;
  image: string;
  mainCategory: string;
  subCategory: string;
  material: string;
  fit: string;
  color: string;
  size: string;
  notes: string;
  tags?: string[];
  favorite?: boolean;
  category?: string;
  occasion?: string;
};

export type Outfit = {
  top?: WardrobeItem;
  bottom?: WardrobeItem;
  shoes?: WardrobeItem;
};

export type SuggestionParams = {
  keywords?: string[];
  weather?: 'hot' | 'cold' | 'rainy' | 'Any';
  styleTags?: string[];
  fit?: string;
  size?: string;
  occasion?: string;
  style?: string;
};
