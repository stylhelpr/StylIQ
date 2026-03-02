import {useState, useRef, useCallback} from 'react';
import {apiClient} from '../../lib/apiClient';

export type GeocodeSuggestion = {
  displayName: string;
  lat: number;
  lng: number;
  placeKey: string;
};

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export function formatDisplayName(name: string, state?: string, country?: string): string {
  return [name, state, country].filter(Boolean).join(', ');
}

export function formatPlaceKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)}:${lng.toFixed(2)}`;
}

export function useGeocodeSearch() {
  const [query, setQueryState] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const {data} = await apiClient.post<GeocodeSuggestion[]>(
        '/trips/resolve-location',
        {query: q},
      );
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (q.length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        return;
      }
      timerRef.current = setTimeout(() => fetchSuggestions(q), DEBOUNCE_MS);
    },
    [fetchSuggestions],
  );

  const clear = useCallback(() => {
    setQueryState('');
    setSuggestions([]);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return {query, setQuery, suggestions, isSearching, clear};
}
