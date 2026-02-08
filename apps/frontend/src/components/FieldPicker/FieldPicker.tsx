import React, {useState, useMemo} from 'react';
import {View, Text, TextInput, StyleSheet} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import {useAppTheme} from '../../context/ThemeContext';

// ─── Canonical option arrays (from backend DTO @IsIn validators) ───

export const MAIN_CATEGORIES = [
  'Tops',
  'Bottoms',
  'Outerwear',
  'Shoes',
  'Accessories',
  'Undergarments',
  'Activewear',
  'Formalwear',
  'Loungewear',
  'Sleepwear',
  'Swimwear',
  'Maternity',
  'Unisex',
  'Costumes',
  'TraditionalWear',
  'Dresses',
  'Skirts',
  'Bags',
  'Headwear',
  'Jewelry',
  'Other',
] as const;

export const FIT_OPTIONS = ['Slim', 'Regular', 'Oversized'] as const;
export const PATTERN_OPTIONS = [
  'Solid',
  'Striped',
  'Check',
  'Herringbone',
  'Windowpane',
  'Floral',
  'Dot',
  'Camo',
  'Abstract',
  'Other',
] as const;
export const PATTERN_SCALE_OPTIONS = ['Micro', 'Medium', 'Bold'] as const;
export const SEASONALITY_OPTIONS = [
  'Spring',
  'Summer',
  'Fall',
  'Winter',
  'AllSeason',
] as const;
export const LAYERING_OPTIONS = ['Base', 'Mid', 'Outer'] as const;
export const DRESS_CODE_OPTIONS = [
  'UltraCasual',
  'Casual',
  'SmartCasual',
  'BusinessCasual',
  'Business',
  'BlackTie',
] as const;
export const ANCHOR_ROLE_OPTIONS = [
  'Hero',
  'Neutral',
  'Connector',
] as const;
export const COLOR_FAMILY_OPTIONS = [
  'Black',
  'White',
  'Blue',
  'Red',
  'Green',
  'Yellow',
  'Brown',
  'Gray',
  'Navy',
  'Beige',
  'Purple',
  'Orange',
] as const;
export const OCCASION_OPTIONS = [
  'Work',
  'DateNight',
  'Travel',
  'Gym',
] as const;

// ─── Component ─────────────────────────────────────────────────────

type FieldPickerProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (val: string) => void;
  allowCustom?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Multi-select mode (e.g. occasion_tags). Value is comma-separated. */
  multiple?: boolean;
};

const CUSTOM_KEY = '__custom__';

export default function FieldPicker({
  label,
  value,
  options,
  onChange,
  allowCustom = false,
  placeholder,
  disabled = false,
  multiple = false,
}: FieldPickerProps) {
  const {theme} = useAppTheme();
  const [open, setOpen] = useState(false);

  // Detect non-canonical current value → auto-custom mode
  const isCustomValue =
    !multiple &&
    value !== '' &&
    !options.includes(value) &&
    value !== CUSTOM_KEY;

  const [customMode, setCustomMode] = useState(isCustomValue);
  const [customText, setCustomText] = useState(isCustomValue ? value : '');

  // Build items list
  const items = useMemo(() => {
    const base = options.map(opt => ({label: opt, value: opt}));
    if (allowCustom) {
      base.push({label: 'Custom…', value: CUSTOM_KEY});
    }
    return base;
  }, [options, allowCustom]);

  // Multi-select: parse comma string to array
  const multiValue = useMemo(() => {
    if (!multiple || !value) return [];
    return value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }, [multiple, value]);

  const styles = StyleSheet.create({
    wrapper: {
      marginBottom: 14,
      zIndex: open ? 9000 : 1,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.foreground,
      marginBottom: 6,
    },
    customInput: {
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: theme.colors.foreground,
      backgroundColor: theme.colors.input2,
      marginTop: 6,
    },
    customHint: {
      fontSize: 12,
      color: theme.colors.muted,
      marginTop: 2,
    },
  });

  if (multiple) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <DropDownPicker
          open={open}
          setOpen={setOpen}
          value={multiValue}
          setValue={cb => {
            const next = typeof cb === 'function' ? cb(multiValue) : cb;
            onChange((next as string[]).join(', '));
          }}
          items={items}
          multiple={true}
          mode="BADGE"
          placeholder={placeholder || `Select ${label}…`}
          listMode="SCROLLVIEW"
          dropDownDirection="AUTO"
          disabled={disabled}
          style={{
            backgroundColor: theme.colors.input2,
            borderColor: theme.colors.inputBorder,
            borderRadius: 10,
            minHeight: 44,
          }}
          textStyle={{color: theme.colors.foreground, fontSize: 15}}
          dropDownContainerStyle={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.inputBorder,
            zIndex: 9999,
            elevation: 9999,
          }}
          badgeColors={[theme.colors.button1]}
          badgeTextStyle={{color: theme.colors.buttonText1}}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <DropDownPicker
        open={open}
        setOpen={setOpen}
        value={customMode ? CUSTOM_KEY : value || null}
        setValue={cb => {
          const next =
            typeof cb === 'function'
              ? cb(customMode ? CUSTOM_KEY : value || null)
              : cb;
          if (next === CUSTOM_KEY) {
            setCustomMode(true);
            setCustomText('');
            onChange('');
          } else {
            setCustomMode(false);
            setCustomText('');
            onChange((next as string) ?? '');
          }
        }}
        items={items}
        placeholder={placeholder || `Select ${label}…`}
        listMode="SCROLLVIEW"
        dropDownDirection="AUTO"
        disabled={disabled}
        style={{
          backgroundColor: theme.colors.input2,
          borderColor: theme.colors.inputBorder,
          borderRadius: 10,
          minHeight: 44,
        }}
        textStyle={{color: theme.colors.foreground, fontSize: 15}}
        dropDownContainerStyle={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.inputBorder,
          zIndex: 9999,
          elevation: 9999,
        }}
      />
      {customMode && (
        <>
          <TextInput
            value={customText}
            onChangeText={t => {
              setCustomText(t);
              onChange(t);
            }}
            style={styles.customInput}
            placeholder="Type custom value…"
            placeholderTextColor={theme.colors.muted}
          />
          <Text style={styles.customHint}>
            Custom: value not in standard list
          </Text>
        </>
      )}
    </View>
  );
}
