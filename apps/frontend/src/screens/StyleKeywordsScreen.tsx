import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Keyboard,
} from 'react-native';
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

type Props = {
  navigate: (screen: string) => void;
};

const STORAGE_KEY = 'style_keywords';
const defaultOptions = ['Classic', 'Edgy', 'Artsy', 'Elegant', 'Boho'];

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function StyleKeywordsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const [selected, setSelected] = useState<string[]>([]);
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    subtitle: {fontSize: 17, marginBottom: 20},
    input: {
      borderWidth: tokens.borderWidth.hairline,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      backgroundColor: theme.colors.input2,
      color: colors.foreground,
      marginTop: 12,
    },
  });

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (styleProfile?.style_keywords?.length > 0) {
      const keywordsFromDB = styleProfile.style_keywords;

      setSelected(keywordsFromDB);

      // Derive and persist all custom keywords (regardless of selection)
      const customOnly = keywordsFromDB.filter(
        kw =>
          !defaultOptions.map(d => d.toLowerCase()).includes(kw.toLowerCase()),
      );
      setCustomKeywords(prev => Array.from(new Set([...prev, ...customOnly])));
    } else {
      AsyncStorage.getItem(STORAGE_KEY).then(data => {
        if (data) {
          const parsed = JSON.parse(data);
          setSelected(parsed);
          const customOnly = parsed.filter(
            kw =>
              !defaultOptions
                .map(d => d.toLowerCase())
                .includes(kw.toLowerCase()),
          );
          setCustomKeywords(prev =>
            Array.from(new Set([...prev, ...customOnly])),
          );
        }
      });
    }
  }, [styleProfile]);

  const toggleKeyword = async (keyword: string) => {
    h('impactLight');

    const updated = selected.includes(keyword)
      ? selected.filter(k => k !== keyword)
      : [...selected, keyword];

    try {
      setSelected(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      await updateProfile('style_keywords', updated);
    } catch {
      h('notificationError');
    }
  };

  const handleAddKeyword = async () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;

    // Prevent duplicates (case-insensitive)
    const allKeywords = [...defaultOptions, ...customKeywords];
    const exists = allKeywords.some(
      k => k.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      setNewKeyword('');
      Keyboard.dismiss();
      return;
    }

    const updatedCustom = [...customKeywords, trimmed];
    setCustomKeywords(updatedCustom);

    const updatedSelected = [...selected, trimmed];
    setSelected(updatedSelected);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSelected));
    await updateProfile('style_keywords', updatedSelected);

    setNewKeyword('');
    Keyboard.dismiss();
    h('impactLight');
  };

  const combinedKeywords = [...defaultOptions, ...customKeywords];

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Style Keywords
      </Text>

      <ScrollView
        contentContainerStyle={globalStyles.section4}
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

        <Text style={globalStyles.sectionTitle4}>
          Pick words that describe your overall style:
        </Text>

        <View style={globalStyles.centeredSection}>
          <View
            style={[
              globalStyles.styleContainer1,
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {combinedKeywords.map(option => (
                <Chip
                  key={option}
                  label={option}
                  selected={selected.includes(option)}
                  onPress={() => toggleKeyword(option)}
                />
              ))}
            </View>

            <TextInput
              placeholder="Add a new keyword"
              placeholderTextColor={colors.muted}
              style={[styles.input, {borderColor: theme.colors.inputBorder}]}
              value={newKeyword}
              onChangeText={setNewKeyword}
              onSubmitEditing={handleAddKeyword}
              onBlur={handleAddKeyword}
              returnKeyType="done"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

//////////////////

// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const STORAGE_KEY = 'style_keywords';
// const options = ['Classic', 'Edgy', 'Artsy', 'Elegant', 'Boho'];

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function StyleKeywordsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const [selected, setSelected] = useState<string[]>([]);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     subtitle: {fontSize: 17, marginBottom: 20},
//   });

//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   useEffect(() => {
//     if (styleProfile?.style_keywords?.length > 0) {
//       setSelected(styleProfile.style_keywords);
//     } else {
//       AsyncStorage.getItem(STORAGE_KEY).then(data => {
//         if (data) setSelected(JSON.parse(data));
//       });
//     }
//   }, [styleProfile]);

//   const toggleKeyword = async (keyword: string) => {
//     h('impactLight');

//     const updated = selected.includes(keyword)
//       ? selected.filter(k => k !== keyword)
//       : [...selected, keyword];

//     try {
//       setSelected(updated);
//       await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
//       updateProfile('style_keywords', updated);
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
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Style Keywords
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           {/* back = light tap */}
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

//         <Text style={globalStyles.sectionTitle4}>
//           Pick words that describe your overall style:
//         </Text>

//         <View style={globalStyles.centeredSection}>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {options.map(option => (
//                 <Chip
//                   key={option}
//                   label={option}
//                   selected={selected.includes(option)}
//                   onPress={() => toggleKeyword(option)}
//                 />
//               ))}
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
