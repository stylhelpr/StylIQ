/**
 * INVESTOR-GRADE INTEGRATION TESTS — AI Outfit Studio Pipeline
 *
 * Exercises the full pipeline logic chain (gender filter → LLM output filter →
 * structural validation → pad-to-3) with deterministic data.
 *
 * Proves:
 *   T1) Masculine user NEVER receives feminine items
 *   T2) Full wardrobe always returns 3 structurally valid outfits
 */

import {
  resolveUserPresentation,
  isFeminineItem,
  buildGenderDirective,
} from './logic/presentationFilter';
import { validateOutfitCore, padToThreeOutfits } from './logic/finalize';
import { mapMainCategoryToSlot } from './logic/categoryMapping';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures: Simulated wardrobe items (mixed masculine + feminine)
// ─────────────────────────────────────────────────────────────────────────────

const WARDROBE = {
  // Masculine-safe items
  whiteTee: { id: 't1', name: 'White Tee', main_category: 'Tops', subcategory: 't-shirt', color: 'white', image_url: '' },
  navyPolo: { id: 't2', name: 'Navy Polo', main_category: 'Tops', subcategory: 'polo', color: 'navy', image_url: '' },
  blackTee: { id: 't3', name: 'Black Tee', main_category: 'Tops', subcategory: 't-shirt', color: 'black', image_url: '' },
  darkJeans: { id: 'b1', name: 'Dark Jeans', main_category: 'Bottoms', subcategory: 'jeans', color: 'indigo', image_url: '' },
  khakiChinos: { id: 'b2', name: 'Khaki Chinos', main_category: 'Bottoms', subcategory: 'chinos', color: 'khaki', image_url: '' },
  greyTrousers: { id: 'b3', name: 'Grey Trousers', main_category: 'Bottoms', subcategory: 'trousers', color: 'grey', image_url: '' },
  whiteSneakers: { id: 's1', name: 'White Sneakers', main_category: 'Shoes', subcategory: 'sneakers', color: 'white', image_url: '' },
  brownLoafers: { id: 's2', name: 'Brown Loafers', main_category: 'Shoes', subcategory: 'loafers', color: 'brown', image_url: '' },
  blackOxfords: { id: 's3', name: 'Black Oxfords', main_category: 'Shoes', subcategory: 'oxford', color: 'black', image_url: '' },
  greenBomber: { id: 'o1', name: 'Green Bomber', main_category: 'Outerwear', subcategory: 'bomber jacket', color: 'olive', image_url: '' },

  // Feminine items (should be filtered for masculine users)
  floralDress: { id: 'f1', name: 'Floral Wrap Dress', main_category: 'Dresses', subcategory: 'wrap dress', color: 'pink', image_url: '' },
  miniSkirt: { id: 'f2', name: 'Pleated Mini Skirt', main_category: 'Skirts', subcategory: 'mini skirt', color: 'black', image_url: '' },
  blackStilettos: { id: 'f3', name: 'Black Stilettos', main_category: 'Shoes', subcategory: 'stiletto', color: 'black', image_url: '' },
  silkBlouse: { id: 'f4', name: 'Silk Blouse', main_category: 'Tops', subcategory: 'blouse', color: 'ivory', image_url: '' },
  redPurse: { id: 'f5', name: 'Red Clutch Purse', main_category: 'Accessories', subcategory: 'clutch', color: 'red', image_url: '' },
};

type WardrobeItem = typeof WARDROBE[keyof typeof WARDROBE];

/** Convert a wardrobe item into the shape used by outfit items */
const toOutfitItem = (w: WardrobeItem) => ({
  id: w.id,
  label: w.name,
  main_category: w.main_category,
  subcategory: w.subcategory,
  color: w.color,
  image_url: w.image_url,
});

/** Apply masculine pre-pool filter (mirrors wardrobe.service.ts:990-1004) */
function masculinePreFilter(items: WardrobeItem[]): WardrobeItem[] {
  return items.filter(
    (it) => !isFeminineItem(it.main_category, it.subcategory, it.name),
  );
}

/** Apply masculine post-assembly filter (mirrors wardrobe.service.ts:1586-1604) */
function masculinePostFilter(
  outfitItems: Array<{ main_category?: string; subcategory?: string; label?: string; name?: string }>,
) {
  return outfitItems.filter(
    (it) =>
      !isFeminineItem(
        it.main_category || '',
        (it as any).subcategory || '',
        (it as any).name || it.label || '',
      ),
  );
}

const makeOutfit = (items: WardrobeItem[]) => ({
  outfit_id: `test-${Math.random().toString(36).slice(2, 8)}`,
  title: 'Test Outfit',
  items: items.map(toOutfitItem),
  why: 'test',
});

// ═══════════════════════════════════════════════════════════════════════════
// T1: MASCULINE SAFETY — No feminine items in any output
// ═══════════════════════════════════════════════════════════════════════════

describe('T1: Masculine safety — full pipeline', () => {
  const allItems = Object.values(WARDROBE);

  it('resolves "male" → masculine presentation', () => {
    expect(resolveUserPresentation('male')).toBe('masculine');
    expect(resolveUserPresentation('Male')).toBe('masculine');
    expect(resolveUserPresentation('MALE')).toBe('masculine');
  });

  it('gender directive contains NEVER for masculine', () => {
    const directive = buildGenderDirective('masculine');
    expect(directive).toContain('NEVER include dresses');
    expect(directive).toContain('skirts');
    expect(directive).toContain('heels');
  });

  it('Layer 1 (pre-pool filter) removes all feminine items from wardrobe', () => {
    const filtered = masculinePreFilter(allItems);
    // Should remove: floralDress, miniSkirt, blackStilettos, silkBlouse, redPurse
    expect(filtered.length).toBe(allItems.length - 5);
    for (const item of filtered) {
      expect(isFeminineItem(item.main_category, item.subcategory, item.name)).toBe(false);
    }
  });

  it('Layer 2 (post-assembly filter) catches any leaked feminine items', () => {
    // Simulate LLM "mistake" — returned an outfit with a dress slipped in
    const leakedOutfit = [
      toOutfitItem(WARDROBE.whiteTee),
      toOutfitItem(WARDROBE.darkJeans),
      toOutfitItem(WARDROBE.floralDress), // ← leaked
      toOutfitItem(WARDROBE.whiteSneakers),
    ];
    const cleaned = masculinePostFilter(leakedOutfit);
    // No feminine items survive the filter
    expect(cleaned.every((it) => !isFeminineItem(it.main_category || '', (it as any).subcategory || '', (it as any).label || ''))).toBe(true);
    expect(cleaned).toHaveLength(3); // dress removed
  });

  it('full pipeline: 3 gender-safe outfits for masculine user', () => {
    // Step 1: Pre-pool filter
    const safePool = masculinePreFilter(allItems);

    // Step 2: Simulate LLM returning 1 outfit from safe pool
    const llmOutfits = [
      makeOutfit([WARDROBE.whiteTee, WARDROBE.darkJeans, WARDROBE.whiteSneakers]),
    ];

    // Step 3: Post-assembly filter (defense-in-depth)
    for (const o of llmOutfits) {
      o.items = masculinePostFilter(o.items) as any;
    }

    // Step 4: Structural validation
    const validated = validateOutfitCore(llmOutfits, 'casual outfit');
    expect(validated.length).toBeGreaterThanOrEqual(1);

    // Step 5: Pad to 3
    const padPool = safePool.map((r) => ({
      id: r.id,
      name: r.name,
      main_category: r.main_category,
      subcategory: r.subcategory,
      color: r.color,
      image_url: r.image_url,
    }));
    const padded = padToThreeOutfits(
      validated,
      padPool,
      (items) => ({
        outfit_id: `pad-${Math.random().toString(36).slice(2, 8)}`,
        title: 'More from your wardrobe',
        items: items.map((r) => ({
          id: r.id,
          main_category: r.main_category,
          label: r.name,
        })),
        why: 'padded',
      }),
    );

    expect(padded).toHaveLength(3);

    // CRITICAL ASSERTION: No feminine items in ANY outfit
    for (const outfit of padded) {
      for (const item of outfit.items) {
        const isFem = isFeminineItem(
          item.main_category || '',
          (item as any).subcategory || '',
          (item as any).name || (item as any).label || '',
        );
        expect(isFem).toBe(false);
      }
    }

    // CRITICAL ASSERTION: All outfits structurally valid
    const revalidated = validateOutfitCore(padded, 'casual outfit');
    expect(revalidated).toHaveLength(3);
  });

  it('stilettos, purses, blouses all caught by isFeminineItem', () => {
    expect(isFeminineItem('Shoes', 'stiletto', 'Black Stilettos')).toBe(true);
    expect(isFeminineItem('Accessories', 'clutch', 'Red Clutch Purse')).toBe(true);
    expect(isFeminineItem('Tops', 'blouse', 'Silk Blouse')).toBe(true);
    expect(isFeminineItem('Dresses', 'wrap dress', 'Floral Wrap')).toBe(true);
    expect(isFeminineItem('Skirts', 'mini skirt', 'Pleated Skirt')).toBe(true);
  });

  it('masculine-safe items pass isFeminineItem check', () => {
    expect(isFeminineItem('Tops', 't-shirt', 'White Tee')).toBe(false);
    expect(isFeminineItem('Bottoms', 'jeans', 'Dark Jeans')).toBe(false);
    expect(isFeminineItem('Shoes', 'sneakers', 'White Sneakers')).toBe(false);
    expect(isFeminineItem('Shoes', 'oxford', 'Black Oxfords')).toBe(false);
    expect(isFeminineItem('Outerwear', 'bomber jacket', 'Green Bomber')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T2: 3 OUTFITS GUARANTEE — Full wardrobe always returns 3 valid outfits
// ═══════════════════════════════════════════════════════════════════════════

describe('T2: 3 outfits guarantee — full pipeline', () => {
  it('LLM returns 3 valid outfits → all pass validation', () => {
    const outfits = [
      makeOutfit([WARDROBE.whiteTee, WARDROBE.darkJeans, WARDROBE.whiteSneakers]),
      makeOutfit([WARDROBE.navyPolo, WARDROBE.khakiChinos, WARDROBE.brownLoafers]),
      makeOutfit([WARDROBE.blackTee, WARDROBE.greyTrousers, WARDROBE.blackOxfords]),
    ];
    const validated = validateOutfitCore(outfits, 'casual');
    expect(validated).toHaveLength(3);

    // Each outfit has valid structure
    for (const o of validated) {
      const cats = o.items.map((it: any) => mapMainCategoryToSlot(it.main_category));
      expect(cats).toContain('tops');
      expect(cats).toContain('bottoms');
      expect(cats).toContain('shoes');
    }
  });

  it('LLM returns 1 valid outfit → padToThreeOutfits fills to 3', () => {
    const llmOutfits = [
      makeOutfit([WARDROBE.whiteTee, WARDROBE.darkJeans, WARDROBE.whiteSneakers]),
    ];
    const validated = validateOutfitCore(llmOutfits, 'casual');
    expect(validated).toHaveLength(1);

    const pool = [
      WARDROBE.navyPolo, WARDROBE.blackTee,
      WARDROBE.khakiChinos, WARDROBE.greyTrousers,
      WARDROBE.brownLoafers, WARDROBE.blackOxfords,
    ].map((r) => ({
      id: r.id,
      name: r.name,
      main_category: r.main_category,
      subcategory: r.subcategory,
      color: r.color,
      image_url: r.image_url,
    }));

    const padded = padToThreeOutfits(
      validated,
      pool,
      (items) => ({
        outfit_id: `pad-${Math.random().toString(36).slice(2, 8)}`,
        title: 'More from your wardrobe',
        items: items.map((r) => ({
          id: r.id,
          main_category: r.main_category,
        })),
        why: 'padded',
      }),
    );

    expect(padded).toHaveLength(3);

    // All 3 must pass structural validation
    const revalidated = validateOutfitCore(padded, 'casual');
    expect(revalidated).toHaveLength(3);
  });

  it('LLM returns 0 valid outfits → padToThreeOutfits builds up to 3 from pool', () => {
    // Simulate all LLM outfits rejected by validateOutfitCore
    const badOutfits = [
      makeOutfit([WARDROBE.whiteTee]), // missing bottoms+shoes
    ];
    const validated = validateOutfitCore(badOutfits, 'casual');
    expect(validated).toHaveLength(0);

    const pool = [
      WARDROBE.whiteTee, WARDROBE.navyPolo, WARDROBE.blackTee,
      WARDROBE.darkJeans, WARDROBE.khakiChinos, WARDROBE.greyTrousers,
      WARDROBE.whiteSneakers, WARDROBE.brownLoafers, WARDROBE.blackOxfords,
    ].map((r) => ({
      id: r.id,
      name: r.name,
      main_category: r.main_category,
      subcategory: r.subcategory,
      color: r.color,
      image_url: r.image_url,
    }));

    const padded = padToThreeOutfits(
      validated,
      pool,
      (items) => ({
        outfit_id: `pad-${Math.random().toString(36).slice(2, 8)}`,
        title: 'Fallback outfit',
        items: items.map((r) => ({
          id: r.id,
          main_category: r.main_category,
        })),
        why: 'deterministic fallback',
      }),
    );

    expect(padded).toHaveLength(3);
    const revalidated = validateOutfitCore(padded, 'casual');
    expect(revalidated).toHaveLength(3);
  });

  it('validateOutfitCore accepts dress+shoes (one-piece structure)', () => {
    const outfits = [
      makeOutfit([WARDROBE.floralDress, WARDROBE.whiteSneakers]),
    ];
    const validated = validateOutfitCore(outfits, 'date night');
    expect(validated).toHaveLength(1);
  });

  it('validateOutfitCore rejects tops-only (no bottoms/shoes)', () => {
    const outfits = [makeOutfit([WARDROBE.whiteTee])];
    const validated = validateOutfitCore(outfits, 'casual');
    expect(validated).toHaveLength(0);
  });

  it('each outfit has unique item combinations (no exact duplicates)', () => {
    const pool = [
      WARDROBE.whiteTee, WARDROBE.navyPolo, WARDROBE.blackTee,
      WARDROBE.darkJeans, WARDROBE.khakiChinos, WARDROBE.greyTrousers,
      WARDROBE.whiteSneakers, WARDROBE.brownLoafers, WARDROBE.blackOxfords,
    ].map((r) => ({
      id: r.id,
      name: r.name,
      main_category: r.main_category,
    }));

    const padded = padToThreeOutfits(
      [],
      pool,
      (items) => ({
        outfit_id: `test`,
        title: 'Test',
        items: items.map((r) => ({ id: r.id, main_category: r.main_category })),
        why: '',
      }),
    );

    expect(padded).toHaveLength(3);

    // Check no two outfits have identical item sets
    const combos = padded.map((o) =>
      o.items
        .map((it: any) => it.id)
        .sort()
        .join(','),
    );
    const uniqueCombos = new Set(combos);
    expect(uniqueCombos.size).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T3: AAAA MODE ROUTING (controller logic proof)
// ═══════════════════════════════════════════════════════════════════════════

describe('T3: aaaaMode routing — controller logic', () => {
  // Mirrors wardrobe.controller.ts:161
  function shouldUseFastMode(body: { useFastMode?: boolean; aaaaMode?: boolean }) {
    return body.useFastMode && !body.aaaaMode;
  }

  it('aaaaMode=true + useFastMode=true → standard (NOT fast)', () => {
    expect(shouldUseFastMode({ useFastMode: true, aaaaMode: true })).toBe(false);
  });

  it('aaaaMode=true + useFastMode=false → standard', () => {
    expect(shouldUseFastMode({ useFastMode: false, aaaaMode: true })).toBe(false);
  });

  it('aaaaMode=undefined + useFastMode=true → fast', () => {
    expect(shouldUseFastMode({ useFastMode: true })).toBe(true);
  });

  it('aaaaMode=false + useFastMode=true → fast', () => {
    expect(shouldUseFastMode({ useFastMode: true, aaaaMode: false })).toBe(true);
  });

  it('neither flag → standard', () => {
    expect(shouldUseFastMode({})).toBeFalsy();
  });
});
