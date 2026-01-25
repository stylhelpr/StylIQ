import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

// Mood chips - bias the outfit slightly, change 1-2 items max
const MOOD_CHIPS = [
  {
    label: 'Comfy',
    refinementPrompt:
      'Slightly adjust this outfit to be more comfortable and relaxed, keeping the overall look intact. Change at most 1-2 items.',
  },
  {
    label: 'Busy',
    refinementPrompt:
      'Make minor adjustments for a busy day while keeping the core outfit concept. Change at most 1-2 items.',
  },
  {
    label: 'Low-effort',
    refinementPrompt:
      'Simplify 1-2 pieces for minimal effort while maintaining the look. Keep the overall silhouette.',
  },
  {
    label: 'Put-together',
    refinementPrompt:
      'Refine 1-2 pieces to look more put-together. Preserve the core outfit concept.',
  },
  {
    label: 'Polished',
    refinementPrompt:
      'Polish this outfit slightly, change at most 1-2 items. Keep the overall look intact.',
  },
  {
    label: 'Casual',
    refinementPrompt:
      'Make this slightly more casual, changing minimal pieces. Preserve the outfit silhouette.',
  },
];

// Quick adjustment chips - single action, change 1-2 items
const ADJUSTMENT_CHIPS = [
  {
    label: 'More casual',
    refinementPrompt:
      'Make this slightly more casual, change 1-2 pieces max. Keep the core outfit.',
  },
  {
    label: 'More relaxed fit',
    refinementPrompt:
      'Swap 1 piece for a more relaxed fit option. Keep the overall style.',
  },
  {
    label: 'Dress this up',
    refinementPrompt:
      'Elevate 1-2 pieces to dress this up. Maintain the outfit concept.',
  },
  {
    label: 'Different colors',
    refinementPrompt:
      'Try different colors on 1-2 pieces. Keep the silhouette and formality.',
  },
  {
    label: 'Warmer layers',
    refinementPrompt:
      'Add or swap 1 piece for warmth. Preserve the outfit style.',
  },
  {
    label: 'Cooler outfit',
    refinementPrompt:
      'Swap 1 piece for cooler weather. Keep the overall look.',
  },
];

type Props = {
  onSelectMood: (refinementPrompt: string) => void;
  onSelectAdjustment: (refinementPrompt: string) => void;
  disabled?: boolean;
  selectedMood?: string | null;
};

export default function GuidedRefinementChips({
  onSelectMood,
  onSelectAdjustment,
  disabled = false,
  selectedMood = null,
}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      paddingHorizontal: 8,
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.muted,
      marginBottom: 10,
      marginTop: 8,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      backgroundColor: theme.colors.pillDark2,
    },
    chipSelected: {
      backgroundColor: theme.colors.foreground,
      borderColor: theme.colors.foreground,
    },
    chipDisabled: {
      opacity: 0.5,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    chipTextSelected: {
      color: theme.colors.background,
    },
  });

  const renderChip = (
    chip: {label: string; refinementPrompt: string},
    isSelected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={chip.label}
      onPress={() => {
        if (!disabled) {
          h('impactLight');
          onPress();
        }
      }}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.chip,
        isSelected && styles.chipSelected,
        disabled && styles.chipDisabled,
      ]}>
      <Text
        style={[styles.chipText, isSelected && styles.chipTextSelected]}>
        {chip.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Mood Section */}
      <Text style={styles.sectionTitle}>How are you feeling today?</Text>
      <View style={styles.chipsRow}>
        {MOOD_CHIPS.map(chip =>
          renderChip(chip, selectedMood === chip.label, () =>
            onSelectMood(chip.refinementPrompt),
          ),
        )}
      </View>

      {/* Adjustment Section */}
      <Text style={styles.sectionTitle}>Adjust this look</Text>
      <View style={styles.chipsRow}>
        {ADJUSTMENT_CHIPS.map(chip =>
          renderChip(chip, false, () => onSelectAdjustment(chip.refinementPrompt)),
        )}
      </View>
    </View>
  );
}
