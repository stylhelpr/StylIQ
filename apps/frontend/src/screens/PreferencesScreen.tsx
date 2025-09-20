import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

type Props = {
  navigate: (screen: string) => void;
};

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
];

export default function PreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  // Fetch fresh backend data on mount
  useEffect(() => {
    if (userId) {
      refetch();
    }
  }, [userId, refetch]);

  // Sync UI state with backend data when it arrives
  useEffect(() => {
    if (
      styleProfile?.style_preferences &&
      Array.isArray(styleProfile.style_preferences)
    ) {
      setSelectedPrefs(styleProfile.style_preferences);
    }
  }, [styleProfile]);

  const togglePref = async (pref: string) => {
    const isSelected = selectedPrefs.includes(pref);
    const updated = isSelected
      ? selectedPrefs.filter(p => p !== pref)
      : [...selectedPrefs, pref];

    setSelectedPrefs(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    updateProfile('style_preferences', updated);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
        Style Preferences
      </Text>
      <ScrollView style={globalStyles.section}>
        <View style={globalStyles.backContainer}>
          <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
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
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {preferences.map(pref => (
                <Chip
                  key={pref}
                  label={pref}
                  selected={selectedPrefs.includes(pref)}
                  onPress={() => togglePref(pref)}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const STORAGE_KEY = 'style_preferences';

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

//   // Fetch fresh backend data on mount
//   useEffect(() => {
//     if (userId) {
//       refetch();
//     }
//   }, [userId, refetch]);

//   // Sync UI state with backend data when it arrives
//   useEffect(() => {
//     if (
//       styleProfile?.style_preferences &&
//       Array.isArray(styleProfile.style_preferences)
//     ) {
//       setSelectedPrefs(styleProfile.style_preferences);
//     }
//   }, [styleProfile]);

//   const togglePref = async (pref: string) => {
//     const isSelected = selectedPrefs.includes(pref);
//     const updated = isSelected
//       ? selectedPrefs.filter(p => p !== pref)
//       : [...selectedPrefs, pref];

//     setSelectedPrefs(updated);
//     await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
//     updateProfile('style_preferences', updated);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: colors.primary}]}>
//         Style Preferences
//       </Text>
//       <ScrollView style={globalStyles.section}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Select the styles you’re most drawn to:
//           </Text>

//           <View
//             style={[globalStyles.styleContainer1, globalStyles.cardStyles3]}>
//             <View style={globalStyles.pillContainer}>
//               {preferences.map(pref => (
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
