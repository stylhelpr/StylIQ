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

const hairColors = [
  'Black',
  'Brown',
  'Blonde',
  'Red',
  'Gray',
  'White',
  'Dyed - Bold',
  'Dyed - Subtle',
];

export default function HairColorScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const [selected, setSelected] = useState<string | null>(null);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    AsyncStorage.getItem('hairColor').then(data => {
      if (data) setSelected(data);
    });
  }, []);

  const handleSelect = async (label: string) => {
    setSelected(label);
    await AsyncStorage.setItem('hairColor', label);
    updateProfile('hair_color', label);
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <BackHeader
        title="Hair Color"
        onBack={() => navigate('StyleProfileScreen')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: colors.primary}]}>Hair Color</Text>
        <Text style={[styles.subtitle, {color: colors.foreground}]}>
          Select your current natural or styled hair color:
        </Text>
        <View style={styles.chipGroup}>
          {hairColors.map(color => (
            <Chip
              key={color}
              label={color}
              selected={selected === color}
              onPress={() => handleSelect(color)}
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

// const hairColors = [
//   'Black',
//   'Brown',
//   'Blonde',
//   'Red',
//   'Gray',
//   'White',
//   'Dyed - Bold',
//   'Dyed - Subtle',
// ];

// export default function HairColorScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const [selected, setSelected] = useState<string | null>(null);

//   useEffect(() => {
//     AsyncStorage.getItem('hairColor').then(data => {
//       if (data) setSelected(data);
//     });
//   }, []);

//   const handleSelect = async (label: string) => {
//     setSelected(label);
//     await AsyncStorage.setItem('hairColor', label);
//   };

//   return (
//     <View style={[styles.container, {backgroundColor: colors.background}]}>
//       <BackHeader
//         title="Hair Color"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView contentContainerStyle={styles.content}>
//         <Text style={[styles.title, {color: colors.primary}]}>Hair Color</Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           Select your current natural or styled hair color:
//         </Text>
//         <View style={styles.chipGroup}>
//           {hairColors.map(color => (
//             <Chip
//               key={color}
//               label={color}
//               selected={selected === color}
//               onPress={() => handleSelect(color)}
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
