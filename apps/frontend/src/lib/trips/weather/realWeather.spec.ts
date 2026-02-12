import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchRealWeather} from './realWeather';

// ── Mocks ──

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockApiGet = jest.fn();
jest.mock('../../apiClient', () => ({
  apiClient: {get: (...args: any[]) => mockApiGet(...args)},
}));

jest.mock('../mockWeather', () => ({
  generateMockWeather: jest.fn(() => [
    {date: '2026-04-01', dayLabel: 'Wed', highF: 70, lowF: 55, condition: 'sunny', rainChance: 10},
    {date: '2026-04-02', dayLabel: 'Thu', highF: 72, lowF: 56, condition: 'sunny', rainChance: 5},
    {date: '2026-04-03', dayLabel: 'Fri', highF: 71, lowF: 54, condition: 'partly-cloudy', rainChance: 15},
  ]),
}));

// ── Helpers ──

const CITY = 'San Francisco';
const START = '2026-04-01';
const END = '2026-04-03';

const apiForecast = [
  {date: '2026-04-01', dayLabel: 'Wed', highF: 65, lowF: 50, condition: 'cloudy', rainChance: 30},
  {date: '2026-04-02', dayLabel: 'Thu', highF: 67, lowF: 52, condition: 'rainy', rainChance: 70},
  {date: '2026-04-03', dayLabel: 'Fri', highF: 63, lowF: 48, condition: 'cloudy', rainChance: 40},
];

function makeApiResponse() {
  return {
    status: 200,
    data: {
      city: 'San Francisco, CA, US',
      lat: 37.7749,
      lng: -122.4194,
      forecast: apiForecast,
    },
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockApiGet.mockReset();
});

// ── Tests ──

describe('fetchRealWeather — cache bypass', () => {
  it('normal path returns cached data without calling API', async () => {
    // First call: cache miss → API call → cache set
    mockApiGet.mockResolvedValueOnce(makeApiResponse());
    const result1 = await fetchRealWeather(CITY, START, END);
    expect(result1.source).toBe('live');
    expect(mockApiGet).toHaveBeenCalledTimes(1);

    // Second call: cache hit → no API call
    mockApiGet.mockReset();
    const result2 = await fetchRealWeather(CITY, START, END);
    expect(result2.source).toBe('cached');
    expect(result2.days.length).toBe(3);
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('bypassCache returns fresh data even if cache entry exists', async () => {
    // First call: populate cache
    mockApiGet.mockResolvedValueOnce(makeApiResponse());
    await fetchRealWeather(CITY, START, END);

    // Second call with bypass: must call API again
    mockApiGet.mockReset();
    const freshForecast = apiForecast.map(d => ({...d, highF: d.highF + 10}));
    mockApiGet.mockResolvedValueOnce({
      status: 200,
      data: {city: 'San Francisco, CA, US', lat: 37.7749, lng: -122.4194, forecast: freshForecast},
    });

    const result = await fetchRealWeather(CITY, START, END, {bypassCache: true, reason: 'FORCE_REBUILD'});
    expect(result.source).toBe('live');
    expect(result.days[0].highF).toBe(75); // 65 + 10
    expect(mockApiGet).toHaveBeenCalledTimes(1);
  });

  it('bypass deletes existing cache entry', async () => {
    // Populate cache
    mockApiGet.mockResolvedValueOnce(makeApiResponse());
    await fetchRealWeather(CITY, START, END);

    // Bypass call
    mockApiGet.mockResolvedValueOnce(makeApiResponse());
    await fetchRealWeather(CITY, START, END, {bypassCache: true, reason: 'TEST'});

    // Verify cache was overwritten: next normal call should hit cache with fresh data
    mockApiGet.mockReset();
    const result = await fetchRealWeather(CITY, START, END);
    expect(result.source).toBe('cached');
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});

describe('fetchRealWeather — resolved location cache key', () => {
  it('stores resolved location and uses it in cache key on subsequent calls', async () => {
    // First call: no resolved location → city-based key
    mockApiGet.mockResolvedValueOnce(makeApiResponse());
    await fetchRealWeather(CITY, START, END);

    // Verify location resolution was stored
    const locKey = '@styliq_weather_loc_san francisco';
    const locRaw = await AsyncStorage.getItem(locKey);
    expect(locRaw).toBeTruthy();
    const loc = JSON.parse(locRaw!);
    expect(loc.lat).toBeCloseTo(37.7749, 2);
    expect(loc.lng).toBeCloseTo(-122.4194, 2);
    expect(loc.resolvedCity).toBe('San Francisco, CA, US');

    // Second call: resolved location available → lat/lng-based key
    // Cache hit should work because setCache used the resolved key
    mockApiGet.mockReset();
    const result = await fetchRealWeather(CITY, START, END);
    expect(result.source).toBe('cached');
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('cached payload includes resolved location details', async () => {
    mockApiGet.mockResolvedValueOnce(makeApiResponse());
    await fetchRealWeather(CITY, START, END);

    // Find the weather cache entry (key uses resolved lat/lng)
    const resolvedKey = '@styliq_weather_v2_37.77:-122.42:2026-04-01:2026-04-03';
    const raw = await AsyncStorage.getItem(resolvedKey);
    expect(raw).toBeTruthy();
    const entry = JSON.parse(raw!);
    expect(entry.resolved).toBeDefined();
    expect(entry.resolved.lat).toBeCloseTo(37.7749, 2);
    expect(entry.resolved.resolvedCity).toBe('San Francisco, CA, US');
  });
});
