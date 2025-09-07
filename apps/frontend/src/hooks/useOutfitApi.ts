import {useCallback, useEffect, useRef, useState} from 'react';
import {API_BASE_URL} from '../config/api';

/**
 * Shape of an item returned by the backend "outfits" endpoint.
 */
export type OutfitApiItem = {
  index: number;
  id: string;
  label: string;
  image_url?: string;
  main_category?: string;
  subcategory?: string;
  color?: string;
  color_family?: string;
  shoe_style?: string;
  dress_code?: string;
  formality_score?: number;
};

export type OutfitApi = {
  title: string;
  items: OutfitApiItem[];
  why: string;
  missing?: string;
};

export type WardrobeItem = {
  id: string;
  image: string;
  name: string;
  mainCategory?: string;
  subCategory?: string;
  color?: string;
};

type WeatherContext = {
  tempF: number;
  precipitation?: 'none' | 'rain' | 'snow';
  windMph?: number;
  locationName?: string;
};

type UserStylePayload = {
  preferredColors?: string[];
  avoidColors?: string[];
  preferredCategories?: string[];
  avoidSubcategories?: string[];
  favoriteBrands?: string[];
  dressBias?: 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business';
};

type GenerateOptions = {
  topK?: number;
  useWeather?: boolean;
  weather?: WeatherContext;
  styleProfile?: any; // raw profile from useStyleProfile(); we map it below
  useStyle?: boolean; // ⬅️ NEW: toggle style influence
  // weights?: {...}    // optional future use by callers
};

function resolveUri(u?: string) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const base = API_BASE_URL.replace(/\/+$/, '');
  const path = u.replace(/^\/+/, '');
  return `${base}/${path}`;
}

export function apiItemToUI(
  item?: OutfitApiItem | null,
): WardrobeItem | undefined {
  if (!item) return undefined;
  const head = item.label ?? '';
  const name =
    head.split(' — ')[0]?.trim() ||
    head.split(' - ')[0]?.trim() ||
    item.subcategory ||
    item.main_category ||
    'Item';

  return {
    id: item.id,
    image: resolveUri(item.image_url),
    name,
    mainCategory: item.main_category,
    subCategory: item.subcategory,
    color: item.color ?? item.color_family,
  };
}

// ──────────────────────────────────────────────────────────────
// Minimal mapper DB → backend UserStyle
// ──────────────────────────────────────────────────────────────
function toStringArray(x: any): string[] | undefined {
  if (!x && x !== '') return undefined;
  if (Array.isArray(x)) {
    const arr = x
      .map(String)
      .map(s => s.trim())
      .filter(Boolean);
    return arr.length ? arr : undefined;
  }
  const s = String(x).trim();
  if (!s) return undefined;
  const arr = s
    .split(/[,|]/g)
    .map(t => t.trim())
    .filter(Boolean);
  return arr.length ? arr : undefined;
}

function mapStyleProfileToUserStyle(raw: any): UserStylePayload | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const preferredColors = toStringArray(raw.favorite_colors);
  const favoriteBrands = toStringArray(raw.preferred_brands);

  const out: UserStylePayload = {};
  if (preferredColors) out.preferredColors = preferredColors;
  if (favoriteBrands) out.favoriteBrands = favoriteBrands;

  return Object.keys(out).length ? out : undefined;
}

export function useOutfitApi(userId?: string) {
  const [outfits, setOutfits] = useState<OutfitApi[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /**
   * regenerate(query, opts?)
   * ------------------------
   * Posts to /wardrobe/outfits with:
   *  - user_id, query, topK
   *  - useWeather (boolean)
   *  - weather (object; ignored by server when useWeather=false)
   *  - style_profile (mapped from raw style profile) — only if opts.useStyle !== false
   *  - weights (zeroes styleWeight when opts.useStyle === false)
   */
  const regenerate = useCallback(
    async (query: string, opts?: GenerateOptions) => {
      if (!userId) return;

      setLoading(true);
      setErr(null);

      try {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        const useStyle = opts?.useStyle ?? true;
        const style_payload = useStyle
          ? mapStyleProfileToUserStyle(opts?.styleProfile)
          : undefined;

        const body: any = {
          user_id: userId,
          query,
          topK: opts?.topK ?? 20,
          useWeather: opts?.useWeather ?? true,
          weather: opts?.weather,
        };

        if (useStyle && style_payload) {
          body.style_profile = style_payload;
        }

        // If user turned style OFF, explicitly zero the style weight server-side
        if (!useStyle) {
          body.weights = {
            constraintsWeight: 1.0,
            styleWeight: 0.0,
            weatherWeight: body.useWeather ? 0.8 : 0.0,
          };
        }

        // Debug
        console.log('POST /wardrobe/outfits →', {
          ...body,
          weather: body.weather ? '[sent]' : undefined,
        });

        const res = await fetch(`${API_BASE_URL}/wardrobe/outfits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
          signal: ac.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        const arr: OutfitApi[] = Array.isArray(json?.outfits)
          ? json.outfits
          : [];

        setOutfits(arr);
        setSelected(0);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setErr(e?.message || 'Failed to fetch outfits');
        }
      } finally {
        abortRef.current = null;
        setLoading(false);
      }
    },
    [userId],
  );

  const current = outfits[selected];
  const selectNext = () =>
    setSelected(s => Math.min(s + 1, Math.max(0, outfits.length - 1)));
  const selectPrev = () => setSelected(s => Math.max(s - 1, 0));

  return {
    outfits,
    current,
    selected,
    setSelected,
    loading,
    error: err,
    regenerate,
    selectNext,
    selectPrev,
  };
}

export function pickFirstByCategory(
  items: OutfitApiItem[] | undefined,
  cat: string,
) {
  if (!items?.length) return undefined;
  return items.find(i => i.main_category === cat);
}

export function pickTopOrOuter(items?: OutfitApiItem[]) {
  return (
    pickFirstByCategory(items, 'Tops') ??
    pickFirstByCategory(items, 'Outerwear')
  );
}

////////////////////////

// import {useCallback, useEffect, useRef, useState} from 'react';
// import {API_BASE_URL} from '../config/api';

// /**
//  * Shape of an item returned by the backend "outfits" endpoint.
//  */
// export type OutfitApiItem = {
//   index: number;
//   id: string;
//   label: string;
//   image_url?: string;
//   main_category?: string;
//   subcategory?: string;
//   color?: string;
//   color_family?: string;
//   shoe_style?: string;
//   dress_code?: string;
//   formality_score?: number;
// };

// export type OutfitApi = {
//   title: string;
//   items: OutfitApiItem[];
//   why: string;
//   missing?: string;
// };

// export type WardrobeItem = {
//   id: string;
//   image: string;
//   name: string;
//   mainCategory?: string;
//   subCategory?: string;
//   color?: string;
// };

// type WeatherContext = {
//   tempF: number;
//   precipitation?: 'none' | 'rain' | 'snow';
//   windMph?: number;
//   locationName?: string;
// };

// type UserStylePayload = {
//   preferredColors?: string[];
//   avoidColors?: string[];
//   preferredCategories?: string[];
//   avoidSubcategories?: string[];
//   favoriteBrands?: string[];
//   dressBias?: 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business';
// };

// type GenerateOptions = {
//   topK?: number;
//   useWeather?: boolean;
//   weather?: WeatherContext;
//   styleProfile?: any; // raw profile from useStyleProfile(); we map it below
//   // weights?: {...} // optional future use
// };

// function resolveUri(u?: string) {
//   if (!u) return '';
//   if (/^https?:\/\//i.test(u)) return u;
//   const base = API_BASE_URL.replace(/\/+$/, '');
//   const path = u.replace(/^\/+/, '');
//   return `${base}/${path}`;
// }

// export function apiItemToUI(
//   item?: OutfitApiItem | null,
// ): WardrobeItem | undefined {
//   if (!item) return undefined;
//   const head = item.label ?? '';
//   const name =
//     head.split(' — ')[0]?.trim() ||
//     head.split(' - ')[0]?.trim() ||
//     item.subcategory ||
//     item.main_category ||
//     'Item';

//   return {
//     id: item.id,
//     image: resolveUri(item.image_url),
//     name,
//     mainCategory: item.main_category,
//     subCategory: item.subcategory,
//     color: item.color ?? item.color_family,
//   };
// }

// // ──────────────────────────────────────────────────────────────
// // Minimal, no-assumption mapper from your DB shape → backend UserStyle
// // Uses only fields that are present in your style_profile table today:
// //   - favorite_colors → preferredColors
// //   - preferred_brands → favoriteBrands
// // Everything else left undefined.
// // Accepts string[] or comma/pipe separated string.
// // ──────────────────────────────────────────────────────────────
// function toStringArray(x: any): string[] | undefined {
//   if (!x && x !== '') return undefined;
//   if (Array.isArray(x)) {
//     const arr = x
//       .map(String)
//       .map(s => s.trim())
//       .filter(Boolean);
//     return arr.length ? arr : undefined;
//   }
//   const s = String(x).trim();
//   if (!s) return undefined;
//   const arr = s
//     .split(/[,|]/g)
//     .map(t => t.trim())
//     .filter(Boolean);
//   return arr.length ? arr : undefined;
// }

// function mapStyleProfileToUserStyle(raw: any): UserStylePayload | undefined {
//   if (!raw || typeof raw !== 'object') return undefined;

//   const preferredColors = toStringArray(raw.favorite_colors);
//   const favoriteBrands = toStringArray(raw.preferred_brands);

//   // Only include keys that actually have values
//   const out: UserStylePayload = {};
//   if (preferredColors) out.preferredColors = preferredColors;
//   if (favoriteBrands) out.favoriteBrands = favoriteBrands;

//   // If nothing mapped, return undefined so we don't send noise
//   return Object.keys(out).length ? out : undefined;
// }

// export function useOutfitApi(userId?: string) {
//   const [outfits, setOutfits] = useState<OutfitApi[]>([]);
//   const [selected, setSelected] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   const abortRef = useRef<AbortController | null>(null);

//   useEffect(() => {
//     return () => abortRef.current?.abort();
//   }, []);

//   /**
//    * regenerate(query, opts?)
//    * ------------------------
//    * Posts to /wardrobe/outfits with:
//    *  - user_id, query, topK
//    *  - useWeather (boolean)
//    *  - weather (object; ignored by server when useWeather=false)
//    *  - style_profile (mapped from raw style profile)
//    */
//   const regenerate = useCallback(
//     async (query: string, opts?: GenerateOptions) => {
//       if (!userId) return;

//       setLoading(true);
//       setErr(null);

//       try {
//         abortRef.current?.abort();
//         const ac = new AbortController();
//         abortRef.current = ac;

//         const style_payload = mapStyleProfileToUserStyle(
//           opts?.styleProfile ?? undefined,
//         );

//         const body: any = {
//           user_id: userId,
//           query,
//           topK: opts?.topK ?? 20,
//           useWeather: opts?.useWeather ?? true,
//           weather: opts?.weather,
//         };

//         if (style_payload) {
//           body.style_profile = style_payload;
//         }

//         // Debug to verify we're sending style:
//         console.log('POST /wardrobe/outfits →', {
//           ...body,
//           // avoid logging full weather payload spam
//           weather: body.weather ? '[sent]' : undefined,
//         });

//         const res = await fetch(`${API_BASE_URL}/wardrobe/outfits`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//           },
//           body: JSON.stringify(body),
//           signal: ac.signal,
//         });

//         if (!res.ok) {
//           throw new Error(`HTTP ${res.status} ${res.statusText}`);
//         }

//         const json = await res.json();
//         const arr: OutfitApi[] = Array.isArray(json?.outfits)
//           ? json.outfits
//           : [];

//         setOutfits(arr);
//         setSelected(0);
//       } catch (e: any) {
//         if (e?.name !== 'AbortError') {
//           setErr(e?.message || 'Failed to fetch outfits');
//         }
//       } finally {
//         abortRef.current = null;
//         setLoading(false);
//       }
//     },
//     [userId],
//   );

//   const current = outfits[selected];
//   const selectNext = () =>
//     setSelected(s => Math.min(s + 1, Math.max(0, outfits.length - 1)));
//   const selectPrev = () => setSelected(s => Math.max(s - 1, 0));

//   return {
//     outfits,
//     current,
//     selected,
//     setSelected,
//     loading,
//     error: err,
//     regenerate,
//     selectNext,
//     selectPrev,
//   };
// }

// export function pickFirstByCategory(
//   items: OutfitApiItem[] | undefined,
//   cat: string,
// ) {
//   if (!items?.length) return undefined;
//   return items.find(i => i.main_category === cat);
// }

// export function pickTopOrOuter(items?: OutfitApiItem[]) {
//   return (
//     pickFirstByCategory(items, 'Tops') ??
//     pickFirstByCategory(items, 'Outerwear')
//   );
// }

////////////////////

// import {useCallback, useEffect, useRef, useState} from 'react';
// import {API_BASE_URL} from '../config/api';

// /**
//  * Shape of an item returned by the backend "outfits" endpoint.
//  */
// export type OutfitApiItem = {
//   index: number;
//   id: string;
//   label: string;
//   image_url?: string;
//   main_category?: string;
//   subcategory?: string;
//   color?: string;
//   color_family?: string;
//   shoe_style?: string;
//   dress_code?: string;
//   formality_score?: number;
// };

// export type OutfitApi = {
//   title: string;
//   items: OutfitApiItem[];
//   why: string;
//   missing?: string;
// };

// export type WardrobeItem = {
//   id: string;
//   image: string;
//   name: string;
//   mainCategory?: string;
//   subCategory?: string;
//   color?: string;
// };

// type WeatherContext = {
//   tempF: number;
//   precipitation?: 'none' | 'rain' | 'snow';
//   windMph?: number;
//   locationName?: string;
// };

// /** Backend UserStyle shape (do not change without backend update) */
// type UserStyle = {
//   preferredColors?: string[];
//   avoidColors?: string[];
//   preferredCategories?: string[];
//   avoidSubcategories?: string[];
//   favoriteBrands?: string[];
//   dressBias?: 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business';
// };

// /** Safe mapper: only uses fields we know you persist today */
// function mapStyleProfileToUserStyle(
//   styleProfile: any | undefined,
// ): UserStyle | undefined {
//   if (!styleProfile) return undefined;

//   const arr = (v: any) =>
//     Array.isArray(v) ? v.map(x => String(x)).filter(Boolean) : undefined;

//   const preferredColors = arr(styleProfile.favorite_colors);
//   const avoidSubcategories = arr(styleProfile.disliked_styles);
//   const favoriteBrands = arr(styleProfile.preferred_brands);

//   const out: UserStyle = {};
//   if (preferredColors?.length) out.preferredColors = preferredColors;
//   if (avoidSubcategories?.length) out.avoidSubcategories = avoidSubcategories;
//   if (favoriteBrands?.length) out.favoriteBrands = favoriteBrands;

//   return Object.keys(out).length ? out : undefined;
// }

// type GenerateOptions = {
//   topK?: number;
//   useWeather?: boolean;
//   weather?: WeatherContext;
//   styleProfile?: any; // raw style_profile object from your API
//   // weights?: {...} // if you want to expose server weights later
// };

// function resolveUri(u?: string) {
//   if (!u) return '';
//   if (/^https?:\/\//i.test(u)) return u;
//   const base = API_BASE_URL.replace(/\/+$/, '');
//   const path = u.replace(/^\/+/, '');
//   return `${base}/${path}`;
// }

// export function apiItemToUI(
//   item?: OutfitApiItem | null,
// ): WardrobeItem | undefined {
//   if (!item) return undefined;
//   const head = item.label ?? '';
//   const name =
//     head.split(' — ')[0]?.trim() ||
//     head.split(' - ')[0]?.trim() ||
//     item.subcategory ||
//     item.main_category ||
//     'Item';

//   return {
//     id: item.id,
//     image: resolveUri(item.image_url),
//     name,
//     mainCategory: item.main_category,
//     subCategory: item.subcategory,
//     color: item.color ?? item.color_family,
//   };
// }

// export function useOutfitApi(userId?: string) {
//   const [outfits, setOutfits] = useState<OutfitApi[]>([]);
//   const [selected, setSelected] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   const abortRef = useRef<AbortController | null>(null);

//   useEffect(() => {
//     return () => abortRef.current?.abort();
//   }, []);

//   /**
//    * regenerate(query, opts?)
//    * ------------------------
//    * Posts to /wardrobe/outfits with:
//    *  - user_id, query, topK
//    *  - useWeather (boolean)
//    *  - weather (object; ignored by server when useWeather=false)
//    *  - style_profile (mapped from styleProfile)
//    */
//   const regenerate = useCallback(
//     async (query: string, opts?: GenerateOptions) => {
//       if (!userId) return;

//       setLoading(true);
//       setErr(null);

//       try {
//         abortRef.current?.abort();
//         const ac = new AbortController();
//         abortRef.current = ac;

//         const body: any = {
//           user_id: userId,
//           query,
//           topK: opts?.topK ?? 20,
//           useWeather: opts?.useWeather ?? true, // caller should pass explicitly from UI
//           weather: opts?.weather,
//         };

//         const mappedStyle = mapStyleProfileToUserStyle(opts?.styleProfile);
//         if (mappedStyle) body.style_profile = mappedStyle;

//         // helpful debug
//         console.log('POST /wardrobe/outfits →', body);

//         const res = await fetch(`${API_BASE_URL}/wardrobe/outfits`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//           },
//           body: JSON.stringify(body),
//           signal: ac.signal,
//         });

//         if (!res.ok) {
//           throw new Error(`HTTP ${res.status} ${res.statusText}`);
//         }

//         const json = await res.json();
//         const arr: OutfitApi[] = Array.isArray(json?.outfits)
//           ? json.outfits
//           : [];

//         setOutfits(arr);
//         setSelected(0);
//       } catch (e: any) {
//         if (e?.name !== 'AbortError') {
//           setErr(e?.message || 'Failed to fetch outfits');
//         }
//       } finally {
//         abortRef.current = null;
//         setLoading(false);
//       }
//     },
//     [userId],
//   );

//   const current = outfits[selected];
//   const selectNext = () =>
//     setSelected(s => Math.min(s + 1, Math.max(0, outfits.length - 1)));
//   const selectPrev = () => setSelected(s => Math.max(s - 1, 0));

//   return {
//     outfits,
//     current,
//     selected,
//     setSelected,
//     loading,
//     error: err,
//     regenerate,
//     selectNext,
//     selectPrev,
//   };
// }

// export function pickFirstByCategory(
//   items: OutfitApiItem[] | undefined,
//   cat: string,
// ) {
//   if (!items?.length) return undefined;
//   return items.find(i => i.main_category === cat);
// }

// export function pickTopOrOuter(items?: OutfitApiItem[]) {
//   return (
//     pickFirstByCategory(items, 'Tops') ??
//     pickFirstByCategory(items, 'Outerwear')
//   );
// }
