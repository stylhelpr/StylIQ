import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

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

  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    const loadData = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedPrefs(JSON.parse(stored));
      }
    };
    loadData();
  }, []);

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
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <BackHeader
        title="Style Profile"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView style={styles.scroll}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Style Preferences
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Select the styles you’re most drawn to:
        </Text>
        <View style={styles.chipGroup}>
          {preferences.map(pref => (
            <AppleTouchFeedback
              key={pref}
              onPress={() => togglePref(pref)}
              hapticStyle="impactLight"
              style={{margin: 4}}>
              <View>
                <Chip label={pref} selected={selectedPrefs.includes(pref)} />
              </View>
            </AppleTouchFeedback>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});

///////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

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

//   const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

//   useEffect(() => {
//     const loadData = async () => {
//       const stored = await AsyncStorage.getItem(STORAGE_KEY);
//       if (stored) {
//         setSelectedPrefs(JSON.parse(stored));
//       }
//     };
//     loadData();
//   }, []);

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
//     <View style={[styles.container, {backgroundColor: colors.background}]}>
//       <BackHeader
//         title="Style Profile"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView style={styles.scroll}>
//         <Text style={[styles.title, {color: colors.primary}]}>
//           Style Preferences
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           Select the styles you’re most drawn to:
//         </Text>
//         <View style={styles.chipGroup}>
//           {preferences.map(pref => (
//             <Chip
//               key={pref}
//               label={pref}
//               selected={selectedPrefs.includes(pref)}
//               onPress={() => togglePref(pref)}
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   scroll: {
//     padding: 20,
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: '700',
//     marginBottom: 10,
//   },
//   subtitle: {
//     fontSize: 16,
//     marginBottom: 20,
//   },
//   chipGroup: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//   },
// });
