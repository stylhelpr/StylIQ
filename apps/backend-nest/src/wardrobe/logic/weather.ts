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
  layering?: string; // 'Base' | 'Mid' | 'Outer'
  seasonality?: 'SS' | 'FW' | 'ALL_SEASON' | string;
  waterproof_rating?: number | string;
  rain_ok?: boolean;
  material?: string; // 'Suede' check
  sleeve_length?: string; // 'Short', 'Long'
};

const tt = (s: any) => (s ?? '').toString().trim().toLowerCase();

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

  const isOuter = cat === 'outerwear' || layer === 'outer';
  const isShortSleeve = sleeve.includes('short');
  const isShorts = sub === 'shorts';
  const waterproof = Number(item.waterproof_rating ?? NaN);
  const rainOk = !!item.rain_ok;

  // Temperature
  if (wx.tempF >= 78) {
    if (isShortSleeve) score += W.hotBoostShortSleeve;
    if (isOuter) score -= W.hotPenalizeOuter;
  } else if (wx.tempF <= 55) {
    if (isOuter) score += W.coldBoostOuter;
    if (isShortSleeve) score -= W.coldPenalizeShortSleeve;
  }

  // Rain
  if (wx.precipitation === 'rain') {
    if (rainOk || (Number.isFinite(waterproof) && waterproof > 0))
      score += W.rainBoostWaterproof;
    if (mat.includes('suede')) score -= W.rainPenalizeSuede;
  }

  // Wind
  if ((wx.windMph ?? 0) >= 15) {
    if (layer === 'outer' || sub.includes('jacket') || sub.includes('shell'))
      score += W.windBoostShell;
  }

  // Shorts cutoff
  if (isShorts && wx.tempF < W.shortsTempMinF) score -= W.shortsPenalty;

  return score;
}
