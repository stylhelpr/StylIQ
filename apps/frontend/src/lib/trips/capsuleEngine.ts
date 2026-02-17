import {
  DayWeather,
  TripActivity,
  TripCapsule,
  TripPackingItem,
  CapsuleOutfit,
  PackingGroup,
  TripWardrobeItem,
  CapsuleWarning,
  BackupSuggestion,
  TripStyleHints,
} from '../../types/trips';
import {PACKING_CATEGORY_ORDER} from './constants';
import {
  isSlot,
  getSlot,
  mapMainCategoryToSlot,
  type Slot,
  MAIN_CATEGORY_TO_SLOT,
} from '../categoryMapping';

import {filterEligibleItems, type Presentation as EligibilityPresentation} from './styleEligibility';
import {
  logInput,
  logWeatherAnalysis,
  logSlotDecision,
  logOverride,
  logOutput,
} from './logging/tripAI.logger';
import {ELITE_SCORING_TRIPS, ELITE_SCORING_TRIPS_V2, ELITE_SCORING_DEBUG} from '../elite/eliteFlags';
import {
  elitePostProcessOutfits,
  normalizeTripsOutfit,
  denormalizeTripsOutfit,
  deriveWardrobeStats,
  colorMatches,
} from '../elite/eliteScoring';

// Bump this whenever capsule logic changes to force auto-rebuild of stale stored capsules
export const CAPSULE_VERSION = 14;

// ── Trip Trace Instrumentation ──
const TRIP_TRACE = true;

type TripTraceEvent = {
  step: string;
  message: string;
  data?: any;
};

let tripTrace: TripTraceEvent[] = [];

function trace(step: string, message: string, data?: any) {
  tripTrace.push({step, message, data});
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  GLOBAL CLIMATE GATING (minimal layer)
// ══════════════════════════════════════════════════════════════════════════════

export type ClimateZone = 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot';
export type ActivityContext = 'city' | 'beach' | 'sport' | 'universal';
export type ActivityProfile = {formality: number; context: ActivityContext};
export type GarmentFlags = {
  isMinimalCoverage: boolean;
  isBeachContext: boolean;
  isCasualOnly: boolean;
  isFeminineOnly: boolean;
};

export function deriveClimateZone(dayWeather: DayWeather | undefined): ClimateZone {
  if (!dayWeather) return 'mild';
  const {lowF, highF} = dayWeather;
  if (lowF < 32) return 'freezing';
  if (lowF < 45) return 'cold';
  if (lowF < 55) return 'cool';
  if (lowF < 65 && highF < 75) return 'mild';
  if (highF < 85) return 'warm';
  return 'hot';
}

export function getActivityProfile(activity: TripActivity): ActivityProfile {
  switch (activity) {
    case 'Formal': return {formality: 3, context: 'city'};
    case 'Business': return {formality: 2, context: 'city'};
    case 'Dinner': return {formality: 2, context: 'city'};
    case 'Beach': return {formality: 0, context: 'beach'};
    case 'Active': return {formality: 0, context: 'sport'};
    case 'Sightseeing': return {formality: 1, context: 'universal'};
    case 'Casual': return {formality: 0, context: 'universal'};
    case 'Cold Weather': return {formality: 1, context: 'universal'};
    default: return {formality: 0, context: 'universal'};
  }
}

export function inferGarmentFlags(item: TripWardrobeItem): GarmentFlags {
  const sub = (item.subcategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const cat = item.main_category || '';

  // Minimal coverage: shorts, tank tops, sandals, flip-flops, swimwear
  const isShorts = sub.includes('shorts') || (name.includes('shorts') && !name.includes('short sleeve'));
  const isTankTop = (sub.includes('tank') && !name.includes('tank watch')) || name === 'tank top';
  const isSandal = sub.includes('sandal') || sub.includes('flip-flop') || name.includes('flip-flop');
  const isSwimwear = cat === 'Swimwear';
  const isMinimalCoverage = isShorts || isTankTop || isSandal || isSwimwear;

  // Beach context: Hawaiian shirts, board shorts, swimwear
  const isHawaiian = sub.includes('hawaiian') || name.includes('hawaiian') || name.includes('aloha');
  const isBoardShorts = sub.includes('board short') || (name.includes('board') && name.includes('short') && !name.includes('boardroom'));
  const isBeachContext = isHawaiian || isBoardShorts || isSwimwear;

  // Casual-only: items that should NEVER appear in Business/Dinner/Formal (formality >= 2)
  // Informal footwear
  const isSneaker = sub.includes('sneaker') || sub.includes('trainer') || name.includes('sneaker') || name.includes('trainer');
  const isAthleticShoe = sub.includes('athletic') || sub.includes('running shoe');
  const isWorkBoot = sub.includes('work boot') || sub.includes('hiking') || sub.includes('combat boot');
  const isSlide = sub === 'slides' || (sub.includes('slide') && !name.includes('slideshow'));
  const isEspadrille = sub.includes('espadrille');
  const isBoatShoe = sub.includes('boat shoe') || sub.includes('boat shoes');
  const isInformalShoe = isSneaker || isAthleticShoe || isWorkBoot || isSlide || isSandal || isEspadrille || isBoatShoe;
  // Informal tops / loungewear
  const isHoodie = sub.includes('hoodie') || sub.includes('sweatshirt') || (name.includes('hoodie') && !name.includes('hood ornament'));
  const isGraphicTee = (sub.includes('t-shirt') || sub.includes('tee')) && !sub.includes('dress shirt');
  const isCropTop = sub.includes('crop top') || sub.includes('crop');
  const isJogger = sub.includes('jogger') || sub.includes('sweatpant');
  const isCargo = sub.includes('cargo');
  const isLegging = sub.includes('legging');
  const isInformalTop = isHoodie || isGraphicTee || isCropTop || isJogger || isCargo || isLegging;
  // Casual outerwear (not suitable for Business/Formal)
  const isDenimJacket = sub.includes('denim jacket') || sub.includes('jean jacket');
  const isPuffer = sub.includes('puffer');
  const isCasualOuterwear = isDenimJacket || isPuffer;
  const isCasualOnly = isHawaiian || isSwimwear || isTankTop || isShorts || isInformalShoe || isInformalTop || isCasualOuterwear;

  // ── Feminine-only detection (HARD BLOCK for masculine users) ──
  // Clothing
  // "dress" as a garment (the noun) always appears at the END of the subcategory
  // ("wrap dress", "maxi dress", "sundress"), while "dress" as an adjective
  // appears at the START ("dress boots", "dress shoes", "dress shirt").
  const isDress = cat === 'Dresses' || sub.endsWith('dress');
  const isSkirt = cat === 'Skirts' || sub.includes('skirt') && !name.includes('skirt steak');
  const isBlouse = sub.includes('blouse');
  const isGown = sub.includes('gown');
  // Shoes
  const isHeels = sub.includes('heel') && !name.includes('heel tab') || sub.includes('stiletto') || sub.includes('pump') || sub.includes('slingback') || sub.includes('mary jane');
  const isBalletFlat = sub.includes('ballet flat') || (name.includes('ballet') && name.includes('flat'));
  // Jewelry/Accessories
  const isEarring = sub.includes('earring') || name.includes('earring');
  const isBracelet = sub.includes('bracelet') || name.includes('bracelet');
  const isAnklet = sub.includes('anklet') || name.includes('anklet');
  const isPurse = sub.includes('purse') || sub.includes('handbag') || sub.includes('clutch') || name.includes('purse') || name.includes('handbag');

  const isFeminineOnly = isDress || isSkirt || isBlouse || isGown || isHeels || isBalletFlat || isEarring || isBracelet || isAnklet || isPurse;

  return {isMinimalCoverage, isBeachContext, isCasualOnly, isFeminineOnly};
}

/** Token-based open-footwear detection (sandals, flip-flops, slides, thongs). */
export function isOpenFootwear(item: {name?: string; subcategory?: string}): boolean {
  const text = `${item.subcategory ?? ''} ${item.name ?? ''}`.toLowerCase();
  return /\b(sandals?|flip[- ]?flops?|slides?|thongs?)\b/.test(text);
}

export function gatePool(
  items: TripWardrobeItem[],
  climateZone: ClimateZone,
  activity: ActivityProfile,
  presentation: 'masculine' | 'feminine' | 'mixed' = 'mixed',
): TripWardrobeItem[] {
  const isColdOrFreezing = climateZone === 'cold' || climateZone === 'freezing';
  const isFormalActivity = activity.formality >= 2;
  const isCityContext = activity.context === 'city';
  const isMasculine = presentation === 'masculine';

  return items.filter(item => {
    const flags = inferGarmentFlags(item);

    const isShoe = mapMainCategoryToSlot(item.main_category ?? '') === 'shoes';

    // RULE 0 (FIRST CHECK): Block feminine-only items for masculine users — NO EXCEPTIONS
    if (isMasculine && flags.isFeminineOnly) {
      if (__DEV__ && isShoe) {
        console.log(`[TripCapsule][GATE_SHOE] REJECT ${item.name} (${item.id}) | gate=presentation | isFeminineOnly=true`);
      }
      return false;
    }

    // Rule 1: Block minimal coverage in cold/freezing
    if (isColdOrFreezing && flags.isMinimalCoverage) {
      if (__DEV__ && isShoe) {
        console.log(`[TripCapsule][GATE_SHOE] REJECT ${item.name} (${item.id}) | gate=climate_minimal | zone=${climateZone} isMinimalCoverage=true`);
      }
      return false;
    }

    // Rule 2: Block beach-context items for business/formal/dinner (city context + formal)
    if (isFormalActivity && isCityContext && flags.isBeachContext) {
      if (__DEV__ && isShoe) {
        console.log(`[TripCapsule][GATE_SHOE] REJECT ${item.name} (${item.id}) | gate=beach_context | formality=${activity.formality}`);
      }
      return false;
    }

    // Rule 3: Block casual-only items for formal activities
    if (isFormalActivity && flags.isCasualOnly) {
      if (__DEV__ && isShoe) {
        console.log(`[TripCapsule][GATE_SHOE] REJECT ${item.name} (${item.id}) | gate=casual_only | formality=${activity.formality} isCasualOnly=true sub=${item.subcategory}`);
      }
      return false;
    }

    if (__DEV__ && isShoe) {
      console.log(`[TripCapsule][GATE_SHOE] PASS ${item.name} (${item.id}) | zone=${climateZone} formality=${activity.formality} presentation=${presentation}`);
    }

    return true;
  });
}

/**
 * Conservative default for items missing formalityScore metadata.
 * 30 passes casual trips (floor 0) but fails business/formal (floor 40/50),
 * forcing proper classification and preventing unclassified junk in backups.
 */
const DEFAULT_UNKNOWN_FORMALITY = 30;

/**
 * Single source of truth for an item's effective formality score (0–100).
 * Replaces all scattered `item.formalityScore ?? DEFAULT_UNKNOWN_FORMALITY`
 * and `item.formalityScore ?? 50` patterns.
 */
export function getNormalizedFormality(item: TripWardrobeItem): number {
  return item.formalityScore ?? DEFAULT_UNKNOWN_FORMALITY;
}

/**
 * Derive the minimum formality tier an item needs to be acceptable for a trip.
 * Returns a value in the same 0–3 tier space as getFormalityTier().
 *   activity 0–1 (Casual/Sightseeing/Active): tier 0 (all items pass)
 *   activity 2   (Business/Dinner):           tier 1
 *   activity 3   (Formal):                    tier 2
 */
function tripFormalityFloor(activities: TripActivity[]): number {
  const max = Math.max(...activities.map(a => getActivityProfile(a).formality));
  return max >= 3 ? 2 : max >= 2 ? 1 : 0;
}

/**
 * Trip-wide backup pool gate (strict).
 * Uses only universal, metadata-driven gates — no garment-name lists.
 */
export function gateBackupPool(
  items: TripWardrobeItem[],
  activities: TripActivity[],
  weather: DayWeather[],
  presentation: 'masculine' | 'feminine' | 'mixed',
  provenFitIds: ReadonlySet<string> = new Set(),
): TripWardrobeItem[] {
  const requiredTier = tripFormalityFloor(activities);
  const tripLowF = Math.min(...weather.map(d => d.lowF));
  const tripHighF = Math.max(...weather.map(d => d.highF));
  const isMasculine = presentation === 'masculine';

  return items.filter(item => {
    const flags = inferGarmentFlags(item);
    const isShoe = mapMainCategoryToSlot(item.main_category ?? '') === 'shoes';
    const itemTier = getFormalityTier(item);

    // GATE 1 — Presentation (never relax)
    if (isMasculine && flags.isFeminineOnly) {
      if (__DEV__ && isShoe) {
        console.log(`[TripCapsule][GATE_BACKUP_SHOE] REJECT ${item.name} (${item.id}) | gate=presentation | isFeminineOnly=true`);
      }
      return false;
    }

    /// GATE 2 — Trip-incompatible casual (tier-based)
    // Items that were used in anchor/support outfits already passed gatePool's
    // per-outfit formality check — they are proven-fit. Only apply the tier-
    // based formality floor to unused items that haven't been validated yet.
    if (!provenFitIds.has(item.id) && requiredTier > 0 && itemTier < requiredTier) {
      if (__DEV__ && isShoe) {
        console.log(`[TripCapsule][GATE_BACKUP_SHOE] REJECT ${item.name} (${item.id}) | gate=formality | formalityScore=${item.formalityScore} itemTier=${itemTier} requiredTier=${requiredTier}`);
      }
      return false;
    }

    // GATE 3 — Climate (±15°F tolerance)
    const sweetMin = item.climateSweetspotFMin;
    const sweetMax = item.climateSweetspotFMax;
    if (sweetMin != null && sweetMax != null) {
      if (sweetMax < tripLowF - 15 || sweetMin > tripHighF + 15) {
        if (__DEV__ && isShoe) {
          console.log(`[TripCapsule][GATE_BACKUP_SHOE] REJECT ${item.name} (${item.id}) | gate=climate | sweetspot=${sweetMin}-${sweetMax} tripRange=${tripLowF}-${tripHighF}`);
        }
        return false;
      }
    }

    if (__DEV__ && isShoe) {
      console.log(`[TripCapsule][GATE_BACKUP_SHOE] PASS ${item.name} (${item.id}) | tier=${itemTier}/${requiredTier} climate=${sweetMin ?? '?'}-${sweetMax ?? '?'}/${tripLowF}-${tripHighF}`);
    }

    return true;
  });
}

/**
 * Fallback backup pool gate. Relaxes ONLY climate tolerance (±25°F).
 * Presentation and formality gates are never relaxed.
 */
export function gateBackupPoolFallback(
  items: TripWardrobeItem[],
  activities: TripActivity[],
  weather: DayWeather[],
  presentation: 'masculine' | 'feminine' | 'mixed',
  provenFitIds: ReadonlySet<string> = new Set(),
): TripWardrobeItem[] {
  const requiredTier = tripFormalityFloor(activities);
  const tripLowF = Math.min(...weather.map(d => d.lowF));
  const tripHighF = Math.max(...weather.map(d => d.highF));
  const isMasculine = presentation === 'masculine';

  return items.filter(item => {
    const flags = inferGarmentFlags(item);
    const isShoe = mapMainCategoryToSlot(item.main_category ?? '') === 'shoes';
    const itemTier = getFormalityTier(item);

    // GATE 1 — Presentation (never relax)
    if (isMasculine && flags.isFeminineOnly) {
      if (__DEV__ && isShoe) {
        console.log(`[TripCapsule][GATE_FALLBACK_SHOE] REJECT ${item.name} (${item.id}) | gate=presentation`);
      }
      return false;
    }

    // GATE 2 — Trip-incompatible casual (tier-based, never relax for unproven items)
    // Proven-fit items (used in outfits) bypass — they passed gatePool already.
    if (!provenFitIds.has(item.id) && requiredTier > 0 && itemTier < requiredTier) {
      if (__DEV__ && isShoe) {
        console.log(`[TripCapsule][GATE_FALLBACK_SHOE] REJECT ${item.name} (${item.id}) | gate=formality | formalityScore=${item.formalityScore} itemTier=${itemTier} requiredTier=${requiredTier}`);
      }
      return false;
    }

    // GATE 3 — Climate (relaxed: ±25°F tolerance)
    const sweetMin = item.climateSweetspotFMin;
    const sweetMax = item.climateSweetspotFMax;
    if (sweetMin != null && sweetMax != null) {
      if (sweetMax < tripLowF - 25 || sweetMin > tripHighF + 25) {
        if (__DEV__ && isShoe) {
          console.log(`[TripCapsule][GATE_FALLBACK_SHOE] REJECT ${item.name} (${item.id}) | gate=climate | sweetspot=${sweetMin}-${sweetMax} tripRange=${tripLowF}-${tripHighF}`);
        }
        return false;
      }
    }

    if (__DEV__ && isShoe) {
      console.log(`[TripCapsule][GATE_FALLBACK_SHOE] PASS ${item.name} (${item.id}) | tier=${itemTier}/${requiredTier}`);
    }

    return true;
  });
}

export type RebuildMode = 'AUTO' | 'FORCE';

export function shouldRebuildCapsule(
  capsule: TripCapsule | undefined,
  engineVersion: number,
  presentation: 'masculine' | 'feminine' | 'mixed',
  fingerprint?: string,
  mode: RebuildMode = 'AUTO',
): {rebuild: boolean; reason: string; mode: RebuildMode} {

  // FORCE mode: always rebuild
  if (mode === 'FORCE') {
    return { rebuild: true, reason: 'FORCE_REBUILD', mode: 'FORCE' };
  }

  if (!capsule) {
    return { rebuild: true, reason: 'NO_CAPSULE', mode: 'AUTO' };
  }

  const version = capsule.version ?? 0;

  // Version mismatch → rebuild
  if (version !== engineVersion) return {rebuild: true, reason: 'VERSION_MISMATCH', mode: 'AUTO'};

  // Fingerprint mismatch → inputs changed
  if (fingerprint && capsule.fingerprint !== fingerprint) {
    return {rebuild: true, reason: 'FINGERPRINT_MISMATCH', mode: 'AUTO'};
  }

  // SAFETY: masculine capsule must NEVER contain dresses
  if (presentation === 'masculine') {
    const hasDress = capsule.outfits.some(o =>
      o.items.some(i => CATEGORY_MAP[i.mainCategory] === 'dresses'),
    );
    if (hasDress) {
      if (__DEV__) {
        console.warn(
          '[TripCapsule] forcing rebuild: masculine capsule contains dresses',
        );
      }
      return {rebuild: true, reason: 'DRESS_LEAK', mode: 'AUTO'};
    }
  }

  return {rebuild: false, reason: 'UP_TO_DATE', mode: 'AUTO'};
}

export function buildCapsuleFingerprint(
  wardrobe: TripWardrobeItem[],
  weather: DayWeather[],
  activities: TripActivity[],
  location: string,
  presentation?: Presentation,
  styleHints?: TripStyleHints,
): string {
  return JSON.stringify({
    wardrobe: wardrobe.map(w => w.id).sort(),
    weather: weather.map(d => `${d.date}:${d.highF}:${d.lowF}:${d.condition}`),
    activities: [...activities].sort(),
    location,
    presentation: presentation || 'mixed',
    ...(styleHints ? {styleHints} : {}),
  });
}

// ── Wardrobe adapter ──

/**
 * Adapts a raw wardrobe item (mixed camelCase/snake_case from API)
 * into the TripWardrobeItem shape.
 */
let __brandFitProbeLogged = false;
export function adaptWardrobeItem(item: any): TripWardrobeItem {
  if (__DEV__ && !__brandFitProbeLogged) {
    __brandFitProbeLogged = true;
    console.log('[Trips] brand/fit probe:', { brand: item.brand ?? '(missing)', fit: item.fit ?? '(missing)' });
  }
  return {
    id: item.id,
    image_url: item.image_url || item.image,
    thumbnailUrl: item.thumbnailUrl,
    processedImageUrl: item.processedImageUrl || item.processed_image_url,
    touchedUpImageUrl: item.touchedUpImageUrl || item.touched_up_image_url,
    name: item.name || item.aiTitle || 'Unknown Item',
    color: item.color,
    main_category: item.main_category || item.mainCategory,
    subcategory: item.subcategory || item.subCategory,
    material: item.material,
    seasonality: item.seasonality,
    thermalRating: item.thermalRating ?? item.thermal_rating,
    breathability: item.breathability,
    rainOk: item.rainOk ?? item.rain_ok,
    climateSweetspotFMin:
      item.climateSweetspotFMin ?? item.climate_sweetspot_f_min,
    climateSweetspotFMax:
      item.climateSweetspotFMax ?? item.climate_sweetspot_f_max,
    layering: item.layering,
    occasionTags: item.occasionTags || item.occasion_tags,
    dressCode: item.dressCode || item.dress_code,
    formalityScore: item.formalityScore ?? item.formality_score,
    brand: item.brand,
    fit: item.fit,
  };
}

// ── Helpers ──

function getImageUrl(item: TripWardrobeItem): string {
  return (
    item.processedImageUrl ||
    item.touchedUpImageUrl ||
    item.thumbnailUrl ||
    item.image_url ||
    ''
  );
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Category bucketing ──
// Uses canonical mapping from src/lib/categoryMapping.ts
// which is synced with backend: apps/backend-nest/src/wardrobe/logic/categoryMapping.ts

/**
 * CategoryBucket is now an alias for Slot from the canonical mapping.
 * This type is kept for backward compatibility with existing code.
 */
type CategoryBucket = Slot;

/**
 * CATEGORY_MAP - Re-exported from canonical categoryMapping.ts
 * DO NOT modify - this is the single source of truth.
 */
const CATEGORY_MAP = MAIN_CATEGORY_TO_SLOT as Record<string, CategoryBucket>;

function getBucket(item: TripWardrobeItem): CategoryBucket | null {
  const cat = item.main_category;
  if (!cat) return null;
  return mapMainCategoryToSlot(cat);
}

// ── Weather analysis ──

type WeatherNeeds = {
  needsWarmLayer: boolean;
  needsRainLayer: boolean;
  isHot: boolean;
  isCold: boolean;
};

function analyzeWeather(weather: DayWeather[]): WeatherNeeds {
  if (weather.length === 0) {
    return {
      needsWarmLayer: false,
      needsRainLayer: false,
      isHot: false,
      isCold: false,
    };
  }
  return {
    needsWarmLayer: weather.some(d => d.lowF < 55),
    needsRainLayer: weather.some(d => d.rainChance > 50),
    isHot: weather.some(d => d.highF > 80),
    isCold: weather.some(d => d.lowF < 55),
  };
}

// ── Activity scoring ──

function activityScore(
  item: TripWardrobeItem,
  activities: TripActivity[],
): number {
  let score = 0;
  const occasions = (item.occasionTags || []).map(t => t.toLowerCase());
  const dressCode = (item.dressCode || '').toLowerCase();
  const formality = getNormalizedFormality(item);

  for (const activity of activities) {
    switch (activity) {
      case 'Business':
        if (dressCode.includes('business') || formality >= 70) score += 2;
        break;
      case 'Formal':
        if (
          dressCode.includes('black') ||
          dressCode.includes('formal') ||
          formality >= 80
        )
          score += 2;
        break;
      case 'Dinner':
        if (occasions.includes('datenight') || formality >= 50) score += 1;
        break;
      case 'Casual':
        if (dressCode.includes('casual') || formality < 50) score += 1;
        break;
      case 'Beach':
        if (isSlot(item, 'swimwear')) score += 3;
        break;
      case 'Active':
        if (isSlot(item, 'activewear') || occasions.includes('gym')) score += 2;
        break;
      case 'Sightseeing':
        if (dressCode.includes('casual') || dressCode.includes('smart'))
          score += 1;
        break;
      case 'Cold Weather':
        if (isSlot(item, 'outerwear')) score += 2;
        if ((item.thermalRating ?? 0) > 60) score += 1;
        break;
    }
  }
  return score;
}

// ── Item adapter ──

function toPackingItem(
  item: TripWardrobeItem,
  locationLabel: string,
): TripPackingItem {
  return {
    id: `trip_${item.id}`,
    wardrobeItemId: item.id,
    name: item.name || 'Unknown Item',
    imageUrl: getImageUrl(item),
    color: item.color,
    mainCategory: item.main_category || 'Other',
    subCategory: item.subcategory,
    locationLabel,
    packed: false,
  };
}

// ── Day scheduling ──

type DaySchedule = {
  primary: TripActivity;
  secondary: TripActivity | null;
};

function isWeekday(dayLabel: string | undefined): boolean {
  if (!dayLabel) return false;
  const short = dayLabel.substring(0, 3);
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(short);
}

function planDaySchedules(
  activities: TripActivity[],
  weather: DayWeather[],
  numDays: number,
): DaySchedule[] {
  const has = new Set(activities);
  const schedules: DaySchedule[] = [];

  for (let day = 0; day < numDays; day++) {
    let primary: TripActivity | null = null;
    let secondary: TripActivity | null = null;
    const dayLabel = weather[day]?.dayLabel;

    // Determine PRIMARY (priority cascade — only from user-selected activities)
    if (has.has('Formal') && day === numDays - 1) {
      primary = 'Formal';
    } else if (has.has('Business') && isWeekday(dayLabel)) {
      primary = 'Business';
    } else if (has.has('Beach') && day % 2 === 0) {
      primary = 'Beach';
    } else if (has.has('Active') && (day - 1) % 3 === 0 && day > 0) {
      primary = 'Active';
    }

    // Fallback: cycle through user-selected activities (NEVER invent Casual)
    if (!primary) {
      primary = activities[day % activities.length];
    }

    // Determine SECONDARY
    if (primary === 'Beach' || primary === 'Active') {
      if (has.has('Formal') && day === numDays - 1) {
        secondary = 'Formal';
      } else if (has.has('Dinner') && day % 2 === 1) {
        secondary = 'Dinner';
      }
    } else if (primary === 'Business') {
      if (has.has('Active') && (day - 1) % 3 === 0) {
        secondary = 'Active';
      } else if (has.has('Dinner') && day % 2 === 1) {
        secondary = 'Dinner';
      }
    } else if (primary === 'Casual') {
      if (has.has('Dinner') && day % 2 === 1) {
        secondary = 'Dinner';
      }
    }

    schedules.push({primary, secondary});
  }

  return schedules;
}

// ── Outfit building helpers ──

function pickOuterwear(
  outerwear: TripWardrobeItem[],
  dayWeather: DayWeather | undefined,
  items: TripPackingItem[],
  locationLabel: string,
  usageTracker: Map<string, number[]>,
  dayIndex: number,
  numDays: number,
): void {
  if (outerwear.length === 0 || !dayWeather) return;
  if (dayWeather.lowF < 55 || dayWeather.rainChance > 50) {
    // Prefer rain-ready item if rainy
    const candidates = dayWeather.rainChance > 50
      ? [outerwear.find(i => i.rainOk), ...outerwear].filter(Boolean) as TripWardrobeItem[]
      : outerwear;
    const maxUses = Math.ceil(numDays / outerwear.length) + 1;
    const result = weightedPick(candidates, usageTracker, dayIndex, maxUses);
    if (result) {
      items.push(toPackingItem(result.picked, locationLabel));
    }
  }
}

function isUpperActivewear(item: TripWardrobeItem): boolean {
  const sub = (item.subcategory || '').toLowerCase();
  return (
    sub.includes('bra') ||
    sub.includes('tank') ||
    sub.includes('tee') ||
    sub.includes('top') ||
    sub.includes('jersey') ||
    sub.includes('jacket')
  );
}

// ── Diversity + Rotation (applied POST-GATE) ──

type CandidateInfo = {
  item: TripWardrobeItem;
  penalty: number;
  useCount: number;
  cooldownPenalty: number;
};

type AlternateItem = {
  id: string;
  name: string;
  reason: string;
};

/**
 * Produces a human-readable reason explaining why an alternate was
 * not selected over the chosen item.  Deterministic — no LLM calls.
 */
function explainAlternate(alt: CandidateInfo, chosen: CandidateInfo): string {
  if (alt.useCount > chosen.useCount) {
    return `Used ${alt.useCount}× already (vs ${chosen.useCount}×)`;
  }
  if (alt.cooldownPenalty > 0 && alt.cooldownPenalty > chosen.cooldownPenalty) {
    return 'Worn more recently — cooling down';
  }
  if (alt.penalty > chosen.penalty) {
    return `Rotation penalty ${alt.penalty} vs ${chosen.penalty}`;
  }
  return 'Equally viable option';
}

/**
 * Attaches up to `maxAlts` alternate items to the most-recently
 * pushed TripPackingItem.  Uses the scored candidate list from
 * weightedPick to find the next-best options.
 */
function annotateLastPick(
  items: TripPackingItem[],
  candidates: CandidateInfo[],
  maxAlts: number = 2,
): void {
  if (items.length === 0 || candidates.length < 2) return;
  const picked = items[items.length - 1];
  const chosenId = picked.wardrobeItemId;

  const chosenInfo = candidates.find(c => c.item.id === chosenId);
  if (!chosenInfo) return;

  const alts: AlternateItem[] = [];
  for (const alt of candidates) {
    if (alt.item.id === chosenId) continue;
    if (alts.length >= maxAlts) break;
    alts.push({
      id: alt.item.id,
      name: alt.item.name || 'Unknown',
      reason: explainAlternate(alt, chosenInfo),
    });
  }

  if (alts.length > 0) {
    (picked as any).alternates = alts;

    if (__DEV__) {
      console.log(
        `[TripCapsule][ALTERNATES] ${picked.name}: ` +
        alts.map(a => `${a.name} (${a.reason})`).join(', '),
      );
    }
  }
}

// ── Weighted pick (replaces all modulo item selection) ──

type WeightedPickResult = {
  picked: TripWardrobeItem;
  runners: CandidateInfo[];
};

// ── Anchor Budget: caps how often a shoe can be the daily anchor ──

type AnchorBudget = Map<string, number>;

function computeAnchorBudget(viableAnchorIds: string[], totalDays: number): AnchorBudget {
  const budget: AnchorBudget = new Map();
  if (viableAnchorIds.length === 0) return budget;
  const maxPer = Math.ceil(totalDays / viableAnchorIds.length);
  for (const id of viableAnchorIds) budget.set(id, maxPer);
  return budget;
}

/**
 * Scores candidates and picks the best item. NO modulo rotation.
 *
 * Score = qualityScore * 10 - timesUsed * 20 - recentlyUsedPenalty
 *
 * qualityFn: optional per-item quality score (defaults to 0).
 *            For outfit building: activityScore(item, activities).
 *            For reserves: compatibleDays.
 */
function weightedPick(
  candidates: TripWardrobeItem[],
  usageTracker: Map<string, number[]>,
  dayIndex: number,
  maxUsesPerItem: number,
  qualityFn?: (item: TripWardrobeItem) => number,
  debugLabel?: string,
): WeightedPickResult | null {
  if (candidates.length === 0) return null;

  // 1. Filter items exceeding max uses
  let eligible = candidates.filter(item => {
    const uses = (usageTracker.get(item.id) || []).length;
    return uses < maxUsesPerItem;
  });
  if (eligible.length === 0) eligible = [...candidates]; // safety reset

  // 2. Score each candidate
  const scored: CandidateInfo[] = eligible.map(item => {
    const uses = usageTracker.get(item.id) || [];
    const useCount = uses.length;
    const lastUsedDay = uses.length > 0 ? uses[uses.length - 1] : -Infinity;
    const daysSinceUse = dayIndex - lastUsedDay;
    const cooldownPenalty =
      daysSinceUse <= 1 ? 25 :
      daysSinceUse === 2 ? 12 :
      daysSinceUse === 3 ? 5 : 0;
    const quality = qualityFn ? qualityFn(item) : 0;
    const penalty = -(quality * 10) + useCount * 14 + cooldownPenalty;
    return { item, penalty, useCount, cooldownPenalty };
  });

  // 3. Sort by penalty ascending (lowest = best) — id tiebreak for determinism
  scored.sort((a, b) => a.penalty - b.penalty || a.item.id.localeCompare(b.item.id));

  if (__DEV__ && debugLabel) {
    const top = scored[0];
    console.log(
      `[TripCapsule][WPICK] day=${dayIndex} ${debugLabel}: ` +
      `picked=${top.item.name}(${top.item.id}) penalty=${top.penalty} ` +
      `uses=${top.useCount} cooldown=${top.cooldownPenalty}`,
    );
  }

  return { picked: scored[0].item, runners: scored };
}

// ── Tiered Candidate Pool Selection ──

/** Returns true if item color matches any palette color. */
function matchesPalette(item: TripWardrobeItem, paletteColors: string[]): boolean {
  if (!item.color || paletteColors.length === 0) return false;
  const words = item.color.toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
  return words.some(w => paletteColors.some(p => colorMatches(w, p)));
}

/** Returns true if item color is entirely neutral (anchors any palette). */
function isNeutralColor(item: TripWardrobeItem): boolean {
  if (!item.color) return true; // no color info → treat as neutral (safe default)
  const words = item.color.toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
  return words.length > 0 && words.every(w => AESTHETIC_NEUTRALS.includes(w));
}

// ── Taste Gate (personal color veto — pre-selection filter) ──

function violatesAvoidColor(item: TripWardrobeItem, avoidColors: string[]): boolean {
  if (!item.color) return false;
  const words = item.color.toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
  return words.some(w => avoidColors.some(a => colorMatches(w, a)));
}

function applyTasteGate(
  candidates: TripWardrobeItem[],
  avoidColors?: string[],
): TripWardrobeItem[] {
  if (!avoidColors || avoidColors.length === 0) return candidates;
  const allowed = candidates.filter(i => !violatesAvoidColor(i, avoidColors));
  if (__DEV__ && candidates.length !== allowed.length) {
    console.log('[TASTE_GATE] filtered avoided colors', candidates.length, '→', allowed.length);
  }
  // Emergency fallback: only if every option is avoided
  if (allowed.length === 0) return candidates;
  return allowed;
}

/** Returns true if item matches fabric or fit preferences. */
function matchesFabricOrFit(item: TripWardrobeItem, styleHints?: TripStyleHints): boolean {
  if (!styleHints) return false;
  if (item.material && styleHints.fabric_preferences?.length) {
    const matLower = item.material.toLowerCase();
    if (styleHints.fabric_preferences.some(f =>
      matLower.includes(f.toLowerCase()) || f.toLowerCase().includes(matLower),
    )) return true;
  }
  if (item.fit && styleHints.fit_preferences?.length) {
    const fitLower = item.fit.toLowerCase();
    if (styleHints.fit_preferences.some(f => fitLower === f.toLowerCase())) return true;
  }
  return false;
}

/** Returns true if item matches a disliked style (soft-avoid). */
function matchesDisliked(item: TripWardrobeItem, styleHints?: TripStyleHints): boolean {
  if (!styleHints?.disliked_styles?.length) return false;
  const subLower = (item.subcategory || '').toLowerCase();
  const nameLower = (item.name || '').toLowerCase();
  return styleHints.disliked_styles.some(d => {
    const dl = d.toLowerCase();
    return (subLower && subLower.includes(dl)) || (nameLower && nameLower.includes(dl));
  });
}

/**
 * Tiered candidate selection: PRIMARY → SECONDARY → FALLBACK.
 * Style drives selection before reuse scoring.
 */
function tieredPick(
  candidates: TripWardrobeItem[],
  capsuleIntent: CapsuleIntent,
  styleHints: TripStyleHints | undefined,
  usageTracker: Map<string, number[]>,
  dayIndex: number,
  maxUsesPerItem: number,
  qualityFn?: (item: TripWardrobeItem) => number,
  debugLabel?: string,
  toleranceIds?: ReadonlySet<string>,
): WeightedPickResult | null {
  if (candidates.length === 0) return null;

  // Split into tiers
  const primary: TripWardrobeItem[] = [];
  const secondary: TripWardrobeItem[] = [];
  const fallback: TripWardrobeItem[] = [];

  for (const item of candidates) {
    // Tolerance candidates: force to SECONDARY (formality soft-fail)
    if (toleranceIds?.has(item.id)) {
      secondary.push(item);
      continue;
    }
    const onPalette = matchesPalette(item, capsuleIntent.paletteColors);
    const avoided = matchesDisliked(item, styleHints);
    const neutral = isNeutralColor(item);
    const fabricFitMatch = matchesFabricOrFit(item, styleHints);

    if (onPalette && !avoided) {
      primary.push(item);
    } else if (neutral || fabricFitMatch) {
      secondary.push(item);
    } else {
      fallback.push(item);
    }
  }

  if (TRIP_TRACE) trace('tiered_pick', `Pool split: ${debugLabel ?? 'unknown'}`, {
    debugLabel, dayIndex,
    primaryCount: primary.length,
    secondaryCount: secondary.length,
    fallbackCount: fallback.length,
    primaryIds: primary.map(i => i.id),
    secondaryIds: secondary.map(i => i.id),
    fallbackIds: fallback.map(i => i.id),
  });

  if (__DEV__ && debugLabel) {
    console.log(
      `[TripCapsule][TIERED] day=${dayIndex} ${debugLabel}: ` +
      `primary=${primary.length} secondary=${secondary.length} fallback=${fallback.length}`,
    );
  }

  // Try PRIMARY first
  let result = primary.length > 0
    ? weightedPick(primary, usageTracker, dayIndex, maxUsesPerItem, qualityFn, debugLabel ? `${debugLabel}/P` : undefined)
    : null;
  if (result) return result;

  // Then SECONDARY
  result = secondary.length > 0
    ? weightedPick(secondary, usageTracker, dayIndex, maxUsesPerItem, qualityFn, debugLabel ? `${debugLabel}/S` : undefined)
    : null;
  if (result) return result;

  // Then FALLBACK (everything that passed safety)
  return weightedPick(fallback, usageTracker, dayIndex, maxUsesPerItem, qualityFn, debugLabel ? `${debugLabel}/F` : undefined);
}

// ── Aesthetic tie-breaker for outfit building ──

const AESTHETIC_NEUTRALS = ['black','white','gray','grey','beige','cream','tan','khaki',
  'ivory','charcoal','taupe','brown','nude','navy'];
const AESTHETIC_BOLDS = ['red','orange','yellow','purple'];
const AESTHETIC_WARM = ['red','orange','yellow','coral','peach','gold','amber','rust'];
const AESTHETIC_COOL = ['blue','teal','cyan','mint','lavender','periwinkle','ice','cobalt','slate'];

export function aestheticBonus(
  candidate: TripWardrobeItem,
  existingItems: TripPackingItem[],
  itemLookup: Map<string, TripWardrobeItem>,
): number {
  let bonus = 0;
  const words = (candidate.color || '').toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);

  const outfitColors: string[] = existingItems.flatMap(pi => {
    const full = itemLookup.get(pi.wardrobeItemId);
    return (full?.color || '').toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
  });

  // +0.3: neutral color grounds outfit
  if (words.some(w => AESTHETIC_NEUTRALS.includes(w))) bonus += 0.3;

  // -0.5: bold-on-bold clash (>1 bold family across outfit + candidate)
  if (outfitColors.length > 0) {
    const existingBolds = new Set(outfitColors.filter(w => AESTHETIC_BOLDS.includes(w)));
    const candidateBolds = words.filter(w => AESTHETIC_BOLDS.includes(w));
    if (existingBolds.size >= 1 && candidateBolds.length > 0) {
      const combined = new Set([...existingBolds, ...candidateBolds]);
      if (combined.size > 1) bonus -= 0.5;
    }
  }

  // -0.3: warm+cool without neutral
  const allWords = [...outfitColors, ...words];
  const hasWarm = allWords.some(w => AESTHETIC_WARM.includes(w));
  const hasCool = allWords.some(w => AESTHETIC_COOL.includes(w));
  const hasNeutral = allWords.some(w => AESTHETIC_NEUTRALS.includes(w));
  if (hasWarm && hasCool && !hasNeutral) bonus -= 0.3;

  // -0.2: same subcategory already in outfit
  const sub = (candidate.subcategory || '').toLowerCase();
  if (sub && existingItems.length > 0) {
    const subs = existingItems.map(pi => {
      const full = itemLookup.get(pi.wardrobeItemId);
      return (full?.subcategory || '').toLowerCase();
    });
    if (subs.includes(sub)) bonus -= 0.2;
  }

  // Clamp to ±0.5
  return Math.max(-0.5, Math.min(0.5, bonus));
}

// ── Outfit Coherence Guard ──

/**
 * Returns true if the item would be rejected by hard gates for this day.
 * Calls the same gatePool logic used by the builder — no threshold duplication.
 * Also checks formality tier vs activity baseline (dress code violation).
 */
function isHardInvalidShoe(
  item: TripWardrobeItem,
  climateZone: ClimateZone,
  activity: ActivityProfile,
  presentation: Presentation,
  baselineFormality: number,
): boolean {
  // Would gatePool reject this item?
  if (gatePool([item], climateZone, activity, presentation).length === 0) return true;
  // Formality tier below activity baseline? (dress code violation)
  if (baselineFormality > 0 && getFormalityTier(item) < baselineFormality) return true;
  return false;
}

function isLockedValidItem(
  item: TripWardrobeItem,
  climateZone: ClimateZone,
  activity: ActivityProfile,
  presentation: Presentation,
  baselineFormality: number,
): boolean {
  return !isHardInvalidShoe(item, climateZone, activity, presentation, baselineFormality);
}

/**
 * Post-assembly coherence guard: repairs only hard-invalid items.
 * Swaps are allowed ONLY when the current item fails hard gates
 * (weather, presentation, casual-only, formality tier).
 * Valid items are never swapped for palette or aesthetic preference.
 */
function applyCoherenceGuard(
  outfitItems: TripPackingItem[],
  capsuleIntent: CapsuleIntent,
  gatedBuckets: Record<CategoryBucket, TripWardrobeItem[]>,
  finalShoes: TripWardrobeItem[],
  usageTracker: Map<string, number[]>,
  dayIndex: number,
  locationLabel: string,
  poolLookup: Map<string, TripWardrobeItem>,
  climateZone: ClimateZone,
  activityProfile: ActivityProfile,
  presentation: Presentation,
): TripPackingItem[] {
  const result = [...outfitItems];
  const originalItems = result.map(r => ({ id: r.wardrobeItemId, name: r.name }));

  // Rule 1: Repair hard-invalid tops/bottoms/accessories (shoes & outerwear handled by Rules 2/3)
  for (let i = 0; i < result.length; i++) {
    const bucket = CATEGORY_MAP[result[i].mainCategory] as CategoryBucket;
    if (bucket === 'shoes' || bucket === 'outerwear') continue;
    const currentFull = poolLookup.get(result[i].wardrobeItemId);
    if (!currentFull) continue;
    if (isLockedValidItem(currentFull, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality)) continue;
    if (!bucket || !gatedBuckets[bucket]) continue;

    const usedInOutfit = new Set(result.map(r => r.wardrobeItemId));
    const swapCandidates = gatedBuckets[bucket]
      .filter(c => !usedInOutfit.has(c.id) && isLockedValidItem(c, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality))
      .sort((a, b) => {
        const aUses = (usageTracker.get(a.id) || []).length;
        const bUses = (usageTracker.get(b.id) || []).length;
        return aUses - bUses || a.id.localeCompare(b.id);
      });

    if (swapCandidates.length > 0) {
      if (TRIP_TRACE) trace('coherence_guard', `Rule1 repair: hard-invalid item`, {
        dayIndex, rule: 'hard_invalid_repair',
        swappedOut: result[i].name, swappedIn: swapCandidates[0].name,
        bucket, candidateCount: swapCandidates.length,
      });
      if (__DEV__) {
        console.log(
          `[TripCapsule][COHERENCE] day=${dayIndex} repair: ${result[i].name} → ${swapCandidates[0].name} (gate violation)`,
        );
      }
      result[i] = toPackingItem(swapCandidates[0], locationLabel);
    }
  }

  // Rule 2: Repair hard-invalid shoes
  for (let i = 0; i < result.length; i++) {
    const slot = CATEGORY_MAP[result[i].mainCategory];
    if (slot !== 'shoes') continue;
    const full = poolLookup.get(result[i].wardrobeItemId);
    if (!full) continue;
    if (isLockedValidItem(full, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality)) continue;

    const usedInOutfit = new Set(result.map(r => r.wardrobeItemId));
    const shoeSwaps = finalShoes
      .filter(c => !usedInOutfit.has(c.id) && isLockedValidItem(c, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality))
      .sort((a, b) => {
        const aUses = (usageTracker.get(a.id) || []).length;
        const bUses = (usageTracker.get(b.id) || []).length;
        return aUses - bUses || a.id.localeCompare(b.id);
      });
    if (shoeSwaps.length > 0) {
      if (TRIP_TRACE) trace('coherence_guard', `Rule2 shoe repair: hard-invalid shoe`, {
        dayIndex, rule: 'shoe_hard_repair',
        swappedOut: full.name, swappedIn: shoeSwaps[0].name,
        candidateCount: shoeSwaps.length,
      });
      if (__DEV__) {
        console.log(
          `[TripCapsule][COHERENCE] day=${dayIndex} shoe repair: ${full.name} → ${shoeSwaps[0].name} (gate violation)`,
        );
      }
      result[i] = toPackingItem(shoeSwaps[0], locationLabel);
    }
  }

  // Rule 3: Repair hard-invalid outerwear
  for (let i = 0; i < result.length; i++) {
    const slot = CATEGORY_MAP[result[i].mainCategory];
    if (slot !== 'outerwear') continue;
    const full = poolLookup.get(result[i].wardrobeItemId);
    if (!full) continue;
    if (isLockedValidItem(full, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality)) continue;

    const usedInOutfit = new Set(result.map(r => r.wardrobeItemId));
    const outerSwaps = (gatedBuckets.outerwear || [])
      .filter(c =>
        !usedInOutfit.has(c.id) &&
        isLockedValidItem(c, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality),
      )
      .sort((a, b) => {
        const aUses = (usageTracker.get(a.id) || []).length;
        const bUses = (usageTracker.get(b.id) || []).length;
        return aUses - bUses || a.id.localeCompare(b.id);
      });
    if (outerSwaps.length > 0) {
      if (TRIP_TRACE) trace('coherence_guard', `Rule3 outerwear repair`, {
        dayIndex, rule: 'outerwear_hard_repair',
        swappedOut: full.name, swappedIn: outerSwaps[0].name,
        candidateCount: outerSwaps.length,
      });
      if (__DEV__) {
        console.log(
          `[TripCapsule][COHERENCE] day=${dayIndex} outerwear repair: ${full.name} → ${outerSwaps[0].name} (gate violation)`,
        );
      }
      result[i] = toPackingItem(outerSwaps[0], locationLabel);
    }
  }

  // Safety assert: no valid item should have been swapped
  if (__DEV__) {
    for (let i = 0; i < result.length; i++) {
      const before = originalItems[i];
      if (before && before.id !== result[i].wardrobeItemId) {
        const beforeFull = poolLookup.get(before.id);
        if (beforeFull && !isHardInvalidShoe(beforeFull, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality)) {
          console.error('[COHERENCE VIOLATION] swapped valid item', before.name, '→', result[i].name);
        }
      }
    }
  }

  return result;
}

// ── Capsule Intent (stylist direction pre-computed once per packing run) ──

type CapsuleIntent = {
  paletteColors: string[];     // 2–4 base colors (lowercase)
  accentColor: string | null;  // next most frequent non-neutral
  baselineFormality: number;   // 0–3 from activities
  silhouetteBias: string | null; // from fit preferences
  avoidColors: string[];       // user-vetoed colors (lowercase)
};

/**
 * Deterministically computes a consistent stylist direction BEFORE item selection.
 * Uses: favorite_colors from style profile, cross-category color frequency in wardrobe,
 * activity formality, and fit preferences.
 * Pure deterministic — no randomness, no filtering, no AI.
 */
function buildCapsuleIntent(
  eligibleItems: TripWardrobeItem[],
  activities: TripActivity[],
  styleHints?: TripStyleHints,
): CapsuleIntent {
  // 1. Count cross-category color frequency
  const colorFreq = new Map<string, number>();
  for (const item of eligibleItems) {
    if (!item.color) continue;
    const words = item.color.toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
    for (const w of words) {
      colorFreq.set(w, (colorFreq.get(w) || 0) + 1);
    }
  }

  // 2. Separate neutrals from chromatic colors
  const neutralSet = new Set(AESTHETIC_NEUTRALS);
  const chromaticEntries = [...colorFreq.entries()]
    .filter(([c]) => !neutralSet.has(c))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  // 3. Build palette: prefer favorite_colors that exist in wardrobe, then fill by frequency
  const favoriteSet = new Set(
    (styleHints?.favorite_colors || []).map(c => c.toLowerCase()),
  );
  const paletteColors: string[] = [];

  // First pass: favorites that appear in wardrobe (sorted by frequency)
  for (const [color] of chromaticEntries) {
    if (paletteColors.length >= 4) break;
    if (favoriteSet.has(color) && !paletteColors.includes(color)) {
      paletteColors.push(color);
    }
  }

  // Second pass: fill to at least 2 from most frequent chromatic
  for (const [color] of chromaticEntries) {
    if (paletteColors.length >= 2) break;
    if (!paletteColors.includes(color)) {
      paletteColors.push(color);
    }
  }

  // If still under 2 (tiny wardrobe), add most common neutrals as palette anchors
  if (paletteColors.length < 2) {
    const neutralEntries = [...colorFreq.entries()]
      .filter(([c]) => neutralSet.has(c))
      .sort((a, b) => b[1] - a[1]);
    for (const [color] of neutralEntries) {
      if (paletteColors.length >= 2) break;
      if (!paletteColors.includes(color)) {
        paletteColors.push(color);
      }
    }
  }

  // 4. Accent color: next frequent chromatic NOT in palette
  let accentColor: string | null = null;
  for (const [color] of chromaticEntries) {
    if (!paletteColors.includes(color)) {
      accentColor = color;
      break;
    }
  }

  // 5. Baseline formality: max formality from activities
  const baselineFormality = Math.max(
    ...activities.map(a => getActivityProfile(a).formality),
    0,
  );

  // 6. Silhouette bias: from fit preferences
  const silhouetteBias = styleHints?.fit_preferences?.[0]?.toLowerCase() ?? null;

  // 7. Avoid colors: user-vetoed colors from style profile (read if present)
  const rawAvoid = (styleHints as Record<string, unknown> | undefined)?.avoid_colors;
  const avoidColors: string[] = Array.isArray(rawAvoid)
    ? rawAvoid.map((c: string) => c.toLowerCase())
    : [];

  if (__DEV__) {
    console.log('[TripCapsule][INTENT]', {paletteColors, accentColor, baselineFormality, silhouetteBias, avoidColors});
  }

  if (TRIP_TRACE) trace('capsule_intent', 'Capsule intent computed', {
    paletteColors, accentColor, baselineFormality, avoidColors,
  });

  return {paletteColors, accentColor, baselineFormality, silhouetteBias, avoidColors};
}

// ── Required Role Coverage ──

type FootwearRole = 'anchor_shoe' | 'contrast_shoe' | 'condition_shoe';
type OuterwearRole = 'structured_layer' | 'casual_layer';
type ItemRole = FootwearRole | OuterwearRole;

type RoleRequirement = {
  role: ItemRole;
  required: boolean;
  reason: string;
};

type RoleRegistry = Map<ItemRole, TripWardrobeItem>;

/** Coarse formality tier for shoe contrast comparison. */
function getFormalityTier(item: TripWardrobeItem): number {
  const f = getNormalizedFormality(item);
  if (f >= 70) return 3;
  if (f >= 50) return 2;
  if (f >= 30) return 1;
  return 0;
}

/** Classify item color as light, dark, or accent for contrast comparison. */
function getColorWeight(item: TripWardrobeItem): 'light' | 'dark' | 'accent' {
  const words = (item.color || '').toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
  const LIGHT_TOKENS = ['white', 'cream', 'beige', 'ivory', 'tan', 'nude', 'khaki', 'light'];
  const DARK_TOKENS = ['black', 'navy', 'charcoal', 'brown', 'dark', 'espresso', 'midnight'];
  if (words.some(w => DARK_TOKENS.some(d => w.includes(d)))) return 'dark';
  if (words.some(w => LIGHT_TOKENS.includes(w))) return 'light';
  return 'accent';
}

/** True if candidate differs from anchor in formality tier OR color weight. */
function differsFromAnchor(candidate: TripWardrobeItem, anchor: TripWardrobeItem): boolean {
  if (getFormalityTier(candidate) !== getFormalityTier(anchor)) return true;
  if (getColorWeight(candidate) !== getColorWeight(anchor)) return true;
  return false;
}

/**
 * Determines required item roles based on trip context.
 * Called immediately after buildCapsuleIntent, before any item selection.
 */
function determineRequiredRoles(
  activities: TripActivity[],
  weather: DayWeather[],
): RoleRequirement[] {
  const roles: RoleRequirement[] = [];

  // Footwear roles — always required
  roles.push({role: 'anchor_shoe', required: true, reason: 'Most versatile palette-matching shoe'});
  roles.push({role: 'contrast_shoe', required: true, reason: 'Differs from anchor in formality or color weight'});

  // Condition shoe — precipitation, hot weather, or activity-specific
  const hasPrecipitation = weather.some(d => d.rainChance > 50);
  const isHotWeather = weather.some(d => d.highF > 85);
  const hasConditionActivity = activities.some(a => a === 'Active' || a === 'Beach');
  if (hasPrecipitation || isHotWeather || hasConditionActivity) {
    roles.push({role: 'condition_shoe', required: true, reason: 'Weather or activity specific footwear'});
  }

  // Outerwear roles — conditional on temperature range or mixed formality
  if (weather.length > 0) {
    const tripTempRange = Math.max(...weather.map(d => d.highF)) - Math.min(...weather.map(d => d.lowF));
    const formalityValues = activities.map(a => getActivityProfile(a).formality >= 2);
    const hasMixedFormality = formalityValues.includes(true) && formalityValues.includes(false);
    if (tripTempRange > 25 || hasMixedFormality) {
      roles.push({role: 'structured_layer', required: true, reason: 'Smart/formal compatible layer'});
      roles.push({role: 'casual_layer', required: true, reason: 'Relaxed compatible layer'});
    }
  }

  if (__DEV__) {
    console.log('[TripCapsule][ROLES]', roles.map(r => r.role));
  }

  if (TRIP_TRACE) trace('role_determination', 'Required roles determined', {
    roles: roles.map(r => ({role: r.role, reason: r.reason})),
  });

  return roles;
}

/**
 * Fills footwear roles using tieredPick, ensuring complementary shoe selection.
 * anchor_shoe: most versatile palette-matching shoe
 * contrast_shoe: differs from anchor in formality tier or color weight
 * condition_shoe: weather/activity-appropriate (only if role required AND room in maxShoes)
 */
function fillFootwearRoles(
  shoeBucket: TripWardrobeItem[],
  roles: RoleRequirement[],
  capsuleIntent: CapsuleIntent,
  styleHints: TripStyleHints | undefined,
  activities: TripActivity[],
  weather: DayWeather[],
  maxShoes: number,
  roleRegistry: RoleRegistry,
): TripWardrobeItem[] {
  if (shoeBucket.length === 0) return [];

  const footwearRoles = roles.filter(r =>
    r.role === 'anchor_shoe' || r.role === 'contrast_shoe' || r.role === 'condition_shoe',
  );

  // Pre-filter: exclude casual-only shoes when trip has formal activities.
  // Mirrors per-day gating so role selection doesn't pick shoes that will be gated out.
  const tripFormality = capsuleIntent.baselineFormality;
  const usableShoes = tripFormality >= 2
    ? shoeBucket.filter(s => !inferGarmentFlags(s).isCasualOnly)
    : shoeBucket;
  const effectivePool = usableShoes.length > 0 ? usableShoes : shoeBucket; // fail-open

  // Trace point 3: Candidate buckets (shoes only)
  if (TRIP_TRACE) {
    for (const shoe of shoeBucket) {
      const inEffective = effectivePool.some(s => s.id === shoe.id);
      const flags = inferGarmentFlags(shoe);
      trace('shoe_candidate', `Evaluating shoe: ${shoe.name}`, {
        id: shoe.id,
        color: shoe.color,
        formalityTier: getFormalityTier(shoe),
        colorWeight: getColorWeight(shoe),
        passedSafety: inEffective,
        paletteMatch: matchesPalette(shoe, capsuleIntent.paletteColors),
        isNeutral: isNeutralColor(shoe),
        isCasualOnly: flags.isCasualOnly,
        rejectedReason: !inEffective ? `casual-only filtered (tripFormality=${tripFormality})` : null,
      });
    }
  }

  // Fallback: if only 1 usable shoe or no footwear roles, use original slice behavior
  if (footwearRoles.length === 0 || effectivePool.length === 1) {
    if (effectivePool.length >= 1) roleRegistry.set('anchor_shoe', effectivePool[0]);
    return effectivePool.slice(0, maxShoes);
  }

  const selected: TripWardrobeItem[] = [];
  const usedIds = new Set<string>();
  const emptyTracker = new Map<string, number[]>();
  const qualityFn = (item: TripWardrobeItem) => activityScore(item, activities);

  // 1. anchor_shoe — most versatile palette-matching shoe
  const anchorResult = tieredPick(
    effectivePool, capsuleIntent, styleHints,
    emptyTracker, 0, Infinity, qualityFn,
    __DEV__ ? 'role/anchor_shoe' : undefined,
  );
  if (anchorResult) {
    roleRegistry.set('anchor_shoe', anchorResult.picked);
    selected.push(anchorResult.picked);
    usedIds.add(anchorResult.picked.id);
    if (TRIP_TRACE) trace('role_fill', 'anchor_shoe filled', {
      role: 'anchor_shoe',
      chosen: {id: anchorResult.picked.id, name: anchorResult.picked.name, color: anchorResult.picked.color},
      candidatesEvaluated: anchorResult.runners.map(r => ({id: r.item.id, name: r.item.name, penalty: r.penalty})),
      skippedReasons: anchorResult.runners.slice(1).map(r => ({id: r.item.id, reason: `penalty=${r.penalty} vs winner=${anchorResult.runners[0].penalty}`})),
    });
  } else {
    if (TRIP_TRACE) trace('role_fill', 'anchor_shoe FAILED — no result from tieredPick', {role: 'anchor_shoe', poolSize: effectivePool.length});
  }

  // 2. contrast_shoe — must differ from anchor in formality tier or color weight
  const anchor = roleRegistry.get('anchor_shoe');
  if (anchor && selected.length < maxShoes) {
    const contrastCandidates = effectivePool.filter(
      s => !usedIds.has(s.id) && differsFromAnchor(s, anchor),
    );

    if (TRIP_TRACE) {
      const remaining = effectivePool.filter(s => !usedIds.has(s.id));
      trace('role_fill', 'contrast_shoe evaluation', {
        role: 'contrast_shoe',
        anchorId: anchor.id,
        anchorFormalityTier: getFormalityTier(anchor),
        anchorColorWeight: getColorWeight(anchor),
        trueContrastCount: contrastCandidates.length,
        trueContrastIds: contrastCandidates.map(s => ({id: s.id, name: s.name, formalityTier: getFormalityTier(s), colorWeight: getColorWeight(s)})),
        remainingNonContrastIds: remaining.filter(s => !contrastCandidates.some(c => c.id === s.id)).map(s => ({id: s.id, name: s.name, formalityTier: getFormalityTier(s), colorWeight: getColorWeight(s), differsFromAnchor: false})),
        usedFallback: contrastCandidates.length === 0,
      });
    }

    // If no shoe truly differs, pick the next-best available (still prevents repetition)
    const pool = contrastCandidates.length > 0
      ? contrastCandidates
      : effectivePool.filter(s => !usedIds.has(s.id));

    if (pool.length > 0) {
      const result = tieredPick(
        pool, capsuleIntent, styleHints,
        emptyTracker, 0, Infinity, qualityFn,
        __DEV__ ? `role/contrast_shoe${contrastCandidates.length > 0 ? '' : '_fallback'}` : undefined,
      );
      if (result) {
        roleRegistry.set('contrast_shoe', result.picked);
        selected.push(result.picked);
        usedIds.add(result.picked.id);
        if (TRIP_TRACE) trace('role_fill', 'contrast_shoe filled', {
          role: 'contrast_shoe',
          chosen: {id: result.picked.id, name: result.picked.name, color: result.picked.color},
          candidatesEvaluated: result.runners.map(r => ({id: r.item.id, name: r.item.name, penalty: r.penalty})),
        });
      }
    }
  }

  // 3. condition_shoe — weather/activity specific (only if role required AND room)
  if (footwearRoles.some(r => r.role === 'condition_shoe') && selected.length < maxShoes) {
    const hasPrecip = weather.some(d => d.rainChance > 50);
    const isHot = weather.some(d => d.highF > 85);
    const hasActive = activities.includes('Active');
    const hasBeach = activities.includes('Beach');

    const conditionCandidates = effectivePool.filter(s => {
      if (usedIds.has(s.id)) return false;
      if (hasPrecip && s.rainOk) return true;
      if (isHot && isOpenFootwear(s)) return true;
      if (hasActive) {
        const sub = (s.subcategory || '').toLowerCase();
        if (sub.includes('athletic') || sub.includes('sneaker') || sub.includes('running') || sub.includes('trainer')) return true;
      }
      if (hasBeach && isOpenFootwear(s)) return true;
      return false;
    });

    const pool = conditionCandidates.length > 0
      ? conditionCandidates
      : effectivePool.filter(s => !usedIds.has(s.id));

    if (pool.length > 0) {
      const result = tieredPick(
        pool, capsuleIntent, styleHints,
        emptyTracker, 0, Infinity, qualityFn,
        __DEV__ ? `role/condition_shoe${conditionCandidates.length > 0 ? '' : '_fallback'}` : undefined,
      );
      if (result) {
        roleRegistry.set('condition_shoe', result.picked);
        selected.push(result.picked);
        usedIds.add(result.picked.id);
        if (TRIP_TRACE) trace('role_fill', 'condition_shoe filled', {
          role: 'condition_shoe',
          chosen: {id: result.picked.id, name: result.picked.name, color: result.picked.color},
          conditionMatchCount: conditionCandidates.length,
          usedFallback: conditionCandidates.length === 0,
        });
      }
    }
  }

  return selected.slice(0, maxShoes);
}

// ── Wardrobe presentation detection ──

type Presentation = 'masculine' | 'feminine' | 'mixed';

export function detectPresentation(
  items: TripWardrobeItem[],
): Presentation {
  let masc = 0;
  let fem = 0;

  for (const item of items) {
    const cat = item.main_category || '';
    const sub = (item.subcategory || '').toLowerCase();

    // Feminine signals — "dress" as a garment noun (ends with "dress"),
    // NOT "dress" as an adjective ("dress boots", "dress shoes", "dress shirt")
    if (
      cat === 'Dresses' ||
      cat === 'Skirts' ||
      sub.endsWith('dress') ||
      sub.includes('skirt') ||
      sub.includes('heel') ||
      sub.includes('blouse') ||
      sub.includes('handbag') ||
      sub.includes('purse')
    ) {
      fem++;
    }

    if (
      sub.includes('oxford') ||
      sub.includes('loafer') ||
      sub.includes('blazer') ||
      sub.includes('suit') ||
      sub.includes('tie') ||
      sub.includes('necktie') ||
      sub.includes('dress shirt')
    ) {
      masc++;
    }
  }

  // Early-out: tiny minority of gendered items relative to total wardrobe
  // Prevents 1 dress in 30 men's items from flipping to 'feminine'
  const totalItems = items.length;
  if (totalItems === 0) return 'mixed';

  if (fem <= 2 && fem / totalItems <= 0.1) return 'masculine';
  if (masc <= 2 && masc / totalItems <= 0.1) return 'feminine';

  // Signal-based 70% dominance threshold
  const signalTotal = masc + fem;
  if (signalTotal === 0) return 'mixed';

  if (masc / signalTotal >= 0.7) return 'masculine';
  if (fem / signalTotal >= 0.7) return 'feminine';

  return 'mixed';
}

// ── Core slot validation gate ──

/**
 * Hard gate: does this outfit contain the minimum core garment slots?
 * For masculine: tops + bottoms + shoes — NO exceptions, NO activity bypass.
 */
function hasCoreSlots(
  items: TripPackingItem[],
  presentation: Presentation,
): boolean {
  const slots = new Set(
    items.map(i => CATEGORY_MAP[i.mainCategory] || 'other'),
  );

  if (presentation === 'masculine') {
    // Swimwear-bottom items (trunks/board shorts) satisfy the bottoms slot
    // when picked via getBeachBottomCandidates
    const hasBottomsEquivalent = slots.has('bottoms') || slots.has('swimwear');
    return slots.has('tops') && hasBottomsEquivalent && slots.has('shoes');
  }

  // Feminine / mixed: require shoes + a valid outfit base
  if (!slots.has('shoes')) return false;
  if (slots.has('dresses')) return true;
  if (slots.has('tops') && slots.has('bottoms')) return true;
  if (slots.has('activewear')) {
    const awCount = items.filter(i => (CATEGORY_MAP[i.mainCategory] || 'other') === 'activewear').length;
    if (awCount >= 2 || slots.has('bottoms')) return true;
  }
  if (slots.has('swimwear')) return true;
  return false;
}

// ── Beach/Active bottom-picking helpers ──

/**
 * Detects whether a swimwear item covers the lower body (trunks, board shorts, etc.).
 * Used to allow swim-bottom items to satisfy the masculine "bottoms" requirement at Beach.
 */
function isSwimwearBottom(item: TripWardrobeItem): boolean {
  const sub = (item.subcategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  return (
    sub.includes('trunk') ||
    sub.includes('board short') ||
    sub.includes('swim short') ||
    sub.includes('swim trunk') ||
    name.includes('trunk') ||
    name.includes('board short') ||
    name.includes('swim short')
  );
}

/**
 * Beach bottoms: regular bottoms first, swim-bottom items as fallback.
 * Both are merged so weightedPick can choose the best candidate.
 */
function getBeachBottomCandidates(
  gatedBuckets: Record<CategoryBucket, TripWardrobeItem[]>,
): TripWardrobeItem[] {
  const regular = gatedBuckets.bottoms;
  const swimBottoms = gatedBuckets.swimwear.filter(isSwimwearBottom);
  return regular.length > 0 ? [...regular, ...swimBottoms] : swimBottoms;
}

/**
 * Active bottoms: regular bottoms bucket (shorts, joggers, leggings, etc.).
 */
function getActiveBottomCandidates(
  gatedBuckets: Record<CategoryBucket, TripWardrobeItem[]>,
): TripWardrobeItem[] {
  return gatedBuckets.bottoms;
}

// ── Final validation gate & used-item exclusion ──

/**
 * FINAL validation gate — runs AFTER all assembly, pruning, mutation, and fallback.
 * For masculine: tops + bottoms (or swimwear) + shoes. No exceptions.
 */
function isFinalOutfitValid(
  items: TripPackingItem[],
  presentation: Presentation,
): boolean {
  if (items.length === 0) return false;
  const slots = new Set(
    items.map(i => CATEGORY_MAP[i.mainCategory] || 'other'),
  );
  if (presentation === 'masculine') {
    const hasBottomsEquivalent = slots.has('bottoms') || slots.has('swimwear');
    return slots.has('tops') && hasBottomsEquivalent && slots.has('shoes');
  }
  // Feminine / mixed: require shoes + a valid outfit base
  if (!slots.has('shoes')) return false;
  if (slots.has('dresses')) return true;
  if (slots.has('tops') && slots.has('bottoms')) return true;
  if (slots.has('activewear')) {
    const awCount = items.filter(i => (CATEGORY_MAP[i.mainCategory] || 'other') === 'activewear').length;
    if (awCount >= 2 || slots.has('bottoms')) return true;
  }
  if (slots.has('swimwear')) return true;
  return false;
}

/**
 * Centralized used-item exclusion — removes any item whose id is in usedIds.
 * Use for: backups, alternates, fallbacks, support pools.
 */
function filterUsed<T extends {id: string}>(
  pool: T[],
  usedIds: Set<string>,
): T[] {
  return pool.filter(item => !usedIds.has(item.id));
}

/**
 * Evaluates whether a role-packed shoe that failed formality gating should be
 * reinserted as a penalized candidate. Safety gates (weather, presentation,
 * coverage) remain HARD FAIL — only formality rejection is softened.
 */
function evaluatePackedItemTolerance(
  item: TripWardrobeItem,
  climateZone: ClimateZone,
  presentation: Presentation,
  roleRegistry: RoleRegistry,
): boolean {
  // Only tolerate items intentionally packed via role planning
  const isRoleItem = [...roleRegistry.values()].some(v => v.id === item.id);
  if (!isRoleItem) return false;

  const flags = inferGarmentFlags(item);

  // HARD FAIL: presentation violation
  if (presentation === 'masculine' && flags.isFeminineOnly) return false;

  // HARD FAIL: weather incompatibility
  const isColdOrFreezing = climateZone === 'cold' || climateZone === 'freezing';
  if (isColdOrFreezing && flags.isMinimalCoverage) return false;
  if (isColdOrFreezing && isOpenFootwear(item)) return false;

  // Passed safety — formality-only rejection is tolerated
  return true;
}

function buildOutfitForActivity(
  activity: TripActivity,
  dayIndex: number,
  numDays: number,
  dayWeather: DayWeather | undefined,
  buckets: Record<CategoryBucket, TripWardrobeItem[]>,
  selectedShoes: TripWardrobeItem[],
  selectedOuterwear: TripWardrobeItem[],
  usageTracker: Map<string, number[]>,
  locationLabel: string,
  mode: 'anchor' | 'support',
  presentation: Presentation,
  styleHints?: TripStyleHints,
  capsuleIntent?: CapsuleIntent,
  roleRegistry?: RoleRegistry,
  anchorBudget?: AnchorBudget,
): TripPackingItem[] {
  const items: TripPackingItem[] = [];

  // ── Apply global climate + gender gating ──
  const climateZone = deriveClimateZone(dayWeather);
  const activityProfile = getActivityProfile(activity);
  const isMasculine = presentation === 'masculine';
  const isFormalActivity = activityProfile.formality >= 2;
  const gatedBuckets = {} as Record<CategoryBucket, TripWardrobeItem[]>;
  for (const key of Object.keys(buckets) as CategoryBucket[]) {
    gatedBuckets[key] = gatePool(buckets[key], climateZone, activityProfile, presentation);
    // Fallback: if gating empties the bucket — NEVER bypass formality or gender rules
    if (gatedBuckets[key].length === 0 && buckets[key].length > 0) {
      if (isMasculine) {
        gatedBuckets[key] = buckets[key].filter(item => {
          const flags = inferGarmentFlags(item);
          if (flags.isFeminineOnly) return false;
          if (isFormalActivity && flags.isCasualOnly) return false;
          return true;
        });
      } else if (isFormalActivity) {
        // Non-masculine fallback: still respect formality rules
        gatedBuckets[key] = buckets[key].filter(item => !inferGarmentFlags(item).isCasualOnly);
      } else {
        gatedBuckets[key] = buckets[key];
      }
    }
    // Taste gate: filter user-avoided colors (emergency fallback preserves pool if all vetoed)
    gatedBuckets[key] = applyTasteGate(gatedBuckets[key], capsuleIntent?.avoidColors);
  }
  const gatedShoes = gatePool(selectedShoes, climateZone, activityProfile, presentation);
  // Shoe fallback: NEVER bypass formality or gender rules
  let finalShoes: TripWardrobeItem[];
  if (gatedShoes.length > 0) {
    finalShoes = gatedShoes;
  } else if (isMasculine) {
    finalShoes = selectedShoes.filter(s => {
      const f = inferGarmentFlags(s);
      return !f.isFeminineOnly && !(isFormalActivity && f.isCasualOnly);
    });
  } else if (isFormalActivity) {
    finalShoes = selectedShoes.filter(s => !inferGarmentFlags(s).isCasualOnly);
  } else {
    finalShoes = selectedShoes;
  }
  // Cold/freezing safety net: filter open footwear from ANY fallback path (fail-open)
  if (climateZone === 'freezing' || climateZone === 'cold') {
    const closedToe = finalShoes.filter(s => !isOpenFootwear(s));
    if (closedToe.length > 0) {
      finalShoes = closedToe;
    }
  }

  // ── Soft-fail tolerance: reinsert role-packed shoes that only failed formality ──
  // Only applies when valid shoes already exist (preserves fail-closed when ALL shoes are invalid)
  const toleranceShoeIds = new Set<string>();
  if (roleRegistry && roleRegistry.size > 0 && finalShoes.length > 0) {
    const rejectedShoes = selectedShoes.filter(s => !finalShoes.some(f => f.id === s.id));
    for (const shoe of rejectedShoes) {
      if (evaluatePackedItemTolerance(shoe, climateZone, presentation, roleRegistry)) {
        finalShoes.push(shoe);
        toleranceShoeIds.add(shoe.id);
        if (__DEV__) {
          console.log(`[TripCapsule][TOLERANCE] Reinsert ${shoe.name} (${shoe.id}) | penalized soft-fail for ${activity}`);
        }
      }
    }
  }

  // ── Taste gate: remove user-avoided colors from shoes ──
  finalShoes = applyTasteGate(finalShoes, capsuleIntent?.avoidColors);

  // ── Weighted pick helpers (replaces modulo rotation) ──
  const maxUsesForBucket = (len: number) =>
    len > 0 ? Math.ceil(numDays / len) + 1 : Infinity;

  // Build once — O(n), replaces repeated .find() lookups in aestheticBonus
  const allPoolItems = [
    ...Object.values(gatedBuckets).flat(),
    ...finalShoes,
    ...selectedOuterwear,
  ];
  const poolLookup = new Map(allPoolItems.map(i => [i.id, i]));

  // Style hints bonus: tiebreaker scoring within tiered pools.
  // Color preference is now handled by tiered candidate pools (Layer 2).
  const styleBonus = (item: TripWardrobeItem): number => {
    if (!styleHints) return 0;
    let bonus = 0;
    // Fabric preference (tiebreaker within tier)
    if (item.material && styleHints.fabric_preferences?.length) {
      const matLower = item.material.toLowerCase();
      if (styleHints.fabric_preferences.some(f => matLower.includes(f.toLowerCase()) || f.toLowerCase().includes(matLower))) bonus += 0.1;
    }
    // Brand preference (conservative)
    if (item.brand && styleHints.preferred_brands?.length) {
      const brandLower = item.brand.toLowerCase();
      if (styleHints.preferred_brands.some(b => brandLower.includes(b.toLowerCase()))) bonus += 0.05;
    }
    // Fit preference (conservative)
    if (item.fit && styleHints.fit_preferences?.length) {
      const fitLower = item.fit.toLowerCase();
      if (styleHints.fit_preferences.some(f => fitLower === f.toLowerCase())) bonus += 0.05;
    }
    // Disliked styles penalty (soft-avoid tiebreaker — primary filtering in tiered pools)
    if (styleHints.disliked_styles?.length) {
      const subLower = (item.subcategory || '').toLowerCase();
      const nameLower = (item.name || '').toLowerCase();
      if (styleHints.disliked_styles.some(d => {
        const dl = d.toLowerCase();
        return (subLower && subLower.includes(dl)) || (nameLower && nameLower.includes(dl));
      })) bonus -= 0.15;
    }
    return bonus;
  };

  // Quality function: activity-specific scoring + aesthetic tie-breaker + style hints
  const qualityFn = (item: TripWardrobeItem) =>
    activityScore(item, [activity]) + aestheticBonus(item, items, poolLookup) + styleBonus(item);

  const pickW = (bucket: TripWardrobeItem[], label?: string): WeightedPickResult | null => {
    const maxUses = maxUsesForBucket(bucket.length);
    const dbgLabel = __DEV__ ? `${activity}/${label}` : undefined;
    if (capsuleIntent) {
      return tieredPick(bucket, capsuleIntent, styleHints, usageTracker, dayIndex, maxUses, qualityFn, dbgLabel);
    }
    return weightedPick(bucket, usageTracker, dayIndex, maxUses, qualityFn, dbgLabel);
  };

  // Wrapper that picks, pushes to items, and annotates alternates
  const pickAndPush = (bucket: TripWardrobeItem[], label?: string) => {
    const result = pickW(bucket, label);
    if (!result) return;
    items.push(toPackingItem(result.picked, locationLabel));
    annotateLastPick(items, result.runners);
  };

  // ── Anchor budget: restrict shoe pool to shoes that haven't exhausted their budget ──
  let budgetedShoes = finalShoes;
  if (anchorBudget && anchorBudget.size > 0) {
    const eligible = finalShoes.filter(s => {
      const remaining = anchorBudget.get(s.id);
      return remaining === undefined || remaining > 0;
    });
    budgetedShoes = eligible.length > 0 ? eligible : finalShoes; // fail-open: reset if all exhausted
  }

  const pickShoeW = () => {
    const maxUses = maxUsesForBucket(budgetedShoes.length);
    const dbgLabel = __DEV__ ? `${activity}/shoes` : undefined;
    // Penalize tolerance shoes: forced to SECONDARY tier via toleranceIds,
    // and quality penalty ensures they rank below other SECONDARY items too
    const shoeQualityFn = toleranceShoeIds.size > 0
      ? (item: TripWardrobeItem) => qualityFn(item) + (toleranceShoeIds.has(item.id) ? -5 : 0)
      : qualityFn;
    const result = capsuleIntent
      ? tieredPick(budgetedShoes, capsuleIntent, styleHints, usageTracker, dayIndex, maxUses, shoeQualityFn, dbgLabel, toleranceShoeIds)
      : weightedPick(budgetedShoes, usageTracker, dayIndex, maxUses, shoeQualityFn, dbgLabel);
    if (!result) return;
    // Consume anchor budget for the selected shoe
    if (anchorBudget) {
      const left = anchorBudget.get(result.picked.id);
      if (left !== undefined) anchorBudget.set(result.picked.id, left - 1);
    }
    items.push(toPackingItem(result.picked, locationLabel));
    annotateLastPick(items, result.runners);
  };

  switch (activity) {
    case 'Beach': {
      if (isMasculine) {
        // Masculine beach: tops + bottoms (regular or swim trunks) + shoes
        pickAndPush(gatedBuckets.tops, 'tops');
        const beachBottoms = getBeachBottomCandidates(gatedBuckets);
        if (beachBottoms.length > 0) {
          pickAndPush(beachBottoms, 'beach-bottoms');
        }
        pickShoeW();
      } else {
        // Non-masculine: swimwear-first, no bottoms required
        if (gatedBuckets.swimwear.length > 0) {
          pickAndPush(gatedBuckets.swimwear, 'swimwear');
        } else {
          pickAndPush(gatedBuckets.tops, 'tops');
        }
        pickShoeW();
      }
      if (mode === 'anchor') {
        pickAndPush(gatedBuckets.accessories, 'accessories');
      }
      break;
    }
    case 'Active': {
      if (isMasculine) {
        // Masculine active: tops + bottoms + shoes (standard separates)
        pickAndPush(gatedBuckets.tops, 'tops');
        const activeBottoms = getActiveBottomCandidates(gatedBuckets);
        if (activeBottoms.length > 0) {
          pickAndPush(activeBottoms, 'active-bottoms');
        }
        pickShoeW();
      } else {
        // Non-masculine: activewear pairing logic preserved
        if (gatedBuckets.activewear.length > 0) {
          const firstResult = pickW(gatedBuckets.activewear, 'activewear-1');
          if (firstResult) {
            items.push(toPackingItem(firstResult.picked, locationLabel));
            annotateLastPick(items, firstResult.runners);
            if (gatedBuckets.activewear.length > 1) {
              const remaining = gatedBuckets.activewear.filter(i => i.id !== firstResult.picked.id);
              if (remaining.length > 0) {
                const first = firstResult.picked;
                if (isUpperActivewear(first) && remaining.every(r => isUpperActivewear(r))) {
                  pickAndPush(gatedBuckets.bottoms, 'bottoms');
                } else {
                  const secondResult = pickW(remaining, 'activewear-2');
                  if (secondResult) {
                    items.push(toPackingItem(secondResult.picked, locationLabel));
                    annotateLastPick(items, secondResult.runners);
                  }
                }
              }
            }
          }
        } else {
          pickAndPush(gatedBuckets.tops, 'tops');
          pickAndPush(gatedBuckets.bottoms, 'bottoms');
        }
        pickShoeW();
      }
      break;
    }
    case 'Business': {
      pickAndPush(gatedBuckets.tops, 'tops');
      pickAndPush(gatedBuckets.bottoms, 'bottoms');
      pickShoeW();
      if (mode === 'anchor' && gatedBuckets.outerwear.length > 0) {
        pickAndPush(gatedBuckets.outerwear, 'outerwear');
      }
      break;
    }
    case 'Formal': {
      if (presentation !== 'masculine' && gatedBuckets.dresses.length > 0) {
        // Quality-weighted: prefer highest-formality dress
        const formalQuality = (d: TripWardrobeItem) => getNormalizedFormality(d);
        const dressResult = weightedPick(
          gatedBuckets.dresses, usageTracker, dayIndex,
          maxUsesForBucket(gatedBuckets.dresses.length),
          formalQuality,
        );
        if (dressResult) {
          items.push(toPackingItem(dressResult.picked, locationLabel));
          annotateLastPick(items, dressResult.runners);
        }
      } else {
        pickAndPush(gatedBuckets.tops, 'tops');
        pickAndPush(gatedBuckets.bottoms, 'bottoms');
      }
      pickShoeW();
      pickAndPush(gatedBuckets.accessories, 'accessories');
      break;
    }
    case 'Dinner': {
      if (presentation !== 'masculine' && gatedBuckets.dresses.length > 0) {
        pickAndPush(gatedBuckets.dresses, 'dresses');
      } else {
        pickAndPush(gatedBuckets.tops, 'tops');
        pickAndPush(gatedBuckets.bottoms, 'bottoms');
      }
      pickShoeW();
      if (mode === 'anchor') {
        pickAndPush(gatedBuckets.accessories, 'accessories');
      }
      break;
    }
    default: {
      // Casual, Sightseeing, Cold Weather
      pickAndPush(gatedBuckets.tops, 'tops');
      pickAndPush(gatedBuckets.bottoms, 'bottoms');
      pickShoeW();
      if (mode === 'anchor') {
        pickOuterwear(selectedOuterwear, dayWeather, items, locationLabel, usageTracker, dayIndex, numDays);
        pickAndPush(gatedBuckets.accessories, 'accessories');
      }
      break;
    }
  }

  // Apply coherence guard: repair only hard-invalid items before normalization
  const coherenceChecked = capsuleIntent
    ? applyCoherenceGuard(items, capsuleIntent, gatedBuckets, finalShoes, usageTracker, dayIndex, locationLabel, poolLookup, climateZone, activityProfile, presentation)
    : items;

  // Enforce one-piece vs separates structure
  let normalized = normalizeOutfitStructure(coherenceChecked);

  // Last line of defense: strip any dress-bucket item that escaped for masculine wardrobes
  if (presentation === 'masculine') {
    normalized = normalized.filter(i => {
      const bucket = CATEGORY_MAP[i.mainCategory];
      return bucket !== 'dresses';
    });
  }

  if (__DEV__) {
    console.log('[TripCapsule][OUTFIT_PICK]', {
      activity,
      dayIndex,
      mode,
      presentation,
      weather: dayWeather
        ? `${dayWeather.lowF}-${dayWeather.highF} ${dayWeather.condition}`
        : 'none',
      picked: normalized.map(i => ({
        id: i.wardrobeItemId,
        name: i.name,
        mainCategory: i.mainCategory,
        subCategory: i.subCategory,
      })),
    });
  }

  // Hard validation gate: reject structurally incomplete outfits
  if (!hasCoreSlots(normalized, presentation)) {
    console.warn('[TripCapsule][CORE_REJECT]', {
      path: mode,
      dayIndex,
      activity,
      presentation,
      slots: normalized.map(i => CATEGORY_MAP[i.mainCategory] || 'other'),
      items: normalized.map(i => i.name),
    });
    return [];
  }

  // Track used items AFTER validation — rejected outfits must not pollute rotation scoring
  for (const item of normalized) {
    const days = usageTracker.get(item.wardrobeItemId) || [];
    days.push(dayIndex);
    usageTracker.set(item.wardrobeItemId, days);
  }

  return normalized;
}

// ── Outfit structure enforcement ──

/**
 * Enforces one-piece vs separates structure:
 * A) ONE-PIECE: Dress + Shoes [+ Outerwear] [+ Accessory] — no tops/bottoms
 * B) SEPARATES: 1 Top + 1 Bottom + Shoes [+ Outerwear] [+ Accessory]
 *
 * Uses CATEGORY_MAP to resolve each item's structural role.
 */
export function normalizeOutfitStructure(
  items: TripPackingItem[],
): TripPackingItem[] {
  const hasDress = items.some(i => {
    const bucket = CATEGORY_MAP[i.mainCategory];
    return bucket === 'dresses';
  });

  if (hasDress) {
    // ONE-PIECE mode: remove all tops and bottoms
    return items.filter(i => {
      const bucket = CATEGORY_MAP[i.mainCategory];
      return bucket !== 'tops' && bucket !== 'bottoms';
    });
  }

  // SEPARATES mode: at most 1 top, 1 bottom
  let topCount = 0;
  let bottomCount = 0;
  return items.filter(i => {
    const bucket = CATEGORY_MAP[i.mainCategory];
    if (bucket === 'tops') {
      topCount++;
      return topCount <= 1;
    }
    if (bucket === 'bottoms') {
      bottomCount++;
      return bottomCount <= 1;
    }
    return true;
  });
}

// ── Item cap enforcement ──

function enforceItemCap(
  outfits: CapsuleOutfit[],
  numDays: number,
): CapsuleOutfit[] {
  const maxUnique = Math.min(numDays * 4, 30);

  while (true) {
    const uniqueIds = new Set(
      outfits.flatMap(o => o.items.map(i => i.wardrobeItemId)),
    );
    if (uniqueIds.size <= maxUnique) break;

    // Find last support outfit and remove it
    let lastSupportIdx = -1;
    for (let i = outfits.length - 1; i >= 0; i--) {
      if (outfits[i].type === 'support') {
        lastSupportIdx = i;
        break;
      }
    }

    if (lastSupportIdx === -1) break; // Only anchors left — accept it
    outfits.splice(lastSupportIdx, 1);
  }

  return outfits;
}

// ── Packing list builder ──

function buildPackingList(
  outfits: CapsuleOutfit[],
  categoryOrder: string[],
): PackingGroup[] {
  const allItems = outfits.flatMap(o => o.items);
  const uniqueMap = new Map<string, TripPackingItem>();
  for (const item of allItems) {
    if (!uniqueMap.has(item.wardrobeItemId)) {
      uniqueMap.set(item.wardrobeItemId, item);
    }
  }

  const grouped = new Map<string, TripPackingItem[]>();
  for (const item of uniqueMap.values()) {
    const displayCat = categoryOrder.includes(item.mainCategory)
      ? item.mainCategory
      : 'Other';
    if (!grouped.has(displayCat)) grouped.set(displayCat, []);
    grouped.get(displayCat)!.push(item);
  }

  return categoryOrder
    .filter(cat => grouped.has(cat))
    .map(cat => ({
      category: cat,
      items: grouped.get(cat)!,
    }));
}

// ── Main engine ──

function generateBuildId(): string {
  return `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildCapsule(
  wardrobeItems: TripWardrobeItem[],
  weather: DayWeather[],
  activities: TripActivity[],
  startingLocationLabel: string,
  explicitPresentation?: Presentation,
  styleHints?: TripStyleHints,
): TripCapsule {
  // Reset trace collector for this build
  if (TRIP_TRACE) tripTrace = [];

  const requestId = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const numDays = Math.max(weather.length, 1);
  const needs = analyzeWeather(weather);

  // Step 0: Resolve presentation — explicit profile overrides wardrobe detection
  const presentation: Presentation = explicitPresentation ?? detectPresentation(wardrobeItems);

  // Step 0b: Pre-filter ineligible items BEFORE any bucketing/scoring
  const eligibleItems = filterEligibleItems(wardrobeItems, presentation);

  // Step 0c: Build capsule intent — stylist direction computed once, passed through engine
  const capsuleIntent = buildCapsuleIntent(eligibleItems, activities, styleHints);

  // Step 0d: Determine required roles — guides shoe/outerwear selection for complementary coverage
  const requiredRoles = determineRequiredRoles(activities, weather);
  const roleRegistry: RoleRegistry = new Map();

  logInput(requestId, {
    numDays,
    activities,
    weatherDays: weather.length,
    wardrobeSize: wardrobeItems.length,
    presentation,
    eligibleCount: eligibleItems.length,
    location: startingLocationLabel,
  });

  logWeatherAnalysis(requestId, {
    needsWarmLayer: needs.needsWarmLayer,
    needsRainLayer: needs.needsRainLayer,
    isHot: needs.isHot,
    isCold: needs.isCold,
    climateZones: weather.map(d => deriveClimateZone(d)),
  });

  const seedStr =
    eligibleItems.map(i => i.id).join(',') +
    weather.map(w => w.date).join(',') +
    activities.join(',');
  const rand = seededRandom(hashString(seedStr));

  // Step 1: Bucket items by category (8 buckets) — operates on eligible items only
  const buckets: Record<CategoryBucket, TripWardrobeItem[]> = {
    tops: [],
    bottoms: [],
    outerwear: [],
    shoes: [],
    accessories: [],
    dresses: [],
    activewear: [],
    swimwear: [],
  };

  for (const item of eligibleItems) {
    const bucket = getBucket(item);
    if (bucket) buckets[bucket].push(item);
  }

  // Step 2: Sort each bucket by activity relevance, with deterministic shuffle
  for (const key of Object.keys(buckets) as CategoryBucket[]) {
    buckets[key] = shuffleWithSeed(buckets[key], rand).sort(
      (a, b) => activityScore(b, activities) - activityScore(a, activities),
    );
  }

  // Log bucket populations
  for (const key of Object.keys(buckets) as CategoryBucket[]) {
    logSlotDecision(requestId, {
      category: key,
      selectedCount: buckets[key].length,
      selected: buckets[key].slice(0, 5).map(i => i.name || i.id),
      reason: 'bucketed_and_sorted',
    });
  }

  // Step 2b: Hard-lock buckets for style coherence (defense-in-depth)

  if (presentation === 'masculine') {
    const prevDresses = buckets.dresses.length;
    const prevBottoms = buckets.bottoms.length;
    const prevAccessories = buckets.accessories.length;
    buckets.dresses = [];
    buckets.bottoms = buckets.bottoms.filter(
      i => !(i.subcategory || '').toLowerCase().includes('skirt'),
    );
    buckets.accessories = buckets.accessories.filter(
      i =>
        i.main_category !== 'Bags' ||
        !(i.subcategory || '').toLowerCase().match(/handbag|purse/),
    );
    if (prevDresses > 0 || prevBottoms !== buckets.bottoms.length || prevAccessories !== buckets.accessories.length) {
      logOverride(requestId, {
        rule: 'masculine_hard_lock',
        before: prevDresses + prevBottoms + prevAccessories,
        after: buckets.dresses.length + buckets.bottoms.length + buckets.accessories.length,
        detail: `dresses: ${prevDresses}→0, bottoms: ${prevBottoms}→${buckets.bottoms.length}, accessories: ${prevAccessories}→${buckets.accessories.length}`,
      });
    }
  }

  // Step 3: Plan day schedules
  const daySchedules = planDaySchedules(activities, weather, numDays);

  // Step 3b: RESERVE BACKUPS FIRST — select high-quality reserves and isolate
  //          them from the outfit candidate pool. This guarantees zero overlap
  //          between backups and any outfit or alternate.
  const reservedItemIds = new Set<string>();
  type ReserveCandidate = {item: TripWardrobeItem; score: number; compatibleDays: number; slot: CategoryBucket};
  let preSelectedReserves: ReserveCandidate[] = [];
  {
    const VERSATILE_COLORS = new Set(['black', 'navy', 'grey', 'gray', 'white', 'tan', 'charcoal', 'cream', 'beige', 'khaki']);
    const CATEGORY_BONUS: Record<string, number> = {tops: 3, outerwear: 2, shoes: 1};
    const backupSlots: CategoryBucket[] = ['tops', 'shoes', 'outerwear'];
    const hasFormalAct = activities.some(a => getActivityProfile(a).formality >= 2);

    // Compute compatible days against day schedules (pre-outfit)
    function preCompatibleDays(item: TripWardrobeItem): number {
      let count = 0;
      for (let i = 0; i < daySchedules.length; i++) {
        const dw = weather[i];
        if (!dw) continue;
        const cz = deriveClimateZone(dw);
        const ap = getActivityProfile(daySchedules[i].primary);
        if (gatePool([item], cz, ap, presentation).length > 0) count++;
      }
      return count;
    }

    // Coverage-gap: estimate from bucket sizes (pre-outfit proxy)
    const slotSizes = new Map<CategoryBucket, number>();
    for (const s of backupSlots) slotSizes.set(s, (buckets[s] || []).length);
    const sizeValues = [...slotSizes.values()];
    const meanSize = sizeValues.length > 0
      ? sizeValues.reduce((sum, v) => sum + v, 0) / sizeValues.length
      : 0;
    const underrepSlots = new Set<CategoryBucket>();
    for (const [s, sz] of slotSizes) {
      if (sz < meanSize) underrepSlots.add(s);
    }

    function preScoreReserve(item: TripWardrobeItem, compat: number): number {
      const colorLower = (item.color || '').toLowerCase();
      const isVersatileColor = VERSATILE_COLORS.has(colorLower);
      const catBonus = CATEGORY_BONUS[getBucket(item) ?? ''] ?? 0;
      const formalityBonus = hasFormalAct ? Math.floor(getNormalizedFormality(item) / 25) : 0;
      const coverageGapBonus = underrepSlots.has(getBucket(item) as CategoryBucket) ? 15 : 0;
      return compat * 10 + (isVersatileColor ? 5 : 0) + catBonus + formalityBonus + coverageGapBonus;
    }

    const strictThreshold = Math.ceil(daySchedules.length / 2);
    const perSlotReserves = new Map<CategoryBucket, ReserveCandidate[]>();

    for (const slot of backupSlots) {
      const slotItems = buckets[slot] || [];
      // Gate with NO provenFitIds — reserves must pass on their own merit
      const gated = gateBackupPool(slotItems, activities, weather, presentation);
      const candidates: ReserveCandidate[] = [];

      for (const item of gated) {
        const compat = preCompatibleDays(item);
        if (compat < strictThreshold) continue;
        const score = preScoreReserve(item, compat);
        if (score > 0) {
          candidates.push({item, score, compatibleDays: compat, slot});
        }
      }
      candidates.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
      perSlotReserves.set(slot, candidates.slice(0, 2));
    }

    // Diversity pass: best from each slot, then fill to max 2
    const allCandidates: ReserveCandidate[] = [];
    for (const c of perSlotReserves.values()) allCandidates.push(...c);
    allCandidates.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));

    const selected: ReserveCandidate[] = [];
    const pickedSlots = new Set<CategoryBucket>();
    for (const c of allCandidates) {
      if (selected.length >= 2) break;
      if (!pickedSlots.has(c.slot)) {
        selected.push(c);
        pickedSlots.add(c.slot);
      }
    }
    if (selected.length < 2) {
      for (const c of allCandidates) {
        if (selected.length >= 2) break;
        if (!selected.some(s => s.item.id === c.item.id)) {
          selected.push(c);
        }
      }
    }
    selected.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));

    preSelectedReserves = selected;
    for (const c of selected) {
      reservedItemIds.add(c.item.id);
    }

    if (__DEV__ && reservedItemIds.size > 0) {
      console.log(
        `[TripCapsule][RESERVE_LOCK] Reserved ${reservedItemIds.size} items BEFORE outfit construction: ` +
        selected.map(c => `${c.item.name} (${c.slot})`).join(', '),
      );
    }
  }

  // Remove reserved items from ALL buckets — outfits and alternates will never see them
  for (const key of Object.keys(buckets) as CategoryBucket[]) {
    buckets[key] = buckets[key].filter(item => !reservedItemIds.has(item.id));
  }

  // Safety: if reserves starved a core slot, return ALL reserves to the pool
  const coreOutfitSlots: CategoryBucket[] = ['tops', 'bottoms', 'shoes'];
  if (reservedItemIds.size > 0 && coreOutfitSlots.some(s => buckets[s].length === 0)) {
    if (__DEV__) {
      console.warn(
        '[TripCapsule][RESERVE_STARVE] Reserves emptied a core slot — returning all reserves to pool',
      );
    }
    for (const c of preSelectedReserves) {
      const b = getBucket(c.item);
      if (b) buckets[b].push(c.item);
    }
    reservedItemIds.clear();
    preSelectedReserves = [];
  }

  // Step 4: Select shoes
  // Trip-wide climate gate: filter out open footwear in freezing/cold
  const _anyDayColdOrFreezing = weather.some(d => d.lowF < 45);
  if (_anyDayColdOrFreezing) {
    const closedToe = buckets.shoes.filter(s => !isOpenFootwear(s));
    if (closedToe.length > 0) {
      buckets.shoes = closedToe;
    }
    // else fail-open: keep original pool
  }
  const maxShoes = numDays <= 5 ? 2 : 3;
  const selectedShoes = fillFootwearRoles(
    buckets.shoes, requiredRoles, capsuleIntent, styleHints,
    activities, weather, maxShoes, roleRegistry,
  );

  logSlotDecision(requestId, {
    category: 'shoes_selected',
    requiredCount: maxShoes,
    selectedCount: selectedShoes.length,
    selected: selectedShoes.map(s => s.name || s.id),
    rejected: buckets.shoes.filter(s => !selectedShoes.some(ss => ss.id === s.id)).map(s => s.name || s.id),
    reason: `max ${maxShoes} shoes for ${numDays}-day trip (role-based)`,
  });

  // Step 5: Select outerwear
  const selectedOuterwear: TripWardrobeItem[] = [];
  if (needs.needsWarmLayer && buckets.outerwear.length > 0) {
    selectedOuterwear.push(buckets.outerwear[0]);
  }
  if (needs.needsRainLayer) {
    const rainItem =
      buckets.outerwear.find(i => i.rainOk) || buckets.outerwear[1];
    if (rainItem && !selectedOuterwear.includes(rainItem)) {
      selectedOuterwear.push(rainItem);
    }
  }

  // Step 5b: Outerwear role coverage — ensure formality diversity when roles require it
  const outerwearRoles = requiredRoles.filter(r => r.role === 'structured_layer' || r.role === 'casual_layer');
  if (outerwearRoles.length > 0 && buckets.outerwear.length >= 2) {
    if (selectedOuterwear.length === 1) {
      // One layer selected by weather — add a complementary formality layer
      const existing = selectedOuterwear[0];
      const existingFormal = getNormalizedFormality(existing) >= 50;
      const complement = buckets.outerwear.find(o =>
        o.id !== existing.id &&
        (existingFormal ? getNormalizedFormality(o) < 50 : getNormalizedFormality(o) >= 50),
      );
      if (complement) {
        selectedOuterwear.push(complement);
        roleRegistry.set(existingFormal ? 'structured_layer' : 'casual_layer', existing);
        roleRegistry.set(existingFormal ? 'casual_layer' : 'structured_layer', complement);
      }
    } else if (selectedOuterwear.length >= 2) {
      // Tag existing selections with roles based on relative formality
      const [a, b] = selectedOuterwear;
      const aMoreFormal = getNormalizedFormality(a) >= getNormalizedFormality(b);
      roleRegistry.set(aMoreFormal ? 'structured_layer' : 'casual_layer', a);
      roleRegistry.set(aMoreFormal ? 'casual_layer' : 'structured_layer', b);
    }
  }

  if (__DEV__ && roleRegistry.size > 0) {
    console.log(
      '[TripCapsule][ROLE_REGISTRY]',
      Object.fromEntries([...roleRegistry.entries()].map(([role, item]) => [role, item.name || item.id])),
    );
  }

  logSlotDecision(requestId, {
    category: 'outerwear_selected',
    selectedCount: selectedOuterwear.length,
    selected: selectedOuterwear.map(o => o.name || o.id),
    reason: `warmLayer=${needs.needsWarmLayer} rainLayer=${needs.needsRainLayer}`,
  });

  // Step 6: Build ANCHOR outfits (first pass)
  const outfits: CapsuleOutfit[] = [];
  const usageTracker = new Map<string, number[]>();
  const anchorBudget = computeAnchorBudget(selectedShoes.map(s => s.id), numDays);

  for (let day = 0; day < numDays; day++) {
    const schedule = daySchedules[day];
    const anchorItems = buildOutfitForActivity(
      schedule.primary,
      day,
      numDays,
      weather[day],
      buckets,
      selectedShoes,
      selectedOuterwear,
      usageTracker,
      startingLocationLabel,
      'anchor',
      presentation,
      styleHints,
      capsuleIntent,
      roleRegistry,
      anchorBudget,
    );
    if (anchorItems.length > 0) {
      outfits.push({
        id: `outfit_${day}`,
        dayLabel: `Day ${day + 1}`,
        type: 'anchor',
        occasion: schedule.primary,
        items: anchorItems,
      });
    }
  }

  // Step 7: Build SUPPORT outfits (second pass — reuse-first)
  for (let day = 0; day < numDays; day++) {
    const schedule = daySchedules[day];
    if (schedule.secondary) {
      const supportItems = buildOutfitForActivity(
        schedule.secondary,
        day,
        numDays,
        weather[day],
        buckets,
        selectedShoes,
        selectedOuterwear,
        usageTracker,
        startingLocationLabel,
        'support',
        presentation,
        styleHints,
        capsuleIntent,
        roleRegistry,
        anchorBudget,
      );
      if (supportItems.length >= 2) {
        outfits.push({
          id: `outfit_${day}_support`,
          dayLabel: `Day ${day + 1}`,
          type: 'support',
          occasion: schedule.secondary,
          items: supportItems,
        });
      }
    }
  }

  // Step 8: Enforce item cap
  enforceItemCap(outfits, numDays);

  // Step 9: Safety invariant — masculine wardrobes must never contain dress-bucket items
  if (presentation === 'masculine') {
    for (const outfit of outfits) {
      const before = outfit.items.length;
      outfit.items = outfit.items.filter(
        i => CATEGORY_MAP[i.mainCategory] !== 'dresses',
      );
      if (outfit.items.length < before) {
        if (__DEV__) {
          console.warn(
            '[TripCapsule] invariant: stripped dresses from masculine capsule',
          );
        }
        logOverride(requestId, {
          rule: 'masculine_dress_strip',
          before,
          after: outfit.items.length,
          detail: `outfit ${outfit.id}: removed ${before - outfit.items.length} dress-bucket items`,
        });
      }
    }

    // Re-validate after dress strip — stripping may have broken core slots
    for (let i = outfits.length - 1; i >= 0; i--) {
      if (!hasCoreSlots(outfits[i].items, presentation)) {
        console.warn('[TripCapsule][CORE_REJECT]', {
          path: 'post_dress_strip',
          outfitId: outfits[i].id,
          activity: outfits[i].occasion,
          presentation,
          slots: outfits[i].items.map(item => CATEGORY_MAP[item.mainCategory] || 'other'),
          items: outfits[i].items.map(item => item.name),
        });
        outfits.splice(i, 1);
      }
    }
  }

  // Step 9b: Format pre-selected reserves OR run post-outfit fallback
  //
  // preSelectedReserves were chosen in Step 3b (before outfit construction)
  // and removed from buckets, guaranteeing zero overlap with outfits/alternates.
  // Fallback only runs if pre-selection found nothing (small wardrobe).
  const usedItemIds = new Set(outfits.flatMap(o => o.items.map(i => i.wardrobeItemId)));
  const anchorOutfits = outfits.filter(o => o.type === 'anchor');
  const hasFormalActivity = activities.some(a => getActivityProfile(a).formality >= 2);
  const isColdTrip = weather.some(d => d.lowF < 55);
  const isRainyTrip = weather.some(d => d.rainChance > 50);

  // Derive dominant activity for reason text
  const dominantActivity = anchorOutfits.reduce((acc, o) => {
    const a = o.occasion || 'trip';
    acc.set(a, (acc.get(a) || 0) + 1);
    return acc;
  }, new Map<string, number>());
  const topActivity = [...dominantActivity.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0]?.toLowerCase() || 'trip';

  function buildReserveReason(c: {item: TripWardrobeItem; compatibleDays: number; slot: CategoryBucket}): string {
    const clauses: string[] = [];

    if (c.compatibleDays >= 3) {
      clauses.push(`Pairs with ${c.compatibleDays} ${topActivity} outfits.`);
    } else if (c.compatibleDays >= 2) {
      clauses.push(`Works across ${c.compatibleDays} outfits.`);
    } else {
      clauses.push(`Compatible ${topActivity} backup.`);
    }

    if (isColdTrip && (c.item.thermalRating ?? 0) > 60) {
      clauses.push('Warm layer for cooler days.');
    } else if (hasFormalActivity && getNormalizedFormality(c.item) >= 70) {
      clauses.push('Formal-appropriate substitute.');
    } else if (isRainyTrip) {
      clauses.push('Backup if weather turns.');
    } else {
      clauses.push('Easy swap if needed.');
    }

    if (c.slot === 'tops') {
      clauses.push('Light and packable spare.');
    } else if (c.slot === 'outerwear') {
      clauses.push('Layers without added bulk.');
    } else if (c.slot === 'shoes') {
      const sub = (c.item.subcategory || 'shoe').toLowerCase();
      clauses.push(`Secondary ${sub} for rotation.`);
    }

    return clauses.join(' ');
  }

  let tripBackupKit: BackupSuggestion[];

  if (preSelectedReserves.length >= 1) {
    // Primary path: reserves were pre-selected and isolated before outfit construction
    tripBackupKit = preSelectedReserves.map(c => ({
      wardrobeItemId: c.item.id,
      name: c.item.name || 'Unknown Item',
      imageUrl: getImageUrl(c.item),
      reason: buildReserveReason(c),
    }));
  } else {
    // FALLBACK: no unused reserves found pre-outfit. Backups must not duplicate outfit items.
    const backupCandidateCategories: CategoryBucket[] = ['tops', 'shoes', 'outerwear'];
    const rawCandidates = filterUsed(
      eligibleItems.filter(item => {
        const b = getBucket(item);
        return b !== null && backupCandidateCategories.includes(b);
      }),
      usedItemIds,
    );
    const fallbackGated = gateBackupPoolFallback(rawCandidates, activities, weather, presentation);
    const fallbackThreshold = Math.ceil(anchorOutfits.length * 0.3);
    const fallbackCandidates: ReserveCandidate[] = [];

    for (const item of fallbackGated) {
      let compat = 0;
      for (const ao of anchorOutfits) {
        const aoIdx = outfits.indexOf(ao);
        const dw = weather[aoIdx];
        const cz = deriveClimateZone(dw);
        const ap = getActivityProfile(ao.occasion as TripActivity);
        if (gatePool([item], cz, ap, presentation).length > 0) compat++;
      }
      if (compat < fallbackThreshold) continue;

      const neutralColorBonus = new Set(['black', 'navy', 'grey', 'gray', 'white', 'tan', 'charcoal', 'cream', 'beige', 'khaki'])
        .has((item.color || '').toLowerCase()) ? 5 : 0;
      const multiOutfitBonus = compat >= 2 ? 10 : 0;
      const score = compat * 10 + multiOutfitBonus + neutralColorBonus;

      if (score > 0) {
        fallbackCandidates.push({item, score, compatibleDays: compat, slot: getBucket(item) as CategoryBucket});
      }
    }
    fallbackCandidates.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));

    const fallbackSelected = fallbackCandidates.slice(0, 2);
    for (const c of fallbackSelected) {
      if (usedItemIds.has(c.item.id)) {
        console.log(
          `[TripCapsule][RESERVE_FALLBACK_USED] reason=INSUFFICIENT_WARDROBE slot=${c.slot} item=${c.item.id} name="${c.item.name}"`,
        );
      }
    }

    tripBackupKit = fallbackSelected.map(c => {
      const clauses: string[] = [];
      if (c.compatibleDays >= 2) {
        clauses.push(`Works with ${c.compatibleDays} ${topActivity} looks.`);
      } else {
        clauses.push(`Pairs with ${topActivity} outfits.`);
      }
      if (isColdTrip && (c.item.thermalRating ?? 0) > 60) {
        clauses.push('Weather-safe layer.');
      } else if (hasFormalActivity && getNormalizedFormality(c.item) >= 70) {
        clauses.push('Formal-appropriate substitute.');
      } else {
        clauses.push('Flexible backup.');
      }
      return {
        wardrobeItemId: c.item.id,
        name: c.item.name || 'Unknown Item',
        imageUrl: getImageUrl(c.item),
        reason: clauses.join(' '),
      };
    });

    if (fallbackCandidates.length === 0) {
      const minFormality = tripFormalityFloor(activities);
      const tripLowF = Math.min(...weather.map(d => d.lowF));
      const tripHighF = Math.max(...weather.map(d => d.highF));
      logOverride(requestId, {
        rule: 'backup_kit_empty',
        before: rawCandidates.length,
        after: 0,
        detail: JSON.stringify({
          dominantActivity: topActivity,
          minFormality,
          climateRange: {lowF: tripLowF, highF: tripHighF},
          rawCandidates: rawCandidates.length,
          gatedFallback: fallbackGated.length,
        }),
      });
    }
  }

  // ── DEV: Hard isolation assertions ──
  if (__DEV__) {
    for (const b of tripBackupKit) {
      if (usedItemIds.has(b.wardrobeItemId)) {
        throw new Error(
          `[TripCapsule] ISOLATION VIOLATION: backup "${b.name}" (${b.wardrobeItemId}) overlaps planned outfit`,
        );
      }
    }
    // Verify alternates don't overlap with reserves
    for (const outfit of outfits) {
      for (const pi of outfit.items) {
        const alts = (pi as any).alternates as Array<{id: string}> | undefined;
        if (!alts) continue;
        for (const alt of alts) {
          if (reservedItemIds.has(alt.id)) {
            throw new Error(
              `[TripCapsule] ISOLATION VIOLATION: alternate "${alt.id}" overlaps reserved backup`,
            );
          }
        }
      }
    }
  }

  // ── FINAL VALIDATION GATE — absolute last line of defense ──
  // Runs AFTER all assembly, pruning, dress-strip, item-cap, and reserve handling.
  // No outfit leaves buildCapsule without passing this gate.
  for (let i = outfits.length - 1; i >= 0; i--) {
    if (!isFinalOutfitValid(outfits[i].items, presentation)) {
      console.warn('[TripCapsule][FINAL_REJECT]', {
        dayIndex: i,
        activity: outfits[i].occasion,
        presentation,
        slots: outfits[i].items.map(item => CATEGORY_MAP[item.mainCategory] || 'other'),
        items: outfits[i].items.map(item => item.name),
      });
      outfits.splice(i, 1);
    }
  }

  if (outfits.length === 0) {
    console.error('[TripCapsule][FATAL_EMPTY]', {
      presentation,
      activities,
      wardrobeSize: wardrobeItems.length,
      eligibleCount: eligibleItems.length,
      bucketSizes: Object.fromEntries(
        (Object.keys(buckets) as CategoryBucket[]).map(k => [k, buckets[k].length]),
      ),
    });
  }

  // Step 10: Build packing list
  const packingList = buildPackingList(outfits, PACKING_CATEGORY_ORDER);

  // Step 11: Stamp fingerprint (includes presentation for cache invalidation)
  const fingerprint = buildCapsuleFingerprint(
    wardrobeItems,
    weather,
    activities,
    startingLocationLabel,
    presentation,
  );

  const buildId = generateBuildId();

  logOutput(requestId, {
    outfitCount: outfits.length,
    packingGroups: packingList.map(g => ({category: g.category, count: g.items.length})),
    uniqueItems: packingList.reduce((sum, g) => sum + g.items.length, 0),
    buildId,
  });

  // ── Elite Scoring: derive wardrobe stats ──
  const wardrobeStats = deriveWardrobeStats(wardrobeItems);

  // Elite Scoring hook — Phase 2: rerank when V2 flag on
  // ONE-FLAG: ELITE_ENABLED_TRIPS in eliteFlags.ts:7 force-enables ELITE_SCORING_TRIPS + V2
  let _eliteHookRan = false;
  let eliteOutfits = outfits;
  if (ELITE_SCORING_TRIPS || ELITE_SCORING_TRIPS_V2) {
    const canonical = outfits.map(normalizeTripsOutfit);
    const result = elitePostProcessOutfits(
      canonical,
      {presentation, wardrobeStats},
      {mode: 'trips', requestId,
       rerank: ELITE_SCORING_TRIPS_V2, debug: ELITE_SCORING_DEBUG},
    );
    eliteOutfits = result.outfits.map(denormalizeTripsOutfit);
    _eliteHookRan = true;
  }
  if (ELITE_SCORING_DEBUG) {
    console.log(JSON.stringify({
      _tag: 'TRIPS_ELITE_PROOF',
      eliteEnabled: ELITE_SCORING_TRIPS || ELITE_SCORING_TRIPS_V2,
      usedV2: ELITE_SCORING_TRIPS_V2 && _eliteHookRan,
      eliteHookRan: _eliteHookRan,
    }));
  }
  // NOTE: No exposure event for Trips — no backend call exists.
  // Trips is 100% client-side (AsyncStorage). Revisit in Phase 2.

  // Trace point 7: Final outcome
  if (TRIP_TRACE) {
    const shoeItems = eliteOutfits.flatMap(o => o.items.filter(i => CATEGORY_MAP[i.mainCategory] === 'shoes'));
    const uniqueShoeIds = [...new Set(shoeItems.map(s => s.wardrobeItemId))];
    trace('final_outcome', 'Packing complete', {
      finalShoesPacked: uniqueShoeIds.map(id => {
        const item = shoeItems.find(s => s.wardrobeItemId === id);
        const uses = usageTracker.get(id) || [];
        return {id, name: item?.name, usedOnDays: uses, useCount: uses.length};
      }),
      roleRegistry: Object.fromEntries(
        [...roleRegistry.entries()].map(([role, item]) => [role, {id: item.id, name: item.name, color: item.color}]),
      ),
      reusePenalties: uniqueShoeIds.map(id => {
        const uses = usageTracker.get(id) || [];
        return {id, useCount: uses.length, days: uses};
      }),
      totalOutfits: eliteOutfits.length,
      totalUniqueItems: packingList.reduce((sum, g) => sum + g.items.length, 0),
    });

    // Single log line
    console.log('TRIP TRACE', tripTrace);
  }

  const capsuleResult = {
    build_id: buildId,
    outfits: eliteOutfits,
    packingList,
    version: CAPSULE_VERSION,
    fingerprint,
    ...(tripBackupKit.length > 0 ? {tripBackupKit} : {}),
  };

  // Attach trace to result for external inspection
  if (TRIP_TRACE) {
    (capsuleResult as any).__trace = tripTrace;
  }

  return capsuleResult;
}

// ── Capsule validation ──

export function validateCapsule(
  capsule: TripCapsule,
  weather: DayWeather[],
  activities: TripActivity[],
  wardrobeItems?: TripWardrobeItem[],
  explicitPresentation?: Presentation,
): CapsuleWarning[] {
  const warnings: CapsuleWarning[] = [];
  const allCategories = new Set(capsule.packingList.map(g => g.category));
  const allItems = capsule.packingList.flatMap(g => g.items);

  if (!allCategories.has('Shoes') && allItems.length > 0) {
    warnings.push({
      code: 'NO_SHOES',
      message: 'No shoes in your packing list — add footwear to your wardrobe',
    });
  }

  const needsWarm = weather.some(d => d.lowF < 55);
  if (needsWarm && !allCategories.has('Outerwear')) {
    warnings.push({
      code: 'NO_OUTERWEAR',
      message: 'Cold days ahead but no outerwear available',
    });
  }

  const hasRain = weather.some(d => d.rainChance > 50);
  if (hasRain) {
    const hasRainItem = allItems.some(i => isSlot(i, 'outerwear'));
    if (!hasRainItem) {
      warnings.push({
        code: 'NO_RAIN_GEAR',
        message: 'Rain expected but no outerwear packed',
      });
    }
  }

  if (!allCategories.has('Tops') && !allCategories.has('Dresses') && allItems.length > 0) {
    warnings.push({
      code: 'NO_TOPS',
      message: 'No tops or dresses — add clothing to your wardrobe',
    });
  }

  if (activities.includes('Beach')) {
    const hasSwim = allItems.some(
      i => i.subCategory?.toLowerCase().includes('swim') || isSlot(i, 'swimwear'),
    );
    if (!hasSwim) {
      warnings.push({
        code: 'NO_SWIMWEAR',
        message: 'Beach planned but no swimwear found',
      });
    }
  }

  if (activities.includes('Active')) {
    const hasActivewear = allItems.some(i => isSlot(i, 'activewear'));
    if (!hasActivewear) {
      warnings.push({
        code: 'NO_ACTIVEWEAR',
        message: 'Workouts planned but no activewear found',
      });
    }
  }

  const presentation = explicitPresentation
    ?? (wardrobeItems ? detectPresentation(wardrobeItems) : 'mixed');

  if (
    presentation === 'masculine' &&
    capsule.outfits.some(o => o.items.some(i => isSlot(i, 'dresses')))
  ) {
    warnings.push({
      code: 'STYLE_COHERENCE_VIOLATION',
      message:
        'Masculine wardrobe but dresses leaked into outfits — this is a bug',
    });
  }

  if (allItems.length === 0) {
    warnings.push({
      code: 'EMPTY_CAPSULE',
      message: 'No items could be packed — add items to your wardrobe',
    });
  }

  return warnings;
}
