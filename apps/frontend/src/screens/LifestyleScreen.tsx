import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

const categories: Record<string, string[]> = {
  daily_activities: ['Work', 'Gym', 'Outdoor', 'Travel', 'Relaxing', 'Events'],
  favorite_colors: [
    'Black',
    'White',
    'Gray',
    'Navy',
    'Beige',
    'Brights',
    'Earth Tones',
  ],
};

export default function LifestyleScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

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
  }, [styleProfile]);

  const toggleSelect = (category: string, value: string) => {
    const existing = selected[category] || [];
    const updated = existing.includes(value)
      ? existing.filter(v => v !== value)
      : [...existing, value];

    const newState = {...selected, [category]: updated};
    setSelected(newState);
    updateProfile(category, updated);
  };

  const handleDislikesChange = (text: string) => {
    setDislikes(text);
    updateProfile('disliked_styles', text);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Lifestyle
      </Text>

      <ScrollView contentContainerStyle={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
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
                  globalStyles.cardStyles3,
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

          <Text style={[globalStyles.sectionTitle4, {color: colors.primary}]}>
            Clothing Dislikes
          </Text>
          <View
            style={[globalStyles.styleContainer1, globalStyles.cardStyles3]}>
            <TextInput
              placeholder="Ex: I hate turtlenecks and pleats"
              placeholderTextColor={colors.muted}
              value={dislikes}
              onChangeText={handleDislikesChange}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.inputBorder,
                  color: colors.foreground,
                },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

//////////

// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const categories = {
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

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

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
//       backgroundColor: theme.colors.background,
//       marginBottom: 12,
//     },
//   });

//   const [selected, setSelected] = useState<{[key: string]: string[]}>({});
//   const [dislikes, setDislikes] = useState('');

//   useEffect(() => {
//     AsyncStorage.getItem('lifestyle').then(val => {
//       if (val) {
//         const parsed = JSON.parse(val);
//         setSelected(parsed.selected || {});
//         setDislikes(parsed.dislikes || '');
//       }
//     });
//   }, []);

//   const toggleSelect = (category: string, value: string) => {
//     const existing = selected[category] || [];
//     const updated = existing.includes(value)
//       ? existing.filter(v => v !== value)
//       : [...existing, value];

//     const newState = {...selected, [category]: updated};
//     setSelected(newState);
//     AsyncStorage.setItem(
//       'lifestyle',
//       JSON.stringify({selected: newState, dislikes}),
//     );
//     updateProfile(category, updated);
//   };

//   const handleDislikesChange = (text: string) => {
//     setDislikes(text);
//     AsyncStorage.setItem(
//       'lifestyle',
//       JSON.stringify({selected, dislikes: text}),
//     );
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
//         {Object.entries(categories).map(([category, options]) => (
//           <View>
//             <View key={category}>
//               <Text
//                 style={[globalStyles.sectionTitle4, {color: colors.primary}]}>
//                 {category
//                   .replace(/_/g, ' ')
//                   .replace(/(^\w|\s\w)/g, t => t.toUpperCase())}
//               </Text>
//               <View style={globalStyles.styleContainer1}>
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
//           </View>
//         ))}

//         <Text style={[globalStyles.sectionTitle4, {color: colors.primary}]}>
//           Clothing Dislikes
//         </Text>
//         <View style={globalStyles.styleContainer1}>
//           <TextInput
//             placeholder="Ex: I hate turtlenecks and pleats"
//             placeholderTextColor={colors.muted}
//             value={dislikes}
//             onChangeText={handleDislikesChange}
//             style={[
//               styles.input,
//               {
//                 borderColor: theme.colors.inputBorder,
//                 color: colors.foreground,
//               },
//             ]}
//           />
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

/////////////

// import React, {useState, useEffect} from 'react';
// import {View, Text, StyleSheet, ScrollView, TextInput} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const categories = {
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

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

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
//     },
//   });

//   const [selected, setSelected] = useState<{[key: string]: string[]}>({});
//   const [dislikes, setDislikes] = useState('');

//   useEffect(() => {
//     AsyncStorage.getItem('lifestyle').then(val => {
//       if (val) {
//         const parsed = JSON.parse(val);
//         setSelected(parsed.selected || {});
//         setDislikes(parsed.dislikes || '');
//       }
//     });
//   }, []);

//   const toggleSelect = (category: string, value: string) => {
//     const existing = selected[category] || [];
//     const updated = existing.includes(value)
//       ? existing.filter(v => v !== value)
//       : [...existing, value];

//     const newState = {...selected, [category]: updated};
//     setSelected(newState);
//     AsyncStorage.setItem(
//       'lifestyle',
//       JSON.stringify({selected: newState, dislikes}),
//     );
//     updateProfile(category, updated);
//   };

//   const handleDislikesChange = (text: string) => {
//     setDislikes(text);
//     AsyncStorage.setItem(
//       'lifestyle',
//       JSON.stringify({selected, dislikes: text}),
//     );
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

//       <ScrollView contentContainerStyle={globalStyles.section}>
//         <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//         {Object.entries(categories).map(([category, options]) => (
//           <View style={globalStyles.section}>
//             <View key={category}>
//               <Text
//                 style={[globalStyles.sectionTitle, {color: colors.primary}]}>
//                 {category
//                   .replace(/_/g, ' ')
//                   .replace(/(^\w|\s\w)/g, t => t.toUpperCase())}
//               </Text>
//               <View style={globalStyles.pillContainer}>
//                 {options.map(opt => (
//                   <Chip
//                     key={opt}
//                     label={opt}
//                     selected={selected[category]?.includes(opt)}
//                     onPress={() => toggleSelect(category, opt)}
//                   />
//                 ))}
//               </View>
//             </View>
//           </View>
//         ))}

//         <View style={globalStyles.section}>
//           <Text style={[globalStyles.sectionTitle, {color: colors.primary}]}>
//             Clothing Dislikes
//           </Text>

//           <TextInput
//             placeholder="Ex: I hate turtlenecks and pleats"
//             placeholderTextColor={colors.muted}
//             value={dislikes}
//             onChangeText={handleDislikesChange}
//             style={[
//               styles.input,
//               {borderColor: colors.surface, color: colors.foreground},
//             ]}
//           />
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
