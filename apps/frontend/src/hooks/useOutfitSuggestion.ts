import {useEffect, useState} from 'react';
import type {WardrobeItem, Outfit, SuggestionParams} from '../types/wardrobe';

export type OutfitWithReasons = {
  outfit: Outfit;
  reasons: {
    top?: string[];
    bottom?: string[];
    shoes?: string[];
  };
  regenerateOutfit: () => void;
};

export function useOutfitSuggestion(
  wardrobe: WardrobeItem[],
  {
    keywords = [],
    weather,
    styleTags,
    fit,
    size,
    occasion,
  }: SuggestionParams = {},
): OutfitWithReasons {
  const favorites = wardrobe.filter(i => i.favorite);

  const [outfit, setOutfit] = useState<Outfit>({});
  const [reasons, setReasons] = useState<{
    top?: string[];
    bottom?: string[];
    shoes?: string[];
  }>({});

  const getReasons = (item: WardrobeItem): string[] => {
    const reasons: string[] = [];
    if (!item) return reasons;

    if (
      keywords.length &&
      item.category &&
      keywords.some(k => item.category!.toLowerCase().includes(k.toLowerCase()))
    ) {
      reasons.push(`Matches keyword: ${item.category}`);
    }

    if (weather && matchesWeather(item, weather))
      reasons.push(`Weather appropriate: ${weather}`);
    if (styleTags?.some(tag => item.tags?.includes(tag)))
      reasons.push('Matches style tag');
    if (fit && item.fit === fit) reasons.push(`Fit match: ${fit}`);
    if (size && item.size === size) reasons.push(`Size match: ${size}`);
    if (occasion && item.occasion === occasion)
      reasons.push(`Occasion match: ${occasion}`);

    return reasons;
  };

  const matchesWeather = (item: WardrobeItem, weather: string) => {
    if (weather === 'Any') return true;
    if (weather === 'hot')
      return item.material !== 'Wool' && item.mainCategory !== 'Outerwear';
    if (weather === 'cold')
      return item.material === 'Wool' || item.mainCategory === 'Outerwear';
    if (weather === 'rainy') return item.material === 'Waterproof';
    return true;
  };

  const chooseItem = (
    items: WardrobeItem[],
    keywordFallbacks: string[],
  ): WardrobeItem | undefined => {
    const pool = items.length >= 2 ? items : wardrobe;

    const candidates = pool.filter(item => {
      const keywordMatch = keywordFallbacks.some(
        k =>
          (item.category ?? '').toLowerCase().includes(k.toLowerCase()) ||
          (item.mainCategory ?? '').toLowerCase().includes(k.toLowerCase()) ||
          (item.subCategory ?? '').toLowerCase().includes(k.toLowerCase()),
      );
      return keywordMatch;
    });

    return candidates[0] || pool[0];
  };

  const regenerateOutfit = () => {
    const source = favorites.length >= 2 ? favorites : wardrobe;

    const top = chooseItem(
      source,
      keywords.length ? keywords : ['shirt', 'top'],
    );
    const bottom = chooseItem(
      source,
      keywords.length ? keywords : ['pants', 'shorts', 'bottom'],
    );
    const shoes = chooseItem(
      source,
      keywords.length ? keywords : ['shoes', 'sneakers', 'boots'],
    );

    setOutfit({top, bottom, shoes});
    setReasons({
      top: top ? getReasons(top) : [],
      bottom: bottom ? getReasons(bottom) : [],
      shoes: shoes ? getReasons(shoes) : [],
    });
  };

  return {
    outfit,
    reasons,
    regenerateOutfit,
  };
}
