import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

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
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Climate
      </Text>

      <ScrollView>
        <View style={globalStyles.section}>
          <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
          <Text style={[styles.subtitle, {color: colors.foreground}]}>
            What type of climate do you live in?
          </Text>
          <View style={globalStyles.pillContainer}>
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

        <View style={globalStyles.section}>
          <Text style={globalStyles.sectionTitle}>Travel Frequency</Text>
          <Text style={[styles.subtitle, {color: colors.foreground}]}>
            How often do you travel to different climates?
          </Text>
          <View style={globalStyles.pillContainer}>
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
