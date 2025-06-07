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

const bodyTypes = [
  'Ectomorph',
  'Mesomorph',
  'Endomorph',
  'Inverted Triangle',
  'Rectangle',
  'Oval',
  'Triangle',
];

export default function BodyTypeScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const [selected, setSelected] = useState<string | null>(null);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    AsyncStorage.getItem('bodyType').then(data => {
      if (data) setSelected(data);
    });
  }, []);

  const handleSelect = async (label: string) => {
    setSelected(label);

    // Optional: store locally
    await AsyncStorage.setItem('bodyType', label);

    // ✅ Update backend
    updateProfile('body_type', label);

    // ✅ Optionally navigate back after selection
    navigate('StyleProfileScreen');
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <BackHeader
        title="Body Type"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: colors.primary}]}>
          Your Body Type
        </Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Pick the body type that most closely resembles your shape:
        </Text>
        <View style={styles.chipGroup}>
          {bodyTypes.map(type => (
            <Chip
              key={type}
              label={type}
              selected={selected === type}
              onPress={() => handleSelect(type)}
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
    gap: 10,
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

// const bodyTypes = [
//   'Ectomorph',
//   'Mesomorph',
//   'Endomorph',
//   'Inverted Triangle',
//   'Rectangle',
//   'Oval',
//   'Triangle',
// ];

// export default function BodyTypeScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const [selected, setSelected] = useState<string | null>(null);

//   useEffect(() => {
//     AsyncStorage.getItem('bodyType').then(data => {
//       if (data) setSelected(data);
//     });
//   }, []);

//   const handleSelect = async (label: string) => {
//     setSelected(label);
//     await AsyncStorage.setItem('bodyType', label);
//   };

//   return (
//     <View style={[styles.container, {backgroundColor: colors.background}]}>
//       <BackHeader
//         title="Body Type"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView contentContainerStyle={styles.content}>
//         <Text style={[styles.title, {color: colors.primary}]}>
//           Your Body Type
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           Pick the body type that most closely resembles your shape:
//         </Text>
//         <View style={styles.chipGroup}>
//           {bodyTypes.map(type => (
//             <Chip
//               key={type}
//               label={type}
//               selected={selected === type}
//               onPress={() => handleSelect(type)}
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
