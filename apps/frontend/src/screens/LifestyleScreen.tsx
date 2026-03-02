import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {
  navigate: (screen: string) => void;
};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

const categories: Record<string, string[]> = {
  daily_activities: ['Work', 'Gym', 'Outdoor', 'Travel', 'Relaxing', 'Events'],
};

const COVERAGE_OPTIONS = [
  'No midriff exposure',
  'Shoulders covered',
  'Knees covered',
  'No deep neckline',
  'Full arm coverage',
  'No sheer fabrics',
];

export default function LifestyleScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontSize: 17,
      backgroundColor: theme.colors.input2,
      marginBottom: 12,
    },
  });

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  const [selected, setSelected] = useState<{[key: string]: string[]}>({});
  const [dislikes, setDislikes] = useState('');

  // coverage_no_go state
  const [coverageSelected, setCoverageSelected] = useState<string[]>([]);
  const [customCoverage, setCustomCoverage] = useState<string[]>([]);
  const [newCoverage, setNewCoverage] = useState('');

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!styleProfile) return;

    const initial: {[key: string]: string[]} = {};
    Object.keys(categories).forEach(key => {
      if (Array.isArray(styleProfile[key])) {
        initial[key] = styleProfile[key];
      }
    });

    setSelected(initial);
    setDislikes(styleProfile.disliked_styles || '');

    // coverage_no_go hydration
    if (Array.isArray(styleProfile.coverage_no_go)) {
      setCoverageSelected(styleProfile.coverage_no_go);
      const customOnly = styleProfile.coverage_no_go.filter(
        (c: string) =>
          !COVERAGE_OPTIONS.map(x => x.toLowerCase()).includes(c.toLowerCase()),
      );
      setCustomCoverage(prev => Array.from(new Set([...prev, ...customOnly])));
    }
  }, [styleProfile]);

  const toggleSelect = (category: string, value: string) => {
    // 🔔 haptic on chip press
    h('impactLight');

    const existing = selected[category] || [];
    const updated = existing.includes(value)
      ? existing.filter(v => v !== value)
      : [...existing, value];

    const newState = {...selected, [category]: updated};
    setSelected(newState);

    try {
      updateProfile(category, updated);
    } catch {
      h('notificationError');
    }
  };

  // ✅ Update local state as user types (fast, smooth)
  const handleDislikesChange = (text: string) => {
    setDislikes(text);
  };

  // ✅ Push to DB only when editing finishes
  const commitDislikes = () => {
    try {
      updateProfile('disliked_styles', dislikes);
    } catch {
      h('notificationError');
    }
  };

  const toggleCoverage = (value: string) => {
    h('impactLight');
    const updated = coverageSelected.includes(value)
      ? coverageSelected.filter(v => v !== value)
      : [...coverageSelected, value];
    setCoverageSelected(updated);
    try {
      updateProfile('coverage_no_go', updated);
    } catch {
      h('notificationError');
    }
  };

  const handleAddCoverage = () => {
    const trimmed = newCoverage.trim();
    if (!trimmed) return;
    const all = [...COVERAGE_OPTIONS, ...customCoverage];
    if (all.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setNewCoverage('');
      return;
    }
    const updatedCustom = [...customCoverage, trimmed];
    const updatedSelected = [...coverageSelected, trimmed];
    setCustomCoverage(updatedCustom);
    setCoverageSelected(updatedSelected);
    try {
      updateProfile('coverage_no_go', updatedSelected);
      setNewCoverage('');
      h('impactLight');
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
      <View
        style={{
          height: insets.top + 60, // ⬅️ 56 is about the old navbar height
          backgroundColor: theme.colors.background, // same tone as old nav
        }}
      />
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Lifestyle
      </Text>

      <ScrollView
        contentContainerStyle={[globalStyles.section4, {paddingBottom: 400}]}
        showsVerticalScrollIndicator={false}>
        <View style={globalStyles.backContainer}>
          {/* 🔔 back = light tap */}
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
          {Object.entries(categories).map(([category, options]) => (
            <View key={category}>
              <Text
                style={[globalStyles.sectionTitle4, {color: colors.primary}]}>
                {category
                  .replace(/_/g, ' ')
                  .replace(/(^\w|\s\w)/g, t => t.toUpperCase())}
              </Text>
              <View
                style={[
                  globalStyles.styleContainer1,

                  {borderWidth: tokens.borderWidth.md},
                ]}>
                <View style={globalStyles.pillContainer}>
                  {options.map(opt => (
                    <Chip
                      key={opt}
                      label={opt}
                      selected={selected[category]?.includes(opt)}
                      onPress={() => toggleSelect(category, opt)}
                    />
                  ))}
                </View>
              </View>
            </View>
          ))}

          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Clothing Dislikes (If any)
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <TextInput
              placeholder="Ex: I hate turtlenecks and pleats"
              placeholderTextColor={colors.muted}
              value={dislikes}
              onChangeText={handleDislikesChange} // ✅ local state only
              onBlur={commitDislikes} // ✅ commit when done
              onSubmitEditing={commitDislikes} // ✅ commit on submit too
              style={[
                styles.input,
                {
                  borderColor: theme.colors.inputBorder,
                  color: theme.colors.foreground,
                  borderWidth: tokens.borderWidth.hairline,
                },
              ]}
              multiline
            />
          </View>

          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Coverage hard limits (the AI will never violate these):
          </Text>

          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md, paddingBottom: 20},
            ]}>
            <View style={globalStyles.pillContainer}>
              {[...COVERAGE_OPTIONS, ...customCoverage].map(opt => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={coverageSelected.includes(opt)}
                  onPress={() => toggleCoverage(opt)}
                />
              ))}
            </View>

            <TextInput
              placeholder="Add a custom coverage rule"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.inputBorder,
                  color: theme.colors.foreground,
                  borderWidth: tokens.borderWidth.hairline,
                },
              ]}
              value={newCoverage}
              onChangeText={setNewCoverage}
              onSubmitEditing={handleAddCoverage}
              onBlur={handleAddCoverage}
              returnKeyType="done"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

///////////////

// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// const categories: Record<string, string[]> = {
//   daily_activities: ['Work', 'Gym', 'Outdoor', 'Travel', 'Relaxing', 'Events'],
//   favorite_colors: [
//     'Black',
//     'White',
//     'Gray',
//     'Navy',
//     'Beige',
//     'Brights',
//     'Earth Tones',
//   ],
// };

// export default function LifestyleScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     input: {
//       borderWidth: 1,
//       borderRadius: 8,
//       padding: 10,
//       fontSize: 17,
//       backgroundColor: theme.colors.input2,
//       marginBottom: 12,
//     },
//   });

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   const [selected, setSelected] = useState<{[key: string]: string[]}>({});
//   const [dislikes, setDislikes] = useState('');

//   useEffect(() => {
//     refetch();
//   }, [refetch]);

//   useEffect(() => {
//     if (!styleProfile) return;

//     const initial: {[key: string]: string[]} = {};
//     Object.keys(categories).forEach(key => {
//       if (Array.isArray(styleProfile[key])) {
//         initial[key] = styleProfile[key];
//       }
//     });

//     setSelected(initial);
//     setDislikes(styleProfile.disliked_styles || '');
//   }, [styleProfile]);

//   const toggleSelect = (category: string, value: string) => {
//     // 🔔 haptic on chip press
//     h('impactLight');

//     const existing = selected[category] || [];
//     const updated = existing.includes(value)
//       ? existing.filter(v => v !== value)
//       : [...existing, value];

//     const newState = {...selected, [category]: updated};
//     setSelected(newState);

//     try {
//       updateProfile(category, updated);
//     } catch {
//       h('notificationError');
//     }
//   };

//   const handleDislikesChange = (text: string) => {
//     setDislikes(text);
//     try {
//       updateProfile('disliked_styles', text);
//     } catch {
//       h('notificationError');
//     }
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Lifestyle
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           {/* 🔔 back = light tap */}
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
//           {Object.entries(categories).map(([category, options]) => (
//             <View key={category}>
//               <Text
//                 style={[globalStyles.sectionTitle4, {color: colors.primary}]}>
//                 {category
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
//                   {options.map(opt => (
//                     <Chip
//                       key={opt}
//                       label={opt}
//                       selected={selected[category]?.includes(opt)}
//                       onPress={() => toggleSelect(category, opt)}
//                     />
//                   ))}
//                 </View>
//               </View>
//             </View>
//           ))}

//           <Text style={[globalStyles.sectionTitle4, {color: colors.primary}]}>
//             Clothing Dislikes
//           </Text>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <TextInput
//               placeholder="Ex: I hate turtlenecks and pleats"
//               placeholderTextColor={colors.muted}
//               value={dislikes}
//               onChangeText={handleDislikesChange}
//               style={[
//                 styles.input,
//                 {
//                   borderColor: theme.colors.inputBorder,
//                   color: colors.foreground,
//                   borderWidth: tokens.borderWidth.hairline,
//                 },
//               ]}
//             />
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

///////////////

// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
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

// const categories: Record<string, string[]> = {
//   daily_activities: ['Work', 'Gym', 'Outdoor', 'Travel', 'Relaxing', 'Events'],
//   favorite_colors: [
//     'Black',
//     'White',
//     'Gray',
//     'Navy',
//     'Beige',
//     'Brights',
//     'Earth Tones',
//   ],
// };

// export default function LifestyleScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     input: {
//       borderWidth: 1,
//       borderRadius: 8,
//       padding: 10,
//       fontSize: 17,
//       backgroundColor: theme.colors.input2,
//       marginBottom: 12,
//     },
//   });

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   const [selected, setSelected] = useState<{[key: string]: string[]}>({});
//   const [dislikes, setDislikes] = useState('');

//   useEffect(() => {
//     refetch();
//   }, [refetch]);

//   useEffect(() => {
//     if (!styleProfile) return;

//     const initial: {[key: string]: string[]} = {};
//     Object.keys(categories).forEach(key => {
//       if (Array.isArray(styleProfile[key])) {
//         initial[key] = styleProfile[key];
//       }
//     });

//     setSelected(initial);
//     setDislikes(styleProfile.disliked_styles || '');
//   }, [styleProfile]);

//   const toggleSelect = (category: string, value: string) => {
//     const existing = selected[category] || [];
//     const updated = existing.includes(value)
//       ? existing.filter(v => v !== value)
//       : [...existing, value];

//     const newState = {...selected, [category]: updated};
//     setSelected(newState);
//     updateProfile(category, updated);
//   };

//   const handleDislikesChange = (text: string) => {
//     setDislikes(text);
//     updateProfile('disliked_styles', text);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Lifestyle
//       </Text>

//       <ScrollView contentContainerStyle={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           {Object.entries(categories).map(([category, options]) => (
//             <View key={category}>
//               <Text
//                 style={[globalStyles.sectionTitle4, {color: colors.primary}]}>
//                 {category
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
//                   {options.map(opt => (
//                     <Chip
//                       key={opt}
//                       label={opt}
//                       selected={selected[category]?.includes(opt)}
//                       onPress={() => toggleSelect(category, opt)}
//                     />
//                   ))}
//                 </View>
//               </View>
//             </View>
//           ))}

//           <Text style={[globalStyles.sectionTitle4, {color: colors.primary}]}>
//             Clothing Dislikes
//           </Text>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <TextInput
//               placeholder="Ex: I hate turtlenecks and pleats"
//               placeholderTextColor={colors.muted}
//               value={dislikes}
//               onChangeText={handleDislikesChange}
//               style={[
//                 styles.input,
//                 {
//                   borderColor: theme.colors.inputBorder,
//                   color: colors.foreground,
//                   borderWidth: tokens.borderWidth.hairline,
//                 },
//               ]}
//             />
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
