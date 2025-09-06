// hooks/useAIOutfit.ts
import {useState, useCallback} from 'react';
import {API_BASE_URL} from '../config/api';

export type UiWardrobeItem = {
  id: string;
  image: string;
  name: string;
  mainCategory?: string;
  subCategory?: string;
  color?: string;
  // add fields as needed by your UI
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
  // quick name from label before “ — ”
  name: it.label?.split(' — ')[0] ?? 'Item',
  mainCategory: it.main_category,
  subCategory: it.subcategory,
  color: it.color ?? it.color_family,
});

export function useAIOutfit(userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outfits, setOutfits] = useState<AiOutfit[]>([]);

  const generate = useCallback(
    async (query: string, topK = 25) => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/wardrobe/outfits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({user_id: userId, query, topK}),
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
