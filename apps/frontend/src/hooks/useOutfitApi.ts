// apps/mobile/src/hooks/useOutfitApi.ts
import {useCallback, useEffect, useRef, useState} from 'react';
import {API_BASE_URL} from '../config/api';

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
  // Defensive name extraction (supports em dash and plain dash)
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

export function useOutfitApi(userId?: string) {
  const [outfits, setOutfits] = useState<OutfitApi[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(
    async (query: string, topK = 25) => {
      if (!userId) return;
      setLoading(true);
      setErr(null);

      try {
        // cancel any previous call
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

///////////////////

// // apps/mobile/src/hooks/useOutfitApi.ts
// import {useCallback, useMemo, useRef, useState} from 'react';
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
//   const name =
//     item.label?.split(' — ')[0]?.trim() ||
//     item.subcategory ||
//     item.main_category ||
//     'Item';
//   return {
//     id: item.id,
//     image: resolveUri(item.image_url),
//     name,
//     mainCategory: item.main_category,
//     subCategory: item.subcategory,
//     color: item.color,
//   };
// }

// export function useOutfitApi(userId?: string) {
//   const [outfits, setOutfits] = useState<OutfitApi[]>([]);
//   const [selected, setSelected] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);
//   const abortRef = useRef<AbortController | null>(null);

//   const regenerate = useCallback(
//     async (query: string, topK = 25) => {
//       if (!userId) return;
//       setLoading(true);
//       setErr(null);
//       try {
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
//         setLoading(false);
//       }
//     },
//     [userId],
//   );

//   const current = outfits[selected];

//   return {
//     outfits,
//     current,
//     selected,
//     setSelected,
//     loading,
//     error: err,
//     regenerate,
//   };
// }

// export function pickFirstByCategory(
//   items: OutfitApiItem[] | undefined,
//   cat: string,
// ) {
//   if (!items?.length) return undefined;
//   return items.find(i => i.main_category === cat);
// }
