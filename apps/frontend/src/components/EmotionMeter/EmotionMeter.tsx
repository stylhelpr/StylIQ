// components/EmotionMeter.tsx
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';

const colors: Record<string, string> = {
  happy: '#FFD166',
  surprised: '#FB8500',
  afraid: '#9D4EDD',
  angry: '#EF476F',
  disappointed: '#B56576',
  sad: '#118AB2',
  neutral: '#AAAAAA',
};

export default function EmotionMeter({data}: {data: Record<string, number>}) {
  const emotions = Object.keys(colors);
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    container: {
      width: 400,
      maxWidth: 450,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 20,
      padding: tokens.spacing.sm,
      marginTop: 26,
      paddingVertical: 16,
      paddingHorizontal: 36,
      borderColor: theme.colors.muted,
      borderWidth: tokens.borderWidth.hairline,
    },
    row: {flexDirection: 'row', alignItems: 'center', marginVertical: 2},
    label: {
      width: 90,
      color: theme.colors.foreground,
      fontSize: 14,
    },
    barContainer: {
      flex: 1,
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 3,
      overflow: 'hidden',
    },
    bar: {
      height: '100%',
      borderRadius: 3,
    },
  });

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.surface}]}>
      {emotions.map(key => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </Text>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                {
                  width: `${(data[key] ?? 0) * 100}%`,
                  backgroundColor: colors[key],
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
