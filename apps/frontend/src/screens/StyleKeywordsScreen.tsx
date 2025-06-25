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

const STORAGE_KEY = 'style_keywords';

const options = ['Classic', 'Edgy', 'Artsy', 'Elegant', 'Boho'];

export default function StyleKeywordsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const [selected, setSelected] = useState<string[]>([]);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

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

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (styleProfile?.style_keywords?.length > 0) {
      setSelected(styleProfile.style_keywords);
    } else {
      AsyncStorage.getItem(STORAGE_KEY).then(data => {
        if (data) setSelected(JSON.parse(data));
      });
    }
  }, [styleProfile]);

  const toggleKeyword = async (keyword: string) => {
    const updated = selected.includes(keyword)
      ? selected.filter(k => k !== keyword)
      : [...selected, keyword];
    setSelected(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    updateProfile('style_keywords', updated);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Style Keywords
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
          <Text style={globalStyles.backText}>Back</Text>
        </View>

        <Text style={[globalStyles.sectionTitle4]}>
          Pick words that describe your overall style:
        </Text>

        <View style={globalStyles.centeredSection}>
          <View style={globalStyles.styleContainer1}>
            <View style={globalStyles.pillContainer}>
              {options.map(option => (
                <Chip
                  key={option}
                  label={option}
                  selected={selected.includes(option)}
                  onPress={() => toggleKeyword(option)}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

///////////////

// // screens/StyleKeywordsScreen.tsx
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

// const options = ['Classic', 'Edgy', 'Artsy', 'Elegant', 'Boho'];

// export default function StyleKeywordsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const [selected, setSelected] = useState<string[]>([]);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

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

//   useEffect(() => {
//     AsyncStorage.getItem('style_keywords').then(data => {
//       if (data) setSelected(JSON.parse(data));
//     });
//   }, []);

//   const toggleKeyword = async (keyword: string) => {
//     const updated = selected.includes(keyword)
//       ? selected.filter(k => k !== keyword)
//       : [...selected, keyword];
//     setSelected(updated);
//     await AsyncStorage.setItem('style_keywords', JSON.stringify(updated));
//     updateProfile('style_keywords', updated);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Style Keywords
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>
//         <Text style={[globalStyles.sectionTitle4]}>
//           Pick words that describe your overall style:
//         </Text>

//         <View style={globalStyles.styleContainer1}>
//           <View style={globalStyles.pillContainer}>
//             {options.map(option => (
//               <Chip
//                 key={option}
//                 label={option}
//                 selected={selected.includes(option)}
//                 onPress={() => toggleKeyword(option)}
//               />
//             ))}
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

////////////////

// // screens/StyleKeywordsScreen.tsx
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

// const options = ['Classic', 'Edgy', 'Artsy', 'Elegant', 'Boho'];

// export default function StyleKeywordsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const [selected, setSelected] = useState<string[]>([]);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

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

//   useEffect(() => {
//     AsyncStorage.getItem('style_keywords').then(data => {
//       if (data) setSelected(JSON.parse(data));
//     });
//   }, []);

//   const toggleKeyword = async (keyword: string) => {
//     const updated = selected.includes(keyword)
//       ? selected.filter(k => k !== keyword)
//       : [...selected, keyword];
//     setSelected(updated);
//     await AsyncStorage.setItem('style_keywords', JSON.stringify(updated));
//     updateProfile('style_keywords', updated);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Style Keywords
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section}>
//         <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//         <Text style={[globalStyles.sectionTitle]}>
//           Pick words that describe your overall style:
//         </Text>
//         <View style={globalStyles.pillContainer}>
//           {options.map(option => (
//             <Chip
//               key={option}
//               label={option}
//               selected={selected.includes(option)}
//               onPress={() => toggleKeyword(option)}
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
