import {
  DayWeather,
  TripActivity,
  TripCapsule,
  TripPackingItem,
  CapsuleOutfit,
  PackingGroup,
  TripWardrobeItem,
} from '../../types/trips';

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
  | 'dresses';

const CATEGORY_MAP: Record<string, CategoryBucket> = {
  Tops: 'tops',
  Bottoms: 'bottoms',
  Outerwear: 'outerwear',
  Shoes: 'shoes',
  Accessories: 'accessories',
  Dresses: 'dresses',
  Skirts: 'bottoms',
  Activewear: 'tops',
  Formalwear: 'tops',
  Bags: 'accessories',
  Headwear: 'accessories',
  Jewelry: 'accessories',
  Swimwear: 'tops',
};

function getBucket(item: TripWardrobeItem): CategoryBucket | null {
  const cat = item.main_category;
  if (!cat) return null;
  return CATEGORY_MAP[cat] ?? null;
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

// ── Display category name for packing list ──

function displayCategory(bucket: CategoryBucket): string {
  const map: Record<CategoryBucket, string> = {
    tops: 'Tops',
    bottoms: 'Bottoms',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    accessories: 'Accessories',
    dresses: 'Dresses',
  };
  return map[bucket] || 'Other';
}

// ── Main engine ──

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

  // Bucket items by category
  const buckets: Record<CategoryBucket, TripWardrobeItem[]> = {
    tops: [],
    bottoms: [],
    outerwear: [],
    shoes: [],
    accessories: [],
    dresses: [],
  };

  for (const item of wardrobeItems) {
    const bucket = getBucket(item);
    if (bucket) buckets[bucket].push(item);
  }

  // Sort each bucket by activity relevance, with deterministic shuffle
  for (const key of Object.keys(buckets) as CategoryBucket[]) {
    buckets[key] = shuffleWithSeed(buckets[key], rand).sort(
      (a, b) => activityScore(b, activities) - activityScore(a, activities),
    );
  }

  // Shoe limits
  const maxShoes = numDays <= 5 ? 2 : 3;
  const selectedShoes = buckets.shoes.slice(0, maxShoes);

  // Outerwear selection
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

  // Build outfits day by day
  const outfits: CapsuleOutfit[] = [];
  const usedItemIds = new Set<string>();

  for (let day = 0; day < numDays; day++) {
    const dayWeather = weather[day];
    const outfitItems: TripPackingItem[] = [];

    const useDress =
      buckets.dresses.length > 0 && day % 3 === 0 && !needs.isCold;

    if (useDress) {
      const dressIdx = day % buckets.dresses.length;
      const dress = buckets.dresses[dressIdx];
      outfitItems.push(toPackingItem(dress, startingLocationLabel));
      usedItemIds.add(dress.id);
    } else {
      // Top
      if (buckets.tops.length > 0) {
        const topIdx = day % buckets.tops.length;
        outfitItems.push(
          toPackingItem(buckets.tops[topIdx], startingLocationLabel),
        );
        usedItemIds.add(buckets.tops[topIdx].id);
      }
      // Bottom
      if (buckets.bottoms.length > 0) {
        const bottomIdx = Math.floor(day / 2) % buckets.bottoms.length;
        outfitItems.push(
          toPackingItem(buckets.bottoms[bottomIdx], startingLocationLabel),
        );
        usedItemIds.add(buckets.bottoms[bottomIdx].id);
      }
    }

    // Shoes (rotate through selected)
    if (selectedShoes.length > 0) {
      const shoe = selectedShoes[day % selectedShoes.length];
      outfitItems.push(toPackingItem(shoe, startingLocationLabel));
      usedItemIds.add(shoe.id);
    }

    // Outerwear if needed for this day
    if (
      dayWeather &&
      (dayWeather.lowF < 55 || dayWeather.rainChance > 50) &&
      selectedOuterwear.length > 0
    ) {
      const outer =
        dayWeather.rainChance > 50
          ? selectedOuterwear.find(i => i.rainOk) || selectedOuterwear[0]
          : selectedOuterwear[0];
      outfitItems.push(toPackingItem(outer, startingLocationLabel));
      usedItemIds.add(outer.id);
    }

    // One accessory per outfit
    if (buckets.accessories.length > 0) {
      const accIdx = day % buckets.accessories.length;
      outfitItems.push(
        toPackingItem(buckets.accessories[accIdx], startingLocationLabel),
      );
      usedItemIds.add(buckets.accessories[accIdx].id);
    }

    outfits.push({
      id: `outfit_${day}`,
      dayLabel: `Day ${day + 1}`,
      items: outfitItems,
    });
  }

  // Build unique packing list grouped by category
  const allItems = outfits.flatMap(o => o.items);
  const uniqueMap = new Map<string, TripPackingItem>();
  for (const item of allItems) {
    if (!uniqueMap.has(item.wardrobeItemId)) {
      uniqueMap.set(item.wardrobeItemId, item);
    }
  }

  const categoryOrder = [
    'Tops',
    'Bottoms',
    'Dresses',
    'Outerwear',
    'Shoes',
    'Accessories',
    'Other',
  ];
  const grouped = new Map<string, TripPackingItem[]>();
  for (const item of uniqueMap.values()) {
    const displayCat = categoryOrder.includes(item.mainCategory)
      ? item.mainCategory
      : 'Other';
    if (!grouped.has(displayCat)) grouped.set(displayCat, []);
    grouped.get(displayCat)!.push(item);
  }

  const packingList: PackingGroup[] = categoryOrder
    .filter(cat => grouped.has(cat))
    .map(cat => ({
      category: cat,
      items: grouped.get(cat)!,
    }));

  return {outfits, packingList};
}
