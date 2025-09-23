// apps/backend-nest/src/types/wardrobe.ts

// -------------------------
// Enums / union types
// -------------------------
export type Seasonality = 'SS' | 'FW' | 'ALL_SEASON';
export type Layering = 'BASE' | 'MID' | 'SHELL' | 'ACCENT';

export type Pattern =
  | 'SOLID'
  | 'STRIPE'
  | 'CHECK'
  | 'HERRINGBONE'
  | 'WINDOWPANE'
  | 'FLORAL'
  | 'DOT'
  | 'CAMO'
  | 'ABSTRACT'
  | 'OTHER';

export type PatternScale = 'subtle' | 'medium' | 'bold';
export type Thickness = 'thin' | 'medium' | 'thick';
export type SizeSystem = 'US' | 'EU' | 'UK' | 'alpha';

export type AnchorRole = 'Hero' | 'Neutral' | 'Connector';
export type DressCode =
  | 'UltraCasual'
  | 'Casual'
  | 'SmartCasual'
  | 'BusinessCasual'
  | 'Business'
  | 'BlackTie';

export type ColorTemp = 'Warm' | 'Cool' | 'Neutral';
export type ContrastProfile = 'Low' | 'Medium' | 'High';
export type WrinkleResistance = 'Low' | 'Med' | 'High';
export type StretchDirection = '2-way' | '4-way';

// -------------------------
// WardrobeItem model
// -------------------------
export type WardrobeItem = {
  // 🔑 Core
  id: string;
  userId: string;
  name: string;
  image: string; // ↔ image_url
  gsutilUri: string; // ↔ gsutil_uri
  objectKey?: string; // ↔ object_key

  mainCategory: string; // ↔ main_category
  subCategory?: string; // ↔ subcategory
  material?: string;
  fit?: string;
  color?: string;
  size?: string;
  brand?: string;
  tags?: string[];
  notes?: string;
  favorite?: boolean;

  // 🎨 Visual & Styling
  styleDescriptors?: string[]; // ↔ style_descriptors
  styleArchetypes?: string[]; // ↔ style_archetypes
  anchorRole?: AnchorRole;

  pattern?: Pattern;
  patternScale?: PatternScale;
  dominantHex?: string;
  paletteHex?: string[];
  colorFamily?: string;
  colorTemp?: ColorTemp;
  contrastProfile?: ContrastProfile;

  // 🎟️ Occasion & Formality
  occasionTags?: string[];
  dressCode?: DressCode;
  formalityScore?: number; // 0–100
  formalityRangeSmall?: number; // legacy knob (keep)

  // 🌦️ Weather & Seasonality
  seasonality?: Seasonality;
  seasonalityArr?: Seasonality[];
  layering?: Layering;
  thermalRating?: number;
  breathability?: number;
  rainOk?: boolean;
  windOk?: boolean;
  waterproofRating?: string;
  climateSweetspotFMin?: number;
  climateSweetspotFMax?: number;

  // 👖 Fit & Construction
  stretchPct?: number;
  thickness?: Thickness;
  fabricPrimary?: string;
  fabricBlend?: Array<{ material: string; percent: number }>;
  fabricWeightGsm?: number;
  wrinkleResistance?: WrinkleResistance;
  stretchDirection?: StretchDirection;

  // ✂️ Silhouette & Cut (all optional)
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

  // 📏 Sizing extras
  measurements?: Record<string, number>;
  sizeLabel?: string;
  sizeSystem?: SizeSystem;

  // 🤖 AI Metadata
  aiDescription?: string;
  aiTitle?: string;
  aiKeyAttributes?: string[];
  aiConfidence?: number;

  // 🔁 Wear Tracking
  wearCount?: number;
  lastWornAt?: string; // ISO
  rotationPriority?: -1 | 0 | 1;

  // 🧼 Care
  condition?: string;
  dryClean?: boolean;
  ironOk?: boolean;
  washTempC?: number;
  careSymbols?: string[];
  defectsNotes?: string;

  // 🛍️ Purchase
  purchaseDate?: string; // ISO
  purchasePrice?: number;
  retailer?: string;
  countryOfOrigin?: string;

  // 🔗 Pairing intelligence
  goesWithIds?: string[]; // UUID[]
  avoidWithIds?: string[]; // UUID[]

  // 🧠 Feedback & personalization
  userRating?: number; // 1–5
  fitConfidence?: number; // 0–100
  outfitFeedback?: {
    outfitId: string;
    liked: boolean;
    reasonCodes?: string[];
  }[];
  dislikedFeatures?: string[];

  // 🚫 Constraints
  constraints?: string[];

  // 🖼️ Image dims
  width?: number;
  height?: number;

  // 🗓️ Meta
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};
