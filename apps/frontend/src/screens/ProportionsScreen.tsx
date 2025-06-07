import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';

type Props = {
  navigate: (screen: string) => void;
};

const proportions = [
  'Even Proportions',
  'Long Legs, Short Torso',
  'Short Legs, Long Torso',
  'Broad Shoulders',
  'Narrow Shoulders',
  'Wide Hips',
  'Narrow Hips',
];

export default function ProportionsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const [selected, setSelected] = useState<string | null>(null);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    AsyncStorage.getItem('proportions').then(data => {
      if (data) setSelected(data);
    });
  }, []);

  const handleSelect = async (label: string) => {
    setSelected(label);
    await AsyncStorage.setItem('proportions', label);
    updateProfile('proportions', label);
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <BackHeader
        title="Proportions"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Body Proportions
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Describe your proportions for fit-accurate styling:
        </Text>
        <View style={styles.chipGroup}>
          {proportions.map(prop => (
            <Chip
              key={prop}
              label={prop}
              selected={selected === prop}
              onPress={() => handleSelect(prop)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginHorizontal: -5,
  },
});

//////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const proportions = [
//   'Even Proportions',
//   'Long Legs, Short Torso',
//   'Short Legs, Long Torso',
//   'Broad Shoulders',
//   'Narrow Shoulders',
//   'Wide Hips',
//   'Narrow Hips',
// ];

// export default function ProportionsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const [selected, setSelected] = useState<string | null>(null);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//     },
//     content: {
//       padding: 20,
//     },
//     title: {
//       fontSize: 22,
//       fontWeight: '700',
//       marginBottom: 10,
//     },
//     subtitle: {
//       fontSize: 16,
//       marginBottom: 20,
//     },
//     chipGroup: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       marginHorizontal: -5,
//     },
//   });

//   useEffect(() => {
//     AsyncStorage.getItem('proportions').then(data => {
//       if (data) setSelected(data);
//     });
//   }, []);

//   const handleSelect = async (label: string) => {
//     setSelected(label);
//     await AsyncStorage.setItem('proportions', label);
//   };

//   return (
//     <View style={[styles.container, {backgroundColor: colors.background}]}>
//       <BackHeader
//         title="Proportions"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView contentContainerStyle={styles.content}>
//         <Text style={[styles.title, {color: colors.primary}]}>
//           Body Proportions
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           Describe your proportions for fit-accurate styling:
//         </Text>
//         <View style={styles.chipGroup}>
//           {proportions.map(prop => (
//             <Chip
//               key={prop}
//               label={prop}
//               selected={selected === prop}
//               onPress={() => handleSelect(prop)}
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
