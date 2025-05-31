import {useMemo} from 'react';

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
};

export type Outfit = {
  top?: WardrobeItem;
  bottom?: WardrobeItem;
  shoes?: WardrobeItem;
};

export function useOutfitSuggestion(
  wardrobe: WardrobeItem[],
  keywords: string[] = [],
): Outfit {
  const favorites = wardrobe.filter(i => i.favorite);

  const chooseItem = (
    items: WardrobeItem[],
    keywords: string[],
  ): WardrobeItem | undefined => {
    const pool = items.find(
      i =>
        i.category &&
        keywords.some(k => i.category!.toLowerCase().includes(k.toLowerCase())),
    )
      ? items
      : wardrobe;

    return pool.find(
      i =>
        i.category &&
        keywords.some(k => i.category!.toLowerCase().includes(k.toLowerCase())),
    );
  };

  const outfit = useMemo(() => {
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

    return {top, bottom, shoes};
  }, [wardrobe, keywords]);

  return outfit;
}

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
