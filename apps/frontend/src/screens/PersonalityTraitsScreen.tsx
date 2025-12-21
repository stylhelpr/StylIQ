import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {navigate: (screen: string) => void};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

const STORAGE_KEY = 'personalityTraits';

const traits = [
  'Confident',
  'Adventurous',
  'Laid-back',
  'Creative',
  'Bold',
  'Playful',
  'Chill',
];

export default function PersonalityTraitsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string[]>([]);

  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    subtitle: {fontSize: 16, marginBottom: 20},
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (styleProfile?.personality_traits?.length) {
      setSelected(styleProfile.personality_traits);
    }
  }, [styleProfile]);

  const toggleTrait = async (trait: string) => {
    h('impactLight');

    const updated = selected.includes(trait)
      ? selected.filter(t => t !== trait)
      : [...selected, trait];

    try {
      setSelected(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      updateProfile('personality_traits', updated);
    } catch {
      h('notificationError');
    }
  };

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
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Personality Traits
      </Text>

      <ScrollView style={globalStyles.section4}>
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
            Choose traits that reflect how you carry yourself:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,

              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {traits.map(trait => (
                <Chip
                  key={trait}
                  label={trait}
                  selected={selected.includes(trait)}
                  onPress={() => toggleTrait(trait)}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/////////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const STORAGE_KEY = 'personalityTraits';

// const traits = [
//   'Confident',
//   'Adventurous',
//   'Laid-back',
//   'Creative',
//   'Bold',
//   'Minimalist',
//   'Playful',
//   'Elegant',
//   'Edgy',
//   'Chill',
// ];

// export default function PersonalityTraitsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const [selected, setSelected] = useState<string[]>([]);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     subtitle: {fontSize: 16, marginBottom: 20},
//   });

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   useEffect(() => {
//     if (styleProfile?.personality_traits?.length) {
//       setSelected(styleProfile.personality_traits);
//     }
//   }, [styleProfile]);

//   const toggleTrait = async (trait: string) => {
//     const updated = selected.includes(trait)
//       ? selected.filter(t => t !== trait)
//       : [...selected, trait];
//     setSelected(updated);
//     await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
//     updateProfile('personality_traits', updated);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Personality Traits
//       </Text>

//       <ScrollView style={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Choose traits that reflect how you carry yourself:
//           </Text>

//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {traits.map(trait => (
//                 <Chip
//                   key={trait}
//                   label={trait}
//                   selected={selected.includes(trait)}
//                   onPress={() => toggleTrait(trait)}
//                 />
//               ))}
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
