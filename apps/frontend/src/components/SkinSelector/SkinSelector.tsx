import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';
import type {ThemeType} from '../../context/ThemeContext';

const skinOptions: ThemeType[] = [
  'light',
  'dark',
  'modernDark',
  'modernDark2',
  'modernLight',
  'retro',
  'minimal',
  'vibrant',
];

export default function SkinSelector() {
  const {mode, setSkin, theme} = useAppTheme();

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text
        style={[
          styles.label,
          {color: theme.colors.text || theme.colors.foreground},
        ]}>
        Select Skin:
      </Text>
      {skinOptions.map(skin => (
        <TouchableOpacity
          key={skin}
          onPress={() => setSkin(skin)}
          style={[
            styles.button,
            {
              backgroundColor:
                mode === skin ? theme.colors.primary : theme.colors.surface,
              borderRadius: theme.borderRadius || 8,
            },
          ]}>
          <Text
            style={{
              color: theme.colors.text || theme.colors.foreground,
              textTransform: 'capitalize',
            }}>
            {skin}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  button: {
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
});
