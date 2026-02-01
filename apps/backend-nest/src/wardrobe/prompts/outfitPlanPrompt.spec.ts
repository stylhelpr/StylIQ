/**
 * Outfit Plan Prompt Tests
 * ========================
 *
 * PATH #1 Golden Tests: Verify buildOutfitPlanPrompt() outputs unchanged
 * PATH #2 Contract Tests: Verify buildStartWithItemPromptV2() constraints
 */

import {
  buildOutfitPlanPrompt,
  buildStartWithItemPromptV2,
  type CenterpieceItem,
  type StartWithItemInputV2,
} from './outfitPlanPrompt';

// ============================================================================
// PATH #1 GOLDEN TESTS - DO NOT MODIFY THE EXPECTED VALUES
// These snapshots prove PATH #1 behavior is unchanged
// ============================================================================

describe('PATH #1: buildOutfitPlanPrompt (IMMUTABLE)', () => {
  describe('Golden Snapshot Tests', () => {
    it('should produce consistent output for casual query', () => {
      const prompt = buildOutfitPlanPrompt('casual weekend outfit', {
        weather: { temp_f: 72, condition: 'sunny' },
        availableItems: ['Tops: t-shirt', 'Bottoms: jeans', 'Shoes: sneakers'],
      });

      // Verify key structural elements are present
      expect(prompt).toContain('SYSTEM: Stateless outfit planning engine');
      expect(prompt).toContain('"request": "casual weekend outfit"');
      expect(prompt).toContain('"formality"');
      expect(prompt).toContain('Exactly 3 outfits');
      expect(prompt).toContain('Pick #1');
      expect(prompt).toContain('Pick #2');
      expect(prompt).toContain('Pick #3');

      // Verify formality derivation
      expect(prompt).toContain('"occasion":"casual"');
    });

    it('should produce consistent output for formal query', () => {
      const prompt = buildOutfitPlanPrompt('business meeting interview', {
        weather: { temp_f: 65, condition: 'cloudy' },
        availableItems: ['Tops: dress shirt', 'Bottoms: slacks', 'Shoes: oxford'],
      });

      // Verify key structural elements
      expect(prompt).toContain('SYSTEM: Stateless outfit planning engine');
      expect(prompt).toContain('"request": "business meeting interview"');
      expect(prompt).toContain('"occasion":"work"');

      // Verify formality is high for formal query
      expect(prompt).toMatch(/"formality":\s*9/);
    });

    it('should produce consistent output for athletic query', () => {
      const prompt = buildOutfitPlanPrompt('gym workout training', {
        weather: { temp_f: 80, condition: 'sunny' },
        availableItems: ['Tops: tank top', 'Bottoms: shorts', 'Shoes: running shoes'],
      });

      expect(prompt).toContain('"occasion":"athletic"');
      expect(prompt).toMatch(/"formality":\s*2/);
    });

    it('should handle refinement action without affecting core structure', () => {
      const prompt = buildOutfitPlanPrompt('casual outfit', {
        refinementAction: {
          keep_slots: ['Tops', 'Shoes'],
          change_slots: ['Bottoms'],
        },
      });

      expect(prompt).toContain('REFINEMENT MODE');
      expect(prompt).toContain('SKIP these categories');
      expect(prompt).toContain('Tops, Shoes');
      expect(prompt).toContain('Bottoms');
    });

    it('should NOT include item names in output (security constraint)', () => {
      const prompt = buildOutfitPlanPrompt('outfit with my favorite blue shirt', {
        availableItems: ['Tops: blue shirt', 'Bottoms: jeans'],
      });

      // Verify no specific item names leak into the prompt structure
      expect(prompt).not.toContain('"blue shirt"');
      expect(prompt).toContain('No brands, no specific items');
    });
  });
});

// ============================================================================
// PATH #2 CONTRACT TESTS - Verify isolated behavior
// ============================================================================

describe('PATH #2: buildStartWithItemPromptV2 (ISOLATED)', () => {
  const baseCenterpiece: CenterpieceItem = {
    category: 'Bottoms',
    description: 'navy blue chinos',
    color: 'navy blue',
    formality: 6,
    style: 'smart casual',
  };

  describe('Centerpiece Lock Enforcement', () => {
    it('should explicitly state centerpiece is ALREADY SELECTED', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('CENTERPIECE ITEM (MUST be in ALL 3 outfits - NON-NEGOTIABLE)');
      expect(prompt).toContain('"category": "Bottoms"');
      expect(prompt).toContain('navy blue');
    });

    it('should NOT generate slot for centerpiece category', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('The centerpiece Bottoms is ALREADY SELECTED - do NOT generate a slot for Bottoms');
      expect(prompt).toContain('DO NOT include a slot for Bottoms');
      expect(prompt).toContain('Only generate slots for: Tops, Shoes, Outerwear, Accessories');
    });

    it('should handle different centerpiece categories', () => {
      const shoeCenterpiece: CenterpieceItem = {
        category: 'Shoes',
        description: 'white leather sneakers',
        color: 'white',
        formality: 4,
      };

      const input: StartWithItemInputV2 = {
        centerpieceItem: shoeCenterpiece,
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('do NOT generate a slot for Shoes');
      expect(prompt).toContain('Only generate slots for: Tops, Bottoms, Outerwear, Accessories');
    });
  });

  describe('Mood Chip Integration', () => {
    it('should incorporate single mood chip', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
        moodPrompts: ['Create an outfit with a confident, bold vibe.'],
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('STYLING MOOD (apply to ALL 3 outfits)');
      expect(prompt).toContain('Create an outfit with a confident, bold vibe.');
    });

    it('should incorporate multiple mood chips', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
        moodPrompts: [
          'Create an outfit with a confident vibe.',
          'Create an outfit with a minimal aesthetic.',
        ],
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('confident');
      expect(prompt).toContain('minimal');
    });

    it('should work without mood chips', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
        moodPrompts: undefined,
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).not.toContain('STYLING MOOD');
      expect(prompt).toContain('CENTERPIECE ITEM');
    });
  });

  describe('Freeform Prompt Integration', () => {
    it('should incorporate freeform user prompt', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
        freeformPrompt: 'going to a business casual dinner date',
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain("USER'S SPECIFIC REQUEST");
      expect(prompt).toContain('going to a business casual dinner date');
      expect(prompt).toContain('You MUST incorporate this request into ALL 3 outfits');
    });

    it('should handle both mood and freeform prompt together', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
        moodPrompts: ['Create an outfit with a confident vibe.'],
        freeformPrompt: 'for a first date at a nice restaurant',
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('STYLING MOOD');
      expect(prompt).toContain("USER'S SPECIFIC REQUEST");
      expect(prompt).toContain('confident');
      expect(prompt).toContain('first date at a nice restaurant');
    });
  });

  describe('Weather Context', () => {
    it('should incorporate weather constraints', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
        weather: { temp_f: 35, condition: 'snowy' },
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('"weather"');
    });
  });

  describe('Wardrobe Constraint', () => {
    it('should include available items constraint', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
        availableItems: ['Tops: polo shirt', 'Tops: oxford shirt', 'Shoes: loafers'],
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('WARDROBE CONSTRAINT');
      expect(prompt).toContain('Tops: polo shirt');
      expect(prompt).toContain('Shoes: loafers');
    });
  });

  describe('3 Outfits Requirement', () => {
    it('should require exactly 3 outfits', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('exactly 3 ranked outfits');
      expect(prompt).toContain('Exactly 3 outfits');
      expect(prompt).toContain('Pick #1');
      expect(prompt).toContain('Pick #2');
      expect(prompt).toContain('Pick #3');
    });
  });

  describe('Quality Gate Constraints', () => {
    it('should include quality override rules', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('QUALITY OVERRIDE');
      expect(prompt).toContain('Every item must look GOOD with the centerpiece');
      expect(prompt).toContain('Do NOT suggest items that clash');
    });
  });
});

// ============================================================================
// PATH ISOLATION VERIFICATION
// ============================================================================

describe('Path Isolation Verification', () => {
  it('PATH #1 and PATH #2 produce structurally different prompts', () => {
    const path1Prompt = buildOutfitPlanPrompt('casual outfit');
    const path2Prompt = buildStartWithItemPromptV2({
      centerpieceItem: {
        category: 'Tops',
        description: 'blue t-shirt',
      },
    });

    // PATH #2 has unique markers not in PATH #1
    expect(path2Prompt).toContain('START WITH ITEM MODE V2');
    expect(path2Prompt).toContain('CENTERPIECE ITEM');
    expect(path2Prompt).toContain('NON-NEGOTIABLE');

    // PATH #1 does NOT have PATH #2 markers
    expect(path1Prompt).not.toContain('START WITH ITEM MODE');
    expect(path1Prompt).not.toContain('CENTERPIECE ITEM');
    expect(path1Prompt).not.toContain('NON-NEGOTIABLE');
  });

  it('PATH #1 does not exclude any categories', () => {
    const prompt = buildOutfitPlanPrompt('casual outfit');

    // PATH #1 should mention all categories
    expect(prompt).toContain('Tops, Bottoms, Shoes');
    expect(prompt).not.toContain('do NOT generate a slot for');
  });
});

// ============================================================================
// PATH #2 COMPOSITION VALIDATOR TESTS
// ============================================================================

import {
  validateStartWithItemComposition,
  validateStartWithItemResponse,
  type OutfitForValidation,
} from './outfitPlanPrompt';

describe('PATH #2: Composition Validator', () => {
  const centerpieceId = 'centerpiece-123';
  const centerpieceCategory = 'bottoms';

  const createItem = (id: string, category: string) => ({
    id,
    main_category: category,
    name: `Test ${category}`,
  });

  describe('validateStartWithItemComposition', () => {
    it('should ACCEPT valid 3-item outfit (centerpiece + 2 complementary)', () => {
      const outfit: OutfitForValidation = {
        outfit_id: 'outfit-1',
        title: 'Test Outfit',
        items: [
          createItem(centerpieceId, 'Bottoms'),
          createItem('item-2', 'Tops'),
          createItem('item-3', 'Shoes'),
        ],
      };

      const result = validateStartWithItemComposition(
        outfit,
        centerpieceId,
        centerpieceCategory,
        0,
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should ACCEPT valid 4-item outfit (centerpiece + 3 complementary)', () => {
      const outfit: OutfitForValidation = {
        outfit_id: 'outfit-1',
        title: 'Test Outfit',
        items: [
          createItem(centerpieceId, 'Bottoms'),
          createItem('item-2', 'Tops'),
          createItem('item-3', 'Shoes'),
          createItem('item-4', 'Outerwear'),
        ],
      };

      const result = validateStartWithItemComposition(
        outfit,
        centerpieceId,
        centerpieceCategory,
        0,
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should REJECT 2-item outfit (centerpiece + 1 only)', () => {
      const outfit: OutfitForValidation = {
        outfit_id: 'outfit-1',
        title: 'Test Outfit',
        items: [
          createItem(centerpieceId, 'Bottoms'),
          createItem('item-2', 'Tops'),
        ],
      };

      const result = validateStartWithItemComposition(
        outfit,
        centerpieceId,
        centerpieceCategory,
        0,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('minimum 3 required'))).toBe(true);
      expect(result.errors.some((e) => e.includes('minimum 2 required'))).toBe(true);
    });

    it('should REJECT outfit missing centerpiece', () => {
      const outfit: OutfitForValidation = {
        outfit_id: 'outfit-1',
        title: 'Test Outfit',
        items: [
          createItem('item-1', 'Tops'),
          createItem('item-2', 'Shoes'),
          createItem('item-3', 'Outerwear'),
        ],
      };

      const result = validateStartWithItemComposition(
        outfit,
        centerpieceId,
        centerpieceCategory,
        0,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('missing the centerpiece'))).toBe(true);
    });

    it('should REJECT outfit with only accessories as complementary items', () => {
      const outfit: OutfitForValidation = {
        outfit_id: 'outfit-1',
        title: 'Test Outfit',
        items: [
          createItem(centerpieceId, 'Bottoms'),
          createItem('item-2', 'Accessories'),
          createItem('item-3', 'Accessories'),
        ],
      };

      const result = validateStartWithItemComposition(
        outfit,
        centerpieceId,
        centerpieceCategory,
        0,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('only has accessories'))).toBe(true);
    });

    it('should REJECT outfit with duplicate categories', () => {
      const outfit: OutfitForValidation = {
        outfit_id: 'outfit-1',
        title: 'Test Outfit',
        items: [
          createItem(centerpieceId, 'Bottoms'),
          createItem('item-2', 'Tops'),
          createItem('item-3', 'Tops'), // Duplicate!
        ],
      };

      const result = validateStartWithItemComposition(
        outfit,
        centerpieceId,
        centerpieceCategory,
        0,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('duplicate categories'))).toBe(true);
    });

    it('should REJECT outfit with items missing IDs', () => {
      const outfit: OutfitForValidation = {
        outfit_id: 'outfit-1',
        title: 'Test Outfit',
        items: [
          createItem(centerpieceId, 'Bottoms'),
          createItem('item-2', 'Tops'),
          { id: '', main_category: 'Shoes' }, // Missing ID!
        ],
      };

      const result = validateStartWithItemComposition(
        outfit,
        centerpieceId,
        centerpieceCategory,
        0,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('without IDs'))).toBe(true);
    });
  });

  describe('validateStartWithItemResponse', () => {
    it('should ACCEPT valid 3-outfit response', () => {
      const outfits: OutfitForValidation[] = [
        {
          outfit_id: 'outfit-1',
          title: 'Pick #1',
          items: [
            createItem(centerpieceId, 'Bottoms'),
            createItem('item-1', 'Tops'),
            createItem('item-2', 'Shoes'),
          ],
        },
        {
          outfit_id: 'outfit-2',
          title: 'Pick #2',
          items: [
            createItem(centerpieceId, 'Bottoms'),
            createItem('item-3', 'Tops'),
            createItem('item-4', 'Shoes'),
          ],
        },
        {
          outfit_id: 'outfit-3',
          title: 'Pick #3',
          items: [
            createItem(centerpieceId, 'Bottoms'),
            createItem('item-5', 'Tops'),
            createItem('item-6', 'Shoes'),
          ],
        },
      ];

      const result = validateStartWithItemResponse(
        outfits,
        centerpieceId,
        centerpieceCategory,
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should REJECT response with wrong number of outfits', () => {
      const outfits: OutfitForValidation[] = [
        {
          outfit_id: 'outfit-1',
          title: 'Pick #1',
          items: [
            createItem(centerpieceId, 'Bottoms'),
            createItem('item-1', 'Tops'),
            createItem('item-2', 'Shoes'),
          ],
        },
        {
          outfit_id: 'outfit-2',
          title: 'Pick #2',
          items: [
            createItem(centerpieceId, 'Bottoms'),
            createItem('item-3', 'Tops'),
            createItem('item-4', 'Shoes'),
          ],
        },
        // Missing 3rd outfit!
      ];

      const result = validateStartWithItemResponse(
        outfits,
        centerpieceId,
        centerpieceCategory,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Expected 3 outfits'))).toBe(true);
    });

    it('should REJECT response with any underfilled outfit', () => {
      const outfits: OutfitForValidation[] = [
        {
          outfit_id: 'outfit-1',
          title: 'Pick #1',
          items: [
            createItem(centerpieceId, 'Bottoms'),
            createItem('item-1', 'Tops'),
            createItem('item-2', 'Shoes'),
          ],
        },
        {
          outfit_id: 'outfit-2',
          title: 'Pick #2',
          items: [
            createItem(centerpieceId, 'Bottoms'),
            createItem('item-3', 'Tops'),
            // Missing 2nd complementary item!
          ],
        },
        {
          outfit_id: 'outfit-3',
          title: 'Pick #3',
          items: [
            createItem(centerpieceId, 'Bottoms'),
            createItem('item-5', 'Tops'),
            createItem('item-6', 'Shoes'),
          ],
        },
      ];

      const result = validateStartWithItemResponse(
        outfits,
        centerpieceId,
        centerpieceCategory,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Composition Prompt Requirements', () => {
    it('should include COMPOSITION REQUIREMENT section in prompt', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: {
          category: 'Bottoms',
          description: 'navy chinos',
        },
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('COMPOSITION REQUIREMENT (MANDATORY)');
      expect(prompt).toContain('AT LEAST 2 complementary wardrobe items');
      expect(prompt).toContain('minimum 3 items total per outfit');
    });

    it('should explicitly reject under-filled combinations in prompt', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: {
          category: 'Shoes',
          description: 'white sneakers',
        },
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('Do NOT generate');
      expect(prompt).toContain('Single-item complements');
      expect(prompt).toContain('Accessory-only fills');
      expect(prompt).toContain('Under-filled combinations');
    });

    it('should require AT LEAST 2 slots per outfit in prompt', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: {
          category: 'Tops',
          description: 'blue oxford shirt',
        },
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain('Each outfit MUST have AT LEAST 2 slots');
    });
  });
});
