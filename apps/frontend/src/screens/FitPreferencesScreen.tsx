import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

const options = [
  'Slim Fit',
  'Relaxed Fit',
  'Tailored',
  'Boxy',
  'Skinny',
  'Oversized',
];

export default function FitPreferencesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string[]>([]);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    subtitle: {
      fontSize: 17,
      marginBottom: 20,
    },
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    const loadData = async () => {
      const data = await AsyncStorage.getItem('fitPreferences');
      if (data) setSelected(JSON.parse(data));
    };
    loadData();
  }, []);

  const toggleSelection = async (label: string) => {
    const updated = selected.includes(label)
      ? selected.filter(item => item !== label)
      : [...selected, label];
    setSelected(updated);
    await AsyncStorage.setItem('fitPreferences', JSON.stringify(updated));
    updateProfile('fit_preferences', updated);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Fit Preferences
      </Text>
      <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
      <ScrollView contentContainerStyle={globalStyles.section}>
        <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
          Choose your most comfortable and flattering fits:
        </Text>
        <View style={globalStyles.pillContainer}>
          {options.map(option => (
            <Chip
              key={option}
              label={option}
              selected={selected.includes(option)}
              onPress={() => toggleSelection(option)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

///////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const options = [
//   'Slim Fit',
//   'Relaxed Fit',
//   'Tailored',
//   'Boxy',
//   'Skinny',
//   'Oversized',
// ];

// export default function FitPreferencesScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const [selected, setSelected] = useState<string[]>([]);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

//   useEffect(() => {
//     const loadData = async () => {
//       const data = await AsyncStorage.getItem('fitPreferences');
//       if (data) setSelected(JSON.parse(data));
//     };
//     loadData();
//   }, []);

//   const toggleSelection = async (label: string) => {
//     const updated = selected.includes(label)
//       ? selected.filter(item => item !== label)
//       : [...selected, label];
//     setSelected(updated);
//     await AsyncStorage.setItem('fitPreferences', JSON.stringify(updated));
//     updateProfile('fit_preferences', updated);
//   };

//   return (
//     <View style={[styles.container, {backgroundColor: colors.background}]}>
//       <BackHeader
//         title="Fit Preferences"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView contentContainerStyle={styles.content}>
//         <Text style={[styles.title, {color: colors.primary}]}>
//           Preferred Fits
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           Choose your most comfortable and flattering fits:
//         </Text>
//         <View style={styles.chipGroup}>
//           {options.map(option => (
//             <Chip
//               key={option}
//               label={option}
//               selected={selected.includes(option)}
//               onPress={() => toggleSelection(option)}
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   content: {
//     padding: 20,
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: '700',
//     marginBottom: 10,
//   },
//   subtitle: {
//     fontSize: 16,
//     marginBottom: 20,
//   },
//   chipGroup: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//   },
// });
