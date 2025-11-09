import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {navigate: (screen: string) => void};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

const habits = [
  'In-store only',
  'Online shopper',
  'Impulse buyer',
  'Strategic shopper',
  'Brand loyalist',
  'Bargain hunter',
  'Luxury shopper',
  'Minimalist purchases',
];

export default function ShoppingHabitsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (!styleProfile) return;
    if (Array.isArray(styleProfile.shopping_habits)) {
      setSelected(styleProfile.shopping_habits);
    }
    if (typeof styleProfile.lifestyle_notes === 'string') {
      setNotes(styleProfile.lifestyle_notes);
    }
  }, [styleProfile]);

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    input: {
      borderWidth: 1,
      borderRadius: tokens.borderRadius.md,
      padding: 10,
      marginBottom: 15,
      fontSize: 17,
      backgroundColor: theme.colors.input2,
    },
  });

  const toggleHabit = async (habit: string) => {
    h('impactLight');

    const updated = selected.includes(habit)
      ? selected.filter(h => h !== habit)
      : [...selected, habit];

    try {
      setSelected(updated);
      await AsyncStorage.setItem(
        'shoppingHabits',
        JSON.stringify({habits: updated, notes}),
      );
      updateProfile('shopping_habits', updated);
    } catch {
      h('notificationError');
    }
  };

  // ✅ Commit notes to DB and AsyncStorage only once editing is done
  const commitNotes = async () => {
    try {
      await AsyncStorage.setItem(
        'shoppingHabits',
        JSON.stringify({habits: selected, notes}),
      );
      updateProfile('lifestyle_notes', notes);
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
        Shopping Habits
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
            Select what best describes your shopping behavior:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,

              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {habits.map(habit => (
                <Chip
                  key={habit}
                  label={habit}
                  selected={selected.includes(habit)}
                  onPress={() => toggleHabit(habit)}
                />
              ))}
            </View>
          </View>

          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Additional Notes:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <TextInput
              placeholder="e.g., I like to splurge on jackets or shop seasonally."
              placeholderTextColor={colors.surface}
              value={notes}
              onChangeText={setNotes} // ✅ local state only
              onBlur={commitNotes} // ✅ save once editing is done
              onSubmitEditing={commitNotes}
              multiline
              style={[
                styles.input,
                {
                  borderColor: theme.colors.inputBorder,
                  color: colors.foreground,
                  borderWidth: tokens.borderWidth.hairline,
                },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Props = {navigate: (screen: string) => void};

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// const habits = [
//   'In-store only',
//   'Online shopper',
//   'Impulse buyer',
//   'Strategic shopper',
//   'Brand loyalist',
//   'Bargain hunter',
//   'Luxury shopper',
//   'Minimalist purchases',
// ];

// export default function ShoppingHabitsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const [selected, setSelected] = useState<string[]>([]);
//   const [notes, setNotes] = useState('');

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   useEffect(() => {
//     if (!styleProfile) return;
//     if (Array.isArray(styleProfile.shopping_habits)) {
//       setSelected(styleProfile.shopping_habits);
//     }
//     if (typeof styleProfile.lifestyle_notes === 'string') {
//       setNotes(styleProfile.lifestyle_notes);
//     }
//   }, [styleProfile]);

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 15,
//       fontSize: 17,
//       backgroundColor: theme.colors.input2,
//     },
//   });

//   const toggleHabit = async (habit: string) => {
//     // 🔔 haptic on chip press
//     h('impactLight');

//     const updated = selected.includes(habit)
//       ? selected.filter(h => h !== habit)
//       : [...selected, habit];

//     try {
//       setSelected(updated);
//       await AsyncStorage.setItem(
//         'shoppingHabits',
//         JSON.stringify({habits: updated, notes}),
//       );
//       updateProfile('shopping_habits', updated);
//     } catch {
//       h('notificationError');
//     }
//   };

//   const updateNotes = async (text: string) => {
//     setNotes(text);
//     try {
//       await AsyncStorage.setItem(
//         'shoppingHabits',
//         JSON.stringify({habits: selected, notes: text}),
//       );
//       updateProfile('lifestyle_notes', text);
//     } catch {
//       h('notificationError');
//     }
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Shopping Habits
//       </Text>

//       <ScrollView style={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           {/* 🔔 back = light tap */}
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={() => navigate('StyleProfileScreen')}>
//             <BackHeader
//               title=""
//               onBack={() => navigate('StyleProfileScreen')}
//             />
//           </AppleTouchFeedback>
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Select what best describes your shopping behavior:
//           </Text>

//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {habits.map(habit => (
//                 <Chip
//                   key={habit}
//                   label={habit}
//                   selected={selected.includes(habit)}
//                   onPress={() => toggleHabit(habit)}
//                 />
//               ))}
//             </View>
//           </View>

//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Additional Notes:
//           </Text>

//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <TextInput
//               placeholder="e.g., I like to splurge on jackets or shop seasonally."
//               placeholderTextColor={colors.surface}
//               value={notes}
//               onChangeText={updateNotes} // no haptic for typing
//               multiline
//               style={[
//                 styles.input,
//                 {
//                   borderColor: theme.colors.inputBorder,
//                   color: colors.foreground,
//                   borderWidth: tokens.borderWidth.hairline,
//                 },
//               ]}
//             />
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

////////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const habits = [
//   'In-store only',
//   'Online shopper',
//   'Impulse buyer',
//   'Strategic shopper',
//   'Brand loyalist',
//   'Bargain hunter',
//   'Luxury shopper',
//   'Minimalist purchases',
// ];

// export default function ShoppingHabitsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const [selected, setSelected] = useState<string[]>([]);
//   const [notes, setNotes] = useState('');

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   useEffect(() => {
//     if (styleProfile) {
//       if (styleProfile.shopping_habits?.length) {
//         setSelected(styleProfile.shopping_habits);
//       }
//       if (styleProfile.lifestyle_notes) {
//         setNotes(styleProfile.lifestyle_notes);
//       }
//     }
//   }, [styleProfile]);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     input: {
//       borderWidth: 1,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 15,
//       fontSize: 17,
//       backgroundColor: theme.colors.input2,
//     },
//   });

//   const toggleHabit = async (habit: string) => {
//     const updated = selected.includes(habit)
//       ? selected.filter(h => h !== habit)
//       : [...selected, habit];
//     setSelected(updated);
//     await AsyncStorage.setItem(
//       'shoppingHabits',
//       JSON.stringify({habits: updated, notes}),
//     );
//     updateProfile('shopping_habits', updated);
//   };

//   const updateNotes = async (text: string) => {
//     setNotes(text);
//     await AsyncStorage.setItem(
//       'shoppingHabits',
//       JSON.stringify({habits: selected, notes: text}),
//     );
//     updateProfile('lifestyle_notes', text);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Shopping Habits
//       </Text>

//       <ScrollView style={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Select what best describes your shopping behavior:
//           </Text>

//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {habits.map(habit => (
//                 <Chip
//                   key={habit}
//                   label={habit}
//                   selected={selected.includes(habit)}
//                   onPress={() => toggleHabit(habit)}
//                 />
//               ))}
//             </View>
//           </View>

//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Additional Notes:
//           </Text>

//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <TextInput
//               placeholder="e.g., I like to splurge on jackets or shop seasonally."
//               placeholderTextColor={colors.surface}
//               value={notes}
//               onChangeText={updateNotes}
//               multiline
//               style={[
//                 styles.input,
//                 {
//                   borderColor: theme.colors.inputBorder,
//                   color: colors.foreground,
//                   borderWidth: tokens.borderWidth.hairline,
//                 },
//               ]}
//             />
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
