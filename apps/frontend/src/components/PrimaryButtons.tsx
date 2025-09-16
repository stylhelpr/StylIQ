import React from 'react';
import { Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../styles/tokens';

export default function PrimaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor: colors.primary,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: 8,
        },
        style,
      ]}
    >
      <Text style={{ color: colors.white, ...typography.button }}>{label}</Text>
    </TouchableOpacity>
  );
}
