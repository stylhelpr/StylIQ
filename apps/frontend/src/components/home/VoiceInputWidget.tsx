// components/VoiceInputWidget.tsx
import React from 'react';
import {View, Text} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  text: string;
};

const VoiceInputWidget = ({text}: Props) => {
  const {theme} = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        minHeight: 80,
        justifyContent: 'center',
      }}>
      <Text
        style={{
          fontSize: theme.fontSize.md,
          color: theme.colors.secondary,
        }}>
        🎤 {text || 'Waiting for your voice...'}
      </Text>
    </View>
  );
};

export default VoiceInputWidget;
