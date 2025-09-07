// apps/backend-nest/src/wardrobe/logic/weather.ts

export type WeatherContext = {
  tempF: number; // e.g., 72
  precipitation?: 'none' | 'rain' | 'snow';
  windMph?: number;
  isIndoors?: boolean; // if known
  locationName?: string; // optional (LA, NYC, etc.)
};

export type WeatherWeights = {
  hotBoostShortSleeve: number;
  hotPenalizeOuter: number;
  coldBoostOuter: number;
  coldPenalizeShortSleeve: number;
  rainBoostWaterproof: number;
  rainPenalizeSuede: number;
  windBoostShell: number;
  shortsTempMinF: number; // below → penalize shorts
  shortsPenalty: number;
};

export const DEFAULT_WEATHER_WEIGHTS: WeatherWeights = {
  hotBoostShortSleeve: 6,
  hotPenalizeOuter: 4,
  coldBoostOuter: 8,
  coldPenalizeShortSleeve: 5,
  rainBoostWaterproof: 8,
  rainPenalizeSuede: 6,
  windBoostShell: 4,
  shortsTempMinF: 60,
  shortsPenalty: 8,
};

type Item = {
  main_category?: string;
  subcategory?: string;
  layering?: string; // 'Base' | 'Mid' | 'Outer' | 'SHELL' (from DB)
  seasonality?: 'SS' | 'FW' | 'ALL_SEASON' | string;
  waterproof_rating?: number | string;
  rain_ok?: boolean;
  material?: string; // 'Suede' check
  sleeve_length?: string; // 'Short', 'Long'
};

const tt = (s: any) => (s ?? '').toString().trim().toLowerCase();

const WEATHER_DEBUG = !!process.env.WEATHER_DEBUG;

/**
 * Score an item for the given weather context.
 * - Mild conditions (e.g., ~68°F, no rain, low wind) often yield 0 by design.
 * - We detect outers via main_category, layering ('outer'|'shell'), and
 *   common outerwear subcategory text like 'jacket', 'coat', 'trench', 'parka'.
 */
export function scoreItemForWeather(
  item: Item,
  wx: WeatherContext | undefined,
  W: WeatherWeights = DEFAULT_WEATHER_WEIGHTS,
): number {
  if (!wx) return 0;

  let score = 0;

  const cat = tt(item.main_category);
  const sub = tt(item.subcategory);
  const layer = tt(item.layering);
  const mat = tt(item.material);
  const sleeve = tt(item.sleeve_length);

  // Recognize outerwear more robustly (SHELL, jacket, coat, trench, parka)
  const isOuter =
    cat === 'outerwear' ||
    layer === 'outer' ||
    layer === 'shell' ||
    sub.includes('jacket') ||
    sub.includes('coat') ||
    sub.includes('trench') ||
    sub.includes('parka');

  const isShortSleeve = sleeve.includes('short');
  const isShorts = sub === 'shorts';
  const waterproof = Number(item.waterproof_rating ?? NaN);
  const rainOk = !!item.rain_ok;

  // Temperature nudges
  if (wx.tempF >= 78) {
    if (isShortSleeve) score += W.hotBoostShortSleeve;
    if (isOuter) score -= W.hotPenalizeOuter;
  } else if (wx.tempF <= 55) {
    if (isOuter) score += W.coldBoostOuter;
    if (isShortSleeve) score -= W.coldPenalizeShortSleeve;
  }

  // Rain nudges
  if (wx.precipitation === 'rain') {
    if (rainOk || (Number.isFinite(waterproof) && waterproof > 0)) {
      score += W.rainBoostWaterproof;
    }
    if (mat.includes('suede')) {
      score -= W.rainPenalizeSuede;
    }
  }

  // Wind nudges (treat 'shell' as outer-protective layer)
  if ((wx.windMph ?? 0) >= 15) {
    if (
      layer === 'outer' ||
      layer === 'shell' ||
      sub.includes('jacket') ||
      sub.includes('shell')
    ) {
      score += W.windBoostShell;
    }
  }

  // Shorts cutoff
  if (isShorts && wx.tempF < W.shortsTempMinF) {
    score -= W.shortsPenalty;
  }

  if (WEATHER_DEBUG) {
    // Helpful granular log per item; keep concise
    // Example: [WEATHER] Trench Coat — +8 (cold outer) +8 (rain ok) = 16
    const reasons: string[] = [];
    if (wx.tempF >= 78 && isShortSleeve)
      reasons.push(`+${W.hotBoostShortSleeve} hot/short-sleeve`);
    if (wx.tempF >= 78 && isOuter)
      reasons.push(`-${W.hotPenalizeOuter} hot/outer`);
    if (wx.tempF <= 55 && isOuter)
      reasons.push(`+${W.coldBoostOuter} cold/outer`);
    if (wx.tempF <= 55 && isShortSleeve)
      reasons.push(`-${W.coldPenalizeShortSleeve} cold/short-sleeve`);
    if (
      wx.precipitation === 'rain' &&
      (rainOk || (Number.isFinite(waterproof) && waterproof > 0))
    )
      reasons.push(`+${W.rainBoostWaterproof} rain/waterproof`);
    if (wx.precipitation === 'rain' && mat.includes('suede'))
      reasons.push(`-${W.rainPenalizeSuede} rain/suede`);
    if (
      (wx.windMph ?? 0) >= 15 &&
      (layer === 'outer' ||
        layer === 'shell' ||
        sub.includes('jacket') ||
        sub.includes('shell'))
    )
      reasons.push(`+${W.windBoostShell} wind/shell`);
    if (isShorts && wx.tempF < W.shortsTempMinF)
      reasons.push(`-${W.shortsPenalty} shorts<${W.shortsTempMinF}F`);

    // Try to reconstruct a short label if available on the object (optional)
    const label =
      (item as any)?.label ||
      [item.main_category, item.subcategory].filter(Boolean).join(' / ') ||
      'Item';

    console.log(
      `[WEATHER] ${label} → ${score.toFixed(2)} (${reasons.join(', ') || 'no-op'})`,
      `ctx=${JSON.stringify(wx)}`,
    );
  }

  return score;
}

/////////////////////

// // apps/backend-nest/src/wardrobe/logic/weather.ts
// export type WeatherContext = {
//   tempF: number; // e.g., 72
//   precipitation?: 'none' | 'rain' | 'snow';
//   windMph?: number;
//   isIndoors?: boolean; // if known
//   locationName?: string; // optional (LA, NYC, etc.)
// };

// export type WeatherWeights = {
//   hotBoostShortSleeve: number;
//   hotPenalizeOuter: number;
//   coldBoostOuter: number;
//   coldPenalizeShortSleeve: number;
//   rainBoostWaterproof: number;
//   rainPenalizeSuede: number;
//   windBoostShell: number;
//   shortsTempMinF: number; // below → penalize shorts
//   shortsPenalty: number;
// };

// export const DEFAULT_WEATHER_WEIGHTS: WeatherWeights = {
//   hotBoostShortSleeve: 6,
//   hotPenalizeOuter: 4,
//   coldBoostOuter: 8,
//   coldPenalizeShortSleeve: 5,
//   rainBoostWaterproof: 8,
//   rainPenalizeSuede: 6,
//   windBoostShell: 4,
//   shortsTempMinF: 60,
//   shortsPenalty: 8,
// };

// type Item = {
//   main_category?: string;
//   subcategory?: string;
//   layering?: string; // 'Base' | 'Mid' | 'Outer'
//   seasonality?: 'SS' | 'FW' | 'ALL_SEASON' | string;
//   waterproof_rating?: number | string;
//   rain_ok?: boolean;
//   material?: string; // 'Suede' check
//   sleeve_length?: string; // 'Short', 'Long'
// };

// const tt = (s: any) => (s ?? '').toString().trim().toLowerCase();

// export function scoreItemForWeather(
//   item: Item,
//   wx: WeatherContext | undefined,
//   W: WeatherWeights = DEFAULT_WEATHER_WEIGHTS,
// ): number {
//   if (!wx) return 0;
//   let score = 0;

//   const cat = tt(item.main_category);
//   const sub = tt(item.subcategory);
//   const layer = tt(item.layering);
//   const mat = tt(item.material);
//   const sleeve = tt(item.sleeve_length);

//   const isOuter = cat === 'outerwear' || layer === 'outer';
//   const isShortSleeve = sleeve.includes('short');
//   const isShorts = sub === 'shorts';
//   const waterproof = Number(item.waterproof_rating ?? NaN);
//   const rainOk = !!item.rain_ok;

//   // Temperature
//   if (wx.tempF >= 78) {
//     if (isShortSleeve) score += W.hotBoostShortSleeve;
//     if (isOuter) score -= W.hotPenalizeOuter;
//   } else if (wx.tempF <= 55) {
//     if (isOuter) score += W.coldBoostOuter;
//     if (isShortSleeve) score -= W.coldPenalizeShortSleeve;
//   }

//   // Rain
//   if (wx.precipitation === 'rain') {
//     if (rainOk || (Number.isFinite(waterproof) && waterproof > 0))
//       score += W.rainBoostWaterproof;
//     if (mat.includes('suede')) score -= W.rainPenalizeSuede;
//   }

//   // Wind
//   if ((wx.windMph ?? 0) >= 15) {
//     if (layer === 'outer' || sub.includes('jacket') || sub.includes('shell'))
//       score += W.windBoostShell;
//   }

//   // Shorts cutoff
//   if (isShorts && wx.tempF < W.shortsTempMinF) score -= W.shortsPenalty;

//   return score;
// }
