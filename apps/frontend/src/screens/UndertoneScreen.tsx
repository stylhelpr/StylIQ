import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

const options = ['Warm', 'Cool', 'Neutral', 'Olive'];
const STORAGE_KEY = 'undertone';

export default function UndertoneScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string | null>(null);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    subtitle: {fontSize: 17, marginBottom: 20},
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (styleProfile?.undertone) {
      setSelected(styleProfile.undertone);
    } else {
      AsyncStorage.getItem(STORAGE_KEY).then(data => {
        if (data) setSelected(data);
      });
    }
  }, [styleProfile]);

  const handleSelect = async (value: string) => {
    setSelected(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
    updateProfile('undertone', value);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Undertone
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
          <Text style={globalStyles.backText}>Back</Text>
        </View>

        <Text style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
          What’s your skin’s undertone?
        </Text>

        <View style={globalStyles.styleContainer1}>
          <View style={globalStyles.pillContainer}>
            {options.map(option => (
              <Chip
                key={option}
                label={option}
                selected={selected === option}
                onPress={() => handleSelect(option)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

////////////

// // screens/UndertoneScreen.tsx
// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const options = ['Warm', 'Cool', 'Neutral', 'Olive'];

// export default function UndertoneScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const [selected, setSelected] = useState<string | null>(null);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     subtitle: {fontSize: 17, marginBottom: 20},
//   });

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
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Undertone
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <Text style={globalStyles.sectionTitle4}>
//           What’s your skin’s undertone?
//         </Text>
//         <View style={globalStyles.styleContainer1}>
//           <View style={globalStyles.pillContainer}>
//             {options.map(option => (
//               <Chip
//                 key={option}
//                 label={option}
//                 selected={selected === option}
//                 onPress={() => handleSelect(option)}
//               />
//             ))}
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

//////////////////////

// // screens/UndertoneScreen.tsx
// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const options = ['Warm', 'Cool', 'Neutral', 'Olive'];

// export default function UndertoneScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const [selected, setSelected] = useState<string | null>(null);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     subtitle: {fontSize: 17, marginBottom: 20},
//   });

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
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Undertone
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section}>
//         <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//         <Text style={globalStyles.sectionTitle}>
//           What’s your skin’s undertone?
//         </Text>
//         <View style={globalStyles.pillContainer}>
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
