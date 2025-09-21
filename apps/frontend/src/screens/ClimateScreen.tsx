import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = {navigate: (screen: string) => void};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

const climateOptions = [
  'Tropical',
  'Arid',
  'Temperate',
  'Continental',
  'Polar',
];

export default function ClimateScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
  });

  const [selectedClimate, setSelectedClimate] = useState<string | null>(null);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (styleProfile?.climate) setSelectedClimate(styleProfile.climate);
  }, [styleProfile]);

  const handleSelect = (value: string) => {
    h('impactLight');
    setSelectedClimate(value);
    try {
      updateProfile('climate', value);
    } catch {
      h('notificationError');
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
        <View style={globalStyles.section4}>
          <View style={globalStyles.backContainer}>
            <AppleTouchFeedback
              hapticStyle="impactLight"
              onPress={() => navigate('StyleProfileScreen')}>
              <BackHeader
                title=""
                onBack={() => navigate('StyleProfileScreen')}
              />
            </AppleTouchFeedback>
            <Text style={globalStyles.backText}>Back</Text>
          </View>

          <View style={globalStyles.centeredSection}>
            <Text
              style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
              What type of climate do you live in?
            </Text>

            <View
              style={[
                globalStyles.styleContainer1,
                globalStyles.cardStyles3,
                {borderWidth: tokens.borderWidth.md},
              ]}>
              <View style={globalStyles.pillContainer}>
                {climateOptions.map(option => (
                  <Chip
                    key={option}
                    label={option}
                    selected={selectedClimate === option}
                    onPress={() => handleSelect(option)}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

//////////////////

// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

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

// export default function ClimateScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//   });

//   const [selectedClimate, setSelectedClimate] = useState<string | null>(null);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   useEffect(() => {
//     if (styleProfile?.climate) {
//       setSelectedClimate(styleProfile.climate);
//     }
//   }, [styleProfile]);

//   const handleSelect = (value: string) => {
//     setSelectedClimate(value);
//     updateProfile('climate', value);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Climate
//       </Text>

//       <ScrollView>
//         <View style={globalStyles.section4}>
//           <View style={globalStyles.backContainer}>
//             <BackHeader
//               title=""
//               onBack={() => navigate('StyleProfileScreen')}
//             />
//             <Text style={globalStyles.backText}>Back</Text>
//           </View>

//           <View style={globalStyles.centeredSection}>
//             <Text
//               style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//               What type of climate do you live in?
//             </Text>

//             <View
//               style={[
//                 globalStyles.styleContainer1,
//                 globalStyles.cardStyles3,
//                 {borderWidth: tokens.borderWidth.md},
//               ]}>
//               <View style={globalStyles.pillContainer}>
//                 {climateOptions.map(option => (
//                   <Chip
//                     key={option}
//                     label={option}
//                     selected={selectedClimate === option}
//                     onPress={() => handleSelect(option)}
//                   />
//                 ))}
//               </View>
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
