import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

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
      <Text style={[globalStyles.header, {color: colors.primary}]}>
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
          <View style={globalStyles.styleContainer1}>
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

//////////////

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

//   // Sync UI state with backend data whenever it arrives
//   useEffect(() => {
//     if (
//       styleProfile?.style_preferences &&
//       Array.isArray(styleProfile.style_preferences)
//     ) {
//       setSelectedPrefs(styleProfile.style_preferences);

//       // Optional: sync to AsyncStorage cache
//       AsyncStorage.setItem(
//         STORAGE_KEY,
//         JSON.stringify(styleProfile.style_preferences),
//       );
//     } else {
//       // Fallback: load from AsyncStorage cache if no backend data
//       AsyncStorage.getItem(STORAGE_KEY).then(stored => {
//         if (stored) {
//           setSelectedPrefs(JSON.parse(stored));
//         }
//       });
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
//       <ScrollView style={globalStyles.section}>
//         <Text style={[globalStyles.header, {color: colors.primary}]}>
//           Style Preferences
//         </Text>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>
//         <Text style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//           Select the styles you’re most drawn to:
//         </Text>
//         <View style={globalStyles.styleContainer1}>
//           <View style={globalStyles.pillContainer}>
//             {preferences.map(pref => (
//               <Chip
//                 key={pref}
//                 label={pref}
//                 selected={selectedPrefs.includes(pref)}
//                 onPress={() => togglePref(pref)}
//               />
//             ))}
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

//////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView, Alert} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
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

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     subtitle: {
//       fontSize: 17,
//       marginBottom: 20,
//     },
//   });

//   const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
//   const {user, isLoading: userLoading} = useAuth0();
//   const userId = user?.sub;

//   // Only call hook if userId exists
//   const {updateProfile} = useStyleProfile(userId || '');

//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const stored = await AsyncStorage.getItem(STORAGE_KEY);
//         if (stored) {
//           setSelectedPrefs(JSON.parse(stored));
//         }
//       } catch (e) {
//         console.error('Failed to load preferences:', e);
//       }
//     };
//     if (userId) loadData();
//   }, [userId]);

//   const togglePref = async (pref: string) => {
//     const isSelected = selectedPrefs.includes(pref);
//     const updated = isSelected
//       ? selectedPrefs.filter(p => p !== pref)
//       : [...selectedPrefs, pref];

//     setSelectedPrefs(updated);

//     try {
//       await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
//     } catch (e) {
//       console.error('Failed to save preferences locally:', e);
//     }

//     if (!userId) {
//       console.warn('User ID not available, skipping backend update');
//       return;
//     }

//     try {
//       // Await updateProfile in case it is async
//       await updateProfile('style_preferences', updated);
//     } catch (e) {
//       console.error('Failed to update style preferences on backend:', e);
//       Alert.alert(
//         'Update Failed',
//         'Failed to save your style preferences. Please try again later.',
//       );
//     }
//   };

//   if (!userId || userLoading) {
//     return (
//       <View
//         style={[
//           globalStyles.container,
//           {
//             backgroundColor: theme.colors.background,
//             justifyContent: 'center',
//             alignItems: 'center',
//           },
//         ]}>
//         <Text style={{color: colors.foreground}}>Loading...</Text>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Style Preferences
//       </Text>

//       <ScrollView style={[globalStyles.section]}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <Text style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//           Select the styles you’re most drawn to:
//         </Text>

//         <View style={globalStyles.styleContainer1}>
//           <View style={globalStyles.pillContainer}>
//             {preferences.map(pref => (
//               <AppleTouchFeedback
//                 key={pref}
//                 onPress={() => togglePref(pref)}
//                 hapticStyle="impactLight">
//                 <View>
//                   <Chip label={pref} selected={selectedPrefs.includes(pref)} />
//                 </View>
//               </AppleTouchFeedback>
//             ))}
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

///////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
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

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     subtitle: {
//       fontSize: 17,
//       marginBottom: 20,
//     },
//   });

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
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Style Preferences
//       </Text>

//       <ScrollView style={[globalStyles.section]}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>
//         <Text style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//           Select the styles you’re most drawn to:
//         </Text>
//         <View style={globalStyles.styleContainer1}>
//           <View style={globalStyles.pillContainer}>
//             {preferences.map(pref => (
//               <AppleTouchFeedback
//                 key={pref}
//                 onPress={() => togglePref(pref)}
//                 hapticStyle="impactLight">
//                 <View>
//                   <Chip label={pref} selected={selectedPrefs.includes(pref)} />
//                 </View>
//               </AppleTouchFeedback>
//             ))}
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

/////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
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

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     subtitle: {
//       fontSize: 17,
//       marginBottom: 20,
//     },
//   });

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
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Style Preferences
//       </Text>

//       <ScrollView style={[globalStyles.section]}>
//         <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//         <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//           Select the styles you’re most drawn to:
//         </Text>
//         <View style={globalStyles.pillContainer}>
//           {preferences.map(pref => (
//             <AppleTouchFeedback
//               key={pref}
//               onPress={() => togglePref(pref)}
//               hapticStyle="impactLight">
//               <View>
//                 <Chip label={pref} selected={selectedPrefs.includes(pref)} />
//               </View>
//             </AppleTouchFeedback>
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
