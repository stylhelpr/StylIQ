import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';

type Props = {
  navigate: (screen: string) => void;
};

const climateOptions = [
  'Tropical',
  'Arid',
  'Temperate',
  'Continental',
  'Polar',
];

const travelOptions = ['Rarely', 'Sometimes', 'Often', 'Always'];

export default function ClimateScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;

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
    subtitle: {
      fontSize: 16,
      marginBottom: 15,
      fontWeight: '400',
    },
  });

  const [selectedClimate, setSelectedClimate] = useState<string | null>(null);
  const [selectedTravel, setSelectedTravel] = useState<string | null>(null);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    const loadData = async () => {
      const c = await AsyncStorage.getItem('climate');
      const t = await AsyncStorage.getItem('travel');
      if (c) setSelectedClimate(c);
      if (t) setSelectedTravel(t);
    };
    loadData();
  }, []);

  const handleSelect = async (type: 'climate' | 'travel', value: string) => {
    if (type === 'climate') {
      setSelectedClimate(value);
      await AsyncStorage.setItem('climate', value);
      updateProfile('climate', value);
    } else {
      setSelectedTravel(value);
      await AsyncStorage.setItem('travel', value);
      updateProfile('travel_frequency', value);
    }
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text style={[styles.header, {color: theme.colors.primary}]}>
        Climate
      </Text>

      <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />

      <ScrollView>
        <View style={styles.section}>
          <Text style={[styles.subtitle, {color: colors.foreground}]}>
            What type of climate do you live in?
          </Text>
          <View style={styles.chipGroup}>
            {climateOptions.map(option => (
              <Chip
                key={option}
                label={option}
                selected={selectedClimate === option}
                onPress={() => handleSelect('climate', option)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travel Frequency</Text>
          <Text style={[styles.subtitle, {color: colors.foreground}]}>
            How often do you travel to different climates?
          </Text>
          <View style={styles.chipGroup}>
            {travelOptions.map(option => (
              <Chip
                key={option}
                label={option}
                selected={selectedTravel === option}
                onPress={() => handleSelect('travel', option)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

//////////////

// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const climateOptions = [
//   'Tropical',
//   'Arid',
//   'Temperate',
//   'Continental',
//   'Polar',
// ];

// const travelOptions = ['Rarely', 'Sometimes', 'Often', 'Always'];

// export default function ClimateScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;

//   const [selectedClimate, setSelectedClimate] = useState<string | null>(null);
//   const [selectedTravel, setSelectedTravel] = useState<string | null>(null);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

//   useEffect(() => {
//     const loadData = async () => {
//       const c = await AsyncStorage.getItem('climate');
//       const t = await AsyncStorage.getItem('travel');
//       if (c) setSelectedClimate(c);
//       if (t) setSelectedTravel(t);
//     };
//     loadData();
//   }, []);

//   const handleSelect = async (type: 'climate' | 'travel', value: string) => {
//     if (type === 'climate') {
//       setSelectedClimate(value);
//       await AsyncStorage.setItem('climate', value);
//       updateProfile('climate', value);
//     } else {
//       setSelectedTravel(value);
//       await AsyncStorage.setItem('travel', value);
//       updateProfile('travel_frequency', value);
//     }

//     // Optional: auto-navigate back after both selected
//     // if (selectedClimate && selectedTravel) navigate('StyleProfileScreen');
//   };

//   return (
//     <View style={[styles.container, {backgroundColor: colors.background}]}>
//       <BackHeader
//         title="Climate & Travel"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView contentContainerStyle={styles.content}>
//         <Text style={[styles.title, {color: colors.primary}]}>Climate</Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           What type of climate do you live in?
//         </Text>
//         <View style={styles.chipGroup}>
//           {climateOptions.map(option => (
//             <Chip
//               key={option}
//               label={option}
//               selected={selectedClimate === option}
//               onPress={() => handleSelect('climate', option)}
//             />
//           ))}
//         </View>

//         <Text style={[styles.title, {color: colors.primary, marginTop: 32}]}>
//           Travel Frequency
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           How often do you travel to different climates?
//         </Text>
//         <View style={styles.chipGroup}>
//           {travelOptions.map(option => (
//             <Chip
//               key={option}
//               label={option}
//               selected={selectedTravel === option}
//               onPress={() => handleSelect('travel', option)}
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
//     fontSize: 20,
//     fontWeight: '700',
//     marginBottom: 10,
//   },
//   subtitle: {
//     fontSize: 16,
//     marginBottom: 15,
//   },
//   chipGroup: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//   },
// });
