// screens/ShoppingHabitsScreen.tsx
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

const STORAGE_KEY = 'shoppingHabits';

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
  const {updateProfile} = useStyleProfile(userId);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    subtitle: {fontSize: 17, marginBottom: 16},
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddinHorizontal: 12,
      paddinVertical: 4,
      fontSize: 17,
    },
  });

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSelected(parsed.habits || []);
        setNotes(parsed.notes || '');
      }
    };
    load();
  }, []);

  const toggleHabit = async (habit: string) => {
    const updated = selected.includes(habit)
      ? selected.filter(h => h !== habit)
      : [...selected, habit];
    setSelected(updated);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({habits: updated, notes}),
    );
    updateProfile('shopping_habits', updated);
  };

  const updateNotes = async (text: string) => {
    setNotes(text);
    await AsyncStorage.setItem(
      STORAGE_KEY,
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
      <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
      <ScrollView style={globalStyles.section}>
        <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
          Select what best describes your shopping behavior:
        </Text>
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

        <Text
          style={[styles.subtitle, {color: colors.foreground, marginTop: 30}]}>
          Additional Notes:
        </Text>
        <TextInput
          placeholder="e.g., I like to splurge on jackets or shop seasonally."
          placeholderTextColor={colors.surface}
          value={notes}
          onChangeText={updateNotes}
          multiline
          style={[
            styles.input,
            {color: colors.foreground, borderColor: colors.surface},
          ]}
        />
      </ScrollView>
    </View>
  );
}

///////////////////

// // screens/ShoppingHabitsScreen.tsx
// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

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
//   const [selected, setSelected] = useState<string[]>([]);
//   const [notes, setNotes] = useState('');

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

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
//     updateProfile('shopping_habits', updated); // sync to DB
//   };

//   const updateNotes = async (text: string) => {
//     setNotes(text);
//     await AsyncStorage.setItem(
//       STORAGE_KEY,
//       JSON.stringify({habits: selected, notes: text}),
//     );
//     updateProfile('lifestyle_notes', text); // sync to DB
//   };

//   return (
//     <View style={styles.container}>
//       <BackHeader
//         title="Style Profile"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView style={{backgroundColor: colors.background, padding: 20}}>
//         <Text style={[styles.title, {color: colors.primary}]}>
//           Shopping Habits
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           Select what best describes your shopping behavior:
//         </Text>
//         <View style={styles.chipGroup}>
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

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   title: {fontSize: 22, fontWeight: '700', marginBottom: 10},
//   subtitle: {fontSize: 16, marginBottom: 16},
//   chipGroup: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
//   input: {
//     marginTop: 8,
//     borderWidth: 1,
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 14,
//     minHeight: 80,
//     textAlignVertical: 'top',
//   },
// });
