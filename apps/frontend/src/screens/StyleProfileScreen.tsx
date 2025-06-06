import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import LinearGradient from 'react-native-linear-gradient';
import {useProfileProgress} from '../hooks/useProfileProgress';
import type {WardrobeItem} from '../hooks/useOutfitSuggestion';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useAuth0} from 'react-native-auth0';

type Props = {
  navigate: (screen: string) => void;
};

const wardrobe: WardrobeItem[] = [
  {
    id: '1',
    name: 'Black Shirt',
    image: 'https://example.com/images/black-shirt.jpg',
    mainCategory: 'Tops',
    subCategory: 'Shirt',
    color: 'Black',
    material: 'Cotton',
    fit: 'Slim',
    size: 'M',
    tags: ['formal', 'essential'],
    notes: 'Good for evening wear',
  },
  {
    id: '2',
    name: 'White Tee',
    image: 'https://example.com/images/white-tee.jpg',
    mainCategory: 'Tops',
    subCategory: 'T-Shirt',
    color: 'White',
    material: 'Cotton',
    fit: 'Regular',
    size: 'L',
    tags: ['casual', 'summer'],
    notes: '',
  },
  {
    id: '3',
    name: 'Slim Jeans',
    image: 'https://example.com/images/slim-jeans.jpg',
    mainCategory: 'Bottoms',
    subCategory: 'Jeans',
    color: 'Dark Blue',
    material: 'Denim',
    fit: 'Slim',
    size: '32',
    tags: ['casual', 'denim'],
    notes: '',
  },
];

export default function StyleProfileScreen({navigate}: Props) {
  const {user} = useAuth0();
  const userId = user?.sub;
  const {theme} = useAppTheme();
  const colors = theme.colors;

  const {styleProfile, updateProfile, isLoading, isUpdating} = useStyleProfile(
    userId || '',
  );

  if (isLoading || !styleProfile) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Loading Style Profile...</Text>
      </View>
    );
  }

  const progress = useProfileProgress(styleProfile, wardrobe);

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

  if (isLoading || !styleProfile) {
    return (
      <View style={styles.container}>
        <Text
          style={{
            color: colors.foreground,
            textAlign: 'center',
            marginTop: 40,
          }}>
          Loading style profile...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackHeader title="Style Profile" onBack={() => navigate('Profile')} />

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
        ].map(([screen, label]) => (
          <TouchableOpacity key={screen} onPress={() => navigate(screen)}>
            <Text style={styles.link}>{label}</Text>
          </TouchableOpacity>
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

////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import LinearGradient from 'react-native-linear-gradient';
// import {useProfileProgress} from '../hooks/useProfileProgress';
// import type {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const userProfile = {
//   bodyType: 'Athletic',
//   fitPreferences: ['Slim'],
//   colorPreferences: ['Black', 'White'],
//   styleTags: ['Minimalist'],
//   measurements: {height: 178, weight: 75},
//   favoriteBrands: ['Eton', 'Amiri'],
//   climate: 'Mild',
//   lifestyle: 'Urban',
//   proportions: 'Balanced',
//   personality: 'Confident',
// };

// const wardrobe: WardrobeItem[] = [
//   {
//     id: '1',
//     name: 'Black Shirt',
//     image: 'https://example.com/images/black-shirt.jpg',
//     mainCategory: 'Tops',
//     subCategory: 'Shirt',
//     color: 'Black',
//     material: 'Cotton',
//     fit: 'Slim',
//     size: 'M',
//     tags: ['formal', 'essential'],
//     notes: 'Good for evening wear',
//   },
//   {
//     id: '2',
//     name: 'White Tee',
//     image: 'https://example.com/images/white-tee.jpg',
//     mainCategory: 'Tops',
//     subCategory: 'T-Shirt',
//     color: 'White',
//     material: 'Cotton',
//     fit: 'Regular',
//     size: 'L',
//     tags: ['casual', 'summer'],
//     notes: '',
//   },
//   {
//     id: '3',
//     name: 'Slim Jeans',
//     image: 'https://example.com/images/slim-jeans.jpg',
//     mainCategory: 'Bottoms',
//     subCategory: 'Jeans',
//     color: 'Dark Blue',
//     material: 'Denim',
//     fit: 'Slim',
//     size: '32',
//     tags: ['casual', 'denim'],
//     notes: '',
//   },
// ];

// export default function StyleProfileScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const progress = useProfileProgress(userProfile, wardrobe);

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
//     hint: {
//       textAlign: 'center',
//       color: colors.muted,
//       fontSize: 14,
//       marginTop: 4,
//       marginBottom: -10,
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
//         {/* <Text style={styles.hint}>↓ Scroll to see more ↓</Text> */}
//       </View>

//       <ScrollView contentContainerStyle={styles.content}>
//         <TouchableOpacity onPress={() => navigate('Preferences')}>
//           <Text style={styles.link}>👗 Style Preferences</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('Measurements')}>
//           <Text style={styles.link}>📏 Measurements</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('BudgetAndBrands')}>
//           <Text style={styles.link}>💰 Budget & Brands</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('Appearance')}>
//           <Text style={styles.link}>🧍 Appearance</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('Lifestyle')}>
//           <Text style={styles.link}>🌎 Lifestyle</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('BodyTypes')}>
//           <Text style={styles.link}>📐 Body Type</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('Proportions')}>
//           <Text style={styles.link}>📊 Body Proportions</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('FitPreferences')}>
//           <Text style={styles.link}>🧵 Fit Preferences</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('FashionGoals')}>
//           <Text style={styles.link}>🎯 Fashion Goals</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('Climate')}>
//           <Text style={styles.link}>🌤️ Climate</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('HairColor')}>
//           <Text style={styles.link}>💇 Hair Color</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('SkinTone')}>
//           <Text style={styles.link}>🎨 Skin Tone</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('EyeColor')}>
//           <Text style={styles.link}>👁️ Eye Color</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('ShoppingHabits')}>
//           <Text style={styles.link}>🛍️ Shopping Habits</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('Activities')}>
//           <Text style={styles.link}>🏃 Activities</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('PersonalityTraits')}>
//           <Text style={styles.link}>🧠 Personality Traits</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigate('ColorPreferences')}>
//           <Text style={styles.link}>🌈 Color Preferences</Text>
//         </TouchableOpacity>
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
