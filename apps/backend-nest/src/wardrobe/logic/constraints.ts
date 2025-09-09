// constraints.ts — parse user request constraints (moved from service)
export type ParsedConstraints = {
  wantsLoafers: boolean;
  wantsSneakers: boolean;
  wantsBoots: boolean;
  wantsBlazer: boolean;
  excludeLoafers: boolean;
  excludeSneakers: boolean;
  excludeBoots: boolean;
  excludeBrown: boolean;
  colorWanted?: 'Brown' | 'Navy' | 'Blue' | 'Black';
  dressWanted?: 'BusinessCasual' | 'SmartCasual' | 'Casual';
  wantsBrown: boolean;
};

export function parseConstraints(q: string): ParsedConstraints {
  const s = (q || '').toLowerCase();
  const want = (w: string | RegExp) =>
    typeof w === 'string' ? s.includes(w) : w.test(s);

  const no = (re: RegExp) => re.test(s);
  const exclLoafers = no(/\b(no|without|exclude|avoid)\s+loafers?\b/);
  const exclSneakers = no(/\b(no|without|exclude|avoid)\s+sneakers?\b/);
  const exclBoots = no(/\b(no|without|exclude|avoid)\s+boots?\b/);
  const exclBrown = no(/\b(no|without|exclude|avoid)\s+brown\b/);

  const colorWanted =
    (want('brown') && !exclBrown && 'Brown') ||
    (want('navy') && 'Navy') ||
    (want('blue') && 'Blue') ||
    (want('black') && 'Black') ||
    undefined;

  const dressWanted =
    (want(/business\s*casual/) && 'BusinessCasual') ||
    (want(/smart\s*casual/) && 'SmartCasual') ||
    (want(/\bcasual\b/) && 'Casual') ||
    undefined;

  return {
    wantsLoafers: want('loafer') && !exclLoafers,
    wantsSneakers: want('sneaker') && !exclSneakers,
    wantsBoots: want('boot') && !exclBoots,
    wantsBlazer: want('blazer') || want('sport coat') || want('sportcoat'),
    excludeLoafers: exclLoafers,
    excludeSneakers: exclSneakers,
    excludeBoots: exclBoots,
    excludeBrown: exclBrown,
    colorWanted,
    dressWanted,
    wantsBrown: colorWanted === 'Brown',
  };
}

///////////////////

// // constraints.ts — parse user request constraints (moved from service)
// export type ParsedConstraints = {
//   wantsLoafers: boolean;
//   wantsSneakers: boolean;
//   wantsBoots: boolean;
//   wantsBlazer: boolean;
//   excludeLoafers: boolean;
//   excludeSneakers: boolean;
//   excludeBoots: boolean;
//   excludeBrown: boolean;
//   colorWanted?: 'Brown' | 'Navy' | 'Blue' | 'Black';
//   dressWanted?: 'BusinessCasual' | 'SmartCasual' | 'Casual';
//   wantsBrown: boolean;
// };

// export function parseConstraints(q: string): ParsedConstraints {
//   const s = (q || '').toLowerCase();
//   const want = (w: string | RegExp) =>
//     typeof w === 'string' ? s.includes(w) : w.test(s);

//   const no = (re: RegExp) => re.test(s);
//   const exclLoafers = no(/\b(no|without|exclude|avoid)\s+loafers?\b/);
//   const exclSneakers = no(/\b(no|without|exclude|avoid)\s+sneakers?\b/);
//   const exclBoots = no(/\b(no|without|exclude|avoid)\s+boots?\b/);
//   const exclBrown = no(/\b(no|without|exclude|avoid)\s+brown\b/);

//   const colorWanted =
//     (want('brown') && !exclBrown && 'Brown') ||
//     (want('navy') && 'Navy') ||
//     (want('blue') && 'Blue') ||
//     (want('black') && 'Black') ||
//     undefined;

//   const dressWanted =
//     (want(/business\s*casual/) && 'BusinessCasual') ||
//     (want(/smart\s*casual/) && 'SmartCasual') ||
//     (want(/\bcasual\b/) && 'Casual') ||
//     undefined;

//   return {
//     wantsLoafers: want('loafer') && !exclLoafers,
//     wantsSneakers: want('sneaker') && !exclSneakers,
//     wantsBoots: want('boot') && !exclBoots,
//     wantsBlazer: want('blazer') || want('sport coat') || want('sportcoat'),
//     excludeLoafers: exclLoafers,
//     excludeSneakers: exclSneakers,
//     excludeBoots: exclBoots,
//     excludeBrown: exclBrown,
//     colorWanted,
//     dressWanted,
//     wantsBrown: colorWanted === 'Brown',
//   };
// }
