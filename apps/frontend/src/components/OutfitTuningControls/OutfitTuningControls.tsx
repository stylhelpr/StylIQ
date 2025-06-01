import React, {useState} from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  weather: string;
  occasion: string;
  style: string;
  onChangeWeather: (value: string) => void;
  onChangeOccasion: (value: string) => void;
  onChangeStyle: (value: string) => void;
  onRegenerate: () => void;
};

export default function OutfitTuningControls({
  weather,
  occasion,
  style,
  onChangeWeather,
  onChangeOccasion,
  onChangeStyle,
  onRegenerate,
}: Props) {
  const {theme} = useAppTheme();

  const [openWeather, setOpenWeather] = useState(false);
  const [openOccasion, setOpenOccasion] = useState(false);
  const [openStyle, setOpenStyle] = useState(false);

  const [weatherOptions] = useState([
    {label: 'Any', value: 'Any'},
    {label: 'Hot', value: 'hot'},
    {label: 'Cold', value: 'cold'},
    {label: 'Rainy', value: 'rainy'},
  ]);

  const [occasionOptions] = useState([
    {label: 'Any', value: 'Any'},
    {label: 'Casual', value: 'Casual'},
    {label: 'Formal', value: 'Formal'},
    {label: 'Business', value: 'Business'},
    {label: 'Vacation', value: 'Vacation'},
  ]);

  const [styleOptions] = useState([
    {label: 'Any', value: 'Any'},
    {label: 'Modern', value: 'modern'},
    {label: 'Minimalist', value: 'minimalist'},
    {label: 'Streetwear', value: 'streetwear'},
    {label: 'Classic', value: 'classic'},
  ]);

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      marginBottom: 20,
      paddingHorizontal: 20,
      gap: 12,
    },
    picker: {
      height: 48,
      marginBottom: 8,
      zIndex: 1000,
    },
    button: {
      height: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const getSetValue = (
    currentValue: string,
    setter: (value: string) => void,
  ) => {
    return (fn: (prev: string) => string) => {
      const newValue = fn(currentValue);
      setter(newValue);
    };
  };

  return (
    <View style={[styles.container]}>
      <View style={{zIndex: 3000, marginBottom: 12}}>
        <DropDownPicker
          open={openWeather}
          setOpen={setOpenWeather}
          value={weather}
          setValue={val => onChangeWeather(val as unknown as string)}
          items={weatherOptions}
          placeholder="Select Weather"
          listMode="SCROLLVIEW"
          style={{backgroundColor: theme.colors.surface}}
          textStyle={{color: theme.colors.foreground}}
          dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
        />
      </View>

      <View style={{zIndex: 2000, marginBottom: 12}}>
        <DropDownPicker
          open={openOccasion}
          setOpen={setOpenOccasion}
          value={occasion}
          setValue={val => onChangeOccasion(val as unknown as string)}
          items={occasionOptions}
          placeholder="Select Occasion"
          listMode="SCROLLVIEW"
          style={{backgroundColor: theme.colors.surface}}
          textStyle={{color: theme.colors.foreground}}
          dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
        />
      </View>

      <View style={{zIndex: 1000, marginBottom: 12}}>
        <DropDownPicker
          open={openStyle}
          setOpen={setOpenStyle}
          value={style}
          setValue={val => onChangeStyle(val as unknown as string)}
          items={styleOptions}
          placeholder="Select Style"
          listMode="SCROLLVIEW"
          style={{backgroundColor: theme.colors.surface}}
          textStyle={{color: theme.colors.foreground}}
          dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          {backgroundColor: theme.colors.primary, marginTop: 16},
        ]}
        onPress={onRegenerate}>
        <Text style={[styles.buttonText]}>Generate Outfit</Text>
      </TouchableOpacity>
    </View>
  );
}

///////////

// import React, {useState} from 'react';
// import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   weather: string;
//   occasion: string;
//   style: string;
//   onChangeWeather: (value: string) => void;
//   onChangeOccasion: (value: string) => void;
//   onChangeStyle: (value: string) => void;
//   onRegenerate: () => void;
// };

// export default function OutfitTuningControls({
//   weather,
//   occasion,
//   style,
//   onChangeWeather,
//   onChangeOccasion,
//   onChangeStyle,
//   onRegenerate,
// }: Props) {
//   const {theme} = useAppTheme();

//   const [openWeather, setOpenWeather] = useState(false);
//   const [openOccasion, setOpenOccasion] = useState(false);
//   const [openStyle, setOpenStyle] = useState(false);

//   const [weatherOptions] = useState([
//     {label: 'Any', value: 'Any'},
//     {label: 'Hot', value: 'hot'},
//     {label: 'Cold', value: 'cold'},
//     {label: 'Rainy', value: 'rainy'},
//   ]);

//   const [occasionOptions] = useState([
//     {label: 'Any', value: 'Any'},
//     {label: 'Casual', value: 'Casual'},
//     {label: 'Formal', value: 'Formal'},
//     {label: 'Business', value: 'Business'},
//     {label: 'Vacation', value: 'Vacation'},
//   ]);

//   const [styleOptions] = useState([
//     {label: 'Any', value: 'Any'},
//     {label: 'Modern', value: 'modern'},
//     {label: 'Minimalist', value: 'minimalist'},
//     {label: 'Streetwear', value: 'streetwear'},
//     {label: 'Classic', value: 'classic'},
//   ]);

//   const styles = StyleSheet.create({
//     container: {
//       width: '100%',
//       marginBottom: 20,
//       paddingHorizontal: 20,
//       gap: 12,
//     },
//     picker: {
//       height: 48,
//       marginBottom: 8,
//       zIndex: 1000,
//     },
//     button: {
//       height: 48,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginTop: 12,
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//   });

//   const getSetValue = (
//     currentValue: string,
//     setter: (value: string) => void,
//   ) => {
//     return (fn: (prev: string) => string) => {
//       const newValue = fn(currentValue);
//       setter(newValue);
//     };
//   };

//   return (
//     <View style={styles.container}>
//       <DropDownPicker
//         open={openWeather}
//         setOpen={setOpenWeather}
//         value={weather}
//         setValue={val => onChangeWeather(val as unknown as string)}
//         items={weatherOptions}
//         placeholder="Select Weather"
//         listMode="SCROLLVIEW"
//         containerStyle={styles.picker}
//         style={{backgroundColor: theme.colors.surface}}
//         textStyle={{color: theme.colors.foreground}}
//         dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//       />

//       <DropDownPicker
//         open={openOccasion}
//         setOpen={setOpenOccasion}
//         value={occasion}
//         setValue={val => onChangeOccasion(val as unknown as string)}
//         items={occasionOptions}
//         placeholder="Select Occasion"
//         listMode="SCROLLVIEW"
//         containerStyle={styles.picker}
//         style={{backgroundColor: theme.colors.surface}}
//         textStyle={{color: theme.colors.foreground}}
//         dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//       />

//       <DropDownPicker
//         open={openStyle}
//         setOpen={setOpenStyle}
//         value={style}
//         setValue={val => onChangeStyle(val as unknown as string)}
//         items={styleOptions}
//         placeholder="Select Style"
//         listMode="SCROLLVIEW"
//         containerStyle={styles.picker}
//         style={{backgroundColor: theme.colors.surface}}
//         textStyle={{color: theme.colors.foreground}}
//         dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//       />

//       <TouchableOpacity
//         style={[styles.button, {backgroundColor: theme.colors.primary}]}
//         onPress={onRegenerate}>
//         <Text style={[styles.buttonText, {color: theme.colors.foreground}]}>
//           Generate Outfit
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

////////////

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {Picker} from '@react-native-picker/picker';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   occasion: string;
//   weather: string;
//   style: string;
//   onChangeOccasion: (value: string) => void;
//   onChangeWeather: (value: string) => void;
//   onChangeStyle: (value: string) => void;
//   onGenerate?: () => void;
//   onRegenerate?: () => void;
// };

// const occasions = ['Any', 'Casual', 'Formal', 'Workout', 'Date', 'Beach'];
// const weathers = ['Any', 'Hot', 'Cold', 'Rainy', 'Snowy'];
// const styleOptions = ['Any', 'Modern', 'Vintage', 'Minimal', 'Streetwear'];

// export default function OutfitTuningControls({
//   occasion,
//   weather,
//   style,
//   onChangeOccasion,
//   onChangeWeather,
//   onChangeStyle,
//   onGenerate,
//   onRegenerate,
// }: Props) {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     wrapper: {
//       padding: 12,
//       marginBottom: 20,
//     },
//     label: {
//       fontSize: 18,
//       fontWeight: '600',
//       marginBottom: 8,
//     },
//     subLabel: {
//       fontSize: 14,
//       marginTop: 12,
//       marginBottom: 4,
//     },
//     picker: {
//       height: 40,
//       backgroundColor: 'transparent',
//     },
//     button: {
//       marginTop: 16,
//       padding: 12,
//       borderRadius: 10,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontWeight: '600',
//       fontSize: 15,
//       color: '#fff',
//     },
//   });

//   return (
//     <View style={styles.wrapper}>
//       <Text style={[styles.label, {color: theme.colors.foreground}]}>
//         Tune Your Outfit:
//       </Text>

//       <Text style={[styles.subLabel, {color: theme.colors.foreground2}]}>
//         Occasion
//       </Text>
//       <Picker
//         selectedValue={occasion}
//         onValueChange={onChangeOccasion}
//         style={[styles.picker, {color: theme.colors.foreground}]}>
//         {occasions.map(o => (
//           <Picker.Item label={o} value={o} key={o} />
//         ))}
//       </Picker>

//       <Text style={[styles.subLabel, {color: theme.colors.foreground2}]}>
//         Weather
//       </Text>
//       <Picker
//         selectedValue={weather}
//         onValueChange={onChangeWeather}
//         style={[styles.picker, {color: theme.colors.foreground}]}>
//         {weathers.map(w => (
//           <Picker.Item label={w} value={w} key={w} />
//         ))}
//       </Picker>

//       <Text style={[styles.subLabel, {color: theme.colors.foreground2}]}>
//         Style
//       </Text>
//       <Picker
//         selectedValue={style}
//         onValueChange={onChangeStyle}
//         style={[styles.picker, {color: theme.colors.foreground}]}>
//         {styleOptions.map(s => (
//           <Picker.Item label={s} value={s} key={s} />
//         ))}
//       </Picker>

//       <TouchableOpacity
//         style={[styles.button, {backgroundColor: theme.colors.primary}]}
//         onPress={onGenerate}>
//         <Text style={styles.buttonText}>🎯 Generate Outfit</Text>
//       </TouchableOpacity>

//       <TouchableOpacity
//         style={[styles.button, {backgroundColor: '#444'}]}
//         onPress={onRegenerate}>
//         <Text style={styles.buttonText}>🔄 Regenerate</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

/////////////

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {Picker} from '@react-native-picker/picker';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   occasion: string;
//   weather: string;
//   style: string;
//   onChangeOccasion: (value: string) => void;
//   onChangeWeather: (value: string) => void;
//   onChangeStyle: (value: string) => void;
//   onGenerate?: () => void;
//   onRegenerate?: () => void;
// };

// const occasions = ['Any', 'Casual', 'Formal', 'Workout', 'Date', 'Beach'];
// const weathers = ['Any', 'Hot', 'Cold', 'Rainy', 'Snowy'];
// const styles = ['Any', 'Modern', 'Vintage', 'Minimal', 'Streetwear'];

// export default function OutfitTuningControls({
//   occasion,
//   weather,
//   style,
//   onChangeOccasion,
//   onChangeWeather,
//   onChangeStyle,
//   onGenerate,
//   onRegenerate,
// }: Props) {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     wrapper: {
//       padding: 12,
//       marginBottom: 20,
//     },
//     label: {
//       fontSize: 18,
//       fontWeight: '600',
//       marginBottom: 8,
//     },
//     subLabel: {
//       fontSize: 14,
//       marginTop: 12,
//       marginBottom: 4,
//     },
//     picker: {
//       height: 40,
//       backgroundColor: 'transparent',
//     },
//     button: {
//       marginTop: 16,
//       padding: 12,
//       borderRadius: 10,
//       alignItems: 'center',
//     },
//     buttonText: {
//       fontWeight: '600',
//       fontSize: 15,
//       color: '#fff',
//     },
//   });

//   return (
//     <View style={styles.wrapper}>
//       <Text style={[styles.label, {color: theme.colors.foreground}]}>
//         Tune Your Outfit:
//       </Text>

//       <Text style={[styles.subLabel, {color: theme.colors.foreground2}]}>
//         Occasion
//       </Text>
//       <Picker
//         selectedValue={occasion}
//         onValueChange={setOccasion}
//         style={[styles.picker, {color: theme.colors.foreground}]}>
//         {occasions.map(o => (
//           <Picker.Item label={o} value={o} key={o} />
//         ))}
//       </Picker>

//       <Text style={[styles.subLabel, {color: theme.colors.foreground2}]}>
//         Weather
//       </Text>
//       <Picker
//         selectedValue={weather}
//         onValueChange={setWeather}
//         style={[styles.picker, {color: theme.colors.foreground}]}>
//         {weathers.map(w => (
//           <Picker.Item label={w} value={w} key={w} />
//         ))}
//       </Picker>

//       <Text style={[styles.subLabel, {color: theme.colors.foreground2}]}>
//         Style
//       </Text>
//       <Picker
//         selectedValue={style}
//         onValueChange={setStyle}
//         style={[styles.picker, {color: theme.colors.foreground}]}>
//         {styles.map(s => (
//           <Picker.Item label={s} value={s} key={s} />
//         ))}
//       </Picker>

//       <TouchableOpacity
//         style={[styles.button, {backgroundColor: theme.colors.primary}]}
//         onPress={onGenerate}>
//         <Text style={styles.buttonText}>🎯 Generate Outfit</Text>
//       </TouchableOpacity>

//       <TouchableOpacity
//         style={[styles.button, {backgroundColor: '#444'}]}
//         onPress={onRegenerate}>
//         <Text style={styles.buttonText}>🔄 Regenerate</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }
