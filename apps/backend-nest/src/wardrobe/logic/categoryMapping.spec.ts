/**
 * Tests for canonical categoryMapping module.
 *
 * These tests GUARANTEE:
 * 1. All 21 MainCategories are mapped
 * 2. All 10 Slots have Pinecone filters
 * 3. No undefined returns from mapping functions
 * 4. Regression prevention for dress/skirt/undergarments issues
 */

import {
  MAIN_CATEGORY_TO_SLOT,
  SLOT_TO_PINECONE_FILTER,
  PLAN_CATEGORY_TO_SLOT,
  SLOT_TO_PLAN_CATEGORY,
  REFINEMENT_CATEGORY_KEYWORDS,
  mapMainCategoryToSlot,
  mapPlanCategoryToSlot,
  pineconeFilterForSlot,
  pineconeFilterForPlanCategory,
  isOutfitEligibleSlot,
  isOutfitEligibleCategory,
  getMainCategoriesForSlot,
  isValidMainCategory,
  getAllMainCategories,
  getAllSlots,
  detectSlotsInText,
  MAIN_CATEGORY_COUNT,
  SLOT_COUNT,
  type MainCategory,
  type Slot,
  type PlanCategory,
} from './categoryMapping';

describe('categoryMapping', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Completeness Tests (CRITICAL)
  // ─────────────────────────────────────────────────────────────────────────

  describe('MAIN_CATEGORY_TO_SLOT completeness', () => {
    const expectedCategories: MainCategory[] = [
      'Tops',
      'Bottoms',
      'Outerwear',
      'Shoes',
      'Accessories',
      'Undergarments',
      'Activewear',
      'Formalwear',
      'Loungewear',
      'Sleepwear',
      'Swimwear',
      'Maternity',
      'Unisex',
      'Costumes',
      'TraditionalWear',
      'Dresses',
      'Skirts',
      'Bags',
      'Headwear',
      'Jewelry',
      'Other',
    ];

    it('should have exactly 21 MainCategories', () => {
      expect(Object.keys(MAIN_CATEGORY_TO_SLOT)).toHaveLength(
        MAIN_CATEGORY_COUNT,
      );
      expect(MAIN_CATEGORY_COUNT).toBe(21);
    });

    it.each(expectedCategories)(
      'should have mapping for %s',
      (category: MainCategory) => {
        expect(MAIN_CATEGORY_TO_SLOT[category]).toBeDefined();
        expect(typeof MAIN_CATEGORY_TO_SLOT[category]).toBe('string');
      },
    );

    it('should have no undefined values', () => {
      for (const [cat, slot] of Object.entries(MAIN_CATEGORY_TO_SLOT)) {
        expect(slot).toBeDefined();
        expect(slot).not.toBe('');
        expect(slot).not.toBe(undefined);
      }
    });
  });

  describe('SLOT_TO_PINECONE_FILTER completeness', () => {
    const expectedSlots: Slot[] = [
      'tops',
      'bottoms',
      'shoes',
      'outerwear',
      'accessories',
      'dresses',
      'activewear',
      'swimwear',
      'undergarments',
      'other',
    ];

    it('should have exactly 10 Slots', () => {
      expect(Object.keys(SLOT_TO_PINECONE_FILTER)).toHaveLength(SLOT_COUNT);
      expect(SLOT_COUNT).toBe(10);
    });

    it.each(expectedSlots)('should have Pinecone filter for %s', (slot: Slot) => {
      const filter = SLOT_TO_PINECONE_FILTER[slot];
      expect(filter).toBeDefined();
      expect(filter.main_category).toBeDefined();
    });

    it('should have valid filter structure for each slot', () => {
      for (const [slot, filter] of Object.entries(SLOT_TO_PINECONE_FILTER)) {
        expect(filter).toHaveProperty('main_category');
        const mainCat = filter.main_category;
        // Should be either $eq or $in format
        expect(mainCat.$eq || mainCat.$in).toBeDefined();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Critical Slot Filters (Dresses, Activewear, Swimwear, Undergarments)
  // ─────────────────────────────────────────────────────────────────────────

  describe('critical slot filters', () => {
    it('Dresses slot should have Pinecone filter', () => {
      const filter = pineconeFilterForSlot('dresses');
      expect(filter).toBeDefined();
      expect(filter.main_category).toBeDefined();
      expect(filter.main_category.$in).toContain('Dresses');
    });

    it('Activewear slot should have Pinecone filter', () => {
      const filter = pineconeFilterForSlot('activewear');
      expect(filter).toBeDefined();
      expect(filter.main_category.$eq).toBe('Activewear');
    });

    it('Swimwear slot should have Pinecone filter', () => {
      const filter = pineconeFilterForSlot('swimwear');
      expect(filter).toBeDefined();
      expect(filter.main_category.$eq).toBe('Swimwear');
    });

    it('Undergarments slot should have Pinecone filter', () => {
      const filter = pineconeFilterForSlot('undergarments');
      expect(filter).toBeDefined();
      expect(filter.main_category.$eq).toBe('Undergarments');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mapping Function Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('mapMainCategoryToSlot', () => {
    it('should never return undefined for any MainCategory', () => {
      for (const category of getAllMainCategories()) {
        const slot = mapMainCategoryToSlot(category);
        expect(slot).toBeDefined();
        expect(typeof slot).toBe('string');
      }
    });

    it('should handle case-insensitive input', () => {
      expect(mapMainCategoryToSlot('tops')).toBe('tops');
      expect(mapMainCategoryToSlot('TOPS')).toBe('tops');
      expect(mapMainCategoryToSlot('Tops')).toBe('tops');
    });

    it('should return "other" for unknown categories', () => {
      expect(mapMainCategoryToSlot('InvalidCategory')).toBe('other');
      expect(mapMainCategoryToSlot('')).toBe('other');
    });

    // Specific mappings
    it('should map Skirts to bottoms', () => {
      expect(mapMainCategoryToSlot('Skirts')).toBe('bottoms');
    });

    it('should map Bags to accessories', () => {
      expect(mapMainCategoryToSlot('Bags')).toBe('accessories');
    });

    it('should map Headwear to accessories', () => {
      expect(mapMainCategoryToSlot('Headwear')).toBe('accessories');
    });

    it('should map Jewelry to accessories', () => {
      expect(mapMainCategoryToSlot('Jewelry')).toBe('accessories');
    });

    it('should map Formalwear to dresses', () => {
      expect(mapMainCategoryToSlot('Formalwear')).toBe('dresses');
    });

    it('should map TraditionalWear to dresses', () => {
      expect(mapMainCategoryToSlot('TraditionalWear')).toBe('dresses');
    });

    it('should map Loungewear to other', () => {
      expect(mapMainCategoryToSlot('Loungewear')).toBe('other');
    });

    it('should map Maternity to other', () => {
      expect(mapMainCategoryToSlot('Maternity')).toBe('other');
    });
  });

  describe('mapPlanCategoryToSlot', () => {
    it('should handle all PlanCategory values', () => {
      const planCategories: PlanCategory[] = [
        'Tops',
        'Bottoms',
        'Dresses',
        'Shoes',
        'Outerwear',
        'Accessories',
        'Activewear',
        'Swimwear',
        'Undergarments',
        'Other',
      ];

      for (const cat of planCategories) {
        const slot = mapPlanCategoryToSlot(cat);
        expect(slot).toBeDefined();
        expect(typeof slot).toBe('string');
      }
    });

    it('should map Dresses to dresses slot', () => {
      expect(mapPlanCategoryToSlot('Dresses')).toBe('dresses');
    });
  });

  describe('pineconeFilterForPlanCategory', () => {
    it('should return filter for all plan categories', () => {
      const planCategories = [
        'Tops',
        'Bottoms',
        'Dresses',
        'Shoes',
        'Outerwear',
        'Accessories',
        'Activewear',
        'Swimwear',
        'Undergarments',
        'Other',
      ];

      for (const cat of planCategories) {
        const filter = pineconeFilterForPlanCategory(cat);
        expect(filter).toBeDefined();
        expect(filter.main_category).toBeDefined();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Regression Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('regression: dress vs bottoms', () => {
    it('midi dress should route to dresses slot', () => {
      const slot = mapMainCategoryToSlot('Dresses');
      expect(slot).toBe('dresses');
    });

    it('dresses filter should include Dresses category', () => {
      const filter = pineconeFilterForSlot('dresses');
      expect(filter.main_category.$in).toContain('Dresses');
    });

    it('dresses filter should NOT include Bottoms category', () => {
      const filter = pineconeFilterForSlot('dresses');
      expect(filter.main_category.$in).not.toContain('Bottoms');
    });
  });

  describe('regression: skirts handling', () => {
    it('skirts should map to bottoms slot', () => {
      expect(mapMainCategoryToSlot('Skirts')).toBe('bottoms');
    });

    it('bottoms filter should include Skirts category', () => {
      const filter = pineconeFilterForSlot('bottoms');
      expect(filter.main_category.$in).toContain('Skirts');
    });
  });

  describe('regression: undergarments routing', () => {
    it('undergarments should have own slot (not accessories)', () => {
      expect(mapMainCategoryToSlot('Undergarments')).toBe('undergarments');
    });

    it('undergarments filter should NOT include accessories', () => {
      const filter = pineconeFilterForSlot('undergarments');
      expect(filter.main_category.$eq).toBe('Undergarments');
    });
  });

  describe('regression: refinement text detection', () => {
    it('should detect "add undershirt" as undergarments', () => {
      const slots = detectSlotsInText('add undershirt');
      expect(slots).toContain('undergarments');
    });

    it('should detect "change to midi dress" as dresses', () => {
      const slots = detectSlotsInText('change to midi dress');
      expect(slots).toContain('dresses');
    });

    it('should detect activewear keywords', () => {
      const slots = detectSlotsInText('change to gym outfit');
      expect(slots).toContain('activewear');
    });

    it('should detect swimwear keywords', () => {
      const slots = detectSlotsInText('add bikini');
      expect(slots).toContain('swimwear');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Eligibility Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('isOutfitEligibleSlot', () => {
    it('should return true for core slots', () => {
      expect(isOutfitEligibleSlot('tops')).toBe(true);
      expect(isOutfitEligibleSlot('bottoms')).toBe(true);
      expect(isOutfitEligibleSlot('shoes')).toBe(true);
      expect(isOutfitEligibleSlot('dresses')).toBe(true);
      expect(isOutfitEligibleSlot('activewear')).toBe(true);
      expect(isOutfitEligibleSlot('swimwear')).toBe(true);
    });

    it('should return false for other slot', () => {
      expect(isOutfitEligibleSlot('other')).toBe(false);
    });
  });

  describe('isOutfitEligibleCategory', () => {
    it('should return true for Tops', () => {
      expect(isOutfitEligibleCategory('Tops')).toBe(true);
    });

    it('should return false for Loungewear (maps to other)', () => {
      expect(isOutfitEligibleCategory('Loungewear')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Utility Function Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('getAllMainCategories', () => {
    it('should return all 21 categories', () => {
      const categories = getAllMainCategories();
      expect(categories).toHaveLength(21);
    });
  });

  describe('getAllSlots', () => {
    it('should return all 10 slots', () => {
      const slots = getAllSlots();
      expect(slots).toHaveLength(10);
    });
  });

  describe('isValidMainCategory', () => {
    it('should return true for valid categories', () => {
      expect(isValidMainCategory('Tops')).toBe(true);
      expect(isValidMainCategory('Dresses')).toBe(true);
    });

    it('should return false for invalid categories', () => {
      expect(isValidMainCategory('InvalidCat')).toBe(false);
      expect(isValidMainCategory('')).toBe(false);
    });
  });

  describe('getMainCategoriesForSlot', () => {
    it('should return categories for accessories slot', () => {
      const cats = getMainCategoriesForSlot('accessories');
      expect(cats).toContain('Accessories');
      expect(cats).toContain('Bags');
      expect(cats).toContain('Headwear');
      expect(cats).toContain('Jewelry');
    });

    it('should return categories for dresses slot', () => {
      const cats = getMainCategoriesForSlot('dresses');
      expect(cats).toContain('Dresses');
      expect(cats).toContain('Formalwear');
      expect(cats).toContain('TraditionalWear');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Refinement Keywords Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('REFINEMENT_CATEGORY_KEYWORDS', () => {
    it('should have keywords for all slots', () => {
      const slots = getAllSlots();
      for (const slot of slots) {
        expect(REFINEMENT_CATEGORY_KEYWORDS[slot]).toBeDefined();
        expect(REFINEMENT_CATEGORY_KEYWORDS[slot].length).toBeGreaterThan(0);
      }
    });

    it('should have undergarments keywords', () => {
      const keywords = REFINEMENT_CATEGORY_KEYWORDS.undergarments;
      expect(keywords).toContain('bra');
      expect(keywords).toContain('underwear');
      expect(keywords).toContain('undershirt');
    });

    it('should have activewear keywords', () => {
      const keywords = REFINEMENT_CATEGORY_KEYWORDS.activewear;
      expect(keywords).toContain('gym');
      expect(keywords).toContain('athletic');
    });

    it('should have swimwear keywords', () => {
      const keywords = REFINEMENT_CATEGORY_KEYWORDS.swimwear;
      expect(keywords).toContain('bikini');
      expect(keywords).toContain('swimsuit');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Bidirectional Mapping Consistency
  // ─────────────────────────────────────────────────────────────────────────

  describe('bidirectional mapping consistency', () => {
    it('SLOT_TO_PLAN_CATEGORY should be inverse of PLAN_CATEGORY_TO_SLOT', () => {
      for (const [planCat, slot] of Object.entries(PLAN_CATEGORY_TO_SLOT)) {
        expect(SLOT_TO_PLAN_CATEGORY[slot as Slot]).toBe(planCat);
      }
    });
  });
});
