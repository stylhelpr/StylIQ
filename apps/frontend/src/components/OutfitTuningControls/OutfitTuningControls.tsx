import React, {useState} from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
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
  onGenerate?: () => void; // kept for compatibility
  isGenerating?: boolean; // optional: disable button while loading
};

export default function OutfitTuningControls({
  weather,
  occasion,
  style,
  onChangeWeather,
  onChangeOccasion,
  onChangeStyle,
  onRegenerate,
  isGenerating = false,
}: Props) {
  const {theme} = useAppTheme();

  const [openWeather, setOpenWeather] = useState(false);
  const [openOccasion, setOpenOccasion] = useState(false);
  const [openStyle, setOpenStyle] = useState(false);

  const weatherOptions = [
    {label: 'Any', value: 'Any'},
    {label: 'Hot', value: 'hot'},
    {label: 'Cold', value: 'cold'},
    {label: 'Rainy', value: 'rainy'},
  ];

  const occasionOptions = [
    {label: 'Any', value: 'Any'},
    {label: 'Casual', value: 'Casual'},
    {label: 'Formal', value: 'Formal'},
    {label: 'Business', value: 'Business'},
    {label: 'Vacation', value: 'Vacation'},
  ];

  const styleOptions = [
    {label: 'Any', value: 'Any'},
    {label: 'Modern', value: 'modern'},
    {label: 'Minimalist', value: 'minimalist'},
    {label: 'Streetwear', value: 'streetwear'},
    {label: 'Classic', value: 'classic'},
  ];

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      marginBottom: 20,
      paddingHorizontal: 20,
      gap: 12,
    },
    button: {
      height: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <View style={{zIndex: 3000, marginBottom: 12}}>
        <DropDownPicker
          open={openWeather}
          setOpen={(v: boolean) => {
            setOpenWeather(v);
            if (v) {
              setOpenOccasion(false);
              setOpenStyle(false);
            }
          }}
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
          setOpen={(v: boolean) => {
            setOpenOccasion(v);
            if (v) {
              setOpenWeather(false);
              setOpenStyle(false);
            }
          }}
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
          setOpen={(v: boolean) => {
            setOpenStyle(v);
            if (v) {
              setOpenWeather(false);
              setOpenOccasion(false);
            }
          }}
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
          {
            backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
            opacity: isGenerating ? 0.7 : 1,
          },
        ]}
        onPress={onRegenerate}
        disabled={isGenerating}>
        <Text style={[styles.buttonText, {color: '#fff'}]}>
          {isGenerating ? 'Generating…' : 'Generate Outfit'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/////////////////

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
//   onGenerate?: () => void;
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
//     <View style={[styles.container]}>
//       <View style={{zIndex: 3000, marginBottom: 12}}>
//         <DropDownPicker
//           open={openWeather}
//           setOpen={setOpenWeather}
//           value={weather}
//           setValue={val => onChangeWeather(val as unknown as string)}
//           items={weatherOptions}
//           placeholder="Select Weather"
//           listMode="SCROLLVIEW"
//           style={{backgroundColor: theme.colors.surface}}
//           textStyle={{color: theme.colors.foreground}}
//           dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//         />
//       </View>

//       <View style={{zIndex: 2000, marginBottom: 12}}>
//         <DropDownPicker
//           open={openOccasion}
//           setOpen={setOpenOccasion}
//           value={occasion}
//           setValue={val => onChangeOccasion(val as unknown as string)}
//           items={occasionOptions}
//           placeholder="Select Occasion"
//           listMode="SCROLLVIEW"
//           style={{backgroundColor: theme.colors.surface}}
//           textStyle={{color: theme.colors.foreground}}
//           dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//         />
//       </View>

//       <View style={{zIndex: 1000, marginBottom: 12}}>
//         <DropDownPicker
//           open={openStyle}
//           setOpen={setOpenStyle}
//           value={style}
//           setValue={val => onChangeStyle(val as unknown as string)}
//           items={styleOptions}
//           placeholder="Select Style"
//           listMode="SCROLLVIEW"
//           style={{backgroundColor: theme.colors.surface}}
//           textStyle={{color: theme.colors.foreground}}
//           dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//         />
//       </View>

//       <TouchableOpacity
//         style={[styles.button, {backgroundColor: '#405de6', marginTop: 16}]}
//         onPress={onRegenerate}>
//         <Text style={[styles.buttonText]}>Generate Outfit</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }
