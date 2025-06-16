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

const skinTones = [
  'Fair',
  'Light',
  'Medium',
  'Olive',
  'Tan',
  'Brown',
  'Dark Brown',
  'Deep',
];

export default function SkinToneScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string | null>(null);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    chipGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 4,
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
    AsyncStorage.getItem('skinTone').then(data => {
      if (data) setSelected(data);
    });
  }, []);

  const handleSelect = async (label: string) => {
    setSelected(label);

    // Optional: store locally
    await AsyncStorage.setItem('skinTone', label);

    // ✅ Update backend
    updateProfile('skin_tone', label);

    // ✅ Navigate back
    navigate('StyleProfileScreen');
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Skin Tone
      </Text>

      <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />

      <ScrollView contentContainerStyle={globalStyles.section}>
        <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
          Select the tone that best matches your natural skin:
        </Text>
        <View style={styles.chipGroup}>
          {skinTones.map(tone => (
            <Chip
              key={tone}
              label={tone}
              selected={selected === tone}
              onPress={() => handleSelect(tone)}
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

// const skinTones = [
//   'Fair',
//   'Light',
//   'Medium',
//   'Olive',
//   'Tan',
//   'Brown',
//   'Dark Brown',
//   'Deep',
// ];

// export default function SkinToneScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const [selected, setSelected] = useState<string | null>(null);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     container: {
//       paddingTop: 24,
//       paddingBottom: 60,
//       paddingHorizontal: 16,
//     },
//     section: {
//       marginBottom: 32,
//     },
//     header: {
//       fontSize: 28,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     title: {
//       fontSize: 17,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     sectionTitle: {
//       fontSize: 17,
//       fontWeight: '600',
//       lineHeight: 24,
//       color: theme.colors.foreground,
//       paddingBottom: 12,
//     },
//     subtitle: {
//       fontSize: 17,
//       marginBottom: 20,
//     },
//     chipGroup: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//     },
//   });

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

//   useEffect(() => {
//     AsyncStorage.getItem('skinTone').then(data => {
//       if (data) setSelected(data);
//     });
//   }, []);

//   const handleSelect = async (label: string) => {
//     setSelected(label);

//     // Optional: store locally
//     await AsyncStorage.setItem('skinTone', label);

//     // ✅ Update backend
//     updateProfile('skin_tone', label);

//     // ✅ Navigate back
//     navigate('StyleProfileScreen');
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Text style={[styles.header, {color: theme.colors.primary}]}>
//         Skin Tone
//       </Text>
//       <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//       <ScrollView contentContainerStyle={styles.section}>
//         <Text style={[styles.sectionTitle, {color: colors.foreground}]}>
//           Select the tone that best matches your natural skin:
//         </Text>
//         <View style={styles.chipGroup}>
//           {skinTones.map(tone => (
//             <Chip
//               key={tone}
//               label={tone}
//               selected={selected === tone}
//               onPress={() => handleSelect(tone)}
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
