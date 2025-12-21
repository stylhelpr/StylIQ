import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, Keyboard} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {navigate: (screen: string) => void};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

const defaultHairColors = [
  'Black',
  'Brown',
  'Blonde',
  'Red',
  'Gray',
  'White',
  'Dyed - Bold',
  'Dyed - Subtle',
  'Other',
];

export default function HairColorScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customColors, setCustomColors] = useState<string[]>([]);

  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    input: {
      borderWidth: tokens.borderWidth.hairline,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      backgroundColor: theme.colors.input2,
      color: colors.foreground,
      marginTop: 12,
      borderColor: theme.colors.inputBorder,
    },
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (styleProfile?.hair_color) {
      setSelected(styleProfile.hair_color);
      if (!defaultHairColors.includes(styleProfile.hair_color)) {
        setCustomColors(prev =>
          prev.includes(styleProfile.hair_color) ? prev : [...prev, styleProfile.hair_color],
        );
      }
    }
  }, [styleProfile]);

  const handleSelect = async (label: string) => {
    h('impactLight');
    if (label === 'Other') {
      setShowCustomInput(true);
      return;
    }
    setSelected(label);
    setShowCustomInput(false);
    try {
      await AsyncStorage.setItem('hairColor', label);
      updateProfile('hair_color', label);
    } catch {
      h('notificationError');
    }
  };

  const handleCustomSubmit = async () => {
    const trimmed = customColor.trim();
    if (!trimmed) return;

    // Add as a new pill if it doesn't exist
    const allColors = [...defaultHairColors, ...customColors];
    const exists = allColors.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      setCustomColors(prev => [...prev, trimmed]);
    }

    setSelected(trimmed);
    setCustomColor('');
    setShowCustomInput(false);

    try {
      await AsyncStorage.setItem('hairColor', trimmed);
      updateProfile('hair_color', trimmed);
      Keyboard.dismiss();
      h('impactLight');
    } catch {
      h('notificationError');
    }
  };

  const combinedColors = [...defaultHairColors.filter(c => c !== 'Other'), ...customColors, 'Other'];

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
        Hair Color
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section4}>
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
            Select your current natural or styled hair color:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md, paddingBottom: 20},
            ]}>
            <View style={globalStyles.pillContainer}>
              {combinedColors.map(color => (
                <Chip
                  key={color}
                  label={color}
                  selected={selected === color || (color === 'Other' && showCustomInput)}
                  onPress={() => handleSelect(color)}
                />
              ))}
            </View>

            {showCustomInput && (
              <TextInput
                placeholder="Specify your hair color"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={customColor}
                onChangeText={setCustomColor}
                onSubmitEditing={handleCustomSubmit}
                onBlur={handleCustomSubmit}
                returnKeyType="done"
                autoFocus
              />
            )}
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
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const hairColors = [
//   'Black',
//   'Brown',
//   'Blonde',
//   'Red',
//   'Gray',
//   'White',
//   'Dyed - Bold',
//   'Dyed - Subtle',
// ];

// export default function HairColorScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const [selected, setSelected] = useState<string | null>(null);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//   });

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   useEffect(() => {
//     if (styleProfile?.hair_color) {
//       setSelected(styleProfile.hair_color);
//     }
//   }, [styleProfile]);

//   const handleSelect = async (label: string) => {
//     setSelected(label);
//     await AsyncStorage.setItem('hairColor', label);
//     updateProfile('hair_color', label);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Hair Color
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Select your current natural or styled hair color:
//           </Text>

//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {hairColors.map(color => (
//                 <Chip
//                   key={color}
//                   label={color}
//                   selected={selected === color}
//                   onPress={() => handleSelect(color)}
//                 />
//               ))}
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
