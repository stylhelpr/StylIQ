// postWardrobeItem.ts
import {API_BASE_URL} from '../config/api';

// Legacy numeric -> new text enum mapping (only if a number is still passed)
const patternScaleNumToText = (v?: number) =>
  v === undefined || v === null
    ? undefined
    : v <= 0
    ? 'subtle'
    : v === 1
    ? 'medium'
    : 'bold';

type CreateArgs = {
  userId: string;
  image_url: string;
  objectKey?: string;
  gsutilUri: string;
  name?: string;

  // old names you already had
  category: string; // -> main_category
  subcategory?: string;
  color?: string;
  material?: string;
  fit?: string;
  size?: string;
  brand?: string;
  tags?: string[];

  // visuals
  pattern?: string; // you were uppercasing this
  pattern_scale?: number | 'subtle' | 'medium' | 'bold';
  seasonality?: string; // SS/FW/ALL_SEASON
  layering?: string; // BASE/MID/SHELL/ACCENT
  dominant_hex?: string;
  palette_hex?: string[];
  color_family?: string;
  color_temp?: 'Warm' | 'Cool' | 'Neutral';
  contrast_profile?: 'Low' | 'Medium' | 'High';

  // climate
  thermal_rating?: number;
  breathability?: number;
  rain_ok?: boolean;
  wind_ok?: boolean;
  waterproof_rating?: string;
  climate_sweetspot_f_min?: number;
  climate_sweetspot_f_max?: number;

  // sizing
  size_system?: 'US' | 'EU' | 'UK' | 'alpha' | string;
  measurements?: Record<string, number>;
  size_label?: string;
  width?: number | null;
  height?: number | null;

  // care
  care_symbols?: string[];
  wash_temp_c?: number;
  dry_clean?: boolean;
  iron_ok?: boolean;

  // usage
  wear_count?: number;
  last_worn_at?: string; // ISO8601
  rotation_priority?: -1 | 0 | 1 | number;

  // extras
  seasonality_arr?: string[];
  constraints?: string[];
  purchase_date?: string; // ISO8601
  purchase_price?: number;
  retailer?: string;
  country_of_origin?: string;
  condition?: string;
  defects_notes?: string;
  style_descriptors?: string[];

  // ✅ added
  styleArchetypes?: string[];
  occasionTags?: string[];

  // AI
  ai_title?: string;
  ai_description?: string;
  ai_key_attributes?: string[];
  ai_confidence?: number;

  // pairing & feedback
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

  // UI-only tucked into metadata
  notes?: string;
  favorite?: boolean;
};

export async function postWardrobeItem(args: CreateArgs) {
  const {
    userId,
    image_url,
    objectKey,
    gsutilUri,
    name,

    category,
    subcategory,
    color,
    material,
    fit,
    size,
    brand,
    tags,

    pattern,
    pattern_scale,
    seasonality,
    layering,
    dominant_hex,
    palette_hex,
    color_family,
    color_temp,
    contrast_profile,

    thermal_rating,
    breathability,
    rain_ok,
    wind_ok,
    waterproof_rating,
    climate_sweetspot_f_min,
    climate_sweetspot_f_max,

    size_system,
    measurements,
    size_label,
    width,
    height,

    care_symbols,
    wash_temp_c,
    dry_clean,
    iron_ok,

    wear_count,
    last_worn_at,
    rotation_priority,

    seasonality_arr,
    constraints,
    purchase_date,
    purchase_price,
    retailer,
    country_of_origin,
    condition,
    defects_notes,
    style_descriptors,

    styleArchetypes,
    occasionTags,

    ai_title,
    ai_description,
    ai_key_attributes,
    ai_confidence,

    goes_with_ids,
    avoid_with_ids,
    user_rating,
    fit_confidence,
    outfit_feedback,
    disliked_features,

    notes,
    favorite,
  } = args;

  // Normalize as before
  const normPattern = pattern ? pattern.toUpperCase() : undefined;
  const normSeasonality = seasonality ? seasonality.toUpperCase() : undefined;
  const normLayering = layering ? layering.toUpperCase() : undefined;
  const normPatternScale =
    typeof pattern_scale === 'number'
      ? patternScaleNumToText(pattern_scale)
      : pattern_scale;

  const dto: Record<string, any> = {
    user_id: userId,
    image_url,
    gsutil_uri: gsutilUri,
    object_key: objectKey,
    name,

    // base
    main_category: category,
    subcategory,
    color,
    material,
    fit,
    size,
    brand,
    tags,

    // visuals
    pattern: normPattern,
    pattern_scale: normPatternScale,
    seasonality: normSeasonality,
    layering: normLayering,
    dominant_hex,
    palette_hex,
    color_family,
    color_temp,
    contrast_profile,

    // climate
    thermal_rating,
    breathability,
    rain_ok,
    wind_ok,
    waterproof_rating,
    climate_sweetspot_f_min,
    climate_sweetspot_f_max,

    // sizing
    size_system,
    measurements,
    size_label,
    width: width ?? undefined,
    height: height ?? undefined,

    // care
    care_symbols,
    wash_temp_c,
    dry_clean,
    iron_ok,

    // usage
    wear_count,
    last_worn_at,
    rotation_priority,

    // extras
    seasonality_arr,
    constraints,
    purchase_date,
    purchase_price,
    retailer,
    country_of_origin,
    condition,
    defects_notes,
    style_descriptors,

    style_archetypes: styleArchetypes,
    occasion_tags: occasionTags,

    // AI
    ai_title,
    ai_description,
    ai_key_attributes,
    ai_confidence,

    // pairing & feedback
    goes_with_ids,
    avoid_with_ids,
    user_rating,
    fit_confidence,
    outfit_feedback,
    disliked_features,

    // UI-only in metadata
    metadata:
      notes !== undefined || favorite !== undefined
        ? {
            ...(notes !== undefined ? {notes} : {}),
            ...(favorite !== undefined ? {favorite} : {}),
          }
        : undefined,
  };

  Object.keys(dto).forEach(k => dto[k] === undefined && delete dto[k]);

  const r = await fetch(`${API_BASE_URL}/wardrobe`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(dto),
  });

  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

//////////////////

// import {API_BASE_URL} from '../config/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   objectKey,
//   gsutilUri,
//   name,
//   category,
//   color,
//   subcategory,
//   material,
//   fit,
//   size,
//   brand,
//   tags,
//   pattern,
//   pattern_scale,
//   seasonality,
//   layering,
//   dominant_hex,
//   palette_hex,
//   color_family,
//   thermal_rating,
//   breathability,
//   rain_ok,
//   wind_ok,
//   size_system,
//   measurements,
//   care_symbols,
//   wash_temp_c,
//   dry_clean,
//   iron_ok,
//   wear_count,
//   last_worn_at,
//   rotation_priority,
//   // NEW FIELDS:
//   seasonality_arr,
//   climate_sweetspot_f_min,
//   climate_sweetspot_f_max,
//   size_label,
//   constraints,
//   purchase_date,
//   purchase_price,
//   retailer,
//   country_of_origin,
//   condition,
//   defects_notes,
//   style_descriptors,
//   ai_title,
//   ai_description,
//   ai_key_attributes,
//   ai_confidence,
// }: {
//   userId: string;
//   image_url: string;
//   objectKey: string;
//   gsutilUri: string;
//   name: string;
//   category: string;
//   color: string;
//   subcategory?: string;
//   material?: string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   tags: string[];
//   pattern?: string;
//   pattern_scale?: number;
//   seasonality?: string;
//   layering?: string;
//   dominant_hex?: string;
//   palette_hex?: string[];
//   color_family?: string;
//   thermal_rating?: number;
//   breathability?: number;
//   rain_ok?: boolean;
//   wind_ok?: boolean;
//   size_system?: string;
//   measurements?: Record<string, any>;
//   care_symbols?: string[];
//   wash_temp_c?: number;
//   dry_clean?: boolean;
//   iron_ok?: boolean;
//   wear_count?: number;
//   last_worn_at?: string;
//   rotation_priority?: number;
//   // NEW FIELD TYPES:
//   seasonality_arr?: string[];
//   climate_sweetspot_f_min?: number;
//   climate_sweetspot_f_max?: number;
//   size_label?: string;
//   constraints?: string[];
//   purchase_date?: string;
//   purchase_price?: number;
//   retailer?: string;
//   country_of_origin?: string;
//   condition?: string;
//   defects_notes?: string;
//   style_descriptors?: string[];
//   ai_title?: string;
//   ai_description?: string;
//   ai_key_attributes?: string[];
//   ai_confidence?: number;
// }) {
//   const payload = {
//     user_id: userId,
//     image_url,
//     object_key: objectKey,
//     gsutil_uri: gsutilUri,
//     name,
//     main_category: category,
//     subcategory: subcategory ?? null,
//     color,
//     material: material ?? null,
//     fit: fit ?? null,
//     size: size ?? null,
//     brand: brand ?? null,
//     tags,
//     pattern: pattern?.toUpperCase() ?? null,
//     pattern_scale: pattern_scale ?? null,
//     seasonality: seasonality?.toUpperCase() ?? null,
//     layering: layering?.toUpperCase() ?? null,
//     dominant_hex: dominant_hex ?? null,
//     palette_hex: palette_hex ?? null,
//     color_family: color_family ?? null,
//     thermal_rating: thermal_rating ?? null,
//     breathability: breathability ?? null,
//     rain_ok: rain_ok ?? null,
//     wind_ok: wind_ok ?? null,
//     size_system: size_system ?? null,
//     measurements: measurements ?? null,
//     care_symbols: care_symbols ?? null,
//     wash_temp_c: wash_temp_c ?? null,
//     dry_clean: dry_clean ?? null,
//     iron_ok: iron_ok ?? null,
//     wear_count: wear_count ?? null,
//     last_worn_at: last_worn_at ?? null,
//     rotation_priority: rotation_priority ?? null,
//     seasonality_arr: seasonality_arr ?? null,
//     climate_sweetspot_f_min: climate_sweetspot_f_min ?? null,
//     climate_sweetspot_f_max: climate_sweetspot_f_max ?? null,
//     size_label: size_label ?? null,
//     constraints: constraints ?? null,
//     purchase_date: purchase_date ?? null,
//     purchase_price: purchase_price ?? null,
//     retailer: retailer ?? null,
//     country_of_origin: country_of_origin ?? null,
//     condition: condition ?? null,
//     defects_notes: defects_notes ?? null,
//     style_descriptors: style_descriptors ?? null,
//     ai_title: ai_title ?? null,
//     ai_description: ai_description ?? null,
//     ai_key_attributes: ai_key_attributes ?? null,
//     ai_confidence: ai_confidence ?? null,
//     metadata: {}, // always included
//     width: null, // still placeholder
//     height: null, // still placeholder
//   };

//   const r = await fetch(`${API_BASE_URL}/wardrobe`, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(payload),
//   });

//   if (!r.ok) throw new Error(await r.text());
//   return r.json();
// }

/////////////

// import {API_BASE_URL} from '../config/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   objectKey,
//   gsutilUri,
//   name,
//   category,
//   color,
//   subcategory,
//   material,
//   fit,
//   size,
//   brand,
//   tags,
//   pattern,
//   pattern_scale,
//   seasonality,
//   layering,
//   dominant_hex,
//   palette_hex,
//   color_family,
//   thermal_rating,
//   breathability,
//   rain_ok,
//   wind_ok,
//   size_system,
//   measurements,
//   care_symbols,
//   wash_temp_c,
//   dry_clean,
//   iron_ok,
//   wear_count,
//   last_worn_at,
//   rotation_priority,
// }: {
//   userId: string;
//   image_url: string;
//   objectKey: string;
//   gsutilUri: string;
//   name: string;
//   category: string;
//   color: string;
//   subcategory?: string;
//   material?: string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   tags: string[];
//   pattern?: string;
//   pattern_scale?: number;
//   seasonality?: string;
//   layering?: string;
//   dominant_hex?: string;
//   palette_hex?: string[];
//   color_family?: string;
//   thermal_rating?: number;
//   breathability?: number;
//   rain_ok?: boolean;
//   wind_ok?: boolean;
//   size_system?: string;
//   measurements?: Record<string, any>;
//   care_symbols?: string[];
//   wash_temp_c?: number;
//   dry_clean?: boolean;
//   iron_ok?: boolean;
//   wear_count?: number;
//   last_worn_at?: string;
//   rotation_priority?: number;
// }) {
//   const payload = {
//     user_id: userId,
//     image_url,
//     object_key: objectKey,
//     gsutil_uri: gsutilUri,
//     name,
//     main_category: category,
//     subcategory: subcategory ?? null,
//     color,
//     material: material ?? null,
//     fit: fit ?? null,
//     size: size ?? null,
//     brand: brand ?? null,
//     tags,
//     pattern: pattern?.toUpperCase(),
//     pattern_scale: pattern_scale ?? null,
//     seasonality: seasonality?.toUpperCase(),
//     layering: layering?.toUpperCase(),
//     dominant_hex: dominant_hex ?? null,
//     palette_hex: palette_hex ?? null,
//     color_family: color_family ?? null,
//     thermal_rating: thermal_rating ?? null,
//     breathability: breathability ?? null,
//     rain_ok: rain_ok ?? null,
//     wind_ok: wind_ok ?? null,
//     size_system: size_system ?? null,
//     measurements: measurements ?? null,
//     care_symbols: care_symbols ?? null,
//     wash_temp_c: wash_temp_c ?? null,
//     dry_clean: dry_clean ?? null,
//     iron_ok: iron_ok ?? null,
//     wear_count: wear_count ?? null,
//     last_worn_at: last_worn_at ?? null,
//     rotation_priority: rotation_priority ?? null,
//     metadata: {},
//     width: null,
//     height: null,
//   };

//   const r = await fetch(`${API_BASE_URL}/wardrobe`, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(payload),
//   });

//   if (!r.ok) throw new Error(await r.text());
//   return r.json();
// }

///////////////

// import {API_BASE_URL} from '../config/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   objectKey,
//   gsutilUri,
//   name,
//   category,
//   color,
//   subcategory,
//   material,
//   fit,
//   size,
//   brand,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   objectKey: string;
//   gsutilUri: string;
//   name: string;
//   category: string;
//   color: string;
//   subcategory?: string;
//   material?: string;
//   fit?: string;
//   size?: string;
//   brand?: string;
//   tags: string[];
// }) {
//   const payload = {
//     user_id: userId,
//     image_url,
//     object_key: objectKey,
//     gsutil_uri: gsutilUri,
//     name,
//     main_category: category,
//     subcategory: subcategory ?? null,
//     color,
//     material: material ?? null,
//     fit: fit ?? null,
//     size: size ?? null,
//     brand: brand ?? null,
//     metadata: {},
//     width: null,
//     height: null,
//     tags,
//   };

//   const r = await fetch(`${API_BASE_URL}/wardrobe`, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(payload),
//   });
//   if (!r.ok) throw new Error(await r.text());
//   return r.json();
// }

//////////////

// // api/postWardrobeItem.ts
// import {API_BASE_URL} from '../config/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   objectKey,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   objectKey: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   const payload = {
//     user_id: userId,
//     image_url,
//     object_key: objectKey,
//     gsutil_uri: null, // 🔹 placeholder for now
//     name,
//     main_category: category,
//     subcategory: null,
//     color,
//     material: null,
//     fit: null,
//     size: null,
//     brand: null,
//     metadata: {},
//     width: null,
//     height: null,
//     tags,
//   };

//   const r = await fetch(`${API_BASE_URL}/wardrobe`, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(payload),
//   });
//   if (!r.ok) throw new Error(await r.text());
//   return r.json();
// }

///////////

// // utils/postWardrobeItem.ts
// import {API_BASE_URL} from '../config/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   objectKey,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   objectKey: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   const payload = {
//     user_id: userId,
//     image_url,
//     object_key: objectKey,
//     name,
//     main_category: category,
//     color,
//     tags,
//   };

//   console.log('📦 Sending wardrobe item payload:', payload);

//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error(`❌ Upload failed ${res.status}:`, errorText);
//     throw new Error(`Upload failed: ${res.status} ${errorText}`);
//   }

//   return res.json();
// }

/////////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   objectKey,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   objectKey: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   const payload = {
//     user_id: userId,
//     image_url,
//     object_key: objectKey, // ✅ REQUIRED by backend
//     name,
//     main_category: category,
//     color,
//     tags,
//   };

//   console.log('📦 Sending wardrobe item payload:', payload);

//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error(`❌ Upload failed ${res.status}:`, errorText);
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

///////////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string; // ✅ Must be the UUID, not Auth0 sub
//   image_url: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   // 🧠 Safety check
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   const payload = {
//     user_id: userId,
//     image_url,
//     name,
//     main_category: category,
//     color,
//     tags,
//   };

//   console.log('📦 Sending wardrobe item payload:', payload);

//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error(`❌ Upload failed ${res.status}:`, errorText);
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

///////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string; // ✅ Must be the UUID, not Auth0 sub
//   image_url: string; // This is the full GCS public URL
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   // 🧠 Safety check
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   // 🪄 Extract GCS object key from full public URL
//   const object_key = image_url.split('/stylhelpr-dev-bucket/')[1];

//   const payload = {
//     user_id: userId,
//     object_key,
//     name,
//     main_category: category,
//     color,
//     tags,
//   };

//   console.log('📦 Sending wardrobe item payload:', payload);

//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error(`❌ Upload failed ${res.status}:`, errorText);
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

///////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string; // ✅ Must be the UUID, not Auth0 sub
//   image_url: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   // 🧠 Safety check
//   if (!userId || !/^[0-9a-fA-F\-]{36}$/.test(userId)) {
//     throw new Error(`❌ Invalid or missing UUID: ${userId}`);
//   }

//   const payload = {
//     user_id: userId,
//     image_url,
//     name,
//     main_category: category,
//     color,
//     tags,
//   };

//   console.log('📦 Sending wardrobe item payload:', payload);

//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error(`❌ Upload failed ${res.status}:`, errorText);
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

//////////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       user_id: userId,
//       image_url,
//       name,
//       main_category: category,
//       color,
//       tags,
//     }),
//   });

//   if (!res.ok) {
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }

/////////////////

// import {Platform} from 'react-native';

// const API_BASE_URL =
//   Platform.OS === 'android'
//     ? 'http://10.0.2.2:3001/api'
//     : 'http://localhost:3001/api';

// export async function postWardrobeItem({
//   userId,
//   image_url,
//   name,
//   category,
//   color,
//   tags,
// }: {
//   userId: string;
//   image_url: string;
//   name: string;
//   category: string;
//   color: string;
//   tags: string[];
// }) {
//   const res = await fetch(`${API_BASE_URL}/upload/complete`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       user_id: userId,
//       image_url,
//       name,
//       main_category: category,
//       color,
//       tags,
//     }),
//   });

//   if (!res.ok) {
//     throw new Error(`Upload failed: ${res.status}`);
//   }

//   return await res.json();
// }
