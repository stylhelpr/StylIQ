import {useEffect, useState} from 'react';

export type WardrobeItem = {
  mainCategory: any;
  subCategory: any;
  material: any;
  fit: any;
  size: any;
  notes: any;
  id: string;
  image: string;
  name: string;
  category?: string;
  color?: string;
  tags?: string[];
  favorite?: boolean;
  occasion?: string;
};

export type Outfit = {
  top?: WardrobeItem;
  bottom?: WardrobeItem;
  shoes?: WardrobeItem;
};

export type SuggestionParams = {
  keywords?: string[];
  weather?: 'hot' | 'cold' | 'rainy' | 'Any'; // 👈 Add 'Any'
  styleTags?: string[];
  fit?: string;
  size?: string;
  occasion?: string;
  style?: string;
};

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

  // useEffect(() => {
  //   regenerateOutfit();
  // }, [wardrobe, keywords, weather, styleTags, fit, size, occasion]);

  return {
    outfit,
    reasons,
    regenerateOutfit,
  };
}

/////////////

// import {useMemo} from 'react';

// export type WardrobeItem = {
//   mainCategory: any;
//   subCategory: any;
//   material: any;
//   fit: any;
//   size: any;
//   notes: any;
//   id: string;
//   image: string;
//   name: string;
//   category?: string;
//   color?: string;
//   tags?: string[];
//   favorite?: boolean;
//   occasion?: string;
// };

// export type Outfit = {
//   top?: WardrobeItem;
//   bottom?: WardrobeItem;
//   shoes?: WardrobeItem;
// };

// export type SuggestionParams = {
//   keywords?: string[];
//   weather?: 'hot' | 'cold' | 'rainy';
//   styleTags?: string[];
//   fit?: string;
//   size?: string;
//   occasion?: string;
// };

// export type OutfitWithReasons = {
//   outfit: Outfit;
//   reasons: {
//     top?: string[];
//     bottom?: string[];
//     shoes?: string[];
//   };
// };

// export function useOutfitSuggestion(
//   wardrobe: WardrobeItem[],
//   {
//     keywords = [],
//     weather,
//     styleTags,
//     fit,
//     size,
//     occasion,
//   }: SuggestionParams = {},
// ): OutfitWithReasons {
//   const favorites = wardrobe.filter(i => i.favorite);

//   const getReasons = (item: WardrobeItem): string[] => {
//     const reasons: string[] = [];

//     if (!item) return reasons;

//     if (
//       keywords.length &&
//       item.category &&
//       keywords.some(k => item.category!.toLowerCase().includes(k.toLowerCase()))
//     )
//       reasons.push(`Matches keyword: ${item.category}`);

//     if (weather && matchesWeather(item, weather))
//       reasons.push(`Weather appropriate: ${weather}`);

//     if (styleTags?.some(tag => item.tags?.includes(tag)))
//       reasons.push('Matches style tag');

//     if (fit && item.fit === fit) reasons.push(`Fit match: ${fit}`);
//     if (size && item.size === size) reasons.push(`Size match: ${size}`);
//     if (occasion && item.occasion === occasion)
//       reasons.push(`Occasion match: ${occasion}`);

//     return reasons;
//   };

//   const matchesWeather = (item: WardrobeItem, weather: string) => {
//     if (weather === 'hot')
//       return item.material !== 'Wool' && item.mainCategory !== 'Outerwear';
//     if (weather === 'cold')
//       return item.material === 'Wool' || item.mainCategory === 'Outerwear';
//     if (weather === 'rainy') return item.material === 'Waterproof';
//     return true;
//   };

//   const chooseItem = (
//     items: WardrobeItem[],
//     keywordFallbacks: string[],
//   ): WardrobeItem | undefined => {
//     const pool = items.length >= 2 ? items : wardrobe;

//     const candidates = pool.filter(item => {
//       const keywordMatch = keywordFallbacks.some(
//         k =>
//           (item.category ?? '').toLowerCase().includes(k.toLowerCase()) ||
//           (item.mainCategory ?? '').toLowerCase().includes(k.toLowerCase()) ||
//           (item.subCategory ?? '').toLowerCase().includes(k.toLowerCase()),
//       );

//       return keywordMatch; // ← TEMP: ignore all other filters to force a match
//     });

//     console.log('🧠 chooseItem:', {
//       keywordFallbacks,
//       candidates: candidates.map(c => c.name),
//       pool: pool.map(p => p.name),
//     });

//     return candidates[0] || pool[0];
//   };

//   const {top, bottom, shoes} = useMemo(() => {
//     const source = favorites.length >= 2 ? favorites : wardrobe;

//     const top = chooseItem(
//       source,
//       keywords.length ? keywords : ['shirt', 'top'],
//     );
//     const bottom = chooseItem(
//       source,
//       keywords.length ? keywords : ['pants', 'shorts', 'bottom'],
//     );
//     const shoes = chooseItem(
//       source,
//       keywords.length ? keywords : ['shoes', 'sneakers', 'boots'],
//     );

//     return {top, bottom, shoes};
//   }, [wardrobe, keywords, weather, styleTags, fit, size, occasion]);

//   // return {
//   //   outfit: {top, bottom, shoes},
//   //   reasons: {
//   //     top: getReasons(top!),
//   //     bottom: getReasons(bottom!),
//   //     shoes: getReasons(shoes!),
//   //   },
//   // };
//   return {
//     outfit: {
//       top: wardrobe[0],
//       bottom: wardrobe[1],
//       shoes: wardrobe[2],
//     },
//     reasons: {
//       top: ['Hardcoded top'],
//       bottom: ['Hardcoded bottom'],
//       shoes: ['Hardcoded shoes'],
//     },
//   };
// }

/////////////

// import {useMemo} from 'react';

// export type WardrobeItem = {
//   mainCategory: any;
//   subCategory: any;
//   material: any;
//   fit: any;
//   size: any;
//   notes: any;
//   id: string;
//   image: string;
//   name: string;
//   category?: string;
//   color?: string;
//   tags?: string[];
//   favorite?: boolean;
// };

// export type Outfit = {
//   top?: WardrobeItem;
//   bottom?: WardrobeItem;
//   shoes?: WardrobeItem;
// };

// export function useOutfitSuggestion(
//   wardrobe: WardrobeItem[],
//   keywords: string[] = [],
// ): Outfit {
//   const favorites = wardrobe.filter(i => i.favorite);

//   const chooseItem = (
//     items: WardrobeItem[],
//     keywords: string[],
//   ): WardrobeItem | undefined => {
//     const pool = items.find(
//       i =>
//         i.category &&
//         keywords.some(k => i.category!.toLowerCase().includes(k.toLowerCase())),
//     )
//       ? items
//       : wardrobe;

//     return pool.find(
//       i =>
//         i.category &&
//         keywords.some(k => i.category!.toLowerCase().includes(k.toLowerCase())),
//     );
//   };

//   const outfit = useMemo(() => {
//     const source = favorites.length >= 2 ? favorites : wardrobe;

//     const top = chooseItem(
//       source,
//       keywords.length ? keywords : ['shirt', 'top'],
//     );
//     const bottom = chooseItem(
//       source,
//       keywords.length ? keywords : ['pants', 'shorts', 'bottom'],
//     );
//     const shoes = chooseItem(
//       source,
//       keywords.length ? keywords : ['shoes', 'sneakers', 'boots'],
//     );

//     return {top, bottom, shoes};
//   }, [wardrobe, keywords]);

//   return outfit;
// }

//////////

// import {useMemo} from 'react';

// export type WardrobeItem = {
//   mainCategory: any;
//   subCategory: any;
//   material: any;
//   fit: any;
//   size: any;
//   notes: any;
//   id: string;
//   image: string;
//   name: string;
//   category?: string;
//   color?: string;
//   tags?: string[];
//   favorite?: boolean;
// };

// export type Outfit = {
//   top?: WardrobeItem;
//   bottom?: WardrobeItem;
//   shoes?: WardrobeItem;
// };

// export function useOutfitSuggestion(
//   wardrobe: WardrobeItem[],
//   keywords: string[] = [],
// ): Outfit {
//   const favorites = wardrobe.filter(i => i.favorite);

//   const chooseItem = (
//     items: WardrobeItem[],
//     keywords: string[],
//   ): WardrobeItem | undefined => {
//     const pool = items.find(
//       i =>
//         i.category &&
//         keywords.some(k => i.category!.toLowerCase().includes(k.toLowerCase())),
//     )
//       ? items
//       : wardrobe;

//     return pool.find(
//       i =>
//         i.category &&
//         keywords.some(k => i.category!.toLowerCase().includes(k.toLowerCase())),
//     );
//   };

//   const outfit = useMemo(() => {
//     const source = favorites.length >= 2 ? favorites : wardrobe;

//     // Use keywords if provided, else use defaults
//     const top = chooseItem(
//       source,
//       keywords.length ? keywords : ['shirt', 'top'],
//     );
//     const bottom = chooseItem(
//       source,
//       keywords.length ? keywords : ['pants', 'shorts', 'bottom'],
//     );
//     const shoes = chooseItem(
//       source,
//       keywords.length ? keywords : ['shoes', 'sneakers', 'boots'],
//     );

//     return {top, bottom, shoes};
//   }, [wardrobe, keywords]);

//   return outfit;
// }
