// apps/mobile/src/hooks/useOutfitApi.ts

import {useCallback, useEffect, useRef, useState} from 'react';
import {API_BASE_URL} from '../config/api';

/**
 * Shape of an item returned by the backend "outfits" endpoint.
 * (These map closely to Pinecone metadata + server-side rerank output.)
 */
export type OutfitApiItem = {
  index: number; // position inside the server's reranked catalog
  id: string; // wardrobe item id (DB id)
  label: string; // human-readable summary line built on the server
  image_url?: string; // absolute or relative URL to the item's image
  main_category?: string; // Tops | Bottoms | Shoes | Outerwear | ...
  subcategory?: string; // e.g. "Chinos", "Loafers", "Blazer"
  color?: string;
  color_family?: string;
  shoe_style?: string;
  dress_code?: string;
  formality_score?: number;
};

/**
 * One outfit suggestion from the backend.
 * - items: subset of the reranked catalog the LLM picked for this look
 * - why: a short rationale from the model
 * - missing: optional note when a crucial slot doesn't exist in your closet
 */
export type OutfitApi = {
  title: string;
  items: OutfitApiItem[];
  why: string;
  missing?: string;
};

/**
 * Minimal UI-facing item used by the Explore screen cards.
 * We keep only what the cards need to render quickly.
 */
export type WardrobeItem = {
  id: string;
  image: string; // normalized, always absolute http(s) URL for <Image>
  name: string; // friendly display name
  mainCategory?: string;
  subCategory?: string;
  color?: string;
};

/**
 * Turn relative or malformed image paths into an absolute URL your <Image> can load.
 * - If it's already http(s), pass through.
 * - If it's relative, prefix with API_BASE_URL.
 */
function resolveUri(u?: string) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const base = API_BASE_URL.replace(/\/+$/, '');
  const path = u.replace(/^\/+/, '');
  return `${base}/${path}`;
}

/**
 * Convert a server OutfitApiItem into the lightweight WardrobeItem your UI needs.
 * - Derives a stable display name:
 *   1) before the em dash in `label`, or
 *   2) before a hyphen dash, or
 *   3) subcategory, main_category, or fallback "Item".
 * - Ensures image is an absolute URL via resolveUri.
 */
export function apiItemToUI(
  item?: OutfitApiItem | null,
): WardrobeItem | undefined {
  if (!item) return undefined;

  const head = item.label ?? '';

  // Name extraction is defensive: it supports both "—" and "-" separators.
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

/**
 * useOutfitApi
 * -------------
 * React hook that:
 *  - Calls your backend to generate outfit suggestions (via `regenerate`)
 *  - Tracks loading/error state
 *  - Holds a list of outfits and the currently selected one
 *  - Provides helpers to move to next/previous suggestion
 *
 * Usage:
 *   const { current, loading, error, regenerate } = useOutfitApi(userId);
 *   regenerate("business casual navy blazer");
 */
export function useOutfitApi(userId?: string) {
  const [outfits, setOutfits] = useState<OutfitApi[]>([]); // latest suggestions batch
  const [selected, setSelected] = useState(0); // index into `outfits`
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Keep a reference to the current request so we can cancel it if a new one starts
  const abortRef = useRef<AbortController | null>(null);

  // On unmount, abort any in-flight request to avoid setting state on an unmounted component
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /**
   * regenerate(query, topK?)
   * ------------------------
   * Posts { user_id, query, topK } to /wardrobe/outfits
   * - Cancels a previous call if one is in-flight (prevents race conditions)
   * - Sets loading spinner and clears old errors
   * - On success, saves outfits and resets selected index to 0
   */
  const regenerate = useCallback(
    async (query: string, topK = 25) => {
      if (!userId) return; // guard: do nothing without a user

      setLoading(true);
      setErr(null);

      try {
        // Cancel any existing call before starting a new one
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        const res = await fetch(`${API_BASE_URL}/wardrobe/outfits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({user_id: userId, query, topK}),
          signal: ac.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        // Expecting { outfits: OutfitApi[] }
        const json = await res.json();
        const arr: OutfitApi[] = Array.isArray(json?.outfits)
          ? json.outfits
          : [];

        setOutfits(arr);
        setSelected(0); // always show the first suggestion in the new batch
      } catch (e: any) {
        // Ignore aborts (they’re intentional), surface all other errors
        if (e?.name !== 'AbortError') {
          setErr(e?.message || 'Failed to fetch outfits');
        }
      } finally {
        // Release the abort controller and stop the spinner
        abortRef.current = null;
        setLoading(false);
      }
    },
    [userId],
  );

  // Convenience: the currently selected outfit (or undefined)
  const current = outfits[selected];

  // Helpers to move selection inside the current batch
  const selectNext = () =>
    setSelected(s => Math.min(s + 1, Math.max(0, outfits.length - 1)));
  const selectPrev = () => setSelected(s => Math.max(s - 1, 0));

  return {
    outfits, // full batch from the backend
    current, // the outfit the UI should render
    selected, // index into `outfits`
    setSelected, // allow the UI to jump to a specific card
    loading, // spinner state
    error: err, // error message (if any)
    regenerate, // trigger a new backend call with a query
    selectNext, // move cursor forward
    selectPrev, // move cursor backward
  };
}

/**
 * Utility: pick the first item in an outfit by main_category.
 * Useful for quickly pulling "Tops", "Bottoms", "Shoes" for the 3 cards.
 */
export function pickFirstByCategory(
  items: OutfitApiItem[] | undefined,
  cat: string,
) {
  if (!items?.length) return undefined;
  return items.find(i => i.main_category === cat);
}

/**
 * Utility: prefer a Top, but fall back to Outerwear if no Top selected.
 * Handy for UIs that always want to show "something" in the Top card.
 */
export function pickTopOrOuter(items?: OutfitApiItem[]) {
  return (
    pickFirstByCategory(items, 'Tops') ??
    pickFirstByCategory(items, 'Outerwear')
  );
}

//////////////////

// // apps/mobile/src/hooks/useOutfitApi.ts
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
//   // Defensive name extraction (supports em dash and plain dash)
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

//   // Abort any in-flight request on unmount
//   useEffect(() => {
//     return () => abortRef.current?.abort();
//   }, []);

//   const regenerate = useCallback(
//     async (query: string, topK = 25) => {
//       if (!userId) return;
//       setLoading(true);
//       setErr(null);

//       try {
//         // cancel any previous call
//         abortRef.current?.abort();
//         const ac = new AbortController();
//         abortRef.current = ac;

//         const res = await fetch(`${API_BASE_URL}/wardrobe/outfits`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//           },
//           body: JSON.stringify({user_id: userId, query, topK}),
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
