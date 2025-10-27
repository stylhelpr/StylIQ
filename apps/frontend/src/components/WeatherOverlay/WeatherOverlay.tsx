// src/components/WeatherOverlay/WeatherOverlay.tsx
import React, {useEffect, useState} from 'react';
import {Text, StyleSheet} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import {EventEmitter} from 'events';

// ────────────────────────────────
// ✅ Local type declarations
// ────────────────────────────────
type WeatherData = {
  city: string;
  condition: string;
  temperature: number;
  day?: string;
};

declare global {
  var WeatherBus:
    | (EventEmitter & {
        emit(event: 'update', data: WeatherData): boolean;
        on(event: 'update', listener: (data: WeatherData) => void): this;
        off(event: 'update', listener: (data: WeatherData) => void): this;
      })
    | undefined;
}
// ────────────────────────────────

export default function WeatherOverlay() {
  const {theme} = useAppTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const bus = globalThis.WeatherBus;
    if (!bus) return;

    const handler = (data: WeatherData) => {
      console.log('🌡️ Weather overlay updated →', data);
      setWeather(data);

      // auto-hide banner after 5s
      setTimeout(() => setWeather(null), 5000);
    };

    bus.on('update', handler);
    return () => bus.off('update', handler);
  }, []);
  console.log('🧩 Overlay mounted. WeatherBus:', globalThis.WeatherBus);

  if (!weather) return null;

  return (
    <Animatable.View
      animation="fadeInDown"
      duration={500}
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.surface2,
          borderColor: theme.colors.surfaceBorder,
        },
      ]}>
      <Text style={[styles.text, {color: theme.colors.foreground}]}>
        {weather.day
          ? `${weather.day.toUpperCase()} in ${weather.city}: ${
              weather.condition
            }, ${weather.temperature}°`
          : `${weather.city}: ${weather.condition}, ${weather.temperature}°`}
      </Text>
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: tokens.spacing.xl2,
    alignSelf: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
