// apps/mobile/src/components/OutfitTuningControls/OutfitTuningControls.tsx
import React, {useState} from 'react';
import {View, TouchableOpacity, Text, StyleSheet, Switch} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  // Current selected values coming from parent screen
  weather: string;
  occasion: string;
  style: string;

  // Callbacks to push changes up to the parent (controlled inputs)
  onChangeWeather: (value: string) => void;
  onChangeOccasion: (value: string) => void;
  onChangeStyle: (value: string) => void;

  // Weather toggle
  useWeather: boolean;
  onToggleWeather: (enabled: boolean) => void;

  // Trigger a backend re-generation using the current filters
  onRegenerate: () => void;

  // Optional: disable the CTA while a request is in-flight
  onGenerate?: () => void; // kept for compatibility
  isGenerating?: boolean;
};

export default function OutfitTuningControls({
  weather,
  occasion,
  style,
  onChangeWeather,
  onChangeOccasion,
  onChangeStyle,
  onRegenerate,
  useWeather,
  onToggleWeather,
  isGenerating = false,
}: Props) {
  const {theme} = useAppTheme();

  // Local UI state to open/close each dropdown menu.
  const [openWeather, setOpenWeather] = useState(false);
  const [openOccasion, setOpenOccasion] = useState(false);
  const [openStyle, setOpenStyle] = useState(false);

  // Option lists
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

  // Layout styles
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
      {/* WEATHER */}
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
        {/* Weather toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
          }}>
          <Switch
            value={useWeather}
            onValueChange={onToggleWeather}
            trackColor={{false: '#767577', true: '#405de6'}}
            thumbColor={useWeather ? '#fff' : '#f4f3f4'}
          />
          <Text style={{marginLeft: 8, color: theme.colors.foreground}}>
            Use Weather
          </Text>
        </View>
      </View>

      {/* OCCASION */}
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

      {/* STYLE */}
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

      {/* Generate CTA */}
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

// // apps/mobile/src/components/OutfitTuningControls/OutfitTuningControls.tsx
// import React, {useState} from 'react';
// import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   // Current selected values coming from parent screen
//   weather: string;
//   occasion: string;
//   style: string;

//   // Callbacks to push changes up to the parent (controlled inputs)
//   onChangeWeather: (value: string) => void;
//   onChangeOccasion: (value: string) => void;
//   onChangeStyle: (value: string) => void;

//   // Trigger a backend re-generation using the current filters
//   onRegenerate: () => void;

//   // Optional: disable the CTA while a request is in-flight
//   onGenerate?: () => void; // kept for compatibility
//   isGenerating?: boolean;
// };

// export default function OutfitTuningControls({
//   weather,
//   occasion,
//   style,
//   onChangeWeather,
//   onChangeOccasion,
//   onChangeStyle,
//   onRegenerate,
//   isGenerating = false,
// }: Props) {
//   const {theme} = useAppTheme();

//   // Local UI state to open/close each dropdown menu.
//   // We keep these separate so only one menu is open at a time.
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openOccasion, setOpenOccasion] = useState(false);
//   const [openStyle, setOpenStyle] = useState(false);

//   // Option lists (labels shown to users, values passed back to parent)
//   const weatherOptions = [
//     {label: 'Any', value: 'Any'},
//     {label: 'Hot', value: 'hot'},
//     {label: 'Cold', value: 'cold'},
//     {label: 'Rainy', value: 'rainy'},
//   ];

//   const occasionOptions = [
//     {label: 'Any', value: 'Any'},
//     {label: 'Casual', value: 'Casual'},
//     {label: 'Formal', value: 'Formal'},
//     {label: 'Business', value: 'Business'},
//     {label: 'Vacation', value: 'Vacation'},
//   ];

//   const styleOptions = [
//     {label: 'Any', value: 'Any'},
//     {label: 'Modern', value: 'modern'},
//     {label: 'Minimalist', value: 'minimalist'},
//     {label: 'Streetwear', value: 'streetwear'},
//     {label: 'Classic', value: 'classic'},
//   ];

//   // Basic layout styles; colors come from theme for dark/light support
//   const styles = StyleSheet.create({
//     container: {
//       width: '100%',
//       marginBottom: 20,
//       paddingHorizontal: 20,
//       gap: 12,
//     },
//     button: {
//       height: 48,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginTop: 16,
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//     },
//   });

//   return (
//     <View style={styles.container}>
//       {/* Each picker is "controlled" by props.value + props.setValue
//           and a local open/close toggle. We also close siblings when one opens.
//           zIndex is important so the dropdown menu overlays the content below. */}

//       {/* WEATHER */}
//       <View style={{zIndex: 3000, marginBottom: 12}}>
//         <DropDownPicker
//           open={openWeather}
//           setOpen={(v: boolean) => {
//             setOpenWeather(v);
//             if (v) {
//               // ensure only one dropdown is open at a time
//               setOpenOccasion(false);
//               setOpenStyle(false);
//             }
//           }}
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

//       {/* OCCASION */}
//       <View style={{zIndex: 2000, marginBottom: 12}}>
//         <DropDownPicker
//           open={openOccasion}
//           setOpen={(v: boolean) => {
//             setOpenOccasion(v);
//             if (v) {
//               setOpenWeather(false);
//               setOpenStyle(false);
//             }
//           }}
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

//       {/* STYLE */}
//       <View style={{zIndex: 1000, marginBottom: 12}}>
//         <DropDownPicker
//           open={openStyle}
//           setOpen={(v: boolean) => {
//             setOpenStyle(v);
//             if (v) {
//               setOpenWeather(false);
//               setOpenOccasion(false);
//             }
//           }}
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

//       {/* Generate CTA
//          - Disables while a request is running
//          - Slight color/opacity change for feedback */}
//       <TouchableOpacity
//         style={[
//           styles.button,
//           {
//             backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//             opacity: isGenerating ? 0.7 : 1,
//           },
//         ]}
//         onPress={onRegenerate}
//         disabled={isGenerating}>
//         <Text style={[styles.buttonText, {color: '#fff'}]}>
//           {isGenerating ? 'Generating…' : 'Generate Outfit'}
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }
