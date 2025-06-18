import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

const COLOR_KEY = 'style.colorPreferences';

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

type Props = {
  navigate: (screen: string) => void;
};

export default function ColorPreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string[]>([]);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    subtitle: {fontSize: 16, marginBottom: 20},
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    AsyncStorage.getItem(COLOR_KEY).then(data => {
      if (data) setSelected(JSON.parse(data));
    });
  }, []);

  const toggleColor = async (color: string) => {
    const updated = selected.includes(color)
      ? selected.filter(c => c !== color)
      : [...selected, color];
    setSelected(updated);
    await AsyncStorage.setItem(COLOR_KEY, JSON.stringify(updated));
    updateProfile('color_preferences', updated); // sync to DB
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

      <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />

      <ScrollView contentContainerStyle={globalStyles.section}>
        <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
          Choose colors you like wearing:
        </Text>
        <View style={globalStyles.pillContainer}>
          {COLORS.map(color => (
            <Chip
              key={color}
              label={color}
              onPress={() => toggleColor(color)}
              selected={selected.includes(color)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

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
//   const [selected, setSelected] = useState<string[]>([]);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

//   useEffect(() => {
//     AsyncStorage.getItem(COLOR_KEY).then(data => {
//       if (data) setSelected(JSON.parse(data));
//     });
//   }, []);

//   const toggleColor = async (color: string) => {
//     const updated = selected.includes(color)
//       ? selected.filter(c => c !== color)
//       : [...selected, color];
//     setSelected(updated);
//     await AsyncStorage.setItem(COLOR_KEY, JSON.stringify(updated));
//     updateProfile('color_preferences', updated); // sync to DB
//   };

//   return (
//     <View style={[styles.container, {backgroundColor: colors.background}]}>
//       <BackHeader
//         title="Color Preferences"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView contentContainerStyle={styles.content}>
//         <Text style={[styles.title, {color: colors.primary}]}>
//           Preferred Colors
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           Choose colors you like wearing:
//         </Text>
//         <View style={styles.chipGroup}>
//           {COLORS.map(color => (
//             <Chip
//               key={color}
//               label={color}
//               onPress={() => toggleColor(color)}
//               selected={selected.includes(color)}
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   content: {padding: 20},
//   title: {fontSize: 22, fontWeight: '700', marginBottom: 10},
//   subtitle: {fontSize: 16, marginBottom: 20},
//   chipGroup: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
// });
