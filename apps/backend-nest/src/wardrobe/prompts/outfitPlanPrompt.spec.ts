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
        availableItems: [
          'Tops: dress shirt',
          'Bottoms: slacks',
          'Shoes: oxford',
        ],
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
        availableItems: [
          'Tops: tank top',
          'Bottoms: shorts',
          'Shoes: running shoes',
        ],
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
      const prompt = buildOutfitPlanPrompt(
        'outfit with my favorite blue shirt',
        {
          availableItems: ['Tops: blue shirt', 'Bottoms: jeans'],
        },
      );

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

      expect(prompt).toContain(
        'CENTERPIECE ITEM (MUST be in ALL 3 outfits - NON-NEGOTIABLE)',
      );
      expect(prompt).toContain('"category": "Bottoms"');
      expect(prompt).toContain('navy blue');
    });

    it('should NOT generate slot for centerpiece category', () => {
      const input: StartWithItemInputV2 = {
        centerpieceItem: baseCenterpiece,
      };

      const prompt = buildStartWithItemPromptV2(input);

      expect(prompt).toContain(
        'The centerpiece Bottoms is ALREADY SELECTED - do NOT generate a slot for Bottoms',
      );
      expect(prompt).toContain('DO NOT include a slot for Bottoms');
      expect(prompt).toContain(
        'Only generate slots for: Tops, Shoes, Outerwear, Accessories',
      );
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
      expect(prompt).toContain(
        'Only generate slots for: Tops, Bottoms, Dresses, Outerwear, Accessories, Activewear, Swimwear',
      );
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
      expect(prompt).toContain(
        'You MUST incorporate this request into ALL 3 outfits',
      );
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
        availableItems: [
          'Tops: polo shirt',
          'Tops: oxford shirt',
          'Shoes: loafers',
        ],
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
      expect(prompt).toContain(
        'Every item must look GOOD with the centerpiece',
      );
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
    expect(prompt).toContain('Tops, Bottoms, Dresses, Shoes');
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
      expect(result.errors.some((e) => e.includes('minimum 3 required'))).toBe(
        true,
      );
      expect(result.errors.some((e) => e.includes('minimum 2 required'))).toBe(
        true,
      );
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
      expect(
        result.errors.some((e) => e.includes('missing the centerpiece')),
      ).toBe(true);
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
      expect(
        result.errors.some((e) => e.includes('only has accessories')),
      ).toBe(true);
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
      expect(
        result.errors.some((e) => e.includes('duplicate categories')),
      ).toBe(true);
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
      expect(result.errors.some((e) => e.includes('Expected 3 outfits'))).toBe(
        true,
      );
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

// ============================================================================
// PATH #2 INTENT MODE EXCLUSIVITY TESTS (V3)
// ============================================================================

import {
  normalizeStartWithItemIntent,
  buildStartWithItemPromptV3,
  validateStartWithItemIntentMode,
  MutualExclusionError,
  type RawStartWithItemInput,
  type NormalizedStartWithItemInput,
} from './outfitPlanPrompt';

describe('PATH #2: Intent Mode Exclusivity (V3)', () => {
  const baseCenterpiece = {
    category: 'Bottoms' as const,
    description: 'navy chinos',
  };

  describe('normalizeStartWithItemIntent', () => {
    it('should REJECT mood + freeform together (MUTUAL EXCLUSION)', () => {
      const input: RawStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        moodPrompts: ['Create an outfit with a confident vibe.'],
        freeformPrompt: 'date night rooftop dinner',
      };

      expect(() => normalizeStartWithItemIntent(input)).toThrow(
        MutualExclusionError,
      );
      expect(() => normalizeStartWithItemIntent(input)).toThrow(
        'MUTUAL_EXCLUSION_ERROR',
      );
    });

    it('should ACCEPT mood-only input', () => {
      const input: RawStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        moodPrompts: ['Create an outfit with a confident vibe.'],
      };

      const result = normalizeStartWithItemIntent(input);

      expect(result.intentMode).toBe('mood');
      expect(result.moods).toEqual(['Create an outfit with a confident vibe.']);
      expect(result.freeformPrompt).toBeNull();
    });

    it('should ACCEPT freeform-only input', () => {
      const input: RawStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        freeformPrompt: 'date night rooftop dinner',
      };

      const result = normalizeStartWithItemIntent(input);

      expect(result.intentMode).toBe('freeform');
      expect(result.freeformPrompt).toBe('date night rooftop dinner');
      expect(result.moods).toBeNull();
    });

    it('should ACCEPT neutral input (neither mood nor freeform)', () => {
      const input: RawStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
      };

      const result = normalizeStartWithItemIntent(input);

      expect(result.intentMode).toBe('neutral');
      expect(result.moods).toBeNull();
      expect(result.freeformPrompt).toBeNull();
    });

    it('should treat empty freeform as neutral', () => {
      const input: RawStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        freeformPrompt: '   ', // whitespace only
      };

      const result = normalizeStartWithItemIntent(input);

      expect(result.intentMode).toBe('neutral');
    });

    it('should treat empty moods array as neutral', () => {
      const input: RawStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        moodPrompts: [],
      };

      const result = normalizeStartWithItemIntent(input);

      expect(result.intentMode).toBe('neutral');
    });

    it('should trim freeform prompt', () => {
      const input: RawStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        freeformPrompt: '  casual friday look  ',
      };

      const result = normalizeStartWithItemIntent(input);

      expect(result.freeformPrompt).toBe('casual friday look');
    });

    it('should preserve weather and availableItems', () => {
      const input: RawStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        freeformPrompt: 'casual look',
        weather: { temp_f: 72, condition: 'sunny' },
        availableItems: ['shirt', 'pants', 'shoes'],
      };

      const result = normalizeStartWithItemIntent(input);

      expect(result.weather).toEqual({ temp_f: 72, condition: 'sunny' });
      expect(result.availableItems).toEqual(['shirt', 'pants', 'shoes']);
    });
  });

  describe('validateStartWithItemIntentMode', () => {
    it('should VALIDATE consistent mood input', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'mood',
        moods: ['Create an outfit with a playful vibe.'],
        freeformPrompt: null,
      };

      const result = validateStartWithItemIntentMode(input);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.intentMode).toBe('mood');
    });

    it('should VALIDATE consistent freeform input', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'business casual meeting',
      };

      const result = validateStartWithItemIntentMode(input);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.intentMode).toBe('freeform');
    });

    it('should VALIDATE consistent neutral input', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'neutral',
        moods: null,
        freeformPrompt: null,
      };

      const result = validateStartWithItemIntentMode(input);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should REJECT mood mode with freeform present', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'mood',
        moods: ['Create an outfit with a confident vibe.'],
        freeformPrompt: 'should not be here', // Invalid!
      };

      const result = validateStartWithItemIntentMode(input);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('freeformPrompt is present')),
      ).toBe(true);
    });

    it('should REJECT freeform mode with moods present', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: ['Should not be here'], // Invalid!
        freeformPrompt: 'date night',
      };

      const result = validateStartWithItemIntentMode(input);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('moods are present'))).toBe(
        true,
      );
    });
  });

  describe('buildStartWithItemPromptV3', () => {
    it('should include INTENT MODE label in prompt', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'mood',
        moods: ['Create an outfit with a confident vibe.'],
        freeformPrompt: null,
      };

      const prompt = buildStartWithItemPromptV3(input);

      expect(prompt).toContain('INTENT MODE: MOOD CHIPS');
    });

    it('should include EXCLUSIVE MODE marker for mood mode', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'mood',
        moods: ['Create an outfit with a playful vibe.'],
        freeformPrompt: null,
      };

      const prompt = buildStartWithItemPromptV3(input);

      expect(prompt).toContain('EXCLUSIVE MODE');
      expect(prompt).toContain('Do NOT incorporate any text prompt');
    });

    it('should include EXCLUSIVE MODE marker for freeform mode', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'rooftop dinner date',
      };

      const prompt = buildStartWithItemPromptV3(input);

      expect(prompt).toContain('INTENT MODE: VOICE/TEXT PROMPT');
      expect(prompt).toContain('EXCLUSIVE MODE');
      expect(prompt).toContain('rooftop dinner date');
      expect(prompt).toContain('Do NOT add mood interpretations');
    });

    it('should use neutral default for neutral mode', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'neutral',
        moods: null,
        freeformPrompt: null,
      };

      const prompt = buildStartWithItemPromptV3(input);

      expect(prompt).toContain('INTENT MODE: NEUTRAL');
      expect(prompt).toContain('versatile, well-coordinated');
    });

    it('should NOT include mood section in freeform mode', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'casual friday',
      };

      const prompt = buildStartWithItemPromptV3(input);

      expect(prompt).not.toContain('STYLING MOOD');
    });

    it('should NOT include freeform section in mood mode', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'mood',
        moods: ['Create an outfit with a minimal vibe.'],
        freeformPrompt: null,
      };

      const prompt = buildStartWithItemPromptV3(input);

      expect(prompt).not.toContain("USER'S SPECIFIC REQUEST (EXCLUSIVE MODE)");
    });

    it('should still enforce composition requirements in all modes', () => {
      const moodInput: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'mood',
        moods: ['Create an outfit with a confident vibe.'],
        freeformPrompt: null,
      };

      const freeformInput: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'business meeting',
      };

      const neutralInput: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'neutral',
        moods: null,
        freeformPrompt: null,
      };

      for (const input of [moodInput, freeformInput, neutralInput]) {
        const prompt = buildStartWithItemPromptV3(input);
        expect(prompt).toContain('COMPOSITION REQUIREMENT (MANDATORY)');
        expect(prompt).toContain('AT LEAST 2 complementary wardrobe items');
      }
    });

    it('should still exclude centerpiece category from generated slots', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: {
          category: 'Shoes',
          description: 'white sneakers',
        },
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'casual look',
      };

      const prompt = buildStartWithItemPromptV3(input);

      expect(prompt).toContain('do NOT generate a slot for Shoes');
      expect(prompt).toContain(
        'Only generate slots for: Tops, Bottoms, Dresses, Outerwear, Accessories, Activewear, Swimwear',
      );
    });
  });

  describe('Regression: PATH #1 unchanged', () => {
    it('PATH #1 prompt structure remains identical', () => {
      const prompt = buildOutfitPlanPrompt('casual weekend outfit');

      // These are PATH #1 specific markers that should NOT change
      expect(prompt).toContain('SYSTEM: Stateless outfit planning engine');
      expect(prompt).toContain('Pick #1: [Safe/Classic choice]');
      expect(prompt).toContain('Pick #2: [Different vibe');
      expect(prompt).toContain('Pick #3: [Wildcard/Bold choice]');
      expect(prompt).not.toContain('INTENT MODE');
      expect(prompt).not.toContain('CENTERPIECE');
    });
  });
});

// ============================================================================
// PATH #2 CENTERPIECE-FIRST ENFORCEMENT TESTS (V4)
// ============================================================================

import { buildStartWithItemPromptV4 } from './outfitPlanPrompt';

describe('PATH #2: Centerpiece-First Enforcement (V4)', () => {
  const baseCenterpiece = {
    category: 'Bottoms' as const,
    description: 'navy chinos',
  };

  describe('HARD SYSTEM DIRECTIVE', () => {
    it('should include HARD SYSTEM DIRECTIVE section', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'date night rooftop dinner',
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('HARD SYSTEM DIRECTIVE (NON-NEGOTIABLE)');
      expect(prompt).toContain('LOCKED CENTERPIECE');
    });

    it('should explicitly state centerpiece CANNOT be omitted', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'fancy party',
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('Omitted from any outfit');
      expect(prompt).toContain('Replaced with another item');
      expect(prompt).toContain('Overridden by any user request');
    });

    it('should state centerpiece WINS over conflicting user requests', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'I want a dress instead',
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('CENTERPIECE WINS');
    });
  });

  describe('FREEFORM MODE BOUNDARY', () => {
    it('should include FORBIDDEN INTERPRETATIONS section in freeform mode', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'something completely different',
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('FORBIDDEN INTERPRETATIONS');
      expect(prompt).toContain('Build a completely different outfit');
      expect(prompt).toContain('Ignore the centerpiece');
    });

    it('should include CORRECT INTERPRETATION section in freeform mode', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'business meeting',
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('CORRECT INTERPRETATION');
      expect(prompt).toContain('Style the locked');
    });

    it('should describe user text as MODIFIER not replacement', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'casual friday',
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('STYLING MODIFIER');
      expect(prompt).toContain('does NOT replace the centerpiece');
      expect(prompt).toContain('does NOT redefine the outfit core');
    });

    it('should frame user request as "How should I style THIS item?"', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: {
          category: 'Shoes',
          description: 'white sneakers',
        },
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'gym workout',
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('How should I style THIS Shoes');
    });
  });

  describe('MOOD MODE with centerpiece-first', () => {
    it('should describe moods as MODIFIERS to the centerpiece', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'mood',
        moods: ['Create an outfit with a confident vibe.'],
        freeformPrompt: null,
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('STYLING MODIFIER');
      expect(prompt).toContain('apply to items AROUND the locked centerpiece');
      expect(prompt).toContain(
        'They do NOT replace or override the centerpiece',
      );
    });

    it('should still include LOCKED CENTERPIECE section in mood mode', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'mood',
        moods: ['Create an outfit with a playful vibe.'],
        freeformPrompt: null,
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('LOCKED CENTERPIECE');
      expect(prompt).toContain('HARD SYSTEM DIRECTIVE');
    });
  });

  describe('NEUTRAL MODE with centerpiece-first', () => {
    it('should still enforce centerpiece in neutral mode', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'neutral',
        moods: null,
        freeformPrompt: null,
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('LOCKED CENTERPIECE');
      expect(prompt).toContain('HARD SYSTEM DIRECTIVE');
      expect(prompt).toContain(
        'balanced, versatile outfits around the locked centerpiece',
      );
    });
  });

  describe('Composition requirements preserved', () => {
    it('should still enforce composition requirements in V4', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'beach day',
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('COMPOSITION REQUIREMENT (MANDATORY)');
      expect(prompt).toContain('AT LEAST 2 complementary wardrobe items');
      expect(prompt).toContain('minimum 3 items total per outfit');
    });

    it('should still exclude centerpiece category from generated slots', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: {
          category: 'Tops',
          description: 'white button-down shirt',
        },
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'office meeting',
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('do NOT generate a slot for Tops');
      expect(prompt).toContain(
        'Only generate slots for: Bottoms, Shoes, Outerwear, Accessories',
      );
    });
  });

  describe('V4 vs V3 differences', () => {
    it('V4 should use LOCKED terminology throughout', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'cocktail party',
      };

      const prompt = buildStartWithItemPromptV4(input);

      // Count occurrences of "LOCKED" - should be multiple
      const lockedCount = (prompt.match(/LOCKED/g) || []).length;
      expect(lockedCount).toBeGreaterThan(5);
    });

    it('V4 should include PRIMARY CONSTRAINT language', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'freeform',
        moods: null,
        freeformPrompt: 'weekend brunch',
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('PRIMARY CONSTRAINT');
    });

    it('V4 should use V4 version marker', () => {
      const input: NormalizedStartWithItemInput = {
        centerpieceItem: baseCenterpiece,
        intentMode: 'neutral',
        moods: null,
        freeformPrompt: null,
      };

      const prompt = buildStartWithItemPromptV4(input);

      expect(prompt).toContain('START WITH ITEM MODE V4');
      expect(prompt).toContain('CENTERPIECE-FIRST');
    });
  });

  describe('Regression: PATH #1 still unchanged', () => {
    it('PATH #1 prompt should not contain V4 markers', () => {
      const prompt = buildOutfitPlanPrompt('casual weekend outfit');

      expect(prompt).not.toContain('LOCKED CENTERPIECE');
      expect(prompt).not.toContain('HARD SYSTEM DIRECTIVE');
      expect(prompt).not.toContain('STYLING MODIFIER');
      expect(prompt).not.toContain('CENTERPIECE-FIRST');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FIX 3 + FIX 4: Style profile injection + Gender directive
// ═══════════════════════════════════════════════════════════════════════════

describe('buildOutfitPlanPrompt — FIX 3: Style Profile Injection', () => {
  it('includes style preferences when userStyleProfile is provided', () => {
    const prompt = buildOutfitPlanPrompt('casual outfit', {
      userStyleProfile: {
        preferredColors: ['navy', 'olive'],
        favoriteBrands: ['Ralph Lauren'],
        styleKeywords: ['preppy', 'classic'],
        dressBias: 'casual',
      },
    });
    expect(prompt).toContain('STYLE PREFERENCES');
    expect(prompt).toContain('navy, olive');
    expect(prompt).toContain('Ralph Lauren');
    expect(prompt).toContain('preppy, classic');
    expect(prompt).toContain('casual');
    expect(prompt).toContain('soft guidance');
  });

  it('omits style block when userStyleProfile is null', () => {
    const prompt = buildOutfitPlanPrompt('casual outfit', {
      userStyleProfile: null,
    });
    expect(prompt).not.toContain('STYLE PREFERENCES');
  });

  it('omits style block when userStyleProfile has empty arrays', () => {
    const prompt = buildOutfitPlanPrompt('casual outfit', {
      userStyleProfile: {
        preferredColors: [],
        favoriteBrands: [],
        styleKeywords: [],
      },
    });
    expect(prompt).not.toContain('STYLE PREFERENCES');
  });

  it('includes partial style profile (only colors)', () => {
    const prompt = buildOutfitPlanPrompt('casual outfit', {
      userStyleProfile: {
        preferredColors: ['black', 'white'],
      },
    });
    expect(prompt).toContain('STYLE PREFERENCES');
    expect(prompt).toContain('black, white');
    expect(prompt).not.toContain('Favorite brands');
  });
});

describe('buildOutfitPlanPrompt — FIX 4: Gender Directive', () => {
  it('includes masculine directive when passed', () => {
    const masculineDirective =
      '\n════════════════════════\nGENDER CONTEXT\n════════════════════════\nThis user presents masculine. NEVER include dresses, skirts, gowns, blouses, heels, ballet flats, purses, or any feminine-coded garments. Only use items from the wardrobe list provided.\n';
    const prompt = buildOutfitPlanPrompt('casual outfit', {
      genderDirective: masculineDirective,
    });
    expect(prompt).toContain('GENDER CONTEXT');
    expect(prompt).toContain('presents masculine');
    expect(prompt).toContain('NEVER include dresses');
  });

  it('includes feminine directive when passed', () => {
    const feminineDirective =
      '\n════════════════════════\nGENDER CONTEXT\n════════════════════════\nThis user presents feminine. Dresses, skirts, and all feminine garments are allowed and encouraged when appropriate.\n';
    const prompt = buildOutfitPlanPrompt('date night outfit', {
      genderDirective: feminineDirective,
    });
    expect(prompt).toContain('GENDER CONTEXT');
    expect(prompt).toContain('presents feminine');
  });

  it('omits gender section when directive is empty', () => {
    const prompt = buildOutfitPlanPrompt('casual outfit', {
      genderDirective: '',
    });
    expect(prompt).not.toContain('GENDER CONTEXT');
  });

  it('omits gender section when directive is undefined', () => {
    const prompt = buildOutfitPlanPrompt('casual outfit', {});
    expect(prompt).not.toContain('GENDER CONTEXT');
  });
});
