/**
 * Regression test: Studio RETURN_GUARD for avoid_colors.
 *
 * Proves that the guard logic added to generateOutfits (SLOW) and
 * generateOutfitsFast (FAST) correctly filters outfits containing
 * avoided colors, using the same functions as suggestVisualOutfits.
 */
import {
  extractItemColors,
  expandAvoidColors,
  colorMatchesSafe,
} from '../ai/elite/tasteValidator';

// ── Helpers (mirror the inline guard in wardrobe.service.ts) ──

function guardFilter(
  outfits: any[],
  avoidColors: string[],
): any[] {
  if (!avoidColors.length) return outfits;
  const expanded = expandAvoidColors(avoidColors);
  const hasAvoided = (outfit: any): boolean => {
    for (const it of outfit.items ?? []) {
      for (const ic of extractItemColors(it as any)) {
        for (const ac of expanded) {
          if (colorMatchesSafe(ic, ac)) return true;
        }
      }
    }
    return false;
  };
  return outfits.filter((o) => !hasAvoided(o));
}

const mkOutfit = (id: string, items: any[]) => ({
  outfit_id: id,
  title: `Outfit ${id}`,
  items,
});

const mkItem = (color: string) => ({
  id: `item-${color}`,
  name: `Test ${color}`,
  color,
  main_category: 'Tops',
});

// ── Tests ──

describe('Studio RETURN_GUARD — avoid_colors', () => {
  it('filters outfit containing avoided color "navy"', () => {
    const outfits = [
      mkOutfit('1', [mkItem('navy'), mkItem('white')]),
      mkOutfit('2', [mkItem('black'), mkItem('grey')]),
      mkOutfit('3', [mkItem('beige'), mkItem('navy blue')]),
    ];
    const result = guardFilter(outfits, ['navy']);
    expect(result).toHaveLength(1);
    expect(result[0].outfit_id).toBe('2');
  });

  it('does NOT filter when avoid_colors is empty', () => {
    const outfits = [
      mkOutfit('1', [mkItem('navy')]),
      mkOutfit('2', [mkItem('blue')]),
    ];
    const result = guardFilter(outfits, []);
    expect(result).toHaveLength(2);
  });

  it('does NOT ban "blue" when only "navy" is avoided (no navy-bans-blue bug)', () => {
    const outfits = [
      mkOutfit('1', [mkItem('blue')]),
      mkOutfit('2', [mkItem('light blue')]),
      mkOutfit('3', [mkItem('royal blue')]),
    ];
    const result = guardFilter(outfits, ['navy']);
    expect(result).toHaveLength(3);
  });

  it('filters multiple avoided colors', () => {
    const outfits = [
      mkOutfit('1', [mkItem('red'), mkItem('white')]),
      mkOutfit('2', [mkItem('black'), mkItem('grey')]),
      mkOutfit('3', [mkItem('neon green'), mkItem('beige')]),
    ];
    const result = guardFilter(outfits, ['red', 'neon']);
    // outfit 1 has "red", outfit 3 has "neon green" (matches "neon")
    expect(result).toHaveLength(1);
    expect(result[0].outfit_id).toBe('2');
  });

  it('returns empty array when ALL outfits contain avoided colors', () => {
    const outfits = [
      mkOutfit('1', [mkItem('navy')]),
      mkOutfit('2', [mkItem('navy blue')]),
      mkOutfit('3', [mkItem('dark navy')]),
    ];
    const result = guardFilter(outfits, ['navy']);
    expect(result).toHaveLength(0);
  });

  it('handles case-insensitive matching', () => {
    const outfits = [
      mkOutfit('1', [mkItem('Navy')]),
      mkOutfit('2', [mkItem('NAVY')]),
      mkOutfit('3', [mkItem('black')]),
    ];
    const result = guardFilter(outfits, ['navy']);
    expect(result).toHaveLength(1);
    expect(result[0].outfit_id).toBe('3');
  });
});
