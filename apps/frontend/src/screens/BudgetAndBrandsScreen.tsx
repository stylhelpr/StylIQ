import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TextInput, ScrollView} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import currency from 'currency.js';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = {navigate: (screen: string) => void};
const allBrands = [
  'Zara',
  'UNIQLO',
  'Ferragamo',
  'Burberry',
  'Amiri',
  'GOBI',
  'Eton',
  'Ralph Lauren',
  'Gucci',
  'Theory',
];
const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function BudgetAndBrandsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    subtitle: {fontSize: 17, marginBottom: 10},
    input: {
      borderWidth: tokens.borderWidth.hairline,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      marginBottom: 12,
      backgroundColor: theme.colors.input2,
    },
  });

  const [budgetInput, setBudgetInput] = useState('');
  const [parsedBudget, setParsedBudget] = useState<number | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!styleProfile) return;
    const budget = styleProfile.budget_level || 0;
    setParsedBudget(budget);
    setBudgetInput(currency(budget, {symbol: '$', precision: 0}).format());
    setSelectedBrands(styleProfile.preferred_brands || []);
  }, [styleProfile]);

  const handleBudgetChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const numeric = parseInt(cleaned || '0');
    setParsedBudget(numeric);
    setBudgetInput(currency(numeric, {symbol: '$', precision: 0}).format());
    updateProfile('budget_level', numeric);
  };

  const toggleBrand = (label: string) => {
    // 🔔 haptic in handler ensures we buzz even if Chip consumes touch
    h('impactLight');

    const isSelected = selectedBrands.includes(label);
    const updated = isSelected
      ? selectedBrands.filter(b => b !== label)
      : [...selectedBrands, label];
    setSelectedBrands(updated);
    updateProfile('preferred_brands', updated);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Budget & Brands
      </Text>

      <ScrollView style={globalStyles.section4}>
        <View style={globalStyles.backContainer}>
          {/* Back gets a light tap */}
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

        <View style={globalStyles.section5}>
          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Your Monthly Style Budget:
          </Text>
          <View
            style={[globalStyles.styleContainer1, globalStyles.cardStyles3]}>
            <TextInput
              placeholder="$ Amount"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.inputBorder,
                  color: colors.foreground,
                },
              ]}
              keyboardType="numeric"
              value={budgetInput}
              onChangeText={handleBudgetChange}
            />
          </View>

          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Your Favorite Brands:
          </Text>
          <View
            style={[
              globalStyles.styleContainer1,
              globalStyles.cardStyles3,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {allBrands.map(brand => (
                <Chip
                  key={brand}
                  label={brand}
                  selected={selectedBrands.includes(brand)}
                  onPress={() => toggleBrand(brand)}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

//////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, TextInput, ScrollView} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import currency from 'currency.js';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const allBrands = [
//   'Zara',
//   'UNIQLO',
//   'Ferragamo',
//   'Burberry',
//   'Amiri',
//   'GOBI',
//   'Eton',
//   'Ralph Lauren',
//   'Gucci',
//   'Theory',
// ];

// export default function BudgetAndBrandsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     subtitle: {
//       fontSize: 17,
//       marginBottom: 10,
//     },
//     input: {
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 8,
//       padding: 10,
//       fontSize: 16,
//       marginBottom: 12,
//       backgroundColor: theme.colors.input2,
//     },
//   });

//   const [budgetInput, setBudgetInput] = useState('');
//   const [parsedBudget, setParsedBudget] = useState<number | null>(null);
//   const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   useEffect(() => {
//     refetch(); // fetch on mount
//   }, [refetch]);

//   useEffect(() => {
//     if (!styleProfile) return;

//     const budget = styleProfile.budget_level || 0;
//     setParsedBudget(budget);
//     setBudgetInput(currency(budget, {symbol: '$', precision: 0}).format());

//     const brands = styleProfile.preferred_brands || [];
//     setSelectedBrands(brands);
//   }, [styleProfile]);

//   const handleBudgetChange = (value: string) => {
//     const cleaned = value.replace(/[^0-9]/g, '');
//     const numeric = parseInt(cleaned || '0');
//     setParsedBudget(numeric);
//     setBudgetInput(currency(numeric, {symbol: '$', precision: 0}).format());
//     updateProfile('budget_level', numeric);
//   };

//   const toggleBrand = (label: string, selected: boolean) => {
//     const updated = selected
//       ? [...selectedBrands, label]
//       : selectedBrands.filter(b => b !== label);
//     setSelectedBrands(updated);
//     updateProfile('preferred_brands', updated);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Budget & Brands
//       </Text>

//       <ScrollView style={globalStyles.section4}>
//         <View style={globalStyles.backContainer}>
//           <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//           <Text style={globalStyles.backText}>Back</Text>
//         </View>

//         <View style={globalStyles.section5}>
//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Your Monthly Style Budget:
//           </Text>
//           <View
//             style={[globalStyles.styleContainer1, globalStyles.cardStyles3]}>
//             <TextInput
//               placeholder="$ Amount"
//               placeholderTextColor={colors.muted}
//               style={[
//                 styles.input,
//                 {
//                   borderColor: theme.colors.inputBorder,
//                   color: colors.foreground,
//                 },
//               ]}
//               keyboardType="numeric"
//               value={budgetInput}
//               onChangeText={handleBudgetChange}
//             />
//           </View>

//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Your Favorite Brands:
//           </Text>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {allBrands.map(brand => (
//                 <Chip
//                   key={brand}
//                   label={brand}
//                   selected={selectedBrands.includes(brand)}
//                   onPress={selected => toggleBrand(brand, selected)}
//                 />
//               ))}
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
