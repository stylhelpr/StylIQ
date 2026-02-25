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
import {filterByTasteGate, type TripsTasteProfile} from './tripsTasteGate';
import {createCoherenceState, updateCoherence, capsuleDriftPenalty, type CapsuleCoherenceState} from './capsuleCoherence';

// Bump this whenever capsule logic changes to force auto-rebuild of stale stored capsules
export const CAPSULE_VERSION = 24;

// ── Diagnostic debug logging (structured, guarded) ──
const DEBUG_TRIPS_ENGINE = true;

// ── Trip Trace Instrumentation ──
const TRIP_TRACE = true;

type TripTraceEvent = {
  step: string;
  message: string;
  data?: any;
};

let tripTrace: TripTraceEvent[] = [];
let buildWarnings: CapsuleWarning[] = [];
let shoelessRejects = 0;

// Gate log dedup: suppress identical consecutive gate logs within a single build
const _gateLogSeen = new Map<string, string>();
function gateLog(gateType: string, itemId: string, result: string, msg: string) {
  if (!__DEV__) return;
  const key = `${gateType}|${itemId}`;
  if (_gateLogSeen.get(key) === result) return;
  _gateLogSeen.set(key, result);
  console.log(msg);
}

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

/** Denim bottom detection: material contains "denim" OR subcategory contains "jean"/"denim", AND item is in bottoms slot. */
export function isDenimBottom(item: TripWardrobeItem): boolean {
  const slot = mapMainCategoryToSlot(item.main_category);
  if (slot !== 'bottoms') return false;
  const mat = (item.material || '').toLowerCase();
  const sub = (item.subcategory || '').toLowerCase();
  return mat.includes('denim') || sub.includes('jean') || sub.includes('denim');
}

/** Returns true when denim bottoms should receive a scoring penalty: trip has Formal/Business activities AND cold/freezing climate. */
export function shouldSuppressDenim(
  activities: TripActivity[],
  derivedBand: ClimateZone,
): boolean {
  const hasFormalOrBusiness = activities.includes('Formal') || activities.includes('Business');
  const isColdOrFreezing = derivedBand === 'cold' || derivedBand === 'freezing';
  return hasFormalOrBusiness && isColdOrFreezing;
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  UNIVERSAL PURPOSE COMPATIBILITY
// ══════════════════════════════════════════════════════════════════════════════

export type GarmentPurpose = 'athletic' | 'leisure' | 'casual' | 'smart' | 'formal' | 'outdoor' | 'swim' | 'sleep' | 'unknown';
export type ActivityPurposeClass = 'formal_event' | 'business' | 'daily' | 'sport' | 'outdoor' | 'water' | 'rest';

const PURPOSE_COMPATIBILITY: Record<ActivityPurposeClass, readonly GarmentPurpose[]> = {
  formal_event: ['formal', 'smart'],
  business: ['smart', 'casual', 'formal'],
  daily: ['casual', 'smart', 'leisure', 'formal', 'outdoor'],
  sport: ['athletic', 'outdoor', 'casual'],
  outdoor: ['outdoor', 'athletic', 'casual'],
  water: ['swim', 'leisure', 'casual'],
  rest: ['leisure', 'sleep', 'casual'],
};

export function getGarmentPurpose(item: TripWardrobeItem): GarmentPurpose {
  const sub = (item.subcategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const mat = (item.material || '').toLowerCase();
  const tags = (item.occasionTags || []).map(t => t.toLowerCase());
  const text = `${sub} ${name}`;

  // swim — check first, very specific
  if ((item.main_category || '') === 'Swimwear') return 'swim';
  if (/\b(swim|bikini|trunks|board ?shorts?|rash ?guard|cover[- ]?up)\b/.test(text)) return 'swim';

  // sleep
  if (/\b(pajama|pyjama|nightgown|sleep|robe|bathrobe|lounge ?set)\b/.test(text)) return 'sleep';

  // athletic — performance / sport
  if (/\b(running|athletic|trainer|performance|gym|sport|yoga|compression|track ?pant|track ?suit|workout|jersey|cleat|spikes?)\b/.test(text)) return 'athletic';
  if (/\b(neoprene|spandex|lycra|dri[- ]?fit|moisture[- ]?wicking)\b/.test(mat)) return 'athletic';
  if (tags.some(t => /\b(gym|sport|workout|running|training|athletic)\b/.test(t))) return 'athletic';

  // outdoor — rugged / trail
  if (/\b(hiking|trail|climbing|waterproof boot|rain boot|snow boot|work boot|combat boot|utility|cargo|parka|anorak|windbreaker|gore[- ]?tex)\b/.test(text)) return 'outdoor';
  if (/\b(gore[- ]?tex|ripstop|cordura|waxed cotton)\b/.test(mat)) return 'outdoor';

  // formal — structured dress
  if (/\b(tuxedo|tux|patent leather|oxford|wholecut|cap[- ]?toe|monk[- ]?strap|dress shoe|dress shoes|gown|ball ?gown|bow ?tie|cummerbund|cufflink)\b/.test(text)) return 'formal';
  if (getFormalityTier(item) >= 3) return 'formal';

  // smart — polished but not black-tie
  if (/\b(loafer|penny loafer|tassel loafer|moccasin|chelsea boot|chukka|blazer|sport ?coat|dress shirt|trousers?|slacks|dress pant|brogue|derby|wingtip)\b/.test(text)) return 'smart';
  if (getFormalityTier(item) >= 2) return 'smart';

  // leisure — relaxed, non-performance
  if (/\b(slides?|flip[- ]?flops?|slippers?|kaftan|caftan|sarong|muumuu)\b/.test(text)) return 'leisure';

  // casual — everything else that has recognizable casual markers
  if (/\b(sneaker|canvas|t[- ]?shirt|tee|jeans?|denim|hoodie|sweatshirt|jogger|shorts|polo|chino|espadrille|boat ?shoe|sandal)\b/.test(text)) return 'casual';

  return 'unknown';
}

export function getActivityPurposeClass(profile: ActivityProfile): ActivityPurposeClass {
  if (profile.formality >= 3) return 'formal_event';
  if (profile.formality >= 2) return 'business';
  if (profile.context === 'sport') return 'sport';
  if (profile.context === 'beach') return 'water';
  return 'daily';
}

export function isPurposeCompatible(itemPurpose: GarmentPurpose, activityPurpose: ActivityPurposeClass): boolean {
  if (itemPurpose === 'unknown') return true;
  return PURPOSE_COMPATIBILITY[activityPurpose].includes(itemPurpose);
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  TRIP-LOCAL SEMANTIC SCORING (enums + derivation + multipliers)
// ══════════════════════════════════════════════════════════════════════════════

/** Trip-local garment purpose — derived from metadata only, not names. */
export type TripGarmentPurpose =
  | 'BUSINESS_CORE'
  | 'SMART_CASUAL'
  | 'LEISURE_DAY'
  | 'RESORT_RELAXED'
  | 'TRAINING'
  | 'TRAVEL_COMFORT'
  | 'WIND_LAYER'
  | 'RAIN_SHELL'
  | 'OPEN_FOOTWEAR'
  | 'CLOSED_FOOTWEAR';

/** Trip-local activity purpose — derived from TripActivity + weather. */
export type TripActivityPurpose =
  | 'WORK_CLIENT'
  | 'EVENING_SOCIAL'
  | 'TRAVEL_DAY'
  | 'WARM_LEISURE_TRAVEL'
  | 'ATHLETIC_TRAINING'
  | 'SUN_FORWARD'
  | 'RAIN_RISK'
  | 'WIND_RISK';

/** Thermal profile derived from material/thickness metadata. */
export type TripThermalProfile =
  | 'HOT_BREATHABLE'
  | 'WARM_LIGHT'
  | 'MILD_ALLDAY'
  | 'COOL_LAYER'
  | 'COLD_INSULATING';

type TripGarmentProfile = {
  garmentPurposes: Set<TripGarmentPurpose>;
  thermal: TripThermalProfile;
};

// ── Material classification maps (metadata-driven) ──
const HOT_BREATHABLE_MATERIALS = /\b(linen|seersucker|chambray|gauze|muslin|batiste|voile|lawn|mesh|poplin|rayon|viscose|modal|tencel|lyocell|bamboo)\b/i;
const WARM_LIGHT_MATERIALS = /\b(cotton|silk|jersey|pique|chiffon|crepe)\b/i;
const COOL_LAYER_MATERIALS = /\b(flannel|corduroy|denim|twill|canvas|ponte|neoprene)\b/i;
const COLD_INSULATING_MATERIALS = /\b(wool|cashmere|merino|tweed|fleece|sherpa|shearling|down|quilted|boucle|mohair|velvet)\b/i;

// ── Subcategory → purpose mappings (metadata-driven, no name checks) ──
const BUSINESS_SUBCATEGORIES = /\b(blazer|sport coat|dress shirt|trousers|slacks|dress pant|suit|waistcoat|vest|tie|bow tie|cufflink|pocket square)\b/i;
const TRAINING_SUBCATEGORIES = /\b(legging|jogger|sweatpant|track pant|compression|sports bra|athletic|running|yoga|workout|gym|jersey|tank top)\b/i;
const LEISURE_SUBCATEGORIES = /\b(shorts|tank|crop|t-shirt|tee|polo|bermuda|capri|sundress|romper|jumpsuit|kaftan|caftan|sarong|muumuu)\b/i;
const RESORT_SUBCATEGORIES = /\b(hawaiian|aloha|board short|swim|bikini|trunks|rash guard|cover-up|sandal|flip-flop|slide|espadrille)\b/i;
const WIND_LAYER_SUBCATEGORIES = /\b(windbreaker|anorak|shell|bomber|harrington)\b/i;
const RAIN_SHELL_SUBCATEGORIES = /\b(rain coat|rain jacket|trench|parka|poncho|slicker|mac)\b/i;
const OPEN_FOOTWEAR_SUBCATEGORIES = /\b(sandal|flip-flop|slide|thong|espadrille|mule)\b/i;
const SMART_CASUAL_SUBCATEGORIES = /\b(chino|loafer|chelsea|chukka|derby|brogue|oxford|button-down|cardigan|sweater|pullover|turtleneck|mock neck)\b/i;

/**
 * Derive garment profile (purposes + thermal) from metadata ONLY.
 * Uses: category, subcategory, dress_code, occasion_tags, material, layering.
 * NO name-based logic. NO brand checks. NO gender assumptions.
 */
export function deriveGarmentProfile(item: TripWardrobeItem): TripGarmentProfile {
  const purposes = new Set<TripGarmentPurpose>();
  const sub = (item.subcategory || '').toLowerCase();
  const cat = (item.main_category || '').toLowerCase();
  const dressCode = (item.dressCode || '').toLowerCase();
  const mat = (item.material || '').toLowerCase();
  const tags = (item.occasionTags || []).map(t => t.toLowerCase());
  const layering = (item.layering || '').toLowerCase();

  // ── Purpose derivation from metadata ──

  // Business core: dress_code or high-formality subcategories
  if (dressCode.includes('business') || dressCode.includes('formal') || dressCode.includes('black tie')) {
    purposes.add('BUSINESS_CORE');
  }
  if (BUSINESS_SUBCATEGORIES.test(sub)) purposes.add('BUSINESS_CORE');

  // Smart casual
  if (dressCode.includes('smart casual') || dressCode.includes('smart-casual')) {
    purposes.add('SMART_CASUAL');
  }
  if (SMART_CASUAL_SUBCATEGORIES.test(sub)) purposes.add('SMART_CASUAL');

  // Training: occasion tags or athletic subcategories
  if (tags.some(t => /\b(gym|sport|workout|running|training|athletic|yoga|exercise)\b/.test(t))) {
    purposes.add('TRAINING');
  }
  if (cat === 'activewear' || TRAINING_SUBCATEGORIES.test(sub)) purposes.add('TRAINING');

  // Leisure day: casual warm-weather subcategories
  if (LEISURE_SUBCATEGORIES.test(sub) && !purposes.has('TRAINING')) {
    purposes.add('LEISURE_DAY');
  }

  // Resort relaxed: swimwear, beach, resort subcategories
  if (cat === 'swimwear' || RESORT_SUBCATEGORIES.test(sub)) {
    purposes.add('RESORT_RELAXED');
  }

  // Travel comfort: layering=base/mid or dressCode casual + comfortable material
  if (dressCode.includes('casual') && !purposes.has('BUSINESS_CORE')) {
    purposes.add('TRAVEL_COMFORT');
  }
  if (layering === 'base' || layering === 'mid') {
    purposes.add('TRAVEL_COMFORT');
  }

  // Wind layer
  if (WIND_LAYER_SUBCATEGORIES.test(sub) || layering === 'shell') {
    purposes.add('WIND_LAYER');
  }

  // Rain shell
  if (RAIN_SHELL_SUBCATEGORIES.test(sub) || item.rainOk === true) {
    purposes.add('RAIN_SHELL');
  }

  // Footwear detection (subcategory-driven)
  if (cat === 'shoes' || cat === 'footwear') {
    if (OPEN_FOOTWEAR_SUBCATEGORIES.test(sub)) {
      purposes.add('OPEN_FOOTWEAR');
    } else {
      purposes.add('CLOSED_FOOTWEAR');
    }
  }

  // ── Thermal profile derivation from material ──
  let thermal: TripThermalProfile = 'MILD_ALLDAY';

  if (COLD_INSULATING_MATERIALS.test(mat)) {
    thermal = 'COLD_INSULATING';
  } else if (COOL_LAYER_MATERIALS.test(mat)) {
    thermal = 'COOL_LAYER';
  } else if (HOT_BREATHABLE_MATERIALS.test(mat)) {
    thermal = 'HOT_BREATHABLE';
  } else if (WARM_LIGHT_MATERIALS.test(mat)) {
    thermal = 'WARM_LIGHT';
  }

  // Override thermal if thermalRating metadata is available
  if (item.thermalRating != null) {
    if (item.thermalRating >= 80) thermal = 'COLD_INSULATING';
    else if (item.thermalRating >= 60) thermal = 'COOL_LAYER';
    else if (item.thermalRating <= 20) thermal = 'HOT_BREATHABLE';
    else if (item.thermalRating <= 40) thermal = 'WARM_LIGHT';
  }

  return {garmentPurposes: purposes, thermal};
}

/**
 * Expand a TripActivity + weather into a set of TripActivityPurpose values.
 * No location logic. No user-specific logic.
 */
export function expandTripActivityPurposes(
  activity: TripActivity,
  dayWeather: DayWeather | undefined,
): Set<TripActivityPurpose> {
  const purposes = new Set<TripActivityPurpose>();

  // ── Activity → base purpose mapping ──
  switch (activity) {
    case 'Business':
      purposes.add('WORK_CLIENT');
      break;
    case 'Formal':
      purposes.add('WORK_CLIENT');
      purposes.add('EVENING_SOCIAL');
      break;
    case 'Dinner':
      purposes.add('EVENING_SOCIAL');
      break;
    case 'Active':
      purposes.add('ATHLETIC_TRAINING');
      break;
    case 'Sightseeing':
      purposes.add('TRAVEL_DAY');
      break;
    case 'Casual':
      purposes.add('TRAVEL_DAY');
      break;
    case 'Beach':
      purposes.add('WARM_LEISURE_TRAVEL');
      break;
    case 'Cold Weather':
      purposes.add('TRAVEL_DAY');
      break;
  }

  // ── Weather-derived purpose expansion ──
  if (dayWeather) {
    // Warm leisure: highF >= 75 AND non-business/formal
    if (dayWeather.highF >= 75 && activity !== 'Business' && activity !== 'Formal') {
      purposes.add('WARM_LEISURE_TRAVEL');
    }

    // Sun forward: sunny/partly-cloudy + highF >= 70
    if ((dayWeather.condition === 'sunny' || dayWeather.condition === 'partly-cloudy') && dayWeather.highF >= 70) {
      purposes.add('SUN_FORWARD');
    }

    // Rain risk: rainChance > 40 or rainy condition
    if (dayWeather.rainChance > 40 || dayWeather.condition === 'rainy') {
      purposes.add('RAIN_RISK');
    }

    // Wind risk: windy condition
    if (dayWeather.condition === 'windy') {
      purposes.add('WIND_RISK');
    }
  }

  return purposes;
}

/**
 * Purpose compatibility multiplier: how well garment purposes align with activity purposes.
 * Returns: strong match→1.4, light match→1.15, neutral→1, discourage→0.9
 */
export function tripPurposeMultiplier(
  garmentPurposes: Set<TripGarmentPurpose>,
  activityPurposes: Set<TripActivityPurpose>,
): number {
  // No purposes derived → neutral (no penalty for missing metadata)
  if (garmentPurposes.size === 0) return 1;

  let best = 1; // neutral baseline

  // Strong matches (1.4)
  if (activityPurposes.has('WORK_CLIENT') && garmentPurposes.has('BUSINESS_CORE')) best = Math.max(best, 1.4);
  if (activityPurposes.has('WARM_LEISURE_TRAVEL') && garmentPurposes.has('LEISURE_DAY')) best = Math.max(best, 1.4);
  if (activityPurposes.has('WARM_LEISURE_TRAVEL') && garmentPurposes.has('RESORT_RELAXED')) best = Math.max(best, 1.4);
  if (activityPurposes.has('ATHLETIC_TRAINING') && garmentPurposes.has('TRAINING')) best = Math.max(best, 1.4);
  if (activityPurposes.has('RAIN_RISK') && garmentPurposes.has('RAIN_SHELL')) best = Math.max(best, 1.4);
  if (activityPurposes.has('WIND_RISK') && garmentPurposes.has('WIND_LAYER')) best = Math.max(best, 1.4);

  // Light matches (1.15)
  if (activityPurposes.has('WORK_CLIENT') && garmentPurposes.has('SMART_CASUAL')) best = Math.max(best, 1.15);
  if (activityPurposes.has('EVENING_SOCIAL') && garmentPurposes.has('SMART_CASUAL')) best = Math.max(best, 1.15);
  if (activityPurposes.has('EVENING_SOCIAL') && garmentPurposes.has('BUSINESS_CORE')) best = Math.max(best, 1.15);
  if (activityPurposes.has('TRAVEL_DAY') && garmentPurposes.has('TRAVEL_COMFORT')) best = Math.max(best, 1.15);
  if (activityPurposes.has('WARM_LEISURE_TRAVEL') && garmentPurposes.has('OPEN_FOOTWEAR')) best = Math.max(best, 1.15);
  if (activityPurposes.has('SUN_FORWARD') && garmentPurposes.has('LEISURE_DAY')) best = Math.max(best, 1.15);

  // Discouragements (0.9) — only apply if no strong/light match found
  if (best === 1) {
    if (activityPurposes.has('WORK_CLIENT') && (garmentPurposes.has('LEISURE_DAY') || garmentPurposes.has('RESORT_RELAXED') || garmentPurposes.has('TRAINING'))) best = 0.9;
    if (activityPurposes.has('WARM_LEISURE_TRAVEL') && garmentPurposes.has('BUSINESS_CORE')) best = 0.9;
    if (activityPurposes.has('ATHLETIC_TRAINING') && (garmentPurposes.has('BUSINESS_CORE') || garmentPurposes.has('SMART_CASUAL'))) best = 0.9;
  }

  return best;
}

/**
 * Thermal compatibility multiplier: how well a garment's thermal profile
 * matches the weather band. Does NOT replace legality gates — only multiplies score.
 *
 * Weather bands (°F):
 *   HOT: highF >= 85
 *   WARM: highF 75–84
 *   MILD: highF 60–74
 *   COOL: highF 45–59
 *   COLD: highF < 45
 */
export function tripThermalMultiplier(
  thermal: TripThermalProfile,
  dayWeather: DayWeather | undefined,
): number {
  if (!dayWeather) return 1; // no weather data → neutral

  const high = dayWeather.highF;

  // HOT band: >= 85°F
  if (high >= 85) {
    switch (thermal) {
      case 'HOT_BREATHABLE': return 1.4;
      case 'WARM_LIGHT': return 1.25;
      case 'MILD_ALLDAY': return 1;
      case 'COOL_LAYER': return 0.75;
      case 'COLD_INSULATING': return 0;
    }
  }

  // WARM band: 75–84°F
  if (high >= 75) {
    switch (thermal) {
      case 'HOT_BREATHABLE': return 1.35;
      case 'WARM_LIGHT': return 1.25;
      case 'MILD_ALLDAY': return 1;
      case 'COOL_LAYER': return 0.85;
      case 'COLD_INSULATING': return 0;
    }
  }

  // MILD band: 60–74°F
  if (high >= 60) {
    switch (thermal) {
      case 'HOT_BREATHABLE': return 1.1;
      case 'WARM_LIGHT': return 1.15;
      case 'MILD_ALLDAY': return 1.1;
      case 'COOL_LAYER': return 1.1;
      case 'COLD_INSULATING': return 0.85;
    }
  }

  // COOL band: 45–59°F
  if (high >= 45) {
    switch (thermal) {
      case 'HOT_BREATHABLE': return 0.85;
      case 'WARM_LIGHT': return 1;
      case 'MILD_ALLDAY': return 1.1;
      case 'COOL_LAYER': return 1.3;
      case 'COLD_INSULATING': return 1.25;
    }
  }

  // COLD band: < 45°F
  switch (thermal) {
    case 'HOT_BREATHABLE': return 0;
    case 'WARM_LIGHT': return 0.75;
    case 'MILD_ALLDAY': return 0.9;
    case 'COOL_LAYER': return 1.25;
    case 'COLD_INSULATING': return 1.4;
  }
}

// ── Lightweight fabric detection (metadata-driven, no brand/name heuristics) ──

const LIGHTWEIGHT_FABRICS = /\b(linen|cotton|seersucker|chambray|rayon|viscose|modal|tencel|lyocell|bamboo|silk|mesh|poplin|voile|gauze|muslin|batiste|lawn)\b/;
const HEAVY_FABRICS = /\b(wool|cashmere|merino|tweed|flannel|fleece|sherpa|corduroy|velvet|boucle|mohair|shearling|down|quilted|neoprene)\b/;

function isLightweightFabric(material: string | undefined): boolean {
  if (!material) return false;
  return LIGHTWEIGHT_FABRICS.test(material.toLowerCase());
}

function isHeavyFabric(material: string | undefined): boolean {
  if (!material) return false;
  return HEAVY_FABRICS.test(material.toLowerCase());
}

// ── ELITE_BEACH_WARM helpers (V24) ──

const BEACH_WARM_HEAVY_RE = /\b(wool|cashmere|merino|fleece|sherpa|shearling|down|quilted|tweed|velvet)\b/i;

/** Pure, deterministic check: is this a warm/hot Beach context? Case-insensitive. */
function isWarmHotBeachContext(
  activityKey: string | undefined,
  contextProfile: {context?: string} | undefined,
  climateZoneOrBand: string | undefined,
): boolean {
  const actMatch = String(activityKey ?? '').toLowerCase() === 'beach';
  const ctxMatch = String(contextProfile?.context ?? '').toLowerCase() === 'beach';
  if (!actMatch && !ctxMatch) return false;
  const zone = String(climateZoneOrBand ?? '').toLowerCase();
  return zone === 'warm' || zone === 'hot';
}

/**
 * Remove items whose material OR name matches heavy-fabric regex.
 * Preserves input order (stable filter). No fallback — empty stays empty.
 */
function filterHeavyFabricsForBeach(
  items: TripWardrobeItem[],
  reasonTag: string,
): TripWardrobeItem[] {
  const before = items.length;
  const filtered = items.filter(item => {
    if (item.material && BEACH_WARM_HEAVY_RE.test(item.material)) return false;
    if (item.name && BEACH_WARM_HEAVY_RE.test(item.name)) return false;
    return true;
  });
  if (filtered.length < before) {
    console.log(`[TripCapsule][ELITE_BEACH_WARM_FILTER] ${reasonTag} removed=${before - filtered.length} remaining=${filtered.length}`);
  }
  return filtered;
}

/**
 * Context-primary candidate detection: identifies items that should be elevated
 * to PRIMARY tier when in warm/hot climate + water/rest activity contexts.
 *
 * Metadata-driven only — no name heuristics, no brand checks, no gender assumptions.
 */
function isContextPrimaryCandidate(
  item: TripWardrobeItem,
  activityProfile: ActivityProfile,
  climateZone: ClimateZone,
): boolean {
  if (climateZone !== 'warm' && climateZone !== 'hot') return false;
  const purposeClass = getActivityPurposeClass(activityProfile);
  if (purposeClass !== 'water' && purposeClass !== 'rest') return false;
  if (activityProfile.formality >= 2) return false;

  if (isHeavyFabric(item.material)) return false;

  const purpose = getGarmentPurpose(item);
  if (purpose === 'swim' || purpose === 'leisure') return true;
  if (isLightweightFabric(item.material)) return true;

  return false;
}

/**
 * Warm-leisure context detection: identifies warm/hot climate + water/rest activity
 * combinations where lightweight/swim items should be strongly preferred.
 */
export function getWarmLeisureContext(
  activityProfile: ActivityProfile,
  climateZone: ClimateZone,
): {isWarmLeisure: boolean; strength: number} {
  if (activityProfile.formality >= 2) return {isWarmLeisure: false, strength: 0};

  const activityPurpose = getActivityPurposeClass(activityProfile);
  if (activityPurpose !== 'water' && activityPurpose !== 'rest') return {isWarmLeisure: false, strength: 0};

  if (climateZone === 'hot') return {isWarmLeisure: true, strength: 1.3};
  if (climateZone === 'warm') return {isWarmLeisure: true, strength: 1.0};
  return {isWarmLeisure: false, strength: 0};
}

/**
 * Activity-purpose scoring modifier for warm-climate leisure/water activities.
 * Soft preference layer — does NOT gate items (that's isItemValidForActivity's job).
 *
 * Only activates when:
 *   - activityPurpose is 'water' or 'rest' (beach/leisure activities)
 *   - climate is warm or hot
 *   - formality <= 1 (never influences business/formal)
 *
 * Base scoring:
 *   +0.6 if purpose === 'swim'
 *   +0.4 if purpose === 'leisure'
 *   +0.2 if lightweight fabric
 *   -0.4 if heavy fabric
 *
 * In warm-leisure context: bonus multiplied by 1.8 * strength, clamp widened to ±1.4.
 * Otherwise: clamped to ±0.8.
 */
export function activityPurposeBonus(
  item: TripWardrobeItem,
  activityProfile: ActivityProfile,
  climateZone: ClimateZone,
): number {
  // Guardrail: never influence business/formal activities
  if (activityProfile.formality >= 2) return 0;

  const ctx = getWarmLeisureContext(activityProfile, climateZone);

  const activityPurpose = getActivityPurposeClass(activityProfile);
  const isWarmClimate = climateZone === 'warm' || climateZone === 'hot';

  // Only activate for water/rest activities in warm climates
  if (!isWarmClimate || (activityPurpose !== 'water' && activityPurpose !== 'rest')) return 0;

  const itemPurpose = getGarmentPurpose(item);
  let bonus = 0;

  // Purpose-based boost
  if (itemPurpose === 'swim') bonus += 0.6;
  else if (itemPurpose === 'leisure') bonus += 0.4;

  // Fabric weight modifier
  if (isLightweightFabric(item.material)) bonus += 0.2;
  if (isHeavyFabric(item.material)) bonus -= 0.4;

  // Context-scale: amplify in warm-leisure band
  if (ctx.isWarmLeisure) {
    bonus *= 1.8 * ctx.strength;
    return Math.max(-1.4, Math.min(1.4, bonus));
  }

  // Normal clamp
  return Math.max(-0.8, Math.min(0.8, bonus));
}

/** Hard gate: lightweight-only fabrics inappropriate for cold/freezing (linen dress, chiffon blouse). */
function isLightweightFabricOnly(item: TripWardrobeItem): boolean {
  if (!item.material) return false;
  const mat = item.material.toLowerCase();
  return /\b(linen|chiffon|mesh|gauze|voile|seersucker)\b/.test(mat)
    && !/\b(wool|fleece|cashmere|down|quilted|flannel)\b/.test(mat);
}

/** Layering bases (silk base layer under wool) are exempt from lightweight gate. */
function isLayeringBase(item: TripWardrobeItem): boolean {
  return item.layering === 'base' || item.layering === 'mid';
}

/** Hard gate: heavy insulating fabrics inappropriate for hot weather (wool overcoat in Miami). */
function isHeavyInsulatingOnly(item: TripWardrobeItem): boolean {
  if (!item.material) return false;
  const mat = item.material.toLowerCase();
  return /\b(wool|fleece|sherpa|shearling|down|quilted|neoprene)\b/.test(mat)
    && !/\b(lightweight|tropical|summer)\b/.test(mat);
}

/**
 * Canonical gate: single source of truth for item validity in a given activity context.
 * Every place that decides if an item is valid MUST call this — no alternate checks.
 * Combines climate, presentation, formality keyword, formality tier, AND purpose compatibility checks.
 */
export function isItemValidForActivity(
  item: TripWardrobeItem,
  climateZone: ClimateZone,
  activityProfile: ActivityProfile,
  presentation: 'masculine' | 'feminine' | 'mixed' = 'mixed',
): boolean {
  const flags = inferGarmentFlags(item);
  const isColdOrFreezing = climateZone === 'cold' || climateZone === 'freezing';
  const isFormalActivity = activityProfile.formality >= 2;
  const isCityContext = activityProfile.context === 'city';
  const isMasculine = presentation === 'masculine';
  const isShoe = mapMainCategoryToSlot(item.main_category ?? '') === 'shoes';

  // RULE 0: Block feminine-only items for masculine users
  if (isMasculine && flags.isFeminineOnly) return false;
  // Rule 1: Block minimal coverage in cold/freezing
  if (isColdOrFreezing && flags.isMinimalCoverage) {
    if (DEBUG_TRIPS_ENGINE) console.log('[TripsDebug][ClimateVeto]', JSON.stringify({itemId: item.id, name: item.name, reason: 'minimal_coverage_in_cold', minTemp: null, derivedBand: climateZone}));
    return false;
  }
  // Rule 1b: Block open-toed footwear in cold/freezing (shoes only)
  if (isColdOrFreezing && isShoe && isOpenFootwear(item)) {
    if (DEBUG_TRIPS_ENGINE) console.log('[TripsDebug][ClimateVeto]', JSON.stringify({itemId: item.id, name: item.name, reason: 'open_footwear_in_cold', minTemp: null, derivedBand: climateZone}));
    return false;
  }
  // Rule 1c: Block lightweight-only fabrics in cold/freezing (non-layering bases)
  if (isColdOrFreezing && isLightweightFabricOnly(item) && !isLayeringBase(item)) {
    if (DEBUG_TRIPS_ENGINE) console.log('[TripsDebug][ClimateVeto]', JSON.stringify({itemId: item.id, name: item.name, reason: 'lightweight_fabric_in_cold', minTemp: null, derivedBand: climateZone}));
    return false;
  }
  // Rule 1d: Block heavy insulating fabrics in hot weather
  if (climateZone === 'hot' && isHeavyInsulatingOnly(item)) {
    if (DEBUG_TRIPS_ENGINE) console.log('[TripsDebug][ClimateVeto]', JSON.stringify({itemId: item.id, name: item.name, reason: 'heavy_insulating_in_hot', minTemp: null, derivedBand: climateZone}));
    return false;
  }
  // Rule 2: Block beach-context items for formal city activities
  if (isFormalActivity && isCityContext && flags.isBeachContext) return false;
  // Rule 3: Block casual-only items for formal activities
  if (isFormalActivity && flags.isCasualOnly) return false;
  // Rule 3b: Hard reject non-insulated sneakers in freezing for formal activities
  if (climateZone === 'freezing' && isFormalActivity && isShoe) {
    const shoeText = `${(item.subcategory || '').toLowerCase()} ${(item.name || '').toLowerCase()}`;
    if (/\b(sneakers?|trainers?|running|athletic)\b/.test(shoeText)
      && !(item.material && /\b(insulated|weatherproof|waterproof|gore[- ]?tex)\b/i.test(item.material))) {
      if (DEBUG_TRIPS_ENGINE) console.log('[TripsDebug][GATE_SHOE] REJECT sneaker in freezing business', JSON.stringify({itemId: item.id, name: item.name}));
      return false;
    }
  }
  // Rule 4: Formality tier floor (unified with coherence check)
  const requiredTier = getRequiredFormalityTier(activityProfile.formality);
  if (requiredTier > 0) {
    const itemTier = getFormalityTier(item);
    // Freezing structured boot override: climate survival outranks strict formality gating.
    // Structured leather/suede boots satisfy minimum formality tier in freezing conditions.
    const isFreezingBootOverride = climateZone === 'freezing' && isShoe
      && /boot/i.test(`${item.subcategory ?? ''} ${item.name ?? ''}`)
      && /\b(leather|suede|structured)\b/i.test(`${item.material ?? ''} ${item.name ?? ''}`)
      && !flags.isCasualOnly;
    const effectiveTier = isFreezingBootOverride ? Math.max(itemTier, requiredTier) : itemTier;
    if (DEBUG_TRIPS_ENGINE && isFreezingBootOverride) console.log('[TripsDebug][GATE_SHOE] Freezing boot override', JSON.stringify({itemId: item.id, name: item.name, itemTier, effectiveTier, requiredTier}));
    if (effectiveTier < requiredTier) return false;
  }
  // Rule 5: Purpose compatibility — block logically incompatible garment categories
  const itemPurpose = getGarmentPurpose(item);
  const activityPurpose = getActivityPurposeClass(activityProfile);
  if (!isPurposeCompatible(itemPurpose, activityPurpose)) return false;
  // Rule 6: Formality ceiling — prevent overdressing (tuxedo for brunch)
  // Block black-tie items (tier >= 3) in casual non-city contexts
  if (activityProfile.formality <= 0 && activityProfile.context !== 'city') {
    if (getFormalityTier(item) >= 3) return false;
  }

  return true;
}

export function gatePool(
  items: TripWardrobeItem[],
  climateZone: ClimateZone,
  activity: ActivityProfile,
  presentation: 'masculine' | 'feminine' | 'mixed' = 'mixed',
): TripWardrobeItem[] {
  return items.filter(item => {
    const valid = isItemValidForActivity(item, climateZone, activity, presentation);
    const isShoe = mapMainCategoryToSlot(item.main_category ?? '') === 'shoes';
    if (isShoe) {
      gateLog('GATE_SHOE', item.id, valid ? 'PASS' : 'REJECT',
        `[TripCapsule][GATE_SHOE] ${valid ? 'PASS' : 'REJECT'} ${item.name} (${item.id}) | zone=${climateZone} formality=${activity.formality} presentation=${presentation}`);
    }
    return valid;
  });
}

/**
 * Conservative default for items missing formalityScore metadata.
 * 30 passes casual trips (floor 0) but fails business/formal (floor 40/50),
 * forcing proper classification and preventing unclassified junk in backups.
 */
const DEFAULT_UNKNOWN_FORMALITY = 30;

/**
 * Infer a formality score from name/subcategory keywords when formalityScore is null.
 * Returns null if no keyword match — caller falls back to DEFAULT_UNKNOWN_FORMALITY.
 */
function inferFormalityFromKeywords(item: TripWardrobeItem): number | null {
  const sub = (item.subcategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const text = `${sub} ${name}`;

  // Tier 3 — formal dress shoes (score 80)
  if (/\b(oxford|wholecut|cap[- ]?toe|derby|monk[- ]?strap|dress shoe|dress shoes|brogue)\b/.test(text)) return 80;
  // Tier 2 — smart shoes (score 60)
  if (/\b(loafer|penny loafer|tassel loafer|moccasin|chelsea boot|chukka)\b/.test(text)) return 60;
  // Tier 1 — smart-casual (score 40)
  if (/\b(boot|boots|ankle boot|desert boot|lace[- ]?up)\b/.test(text) && !/\b(rain|hiking|work|combat|snow|rubber)\b/.test(text)) return 40;
  // Tier 0 — casual (score 20)
  if (/\b(sneaker|trainer|running|athletic|canvas|slip[- ]?on|espadrille|sandal|flip[- ]?flop|slide)\b/.test(text)) return 20;

  return null;
}

/**
 * Single source of truth for an item's effective formality score (0–100).
 * Priority: explicit formalityScore → keyword inference → conservative default.
 */
export function getNormalizedFormality(item: TripWardrobeItem): number {
  if (item.formalityScore != null) return item.formalityScore;
  const inferred = inferFormalityFromKeywords(item);
  if (inferred != null) return inferred;
  return DEFAULT_UNKNOWN_FORMALITY;
}

/** Single source of truth: activity formality level → minimum item tier.
 *  Used by gatePool, isHardInvalidShoe, backup gates, and all fallback paths.
 */
export function getRequiredFormalityTier(formality: number): number {
  return formality >= 3 ? 2 : formality >= 2 ? 1 : 0;
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
  return getRequiredFormalityTier(max);
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
      if (isShoe) gateLog('GATE_BACKUP_SHOE', item.id, 'REJECT',
        `[TripCapsule][GATE_BACKUP_SHOE] REJECT ${item.name} (${item.id}) | gate=presentation | isFeminineOnly=true`);
      return false;
    }

    /// GATE 2 — Trip-incompatible casual (tier-based)
    // Items that were used in anchor/support outfits already passed gatePool's
    // per-outfit formality check — they are proven-fit. Only apply the tier-
    // based formality floor to unused items that haven't been validated yet.
    if (!provenFitIds.has(item.id) && requiredTier > 0 && itemTier < requiredTier) {
      if (isShoe) gateLog('GATE_BACKUP_SHOE', item.id, 'REJECT',
        `[TripCapsule][GATE_BACKUP_SHOE] REJECT ${item.name} (${item.id}) | gate=formality | formalityScore=${item.formalityScore} itemTier=${itemTier} requiredTier=${requiredTier}`);
      return false;
    }

    // GATE 3 — Climate (±15°F tolerance)
    const sweetMin = item.climateSweetspotFMin;
    const sweetMax = item.climateSweetspotFMax;
    if (sweetMin != null && sweetMax != null) {
      if (sweetMax < tripLowF - 15 || sweetMin > tripHighF + 15) {
        if (isShoe) gateLog('GATE_BACKUP_SHOE', item.id, 'REJECT',
          `[TripCapsule][GATE_BACKUP_SHOE] REJECT ${item.name} (${item.id}) | gate=climate | sweetspot=${sweetMin}-${sweetMax} tripRange=${tripLowF}-${tripHighF}`);
        return false;
      }
    }

    if (isShoe) gateLog('GATE_BACKUP_SHOE', item.id, 'PASS',
      `[TripCapsule][GATE_BACKUP_SHOE] PASS ${item.name} (${item.id}) | tier=${itemTier}/${requiredTier} climate=${sweetMin ?? '?'}-${sweetMax ?? '?'}/${tripLowF}-${tripHighF}`);

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
      if (isShoe) gateLog('GATE_FALLBACK_SHOE', item.id, 'REJECT',
        `[TripCapsule][GATE_FALLBACK_SHOE] REJECT ${item.name} (${item.id}) | gate=presentation`);
      return false;
    }

    // GATE 2 — Trip-incompatible casual (tier-based, never relax for unproven items)
    // Proven-fit items (used in outfits) bypass — they passed gatePool already.
    if (!provenFitIds.has(item.id) && requiredTier > 0 && itemTier < requiredTier) {
      if (isShoe) gateLog('GATE_FALLBACK_SHOE', item.id, 'REJECT',
        `[TripCapsule][GATE_FALLBACK_SHOE] REJECT ${item.name} (${item.id}) | gate=formality | formalityScore=${item.formalityScore} itemTier=${itemTier} requiredTier=${requiredTier}`);
      return false;
    }

    // GATE 3 — Climate (relaxed: ±25°F tolerance)
    const sweetMin = item.climateSweetspotFMin;
    const sweetMax = item.climateSweetspotFMax;
    if (sweetMin != null && sweetMax != null) {
      if (sweetMax < tripLowF - 25 || sweetMin > tripHighF + 25) {
        if (isShoe) gateLog('GATE_FALLBACK_SHOE', item.id, 'REJECT',
          `[TripCapsule][GATE_FALLBACK_SHOE] REJECT ${item.name} (${item.id}) | gate=climate | sweetspot=${sweetMin}-${sweetMax} tripRange=${tripLowF}-${tripHighF}`);
        return false;
      }
    }

    if (isShoe) gateLog('GATE_FALLBACK_SHOE', item.id, 'PASS',
      `[TripCapsule][GATE_FALLBACK_SHOE] PASS ${item.name} (${item.id}) | tier=${itemTier}/${requiredTier}`);

    return true;
  });
}

export type RebuildMode = 'AUTO' | 'FORCE';

/** DEV-only deep diff for fingerprint diagnostics. */
function __diffObjects(a: any, b: any, path: string = ''): string[] {
  if (a === b) return [];
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) {
    return [path || 'root'];
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const diffs: string[] = [];
  for (const key of keys) {
    const newPath = path ? `${path}.${key}` : key;
    if (!(key in a)) { diffs.push(newPath + ' (missing in stored)'); continue; }
    if (!(key in b)) { diffs.push(newPath + ' (missing in computed)'); continue; }
    diffs.push(...__diffObjects(a[key], b[key], newPath));
  }
  return diffs;
}

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

  // Old schema used "weather": [...] — force one-time rebuild to new weatherIntent schema
  if (capsule.fingerprint?.includes('"weather":')) {
    return {rebuild: true, reason: 'FINGERPRINT_SCHEMA_MIGRATION', mode: 'AUTO'};
  }

  // Fingerprint mismatch → inputs changed
  if (fingerprint && capsule.fingerprint !== fingerprint) {
    if (__DEV__) {
      console.log('[TripCapsule][FINGERPRINT_STRINGS]', {
        stored: capsule.fingerprint,
        computed: fingerprint,
      });
      try {
        const parsedStored = JSON.parse(capsule.fingerprint!);
        const parsedComputed = JSON.parse(fingerprint);
        const diffs = __diffObjects(parsedStored, parsedComputed);
        console.log('[TripCapsule][FINGERPRINT_DIFF]', {
          stored: parsedStored,
          computed: parsedComputed,
          differingPaths: diffs,
        });
      } catch (e) {
        console.log('[TripCapsule][FINGERPRINT_DIFF_PARSE_ERROR]', e);
      }
    }
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

/** Canonical string-array normalization: lowercase, trim, dedupe, sort. */
function normalizeStringArray(arr?: string[]): string[] {
  if (!arr) return [];
  return [...new Set(arr.map(s => s.trim().toLowerCase()).filter(Boolean))].sort();
}

/** Return a shallow copy of TripStyleHints with all internal arrays sorted. */
function normalizeStyleHints(hints: TripStyleHints): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(hints).sort()) {
    const val = (hints as Record<string, unknown>)[key];
    out[key] = Array.isArray(val) ? [...val].sort() : val;
  }
  return out;
}

export function buildCapsuleFingerprint(
  wardrobe: TripWardrobeItem[],
  destination: string,
  startDate: string,
  endDate: string,
  activities: TripActivity[],
  location: string,
  _presentation?: Presentation,  // kept for call-site compat; NOT fingerprinted
  styleHints?: TripStyleHints,
): string {
  const styleIntentSignature = styleHints ? {
    fit_preferences: normalizeStringArray(styleHints.fit_preferences),
    fabric_preferences: normalizeStringArray(styleHints.fabric_preferences),
    preferred_brands: normalizeStringArray(styleHints.preferred_brands),
    disliked_styles: normalizeStringArray(styleHints.disliked_styles),
    avoid_colors: normalizeStringArray(styleHints.avoid_colors),
    avoid_materials: normalizeStringArray(styleHints.avoid_materials),
    avoid_patterns: normalizeStringArray(styleHints.avoid_patterns),
  } : undefined;

  // Weather intent: stable trip identity (city + dates), NOT volatile forecast data
  // Normalize to YYYY-MM-DD to prevent ISO-string timezone drift from causing mismatches
  const start = startDate?.slice(0, 10);
  const end = endDate?.slice(0, 10);
  const weatherIntent = `${destination.trim().toLowerCase()}:${start}:${end}`;

  return JSON.stringify({
    wardrobe: wardrobe.map(w => w.id).sort(),
    weatherIntent,
    activities: [...activities].sort(),
    location,
    ...(styleIntentSignature ? {styleIntentSignature} : {}),
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
    const penalty = -(quality * 10) + (useCount * 14 + cooldownPenalty) * WEIGHT_ROTATION;
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
  contextProfile?: ActivityProfile,
  contextClimate?: ClimateZone,
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

  // Context-primary override: in warm/hot + water/rest contexts, elevate
  // purpose-aligned lightweight items to PRIMARY, demote others to SECONDARY.
  // No items are removed — only tier membership changes.
  if (contextProfile && contextClimate) {
    const contextPrimaries = candidates.filter(item =>
      isContextPrimaryCandidate(item, contextProfile, contextClimate),
    );
    if (contextPrimaries.length > 0) {
      const ctxIds = new Set(contextPrimaries.map(i => i.id));
      const demotedFromPrimary = primary.filter(p => !ctxIds.has(p.id));
      const newSecondary = secondary.filter(s => !ctxIds.has(s.id));
      const newFallback = fallback.filter(f => !ctxIds.has(f.id));
      primary.length = 0;
      primary.push(...contextPrimaries);
      secondary.length = 0;
      secondary.push(...demotedFromPrimary, ...newSecondary);
      fallback.length = 0;
      fallback.push(...newFallback);
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

  // ── ELITE_BEACH_WARM_TIERED_LOCK ──
  // Belt-and-suspenders: re-filter tiers before WPICK in case any heavy item leaked
  // through tier construction or context-primary override.
  if (isWarmHotBeachContext(debugLabel, contextProfile, contextClimate)) {
    const pBefore = primary.length, sBefore = secondary.length, fBefore = fallback.length;
    const filterInPlace = (arr: TripWardrobeItem[]): void => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const item = arr[i];
        if ((item.material && BEACH_WARM_HEAVY_RE.test(item.material)) ||
            (item.name && BEACH_WARM_HEAVY_RE.test(item.name))) {
          arr.splice(i, 1);
        }
      }
    };
    filterInPlace(primary);
    filterInPlace(secondary);
    filterInPlace(fallback);
    const removed = (pBefore - primary.length) + (sBefore - secondary.length) + (fBefore - fallback.length);
    if (removed > 0) {
      console.log(`[TripCapsule][ELITE_BEACH_WARM_TIERED_LOCK] ${debugLabel ?? 'unknown'} removed=${removed}`);
    }
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

// ── Elite scoring weight constants (selection-time emphasis) ──
const WEIGHT_SILHOUETTE = 1.35;
const WEIGHT_COLOR_HARMONY = 1.25;
const WEIGHT_TEXTURE_CONTRAST = 1.2;
const WEIGHT_ROTATION = 0.75;
/** Quality penalty for denim bottoms on Formal/Business + cold/freezing trips. ×10 in weightedPick → -30 pts. */
const PENALTY_DENIM_SUPPRESSION = -3.0;

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

  // +0.15: neutral color grounds outfit (reduced to limit flat-neutral stacking)
  if (words.some(w => AESTHETIC_NEUTRALS.includes(w))) bonus += 0.15;

  // -0.25: penalize all-neutral outfit (no color interest)
  if (outfitColors.length > 0 && words.length > 0 &&
      outfitColors.every(w => AESTHETIC_NEUTRALS.includes(w)) &&
      words.every(w => AESTHETIC_NEUTRALS.includes(w))) {
    bonus -= 0.25 * WEIGHT_COLOR_HARMONY;
  }

  // bold-on-bold clash (>1 bold family across outfit + candidate)
  if (outfitColors.length > 0) {
    const existingBolds = new Set(outfitColors.filter(w => AESTHETIC_BOLDS.includes(w)));
    const candidateBolds = words.filter(w => AESTHETIC_BOLDS.includes(w));
    if (existingBolds.size >= 1 && candidateBolds.length > 0) {
      const combined = new Set([...existingBolds, ...candidateBolds]);
      if (combined.size > 1) bonus -= 0.5 * WEIGHT_COLOR_HARMONY;
    }
  }

  // warm+cool without neutral
  const allWords = [...outfitColors, ...words];
  const hasWarm = allWords.some(w => AESTHETIC_WARM.includes(w));
  const hasCool = allWords.some(w => AESTHETIC_COOL.includes(w));
  const hasNeutral = allWords.some(w => AESTHETIC_NEUTRALS.includes(w));
  if (hasWarm && hasCool && !hasNeutral) bonus -= 0.3 * WEIGHT_COLOR_HARMONY;

  // silhouette coherence: reward fit-family alignment (slim with slim, relaxed with relaxed)
  if (candidate.fit && existingItems.length > 0) {
    const candidateFit = candidate.fit.toLowerCase();
    const slimTokens = ['slim', 'skinny', 'tailored', 'fitted', 'structured'];
    const relaxedTokens = ['relaxed', 'oversized', 'loose', 'wide', 'baggy'];
    const candidateFamily = slimTokens.some(t => candidateFit.includes(t)) ? 'slim'
      : relaxedTokens.some(t => candidateFit.includes(t)) ? 'relaxed' : null;
    if (candidateFamily) {
      const existingFits = existingItems.map(pi => {
        const full = itemLookup.get(pi.wardrobeItemId);
        return (full?.fit || '').toLowerCase();
      }).filter(Boolean);
      const matchCount = existingFits.filter(f => {
        if (candidateFamily === 'slim') return slimTokens.some(t => f.includes(t));
        return relaxedTokens.some(t => f.includes(t));
      }).length;
      if (matchCount > 0) bonus += 0.25 * WEIGHT_SILHOUETTE;
    }
  }

  // texture contrast: reward material diversity (knit + denim + leather > flat cotton stack)
  if (candidate.material && existingItems.length > 0) {
    const candidateMat = candidate.material.toLowerCase();
    const existingMats = existingItems.map(pi => {
      const full = itemLookup.get(pi.wardrobeItemId);
      return (full?.material || '').toLowerCase();
    }).filter(Boolean);
    if (existingMats.length > 0 && existingMats.every(m => m !== candidateMat)) {
      bonus += 0.2 * WEIGHT_TEXTURE_CONTRAST;
    }
  }

  // Near-duplicate detection: subcategory + color signature dedup
  const sub = (candidate.subcategory || '').toLowerCase();
  if (sub && existingItems.length > 0) {
    const existingSignatures = existingItems.map(pi => {
      const full = itemLookup.get(pi.wardrobeItemId);
      return `${(full?.subcategory || '').toLowerCase()}|${(full?.color || '').toLowerCase()}`;
    });
    const candidateSig = `${sub}|${(candidate.color || '').toLowerCase()}`;
    if (existingSignatures.includes(candidateSig)) {
      bonus -= 0.5; // near-duplicate: same subcategory + same color
    } else {
      const subs = existingItems.map(pi => {
        const full = itemLookup.get(pi.wardrobeItemId);
        return (full?.subcategory || '').toLowerCase();
      });
      if (subs.includes(sub)) bonus -= 0.2; // same subcategory, different color
    }
  }

  // Clamp to ±1.0 (widened for richer aesthetic differentiation)
  return Math.max(-1.0, Math.min(1.0, bonus));
}

// ── Outfit Coherence Guard ──

/**
 * Returns true if the item would be rejected by hard gates for this day.
 * Calls the same gatePool logic used by the builder — no threshold duplication.
 * Also checks formality tier vs activity baseline (dress code violation).
 */
export function isHardInvalidShoe(
  item: TripWardrobeItem,
  climateZone: ClimateZone,
  activity: ActivityProfile,
  presentation: Presentation,
  _baselineFormality: number,
): boolean {
  // Canonical gate: single source of truth — no separate tier comparison
  return !isItemValidForActivity(item, climateZone, activity, presentation);
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
  beachGuardZone?: ClimateZone,
): TripPackingItem[] {
  const result = [...outfitItems];
  const originalItems = result.map(r => ({ id: r.wardrobeItemId, name: r.name }));

  // ── ELITE_BEACH_WARM_SWAP_GUARD (coherence) ──
  // Non-bypassable: when Beach + warm/hot, no swap candidate may introduce heavy fabrics.
  // Uses trip-level beachGuardZone (not per-day climateZone) per Tier 4 luxury policy.
  const _beachWarmSwapActive = isWarmHotBeachContext(activityProfile.context, activityProfile, beachGuardZone ?? climateZone);
  if (_beachWarmSwapActive) {
    console.log(`[TripCapsule][ELITE_BEACH_WARM_SWAP_GUARD_ACTIVE] activity=Beach zone=${beachGuardZone ?? climateZone} reason=coherence_guard`);
  }

  // Rule 1: Repair hard-invalid tops/bottoms/accessories (shoes & outerwear handled by Rules 2/3)
  for (let i = 0; i < result.length; i++) {
    const bucket = CATEGORY_MAP[result[i].mainCategory] as CategoryBucket;
    if (bucket === 'shoes' || bucket === 'outerwear') continue;
    const currentFull = poolLookup.get(result[i].wardrobeItemId);
    if (!currentFull) continue;
    if (isLockedValidItem(currentFull, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality)) continue;
    if (!bucket || !gatedBuckets[bucket]) continue;

    const usedInOutfit = new Set(result.map(r => r.wardrobeItemId));
    let swapCandidates = gatedBuckets[bucket]
      .filter(c => !usedInOutfit.has(c.id) && isLockedValidItem(c, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality))
      .sort((a, b) => {
        const aUses = (usageTracker.get(a.id) || []).length;
        const bUses = (usageTracker.get(b.id) || []).length;
        return aUses - bUses || a.id.localeCompare(b.id);
      });
    if (_beachWarmSwapActive) {
      swapCandidates = filterHeavyFabricsForBeach(swapCandidates, `swap_guard/coherence_r1/${bucket}`);
    }

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
    let shoeSwaps = finalShoes
      .filter(c => !usedInOutfit.has(c.id) && isLockedValidItem(c, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality))
      .sort((a, b) => {
        const aUses = (usageTracker.get(a.id) || []).length;
        const bUses = (usageTracker.get(b.id) || []).length;
        return aUses - bUses || a.id.localeCompare(b.id);
      });
    if (_beachWarmSwapActive) {
      shoeSwaps = filterHeavyFabricsForBeach(shoeSwaps, 'swap_guard/coherence_r2/shoes');
    }
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
    let outerSwaps = (gatedBuckets.outerwear || [])
      .filter(c =>
        !usedInOutfit.has(c.id) &&
        isLockedValidItem(c, climateZone, activityProfile, presentation, capsuleIntent.baselineFormality),
      )
      .sort((a, b) => {
        const aUses = (usageTracker.get(a.id) || []).length;
        const bUses = (usageTracker.get(b.id) || []).length;
        return aUses - bUses || a.id.localeCompare(b.id);
      });
    if (_beachWarmSwapActive) {
      outerSwaps = filterHeavyFabricsForBeach(outerSwaps, 'swap_guard/coherence_r3/outerwear');
    }
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

// ══════════════════════════════════════════════════════════════════════════════
// ██  COMPOSITION VALIDATOR (deterministic post-assembly aesthetic check)
// ══════════════════════════════════════════════════════════════════════════════
// Rejects visually incoherent outfits and repairs using existing alternates.
// Never regenerates, never changes item count, never calls AI.

const PATTERN_TOKENS = [
  'plaid', 'stripe', 'striped', 'floral', 'print', 'printed', 'paisley',
  'polka', 'dot', 'check', 'checked', 'gingham', 'houndstooth', 'camo',
  'camouflage', 'leopard', 'animal', 'abstract', 'geometric', 'tie-dye',
  'argyle', 'tartan', 'ikat', 'tropical',
];

const TEXTURE_CONFLICT_PAIRS: ReadonlySet<string> = new Set([
  'suede:patent', 'patent:suede',
  'velvet:patent', 'patent:velvet',
]);

function isPatterned(item: TripWardrobeItem): boolean {
  const text = `${item.subcategory ?? ''} ${item.name ?? ''}`.toLowerCase();
  return PATTERN_TOKENS.some(t => text.includes(t));
}

function isStatementItem(item: TripWardrobeItem): boolean {
  if (isPatterned(item)) return true;
  if (item.color) {
    const words = item.color.toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
    if (words.some(w => AESTHETIC_BOLDS.includes(w))) return true;
  }
  const bucket = mapMainCategoryToSlot(item.main_category ?? '');
  if (bucket === 'accessories' && !isNeutralColor(item)) return true;
  return false;
}

function isHeavyGarment(item: TripWardrobeItem): boolean {
  const text = `${item.subcategory ?? ''} ${item.name ?? ''} ${item.material ?? ''}`.toLowerCase();
  const isCoat = text.includes('coat') || text.includes('parka') || text.includes('puffer');
  const isChunkyKnit = text.includes('chunky') || text.includes('cable knit');
  const isBoot = /\bboots?\b/.test(text) && !text.includes('bootcut') && !text.includes('bootleg');
  return isCoat || isChunkyKnit || isBoot;
}

function getGarmentZone(item: TripWardrobeItem): 'top' | 'bottom' {
  const bucket = mapMainCategoryToSlot(item.main_category ?? '');
  if (bucket === 'tops' || bucket === 'outerwear') return 'top';
  return 'bottom';
}

function getDominantTexture(item: TripWardrobeItem): string | null {
  const text = `${item.material ?? ''} ${item.subcategory ?? ''} ${item.name ?? ''}`.toLowerCase();
  if (text.includes('suede')) return 'suede';
  if (text.includes('patent')) return 'patent';
  if (text.includes('velvet')) return 'velvet';
  if (text.includes('corduroy')) return 'corduroy';
  if (text.includes('tweed')) return 'tweed';
  if (text.includes('leather')) return 'leather';
  if (text.includes('fur') || text.includes('shearling')) return 'fur';
  return null;
}

function getItemColorWords(item: TripWardrobeItem): string[] {
  if (!item.color) return [];
  return item.color.toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
}

/** Attempt to swap a packing item using its pre-computed alternates. */
function tryCompositionSwap(
  packingItem: TripPackingItem,
  poolLookup: Map<string, TripWardrobeItem>,
  locationLabel: string,
  usedIds: Set<string>,
  isValid: (candidate: TripWardrobeItem) => boolean,
): TripPackingItem | null {
  const alts = (packingItem as any).alternates as AlternateItem[] | undefined;
  if (!alts || alts.length === 0) return null;

  for (const alt of alts) {
    if (usedIds.has(alt.id)) continue;
    const full = poolLookup.get(alt.id);
    if (!full) continue;
    if (isValid(full)) {
      const replacement = toPackingItem(full, locationLabel);
      (replacement as any).alternates = alts.filter(a => a.id !== alt.id);
      return replacement;
    }
  }
  return null;
}

/**
 * Deterministic post-assembly validator.
 * Checks 5 composition rules and swaps from existing alternates when violated.
 * Never adds/removes items, never regenerates, never calls AI.
 */
function validateOutfitComposition(
  items: TripPackingItem[],
  poolLookup: Map<string, TripWardrobeItem>,
  activityProfile: ActivityProfile,
  locationLabel: string,
  climateZone: ClimateZone,
  presentation: 'masculine' | 'feminine' | 'mixed',
  beachGuardZone?: ClimateZone,
  denimSuppressActive?: boolean,
): TripPackingItem[] {
  const result = [...items];
  const getFullItem = (pi: TripPackingItem) => poolLookup.get(pi.wardrobeItemId);
  const currentIds = () => new Set(result.map(r => r.wardrobeItemId));
  const isFormalContext = activityProfile.formality >= 2;
  const requiredTier = getRequiredFormalityTier(activityProfile.formality);

  // ── ELITE_BEACH_WARM_SWAP_GUARD (composition) ──
  // Uses trip-level beachGuardZone (not per-day climateZone) per Tier 4 luxury policy.
  const _beachWarmSwapActive = isWarmHotBeachContext(activityProfile.context, activityProfile, beachGuardZone ?? climateZone);
  if (_beachWarmSwapActive) {
    console.log(`[TripCapsule][ELITE_BEACH_WARM_SWAP_GUARD_ACTIVE] activity=Beach zone=${beachGuardZone ?? climateZone} reason=composition_validator`);
  }

  // Guarded swap: for formal activities, replacement must meet or exceed the
  // original item's formality tier so composition swaps never downgrade intent.
  const guardedSwap = (
    pi: TripPackingItem,
    isValid: (c: TripWardrobeItem) => boolean,
  ): TripPackingItem | null => {
    const originalFull = getFullItem(pi);
    const originalTier = originalFull ? getFormalityTier(originalFull) : 0;
    const originalContextValid = originalFull
      ? isItemValidForActivity(originalFull, climateZone, activityProfile, presentation)
      : false;
    return tryCompositionSwap(
      pi, poolLookup, locationLabel, currentIds(),
      candidate => {
        // Context Regression Guard: never swap a context-valid item for a context-invalid one
        if (originalContextValid && !isItemValidForActivity(candidate, climateZone, activityProfile, presentation)) return false;
        if (isFormalContext && getFormalityTier(candidate) < Math.min(originalTier, requiredTier)) return false;
        // Beach warm swap guard: reject heavy fabrics from composition swap candidates
        if (_beachWarmSwapActive &&
            ((candidate.material && BEACH_WARM_HEAVY_RE.test(candidate.material)) ||
             (candidate.name && BEACH_WARM_HEAVY_RE.test(candidate.name)))) return false;
        // Denim suppression guard: never swap a non-denim bottom → denim bottom
        if (denimSuppressActive && originalFull && !isDenimBottom(originalFull) && isDenimBottom(candidate)) {
          if (DEBUG_TRIPS_ENGINE) {
            console.log('[TripsDebug][DenimSuppressionCompositionBlock]', JSON.stringify({
              from: pi.wardrobeItemId, blockedSwapTo: candidate.id,
            }));
          }
          return false;
        }
        return isValid(candidate);
      },
    );
  };

  // ── RULE 1: Focal Point Limit ──
  // Max one "statement" item (patterned, bold color, non-neutral accessory).
  // Keep the first (anchor), swap the rest via alternates.
  const statementIndices: number[] = [];
  for (let i = 0; i < result.length; i++) {
    const full = getFullItem(result[i]);
    if (full && isStatementItem(full)) statementIndices.push(i);
  }
  if (statementIndices.length > 1) {
    for (let s = 1; s < statementIndices.length; s++) {
      const idx = statementIndices[s];
      const swap = guardedSwap(
        result[idx],
        candidate => !isStatementItem(candidate),
      );
      if (swap) {
        if (__DEV__) {
          console.log(`[COMPOSITION] violation: focal_conflict | swapped: ${result[idx].name} → ${swap.name}`);
        }
        result[idx] = swap;
      }
    }
  }

  // ── RULE 2: Formal Hierarchy Consistency ──
  // No tier 3 item with tier 0 item unless activity is casual (formality 0).
  if (activityProfile.formality > 0) {
    const tiers = result.map(pi => {
      const full = getFullItem(pi);
      return full ? getFormalityTier(full) : -1;
    });
    const maxTier = Math.max(...tiers);
    const minTier = Math.min(...tiers.filter(t => t >= 0));

    if (maxTier >= 3 && minTier <= 0) {
      for (let i = 0; i < result.length; i++) {
        if (tiers[i] !== 0) continue;
        const swap = guardedSwap(
          result[i],
          candidate => getFormalityTier(candidate) >= 1,
        );
        if (swap) {
          if (__DEV__) {
            console.log(`[COMPOSITION] violation: formal_hierarchy | swapped: ${result[i].name} → ${swap.name}`);
          }
          result[i] = swap;
        }
      }
    }
  }

  // ── RULE 3: Visual Weight Balance ──
  // Heavy garments (coats, chunky knits, boots) must not all stack on one zone.
  const heavyItems: {idx: number; zone: 'top' | 'bottom'}[] = [];
  for (let i = 0; i < result.length; i++) {
    const full = getFullItem(result[i]);
    if (full && isHeavyGarment(full)) {
      heavyItems.push({idx: i, zone: getGarmentZone(full)});
    }
  }
  if (heavyItems.length >= 2) {
    const topHeavy = heavyItems.filter(h => h.zone === 'top');
    const bottomHeavy = heavyItems.filter(h => h.zone === 'bottom');

    const swapTarget = (topHeavy.length >= 2 && bottomHeavy.length === 0)
      ? topHeavy[topHeavy.length - 1]
      : (bottomHeavy.length >= 2 && topHeavy.length === 0)
        ? bottomHeavy[bottomHeavy.length - 1]
        : null;

    if (swapTarget) {
      const swap = guardedSwap(
        result[swapTarget.idx],
        candidate => !isHeavyGarment(candidate),
      );
      if (swap) {
        if (__DEV__) {
          console.log(`[COMPOSITION] violation: visual_weight_${swapTarget.zone} | swapped: ${result[swapTarget.idx].name} → ${swap.name}`);
        }
        result[swapTarget.idx] = swap;
      }
    }
  }

  // ── RULE 4: Palette Cohesion ──
  // Every non-neutral color must connect to at least one other item's color.
  const neutralTokens = new Set(AESTHETIC_NEUTRALS);
  const outfitColors = result.map((pi, idx) => {
    const full = getFullItem(pi);
    return {idx, words: full ? getItemColorWords(full) : []};
  });

  for (const entry of outfitColors) {
    const nonNeutral = entry.words.filter(w => !neutralTokens.has(w));
    if (nonNeutral.length === 0) continue;

    const otherColors = outfitColors
      .filter(e => e.idx !== entry.idx)
      .flatMap(e => e.words);

    const connected = nonNeutral.some(w =>
      otherColors.some(oc => colorMatches(w, oc)),
    );

    if (!connected) {
      const swap = guardedSwap(
        result[entry.idx],
        candidate => {
          const candWords = getItemColorWords(candidate).filter(w => !neutralTokens.has(w));
          if (candWords.length === 0) return true; // neutral always safe
          return candWords.some(w => otherColors.some(oc => colorMatches(w, oc)));
        },
      );
      if (swap) {
        if (__DEV__) {
          console.log(`[COMPOSITION] violation: isolated_color | swapped: ${result[entry.idx].name} → ${swap.name}`);
        }
        result[entry.idx] = swap;
      }
    }
  }

  // ── RULE 5: Texture Conflict ──
  // No >1 competing dominant texture (suede+patent, velvet+patent).
  const texturedItems: {idx: number; texture: string}[] = [];
  for (let i = 0; i < result.length; i++) {
    const full = getFullItem(result[i]);
    if (!full) continue;
    const tex = getDominantTexture(full);
    if (tex) texturedItems.push({idx: i, texture: tex});
  }

  if (texturedItems.length >= 2) {
    for (let a = 0; a < texturedItems.length; a++) {
      for (let b = a + 1; b < texturedItems.length; b++) {
        const pairKey = `${texturedItems[a].texture}:${texturedItems[b].texture}`;
        if (TEXTURE_CONFLICT_PAIRS.has(pairKey)) {
          const swapIdx = texturedItems[b].idx;
          const anchorTex = texturedItems[a].texture;
          const swap = guardedSwap(
            result[swapIdx],
            candidate => {
              const ct = getDominantTexture(candidate);
              return !ct || !TEXTURE_CONFLICT_PAIRS.has(`${anchorTex}:${ct}`);
            },
          );
          if (swap) {
            if (__DEV__) {
              console.log(`[COMPOSITION] violation: texture_conflict | swapped: ${result[swapIdx].name} → ${swap.name}`);
            }
            result[swapIdx] = swap;
          }
        }
      }
    }
  }

  // Double heavy pattern check (visual noise — separate from material textures)
  const patternedIndices: number[] = [];
  for (let i = 0; i < result.length; i++) {
    const full = getFullItem(result[i]);
    if (full && isPatterned(full)) patternedIndices.push(i);
  }
  if (patternedIndices.length >= 2) {
    for (let p = 1; p < patternedIndices.length; p++) {
      const idx = patternedIndices[p];
      const swap = guardedSwap(
        result[idx],
        candidate => !isPatterned(candidate),
      );
      if (swap) {
        if (__DEV__) {
          console.log(`[COMPOSITION] violation: double_pattern | swapped: ${result[idx].name} → ${swap.name}`);
        }
        result[idx] = swap;
      }
    }
  }

  // ── RULE 6: Silhouette Balance ──
  // Oversized top + oversized/wide bottom = sloppy; slim top + oversized bottom = unbalanced.
  // Swap the bottom via alternates without lowering formality.
  const topIdx = result.findIndex(pi => {
    const full = getFullItem(pi);
    return full && mapMainCategoryToSlot(full.main_category ?? '') === 'tops';
  });
  const bottomIdx = result.findIndex(pi => {
    const full = getFullItem(pi);
    return full && mapMainCategoryToSlot(full.main_category ?? '') === 'bottoms';
  });

  if (topIdx >= 0 && bottomIdx >= 0) {
    const topFull = getFullItem(result[topIdx]);
    const bottomFull = getFullItem(result[bottomIdx]);
    if (topFull?.fit && bottomFull?.fit) {
      const topFit = topFull.fit.toLowerCase();
      const bottomFit = bottomFull.fit.toLowerCase();

      const isOversizedTop = /oversized|loose|baggy/.test(topFit);
      const isSlimTop = /slim|skinny|tailored|fitted/.test(topFit);
      const isOversizedBottom = /oversized|loose|baggy|wide/.test(bottomFit);

      let needsSwap = false;
      let validBottomFit: (c: TripWardrobeItem) => boolean = () => true;

      if (isOversizedTop && isOversizedBottom) {
        needsSwap = true;
        validBottomFit = (c) => {
          if (!c.fit) return true;
          return /slim|skinny|regular|straight|tailored/.test(c.fit.toLowerCase());
        };
      } else if (isSlimTop && isOversizedBottom) {
        needsSwap = true;
        validBottomFit = (c) => {
          if (!c.fit) return true;
          const f = c.fit.toLowerCase();
          return /regular|straight|wide|relaxed/.test(f) && !/oversized|baggy/.test(f);
        };
      }

      if (needsSwap) {
        const swap = guardedSwap(result[bottomIdx], validBottomFit);
        if (swap) {
          if (__DEV__) {
            console.log(`[COMPOSITION] violation: silhouette_balance | swapped: ${result[bottomIdx].name} → ${swap.name}`);
          }
          result[bottomIdx] = swap;
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
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
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
  console.log('[CAPSULE TRACE] INTENT input styleHints:', styleHints);
  console.log('[CAPSULE TRACE] INTENT styleHints.avoid_colors raw:', (styleHints as Record<string, unknown> | undefined)?.avoid_colors);
  const rawAvoid = (styleHints as Record<string, unknown> | undefined)?.avoid_colors;
  const avoidColors: string[] = Array.isArray(rawAvoid)
    ? rawAvoid.map((c: string) => c.toLowerCase())
    : [];
  console.log('[CAPSULE TRACE] derived avoidColors:', avoidColors);

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

/** Coarse formality tier for shoe contrast comparison.
 *  Handles both 0-10 and 0-100 formality scales:
 *  scores <= 10 are treated as 0-10 scale and normalized to 0-100.
 */
export function getFormalityTier(item: TripWardrobeItem): number {
  let f = getNormalizedFormality(item);
  // Normalize 0-10 scale → 0-100 (catches AI scores like formalityScore=8)
  if (f > 0 && f <= 10) f = f * 10;
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

/** Deterministic destination style bias for footwear in luxury warm cities. */
function getDestinationStyleBias(city: string | null, activities: TripActivity[], item: TripWardrobeItem): number {
  if (!city) return 0;

  const c = city.toLowerCase();

  const isLuxuryWarmCity =
    c.includes('miami') ||
    c.includes('monaco') ||
    c.includes('milan') ||
    c.includes('rome') ||
    c.includes('cannes') ||
    c.includes('saint-tropez') ||
    c.includes('st. tropez') ||
    c.includes('st tropez') ||
    c.includes('dubai');

  if (!isLuxuryWarmCity) return 0;

  const name = (item.name || '').toLowerCase();
  const sub = (item.subcategory || '').toLowerCase();
  const material = (item.material || '').toLowerCase();

  const isSneaker = /sneakers?|trainers?|running|athletic/.test(name + ' ' + sub);
  const isLoafer = /loafer/.test(name + ' ' + sub);
  const isDressShoe = /oxford|derby|dress/.test(name + ' ' + sub);
  const isLeather = /leather|suede/.test(material + ' ' + name);

  const isActive = activities.includes('Active');

  let bias = 0;

  // Penalize loud athletic sneakers in luxury warm cities unless Active
  if (isSneaker && !isActive) bias -= 0.4;

  // Reward refined leather footwear
  if ((isLoafer || isDressShoe) && isLeather) bias += 0.5;

  return bias;
}

// ── Luxury Destination Authority ──
// Deterministic post-scoring enforcement layer for luxury warm cities.
// Ensures anchor/contrast shoes are refined leather footwear in formal contexts.

const LUXURY_WARM_CITIES = ['miami', 'monaco', 'milan', 'rome', 'cannes', 'saint-tropez', 'st. tropez', 'st tropez', 'dubai'];
const LUXURY_FORMAL_ACTIVITIES: TripActivity[] = ['Dinner', 'Business', 'Formal'];

function isLuxuryWarmContext(
  city: string | null,
  climateZone: ClimateZone,
  activities: TripActivity[],
): boolean {
  if (!city) return false;
  if (climateZone !== 'warm' && climateZone !== 'hot') return false;
  const c = city.toLowerCase();
  const matchesCity = LUXURY_WARM_CITIES.some(lc => c.includes(lc));
  if (!matchesCity) return false;
  return activities.some(a => LUXURY_FORMAL_ACTIVITIES.includes(a));
}

function isLuxuryLeatherFootwear(item: TripWardrobeItem): boolean {
  const name = (item.name || '').toLowerCase();
  const sub = (item.subcategory || '').toLowerCase();
  const material = (item.material || '').toLowerCase();
  const combined = name + ' ' + sub;

  const isLeather = /leather|suede/.test(material + ' ' + name);
  if (!isLeather) return false;

  const isLoafer = /loafer/.test(combined);
  const isDerby = /derby/.test(combined);
  const isOxford = /oxford/.test(combined);
  const isStructuredBoot =
    /boot/.test(combined) &&
    !/work\s*boot|hiking|combat|rain|snow|rubber/.test(combined);

  return isLoafer || isDerby || isOxford || isStructuredBoot;
}

function isFootwearSneaker(item: TripWardrobeItem): boolean {
  const name = (item.name || '').toLowerCase();
  const sub = (item.subcategory || '').toLowerCase();
  return /sneakers?|trainers?|running|athletic/.test(name + ' ' + sub);
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
  presentation: Presentation = 'mixed',
  city: string | null = null,
): TripWardrobeItem[] {
  if (shoeBucket.length === 0) return [];

  const footwearRoles = roles.filter(r =>
    r.role === 'anchor_shoe' || r.role === 'contrast_shoe' || r.role === 'condition_shoe',
  );

  // Pre-filter: use canonical isItemValidForActivity for the LOWEST-formality
  // activity + worst-case climate zone. This admits shoes valid for at least one
  // activity; per-day assembly gating (buildOutfitForActivity) handles per-day
  // formality rejection. Using highest formality here incorrectly blocks casual
  // shoes from mixed trips (e.g. Casual+Dinner → Sneakers blocked entirely).
  const lowestFormalityActivity = activities.reduce((best, a) => {
    const ap = getActivityProfile(a);
    return ap.formality < getActivityProfile(best).formality ? a : best;
  }, activities[0] || 'Casual');
  const worstProfile = getActivityProfile(lowestFormalityActivity);
  // Use coldest day's climate zone for strictest climate gate
  const coldestDay = weather.length > 0
    ? weather.reduce((c, d) => (d.lowF < c.lowF ? d : c), weather[0])
    : undefined;
  const worstZone = deriveClimateZone(coldestDay);

  // Gate each shoe against ALL activities — include if valid for ANY.
  // Previous approach (lowest-formality only) accidentally blocked formal shoes
  // via Rule 6 (formality ceiling) for casual contexts.
  const usableShoes = shoeBucket.filter(s =>
    activities.some(act =>
      isItemValidForActivity(s, worstZone, getActivityProfile(act), presentation),
    ),
  );
  const effectivePool = usableShoes; // absolute — no fail-open
  if (effectivePool.length === 0 && shoeBucket.length > 0) {
    buildWarnings.push({
      code: 'CLIMATE_INCOMPATIBLE_FOOTWEAR',
      message: 'No climate-appropriate shoes available for trip conditions.',
    });
    return [];
  }

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
        rejectedReason: !inEffective ? `gate-filtered (formality=${worstProfile.formality} zone=${worstZone})` : null,
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

  // Derive trip-wide warm-climate profile for activity-purpose bonus on shoes.
  // Use warmest day + lowest-formality beach/casual activity to softly prefer
  // lightweight/leisure shoes when the trip is primarily warm & casual.
  const warmestDay = weather.length > 0
    ? weather.reduce((w, d) => (d.highF > w.highF ? d : w), weather[0])
    : undefined;
  const warmestClimate = deriveClimateZone(warmestDay);
  const lowestFormalityProfile = activities.reduce<ActivityProfile>((best, a) => {
    const ap = getActivityProfile(a);
    return ap.formality < best.formality ? ap : best;
  }, getActivityProfile(activities[0] || 'Casual'));

  const footwearWarmCtx = getWarmLeisureContext(lowestFormalityProfile, warmestClimate);
  const footwearWarmOverride = (item: TripWardrobeItem): number => {
    if (!footwearWarmCtx.isWarmLeisure) return 0;
    if (isHeavyFabric(item.material)) return -0.25 * footwearWarmCtx.strength;
    if (isLightweightFabric(item.material)) return 0.25 * footwearWarmCtx.strength;
    return 0;
  };
  // Trip semantic multipliers: merge all activities' purposes for trip-wide shoe scoring
  const shoeActivityPurposes = new Set<TripActivityPurpose>();
  for (const act of activities) {
    for (const p of expandTripActivityPurposes(act, warmestDay)) shoeActivityPurposes.add(p);
  }
  const qualityFn = (item: TripWardrobeItem) => {
    const base = activityScore(item, activities) + activityPurposeBonus(item, lowestFormalityProfile, warmestClimate) + footwearWarmOverride(item);
    const profile = deriveGarmentProfile(item);
    const purposeMul = tripPurposeMultiplier(profile.garmentPurposes, shoeActivityPurposes);
    const thermalMul = tripThermalMultiplier(profile.thermal, warmestDay);
    const destinationBias = getDestinationStyleBias(city, activities, item);
    return base * purposeMul * thermalMul + destinationBias;
  };

  // ── DEBUG: Footwear Candidate Evaluation ──
  if (DEBUG_TRIPS_ENGINE) {
    for (const shoe of shoeBucket) {
      const inEffective = effectivePool.some(s => s.id === shoe.id);
      const score = inEffective ? qualityFn(shoe) : 0;
      console.log('[TripsDebug][FootwearEval]', JSON.stringify({
        itemId: shoe.id,
        name: shoe.name,
        category: shoe.subcategory || shoe.main_category,
        brand: shoe.brand,
        formalityTier: getFormalityTier(shoe),
        climateBlocked: !inEffective,
        avoidBlocked: false,
        coherencePenalty: 0,
        authorityBonus: 0,
        redundancyPenalty: 0,
        finalScore: score,
        selected: false,
      }));
    }
  }

  // 1. anchor_shoe — most versatile palette-matching shoe
  const anchorResult = tieredPick(
    effectivePool, capsuleIntent, styleHints,
    emptyTracker, 0, Infinity, qualityFn,
    __DEV__ ? 'role/anchor_shoe' : undefined,
    undefined, lowestFormalityProfile, warmestClimate,
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
        undefined, lowestFormalityProfile, warmestClimate,
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
        undefined, lowestFormalityProfile, warmestClimate,
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

  // ── DEBUG: Mark selected footwear ──
  if (DEBUG_TRIPS_ENGINE) {
    const winners = new Set(selected.slice(0, maxShoes).map(s => s.id));
    for (const id of winners) {
      console.log('[TripsDebug][FootwearEval][Selected]', JSON.stringify({itemId: id, selected: true}));
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
 * Evaluates whether a role-packed shoe that failed gating should be
 * reinserted as a penalized candidate.
 *
 * ALL hard gates are enforced — climate, presentation, formality tier,
 * purpose compatibility, casual-only, beach-context. No tolerance override
 * for any hard violation. Uses the canonical gate (single source of truth).
 */
function evaluatePackedItemTolerance(
  item: TripWardrobeItem,
  climateZone: ClimateZone,
  presentation: Presentation,
  roleRegistry: RoleRegistry,
  activityProfile: ActivityProfile,
): boolean {
  // Only tolerate items intentionally packed via role planning
  const isRoleItem = [...roleRegistry.values()].some(v => v.id === item.id);
  if (!isRoleItem) return false;

  // ALL hard gates must pass — no tolerance override for any violation.
  // Canonical gate: same function used by gatePool. Since every shoe in
  // the rejected set already failed this gate, this will return false,
  // preventing reinsertion of any hard-violation item.
  return isItemValidForActivity(item, climateZone, activityProfile, presentation);
}

// ── T4 PATCH: Formality floor mapping (profile string → engine tier 0-3) ──
const FORMALITY_FLOOR_MAP: Record<string, number> = {
  'casual': 0,
  'smart casual': 1,
  'business casual': 2,
  'black tie': 3,
};

function resolveProfileFormalityFloor(floor: string | undefined): number {
  if (!floor) return 0;
  return FORMALITY_FLOOR_MAP[floor.toLowerCase()] ?? 0;
}

// ── T4 PATCH: Deterministic shoe walkability filter ──
const LOW_WALK_PATTERN = /\b(stiletto|high[- ]?heels?|platform[- ]?heels?|pumps?|slingback|mule)\b/;
const EXTREME_LOW_WALK_PATTERN = /\b(stiletto|platform[- ]?heels?)\b/;

function filterShoesByWalkability(
  shoes: TripWardrobeItem[],
  requirement: string,
): TripWardrobeItem[] {
  if (!requirement || requirement === 'Low') return shoes;
  const pattern = requirement === 'High' ? LOW_WALK_PATTERN : EXTREME_LOW_WALK_PATTERN;
  const filtered = shoes.filter(s => {
    const text = `${s.subcategory ?? ''} ${s.name ?? ''}`.toLowerCase();
    return !pattern.test(text);
  });
  // Emergency fallback: if all shoes excluded, preserve pool
  return filtered.length > 0 ? filtered : shoes;
}

let _scoringTraced = false;
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
  tasteProfile?: TripsTasteProfile,
  coherenceState?: CapsuleCoherenceState,
  fashionState?: {topBrands: string[]; [key: string]: any} | null,
  formalReservation?: {shoe: TripWardrobeItem | null; trouser: TripWardrobeItem | null; top: TripWardrobeItem | null},
  tripDerivedBand?: ClimateZone,
  denimSuppressActive?: boolean,
): TripPackingItem[] {
  const items: TripPackingItem[] = [];

  // ── Apply global climate + gender gating ──
  const climateZone = deriveClimateZone(dayWeather);
  // Beach heavy-fabric guard uses trip-level band (not per-day) per Tier 4 luxury policy
  const beachGuardZone: ClimateZone = tripDerivedBand ?? climateZone;
  let activityProfile = getActivityProfile(activity);
  // T4 PATCH [FORMALITY-FLOOR]: enforce minimum formality from style profile
  const profileFloor = resolveProfileFormalityFloor(styleHints?.formality_floor);
  if (profileFloor > activityProfile.formality) {
    activityProfile = {...activityProfile, formality: profileFloor};
    if (DEBUG_TRIPS_ENGINE) {
      console.log(`[TripsDebug][FORMALITY_FLOOR] Raised ${activity} formality ${getActivityProfile(activity).formality}→${profileFloor} (profile floor: ${styleHints?.formality_floor})`);
    }
  }
  const isMasculine = presentation === 'masculine';
  const isFormalActivity = activityProfile.formality >= 2;
  const gatedBuckets = {} as Record<CategoryBucket, TripWardrobeItem[]>;
  for (const key of Object.keys(buckets) as CategoryBucket[]) {
    gatedBuckets[key] = gatePool(buckets[key], climateZone, activityProfile, presentation);
    // Fallback: if gating empties the bucket — relax formality, KEEP climate + presentation
    if (gatedBuckets[key].length === 0 && buckets[key].length > 0) {
      const isColdOrFreezing = climateZone === 'cold' || climateZone === 'freezing';
      gatedBuckets[key] = buckets[key].filter(item => {
        const flags = inferGarmentFlags(item);
        if (isMasculine && flags.isFeminineOnly) return false;
        if (isFormalActivity && flags.isCasualOnly) return false;
        // Climate enforcement remains absolute in fallback
        if (isColdOrFreezing && flags.isMinimalCoverage) return false;
        if (isColdOrFreezing && isOpenFootwear(item)) return false;
        const requiredTier = getRequiredFormalityTier(activityProfile.formality);
        if (requiredTier > 0 && getFormalityTier(item) < requiredTier) return false;
        return true;
      });
    }
    // Taste gate: filter user-avoided colors (emergency fallback preserves pool if all vetoed)
    gatedBuckets[key] = filterByTasteGate(gatedBuckets[key], tasteProfile);
  }
  const gatedShoes = gatePool(selectedShoes, climateZone, activityProfile, presentation);
  // ── Track shoes rejected specifically for climate (permanent veto through all fallbacks) ──
  const climateRejectedIds = new Set<string>();
  if (gatedShoes.length < selectedShoes.length) {
    const _isColdOrFreezing = climateZone === 'cold' || climateZone === 'freezing';
    for (const s of selectedShoes) {
      if (gatedShoes.some(g => g.id === s.id)) continue;
      const flags = inferGarmentFlags(s);
      if (_isColdOrFreezing && flags.isMinimalCoverage) { climateRejectedIds.add(s.id); continue; }
      if (_isColdOrFreezing && isOpenFootwear(s)) { climateRejectedIds.add(s.id); continue; }
      if (_isColdOrFreezing && isLightweightFabricOnly(s) && !isLayeringBase(s)) { climateRejectedIds.add(s.id); continue; }
      if (climateZone === 'hot' && isHeavyInsulatingOnly(s)) { climateRejectedIds.add(s.id); continue; }
    }
    if (__DEV__ && climateRejectedIds.size > 0) {
      console.log(`[TripCapsule][GATE_SHOE] Climate-rejected (permanent veto): ${[...climateRejectedIds].join(', ')}`);
    }
  }
  // Shoe fallback: relax formality, KEEP climate + presentation
  let finalShoes: TripWardrobeItem[];
  if (gatedShoes.length > 0) {
    finalShoes = gatedShoes;
  } else {
    const isColdOrFreezingShoe = climateZone === 'cold' || climateZone === 'freezing';
    finalShoes = selectedShoes.filter(s => {
      if (climateRejectedIds.has(s.id)) return false;
      const flags = inferGarmentFlags(s);
      if (isMasculine && flags.isFeminineOnly) return false;
      if (isFormalActivity && flags.isCasualOnly) return false;
      // Climate enforcement remains absolute in shoe fallback
      if (isColdOrFreezingShoe && isOpenFootwear(s)) return false;
      if (isColdOrFreezingShoe && flags.isMinimalCoverage) return false;
      const requiredTier = getRequiredFormalityTier(activityProfile.formality);
      if (requiredTier > 0 && getFormalityTier(s) < requiredTier) return false;
      return true;
    });
  }
  // ── NON-EMPTY SHOE FALLBACK (hard requirement: never return empty shoes) ──
  if (finalShoes.length === 0 && selectedShoes.length > 0) {
    const requiredTier = getRequiredFormalityTier(activityProfile.formality);
    const isColdOrFreezing = climateZone === 'cold' || climateZone === 'freezing';

    // Step 1: Relax formality tier by ONE step, keep climate + presentation
    if (requiredTier > 0) {
      const relaxedTier = Math.max(requiredTier - 1, 1);
      finalShoes = selectedShoes.filter(s => {
        if (climateRejectedIds.has(s.id)) return false;
        const flags = inferGarmentFlags(s);
        if (isMasculine && flags.isFeminineOnly) return false;
        if (isColdOrFreezing && isOpenFootwear(s)) return false;
        if (isColdOrFreezing && flags.isMinimalCoverage) return false;
        // Hard reject non-insulated sneakers in freezing business (even in fallback)
        if (climateZone === 'freezing' && isFormalActivity) {
          const sText = `${(s.subcategory || '').toLowerCase()} ${(s.name || '').toLowerCase()}`;
          if (/\b(sneakers?|trainers?|running|athletic)\b/.test(sText)
            && !(s.material && /\b(insulated|weatherproof|waterproof|gore[- ]?tex)\b/i.test(s.material))) return false;
        }
        if (relaxedTier > 0 && getFormalityTier(s) < relaxedTier) return false;
        return true;
      });
      if (__DEV__ && finalShoes.length > 0) {
        console.log(`[TripCapsule][SHOE_FALLBACK] Relaxed tier ${requiredTier}→${relaxedTier} | ${finalShoes.length} shoes recovered for ${activity}`);
      }
    }

    // Step 2: Pick best closed-toe shoe matching presentation + climate (ignore formality)
    if (finalShoes.length === 0) {
      finalShoes = selectedShoes.filter(s => {
        if (climateRejectedIds.has(s.id)) return false;
        const flags = inferGarmentFlags(s);
        if (isMasculine && flags.isFeminineOnly) return false;
        if (isColdOrFreezing && isOpenFootwear(s)) return false;
        if (isColdOrFreezing && flags.isMinimalCoverage) return false;
        // Hard reject non-insulated sneakers in freezing business (even in fallback)
        if (climateZone === 'freezing' && isFormalActivity) {
          const sText = `${(s.subcategory || '').toLowerCase()} ${(s.name || '').toLowerCase()}`;
          if (/\b(sneakers?|trainers?|running|athletic)\b/.test(sText)
            && !(s.material && /\b(insulated|weatherproof|waterproof|gore[- ]?tex)\b/i.test(s.material))) return false;
        }
        return true;
      });
      if (__DEV__ && finalShoes.length > 0) {
        console.log(`[TripCapsule][SHOE_FALLBACK] Full formality relaxation | ${finalShoes.length} shoes recovered for ${activity}`);
      }
    }

    // Step 3: Last resort — relax formality completely but KEEP climate + presentation
    if (finalShoes.length === 0) {
      finalShoes = selectedShoes.filter(s => {
        if (climateRejectedIds.has(s.id)) return false;
        if (isMasculine && inferGarmentFlags(s).isFeminineOnly) return false;
        if (isColdOrFreezing && isOpenFootwear(s)) return false;
        if (isColdOrFreezing && inferGarmentFlags(s).isMinimalCoverage) return false;
        // Hard reject non-insulated sneakers in freezing business (even in emergency)
        if (climateZone === 'freezing' && isFormalActivity) {
          const sText = `${(s.subcategory || '').toLowerCase()} ${(s.name || '').toLowerCase()}`;
          if (/\b(sneakers?|trainers?|running|athletic)\b/.test(sText)
            && !(s.material && /\b(insulated|weatherproof|waterproof|gore[- ]?tex)\b/i.test(s.material))) return false;
        }
        return true;
      });
      if (__DEV__ && finalShoes.length > 0) {
        console.log(`[TripCapsule][SHOE_FALLBACK] Emergency fallback (climate-safe) | ${finalShoes.length} shoes for ${activity}`);
      }
    }
    // If still empty in cold — warn, do NOT inject open footwear
    if (finalShoes.length === 0 && isColdOrFreezing) {
      buildWarnings.push({
        code: 'CLIMATE_INCOMPATIBLE_FOOTWEAR',
        message: `No closed-toe shoes available for ${activity} in ${climateZone} conditions.`,
      });
    }
  }

  // ── Freezing boot priority: when fallback is active in freezing, prefer boots ──
  if (climateZone === 'freezing' && gatedShoes.length === 0 && finalShoes.length > 0) {
    const boots = finalShoes.filter(s =>
      /boot/i.test(`${s.subcategory ?? ''} ${s.name ?? ''}`),
    );
    if (boots.length > 0) {
      if (__DEV__) {
        console.log(`[TripCapsule][SHOE_FALLBACK] Freezing boot priority: ${boots.length} boots preferred over ${finalShoes.length} total for ${activity}`);
      }
      finalShoes = boots;
    }
  }

  // ── Role-packed shoe tolerance (all hard gates enforced) ──
  // Only role items that pass ALL canonical gates can be reinserted.
  // Since rejected shoes already failed isItemValidForActivity, this
  // block is effectively a no-op — no hard violation is ever tolerated.
  const toleranceShoeIds = new Set<string>();
  if (roleRegistry && roleRegistry.size > 0 && finalShoes.length > 0) {
    const rejectedShoes = selectedShoes.filter(s => !finalShoes.some(f => f.id === s.id));
    for (const shoe of rejectedShoes) {
      if (evaluatePackedItemTolerance(shoe, climateZone, presentation, roleRegistry, activityProfile)) {
        finalShoes.push(shoe);
        toleranceShoeIds.add(shoe.id);
        if (__DEV__) {
          console.log(`[TripCapsule][TOLERANCE] Reinsert ${shoe.name} (${shoe.id}) | passed all hard gates for ${activity}`);
        }
      }
    }
  }

  // ── Taste gate: remove user-avoided colors from shoes ──
  finalShoes = filterByTasteGate(finalShoes, tasteProfile);

  // T4 PATCH [WALKABILITY]: filter shoes by walkability requirement
  if (styleHints?.walkability_requirement && styleHints.walkability_requirement !== 'Low') {
    const beforeWalk = finalShoes.length;
    finalShoes = filterShoesByWalkability(finalShoes, styleHints.walkability_requirement);
    if (DEBUG_TRIPS_ENGINE && finalShoes.length < beforeWalk) {
      console.log(`[TripsDebug][WALKABILITY] ${styleHints.walkability_requirement} | ${beforeWalk}→${finalShoes.length} shoes for ${activity}`);
    }
  }

  // ── FINAL_FREEZING_FORMAL_ENFORCEMENT ──
  // Non-relaxable hard exclusion layer. Executes AFTER all fallback recovery,
  // tolerance reinsertion, and taste gating. Removes sneakers and low-formality
  // footwear from freezing formal contexts. Cannot be bypassed by any fallback.
  if (climateZone === 'freezing' && isFormalActivity) {
    const enforceTier = getRequiredFormalityTier(activityProfile.formality);
    const beforeCount = finalShoes.length;
    finalShoes = finalShoes.filter(s => {
      const sText = `${(s.subcategory || '').toLowerCase()} ${(s.name || '').toLowerCase()}`;
      const sMat = (s.material || '').toLowerCase();
      const hasProtection = /\b(insulated|waterproof|weatherproof|gore[- ]?tex|shearling|lined)\b/.test(sMat);

      // Remove ALL non-insulated sneakers/trainers/athletic shoes
      if (/\b(sneakers?|trainers?|running|athletic)\b/.test(sText) && !hasProtection) {
        if (DEBUG_TRIPS_ENGINE) console.log(`[TripsDebug][FINAL_SHOE_ENFORCE] REMOVED ${s.name} | reason=freezing_formality_lock sneaker`);
        return false;
      }

      // Remove casual-only boots (work boots, combat boots, hiking boots)
      const flags = inferGarmentFlags(s);
      if (flags.isCasualOnly && /boot/i.test(sText)) {
        if (DEBUG_TRIPS_ENGINE) console.log(`[TripsDebug][FINAL_SHOE_ENFORCE] REMOVED ${s.name} | reason=freezing_formality_lock casual_boot`);
        return false;
      }

      // Remove any footwear below required formality tier
      if (enforceTier > 0 && getFormalityTier(s) < enforceTier) {
        if (DEBUG_TRIPS_ENGINE) console.log(`[TripsDebug][FINAL_SHOE_ENFORCE] REMOVED ${s.name} | reason=freezing_formality_lock tier=${getFormalityTier(s)}<${enforceTier}`);
        return false;
      }

      return true;
    });
    if (__DEV__ && finalShoes.length < beforeCount) {
      console.log(`[TripCapsule][FINAL_SHOE_ENFORCE] Removed ${beforeCount - finalShoes.length} shoes for freezing formal enforcement (${activity})`);
    }
  }

  // ── FINAL_FORMAL_ENFORCEMENT (all climates) ──
  // Prevents fallback from violating required formality tier.
  if (isFormalActivity && climateZone !== 'freezing') {
    const enforceTier = getRequiredFormalityTier(activityProfile.formality);
    if (enforceTier > 0) {
      const beforeCount = finalShoes.length;

      finalShoes = finalShoes.filter(s => {
        if (getFormalityTier(s) < enforceTier) {
          if (DEBUG_TRIPS_ENGINE) {
            console.log(
              `[TripsDebug][FINAL_SHOE_ENFORCE] REMOVED ${s.name} | tier=${getFormalityTier(s)} required=${enforceTier}`
            );
          }
          return false;
        }
        return true;
      });

      if (__DEV__ && finalShoes.length < beforeCount) {
        console.log(
          `[TripCapsule][FINAL_SHOE_ENFORCE] Removed ${beforeCount - finalShoes.length} shoes for formal enforcement (${activity})`
        );
      }
    }
  }

  // ── ELITE_FORMAL_FOOTWEAR_AUTHORITY ──
  // Prefer Tier 3 for Formal (formality >= 3). Graceful fallback to Tier 2.
  // Never below Tier 2. Never empty pool.
  if (activityProfile.formality >= 3 && finalShoes.length > 0) {
    const tier3Shoes = finalShoes.filter(s => getFormalityTier(s) >= 3);
    if (tier3Shoes.length > 0) {
      finalShoes = tier3Shoes;
    } else {
      const tier2Shoes = finalShoes.filter(s => getFormalityTier(s) >= 2);
      if (tier2Shoes.length > 0) {
        finalShoes = tier2Shoes;
        console.log('[TripCapsule][ELITE_WARNING] Formal footwear downgraded: no tier3 available, using tier2');
      } else {
        console.log('[TripCapsule][ELITE_ERROR] No Tier 2+ footwear available for Formal');
        // Keep existing pool — never empty
      }
    }
  }

  // ── ELITE_FORMAL_SHOE_FLOOR_CLAMP (final guard) ──
  // Runs AFTER all fallback cascades. Hard floor: Tier 2 minimum for Formal.
  // Never Tier 1. Never "keep existing". Empty pool → hasCoreSlots skips day.
  if (activityProfile.formality >= 3) {
    const tier2Plus = finalShoes.filter(s => getFormalityTier(s) >= 2);
    if (tier2Plus.length > 0) {
      finalShoes = tier2Plus;
    } else {
      console.log('[TripCapsule][ELITE_ERROR] No Tier 2+ footwear available for Formal');
      finalShoes = [];
    }
  }

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

  // ── Identity score: decisive user-preference ranking (Trips-only) ──
  // Weights are tuned so identity signals materially influence selection
  // among context-valid candidates without overriding legality gates.
  // Effective penalty impact: favorite color 12pts, fabric 8pts, brand 6pts,
  // fit 6pts, disliked -15pts. Comparable to cooldown (25) and activity (30).
  const identityScore = (item: TripWardrobeItem): number => {
    if (!styleHints) return 0;
    let score = 0;

    // Favorite color match (+1.2): within-tier boost for user's stated favorites
    if (item.color && styleHints.favorite_colors?.length) {
      const words = item.color.toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
      const favSet = new Set(styleHints.favorite_colors.map(c => c.toLowerCase()));
      if (words.some(w => [...favSet].some(f => colorMatches(w, f)))) score += 1.2;
    }

    // Preferred fabric match (+0.8)
    if (item.material && styleHints.fabric_preferences?.length) {
      const matLower = item.material.toLowerCase();
      if (styleHints.fabric_preferences.some(f => matLower.includes(f.toLowerCase()) || f.toLowerCase().includes(matLower))) score += 0.8;
    }

    // Preferred brand match (+0.6)
    if (item.brand && styleHints.preferred_brands?.length) {
      const brandLower = item.brand.toLowerCase();
      if (styleHints.preferred_brands.some(b => brandLower.includes(b.toLowerCase()))) score += 0.6;
    }

    // Brand authority bonus (+0.8): fashionState.topBrands from learning system
    if (item.brand && fashionState?.topBrands?.length) {
      const brandLower = item.brand.toLowerCase();
      if (fashionState.topBrands.some(b => brandLower.includes(b.toLowerCase()))) score += 0.8;
    }

    // T4 PATCH [NEGATIVE-LEARNING]: penalize avoided brands/colors/styles from learning system
    if (!_scoringTraced) { console.log('[CAPSULE TRACE] scoring fashionState.avoidColors:', fashionState?.avoidColors); _scoringTraced = true; }
    if (item.brand && fashionState?.avoidBrands?.length) {
      const brandLower = item.brand.toLowerCase();
      if ((fashionState.avoidBrands as string[]).some((b: string) => brandLower.includes(b.toLowerCase()))) score -= 0.8;
    }
    if (item.color && fashionState?.avoidColors?.length) {
      const words = item.color.toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
      if (words.some(w => (fashionState.avoidColors as string[]).some((a: string) => colorMatches(w, a.toLowerCase())))) score -= 0.6;
    }
    if (fashionState?.avoidStyles?.length) {
      const subLower = (item.subcategory || '').toLowerCase();
      const nameLower = (item.name || '').toLowerCase();
      if ((fashionState.avoidStyles as string[]).some((s: string) => {
        const sl = s.toLowerCase();
        return (subLower && subLower.includes(sl)) || (nameLower && nameLower.includes(sl));
      })) score -= 0.6;
    }

    // Fit / silhouette match (+0.6)
    if (item.fit && styleHints.fit_preferences?.length) {
      const fitLower = item.fit.toLowerCase();
      if (styleHints.fit_preferences.some(f => fitLower === f.toLowerCase())) score += 0.6;
    } else if (item.fit && capsuleIntent?.silhouetteBias) {
      if (item.fit.toLowerCase() === capsuleIntent.silhouetteBias) score += 0.4;
    }

    // Disliked style penalty (-1.5): strong avoidance signal
    if (styleHints.disliked_styles?.length) {
      const subLower = (item.subcategory || '').toLowerCase();
      const nameLower = (item.name || '').toLowerCase();
      if (styleHints.disliked_styles.some(d => {
        const dl = d.toLowerCase();
        return (subLower && subLower.includes(dl)) || (nameLower && nameLower.includes(dl));
      })) score -= 1.5;
    }

    return score;
  };

  // Identity saturation dampening: reduce identity influence for over-used items.
  // Simulates editorial restraint — signature pieces reused, but not dominant.
  const identityDampening = (item: TripWardrobeItem): number => {
    const useCount = (usageTracker.get(item.id) || []).length;
    if (useCount <= 2) return 1;
    if (useCount === 3) return 0.85;
    if (useCount === 4) return 0.7;
    return 0.5; // useCount >= 5
  };

  // Quality function: activity scoring + activity-purpose warm-climate modifier
  // + aesthetic tie-breaker + dampened identity biasing
  // Warm-leisure context: dampen identity/aesthetic to let purpose bonus dominate
  const warmLeisureCtx = getWarmLeisureContext(activityProfile, climateZone);
  const styleDampen = warmLeisureCtx.isWarmLeisure ? 0.8 : 1;
  const warmLeisureOverride = (item: TripWardrobeItem): number => {
    if (!warmLeisureCtx.isWarmLeisure) return 0;
    if (isHeavyFabric(item.material)) return -0.25 * warmLeisureCtx.strength;
    if (isLightweightFabric(item.material)) return 0.25 * warmLeisureCtx.strength;
    return 0;
  };
  // ── Trip semantic multipliers (purpose + thermal) ──
  const dayActivityPurposes = expandTripActivityPurposes(activity, dayWeather);
  const qualityFn = (item: TripWardrobeItem) => {
    const coherencePen = coherenceState ? capsuleDriftPenalty(item, coherenceState) : 0;
    // ── DEBUG: Coherence Drift Log ──
    if (DEBUG_TRIPS_ENGINE && coherencePen !== 0) {
      console.log('[TripsDebug][CoherencePenalty]', JSON.stringify({
        itemId: item.id,
        colorTemp: item.color || 'unknown',
        silhouetteDirection: coherenceState?.silhouetteDirection ?? null,
        penaltyApplied: coherencePen,
      }));
    }
    // ── Denim suppression: penalize denim bottoms on Formal/Business + cold trips ──
    const denimPen = (denimSuppressActive && isDenimBottom(item)) ? PENALTY_DENIM_SUPPRESSION : 0;
    if (DEBUG_TRIPS_ENGINE && denimPen !== 0) {
      console.log('[TripsDebug][DenimSuppressionCandidate]', JSON.stringify({
        itemId: item.id, name: item.name, penalty: denimPen,
      }));
    }
    const base = activityScore(item, [activity]) + activityPurposeBonus(item, activityProfile, climateZone) + aestheticBonus(item, items, poolLookup) * styleDampen + identityScore(item) * identityDampening(item) * styleDampen + warmLeisureOverride(item) + coherencePen + denimPen;
    const profile = deriveGarmentProfile(item);
    const purposeMul = tripPurposeMultiplier(profile.garmentPurposes, dayActivityPurposes);
    const thermalMul = tripThermalMultiplier(profile.thermal, dayWeather);
    return base * purposeMul * thermalMul;
  };

  // Pre-compute warm/hot Beach guard once per outfit build (used in pickW belt-and-suspenders)
  // Uses trip-level band (beachGuardZone), not per-day climateZone, per Tier 4 luxury policy.
  const _isBeachWarmCtx = isWarmHotBeachContext(activity, activityProfile, beachGuardZone);
  if (_isBeachWarmCtx && activity.toLowerCase() === 'beach') {
    console.log(`[TripCapsule][BEACH_POLICY_TRIP_SCOPE] zone=${tripDerivedBand ?? climateZone} activity=Beach`);
  }

  const pickW = (bucket: TripWardrobeItem[], label?: string): WeightedPickResult | null => {
    // ── ELITE_BEACH_WARM_PICKW_GUARD ──
    // Belt-and-suspenders: filter heavy fabrics from the bucket right before pick,
    // regardless of whether tieredPick or direct weightedPick path is taken.
    let effectiveBucket = bucket;
    if (_isBeachWarmCtx) {
      effectiveBucket = filterHeavyFabricsForBeach(bucket, `${activity}/${label ?? 'unknown'}/pickW`);
    }
    const maxUses = maxUsesForBucket(effectiveBucket.length);
    const dbgLabel = __DEV__ ? `${activity}/${label}` : undefined;
    if (capsuleIntent) {
      return tieredPick(effectiveBucket, capsuleIntent, styleHints, usageTracker, dayIndex, maxUses, qualityFn, dbgLabel, undefined, activityProfile, beachGuardZone);
    }
    return weightedPick(effectiveBucket, usageTracker, dayIndex, maxUses, qualityFn, dbgLabel);
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
      ? tieredPick(budgetedShoes, capsuleIntent, styleHints, usageTracker, dayIndex, maxUses, shoeQualityFn, dbgLabel, toleranceShoeIds, activityProfile, beachGuardZone)
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
      // ── ELITE_BEACH_WARM_FILTER (V24) ──
      // In warm/hot climates, hard-block heavy fabrics (material OR name) from all Beach pools.
      // NO fallback — if blocked pool becomes empty, hasCoreSlots rejects the outfit.
      const beachWarmActive = isWarmHotBeachContext(activity, activityProfile, beachGuardZone);
      if (beachWarmActive) {
        console.log('[TripCapsule][ELITE_BEACH_WARM_FILTER_ACTIVE] zone=' + climateZone + ' activity=Beach');
        gatedBuckets.tops = filterHeavyFabricsForBeach(gatedBuckets.tops, 'Beach/tops');
        gatedBuckets.bottoms = filterHeavyFabricsForBeach(gatedBuckets.bottoms, 'Beach/bottoms');
        gatedBuckets.outerwear = filterHeavyFabricsForBeach(gatedBuckets.outerwear, 'Beach/outerwear');
        gatedBuckets.swimwear = filterHeavyFabricsForBeach(gatedBuckets.swimwear, 'Beach/swimwear');
      }

      if (isMasculine) {
        // Masculine beach: tops + bottoms (regular or swim trunks) + shoes
        pickAndPush(gatedBuckets.tops, 'tops');
        const beachBottoms = getBeachBottomCandidates(gatedBuckets);
        // ── ELITE_BEACH_BOTTOM_PRIORITY ──
        // Tiered selection: resort > neutral casual > structured (last resort only).
        const BEACH_RESORT_RE = /\b(swim|trunk|board ?short|short|shorts|bermuda|linen|sarong|wrap)\b/i;
        const BEACH_CASUAL_RE = /\b(denim|chino|cotton twill)\b/i;
        const BEACH_STRUCTURED_RE = /\b(dress pant|dress slack|suit pant|wool trouser|structured)\b/i;
        const resortBottoms: TripWardrobeItem[] = [];
        const casualBottoms: TripWardrobeItem[] = [];
        const structuredBottoms: TripWardrobeItem[] = [];
        for (const b of beachBottoms) {
          const sub = (b.subcategory || '').toLowerCase();
          const name = (b.name || '').toLowerCase();
          const mat = (b.material || '').toLowerCase();
          const checkText = `${sub} ${name}`;
          if (BEACH_RESORT_RE.test(checkText)) {
            resortBottoms.push(b);
          } else if (BEACH_STRUCTURED_RE.test(checkText)) {
            structuredBottoms.push(b);
          } else if (BEACH_CASUAL_RE.test(`${checkText} ${mat}`)) {
            casualBottoms.push(b);
          } else {
            casualBottoms.push(b);
          }
        }
        // Stable sort within each tier by ID for determinism
        resortBottoms.sort((a, b) => a.id.localeCompare(b.id));
        casualBottoms.sort((a, b) => a.id.localeCompare(b.id));
        structuredBottoms.sort((a, b) => a.id.localeCompare(b.id));
        const finalBeachBottoms = resortBottoms.length > 0
          ? resortBottoms
          : casualBottoms.length > 0
            ? casualBottoms
            : structuredBottoms.length > 0
              ? (() => {
                  console.log('[TripCapsule][ELITE_WARNING] Beach bottoms fallback: resort bottoms unavailable');
                  return structuredBottoms;
                })()
              : beachBottoms;
        if (finalBeachBottoms.length > 0) {
          pickAndPush(finalBeachBottoms, 'beach-bottoms');
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
      // ── ELITE_ACTIVE_CLIMATE_FILTER ──
      // Reject heavy insulating fabrics + structured tailoring in warm/hot for Active.
      const isWarmOrHotActive = climateZone === 'warm' || climateZone === 'hot';
      if (isWarmOrHotActive) {
        const ACTIVE_HEAVY_MATERIAL = /\b(wool|cashmere|merino|fleece|sherpa|shearling|down|quilted|tweed|velvet)\b/i;
        const ACTIVE_STRUCTURED = /\b(blazer|sport coat|suit|waistcoat|structured jacket)\b/i;
        const filterActiveClimate = (pool: TripWardrobeItem[]): TripWardrobeItem[] => {
          const filtered = pool.filter(item => {
            if (item.material && ACTIVE_HEAVY_MATERIAL.test(item.material)) return false;
            const text = `${(item.subcategory || '')} ${(item.name || '')}`.toLowerCase();
            if (ACTIVE_STRUCTURED.test(text)) return false;
            return true;
          });
          if (filtered.length > 0) return filtered;
          console.log('[TripCapsule][ELITE_WARNING] Active climate fallback: heavy fabrics only available');
          return pool;
        };
        gatedBuckets.tops = filterActiveClimate(gatedBuckets.tops);
        gatedBuckets.bottoms = filterActiveClimate(gatedBuckets.bottoms);
      }

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
      // ── ELITE_FORMAL_TOP_AUTHORITY ──
      // Reject loud/novelty tops for Formal. Color field first, name/subcategory fallback.
      {
        const FORMAL_REJECT_COLOR = /\b(neon|fluorescent|electric|lime|acid|hot pink)\b/i;
        const FORMAL_CONDITIONAL_COLOR = /\b(pink|fuchsia|magenta)\b/i;
        const FORMAL_MUTED_EXCEPTION = /\b(muted|dusty|pale)\b/i;
        const FORMAL_REJECT_PATTERN = /\b(polka ?dot|novelty|graphic|cartoon|tropical|tie[- ]?dye|camo|camouflage|animal ?print|leopard|zebra|psychedelic)\b/i;
        const originalTops = gatedBuckets.tops;
        const filteredTops = originalTops.filter(item => {
          const color = (item.color || '').toLowerCase();
          const text = `${(item.subcategory || '')} ${(item.name || '')}`.toLowerCase();
          if (FORMAL_REJECT_COLOR.test(color)) return false;
          if (FORMAL_CONDITIONAL_COLOR.test(color) && !FORMAL_MUTED_EXCEPTION.test(text)) return false;
          if (FORMAL_REJECT_PATTERN.test(text)) return false;
          return true;
        });
        if (filteredTops.length > 0) {
          gatedBuckets.tops = filteredTops;
        } else {
          console.log('[TripCapsule][ELITE_ERROR] No authority tops available for Formal');
          gatedBuckets.tops = [];
        }
      }

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
    ? applyCoherenceGuard(items, capsuleIntent, gatedBuckets, finalShoes, usageTracker, dayIndex, locationLabel, poolLookup, climateZone, activityProfile, presentation, beachGuardZone)
    : items;

  // Commit repairs: penalize replaced items so they cannot be re-selected on future days.
  // This prevents oscillation where a repaired item gets picked again the next day.
  for (let ci = 0; ci < items.length && ci < coherenceChecked.length; ci++) {
    if (items[ci].wardrobeItemId !== coherenceChecked[ci].wardrobeItemId) {
      const originalId = items[ci].wardrobeItemId;
      const days = usageTracker.get(originalId) || [];
      for (let d = dayIndex; d < numDays; d++) days.push(d);
      usageTracker.set(originalId, days);
    }
  }

  // Enforce one-piece vs separates structure
  let normalized = normalizeOutfitStructure(coherenceChecked);

  // Last line of defense: strip any dress-bucket item that escaped for masculine wardrobes
  if (presentation === 'masculine') {
    normalized = normalized.filter(i => {
      const bucket = CATEGORY_MAP[i.mainCategory];
      return bucket !== 'dresses';
    });
  }

  // Apply composition validator: repair visually incoherent outfits using alternates
  normalized = validateOutfitComposition(normalized, poolLookup, activityProfile, locationLabel, climateZone, presentation, beachGuardZone, denimSuppressActive);

  // ── ELITE_FORMAL_AUTHORITY_DURABILITY ──
  // Hard guarantee: if reserved formal authority items exist and wardrobe has
  // Tier 3 shoe + authority top + structured trouser, force-inject them so at
  // least one Formal outfit always builds. Runs AFTER all filters, taste gate,
  // climate, composition — but BEFORE hasCoreSlots validation.
  if (
    activityProfile.formality >= 3 &&
    formalReservation &&
    (formalReservation.shoe || formalReservation.trouser || formalReservation.top)
  ) {
    const normalizedSlots = new Set(
      normalized.map(i => CATEGORY_MAP[i.mainCategory] || 'other'),
    );
    const missingTop = !normalizedSlots.has('tops') && !normalizedSlots.has('dresses');
    const missingBottom = !normalizedSlots.has('bottoms') && !normalizedSlots.has('dresses');
    const missingShoes = !normalizedSlots.has('shoes');

    // Also check if existing shoe is below Tier 2 (unacceptable for Formal)
    const currentShoeItem = normalized.find(i => CATEGORY_MAP[i.mainCategory] === 'shoes');
    const currentShoeFull = currentShoeItem ? poolLookup.get(currentShoeItem.wardrobeItemId) : null;
    const shoeIsBelowTier2 = currentShoeFull ? getFormalityTier(currentShoeFull) < 2 : false;

    const needsInjection = missingTop || missingBottom || missingShoes || shoeIsBelowTier2;

    if (needsInjection) {
      // Inject reserved authority top
      if (missingTop && formalReservation.top) {
        const existingTopIdx = normalized.findIndex(i => CATEGORY_MAP[i.mainCategory] === 'tops');
        if (existingTopIdx === -1) {
          normalized.push(toPackingItem(formalReservation.top, locationLabel));
        }
        if (__DEV__) {
          console.log(`[TripCapsule][ELITE_FORMAL_DURABILITY] Injected authority top: ${formalReservation.top.name}`);
        }
      }

      // Inject reserved structured trouser
      if (missingBottom && formalReservation.trouser) {
        const existingBottomIdx = normalized.findIndex(i => CATEGORY_MAP[i.mainCategory] === 'bottoms');
        if (existingBottomIdx === -1) {
          normalized.push(toPackingItem(formalReservation.trouser, locationLabel));
        }
        if (__DEV__) {
          console.log(`[TripCapsule][ELITE_FORMAL_DURABILITY] Injected structured trouser: ${formalReservation.trouser.name}`);
        }
      }

      // Inject or replace shoe: ensure Tier 2+ minimum
      if ((missingShoes || shoeIsBelowTier2) && formalReservation.shoe) {
        if (shoeIsBelowTier2 && currentShoeItem) {
          // Replace sub-Tier-2 shoe with reserved Tier 3 shoe
          normalized = normalized.filter(i => i.wardrobeItemId !== currentShoeItem.wardrobeItemId);
        }
        // Only inject if no shoes slot present after potential removal
        if (!normalized.some(i => CATEGORY_MAP[i.mainCategory] === 'shoes')) {
          normalized.push(toPackingItem(formalReservation.shoe, locationLabel));
        }
        if (__DEV__) {
          console.log(`[TripCapsule][ELITE_FORMAL_DURABILITY] Injected Tier 3 shoe: ${formalReservation.shoe.name}`);
        }
      }

      // Re-normalize structure after injection
      normalized = normalizeOutfitStructure(normalized);
      if (presentation === 'masculine') {
        normalized = normalized.filter(i => CATEGORY_MAP[i.mainCategory] !== 'dresses');
      }
    }
  }

  // ── ELITE_BEACH_WARM_VIOLATION assertion (final non-bypassable check) ──
  // After ALL mutations (coherence, composition, formal injection), if context is
  // Beach + warm/hot, reject the outfit if ANY item matches heavy fabric regex.
  if (isWarmHotBeachContext(activity, activityProfile, beachGuardZone)) {
    for (const pi of normalized) {
      const full = poolLookup.get(pi.wardrobeItemId);
      const nameMatch = pi.name && BEACH_WARM_HEAVY_RE.test(pi.name);
      const matMatch = full?.material && BEACH_WARM_HEAVY_RE.test(full.material);
      if (nameMatch || matMatch) {
        console.error(
          `[TripCapsule][ELITE_BEACH_WARM_VIOLATION] itemId=${pi.wardrobeItemId} name=${pi.name}`,
        );
        return []; // fail the outfit build cleanly
      }
    }
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
    const coreSlots = new Set(
      normalized.map(i => CATEGORY_MAP[i.mainCategory] || 'other'),
    );
    if (!coreSlots.has('shoes')) shoelessRejects++;
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

function generateBuildId(fingerprint: string): string {
  return `build_${hashString(fingerprint).toString(36)}`;
}

export function buildCapsule(
  wardrobeItems: TripWardrobeItem[],
  weather: DayWeather[],
  activities: TripActivity[],
  startingLocationLabel: string,
  explicitPresentation?: Presentation,
  styleHints?: TripStyleHints,
  fashionState?: {
    topBrands: string[];
    avoidBrands: string[];
    topColors: string[];
    avoidColors: string[];
    topStyles?: string[];
    avoidStyles?: string[];
    topCategories: string[];
    priceBracket: string | null;
    isColdStart: boolean;
  } | null,
  destinationLabel?: string,
): TripCapsule {
  _scoringTraced = false;
  _gateLogSeen.clear();
  console.log('[CAPSULE TRACE] buildCapsule received fashionState:', fashionState);
  console.log('[CAPSULE TRACE] buildCapsule fashionState.avoidColors:', fashionState?.avoidColors);
  console.log('[CAPSULE TRACE] buildCapsule received styleHints:', styleHints);
  console.log('[CAPSULE TRACE] buildCapsule styleHints.avoid_colors:', (styleHints as any)?.avoid_colors);
  // Guardrail: destination weather is required — never silently fallback
  if (!weather || weather.length === 0) {
    throw new Error('[CapsuleEngine] tripWeather is empty — cannot build capsule without destination weather data.');
  }

  // Reset trace collector and build warnings for this build
  if (TRIP_TRACE) tripTrace = [];
  buildWarnings = [];
  shoelessRejects = 0;

  const numDays = Math.max(weather.length, 1);
  const needs = analyzeWeather(weather);

  // Step 0: Resolve presentation — explicit profile overrides wardrobe detection
  const presentation: Presentation = explicitPresentation ?? detectPresentation(wardrobeItems);

  // Step 0b: Pre-filter ineligible items BEFORE any bucketing/scoring
  const eligibleItems = filterEligibleItems(wardrobeItems, presentation);

  // --- HOTFIX: merge learning avoidColors into styleHints for INTENT ---
  const rawAvoid = [
    ...(styleHints?.avoid_colors ?? []),
    ...(fashionState?.avoidColors ?? []),
  ];
  const normalizedAvoid = Array.from(
    new Set(
      rawAvoid
        .flatMap(c =>
          String(c)
            .split(/and|\/|,/i)
        )
        .map(c => c.trim().toLowerCase())
        .filter(Boolean)
    )
  );
  const mergedStyleHints: TripStyleHints | undefined = (styleHints || normalizedAvoid.length) ? {
    ...styleHints,
    avoid_colors: normalizedAvoid,
  } as TripStyleHints : undefined;

  // Step 0c: Build capsule intent — stylist direction computed once, passed through engine
  const capsuleIntent = buildCapsuleIntent(eligibleItems, activities, mergedStyleHints);

  // Step 0d: Build taste profile — full avoid-list enforcement (colors + materials + patterns + coverage)
  const tasteProfile: TripsTasteProfile | undefined = styleHints ? {
    avoid_colors: styleHints.avoid_colors ?? [],
    avoid_materials: styleHints.avoid_materials ?? [],
    avoid_patterns: styleHints.avoid_patterns ?? [],
    coverage_no_go: styleHints.coverage_no_go ?? [],
  } : undefined;

  // Step 0e: Determine required roles — guides shoe/outerwear selection for complementary coverage
  const requiredRoles = determineRequiredRoles(activities, weather);
  const roleRegistry: RoleRegistry = new Map();

  // Deterministic seed — used for seeded RNG, requestId, and buildId
  const seedStr =
    eligibleItems.map(i => i.id).join(',') +
    weather.map(w => w.date).join(',') +
    activities.join(',');
  const rand = seededRandom(hashString(seedStr));
  const requestId = `trip_${hashString(seedStr).toString(36)}`;

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

  // ── Trip-level climate band — derived strictly from destination weather ──
  // Used for Beach heavy-fabric policy: trip-level scope, not per-day.
  // Rule: cold mornings dominate (minTemp <= 40 → cold), then hot afternoons (maxTemp >= 75 → warm), else cool.
  const tripMinTemp = Math.min(...weather.map(d => d.lowF));
  const tripMaxTemp = Math.max(...weather.map(d => d.highF));
  const tripDerivedBand: ClimateZone =
    tripMinTemp <= 40 ? 'cold' :
    tripMaxTemp >= 75 ? 'warm' :
    'cool';
  if (DEBUG_TRIPS_ENGINE) {
    console.log('[TripsDebug][Climate]', JSON.stringify({
      city: destinationLabel || 'UNKNOWN_DESTINATION',
      minTemp: tripMinTemp,
      maxTemp: tripMaxTemp,
      derivedBand: tripDerivedBand,
    }));
  }

  // ── Denim suppression: penalize denim bottoms for Formal/Business + cold/freezing trips ──
  const denimSuppressActive = shouldSuppressDenim(activities, tripDerivedBand);
  if (DEBUG_TRIPS_ENGINE && denimSuppressActive) {
    console.log('[TripsDebug][DenimSuppression] active=true', JSON.stringify({
      activities, derivedBand: tripDerivedBand, penalty: PENALTY_DENIM_SUPPRESSION,
    }));
  }

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

  // Step 2: Sort each bucket by activity relevance + warm-climate purpose bonus
  const tripWarmestDay = weather.length > 0
    ? weather.reduce((w, d) => (d.highF > w.highF ? d : w), weather[0])
    : undefined;
  const tripWarmestClimate = deriveClimateZone(tripWarmestDay);
  const tripLowestFormalityProfile = activities.reduce<ActivityProfile>((best, a) => {
    const ap = getActivityProfile(a);
    return ap.formality < best.formality ? ap : best;
  }, getActivityProfile(activities[0] || 'Casual'));

  const bucketWarmCtx = getWarmLeisureContext(tripLowestFormalityProfile, tripWarmestClimate);
  // Trip semantic multipliers for bucket pre-sort: merge all activities + warmest weather
  const bucketActivityPurposes = new Set<TripActivityPurpose>();
  for (const act of activities) {
    for (const p of expandTripActivityPurposes(act, tripWarmestDay)) bucketActivityPurposes.add(p);
  }
  const bucketSortScore = (item: TripWardrobeItem): number => {
    let score = activityScore(item, activities) + activityPurposeBonus(item, tripLowestFormalityProfile, tripWarmestClimate);
    if (bucketWarmCtx.isWarmLeisure) {
      if (isHeavyFabric(item.material)) score -= 0.25 * bucketWarmCtx.strength;
      if (isLightweightFabric(item.material)) score += 0.25 * bucketWarmCtx.strength;
    }
    // Semantic multipliers: purpose + thermal compatibility
    const profile = deriveGarmentProfile(item);
    score *= tripPurposeMultiplier(profile.garmentPurposes, bucketActivityPurposes);
    score *= tripThermalMultiplier(profile.thermal, tripWarmestDay);
    return score;
  };
  for (const key of Object.keys(buckets) as CategoryBucket[]) {
    const sorted = shuffleWithSeed(buckets[key], rand).sort(
      (a, b) => bucketSortScore(b) - bucketSortScore(a) || a.id.localeCompare(b.id),
    );
    // Context-primary partitioning: in warm-leisure context, move purpose-aligned
    // lightweight items to the front of each bucket (preserves all items)
    if (bucketWarmCtx.isWarmLeisure) {
      const ctxPrimary = sorted.filter(item =>
        isContextPrimaryCandidate(item, tripLowestFormalityProfile, tripWarmestClimate),
      );
      if (ctxPrimary.length > 0) {
        const ctxIds = new Set(ctxPrimary.map(i => i.id));
        const rest = sorted.filter(item => !ctxIds.has(item.id));
        buckets[key] = [...ctxPrimary, ...rest];
      } else {
        buckets[key] = sorted;
      }
    } else {
      buckets[key] = sorted;
    }
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

  // ── ELITE_FORMAL_AUTHORITY_RESERVATION ──
  // Reserve best authority items for Formal before any outfit construction.
  // Prevents casual/anchor days from consuming Formal-critical pieces.
  type FormalReservation = {shoe: TripWardrobeItem | null; trouser: TripWardrobeItem | null; top: TripWardrobeItem | null};
  const formalReservation: FormalReservation = {shoe: null, trouser: null, top: null};
  const reservedFormalIds = new Set<string>();

  if (activities.includes('Formal')) {
    // Tier 3 shoe: highest formality, stable sort by ID
    const tier3Shoes = buckets.shoes
      .filter(s => getFormalityTier(s) >= 3)
      .sort((a, b) => getNormalizedFormality(b) - getNormalizedFormality(a) || a.id.localeCompare(b.id));
    if (tier3Shoes.length > 0) {
      formalReservation.shoe = tier3Shoes[0];
      reservedFormalIds.add(tier3Shoes[0].id);
    }

    // Structured trouser: highest formality, stable sort by ID
    const STRUCTURED_TROUSER_RE = /\b(trouser|slacks|dress pant|suit pant)\b/i;
    const structuredTrousers = buckets.bottoms
      .filter(b => STRUCTURED_TROUSER_RE.test((b.subcategory || '').toLowerCase()))
      .sort((a, b) => getNormalizedFormality(b) - getNormalizedFormality(a) || a.id.localeCompare(b.id));
    if (structuredTrousers.length > 0) {
      formalReservation.trouser = structuredTrousers[0];
      reservedFormalIds.add(structuredTrousers[0].id);
    }

    // Authority top: dress shirt/blazer or neutral formal color
    const AUTHORITY_TOP_SUB_RE = /\b(dress shirt|blazer|sport coat|suit jacket|tuxedo shirt)\b/i;
    const AUTHORITY_TOP_COLOR_RE = /\b(white|ivory|cream|light ?blue|navy|charcoal|black|grey|gray|slate)\b/i;
    const authorityTops = buckets.tops
      .filter(t => {
        const sub = (t.subcategory || '').toLowerCase();
        const color = (t.color || '').toLowerCase();
        return AUTHORITY_TOP_SUB_RE.test(sub) || AUTHORITY_TOP_COLOR_RE.test(color);
      })
      .sort((a, b) => getNormalizedFormality(b) - getNormalizedFormality(a) || a.id.localeCompare(b.id));
    if (authorityTops.length > 0) {
      formalReservation.top = authorityTops[0];
      reservedFormalIds.add(authorityTops[0].id);
    }

    // Remove reserved items from general buckets
    if (reservedFormalIds.size > 0) {
      for (const key of Object.keys(buckets) as CategoryBucket[]) {
        buckets[key] = buckets[key].filter(i => !reservedFormalIds.has(i.id));
      }
      if (__DEV__) {
        console.log(
          `[TripCapsule][ELITE_FORMAL_RESERVE] Reserved ${reservedFormalIds.size} items: ` +
          [formalReservation.shoe?.name, formalReservation.trouser?.name, formalReservation.top?.name].filter(Boolean).join(', '),
        );
      }
    }

    // Safety: if reservation starved a core slot, return all reserves
    const coreSlots: CategoryBucket[] = ['tops', 'bottoms', 'shoes'];
    if (coreSlots.some(s => buckets[s].length === 0)) {
      if (__DEV__) {
        console.warn('[TripCapsule][ELITE_FORMAL_RESERVE] Reservation starved core slot — returning reserves');
      }
      if (formalReservation.shoe) buckets.shoes.push(formalReservation.shoe);
      if (formalReservation.trouser) buckets.bottoms.push(formalReservation.trouser);
      if (formalReservation.top) buckets.tops.push(formalReservation.top);
      formalReservation.shoe = null;
      formalReservation.trouser = null;
      formalReservation.top = null;
      reservedFormalIds.clear();
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
  // Trip-wide climate gate: filter out open footwear in freezing/cold (ABSOLUTE — no fail-open)
  const _anyDayColdOrFreezing = weather.some(d => d.lowF < 45);
  if (_anyDayColdOrFreezing) {
    const closedToe = buckets.shoes.filter(s => !isOpenFootwear(s));
    buckets.shoes = closedToe;
    if (closedToe.length === 0) {
      buildWarnings.push({
        code: 'CLIMATE_INCOMPATIBLE_FOOTWEAR',
        message: 'All shoes are open-toed but trip includes cold/freezing days. Add closed-toe footwear.',
      });
    }
  }
  const maxShoes = numDays <= 5 ? 2 : 3;
  const selectedShoes = fillFootwearRoles(
    buckets.shoes, requiredRoles, capsuleIntent, styleHints,
    activities, weather, maxShoes, roleRegistry, presentation,
    startingLocationLabel,
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

  // Capsule-global coherence: track color temp + silhouette direction across outfits
  const coherenceState = createCoherenceState();
  // Lookup for coherence updates (reuses pool items already computed)
  const coherenceLookup = new Map(eligibleItems.map(i => [i.id, i]));

  for (let day = 0; day < numDays; day++) {
    const schedule = daySchedules[day];

    // ── ELITE_FORMAL_INJECT: add reserved items for Formal days ──
    const isFormalDay = schedule.primary === 'Formal';
    if (isFormalDay && reservedFormalIds.size > 0) {
      if (formalReservation.shoe && !selectedShoes.some(s => s.id === formalReservation.shoe!.id)) {
        selectedShoes.push(formalReservation.shoe);
      }
      if (formalReservation.trouser && !buckets.bottoms.some(b => b.id === formalReservation.trouser!.id)) {
        buckets.bottoms.push(formalReservation.trouser);
      }
      if (formalReservation.top && !buckets.tops.some(t => t.id === formalReservation.top!.id)) {
        buckets.tops.push(formalReservation.top);
      }
    }

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
      tasteProfile,
      coherenceState,
      fashionState,
      isFormalDay ? formalReservation : undefined,
      tripDerivedBand,
      denimSuppressActive,
    );
    // ── ELITE_FORMAL_EJECT: remove reserved items after Formal day build ──
    if (isFormalDay && reservedFormalIds.size > 0) {
      if (formalReservation.shoe) {
        const idx = selectedShoes.findIndex(s => s.id === formalReservation.shoe!.id);
        if (idx !== -1) selectedShoes.splice(idx, 1);
      }
      if (formalReservation.trouser) {
        buckets.bottoms = buckets.bottoms.filter(b => b.id !== formalReservation.trouser!.id);
      }
      if (formalReservation.top) {
        buckets.tops = buckets.tops.filter(t => t.id !== formalReservation.top!.id);
      }
    }

    if (anchorItems.length > 0) {
      outfits.push({
        id: `outfit_${day}`,
        dayLabel: `Day ${day + 1}`,
        type: 'anchor',
        occasion: schedule.primary,
        items: anchorItems,
      });
      updateCoherence(coherenceState, anchorItems, coherenceLookup);
    }
  }

  // Step 7: Build SUPPORT outfits (second pass — reuse-first)
  for (let day = 0; day < numDays; day++) {
    const schedule = daySchedules[day];
    if (schedule.secondary) {
      // ── ELITE_FORMAL_INJECT (support): add reserved items for Formal support days ──
      const isFormalSupport = schedule.secondary === 'Formal';
      if (isFormalSupport && reservedFormalIds.size > 0) {
        if (formalReservation.shoe && !selectedShoes.some(s => s.id === formalReservation.shoe!.id)) {
          selectedShoes.push(formalReservation.shoe);
        }
        if (formalReservation.trouser && !buckets.bottoms.some(b => b.id === formalReservation.trouser!.id)) {
          buckets.bottoms.push(formalReservation.trouser);
        }
        if (formalReservation.top && !buckets.tops.some(t => t.id === formalReservation.top!.id)) {
          buckets.tops.push(formalReservation.top);
        }
      }

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
        tasteProfile,
        coherenceState,
        fashionState,
        isFormalSupport ? formalReservation : undefined,
        tripDerivedBand,
        denimSuppressActive,
      );

      // ── ELITE_FORMAL_EJECT (support): remove reserved items after Formal support build ──
      if (isFormalSupport && reservedFormalIds.size > 0) {
        if (formalReservation.shoe) {
          const idx = selectedShoes.findIndex(s => s.id === formalReservation.shoe!.id);
          if (idx !== -1) selectedShoes.splice(idx, 1);
        }
        if (formalReservation.trouser) {
          buckets.bottoms = buckets.bottoms.filter(b => b.id !== formalReservation.trouser!.id);
        }
        if (formalReservation.top) {
          buckets.tops = buckets.tops.filter(t => t.id !== formalReservation.top!.id);
        }
      }

      if (supportItems.length >= 2) {
        outfits.push({
          id: `outfit_${day}_support`,
          dayLabel: `Day ${day + 1}`,
          type: 'support',
          occasion: schedule.secondary,
          items: supportItems,
        });
        updateCoherence(coherenceState, supportItems, coherenceLookup);
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
        const dressStripSlots = new Set(
          outfits[i].items.map(item => CATEGORY_MAP[item.mainCategory] || 'other'),
        );
        if (!dressStripSlots.has('shoes')) shoelessRejects++;
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
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0]?.toLowerCase() || 'trip';

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
      const finalSlots = new Set(
        outfits[i].items.map(item => CATEGORY_MAP[item.mainCategory] || 'other'),
      );
      if (!finalSlots.has('shoes')) shoelessRejects++;
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
  // OUTFIT_INCOMPLETE_SHOES: surface all shoeless rejections (CORE_REJECT + FINAL_REJECT)
  if (shoelessRejects > 0) {
    buildWarnings.push({
      code: 'OUTFIT_INCOMPLETE_SHOES',
      message: `${shoelessRejects} outfit(s) dropped — no shoes available for slot.`,
    });
  }

  // THERMAL_INSUFFICIENCY: warn if cold/freezing trip and all packed tops or bottoms are minimal coverage
  const hasColdDay = weather.some(d => {
    const zone = deriveClimateZone(d);
    return zone === 'cold' || zone === 'freezing';
  });
  if (hasColdDay && outfits.length > 0) {
    const packedTopIds = new Set<string>();
    const packedBottomIds = new Set<string>();
    for (const outfit of outfits) {
      for (const pi of outfit.items) {
        const slot = CATEGORY_MAP[pi.mainCategory] || 'other';
        if (slot === 'tops') packedTopIds.add(pi.wardrobeItemId);
        if (slot === 'bottoms') packedBottomIds.add(pi.wardrobeItemId);
      }
    }
    const packedTops = eligibleItems.filter(i => packedTopIds.has(i.id));
    const packedBottoms = eligibleItems.filter(i => packedBottomIds.has(i.id));
    const allTopsMinimal = packedTops.length > 0 && packedTops.every(t => inferGarmentFlags(t).isMinimalCoverage);
    const allBottomsMinimal = packedBottoms.length > 0 && packedBottoms.every(b => inferGarmentFlags(b).isMinimalCoverage);
    if (allTopsMinimal || allBottomsMinimal) {
      const lacking = allTopsMinimal && allBottomsMinimal ? 'tops and bottoms' : allTopsMinimal ? 'tops' : 'bottoms';
      buildWarnings.push({
        code: 'THERMAL_INSUFFICIENCY',
        message: `Trip includes cold/freezing days but all packed ${lacking} are minimal-coverage items.`,
      });
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

  // ── ELITE_CAPSULE_INTEGRITY_CHECK ──
  // Warning-only: verify Formal authority items exist in capsule when available in wardrobe.
  if (activities.includes('Formal')) {
    const wardrobeLookup = new Map(eligibleItems.map(i => [i.id, i]));
    const formalOutfitItems = outfits
      .filter(o => o.occasion === 'Formal')
      .flatMap(o => o.items);

    const missing: string[] = [];

    // Check Tier 3 shoes
    const wardrobeHasTier3Shoe = eligibleItems.some(i =>
      mapMainCategoryToSlot(i.main_category ?? '') === 'shoes' && getFormalityTier(i) >= 3,
    );
    const formalHasTier3Shoe = formalOutfitItems.some(i => {
      const full = wardrobeLookup.get(i.wardrobeItemId);
      return full && mapMainCategoryToSlot(full.main_category ?? '') === 'shoes' && getFormalityTier(full) >= 3;
    });
    if (wardrobeHasTier3Shoe && !formalHasTier3Shoe) missing.push('tier3_shoe');

    // Check structured trousers
    const STRUCTURED_TROUSER = /\b(trouser|slacks|dress pant|suit pant)\b/i;
    const wardrobeHasStructuredTrouser = eligibleItems.some(i =>
      STRUCTURED_TROUSER.test((i.subcategory || '').toLowerCase()),
    );
    const formalHasStructuredTrouser = formalOutfitItems.some(i => {
      const full = wardrobeLookup.get(i.wardrobeItemId);
      return full && STRUCTURED_TROUSER.test((full.subcategory || '').toLowerCase());
    });
    if (wardrobeHasStructuredTrouser && !formalHasStructuredTrouser) missing.push('structured_trouser');

    // Check authority tops (dress shirt, blazer, or neutral formal colors)
    const AUTHORITY_TOP_SUB = /\b(dress shirt|blazer|sport coat|suit jacket|tuxedo shirt)\b/i;
    const AUTHORITY_TOP_COLOR = /\b(white|ivory|cream|light ?blue|navy|charcoal|black|grey|gray|slate)\b/i;
    const wardrobeHasAuthorityTop = eligibleItems.some(i => {
      const sub = (i.subcategory || '').toLowerCase();
      const color = (i.color || '').toLowerCase();
      const slot = mapMainCategoryToSlot(i.main_category ?? '');
      return slot === 'tops' && (AUTHORITY_TOP_SUB.test(sub) || AUTHORITY_TOP_COLOR.test(color));
    });
    const formalHasAuthorityTop = formalOutfitItems.some(i => {
      const full = wardrobeLookup.get(i.wardrobeItemId);
      if (!full) return false;
      const sub = (full.subcategory || '').toLowerCase();
      const color = (full.color || '').toLowerCase();
      const slot = mapMainCategoryToSlot(full.main_category ?? '');
      return slot === 'tops' && (AUTHORITY_TOP_SUB.test(sub) || AUTHORITY_TOP_COLOR.test(color));
    });
    if (wardrobeHasAuthorityTop && !formalHasAuthorityTop) missing.push('authority_top');

    if (missing.length > 0) {
      console.log(`[TripCapsule][ELITE_CAPSULE_DEFICIENCY] Missing: ${missing.join(', ')}`);
      buildWarnings.push({
        code: 'ELITE_CAPSULE_DEFICIENCY',
        message: `Formal authority items available in wardrobe but missing from capsule: ${missing.join(', ')}`,
      });
    }
  }

  // Step 10: Build packing list
  const packingList = buildPackingList(outfits, PACKING_CATEGORY_ORDER);

  // Step 11: Stamp fingerprint (canonical intent only — presentation excluded)
  const sortedDates = weather.map(d => d.date).sort();
  const fpDestination = destinationLabel ?? startingLocationLabel;
  const fpStartDate = sortedDates[0] ?? '';
  const fpEndDate = sortedDates[sortedDates.length - 1] ?? '';
  const fingerprint = buildCapsuleFingerprint(
    wardrobeItems,
    fpDestination,
    fpStartDate,
    fpEndDate,
    activities,
    startingLocationLabel,
    presentation,
    styleHints,
  );

  const buildId = generateBuildId(fingerprint);

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
      {presentation, wardrobeStats, fashionState: fashionState ?? null},
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

  // ── LUXURY DESTINATION AUTHORITY — Capsule-level structural override ──
  // Deterministic enforcement: in luxury warm cities with Dinner/Business/Formal
  // and NO Active activity, sneakers are hard-replaced by luxury leather footwear.
  // This is NOT scoring. This is post-assembly structural enforcement.
  {
    const warmestDayForAuth = weather.length > 0
      ? weather.reduce((w, d) => (d.highF > w.highF ? d : w), weather[0])
      : undefined;
    const authClimateZone = deriveClimateZone(warmestDayForAuth);
    const hasActive = activities.includes('Active');

    if (
      isLuxuryWarmContext(destinationLabel ?? startingLocationLabel, authClimateZone, activities) &&
      !hasActive
    ) {
      // Find all luxury leather footwear in the full shoe pool
      const luxuryPool = buckets.shoes.filter(s => isLuxuryLeatherFootwear(s));

      if (luxuryPool.length >= 2) {
        // Identify sneaker wardrobeItemIds currently in outfits
        const sneakerIdsInOutfits = new Set<string>();
        for (const outfit of eliteOutfits) {
          for (const pi of outfit.items) {
            if (CATEGORY_MAP[pi.mainCategory] !== 'shoes') continue;
            const full = coherenceLookup.get(pi.wardrobeItemId);
            if (full && isFootwearSneaker(full)) {
              sneakerIdsInOutfits.add(pi.wardrobeItemId);
            }
          }
        }

        if (sneakerIdsInOutfits.size > 0) {
          // Build replacement map: sneaker wardrobeItemId → luxury leather TripWardrobeItem
          const replacementMap = new Map<string, TripWardrobeItem>();
          const usedReplacementIds = new Set<string>();

          // Collect all shoe wardrobeItemIds currently in outfits (non-sneaker) to avoid duplicates
          const currentShoeIds = new Set<string>();
          for (const outfit of eliteOutfits) {
            for (const pi of outfit.items) {
              if (CATEGORY_MAP[pi.mainCategory] === 'shoes' && !sneakerIdsInOutfits.has(pi.wardrobeItemId)) {
                currentShoeIds.add(pi.wardrobeItemId);
              }
            }
          }

          for (const sneakerId of sneakerIdsInOutfits) {
            const replacement = luxuryPool.find(
              s => !currentShoeIds.has(s.id) && !usedReplacementIds.has(s.id),
            );
            if (replacement) {
              replacementMap.set(sneakerId, replacement);
              usedReplacementIds.add(replacement.id);
            }
          }

          // Hard replace sneakers in every outfit
          for (const outfit of eliteOutfits) {
            for (let i = 0; i < outfit.items.length; i++) {
              const pi = outfit.items[i];
              if (CATEGORY_MAP[pi.mainCategory] !== 'shoes') continue;
              const replacement = replacementMap.get(pi.wardrobeItemId);
              if (replacement) {
                outfit.items[i] = toPackingItem(replacement, startingLocationLabel);
              }
            }
          }

          // Update roleRegistry
          const anchorShoe = roleRegistry.get('anchor_shoe');
          if (anchorShoe && replacementMap.has(anchorShoe.id)) {
            roleRegistry.set('anchor_shoe', replacementMap.get(anchorShoe.id)!);
          }
          const contrastShoe = roleRegistry.get('contrast_shoe');
          if (contrastShoe && replacementMap.has(contrastShoe.id)) {
            roleRegistry.set('contrast_shoe', replacementMap.get(contrastShoe.id)!);
          }

          // Update selectedShoes array for packing list consistency
          for (let i = 0; i < selectedShoes.length; i++) {
            const replacement = replacementMap.get(selectedShoes[i].id);
            if (replacement) {
              selectedShoes[i] = replacement;
            }
          }

          if (DEBUG_TRIPS_ENGINE) {
            console.log('[TripCapsule][LUXURY_OVERRIDE_APPLIED]', JSON.stringify({
              city: destinationLabel ?? startingLocationLabel,
              climateZone: authClimateZone,
              sneakersRemoved: [...sneakerIdsInOutfits],
              replacements: [...replacementMap.entries()].map(([from, to]) => ({
                removedId: from,
                replacedWith: {id: to.id, name: to.name, subcategory: to.subcategory},
              })),
              luxuryPoolSize: luxuryPool.length,
              anchorShoe: roleRegistry.get('anchor_shoe')?.name,
              contrastShoe: roleRegistry.get('contrast_shoe')?.name,
            }));
          }
        }
      }
    }
  }

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

  // ── DEBUG: Final Capsule Summary ──
  if (DEBUG_TRIPS_ENGINE) {
    const shoeIds = eliteOutfits.flatMap(o => o.items.filter(i => CATEGORY_MAP[i.mainCategory] === 'shoes').map(i => i.wardrobeItemId));
    const outerwearItems = eliteOutfits.flatMap(o => o.items.filter(i => CATEGORY_MAP[i.mainCategory] === 'outerwear'));
    const layeringItems = eliteOutfits.flatMap(o => o.items.filter(i => {
      const full = coherenceLookup.get(i.wardrobeItemId);
      return full?.layering === 'mid' || full?.layering === 'base';
    }));
    console.log('[TripsDebug][FinalCapsule]', JSON.stringify({
      city: destinationLabel || 'UNKNOWN_DESTINATION',
      activities,
      selectedFootwear: [...new Set(shoeIds)],
      outerwearCount: new Set(outerwearItems.map(i => i.wardrobeItemId)).size,
      layeringCount: new Set(layeringItems.map(i => i.wardrobeItemId)).size,
      colorDirection: capsuleIntent.paletteColors,
      silhouetteDirection: capsuleIntent.silhouetteBias,
    }));
  }

  const capsuleResult = {
    build_id: buildId,
    outfits: eliteOutfits,
    packingList,
    version: CAPSULE_VERSION,
    fingerprint,
    ...(tripBackupKit.length > 0 ? {tripBackupKit} : {}),
    ...(buildWarnings.length > 0 ? {warnings: buildWarnings} : {}),
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
