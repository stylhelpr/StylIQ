export type WardrobeItem = {
  // Core
  id: string;
  userId: string;
  image: string; // ↔ image_url
  name: string;
  gsutilUri?: string; // ↔ gsutil_uri
  objectKey?: string; // ↔ object_key
  processedImageUrl?: string; // ↔ processed_image_url
  processedGsutilUri?: string; // ↔ processed_gsutil_uri

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
    | 'TraditionalWear'
    | 'Dresses'
    | 'Skirts'
    | 'Bags'
    | 'Headwear'
    | 'Jewelry'
    | 'Other';
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
