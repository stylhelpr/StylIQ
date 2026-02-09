import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GeoResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface ForecastDay {
  date: string;
  dayLabel: string;
  highF: number;
  lowF: number;
  condition: string;
  rainChance: number;
  icon: string;
}

export interface WeatherResponse {
  city: string;
  lat: number;
  lng: number;
  forecast: ForecastDay[];
}

export interface CurrentWeatherResponse {
  city: string;
  lat: number;
  lng: number;
  tempF: number;
  tempC: number;
  feelsLikeF: number;
  feelsLikeC: number;
  tempMinF: number;
  tempMinC: number;
  tempMaxF: number;
  tempMaxC: number;
  windSpeedMph: number;
  windSpeedMs: number;
  humidity: number;
  pressure: number;
  condition: string;
  description: string;
  icon: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private cache = new Map<string, { data: WeatherResponse; expiry: number }>();
  private currentCache = new Map<
    string,
    { data: CurrentWeatherResponse; expiry: number }
  >();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(private readonly configService: ConfigService) {}

  async getWeather(city: string): Promise<WeatherResponse> {
    const cacheKey = city.toLowerCase().trim();
    this.logger.log(
      `[TripsForecastDiag] getWeather city="${city}" cacheKey="${cacheKey}"`,
    );
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      this.logger.log(
        `[TripsForecastDiag] Cache HIT — ${cached.data.forecast.length} days, city="${cached.data.city}"`,
      );
      return cached.data;
    }
    this.logger.log(`[TripsForecastDiag] Cache MISS`);

    const geo = await this.geocode(city);
    this.logger.log(
      `[TripsForecastDiag] Geocoded → lat=${geo.lat}, lng=${geo.lng}, addr="${geo.formattedAddress}"`,
    );
    const forecast = await this.fetchForecast(geo.lat, geo.lng);

    this.logger.log(
      `[TripsForecastDiag] Forecast returned ${forecast.length} days, ` +
        `first=${forecast[0]?.date} last=${forecast[forecast.length - 1]?.date}, ` +
        `sample day0: high=${forecast[0]?.highF} low=${forecast[0]?.lowF}`,
    );

    const result: WeatherResponse = {
      city: geo.formattedAddress || city,
      lat: geo.lat,
      lng: geo.lng,
      forecast,
    };

    this.cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + this.CACHE_TTL,
    });

    return result;
  }

  async geocode(city: string): Promise<GeoResult> {
    const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    if (!apiKey) {
      throw new Error('OPENWEATHER_API_KEY not configured');
    }

    // Normalize: "Calabasas, CA" → "Calabasas,CA,US" (OpenWeather format)
    const parts = city.split(',').map(p => p.trim()).filter(Boolean);
    let normalized = parts.join(',');
    // If 2-part like "City,CA", append US country code
    if (parts.length === 2 && /^[A-Z]{2}$/i.test(parts[1])) {
      normalized += ',US';
    }

    this.logger.log(
      `[TripsForecastDiag] geocode input="${city}" normalized="${normalized}"`,
    );

    const url =
      `https://api.openweathermap.org/geo/1.0/direct` +
      `?q=${encodeURIComponent(normalized)}&limit=1&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Geocoding HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) {
      throw new Error(`Geocoding returned no results for "${city}" (query="${normalized}")`);
    }

    const result = data[0];
    const formatted = [result.name, result.state, result.country]
      .filter(Boolean)
      .join(', ');

    this.logger.log(
      `[Weather] Geocoded "${city}" → ${result.lat}, ${result.lon} (${formatted})`,
    );

    return {
      lat: result.lat,
      lng: result.lon,
      formattedAddress: formatted,
    };
  }

  // ── Forecast: try One Call 3.0, fall back to free-tier 2.5 ──

  private async fetchForecast(
    lat: number,
    lng: number,
  ): Promise<ForecastDay[]> {
    const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    if (!apiKey) {
      throw new Error('OPENWEATHER_API_KEY not configured');
    }

    // Try One Call 3.0 first (requires paid subscription)
    try {
      return await this.fetchOneCall3(lat, lng, apiKey);
    } catch (err: any) {
      this.logger.warn(
        `[Weather] One Call 3.0 failed (${err.message}), trying free-tier 2.5 forecast`,
      );
    }

    // Fallback to free-tier 5-day/3-hour forecast
    return this.fetchForecast25(lat, lng, apiKey);
  }

  private async fetchOneCall3(
    lat: number,
    lng: number,
    apiKey: string,
  ): Promise<ForecastDay[]> {
    const url =
      `https://api.openweathermap.org/data/3.0/onecall` +
      `?lat=${lat}&lon=${lng}` +
      `&exclude=minutely,hourly,current,alerts` +
      `&appid=${apiKey}&units=imperial`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    const data = await res.json();
    if (!data.daily?.length) {
      throw new Error('No daily data in response');
    }

    this.logger.log(
      `[Weather] One Call 3.0 OK — ${data.daily.length} days, ` +
        `sample day0: min=${data.daily[0].temp.min} max=${data.daily[0].temp.max}`,
    );

    return data.daily.slice(0, 8).map((day: any) => {
      const date = new Date(day.dt * 1000);
      const weatherMain = day.weather?.[0]?.main || 'Clear';
      const weatherId = day.weather?.[0]?.id || 800;
      const windSpeed = day.wind_speed || 0;

      return {
        date: date.toISOString().split('T')[0],
        dayLabel: DAY_LABELS[date.getDay()],
        highF: Math.round(day.temp.max),
        lowF: Math.round(day.temp.min),
        condition: this.mapCondition(weatherMain, weatherId, windSpeed),
        rainChance: Math.round((day.pop || 0) * 100),
        icon: day.weather?.[0]?.icon || '01d',
      };
    });
  }

  private async fetchForecast25(
    lat: number,
    lng: number,
    apiKey: string,
  ): Promise<ForecastDay[]> {
    const url =
      `https://api.openweathermap.org/data/2.5/forecast` +
      `?lat=${lat}&lon=${lng}` +
      `&appid=${apiKey}&units=imperial`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Forecast 2.5 HTTP ${res.status}: ${body}`);
    }

    const data = await res.json();
    if (!data.list?.length) {
      throw new Error('No forecast data in 2.5 response');
    }

    this.logger.log(
      `[Weather] Forecast 2.5 OK — ${data.list.length} intervals`,
    );

    // Group 3-hour intervals by date
    const byDate = new Map<string, any[]>();
    for (const entry of data.list) {
      const date = new Date(entry.dt * 1000);
      const dateStr = date.toISOString().split('T')[0];
      if (!byDate.has(dateStr)) byDate.set(dateStr, []);
      byDate.get(dateStr)!.push(entry);
    }

    const days: ForecastDay[] = [];
    for (const [dateStr, entries] of byDate) {
      // Daily min = lowest temp across all 3h intervals
      // Daily max = highest temp across all 3h intervals
      const temps = entries.map((e: any) => e.main.temp as number);
      const lowF = Math.round(Math.min(...temps));
      const highF = Math.round(Math.max(...temps));

      // Pick midday weather for condition/icon (most representative)
      const middayIdx = Math.floor(entries.length / 2);
      const midday = entries[middayIdx];
      const weatherMain = midday.weather?.[0]?.main || 'Clear';
      const weatherId = midday.weather?.[0]?.id || 800;
      const middayIcon = midday.weather?.[0]?.icon || '01d';

      const winds = entries.map((e: any) => (e.wind?.speed || 0) as number);
      const maxWind = Math.max(...winds);

      const pops = entries.map((e: any) => (e.pop || 0) as number);
      const maxPop = Math.max(...pops);

      const date = new Date(dateStr + 'T12:00:00');

      days.push({
        date: dateStr,
        dayLabel: DAY_LABELS[date.getDay()],
        highF,
        lowF,
        condition: this.mapCondition(weatherMain, weatherId, maxWind),
        rainChance: Math.round(maxPop * 100),
        icon: middayIcon,
      });
    }

    this.logger.log(
      `[Weather] Forecast 2.5 aggregated ${days.length} days, ` +
        `sample day0: low=${days[0]?.lowF} high=${days[0]?.highF}`,
    );

    return days;
  }

  // ── Current weather (single point-in-time) ──

  async getCurrentWeather(
    lat: number,
    lng: number,
    cityKey?: string,
  ): Promise<CurrentWeatherResponse> {
    const cacheKey = cityKey
      ? `current:city:${cityKey.toLowerCase().trim()}:today`
      : `current:${lat.toFixed(3)}:${lng.toFixed(3)}:today`;
    const cached = this.currentCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      this.logger.log(`[WeatherCache] HIT key=${cacheKey}`);
      return cached.data;
    }
    this.logger.log(`[WeatherCache] MISS key=${cacheKey}`);

    const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    if (!apiKey) throw new Error('OPENWEATHER_API_KEY not configured');

    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Current weather HTTP ${res.status}: ${body}`);
    }

    const data = await res.json();
    const result = this.buildCurrentResponse(data, lat, lng);

    this.currentCache.set(cacheKey, {
      data: result,
      expiry: Date.now() + this.CACHE_TTL,
    });

    this.logger.log(
      `[Weather] Current weather for ${lat},${lng}: ${result.tempF}°F / ${result.tempC}°C`,
    );
    return result;
  }

  async getTomorrowWeather(
    lat: number,
    lng: number,
    cityKey?: string,
  ): Promise<CurrentWeatherResponse> {
    const cacheKey = cityKey
      ? `current:city:${cityKey.toLowerCase().trim()}:tomorrow`
      : `current:${lat.toFixed(3)}:${lng.toFixed(3)}:tomorrow`;
    const cached = this.currentCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      this.logger.log(`[WeatherCache] HIT key=${cacheKey}`);
      return cached.data;
    }
    this.logger.log(`[WeatherCache] MISS key=${cacheKey}`);

    const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    if (!apiKey) throw new Error('OPENWEATHER_API_KEY not configured');

    const url =
      `https://api.openweathermap.org/data/2.5/forecast` +
      `?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Forecast HTTP ${res.status}: ${body}`);
    }

    const data = await res.json();
    const list: any[] = data.list || [];

    // Find tomorrow's noon entry
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const entry =
      list.find(
        (x: any) =>
          x.dt_txt?.startsWith(tomorrowStr) &&
          x.dt_txt?.includes('12:00:00'),
      ) ||
      list.find((x: any) => x.dt_txt?.startsWith(tomorrowStr)) ||
      list[0];

    if (!entry) throw new Error('No forecast data found for tomorrow');

    const result = this.buildCurrentResponse(entry, lat, lng);
    result.city = data.city?.name || '';

    this.currentCache.set(cacheKey, {
      data: result,
      expiry: Date.now() + this.CACHE_TTL,
    });

    this.logger.log(
      `[Weather] Tomorrow weather for ${lat},${lng}: ${result.tempF}°F / ${result.tempC}°C`,
    );
    return result;
  }

  private buildCurrentResponse(
    data: any,
    lat: number,
    lng: number,
  ): CurrentWeatherResponse {
    const tempC = data.main?.temp ?? 0;
    const feelsLikeC = data.main?.feels_like ?? tempC;
    const tempMinC = data.main?.temp_min ?? tempC;
    const tempMaxC = data.main?.temp_max ?? tempC;
    const windMs = data.wind?.speed ?? 0;

    return {
      city: data.name || '',
      lat,
      lng,
      tempF: tempC * (9 / 5) + 32,
      tempC,
      feelsLikeF: feelsLikeC * (9 / 5) + 32,
      feelsLikeC,
      tempMinF: tempMinC * (9 / 5) + 32,
      tempMinC,
      tempMaxF: tempMaxC * (9 / 5) + 32,
      tempMaxC,
      windSpeedMph: +(windMs * 2.237).toFixed(1),
      windSpeedMs: windMs,
      humidity: data.main?.humidity ?? 0,
      pressure: data.main?.pressure ?? 0,
      condition: data.weather?.[0]?.main || 'Clear',
      description: data.weather?.[0]?.description || 'clear sky',
      icon: data.weather?.[0]?.icon || '01d',
    };
  }

  private mapCondition(
    main: string,
    id: number,
    windSpeed: number,
  ): string {
    // High wind overrides other conditions
    if (windSpeed > 25) return 'windy';

    switch (main) {
      case 'Clear':
        return 'sunny';
      case 'Clouds':
        // 801 = few clouds, 802 = scattered → partly-cloudy
        // 803 = broken, 804 = overcast → cloudy
        return id <= 802 ? 'partly-cloudy' : 'cloudy';
      case 'Rain':
      case 'Drizzle':
      case 'Thunderstorm':
        return 'rainy';
      case 'Snow':
        return 'snowy';
      default:
        return 'partly-cloudy';
    }
  }
}
