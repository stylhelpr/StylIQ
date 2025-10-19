import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, ScrollView, StyleSheet} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {Chip} from '../components/Chip/Chip';
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

export default function FashionGoalsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const [goals, setGoals] = useState('');
  const [confidence, setConfidence] = useState('');
  const [boldness, setBoldness] = useState('');

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    if (!styleProfile) return;
    if (styleProfile.goals) setGoals(styleProfile.goals);
    if (styleProfile.fashion_confidence)
      setConfidence(styleProfile.fashion_confidence);
    if (styleProfile.fashion_boldness)
      setBoldness(styleProfile.fashion_boldness);
  }, [styleProfile]);

  // ✅ Commit text field to DB when editing finishes
  const commitGoals = () => {
    try {
      updateProfile('goals', goals);
    } catch {
      h('notificationError');
    }
  };

  // ✅ Immediate update only for chips (they’re single clicks)
  const handleSet = (
    key: 'fashion_confidence' | 'fashion_boldness',
    value: string,
  ) => {
    h('impactLight');
    if (key === 'fashion_confidence') setConfidence(value);
    if (key === 'fashion_boldness') setBoldness(value);

    try {
      updateProfile(key, value);
    } catch {
      h('notificationError');
    }
  };

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    input: {
      borderWidth: tokens.borderWidth.hairline,
      borderRadius: tokens.borderRadius.md,
      padding: 10,
      marginBottom: 15,
      fontSize: 17,
      backgroundColor: theme.colors.input2,
      color: theme.colors.foreground,
    },
  });

  return (
    <ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Fashion Goals
      </Text>

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
          <Text style={globalStyles.sectionTitle4}>
            What are your style goals?
          </Text>
          <View
            style={[
              globalStyles.styleContainer1,
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <TextInput
              style={[styles.input, {borderColor: theme.colors.inputBorder}]}
              value={goals}
              onChangeText={setGoals} // ✅ local state only
              onBlur={commitGoals} // ✅ commit once editing done
              onSubmitEditing={commitGoals}
              placeholder="E.g., Upgrade wardrobe, try new looks"
              placeholderTextColor={colors.muted}
              multiline
            />
          </View>

          <Text style={globalStyles.sectionTitle4}>
            How confident do you feel in your style?
          </Text>
          <View
            style={[
              globalStyles.styleContainer1,
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {['Very confident', 'Somewhat', 'Need help'].map(option => (
                <Chip
                  key={option}
                  label={option}
                  selected={confidence === option}
                  onPress={() => handleSet('fashion_confidence', option)}
                />
              ))}
            </View>
          </View>

          <Text style={globalStyles.sectionTitle4}>
            Do you prefer bold or subtle looks?
          </Text>
          <View
            style={[
              globalStyles.styleContainer1,
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {[
                'Bold standout pieces',
                'Neutral and subtle',
                'Mix of both',
              ].map(option => (
                <Chip
                  key={option}
                  label={option}
                  selected={boldness === option}
                  onPress={() => handleSet('fashion_boldness', option)}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/////////////////

// import React, {useState, useEffect} from 'react';
// import {View, Text, TextInput, ScrollView, StyleSheet} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Props = {navigate: (screen: string) => void};

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function FashionGoalsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const [goals, setGoals] = useState('');
//   const [confidence, setConfidence] = useState('');
//   const [boldness, setBoldness] = useState('');

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   useEffect(() => {
//     if (!styleProfile) return;
//     if (styleProfile.goals) setGoals(styleProfile.goals);
//     if (styleProfile.fashion_confidence)
//       setConfidence(styleProfile.fashion_confidence);
//     if (styleProfile.fashion_boldness)
//       setBoldness(styleProfile.fashion_boldness);
//   }, [styleProfile]);

//   const handleSet = (
//     key: 'goals' | 'fashion_confidence' | 'fashion_boldness',
//     value: string,
//   ) => {
//     if (key !== 'goals') h('impactLight');

//     if (key === 'goals') setGoals(value);
//     else if (key === 'fashion_confidence') setConfidence(value);
//     else if (key === 'fashion_boldness') setBoldness(value);

//     try {
//       updateProfile(key, value);
//     } catch {
//       h('notificationError');
//     }
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     input: {
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 15,
//       fontSize: 17,
//       backgroundColor: theme.colors.input2,
//       color: theme.colors.foreground,
//     },
//   });

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Fashion Goals
//       </Text>

//       <View style={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={() => navigate('StyleProfileScreen')}>
//             <BackHeader
//               title=""
//               onBack={() => navigate('StyleProfileScreen')}
//             />
//           </AppleTouchFeedback>
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text style={globalStyles.sectionTitle4}>
//             What are your style goals?
//           </Text>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <TextInput
//               style={[styles.input, {borderColor: theme.colors.inputBorder}]}
//               value={goals}
//               onChangeText={text => handleSet('goals', text)}
//               placeholder="E.g., Upgrade wardrobe, try new looks"
//               placeholderTextColor={colors.muted}
//             />
//           </View>

//           <Text style={globalStyles.sectionTitle4}>
//             How confident do you feel in your style?
//           </Text>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {['Very confident', 'Somewhat', 'Need help'].map(option => (
//                 <Chip
//                   key={option}
//                   label={option}
//                   selected={confidence === option}
//                   onPress={() => handleSet('fashion_confidence', option)}
//                 />
//               ))}
//             </View>
//           </View>

//           <Text style={globalStyles.sectionTitle4}>
//             Do you prefer bold or subtle looks?
//           </Text>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {[
//                 'Bold standout pieces',
//                 'Neutral and subtle',
//                 'Mix of both',
//               ].map(option => (
//                 <Chip
//                   key={option}
//                   label={option}
//                   selected={boldness === option}
//                   onPress={() => handleSet('fashion_boldness', option)}
//                 />
//               ))}
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

////////////////

// import React, {useState, useEffect} from 'react';
// import {View, Text, TextInput, ScrollView, StyleSheet} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {Chip} from '../components/Chip/Chip';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Props = {navigate: (screen: string) => void};

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function FashionGoalsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const [goals, setGoals] = useState('');
//   const [confidence, setConfidence] = useState('');
//   const [boldness, setBoldness] = useState('');

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   useEffect(() => {
//     if (userId) refetch();
//   }, [userId, refetch]);

//   useEffect(() => {
//     if (!styleProfile) return;
//     if (styleProfile.goals) setGoals(styleProfile.goals);
//     if (styleProfile.fashion_confidence)
//       setConfidence(styleProfile.fashion_confidence);
//     if (styleProfile.fashion_boldness)
//       setBoldness(styleProfile.fashion_boldness);
//   }, [styleProfile]);

//   const handleSet = (
//     key: 'goals' | 'fashion_confidence' | 'fashion_boldness',
//     value: string,
//   ) => {
//     // chips only: buzz
//     if (key !== 'goals') h('impactLight');

//     if (key === 'goals') setGoals(value);
//     else if (key === 'fashion_confidence') setConfidence(value);
//     else if (key === 'fashion_boldness') setBoldness(value);

//     try {
//       updateProfile(key, value);
//     } catch {
//       h('notificationError');
//     }
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     input: {
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: tokens.borderRadius.md,
//       padding: 10,
//       marginBottom: 15,
//       fontSize: 17,
//       backgroundColor: theme.colors.input2,
//       color: theme.colors.foreground,
//     },
//   });

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Fashion Goals
//       </Text>

//       <View className={''} style={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           {/* back = light tap */}
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={() => navigate('StyleProfileScreen')}>
//             <BackHeader
//               title=""
//               onBack={() => navigate('StyleProfileScreen')}
//             />
//           </AppleTouchFeedback>
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <Text style={globalStyles.sectionTitle4}>
//             What are your style goals?
//           </Text>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <TextInput
//               style={[styles.input, {borderColor: theme.colors.inputBorder}]}
//               value={goals}
//               onChangeText={text => handleSet('goals', text)} // no haptic for text input
//               placeholder="E.g., Upgrade wardrobe, try new looks"
//               placeholderTextColor={colors.muted}
//             />
//           </View>

//           <Text style={globalStyles.sectionTitle4}>
//             How confident do you feel in your style?
//           </Text>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {['Very confident', 'Somewhat', 'Need help'].map(option => (
//                 <Chip
//                   key={option}
//                   label={option}
//                   selected={confidence === option}
//                   onPress={() => handleSet('fashion_confidence', option)}
//                 />
//               ))}
//             </View>
//           </View>

//           <Text style={globalStyles.sectionTitle4}>
//             Do you prefer bold or subtle looks?
//           </Text>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {[
//                 'Bold standout pieces',
//                 'Neutral and subtle',
//                 'Mix of both',
//               ].map(option => (
//                 <Chip
//                   key={option}
//                   label={option}
//                   selected={boldness === option}
//                   onPress={() => handleSet('fashion_boldness', option)}
//                 />
//               ))}
//             </View>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }
