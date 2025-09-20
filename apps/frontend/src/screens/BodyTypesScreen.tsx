import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

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
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (styleProfile?.body_type) {
      setSelected(styleProfile.body_type);
    }
  }, [styleProfile]);

  const handleSelect = (label: string) => {
    setSelected(label);
    updateProfile('body_type', label);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Body Type
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
          <Text style={globalStyles.backText}>Back</Text>
        </View>

        <View style={globalStyles.centeredSection}>
          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Pick the body type that most closely resembles your shape:
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {bodyTypes.map(type => (
                <Chip
                  key={type}
                  label={type}
                  selected={selected === type}
                  onPress={() => handleSelect(type)}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

//////////////

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
//     AsyncStorage.getItem('bodyType').then(data => {
//       if (data) setSelected(data);
//     });
//   }, []);

//   const handleSelect = async (label: string) => {
//     setSelected(label);

//     // Optional: store locally
//     await AsyncStorage.setItem('bodyType', label);

//     // ✅ Update backend
//     updateProfile('body_type', label);

//     // ✅ Optionally navigate back after selection
//     navigate('StyleProfileScreen');
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Body Type
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>
//         <Text style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//           Pick the body type that most closely resembles your shape:
//         </Text>
//         <View style={globalStyles.styleContainer1}>
//           <View style={globalStyles.pillContainer}>
//             {bodyTypes.map(type => (
//               <Chip
//                 key={type}
//                 label={type}
//                 selected={selected === type}
//                 onPress={() => handleSelect(type)}
//               />
//             ))}
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

///////////

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
//     AsyncStorage.getItem('bodyType').then(data => {
//       if (data) setSelected(data);
//     });
//   }, []);

//   const handleSelect = async (label: string) => {
//     setSelected(label);

//     // Optional: store locally
//     await AsyncStorage.setItem('bodyType', label);

//     // ✅ Update backend
//     updateProfile('body_type', label);

//     // ✅ Optionally navigate back after selection
//     navigate('StyleProfileScreen');
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Body Type
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section}>
//         <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//         <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//           Pick the body type that most closely resembles your shape:
//         </Text>
//         <View style={globalStyles.pillContainer}>
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
