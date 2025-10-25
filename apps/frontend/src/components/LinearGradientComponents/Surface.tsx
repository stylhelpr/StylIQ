// components/Surface.tsx
import React, {useRef} from 'react';
import {View, Text, StyleSheet, Animated, Pressable} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useAppTheme} from '../../context/ThemeContext';

export const Surface: React.FC<{style?: any; children: React.ReactNode}> = ({
  style,
  children,
}) => {
  const {theme} = useAppTheme();
  const hasGradient = !!theme.colors.surfaceGradientStart;

  if (hasGradient) {
    return (
      <LinearGradient
        colors={[
          theme.colors.surfaceGradientStart,
          theme.colors.surfaceGradientEnd,
        ]}
        style={[{borderRadius: 30, overflow: 'hidden'}, style]}>
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[{backgroundColor: theme.colors.surface}, style]}>
      {children}
    </View>
  );
};
