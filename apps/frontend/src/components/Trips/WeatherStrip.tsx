import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {DayWeather, WeatherCondition} from '../../types/trips';

const WEATHER_ICONS: Record<WeatherCondition, string> = {
  sunny: 'wb-sunny',
  'partly-cloudy': 'wb-cloudy',
  cloudy: 'cloud',
  rainy: 'grain',
  snowy: 'ac-unit',
  windy: 'air',
};

const WEATHER_COLORS: Record<WeatherCondition, string> = {
  sunny: '#F59E0B',
  'partly-cloudy': '#94A3B8',
  cloudy: '#64748B',
  rainy: '#3B82F6',
  snowy: '#93C5FD',
  windy: '#6EE7B7',
};

type Props = {
  weather: DayWeather[];
};

const WeatherStrip = ({weather}: Props) => {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: tokens.spacing.lg,
    },
    scrollContent: {
      paddingHorizontal: tokens.spacing.md,
      gap: 10,
    },
    dayCard: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.lg,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      minWidth: 72,
    },
    dayLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.foreground2,
      marginBottom: 6,
    },
    iconWrap: {
      marginBottom: 6,
    },
    tempHigh: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    tempLow: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.foreground2,
      marginTop: 2,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {weather.map((day, idx) => (
          <View key={day.date + idx} style={styles.dayCard}>
            <Text style={styles.dayLabel}>{day.dayLabel}</Text>
            <View style={styles.iconWrap}>
              <Icon
                name={WEATHER_ICONS[day.condition]}
                size={22}
                color={WEATHER_COLORS[day.condition]}
              />
            </View>
            <Text style={styles.tempHigh}>{day.highF}°</Text>
            <Text style={styles.tempLow}>{day.lowF}°</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default WeatherStrip;
