/**
 * Stylist Brain — Unit Tests
 *
 * Tests the unified context loader and its helper functions.
 * Uses mocked pool and FashionStateService.
 */

// Mock the pool module before imports
jest.mock('../../db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { loadStylistBrainContext } from './stylistBrain';
import { pool } from '../../db/pool';

const mockPool = pool as jest.Mocked<typeof pool>;

const mockFashionStateService = {
  getStateSummary: jest.fn(),
} as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loadStylistBrainContext', () => {
  it('returns full context when all queries succeed', async () => {
    // Leg 1: gender_presentation
    mockPool.query
      .mockResolvedValueOnce({
        rows: [{ gender_presentation: 'Male' }],
      } as any)
      // Leg 2: style_profiles
      .mockResolvedValueOnce({
        rows: [{
          fit_preferences: ['slim', 'tailored'],
          fabric_preferences: ['cotton', 'linen'],
          favorite_colors: ['navy', 'grey'],
          disliked_styles: ['bohemian'],
          style_preferences: ['minimalist'],
          preferred_brands: ['Uniqlo', 'J.Crew'],
          occasions: ['Work', 'Casual'],
          body_type: 'athletic',
          climate: 'temperate',
        }],
      } as any);

    mockFashionStateService.getStateSummary.mockResolvedValue({
      topBrands: ['Nike'],
      avoidBrands: ['Gucci'],
      topColors: ['black'],
      avoidColors: ['neon'],
      topStyles: ['streetwear'],
      avoidStyles: ['preppy'],
      topCategories: ['Tops'],
      priceBracket: 'mid',
      isColdStart: false,
    });

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);

    expect(result.presentation).toBe('masculine');
    expect(result.styleProfile).not.toBeNull();
    expect(result.styleProfile!.fit_preferences).toEqual(['slim', 'tailored']);
    expect(result.styleProfile!.preferred_brands).toEqual(['Uniqlo', 'J.Crew']);
    expect(result.styleProfile!.occasions).toEqual(['Work', 'Casual']);
    expect(result.fashionState).not.toBeNull();
    expect(result.fashionState!.topBrands).toEqual(['Nike']);
  });

  it('resolves feminine presentation correctly', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ gender_presentation: 'Female' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    expect(result.presentation).toBe('feminine');
  });

  it('resolves mixed presentation for nonbinary/other', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ gender_presentation: 'Non-Binary' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    expect(result.presentation).toBe('mixed');
  });

  it('fail-open: returns defaults when gender query fails', async () => {
    mockPool.query
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({ rows: [] } as any);
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    expect(result.presentation).toBe('mixed');
    expect(result.styleProfile).toBeNull();
  });

  it('fail-open: returns defaults when style_profiles query fails', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ gender_presentation: 'male' }] } as any)
      .mockRejectedValueOnce(new Error('DB error'));
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    expect(result.presentation).toBe('masculine');
    expect(result.styleProfile).toBeNull();
  });

  it('fail-open: returns defaults when fashionState fails', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ gender_presentation: 'male' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);
    mockFashionStateService.getStateSummary.mockRejectedValue(new Error('timeout'));

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    expect(result.presentation).toBe('masculine');
    expect(result.fashionState).toBeNull();
  });

  it('handles null/missing array fields in style_profiles', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ gender_presentation: 'female' }] } as any)
      .mockResolvedValueOnce({
        rows: [{
          fit_preferences: null,
          fabric_preferences: undefined,
          favorite_colors: 'not-an-array',
          disliked_styles: [],
          style_preferences: ['casual'],
          preferred_brands: ['Nike'],
          occasions: [],
          body_type: null,
          climate: null,
        }],
      } as any);
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    expect(result.styleProfile!.fit_preferences).toEqual([]);
    expect(result.styleProfile!.fabric_preferences).toEqual([]);
    expect(result.styleProfile!.favorite_colors).toEqual([]);
    expect(result.styleProfile!.disliked_styles).toEqual([]);
    expect(result.styleProfile!.preferred_brands).toEqual(['Nike']);
  });

  it('returns null styleProfile when no row found', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ gender_presentation: 'male' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    expect(result.styleProfile).toBeNull();
  });

  it('occasions is included in loaded profile', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ gender_presentation: 'Female' }] } as any)
      .mockResolvedValueOnce({
        rows: [{
          fit_preferences: [],
          fabric_preferences: [],
          favorite_colors: [],
          disliked_styles: [],
          style_preferences: [],
          preferred_brands: [],
          occasions: ['Work', 'Gym', 'Date Night'],
          body_type: null,
          climate: null,
        }],
      } as any);
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    expect(result.styleProfile!.occasions).toEqual(['Work', 'Gym', 'Date Night']);
  });
});

// ── Policy guard: banned fields NEVER appear in StyleProfileFields ──

describe('Banned fields policy', () => {
  it('StyleProfileFields does NOT include shopping_habits', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ gender_presentation: 'Male' }] } as any)
      .mockResolvedValueOnce({
        rows: [{
          fit_preferences: ['slim'],
          fabric_preferences: ['cotton'],
          favorite_colors: ['navy'],
          disliked_styles: [],
          style_preferences: ['minimalist'],
          preferred_brands: ['Uniqlo'],
          occasions: ['Work'],
          body_type: 'athletic',
          climate: 'temperate',
          budget_min: 50,
          budget_max: 200,
          fashion_confidence: 'high',
          shopping_habits: ['online'],
        }],
      } as any);
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    const sp = result.styleProfile!;

    // shopping_habits remains banned (not AI-relevant)
    expect(sp).not.toHaveProperty('shopping_habits');

    // budget_min, budget_max, fashion_confidence are now LLM-only fields
    expect(sp.budget_min).toBe(50);
    expect(sp.budget_max).toBe(200);
    expect(sp.fashion_confidence).toBe('high');

    // Approved fields still present
    expect(sp.fit_preferences).toEqual(['slim']);
    expect(sp.occasions).toEqual(['Work']);
  });
});

// ── P0 fields parsing ─────────────────────────────────────────────────────

describe('P0/P1/LLM field parsing', () => {
  it('parseStyleProfileRow returns P0 fields from DB row', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ gender_presentation: 'Female' }] } as any)
      .mockResolvedValueOnce({
        rows: [{
          fit_preferences: [],
          fabric_preferences: [],
          favorite_colors: [],
          disliked_styles: [],
          style_preferences: [],
          preferred_brands: [],
          occasions: [],
          body_type: null,
          climate: null,
          // P0
          coverage_no_go: ['No midriff exposure', 'No cleavage'],
          avoid_colors: ['Neon', 'Hot Pink'],
          avoid_materials: ['Leather', 'Fur'],
          formality_floor: 'Business Casual',
          walkability_requirement: 'High',
          // P1
          pattern_preferences: ['Solid', 'Stripe'],
          avoid_patterns: ['Floral'],
          silhouette_preference: 'Structured',
          care_tolerance: 'Easy care only',
          metal_preference: 'Gold',
          contrast_preference: 'High contrast',
          footwear_comfort: 'Comfort first',
          foot_width: 'Wide',
          // LLM
          fashion_boldness: 'Bold standout pieces',
          trend_appetite: 'Selectively trendy',
          fashion_confidence: 'Very confident',
          budget_min: 50,
          budget_max: 300,
          style_icons: ['Zendaya', 'Harry Styles'],
          daily_activities: ['Office', 'Gym'],
          personality_traits: ['Creative', 'Confident'],
          lifestyle_notes: 'Walks to work daily',
        }],
      } as any);
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    const sp = result.styleProfile!;

    // P0
    expect(sp.coverage_no_go).toEqual(['No midriff exposure', 'No cleavage']);
    expect(sp.avoid_colors).toEqual(['Neon', 'Hot Pink']);
    expect(sp.avoid_materials).toEqual(['Leather', 'Fur']);
    expect(sp.formality_floor).toBe('Business Casual');
    expect(sp.walkability_requirement).toBe('High');

    // P1
    expect(sp.pattern_preferences).toEqual(['Solid', 'Stripe']);
    expect(sp.avoid_patterns).toEqual(['Floral']);
    expect(sp.silhouette_preference).toBe('Structured');
    expect(sp.care_tolerance).toBe('Easy care only');
    expect(sp.metal_preference).toBe('Gold');
    expect(sp.contrast_preference).toBe('High contrast');
    expect(sp.footwear_comfort).toBe('Comfort first');
    expect(sp.foot_width).toBe('Wide');

    // LLM
    expect(sp.fashion_boldness).toBe('Bold standout pieces');
    expect(sp.trend_appetite).toBe('Selectively trendy');
    expect(sp.budget_min).toBe(50);
    expect(sp.budget_max).toBe(300);
    expect(sp.style_icons).toEqual(['Zendaya', 'Harry Styles']);
    expect(sp.daily_activities).toEqual(['Office', 'Gym']);
    expect(sp.personality_traits).toEqual(['Creative', 'Confident']);
    expect(sp.lifestyle_notes).toBe('Walks to work daily');
  });

  it('returns empty arrays/null for missing P0 fields (fail-open)', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ gender_presentation: 'Male' }] } as any)
      .mockResolvedValueOnce({
        rows: [{
          fit_preferences: [],
          fabric_preferences: [],
          favorite_colors: [],
          disliked_styles: [],
          style_preferences: [],
          preferred_brands: [],
          occasions: [],
          body_type: null,
          climate: null,
          // P0 all missing/null
          coverage_no_go: null,
          avoid_colors: undefined,
          avoid_materials: null,
          formality_floor: null,
          walkability_requirement: null,
        }],
      } as any);
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    const sp = result.styleProfile!;

    expect(sp.coverage_no_go).toEqual([]);
    expect(sp.avoid_colors).toEqual([]);
    expect(sp.avoid_materials).toEqual([]);
    expect(sp.formality_floor).toBeNull();
    expect(sp.walkability_requirement).toBeNull();
    expect(sp.budget_min).toBeNull();
    expect(sp.budget_max).toBeNull();
    expect(sp.style_icons).toEqual([]);
    expect(sp.lifestyle_notes).toBeNull();
  });
});
