// src/components/GradientBackground.tsx
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {useAppTheme} from '../../context/ThemeContext';
import {StyleProp, ViewStyle} from 'react-native';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  colors?: string[];
  start?: {x: number; y: number};
  end?: {x: number; y: number};
}

export const GradientBackground: React.FC<Props> = ({
  children,
  style,
  colors,
  start = {x: 0, y: 0},
  end = {x: 1, y: 1},
}) => {
  const {theme} = useAppTheme();
  const gradientColors = colors || [
    theme.colors.surfaceGradientStart ?? theme.colors.background,
    theme.colors.surfaceGradientEnd ?? theme.colors.background,
  ];

  return (
    <LinearGradient
      colors={gradientColors}
      start={start}
      end={end}
      style={[{flex: 1}, style]}>
      {children}
    </LinearGradient>
  );
};
