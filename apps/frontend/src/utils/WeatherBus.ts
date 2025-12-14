// src/utils/WeatherBus.ts

type WeatherListener = (data: {
  city: string;
  condition: string;
  temperature: number;
  day?: string;
}) => void;

class SimpleWeatherBus {
  private listeners: WeatherListener[] = [];

  on(event: 'update', listener: WeatherListener) {
    if (event === 'update') this.listeners.push(listener);
  }

  off(event: 'update', listener: WeatherListener) {
    if (event === 'update')
      this.listeners = this.listeners.filter(l => l !== listener);
  }

  emit(event: 'update', data: Parameters<WeatherListener>[0]) {
    if (event === 'update') this.listeners.forEach(l => l(data));
  }
}

// 🔒 Global singleton — no Node or native modules required
declare global {
  var WeatherBus: SimpleWeatherBus | undefined;
}

if (!globalThis.WeatherBus) {
  globalThis.WeatherBus = new SimpleWeatherBus();
}

export const WeatherBus = globalThis.WeatherBus!;
export default WeatherBus;
