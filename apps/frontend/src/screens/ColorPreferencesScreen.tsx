import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
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

const COLOR_KEY = 'style.colorPreferences';

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

const COLORS = [
  'Black',
  'White',
  'Navy',
  'Gray',
  'Brown',
  'Beige',
  'Olive',
  'Burgundy',
  'Pastels',
  'Bold Colors',
];

type Props = {navigate: (screen: string) => void};

export default function ColorPreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string[]>([]);

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
    if (styleProfile?.color_preferences?.length) {
      setSelected(styleProfile.color_preferences);
    }
  }, [styleProfile]);

  const toggleColor = async (color: string) => {
    // 🔔 haptic on chip press
    h('impactLight');

    const updated = selected.includes(color)
      ? selected.filter(c => c !== color)
      : [...selected, color];

    try {
      setSelected(updated);
      await AsyncStorage.setItem(COLOR_KEY, JSON.stringify(updated));
      updateProfile('color_preferences', updated);
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
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Color Preferences
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          {/* 🔔 back = light tap */}
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
            Choose colors you like wearing:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {COLORS.map(color => (
                <Chip
                  key={color}
                  label={color}
                  selected={selected.includes(color)}
                  onPress={() => toggleColor(color)}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

///////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// const COLOR_KEY = 'style.colorPreferences';

// const COLORS = [
//   'Black',
//   'White',
//   'Navy',
//   'Gray',
//   'Brown',
//   'Beige',
//   'Olive',
//   'Burgundy',
//   'Pastels',
//   'Bold Colors',
// ];

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function ColorPreferencesScreen({navigate}: Props) {
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
//     if (styleProfile?.color_preferences?.length) {
//       setSelected(styleProfile.color_preferences);
//     }
//   }, [styleProfile]);

//   const toggleColor = async (color: string) => {
//     const updated = selected.includes(color)
//       ? selected.filter(c => c !== color)
//       : [...selected, color];
//     setSelected(updated);
//     await AsyncStorage.setItem(COLOR_KEY, JSON.stringify(updated));
//     updateProfile('color_preferences', updated);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Color Preferences
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Choose colors you like wearing:
//           </Text>

//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {COLORS.map(color => (
//                 <Chip
//                   key={color}
//                   label={color}
//                   selected={selected.includes(color)}
//                   onPress={() => toggleColor(color)}
//                 />
//               ))}
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
