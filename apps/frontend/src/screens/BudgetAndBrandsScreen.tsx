import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppTheme} from '../context/ThemeContext';
import {Chip} from '../components/Chip/Chip';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import currency from 'currency.js';
import {useGlobalStyles} from '../styles/useGlobalStyles';

type Props = {
  navigate: (screen: string) => void;
};

const STORAGE_KEY = 'budgetAndBrands';

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

export default function BudgetAndBrandsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    subtitle: {
      fontSize: 17,
      marginBottom: 10,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      marginBottom: 20,
    },
  });

  const [budgetInput, setBudgetInput] = useState('');
  const [parsedBudget, setParsedBudget] = useState<number | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  useEffect(() => {
    const loadFromStorage = async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          setParsedBudget(parsed.budget || null);
          setBudgetInput(parsed.budget ? currency(parsed.budget).format() : '');
          setSelectedBrands(parsed.brands || []);
        }
      } catch (err) {
        console.warn('⚠️ Failed to load Budget & Brands:', err);
        Alert.alert('Error loading preferences');
      }
    };
    loadFromStorage();
  }, []);

  const saveAndSync = async (budget: number | null, brands: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({budget, brands}));
      if (budget !== null) updateProfile('budget_level', budget);
      updateProfile('preferred_brands', brands);
    } catch (err) {
      console.warn('⚠️ Failed to save or sync Budget & Brands:', err);
    }
  };

  const handleBudgetChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const numeric = parseInt(cleaned || '0');
    setParsedBudget(numeric);
    setBudgetInput(currency(numeric, {symbol: '$', precision: 0}).format());
    saveAndSync(numeric, selectedBrands);
  };

  const toggleBrand = (label: string, selected: boolean) => {
    const updated = selected
      ? [...selectedBrands, label]
      : selectedBrands.filter(b => b !== label);
    setSelectedBrands(updated);
    saveAndSync(parsedBudget, updated);
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

      <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />

      <ScrollView style={globalStyles.section}>
        <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
          Your Monthly Style Budget:
        </Text>
        <TextInput
          placeholder="$ Amount"
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            {borderColor: colors.surface, color: colors.foreground},
          ]}
          keyboardType="numeric"
          value={budgetInput}
          onChangeText={handleBudgetChange}
        />
        <Text
          style={[
            globalStyles.sectionTitle,
            {marginTop: 20, color: colors.foreground},
          ]}>
          Your Favorite Brands:
        </Text>
        <View style={globalStyles.pillContainer}>
          {allBrands.map(brand => (
            <Chip
              key={brand}
              label={brand}
              selected={selectedBrands.includes(brand)}
              onPress={selected => toggleBrand(brand, selected)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   Alert,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAppTheme} from '../context/ThemeContext';
// import {Chip} from '../components/Chip/Chip';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import currency from 'currency.js';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const STORAGE_KEY = 'budgetAndBrands';

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

//   const [budgetInput, setBudgetInput] = useState('');
//   const [parsedBudget, setParsedBudget] = useState<number | null>(null);
//   const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

//   const {user} = useAuth0();
//   const userId = user?.sub || '';
//   const {updateProfile} = useStyleProfile(userId);

//   useEffect(() => {
//     const loadFromStorage = async () => {
//       try {
//         const data = await AsyncStorage.getItem(STORAGE_KEY);
//         if (data) {
//           const parsed = JSON.parse(data);
//           setParsedBudget(parsed.budget || null);
//           setBudgetInput(parsed.budget ? currency(parsed.budget).format() : '');
//           setSelectedBrands(parsed.brands || []);
//         }
//       } catch (err) {
//         console.warn('⚠️ Failed to load Budget & Brands:', err);
//         Alert.alert('Error loading preferences');
//       }
//     };
//     loadFromStorage();
//   }, []);

//   const saveAndSync = async (budget: number | null, brands: string[]) => {
//     try {
//       await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({budget, brands}));
//       if (budget !== null) updateProfile('budget_level', budget);
//       updateProfile('preferred_brands', brands);
//     } catch (err) {
//       console.warn('⚠️ Failed to save or sync Budget & Brands:', err);
//     }
//   };

//   const handleBudgetChange = (value: string) => {
//     const cleaned = value.replace(/[^0-9]/g, '');
//     const numeric = parseInt(cleaned || '0');
//     setParsedBudget(numeric);
//     setBudgetInput(currency(numeric, {symbol: '$', precision: 0}).format());
//     saveAndSync(numeric, selectedBrands);
//   };

//   const toggleBrand = (label: string, selected: boolean) => {
//     const updated = selected
//       ? [...selectedBrands, label]
//       : selectedBrands.filter(b => b !== label);
//     setSelectedBrands(updated);
//     saveAndSync(parsedBudget, updated);
//   };

//   return (
//     <View style={styles.container}>
//       <BackHeader
//         title="Style Profile"
//         onBack={() => navigate('StyleProfileScreen')}
//       />
//       <ScrollView style={{backgroundColor: colors.background}}>
//         <Text style={[styles.title, {color: colors.primary}]}>
//           Budget & Brands
//         </Text>
//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           Your Monthly Style Budget:
//         </Text>
//         <TextInput
//           placeholder="$ Amount"
//           placeholderTextColor={colors.muted}
//           style={[
//             styles.input,
//             {borderColor: colors.surface, color: colors.foreground},
//           ]}
//           keyboardType="numeric"
//           value={budgetInput}
//           onChangeText={handleBudgetChange}
//         />
//         <Text
//           style={[styles.subtitle, {marginTop: 20, color: colors.foreground}]}>
//           Your Favorite Brands:
//         </Text>
//         <View style={styles.chipGroup}>
//           {allBrands.map(brand => (
//             <Chip
//               key={brand}
//               label={brand}
//               selected={selectedBrands.includes(brand)}
//               onPress={selected => toggleBrand(brand, selected)}
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 20,
//     flex: 1,
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: '700',
//     marginBottom: 10,
//   },
//   subtitle: {
//     fontSize: 16,
//     marginBottom: 10,
//   },
//   input: {
//     borderWidth: 1,
//     borderRadius: 8,
//     padding: 10,
//     fontSize: 16,
//     marginBottom: 20,
//   },
//   chipGroup: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//   },
// });
