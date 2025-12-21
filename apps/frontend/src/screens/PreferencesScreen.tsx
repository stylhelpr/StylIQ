import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Keyboard,
  StyleSheet,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {navigate: (screen: string) => void};

const STORAGE_KEY = 'style_preferences';

const preferences = [
  'Minimalist',
  'Streetwear',
  'Formal',
  'Luxury',
  'Bohemian',
  'Preppy',
  'Sporty',
  'Vintage',
  'Trendy',
  'Business Casual',
  'Classic',
  'Edgy',
  'Artsy',
  'Elegant',
];

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function PreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const insets = useSafeAreaInsets();

  // Selected (persisted) prefs from DB
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  // User-added custom prefs vocabulary (shown as chips even if unselected)
  const [customPrefs, setCustomPrefs] = useState<string[]>([]);
  const [newPref, setNewPref] = useState('');

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  const styles = StyleSheet.create({
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

  // Pull latest profile
  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  // Hydrate UI from DB (fallback to local if DB empty)
  useEffect(() => {
    (async () => {
      if (Array.isArray(styleProfile?.style_preferences)) {
        const fromDB = styleProfile!.style_preferences ?? [];
        setSelectedPrefs(fromDB);

        // Anything in DB not in base prefs is considered custom
        const customOnly = fromDB.filter(
          p => !preferences.map(x => x.toLowerCase()).includes(p.toLowerCase()),
        );
        setCustomPrefs(prev => {
          // Keep any already-known custom vocab plus what DB shows
          const merged = Array.from(new Set([...(prev ?? []), ...customOnly]));
          return merged;
        });
      } else {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: string[] = JSON.parse(stored);
          setSelectedPrefs(parsed);
          const customOnly = parsed.filter(
            p =>
              !preferences.map(x => x.toLowerCase()).includes(p.toLowerCase()),
          );
          setCustomPrefs(customOnly);
        }
      }
    })();
  }, [styleProfile]);

  const persist = async (next: string[]) => {
    // Persist to local cache first (best-effort)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Persist to DB (await is **critical** so it actually saves)
    await updateProfile('style_preferences', next);
    // Pull fresh copy from server so UI stays in sync with DB serialization
    await refetch();
  };

  const togglePref = async (pref: string) => {
    h('impactLight');

    const wasSelected = selectedPrefs.includes(pref);
    const next = wasSelected
      ? selectedPrefs.filter(p => p !== pref)
      : [...selectedPrefs, pref];

    // optimistic update + rollback on failure
    const prev = selectedPrefs;
    setSelectedPrefs(next);
    try {
      await persist(next);
    } catch (e) {
      // rollback
      setSelectedPrefs(prev);
      h('notificationError');
    }
  };

  const handleAddPref = async () => {
    const trimmed = newPref.trim();
    if (!trimmed) return;

    // Case-insensitive duplicate guard across base + custom
    const allVocab = [...preferences, ...customPrefs];
    const exists = allVocab.some(
      p => p.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      setNewPref('');
      Keyboard.dismiss();
      return;
    }

    // Add to vocab and select by default
    const nextCustom = [...customPrefs, trimmed];
    const nextSelected = [...selectedPrefs, trimmed];

    // optimistic updates
    setCustomPrefs(nextCustom);
    setSelectedPrefs(nextSelected);

    try {
      await persist(nextSelected);
      setNewPref('');
      Keyboard.dismiss();
      h('impactLight');
    } catch (e) {
      // rollback on failure
      setCustomPrefs(customPrefs);
      setSelectedPrefs(selectedPrefs);
      h('notificationError');
    }
  };

  const combinedPrefs = [...preferences, ...customPrefs];

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
      <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
        Style Preferences
      </Text>

      <ScrollView
        style={globalStyles.section}
        keyboardShouldPersistTaps="handled">
        <View style={globalStyles.backContainer}>
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
            Select the styles you’re most drawn to:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md, paddingBottom: 20},
            ]}>
            <View style={globalStyles.pillContainer}>
              {combinedPrefs.map(pref => (
                <Chip
                  key={pref}
                  label={pref}
                  selected={selectedPrefs.includes(pref)}
                  onPress={() => togglePref(pref)}
                />
              ))}
            </View>

            <TextInput
              placeholder="Add a new style preference"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={newPref}
              onChangeText={setNewPref}
              onSubmitEditing={handleAddPref}
              onBlur={handleAddPref}
              returnKeyType="done"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

//////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Props = {navigate: (screen: string) => void};
// const STORAGE_KEY = 'style_preferences';
// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// const preferences = [
//   'Minimalist',
//   'Streetwear',
//   'Formal',
//   'Luxury',
//   'Bohemian',
//   'Preppy',
//   'Sporty',
//   'Vintage',
//   'Trendy',
//   'Business Casual',
// ];

// export default function PreferencesScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   useEffect(() => {
//     if (Array.isArray(styleProfile?.style_preferences)) {
//       setSelectedPrefs(styleProfile!.style_preferences);
//     }
//   }, [styleProfile]);

//   const togglePref = async (pref: string) => {
//     // 🔔 fire haptic in the handler (child may consume the press)
//     h('impactLight');

//     const isSelected = selectedPrefs.includes(pref);
//     const updated = isSelected
//       ? selectedPrefs.filter(p => p !== pref)
//       : [...selectedPrefs, pref];

//     try {
//       setSelectedPrefs(updated);
//       await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
//       updateProfile('style_preferences', updated);
//     } catch {
//       h('notificationError');
//     }
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Style Preferences
//       </Text>

//       <ScrollView style={globalStyles.section}>
//         <View style={globalStyles.backContainer}>
//           {/* Back gets a light tap */}
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={() => navigate('StyleProfileScreen')}>
//             <BackHeader
//               title=""
//               onBack={() => navigate('StyleProfileScreen')}
//             />
//           </AppleTouchFeedback>
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Select the styles you’re most drawn to:
//           </Text>

//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {preferences.map(pref => (
//                 // Keep press on the Chip; haptic is inside togglePref
//                 <Chip
//                   key={pref}
//                   label={pref}
//                   selected={selectedPrefs.includes(pref)}
//                   onPress={() => togglePref(pref)}
//                 />
//               ))}
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
