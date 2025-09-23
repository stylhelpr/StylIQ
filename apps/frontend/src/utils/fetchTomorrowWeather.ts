import {TOMORROW_API_KEY, OPENCAGE_API_KEY} from '@env';

export async function fetchTomorrowWeather(lat: number, lon: number) {
  const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${TOMORROW_API_KEY}`;

  console.log('🌦️ Fetching Tomorrow.io weather from:', url);

  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  console.log('✅ Tomorrow.io Weather:', data);
  return data;
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<string> {
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${OPENCAGE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  const city =
    data?.results?.[0]?.components?.city ||
    data?.results?.[0]?.components?.town ||
    data?.results?.[0]?.components?.village ||
    data?.results?.[0]?.components?.county ||
    'Unknown location';

  return city;
}

export function getStyleAdvice(weatherCode: number): string {
  const map: Record<number, string> = {
    1000: 'T-shirt and sunglasses',
    1100: 'Light jacket or sweater',
    1101: 'Windbreaker and layers',
    4200: 'Umbrella and waterproof shoes',
    5001: 'Winter coat and gloves',
  };
  return map[weatherCode] || 'Dress comfortably and check conditions';
}
