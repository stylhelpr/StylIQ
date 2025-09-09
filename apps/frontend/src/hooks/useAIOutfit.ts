import {useState, useCallback} from 'react';
import {API_BASE_URL} from '../config/api';

export type UiWardrobeItem = {
  id: string;
  image: string;
  name: string;
  mainCategory?: string;
  subCategory?: string;
  color?: string;
};

export type AiOutfit = {
  title: string;
  items: UiWardrobeItem[];
  why: string;
  missing?: string;
};

type ApiCatalogItem = {
  id: string;
  label: string;
  image_url?: string;
  main_category?: string;
  subcategory?: string;
  color?: string;
  color_family?: string;
  dress_code?: string;
  shoe_style?: string;
  formality_score?: number;
};

type ApiOutfit = {
  title: string;
  items: ApiCatalogItem[];
  why: string;
  missing?: string;
};
type ApiResponse = {outfits: ApiOutfit[]};

const toUiItem = (it: ApiCatalogItem): UiWardrobeItem => ({
  id: it.id,
  image: it.image_url ?? '',
  name: it.label?.split(' — ')[0] ?? 'Item',
  mainCategory: it.main_category,
  subCategory: it.subcategory,
  color: it.color ?? it.color_family,
});

type UserStyle = {
  preferredColors?: string[];
  avoidColors?: string[];
  preferredCategories?: string[];
  avoidSubcategories?: string[];
  favoriteBrands?: string[];
  dressBias?: 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business';
};

function mapStyleProfileToUserStyle(
  styleProfile: any | undefined,
): UserStyle | undefined {
  if (!styleProfile) return undefined;

  const arr = (v: any) =>
    Array.isArray(v) ? v.map(x => String(x)).filter(Boolean) : undefined;

  const preferredColors = arr(styleProfile.favorite_colors);
  const avoidSubcategories = arr(styleProfile.disliked_styles);
  const favoriteBrands = arr(styleProfile.preferred_brands);

  const out: UserStyle = {};
  if (preferredColors?.length) out.preferredColors = preferredColors;
  if (avoidSubcategories?.length) out.avoidSubcategories = avoidSubcategories;
  if (favoriteBrands?.length) out.favoriteBrands = favoriteBrands;

  return Object.keys(out).length ? out : undefined;
}

export function useAIOutfit(userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outfits, setOutfits] = useState<AiOutfit[]>([]);

  const generate = useCallback(
    async (query: string, opts?: {topK?: number; styleProfile?: any}) => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const body: any = {
          user_id: userId,
          query,
          topK: opts?.topK ?? 25,
        };

        const mappedStyle = mapStyleProfileToUserStyle(opts?.styleProfile);
        if (mappedStyle) body.style_profile = mappedStyle;

        console.log('POST /wardrobe/outfits →', body);
        console.log(
          'POST /wardrobe/outfits → style_profile:',
          body.style_profile,
        );

        const res = await fetch(`${API_BASE_URL}/wardrobe/outfits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json: ApiResponse = await res.json();

        const mapped: AiOutfit[] = (json?.outfits ?? []).map(o => ({
          title: o.title,
          items: (o.items ?? []).map(toUiItem),
          why: o.why,
          missing: o.missing,
        }));
        setOutfits(mapped);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to generate outfit');
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  return {loading, error, outfits, generate};
}

////////////////////

// import {useState, useCallback} from 'react';
// import {API_BASE_URL} from '../config/api';

// export type UiWardrobeItem = {
//   id: string;
//   image: string;
//   name: string;
//   mainCategory?: string;
//   subCategory?: string;
//   color?: string;
// };

// export type AiOutfit = {
//   title: string;
//   items: UiWardrobeItem[];
//   why: string;
//   missing?: string;
// };

// type ApiCatalogItem = {
//   id: string;
//   label: string;
//   image_url?: string;
//   main_category?: string;
//   subcategory?: string;
//   color?: string;
//   color_family?: string;
//   dress_code?: string;
//   shoe_style?: string;
//   formality_score?: number;
// };

// type ApiOutfit = {
//   title: string;
//   items: ApiCatalogItem[];
//   why: string;
//   missing?: string;
// };
// type ApiResponse = {outfits: ApiOutfit[]};

// const toUiItem = (it: ApiCatalogItem): UiWardrobeItem => ({
//   id: it.id,
//   image: it.image_url ?? '',
//   name: it.label?.split(' — ')[0] ?? 'Item',
//   mainCategory: it.main_category,
//   subCategory: it.subcategory,
//   color: it.color ?? it.color_family,
// });

// type UserStyle = {
//   preferredColors?: string[];
//   avoidColors?: string[];
//   preferredCategories?: string[];
//   avoidSubcategories?: string[];
//   favoriteBrands?: string[];
//   dressBias?: 'Casual' | 'SmartCasual' | 'BusinessCasual' | 'Business';
//   genderPresentation?: 'male' | 'female';
// };

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

//   // 👇 Accept multiple keys coming from DB/API
//   const rawGender =
//     styleProfile.genderPresentation ??
//     styleProfile.gender_presentation ??
//     styleProfile.gender ??
//     styleProfile.sex ??
//     styleProfile.preferred_gender ??
//     styleProfile.preferredGender;

//   if (rawGender) {
//     const g = String(rawGender).toLowerCase();
//     if (g.startsWith('m')) out.genderPresentation = 'male';
//     if (g.startsWith('f')) out.genderPresentation = 'female';
//   }

//   return Object.keys(out).length ? out : undefined;
// }

// export function useAIOutfit(userId?: string) {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [outfits, setOutfits] = useState<AiOutfit[]>([]);

//   const generate = useCallback(
//     async (query: string, opts?: {topK?: number; styleProfile?: any}) => {
//       if (!userId) return;
//       setLoading(true);
//       setError(null);
//       try {
//         const body: any = {
//           user_id: userId,
//           query,
//           topK: opts?.topK ?? 25,
//         };

//         const mappedStyle = mapStyleProfileToUserStyle(opts?.styleProfile);
//         if (mappedStyle) body.style_profile = mappedStyle;

//         console.log('POST /wardrobe/outfits →', body);
//         console.log(
//           'POST /wardrobe/outfits → style_profile:',
//           body.style_profile,
//         );

//         const res = await fetch(`${API_BASE_URL}/wardrobe/outfits`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//           },
//           body: JSON.stringify(body),
//         });
//         if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
//         const json: ApiResponse = await res.json();

//         const mapped: AiOutfit[] = (json?.outfits ?? []).map(o => ({
//           title: o.title,
//           items: (o.items ?? []).map(toUiItem),
//           why: o.why,
//           missing: o.missing,
//         }));
//         setOutfits(mapped);
//       } catch (e: any) {
//         setError(e?.message ?? 'Failed to generate outfit');
//       } finally {
//         setLoading(false);
//       }
//     },
//     [userId],
//   );

//   return {loading, error, outfits, generate};
// }

/////////////////////

// import {useState, useCallback} from 'react';
// import {API_BASE_URL} from '../config/api';

// export type UiWardrobeItem = {
//   id: string;
//   image: string;
//   name: string;
//   mainCategory?: string;
//   subCategory?: string;
//   color?: string;
//   // add fields as needed by your UI
// };

// export type AiOutfit = {
//   title: string;
//   items: UiWardrobeItem[];
//   why: string;
//   missing?: string;
// };

// type ApiCatalogItem = {
//   id: string;
//   label: string;
//   image_url?: string;
//   main_category?: string;
//   subcategory?: string;
//   color?: string;
//   color_family?: string;
//   dress_code?: string;
//   shoe_style?: string;
//   formality_score?: number;
// };

// type ApiOutfit = {
//   title: string;
//   items: ApiCatalogItem[];
//   why: string;
//   missing?: string;
// };
// type ApiResponse = {outfits: ApiOutfit[]};

// const toUiItem = (it: ApiCatalogItem): UiWardrobeItem => ({
//   id: it.id,
//   image: it.image_url ?? '',
//   // quick name from label before “ — ”
//   name: it.label?.split(' — ')[0] ?? 'Item',
//   mainCategory: it.main_category,
//   subCategory: it.subcategory,
//   color: it.color ?? it.color_family,
// });

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

//   // Only include keys that have values; avoid sending empty arrays.
//   const out: UserStyle = {};
//   if (preferredColors?.length) out.preferredColors = preferredColors;
//   if (avoidSubcategories?.length) out.avoidSubcategories = avoidSubcategories;
//   if (favoriteBrands?.length) out.favoriteBrands = favoriteBrands;

//   return Object.keys(out).length ? out : undefined;
// }

// export function useAIOutfit(userId?: string) {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [outfits, setOutfits] = useState<AiOutfit[]>([]);

//   /**
//    * generate(query, opts?)
//    * opts:
//    *  - topK?: number
//    *  - styleProfile?: any (raw style_profile row from your API)
//    */
//   const generate = useCallback(
//     async (query: string, opts?: {topK?: number; styleProfile?: any}) => {
//       if (!userId) return;
//       setLoading(true);
//       setError(null);
//       try {
//         const body: any = {
//           user_id: userId,
//           query,
//           topK: opts?.topK ?? 25,
//         };

//         const mappedStyle = mapStyleProfileToUserStyle(opts?.styleProfile);
//         if (mappedStyle) body.style_profile = mappedStyle;

//         // Debug
//         console.log('POST /wardrobe/outfits →', body);

//         const res = await fetch(`${API_BASE_URL}/wardrobe/outfits`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Accept: 'application/json',
//           },
//           body: JSON.stringify(body),
//         });
//         if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
//         const json: ApiResponse = await res.json();

//         const mapped: AiOutfit[] = (json?.outfits ?? []).map(o => ({
//           title: o.title,
//           items: (o.items ?? []).map(toUiItem),
//           why: o.why,
//           missing: o.missing,
//         }));
//         setOutfits(mapped);
//       } catch (e: any) {
//         setError(e?.message ?? 'Failed to generate outfit');
//       } finally {
//         setLoading(false);
//       }
//     },
//     [userId],
//   );

//   return {loading, error, outfits, generate};
// }
