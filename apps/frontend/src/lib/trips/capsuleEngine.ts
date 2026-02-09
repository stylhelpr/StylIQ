import {
  DayWeather,
  TripActivity,
  TripCapsule,
  TripPackingItem,
  CapsuleOutfit,
  PackingGroup,
  TripWardrobeItem,
  CapsuleWarning,
} from '../../types/trips';
import {PACKING_CATEGORY_ORDER} from './constants';

// Bump this whenever capsule logic changes to force auto-rebuild of stale stored capsules
export const CAPSULE_VERSION = 2;

export type RebuildMode = 'AUTO' | 'FORCE';

export function shouldRebuildCapsule(
  capsule: TripCapsule | undefined,
  engineVersion: number,
  presentation: 'masculine' | 'feminine' | 'mixed',
  fingerprint?: string,
  mode: RebuildMode = 'AUTO',
): {rebuild: boolean; reason: string; mode: RebuildMode} {
  // FORCE mode: always rebuild, bypass all checks
  if (mode === 'FORCE') {
    return {rebuild: true, reason: 'FORCE_REBUILD', mode: 'FORCE'};
  }

  if (!capsule) return {rebuild: false, reason: 'NO_CAPSULE', mode: 'AUTO'};

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
): string {
  return JSON.stringify({
    wardrobe: wardrobe.map(w => w.id).sort(),
    weather: weather.map(d => `${d.date}:${d.highF}:${d.lowF}:${d.condition}`),
    activities: [...activities].sort(),
    location,
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

type CategoryBucket =
  | 'tops'
  | 'bottoms'
  | 'outerwear'
  | 'shoes'
  | 'accessories'
  | 'dresses'
  | 'activewear'
  | 'swimwear';

const CATEGORY_MAP: Record<string, CategoryBucket> = {
  Tops: 'tops',
  Bottoms: 'bottoms',
  Outerwear: 'outerwear',
  Shoes: 'shoes',
  Accessories: 'accessories',
  Dresses: 'dresses',
  Skirts: 'bottoms',
  Activewear: 'activewear',
  Formalwear: 'tops',
  Bags: 'accessories',
  Headwear: 'accessories',
  Jewelry: 'accessories',
  Swimwear: 'swimwear',
  Loungewear: 'tops',
  Sleepwear: 'tops',
  Undergarments: 'accessories',
  Maternity: 'tops',
  TraditionalWear: 'dresses',
  Unisex: 'tops',
  Costumes: 'accessories',
  Other: 'accessories',
};

function getBucket(item: TripWardrobeItem): CategoryBucket | null {
  const cat = item.main_category;
  if (!cat) return null;
  const bucket = CATEGORY_MAP[cat];
  if (!bucket) {
    console.warn('[CapsuleEngine] Unknown category, routing to accessories:', cat);
    return 'accessories';
  }
  return bucket;
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
        if (item.main_category === 'Swimwear') score += 3;
        break;
      case 'Active':
        if (
          item.main_category === 'Activewear' ||
          occasions.includes('gym')
        )
          score += 2;
        break;
      case 'Sightseeing':
        if (dressCode.includes('casual') || dressCode.includes('smart'))
          score += 1;
        break;
      case 'Cold Weather':
        if (item.main_category === 'Outerwear') score += 2;
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
  usedItemIds: Set<string>,
): void {
  if (bucket.length === 0) return;
  const reusable = bucket.filter(b => usedItemIds.has(b.id));
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

    if (
      cat === 'Dresses' ||
      cat === 'Skirts' ||
      sub.includes('dress') ||
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
      sub.includes('necktie')
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
  dayWeather: DayWeather | undefined,
  buckets: Record<CategoryBucket, TripWardrobeItem[]>,
  selectedShoes: TripWardrobeItem[],
  selectedOuterwear: TripWardrobeItem[],
  usedItemIds: Set<string>,
  locationLabel: string,
  mode: 'anchor' | 'support',
  presentation: Presentation,
): TripPackingItem[] {
  const items: TripPackingItem[] = [];
  const pick = mode === 'support'
    ? (b: TripWardrobeItem[], idx: number, arr: TripPackingItem[], loc: string) =>
        pickFromBucketReuse(b, idx, arr, loc, usedItemIds)
    : pickFromBucket;

  switch (activity) {
    case 'Beach': {
      if (buckets.swimwear.length > 0) {
        const swimIdx = dayIndex % buckets.swimwear.length;
        items.push(toPackingItem(buckets.swimwear[swimIdx], locationLabel));
      } else {
        pick(buckets.tops, dayIndex, items, locationLabel);
      }
      pickShoe(selectedShoes, dayIndex, items, locationLabel);
      if (mode === 'anchor') {
        pick(buckets.accessories, dayIndex, items, locationLabel);
      }
      break;
    }
    case 'Active': {
      if (buckets.activewear.length > 0) {
        const firstIdx = dayIndex % buckets.activewear.length;
        const first = buckets.activewear[firstIdx];
        items.push(toPackingItem(first, locationLabel));
        // Try second activewear item for bottom (disambiguate upper vs lower)
        if (buckets.activewear.length > 1) {
          const secondIdx = (dayIndex + 1) % buckets.activewear.length;
          const second = buckets.activewear[secondIdx];
          if (second.id !== first.id) {
            // Avoid 2 upper-body activewear items; fall back to regular bottoms
            if (isUpperActivewear(first) && isUpperActivewear(second)) {
              pick(buckets.bottoms, dayIndex, items, locationLabel);
            } else {
              items.push(toPackingItem(second, locationLabel));
            }
          }
        }
      } else {
        pick(buckets.tops, dayIndex, items, locationLabel);
        pick(buckets.bottoms, dayIndex, items, locationLabel);
      }
      pickShoe(selectedShoes, dayIndex, items, locationLabel);
      break;
    }
    case 'Business': {
      pick(buckets.tops, dayIndex, items, locationLabel);
      pick(buckets.bottoms, dayIndex, items, locationLabel);
      pickShoe(selectedShoes, dayIndex, items, locationLabel);
      if (mode === 'anchor' && buckets.outerwear.length > 0) {
        items.push(toPackingItem(buckets.outerwear[0], locationLabel));
      }
      break;
    }
    case 'Formal': {
      if (presentation !== 'masculine' && buckets.dresses.length > 0) {
        const formalDress = buckets.dresses.find(
          d => (d.formalityScore ?? 50) >= 70,
        );
        if (formalDress) {
          items.push(toPackingItem(formalDress, locationLabel));
        } else {
          items.push(toPackingItem(buckets.dresses[0], locationLabel));
        }
      } else {
        pick(buckets.tops, dayIndex, items, locationLabel);
        pick(buckets.bottoms, dayIndex, items, locationLabel);
      }
      pickShoe(selectedShoes, dayIndex, items, locationLabel);
      pick(buckets.accessories, dayIndex, items, locationLabel);
      break;
    }
    case 'Dinner': {
      if (
        presentation !== 'masculine' &&
        buckets.dresses.length > 0 &&
        dayIndex % 2 === 0
      ) {
        const dressIdx =
          Math.floor(dayIndex / 2) % buckets.dresses.length;
        items.push(
          toPackingItem(buckets.dresses[dressIdx], locationLabel),
        );
      } else {
        pick(buckets.tops, dayIndex, items, locationLabel);
        pick(buckets.bottoms, dayIndex, items, locationLabel);
      }
      pickShoe(selectedShoes, dayIndex, items, locationLabel);
      if (mode === 'anchor') {
        pick(buckets.accessories, dayIndex, items, locationLabel);
      }
      break;
    }
    default: {
      // Casual, Sightseeing, Cold Weather
      pick(buckets.tops, dayIndex, items, locationLabel);
      pick(buckets.bottoms, dayIndex, items, locationLabel);
      pickShoe(selectedShoes, dayIndex, items, locationLabel);
      if (mode === 'anchor') {
        pickOuterwear(selectedOuterwear, dayWeather, items, locationLabel);
        pick(buckets.accessories, dayIndex, items, locationLabel);
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

  // Track all used items
  for (const item of normalized) {
    usedItemIds.add(item.wardrobeItemId);
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
): TripCapsule {
  const numDays = Math.max(weather.length, 1);
  const needs = analyzeWeather(weather);

  const seedStr =
    wardrobeItems.map(i => i.id).join(',') +
    weather.map(w => w.date).join(',') +
    activities.join(',');
  const rand = seededRandom(hashString(seedStr));

  // Step 1: Bucket items by category (8 buckets)
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

  for (const item of wardrobeItems) {
    const bucket = getBucket(item);
    if (bucket) buckets[bucket].push(item);
  }

  // Step 2: Sort each bucket by activity relevance, with deterministic shuffle
  for (const key of Object.keys(buckets) as CategoryBucket[]) {
    buckets[key] = shuffleWithSeed(buckets[key], rand).sort(
      (a, b) => activityScore(b, activities) - activityScore(a, activities),
    );
  }

  // Step 2b: Detect presentation and hard-lock buckets for style coherence
  const presentation = detectPresentation(wardrobeItems);

  if (presentation === 'masculine') {
    buckets.dresses = [];
    buckets.bottoms = buckets.bottoms.filter(
      i => !(i.subcategory || '').toLowerCase().includes('skirt'),
    );
    buckets.accessories = buckets.accessories.filter(
      i =>
        i.main_category !== 'Bags' ||
        !(i.subcategory || '').toLowerCase().match(/handbag|purse/),
    );
  }

  if (presentation === 'feminine') {
    buckets.activewear = buckets.activewear.filter(
      i =>
        !['Basketball Shorts', 'Gym Shorts', 'Board Shorts'].includes(
          i.subcategory || '',
        ),
    );
  }

  // Step 3: Plan day schedules
  const daySchedules = planDaySchedules(activities, weather, numDays);

  // Step 4: Select shoes
  const maxShoes = numDays <= 5 ? 2 : 3;
  const selectedShoes = buckets.shoes.slice(0, maxShoes);

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

  // Step 6: Build ANCHOR outfits (first pass)
  const outfits: CapsuleOutfit[] = [];
  const usedItemIds = new Set<string>();

  for (let day = 0; day < numDays; day++) {
    const schedule = daySchedules[day];
    const anchorItems = buildOutfitForActivity(
      schedule.primary,
      day,
      weather[day],
      buckets,
      selectedShoes,
      selectedOuterwear,
      usedItemIds,
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
        weather[day],
        buckets,
        selectedShoes,
        selectedOuterwear,
        usedItemIds,
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
      if (__DEV__ && outfit.items.length < before) {
        console.warn(
          '[TripCapsule] invariant: stripped dresses from masculine capsule',
        );
      }
    }
  }

  // Step 10: Build packing list
  const packingList = buildPackingList(outfits, PACKING_CATEGORY_ORDER);

  // Step 11: Stamp fingerprint
  const fingerprint = buildCapsuleFingerprint(
    wardrobeItems,
    weather,
    activities,
    startingLocationLabel,
  );

  return {build_id: generateBuildId(), outfits, packingList, version: CAPSULE_VERSION, fingerprint};
}

// ── Capsule validation ──

export function validateCapsule(
  capsule: TripCapsule,
  weather: DayWeather[],
  activities: TripActivity[],
  wardrobeItems?: TripWardrobeItem[],
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
    const hasRainItem = allItems.some(
      i => i.mainCategory === 'Outerwear',
    );
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
      i =>
        i.subCategory?.toLowerCase().includes('swim') ||
        i.mainCategory === 'Swimwear',
    );
    if (!hasSwim) {
      warnings.push({
        code: 'NO_SWIMWEAR',
        message: 'Beach planned but no swimwear found',
      });
    }
  }

  if (activities.includes('Active')) {
    const hasActivewear = allItems.some(
      i => i.mainCategory === 'Activewear',
    );
    if (!hasActivewear) {
      warnings.push({
        code: 'NO_ACTIVEWEAR',
        message: 'Workouts planned but no activewear found',
      });
    }
  }

  const presentation = wardrobeItems
    ? detectPresentation(wardrobeItems)
    : 'mixed';

  if (
    presentation === 'masculine' &&
    capsule.outfits.some(o =>
      o.items.some(i => i.mainCategory === 'Dresses'),
    )
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
