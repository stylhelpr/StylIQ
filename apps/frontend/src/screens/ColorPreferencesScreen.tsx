import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, Keyboard} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const COLOR_KEY = 'style.colorPreferences';

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

const COLORS = [
  'Black',
  'White',
  'Navy',
  'Gray',
  'Brown',
  'Beige',
  'Olive',
  'Burgundy',
  'Pastels',
  'Bold Colors',
];

const AVOID_COLOR_OPTIONS = [
  'Black',
  'White',
  'Navy',
  'Gray',
  'Brown',
  'Beige',
  'Olive',
  'Burgundy',
  'Pastels',
  'Bold Colors',
  'Neon',
  'Orange',
  'Yellow',
  'Pink',
];

const METAL_OPTIONS = ['Gold', 'Silver', 'Rose Gold', 'Mixed metals', 'No preference'];
const CONTRAST_OPTIONS = ['High contrast', 'Medium contrast', 'Low contrast', 'No preference'];

type Props = {navigate: (screen: string) => void};

export default function ColorPreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string[]>([]);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState('');

  // avoid_colors state
  const [avoidSelected, setAvoidSelected] = useState<string[]>([]);
  const [customAvoidColors, setCustomAvoidColors] = useState<string[]>([]);
  const [newAvoidColor, setNewAvoidColor] = useState('');

  // single-select states
  const [metalPref, setMetalPref] = useState('');
  const [contrastPref, setContrastPref] = useState('');

  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    subtitle: {fontSize: 16, marginBottom: 20},
    input: {
      borderWidth: tokens.borderWidth.hairline,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      backgroundColor: theme.colors.input2,
      color: colors.foreground,
      marginTop: 12,
      borderColor: theme.colors.inputBorder,
    },
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (styleProfile?.color_preferences?.length) {
      setSelected(styleProfile.color_preferences);
      const customOnly = styleProfile.color_preferences.filter(
        (c: string) => !COLORS.map(x => x.toLowerCase()).includes(c.toLowerCase()),
      );
      setCustomColors(prev => Array.from(new Set([...prev, ...customOnly])));
    }

    // avoid_colors hydration
    if (Array.isArray(styleProfile?.avoid_colors)) {
      setAvoidSelected(styleProfile.avoid_colors);
      const customOnly = styleProfile.avoid_colors.filter(
        (c: string) =>
          !AVOID_COLOR_OPTIONS.map(x => x.toLowerCase()).includes(c.toLowerCase()),
      );
      setCustomAvoidColors(prev => Array.from(new Set([...prev, ...customOnly])));
    }

    // single-select hydration
    if (styleProfile?.metal_preference) setMetalPref(styleProfile.metal_preference);
    if (styleProfile?.contrast_preference) setContrastPref(styleProfile.contrast_preference);
  }, [styleProfile]);

  const toggleColor = async (color: string) => {
    h('impactLight');

    const updated = selected.includes(color)
      ? selected.filter(c => c !== color)
      : [...selected, color];

    try {
      setSelected(updated);
      await AsyncStorage.setItem(COLOR_KEY, JSON.stringify(updated));
      updateProfile('color_preferences', updated);
    } catch {
      h('notificationError');
    }
  };

  const handleAddColor = async () => {
    const trimmed = newColor.trim();
    if (!trimmed) return;

    const allColors = [...COLORS, ...customColors];
    const exists = allColors.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewColor('');
      Keyboard.dismiss();
      return;
    }

    const updatedCustom = [...customColors, trimmed];
    const updatedSelected = [...selected, trimmed];

    setCustomColors(updatedCustom);
    setSelected(updatedSelected);

    try {
      await AsyncStorage.setItem(COLOR_KEY, JSON.stringify(updatedSelected));
      await updateProfile('color_preferences', updatedSelected);
      setNewColor('');
      Keyboard.dismiss();
      h('impactLight');
    } catch {
      h('notificationError');
    }
  };

  const toggleAvoidColor = async (color: string) => {
    h('impactLight');
    const updated = avoidSelected.includes(color)
      ? avoidSelected.filter(c => c !== color)
      : [...avoidSelected, color];
    setAvoidSelected(updated);
    try {
      updateProfile('avoid_colors', updated);
    } catch {
      h('notificationError');
    }
  };

  const handleAddAvoidColor = async () => {
    const trimmed = newAvoidColor.trim();
    if (!trimmed) return;
    const all = [...AVOID_COLOR_OPTIONS, ...customAvoidColors];
    if (all.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setNewAvoidColor('');
      Keyboard.dismiss();
      return;
    }
    const updatedCustom = [...customAvoidColors, trimmed];
    const updatedSelected = [...avoidSelected, trimmed];
    setCustomAvoidColors(updatedCustom);
    setAvoidSelected(updatedSelected);
    try {
      updateProfile('avoid_colors', updatedSelected);
      setNewAvoidColor('');
      Keyboard.dismiss();
      h('impactLight');
    } catch {
      h('notificationError');
    }
  };

  const handleSingleSelect = (key: string, value: string) => {
    h('impactLight');
    if (key === 'metal_preference') setMetalPref(value);
    if (key === 'contrast_preference') setContrastPref(value);
    try {
      updateProfile(key, value);
    } catch {
      h('notificationError');
    }
  };

  const combinedColors = [...COLORS, ...customColors];

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <View
        style={{
          height: insets.top + 60, // ⬅️ 56 is about the old navbar height
          backgroundColor: theme.colors.background, // same tone as old nav
        }}
      />
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Color Preferences
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          {/* 🔔 back = light tap */}
          <AppleTouchFeedback
            hapticStyle="impactLight"
            onPress={() => navigate('StyleProfileScreen')}>
            <BackHeader
              title=""
              onBack={() => navigate('StyleProfileScreen')}
            />
          </AppleTouchFeedback>
          <Text style={globalStyles.backText}>Back</Text>
        </View>

        <View style={globalStyles.centeredSection}>
          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Choose colors you like wearing:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md, paddingBottom: 20},
            ]}>
            <View style={globalStyles.pillContainer}>
              {combinedColors.map(color => (
                <Chip
                  key={color}
                  label={color}
                  selected={selected.includes(color)}
                  onPress={() => toggleColor(color)}
                />
              ))}
            </View>

            <TextInput
              placeholder="Add a custom color"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={newColor}
              onChangeText={setNewColor}
              onSubmitEditing={handleAddColor}
              onBlur={handleAddColor}
              returnKeyType="done"
            />
          </View>

          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Colors to always avoid:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md, paddingBottom: 20},
            ]}>
            <View style={globalStyles.pillContainer}>
              {[...AVOID_COLOR_OPTIONS, ...customAvoidColors].map(color => (
                <Chip
                  key={color}
                  label={color}
                  selected={avoidSelected.includes(color)}
                  onPress={() => toggleAvoidColor(color)}
                />
              ))}
            </View>

            <TextInput
              placeholder="Add a custom color to avoid"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={newAvoidColor}
              onChangeText={setNewAvoidColor}
              onSubmitEditing={handleAddAvoidColor}
              onBlur={handleAddAvoidColor}
              returnKeyType="done"
            />
          </View>

          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Metal preference:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {METAL_OPTIONS.map(opt => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={metalPref === opt}
                  onPress={() => handleSingleSelect('metal_preference', opt)}
                />
              ))}
            </View>
          </View>

          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Contrast preference:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {CONTRAST_OPTIONS.map(opt => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={contrastPref === opt}
                  onPress={() => handleSingleSelect('contrast_preference', opt)}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

///////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// const COLOR_KEY = 'style.colorPreferences';

// const COLORS = [
//   'Black',
//   'White',
//   'Navy',
//   'Gray',
//   'Brown',
//   'Beige',
//   'Olive',
//   'Burgundy',
//   'Pastels',
//   'Bold Colors',
// ];

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function ColorPreferencesScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const [selected, setSelected] = useState<string[]>([]);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     subtitle: {fontSize: 16, marginBottom: 20},
//   });

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   useEffect(() => {
//     if (styleProfile?.color_preferences?.length) {
//       setSelected(styleProfile.color_preferences);
//     }
//   }, [styleProfile]);

//   const toggleColor = async (color: string) => {
//     const updated = selected.includes(color)
//       ? selected.filter(c => c !== color)
//       : [...selected, color];
//     setSelected(updated);
//     await AsyncStorage.setItem(COLOR_KEY, JSON.stringify(updated));
//     updateProfile('color_preferences', updated);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Color Preferences
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Choose colors you like wearing:
//           </Text>

//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {COLORS.map(color => (
//                 <Chip
//                   key={color}
//                   label={color}
//                   selected={selected.includes(color)}
//                   onPress={() => toggleColor(color)}
//                 />
//               ))}
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
