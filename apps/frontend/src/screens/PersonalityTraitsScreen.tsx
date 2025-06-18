import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
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

const STORAGE_KEY = 'personalityTraits';

const traits = [
  'Confident',
  'Adventurous',
  'Laid-back',
  'Creative',
  'Bold',
  'Minimalist',
  'Playful',
  'Elegant',
  'Edgy',
  'Chill',
];

export default function PersonalityTraitsScreen({navigate}: Props) {
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
    const load = async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) setSelected(JSON.parse(saved));
    };
    load();
  }, []);

  const toggleTrait = async (trait: string) => {
    const updated = selected.includes(trait)
      ? selected.filter(t => t !== trait)
      : [...selected, trait];
    setSelected(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    updateProfile('personality_traits', updated); // sync to DB
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Personality Traits
      </Text>
      <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
      <ScrollView style={globalStyles.section}>
        <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
          Choose traits that reflect how you carry yourself:
        </Text>
        <View style={globalStyles.pillContainer}>
          {traits.map(trait => (
            <Chip
              key={trait}
              label={trait}
              selected={selected.includes(trait)}
              onPress={() => toggleTrait(trait)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const STORAGE_KEY = 'personalityTraits';

// const traits = [
//   'Confident',
//   'Adventurous',
//   'Laid-back',
//   'Creative',
//   'Bold',
//   'Minimalist',
//   'Playful',
//   'Elegant',
//   'Edgy',
//   'Chill',
// ];

// export default function PersonalityTraitsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const [selected, setSelected] = useState<string[]>([]);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

//   useEffect(() => {
//     const load = async () => {
//       const saved = await AsyncStorage.getItem(STORAGE_KEY);
//       if (saved) setSelected(JSON.parse(saved));
//     };
//     load();
//   }, []);

//   const toggleTrait = async (trait: string) => {
//     const updated = selected.includes(trait)
//       ? selected.filter(t => t !== trait)
//       : [...selected, trait];
//     setSelected(updated);
//     await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
//     updateProfile('personality_traits', updated); // sync to DB
//   };

//   return (
//     <View style={styles.container}>
//       <BackHeader
//         title="Style Profile"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView style={{backgroundColor: colors.background, padding: 20}}>
//         <Text style={[styles.title, {color: colors.primary}]}>
//           Personality Traits
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           Choose traits that reflect how you carry yourself:
//         </Text>
//         <View style={styles.chipGroup}>
//           {traits.map(trait => (
//             <Chip
//               key={trait}
//               label={trait}
//               selected={selected.includes(trait)}
//               onPress={() => toggleTrait(trait)}
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   title: {fontSize: 22, fontWeight: '700', marginBottom: 10},
//   subtitle: {fontSize: 16, marginBottom: 20},
//   chipGroup: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
// });
