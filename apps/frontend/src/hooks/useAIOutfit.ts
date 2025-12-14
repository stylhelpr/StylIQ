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
    async (
      query: string,
      opts?: {topK?: number; styleProfile?: any; useFeedback?: boolean},
    ) => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const body: any = {
          user_id: userId,
          query,
          topK: opts?.topK ?? 25,
          useFeedback: opts?.useFeedback ?? true, // 👈 always included
        };

        const mappedStyle = mapStyleProfileToUserStyle(opts?.styleProfile);
        if (mappedStyle) body.style_profile = mappedStyle;

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
