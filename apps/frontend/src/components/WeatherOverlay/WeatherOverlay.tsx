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
      setWeather(data);

      // auto-hide banner after 5s
      setTimeout(() => setWeather(null), 5000);
    };

    bus.on('update', handler);
    return () => bus.off('update', handler);
  }, []);

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
    left: tokens.spacing.md1,
    right: tokens.spacing.md1,
    alignSelf: 'center',
    paddingVertical: tokens.spacing.md1,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.md,
    borderWidth: tokens.borderWidth.hairline,
    zIndex: 999999,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 4,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
});
