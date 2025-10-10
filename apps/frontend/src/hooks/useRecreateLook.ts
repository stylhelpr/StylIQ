import {useState, useCallback} from 'react';
import {API_BASE_URL} from '../config/api';

export function useRecreateLook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calls backend to generate a new outfit suggestion from tags + image.
   * Accepts optional `image_url` for context (Vertex/Gemini visual prompt).
   * The backend automatically looks up gender_representation from Postgres.
   */
  const recreateLook = useCallback(
    async ({
      user_id,
      tags,
      image_url,
      user_gender, // optional override
    }: {
      user_id: string;
      tags: string[];
      image_url?: string;
      user_gender?: string;
    }) => {
      setError(null);
      setLoading(true);

      try {
        const safeTags =
          Array.isArray(tags) && tags.length > 0
            ? tags
            : ['modern', 'neutral', 'tailored'];

        const res = await fetch(`${API_BASE_URL}/ai/recreate`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            user_id,
            tags: safeTags,
            image_url,
            user_gender, // you can send it if known, backend handles fallback
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
        console.error('[useRecreateLook] ❌ Error:', err);
        setError(err.message || 'Recreate look failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {recreateLook, loading, error};
}

////////////////////

// import {useState, useCallback} from 'react';
// import {API_BASE_URL} from '../config/api';

// export function useRecreateLook() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   /**
//    * Calls backend to generate a new outfit suggestion from tags + image.
//    * Accepts optional `image_url` for context (Vertex/Gemini visual prompt).
//    */
//   const recreateLook = useCallback(
//     async ({
//       user_id,
//       tags,
//       image_url,
//     }: {
//       user_id: string;
//       tags: string[];
//       image_url?: string;
//     }) => {
//       setError(null);
//       setLoading(true);

//       try {
//         const safeTags =
//           Array.isArray(tags) && tags.length > 0
//             ? tags
//             : ['modern', 'neutral', 'tailored'];

//         const res = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({user_id, tags: safeTags, image_url}),
//         });

//         if (!res.ok) {
//           const text = await res.text();
//           throw new Error(`AI recreate failed (${res.status}): ${text}`);
//         }

//         const data = await res.json();

//         // ✅ Normalize backend schema for consistent client display
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
//     [],
//   );

//   return {recreateLook, loading, error};
// }

////////////////

// import {useState} from 'react';
// import {API_BASE_URL} from '../config/api';

// export function useRecreateLook() {
//   const [loading, setLoading] = useState(false);

//   /**
//    * Generates a recreated look from AI using existing wardrobe + tags.
//    * Will auto-handle empty tag arrays safely.
//    */
//   const recreateLook = async ({
//     user_id,
//     tags,
//   }: {
//     user_id: string;
//     tags: string[];
//   }) => {
//     try {
//       setLoading(true);

//       // ✅ Defensive: ensure tags is always an array
//       const safeTags =
//         Array.isArray(tags) && tags.length > 0
//           ? tags
//           : ['modern', 'neutral', 'tailored'];

//       const res = await fetch(`${API_BASE_URL}/ai/recreate`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id, tags: safeTags}),
//       });

//       if (!res.ok) throw new Error(`AI recreate failed: ${res.status}`);

//       const data = await res.json();

//       // ✅ Clean output structure from backend (Vertex → OpenAI fallback safe)
//       return {
//         outfit: data.outfit || [],
//         style_note: data.style_note || '',
//         user_id: data.user_id || user_id,
//       };
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {recreateLook, loading};
// }

///////////////////

// // useRecreateLook.ts
// import {useState} from 'react';
// import {API_BASE_URL} from '../config/api';

// export function useRecreateLook() {
//   const [loading, setLoading] = useState(false);

//   const recreateLook = async ({
//     user_id,
//     tags,
//   }: {
//     user_id: string;
//     tags: string[];
//   }) => {
//     try {
//       setLoading(true);
//       const res = await fetch(`${API_BASE_URL}/ai/recreate`, {
//         // ✅ hits OpenAI route
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id, tags}),
//       });
//       if (!res.ok) throw new Error(`AI recreate failed: ${res.status}`);
//       return await res.json(); // returns GPT-4o generated outfit JSON
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {recreateLook, loading};
// }
