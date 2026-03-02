// src/utils/travelWeather.ts
import Geolocation from 'react-native-geolocation-service';
import {ensureLocationPermission} from './permissions';
import {apiClient} from '../lib/apiClient';

// ─────────────────────────────────────────────
// Get current device coordinates
// ─────────────────────────────────────────────
export async function getCurrentLocation(): Promise<{
  lat: number;
  lon: number;
}> {
  const hasPermission = await ensureLocationPermission();
  if (!hasPermission) throw new Error('Location permission denied');

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => resolve({lat: pos.coords.latitude, lon: pos.coords.longitude}),
      err => reject(err),
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
    );
  });
}

// ─────────────────────────────────────────────
// Fetch current or forecast weather via backend
// ─────────────────────────────────────────────
export async function fetchWeather(
  lat?: number,
  lon?: number,
  units: 'imperial' | 'metric' = 'imperial',
  day: 'today' | 'tomorrow' = 'today',
  city?: string,
) {
  try {
    const params: Record<string, string> = {};
    if (city) params.city = city;
    if (lat != null && lon != null) {
      params.lat = String(lat);
      params.lng = String(lon);
    }
    if (day === 'tomorrow') params.day = 'tomorrow';

    const res = await apiClient.get('/weather/current', {params});
    const d = res.data;

    // ───── City-based path ─────
    if (city) {
      const temp = units === 'metric' ? d.tempC : d.tempF;
      return {
        city: d.city || city,
        temperature: Math.round(temp),
        condition: d.description || 'unknown',
        raw: {
          name: d.city,
          main: {
            temp: units === 'metric' ? d.tempC : d.tempF,
            feels_like: units === 'metric' ? d.feelsLikeC : d.feelsLikeF,
            temp_min: units === 'metric' ? d.tempMinC : d.tempMinF,
            temp_max: units === 'metric' ? d.tempMaxC : d.tempMaxF,
            humidity: d.humidity,
            pressure: d.pressure,
          },
          weather: [
            {main: d.condition, description: d.description, icon: d.icon},
          ],
          wind: {
            speed: units === 'metric' ? d.windSpeedMs : d.windSpeedMph,
          },
        },
      };
    }

    // ───── GPS tomorrow path ─────
    if (day === 'tomorrow') {
      return {
        city: d.city,
        temperature: Math.round(d.tempF),
        condition: d.description || 'unknown',
        raw: {
          main: {
            temp: d.tempF,
            feels_like: d.feelsLikeF,
            humidity: d.humidity,
            pressure: d.pressure,
          },
          weather: [
            {main: d.condition, description: d.description, icon: d.icon},
          ],
          wind: {speed: d.windSpeedMph},
        },
      };
    }

    // ───── GPS today — dual metric/imperial shape ─────
    return {
      celsius: {
        name: d.city,
        main: {
          temp: d.tempC,
          feels_like: d.feelsLikeC,
          temp_min: d.tempMinC,
          temp_max: d.tempMaxC,
          humidity: d.humidity,
          pressure: d.pressure,
        },
        weather: [
          {main: d.condition, description: d.description, icon: d.icon},
        ],
        wind: {speed: d.windSpeedMs},
      },
      fahrenheit: {
        name: d.city,
        main: {
          temp: d.tempF,
          feels_like: d.feelsLikeF,
          temp_min: d.tempMinF,
          temp_max: d.tempMaxF,
          humidity: d.humidity,
          pressure: d.pressure,
        },
        weather: [
          {main: d.condition, description: d.description, icon: d.icon},
        ],
        wind: {speed: d.windSpeedMph},
      },
      city: d.city,
      temperature: Math.round(d.tempF),
      condition: d.description,
    };
  } catch (err: any) {
    console.error(
      'Weather fetch error:',
      err?.response?.data || err.message,
    );
    throw err;
  }
}
