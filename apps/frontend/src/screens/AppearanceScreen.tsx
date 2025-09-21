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

const fields: Record<string, string[]> = {
  proportions: [
    'Short Legs',
    'Long Legs',
    'Short Torso',
    'Long Torso',
    'Balanced',
    'Even Proportions',
  ],
};

export default function AppearanceScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  const [selectedValues, setSelectedValues] = useState<{[key: string]: string}>(
    {},
  );

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (!styleProfile) return;

    const initial: {[key: string]: string} = {};
    Object.keys(fields).forEach(field => {
      if (typeof styleProfile[field] === 'string') {
        initial[field] = styleProfile[field];
      }
    });
    setSelectedValues(initial);
  }, [styleProfile]);

  const handleSelect = (field: string, value: string) => {
    // 🔔 buzz on chip selection
    h('impactLight');

    const updated = {...selectedValues, [field]: value};
    setSelectedValues(updated);

    try {
      updateProfile(field, value);
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
        Appearance
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          {/* 🔔 back gets a light tap */}
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
          {Object.entries(fields).map(([field, options]) => (
            <View key={field}>
              <Text
                style={[globalStyles.sectionTitle4, {color: colors.primary}]}>
                {field
                  .replace(/_/g, ' ')
                  .replace(/(^\w|\s\w)/g, t => t.toUpperCase())}
              </Text>
              <View
                style={[
                  globalStyles.styleContainer1,
                  globalStyles.cardStyles3,
                  {borderWidth: tokens.borderWidth.md},
                ]}>
                <View style={globalStyles.pillContainer}>
                  {options.map(option => (
                    <Chip
                      key={option}
                      label={option}
                      selected={selectedValues[field] === option}
                      onPress={() => handleSelect(field, option)}
                    />
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

//////////////

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

// const fields: Record<string, string[]> = {
//   proportions: [
//     'Short Legs',
//     'Long Legs',
//     'Short Torso',
//     'Long Torso',
//     'Balanced',
//     'Even Proportions',
//   ],
// };

// export default function AppearanceScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//   });

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   const [selectedValues, setSelectedValues] = useState<{[key: string]: string}>(
//     {},
//   );

//   // Fetch backend data on mount
//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   // Sync UI state when profile loads
//   useEffect(() => {
//     if (!styleProfile) return;

//     const initial: {[key: string]: string} = {};
//     Object.keys(fields).forEach(field => {
//       if (typeof styleProfile[field] === 'string') {
//         initial[field] = styleProfile[field];
//       }
//     });
//     setSelectedValues(initial);
//   }, [styleProfile]);

//   const handleSelect = (field: string, value: string) => {
//     const updated = {...selectedValues, [field]: value};
//     setSelectedValues(updated);
//     updateProfile(field, value); // <-- directly update backend
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Appearance
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           {Object.entries(fields).map(([field, options]) => (
//             <View key={field}>
//               <Text
//                 style={[globalStyles.sectionTitle4, {color: colors.primary}]}>
//                 {field
//                   .replace(/_/g, ' ')
//                   .replace(/(^\w|\s\w)/g, t => t.toUpperCase())}
//               </Text>
//               <View
//                 style={[
//                   globalStyles.styleContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 <View style={globalStyles.pillContainer}>
//                   {options.map(option => (
//                     <Chip
//                       key={option}
//                       label={option}
//                       selected={selectedValues[field] === option}
//                       onPress={() => handleSelect(field, option)}
//                     />
//                   ))}
//                 </View>
//               </View>
//             </View>
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
