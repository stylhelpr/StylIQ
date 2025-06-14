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

type Props = {
  navigate: (screen: string) => void;
};

export default function StyleProfileScreen({navigate}: Props) {
  const {user} = useAuth0();
  const auth0Sub = user?.sub;
  const uuid = useUUID();
  const {theme} = useAppTheme();
  const colors = theme.colors;

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
  } catch (e) {
    console.error('❌ useProfileProgress error:', e);
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 60,
    },
    link: {
      fontSize: 16,
      paddingVertical: 12,
      color: colors.primary,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface,
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
    progressContainer: {
      marginTop: 16,
      marginHorizontal: 24,
    },
    progressLabel: {
      fontSize: 14,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    progressBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: '#ccc',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#4caf50',
      borderRadius: 4,
    },
  });

  console.log('🧪 StyleProfile fields: LOOOK HERE', styleProfile);

  return (
    <View style={styles.container}>
      <BackHeader title="Style Profile" onBack={() => navigate('Profile')} />

      {/* <AppleTouchFeedback
        onPress={onBack}
        hapticStyle="impactMedium"
        style={styles.iconWrapper}>
        <Icon name="arrow-back" size={24} color={theme.colors.primary} />
      </AppleTouchFeedback> */}

      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>
          Style Profile {progress}% complete
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {width: `${progress}%`}]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
          ['Activities', '🏃 Activities'],
          ['PersonalityTraits', '🧠 Personality Traits'],
          ['ColorPreferences', '🌈 Color Preferences'],
          ['Undertone', '🫧 Undertone'],
          ['StyleKeywords', '🪞 Style Keywords'],
        ].map(([screen, label]) => (
          <AppleTouchFeedback
            key={screen}
            onPress={() => navigate(screen)}
            hapticStyle="impactMedium"
            style={{marginBottom: 12}}>
            <Text style={styles.link}>{label}</Text>
          </AppleTouchFeedback>
        ))}
      </ScrollView>

      <View style={styles.scrollFade} pointerEvents="none">
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.fadeBottom}
        />
      </View>
    </View>
  );
}

///////////

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

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function StyleProfileScreen({navigate}: Props) {
//   const {user} = useAuth0();
//   const auth0Sub = user?.sub;
//   const uuid = useUUID();
//   const {theme} = useAppTheme();
//   const colors = theme.colors;

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
//   } catch (e) {
//     console.error('❌ useProfileProgress error:', e);
//   }

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     content: {
//       padding: 20,
//       paddingBottom: 60,
//     },
//     link: {
//       fontSize: 16,
//       paddingVertical: 12,
//       color: colors.primary,
//       borderBottomWidth: 1,
//       borderBottomColor: colors.surface,
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
//     progressContainer: {
//       marginTop: 16,
//       marginHorizontal: 24,
//     },
//     progressLabel: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     progressBar: {
//       height: 8,
//       borderRadius: 4,
//       backgroundColor: '#ccc',
//       overflow: 'hidden',
//     },
//     progressFill: {
//       height: '100%',
//       backgroundColor: '#4caf50',
//       borderRadius: 4,
//     },
//   });

//   console.log('🧪 StyleProfile fields: LOOOK HERE', styleProfile);

//   return (
//     <View style={styles.container}>
//       <BackHeader title="Style Profile" onBack={() => navigate('Profile')} />

//       <View style={styles.progressContainer}>
//         <Text style={styles.progressLabel}>
//           Style Profile {progress}% complete
//         </Text>
//         <View style={styles.progressBar}>
//           <View style={[styles.progressFill, {width: `${progress}%`}]} />
//         </View>
//       </View>

//       <ScrollView contentContainerStyle={styles.content}>
//         {[
//           ['Preferences', '👗 Style Preferences'],
//           ['Measurements', '📏 Measurements'],
//           ['BudgetAndBrands', '💰 Budget & Brands'],
//           ['Appearance', '🧍 Appearance'],
//           ['Lifestyle', '🌎 Lifestyle'],
//           ['BodyTypes', '📐 Body Type'],
//           ['Proportions', '📊 Body Proportions'],
//           ['FitPreferences', '🧵 Fit Preferences'],
//           ['FashionGoals', '🎯 Fashion Goals'],
//           ['Climate', '🌤️ Climate'],
//           ['HairColor', '💇 Hair Color'],
//           ['SkinTone', '🎨 Skin Tone'],
//           ['EyeColor', '👁️ Eye Color'],
//           ['ShoppingHabits', '🛍️ Shopping Habits'],
//           ['Activities', '🏃 Activities'],
//           ['PersonalityTraits', '🧠 Personality Traits'],
//           ['ColorPreferences', '🌈 Color Preferences'],
//           ['Undertone', '🫧 Undertone'],
//           ['StyleKeywords', '🪞 Style Keywords'],
//         ].map(([screen, label]) => (
//           <TouchableOpacity key={screen} onPress={() => navigate(screen)}>
//             <Text style={styles.link}>{label}</Text>
//           </TouchableOpacity>
//         ))}
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
