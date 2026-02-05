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
      'Create an outfit with a low-key, understated vibe. Keep it simple and effortless.',
  },
  {
    label: 'Comfy',
    refinementPrompt:
      'Create a comfortable and relaxed outfit. Prioritize comfort and ease of wear.',
  },
  {
    label: 'Confident',
    refinementPrompt:
      'Create an outfit that feels confident and self-assured. Make it bold and empowering.',
  },
  {
    label: 'Boss energy',
    refinementPrompt:
      'Create an outfit with powerful boss energy. Make it sharp and commanding.',
  },
  {
    label: 'Playful',
    refinementPrompt:
      'Create an outfit with a playful, fun vibe. Keep it light and expressive.',
  },
  {
    label: 'Creative',
    refinementPrompt:
      'Create an outfit with a creative, artistic vibe. Be expressive and unique.',
  },
  {
    label: 'Feminine',
    refinementPrompt:
      'Create an outfit with a feminine aesthetic. Embrace elegance and softness.',
  },
  {
    label: 'Masculine',
    refinementPrompt:
      'Create an outfit with a masculine aesthetic. Keep it strong and structured.',
  },
  {
    label: 'Gender Neutral',
    refinementPrompt:
      'Create an outfit with a gender-neutral aesthetic. Keep it balanced and versatile.',
  },
  {
    label: 'Cool',
    refinementPrompt:
      'Create an outfit with a cool, effortless vibe. Make it look naturally stylish.',
  },
  {
    label: 'Minimal',
    refinementPrompt:
      'Create an outfit with a minimal, clean aesthetic. Less is more.',
  },
  {
    label: 'Easygoing',
    refinementPrompt:
      'Create an outfit with an easygoing, relaxed feel. Keep it casual and approachable.',
  },
  {
    label: 'Practical',
    refinementPrompt:
      'Create a practical and functional outfit. Prioritize utility and wearability.',
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
  onSelectAdjustment: (refinementPrompt: string, label: string) => void;
  disabled?: boolean;
  moodChipsDisabled?: boolean; // Disable only mood chips (not prompt input)
  promptInputDisabled?: boolean; // Visually disable prompt input (greyed out)
  selectedMoodLabel?: string | null;
  selectedAdjustmentLabel?: string | null;
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
  moodChipsDisabled = false,
  promptInputDisabled = false,
  selectedMoodLabel = null,
  selectedAdjustmentLabel = null,
  showMoods = true,
  showAdjustments = true,
  showPrompt = true,
  promptValue = '',
  onPromptChange,
  promptPlaceholder = 'Describe the outfit you want...',
  promptLabel = 'Describe the type of outfit you want',
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
      color: theme.colors.foreground,
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
    chipDisabled: boolean = disabled,
  ) => (
    <TouchableOpacity
      key={chip.label}
      onPress={() => {
        if (!chipDisabled) {
          h('impactLight');
          onPress();
        }
      }}
      disabled={chipDisabled}
      activeOpacity={0.7}
      style={[
        styles.chip,
        isSelected && styles.chipSelected,
        chipDisabled && styles.chipDisabled,
      ]}>
      <Text
        style={[styles.chipText, isSelected && styles.chipTextSelected, chipDisabled && {opacity: 0.35}]}>
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
            <Text style={[styles.sectionTitle, promptInputDisabled && {opacity: 0.35}]}>{promptLabel}</Text>
          ) : null}
          <View style={[styles.promptInputContainer, promptInputDisabled && {opacity: 0.35}]}>
            <TextInput
              style={styles.promptInput}
              value={promptValue}
              onChangeText={onPromptChange}
              placeholder={promptPlaceholder}
              placeholderTextColor={theme.colors.muted}
              editable={!disabled && !promptInputDisabled}
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
          <Text style={[styles.sectionTitle, {textAlign: 'center',marginTop: 12}]}>(Or choose a mood)</Text>
          <Text style={[styles.sectionTitle, {marginTop: 10}, (disabled || moodChipsDisabled) && {opacity: 0.35}]}>Pick how you are feeling today</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodChipsScroll}>
            {MOOD_CHIPS.map(chip => {
              const isSelected = selectedMoodLabel === chip.label;
              return renderChip(
                chip,
                isSelected,
                () =>
                  // Toggle: deselect if already selected, otherwise select
                  isSelected
                    ? onSelectMood('', '')
                    : onSelectMood(chip.refinementPrompt, chip.label),
                disabled || moodChipsDisabled,
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Adjustment Section - only show after outfit exists */}
      {showAdjustments && (
        <>
          <Text style={styles.sectionTitle}>(Optional additional choices)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodChipsScroll}>
            {ADJUSTMENT_CHIPS.map(chip => {
              const isSelected = selectedAdjustmentLabel === chip.label;
              return renderChip(chip, isSelected, () =>
                // Toggle: deselect if already selected, otherwise select
                isSelected
                  ? onSelectAdjustment('', '')
                  : onSelectAdjustment(chip.refinementPrompt, chip.label),
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}
