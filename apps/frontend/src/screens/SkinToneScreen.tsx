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

      <ScrollView contentContainerStyle={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
          <Text style={globalStyles.backText}>Back</Text>
        </View>
        <Text style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
          Select the tone that best matches your natural skin:
        </Text>

        <View style={globalStyles.styleContainer1}>
          <View style={globalStyles.pillContainer}>
            {skinTones.map(tone => (
              <Chip
                key={tone}
                label={tone}
                selected={selected === tone}
                onPress={() => handleSelect(tone)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

//////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

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
//   const globalStyles = useGlobalStyles();
//   const [selected, setSelected] = useState<string | null>(null);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     subtitle: {
//       fontSize: 17,
//       marginBottom: 20,
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
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Skin Tone
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section}>
//         <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//         <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//           Select the tone that best matches your natural skin:
//         </Text>
//         <View style={globalStyles.pillContainer}>
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
