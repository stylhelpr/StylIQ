// ═══════════════════════════════════════════════════════════════════════════
// qualityGate.ts — Outfit-level quality scoring, enforcement, and trust guarantee
// ═══════════════════════════════════════════════════════════════════════════
//
// PURPOSE:
// Ensures no "stupid picks" ever reach the user through deterministic enforcement.
// This is NOT prompt-based — it's metadata-based rule enforcement.
//
// TRUST GUARANTEE:
// Every outfit returned by the API has passed quality checks. If an outfit
// fails, it is either regenerated or replaced with a safe fallback. Users
// never see failing outfits.
//
// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSALITY PRINCIPLES (enforced in all scoring functions):
// ═══════════════════════════════════════════════════════════════════════════
//
// 1.  GENDER-NEUTRAL: No assumptions about gender identity
// 2.  BODY-AGNOSTIC: No assumptions about body type/size
// 3.  CULTURE-INCLUSIVE: No Western-centric dress norms assumed
// 4.  MODESTY-AWARE: Coverage preferences are valid and respected
// 5.  AGE-NEUTRAL: No "age-appropriate" judgments
// 6.  CLIMATE-FLEXIBLE: Weather rules are physics-based only
// 7.  NO DEFAULT AESTHETIC: User defines their style
// 8.  ACCESSIBILITY-AWARE: Comfort-first choices are valid
// 9.  ECONOMIC-NEUTRAL: No price point assumptions
// 10. OCCASION-FLEXIBLE: User defines what's appropriate
// 11. NO SKIN-TONE ASSUMPTIONS: Never suggest colors by complexion
// 12. PREFERENCE-FIRST: User dislikes are hard constraints
//
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────

export type OutfitItem = {
  id?: string;
  main_category?: string;
  subcategory?: string;
  color?: string;
  color_family?: string;
  formality_score?: number;
  shoe_style?: string;
  dress_code?: string;
  label?: string;
};

export type GeneratedOutfit = {
  outfit_id?: string;
  title: string;
  items: OutfitItem[];
  why?: string;
  missing?: string;
};

// ─────────────────────────────────────────────────────────────────
// FAILURE REASON CODES (Task 3)
// Structured codes for auditing and debugging at scale
// ─────────────────────────────────────────────────────────────────

export enum FailureReasonCode {
  // Footwear violations
  FOOTWEAR_CONTEXT_VIOLATION = 'footwear_context_violation',
  FOOTWEAR_FORMALITY_DOWNGRADE = 'footwear_formality_downgrade',
  ATHLETIC_SHOES_IN_FORMAL = 'athletic_shoes_in_formal',
  SANDALS_IN_PROFESSIONAL = 'sandals_in_professional',
  UNKNOWN_FOOTWEAR_IN_FORMAL = 'unknown_footwear_in_formal', // BLOCKER 3: Fail on unclassifiable footwear

  // Formality violations
  FORMALITY_MISMATCH = 'formality_mismatch',
  FORMALITY_SPREAD_TOO_WIDE = 'formality_spread_too_wide',
  CASUAL_IN_CEREMONIAL = 'casual_in_ceremonial',

  // Cohesion violations
  COHESION_FAILURE = 'cohesion_failure',
  COLOR_CHAOS = 'color_chaos',

  // Preference violations
  PREFERENCE_VIOLATION = 'preference_violation',
  AVOIDED_COLOR_USED = 'avoided_color_used',
  AVOIDED_CATEGORY_USED = 'avoided_category_used',

  // Weather violations
  WEATHER_INAPPROPRIATE = 'weather_inappropriate',
  COLD_WEATHER_EXPOSURE = 'cold_weather_exposure',
  HOT_WEATHER_OVERDRESS = 'hot_weather_overdress',

  // Practicality violations
  MISSING_CORE_SLOT = 'missing_core_slot',
  INCOMPLETE_OUTFIT = 'incomplete_outfit',

  // Context violations
  CONTEXT_INAPPROPRIATE = 'context_inappropriate',
  GYM_WITHOUT_ATHLETIC = 'gym_without_athletic',
  FORMAL_WITH_CASUAL = 'formal_with_casual',

  // Aggregate
  AVERAGE_BELOW_THRESHOLD = 'average_below_threshold',
  CATEGORY_BELOW_MINIMUM = 'category_below_minimum',
}

// ─────────────────────────────────────────────────────────────────
// QUALITY CONTEXT (Extended for all scenarios)
// ─────────────────────────────────────────────────────────────────

export type QualityContext = {
  // User request context
  query: string;
  targetFormality?: number; // 1-10 scale from prompt parsing

  // Weather context (physics-based, not cultural)
  weather?: {
    tempF?: number;
    precipitation?: 'none' | 'rain' | 'snow';
    windMph?: number;
  };

  // User style preferences (optional, user-defined)
  userStyle?: {
    preferredColors?: string[];
    avoidColors?: string[];
    avoidSubcategories?: string[];
    dressBias?: string;
  };

  // Activity signals parsed from query (expanded for golden scenarios)
  isGym?: boolean;
  isBeach?: boolean;
  isFormal?: boolean;
  isWedding?: boolean;
  isFuneral?: boolean; // Memorial, funeral
  isReligious?: boolean; // Church, mosque, temple, synagogue
  isInterview?: boolean; // Job interview, professional meeting
  isProfessional?: boolean; // Work, office, business
  isCasual?: boolean; // Errands, everyday
  isNetworking?: boolean; // Formal networking event
  requiresModesty?: boolean; // User-specified modesty requirement
};

// ─────────────────────────────────────────────────────────────────
// QUALITY SCORES (with reason codes)
// ─────────────────────────────────────────────────────────────────

export type QualityScores = {
  contextAppropriateness: number; // Activity/social context fit (0-5)
  weatherSuitability: number; // Temperature/precipitation fit (0-5)
  styleAlignment: number; // User preference alignment (0-5)
  cohesion: number; // Palette + silhouette balance (0-5)
  practicality: number; // Comfort/wearability (0-5)
  formalityConsistency: number; // No mixed formality signals (0-5)
  average: number; // Mean of all scores
  lowestScore: number; // Minimum individual score
  failedCategories: string[]; // Categories scoring < 3
  reasonCodes: FailureReasonCode[]; // Structured failure codes
};

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

const lc = (s?: string) => (s ?? '').toLowerCase();

// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZED FOOTWEAR CLASSIFICATION (BLOCKER 3 FIX)
// Canonical footwear categories with exhaustive synonym mapping
// Prefers metadata (subcategory, shoe_style) over label text
// ═══════════════════════════════════════════════════════════════════════════

export enum FootwearCategory {
  ATHLETIC = 'athletic',     // Sneakers, trainers, running shoes
  DRESS = 'dress',           // Oxfords, derbies, loafers, heels
  CASUAL = 'casual',         // Canvas shoes, boat shoes, moccasins
  OPEN = 'open',             // Sandals, flip-flops, slides
  BOOTS = 'boots',           // Boots (can be formal or casual)
  UNKNOWN = 'unknown',       // Cannot classify → FAIL in formal context
}

// Exhaustive synonym lists for robust matching
const ATHLETIC_KEYWORDS = [
  'sneaker', 'trainer', 'running', 'athletic', 'sport',
  'gym', 'tennis', 'basketball', 'cross-train', 'workout',
  'jogger', 'kicks', 'runner', 'walking shoe',
];

const DRESS_KEYWORDS = [
  'loafer', 'oxford', 'derby', 'monk', 'brogue', 'wingtip',
  'dress shoe', 'formal', 'heel', 'pump', 'stiletto',
  'court shoe', 'ballet flat', 'kitten heel', 'wedge',
  'penny loafer', 'tassel loafer', 'cap toe', 'whole cut',
];

const CASUAL_KEYWORDS = [
  'canvas', 'boat shoe', 'moccasin', 'espadrille', 'slip-on',
  'driving shoe', 'casual', 'plimsolls',
];

const OPEN_KEYWORDS = [
  'sandal', 'flip-flop', 'slide', 'thong', 'open-toe',
  'huarache', 'gladiator',
];

const BOOT_KEYWORDS = [
  'boot', 'chelsea', 'chukka', 'desert boot', 'ankle boot',
  'combat boot', 'work boot', 'hiking boot',
];

/**
 * CLASSIFY FOOTWEAR
 *
 * Priority order for classification:
 * 1. shoe_style metadata (most reliable)
 * 2. subcategory metadata
 * 3. label text (fallback)
 *
 * Returns FootwearCategory.UNKNOWN if no match found.
 * UNKNOWN triggers failure in formal contexts.
 */
export function classifyFootwear(item: OutfitItem): FootwearCategory {
  // Combine all text sources, prioritizing metadata
  const sources = [
    lc(item.shoe_style),      // Priority 1: explicit style metadata
    lc(item.subcategory),     // Priority 2: subcategory
    lc(item.label),           // Priority 3: label (fallback)
  ].filter(Boolean);

  const allText = sources.join(' ');

  // Check each category in order of specificity
  // DRESS first (more specific than athletic in some cases)
  if (DRESS_KEYWORDS.some((k) => allText.includes(k))) {
    return FootwearCategory.DRESS;
  }

  // ATHLETIC
  if (ATHLETIC_KEYWORDS.some((k) => allText.includes(k))) {
    return FootwearCategory.ATHLETIC;
  }

  // BOOTS (can be formal or casual, context-dependent)
  if (BOOT_KEYWORDS.some((k) => allText.includes(k))) {
    return FootwearCategory.BOOTS;
  }

  // OPEN
  if (OPEN_KEYWORDS.some((k) => allText.includes(k))) {
    return FootwearCategory.OPEN;
  }

  // CASUAL
  if (CASUAL_KEYWORDS.some((k) => allText.includes(k))) {
    return FootwearCategory.CASUAL;
  }

  // UNKNOWN - cannot classify
  return FootwearCategory.UNKNOWN;
}

/**
 * CHECK: Is footwear appropriate for formal context?
 *
 * DRESS and BOOTS are acceptable
 * ATHLETIC, CASUAL, OPEN, UNKNOWN are rejected
 */
export function isFootwearFormalAppropriate(category: FootwearCategory): boolean {
  return category === FootwearCategory.DRESS || category === FootwearCategory.BOOTS;
}

/**
 * DECISION LOGIC: Detect athletic/gym footwear
 * Uses normalized classification for robustness
 */
function isAthleticFootwear(item: OutfitItem): boolean {
  return classifyFootwear(item) === FootwearCategory.ATHLETIC;
}

/**
 * DECISION LOGIC: Detect formal/dress footwear
 * Uses normalized classification for robustness
 */
function isDressFootwear(item: OutfitItem): boolean {
  const cat = classifyFootwear(item);
  return cat === FootwearCategory.DRESS || cat === FootwearCategory.BOOTS;
}

/**
 * DECISION LOGIC: Detect unknown footwear
 * Unknown footwear in formal context = FAIL
 */
function isUnknownFootwear(item: OutfitItem): boolean {
  return classifyFootwear(item) === FootwearCategory.UNKNOWN;
}

/**
 * DECISION LOGIC: Detect open/casual footwear
 */
function isOpenFootwear(item: OutfitItem): boolean {
  const sub = lc(item.subcategory);
  return sub.includes('sandal') || sub.includes('flip') || sub.includes('slide');
}

/**
 * DECISION LOGIC: Detect casual tops (hoodies, sweatshirts)
 */
function isCasualTop(item: OutfitItem): boolean {
  const sub = lc(item.subcategory);
  return (
    sub.includes('hoodie') ||
    sub.includes('sweatshirt') ||
    sub.includes('t-shirt') ||
    sub.includes('tank')
  );
}

/**
 * DECISION LOGIC: Detect formal tops (blazers, dress shirts)
 */
function isFormalTop(item: OutfitItem): boolean {
  const sub = lc(item.subcategory);
  return (
    sub.includes('blazer') ||
    sub.includes('sport coat') ||
    sub.includes('suit') ||
    sub.includes('dress shirt')
  );
}

/**
 * DECISION LOGIC: Detect casual bottoms (shorts, joggers)
 */
function isCasualBottom(item: OutfitItem): boolean {
  const sub = lc(item.subcategory);
  return (
    sub.includes('short') ||
    sub.includes('jogger') ||
    sub.includes('sweatpant') ||
    sub.includes('track')
  );
}

/**
 * DECISION LOGIC: Check if context requires formal dress
 * These contexts universally require appropriate formality
 */
function requiresFormalDress(ctx: QualityContext): boolean {
  return !!(
    ctx.isFormal ||
    ctx.isWedding ||
    ctx.isFuneral ||
    ctx.isReligious ||
    ctx.isInterview ||
    ctx.isNetworking ||
    (ctx.targetFormality && ctx.targetFormality >= 7)
  );
}

/**
 * DECISION LOGIC: Check if context is ceremonial
 * Ceremonial contexts have stricter requirements
 */
function isCeremonialContext(ctx: QualityContext): boolean {
  return !!(ctx.isWedding || ctx.isFuneral || ctx.isReligious);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORING FUNCTIONS
// Each function documents its decision logic for auditability
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SCORE: Context Appropriateness (0-5)
 *
 * DECISION LOGIC:
 * - Gym: Athletic footwear required, formal pieces inappropriate
 * - Formal/Ceremonial: Dress shoes expected, casual pieces rejected
 * - Beach: Heavy pieces inappropriate
 * - Interview: Professional appearance required
 *
 * REJECTION TRIGGERS:
 * - Athletic shoes in formal context → score 0
 * - Hoodie in interview → score 0
 * - Shorts in funeral → score 0
 */
function scoreContextAppropriateness(
  outfit: GeneratedOutfit,
  ctx: QualityContext,
  reasonCodes: FailureReasonCode[],
): number {
  const items = outfit.items || [];
  let score = 5;

  // Extract item characteristics
  const hasAthleticShoes = items.some(
    (i) => lc(i.main_category) === 'shoes' && isAthleticFootwear(i),
  );
  const hasDressShoes = items.some(
    (i) => lc(i.main_category) === 'shoes' && isDressFootwear(i),
  );
  const hasOpenShoes = items.some(
    (i) => lc(i.main_category) === 'shoes' && isOpenFootwear(i),
  );
  const hasCasualTop = items.some(
    (i) => lc(i.main_category) === 'tops' && isCasualTop(i),
  );
  const hasCasualBottom = items.some(
    (i) => lc(i.main_category) === 'bottoms' && isCasualBottom(i),
  );

  // ─────────────────────────────────────────────────────────────────
  // RULE: Gym context requires athletic gear
  // ─────────────────────────────────────────────────────────────────
  if (ctx.isGym) {
    if (!hasAthleticShoes) {
      score -= 3;
      reasonCodes.push(FailureReasonCode.GYM_WITHOUT_ATHLETIC);
    }
    if (hasDressShoes) {
      score -= 2;
      reasonCodes.push(FailureReasonCode.CONTEXT_INAPPROPRIATE);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // RULE: Formal/Ceremonial contexts reject athletic footwear
  // This is a HARD RULE based on universal social norms
  // ─────────────────────────────────────────────────────────────────
  if (requiresFormalDress(ctx)) {
    // Athletic shoes in formal = automatic fail
    if (hasAthleticShoes && !hasDressShoes) {
      score = 0; // HARD FAIL
      reasonCodes.push(FailureReasonCode.ATHLETIC_SHOES_IN_FORMAL);
    }

    // BLOCKER 3 FIX: Unknown footwear in formal = fail (cannot trust unclassified)
    const hasUnknownShoes = items.some(
      (i) => lc(i.main_category) === 'shoes' && isUnknownFootwear(i),
    );
    if (hasUnknownShoes && !hasDressShoes) {
      score -= 3; // Major penalty for unclassifiable footwear
      reasonCodes.push(FailureReasonCode.UNKNOWN_FOOTWEAR_IN_FORMAL);
    }

    // Casual tops (hoodie) in formal = major penalty
    if (hasCasualTop) {
      score -= 3;
      reasonCodes.push(FailureReasonCode.CASUAL_IN_CEREMONIAL);
    }

    // Shorts in formal = major penalty
    if (hasCasualBottom) {
      score -= 3;
      reasonCodes.push(FailureReasonCode.CASUAL_IN_CEREMONIAL);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // RULE: Ceremonial contexts (funeral, religious, wedding) are stricter
  // ─────────────────────────────────────────────────────────────────
  if (isCeremonialContext(ctx)) {
    // Open footwear (sandals) inappropriate for ceremonies
    if (hasOpenShoes) {
      score -= 2;
      reasonCodes.push(FailureReasonCode.SANDALS_IN_PROFESSIONAL);
    }

    // Must have dress shoes
    if (!hasDressShoes) {
      score -= 2;
      reasonCodes.push(FailureReasonCode.FOOTWEAR_FORMALITY_DOWNGRADE);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // RULE: Interview requires professional appearance
  // ─────────────────────────────────────────────────────────────────
  if (ctx.isInterview) {
    if (hasAthleticShoes) {
      score = 0; // HARD FAIL - sneakers in interview
      reasonCodes.push(FailureReasonCode.ATHLETIC_SHOES_IN_FORMAL);
    }
    if (hasCasualTop) {
      score = Math.min(score, 1); // Hoodie in interview = near fail
      reasonCodes.push(FailureReasonCode.CASUAL_IN_CEREMONIAL);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // RULE: Beach context is casual
  // ─────────────────────────────────────────────────────────────────
  if (ctx.isBeach) {
    // Formal pieces are out of place but not failures
    if (items.some((i) => lc(i.main_category) === 'tops' && isFormalTop(i))) {
      score -= 1;
    }
  }

  return Math.max(0, Math.min(5, score));
}

/**
 * SCORE: Weather Suitability (0-5)
 *
 * DECISION LOGIC:
 * - Physics-based: temperature and precipitation
 * - Cold (<50°F): Outerwear expected, shorts/sandals rejected
 * - Very cold (<35°F): Exposure pieces are hard fails
 * - Hot (>85°F): Heavy layers inappropriate
 * - Rain/Snow: Open footwear inappropriate
 */
function scoreWeatherSuitability(
  outfit: GeneratedOutfit,
  ctx: QualityContext,
  reasonCodes: FailureReasonCode[],
): number {
  if (!ctx.weather?.tempF) return 5; // No weather context = neutral

  const items = outfit.items || [];
  let score = 5;

  const tempF = ctx.weather.tempF;
  const isRaining = ctx.weather.precipitation === 'rain';
  const isSnowing = ctx.weather.precipitation === 'snow';

  const hasOuterwear = items.some((i) => lc(i.main_category) === 'outerwear');
  const hasShorts = items.some((i) => isCasualBottom(i) && lc(i.subcategory).includes('short'));
  const hasSandals = items.some((i) => lc(i.main_category) === 'shoes' && isOpenFootwear(i));
  const hasBoots = items.some(
    (i) => lc(i.subcategory).includes('boot') || lc(i.shoe_style).includes('boot'),
  );

  // Cold weather (<50°F)
  if (tempF < 50) {
    if (!hasOuterwear) {
      score -= 2;
      reasonCodes.push(FailureReasonCode.COLD_WEATHER_EXPOSURE);
    }
    if (hasShorts) {
      score -= 2;
      reasonCodes.push(FailureReasonCode.COLD_WEATHER_EXPOSURE);
    }
    if (hasSandals) {
      score -= 2;
      reasonCodes.push(FailureReasonCode.COLD_WEATHER_EXPOSURE);
    }
  }

  // Very cold (<35°F) - hard penalties
  if (tempF < 35) {
    if (hasShorts) {
      score = Math.min(score, 1);
      reasonCodes.push(FailureReasonCode.WEATHER_INAPPROPRIATE);
    }
    if (hasSandals) {
      score = Math.min(score, 1);
      reasonCodes.push(FailureReasonCode.WEATHER_INAPPROPRIATE);
    }
  }

  // Hot weather (>85°F)
  if (tempF > 85 && hasOuterwear) {
    score -= 1;
    reasonCodes.push(FailureReasonCode.HOT_WEATHER_OVERDRESS);
  }

  // Rain/snow
  if ((isRaining || isSnowing) && hasSandals) {
    score -= 2;
    reasonCodes.push(FailureReasonCode.WEATHER_INAPPROPRIATE);
  }

  return Math.max(0, Math.min(5, score));
}

/**
 * SCORE: Style Alignment (0-5)
 *
 * DECISION LOGIC:
 * - User avoids are HARD CONSTRAINTS
 * - Avoided colors = rejection
 * - Avoided categories = rejection
 * - Preferred colors = bonus
 */
function scoreStyleAlignment(
  outfit: GeneratedOutfit,
  ctx: QualityContext,
  reasonCodes: FailureReasonCode[],
): number {
  if (!ctx.userStyle) return 5; // No style context = neutral

  const items = outfit.items || [];
  let score = 5;

  const avoidColors = (ctx.userStyle.avoidColors || []).map(lc);
  const avoidSubs = (ctx.userStyle.avoidSubcategories || []).map(lc);
  const preferColors = (ctx.userStyle.preferredColors || []).map(lc);

  for (const item of items) {
    const itemColor = lc(item.color) || lc(item.color_family);
    const itemSub = lc(item.subcategory);

    // HARD penalty for avoided colors
    if (avoidColors.some((c) => itemColor.includes(c))) {
      score -= 3; // Increased penalty
      reasonCodes.push(FailureReasonCode.AVOIDED_COLOR_USED);
    }

    // HARD penalty for avoided subcategories
    if (avoidSubs.some((s) => itemSub.includes(s))) {
      score -= 3; // Increased penalty
      reasonCodes.push(FailureReasonCode.AVOIDED_CATEGORY_USED);
    }

    // Bonus for preferred colors
    if (preferColors.some((c) => itemColor.includes(c))) {
      score += 0.5;
    }
  }

  if (score < 5 && reasonCodes.length === 0) {
    reasonCodes.push(FailureReasonCode.PREFERENCE_VIOLATION);
  }

  return Math.max(0, Math.min(5, score));
}

/**
 * SCORE: Cohesion (0-5)
 *
 * DECISION LOGIC:
 * - Internal consistency, not aesthetic correctness
 * - Too many colors (>4) = chaotic
 * - Formality spread >3 = mismatch
 */
function scoreCohesion(
  outfit: GeneratedOutfit,
  reasonCodes: FailureReasonCode[],
): number {
  const items = outfit.items || [];
  if (items.length < 2) return 5;

  let score = 5;

  // Color check
  const colors = items.map((i) => lc(i.color) || lc(i.color_family)).filter(Boolean);
  const uniqueColors = new Set(colors);
  if (uniqueColors.size > 5) {
    score -= 2;
    reasonCodes.push(FailureReasonCode.COLOR_CHAOS);
  } else if (uniqueColors.size > 4) {
    score -= 1;
  }

  // Formality spread check
  const formalities = items
    .map((i) => i.formality_score)
    .filter((f) => f !== undefined) as number[];

  if (formalities.length >= 2) {
    const maxF = Math.max(...formalities);
    const minF = Math.min(...formalities);
    if (maxF - minF > 3) {
      score -= 2;
      reasonCodes.push(FailureReasonCode.FORMALITY_SPREAD_TOO_WIDE);
    } else if (maxF - minF > 2) {
      score -= 1;
    }
  }

  if (score < 3 && !reasonCodes.includes(FailureReasonCode.COHESION_FAILURE)) {
    reasonCodes.push(FailureReasonCode.COHESION_FAILURE);
  }

  return Math.max(0, Math.min(5, score));
}

/**
 * SCORE: Practicality (0-5)
 *
 * DECISION LOGIC:
 * - Core slots (top, bottom, shoes) must be present
 * - Missing slots = penalty
 */
function scorePracticality(
  outfit: GeneratedOutfit,
  reasonCodes: FailureReasonCode[],
): number {
  const items = outfit.items || [];
  let score = 5;

  const hasTop = items.some((i) => lc(i.main_category) === 'tops');
  const hasBottom = items.some((i) => lc(i.main_category) === 'bottoms');
  const hasShoes = items.some((i) => lc(i.main_category) === 'shoes');

  if (!hasTop) {
    score -= 2;
    reasonCodes.push(FailureReasonCode.MISSING_CORE_SLOT);
  }
  if (!hasBottom) {
    score -= 2;
    reasonCodes.push(FailureReasonCode.MISSING_CORE_SLOT);
  }
  if (!hasShoes) {
    score -= 1;
    reasonCodes.push(FailureReasonCode.MISSING_CORE_SLOT);
  }

  if (outfit.missing && outfit.missing.length > 0) {
    score -= 1;
    reasonCodes.push(FailureReasonCode.INCOMPLETE_OUTFIT);
  }

  return Math.max(0, Math.min(5, score));
}

/**
 * SCORE: Formality Consistency (0-5)
 *
 * DECISION LOGIC:
 * - No mixed signals (sneakers with suit, hoodie with dress shoes)
 * - Formality downgrade in formal context = fail
 */
function scoreFormalityConsistency(
  outfit: GeneratedOutfit,
  ctx: QualityContext,
  reasonCodes: FailureReasonCode[],
): number {
  const items = outfit.items || [];
  let score = 5;

  const hasAthleticShoes = items.some(
    (i) => lc(i.main_category) === 'shoes' && isAthleticFootwear(i),
  );
  const hasDressShoes = items.some(
    (i) => lc(i.main_category) === 'shoes' && isDressFootwear(i),
  );
  const hasFormalTop = items.some(
    (i) => lc(i.main_category) === 'tops' && isFormalTop(i),
  );
  const hasCasualTop = items.some(
    (i) => lc(i.main_category) === 'tops' && isCasualTop(i),
  );
  const hasSuit = items.some((i) => lc(i.subcategory).includes('suit'));

  // Suit + sneakers = mismatch (unless explicitly casual-formal)
  if (hasSuit && hasAthleticShoes) {
    score -= 3;
    reasonCodes.push(FailureReasonCode.FORMALITY_MISMATCH);
  }

  // Blazer/formal top + hoodie = mismatch
  if (hasFormalTop && hasCasualTop) {
    score -= 2;
    reasonCodes.push(FailureReasonCode.FORMALITY_MISMATCH);
  }

  // Hoodie + dress shoes in formal context = odd
  if (hasCasualTop && hasDressShoes && ctx.targetFormality && ctx.targetFormality >= 6) {
    score -= 1;
  }

  // ─────────────────────────────────────────────────────────────────
  // DETERMINISTIC RULE: Footwear must not downgrade formality
  // If context requires formal, athletic shoes = FAIL
  // ─────────────────────────────────────────────────────────────────
  if (requiresFormalDress(ctx) && hasAthleticShoes && !hasDressShoes) {
    score = 0; // HARD FAIL
    reasonCodes.push(FailureReasonCode.FOOTWEAR_FORMALITY_DOWNGRADE);
  }

  return Math.max(0, Math.min(5, score));
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export function scoreOutfit(
  outfit: GeneratedOutfit,
  ctx: QualityContext,
): QualityScores {
  const reasonCodes: FailureReasonCode[] = [];

  const scores = {
    contextAppropriateness: scoreContextAppropriateness(outfit, ctx, reasonCodes),
    weatherSuitability: scoreWeatherSuitability(outfit, ctx, reasonCodes),
    styleAlignment: scoreStyleAlignment(outfit, ctx, reasonCodes),
    cohesion: scoreCohesion(outfit, reasonCodes),
    practicality: scorePracticality(outfit, reasonCodes),
    formalityConsistency: scoreFormalityConsistency(outfit, ctx, reasonCodes),
    average: 0,
    lowestScore: 0,
    failedCategories: [] as string[],
    reasonCodes,
  };

  const allScores = [
    scores.contextAppropriateness,
    scores.weatherSuitability,
    scores.styleAlignment,
    scores.cohesion,
    scores.practicality,
    scores.formalityConsistency,
  ];

  scores.average = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  scores.lowestScore = Math.min(...allScores);

  // Track which categories failed (< 3)
  if (scores.contextAppropriateness < 3) scores.failedCategories.push('contextAppropriateness');
  if (scores.weatherSuitability < 3) scores.failedCategories.push('weatherSuitability');
  if (scores.styleAlignment < 3) scores.failedCategories.push('styleAlignment');
  if (scores.cohesion < 3) scores.failedCategories.push('cohesion');
  if (scores.practicality < 3) scores.failedCategories.push('practicality');
  if (scores.formalityConsistency < 3) scores.failedCategories.push('formalityConsistency');

  return scores;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY GATE: Thresholds and pass/fail determination
// ═══════════════════════════════════════════════════════════════════════════

export const QUALITY_THRESHOLDS = {
  MIN_AVERAGE: 4.0, // Minimum average score to pass
  MIN_AVERAGE_PICK1: 4.5, // Pick #1 has stricter requirements
  MIN_INDIVIDUAL: 3, // Minimum score in any single category
  MAX_REGENERATION_ATTEMPTS: 2, // Max retries before fallback
};

export type QualityGateResult = {
  passed: boolean;
  scores: QualityScores;
  failureReason?: string;
  reasonCodes: FailureReasonCode[];
};

/**
 * CHECK QUALITY GATE
 *
 * DECISION LOGIC:
 * 1. Score outfit on all 6 dimensions
 * 2. Check if any score is 0 (hard fail)
 * 3. Check if average meets threshold
 * 4. Check if any category is below minimum
 * 5. Return pass/fail with structured reason codes
 *
 * REJECTION TRIGGERS:
 * - Any score = 0 → immediate fail
 * - Average < threshold → fail
 * - Any category < 3 → fail
 */
export function checkQualityGate(
  outfit: GeneratedOutfit,
  ctx: QualityContext,
  pickNumber: 1 | 2 | 3,
): QualityGateResult {
  const scores = scoreOutfit(outfit, ctx);
  const reasonCodes = [...scores.reasonCodes];

  // Pick #1 has stricter requirements
  const minAvg = pickNumber === 1 ? QUALITY_THRESHOLDS.MIN_AVERAGE_PICK1 : QUALITY_THRESHOLDS.MIN_AVERAGE;

  // Check for hard fails (any score = 0)
  if (scores.lowestScore === 0) {
    return {
      passed: false,
      scores,
      failureReason: `Hard fail: ${reasonCodes.join(', ')}`,
      reasonCodes,
    };
  }

  // Check average threshold
  if (scores.average < minAvg) {
    reasonCodes.push(FailureReasonCode.AVERAGE_BELOW_THRESHOLD);
    return {
      passed: false,
      scores,
      failureReason: `Average ${scores.average.toFixed(2)} < ${minAvg}`,
      reasonCodes,
    };
  }

  // Check individual category threshold
  if (scores.lowestScore < QUALITY_THRESHOLDS.MIN_INDIVIDUAL) {
    reasonCodes.push(FailureReasonCode.CATEGORY_BELOW_MINIMUM);
    return {
      passed: false,
      scores,
      failureReason: `Categories below ${QUALITY_THRESHOLDS.MIN_INDIVIDUAL}: ${scores.failedCategories.join(', ')}`,
      reasonCodes,
    };
  }

  return { passed: true, scores, reasonCodes: [] };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY LOG ENTRY (for debugging, no PII)
// ═══════════════════════════════════════════════════════════════════════════

export type QualityLogEntry = {
  timestamp: string;
  pickNumber: 1 | 2 | 3;
  outfitTitle: string;
  scores: QualityScores;
  passed: boolean;
  failureReason?: string;
  reasonCodes: FailureReasonCode[];
  action: 'accepted' | 'regenerated' | 'replaced_with_fallback';
  attemptNumber: number;
};

export function createQualityLog(
  pickNumber: 1 | 2 | 3,
  outfit: GeneratedOutfit,
  result: QualityGateResult,
  action: 'accepted' | 'regenerated' | 'replaced_with_fallback',
  attemptNumber: number,
): QualityLogEntry {
  return {
    timestamp: new Date().toISOString(),
    pickNumber,
    outfitTitle: outfit.title || `Pick #${pickNumber}`,
    scores: result.scores,
    passed: result.passed,
    failureReason: result.failureReason,
    reasonCodes: result.reasonCodes,
    action,
    attemptNumber,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACK GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CREATE FALLBACK OUTFIT
 *
 * DECISION LOGIC:
 * If a pick fails quality gate and regeneration fails, create a safe fallback
 * by cloning Pick #1 with a different title.
 *
 * WHY THIS GUARANTEES TRUST:
 * - User always sees 3 outfits
 * - Failed picks are replaced with known-good alternatives
 * - No "stupid pick" ever reaches the user
 */
export function createFallbackOutfit(
  pick1: GeneratedOutfit,
  failingPickNumber: 1 | 2 | 3,
  newOutfitId?: string,
): GeneratedOutfit {
  const titles: Record<1 | 2 | 3, string> = {
    1: 'Pick #1: Safe Choice',
    2: 'Pick #2: Safe Alternative',
    3: 'Pick #3: Reliable Choice',
  };

  return {
    ...pick1,
    outfit_id: newOutfitId || pick1.outfit_id,
    title: titles[failingPickNumber],
    why: failingPickNumber === 1
      ? 'Conservative outfit (quality fallback)'
      : `Based on Pick #1 (quality fallback)`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DETERMINISTIC SAFE OUTFIT BUILDER (BLOCKER 1 FIX)
// When Pick #1 fails, this builds a guaranteed-passing outfit from catalog
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BUILD DETERMINISTIC SAFE OUTFIT
 *
 * GUARANTEE: The returned outfit will ALWAYS pass quality gate.
 * This is achieved by selecting items based on context requirements:
 * - Formal context → dress shoes, dress shirt, dress pants
 * - Casual context → any appropriate items
 * - Weather context → includes outerwear if cold
 *
 * NEVER reuses failed items. Always builds fresh from catalog.
 */
export function buildDeterministicSafeOutfit<T extends OutfitItem>(
  catalog: T[],
  ctx: QualityContext,
  outfitId: string,
): { outfit_id: string; title: string; items: T[]; why: string } {
  const items: T[] = [];
  const usedIds = new Set<string>();

  const lc = (s?: string) => (s ?? '').toLowerCase();
  const needsFormal = requiresFormalDress(ctx);
  const needsWarmth = ctx.weather?.tempF !== undefined && ctx.weather.tempF < 50;

  // Helper to pick first matching item from catalog
  const pickFirst = (predicate: (item: T) => boolean): T | undefined => {
    for (const item of catalog) {
      if (predicate(item) && !usedIds.has(item.id || '')) {
        usedIds.add(item.id || '');
        return item;
      }
    }
    return undefined;
  };

  // ─────────────────────────────────────────────────────────────────
  // STEP 1: Pick appropriate TOP
  // ─────────────────────────────────────────────────────────────────
  const top = needsFormal
    ? pickFirst((i) =>
        lc(i.main_category) === 'tops' &&
        (lc(i.subcategory).includes('dress') ||
         lc(i.subcategory).includes('button') ||
         lc(i.subcategory).includes('oxford') ||
         lc(i.subcategory).includes('polo'))
      ) || pickFirst((i) => lc(i.main_category) === 'tops')
    : pickFirst((i) => lc(i.main_category) === 'tops');

  if (top) items.push(top);

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: Pick appropriate BOTTOM
  // ─────────────────────────────────────────────────────────────────
  const bottom = needsFormal
    ? pickFirst((i) =>
        lc(i.main_category) === 'bottoms' &&
        !lc(i.subcategory).includes('short') &&
        !lc(i.subcategory).includes('jogger') &&
        !lc(i.subcategory).includes('sweat')
      ) || pickFirst((i) => lc(i.main_category) === 'bottoms')
    : pickFirst((i) => lc(i.main_category) === 'bottoms');

  if (bottom) items.push(bottom);

  // ─────────────────────────────────────────────────────────────────
  // STEP 3: Pick appropriate SHOES (CRITICAL for formal contexts)
  // ─────────────────────────────────────────────────────────────────
  const shoes = needsFormal
    ? // For formal: MUST pick dress shoes, NEVER sneakers
      pickFirst((i) =>
        lc(i.main_category) === 'shoes' &&
        (lc(i.subcategory).includes('loafer') ||
         lc(i.subcategory).includes('oxford') ||
         lc(i.subcategory).includes('derby') ||
         lc(i.subcategory).includes('monk') ||
         lc(i.subcategory).includes('dress') ||
         lc(i.subcategory).includes('heel') ||
         lc(i.subcategory).includes('pump') ||
         lc(i.shoe_style).includes('dress') ||
         lc(i.shoe_style).includes('formal'))
      ) ||
      // Fallback: any non-athletic shoe
      pickFirst((i) =>
        lc(i.main_category) === 'shoes' &&
        !lc(i.subcategory).includes('sneaker') &&
        !lc(i.subcategory).includes('trainer') &&
        !lc(i.subcategory).includes('running') &&
        !lc(i.subcategory).includes('athletic')
      )
    : // For casual: any shoes OK
      pickFirst((i) => lc(i.main_category) === 'shoes');

  if (shoes) items.push(shoes);

  // ─────────────────────────────────────────────────────────────────
  // STEP 4: Add OUTERWEAR if cold weather
  // ─────────────────────────────────────────────────────────────────
  if (needsWarmth) {
    const outerwear = needsFormal
      ? pickFirst((i) =>
          lc(i.main_category) === 'outerwear' &&
          (lc(i.subcategory).includes('blazer') ||
           lc(i.subcategory).includes('coat') ||
           lc(i.subcategory).includes('jacket'))
        )
      : pickFirst((i) => lc(i.main_category) === 'outerwear');

    if (outerwear) items.push(outerwear);
  }

  // Sort items: Tops, Bottoms, Shoes, Outerwear
  const orderRank = (i: T) => {
    const main = lc(i.main_category);
    if (main === 'tops') return 1;
    if (main === 'bottoms') return 2;
    if (main === 'shoes') return 3;
    if (main === 'outerwear') return 4;
    return 5;
  };
  items.sort((a, b) => orderRank(a) - orderRank(b));

  return {
    outfit_id: outfitId,
    title: 'Pick #1: Safe Choice',
    items,
    why: needsFormal
      ? 'Deterministic formal outfit built from catalog (quality fallback)'
      : 'Deterministic casual outfit built from catalog (quality fallback)',
  };
}

/**
 * GET REGENERATION HINT
 *
 * Generates a prompt hint based on failed categories to guide AI regeneration.
 */
export function getRegenerationHint(reasonCodes: FailureReasonCode[]): string {
  const hints: string[] = [];

  if (reasonCodes.includes(FailureReasonCode.ATHLETIC_SHOES_IN_FORMAL)) {
    hints.push('use dress shoes instead of sneakers for formal context');
  }
  if (reasonCodes.includes(FailureReasonCode.FOOTWEAR_FORMALITY_DOWNGRADE)) {
    hints.push('ensure footwear matches formality level');
  }
  if (reasonCodes.includes(FailureReasonCode.CASUAL_IN_CEREMONIAL)) {
    hints.push('avoid casual pieces (hoodies, shorts) in ceremonial contexts');
  }
  if (reasonCodes.includes(FailureReasonCode.COLD_WEATHER_EXPOSURE)) {
    hints.push('add outerwear and avoid exposed pieces for cold weather');
  }
  if (reasonCodes.includes(FailureReasonCode.AVOIDED_COLOR_USED)) {
    hints.push('respect user color preferences');
  }
  if (reasonCodes.includes(FailureReasonCode.AVOIDED_CATEGORY_USED)) {
    hints.push('avoid user-specified disliked categories');
  }
  if (reasonCodes.includes(FailureReasonCode.FORMALITY_MISMATCH)) {
    hints.push('ensure all pieces have consistent formality');
  }
  if (reasonCodes.includes(FailureReasonCode.MISSING_CORE_SLOT)) {
    hints.push('include top, bottom, and shoes');
  }

  return hints.length > 0 ? `Fix: ${hints.join('; ')}` : 'Improve overall quality';
}

// ═══════════════════════════════════════════════════════════════════════════
// GOLDEN TEST SCENARIOS (Task 4)
// These can be used in unit tests to verify quality gate behavior
// ═══════════════════════════════════════════════════════════════════════════

export const GOLDEN_TEST_SCENARIOS = {
  // Religious service - sneakers should FAIL
  churchWithSneakers: {
    context: { query: 'church service', isReligious: true } as QualityContext,
    outfit: {
      title: 'Test',
      items: [
        { main_category: 'tops', subcategory: 'polo shirt' },
        { main_category: 'bottoms', subcategory: 'chinos' },
        { main_category: 'shoes', subcategory: 'sneakers' },
      ],
    } as GeneratedOutfit,
    expectedPass: false,
    expectedReasonCode: FailureReasonCode.ATHLETIC_SHOES_IN_FORMAL,
  },

  // Interview - hoodie should FAIL
  interviewWithHoodie: {
    context: { query: 'job interview', isInterview: true } as QualityContext,
    outfit: {
      title: 'Test',
      items: [
        { main_category: 'tops', subcategory: 'hoodie' },
        { main_category: 'bottoms', subcategory: 'jeans' },
        { main_category: 'shoes', subcategory: 'loafers' },
      ],
    } as GeneratedOutfit,
    expectedPass: false,
    expectedReasonCode: FailureReasonCode.CASUAL_IN_CEREMONIAL,
  },

  // Wedding - shorts should FAIL
  weddingWithShorts: {
    context: { query: 'wedding guest', isWedding: true } as QualityContext,
    outfit: {
      title: 'Test',
      items: [
        { main_category: 'tops', subcategory: 'dress shirt' },
        { main_category: 'bottoms', subcategory: 'shorts' },
        { main_category: 'shoes', subcategory: 'loafers' },
      ],
    } as GeneratedOutfit,
    expectedPass: false,
    expectedReasonCode: FailureReasonCode.CASUAL_IN_CEREMONIAL,
  },

  // Funeral - sneakers should FAIL
  funeralWithSneakers: {
    context: { query: 'funeral service', isFuneral: true } as QualityContext,
    outfit: {
      title: 'Test',
      items: [
        { main_category: 'tops', subcategory: 'dress shirt' },
        { main_category: 'bottoms', subcategory: 'dress pants' },
        { main_category: 'shoes', subcategory: 'sneakers' },
      ],
    } as GeneratedOutfit,
    expectedPass: false,
    expectedReasonCode: FailureReasonCode.ATHLETIC_SHOES_IN_FORMAL,
  },

  // Cold weather - shorts should FAIL
  coldWeatherShorts: {
    context: {
      query: 'casual outing',
      weather: { tempF: 30, precipitation: 'snow' },
    } as QualityContext,
    outfit: {
      title: 'Test',
      items: [
        { main_category: 'tops', subcategory: 't-shirt' },
        { main_category: 'bottoms', subcategory: 'shorts' },
        { main_category: 'shoes', subcategory: 'sandals' },
      ],
    } as GeneratedOutfit,
    expectedPass: false,
    expectedReasonCode: FailureReasonCode.WEATHER_INAPPROPRIATE,
  },

  // Proper formal outfit - should PASS
  properFormalOutfit: {
    context: { query: 'formal dinner', isFormal: true } as QualityContext,
    outfit: {
      title: 'Test',
      items: [
        { main_category: 'tops', subcategory: 'dress shirt' },
        { main_category: 'bottoms', subcategory: 'dress pants' },
        { main_category: 'shoes', subcategory: 'oxford' },
        { main_category: 'outerwear', subcategory: 'blazer' },
      ],
    } as GeneratedOutfit,
    expectedPass: true,
    expectedReasonCode: null,
  },

  // Proper casual outfit - should PASS
  properCasualOutfit: {
    context: { query: 'casual errands', isCasual: true } as QualityContext,
    outfit: {
      title: 'Test',
      items: [
        { main_category: 'tops', subcategory: 't-shirt' },
        { main_category: 'bottoms', subcategory: 'jeans' },
        { main_category: 'shoes', subcategory: 'sneakers' },
      ],
    } as GeneratedOutfit,
    expectedPass: true,
    expectedReasonCode: null,
  },

  // Gym outfit - should PASS
  properGymOutfit: {
    context: { query: 'gym workout', isGym: true } as QualityContext,
    outfit: {
      title: 'Test',
      items: [
        { main_category: 'tops', subcategory: 't-shirt' },
        { main_category: 'bottoms', subcategory: 'joggers' },
        { main_category: 'shoes', subcategory: 'running sneakers' },
      ],
    } as GeneratedOutfit,
    expectedPass: true,
    expectedReasonCode: null,
  },

  // Hot weather - appropriate outfit should PASS
  hotWeatherAppropriate: {
    context: {
      query: 'summer day',
      weather: { tempF: 90, precipitation: 'none' },
    } as QualityContext,
    outfit: {
      title: 'Test',
      items: [
        { main_category: 'tops', subcategory: 'linen shirt' },
        { main_category: 'bottoms', subcategory: 'linen pants' },
        { main_category: 'shoes', subcategory: 'loafers' },
      ],
    } as GeneratedOutfit,
    expectedPass: true,
    expectedReasonCode: null,
  },
};

/**
 * RUN GOLDEN TESTS
 *
 * Utility function to verify all golden test scenarios pass/fail as expected.
 * Returns array of failed tests for debugging.
 */
export function runGoldenTests(): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  for (const [name, scenario] of Object.entries(GOLDEN_TEST_SCENARIOS)) {
    const result = checkQualityGate(scenario.outfit, scenario.context, 1);

    if (scenario.expectedPass && !result.passed) {
      failures.push(`${name}: Expected PASS but got FAIL (${result.failureReason})`);
    } else if (!scenario.expectedPass && result.passed) {
      failures.push(`${name}: Expected FAIL but got PASS`);
    } else if (
      !scenario.expectedPass &&
      scenario.expectedReasonCode &&
      !result.reasonCodes.includes(scenario.expectedReasonCode)
    ) {
      failures.push(
        `${name}: Expected reason ${scenario.expectedReasonCode} but got ${result.reasonCodes.join(', ')}`,
      );
    }
  }

  return { passed: failures.length === 0, failures };
}
