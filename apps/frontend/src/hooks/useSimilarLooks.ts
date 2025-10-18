import {useState, useCallback} from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {API_BASE_URL} from '../config/api';

export type SimilarLook = {
  brand: string | null;
  price: string | null;
  source: string | null;
  title: string;
  image: string;
  link: string;
};

export function useSimilarLooks() {
  const [data, setData] = useState<SimilarLook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSimilar = useCallback(async (imageUrl: string) => {
    setLoading(true);
    setError(null);
    ReactNativeHapticFeedback.trigger('impactLight');

    try {
      const response = await fetch(`${API_BASE_URL}/ai/similar-looks`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({imageUrl}),
      });

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const json = await response.json();

      // ✅ use normalized backend data directly
      setData(json || []);
      ReactNativeHapticFeedback.trigger('impactMedium');
    } catch (err: any) {
      console.error('Fetch similar looks failed:', err);
      setError(err.message || 'Failed to fetch similar looks');
      ReactNativeHapticFeedback.trigger('notificationError');
    } finally {
      setLoading(false);
    }
  }, []);

  return {fetchSimilar, data, loading, error};
}

///////////////////

// import {useState, useCallback} from 'react';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {API_BASE_URL} from '../config/api';

// type SimilarLook = {
//   brand: any;
//   price: any;
//   source: any;
//   title: string;
//   image: string;
//   link: string;
// };

// export function useSimilarLooks() {
//   const [data, setData] = useState<SimilarLook[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const fetchSimilar = useCallback(async (imageUrl: string) => {
//     setLoading(true);
//     setError(null);
//     ReactNativeHapticFeedback.trigger('impactLight');

//     try {
//       const response = await fetch(`${API_BASE_URL}/ai/similar-looks`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({imageUrl}),
//       });

//       if (!response.ok) {
//         throw new Error(`Server error ${response.status}`);
//       }

//       const json = await response.json();
//       setData(json || []);
//       ReactNativeHapticFeedback.trigger('impactMedium');
//     } catch (err: any) {
//       console.error('Fetch similar looks failed:', err);
//       setError(err.message || 'Failed to fetch similar looks');
//       ReactNativeHapticFeedback.trigger('notificationError');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   return {fetchSimilar, data, loading, error};
// }
