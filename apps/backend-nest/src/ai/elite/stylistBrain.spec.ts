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
          budget_min: 50,
          budget_max: 200,
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
    expect(result.styleProfile!.budget_min).toBe(50);
    expect(result.styleProfile!.budget_max).toBe(200);
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
          budget_min: null,
          budget_max: null,
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
});
