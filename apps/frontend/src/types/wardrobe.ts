export type WardrobeItem = {
  // 🔑 Core
  id: string;
  userId: string;
  name: string;
  image: string; // Maps to `image_url` from backend
  gsutilUri: string;
  mainCategory: string;
  subCategory: string;
  material: string;
  fit: string;
  color: string;
  size: string;
  brand: string;
  tags?: string[];
  notes?: string;
  favorite?: boolean;

  // 🎨 Visual & Styling
  styleDescriptors?: string[];
  pattern?: string;
  patternScale?: string;
  dominantHex?: string;
  paletteHex?: string[];
  colorFamily?: string;

  // 🌦️ Weather & Seasonality
  seasonalityArr?: string[];
  layering?: string;
  thermalRating?: number;
  breathability?: number;
  rainOk?: boolean;
  windOk?: boolean;
  climateSweetspotFMin?: number;
  climateSweetspotFMax?: number;

  // 👖 Fit & Comfort
  stretchPct?: number;
  measurements?: Record<string, number>;
  sizeLabel?: string;
  sizeSystem?: string;

  // 🤖 AI Metadata
  aiDescription?: string;
  aiTitle?: string;
  aiKeyAttributes?: string[];
  aiConfidence?: number;

  // 🔁 Wear Tracking
  wearCount?: number;
  lastWornAt?: string;
  rotationPriority?: number;

  // 🧼 Care Info
  condition?: string;
  dryClean?: boolean;
  ironOk?: boolean;
  washTempC?: number;
  careSymbols?: string[];
  defectsNotes?: string;

  // 🛍️ Purchase Info
  purchaseDate?: string;
  purchasePrice?: number;
  retailer?: string;
  countryOfOrigin?: string;

  // 🚫 Constraints (optional logic)
  constraints?: string[];

  // 📅 Meta
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

///////////////////

// // apps/frontend/src/types/wardrobe.ts

// export type WardrobeItem = {
//   id: string;
//   name: string;
//   image: string;
//   mainCategory: string;
//   subCategory: string;
//   material: string;
//   fit: string;
//   color: string;
//   size: string;
//   brand: string; // ✅ NEW
//   notes: string;
//   tags?: string[];
//   favorite?: boolean;
//   category?: string;
//   occasion?: string;
// };

// export type Outfit = {
//   top?: WardrobeItem;
//   bottom?: WardrobeItem;
//   shoes?: WardrobeItem;
// };

// export type SuggestionParams = {
//   keywords?: string[];
//   weather?: 'hot' | 'cold' | 'rainy' | 'Any';
//   styleTags?: string[];
//   fit?: string;
//   size?: string;
//   occasion?: string;
//   style?: string;
// };
