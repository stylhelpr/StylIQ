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

type Props = {
  navigate: (screen: string) => void;
};

export default function StyleProfileScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

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
    hint: {
      textAlign: 'center',
      color: colors.muted,
      fontSize: 14,
      marginTop: 4,
      marginBottom: -10,
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
  });

  return (
    <View style={styles.container}>
      <BackHeader title="Style Profile" onBack={() => navigate('Profile')} />

      <Text style={styles.hint}>↓ Scroll to see more ↓</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigate('Preferences')}>
          <Text style={styles.link}>👗 Style Preferences</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('Measurements')}>
          <Text style={styles.link}>📏 Measurements</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('BudgetAndBrands')}>
          <Text style={styles.link}>💰 Budget & Brands</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('Appearance')}>
          <Text style={styles.link}>🧍 Appearance</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('Lifestyle')}>
          <Text style={styles.link}>🌎 Lifestyle</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('BodyTypes')}>
          <Text style={styles.link}>📐 Body Type</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('Proportions')}>
          <Text style={styles.link}>📊 Body Proportions</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('FitPreferences')}>
          <Text style={styles.link}>🧵 Fit Preferences</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('OutfitFrequency')}>
          <Text style={styles.link}>📅 Outfit Frequency</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('FashionGoals')}>
          <Text style={styles.link}>🎯 Fashion Goals</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('Climate')}>
          <Text style={styles.link}>🌤️ Climate</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('HairColor')}>
          <Text style={styles.link}>💇 Hair Color</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('SkinTone')}>
          <Text style={styles.link}>🎨 Skin Tone</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('EyeColor')}>
          <Text style={styles.link}>👁️ Eye Color</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('ShoppingHabits')}>
          <Text style={styles.link}>🛍️ Shopping Habits</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('Activities')}>
          <Text style={styles.link}>🏃 Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('PersonalityTraits')}>
          <Text style={styles.link}>🧠 Personality Traits</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('ColorPreferences')}>
          <Text style={styles.link}>🌈 Color Preferences</Text>
        </TouchableOpacity>
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

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function StyleProfileScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     content: {
//       padding: 20,
//     },
//     link: {
//       fontSize: 16,
//       paddingVertical: 12,
//       color: theme.colors.primary,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surface,
//     },
//   });

//   return (
//     <View style={styles.container}>
//       <BackHeader title="Style Profile" onBack={() => navigate('Profile')} />

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
//       </ScrollView>
//     </View>
//   );
// }
