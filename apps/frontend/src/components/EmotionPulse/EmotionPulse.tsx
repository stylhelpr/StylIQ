// EmotionPulse.tsx
import {Animated, Easing, View} from 'react-native';
import React, {useEffect, useRef} from 'react';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';

export default function EmotionPulse({emotion}: {emotion: string}) {
  const scale = useRef(new Animated.Value(1)).current;
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const color =
    {
      happy: '#FFD166',
      neutral: '#AAAAAA',
      sad: '#118AB2',
      angry: '#EF476F',
      fear: '#9D4EDD',
    }[emotion] ?? '#CCCCCC';

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 250,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [emotion]);

  return (
    <Animated.View
      style={{
        transform: [{scale}],
        position: 'absolute',
        top: '45%',
        left: '45%',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: color,
        opacity: 0.7,
      }}
    />
  );
}
