// screens/UndertoneScreen.tsx
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';

type Props = {
  navigate: (screen: string) => void;
};

const options = ['Warm', 'Cool', 'Neutral', 'Olive'];

export default function UndertoneScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const [selected, setSelected] = useState<string | null>(null);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      paddingTop: 24,
      paddingBottom: 60,
      paddingHorizontal: 16,
    },
    section: {
      marginBottom: 20,
    },
    header: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    chipGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 4,
    },
    subtitle: {fontSize: 17, marginBottom: 20},
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    AsyncStorage.getItem('undertone').then(data => {
      if (data) setSelected(data);
    });
  }, []);

  const handleSelect = async (value: string) => {
    setSelected(value);
    await AsyncStorage.setItem('undertone', value);
    updateProfile('undertone', value);
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text style={[styles.header, {color: theme.colors.primary}]}>
        Undertone
      </Text>
      <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
      <ScrollView contentContainerStyle={styles.section}>
        <Text style={styles.sectionTitle}>What’s your skin’s undertone?</Text>
        <View style={styles.chipGroup}>
          {options.map(option => (
            <Chip
              key={option}
              label={option}
              selected={selected === option}
              onPress={() => handleSelect(option)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

//////////////

// // screens/UndertoneScreen.tsx
// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const options = ['Warm', 'Cool', 'Neutral', 'Olive'];

// export default function UndertoneScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const [selected, setSelected] = useState<string | null>(null);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

//   useEffect(() => {
//     AsyncStorage.getItem('undertone').then(data => {
//       if (data) setSelected(data);
//     });
//   }, []);

//   const handleSelect = async (value: string) => {
//     setSelected(value);
//     await AsyncStorage.setItem('undertone', value);
//     updateProfile('undertone', value);
//   };

//   return (
//     <View style={[styles.container, {backgroundColor: colors.background}]}>
//       <BackHeader
//         title="Undertone"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView contentContainerStyle={styles.content}>
//         <Text style={[styles.title, {color: colors.primary}]}>
//           Skin Undertone
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           What’s your skin’s undertone?
//         </Text>
//         <View style={styles.chipGroup}>
//           {options.map(option => (
//             <Chip
//               key={option}
//               label={option}
//               selected={selected === option}
//               onPress={() => handleSelect(option)}
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
