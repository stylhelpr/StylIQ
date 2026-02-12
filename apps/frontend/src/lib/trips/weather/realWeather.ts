import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiClient} from '../../apiClient';
import {DayWeather, WeatherCondition, WeatherResult} from '../../../types/trips';
import {generateMockWeather} from '../mockWeather';

// ── TEMP diagnostic tag (grep for this to remove later) ──
const TAG = '[TripsForecastDiag]';

const CACHE_PREFIX = '@styliq_weather_v2_';
const LOCATION_PREFIX = '@styliq_weather_loc_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const VALID_CONDITIONS: WeatherCondition[] = [
  'sunny',
  'partly-cloudy',
  'cloudy',
  'rainy',
  'snowy',
  'windy',
];

// ── Types ──

export type ResolvedLocation = {
  lat: number;
  lng: number;
  resolvedCity: string;
};

export type FetchWeatherOptions = {
  bypassCache?: boolean;
  reason?: string;
};

type CacheEntry = {
  data: DayWeather[];
  expiry: number;
  resolved?: ResolvedLocation;
};

// ── Location resolution cache ──

function locationFingerprint(resolved: ResolvedLocation): string {
  return `${resolved.lat.toFixed(2)}:${resolved.lng.toFixed(2)}`;
}

async function getResolvedLocation(city: string): Promise<ResolvedLocation | null> {
  try {
    const key = LOCATION_PREFIX + city.toLowerCase().trim();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ResolvedLocation;
  } catch {
    return null;
  }
}

export async function setResolvedLocation(city: string, resolved: ResolvedLocation): Promise<void> {
  try {
    const key = LOCATION_PREFIX + city.toLowerCase().trim();
    await AsyncStorage.setItem(key, JSON.stringify(resolved));
    console.log(TAG, `Location resolution SET "${city}" → ${resolved.resolvedCity} (${locationFingerprint(resolved)})`);
  } catch {
    console.warn(TAG, `Location resolution write error for "${city}"`);
  }
}

// ── Weather cache helpers ──

function buildCacheKey(
  startDate: string,
  endDate: string,
  resolved: ResolvedLocation | null,
  city: string,
): string {
  const locPart = resolved ? locationFingerprint(resolved) : city.toLowerCase().trim();
  return CACHE_PREFIX + locPart + ':' + startDate + ':' + endDate;
}

function expectedDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / (86400 * 1000)) + 1;
}

async function getCached(
  key: string,
  startDate: string,
  endDate: string,
  city: string,
): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      console.log(TAG, `Cache MISS for "${city}" ${startDate}→${endDate} (no entry)`);
      return null;
    }
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.expiry <= Date.now()) {
      console.log(TAG, `Cache EXPIRED for "${city}" ${startDate}→${endDate}, removing`);
      await AsyncStorage.removeItem(key);
      return null;
    }

    const expected = expectedDayCount(startDate, endDate);
    const resolvedInfo = entry.resolved
      ? ` resolved=${entry.resolved.resolvedCity} (${locationFingerprint(entry.resolved)})`
      : '';
    console.log(
      TAG,
      `Cache HIT for "${city}" ${startDate}→${endDate} — cached=${entry.data.length} days, expected=${expected}, expires in ${Math.round((entry.expiry - Date.now()) / 1000)}s${resolvedInfo}`,
    );

    // Safety: invalidate if cached day count doesn't match expected
    if (entry.data.length !== expected) {
      console.warn(
        TAG,
        `Cache INVALIDATED for "${city}" — cached ${entry.data.length} days but need ${expected}. Refetching.`,
      );
      await AsyncStorage.removeItem(key);
      return null;
    }

    return entry;
  } catch {
    console.warn(TAG, `Cache read error for "${city}" ${startDate}→${endDate}`);
  }
  return null;
}

async function setCache(
  key: string,
  data: DayWeather[],
  city: string,
  resolved?: ResolvedLocation,
): Promise<void> {
  try {
    const entry: CacheEntry = {data, expiry: Date.now() + CACHE_TTL, resolved};
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    console.log(TAG, `Cache SET for "${city}" — ${data.length} days, key="${key}"`);
  } catch {
    console.warn(TAG, `Cache write error for "${city}"`);
  }
}

// ── Condition normalization ──

function normalizeCondition(cond: string): WeatherCondition {
  if (VALID_CONDITIONS.includes(cond as WeatherCondition)) {
    return cond as WeatherCondition;
  }
  return 'partly-cloudy';
}

// ── Build trip-length weather from forecast ──

function buildTripWeather(
  forecast: DayWeather[],
  startDate: string,
  endDate: string,
): DayWeather[] {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const forecastMap = new Map(forecast.map(f => [f.date, f]));
  const result: DayWeather[] = [];

  // Averages from real forecast to fill gaps
  const avgHigh = Math.round(
    forecast.reduce((s, f) => s + f.highF, 0) / forecast.length,
  );
  const avgLow = Math.round(
    forecast.reduce((s, f) => s + f.lowF, 0) / forecast.length,
  );
  const avgRain = Math.round(
    forecast.reduce((s, f) => s + f.rainChance, 0) / forecast.length,
  );
  const commonCondition = forecast[0]?.condition || 'partly-cloudy';

  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const realDay = forecastMap.get(dateStr);

    if (realDay) {
      result.push(realDay);
    } else {
      // Extend with forecast averages for days beyond the 7-day window
      result.push({
        date: dateStr,
        dayLabel: DAY_LABELS[current.getDay()],
        highF: avgHigh,
        lowF: avgLow,
        condition: normalizeCondition(commonCondition),
        rainChance: avgRain,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return result;
}

// ── Main export ──

/**
 * Fetch real weather for a city and date range.
 * Falls back to mock weather on any failure.
 * Returns weather days + source tag for trust layer.
 *
 * Options:
 *   bypassCache — skip cache read and delete existing entry before fetching
 *   reason — logged for diagnostics when bypassing
 */
export async function fetchRealWeather(
  city: string,
  startDate: string,
  endDate: string,
  options?: FetchWeatherOptions,
): Promise<WeatherResult> {
  const {bypassCache = false, reason} = options || {};

  // Resolve location fingerprint from prior API calls
  const resolved = await getResolvedLocation(city);
  const key = buildCacheKey(startDate, endDate, resolved, city);

  console.log(
    TAG,
    `START fetchRealWeather("${city}", ${startDate}, ${endDate})` +
      (resolved ? ` resolved=${resolved.resolvedCity} (${locationFingerprint(resolved)})` : ' resolved=none') +
      ` key="${key}"`,
  );

  // ── Bypass path: delete cache entry, then fetch fresh ──
  if (bypassCache) {
    console.log(TAG, `Cache BYPASS reason="${reason || 'unspecified'}"`);
    try {
      await AsyncStorage.removeItem(key);
      console.log(TAG, `Cache DELETE key="${key}"`);
      // Also clean up old city-string-based key if we're using a resolved key
      if (resolved) {
        const oldKey = buildCacheKey(startDate, endDate, null, city);
        if (oldKey !== key) {
          await AsyncStorage.removeItem(oldKey);
          console.log(TAG, `Cache DELETE (old format) key="${oldKey}"`);
        }
      }
    } catch {
      console.warn(TAG, 'Cache bypass delete error (non-fatal)');
    }
  } else {
    // ── Normal path: check cache ──
    const cached = await getCached(key, startDate, endDate, city);
    if (cached && cached.data.length > 0) {
      console.log(TAG, `Returning CACHED weather for "${city}" ${startDate}→${endDate}`);
      return {days: cached.data, source: 'cached'};
    }
  }

  try {
    console.log(TAG, `Fetching /weather?city=${encodeURIComponent(city)} …`);
    const res = await apiClient.get('/weather', {params: {city}});
    console.log(
      TAG,
      `API response status=${res.status}, forecast count=${res.data?.forecast?.length ?? 0}`,
    );

    // Extract resolved location from API response (lat/lng from geocoding)
    const apiResolved: ResolvedLocation | undefined =
      res.data?.lat != null && res.data?.lng != null
        ? {
            lat: res.data.lat,
            lng: res.data.lng,
            resolvedCity: res.data.city || city,
          }
        : undefined;

    if (apiResolved) {
      console.log(
        TAG,
        `Resolved location: ${apiResolved.resolvedCity} (${apiResolved.lat.toFixed(4)}, ${apiResolved.lng.toFixed(4)})`,
      );
      await setResolvedLocation(city, apiResolved);
    }

    if (__DEV__) {
      console.log(
        TAG,
        'API payload sample:',
        JSON.stringify(res.data?.forecast?.[0] ?? '(empty)'),
      );
    }

    const forecast: DayWeather[] = (res.data.forecast || []).map(
      (day: any) => ({
        date: day.date,
        dayLabel: day.dayLabel,
        highF: day.highF,
        lowF: day.lowF,
        condition: normalizeCondition(day.condition),
        rainChance: day.rainChance,
      }),
    );

    if (forecast.length > 0) {
      const tripWeather = buildTripWeather(forecast, startDate, endDate);
      // Store with resolved-location key (or city key if no resolved data)
      const finalKey = apiResolved
        ? buildCacheKey(startDate, endDate, apiResolved, city)
        : key;
      await setCache(finalKey, tripWeather, city, apiResolved);
      console.log(TAG, `SUCCESS — returning ${tripWeather.length} trip weather days`);
      return {days: tripWeather, source: 'live'};
    }

    console.warn(TAG, `FALLBACK TO MOCK — API returned empty forecast for "${city}"`);
    const mock = generateMockWeather(city, startDate, endDate);
    console.warn(TAG, `MOCK sample day0: high=${mock[0]?.highF} low=${mock[0]?.lowF} cond=${mock[0]?.condition}`);
    return {days: mock, source: 'estimated'};
  } catch (err: any) {
    // ── Surface exact error details for debugging ──
    const status = err?.response?.status;
    const body = err?.response?.data;
    const message = err?.message || String(err);
    const url = err?.config?.url;

    console.error(TAG, `FALLBACK — API error for "${city}":`);
    console.error(TAG, `  URL:     ${url ?? '(unknown)'}`);
    console.error(TAG, `  Status:  ${status ?? '(no response)'}`);
    console.error(TAG, `  Body:    ${JSON.stringify(body ?? '(none)')}`);
    console.error(TAG, `  Message: ${message}`);

    const mock = generateMockWeather(city, startDate, endDate);
    console.error(TAG, `MOCK sample day0: high=${mock[0]?.highF} low=${mock[0]?.lowF} cond=${mock[0]?.condition}`);
    return {days: mock, source: 'estimated'};
  }
}
