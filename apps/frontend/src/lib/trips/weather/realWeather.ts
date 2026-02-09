import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiClient} from '../../apiClient';
import {DayWeather, WeatherCondition, WeatherResult} from '../../../types/trips';
import {generateMockWeather} from '../mockWeather';

// ── TEMP diagnostic tag (grep for this to remove later) ──
const TAG = '[TripsForecastDiag]';

// v2 cache key invalidates any stale entries from prior format
const CACHE_PREFIX = '@styliq_weather_v2_';
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

type CacheEntry = {
  data: DayWeather[];
  expiry: number;
};

// ── Cache helpers ──

async function getCached(city: string): Promise<DayWeather[] | null> {
  try {
    const key = CACHE_PREFIX + city.toLowerCase().trim();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      console.log(TAG, `Cache MISS for "${city}" (no entry)`);
      return null;
    }
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.expiry > Date.now()) {
      console.log(
        TAG,
        `Cache HIT for "${city}" — ${entry.data.length} days, expires in ${Math.round((entry.expiry - Date.now()) / 1000)}s`,
      );
      return entry.data;
    }
    console.log(TAG, `Cache EXPIRED for "${city}", removing`);
    await AsyncStorage.removeItem(key);
  } catch {
    console.warn(TAG, `Cache read error for "${city}"`);
  }
  return null;
}

async function setCache(city: string, data: DayWeather[]): Promise<void> {
  try {
    const key = CACHE_PREFIX + city.toLowerCase().trim();
    const entry: CacheEntry = {data, expiry: Date.now() + CACHE_TTL};
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    console.log(TAG, `Cache SET for "${city}" — ${data.length} days`);
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
 */
export async function fetchRealWeather(
  city: string,
  startDate: string,
  endDate: string,
): Promise<WeatherResult> {
  console.log(TAG, `START fetchRealWeather("${city}", ${startDate}, ${endDate})`);

  // Check frontend cache first
  const cached = await getCached(city);
  if (cached && cached.length > 0) {
    console.log(TAG, `Returning CACHED weather for "${city}"`);
    return {days: buildTripWeather(cached, startDate, endDate), source: 'cached'};
  }

  try {
    console.log(TAG, `Fetching /weather?city=${encodeURIComponent(city)} …`);
    const res = await apiClient.get('/weather', {params: {city}});
    console.log(
      TAG,
      `API response status=${res.status}, forecast count=${res.data?.forecast?.length ?? 0}`,
    );

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
      await setCache(city, forecast);
      console.log(TAG, `SUCCESS — returning ${forecast.length} real forecast days`);
      return {days: buildTripWeather(forecast, startDate, endDate), source: 'live'};
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
