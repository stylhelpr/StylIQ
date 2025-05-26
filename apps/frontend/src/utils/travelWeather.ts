import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';
import {ensureLocationPermission} from './permissions';
import {OPENWEATHER_API_KEY, GOOGLE_API_KEY, OPENCAGE_API_KEY} from '@env';

// Get current device coordinates
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

// Convert destination name to lat/lon
export async function geocodeDestination(
  destination: string,
): Promise<{lat: number; lon: number}> {
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
    destination,
  )}&key=${OPENCAGE_API_KEY}`;
  const res = await axios.get(url);
  const coords = res.data.results[0].geometry;
  return {lat: coords.lat, lon: coords.lng};
}

// Get up to 3 waypoints between origin and destination
export async function getRouteMidpoints(
  origin: string,
  destination: string,
): Promise<{lat: number; lon: number}[]> {
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

// Fetch weather at a location
export async function fetchWeather(lat: number, lon: number) {
  const cleanKey = OPENWEATHER_API_KEY?.trim();
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=metric`;

  //   console.log('🔥 FETCH WEATHER EXECUTED');
  //   console.log('✅ Loaded API key:', cleanKey);
  //   console.log('📡 API URL:', url);

  const res = await axios.get(url);
  return res.data;
}

// Master function to get full travel weather
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
