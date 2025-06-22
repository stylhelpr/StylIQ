import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../hooks/useStyleProfile';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

type Props = {
  navigate: (screen: string) => void;
};

const STORAGE_KEY = 'userMeasurements';

const fieldMap: Record<string, string> = {
  Weight: 'weight',
  Chest: 'chest',
  Waist: 'waist',
  Inseam: 'inseam',
  'Shoe Size': 'shoe_size',
  Hip: 'hip',
  'Shoulder Width': 'shoulder_width',
};

export default function MeasurementsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {updateProfile} = useStyleProfile(userId);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    unitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    unitTextContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    switchContainer: {
      justifyContent: 'center',
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: tokens.borderRadius.md,
      padding: 10,
      marginBottom: 15,
      fontSize: 17,
      backgroundColor: theme.colors.background,
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [unitPreference, setUnitPreference] = useState<'imperial' | 'metric'>(
    'imperial',
  );

  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [centimeters, setCentimeters] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(data => {
        if (data) {
          const parsed = JSON.parse(data);
          setValues(parsed.values || {});
          setUnitPreference(parsed.unitPreference || 'imperial');

          if (parsed.values?.heightCm) {
            const cm = parseInt(parsed.values.heightCm);
            setHeightCm(cm);
            setCentimeters(cm.toString());
            const totalInches = Math.round(cm / 2.54);
            const ft = Math.floor(totalInches / 12);
            const inch = totalInches % 12;
            setFeet(ft.toString());
            setInches(inch.toString());
          }
        }
      })
      .catch(() => Alert.alert('Error loading measurements'));
  }, []);

  const handleChange = async (label: string, input: string) => {
    const cleaned = input.replace(/[^0-9.]/g, '');

    const updated = {...values, [label]: cleaned};
    setValues(updated);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({values: {...updated, heightCm}, unitPreference}),
    );

    const dbField = fieldMap[label];
    if (dbField) {
      const isDecimal = label === 'Shoe Size';
      const numericValue = isDecimal ? parseFloat(cleaned) : parseInt(cleaned);
      if (!isNaN(numericValue)) {
        updateProfile(dbField, numericValue);
      }
    }
  };

  const handleFeetChange = async (val: string) => {
    const ft = val.replace(/[^0-9]/g, '');
    setFeet(ft);
    const inch = parseInt(inches || '0');
    const height = Math.round((parseInt(ft || '0') * 12 + inch) * 2.54);
    setHeightCm(height);
    setCentimeters(height.toString());

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        values: {...values, heightCm: height},
        unitPreference,
      }),
    );
    updateProfile('height', height);
  };

  const handleInchesChange = async (val: string) => {
    const inch = val.replace(/[^0-9]/g, '');
    setInches(inch);
    const ft = parseInt(feet || '0');
    const height = Math.round((ft * 12 + parseInt(inch || '0')) * 2.54);
    setHeightCm(height);
    setCentimeters(height.toString());

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        values: {...values, heightCm: height},
        unitPreference,
      }),
    );
    updateProfile('height', height);
  };

  const handleCentimetersChange = async (val: string) => {
    const cm = val.replace(/[^0-9]/g, '');
    setCentimeters(cm);
    const height = parseInt(cm || '0');
    setHeightCm(height);
    const totalInches = Math.round(height / 2.54);
    const ft = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    setFeet(ft.toString());
    setInches(inch.toString());

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        values: {...values, heightCm: height},
        unitPreference,
      }),
    );
    updateProfile('height', height);
  };

  const toggleUnits = async () => {
    const newUnit = unitPreference === 'imperial' ? 'metric' : 'imperial';
    const convertedValues: Record<string, string> = {...values};

    // Convert all other applicable fields
    for (const label of Object.keys(fieldMap)) {
      const val = values[label];
      if (!val) continue;

      const numeric = parseFloat(val);
      if (isNaN(numeric)) continue;

      if (label === 'Shoe Size') {
        // Skip shoe size – unitless
        continue;
      }

      if (newUnit === 'metric') {
        // in/lbs ➜ cm/kg
        if (label === 'Weight') {
          convertedValues[label] = Math.round(numeric / 2.20462).toString(); // lbs → kg
        } else {
          convertedValues[label] = Math.round(numeric * 2.54).toString(); // inches → cm
        }
      } else {
        // cm/kg ➜ in/lbs
        if (label === 'Weight') {
          convertedValues[label] = Math.round(numeric * 2.20462).toString(); // kg → lbs
        } else {
          convertedValues[label] = Math.round(numeric / 2.54).toString(); // cm → in
        }
      }
    }

    // Convert height (already canonical in cm)
    if (heightCm) {
      if (newUnit === 'metric') {
        setCentimeters(heightCm.toString());
      } else {
        const totalInches = Math.round(heightCm / 2.54);
        const ft = Math.floor(totalInches / 12);
        const inch = totalInches % 12;
        setFeet(ft.toString());
        setInches(inch.toString());
      }
    }
    setUnitPreference(newUnit);
    setValues(convertedValues);

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        values: {...convertedValues, heightCm},
        unitPreference: newUnit,
      }),
    );
    updateProfile('unit_preference', newUnit);
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Measurements
      </Text>

      <ScrollView>
        <View style={globalStyles.section4}>
          <View style={globalStyles.backContainer}>
            <BackHeader
              title=""
              onBack={() => navigate('StyleProfileScreen')}
            />
            <Text style={globalStyles.backText}>Back</Text>
          </View>
          <View style={globalStyles.styleContainer1}>
            <View style={[styles.unitRow]}>
              <View style={styles.unitTextContainer}>
                <Text
                  style={[
                    globalStyles.sectionTitle,
                    {color: colors.foreground},
                  ]}>
                  Units: {unitPreference === 'imperial' ? 'in/lbs' : 'cm/kg'}
                </Text>
              </View>
              <View style={styles.switchContainer}>
                <AppleTouchFeedback
                  onPress={toggleUnits}
                  hapticStyle="impactLight">
                  <Switch
                    value={unitPreference === 'metric'}
                    onValueChange={toggleUnits}
                    pointerEvents="none"
                  />
                </AppleTouchFeedback>
              </View>
            </View>
          </View>
        </View>

        <View style={[globalStyles.section]}>
          <Text
            style={[globalStyles.sectionTitle4, {color: colors.foreground}]}>
            Fill out your body measurements to tailor fit suggestions:
          </Text>

          <View style={globalStyles.styleContainer1}>
            <Text
              style={[
                globalStyles.title,
                {color: colors.foreground, marginBottom: 10},
              ]}>
              Height {unitPreference === 'imperial' ? '(ft/in)' : '(cm)'}
            </Text>
            {unitPreference === 'imperial' ? (
              <View style={{flexDirection: 'row'}}>
                <TextInput
                  placeholder="ft"
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      borderColor: theme.colors.inputBorder,
                      color: colors.foreground,
                    },
                  ]}
                  keyboardType="number-pad"
                  value={feet}
                  onChangeText={handleFeetChange}
                />
                <TextInput
                  placeholder="in"
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      borderColor: theme.colors.inputBorder,
                      color: colors.foreground,
                    },
                  ]}
                  keyboardType="number-pad"
                  value={inches}
                  onChangeText={handleInchesChange}
                />
              </View>
            ) : (
              <TextInput
                placeholder="cm"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.inputBorder,
                    color: colors.foreground,
                  },
                ]}
                keyboardType="number-pad"
                value={centimeters}
                onChangeText={handleCentimetersChange}
              />
            )}

            {Object.keys(fieldMap).map(label => (
              <TextInput
                key={label}
                placeholder={`${label} ${
                  label === 'Shoe Size'
                    ? ''
                    : unitPreference === 'metric'
                    ? '(cm)'
                    : '(in)'
                }`}
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.inputBorder,
                    color: colors.foreground,
                  },
                ]}
                keyboardType={
                  label === 'Shoe Size' ? 'decimal-pad' : 'number-pad'
                }
                value={values[label] || ''}
                onChangeText={val => handleChange(label, val)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

//////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   Alert,
//   Switch,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAppTheme} from '../context/ThemeContext';
// import BackHeader from '../components/Backheader/Backheader';
// import {useAuth0} from 'react-native-auth0';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type Props = {
//   navigate: (screen: string) => void;
// };

// const STORAGE_KEY = 'userMeasurements';

// const fieldMap: Record<string, string> = {
//   Weight: 'weight',
//   Chest: 'chest',
//   Waist: 'waist',
//   Inseam: 'inseam',
//   'Shoe Size': 'shoe_size',
//   Hip: 'hip',
//   'Shoulder Width': 'shoulder_width',
// };

// export default function MeasurementsScreen({navigate}: Props) {
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
//     unitRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 15,
//     },
//     subtitle: {
//       fontSize: 17,
//       marginBottom: 20,
//     },
//     input: {
//       borderWidth: 1,
//       borderRadius: 8,
//       padding: 10,
//       marginBottom: 15,
//       fontSize: 17,
//     },
//   });

//   const [values, setValues] = useState<Record<string, string>>({});
//   const [unitPreference, setUnitPreference] = useState<'imperial' | 'metric'>(
//     'imperial',
//   );

//   const [feet, setFeet] = useState('');
//   const [inches, setInches] = useState('');
//   const [centimeters, setCentimeters] = useState('');
//   const [heightCm, setHeightCm] = useState<number | null>(null);

//   useEffect(() => {
//     AsyncStorage.getItem(STORAGE_KEY)
//       .then(data => {
//         if (data) {
//           const parsed = JSON.parse(data);
//           setValues(parsed.values || {});
//           setUnitPreference(parsed.unitPreference || 'imperial');

//           if (parsed.values?.heightCm) {
//             const cm = parseInt(parsed.values.heightCm);
//             setHeightCm(cm);
//             setCentimeters(cm.toString());
//             const totalInches = Math.round(cm / 2.54);
//             const ft = Math.floor(totalInches / 12);
//             const inch = totalInches % 12;
//             setFeet(ft.toString());
//             setInches(inch.toString());
//           }
//         }
//       })
//       .catch(() => Alert.alert('Error loading measurements'));
//   }, []);

//   const handleChange = async (label: string, input: string) => {
//     const cleaned = input.replace(/[^0-9.]/g, '');

//     const updated = {...values, [label]: cleaned};
//     setValues(updated);
//     await AsyncStorage.setItem(
//       STORAGE_KEY,
//       JSON.stringify({values: {...updated, heightCm}, unitPreference}),
//     );

//     const dbField = fieldMap[label];
//     if (dbField) {
//       const isDecimal = label === 'Shoe Size';
//       const numericValue = isDecimal ? parseFloat(cleaned) : parseInt(cleaned);
//       if (!isNaN(numericValue)) {
//         updateProfile(dbField, numericValue);
//       }
//     }
//   };

//   const handleFeetChange = async (val: string) => {
//     const ft = val.replace(/[^0-9]/g, '');
//     setFeet(ft);
//     const inch = parseInt(inches || '0');
//     const height = Math.round((parseInt(ft || '0') * 12 + inch) * 2.54);
//     setHeightCm(height);
//     setCentimeters(height.toString());

//     await AsyncStorage.setItem(
//       STORAGE_KEY,
//       JSON.stringify({
//         values: {...values, heightCm: height},
//         unitPreference,
//       }),
//     );
//     updateProfile('height', height);
//   };

//   const handleInchesChange = async (val: string) => {
//     const inch = val.replace(/[^0-9]/g, '');
//     setInches(inch);
//     const ft = parseInt(feet || '0');
//     const height = Math.round((ft * 12 + parseInt(inch || '0')) * 2.54);
//     setHeightCm(height);
//     setCentimeters(height.toString());

//     await AsyncStorage.setItem(
//       STORAGE_KEY,
//       JSON.stringify({
//         values: {...values, heightCm: height},
//         unitPreference,
//       }),
//     );
//     updateProfile('height', height);
//   };

//   const handleCentimetersChange = async (val: string) => {
//     const cm = val.replace(/[^0-9]/g, '');
//     setCentimeters(cm);
//     const height = parseInt(cm || '0');
//     setHeightCm(height);
//     const totalInches = Math.round(height / 2.54);
//     const ft = Math.floor(totalInches / 12);
//     const inch = totalInches % 12;
//     setFeet(ft.toString());
//     setInches(inch.toString());

//     await AsyncStorage.setItem(
//       STORAGE_KEY,
//       JSON.stringify({
//         values: {...values, heightCm: height},
//         unitPreference,
//       }),
//     );
//     updateProfile('height', height);
//   };

//   const toggleUnits = async () => {
//     const newUnit = unitPreference === 'imperial' ? 'metric' : 'imperial';
//     const convertedValues: Record<string, string> = {...values};

//     // Convert all other applicable fields
//     for (const label of Object.keys(fieldMap)) {
//       const val = values[label];
//       if (!val) continue;

//       const numeric = parseFloat(val);
//       if (isNaN(numeric)) continue;

//       if (label === 'Shoe Size') {
//         // Skip shoe size – unitless
//         continue;
//       }

//       if (newUnit === 'metric') {
//         // in/lbs ➜ cm/kg
//         if (label === 'Weight') {
//           convertedValues[label] = Math.round(numeric / 2.20462).toString(); // lbs → kg
//         } else {
//           convertedValues[label] = Math.round(numeric * 2.54).toString(); // inches → cm
//         }
//       } else {
//         // cm/kg ➜ in/lbs
//         if (label === 'Weight') {
//           convertedValues[label] = Math.round(numeric * 2.20462).toString(); // kg → lbs
//         } else {
//           convertedValues[label] = Math.round(numeric / 2.54).toString(); // cm → in
//         }
//       }
//     }

//     // Convert height (already canonical in cm)
//     if (heightCm) {
//       if (newUnit === 'metric') {
//         setCentimeters(heightCm.toString());
//       } else {
//         const totalInches = Math.round(heightCm / 2.54);
//         const ft = Math.floor(totalInches / 12);
//         const inch = totalInches % 12;
//         setFeet(ft.toString());
//         setInches(inch.toString());
//       }
//     }
//     setUnitPreference(newUnit);
//     setValues(convertedValues);

//     await AsyncStorage.setItem(
//       STORAGE_KEY,
//       JSON.stringify({
//         values: {...convertedValues, heightCm},
//         unitPreference: newUnit,
//       }),
//     );
//     updateProfile('unit_preference', newUnit);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Measurements
//       </Text>

//       <ScrollView style={[globalStyles.section]}>
//         <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
//         <View style={styles.unitRow}>
//           <Text style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//             Units: {unitPreference === 'imperial' ? 'in/lbs' : 'cm/kg'}
//           </Text>
//           <AppleTouchFeedback
//             onPress={toggleUnits}
//             hapticStyle="impactLight"
//             style={{borderRadius: 20, marginBottom: 25}}>
//             <Switch
//               value={unitPreference === 'metric'}
//               onValueChange={toggleUnits}
//               pointerEvents="none"
//             />
//           </AppleTouchFeedback>
//         </View>

//         <Text style={[styles.subtitle, {color: colors.foreground}]}>
//           Fill out your body measurements to tailor fit suggestions:
//         </Text>

//         <Text style={{color: colors.foreground, marginBottom: 6}}>
//           Height {unitPreference === 'imperial' ? '(ft/in)' : '(cm)'}
//         </Text>
//         {unitPreference === 'imperial' ? (
//           <View style={{flexDirection: 'row'}}>
//             <TextInput
//               placeholder="ft"
//               placeholderTextColor={colors.muted}
//               style={[
//                 styles.input,
//                 {
//                   flex: 1,
//                   borderColor: colors.surface,
//                   color: colors.foreground,
//                 },
//               ]}
//               keyboardType="number-pad"
//               value={feet}
//               onChangeText={handleFeetChange}
//             />
//             <TextInput
//               placeholder="in"
//               placeholderTextColor={colors.muted}
//               style={[
//                 styles.input,
//                 {
//                   flex: 1,
//                   borderColor: colors.surface,
//                   color: colors.foreground,
//                 },
//               ]}
//               keyboardType="number-pad"
//               value={inches}
//               onChangeText={handleInchesChange}
//             />
//           </View>
//         ) : (
//           <TextInput
//             placeholder="cm"
//             placeholderTextColor={colors.muted}
//             style={[
//               styles.input,
//               {borderColor: colors.surface, color: colors.foreground},
//             ]}
//             keyboardType="number-pad"
//             value={centimeters}
//             onChangeText={handleCentimetersChange}
//           />
//         )}

//         {Object.keys(fieldMap).map(label => (
//           <TextInput
//             key={label}
//             placeholder={`${label} ${
//               label === 'Shoe Size'
//                 ? ''
//                 : unitPreference === 'metric'
//                 ? '(cm)'
//                 : '(in)'
//             }`}
//             placeholderTextColor={colors.muted}
//             style={[
//               styles.input,
//               {borderColor: colors.surface, color: colors.foreground},
//             ]}
//             keyboardType={label === 'Shoe Size' ? 'decimal-pad' : 'number-pad'}
//             value={values[label] || ''}
//             onChangeText={val => handleChange(label, val)}
//           />
//         ))}
//       </ScrollView>
//     </View>
//   );
// }
