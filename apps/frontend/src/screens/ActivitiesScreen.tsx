import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

const activityOptions = [
  'Work from Home',
  'Office Job',
  'Meetings & Networking',
  'Outdoor Work',
  'Gym & Fitness',
  'Traveling',
  'Events & Socials',
  'Creative Work',
  'Errands & Leisure',
];

export default function ActivitiesScreen({navigate}: Props) {
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
      marginBottom: 15,
    },
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('activities');
      if (saved) setSelected(JSON.parse(saved));
    };
    load();
  }, []);

  const toggleActivity = async (activity: string) => {
    const updated = selected.includes(activity)
      ? selected.filter(a => a !== activity)
      : [...selected, activity];
    setSelected(updated);
    await AsyncStorage.setItem('activities', JSON.stringify(updated));
    updateProfile('weekly_activities', updated); // sync to DB
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Activities
      </Text>
      <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
      <ScrollView contentContainerStyle={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>
          What do you usually do during the week?
        </Text>
        <View style={globalStyles.pillContainer}>
          {activityOptions.map(option => (
            <Chip
              key={option}
              label={option}
              selected={selected.includes(option)}
              onPress={() => toggleActivity(option)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

///////////

// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const activityOptions = [
//   'Work from Home',
//   'Office Job',
//   'Meetings & Networking',
//   'Outdoor Work',
//   'Gym & Fitness',
//   'Traveling',
//   'Events & Socials',
//   'Creative Work',
//   'Errands & Leisure',
// ];

// export default function ActivitiesScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const [selected, setSelected] = useState<string[]>([]);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

//   useEffect(() => {
//     const load = async () => {
//       const saved = await AsyncStorage.getItem('activities');
//       if (saved) setSelected(JSON.parse(saved));
//     };
//     load();
//   }, []);

//   const toggleActivity = async (activity: string) => {
//     const updated = selected.includes(activity)
//       ? selected.filter(a => a !== activity)
//       : [...selected, activity];
//     setSelected(updated);
//     await AsyncStorage.setItem('activities', JSON.stringify(updated));
//     updateProfile('weekly_activities', updated); // sync to DB
//   };

//   return (
//     <View style={styles.container}>
//       <BackHeader
//         title="Lifestyle Activities"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView
//         contentContainerStyle={styles.content}
//         style={{backgroundColor: colors.background}}>
//         <Text style={[styles.title, {color: colors.primary}]}>
//           Daily Activities
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           What do you usually do during the week?
//         </Text>
//         <View style={styles.chipGroup}>
//           {activityOptions.map(option => (
//             <Chip
//               key={option}
//               label={option}
//               selected={selected.includes(option)}
//               onPress={() => toggleActivity(option)}
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
