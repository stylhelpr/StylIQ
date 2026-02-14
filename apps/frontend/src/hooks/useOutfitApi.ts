import {useCallback, useEffect, useRef, useState} from 'react';
import {API_BASE_URL} from '../config/api';
import {getAccessToken} from '../utils/auth';
import {findBySlot, type Slot} from '../lib/categoryMapping';

/**
 * Investor / AAA quality gate.
 * When true, ALL outfit requests force the standard (Gemini Pro) pipeline
 * with temperature 0.4 — regardless of useFastMode from the caller.
 * Flip to `true` for investor demos; `false` for normal production.
 */
export const AAAA_MODE_ENABLED = true;
// export const AAAA_MODE_ENABLED = false;

export type OutfitApiItem = {
  index: number;
  id: string;
  label: string;
  image?: string; // computed best: touched_up > processed > original
  image_url?: string; // original uploaded image
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

type Weights = {
  constraintsWeight: number;
  styleWeight: number;
  weatherWeight: number;
};

export type GenerateOptions = {
  topK: number;
  useWeather?: boolean;
  weather?: any;
  styleProfile?: any;
  useStyle?: boolean;
  weights?: any;
  useFeedback?: boolean;
  styleAgent?: string | null;
  sessionId?: string;
  refinementPrompt?: string;
  lockedItemIds?: string[];
  useFastMode?: boolean; // 🚀 Use fast architecture (Flash + backend retrieval)
  aaaaMode?: boolean; // 🎯 Force standard mode + max quality settings
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
    image: resolveUri(item.image || item.image_url),
    name,
    mainCategory: item.main_category,
    subCategory: item.subcategory,
    color: item.color ?? item.color_family,
  };
}

function toStringArray(x: any): string[] | undefined {
  if (!x && x !== '') return undefined;
  if (Array.isArray(x))
    return (
      x
        .map(String)
        .map(s => s.trim())
        .filter(Boolean) || undefined
    );
  const arr = String(x)
    .trim()
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

  useEffect(() => () => abortRef.current?.abort(), []);

  const regenerate = useCallback(
    async (query: string, opts?: GenerateOptions) => {
      console.log('[useOutfitApi.regenerate] Called with query:', query, 'userId:', userId);
      if (!userId) {
        console.log('[useOutfitApi.regenerate] No userId, returning early');
        return;
      }

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

        const isAaaa = AAAA_MODE_ENABLED || opts?.aaaaMode;
        const body: any = {
          user_id: userId,
          query,
          topK: opts?.topK ?? 20,
          useWeather: opts?.useWeather ?? true,
          weather: opts?.weather,
          useFastMode: isAaaa ? false : (opts?.useFastMode ?? true), // 🎯 aaaaMode forces standard
          ...(isAaaa ? { aaaaMode: true } : {}),
        };

        if (opts?.styleAgent) {
          body.styleAgent = opts.styleAgent;
        }

        if (opts?.useFeedback !== undefined) {
          body.useFeedback = opts.useFeedback;
        }

        // 🔥 NEW for refinement sessions
        if (opts?.sessionId) body.session_id = opts.sessionId;
        if (opts?.refinementPrompt)
          body.refinementPrompt = opts.refinementPrompt;

        // // 👇 NEW — pass locked items if present
        // if (opts?.lockedItemIds?.length) {
        //   body.locked_item_ids = opts.lockedItemIds;
        // }

        if (opts?.lockedItemIds?.length) {
          body.lockedItemIds = opts.lockedItemIds; // ✅ camelCase matches backend
          console.log('[useOutfitApi] Sending lockedItemIds to backend:', opts.lockedItemIds);
        }

        // 👇 add this
        if (opts?.styleAgent) {
          body.styleAgent = opts.styleAgent;
        }

        // 👇 only include when explicitly passed
        if (opts?.useFeedback !== undefined) {
          body.useFeedback = opts.useFeedback;
        }

        if (useStyle && style_payload) {
          body.style_profile = style_payload;
        }

        if (opts?.weights) {
          const w = {...opts.weights};
          if (!useStyle) w.styleWeight = 0.0;
          if (!body.useWeather) w.weatherWeight = 0.0;
          body.weights = w;
        } else if (!useStyle) {
          body.weights = {
            constraintsWeight: 1.0,
            styleWeight: 0.0,
            weatherWeight: body.useWeather ? 0.8 : 0.0,
          };
        }

        const accessToken = await getAccessToken();
        const res = await fetch(`${API_BASE_URL}/wardrobe/outfits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
          signal: ac.signal,
        });

        if (!res.ok) {
          console.log('[useOutfitApi] HTTP error:', res.status, res.statusText);
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        console.log('[useOutfitApi] Response received:', {
          hasOutfits: !!json?.outfits,
          outfitCount: json?.outfits?.length,
          firstOutfitItems: json?.outfits?.[0]?.items?.length,
        });
        const arr: OutfitApi[] = Array.isArray(json?.outfits)
          ? json.outfits
          : [];
        setOutfits(arr);
        setSelected(0);
      } catch (e: any) {
        console.log('[useOutfitApi] Error caught:', e?.name, e?.message);
        if (e?.name !== 'AbortError')
          setErr(e?.message || 'Failed to fetch outfits');
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
  const clear = useCallback(() => {
    setOutfits([]);
    setSelected(0);
    setErr(null);
  }, []);

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
    clear,
  };
}

/**
 * Pick first item matching a slot.
 * Uses canonical slot mapping - e.g., 'bottoms' includes both Bottoms and Skirts.
 */
export function pickFirstBySlot(
  items: OutfitApiItem[] | undefined,
  slot: Slot,
) {
  if (!items?.length) return undefined;
  return findBySlot(items, slot);
}

/**
 * @deprecated Use pickFirstBySlot instead for slot-based lookups.
 * This function is kept for backward compatibility but uses canonical mapping internally.
 */
export function pickFirstByCategory(
  items: OutfitApiItem[] | undefined,
  cat: string,
) {
  if (!items?.length) return undefined;
  // Map category string to slot for canonical lookup
  const slotMap: Record<string, Slot> = {
    Tops: 'tops',
    Bottoms: 'bottoms',
    Shoes: 'shoes',
    Outerwear: 'outerwear',
    Accessories: 'accessories',
    Dresses: 'dresses',
    Activewear: 'activewear',
    Swimwear: 'swimwear',
  };
  const slot = slotMap[cat];
  if (slot) {
    return findBySlot(items, slot);
  }
  // Fallback: exact category match for unmapped categories
  return items.find(i => i.main_category === cat);
}

export function pickTopOrOuter(items?: OutfitApiItem[]) {
  return pickFirstBySlot(items, 'tops') ?? pickFirstBySlot(items, 'outerwear');
}

////////////////////

// import {useCallback, useEffect, useRef, useState} from 'react';
// import {API_BASE_URL} from '../config/api';

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

// type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

// export type GenerateOptions = {
//   topK: number;
//   useWeather?: boolean;
//   weather?: any;
//   styleProfile?: any;
//   useStyle?: boolean;
//   weights?: any;
//   useFeedback?: boolean;
//   styleAgent?: string | null;
//   sessionId?: string;
//   refinementPrompt?: string;
//   lockedItemIds?: string[]; // 👈 NEW
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

// function toStringArray(x: any): string[] | undefined {
//   if (!x && x !== '') return undefined;
//   if (Array.isArray(x))
//     return (
//       x
//         .map(String)
//         .map(s => s.trim())
//         .filter(Boolean) || undefined
//     );
//   const arr = String(x)
//     .trim()
//     .split(/[,|]/g)
//     .map(t => t.trim())
//     .filter(Boolean);
//   return arr.length ? arr : undefined;
// }

// function mapStyleProfileToUserStyle(raw: any): UserStylePayload | undefined {
//   if (!raw || typeof raw !== 'object') return undefined;
//   const preferredColors = toStringArray(raw.favorite_colors);
//   const favoriteBrands = toStringArray(raw.preferred_brands);

//   const out: UserStylePayload = {};
//   if (preferredColors) out.preferredColors = preferredColors;
//   if (favoriteBrands) out.favoriteBrands = favoriteBrands;

//   return Object.keys(out).length ? out : undefined;
// }

// export function useOutfitApi(userId?: string) {
//   const [outfits, setOutfits] = useState<OutfitApi[]>([]);
//   const [selected, setSelected] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   const abortRef = useRef<AbortController | null>(null);

//   useEffect(() => () => abortRef.current?.abort(), []);

//   const regenerate = useCallback(
//     async (query: string, opts?: GenerateOptions) => {
//       if (!userId) return;

//       setLoading(true);
//       setErr(null);

//       try {
//         abortRef.current?.abort();
//         const ac = new AbortController();
//         abortRef.current = ac;

//         const useStyle = opts?.useStyle ?? true;
//         const style_payload = useStyle
//           ? mapStyleProfileToUserStyle(opts?.styleProfile)
//           : undefined;

//         const body: any = {
//           user_id: userId,
//           query,
//           topK: opts?.topK ?? 20,
//           useWeather: opts?.useWeather ?? true,
//           weather: opts?.weather,
//         };

//         if (opts?.styleAgent) {
//           body.styleAgent = opts.styleAgent;
//         }

//         if (opts?.useFeedback !== undefined) {
//           body.useFeedback = opts.useFeedback;
//         }

//         // 🔥 NEW for refinement sessions
//         if (opts?.sessionId) body.session_id = opts.sessionId;
//         if (opts?.refinementPrompt)
//           body.refinementPrompt = opts.refinementPrompt;

//         // 👇 NEW — pass locked items if present
//         if (opts?.lockedItemIds?.length) {
//           body.locked_item_ids = opts.lockedItemIds;
//         }

//         // 👇 add this
//         if (opts?.styleAgent) {
//           body.styleAgent = opts.styleAgent;
//         }

//         // 👇 only include when explicitly passed
//         if (opts?.useFeedback !== undefined) {
//           body.useFeedback = opts.useFeedback;
//         }

//         if (useStyle && style_payload) {
//           body.style_profile = style_payload;
//         }

//         if (opts?.weights) {
//           const w = {...opts.weights};
//           if (!useStyle) w.styleWeight = 0.0;
//           if (!body.useWeather) w.weatherWeight = 0.0;
//           body.weights = w;
//         } else if (!useStyle) {
//           body.weights = {
//             constraintsWeight: 1.0,
//             styleWeight: 0.0,
//             weatherWeight: body.useWeather ? 0.8 : 0.0,
//           };
//         }

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

//         if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

//         const json = await res.json();
//         const arr: OutfitApi[] = Array.isArray(json?.outfits)
//           ? json.outfits
//           : [];
//         setOutfits(arr);
//         setSelected(0);
//       } catch (e: any) {
//         if (e?.name !== 'AbortError')
//           setErr(e?.message || 'Failed to fetch outfits');
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

/////////////////////

// import {useCallback, useEffect, useRef, useState} from 'react';
// import {API_BASE_URL} from '../config/api';

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

// type Weights = {
//   constraintsWeight: number;
//   styleWeight: number;
//   weatherWeight: number;
// };

// export type GenerateOptions = {
//   topK: number;
//   useWeather?: boolean;
//   weather?: any;
//   styleProfile?: any;
//   useStyle?: boolean;
//   weights?: any;
//   useFeedback?: boolean;
//   styleAgent?: string | null;
//   sessionId?: string;
//   refinementPrompt?: string;
//   lockedItemIds?: string[]; // 👈 NEW
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

// function toStringArray(x: any): string[] | undefined {
//   if (!x && x !== '') return undefined;
//   if (Array.isArray(x))
//     return (
//       x
//         .map(String)
//         .map(s => s.trim())
//         .filter(Boolean) || undefined
//     );
//   const arr = String(x)
//     .trim()
//     .split(/[,|]/g)
//     .map(t => t.trim())
//     .filter(Boolean);
//   return arr.length ? arr : undefined;
// }

// function mapStyleProfileToUserStyle(raw: any): UserStylePayload | undefined {
//   if (!raw || typeof raw !== 'object') return undefined;
//   const preferredColors = toStringArray(raw.favorite_colors);
//   const favoriteBrands = toStringArray(raw.preferred_brands);

//   const out: UserStylePayload = {};
//   if (preferredColors) out.preferredColors = preferredColors;
//   if (favoriteBrands) out.favoriteBrands = favoriteBrands;

//   return Object.keys(out).length ? out : undefined;
// }

// export function useOutfitApi(userId?: string) {
//   const [outfits, setOutfits] = useState<OutfitApi[]>([]);
//   const [selected, setSelected] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   const abortRef = useRef<AbortController | null>(null);

//   useEffect(() => () => abortRef.current?.abort(), []);

//   const regenerate = useCallback(
//     async (query: string, opts?: GenerateOptions) => {
//       if (!userId) return;

//       setLoading(true);
//       setErr(null);

//       try {
//         abortRef.current?.abort();
//         const ac = new AbortController();
//         abortRef.current = ac;

//         const useStyle = opts?.useStyle ?? true;
//         const style_payload = useStyle
//           ? mapStyleProfileToUserStyle(opts?.styleProfile)
//           : undefined;

//         const body: any = {
//           user_id: userId,
//           query,
//           topK: opts?.topK ?? 20,
//           useWeather: opts?.useWeather ?? true,
//           weather: opts?.weather,
//         };

//         if (opts?.styleAgent) {
//           body.styleAgent = opts.styleAgent;
//         }

//         if (opts?.useFeedback !== undefined) {
//           body.useFeedback = opts.useFeedback;
//         }

//         // 🔥 NEW for refinement sessions
//         if (opts?.sessionId) body.session_id = opts.sessionId;
//         if (opts?.refinementPrompt)
//           body.refinementPrompt = opts.refinementPrompt;

//         // 👇 add this
//         if (opts?.styleAgent) {
//           body.styleAgent = opts.styleAgent;
//         }

//         // 👇 only include when explicitly passed
//         if (opts?.useFeedback !== undefined) {
//           body.useFeedback = opts.useFeedback;
//         }

//         if (useStyle && style_payload) {
//           body.style_profile = style_payload;
//         }

//         if (opts?.weights) {
//           const w = {...opts.weights};
//           if (!useStyle) w.styleWeight = 0.0;
//           if (!body.useWeather) w.weatherWeight = 0.0;
//           body.weights = w;
//         } else if (!useStyle) {
//           body.weights = {
//             constraintsWeight: 1.0,
//             styleWeight: 0.0,
//             weatherWeight: body.useWeather ? 0.8 : 0.0,
//           };
//         }

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

//         if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

//         const json = await res.json();
//         const arr: OutfitApi[] = Array.isArray(json?.outfits)
//           ? json.outfits
//           : [];
//         setOutfits(arr);
//         setSelected(0);
//       } catch (e: any) {
//         if (e?.name !== 'AbortError')
//           setErr(e?.message || 'Failed to fetch outfits');
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
