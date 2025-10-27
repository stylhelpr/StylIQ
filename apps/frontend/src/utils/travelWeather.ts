// src/utils/travelWeather.ts
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';
import {ensureLocationPermission} from './permissions';
// import {OPENWEATHER_API_KEY, GOOGLE_API_KEY, OPENCAGE_API_KEY} from '@env';

// ─────────────────────────────────────────────
// 🌎 CONFIG
// ─────────────────────────────────────────────
const OPENWEATHER_API_KEY = '88345763663b7944e3997b4cff97e73d'; // ✅ Hardcoded for now
const GOOGLE_API_KEY = '';
const OPENCAGE_API_KEY = '';

// ─────────────────────────────────────────────
// 📍 Get current device coordinates
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
// 📍 Convert destination name → lat/lon
// ─────────────────────────────────────────────
export async function geocodeDestination(
  destination: string,
): Promise<{lat: number; lon: number}> {
  if (!OPENCAGE_API_KEY)
    throw new Error('Missing OPENCAGE_API_KEY for geocoding.');
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
    destination,
  )}&key=${OPENCAGE_API_KEY}`;
  const res = await axios.get(url);
  const coords = res.data.results[0].geometry;
  return {lat: coords.lat, lon: coords.lng};
}

// ─────────────────────────────────────────────
// 🗺️ Get up to 3 waypoints between origin/destination
// ─────────────────────────────────────────────
export async function getRouteMidpoints(
  origin: string,
  destination: string,
): Promise<{lat: number; lon: number}[]> {
  if (!GOOGLE_API_KEY)
    throw new Error('Missing GOOGLE_API_KEY for directions.');
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_API_KEY}`;
  const res = await axios.get(url);
  const steps = res.data.routes[0]?.legs[0]?.steps || [];

  const midpoints: {lat: number; lon: number}[] = [];
  for (let i = 1; i < steps.length - 1; i += Math.ceil(steps.length / 3)) {
    const loc = steps[i].end_location;
    midpoints.push({lat: loc.lat, lon: loc.lng});
  }
  return midpoints;
}

// ─────────────────────────────────────────────
// 🌦 Fetch current or forecast weather
// ─────────────────────────────────────────────
export async function fetchWeather(
  lat?: number,
  lon?: number,
  units: 'imperial' | 'metric' = 'imperial',
  day: 'today' | 'tomorrow' = 'today',
  city?: string,
) {
  const cleanKey = OPENWEATHER_API_KEY?.trim();
  console.log('🔑 OPENWEATHER_API_KEY:', cleanKey);
  console.log('🌍 Fetching weather for:', {lat, lon, city, day});

  try {
    // ───── When a city name is provided ─────
    if (city) {
      const endpoint =
        day === 'tomorrow'
          ? `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
              city,
            )}&appid=${cleanKey}&units=${units}`
          : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
              city,
            )}&appid=${cleanKey}&units=${units}`;

      console.log('🌐 City-based URL:', endpoint);
      const res = await axios.get(endpoint);

      if (day === 'tomorrow') {
        const list = res.data.list || [];
        const tomorrowData = list.find((x: any) =>
          x.dt_txt?.includes('12:00:00'),
        );
        console.log('✅ Tomorrow forecast (city):', tomorrowData);

        return {
          city: res.data.city?.name || city,
          temperature: Math.round(tomorrowData?.main?.temp ?? 0),
          condition: tomorrowData?.weather?.[0]?.description ?? 'unknown',
          raw: tomorrowData,
        };
      }

      console.log('✅ Current weather (city):', res.data);
      return {
        city: res.data.name || city,
        temperature: Math.round(res.data.main?.temp ?? 0),
        condition: res.data.weather?.[0]?.description ?? 'unknown',
        raw: res.data,
      };
    }

    // ───── Location-based fallback (GPS) ─────
    if (!lat || !lon) throw new Error('Missing location coordinates');

    if (day === 'tomorrow') {
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=${units}`;
      console.log('🌐 Forecast URL:', forecastUrl);

      const res = await axios.get(forecastUrl);
      const list = res.data.list || [];
      const tomorrowData = list.find((x: any) =>
        x.dt_txt?.includes('12:00:00'),
      );
      console.log('✅ Tomorrow forecast:', tomorrowData);

      return {
        city: res.data.city?.name,
        temperature: Math.round(tomorrowData?.main?.temp ?? 0),
        condition: tomorrowData?.weather?.[0]?.description ?? 'unknown',
        raw: tomorrowData,
      };
    }

    // ───── Current weather (dual metric) ─────
    const metricUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=metric`;
    const imperialUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=imperial`;

    console.log('🌐 Metric URL:', metricUrl);
    console.log('🌐 Imperial URL:', imperialUrl);

    const [metricRes, imperialRes] = await Promise.all([
      axios.get(metricUrl),
      axios.get(imperialUrl),
    ]);

    console.log('✅ Metric weather:', metricRes.data);
    console.log('✅ Imperial weather:', imperialRes.data);

    return {
      celsius: metricRes.data,
      fahrenheit: imperialRes.data,
      city: imperialRes.data.name,
      temperature: Math.round(imperialRes.data.main.temp),
      condition: imperialRes.data.weather?.[0]?.description,
    };
  } catch (err: any) {
    if (axios.isAxiosError(err)) {
      console.error('❌ Axios error:', err?.response?.data || err.message);
    } else {
      console.error('❌ Unknown error:', err);
    }
    throw err;
  }
}

// ─────────────────────────────────────────────
// 🧭 Master — Get full travel route weather summary
// ─────────────────────────────────────────────
export async function getWeatherForTrip(destinationName: string) {
  const current = await getCurrentLocation();
  const destination = await geocodeDestination(destinationName);
  const originStr = `${current.lat},${current.lon}`;
  const destStr = `${destination.lat},${destination.lon}`;
  const midpoints = await getRouteMidpoints(originStr, destStr);

  const weatherNow = await fetchWeather(current.lat, current.lon);
  const weatherDest = await fetchWeather(destination.lat, destination.lon);

  const weatherMidpoints = await Promise.all(
    midpoints.map(p => fetchWeather(p.lat, p.lon)),
  );

  return {
    currentLocation: current,
    destination,
    weatherNow,
    weatherDest,
    routeWeather: weatherMidpoints,
  };
}

///////////////////////

// // src/utils/travelWeather.ts
// import Geolocation from 'react-native-geolocation-service';
// import axios from 'axios';
// import {ensureLocationPermission} from './permissions';
// // import {OPENWEATHER_API_KEY, GOOGLE_API_KEY, OPENCAGE_API_KEY} from '@env';

// // ─────────────────────────────────────────────
// // 🌎 CONFIG
// // ─────────────────────────────────────────────
// const OPENWEATHER_API_KEY = '88345763663b7944e3997b4cff97e73d'; // ✅ Hardcoded for now
// const GOOGLE_API_KEY = '';
// const OPENCAGE_API_KEY = '';

// // ─────────────────────────────────────────────
// // 📍 Get current device coordinates
// // ─────────────────────────────────────────────
// export async function getCurrentLocation(): Promise<{
//   lat: number;
//   lon: number;
// }> {
//   const hasPermission = await ensureLocationPermission();
//   if (!hasPermission) throw new Error('Location permission denied');

//   return new Promise((resolve, reject) => {
//     Geolocation.getCurrentPosition(
//       pos => resolve({lat: pos.coords.latitude, lon: pos.coords.longitude}),
//       err => reject(err),
//       {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
//     );
//   });
// }

// // ─────────────────────────────────────────────
// // 📍 Convert destination name → lat/lon
// // ─────────────────────────────────────────────
// export async function geocodeDestination(
//   destination: string,
// ): Promise<{lat: number; lon: number}> {
//   if (!OPENCAGE_API_KEY)
//     throw new Error('Missing OPENCAGE_API_KEY for geocoding.');
//   const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
//     destination,
//   )}&key=${OPENCAGE_API_KEY}`;
//   const res = await axios.get(url);
//   const coords = res.data.results[0].geometry;
//   return {lat: coords.lat, lon: coords.lng};
// }

// // ─────────────────────────────────────────────
// // 🗺️ Get up to 3 waypoints between origin/destination
// // ─────────────────────────────────────────────
// export async function getRouteMidpoints(
//   origin: string,
//   destination: string,
// ): Promise<{lat: number; lon: number}[]> {
//   if (!GOOGLE_API_KEY)
//     throw new Error('Missing GOOGLE_API_KEY for directions.');
//   const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_API_KEY}`;
//   const res = await axios.get(url);
//   const steps = res.data.routes[0]?.legs[0]?.steps || [];

//   const midpoints: {lat: number; lon: number}[] = [];
//   for (let i = 1; i < steps.length - 1; i += Math.ceil(steps.length / 3)) {
//     const loc = steps[i].end_location;
//     midpoints.push({lat: loc.lat, lon: loc.lng});
//   }
//   return midpoints;
// }

// // ─────────────────────────────────────────────
// // 🌦 Fetch current or forecast weather
// // ─────────────────────────────────────────────
// export async function fetchWeather(
//   lat: number,
//   lon: number,
//   units: 'imperial' | 'metric' = 'imperial',
//   day: 'today' | 'tomorrow' = 'today',
// ) {
//   const cleanKey = OPENWEATHER_API_KEY?.trim();
//   console.log('🔑 OPENWEATHER_API_KEY:', cleanKey);
//   console.log('🌍 Fetching weather for:', {lat, lon, day});

//   try {
//     // ───── Forecast (tomorrow) ─────
//     if (day === 'tomorrow') {
//       const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=${units}`;
//       console.log('🌐 Forecast URL:', forecastUrl);

//       const res = await axios.get(forecastUrl);
//       const list = res.data.list || [];

//       // pick around midday tomorrow
//       const tomorrowData = list.find((x: any) =>
//         x.dt_txt?.includes('12:00:00'),
//       );

//       console.log('✅ Tomorrow forecast:', tomorrowData);

//       return {
//         city: res.data.city?.name,
//         temperature: Math.round(tomorrowData?.main?.temp ?? 0),
//         condition: tomorrowData?.weather?.[0]?.description ?? 'unknown',
//         raw: tomorrowData,
//       };
//     }

//     // ───── Current weather ─────
//     const metricUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=metric`;
//     const imperialUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=imperial`;

//     console.log('🌐 Metric URL:', metricUrl);
//     console.log('🌐 Imperial URL:', imperialUrl);

//     const [metricRes, imperialRes] = await Promise.all([
//       axios.get(metricUrl),
//       axios.get(imperialUrl),
//     ]);

//     console.log('✅ Metric weather:', metricRes.data);
//     console.log('✅ Imperial weather:', imperialRes.data);

//     return {
//       celsius: metricRes.data,
//       fahrenheit: imperialRes.data,
//       city: imperialRes.data.name,
//       temperature: Math.round(imperialRes.data.main.temp),
//       condition: imperialRes.data.weather?.[0]?.description,
//     };
//   } catch (err: any) {
//     if (axios.isAxiosError(err)) {
//       console.error('❌ Axios error:', err?.response?.data || err.message);
//     } else {
//       console.error('❌ Unknown error:', err);
//     }
//     throw err;
//   }
// }

// // ─────────────────────────────────────────────
// // 🧭 Master — Get full travel route weather summary
// // ─────────────────────────────────────────────
// export async function getWeatherForTrip(destinationName: string) {
//   const current = await getCurrentLocation();
//   const destination = await geocodeDestination(destinationName);
//   const originStr = `${current.lat},${current.lon}`;
//   const destStr = `${destination.lat},${destination.lon}`;
//   const midpoints = await getRouteMidpoints(originStr, destStr);

//   const weatherNow = await fetchWeather(current.lat, current.lon);
//   const weatherDest = await fetchWeather(destination.lat, destination.lon);

//   const weatherMidpoints = await Promise.all(
//     midpoints.map(p => fetchWeather(p.lat, p.lon)),
//   );

//   return {
//     currentLocation: current,
//     destination,
//     weatherNow,
//     weatherDest,
//     routeWeather: weatherMidpoints,
//   };
// }

////////////////////////

// import Geolocation from 'react-native-geolocation-service';
// import axios from 'axios';
// import {ensureLocationPermission} from './permissions';
// // import {OPENWEATHER_API_KEY, GOOGLE_API_KEY, OPENCAGE_API_KEY} from '@env';

// // Get current device coordinates
// export async function getCurrentLocation(): Promise<{
//   lat: number;
//   lon: number;
// }> {
//   const hasPermission = await ensureLocationPermission();
//   if (!hasPermission) throw new Error('Location permission denied');

//   return new Promise((resolve, reject) => {
//     Geolocation.getCurrentPosition(
//       pos => resolve({lat: pos.coords.latitude, lon: pos.coords.longitude}),
//       err => reject(err),
//       {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
//     );
//   });
// }

// const OPENWEATHER_API_KEY = '88345763663b7944e3997b4cff97e73d'; /// ✅ Hardcoded here

// // Convert destination name to lat/lon
// export async function geocodeDestination(
//   destination: string,
// ): Promise<{lat: number; lon: number}> {
//   const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
//     destination,
//   )}&key=${OPENCAGE_API_KEY}`;
//   const res = await axios.get(url);
//   const coords = res.data.results[0].geometry;
//   return {lat: coords.lat, lon: coords.lng};
// }

// // Get up to 3 waypoints between origin and destination
// export async function getRouteMidpoints(
//   origin: string,
//   destination: string,
// ): Promise<{lat: number; lon: number}[]> {
//   const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_API_KEY}`;
//   const res = await axios.get(url);
//   const steps = res.data.routes[0]?.legs[0]?.steps || [];

//   const midpoints: {lat: number; lon: number}[] = [];
//   for (let i = 1; i < steps.length - 1; i += Math.ceil(steps.length / 3)) {
//     const loc = steps[i].end_location;
//     midpoints.push({lat: loc.lat, lon: loc.lng});
//   }
//   return midpoints;
// }

// // Fetch weather at a location
// export async function fetchWeather(lat: number, lon: number, p0: string) {
//   const cleanKey = OPENWEATHER_API_KEY?.trim();
//   console.log('🔑 OPENWEATHER_API_KEY:', OPENWEATHER_API_KEY);
//   console.log('🌍 Fetching weather for:', {lat, lon});

//   try {
//     const metricUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=metric`;
//     const imperialUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=imperial`;

//     console.log('🌐 Metric URL:', metricUrl);
//     console.log('🌐 Imperial URL:', imperialUrl);

//     const [metricRes, imperialRes] = await Promise.all([
//       axios.get(metricUrl),
//       axios.get(imperialUrl),
//     ]);

//     console.log('✅ Metric weather:', metricRes.data);
//     console.log('✅ Imperial weather:', imperialRes.data);

//     return {
//       celsius: metricRes.data,
//       fahrenheit: imperialRes.data,
//     };
//   } catch (err: any) {
//     if (axios.isAxiosError(err)) {
//       console.error('❌ Axios error:', err?.response?.data || err.message);
//     } else {
//       console.error('❌ Unknown error:', err);
//     }
//     throw err;
//   }
// }

// // Master function to get full travel weather
// export async function getWeatherForTrip(destinationName: string) {
//   const current = await getCurrentLocation();
//   const destination = await geocodeDestination(destinationName);
//   const originStr = `${current.lat},${current.lon}`;
//   const destStr = `${destination.lat},${destination.lon}`;
//   const midpoints = await getRouteMidpoints(originStr, destStr);

//   const weatherNow = await fetchWeather(current.lat, current.lon);
//   const weatherDest = await fetchWeather(destination.lat, destination.lon);

//   const weatherMidpoints = await Promise.all(
//     midpoints.map(p => fetchWeather(p.lat, p.lon)),
//   );

//   return {
//     currentLocation: current,
//     destination,
//     weatherNow,
//     weatherDest,
//     routeWeather: weatherMidpoints,
//   };
// }
