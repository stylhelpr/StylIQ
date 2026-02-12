import { validateOutfitCore } from './finalize';

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
