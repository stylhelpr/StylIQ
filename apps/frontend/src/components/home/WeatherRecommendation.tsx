import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

const WeatherRecommendation = () => {
  const {theme} = useAppTheme();

  return (
    <View
      style={{
        ...styles.card,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
      }}>
      <Text
        style={{
          fontSize: theme.fontSize.lg,
          fontWeight: '700',
          marginBottom: 8,
          color: theme.colors.primary,
        }}>
        🌤️ Based on today’s weather:
      </Text>
      <Text style={{color: theme.colors.primary}}>
        Light layers with neutral tones are ideal.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 24,
  },
});

export default WeatherRecommendation;
