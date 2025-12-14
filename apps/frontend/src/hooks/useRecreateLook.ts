import {useState, useCallback} from 'react';
import {API_BASE_URL} from '../config/api';
import {useAnalyzeLook} from './useAnalyzeLook';

/* ------------------------------------ */
/* 🔷 Shared Type Definitions           */
/* ------------------------------------ */

export interface PersonalizedResult {
  recreated_outfit?: {
    source?: string;
    category?: string;
    item?: string;
    color?: string;
    fit?: string;
  }[];
  suggested_purchases?: {
    brand?: string;
    category?: string;
    color?: string;
    item?: string;
    material?: string;
    shopUrl?: string;
    previewImage?: string;
    previewBrand?: string;
    previewPrice?: string;
  }[];
  style_note?: string;
  tags?: string[];
  [key: string]: any;
}

export interface StandardResult {
  outfit: any[];
  style_note: string;
  recommendations: any[];
  user_id: string;
}

/* ------------------------------------ */
/* 🧠 Hook Implementation               */
/* ------------------------------------ */

export function useRecreateLook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {analyzeLook} = useAnalyzeLook();

  /**
   * Standard AI recreate (non-personalized)
   */
  const recreateLook = useCallback(
    async ({
      user_id,
      tags = [],
      image_url,
      user_gender,
    }: {
      user_id: string;
      tags?: string[];
      image_url?: string;
      user_gender?: string;
    }): Promise<StandardResult> => {
      setError(null);
      setLoading(true);

      try {
        // 🔍 Step 1: Analyze image for AI tags
        let aiTags: string[] = [];
        if (image_url) {
          try {
            const analysis = await analyzeLook(image_url);
            aiTags = analysis?.tags || [];
          } catch {
            // analyzeLook failed → fallback tags
          }
        }

        // 🧠 Step 2: Merge + weight tags
        const merged = [
          user_gender || 'unisex',
          ...(aiTags.length > 0 ? aiTags : tags.length > 0 ? tags : []),
        ];

        const weighted = merged.flatMap(t => {
          const x = t.toLowerCase();
          if (/(flannel|wool|linen|denim|corduroy)/.test(x)) return [x, x, x];
          if (/(plaid|striped|solid|check|herringbone)/.test(x)) return [x, x];
          if (/(tailored|relaxed|oversized|fitted)/.test(x)) return [x, x];
          return [x];
        });

        const safeTags = Array.from(new Set(weighted)).filter(Boolean);

        // 🪄 Step 3: Backend call
        const res = await fetch(`${API_BASE_URL}/ai/recreate`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            user_id,
            tags: safeTags,
            image_url,
            user_gender,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`AI recreate failed (${res.status}): ${text}`);
        }

        const data = await res.json();

        return {
          outfit: data.outfit ?? [],
          style_note: data.style_note ?? '',
          recommendations: data.recommendations ?? [],
          user_id: data.user_id ?? user_id,
        };
      } catch (err: any) {
        setError(err.message || 'Recreate look failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [analyzeLook],
  );

  /**
   * 🧬 Personalized recreation — wardrobe + preferences aware
   */
  const personalizedRecreate = useCallback(
    async ({
      user_id,
      image_url,
      user_gender,
    }: {
      user_id: string;
      image_url: string;
      user_gender?: string;
    }): Promise<PersonalizedResult> => {
      setError(null);
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE_URL}/ai/personalized-shop`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({user_id, image_url, gender: user_gender}),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            `Personalized recreate failed (${res.status}): ${text}`,
          );
        }

        const data: any = await res.json();

        // 🔧 Normalize both snake_case and camelCase from backend
        const recreated_outfit =
          data.recreated_outfit ?? data.recreatedOutfit ?? data.outfit ?? [];
        const suggested_purchases =
          data.suggested_purchases ??
          data.suggestedPurchases ??
          data.purchases ??
          [];
        const style_note = data.style_note ?? data.styleNote ?? '';
        const tags = data.tags ?? [];

        return {recreated_outfit, suggested_purchases, style_note, tags};
      } catch (err: any) {
        setError(err.message || 'Personalized recreate failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {recreateLook, personalizedRecreate, loading, error};
}

/////////////////////

// import {useState, useCallback} from 'react';
// import {API_BASE_URL} from '../config/api';
// import {useAnalyzeLook} from './useAnalyzeLook';

// /* ------------------------------------ */
// /* 🔷 Shared Type Definitions           */
// /* ------------------------------------ */

// export interface PersonalizedResult {
//   recreated_outfit?: {
//     source?: string;
//     category?: string;
//     item?: string;
//     color?: string;
//     fit?: string;
//   }[];
//   suggested_purchases?: {
//     brand?: string;
//     category?: string;
//     color?: string;
//     item?: string;
//     material?: string;
//     shopUrl?: string;
//     previewImage?: string;
//     previewBrand?: string;
//     previewPrice?: string;
//   }[];
//   style_note?: string;
//   tags?: string[];
//   [key: string]: any;
// }

// export interface StandardResult {
//   outfit: any[];
//   style_note: string;
//   recommendations: any[];
//   user_id: string;
// }

// /* ------------------------------------ */
// /* 🧠 Hook Implementation               */
// /* ------------------------------------ */

// export function useRecreateLook() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const {analyzeLook} = useAnalyzeLook();

//   /**
//    * Standard AI recreate (non-personalized)
//    */
//   const recreateLook = useCallback(
//     async ({
//       user_id,
//       tags = [],
//       image_url,
//       user_gender,
//     }: {
//       user_id: string;
//       tags?: string[];
//       image_url?: string;
//       user_gender?: string;
//     }): Promise<StandardResult> => {
//       setError(null);
//       setLoading(true);

//       try {
//         // 🔍 Step 1: Analyze image for AI tags
//         let aiTags: string[] = [];
//         if (image_url) {
//           try {
//             const analysis = await analyzeLook(image_url);
//             aiTags = analysis?.tags || [];
//             console.log('[useRecreateLook] AI tags:', aiTags);
//           } catch {
//             console.warn(
//               '[useRecreateLook] analyzeLook failed → fallback tags',
//             );
//           }
//         }

//         // 🧠 Step 2: Merge + weight tags
//         const merged = [
//           user_gender || 'unisex',
//           ...(aiTags.length > 0 ? aiTags : tags.length > 0 ? tags : []),
//         ];

//         const weighted = merged.flatMap(t => {
//           const x = t.toLowerCase();
//           if (/(flannel|wool|linen|denim|corduroy)/.test(x)) return [x, x, x];
//           if (/(plaid|striped|solid|check|herringbone)/.test(x)) return [x, x];
//           if (/(tailored|relaxed|oversized|fitted)/.test(x)) return [x, x];
//           return [x];
//         });

//         const safeTags = Array.from(new Set(weighted)).filter(Boolean);
//         console.log('[useRecreateLook] Final tag set →', safeTags);

//         // 🪄 Step 3: Backend call
//         const res = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id,
//             tags: safeTags,
//             image_url,
//             user_gender,
//           }),
//         });

//         if (!res.ok) {
//           const text = await res.text();
//           throw new Error(`AI recreate failed (${res.status}): ${text}`);
//         }

//         const data = await res.json();

//         return {
//           outfit: data.outfit ?? [],
//           style_note: data.style_note ?? '',
//           recommendations: data.recommendations ?? [],
//           user_id: data.user_id ?? user_id,
//         };
//       } catch (err: any) {
//         console.error('[useRecreateLook] ❌ Error:', err);
//         setError(err.message || 'Recreate look failed');
//         throw err;
//       } finally {
//         setLoading(false);
//       }
//     },
//     [analyzeLook],
//   );

//   /**
//    * 🧬 Personalized recreation — wardrobe + preferences aware
//    */
//   const personalizedRecreate = useCallback(
//     async ({
//       user_id,
//       image_url,
//       user_gender,
//     }: {
//       user_id: string;
//       image_url: string;
//       user_gender?: string;
//     }): Promise<PersonalizedResult> => {
//       setError(null);
//       setLoading(true);

//       try {
//         console.log('💎 [useRecreateLook] personalizedRecreate() start');

//         const res = await fetch(`${API_BASE_URL}/ai/personalized-shop`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({user_id, image_url, gender: user_gender}),
//         });

//         if (!res.ok) {
//           const text = await res.text();
//           throw new Error(
//             `Personalized recreate failed (${res.status}): ${text}`,
//           );
//         }

//         const data: any = await res.json();
//         console.log('💎 [useRecreateLook] personalized result:', data);

//         // 🔧 Normalize both snake_case and camelCase from backend
//         const recreated_outfit =
//           data.recreated_outfit ?? data.recreatedOutfit ?? data.outfit ?? [];
//         const suggested_purchases =
//           data.suggested_purchases ??
//           data.suggestedPurchases ??
//           data.purchases ??
//           [];
//         const style_note = data.style_note ?? data.styleNote ?? '';
//         const tags = data.tags ?? [];

//         return {recreated_outfit, suggested_purchases, style_note, tags};
//       } catch (err: any) {
//         console.error('[useRecreateLook] ❌ Personalized error:', err);
//         setError(err.message || 'Personalized recreate failed');
//         throw err;
//       } finally {
//         setLoading(false);
//       }
//     },
//     [],
//   );

//   return {recreateLook, personalizedRecreate, loading, error};
// }
