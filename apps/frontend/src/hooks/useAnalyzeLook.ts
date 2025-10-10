import {useState, useCallback} from 'react';
import {API_BASE_URL} from '../config/api';

export function useAnalyzeLook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyzes an image (either a URL string or object with gsutil/public URLs)
   * and returns AI-generated tags.
   */
  const analyzeLook = useCallback(
    async (imageData: string | {publicUrl?: string; gsutilUri?: string}) => {
      setError(null);
      setLoading(true);

      try {
        const imageUrl =
          typeof imageData === 'string'
            ? imageData
            : imageData.gsutilUri || imageData.publicUrl;

        if (!imageUrl)
          throw new Error('Missing image URL or gsutilUri for analyzeLook');

        const res = await fetch(`${API_BASE_URL}/ai/analyze`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({imageUrl}), // ✅ backend expects this
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`AI analyze failed (${res.status}): ${text}`);
        }

        const data = await res.json();
        if (!data?.tags) throw new Error('No tags returned from AI analyze');
        return data; // Expected: { tags: string[] }
      } catch (err: any) {
        console.error('[useAnalyzeLook] ❌ Error:', err);
        setError(err.message || 'Analyze look failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {analyzeLook, loading, error};
}

///////////////

// import {useState} from 'react';
// import {API_BASE_URL} from '../config/api';

// export function useAnalyzeLook() {
//   const [loading, setLoading] = useState(false);

//   /**
//    * @param imageData Either a public URL or full upload response
//    * {
//    *   publicUrl: string;
//    *   gsutilUri: string;
//    * }
//    */
//   const analyzeLook = async (
//     imageData: string | {publicUrl: string; gsutilUri: string},
//   ) => {
//     try {
//       setLoading(true);

//       // ✅ Support both cases (string or full upload response)
//       const imageUrl =
//         typeof imageData === 'string'
//           ? imageData
//           : imageData.gsutilUri || imageData.publicUrl;

//       const res = await fetch(`${API_BASE_URL}/ai/analyze`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({imageUrl}), // ✅ sends gs:// when available
//       });

//       if (!res.ok) throw new Error(`AI analyze failed: ${res.status}`);
//       return await res.json(); // Expected: { tags: string[] }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {analyzeLook, loading};
// }

/////////////////

// import {useState} from 'react';
// import {API_BASE_URL} from '../config/api';

// export function useAnalyzeLook() {
//   const [loading, setLoading] = useState(false);

//   const analyzeLook = async (imageUrl: string) => {
//     try {
//       setLoading(true);

//       // ✅ Matches your AiController:
//       // @Post('analyze')
//       // analyze(@Body() body: { image_url: string })
//       const res = await fetch(`${API_BASE_URL}/ai/analyze`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({imageUrl}), // ✅ matches AiController
//       });
//       if (!res.ok) throw new Error(`AI analyze failed: ${res.status}`);
//       return await res.json(); // Expected: { tags: string[] }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {analyzeLook, loading};
// }
