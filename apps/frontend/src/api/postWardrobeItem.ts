// postWardrobeItem.ts
import {API_BASE_URL} from '../config/api';

const patternScaleNumToText = (v?: number) =>
  v === undefined || v === null
    ? undefined
    : v <= 0
    ? 'subtle'
    : v === 1
    ? 'medium'
    : 'bold';

type CreateArgs = {
  // accept both camel & snake from callers
  userId?: string;
  user_id?: string;

  image_url: string;

  objectKey?: string;
  object_key?: string;

  gsutilUri?: string;
  gsutil_uri?: string;

  name?: string;

  // category name can arrive as either of these
  category?: string; // <- old/camel
  main_category?: string; // <- your screen sends this

  subcategory?: string;
  color?: string;
  material?: string;
  fit?: string;
  size?: string;
  brand?: string;
  tags?: string[];

  pattern?: string;
  pattern_scale?: number | 'subtle' | 'medium' | 'bold';
  seasonality?: string; // SS/FW/ALL_SEASON
  layering?: string; // BASE/MID/SHELL/ACCENT
  dominant_hex?: string;
  palette_hex?: string[];
  color_family?: string;
  color_temp?: 'Warm' | 'Cool' | 'Neutral';
  contrast_profile?: 'Low' | 'Medium' | 'High';

  thermal_rating?: number;
  breathability?: number;
  rain_ok?: boolean;
  wind_ok?: boolean;
  waterproof_rating?: string;
  climate_sweetspot_f_min?: number;
  climate_sweetspot_f_max?: number;

  size_system?: 'US' | 'EU' | 'UK' | 'alpha' | string;
  measurements?: Record<string, number>;
  size_label?: string;
  width?: number | null;
  height?: number | null;

  care_symbols?: string[];
  wash_temp_c?: number;
  dry_clean?: boolean;
  iron_ok?: boolean;

  wear_count?: number;
  last_worn_at?: string;
  rotation_priority?: number;

  seasonality_arr?: string[];
  constraints?: string | string[]; // DB is TEXT
  purchase_date?: string;
  purchase_price?: number;
  retailer?: string;
  country_of_origin?: string;
  condition?: string;
  defects_notes?: string;
  style_descriptors?: string[];

  // ✅ accept both camel & snake for these
  styleArchetypes?: string[];
  style_archetypes?: string[];
  occasionTags?: string[];
  occasion_tags?: string[];

  // ✅ WOW fields
  dress_code?:
    | 'UltraCasual'
    | 'Casual'
    | 'SmartCasual'
    | 'BusinessCasual'
    | 'Business'
    | 'BlackTie';
  anchor_role?: 'Hero' | 'Neutral' | 'Connector';

  ai_title?: string;
  ai_description?: string;
  ai_key_attributes?: string[];
  ai_confidence?: number;

  goes_with_ids?: string[];
  avoid_with_ids?: string[];
  user_rating?: number;
  fit_confidence?: number;
  outfit_feedback?: {
    outfit_id: string;
    liked: boolean;
    reason_codes?: string[];
  }[];
  disliked_features?: string[];

  notes?: string;
  favorite?: boolean;
};

const isUuid = (s: any) =>
  typeof s === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );

export async function postWardrobeItem(args: CreateArgs) {
  // ---- Compat shims
  const user_id = args.userId ?? args.user_id;
  const object_key = args.objectKey ?? args.object_key;
  const gsutil_uri = args.gsutilUri ?? args.gsutil_uri;
  const main_category = args.main_category ?? args.category; // <-- FIX

  if (!isUuid(user_id)) {
    throw new Error('Missing or invalid user_id; cannot create wardrobe item.');
  }
  if (!main_category || !String(main_category).trim()) {
    throw new Error('Missing main_category (category) — it is required.');
  }

  // Normalize like before
  const normPattern = args.pattern ? args.pattern.toUpperCase() : undefined;
  const normSeasonality = args.seasonality
    ? args.seasonality.toUpperCase()
    : undefined;
  const normLayering = args.layering ? args.layering.toUpperCase() : undefined;
  const normPatternScale =
    typeof args.pattern_scale === 'number'
      ? patternScaleNumToText(args.pattern_scale)
      : args.pattern_scale;

  // DB expects TEXT for constraints
  const constraintsText =
    typeof args.constraints === 'string'
      ? args.constraints
      : Array.isArray(args.constraints)
      ? JSON.stringify(args.constraints)
      : undefined;

  const dto: Record<string, any> = {
    user_id,
    image_url: args.image_url,
    gsutil_uri,
    object_key,
    name: args.name,

    // base
    main_category, // <-- now always provided
    subcategory: args.subcategory,
    color: args.color,
    material: args.material,
    fit: args.fit,
    size: args.size,
    brand: args.brand,
    tags: args.tags,

    // visuals
    pattern: normPattern,
    pattern_scale: normPatternScale,
    seasonality: normSeasonality,
    layering: normLayering,
    dominant_hex: args.dominant_hex,
    palette_hex: args.palette_hex,
    color_family: args.color_family,
    color_temp: args.color_temp,
    contrast_profile: args.contrast_profile,

    // climate
    thermal_rating: args.thermal_rating,
    breathability: args.breathability,
    rain_ok: args.rain_ok,
    wind_ok: args.wind_ok,
    waterproof_rating: args.waterproof_rating,
    climate_sweetspot_f_min: args.climate_sweetspot_f_min,
    climate_sweetspot_f_max: args.climate_sweetspot_f_max,

    // sizing
    size_system: args.size_system,
    measurements: args.measurements,
    size_label: args.size_label,
    width: args.width ?? undefined,
    height: args.height ?? undefined,

    // care
    care_symbols: args.care_symbols,
    wash_temp_c: args.wash_temp_c,
    dry_clean: args.dry_clean,
    iron_ok: args.iron_ok,

    // usage
    wear_count: args.wear_count,
    last_worn_at: args.last_worn_at,
    rotation_priority: args.rotation_priority,

    // extras
    seasonality_arr: args.seasonality_arr,
    constraints: constraintsText,
    purchase_date: args.purchase_date,
    purchase_price: args.purchase_price,
    retailer: args.retailer,
    country_of_origin: args.country_of_origin,
    condition: args.condition,
    defects_notes: args.defects_notes,
    style_descriptors: args.style_descriptors,

    // ✅ accept both camel & snake
    style_archetypes: args.style_archetypes ?? args.styleArchetypes,
    occasion_tags: args.occasion_tags ?? args.occasionTags,

    // ✅ WOW fields
    dress_code: args.dress_code,
    anchor_role: args.anchor_role,

    // AI
    ai_title: args.ai_title,
    ai_description: args.ai_description,
    ai_key_attributes: args.ai_key_attributes,
    ai_confidence: args.ai_confidence,

    // pairing & feedback
    goes_with_ids: args.goes_with_ids,
    avoid_with_ids: args.avoid_with_ids,
    user_rating: args.user_rating,
    fit_confidence: args.fit_confidence,
    outfit_feedback: args.outfit_feedback,
    disliked_features: args.disliked_features,

    // UI-only metadata
    metadata:
      args.notes !== undefined || args.favorite !== undefined
        ? {
            ...(args.notes !== undefined ? {notes: args.notes} : {}),
            ...(args.favorite !== undefined ? {favorite: args.favorite} : {}),
          }
        : undefined,
  };

  // remove undefineds
  Object.keys(dto).forEach(k => dto[k] === undefined && delete dto[k]);

  const res = await fetch(`${API_BASE_URL}/wardrobe`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `wardrobe create failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json();
}
