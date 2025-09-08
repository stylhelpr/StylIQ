export type OutfitCandidate = {
  outfit_id: string;
  item_ids: string[];
  base_score: number;
  items?: any[]; // raw items if available
  meta?: any; // outfit-level meta (occasion/style/etc.)
};

function kv(key: string, v: any) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? `${key}:${s}` : null;
}

function pick(obj: any, ...keys: string[]) {
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return undefined;
}

// Produces strings like "color:Blue", "main_category:Tops", "dress_code:Business"
export function extractFeaturesFromOutfit(outfit: OutfitCandidate): string[] {
  const feats = new Set<string>();

  const items = outfit.items || [];
  for (const it of items) {
    const m = it?.metadata ?? it ?? {};
    const color = pick(m, 'color_family', 'colorFamily', 'color');
    const pattern = pick(m, 'pattern', 'pattern_type');
    const mainCat = pick(m, 'main_category', 'mainCategory');
    const dress = pick(m, 'dress_code', 'dressCode', 'formality');
    const brand = pick(m, 'brand');
    const temp = pick(m, 'temp', 'temperature_band', 'weather_band');
    const season = pick(m, 'seasonality', 'season');

    for (const [k, v] of [
      ['color', color],
      ['pattern', pattern],
      ['main_category', mainCat],
      ['dress_code', dress],
      ['brand', brand],
      ['temp', temp],
      ['seasonality', season],
    ]) {
      const key = kv(k, v);
      if (key) feats.add(key);
    }
  }

  const o = outfit.meta || {};
  const occasion = pick(o, 'occasion');
  const style = pick(o, 'style');
  if (kv('occasion', occasion)) feats.add(kv('occasion', occasion)!);
  if (kv('style', style)) feats.add(kv('style', style)!);

  return Array.from(feats);
}
