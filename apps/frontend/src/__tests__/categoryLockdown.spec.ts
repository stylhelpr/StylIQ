/**
 * Category Lockdown Test - Frontend
 *
 * This test ensures that all category comparisons in the frontend codebase
 * go through the canonical categoryMapping.ts module.
 *
 * If this test fails, it means someone has introduced a hardcoded category
 * comparison that bypasses the canonical mapping. Fix it by:
 * 1. Import helpers from src/lib/categoryMapping.ts
 * 2. Use isSlot(), filterBySlot(), findBySlot() instead of direct comparisons
 *
 * Allowlisted files:
 * - categoryMapping.ts: The canonical source of truth
 * - categoryLockdown.spec.ts: This test file (contains patterns to detect)
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const SRC_DIR = path.resolve(__dirname, '..');

/**
 * Files that are ALLOWED to contain category-related patterns.
 * Every file here MUST have a justification.
 */
const ALLOWLIST: Record<string, string> = {
  'categoryMapping.ts':
    'Canonical category mapping source - defines the mappings',
  'categoryLockdown.spec.ts':
    'This lockdown test - contains regex patterns to detect violations',
};

/**
 * File patterns that are allowed (e.g., test files).
 * Test files may contain direct category assertions for testing purposes.
 */
const ALLOWLIST_PATTERNS: Array<{pattern: RegExp; reason: string}> = [
  {
    pattern: /\.spec\.(ts|tsx)$/,
    reason: 'Test files are allowed to use direct category assertions for testing',
  },
  {
    pattern: /\.test\.(ts|tsx)$/,
    reason: 'Test files are allowed to use direct category assertions for testing',
  },
];

/**
 * Patterns that indicate a violation.
 * Each pattern detects a specific type of hardcoded category usage.
 */
const VIOLATION_PATTERNS: Array<{regex: RegExp; description: string}> = [
  {
    regex: /\.main_category\s*===\s*['"][A-Z]/,
    description: 'Direct main_category === "Category" comparison',
  },
  {
    regex: /\.mainCategory\s*===\s*['"][A-Z]/,
    description: 'Direct mainCategory === "Category" comparison',
  },
  {
    regex: /\.subcategory\s*===\s*['"][A-Z]/,
    description: 'Direct subcategory === "Category" comparison',
  },
  {
    regex: /\.subCategory\s*===\s*['"][A-Z]/,
    description: 'Direct subCategory === "Category" comparison',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, {withFileTypes: true});
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, __snapshots__, and other non-source directories
        if (
          entry.name !== 'node_modules' &&
          entry.name !== '__snapshots__' &&
          entry.name !== 'dist' &&
          entry.name !== 'build'
        ) {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function isAllowlisted(filePath: string): boolean {
  const fileName = path.basename(filePath);

  // Check exact filename match
  if (fileName in ALLOWLIST) {
    return true;
  }

  // Check pattern matches (e.g., test files)
  for (const {pattern} of ALLOWLIST_PATTERNS) {
    if (pattern.test(fileName)) {
      return true;
    }
  }

  return false;
}

function findViolations(
  filePath: string,
  content: string,
): Array<{line: number; pattern: string; snippet: string}> {
  const violations: Array<{line: number; pattern: string; snippet: string}> =
    [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip commented lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      continue;
    }

    for (const {regex, description} of VIOLATION_PATTERNS) {
      if (regex.test(line)) {
        violations.push({
          line: lineNumber,
          pattern: description,
          snippet: line.trim().substring(0, 100),
        });
      }
    }
  }

  return violations;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Category Drift Lockdown - Frontend', () => {
  it('should not have hardcoded category comparisons outside allowlisted files', () => {
    const files = getAllTsFiles(SRC_DIR);
    const errorLines: string[] = [];

    for (const file of files) {
      if (isAllowlisted(file)) {
        continue;
      }

      const content = fs.readFileSync(file, 'utf-8');
      const violations = findViolations(file, content);

      if (violations.length > 0) {
        const relativePath = path.relative(SRC_DIR, file);
        for (const v of violations) {
          errorLines.push(
            `  ${relativePath}:${v.line} - ${v.pattern}\n    → ${v.snippet}`,
          );
        }
      }
    }

    if (errorLines.length > 0) {
      const message = [
        '',
        '╔══════════════════════════════════════════════════════════════════════════════╗',
        '║ CATEGORY LOCKDOWN VIOLATION DETECTED                                         ║',
        '╠══════════════════════════════════════════════════════════════════════════════╣',
        '║ Hardcoded category comparisons found outside allowlisted files.              ║',
        '║                                                                              ║',
        '║ FIX: Import helpers from src/lib/categoryMapping.ts and use:                 ║',
        '║   - isSlot(item, "tops") instead of item.main_category === "Tops"            ║',
        '║   - filterBySlot(items, "bottoms") to filter by slot                         ║',
        '║   - findBySlot(items, "shoes") to find first matching item                   ║',
        '╚══════════════════════════════════════════════════════════════════════════════╝',
        '',
        'Violations:',
        ...errorLines,
        '',
      ].join('\n');

      throw new Error(message);
    }
  });

  it('allowlist should only contain files that exist', () => {
    const allowlistFiles = Object.keys(ALLOWLIST);
    const existingFiles = getAllTsFiles(SRC_DIR).map(f => path.basename(f));

    for (const file of allowlistFiles) {
      expect(existingFiles).toContain(file);
    }
  });

  it('allowlist should have justifications for all entries', () => {
    for (const [file, justification] of Object.entries(ALLOWLIST)) {
      expect(justification.length).toBeGreaterThan(10);
    }
  });
});

describe('Canonical Mapping Integrity - Frontend', () => {
  it('categoryMapping.ts should exist', () => {
    const mappingPath = path.join(SRC_DIR, 'lib', 'categoryMapping.ts');
    expect(fs.existsSync(mappingPath)).toBe(true);
  });

  it('categoryMapping.ts should export required helpers', () => {
    // Dynamic import to verify exports
    const mapping = require('../lib/categoryMapping');

    expect(typeof mapping.isSlot).toBe('function');
    expect(typeof mapping.filterBySlot).toBe('function');
    expect(typeof mapping.findBySlot).toBe('function');
    expect(typeof mapping.getSlot).toBe('function');
    expect(typeof mapping.groupBySlot).toBe('function');
    expect(typeof mapping.mapMainCategoryToSlot).toBe('function');
  });

  it('MAIN_CATEGORY_TO_SLOT should map all 21 categories', () => {
    const mapping = require('../lib/categoryMapping');

    expect(Object.keys(mapping.MAIN_CATEGORY_TO_SLOT).length).toBe(21);

    // Verify critical mappings
    expect(mapping.MAIN_CATEGORY_TO_SLOT.Tops).toBe('tops');
    expect(mapping.MAIN_CATEGORY_TO_SLOT.Bottoms).toBe('bottoms');
    expect(mapping.MAIN_CATEGORY_TO_SLOT.Skirts).toBe('bottoms'); // Skirts → bottoms
    expect(mapping.MAIN_CATEGORY_TO_SLOT.Shoes).toBe('shoes');
    expect(mapping.MAIN_CATEGORY_TO_SLOT.Dresses).toBe('dresses');
    expect(mapping.MAIN_CATEGORY_TO_SLOT.Formalwear).toBe('dresses');
    expect(mapping.MAIN_CATEGORY_TO_SLOT.TraditionalWear).toBe('dresses');
    expect(mapping.MAIN_CATEGORY_TO_SLOT.Bags).toBe('accessories');
    expect(mapping.MAIN_CATEGORY_TO_SLOT.Headwear).toBe('accessories');
    expect(mapping.MAIN_CATEGORY_TO_SLOT.Jewelry).toBe('accessories');
  });

  it('isSlot should correctly identify items by slot', () => {
    const {isSlot} = require('../lib/categoryMapping');

    // Test tops
    expect(isSlot({main_category: 'Tops'}, 'tops')).toBe(true);
    expect(isSlot({mainCategory: 'Tops'}, 'tops')).toBe(true);

    // Test bottoms (includes Skirts)
    expect(isSlot({main_category: 'Bottoms'}, 'bottoms')).toBe(true);
    expect(isSlot({main_category: 'Skirts'}, 'bottoms')).toBe(true);

    // Test accessories (includes Bags, Headwear, Jewelry)
    expect(isSlot({main_category: 'Accessories'}, 'accessories')).toBe(true);
    expect(isSlot({main_category: 'Bags'}, 'accessories')).toBe(true);
    expect(isSlot({main_category: 'Headwear'}, 'accessories')).toBe(true);
    expect(isSlot({main_category: 'Jewelry'}, 'accessories')).toBe(true);

    // Test dresses (includes Formalwear, TraditionalWear)
    expect(isSlot({main_category: 'Dresses'}, 'dresses')).toBe(true);
    expect(isSlot({main_category: 'Formalwear'}, 'dresses')).toBe(true);
    expect(isSlot({main_category: 'TraditionalWear'}, 'dresses')).toBe(true);
  });

  it('filterBySlot should filter items correctly', () => {
    const {filterBySlot} = require('../lib/categoryMapping');

    const items = [
      {main_category: 'Tops', name: 'Shirt'},
      {main_category: 'Bottoms', name: 'Pants'},
      {main_category: 'Skirts', name: 'Pleated Skirt'},
      {main_category: 'Shoes', name: 'Sneakers'},
    ];

    // Bottoms slot should include both Bottoms and Skirts
    const bottoms = filterBySlot(items, 'bottoms');
    expect(bottoms).toHaveLength(2);
    expect(bottoms.map((i: any) => i.name)).toEqual([
      'Pants',
      'Pleated Skirt',
    ]);

    const tops = filterBySlot(items, 'tops');
    expect(tops).toHaveLength(1);
    expect(tops[0].name).toBe('Shirt');
  });
});

describe('REGRESSION: Skirts in Bottoms Slot', () => {
  it('Skirts should be included when filtering for bottoms', () => {
    const {filterBySlot, isSlot} = require('../lib/categoryMapping');

    const wardrobe = [
      {main_category: 'Tops', name: 'T-Shirt'},
      {main_category: 'Bottoms', name: 'Jeans'},
      {main_category: 'Skirts', name: 'Tiered Skirt'},
      {main_category: 'Shoes', name: 'Loafers'},
    ];

    // Filter for bottoms - should include both Bottoms and Skirts
    const bottoms = filterBySlot(wardrobe, 'bottoms');
    expect(bottoms).toHaveLength(2);
    expect(bottoms.map((i: any) => i.main_category)).toContain('Bottoms');
    expect(bottoms.map((i: any) => i.main_category)).toContain('Skirts');

    // isSlot should return true for Skirts when checking bottoms
    const skirt = wardrobe.find(i => i.main_category === 'Skirts');
    expect(isSlot(skirt, 'bottoms')).toBe(true);
  });
});
