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

        console.log('[useAnalyzeLook] 🔍 called');
        console.log('[useAnalyzeLook] API_BASE_URL →', API_BASE_URL);

        let res = await fetch(`${API_BASE_URL}/ai/analyze`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({imageUrl}),
        });

        // 🧠 Retry once if first attempt fails
        if (!res.ok) {
          console.warn(
            '[useAnalyzeLook] First attempt failed, retrying once...',
          );
          await new Promise(r => setTimeout(r, 500));
          res = await fetch(`${API_BASE_URL}/ai/analyze`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({imageUrl}),
          });
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`AI analyze failed (${res.status}): ${text}`);
        }

        const data = await res.json();
        if (!data?.tags) throw new Error('No tags returned from AI analyze');

        // 🪄 Normalize tags for cleaner output
        const cleanTags = Array.from(
          new Set(data.tags.map((t: string) => t.toLowerCase().trim())),
        ).filter(Boolean);

        return {...data, tags: cleanTags};
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
