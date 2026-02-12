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

// Bump this whenever capsule logic changes to force auto-rebuild of stale stored capsules
export const CAPSULE_VERSION = 8;

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
  const isDress = cat === 'Dresses' || sub.includes('dress') && !sub.includes('dress shirt');
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

    // RULE 0 (FIRST CHECK): Block feminine-only items for masculine users — NO EXCEPTIONS
    if (isMasculine && flags.isFeminineOnly) return false;

    // Rule 1: Block minimal coverage in cold/freezing
    if (isColdOrFreezing && flags.isMinimalCoverage) return false;

    // Rule 2: Block beach-context items for business/formal/dinner (city context + formal)
    if (isFormalActivity && isCityContext && flags.isBeachContext) return false;

    // Rule 3: Block casual-only items for formal activities
    if (isFormalActivity && flags.isCasualOnly) return false;

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
    return { rebuild: false, reason: 'NO_CAPSULE', mode: 'AUTO' };
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
): string {
  return JSON.stringify({
    wardrobe: wardrobe.map(w => w.id).sort(),
    weather: weather.map(d => `${d.date}:${d.highF}:${d.lowF}:${d.condition}`),
    activities: [...activities].sort(),
    location,
    presentation: presentation || 'mixed',
  });
}

// ── Wardrobe adapter ──

/**
 * Adapts a raw wardrobe item (mixed camelCase/snake_case from API)
 * into the TripWardrobeItem shape.
 */
export function adaptWardrobeItem(item: any): TripWardrobeItem {
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
  const formality = item.formalityScore ?? 50;

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
    let primary: TripActivity;
    let secondary: TripActivity | null = null;
    const dayLabel = weather[day]?.dayLabel;

    // Determine PRIMARY (priority cascade)
    if (has.has('Formal') && day === numDays - 1) {
      primary = 'Formal';
    } else if (has.has('Business') && isWeekday(dayLabel)) {
      primary = 'Business';
    } else if (has.has('Beach') && day % 2 === 0) {
      primary = 'Beach';
    } else if (has.has('Active') && (day - 1) % 3 === 0 && day > 0) {
      primary = 'Active';
    } else {
      primary = 'Casual';
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

function pickFromBucket(
  bucket: TripWardrobeItem[],
  dayIndex: number,
  items: TripPackingItem[],
  locationLabel: string,
): void {
  if (bucket.length === 0) return;
  const idx = dayIndex % bucket.length;
  items.push(toPackingItem(bucket[idx], locationLabel));
}

function pickFromBucketReuse(
  bucket: TripWardrobeItem[],
  dayIndex: number,
  items: TripPackingItem[],
  locationLabel: string,
  usageTracker: Map<string, number[]>,
): void {
  if (bucket.length === 0) return;
  const reusable = bucket.filter(b => usageTracker.has(b.id));
  if (reusable.length > 0) {
    const idx = dayIndex % reusable.length;
    items.push(toPackingItem(reusable[idx], locationLabel));
    return;
  }
  const idx = dayIndex % bucket.length;
  items.push(toPackingItem(bucket[idx], locationLabel));
}

function pickShoe(
  selectedShoes: TripWardrobeItem[],
  dayIndex: number,
  items: TripPackingItem[],
  locationLabel: string,
): void {
  if (selectedShoes.length === 0) return;
  const shoe = selectedShoes[dayIndex % selectedShoes.length];
  items.push(toPackingItem(shoe, locationLabel));
}

function pickOuterwear(
  selectedOuterwear: TripWardrobeItem[],
  dayWeather: DayWeather | undefined,
  items: TripPackingItem[],
  locationLabel: string,
): void {
  if (selectedOuterwear.length === 0 || !dayWeather) return;
  if (dayWeather.lowF < 55 || dayWeather.rainChance > 50) {
    const outer =
      dayWeather.rainChance > 50
        ? selectedOuterwear.find(i => i.rainOk) || selectedOuterwear[0]
        : selectedOuterwear[0];
    items.push(toPackingItem(outer, locationLabel));
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

type DiversityResult = {
  ordered: TripWardrobeItem[];
  candidates: CandidateInfo[];
};

/**
 * Reorders a gated bucket so that `dayIndex % len` lands on the best
 * (least-used, longest-cooldown) candidate.
 *
 * 1. Filter items exceeding maxUsesPerItem.
 * 2. Score each item: useCount * 50 + recency cooldown.
 * 3. Sort ascending (best first).
 * 4. Rotation-align: place best candidate at index (dayIndex % len).
 *
 * usageTracker maps TripWardrobeItem.id → array of dayIndexes where used.
 */
function applyDiversityAndRotate(
  items: TripWardrobeItem[],
  dayIndex: number,
  usageTracker: Map<string, number[]>,
  maxUsesPerItem: number,
  debugLabel?: string,
): DiversityResult {
  if (items.length <= 1) {
    if (__DEV__ && debugLabel) {
      console.log(
        `[TripCapsule][DIVERSITY] day=${dayIndex} ${debugLabel}: only ${items.length} eligible after gating`,
      );
    }
    return {ordered: items, candidates: []};
  }

  // 1. Filter items exceeding max uses
  let eligible = items.filter(item => {
    const uses = (usageTracker.get(item.id) || []).length;
    return uses < maxUsesPerItem;
  });
  if (eligible.length === 0) eligible = [...items]; // safety: all maxed → reset

  // 2. Score each item (lower = better candidate)
  const scored = eligible.map(item => {
    const uses = usageTracker.get(item.id) || [];
    const useCount = uses.length;
    const lastUsedDay = uses.length > 0 ? uses[uses.length - 1] : -Infinity;
    const daysSinceUse = dayIndex - lastUsedDay;
    const cooldownPenalty =
      daysSinceUse <= 1 ? 40 :
      daysSinceUse === 2 ? 20 :
      daysSinceUse === 3 ? 10 : 0;
    const penalty = useCount * 50 + cooldownPenalty;
    return {item, penalty, useCount, cooldownPenalty};
  });

  // 3. Sort by penalty ascending — stable sort preserves original order for ties
  scored.sort((a, b) => a.penalty - b.penalty);

  // 4. Rotation alignment: place best candidate at (dayIndex % len)
  const len = scored.length;
  const targetIdx = dayIndex % len;
  const aligned: TripWardrobeItem[] = new Array(len);
  for (let i = 0; i < len; i++) {
    aligned[(targetIdx + i) % len] = scored[i].item;
  }

  // 5. __DEV__ diagnostic: per-pick proof of diversity
  if (__DEV__ && debugLabel) {
    const picked = scored[0]; // best candidate (placed at targetIdx)
    const top3 = scored.slice(0, 3);
    console.log(
      `[TripCapsule][DIVERSITY] day=${dayIndex} ${debugLabel}: ` +
      `bucketLen=${len} moduloIdx=${targetIdx} ` +
      `picked=${picked.item.name}(${picked.item.id}) penalty=${picked.penalty}`,
      {
        candidates: top3.map(s => ({
          name: s.item.name,
          id: s.item.id,
          penalty: s.penalty,
          uses: s.useCount,
          cooldown: s.cooldownPenalty,
        })),
      },
    );
  }

  return {ordered: aligned, candidates: scored};
}

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
 * applyDiversityAndRotate to find the next-best options.
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

    // Feminine signals — but "dress shirt" is masculine, not feminine
    const isDressShirt = sub.includes('dress shirt');
    if (
      cat === 'Dresses' ||
      cat === 'Skirts' ||
      (sub.includes('dress') && !isDressShirt) ||
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
      isDressShirt
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

  // ── Apply diversity + rotation alignment (POST-GATE) ──
  const maxUsesForBucket = (len: number) =>
    len > 0 ? Math.ceil(numDays / len) + 1 : Infinity;
  const gatedCandidates = {} as Record<CategoryBucket, CandidateInfo[]>;
  for (const key of Object.keys(gatedBuckets) as CategoryBucket[]) {
    const dr = applyDiversityAndRotate(
      gatedBuckets[key], dayIndex, usageTracker,
      maxUsesForBucket(gatedBuckets[key].length),
      __DEV__ ? `${activity}/${key}` : undefined,
    );
    gatedBuckets[key] = dr.ordered;
    gatedCandidates[key] = dr.candidates;
  }
  const shoeResult = applyDiversityAndRotate(
    finalShoes, dayIndex, usageTracker,
    maxUsesForBucket(finalShoes.length),
    __DEV__ ? `${activity}/shoes` : undefined,
  );
  finalShoes = shoeResult.ordered;
  const shoeCandidates = shoeResult.candidates;

  const pick = mode === 'support'
    ? (b: TripWardrobeItem[], idx: number, arr: TripPackingItem[], loc: string) =>
        pickFromBucketReuse(b, idx, arr, loc, usageTracker)
    : pickFromBucket;

  // Wrappers that annotate the last-picked item with alternates
  const pickA = (bucket: TripWardrobeItem[], candidates: CandidateInfo[]) => {
    const prevLen = items.length;
    pick(bucket, dayIndex, items, locationLabel);
    if (items.length > prevLen) annotateLastPick(items, candidates);
  };
  const pickShoeA = () => {
    const prevLen = items.length;
    pickShoe(finalShoes, dayIndex, items, locationLabel);
    if (items.length > prevLen) annotateLastPick(items, shoeCandidates);
  };

  switch (activity) {
    case 'Beach': {
      if (gatedBuckets.swimwear.length > 0) {
        const swimIdx = dayIndex % gatedBuckets.swimwear.length;
        items.push(toPackingItem(gatedBuckets.swimwear[swimIdx], locationLabel));
        annotateLastPick(items, gatedCandidates.swimwear);
      } else {
        pickA(gatedBuckets.tops, gatedCandidates.tops);
      }
      pickShoeA();
      if (mode === 'anchor') {
        pickA(gatedBuckets.accessories, gatedCandidates.accessories);
      }
      break;
    }
    case 'Active': {
      if (gatedBuckets.activewear.length > 0) {
        const firstIdx = dayIndex % gatedBuckets.activewear.length;
        const first = gatedBuckets.activewear[firstIdx];
        items.push(toPackingItem(first, locationLabel));
        annotateLastPick(items, gatedCandidates.activewear);
        // Try second activewear item for bottom (disambiguate upper vs lower)
        if (gatedBuckets.activewear.length > 1) {
          const secondIdx = (dayIndex + 1) % gatedBuckets.activewear.length;
          const second = gatedBuckets.activewear[secondIdx];
          if (second.id !== first.id) {
            // Avoid 2 upper-body activewear items; fall back to regular bottoms
            if (isUpperActivewear(first) && isUpperActivewear(second)) {
              pickA(gatedBuckets.bottoms, gatedCandidates.bottoms);
            } else {
              items.push(toPackingItem(second, locationLabel));
              annotateLastPick(items, gatedCandidates.activewear);
            }
          }
        }
      } else {
        pickA(gatedBuckets.tops, gatedCandidates.tops);
        pickA(gatedBuckets.bottoms, gatedCandidates.bottoms);
      }
      pickShoeA();
      break;
    }
    case 'Business': {
      pickA(gatedBuckets.tops, gatedCandidates.tops);
      pickA(gatedBuckets.bottoms, gatedCandidates.bottoms);
      pickShoeA();
      if (mode === 'anchor' && gatedBuckets.outerwear.length > 0) {
        const outerIdx = dayIndex % gatedBuckets.outerwear.length;
        items.push(toPackingItem(gatedBuckets.outerwear[outerIdx], locationLabel));
        annotateLastPick(items, gatedCandidates.outerwear);
      }
      break;
    }
    case 'Formal': {
      if (presentation !== 'masculine' && gatedBuckets.dresses.length > 0) {
        const formalDress = gatedBuckets.dresses.find(
          d => (d.formalityScore ?? 50) >= 70,
        );
        if (formalDress) {
          items.push(toPackingItem(formalDress, locationLabel));
        } else {
          items.push(toPackingItem(gatedBuckets.dresses[0], locationLabel));
        }
        annotateLastPick(items, gatedCandidates.dresses);
      } else {
        pickA(gatedBuckets.tops, gatedCandidates.tops);
        pickA(gatedBuckets.bottoms, gatedCandidates.bottoms);
      }
      pickShoeA();
      pickA(gatedBuckets.accessories, gatedCandidates.accessories);
      break;
    }
    case 'Dinner': {
      if (
        presentation !== 'masculine' &&
        gatedBuckets.dresses.length > 0 &&
        dayIndex % 2 === 0
      ) {
        const dressIdx =
          Math.floor(dayIndex / 2) % gatedBuckets.dresses.length;
        items.push(
          toPackingItem(gatedBuckets.dresses[dressIdx], locationLabel),
        );
        annotateLastPick(items, gatedCandidates.dresses);
      } else {
        pickA(gatedBuckets.tops, gatedCandidates.tops);
        pickA(gatedBuckets.bottoms, gatedCandidates.bottoms);
      }
      pickShoeA();
      if (mode === 'anchor') {
        pickA(gatedBuckets.accessories, gatedCandidates.accessories);
      }
      break;
    }
    default: {
      // Casual, Sightseeing, Cold Weather
      pickA(gatedBuckets.tops, gatedCandidates.tops);
      pickA(gatedBuckets.bottoms, gatedCandidates.bottoms);
      pickShoeA();
      if (mode === 'anchor') {
        pickOuterwear(selectedOuterwear, dayWeather, items, locationLabel);
        pickA(gatedBuckets.accessories, gatedCandidates.accessories);
      }
      break;
    }
  }

  // Enforce one-piece vs separates structure
  let normalized = normalizeOutfitStructure(items);

  // Last line of defense: strip any dress-bucket item that escaped for masculine wardrobes
  if (presentation === 'masculine') {
    normalized = normalized.filter(i => {
      const bucket = CATEGORY_MAP[i.mainCategory];
      return bucket !== 'dresses';
    });
  }

  // Track all used items with day index for diversity scoring
  for (const item of normalized) {
    const days = usageTracker.get(item.wardrobeItemId) || [];
    days.push(dayIndex);
    usageTracker.set(item.wardrobeItemId, days);
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
): TripCapsule {
  const requestId = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const numDays = Math.max(weather.length, 1);
  const needs = analyzeWeather(weather);

  // Step 0: Resolve presentation — explicit profile overrides wardrobe detection
  const presentation: Presentation = explicitPresentation ?? detectPresentation(wardrobeItems);

  // Step 0b: Pre-filter ineligible items BEFORE any bucketing/scoring
  const eligibleItems = filterEligibleItems(wardrobeItems, presentation);

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

  if (presentation === 'feminine') {
    const prevActivewear = buckets.activewear.length;
    buckets.activewear = buckets.activewear.filter(
      i =>
        !['Basketball Shorts', 'Gym Shorts', 'Board Shorts'].includes(
          i.subcategory || '',
        ),
    );
    if (prevActivewear !== buckets.activewear.length) {
      logOverride(requestId, {
        rule: 'feminine_hard_lock',
        before: prevActivewear,
        after: buckets.activewear.length,
        detail: 'removed masculine activewear (basketball/gym/board shorts)',
      });
    }
  }

  // Step 3: Plan day schedules
  const daySchedules = planDaySchedules(activities, weather, numDays);

  // Step 4: Select shoes
  const maxShoes = numDays <= 5 ? 2 : 3;
  const selectedShoes = buckets.shoes.slice(0, maxShoes);

  logSlotDecision(requestId, {
    category: 'shoes_selected',
    requiredCount: maxShoes,
    selectedCount: selectedShoes.length,
    selected: selectedShoes.map(s => s.name || s.id),
    rejected: buckets.shoes.slice(maxShoes).map(s => s.name || s.id),
    reason: `max ${maxShoes} shoes for ${numDays}-day trip`,
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

  logSlotDecision(requestId, {
    category: 'outerwear_selected',
    selectedCount: selectedOuterwear.length,
    selected: selectedOuterwear.map(o => o.name || o.id),
    reason: `warmLayer=${needs.needsWarmLayer} rainLayer=${needs.needsRainLayer}`,
  });

  // Step 6: Build ANCHOR outfits (first pass)
  const outfits: CapsuleOutfit[] = [];
  const usageTracker = new Map<string, number[]>();

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
    );
    outfits.push({
      id: `outfit_${day}`,
      dayLabel: `Day ${day + 1}`,
      type: 'anchor',
      occasion: schedule.primary,
      items: anchorItems,
    });
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
  }

  // Step 9b: Build trip-level backup kit (2–3 globally versatile items)
  const VERSATILE_COLORS = new Set(['black', 'navy', 'grey', 'gray', 'white', 'tan', 'charcoal', 'cream', 'beige', 'khaki']);
  const CATEGORY_BONUS: Record<string, number> = {tops: 3, outerwear: 2, shoes: 1};
  const mandatoryIds = new Set(outfits.flatMap(o => o.items.map(i => i.wardrobeItemId)));
  const anchorOutfits = outfits.filter(o => o.type === 'anchor');

  const backupCandidateCategories: CategoryBucket[] = ['tops', 'shoes', 'outerwear'];
  const backupCandidates: {item: TripWardrobeItem; score: number; compatibleDays: number}[] = [];

  for (const cat of backupCandidateCategories) {
    for (const item of buckets[cat]) {
      if (mandatoryIds.has(item.id)) continue;

      // Count how many anchor outfits this item passes gating for
      let compatibleDays = 0;
      for (const ao of anchorOutfits) {
        const aoIdx = outfits.indexOf(ao);
        const dw = weather[aoIdx];
        const cz = deriveClimateZone(dw);
        const ap = getActivityProfile(ao.occasion as TripActivity);
        if (gatePool([item], cz, ap, presentation).length > 0) {
          compatibleDays++;
        }
      }

      const colorLower = (item.color || '').toLowerCase();
      const isVersatileColor = VERSATILE_COLORS.has(colorLower);
      const catBonus = CATEGORY_BONUS[cat] ?? 0;
      const score = compatibleDays * 10 + (isVersatileColor ? 5 : 0) + catBonus;

      backupCandidates.push({item, score, compatibleDays});
    }
  }

  // Sort: score DESC, then id ASC (deterministic tiebreak)
  backupCandidates.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));

  const isColdTrip = weather.some(d => d.lowF < 55);
  const isRainyTrip = weather.some(d => d.rainChance > 50);
  const tripBackupKit: BackupSuggestion[] = backupCandidates.slice(0, 3).map(c => {
    const clauses: string[] = [];

    // Clause 1: compatibility
    if (c.compatibleDays >= 3) {
      clauses.push(`Works with ${c.compatibleDays} outfits.`);
    } else if (c.compatibleDays >= 2) {
      clauses.push(`Pairs with ${c.compatibleDays} looks.`);
    } else {
      clauses.push('Versatile backup pick.');
    }

    // Clause 2: weather context
    if (isColdTrip && (c.item.thermalRating ?? 0) > 60) {
      clauses.push('Extra warmth for colder days.');
    } else if (isRainyTrip) {
      clauses.push('Handy if weather turns.');
    } else {
      clauses.push('Easy swap if needed.');
    }

    // Clause 3: category context
    const bucket = getBucket(c.item);
    if (bucket === 'tops') {
      clauses.push('Light and easy to pack.');
    } else if (bucket === 'outerwear') {
      clauses.push('Layers without extra bulk.');
    } else if (bucket === 'shoes') {
      clauses.push('No extra pair needed.');
    }

    return {
      wardrobeItemId: c.item.id,
      name: c.item.name || 'Unknown Item',
      imageUrl: getImageUrl(c.item),
      reason: clauses.join(' '),
    };
  });

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

  return {
    build_id: buildId,
    outfits,
    packingList,
    version: CAPSULE_VERSION,
    fingerprint,
    ...(tripBackupKit.length > 0 ? {tripBackupKit} : {}),
  };
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
