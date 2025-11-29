import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Keyboard,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import currency from 'currency.js';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {navigate: (screen: string) => void};

const STORAGE_KEY = 'preferred_brands_vocab';

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function BudgetAndBrandsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const insets = useSafeAreaInsets();

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
    brandInput: {
      borderWidth: tokens.borderWidth.hairline,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      backgroundColor: theme.colors.input2,
      color: colors.foreground,
      marginTop: 12,
    },
  });

  const [budgetInput, setBudgetInput] = useState('');
  const [parsedBudget, setParsedBudget] = useState<number | null>(null);

  // All chips ever added (even if toggled off)
  const [allBrands, setAllBrands] = useState<string[]>([]);
  // Brands currently toggled ON (in DB)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState('');

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

  // ─────────────────────────────────────────────
  // Initial load from DB + local fallback
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  useEffect(() => {
    (async () => {
      // Load selected brands from DB
      const dbBrands = Array.isArray(styleProfile?.preferred_brands)
        ? styleProfile!.preferred_brands
        : [];

      setSelectedBrands(dbBrands);

      // Load "all known brands" from cache or merge with DB
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let all: string[] = [];
      if (stored) {
        all = JSON.parse(stored);
      }

      // Merge DB + cached to ensure chips never disappear
      const merged = Array.from(new Set([...all, ...dbBrands]));
      setAllBrands(merged);

      // Save merged vocab back to cache
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

      // Handle budget field
      const budget = styleProfile?.budget_level || 0;
      setParsedBudget(budget);
      setBudgetInput(
        budget > 0
          ? currency(budget, {symbol: '$', precision: 0}).format()
          : '',
      );
    })();
  }, [styleProfile]);

  // ─────────────────────────────────────────────
  // Budget handling
  // ─────────────────────────────────────────────
  const handleBudgetChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const numeric = parseInt(cleaned || '0');
    setParsedBudget(numeric);
    setBudgetInput(
      cleaned ? currency(numeric, {symbol: '$', precision: 0}).format() : '',
    );
  };

  const commitBudget = async () => {
    if (parsedBudget !== null && !isNaN(parsedBudget)) {
      await updateProfile('budget_level', parsedBudget);
      await refetch();
    }
  };

  // ─────────────────────────────────────────────
  // Toggle brand on/off
  // ─────────────────────────────────────────────
  const toggleBrand = async (label: string) => {
    h('impactLight');

    const isOn = selectedBrands.includes(label);
    const next = isOn
      ? selectedBrands.filter(b => b !== label) // OFF → remove from DB
      : [...selectedBrands, label]; // ON → add to DB

    setSelectedBrands(next);

    try {
      // ✅ Only save ON brands to DB
      await updateProfile('preferred_brands', next);
      await refetch();
    } catch (e) {
      // rollback if failed
      setSelectedBrands(selectedBrands);
      h('notificationError');
    }
  };

  // ─────────────────────────────────────────────
  // Add a new brand chip (default ON)
  // ─────────────────────────────────────────────
  const handleAddBrand = async () => {
    const trimmed = newBrand.trim();
    if (!trimmed) return;

    const alreadyExists = allBrands.some(
      b => b.toLowerCase() === trimmed.toLowerCase(),
    );
    if (alreadyExists) {
      setNewBrand('');
      Keyboard.dismiss();
      return;
    }

    const newAll = [...allBrands, trimmed];
    const newSelected = [...selectedBrands, trimmed];

    setAllBrands(newAll);
    setSelectedBrands(newSelected);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAll));
      await updateProfile('preferred_brands', newSelected);
      await refetch();
      setNewBrand('');
      Keyboard.dismiss();
      h('impactLight');
    } catch (e) {
      setAllBrands(allBrands);
      setSelectedBrands(selectedBrands);
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
        Budget & Brands
      </Text>

      <ScrollView
        style={globalStyles.section4}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{paddingBottom: 400}}
        showsVerticalScrollIndicator={false}>
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

        <View style={globalStyles.section5}>
          {/* Budget Section */}
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
              onBlur={commitBudget}
              onSubmitEditing={commitBudget}
            />
          </View>

          {/* Brands Section */}
          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Your Favorite Brands:
          </Text>
          <Text
            style={[
              globalStyles.subLabel,
              {color: colors.foreground, marginTop: 12},
            ]}>
            Enter 1 brand name at a time and hit Enter or Return
          </Text>
          <View
            style={[
              globalStyles.styleContainer1,
              {borderWidth: tokens.borderWidth.md},
            ]}>
            <View style={globalStyles.pillContainer}>
              {allBrands.length === 0 && (
                <Text style={{color: colors.muted, marginBottom: 8}}>
                  No brands yet — add one below.
                </Text>
              )}

              {allBrands.map(brand => (
                <Chip
                  key={brand}
                  label={brand}
                  selected={selectedBrands.includes(brand)}
                  onPress={() => toggleBrand(brand)}
                />
              ))}
            </View>

            {/* Add new brand input */}
            <TextInput
              placeholder="Add a new brand"
              placeholderTextColor={colors.muted}
              style={[
                styles.brandInput,
                {borderColor: theme.colors.inputBorder},
              ]}
              value={newBrand}
              onChangeText={setNewBrand}
              onSubmitEditing={handleAddBrand}
              onBlur={handleAddBrand}
              returnKeyType="done"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/////////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   Keyboard,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import currency from 'currency.js';
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

// export default function BudgetAndBrandsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     subtitle: {fontSize: 17, marginBottom: 10},
//     input: {
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 8,
//       padding: 10,
//       fontSize: 16,
//       marginBottom: 12,
//       backgroundColor: theme.colors.input2,
//     },
//     brandInput: {
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 8,
//       padding: 10,
//       fontSize: 16,
//       backgroundColor: theme.colors.input2,
//       color: colors.foreground,
//       marginTop: 12,
//     },
//   });

//   const [budgetInput, setBudgetInput] = useState('');
//   const [parsedBudget, setParsedBudget] = useState<number | null>(null);

//   // brands stored in DB (all brands ever added)
//   const [brands, setBrands] = useState<string[]>([]);
//   // brands currently toggled ON by user
//   const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
//   const [newBrand, setNewBrand] = useState('');

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   // Load style profile
//   useEffect(() => {
//     refetch();
//   }, [refetch]);

//   // Populate state from DB
//   useEffect(() => {
//     if (!styleProfile) return;

//     const budget = styleProfile.budget_level || 0;
//     setParsedBudget(budget);
//     setBudgetInput(
//       budget > 0 ? currency(budget, {symbol: '$', precision: 0}).format() : '',
//     );

//     const savedBrands = Array.isArray(styleProfile.preferred_brands)
//       ? styleProfile.preferred_brands
//       : [];

//     setBrands(savedBrands);
//     setSelectedBrands(savedBrands); // start with all toggled ON by default
//   }, [styleProfile]);

//   // ✅ Only update local state as user types
//   const handleBudgetChange = (value: string) => {
//     const cleaned = value.replace(/[^0-9]/g, '');
//     const numeric = parseInt(cleaned || '0');
//     setParsedBudget(numeric);
//     setBudgetInput(
//       cleaned ? currency(numeric, {symbol: '$', precision: 0}).format() : '',
//     );
//   };

//   // ✅ Commit to DB only once when user finishes editing
//   const commitBudget = () => {
//     if (parsedBudget !== null && !isNaN(parsedBudget)) {
//       updateProfile('budget_level', parsedBudget);
//     }
//   };

//   const toggleBrand = (label: string) => {
//     h('impactLight');

//     const isSelected = selectedBrands.includes(label);
//     const updatedSelected = isSelected
//       ? selectedBrands.filter(b => b !== label)
//       : [...selectedBrands, label];

//     setSelectedBrands(updatedSelected);
//     // 🚨 NOTE: We do NOT remove from brands[] or DB anymore — just update selection state
//   };

//   const handleAddBrand = () => {
//     const trimmed = newBrand.trim();
//     if (!trimmed) return;

//     const exists = brands.some(b => b.toLowerCase() === trimmed.toLowerCase());
//     if (exists) {
//       setNewBrand('');
//       Keyboard.dismiss();
//       return;
//     }

//     const updatedBrands = [...brands, trimmed];
//     setBrands(updatedBrands);
//     setSelectedBrands([...selectedBrands, trimmed]);

//     updateProfile('preferred_brands', updatedBrands); // persist the full list
//     setNewBrand('');
//     Keyboard.dismiss();
//     h('impactLight');
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

//       <ScrollView
//         style={globalStyles.section4}
//         keyboardShouldPersistTaps="handled">
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

//         <View style={globalStyles.section5}>
//           {/* Budget Section */}
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
//               onChangeText={handleBudgetChange} // ✅ local only
//               onBlur={commitBudget} // ✅ commit to DB onBlur
//               onSubmitEditing={commitBudget} // ✅ commit on submit too
//             />
//           </View>

//           {/* Brands Section */}
//           <Text
//             style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
//             Your Favorite Brands:
//           </Text>
//           <Text
//             style={[
//               globalStyles.subLabel,
//               {color: colors.foreground, marginTop: 12},
//             ]}>
//             Enter 1 brand name at a time and hit Enter or Return
//           </Text>
//           <View
//             style={[
//               globalStyles.styleContainer1,
//               globalStyles.cardStyles3,
//               {borderWidth: tokens.borderWidth.md},
//             ]}>
//             <View style={globalStyles.pillContainer}>
//               {brands.length === 0 && (
//                 <Text style={{color: colors.muted, marginBottom: 8}}>
//                   No brands yet — add one below.
//                 </Text>
//               )}

//               {brands.map(brand => (
//                 <Chip
//                   key={brand}
//                   label={brand}
//                   selected={selectedBrands.includes(brand)}
//                   onPress={() => toggleBrand(brand)}
//                 />
//               ))}
//             </View>

//             {/* Add new brand input */}
//             <TextInput
//               placeholder="Add a new brand"
//               placeholderTextColor={colors.muted}
//               style={[
//                 styles.brandInput,
//                 {borderColor: theme.colors.inputBorder},
//               ]}
//               value={newBrand}
//               onChangeText={setNewBrand}
//               onSubmitEditing={handleAddBrand}
//               onBlur={handleAddBrand}
//               returnKeyType="done"
//             />
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

////////////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   Keyboard,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import currency from 'currency.js';
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

// export default function BudgetAndBrandsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     subtitle: {fontSize: 17, marginBottom: 10},
//     input: {
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 8,
//       padding: 10,
//       fontSize: 16,
//       marginBottom: 12,
//       backgroundColor: theme.colors.input2,
//     },
//     brandInput: {
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 8,
//       padding: 10,
//       fontSize: 16,
//       backgroundColor: theme.colors.input2,
//       color: colors.foreground,
//       marginTop: 12,
//     },
//   });

//   const [budgetInput, setBudgetInput] = useState('');
//   const [parsedBudget, setParsedBudget] = useState<number | null>(null);

//   // brands stored in DB (all brands ever added)
//   const [brands, setBrands] = useState<string[]>([]);
//   // brands currently toggled ON by user
//   const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
//   const [newBrand, setNewBrand] = useState('');

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {styleProfile, updateProfile, refetch} = useStyleProfile(userId);

//   // Load style profile
//   useEffect(() => {
//     refetch();
//   }, [refetch]);

//   // Populate state from DB
//   useEffect(() => {
//     if (!styleProfile) return;

//     const budget = styleProfile.budget_level || 0;
//     setParsedBudget(budget);
//     setBudgetInput(currency(budget, {symbol: '$', precision: 0}).format());

//     const savedBrands = Array.isArray(styleProfile.preferred_brands)
//       ? styleProfile.preferred_brands
//       : [];

//     setBrands(savedBrands);
//     setSelectedBrands(savedBrands); // start with all toggled ON by default
//   }, [styleProfile]);

//   const handleBudgetChange = (value: string) => {
//     const cleaned = value.replace(/[^0-9]/g, '');
//     const numeric = parseInt(cleaned || '0');
//     setParsedBudget(numeric);
//     setBudgetInput(currency(numeric, {symbol: '$', precision: 0}).format());
//     updateProfile('budget_level', numeric);
//   };

//   const toggleBrand = (label: string) => {
//     h('impactLight');

//     const isSelected = selectedBrands.includes(label);
//     const updatedSelected = isSelected
//       ? selectedBrands.filter(b => b !== label)
//       : [...selectedBrands, label];

//     setSelectedBrands(updatedSelected);
//     // 🚨 NOTE: We do NOT remove from brands[] or DB anymore — just update selection state
//   };

//   const handleAddBrand = () => {
//     const trimmed = newBrand.trim();
//     if (!trimmed) return;

//     const exists = brands.some(b => b.toLowerCase() === trimmed.toLowerCase());
//     if (exists) {
//       setNewBrand('');
//       Keyboard.dismiss();
//       return;
//     }

//     const updatedBrands = [...brands, trimmed];
//     setBrands(updatedBrands);
//     setSelectedBrands([...selectedBrands, trimmed]);

//     updateProfile('preferred_brands', updatedBrands); // persist the full list
//     setNewBrand('');
//     Keyboard.dismiss();
//     h('impactLight');
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

//       <ScrollView
//         style={globalStyles.section4}
//         keyboardShouldPersistTaps="handled">
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

//         <View style={globalStyles.section5}>
//           {/* Budget Section */}
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

//           {/* Brands Section */}
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
//               {brands.length === 0 && (
//                 <Text style={{color: colors.muted, marginBottom: 8}}>
//                   No brands yet — add one below.
//                 </Text>
//               )}

//               {brands.map(brand => (
//                 <Chip
//                   key={brand}
//                   label={brand}
//                   selected={selectedBrands.includes(brand)}
//                   onPress={() => toggleBrand(brand)}
//                 />
//               ))}
//             </View>

//             {/* Add new brand input */}
//             <TextInput
//               placeholder="Add a new brand"
//               placeholderTextColor={colors.muted}
//               style={[
//                 styles.brandInput,
//                 {borderColor: theme.colors.inputBorder},
//               ]}
//               value={newBrand}
//               onChangeText={setNewBrand}
//               onSubmitEditing={handleAddBrand}
//               onBlur={handleAddBrand}
//               returnKeyType="done"
//             />
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

////////////////////

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
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Props = {navigate: (screen: string) => void};
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
// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function BudgetAndBrandsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     subtitle: {fontSize: 17, marginBottom: 10},
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
//     refetch();
//   }, [refetch]);

//   useEffect(() => {
//     if (!styleProfile) return;
//     const budget = styleProfile.budget_level || 0;
//     setParsedBudget(budget);
//     setBudgetInput(currency(budget, {symbol: '$', precision: 0}).format());
//     setSelectedBrands(styleProfile.preferred_brands || []);
//   }, [styleProfile]);

//   const handleBudgetChange = (value: string) => {
//     const cleaned = value.replace(/[^0-9]/g, '');
//     const numeric = parseInt(cleaned || '0');
//     setParsedBudget(numeric);
//     setBudgetInput(currency(numeric, {symbol: '$', precision: 0}).format());
//     updateProfile('budget_level', numeric);
//   };

//   const toggleBrand = (label: string) => {
//     // 🔔 haptic in handler ensures we buzz even if Chip consumes touch
//     h('impactLight');

//     const isSelected = selectedBrands.includes(label);
//     const updated = isSelected
//       ? selectedBrands.filter(b => b !== label)
//       : [...selectedBrands, label];
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
//           {/* Back gets a light tap */}
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
//                   onPress={() => toggleBrand(brand)}
//                 />
//               ))}
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
