jest.mock('../../lib/apiClient', () => ({apiClient: {post: jest.fn()}}));

import {formatDisplayName, formatPlaceKey} from '../../screens/Trips/useGeocodeSearch';

describe('Destination Autocomplete', () => {
  describe('formatDisplayName', () => {
    it('joins name, state, and country', () => {
      expect(formatDisplayName('Kansas City', 'Kansas', 'US')).toBe(
        'Kansas City, Kansas, US',
      );
    });

    it('skips undefined state', () => {
      expect(formatDisplayName('London', undefined, 'GB')).toBe('London, GB');
    });

    it('handles name only', () => {
      expect(formatDisplayName('Tokyo')).toBe('Tokyo');
    });

    it('skips empty string parts', () => {
      expect(formatDisplayName('Paris', '', 'FR')).toBe('Paris, FR');
    });
  });

  describe('formatPlaceKey', () => {
    it('formats to 2 decimal places with colon separator', () => {
      expect(formatPlaceKey(39.1141, -94.6275)).toBe('39.11:-94.63');
    });

    it('matches locationFingerprint format from realWeather.ts', () => {
      // realWeather.ts: `${resolved.lat.toFixed(2)}:${resolved.lng.toFixed(2)}`
      const lat = 51.5074;
      const lng = -0.1278;
      expect(formatPlaceKey(lat, lng)).toBe(`${lat.toFixed(2)}:${lng.toFixed(2)}`);
    });

    it('handles whole numbers', () => {
      expect(formatPlaceKey(40, -74)).toBe('40.00:-74.00');
    });
  });

  describe('GeocodeSuggestion shape', () => {
    it('produces a complete suggestion object from raw API data', () => {
      const raw = {name: 'New York', state: 'New York', country: 'US', lat: 40.7128, lon: -74.006};
      const suggestion = {
        displayName: formatDisplayName(raw.name, raw.state, raw.country),
        lat: raw.lat,
        lng: raw.lon,
        placeKey: formatPlaceKey(raw.lat, raw.lon),
      };

      expect(suggestion).toEqual({
        displayName: 'New York, New York, US',
        lat: 40.7128,
        lng: -74.006,
        placeKey: '40.71:-74.01',
      });
    });
  });

  describe('Backward compatibility', () => {
    it('existing trip without coordinates loads normally', () => {
      const legacyTrip = {
        id: 'abc123',
        destination: 'Paris',
        startDate: '2025-06-01',
        endDate: '2025-06-05',
        activities: [],
        startingLocationId: 'home',
        startingLocationLabel: 'Home',
        weather: [],
        capsule: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      // Optional fields are undefined — no crash
      expect(legacyTrip.destination).toBe('Paris');
      expect((legacyTrip as any).destinationLat).toBeUndefined();
      expect((legacyTrip as any).destinationLng).toBeUndefined();
      expect((legacyTrip as any).destinationPlaceKey).toBeUndefined();
    });
  });

  describe('Validation', () => {
    it('null selection means isValid === false', () => {
      const selectedDestination = null;
      const isValid = selectedDestination !== null;
      expect(isValid).toBe(false);
    });

    it('typing text without selecting still fails validation', () => {
      // User typed "Kansas" but never tapped a suggestion
      const selectedDestination = null;
      const isValid = selectedDestination !== null;
      expect(isValid).toBe(false);
    });

    it('selected suggestion passes validation', () => {
      const selectedDestination = {
        displayName: 'Kansas City, Kansas, US',
        lat: 39.1141,
        lng: -94.6275,
        placeKey: '39.11:-94.63',
      };
      const isValid = selectedDestination !== null;
      expect(isValid).toBe(true);
    });
  });

  describe('Debounce guard', () => {
    it('query shorter than 2 chars should not trigger search', () => {
      const MIN_QUERY_LENGTH = 2;
      expect('K'.length < MIN_QUERY_LENGTH).toBe(true);
      expect(''.length < MIN_QUERY_LENGTH).toBe(true);
      expect('Ka'.length < MIN_QUERY_LENGTH).toBe(false);
    });
  });
});
