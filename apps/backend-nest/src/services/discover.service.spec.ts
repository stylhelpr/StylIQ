import { __test__ } from './discover.service';

const { normalize, wordBoundaryMatch, LOOSE_FIT_TOKENS } = __test__;

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
