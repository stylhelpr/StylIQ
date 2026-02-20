import { __test__ } from './discover.service';

const { normalize, wordBoundaryMatch, LOOSE_FIT_TOKENS, extractBrandFromTitle, resolveBrandTier, getSemanticCluster } = __test__;

// ── Slim preference blocks loose-fit tokens ──────────────────────────

describe('Fit hard veto: slim preference blocks loose-fit items', () => {
  const mustBlock = [
    'oversized',
    'relaxed fit',
    'over-sized',
    'wide leg',
    'baggy',
    'boxy',
  ];

  for (const token of mustBlock) {
    it(`blocks "${token}"`, () => {
      const blob = normalize(`Cool ${token} cotton jacket`);
      const matched = [...LOOSE_FIT_TOKENS].some(t => blob.includes(t));
      expect(matched).toBe(true);
    });
  }
});

// ── Token-safe veto matching (word-boundary) ─────────────────────────

describe('Token-safe veto matching: avoid_colors word boundary', () => {
  it('blocks "red jacket"', () => {
    const blob = normalize('red jacket');
    expect(wordBoundaryMatch(blob, 'red')).toBe(true);
  });

  it('does NOT block "tired man sweater"', () => {
    const blob = normalize('tired man sweater');
    expect(wordBoundaryMatch(blob, 'red')).toBe(false);
  });
});

// ── Deterministic ranking: same input → identical ordering ───────────

describe('Deterministic ranking: normalize + scoring is stable', () => {
  it('normalize produces identical output for identical input', () => {
    const inputs = [
      'Oversized Relaxed-Fit Wide Leg Pants',
      'Classic Slim-Fit Red Polo Shirt',
      'Baggy Cotton Hoodie — Limited Edition!',
    ];
    const run1 = inputs.map(normalize);
    const run2 = inputs.map(normalize);
    expect(run1).toEqual(run2);
  });

  it('wordBoundaryMatch is deterministic', () => {
    const blob = normalize('tired man red sweater blue boxy wide leg');
    const tokens = ['red', 'blue', 'boxy', 'tired'];
    const run1 = tokens.map(t => wordBoundaryMatch(blob, t));
    const run2 = tokens.map(t => wordBoundaryMatch(blob, t));
    expect(run1).toEqual(run2);
  });
});

// ── Tier 4 integration: module imports work ─────────────────────────

describe('Tier 4 integration: discover-veto module', () => {
  it('is importable and exports applyDiscoverVeto', () => {
    const veto = require('./discover-veto');
    expect(typeof veto.applyDiscoverVeto).toBe('function');
    expect(typeof veto.inferProductFormality).toBe('function');
    expect(typeof veto.FORMALITY_RANK_MAP).toBe('object');
    expect(typeof veto.normalizeForVeto).toBe('function');
  });
});

describe('Tier 4 integration: discover-curator module', () => {
  it('is importable and exports computeCuratorSignals', () => {
    const curator = require('./discover-curator');
    expect(typeof curator.computeCuratorSignals).toBe('function');
    expect(typeof curator.classifyColorFamily).toBe('function');
  });
});

// ── Brand extraction from title ─────────────────────────────────────

describe('extractBrandFromTitle', () => {
  it('extracts "gucci" from title', () => {
    expect(extractBrandFromTitle('Gucci Men\'s Leather Belt')).toBe('gucci');
  });

  it('extracts "ralph lauren" (multi-word) from title', () => {
    expect(extractBrandFromTitle('Ralph Lauren Classic Fit Polo')).toBe('ralph lauren');
  });

  it('extracts "hugo boss" from title', () => {
    expect(extractBrandFromTitle('Hugo Boss Slim Fit Suit Jacket')).toBe('hugo boss');
  });

  it('extracts "saint laurent" from title', () => {
    expect(extractBrandFromTitle('Saint Laurent Leather Boots')).toBe('saint laurent');
  });

  it('returns null when no known brand in title', () => {
    expect(extractBrandFromTitle('Cool Cotton T-Shirt')).toBeNull();
  });

  it('returns null for empty title', () => {
    expect(extractBrandFromTitle('')).toBeNull();
  });

  it('does NOT false-positive "express" inside "expressed"', () => {
    expect(extractBrandFromTitle('She expressed joy at the garment')).toBeNull();
  });

  it('does NOT false-positive "gap" inside "gaping"', () => {
    expect(extractBrandFromTitle('Wide gaping neckline sweater')).toBeNull();
  });

  it('prefers longer multi-word brand over shorter substring', () => {
    // "polo ralph lauren" (16 chars) should match before "polo" would (not in tiers anyway)
    expect(extractBrandFromTitle('Polo Ralph Lauren Oxford Shirt')).toBe('polo ralph lauren');
  });

  // ── Spam / position hardening ────────────────────────────────────

  it('extracts brand at position 0 (primary placement)', () => {
    expect(extractBrandFromTitle('Gucci Leather Belt')).toBe('gucci');
  });

  it('extracts brand at position 1 (within first 3 tokens)', () => {
    expect(extractBrandFromTitle("Men's Gucci Leather Belt")).toBe('gucci');
  });

  it('extracts brand at position 2 (within first 3 tokens)', () => {
    expect(extractBrandFromTitle('Classic Luxury Prada Shoes')).toBe('prada');
  });

  it('accepts brand within first 5 tokens', () => {
    // "gucci" at token index 4 — within ≤4 boundary
    expect(extractBrandFromTitle('Luxury Designer Cashmere Wool Gucci Sweater')).toBe('gucci');
  });

  it('rejects brand beyond first 5 tokens', () => {
    expect(extractBrandFromTitle('Luxury Designer Cashmere Wool Cotton Knit Gucci Sweater')).toBeNull();
  });

  it('rejects brand after "discount" spam prefix', () => {
    expect(extractBrandFromTitle('Discount Gucci Belt for Sale')).toBeNull();
  });

  it('rejects brand after "buy" spam prefix', () => {
    expect(extractBrandFromTitle('Buy Prada Shoes 2026')).toBeNull();
  });

  it('rejects brand after "sale" spam prefix', () => {
    expect(extractBrandFromTitle('Sale Chanel Bags Online')).toBeNull();
  });

  it('rejects brand after "cheap" spam prefix', () => {
    expect(extractBrandFromTitle('Cheap Versace Knockoff Dress')).toBeNull();
  });

  it('rejects brand after "sell" spam prefix', () => {
    expect(extractBrandFromTitle('Sell Gucci Handbag Fast')).toBeNull();
  });

  it('accepts "Chanel Cashmere Sweater" (tier 1, primary placement)', () => {
    expect(extractBrandFromTitle('Chanel Cashmere Sweater')).toBe('chanel');
  });

  it('rejects spam-stuffed title with luxury brand buried mid-title', () => {
    expect(extractBrandFromTitle(
      'Discount chanel sweaters for sale 2026 Chanel knitwear',
    )).toBeNull();
  });

  it('is deterministic across 100 runs', () => {
    const titles = [
      'Gucci Leather Belt',
      'Discount Gucci Belt for Sale',
      'Buy Prada Shoes 2026',
      'Chanel Cashmere Sweater',
    ];
    const firstResults = titles.map(t => extractBrandFromTitle(t));
    for (let i = 0; i < 100; i++) {
      titles.forEach((t, idx) => {
        expect(extractBrandFromTitle(t)).toBe(firstResults[idx]);
      });
    }
  });
});

describe('resolveBrandTier', () => {
  it('title brand overrides retailer source', () => {
    // Title has "Vince" (not in tiers) + brand="Editorialist" (not in tiers) → tier 4
    // But title with "Gucci" + source="Editorialist" → tier 1
    const tier = resolveBrandTier('Gucci Men\'s Leather Belt', 'Editorialist', 'Editorialist');
    expect(tier).toBe(1);
  });

  it('title brand overrides p.brand when p.brand is a retailer', () => {
    const tier = resolveBrandTier('Hugo Boss Slim Fit Blazer', 'Saks Fifth Avenue', 'Saks');
    expect(tier).toBe(2); // hugo boss = tier 2
  });

  it('falls back to p.brand when title has no known brand', () => {
    const tier = resolveBrandTier('Classic Cotton Polo Shirt', 'zara', null);
    expect(tier).toBe(3); // zara = tier 3
  });

  it('falls back to p.source when title and brand have no known brand', () => {
    const tier = resolveBrandTier('Classic Cotton Polo', null, 'Walmart');
    expect(tier).toBe(5); // walmart = tier 5
  });

  it('returns 4 (default) when nothing matches', () => {
    const tier = resolveBrandTier('Some Random Product', 'Unknown Store', 'Random Source');
    expect(tier).toBe(4);
  });

  it('is deterministic across 100 runs', () => {
    const first = resolveBrandTier('Gucci Leather Belt', 'Editorialist', 'Saks');
    for (let i = 0; i < 100; i++) {
      expect(resolveBrandTier('Gucci Leather Belt', 'Editorialist', 'Saks')).toBe(first);
    }
  });
});

// ── Casual Inflation Dampener: unit-level signal conditions ──────────

describe('Casual inflation dampener: cluster + token conditions', () => {
  // Verify cluster assignment for tokens that should trigger the penalty
  it('"Graphic Tee" lands in top_cluster (tee triggers)', () => {
    expect(getSemanticCluster('Old Navy Graphic Tee')).toBe('top_cluster');
  });

  it('"Icon Tee" lands in top_cluster', () => {
    expect(getSemanticCluster('Icon Tee Cotton')).toBe('top_cluster');
  });

  it('"Logo Tee" lands in top_cluster', () => {
    expect(getSemanticCluster('Logo Tee')).toBe('top_cluster');
  });

  it('"Lightweight Tee" lands in top_cluster', () => {
    expect(getSemanticCluster('Lightweight Tee')).toBe('top_cluster');
  });

  // Verify normalized tokens match in normalized product text
  it('"hoodie" token matches in normalized text', () => {
    const normText = normalize('Old Navy Classic Hoodie');
    expect(normText.includes('hoodie')).toBe(true);
  });

  it('"sweatshirt" token matches in normalized text', () => {
    const normText = normalize('Relaxed Sweatshirt Pullover');
    expect(normText.includes('sweatshirt')).toBe(true);
  });

  it('"graphic tee" token matches in normalized text', () => {
    const normText = normalize('Old Navy Graphic Tee');
    expect(normText.includes('graphic tee')).toBe(true);
  });

  it('"livedin tee" token matches normalized "Lived-In Tee"', () => {
    const normText = normalize('Old Navy Lived-In Tee');
    expect(normText.includes('livedin tee')).toBe(true);
  });

  // Brand tier conditions
  it('Old Navy resolves to tier 4 (penalty eligible)', () => {
    expect(resolveBrandTier('Old Navy Graphic Tee', 'Old Navy', null)).toBe(4);
  });

  it('Gucci resolves to tier 1 (penalty NOT eligible)', () => {
    expect(resolveBrandTier('Gucci Cotton Tee', 'Gucci', null)).toBe(1);
  });

  it('Theory resolves to tier 2 (penalty NOT eligible)', () => {
    expect(resolveBrandTier('Theory Graphic Tee', 'Theory', null)).toBe(2);
  });

  // Negative cases: elevated brands should NOT be penalized
  it('luxury brand graphic tee is NOT eligible (tier 1)', () => {
    const tier = resolveBrandTier('Gucci Graphic Tee', 'Gucci', null);
    expect(tier).toBeLessThan(4);
  });

  it('premium brand sweater is NOT eligible (tier 2)', () => {
    const tier = resolveBrandTier('Theory Cashmere Sweater', 'Theory', null);
    expect(tier).toBeLessThan(4);
  });
});
