import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {VoiceTarget} from '../../utils/VoiceUtils/voiceTarget';
import {useVoiceControl} from '../../hooks/useVoiceControl';

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

// Mood chips - bias the outfit based on vibe/energy
const MOOD_CHIPS = [
  {
    label: 'Low-key',
    refinementPrompt:
      'Adjust this outfit for a low-key, understated vibe. Change at most 1-2 items.',
  },
  {
    label: 'Comfy',
    refinementPrompt:
      'Adjust this outfit to be more comfortable and relaxed. Change at most 1-2 items.',
  },
  {
    label: 'Confident',
    refinementPrompt:
      'Adjust this outfit to feel more confident and self-assured. Change at most 1-2 items.',
  },
  {
    label: 'Boss energy',
    refinementPrompt:
      'Adjust this outfit for powerful boss energy. Change at most 1-2 items.',
  },
  {
    label: 'Playful',
    refinementPrompt:
      'Adjust this outfit for a playful, fun vibe. Change at most 1-2 items.',
  },
  {
    label: 'Creative',
    refinementPrompt:
      'Adjust this outfit for a creative, artistic vibe. Change at most 1-2 items.',
  },
  {
    label: 'Feminine',
    refinementPrompt:
      'Adjust this outfit for a more feminine aesthetic. Change at most 1-2 items.',
  },
  {
    label: 'Masculine',
    refinementPrompt:
      'Adjust this outfit for a more masculine aesthetic. Change at most 1-2 items.',
  },
  {
    label: 'Gender Neutral',
    refinementPrompt:
      'Adjust this outfit for a gender-neutral aesthetic. Change at most 1-2 items.',
  },
  {
    label: 'Cool',
    refinementPrompt:
      'Adjust this outfit for a cool, effortless vibe. Change at most 1-2 items.',
  },
  {
    label: 'Minimal',
    refinementPrompt:
      'Adjust this outfit for a minimal, clean aesthetic. Change at most 1-2 items.',
  },
  {
    label: 'Easygoing',
    refinementPrompt:
      'Adjust this outfit for an easygoing, relaxed feel. Change at most 1-2 items.',
  },
  {
    label: 'Practical',
    refinementPrompt:
      'Adjust this outfit for practicality and functionality. Change at most 1-2 items.',
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
    label: 'Dress it up',
    refinementPrompt:
      'Elevate 1-2 pieces to dress this up. Maintain the outfit concept.',
  },
  {
    label: 'More polished',
    refinementPrompt:
      'Make this look more polished and put-together, change 1-2 pieces max.',
  },
  {
    label: 'Relaxed fit',
    refinementPrompt:
      'Swap 1-2 pieces for more relaxed fit options. Keep the overall style.',
  },
  {
    label: 'More fitted',
    refinementPrompt:
      'Swap 1-2 pieces for more fitted/tailored options. Keep the overall style.',
  },
  {
    label: 'More flowy',
    refinementPrompt:
      'Swap 1-2 pieces for more flowy/loose options. Keep the overall style.',
  },
  {
    label: 'Try different colors',
    refinementPrompt:
      'Try different colors on 1-2 pieces. Keep the silhouette and formality.',
  },
  {
    label: 'Add warmth',
    refinementPrompt:
      'Add or swap 1 piece for warmth. Preserve the outfit style.',
  },
  {
    label: 'Make it lighter',
    refinementPrompt:
      'Swap 1-2 pieces for lighter/cooler weather options. Keep the overall look.',
  },
];

type Props = {
  onSelectMood: (refinementPrompt: string, label: string) => void;
  onSelectAdjustment: (refinementPrompt: string) => void;
  disabled?: boolean;
  selectedMoodLabel?: string | null;
  showMoods?: boolean;
  showAdjustments?: boolean;
  // Freeform prompt input
  showPrompt?: boolean;
  promptValue?: string;
  onPromptChange?: (text: string) => void;
  promptPlaceholder?: string;
  promptLabel?: string | null; // null or empty to hide label
};

export default function GuidedRefinementChips({
  onSelectMood,
  onSelectAdjustment,
  disabled = false,
  selectedMoodLabel = null,
  showMoods = true,
  showAdjustments = true,
  showPrompt = true,
  promptValue = '',
  onPromptChange,
  promptPlaceholder = 'Describe the outfit you want...',
  promptLabel = 'What kind of outfit do you want?',
}: Props) {
  const {theme} = useAppTheme();
  const {isRecording, startVoiceCommand} = useVoiceControl();

  const handleMicPress = () => {
    if (!onPromptChange) return;
    h('impactMedium');
    VoiceTarget.set(onPromptChange, 'outfitPrompt');
    startVoiceCommand((text: string) => {
      onPromptChange(text);
    });
  };

  const handleClearPrompt = () => {
    if (!onPromptChange) return;
    h('impactLight');
    onPromptChange('');
  };

  const styles = StyleSheet.create({
    container: {
      width: '100%',
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.muted,
      marginBottom: 6,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    moodChipsScroll: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 8,
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
    promptInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      paddingRight: 8,
    },
    promptInput: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.foreground,
      minHeight: 44,
    },
    inputIconButton: {
      padding: 6,
      marginLeft: 4,
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
      {/* Freeform Prompt Input */}
      {showPrompt && (
        <>
          {promptLabel ? (
            <Text style={styles.sectionTitle}>{promptLabel}</Text>
          ) : null}
          <View style={styles.promptInputContainer}>
            <TextInput
              style={styles.promptInput}
              value={promptValue}
              onChangeText={onPromptChange}
              placeholder={promptPlaceholder}
              placeholderTextColor={theme.colors.muted}
              editable={!disabled}
              multiline
              numberOfLines={2}
            />
            {promptValue && promptValue.length > 0 && (
              <TouchableOpacity
                style={styles.inputIconButton}
                onPress={handleClearPrompt}
                disabled={disabled}>
                <MaterialIcons
                  name="close"
                  size={20}
                  color={theme.colors.muted}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.inputIconButton}
              onPress={handleMicPress}
              disabled={disabled}>
              <MaterialIcons
                name="mic"
                size={22}
                color={isRecording ? theme.colors.primary : theme.colors.muted}
              />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Mood Section */}
      {showMoods && (
        <>
          <Text style={[styles.sectionTitle, {marginTop: 12}]}>How are you feeling today? (Optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodChipsScroll}>
            {MOOD_CHIPS.map(chip => {
              const isSelected = selectedMoodLabel === chip.label;
              return renderChip(chip, isSelected, () =>
                // Toggle: deselect if already selected, otherwise select
                isSelected
                  ? onSelectMood('', '')
                  : onSelectMood(chip.refinementPrompt, chip.label),
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Adjustment Section - only show after outfit exists */}
      {showAdjustments && (
        <>
          <Text style={styles.sectionTitle}>Refine Outfit (Optional Choices)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodChipsScroll}>
            {ADJUSTMENT_CHIPS.map(chip =>
              renderChip(chip, false, () => onSelectAdjustment(chip.refinementPrompt)),
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}
