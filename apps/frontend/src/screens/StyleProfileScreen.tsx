import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import LinearGradient from 'react-native-linear-gradient';
import {useProfileProgress} from '../hooks/useProfileProgress';
import type {WardrobeItem} from '../types/wardrobe';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useAuth0} from 'react-native-auth0';
import {useUUID} from '../context/UUIDContext';
import {useQuery} from '@tanstack/react-query';
import {API_BASE_URL} from '../config/api';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
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

  const {
    styleProfile,
    updateProfile,
    isLoading: profileLoading,
    isUpdating,
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
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{color: 'gray', marginTop: 12}}>Loading profile...</Text>
      </View>
    );
  }

  if (isError || wardrobeError) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: 'red'}}>❌ Error loading style profile.</Text>
      </View>
    );
  }

  let progress = 0;
  try {
    progress = useProfileProgress(styleProfile, wardrobe);
  } catch (e) {}

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollFade: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 30,
    },
    fadeBottom: {
      flex: 1,
    },
    progressLabel: {
      fontSize: 16,
      color: theme.colors.foreground,
      marginTop: 2,
      marginBottom: 4,
    },
    progressBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: '#ccc',
      overflow: 'hidden',
      marginTop: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#4caf50',
      borderRadius: 4,
    },
  });

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
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

      <View style={[globalStyles.section, {paddingBottom: 230}]}>
        <ScrollView
          contentContainerStyle={[
            globalStyles.menuSection3,
            {
              paddingHorizontal: 20,
              width: '100%',
              maxWidth: 700,
              alignSelf: 'center',
            },
          ]}
          showsVerticalScrollIndicator={false}>
          {[
            ['Preferences', '👗 Style Preferences'],
            ['Measurements', '📏 Measurements'],
            ['BudgetAndBrands', '💰 Budget & Brands'],
            ['Appearance', '🧍 Appearance'],
            ['Lifestyle', '🌎 Lifestyle'],
            ['BodyTypes', '📐 Body Type'],
            ['Proportions', '📊 Body Proportions'],
            ['FitPreferences', '🧵 Fit Preferences'],
            ['FashionGoals', '🎯 Fashion Goals'],
            ['Climate', '🌤️ Climate'],
            ['HairColor', '💇 Hair Color'],
            ['SkinTone', '🎨 Skin Tone'],
            ['EyeColor', '👁️ Eye Color'],
            ['ShoppingHabits', '🛍️ Shopping Habits'],
            ['PersonalityTraits', '🧠 Personality Traits'],
            ['ColorPreferences', '🌈 Color Preferences'],
            ['Undertone', '🫧 Undertone'],
            ['StyleKeywords', '🪞 Style Keywords'],
          ].map(([screen, label]) => (
            <AppleTouchFeedback
              key={screen}
              onPress={() => navigate(screen)}
              hapticStyle="impactMedium"
              style={[globalStyles.hrLine, {paddingVertical: 9}]}>
              <Text style={globalStyles.sectionTitle3}>{label}</Text>
            </AppleTouchFeedback>
          ))}
        </ScrollView>
      </View>

      <View style={styles.scrollFade} pointerEvents="none">
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.fadeBottom}
        />
      </View>
    </View>
  );
}

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
