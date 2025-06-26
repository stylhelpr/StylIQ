import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {useProfileProgress} from '../hooks/useProfileProgress';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useUUID} from '../context/UUIDContext';
import {useQuery} from '@tanstack/react-query';
import {API_BASE_URL} from '../config/api';
import {useAuth0} from 'react-native-auth0';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import type {WardrobeItem} from '../types/wardrobe';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

export default function StyleProfileScreen({navigate}: Props) {
  const {user} = useAuth0();
  const auth0Sub = user?.sub;
  const uuid = useUUID();
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressLabel: {
      fontSize: 16,
      textAlign: 'left',
      marginTop: 4,
      color: '#999',
    },
    progressBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: '#ccc',
      overflow: 'hidden',
      marginTop: 8,
      width: '100%',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#4caf50',
      borderRadius: 4,
    },
    settingsGroup: {
      backgroundColor: '#1c1c1e',
      borderRadius: 12,
      marginTop: 16,
      borderColor: '#2c2c2e',
      borderWidth: 1,
      overflow: 'hidden',
    },
    settingsItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: '#1c1c1e',
      borderBottomWidth: 1,
      borderBottomColor: '#2c2c2e',
    },
    firstItem: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    lastItem: {
      borderBottomWidth: 0,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
      backgroundColor: 'rgba(44, 44, 46, 0.9)',
      borderColor: 'rgba(74, 74, 76, 0.9)',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    icon: {
      fontSize: 17,
    },
    label: {
      fontSize: 17,
      color: '#fff',
    },
    spacer: {
      flex: 1,
    },
  });

  const {
    styleProfile,
    isLoading: profileLoading,
    isError,
  } = useStyleProfile(auth0Sub || '');

  const {
    data: wardrobe = [],
    isLoading: wardrobeLoading,
    isError: wardrobeError,
  } = useQuery<WardrobeItem[]>({
    queryKey: ['wardrobe', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${uuid}`);
      if (!res.ok) throw new Error('Failed to fetch wardrobe');
      return await res.json();
    },
  });

  if (!auth0Sub || !uuid || profileLoading || wardrobeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{color: 'gray', marginTop: 12}}>Loading profile...</Text>
      </View>
    );
  }

  if (isError || wardrobeError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{color: 'red'}}>❌ Error loading style profile.</Text>
      </View>
    );
  }

  let progress = 0;
  try {
    progress = useProfileProgress(styleProfile, wardrobe);
  } catch (e) {}

  const profileSections = [
    ['Preferences', '🧪', 'Style Preferences'],
    ['Measurements', '📏', 'Measurements'],
    ['BudgetAndBrands', '💰', 'Budget & Brands'],
    ['Appearance', '🧍', 'Appearance'],
    ['Lifestyle', '🌍', 'Lifestyle'],
    ['BodyTypes', '📐', 'Body Type'],
    ['Proportions', '📊', 'Body Proportions'],
    ['FitPreferences', '🧵', 'Fit Preferences'],
    ['FashionGoals', '🎯', 'Fashion Goals'],
    ['Climate', '🌤️', 'Climate'],
    ['HairColor', '🧑‍🦰', 'Hair Color'],
    ['SkinTone', '🎨', 'Skin Tone'],
    ['EyeColor', '👁️', 'Eye Color'],
    ['ShoppingHabits', '🛍️', 'Shopping Habits'],
    ['PersonalityTraits', '🧠', 'Personality Traits'],
    ['ColorPreferences', '🌈', 'Color Preferences'],
    ['Undertone', '🫧', 'Undertone'],
    ['StyleKeywords', '🪞', 'Style Keywords'],
  ];

  return (
    <View
      style={[globalStyles.container, {backgroundColor: colors.background}]}>
      <Text style={[globalStyles.header, {color: colors.primary}]}>
        Style Profile
      </Text>

      <View style={globalStyles.section}>
        <View style={globalStyles.backContainer}>
          <BackHeader title="" onBack={() => navigate('Profile')} />
          <Text style={globalStyles.backText}>Back</Text>
        </View>

        <View style={globalStyles.centeredSection}>
          <Text style={styles.progressLabel}>
            Style Profile {progress}% complete
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: `${progress}%`}]} />
          </View>
        </View>
      </View>

      <ScrollView>
        <View style={[globalStyles.section, {paddingBottom: 200}]}>
          <View style={globalStyles.centeredSection}>
            <View style={styles.settingsGroup}>
              {profileSections.map(([screen, emoji, label], idx, arr) => {
                const isFirst = idx === 0;
                const isLast = idx === arr.length - 1;
                return (
                  <AppleTouchFeedback
                    key={screen}
                    onPress={() => navigate(screen as string)}
                    hapticStyle="impactMedium"
                    style={[
                      styles.settingsItem,
                      isFirst && styles.firstItem,
                      isLast && styles.lastItem,
                    ]}>
                    <View style={styles.row}>
                      <LinearGradient
                        colors={['#2f2f2f', '#1f1f1f']}
                        style={styles.iconBox}>
                        <Text style={styles.icon}>{emoji}</Text>
                      </LinearGradient>
                      <Text style={styles.label}>{label}</Text>
                      <View style={styles.spacer} />
                      <Icon
                        name="chevron-right"
                        size={22}
                        color="#888"
                        style={{marginTop: 1}}
                      />
                    </View>
                  </AppleTouchFeedback>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

//////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {useProfileProgress} from '../hooks/useProfileProgress';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import {useAuth0} from 'react-native-auth0';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function StyleProfileScreen({navigate}: Props) {
//   const {user} = useAuth0();
//   const auth0Sub = user?.sub;
//   const uuid = useUUID();
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//     },
//     loadingContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     progressLabel: {
//       fontSize: 16,
//       textAlign: 'center',
//       marginTop: 4,
//       color: '#999',
//     },
//     progressBar: {
//       height: 8,
//       borderRadius: 4,
//       backgroundColor: '#ccc',
//       overflow: 'hidden',
//       marginTop: 8,
//       marginHorizontal: 24,
//     },
//     progressFill: {
//       height: '100%',
//       backgroundColor: '#4caf50',
//       borderRadius: 4,
//     },
//     settingsGroup: {
//       backgroundColor: '#1c1c1e',
//       borderRadius: 12,
//       marginHorizontal: 20,
//       marginTop: 16,
//       borderColor: '#2c2c2e',
//       borderWidth: 1,
//       overflow: 'hidden',
//     },
//     settingsItem: {
//       paddingVertical: 12,
//       paddingHorizontal: 20,
//       backgroundColor: '#1c1c1e',
//       borderBottomWidth: 1,
//       borderBottomColor: '#2c2c2e',
//     },
//     firstItem: {
//       borderTopLeftRadius: 12,
//       borderTopRightRadius: 12,
//     },
//     lastItem: {
//       borderBottomWidth: 0,
//       borderBottomLeftRadius: 12,
//       borderBottomRightRadius: 12,
//     },
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconBox: {
//       width: 32,
//       height: 32,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 14,
//       backgroundColor: 'rgba(44, 44, 46, 0.9)',
//       borderColor: 'rgba(74, 74, 76, 0.9)',
//       borderWidth: 1,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.2,
//       shadowRadius: 2,
//       elevation: 2,
//     },
//     icon: {
//       fontSize: 17,
//     },
//     label: {
//       fontSize: 17,
//       color: '#fff',
//     },
//     spacer: {
//       flex: 1,
//     },
//   });

//   const {
//     styleProfile,
//     isLoading: profileLoading,
//     isError,
//   } = useStyleProfile(auth0Sub || '');

//   const {
//     data: wardrobe = [],
//     isLoading: wardrobeLoading,
//     isError: wardrobeError,
//   } = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', uuid],
//     enabled: !!uuid,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${uuid}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return await res.json();
//     },
//   });

//   if (!auth0Sub || !uuid || profileLoading || wardrobeLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color={colors.primary} />
//         <Text style={{color: 'gray', marginTop: 12}}>Loading profile...</Text>
//       </View>
//     );
//   }

//   if (isError || wardrobeError) {
//     return (
//       <View style={styles.loadingContainer}>
//         <Text style={{color: 'red'}}>❌ Error loading style profile.</Text>
//       </View>
//     );
//   }

//   let progress = 0;
//   try {
//     progress = useProfileProgress(styleProfile, wardrobe);
//   } catch (e) {}

//   const profileSections = [
//     ['Preferences', '🧪', 'Style Preferences'],
//     ['Measurements', '📏', 'Measurements'],
//     ['BudgetAndBrands', '💰', 'Budget & Brands'],
//     ['Appearance', '🧍', 'Appearance'],
//     ['Lifestyle', '🌍', 'Lifestyle'],
//     ['BodyTypes', '📐', 'Body Type'],
//     ['Proportions', '📊', 'Body Proportions'],
//     ['FitPreferences', '🧵', 'Fit Preferences'],
//     ['FashionGoals', '🎯', 'Fashion Goals'],
//     ['Climate', '🌤️', 'Climate'],
//     ['HairColor', '🧑‍🦰', 'Hair Color'],
//     ['SkinTone', '🎨', 'Skin Tone'],
//     ['EyeColor', '👁️', 'Eye Color'],
//     ['ShoppingHabits', '🛍️', 'Shopping Habits'],
//     ['PersonalityTraits', '🧠', 'Personality Traits'],
//     ['ColorPreferences', '🌈', 'Color Preferences'],
//     ['Undertone', '🫧', 'Undertone'],
//     ['StyleKeywords', '🪞', 'Style Keywords'],
//   ];

//   return (
//     <View style={[styles.screen, {backgroundColor: colors.background}]}>
//       <Text style={[globalStyles.header, {color: colors.primary}]}>
//         Style Profile
//       </Text>

//       <View style={globalStyles.section}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('Profile')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <Text style={styles.progressLabel}>
//           Style Profile {progress}% complete
//         </Text>
//         <View style={styles.progressBar}>
//           <View style={[styles.progressFill, {width: `${progress}%`}]} />
//         </View>
//       </View>

//       <ScrollView contentContainerStyle={{paddingBottom: 300}}>
//         <View style={styles.settingsGroup}>
//           {profileSections.map(([screen, emoji, label], idx, arr) => {
//             const isFirst = idx === 0;
//             const isLast = idx === arr.length - 1;
//             return (
//               <AppleTouchFeedback
//                 key={screen}
//                 onPress={() => navigate(screen as string)}
//                 hapticStyle="impactMedium"
//                 style={[
//                   styles.settingsItem,
//                   isFirst && styles.firstItem,
//                   isLast && styles.lastItem,
//                 ]}>
//                 <View style={styles.row}>
//                   <LinearGradient
//                     colors={['#2f2f2f', '#1f1f1f']}
//                     style={styles.iconBox}>
//                     <Text style={styles.icon}>{emoji}</Text>
//                   </LinearGradient>
//                   <Text style={styles.label}>{label}</Text>
//                   <View style={styles.spacer} />
//                   <Icon name="chevron-right" size={22} color="#888" />
//                 </View>
//               </AppleTouchFeedback>
//             );
//           })}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

///////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {useProfileProgress} from '../hooks/useProfileProgress';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function StyleProfileScreen({navigate}: Props) {
//   const {user} = useAuth0();
//   const auth0Sub = user?.sub;
//   const uuid = useUUID();
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const {
//     styleProfile,
//     isLoading: profileLoading,
//     isError,
//   } = useStyleProfile(auth0Sub || '');

//   const {
//     data: wardrobe = [],
//     isLoading: wardrobeLoading,
//     isError: wardrobeError,
//   } = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', uuid],
//     enabled: !!uuid,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${uuid}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return await res.json();
//     },
//   });

//   if (!auth0Sub || !uuid || profileLoading || wardrobeLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color={colors.primary} />
//         <Text style={{color: 'gray', marginTop: 12}}>Loading profile...</Text>
//       </View>
//     );
//   }

//   if (isError || wardrobeError) {
//     return (
//       <View style={styles.loadingContainer}>
//         <Text style={{color: 'red'}}>❌ Error loading style profile.</Text>
//       </View>
//     );
//   }

//   let progress = 0;
//   try {
//     progress = useProfileProgress(styleProfile, wardrobe);
//   } catch (e) {}

//   const profileSections = [
//     ['Preferences', '👗', 'Style Preferences'],
//     ['Measurements', '📏', 'Measurements'],
//     ['BudgetAndBrands', '💰', 'Budget & Brands'],
//     ['Appearance', '🧍', 'Appearance'],
//     ['Lifestyle', '🌎', 'Lifestyle'],
//     ['BodyTypes', '📐', 'Body Type'],
//     ['Proportions', '📊', 'Body Proportions'],
//     ['FitPreferences', '🧵', 'Fit Preferences'],
//     ['FashionGoals', '🎯', 'Fashion Goals'],
//     ['Climate', '🌤️', 'Climate'],
//     ['HairColor', '💇', 'Hair Color'],
//     ['SkinTone', '🎨', 'Skin Tone'],
//     ['EyeColor', '👁️', 'Eye Color'],
//     ['ShoppingHabits', '🛍️', 'Shopping Habits'],
//     ['PersonalityTraits', '🧠', 'Personality Traits'],
//     ['ColorPreferences', '🌈', 'Color Preferences'],
//     ['Undertone', '🫧', 'Undertone'],
//     ['StyleKeywords', '🪞', 'Style Keywords'],
//   ];

//   return (
//     <View style={[styles.screen, {backgroundColor: colors.background}]}>
//       <Text style={[globalStyles.header, {color: colors.primary}]}>
//         Style Profile
//       </Text>

//       <View style={globalStyles.section}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('Profile')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <Text style={styles.progressLabel}>
//           Style Profile {progress}% complete
//         </Text>
//         <View style={styles.progressBar}>
//           <View style={[styles.progressFill, {width: `${progress}%`}]} />
//         </View>
//       </View>

//       <ScrollView contentContainerStyle={{paddingBottom: 300}}>
//         <View style={styles.settingsGroup}>
//           {profileSections.map(([screen, emoji, label], idx, arr) => {
//             const isFirst = idx === 0;
//             const isLast = idx === arr.length - 1;
//             return (
//               <AppleTouchFeedback
//                 key={screen}
//                 onPress={() => navigate(screen as string)}
//                 hapticStyle="impactMedium"
//                 style={[
//                   styles.settingsItem,
//                   isFirst && styles.firstItem,
//                   isLast && styles.lastItem,
//                 ]}>
//                 <View style={styles.row}>
//                   <LinearGradient
//                     colors={['#3a3a3c', '#2c2c2e']}
//                     style={styles.iconBox}>
//                     <Text style={styles.icon}>{emoji}</Text>
//                   </LinearGradient>
//                   <Text style={styles.label}>{label}</Text>
//                 </View>
//               </AppleTouchFeedback>
//             );
//           })}
//         </View>
//       </ScrollView>

//       <View style={styles.scrollFade} pointerEvents="none">
//         <LinearGradient
//           colors={['transparent', colors.background]}
//           style={styles.fadeBottom}
//         />
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   screen: {
//     flex: 1,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   progressLabel: {
//     fontSize: 16,
//     textAlign: 'center',
//     marginTop: 4,
//     color: '#999',
//   },
//   progressBar: {
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#ccc',
//     overflow: 'hidden',
//     marginTop: 8,
//     marginHorizontal: 24,
//   },
//   progressFill: {
//     height: '100%',
//     backgroundColor: '#4caf50',
//     borderRadius: 4,
//   },
//   settingsGroup: {
//     backgroundColor: '#1c1c1e',
//     borderRadius: 12,
//     marginHorizontal: 20,
//     marginTop: 16,
//     borderColor: '#2c2c2e',
//     borderWidth: 1,
//     overflow: 'hidden',
//   },
//   settingsItem: {
//     paddingVertical: 14,
//     paddingHorizontal: 20,
//     backgroundColor: '#1c1c1e',
//     borderBottomWidth: 1,
//     borderBottomColor: '#2c2c2e',
//   },
//   firstItem: {
//     borderTopLeftRadius: 12,
//     borderTopRightRadius: 12,
//   },
//   lastItem: {
//     borderBottomWidth: 0,
//     borderBottomLeftRadius: 12,
//     borderBottomRightRadius: 12,
//   },
//   row: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   iconBox: {
//     width: 32,
//     height: 32,
//     borderRadius: 8,
//     backgroundColor: '#2c2c2e',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 14,
//   },
//   icon: {
//     fontSize: 17,
//   },
//   label: {
//     fontSize: 17,
//     color: '#fff',
//   },
//   scrollFade: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: 30,
//   },
//   fadeBottom: {
//     flex: 1,
//   },
// });

/////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import LinearGradient from 'react-native-linear-gradient';
// import {useProfileProgress} from '../hooks/useProfileProgress';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function StyleProfileScreen({navigate}: Props) {
//   const {user} = useAuth0();
//   const auth0Sub = user?.sub;
//   const uuid = useUUID();
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const {
//     styleProfile,
//     updateProfile,
//     isLoading: profileLoading,
//     isUpdating,
//     isError,
//   } = useStyleProfile(auth0Sub || '');

//   const {
//     data: wardrobe = [],
//     isLoading: wardrobeLoading,
//     isError: wardrobeError,
//   } = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', uuid],
//     enabled: !!uuid,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${uuid}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return await res.json();
//     },
//   });

//   if (!auth0Sub || !uuid || profileLoading || wardrobeLoading) {
//     return (
//       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//         <ActivityIndicator size="large" color={colors.primary} />
//         <Text style={{color: 'gray', marginTop: 12}}>Loading profile...</Text>
//       </View>
//     );
//   }

//   if (isError || wardrobeError) {
//     return (
//       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//         <Text style={{color: 'red'}}>❌ Error loading style profile.</Text>
//       </View>
//     );
//   }

//   let progress = 0;
//   try {
//     progress = useProfileProgress(styleProfile, wardrobe);
//   } catch (e) {}

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     scrollFade: {
//       position: 'absolute',
//       bottom: 0,
//       left: 0,
//       right: 0,
//       height: 30,
//     },
//     fadeBottom: {
//       flex: 1,
//     },
//     progressLabel: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginTop: 2,
//       marginBottom: 4,
//     },
//     progressBar: {
//       height: 8,
//       borderRadius: 4,
//       backgroundColor: '#ccc',
//       overflow: 'hidden',
//       marginTop: 8,
//     },
//     progressFill: {
//       height: '100%',
//       backgroundColor: '#4caf50',
//       borderRadius: 4,
//     },
//   });

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Style Profile
//       </Text>

//       <View style={globalStyles.section}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('Profile')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text style={styles.progressLabel}>
//             Style Profile {progress}% complete
//           </Text>
//           <View style={styles.progressBar}>
//             <View style={[styles.progressFill, {width: `${progress}%`}]} />
//           </View>
//         </View>
//       </View>

//       <View style={[globalStyles.section, {paddingBottom: 290}]}>
//         <ScrollView
//           contentContainerStyle={[
//             globalStyles.menuSection3,
//             globalStyles.cardStyles3,
//             {
//               paddingHorizontal: 20,
//               width: '100%',
//               maxWidth: 720,
//               alignSelf: 'center',
//             },
//           ]}
//           showsVerticalScrollIndicator={false}>
//           {[
//             ['Preferences', '👗 Style Preferences'],
//             ['Measurements', '📏 Measurements'],
//             ['BudgetAndBrands', '💰 Budget & Brands'],
//             ['Appearance', '🧍 Appearance'],
//             ['Lifestyle', '🌎 Lifestyle'],
//             ['BodyTypes', '📐 Body Type'],
//             ['Proportions', '📊 Body Proportions'],
//             ['FitPreferences', '🧵 Fit Preferences'],
//             ['FashionGoals', '🎯 Fashion Goals'],
//             ['Climate', '🌤️ Climate'],
//             ['HairColor', '💇 Hair Color'],
//             ['SkinTone', '🎨 Skin Tone'],
//             ['EyeColor', '👁️ Eye Color'],
//             ['ShoppingHabits', '🛍️ Shopping Habits'],
//             ['PersonalityTraits', '🧠 Personality Traits'],
//             ['ColorPreferences', '🌈 Color Preferences'],
//             ['Undertone', '🫧 Undertone'],
//             ['StyleKeywords', '🪞 Style Keywords'],
//           ].map(([screen, label]) => (
//             <AppleTouchFeedback
//               key={screen}
//               onPress={() => navigate(screen)}
//               hapticStyle="impactMedium"
//               style={[globalStyles.hrLine, {paddingVertical: 9}]}>
//               <Text style={globalStyles.sectionTitle3}>{label}</Text>
//             </AppleTouchFeedback>
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.scrollFade} pointerEvents="none">
//         <LinearGradient
//           colors={['transparent', colors.background]}
//           style={styles.fadeBottom}
//         />
//       </View>
//     </View>
//   );
// }

////////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import LinearGradient from 'react-native-linear-gradient';
// import {useProfileProgress} from '../hooks/useProfileProgress';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function StyleProfileScreen({navigate}: Props) {
//   const {user} = useAuth0();
//   const auth0Sub = user?.sub;
//   const uuid = useUUID();
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const {
//     styleProfile,
//     updateProfile,
//     isLoading: profileLoading,
//     isUpdating,
//     isError,
//   } = useStyleProfile(auth0Sub || '');

//   const {
//     data: wardrobe = [],
//     isLoading: wardrobeLoading,
//     isError: wardrobeError,
//   } = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', uuid],
//     enabled: !!uuid,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${uuid}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return await res.json();
//     },
//   });

//   if (!auth0Sub || !uuid || profileLoading || wardrobeLoading) {
//     return (
//       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//         <ActivityIndicator size="large" color={colors.primary} />
//         <Text style={{color: 'gray', marginTop: 12}}>Loading profile...</Text>
//       </View>
//     );
//   }

//   if (isError || wardrobeError) {
//     return (
//       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//         <Text style={{color: 'red'}}>❌ Error loading style profile.</Text>
//       </View>
//     );
//   }

//   let progress = 0;
//   try {
//     progress = useProfileProgress(styleProfile, wardrobe);
//   } catch (e) {}

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     scrollFade: {
//       position: 'absolute',
//       bottom: 0,
//       left: 0,
//       right: 0,
//       height: 30,
//     },
//     fadeBottom: {
//       flex: 1,
//     },
//     progressLabel: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       marginTop: 2,
//       marginBottom: 4,
//     },
//     progressBar: {
//       height: 8,
//       borderRadius: 4,
//       backgroundColor: '#ccc',
//       overflow: 'hidden',
//       marginTop: 8,
//     },
//     progressFill: {
//       height: '100%',
//       backgroundColor: '#4caf50',
//       borderRadius: 4,
//     },
//   });

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Style Profile
//       </Text>

//       <View style={globalStyles.section}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('Profile')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <Text style={styles.progressLabel}>
//           Style Profile {progress}% complete
//         </Text>
//         <View style={styles.progressBar}>
//           <View style={[styles.progressFill, {width: `${progress}%`}]} />
//         </View>
//       </View>

//       <View style={[globalStyles.section, {paddingBottom: 230}]}>
//         <ScrollView
//           contentContainerStyle={[
//             globalStyles.menuSection3,
//             {paddingHorizontal: 20},
//           ]}
//           showsVerticalScrollIndicator={false}>
//           {[
//             ['Preferences', '👗 Style Preferences'],
//             ['Measurements', '📏 Measurements'],
//             ['BudgetAndBrands', '💰 Budget & Brands'],
//             ['Appearance', '🧍 Appearance'],
//             ['Lifestyle', '🌎 Lifestyle'],
//             ['BodyTypes', '📐 Body Type'],
//             ['Proportions', '📊 Body Proportions'],
//             ['FitPreferences', '🧵 Fit Preferences'],
//             ['FashionGoals', '🎯 Fashion Goals'],
//             ['Climate', '🌤️ Climate'],
//             ['HairColor', '💇 Hair Color'],
//             ['SkinTone', '🎨 Skin Tone'],
//             ['EyeColor', '👁️ Eye Color'],
//             ['ShoppingHabits', '🛍️ Shopping Habits'],
//             ['PersonalityTraits', '🧠 Personality Traits'],
//             ['ColorPreferences', '🌈 Color Preferences'],
//             ['Undertone', '🫧 Undertone'],
//             ['StyleKeywords', '🪞 Style Keywords'],
//           ].map(([screen, label]) => (
//             <AppleTouchFeedback
//               key={screen}
//               onPress={() => navigate(screen)}
//               hapticStyle="impactMedium"
//               style={[globalStyles.hrLine, {paddingVertical: 9}]}>
//               <Text style={globalStyles.sectionTitle3}>{label}</Text>
//             </AppleTouchFeedback>
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.scrollFade} pointerEvents="none">
//         <LinearGradient
//           colors={['transparent', colors.background]}
//           style={styles.fadeBottom}
//         />
//       </View>
//     </View>
//   );
// }
