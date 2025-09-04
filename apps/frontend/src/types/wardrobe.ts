export type WardrobeItem = {
  // Core
  id: string;
  userId: string;
  image: string; // ↔ image_url
  name: string;
  gsutilUri?: string; // ↔ gsutil_uri
  objectKey?: string; // ↔ object_key

  aiTitle?: string; // ↔ ai_title
  aiDescription?: string; // ↔ ai_description
  aiKeyAttributes?: string[]; // ↔ ai_key_attributes
  aiConfidence?: number; // ↔ ai_confidence

  // Categorization
  mainCategory:
    | 'Tops'
    | 'Bottoms'
    | 'Outerwear'
    | 'Shoes'
    | 'Accessories'
    | 'Undergarments'
    | 'Activewear'
    | 'Formalwear'
    | 'Loungewear'
    | 'Sleepwear'
    | 'Swimwear'
    | 'Maternity'
    | 'Unisex'
    | 'Costumes'
    | 'TraditionalWear';
  subCategory?: string;
  tags?: string[];
  styleDescriptors?: string[];
  styleArchetypes?: (
    | 'Classic'
    | 'Minimal'
    | 'Street'
    | 'Prep'
    | 'Avant-Garde'
  )[];
  anchorRole?: 'Hero' | 'Neutral' | 'Connector';

  // Occasion & Formality
  occasionTags?: ('Work' | 'DateNight' | 'Travel' | 'Gym')[];
  dressCode?:
    | 'UltraCasual'
    | 'Casual'
    | 'SmartCasual'
    | 'BusinessCasual'
    | 'Business'
    | 'BlackTie';
  formalityScore?: number; // 0–100

  // Color & Palette
  color?: string;
  dominantHex?: string;
  paletteHex?: string[];
  colorFamily?:
    | 'Black'
    | 'White'
    | 'Blue'
    | 'Red'
    | 'Green'
    | 'Yellow'
    | 'Brown'
    | 'Gray'
    | 'Navy'
    | 'Beige'
    | 'Purple'
    | 'Orange';
  colorTemp?: 'Warm' | 'Cool' | 'Neutral';
  contrastProfile?: 'Low' | 'Medium' | 'High';

  // Material & Construction
  material?: string;
  fabricBlend?: Array<{material: string; percent: number}>;
  fit?: 'Slim' | 'Regular' | 'Oversized';
  stretchPct?: number;
  thickness?: number;
  thermalRating?: number;
  breathability?: number;
  fabricWeightGsm?: number;
  wrinkleResistance?: 'Low' | 'Med' | 'High';
  stretchDirection?: '2-way' | '4-way';

  // Pattern
  pattern?:
    | 'Solid'
    | 'Striped'
    | 'Check'
    | 'Herringbone'
    | 'Windowpane'
    | 'Floral'
    | 'Dot'
    | 'Camo'
    | 'Abstract'
    | 'Other';
  patternScale?: 'Micro' | 'Medium' | 'Bold';

  // Silhouette & Cut
  neckline?: string;
  collarType?: string;
  sleeveLength?: string;
  hemStyle?: string;
  rise?: string;
  leg?: string;
  inseamIn?: number;
  cuff?: boolean;
  lapel?: string;
  closure?: string;
  lengthClass?: string;
  shoeStyle?: string;
  sole?: string;
  toeShape?: string;

  // Seasonality & Layering
  seasonality?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'AllSeason';
  seasonalityArr?: string[];
  layering?: 'Base' | 'Mid' | 'Outer';

  // Climate & Conditions
  rainOk?: boolean;
  windOk?: boolean;
  waterproofRating?: string;
  climateSweetspotFMin?: number;
  climateSweetspotFMax?: number;

  // Sizing
  size?: string;
  sizeLabel?: string;
  sizeSystem?: 'US' | 'EU' | 'UK';
  measurements?: Record<string, number>;
  width?: number;
  height?: number;

  // Care
  careSymbols?: string[];
  washTempC?: number;
  dryClean?: boolean;
  ironOk?: boolean;

  // Usage
  wearCount?: number;
  lastWornAt?: string | null;
  rotationPriority?: number;

  // Commerce
  brand?: string;
  retailer?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  countryOfOrigin?: string;
  condition?: 'New' | 'Like New' | 'Good' | 'Worn' | 'Damaged';
  defectsNotes?: string;

  // Pairing & Feedback
  goesWithIds?: string[];
  avoidWithIds?: string[];
  userRating?: number;
  fitConfidence?: number;
  outfitFeedback?: {outfitId: string; liked: boolean; reasonCodes?: string[]}[];
  dislikedFeatures?: string[];

  // System
  metadata?: Record<string, any>;
  constraints?: string; // ✅ single string
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

/////////////

// // UI-facing model used across React Native screens
// // wardrobe.ts  types
// export type WardrobeItem = {
//   // 🔑 Core
//   id: string;
//   userId: string;
//   name: string;
//   image: string; // ↔ image_url
//   gsutilUri: string; // ↔ gsutil_uri
//   objectKey?: string; // ↔ object_key

//   mainCategory: string; // ↔ main_category
//   subCategory?: string; // ↔ subcategory
//   material?: string;
//   fit?: string;
//   color?: string;
//   size?: string;
//   brand?: string;
//   tags?: string[];
//   notes?: string;
//   favorite?: boolean;

//   // 🎨 Visual & Styling
//   styleDescriptors?: string[]; // ↔ style_descriptors
//   styleArchetypes?: string[]; // ↔ style_archetypes
//   anchorRole?: 'Hero' | 'Neutral' | 'Connector';

//   pattern?: string;
//   patternScale?: 'subtle' | 'medium' | 'bold'; // ↔ pattern_scale
//   dominantHex?: string;
//   paletteHex?: string[];
//   colorFamily?: string;
//   colorTemp?: 'Warm' | 'Cool' | 'Neutral';
//   contrastProfile?: 'Low' | 'Medium' | 'High';

//   // 🎟️ Occasion & Formality
//   occasionTags?: string[];
//   dressCode?:
//     | 'UltraCasual'
//     | 'Casual'
//     | 'SmartCasual'
//     | 'BusinessCasual'
//     | 'Business'
//     | 'BlackTie';
//   formalityScore?: number; // 0–100
//   formalityRangeSmall?: number; // legacy knob (keep)

//   // 🌦️ Weather & Seasonality
//   seasonality?: 'SS' | 'FW' | 'ALL_SEASON';
//   seasonalityArr?: Array<'SS' | 'FW' | 'ALL_SEASON'>;
//   layering?: 'BASE' | 'MID' | 'SHELL' | 'ACCENT';
//   thermalRating?: number;
//   breathability?: number;
//   rainOk?: boolean;
//   windOk?: boolean;
//   waterproofRating?: string;
//   climateSweetspotFMin?: number;
//   climateSweetspotFMax?: number;

//   // 👖 Fit & Construction
//   stretchPct?: number;
//   thickness?: 'thin' | 'medium' | 'thick';
//   fabricPrimary?: string;
//   fabricBlend?: Array<{material: string; percent: number}>;
//   fabricWeightGsm?: number;
//   wrinkleResistance?: 'Low' | 'Med' | 'High';
//   stretchDirection?: '2-way' | '4-way';

//   // ✂️ Silhouette & Cut (all optional)
//   neckline?: string;
//   collarType?: string;
//   sleeveLength?: string;
//   hemStyle?: string;
//   rise?: string;
//   leg?: string;
//   inseamIn?: number;
//   cuff?: boolean;
//   lapel?: string;
//   closure?: string;
//   lengthClass?: string;
//   shoeStyle?: string;
//   sole?: string;
//   toeShape?: string;

//   // 📏 Sizing extras
//   measurements?: Record<string, number>;
//   sizeLabel?: string;
//   sizeSystem?: 'US' | 'EU' | 'UK' | 'alpha';

//   // 🤖 AI Metadata
//   aiDescription?: string;
//   aiTitle?: string;
//   aiKeyAttributes?: string[];
//   aiConfidence?: number;

//   // 🔁 Wear Tracking
//   wearCount?: number;
//   lastWornAt?: string; // ISO
//   rotationPriority?: -1 | 0 | 1;

//   // 🧼 Care
//   condition?: string;
//   dryClean?: boolean;
//   ironOk?: boolean;
//   washTempC?: number;
//   careSymbols?: string[];
//   defectsNotes?: string;

//   // 🛍️ Purchase
//   purchaseDate?: string; // ISO
//   purchasePrice?: number;
//   retailer?: string;
//   countryOfOrigin?: string;

//   // 🔗 Pairing intelligence
//   goesWithIds?: string[]; // UUID[]
//   avoidWithIds?: string[]; // UUID[]

//   // 🧠 Feedback & personalization
//   userRating?: number; // 1–5
//   fitConfidence?: number; // 0–100
//   outfitFeedback?: {outfitId: string; liked: boolean; reasonCodes?: string[]}[];
//   dislikedFeatures?: string[];

//   // 🚫 Constraints
//   constraints?: string[];

//   // 🖼️ Image dims
//   width?: number;
//   height?: number;

//   // 🗓️ Meta
//   createdAt?: string;
//   updatedAt?: string;
//   deletedAt?: string | null;
// };

////////////////////

// export type WardrobeItem = {
//   // 🔑 Core
//   id: string;
//   userId: string;
//   name: string;
//   image: string; // Maps to `image_url` from backend
//   gsutilUri: string;
//   mainCategory: string;
//   subCategory: string;
//   material: string;
//   fit: string;
//   color: string;
//   size: string;
//   brand: string;
//   tags?: string[];
//   notes?: string;
//   favorite?: boolean;

//   // 🎨 Visual & Styling
//   styleDescriptors?: string[];
//   pattern?: string;
//   patternScale?: string;
//   dominantHex?: string;
//   paletteHex?: string[];
//   colorFamily?: string;

//   // 🌦️ Weather & Seasonality
//   seasonality?: string; // 🔹 add this (single value version)
//   seasonalityArr?: string[];
//   layering?: string;
//   thermalRating?: number;
//   breathability?: number;
//   rainOk?: boolean;
//   windOk?: boolean;
//   climateSweetspotFMin?: number;
//   climateSweetspotFMax?: number;

//   // 👖 Fit & Comfort
//   stretchPct?: number;
//   thickness?: string; // 🔹 add this (thin / medium / thick)
//   measurements?: Record<string, number>;
//   sizeLabel?: string;
//   sizeSystem?: string;

//   // 🤖 AI Metadata
//   aiDescription?: string;
//   aiTitle?: string;
//   aiKeyAttributes?: string[];
//   aiConfidence?: number;

//   // 🔁 Wear Tracking
//   wearCount?: number;
//   lastWornAt?: string;
//   rotationPriority?: number;

//   // 🧼 Care Info
//   condition?: string;
//   dryClean?: boolean;
//   ironOk?: boolean;
//   washTempC?: number;
//   careSymbols?: string[];
//   defectsNotes?: string;

//   // 🛍️ Purchase Info
//   purchaseDate?: string;
//   purchasePrice?: number;
//   retailer?: string;
//   countryOfOrigin?: string;

//   // 🚫 Constraints (optional logic)
//   constraints?: string[];

//   // 📅 Meta
//   createdAt?: string;
//   updatedAt?: string;
//   deletedAt?: string | null;
// };

///////////////////

// export type WardrobeItem = {
//   // 🔑 Core
//   id: string;
//   userId: string;
//   name: string;
//   image: string; // Maps to `image_url` from backend
//   gsutilUri: string;
//   mainCategory: string;
//   subCategory: string;
//   material: string;
//   fit: string;
//   color: string;
//   size: string;
//   brand: string;
//   tags?: string[];
//   notes?: string;
//   favorite?: boolean;

//   // 🎨 Visual & Styling
//   styleDescriptors?: string[];
//   pattern?: string;
//   patternScale?: string;
//   dominantHex?: string;
//   paletteHex?: string[];
//   colorFamily?: string;

//   // 🌦️ Weather & Seasonality
//   seasonalityArr?: string[];
//   layering?: string;
//   thermalRating?: number;
//   breathability?: number;
//   rainOk?: boolean;
//   windOk?: boolean;
//   climateSweetspotFMin?: number;
//   climateSweetspotFMax?: number;

//   // 👖 Fit & Comfort
//   stretchPct?: number;
//   measurements?: Record<string, number>;
//   sizeLabel?: string;
//   sizeSystem?: string;

//   // 🤖 AI Metadata
//   aiDescription?: string;
//   aiTitle?: string;
//   aiKeyAttributes?: string[];
//   aiConfidence?: number;

//   // 🔁 Wear Tracking
//   wearCount?: number;
//   lastWornAt?: string;
//   rotationPriority?: number;

//   // 🧼 Care Info
//   condition?: string;
//   dryClean?: boolean;
//   ironOk?: boolean;
//   washTempC?: number;
//   careSymbols?: string[];
//   defectsNotes?: string;

//   // 🛍️ Purchase Info
//   purchaseDate?: string;
//   purchasePrice?: number;
//   retailer?: string;
//   countryOfOrigin?: string;

//   // 🚫 Constraints (optional logic)
//   constraints?: string[];

//   // 📅 Meta
//   createdAt?: string;
//   updatedAt?: string;
//   deletedAt?: string | null;
// };

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
