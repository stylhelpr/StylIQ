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
  it('StyleProfileFields does NOT include budget_min, budget_max, shopping_habits, or fashion_confidence', async () => {
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
          // These banned fields exist in DB but must NOT be loaded:
          budget_min: 50,
          budget_max: 200,
          shopping_habits: ['online'],
          fashion_confidence: 'high',
        }],
      } as any);
    mockFashionStateService.getStateSummary.mockResolvedValue(null);

    const result = await loadStylistBrainContext('user-123', mockFashionStateService);
    const sp = result.styleProfile!;

    // Banned fields must NOT exist on the returned object
    expect(sp).not.toHaveProperty('budget_min');
    expect(sp).not.toHaveProperty('budget_max');
    expect(sp).not.toHaveProperty('shopping_habits');
    expect(sp).not.toHaveProperty('fashion_confidence');

    // Approved fields still present
    expect(sp.fit_preferences).toEqual(['slim']);
    expect(sp.occasions).toEqual(['Work']);
  });
});
