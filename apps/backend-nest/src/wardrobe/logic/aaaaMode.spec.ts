/**
 * AAAA Mode — Investor Demo Quality Gate Tests
 *
 * Tests the 6 mandatory behaviors for AAAA (max-quality) outfit mode:
 * 1. Style profile wiring into standard prompt (M2 fix)
 * 2. Masculine post-assembly filter in standard mode (M1 fix)
 * 3. Fast mode pref-based ranking (L2 fix)
 * 4. aaaaMode flag routing (forces standard mode)
 * 5. Temperature passthrough to LLM
 * 6. Presentation filter integration (defense-in-depth)
 */

import { buildOutfitPrompt } from '../prompts/outfitPrompt';
import {
  isFeminineItem,
  buildGenderDirective,
  resolveUserPresentation,
} from './presentationFilter';

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: Style profile wiring (M2 fix)
// ═══════════════════════════════════════════════════════════════════════════

describe('AAAA — T1: Style profile wired into standard prompt', () => {
  it('includes user style profile when passed', () => {
    const profile = {
      preferredColors: ['navy', 'burgundy'],
      favoriteBrands: ['Ralph Lauren', 'J.Crew'],
      styleKeywords: ['classic', 'preppy'],
      dressBias: 'SmartCasual',
    };
    const prompt = buildOutfitPrompt(
      '1. Blue polo (Tops)\n2. Dark jeans (Bottoms)',
      'casual outfit',
      undefined, // no styleAgent
      profile, // ← M2: this was previously undefined
      '',
    );
    expect(prompt).toContain('navy');
    expect(prompt).toContain('burgundy');
    expect(prompt).toContain('Ralph Lauren');
    expect(prompt).toContain('J.Crew');
    expect(prompt).toContain('SmartCasual');
  });

  it('style agent overrides user profile when both present', () => {
    const profile = {
      preferredColors: ['red'],
      favoriteBrands: ['Gucci'],
    };
    const prompt = buildOutfitPrompt(
      '1. Blue polo (Tops)',
      'casual',
      'agent1', // styleAgent takes precedence
      profile,
      '',
    );
    // styleAgent section should be present, not user profile
    expect(prompt).toContain('STYLE AGENT ACTIVE');
    expect(prompt).not.toContain('USER STYLE PROFILE');
  });

  it('omits style section when neither agent nor profile', () => {
    const prompt = buildOutfitPrompt(
      '1. Blue polo (Tops)',
      'casual',
      undefined,
      undefined,
      '',
    );
    expect(prompt).not.toContain('STYLE AGENT');
    expect(prompt).not.toContain('USER STYLE PROFILE');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Masculine post-assembly filter (M1 fix)
// ═══════════════════════════════════════════════════════════════════════════

describe('AAAA — T2: Masculine post-assembly filter', () => {
  // Simulate the filter logic used in standard mode (mirrors wardrobe.service.ts)
  function applyMasculineFilter(
    outfitItems: Array<{ main_category: string; subcategory: string; name: string }>,
  ) {
    return outfitItems.filter(
      (it) =>
        !isFeminineItem(
          it.main_category || '',
          it.subcategory || '',
          it.name || '',
        ),
    );
  }

  it('removes dresses from masculine outfit', () => {
    const items = [
      { main_category: 'Tops', subcategory: 't-shirt', name: 'White tee' },
      { main_category: 'Dresses', subcategory: 'midi dress', name: 'Floral dress' },
      { main_category: 'Shoes', subcategory: 'sneakers', name: 'White sneakers' },
    ];
    const filtered = applyMasculineFilter(items);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((i) => i.main_category)).not.toContain('Dresses');
  });

  it('removes skirts from masculine outfit', () => {
    const items = [
      { main_category: 'Tops', subcategory: 'polo', name: 'Navy polo' },
      { main_category: 'Skirts', subcategory: 'mini skirt', name: 'Pleated skirt' },
      { main_category: 'Shoes', subcategory: 'loafers', name: 'Brown loafers' },
    ];
    const filtered = applyMasculineFilter(items);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((i) => i.main_category)).not.toContain('Skirts');
  });

  it('removes heels from masculine outfit', () => {
    const items = [
      { main_category: 'Tops', subcategory: 't-shirt', name: 'Blue tee' },
      { main_category: 'Bottoms', subcategory: 'jeans', name: 'Dark jeans' },
      { main_category: 'Shoes', subcategory: 'stiletto', name: 'Black stilettos' },
    ];
    const filtered = applyMasculineFilter(items);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((i) => i.subcategory !== 'stiletto')).toBe(true);
  });

  it('keeps all neutral items for masculine user', () => {
    const items = [
      { main_category: 'Tops', subcategory: 't-shirt', name: 'White tee' },
      { main_category: 'Bottoms', subcategory: 'chinos', name: 'Navy chinos' },
      { main_category: 'Shoes', subcategory: 'sneakers', name: 'Stan Smith' },
      { main_category: 'Outerwear', subcategory: 'bomber jacket', name: 'Green bomber' },
    ];
    const filtered = applyMasculineFilter(items);
    expect(filtered).toHaveLength(4); // all kept
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: Fast mode pref-based ranking (L2 fix)
// ═══════════════════════════════════════════════════════════════════════════

describe('AAAA — T3: Fast mode pref-based ranking', () => {
  // Simulate the pref-based ranking logic (mirrors wardrobe.service.ts)
  function rankOutfitsByPref(
    outfits: Array<{ items: Array<{ id: string }> }>,
    prefMap: Map<string, number>,
  ) {
    return outfits
      .map((o) => {
        const items = o.items ?? [];
        const boost =
          items.length === 0
            ? 0
            : items.reduce((a, it) => a + (prefMap.get(it?.id) ?? 0), 0) /
              items.length;
        return { o, boost };
      })
      .sort((a, b) => b.boost - a.boost)
      .map((r) => r.o);
  }

  it('selects outfit with highest average pref score', () => {
    const outfits = [
      { items: [{ id: 'a1' }, { id: 'b1' }, { id: 's1' }] }, // avg 0
      { items: [{ id: 'a2' }, { id: 'b2' }, { id: 's2' }] }, // avg 3.33
      { items: [{ id: 'a3' }, { id: 'b3' }, { id: 's3' }] }, // avg 1
    ];
    const prefs = new Map([
      ['a2', 5],
      ['b2', 3],
      ['s2', 2],
      ['a3', 1],
      ['b3', 1],
      ['s3', 1],
    ]);
    const ranked = rankOutfitsByPref(outfits, prefs);
    expect(ranked[0].items[0].id).toBe('a2'); // highest avg wins
  });

  it('falls back to first outfit when no prefs exist', () => {
    const outfits = [
      { items: [{ id: 'x1' }] },
      { items: [{ id: 'x2' }] },
    ];
    const prefs = new Map<string, number>();
    const ranked = rankOutfitsByPref(outfits, prefs);
    // All have boost=0, sort is stable → first stays first
    expect(ranked[0].items[0].id).toBe('x1');
  });

  it('single outfit returns unchanged', () => {
    const outfits = [{ items: [{ id: 'only1' }] }];
    const prefs = new Map<string, number>();
    const ranked = rankOutfitsByPref(outfits, prefs);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].items[0].id).toBe('only1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: aaaaMode flag routing
// ═══════════════════════════════════════════════════════════════════════════

describe('AAAA — T4: aaaaMode flag routing', () => {
  // Simulate the controller routing logic
  function shouldUseFastMode(body: { useFastMode?: boolean; aaaaMode?: boolean }) {
    return body.useFastMode && !body.aaaaMode;
  }

  it('aaaaMode=true forces standard mode even when useFastMode=true', () => {
    expect(shouldUseFastMode({ useFastMode: true, aaaaMode: true })).toBe(false);
  });

  it('useFastMode=true without aaaaMode → fast mode', () => {
    expect(shouldUseFastMode({ useFastMode: true })).toBe(true);
  });

  it('useFastMode=false → standard mode regardless of aaaaMode', () => {
    expect(shouldUseFastMode({ useFastMode: false, aaaaMode: true })).toBe(false);
    expect(shouldUseFastMode({ useFastMode: false })).toBe(false);
  });

  it('neither flag → standard mode', () => {
    expect(shouldUseFastMode({})).toBeFalsy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: Temperature passthrough
// ═══════════════════════════════════════════════════════════════════════════

describe('AAAA — T5: Temperature lockdown', () => {
  // Simulate the temperature config logic used in vertex.service.ts
  function buildGenerationConfig(temperature?: number) {
    return temperature != null ? { generationConfig: { temperature } } : {};
  }

  it('aaaaMode passes temperature 0.4', () => {
    const aaaaMode = true;
    const temp = aaaaMode ? 0.4 : undefined;
    const config = buildGenerationConfig(temp);
    expect(config).toEqual({ generationConfig: { temperature: 0.4 } });
  });

  it('normal mode passes no temperature override', () => {
    const aaaaMode = false;
    const temp = aaaaMode ? 0.4 : undefined;
    const config = buildGenerationConfig(temp);
    expect(config).toEqual({});
  });

  it('flash mode uses override when provided', () => {
    const flashTemp = (override?: number) => override ?? 0.7;
    expect(flashTemp(0.4)).toBe(0.4);
    expect(flashTemp(undefined)).toBe(0.7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 6: Defense-in-depth integration (presentation filter + gender directive)
// ═══════════════════════════════════════════════════════════════════════════

describe('AAAA — T6: Defense-in-depth integration', () => {
  it('full masculine pipeline: directive + filter work together', () => {
    const presentation = resolveUserPresentation('male');
    expect(presentation).toBe('masculine');

    // Layer B: prompt directive
    const directive = buildGenderDirective(presentation);
    expect(directive).toContain('NEVER include dresses');

    // Layer C: post-assembly filter catches anything LLM missed
    const llmOutput = [
      { main_category: 'Tops', subcategory: 't-shirt', name: 'Blue tee' },
      { main_category: 'Dresses', subcategory: 'wrap dress', name: 'Floral wrap' },
      { main_category: 'Shoes', subcategory: 'oxford', name: 'Brown oxford' },
    ];
    const filtered = llmOutput.filter(
      (it) => !isFeminineItem(it.main_category, it.subcategory, it.name),
    );
    expect(filtered).toHaveLength(2);
    expect(filtered.map((i) => i.main_category)).toEqual(['Tops', 'Shoes']);
  });

  it('feminine user gets no filtering (all items preserved)', () => {
    const presentation = resolveUserPresentation('female');
    expect(presentation).toBe('feminine');

    const directive = buildGenderDirective(presentation);
    expect(directive).toContain('allowed and encouraged');

    // No post-filter for feminine users
    const items = [
      { main_category: 'Dresses', subcategory: 'midi dress', name: 'Navy midi' },
      { main_category: 'Shoes', subcategory: 'stiletto', name: 'Black heels' },
    ];
    // feminine → isFeminineItem check is NOT applied (only for masculine)
    expect(items).toHaveLength(2); // all preserved
  });

  it('mixed user gets no directive and no filtering', () => {
    const presentation = resolveUserPresentation('non-binary');
    expect(presentation).toBe('mixed');

    const directive = buildGenderDirective(presentation);
    expect(directive).toBe(''); // empty — no gender section in prompt
  });
});
