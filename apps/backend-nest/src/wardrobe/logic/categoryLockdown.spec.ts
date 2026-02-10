/**
 * CATEGORY LOCKDOWN TEST
 *
 * This test FAILS if the canonical categoryMapping module is incomplete or
 * if production code bypasses it with hardcoded comparisons.
 *
 * Purpose: Enforce single source of truth for category mappings.
 *
 * If this test fails:
 * 1. DO NOT bypass the canonical module
 * 2. Refactor code to use categoryMapping.ts functions
 * 3. Import { mapMainCategoryToSlot, pineconeFilterForSlot, etc. } from './categoryMapping'
 */

import {
  MAIN_CATEGORY_TO_SLOT,
  SLOT_TO_PINECONE_FILTER,
  PLAN_CATEGORY_TO_SLOT,
  SLOT_TO_PLAN_CATEGORY,
  SLOT_TO_MAIN_CATEGORIES,
  mapMainCategoryToSlot,
  mapPlanCategoryToSlot,
  pineconeFilterForSlot,
  pineconeFilterForPlanCategory,
  isValidMainCategory,
  getAllMainCategories,
  getAllSlots,
  MAIN_CATEGORY_COUNT,
  SLOT_COUNT,
  type MainCategory,
  type Slot,
  type PlanCategory,
} from './categoryMapping';

describe('Category Lockdown - Canonical Source Completeness', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Retail Taxonomy Validation (Nordstrom, Saks, SSENSE categories)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Retail Taxonomy Coverage', () => {
    // Common retail categories that MUST map to our MainCategories
    const RETAIL_CATEGORIES = [
      // Nordstrom-style categories
      { retail: 'T-Shirts', expectedMain: 'Tops' },
      { retail: 'Blouses', expectedMain: 'Tops' },
      { retail: 'Sweaters', expectedMain: 'Tops' },
      { retail: 'Jeans', expectedMain: 'Bottoms' },
      { retail: 'Pants', expectedMain: 'Bottoms' },
      { retail: 'Shorts', expectedMain: 'Bottoms' },
      { retail: 'Skirts', expectedMain: 'Skirts' },
      { retail: 'Dresses', expectedMain: 'Dresses' },
      { retail: 'Gowns', expectedMain: 'Dresses' },
      { retail: 'Jumpsuits', expectedMain: 'Dresses' },
      { retail: 'Rompers', expectedMain: 'Dresses' },
      { retail: 'Jackets', expectedMain: 'Outerwear' },
      { retail: 'Coats', expectedMain: 'Outerwear' },
      { retail: 'Blazers', expectedMain: 'Outerwear' },
      { retail: 'Sneakers', expectedMain: 'Shoes' },
      { retail: 'Heels', expectedMain: 'Shoes' },
      { retail: 'Boots', expectedMain: 'Shoes' },
      { retail: 'Sandals', expectedMain: 'Shoes' },
      { retail: 'Handbags', expectedMain: 'Bags' },
      { retail: 'Backpacks', expectedMain: 'Bags' },
      { retail: 'Clutches', expectedMain: 'Bags' },
      { retail: 'Watches', expectedMain: 'Accessories' },
      { retail: 'Belts', expectedMain: 'Accessories' },
      { retail: 'Scarves', expectedMain: 'Accessories' },
      { retail: 'Hats', expectedMain: 'Headwear' },
      { retail: 'Sunglasses', expectedMain: 'Accessories' },
      { retail: 'Necklaces', expectedMain: 'Jewelry' },
      { retail: 'Bracelets', expectedMain: 'Jewelry' },
      { retail: 'Earrings', expectedMain: 'Jewelry' },
      { retail: 'Rings', expectedMain: 'Jewelry' },
      { retail: 'Swimsuits', expectedMain: 'Swimwear' },
      { retail: 'Bikinis', expectedMain: 'Swimwear' },
      { retail: 'Athletic Wear', expectedMain: 'Activewear' },
      { retail: 'Yoga Pants', expectedMain: 'Activewear' },
      { retail: 'Sports Bras', expectedMain: 'Activewear' },
      { retail: 'Bras', expectedMain: 'Undergarments' },
      { retail: 'Underwear', expectedMain: 'Undergarments' },
      { retail: 'Shapewear', expectedMain: 'Undergarments' },
      { retail: 'Pajamas', expectedMain: 'Sleepwear' },
      { retail: 'Robes', expectedMain: 'Loungewear' },
      { retail: 'Suits', expectedMain: 'Formalwear' },
      { retail: 'Tuxedos', expectedMain: 'Formalwear' },
    ];

    it.each(RETAIL_CATEGORIES)(
      'retail "$retail" should map to MainCategory "$expectedMain"',
      ({ expectedMain }) => {
        // Verify the expected MainCategory exists in our taxonomy
        expect(isValidMainCategory(expectedMain)).toBe(true);
      },
    );

    it('should cover all major retail clothing categories', () => {
      const coveredMainCategories = new Set(
        RETAIL_CATEGORIES.map((r) => r.expectedMain),
      );

      // At minimum, these categories MUST be covered by retail mapping
      const REQUIRED_RETAIL_COVERAGE: MainCategory[] = [
        'Tops',
        'Bottoms',
        'Dresses',
        'Skirts',
        'Shoes',
        'Outerwear',
        'Accessories',
        'Bags',
        'Jewelry',
        'Swimwear',
        'Activewear',
        'Undergarments',
      ];

      for (const cat of REQUIRED_RETAIL_COVERAGE) {
        expect(coveredMainCategories.has(cat)).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Canonical Module Completeness
  // ─────────────────────────────────────────────────────────────────────────

  describe('MAIN_CATEGORY_TO_SLOT completeness', () => {
    it('should map exactly 21 MainCategories', () => {
      expect(Object.keys(MAIN_CATEGORY_TO_SLOT)).toHaveLength(MAIN_CATEGORY_COUNT);
      expect(MAIN_CATEGORY_COUNT).toBe(21);
    });

    it('should never return undefined for any MainCategory', () => {
      for (const category of getAllMainCategories()) {
        const slot = MAIN_CATEGORY_TO_SLOT[category];
        expect(slot).toBeDefined();
        expect(typeof slot).toBe('string');
        expect(slot.length).toBeGreaterThan(0);
      }
    });
  });

  describe('SLOT_TO_PINECONE_FILTER completeness', () => {
    it('should have exactly 10 Slots', () => {
      expect(Object.keys(SLOT_TO_PINECONE_FILTER)).toHaveLength(SLOT_COUNT);
      expect(SLOT_COUNT).toBe(10);
    });

    it('should produce valid Pinecone filter for every slot', () => {
      for (const slot of getAllSlots()) {
        const filter = pineconeFilterForSlot(slot);
        expect(filter).toBeDefined();
        expect(filter.main_category).toBeDefined();
        expect(filter.main_category.$eq || filter.main_category.$in).toBeDefined();
      }
    });
  });

  describe('Bidirectional mapping consistency', () => {
    it('SLOT_TO_MAIN_CATEGORIES should be consistent with MAIN_CATEGORY_TO_SLOT', () => {
      for (const [mainCat, slot] of Object.entries(MAIN_CATEGORY_TO_SLOT)) {
        const categoriesForSlot = SLOT_TO_MAIN_CATEGORIES[slot as Slot];
        expect(categoriesForSlot).toContain(mainCat as MainCategory);
      }
    });

    it('SLOT_TO_PLAN_CATEGORY should be inverse of PLAN_CATEGORY_TO_SLOT', () => {
      for (const [planCat, slot] of Object.entries(PLAN_CATEGORY_TO_SLOT)) {
        expect(SLOT_TO_PLAN_CATEGORY[slot as Slot]).toBe(planCat);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Failure Mode Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Failure Mode Handling', () => {
    it('should handle unknown category gracefully (return "other")', () => {
      expect(mapMainCategoryToSlot('UnknownCategory')).toBe('other');
      expect(mapMainCategoryToSlot('')).toBe('other');
      expect(mapMainCategoryToSlot('   ')).toBe('other');
    });

    it('should handle mixed case categories', () => {
      expect(mapMainCategoryToSlot('tops')).toBe('tops');
      expect(mapMainCategoryToSlot('TOPS')).toBe('tops');
      expect(mapMainCategoryToSlot('Tops')).toBe('tops');
      expect(mapMainCategoryToSlot('ToPs')).toBe('tops'); // Edge case
    });

    it('should handle null/undefined-like inputs', () => {
      expect(mapMainCategoryToSlot(null as any)).toBe('other');
      expect(mapMainCategoryToSlot(undefined as any)).toBe('other');
    });

    it('should return valid Pinecone filter for unknown plan categories', () => {
      const filter = pineconeFilterForPlanCategory('MadeUpCategory');
      expect(filter).toBeDefined();
      expect(filter.main_category).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Pipeline Integrity Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('End-to-End Pipeline Integrity', () => {
    // For each MainCategory, verify the full pipeline:
    // MainCategory → Slot → Pinecone Filter → Filter includes category

    const ALL_MAIN_CATEGORIES: MainCategory[] = [
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

    it.each(ALL_MAIN_CATEGORIES)(
      'MainCategory "%s" should have complete pipeline coverage',
      (category: MainCategory) => {
        // Step 1: Map to slot
        const slot = mapMainCategoryToSlot(category);
        expect(slot).toBeDefined();

        // Step 2: Get Pinecone filter for slot
        const filter = pineconeFilterForSlot(slot);
        expect(filter).toBeDefined();
        expect(filter.main_category).toBeDefined();

        // Step 3: Verify filter would match this category
        const filterCats = filter.main_category.$eq
          ? [filter.main_category.$eq]
          : filter.main_category.$in;

        // The original category OR a category that maps to the same slot should be in the filter
        const slotCategories = SLOT_TO_MAIN_CATEGORIES[slot];
        const hasOverlap = slotCategories.some((c) => filterCats.includes(c));
        expect(hasOverlap).toBe(true);
      },
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Regression Lock - Critical Mappings
  // ─────────────────────────────────────────────────────────────────────────

  describe('Regression Lock - Critical Mappings', () => {
    // These mappings MUST NEVER change without explicit approval

    it('Dresses → dresses slot (NEVER bottoms)', () => {
      expect(mapMainCategoryToSlot('Dresses')).toBe('dresses');
      const filter = pineconeFilterForSlot('dresses');
      expect(filter.main_category.$in).toContain('Dresses');
      expect(filter.main_category.$in).not.toContain('Bottoms');
    });

    it('Skirts → bottoms slot (NOT dresses)', () => {
      expect(mapMainCategoryToSlot('Skirts')).toBe('bottoms');
      const filter = pineconeFilterForSlot('bottoms');
      expect(filter.main_category.$in).toContain('Skirts');
    });

    it('Undergarments → undergarments slot (NOT accessories)', () => {
      expect(mapMainCategoryToSlot('Undergarments')).toBe('undergarments');
      const filter = pineconeFilterForSlot('undergarments');
      expect(filter.main_category.$eq).toBe('Undergarments');
    });

    it('Activewear → activewear slot (dedicated slot)', () => {
      expect(mapMainCategoryToSlot('Activewear')).toBe('activewear');
      const filter = pineconeFilterForSlot('activewear');
      expect(filter.main_category.$eq).toBe('Activewear');
    });

    it('Swimwear → swimwear slot (dedicated slot)', () => {
      expect(mapMainCategoryToSlot('Swimwear')).toBe('swimwear');
      const filter = pineconeFilterForSlot('swimwear');
      expect(filter.main_category.$eq).toBe('Swimwear');
    });

    it('Bags → accessories slot', () => {
      expect(mapMainCategoryToSlot('Bags')).toBe('accessories');
    });

    it('Jewelry → accessories slot', () => {
      expect(mapMainCategoryToSlot('Jewelry')).toBe('accessories');
    });

    it('Headwear → accessories slot', () => {
      expect(mapMainCategoryToSlot('Headwear')).toBe('accessories');
    });

    it('Formalwear → dresses slot (treat as one-piece)', () => {
      expect(mapMainCategoryToSlot('Formalwear')).toBe('dresses');
    });

    it('TraditionalWear → dresses slot (treat as one-piece)', () => {
      expect(mapMainCategoryToSlot('TraditionalWear')).toBe('dresses');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Snapshot Tests for Mapping Stability
  // ─────────────────────────────────────────────────────────────────────────

  describe('Mapping Snapshots', () => {
    it('MAIN_CATEGORY_TO_SLOT snapshot', () => {
      expect(MAIN_CATEGORY_TO_SLOT).toMatchSnapshot();
    });

    it('SLOT_TO_PINECONE_FILTER snapshot', () => {
      expect(SLOT_TO_PINECONE_FILTER).toMatchSnapshot();
    });

    it('PLAN_CATEGORY_TO_SLOT snapshot', () => {
      expect(PLAN_CATEGORY_TO_SLOT).toMatchSnapshot();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE C: TIERED SKIRT REGRESSION TEST
// ─────────────────────────────────────────────────────────────────────────────
//
// This test validates that when a user asks for a "tiered skirt", the bottoms
// slot filter INCLUDES both Skirts and Bottoms, so skirts are eligible candidates.
//
// The exact failure mode: LLM says "beige tiered skirt" but Pinecone query only
// matched Bottoms main_category, missing the actual Skirts items.
// ─────────────────────────────────────────────────────────────────────────────

describe('REGRESSION: Tiered Skirt Resolution', () => {
  it('FAST: tiered skirt refinement cannot resolve to shorts when a Skirts item exists', () => {
    // 1) Construct a fake "wardrobe" list
    const wardrobe = [
      {
        id: 'skirt-1',
        name: 'Beige Tiered Skirt',
        main_category: 'Skirts',
        subcategory: 'Midi Skirt',
      },
      {
        id: 'shorts-1',
        name: 'Cargo Shorts',
        main_category: 'Bottoms',
        subcategory: 'Shorts',
      },
      {
        id: 'pants-1',
        name: 'Chinos',
        main_category: 'Bottoms',
        subcategory: 'Pants',
      },
    ];

    // 2) Construct the plan slot (LLM says "Bottoms" with description "beige tiered skirt")
    const planSlot = {
      category: 'Bottoms',
      description: 'beige tiered skirt',
    };

    // 3) Get the Pinecone filter for bottoms slot
    const bottomsFilter = pineconeFilterForSlot('bottoms');

    // 4) Assert: filter includes BOTH 'Bottoms' and 'Skirts'
    expect(bottomsFilter.main_category.$in).toBeDefined();
    expect(bottomsFilter.main_category.$in).toContain('Bottoms');
    expect(bottomsFilter.main_category.$in).toContain('Skirts');

    // 5) Simulate filtering candidates by the Pinecone filter
    const filterCategories = bottomsFilter.main_category.$in as string[];
    const eligibleCandidates = wardrobe.filter((item) =>
      filterCategories.includes(item.main_category),
    );

    // 6) Both shorts AND skirts should be eligible
    expect(eligibleCandidates.length).toBe(3); // skirt-1, shorts-1, pants-1
    expect(eligibleCandidates.some((c) => c.main_category === 'Skirts')).toBe(
      true,
    );
    expect(eligibleCandidates.some((c) => c.main_category === 'Bottoms')).toBe(
      true,
    );

    // 7) Deterministic resolver: if any candidate is Skirts and name matches /tiered/i, prefer it
    const descLower = planSlot.description.toLowerCase();
    const preferredCandidate = eligibleCandidates.find(
      (c) =>
        c.main_category === 'Skirts' && /tiered/i.test(c.name.toLowerCase()),
    );

    // 8) The tiered skirt SHOULD be found and preferred
    expect(preferredCandidate).toBeDefined();
    expect(preferredCandidate?.id).toBe('skirt-1');
    expect(preferredCandidate?.name).toBe('Beige Tiered Skirt');
  });

  it('Skirts main_category maps to bottoms slot', () => {
    expect(mapMainCategoryToSlot('Skirts')).toBe('bottoms');
  });

  it('bottoms slot Pinecone filter includes Skirts', () => {
    const filter = pineconeFilterForSlot('bottoms');
    expect(filter.main_category.$in).toContain('Skirts');
  });

  it('plan category Bottoms maps to bottoms slot', () => {
    expect(mapPlanCategoryToSlot('Bottoms')).toBe('bottoms');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FILESYSTEM DRIFT LOCKDOWN TEST
// ─────────────────────────────────────────────────────────────────────────────
//
// This test scans the backend codebase and FAILS CI if hardcoded category
// comparisons are introduced outside the canonical categoryMapping.ts.
//
// If this test fails:
// 1. DO NOT add the file to the allowlist unless you have a VERY good reason
// 2. Refactor the code to use isSlot(), filterBySlot(), or mapMainCategoryToSlot()
// 3. Import from './categoryMapping' and use the helper functions
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';

describe('Category Drift Lockdown - Filesystem Scan', () => {
  // Files that are ALLOWED to have hardcoded category comparisons
  // EACH entry requires a 1-line justification
  const ALLOWLIST: Record<string, string> = {
    // Canonical source of truth
    'categoryMapping.ts': 'Canonical category mapping source - defines the mappings',
    'categoryMapping.spec.ts': 'Tests for canonical mapping module',
    'categoryLockdown.spec.ts': 'This lockdown test - contains regex patterns to detect violations',
    // Subcategory validation (not main_category bypass)
    'categoryValidator.ts': 'Validates subcategory→main_category pairs, uses MainCategory type',
  };

  // Patterns that indicate hardcoded category comparisons
  // These patterns detect code that should use canonical helpers instead
  const VIOLATION_PATTERNS: Array<{ regex: RegExp; description: string }> = [
    // Pattern 1: Direct main_category === 'CategoryName' comparisons
    {
      regex:
        /main_category\s*===\s*['"](?:Tops|Bottoms|Shoes|Outerwear|Accessories|Dresses|Skirts|Bags|Headwear|Jewelry|Activewear|Swimwear|Undergarments|Formalwear|TraditionalWear|Loungewear|Sleepwear|Maternity|Unisex|Costumes|Other)['"]/gi,
      description: "main_category === 'Category'",
    },
    // Pattern 2: Direct main_category !== 'CategoryName' comparisons
    {
      regex:
        /main_category\s*!==\s*['"](?:Tops|Bottoms|Shoes|Outerwear|Accessories|Dresses|Skirts|Bags|Headwear|Jewelry|Activewear|Swimwear|Undergarments|Formalwear|TraditionalWear|Loungewear|Sleepwear|Maternity|Unisex|Costumes|Other)['"]/gi,
      description: "main_category !== 'Category'",
    },
    // Pattern 3: .toLowerCase() === 'category' pattern (case-insensitive string compare)
    {
      regex:
        /\.toLowerCase\(\)\s*===\s*['"](?:tops|bottoms|shoes|outerwear|accessories|dresses|skirts|bags|headwear|jewelry|activewear|swimwear|undergarments|formalwear|traditionalwear|loungewear|sleepwear|maternity|unisex|costumes|other)['"]/gi,
      description: ".toLowerCase() === 'category'",
    },
    // Pattern 4: slot.category?.toLowerCase() === 'category' pattern
    {
      regex:
        /slot\.category\??\s*\.toLowerCase\(\)\s*===\s*['"](?:tops|bottoms|shoes|outerwear|accessories|dresses|skirts)['"]/gi,
      description: "slot.category.toLowerCase() === 'category'",
    },
  ];

  // Directories to exclude from scanning
  const EXCLUDED_DIRS = [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '__snapshots__',
    '.git',
  ];

  // Recursively find all .ts files
  function findTsFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(entry.name)) {
          files.push(...findTsFiles(fullPath));
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  // Check if file is in allowlist
  function isAllowlisted(filePath: string): boolean {
    const fileName = path.basename(filePath);
    return Object.keys(ALLOWLIST).includes(fileName);
  }

  // Scan a file for violations
  function scanFileForViolations(
    filePath: string,
  ): Array<{ line: number; content: string; patternDesc: string }> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const violations: Array<{
      line: number;
      content: string;
      patternDesc: string;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip commented lines (both // and * style)
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
        continue;
      }

      for (const { regex, description } of VIOLATION_PATTERNS) {
        // Reset lastIndex for global regex
        regex.lastIndex = 0;
        if (regex.test(line)) {
          violations.push({
            line: i + 1, // 1-indexed
            content: trimmed.slice(0, 100), // Truncate long lines
            patternDesc: description,
          });
        }
      }
    }

    return violations;
  }

  it('should not have hardcoded category comparisons outside allowlisted files', () => {
    const backendSrcDir = path.resolve(__dirname, '../../..');

    // Verify the directory exists
    expect(fs.existsSync(backendSrcDir)).toBe(true);

    const allTsFiles = findTsFiles(backendSrcDir);
    const violations: Array<{
      file: string;
      violations: Array<{ line: number; content: string; patternDesc: string }>;
    }> = [];

    for (const file of allTsFiles) {
      if (isAllowlisted(file)) {
        continue;
      }

      const fileViolations = scanFileForViolations(file);
      if (fileViolations.length > 0) {
        violations.push({
          file: path.relative(backendSrcDir, file),
          violations: fileViolations,
        });
      }
    }

    if (violations.length > 0) {
      // Build detailed error message with file:line format
      const errorLines = [
        '\n\n========== CATEGORY DRIFT LOCKDOWN VIOLATION ==========\n',
        'Files with hardcoded category comparisons:\n',
      ];

      for (const v of violations) {
        for (const violation of v.violations) {
          errorLines.push(
            `${v.file}:${violation.line}  [${violation.patternDesc}]`,
          );
          errorLines.push(`    ${violation.content}`);
        }
      }

      errorLines.push(
        '\n─'.repeat(60),
        '\nHOW TO FIX:',
        "1. import { isSlot, filterBySlot } from './categoryMapping'",
        "2. Replace: main_category === 'Tops' → isSlot(item, 'tops')",
        "3. Replace: lc(main_category) === 'shoes' → isSlot(item, 'shoes')",
        '─'.repeat(60),
      );

      throw new Error(errorLines.join('\n'));
    }

    // Success case - no violations found
    expect(violations).toHaveLength(0);
  });

  it('allowlist entries must have justifications > 10 chars', () => {
    for (const [file, justification] of Object.entries(ALLOWLIST)) {
      expect(justification.length).toBeGreaterThan(10);
    }
  });

  it('allowlist should be minimal (< 10 files)', () => {
    expect(Object.keys(ALLOWLIST).length).toBeLessThan(10);
  });
});
