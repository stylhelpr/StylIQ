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

type Props = {
  navigate: (screen: string) => void;
};

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

  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (styleProfile) {
      if (styleProfile.shopping_habits?.length) {
        setSelected(styleProfile.shopping_habits);
      }
      if (styleProfile.lifestyle_notes) {
        setNotes(styleProfile.lifestyle_notes);
      }
    }
  }, [styleProfile]);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
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
    const updated = selected.includes(habit)
      ? selected.filter(h => h !== habit)
      : [...selected, habit];
    setSelected(updated);
    await AsyncStorage.setItem(
      'shoppingHabits',
      JSON.stringify({habits: updated, notes}),
    );
    updateProfile('shopping_habits', updated);
  };

  const updateNotes = async (text: string) => {
    setNotes(text);
    await AsyncStorage.setItem(
      'shoppingHabits',
      JSON.stringify({habits: selected, notes: text}),
    );
    updateProfile('lifestyle_notes', text);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Shopping Habits
      </Text>

      <ScrollView style={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
          <Text style={globalStyles.backText}>Back</Text>
        </View>

        <View style={globalStyles.centeredSection}>
          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Select what best describes your shopping behavior:
          </Text>

          <View
            style={[globalStyles.styleContainer1, globalStyles.cardStyles3]}>
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
            style={[globalStyles.styleContainer1, globalStyles.cardStyles3]}>
            <TextInput
              placeholder="e.g., I like to splurge on jackets or shop seasonally."
              placeholderTextColor={colors.surface}
              value={notes}
              onChangeText={updateNotes}
              multiline
              style={[
                styles.input,
                {
                  borderColor: theme.colors.inputBorder,
                  color: colors.foreground,
                },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

///////////////

// // screens/ShoppingHabitsScreen.tsx
// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
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

// const STORAGE_KEY = 'shoppingHabits';

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
//   const {updateProfile} = useStyleProfile(userId);

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
//       backgroundColor: theme.colors.background,
//     },
//   });

//   useEffect(() => {
//     const load = async () => {
//       const saved = await AsyncStorage.getItem(STORAGE_KEY);
//       if (saved) {
//         const parsed = JSON.parse(saved);
//         setSelected(parsed.habits || []);
//         setNotes(parsed.notes || '');
//       }
//     };
//     load();
//   }, []);

//   const toggleHabit = async (habit: string) => {
//     const updated = selected.includes(habit)
//       ? selected.filter(h => h !== habit)
//       : [...selected, habit];
//     setSelected(updated);
//     await AsyncStorage.setItem(
//       STORAGE_KEY,
//       JSON.stringify({habits: updated, notes}),
//     );
//     updateProfile('shopping_habits', updated);
//   };

//   const updateNotes = async (text: string) => {
//     setNotes(text);
//     await AsyncStorage.setItem(
//       STORAGE_KEY,
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
//         <Text style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//           Select what best describes your shopping behavior:
//         </Text>

//         <View style={globalStyles.styleContainer1}>
//           <View style={globalStyles.pillContainer}>
//             {habits.map(habit => (
//               <Chip
//                 key={habit}
//                 label={habit}
//                 selected={selected.includes(habit)}
//                 onPress={() => toggleHabit(habit)}
//               />
//             ))}
//           </View>
//         </View>

//         <Text style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//           Additional Notes:
//         </Text>

//         <View style={globalStyles.styleContainer1}>
//           <TextInput
//             placeholder="e.g., I like to splurge on jackets or shop seasonally."
//             placeholderTextColor={colors.surface}
//             value={notes}
//             onChangeText={updateNotes}
//             multiline
//             style={[
//               styles.input,
//               {borderColor: theme.colors.inputBorder, color: colors.foreground},
//             ]}
//           />
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

//////////////////

// // screens/ShoppingHabitsScreen.tsx
// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const STORAGE_KEY = 'shoppingHabits';

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
//   const {updateProfile} = useStyleProfile(userId);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     subtitle: {fontSize: 17, marginBottom: 16},
//     input: {
//       borderWidth: 1,
//       borderRadius: 8,
//       paddinHorizontal: 12,
//       paddinVertical: 4,
//       fontSize: 17,
//     },
//   });

//   useEffect(() => {
//     const load = async () => {
//       const saved = await AsyncStorage.getItem(STORAGE_KEY);
//       if (saved) {
//         const parsed = JSON.parse(saved);
//         setSelected(parsed.habits || []);
//         setNotes(parsed.notes || '');
//       }
//     };
//     load();
//   }, []);

//   const toggleHabit = async (habit: string) => {
//     const updated = selected.includes(habit)
//       ? selected.filter(h => h !== habit)
//       : [...selected, habit];
//     setSelected(updated);
//     await AsyncStorage.setItem(
//       STORAGE_KEY,
//       JSON.stringify({habits: updated, notes}),
//     );
//     updateProfile('shopping_habits', updated);
//   };

//   const updateNotes = async (text: string) => {
//     setNotes(text);
//     await AsyncStorage.setItem(
//       STORAGE_KEY,
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

//       <ScrollView style={globalStyles.section}>
//         <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//         <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//           Select what best describes your shopping behavior:
//         </Text>
//         <View style={globalStyles.pillContainer}>
//           {habits.map(habit => (
//             <Chip
//               key={habit}
//               label={habit}
//               selected={selected.includes(habit)}
//               onPress={() => toggleHabit(habit)}
//             />
//           ))}
//         </View>

//         <Text
//           style={[styles.subtitle, {color: colors.foreground, marginTop: 30}]}>
//           Additional Notes:
//         </Text>
//         <TextInput
//           placeholder="e.g., I like to splurge on jackets or shop seasonally."
//           placeholderTextColor={colors.surface}
//           value={notes}
//           onChangeText={updateNotes}
//           multiline
//           style={[
//             styles.input,
//             {color: colors.foreground, borderColor: colors.surface},
//           ]}
//         />
//       </ScrollView>
//     </View>
//   );
// }
