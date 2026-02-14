import { validateOutfitCore, padToThreeOutfits } from './finalize';

/** Helper: build a minimal item with just main_category */
const item = (main_category: string) => ({ main_category });

/** Helper: wrap items into an outfit object */
const outfit = (
  items: Array<{ main_category?: string | null }>,
  title = 'Test',
) => ({
  title,
  items,
  why: '',
});

describe('validateOutfitCore', () => {
  // ──────────────────────────────────────────────
  // PASS cases
  // ──────────────────────────────────────────────

  describe('PASS — valid outfit structures', () => {
    it('Tops + Bottoms + Shoes (separates)', () => {
      const result = validateOutfitCore([
        outfit([item('Tops'), item('Bottoms'), item('Shoes')]),
      ]);
      expect(result).toHaveLength(1);
    });

    it('Tops + Skirts + Shoes (skirts map to bottoms slot)', () => {
      const result = validateOutfitCore([
        outfit([item('Tops'), item('Skirts'), item('Shoes')]),
      ]);
      expect(result).toHaveLength(1);
    });

    it('Dresses + Shoes (one-piece)', () => {
      const result = validateOutfitCore([
        outfit([item('Dresses'), item('Shoes')]),
      ]);
      expect(result).toHaveLength(1);
    });

    it('Formalwear + Shoes (maps to dresses slot)', () => {
      const result = validateOutfitCore([
        outfit([item('Formalwear'), item('Shoes')]),
      ]);
      expect(result).toHaveLength(1);
    });

    it('TraditionalWear + Shoes (maps to dresses slot)', () => {
      const result = validateOutfitCore([
        outfit([item('TraditionalWear'), item('Shoes')]),
      ]);
      expect(result).toHaveLength(1);
    });

    it('Activewear + Shoes', () => {
      const result = validateOutfitCore([
        outfit([item('Activewear'), item('Shoes')]),
      ]);
      expect(result).toHaveLength(1);
    });

    it('Swimwear only (shoes not required)', () => {
      const result = validateOutfitCore([outfit([item('Swimwear')])]);
      expect(result).toHaveLength(1);
    });

    it('Swimwear + Shoes (also valid)', () => {
      const result = validateOutfitCore([
        outfit([item('Swimwear'), item('Shoes')]),
      ]);
      expect(result).toHaveLength(1);
    });

    it('Separates + extras (accessories, outerwear)', () => {
      const result = validateOutfitCore([
        outfit([
          item('Tops'),
          item('Bottoms'),
          item('Shoes'),
          item('Accessories'),
          item('Outerwear'),
        ]),
      ]);
      expect(result).toHaveLength(1);
    });
  });

  // ──────────────────────────────────────────────
  // REJECT cases
  // ──────────────────────────────────────────────

  describe('REJECT — invalid outfit structures', () => {
    it('Accessories only', () => {
      const result = validateOutfitCore([
        outfit([item('Accessories'), item('Jewelry')]),
      ]);
      expect(result).toHaveLength(0);
    });

    it('Tops only (missing bottoms + shoes)', () => {
      const result = validateOutfitCore([outfit([item('Tops')])]);
      expect(result).toHaveLength(0);
    });

    it('Tops + Bottoms, no shoes', () => {
      const result = validateOutfitCore([
        outfit([item('Tops'), item('Bottoms')]),
      ]);
      expect(result).toHaveLength(0);
    });

    it('Dresses, no shoes', () => {
      const result = validateOutfitCore([outfit([item('Dresses')])]);
      expect(result).toHaveLength(0);
    });

    it('Activewear, no shoes', () => {
      const result = validateOutfitCore([outfit([item('Activewear')])]);
      expect(result).toHaveLength(0);
    });

    it('Outerwear + Shoes only (no core body coverage)', () => {
      const result = validateOutfitCore([
        outfit([item('Outerwear'), item('Shoes')]),
      ]);
      expect(result).toHaveLength(0);
    });

    it('Empty items array', () => {
      const result = validateOutfitCore([outfit([])]);
      expect(result).toHaveLength(0);
    });

    it('All null main_category', () => {
      const result = validateOutfitCore([
        outfit([{ main_category: null }, { main_category: null }]),
      ]);
      expect(result).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────
  // Array filtering behavior
  // ──────────────────────────────────────────────

  describe('Array filtering', () => {
    it('Mixed array: keeps valid, removes invalid', () => {
      const valid = outfit(
        [item('Tops'), item('Bottoms'), item('Shoes')],
        'Valid',
      );
      const invalid = outfit([item('Accessories')], 'Invalid');
      const result = validateOutfitCore([valid, invalid]);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid');
    });

    it('All invalid → returns empty array', () => {
      const result = validateOutfitCore([
        outfit([item('Tops')], 'Bad1'),
        outfit([item('Accessories')], 'Bad2'),
      ]);
      expect(result).toHaveLength(0);
    });

    it('All valid → returns all', () => {
      const result = validateOutfitCore([
        outfit(
          [item('Tops'), item('Bottoms'), item('Shoes')],
          'Separates',
        ),
        outfit([item('Dresses'), item('Shoes')], 'Dress'),
        outfit([item('Swimwear')], 'Swim'),
      ]);
      expect(result).toHaveLength(3);
    });

    it('Empty input array → returns empty array', () => {
      const result = validateOutfitCore([]);
      expect(result).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// padToThreeOutfits
// ═══════════════════════════════════════════════════════════════════════════

describe('padToThreeOutfits', () => {
  const poolItem = (id: string, cat: string) => ({
    id,
    name: `${cat}-${id}`,
    main_category: cat,
  });

  const makeOutfit = (items: any[]) => ({
    outfit_id: 'test',
    title: 'Backfill',
    items: items.map((r) => ({ id: r.id, main_category: r.main_category })),
    why: 'backfill',
  });

  const pool = [
    poolItem('t1', 'Tops'),
    poolItem('t2', 'Tops'),
    poolItem('t3', 'Tops'),
    poolItem('b1', 'Bottoms'),
    poolItem('b2', 'Bottoms'),
    poolItem('b3', 'Bottoms'),
    poolItem('s1', 'Shoes'),
    poolItem('s2', 'Shoes'),
    poolItem('s3', 'Shoes'),
  ];

  it('already 3 outfits → returns unchanged', () => {
    const existing = [
      makeOutfit([poolItem('t1', 'Tops'), poolItem('b1', 'Bottoms'), poolItem('s1', 'Shoes')]),
      makeOutfit([poolItem('t2', 'Tops'), poolItem('b2', 'Bottoms'), poolItem('s2', 'Shoes')]),
      makeOutfit([poolItem('t3', 'Tops'), poolItem('b3', 'Bottoms'), poolItem('s3', 'Shoes')]),
    ];
    const result = padToThreeOutfits(existing, pool, makeOutfit);
    expect(result).toHaveLength(3);
  });

  it('0 outfits → pads to 3 from pool', () => {
    const result = padToThreeOutfits([], pool, makeOutfit);
    expect(result).toHaveLength(3);
    // Each outfit should be structurally valid (top + bottom + shoes)
    for (const o of result) {
      const cats = o.items.map((it: any) => it.main_category);
      expect(cats).toContain('Tops');
      expect(cats).toContain('Bottoms');
      expect(cats).toContain('Shoes');
    }
  });

  it('1 outfit → pads to 3', () => {
    const existing = [
      makeOutfit([poolItem('t1', 'Tops'), poolItem('b1', 'Bottoms'), poolItem('s1', 'Shoes')]),
    ];
    const result = padToThreeOutfits(existing, pool, makeOutfit);
    expect(result).toHaveLength(3);
  });

  it('2 outfits → pads to 3', () => {
    const existing = [
      makeOutfit([poolItem('t1', 'Tops'), poolItem('b1', 'Bottoms'), poolItem('s1', 'Shoes')]),
      makeOutfit([poolItem('t2', 'Tops'), poolItem('b2', 'Bottoms'), poolItem('s2', 'Shoes')]),
    ];
    const result = padToThreeOutfits(existing, pool, makeOutfit);
    expect(result).toHaveLength(3);
  });

  it('prefers unused items for variety', () => {
    const existing = [
      makeOutfit([poolItem('t1', 'Tops'), poolItem('b1', 'Bottoms'), poolItem('s1', 'Shoes')]),
    ];
    const result = padToThreeOutfits(existing, pool, makeOutfit);
    // Second outfit should NOT reuse t1/b1/s1
    const secondIds = result[1].items.map((it: any) => it.id);
    expect(secondIds).not.toContain('t1');
    expect(secondIds).not.toContain('b1');
    expect(secondIds).not.toContain('s1');
  });

  it('stops when pool exhausted (only 1 of each slot)', () => {
    const smallPool = [
      poolItem('t1', 'Tops'),
      poolItem('b1', 'Bottoms'),
      poolItem('s1', 'Shoes'),
    ];
    // Only one unique combo possible: t1+b1+s1
    const result = padToThreeOutfits([], smallPool, makeOutfit);
    expect(result).toHaveLength(1);
  });

  it('falls back to dress+shoes path', () => {
    const dressPool = [
      poolItem('d1', 'Dresses'),
      poolItem('d2', 'Dresses'),
      poolItem('d3', 'Dresses'),
      poolItem('s1', 'Shoes'),
      poolItem('s2', 'Shoes'),
      poolItem('s3', 'Shoes'),
    ];
    const result = padToThreeOutfits([], dressPool, makeOutfit);
    expect(result).toHaveLength(3);
    for (const o of result) {
      const cats = o.items.map((it: any) => it.main_category);
      expect(cats).toContain('Dresses');
      expect(cats).toContain('Shoes');
    }
  });

  it('mixes separates and dress+shoes paths', () => {
    const mixedPool = [
      poolItem('t1', 'Tops'),
      poolItem('b1', 'Bottoms'),
      poolItem('s1', 'Shoes'),
      poolItem('s2', 'Shoes'),
      poolItem('d1', 'Dresses'),
    ];
    const result = padToThreeOutfits([], mixedPool, makeOutfit);
    // Should get 1 separates + 1 dress outfit (then stop — only 1 top, 1 dress)
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('empty pool → returns original outfits unchanged', () => {
    const existing = [
      makeOutfit([poolItem('t1', 'Tops'), poolItem('b1', 'Bottoms'), poolItem('s1', 'Shoes')]),
    ];
    const result = padToThreeOutfits(existing, [], makeOutfit);
    expect(result).toHaveLength(1);
  });

  it('does not duplicate exact item combo', () => {
    // Only one combo possible: t1+b1+s1 — should not produce 3 of the same
    const tinyPool = [
      poolItem('t1', 'Tops'),
      poolItem('b1', 'Bottoms'),
      poolItem('s1', 'Shoes'),
    ];
    const result = padToThreeOutfits([], tinyPool, makeOutfit);
    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M1 FIX: padToThreeOutfits with PATH #2 (start-with-item) centerpiece
// ═══════════════════════════════════════════════════════════════════════════

describe('padToThreeOutfits — PATH #2 centerpiece preservation', () => {
  const poolItem = (id: string, cat: string) => ({
    id,
    name: `${cat}-${id}`,
    main_category: cat,
  });

  const makeOutfit = (items: any[]) => ({
    outfit_id: 'pad',
    title: 'Backfill',
    items: items.map((r) => ({ id: r.id, main_category: r.main_category })),
    why: 'backfill',
  });

  it('pads PATH #2 from 1 outfit to 3, outfit[0] keeps centerpiece', () => {
    const centerpieceId = 'cp1';
    // outfit[0] has centerpiece (a polo) + bottom + shoes
    const existing = [
      makeOutfit([
        poolItem(centerpieceId, 'Tops'),
        poolItem('b1', 'Bottoms'),
        poolItem('s1', 'Shoes'),
      ]),
    ];
    const padPool = [
      poolItem('t2', 'Tops'),
      poolItem('t3', 'Tops'),
      poolItem('b2', 'Bottoms'),
      poolItem('b3', 'Bottoms'),
      poolItem('s2', 'Shoes'),
      poolItem('s3', 'Shoes'),
    ];
    const result = padToThreeOutfits(existing, padPool, makeOutfit);
    expect(result).toHaveLength(3);
    // outfit[0] still has the centerpiece
    expect(result[0].items.some((it: any) => it.id === centerpieceId)).toBe(true);
  });

  it('sparse wardrobe returns <3 without crash', () => {
    const existing = [
      makeOutfit([
        poolItem('cp1', 'Tops'),
        poolItem('b1', 'Bottoms'),
        poolItem('s1', 'Shoes'),
      ]),
    ];
    // Only enough for 1 outfit — no new combos possible
    const sparsePool = [
      poolItem('cp1', 'Tops'),
      poolItem('b1', 'Bottoms'),
      poolItem('s1', 'Shoes'),
    ];
    const result = padToThreeOutfits(existing, sparsePool, makeOutfit);
    // Should return original without crash — pool exhausted
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(3);
  });
});
