import React, {useState} from 'react';
import {View, TouchableOpacity, Text, StyleSheet, Switch} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import {useAppTheme} from '../../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
  occasion: string;
  style: string;
  onChangeWeather: (value: string) => void;
  onChangeOccasion: (value: string) => void;
  onChangeStyle: (value: string) => void;
  useWeather: boolean;
  onToggleWeather: (enabled: boolean) => void;
  onRegenerate: () => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
  statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"
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
  statusText,
}: Props) {
  const {theme} = useAppTheme();

  // Dropdown state
  const [openWeather, setOpenWeather] = useState(false);
  const [openOccasion, setOpenOccasion] = useState(false);
  const [openStyle, setOpenStyle] = useState(false);

  // Panels
  const [showWeatherPicker, setShowWeatherPicker] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Options
  const weatherOptions = [
    {label: 'Use My Location (Auto)', value: 'auto'},
    {label: "It's Hot", value: 'hot'},
    {label: "It's Cold", value: 'cold'},
    {label: "It's Rainy", value: 'rainy'},
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

  const S = StyleSheet.create({
    container: {width: '100%', paddingHorizontal: 20, gap: 12},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    subRow: {flexDirection: 'row', alignItems: 'center'},
    label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
    faint: {color: theme.colors.muted, fontSize: 12},
    pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
    pillPrimary: {backgroundColor: isGenerating ? '#7a88ff' : '#405de6'},
    pillPrimary2: {backgroundColor: isGenerating ? '#7a88ff' : '#474747ff'},
    pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
    cta: {
      height: 48,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
      opacity: isGenerating ? 0.7 : 1,
      marginTop: 8,
      marginBottom: 12,
    },
    ctaText: {color: '#fff', fontSize: 16, fontWeight: '600'},
    section: {gap: 10},
    // Icon button style for the gear (kept for future use)
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // ⬇️ NEW: wrappers to raise stacking when a dropdown is open
    ddWrapper: {position: 'relative', zIndex: 1},
    ddWrapperOpen: {position: 'relative', zIndex: 9999, elevation: 9999},
  });

  const weatherDisabled = !useWeather;

  // Tiny current-mode label
  const modeLabel = useWeather
    ? weather === 'auto'
      ? 'Auto'
      : weather === 'hot'
      ? 'Hot'
      : weather === 'cold'
      ? 'Cold'
      : 'Rainy'
    : 'Off';

  return (
    <View style={S.container}>
      {/* Weather row: switch + mode label + change button */}
      <View style={[S.row, {marginTop: 6}]}>
        <View style={S.subRow}>
          <Switch
            value={useWeather}
            onValueChange={enabled => {
              onToggleWeather(enabled);
              if (!enabled) setShowWeatherPicker(false);
            }}
            trackColor={{false: '#767577', true: '#405de6'}}
            thumbColor={useWeather ? '#fff' : '#f4f3f4'}
          />
          <Text style={S.label}>Use Weather</Text>
          <Text style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
            ({modeLabel})
          </Text>
        </View>

        <TouchableOpacity
          disabled={weatherDisabled}
          onPress={() => setShowWeatherPicker(s => !s)}
          activeOpacity={0.8}
          style={[
            S.pill,
            S.pillPrimary2,
            {opacity: weatherDisabled ? 0.0 : 1},
          ]}>
          <Text style={S.pillTextPrimary}>
            {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Weather picker (collapsed by default) */}
      {showWeatherPicker && (
        <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
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
            placeholder={
              useWeather ? 'Choose weather option' : 'Weather (disabled)'
            }
            listMode="SCROLLVIEW"
            dropDownDirection="AUTO" // ⬅️ flip up/down to avoid clipping
            style={{backgroundColor: theme.colors.surface}}
            textStyle={{color: theme.colors.foreground}}
            dropDownContainerStyle={{
              backgroundColor: theme.colors.surface,
              zIndex: 9999, // ⬅️ ensure menu overlays siblings (iOS)
              elevation: 9999, // ⬅️ ensure on Android too
            }}
            disabled={weatherDisabled}
          />
          <Text style={[S.faint, {marginTop: 6}]}>
            {useWeather
              ? 'Auto uses your current location.'
              : 'Weather is off — outfits ignore weather.'}
          </Text>
        </View>
      )}

      {/* Secondary row: gear icon toggles Occasion/Style */}
      {/* KEEP BELOW HERE DO NOT DELETE */}
      <View style={[S.row, {marginTop: 4}]}>
        <Text style={[S.faint]}>Advanced Controls</Text>

        <TouchableOpacity
          onPress={() => {
            if (showMoreOptions) {
              setOpenOccasion(false);
              setOpenStyle(false);
            }
            setShowMoreOptions(s => !s);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={showMoreOptions ? 'Hide options' : 'Show options'}
          testID="options-gear-button"
          style={S.iconBtn}>
          <MaterialIcons
            name="settings" // or "tune" if you prefer sliders
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Occasion + Style (hidden until expanded) */}
      {showMoreOptions && (
        <View style={S.section}>
          {/* Occasion */}
          <View style={openOccasion ? S.ddWrapperOpen : S.ddWrapper}>
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
              dropDownDirection="AUTO"
              style={{backgroundColor: theme.colors.surface}}
              textStyle={{color: theme.colors.foreground}}
              dropDownContainerStyle={{
                backgroundColor: theme.colors.surface,
                zIndex: 9999,
                elevation: 9999,
              }}
            />
          </View>

          {/* Style */}
          <View style={openStyle ? S.ddWrapperOpen : S.ddWrapper}>
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
              dropDownDirection="AUTO"
              style={{backgroundColor: theme.colors.surface}}
              textStyle={{color: theme.colors.foreground}}
              dropDownContainerStyle={{
                backgroundColor: theme.colors.surface,
                zIndex: 9999,
                elevation: 9999,
              }}
            />
          </View>
        </View>
      )}

      {/* Primary CTA */}
      <TouchableOpacity
        style={S.cta}
        onPress={onRegenerate}
        disabled={isGenerating}>
        <Text style={S.ctaText}>
          {isGenerating ? 'Generating…' : 'Generate Outfit'}
        </Text>
      </TouchableOpacity>

      {/* Status line below CTA */}
      {statusText ? (
        <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
      ) : null}
    </View>
  );
}

//////////////////

// import React, {useState} from 'react';
// import {View, TouchableOpacity, Text, StyleSheet, Switch} from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   occasion: string;
//   style: string;
//   onChangeWeather: (value: string) => void;
//   onChangeOccasion: (value: string) => void;
//   onChangeStyle: (value: string) => void;
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;
//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   isGenerating?: boolean;
//   statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"
// };

// export default function OutfitTuningControls({
//   weather,
//   occasion,
//   style,
//   onChangeWeather,
//   onChangeOccasion,
//   onChangeStyle,
//   onRegenerate,
//   useWeather,
//   onToggleWeather,
//   isGenerating = false,
//   statusText,
// }: Props) {
//   const {theme} = useAppTheme();

//   // Dropdown state
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openOccasion, setOpenOccasion] = useState(false);
//   const [openStyle, setOpenStyle] = useState(false);

//   // Panels
//   const [showWeatherPicker, setShowWeatherPicker] = useState(false);
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // Options
//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: "It's Hot", value: 'hot'},
//     {label: "It's Cold", value: 'cold'},
//     {label: "It's Rainy", value: 'rainy'},
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

//   const S = StyleSheet.create({
//     container: {width: '100%', paddingHorizontal: 20, gap: 12},
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},
//     pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
//     pillPrimary: {backgroundColor: isGenerating ? '#7a88ff' : '#405de6'},
//     pillPrimary2: {backgroundColor: isGenerating ? '#7a88ff' : '#474747ff'},
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
//     cta: {
//       height: 48,
//       borderRadius: 10,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 8,
//       marginBottom: 12,
//     },
//     ctaText: {color: '#fff', fontSize: 16, fontWeight: '600'},
//     section: {gap: 10},
//     // Icon button style for the gear (kept for future use)
//     iconBtn: {
//       width: 36,
//       height: 36,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     // ⬇️ NEW: wrappers to raise stacking when a dropdown is open
//     ddWrapper: {position: 'relative', zIndex: 1},
//     ddWrapperOpen: {position: 'relative', zIndex: 9999, elevation: 9999},
//   });

//   const weatherDisabled = !useWeather;

//   // Tiny current-mode label
//   const modeLabel = useWeather
//     ? weather === 'auto'
//       ? 'Auto'
//       : weather === 'hot'
//       ? 'Hot'
//       : weather === 'cold'
//       ? 'Cold'
//       : 'Rainy'
//     : 'Off';

//   return (
//     <View style={S.container}>
//       {/* Weather row: switch + mode label + change button */}
//       <View style={[S.row, {marginTop: 6}]}>
//         <View style={S.subRow}>
//           <Switch
//             value={useWeather}
//             onValueChange={enabled => {
//               onToggleWeather(enabled);
//               if (!enabled) setShowWeatherPicker(false);
//             }}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={S.label}>Use Weather</Text>
//           <Text style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//             ({modeLabel})
//           </Text>
//         </View>

//         <TouchableOpacity
//           disabled={weatherDisabled}
//           onPress={() => setShowWeatherPicker(s => !s)}
//           activeOpacity={0.8}
//           style={[
//             S.pill,
//             S.pillPrimary2,
//             {opacity: weatherDisabled ? 0.0 : 1},
//           ]}>
//           <Text style={S.pillTextPrimary}>
//             {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Weather picker (collapsed by default) */}
//       {showWeatherPicker && (
//         <View style={openWeather ? S.ddWrapperOpen : S.ddWrapper}>
//           <DropDownPicker
//             open={openWeather}
//             setOpen={(v: boolean) => {
//               setOpenWeather(v);
//               if (v) {
//                 setOpenOccasion(false);
//                 setOpenStyle(false);
//               }
//             }}
//             value={weather}
//             setValue={val => onChangeWeather(val as unknown as string)}
//             items={weatherOptions}
//             placeholder={
//               useWeather ? 'Choose weather option' : 'Weather (disabled)'
//             }
//             listMode="SCROLLVIEW"
//             dropDownDirection="AUTO" // ⬅️ flip up/down to avoid clipping
//             style={{backgroundColor: theme.colors.surface}}
//             textStyle={{color: theme.colors.foreground}}
//             dropDownContainerStyle={{
//               backgroundColor: theme.colors.surface,
//               zIndex: 9999, // ⬅️ ensure menu overlays siblings (iOS)
//               elevation: 9999, // ⬅️ ensure on Android too
//             }}
//             disabled={weatherDisabled}
//           />
//           <Text style={[S.faint, {marginTop: 6}]}>
//             {useWeather
//               ? 'Auto uses your current location.'
//               : 'Weather is off — outfits ignore weather.'}
//           </Text>
//         </View>
//       )}

//       {/* Secondary row: gear icon toggles Occasion/Style */}
//       {/* KEEP BELOW HERE DO NOT DELETE */}
//       {/* <View style={[S.row, {marginTop: 4}]}>
//         <Text style={[S.faint]}>Advanced Controls</Text>

//         <TouchableOpacity
//           onPress={() => {
//             if (showMoreOptions) {
//               setOpenOccasion(false);
//               setOpenStyle(false);
//             }
//             setShowMoreOptions(s => !s);
//           }}
//           activeOpacity={0.8}
//           accessibilityRole="button"
//           accessibilityLabel={showMoreOptions ? 'Hide options' : 'Show options'}
//           testID="options-gear-button"
//           style={S.iconBtn}>
//           <MaterialIcons
//             name="settings" // or "tune" if you prefer sliders
//             size={20}
//             color={theme.colors.primary}
//           />
//         </TouchableOpacity>
//       </View> */}

//       {/* Occasion + Style (hidden until expanded) */}
//       {showMoreOptions && (
//         <View style={S.section}>
//           {/* Occasion */}
//           <View style={openOccasion ? S.ddWrapperOpen : S.ddWrapper}>
//             <DropDownPicker
//               open={openOccasion}
//               setOpen={(v: boolean) => {
//                 setOpenOccasion(v);
//                 if (v) {
//                   setOpenWeather(false);
//                   setOpenStyle(false);
//                 }
//               }}
//               value={occasion}
//               setValue={val => onChangeOccasion(val as unknown as string)}
//               items={occasionOptions}
//               placeholder="Select Occasion"
//               listMode="SCROLLVIEW"
//               dropDownDirection="AUTO"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{
//                 backgroundColor: theme.colors.surface,
//                 zIndex: 9999,
//                 elevation: 9999,
//               }}
//             />
//           </View>

//           {/* Style */}
//           <View style={openStyle ? S.ddWrapperOpen : S.ddWrapper}>
//             <DropDownPicker
//               open={openStyle}
//               setOpen={(v: boolean) => {
//                 setOpenStyle(v);
//                 if (v) {
//                   setOpenWeather(false);
//                   setOpenOccasion(false);
//                 }
//               }}
//               value={style}
//               setValue={val => onChangeStyle(val as unknown as string)}
//               items={styleOptions}
//               placeholder="Select Style"
//               listMode="SCROLLVIEW"
//               dropDownDirection="AUTO"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{
//                 backgroundColor: theme.colors.surface,
//                 zIndex: 9999,
//                 elevation: 9999,
//               }}
//             />
//           </View>
//         </View>
//       )}

//       {/* Primary CTA */}
//       <TouchableOpacity
//         style={S.cta}
//         onPress={onRegenerate}
//         disabled={isGenerating}>
//         <Text style={S.ctaText}>
//           {isGenerating ? 'Generating…' : 'Generate Outfit'}
//         </Text>
//       </TouchableOpacity>

//       {/* Status line below CTA */}
//       {statusText ? (
//         <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//       ) : null}
//     </View>
//   );
// }

////////////////////

// import React, {useState} from 'react';
// import {View, TouchableOpacity, Text, StyleSheet, Switch} from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   occasion: string;
//   style: string;
//   onChangeWeather: (value: string) => void;
//   onChangeOccasion: (value: string) => void;
//   onChangeStyle: (value: string) => void;
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;
//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   isGenerating?: boolean;
//   statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"
// };

// export default function OutfitTuningControls({
//   weather,
//   occasion,
//   style,
//   onChangeWeather,
//   onChangeOccasion,
//   onChangeStyle,
//   onRegenerate,
//   useWeather,
//   onToggleWeather,
//   isGenerating = false,
//   statusText,
// }: Props) {
//   const {theme} = useAppTheme();

//   // Dropdown state
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openOccasion, setOpenOccasion] = useState(false);
//   const [openStyle, setOpenStyle] = useState(false);

//   // Panels
//   const [showWeatherPicker, setShowWeatherPicker] = useState(false);
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // Options
//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: "It's Hot", value: 'hot'},
//     {label: "It's Cold", value: 'cold'},
//     {label: "It's Rainy", value: 'rainy'},
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

//   const S = StyleSheet.create({
//     container: {width: '100%', paddingHorizontal: 20, gap: 12},
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},
//     pill: {borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12},
//     pillPrimary: {backgroundColor: isGenerating ? '#7a88ff' : '#405de6'},
//     pillPrimary2: {backgroundColor: isGenerating ? '#7a88ff' : '#474747ff'},
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
//     cta: {
//       height: 48,
//       borderRadius: 10,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 8,
//       marginBottom: 12,
//     },
//     ctaText: {color: '#fff', fontSize: 16, fontWeight: '600'},
//     section: {gap: 10},
//     // NEW: icon button style for the gear
//     iconBtn: {
//       width: 36,
//       height: 36,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//   });

//   const weatherDisabled = !useWeather;

//   // Tiny current-mode label
//   const modeLabel = useWeather
//     ? weather === 'auto'
//       ? 'Auto'
//       : weather === 'hot'
//       ? 'Hot'
//       : weather === 'cold'
//       ? 'Cold'
//       : 'Rainy'
//     : 'Off';

//   return (
//     <View style={S.container}>
//       {/* Weather row: switch + mode label + change button */}
//       <View style={[S.row, {marginTop: 6}]}>
//         <View style={S.subRow}>
//           <Switch
//             value={useWeather}
//             onValueChange={enabled => {
//               onToggleWeather(enabled);
//               if (!enabled) setShowWeatherPicker(false);
//             }}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={S.label}>Use Weather</Text>
//           <Text style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//             ({modeLabel})
//           </Text>
//         </View>

//         <TouchableOpacity
//           disabled={weatherDisabled}
//           onPress={() => setShowWeatherPicker(s => !s)}
//           activeOpacity={0.8}
//           style={[
//             S.pill,
//             S.pillPrimary2,
//             {opacity: weatherDisabled ? 0.0 : 1},
//           ]}>
//           <Text style={S.pillTextPrimary}>
//             {showWeatherPicker ? 'Hide Controls' : 'Advanced Weather'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Weather picker (collapsed by default) */}
//       {showWeatherPicker && (
//         <View style={{zIndex: 3000}}>
//           <DropDownPicker
//             open={openWeather}
//             setOpen={(v: boolean) => {
//               setOpenWeather(v);
//               if (v) {
//                 setOpenOccasion(false);
//                 setOpenStyle(false);
//               }
//             }}
//             value={weather}
//             setValue={val => onChangeWeather(val as unknown as string)}
//             items={weatherOptions}
//             placeholder={
//               useWeather ? 'Choose weather option' : 'Weather (disabled)'
//             }
//             listMode="SCROLLVIEW"
//             style={{backgroundColor: theme.colors.surface}}
//             textStyle={{color: theme.colors.foreground}}
//             dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             disabled={weatherDisabled}
//           />
//           <Text style={[S.faint, {marginTop: 6}]}>
//             {useWeather
//               ? 'Auto uses your current location.'
//               : 'Weather is off — outfits ignore weather.'}
//           </Text>
//         </View>
//       )}

//       {/* Secondary row: gear icon toggles Occasion/Style */}
//       {/* KEEP BELOW HERE DO NOT DELETE */}
//       {/* <View style={[S.row, {marginTop: 4}]}>
//         <Text style={[S.faint]}>Advanced Controls</Text>

//         <TouchableOpacity
//           onPress={() => {
//             if (showMoreOptions) {
//               setOpenOccasion(false);
//               setOpenStyle(false);
//             }
//             setShowMoreOptions(s => !s);
//           }}
//           activeOpacity={0.8}
//           accessibilityRole="button"
//           accessibilityLabel={showMoreOptions ? 'Hide options' : 'Show options'}
//           testID="options-gear-button"
//           style={S.iconBtn}>
//           <MaterialIcons
//             name="settings" // or "tune" if you prefer sliders
//             size={20}
//             color={theme.colors.primary}
//           />
//         </TouchableOpacity>
//       </View> */}

//       {/* Occasion + Style (hidden until expanded) */}
//       {showMoreOptions && (
//         <View style={S.section}>
//           {/* Occasion */}
//           <View style={{zIndex: 2000}}>
//             <DropDownPicker
//               open={openOccasion}
//               setOpen={(v: boolean) => {
//                 setOpenOccasion(v);
//                 if (v) {
//                   setOpenWeather(false);
//                   setOpenStyle(false);
//                 }
//               }}
//               value={occasion}
//               setValue={val => onChangeOccasion(val as unknown as string)}
//               items={occasionOptions}
//               placeholder="Select Occasion"
//               listMode="SCROLLVIEW"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             />
//           </View>

//           {/* Style */}
//           <View style={{zIndex: 1000}}>
//             <DropDownPicker
//               open={openStyle}
//               setOpen={(v: boolean) => {
//                 setOpenStyle(v);
//                 if (v) {
//                   setOpenWeather(false);
//                   setOpenOccasion(false);
//                 }
//               }}
//               value={style}
//               setValue={val => onChangeStyle(val as unknown as string)}
//               items={styleOptions}
//               placeholder="Select Style"
//               listMode="SCROLLVIEW"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             />
//           </View>
//         </View>
//       )}

//       {/* Primary CTA */}
//       <TouchableOpacity
//         style={S.cta}
//         onPress={onRegenerate}
//         disabled={isGenerating}>
//         <Text style={S.ctaText}>
//           {isGenerating ? 'Generating…' : 'Generate Outfit'}
//         </Text>
//       </TouchableOpacity>

//       {/* Status line below CTA */}
//       {statusText ? (
//         <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//       ) : null}
//     </View>
//   );
// }

////////////////

// import React, {useState} from 'react';
// import {View, TouchableOpacity, Text, StyleSheet, Switch} from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   occasion: string;
//   style: string;
//   onChangeWeather: (value: string) => void;
//   onChangeOccasion: (value: string) => void;
//   onChangeStyle: (value: string) => void;
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;
//   onRegenerate: () => void;
//   onGenerate?: () => void;
//   isGenerating?: boolean;
//   // Optional live-weather status text, pass from parent
//   statusText?: string; // e.g. "Using local weather: 70°F · none · wind 12 mph"
// };

// export default function OutfitTuningControls({
//   weather,
//   occasion,
//   style,
//   onChangeWeather,
//   onChangeOccasion,
//   onChangeStyle,
//   onRegenerate,
//   useWeather,
//   onToggleWeather,
//   isGenerating = false,
//   statusText,
// }: Props) {
//   const {theme} = useAppTheme();

//   // Dropdown state
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openOccasion, setOpenOccasion] = useState(false);
//   const [openStyle, setOpenStyle] = useState(false);

//   // Panels
//   const [showWeatherPicker, setShowWeatherPicker] = useState(false);
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // Options
//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: "It's Hot", value: 'hot'},
//     {label: "It's Cold", value: 'cold'},
//     {label: "It's Rainy", value: 'rainy'},
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

//   const S = StyleSheet.create({
//     container: {width: '100%', paddingHorizontal: 20, gap: 12},
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     subRow: {flexDirection: 'row', alignItems: 'center'},
//     label: {marginLeft: 8, color: theme.colors.foreground, fontSize: 14},
//     faint: {color: theme.colors.muted, fontSize: 12},
//     pill: {
//       borderRadius: 20,
//       paddingVertical: 6,
//       paddingHorizontal: 12,
//     },
//     pillPrimary: {
//       backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//     },
//     pillSurface: {
//       backgroundColor: theme.colors.surface,
//     },
//     pillTextPrimary: {color: '#fff', fontWeight: '600', fontSize: 13},
//     pillTextLink: {
//       color: theme.colors.primary,
//       fontWeight: '600',
//       fontSize: 13,
//     },
//     cta: {
//       height: 48,
//       borderRadius: 10,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//       opacity: isGenerating ? 0.7 : 1,
//       marginTop: 8,
//     },
//     ctaText: {color: '#fff', fontSize: 16, fontWeight: '600'},
//     section: {gap: 10},
//     divider: {height: 8},
//   });

//   const weatherDisabled = !useWeather;

//   // Derive a tiny current-mode label
//   const modeLabel = useWeather
//     ? weather === 'auto'
//       ? 'Auto'
//       : weather === 'hot'
//       ? 'Hot'
//       : weather === 'cold'
//       ? 'Cold'
//       : 'Rainy'
//     : 'Off';

//   return (
//     <View style={S.container}>
//       {/* Weather row: switch + mode label + change button */}
//       <View style={[S.row, {marginTop: 6}]}>
//         <View style={S.subRow}>
//           <Switch
//             value={useWeather}
//             onValueChange={enabled => {
//               onToggleWeather(enabled);
//               if (!enabled) setShowWeatherPicker(false);
//             }}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={S.label}>Use Weather</Text>
//           <Text style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
//             ({modeLabel})
//           </Text>
//         </View>

//         <TouchableOpacity
//           disabled={weatherDisabled}
//           onPress={() => setShowWeatherPicker(s => !s)}
//           activeOpacity={0.8}
//           style={[S.pill, S.pillPrimary, {opacity: weatherDisabled ? 0.5 : 1}]}>
//           <Text style={S.pillTextPrimary}>
//             {showWeatherPicker ? 'Hide Weather' : 'Change Weather'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Weather picker (collapsed by default) */}
//       {showWeatherPicker && (
//         <View style={{zIndex: 3000}}>
//           <DropDownPicker
//             open={openWeather}
//             setOpen={(v: boolean) => {
//               setOpenWeather(v);
//               if (v) {
//                 setOpenOccasion(false);
//                 setOpenStyle(false);
//               }
//             }}
//             value={weather}
//             setValue={val => onChangeWeather(val as unknown as string)}
//             items={weatherOptions}
//             placeholder={
//               useWeather ? 'Choose weather option' : 'Weather (disabled)'
//             }
//             listMode="SCROLLVIEW"
//             style={{backgroundColor: theme.colors.surface}}
//             textStyle={{color: theme.colors.foreground}}
//             dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             disabled={weatherDisabled}
//           />
//           <Text style={[S.faint, {marginTop: 6}]}>
//             {useWeather
//               ? 'Auto uses your current location.'
//               : 'Weather is off — outfits ignore weather.'}
//           </Text>
//         </View>
//       )}

//       {/* Secondary row: More Options (Occasion/Style) */}
//       <View style={[S.row, {marginTop: 4}]}>
//         <Text style={[S.faint]}>Advanced Controls</Text>
//         <TouchableOpacity
//           onPress={() => {
//             if (showMoreOptions) {
//               setOpenOccasion(false);
//               setOpenStyle(false);
//             }
//             setShowMoreOptions(s => !s);
//           }}
//           activeOpacity={0.8}
//           style={[S.pill, S.pillSurface]}>
//           <Text style={S.pillTextLink}>
//             {showMoreOptions ? 'Hide Options' : 'More Options'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Occasion + Style (hidden until expanded) */}
//       {showMoreOptions && (
//         <View style={S.section}>
//           {/* Occasion */}
//           <View style={{zIndex: 2000}}>
//             <DropDownPicker
//               open={openOccasion}
//               setOpen={(v: boolean) => {
//                 setOpenOccasion(v);
//                 if (v) {
//                   setOpenWeather(false);
//                   setOpenStyle(false);
//                 }
//               }}
//               value={occasion}
//               setValue={val => onChangeOccasion(val as unknown as string)}
//               items={occasionOptions}
//               placeholder="Select Occasion"
//               listMode="SCROLLVIEW"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             />
//           </View>

//           {/* Style */}
//           <View style={{zIndex: 1000}}>
//             <DropDownPicker
//               open={openStyle}
//               setOpen={(v: boolean) => {
//                 setOpenStyle(v);
//                 if (v) {
//                   setOpenWeather(false);
//                   setOpenOccasion(false);
//                 }
//               }}
//               value={style}
//               setValue={val => onChangeStyle(val as unknown as string)}
//               items={styleOptions}
//               placeholder="Select Style"
//               listMode="SCROLLVIEW"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             />
//           </View>
//         </View>
//       )}

//       {/* Primary CTA */}
//       <TouchableOpacity
//         style={S.cta}
//         onPress={onRegenerate}
//         disabled={isGenerating}>
//         <Text style={S.ctaText}>
//           {isGenerating ? 'Generating…' : 'Generate Outfit'}
//         </Text>
//       </TouchableOpacity>

//       {/* Status line lives UNDER the CTA to reduce clutter */}
//       {statusText ? (
//         <Text style={[S.faint, {marginTop: 6}]}>{statusText}</Text>
//       ) : null}
//     </View>
//   );
// }

/////////////////

// import React, {useState} from 'react';
// import {View, TouchableOpacity, Text, StyleSheet, Switch} from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   occasion: string;
//   style: string;
//   onChangeWeather: (value: string) => void;
//   onChangeOccasion: (value: string) => void;
//   onChangeStyle: (value: string) => void;
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;
//   onRegenerate: () => void;
//   onGenerate?: () => void;
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
//   useWeather,
//   onToggleWeather,
//   isGenerating = false,
// }: Props) {
//   const {theme} = useAppTheme();

//   const [openWeather, setOpenWeather] = useState(false);
//   const [openOccasion, setOpenOccasion] = useState(false);
//   const [openStyle, setOpenStyle] = useState(false);

//   // Show/Hide the simple weather options
//   const [showOverride, setShowOverride] = useState(false);

//   // NEW: hide Occasion/Style by default
//   const [showMoreOptions, setShowMoreOptions] = useState(false);

//   // Plain-English options
//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: "It's Hot", value: 'hot'},
//     {label: "It's Cold", value: 'cold'},
//     {label: "It's Rainy", value: 'rainy'},
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

//   const styles = StyleSheet.create({
//     container: {
//       width: '100%',
//       marginBottom: 20,
//       paddingHorizontal: 20,
//       gap: 12,
//     },
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     subtleLink: {paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6},
//     subtleLinkText: {fontSize: 13, fontWeight: '600', opacity: 0.9},
//     smallNote: {marginTop: 4, fontSize: 12, opacity: 0.8},
//     button: {
//       height: 48,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginTop: 16,
//     },
//     buttonText: {fontSize: 16, fontWeight: '600'},
//     pill: {
//       borderRadius: 20,
//       paddingVertical: 6,
//       paddingHorizontal: 12,
//     },
//   });

//   const weatherDisabled = !useWeather;

//   return (
//     <View style={styles.container}>
//       {/* WEATHER TOGGLE + CHANGE/HIDE WEATHER */}
//       <View style={[styles.row, {marginBottom: 4}]}>
//         <View style={{flexDirection: 'row', alignItems: 'center'}}>
//           <Switch
//             value={useWeather}
//             onValueChange={enabled => {
//               onToggleWeather(enabled);
//               if (!enabled) setShowOverride(false); // hide when off
//             }}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={{marginLeft: 8, color: theme.colors.foreground}}>
//             Use Weather
//           </Text>
//         </View>

//         <TouchableOpacity
//           disabled={weatherDisabled}
//           onPress={() => setShowOverride(s => !s)}
//           style={[
//             styles.subtleLink,
//             styles.pill,
//             {
//               opacity: weatherDisabled ? 0.0 : 1, // keep your exact behavior
//               backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//             },
//           ]}
//           activeOpacity={0.8}>
//           <Text
//             style={[
//               styles.subtleLinkText,
//               {
//                 color: '#fff',
//               },
//             ]}>
//             {showOverride ? 'Hide Weather Options' : 'Advanced Weather Options'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* WEATHER OPTIONS (hidden by default) */}
//       {showOverride && (
//         <View
//           style={{
//             zIndex: 3000,
//             marginBottom: 12,
//             opacity: weatherDisabled ? 0.5 : 1,
//           }}>
//           <DropDownPicker
//             open={openWeather}
//             setOpen={(v: boolean) => {
//               setOpenWeather(v);
//               if (v) {
//                 setOpenOccasion(false);
//                 setOpenStyle(false);
//               }
//             }}
//             value={weather}
//             setValue={val => onChangeWeather(val as unknown as string)}
//             items={weatherOptions}
//             placeholder={
//               useWeather ? 'Choose weather option' : 'Weather (disabled)'
//             }
//             listMode="SCROLLVIEW"
//             style={{backgroundColor: theme.colors.surface}}
//             textStyle={{color: theme.colors.foreground}}
//             dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             disabled={weatherDisabled}
//           />
//           <Text style={{marginTop: 6, fontSize: 12, color: theme.colors.muted}}>
//             Default uses your current location automatically.
//           </Text>
//         </View>
//       )}

//       {/* MORE OPTIONS TOGGLE (Occasion + Style) */}
//       <View style={[styles.row, {marginTop: 4}]}>
//         <TouchableOpacity
//           onPress={() => {
//             // closing any open dropdowns when collapsing
//             if (showMoreOptions) {
//               setOpenOccasion(false);
//               setOpenStyle(false);
//             }
//             setShowMoreOptions(s => !s);
//           }}
//           style={[
//             styles.subtleLink,
//             styles.pill,
//             {backgroundColor: theme.colors.surface},
//           ]}
//           activeOpacity={0.8}>
//           <Text style={[styles.subtleLinkText, {color: theme.colors.primary}]}>
//             {showMoreOptions ? 'Hide Options' : 'Advanced Options'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* OCCASION & STYLE (collapsed by default) */}
//       {showMoreOptions && (
//         <>
//           {/* OCCASION */}
//           <View style={{zIndex: 2000, marginBottom: 12}}>
//             <DropDownPicker
//               open={openOccasion}
//               setOpen={(v: boolean) => {
//                 setOpenOccasion(v);
//                 if (v) {
//                   setOpenWeather(false);
//                   setOpenStyle(false);
//                 }
//               }}
//               value={occasion}
//               setValue={val => onChangeOccasion(val as unknown as string)}
//               items={occasionOptions}
//               placeholder="Select Occasion"
//               listMode="SCROLLVIEW"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             />
//           </View>

//           {/* STYLE */}
//           <View style={{zIndex: 1000, marginBottom: 12}}>
//             <DropDownPicker
//               open={openStyle}
//               setOpen={(v: boolean) => {
//                 setOpenStyle(v);
//                 if (v) {
//                   setOpenWeather(false);
//                   setOpenOccasion(false);
//                 }
//               }}
//               value={style}
//               setValue={val => onChangeStyle(val as unknown as string)}
//               items={styleOptions}
//               placeholder="Select Style"
//               listMode="SCROLLVIEW"
//               style={{backgroundColor: theme.colors.surface}}
//               textStyle={{color: theme.colors.foreground}}
//               dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             />
//           </View>
//         </>
//       )}

//       {/* Generate CTA */}
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

//////////////////

// import React, {useState} from 'react';
// import {View, TouchableOpacity, Text, StyleSheet, Switch} from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   weather: string; // 'auto' | 'hot' | 'cold' | 'rainy'
//   occasion: string;
//   style: string;
//   onChangeWeather: (value: string) => void;
//   onChangeOccasion: (value: string) => void;
//   onChangeStyle: (value: string) => void;
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;
//   onRegenerate: () => void;
//   onGenerate?: () => void;
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
//   useWeather,
//   onToggleWeather,
//   isGenerating = false,
// }: Props) {
//   const {theme} = useAppTheme();

//   const [openWeather, setOpenWeather] = useState(false);
//   const [openOccasion, setOpenOccasion] = useState(false);
//   const [openStyle, setOpenStyle] = useState(false);

//   // Show/Hide the simple weather options
//   const [showOverride, setShowOverride] = useState(false);

//   // Plain-English options
//   const weatherOptions = [
//     {label: 'Use My Location (Auto)', value: 'auto'},
//     {label: "It's Hot", value: 'hot'},
//     {label: "It's Cold", value: 'cold'},
//     {label: "It's Rainy", value: 'rainy'},
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

//   const styles = StyleSheet.create({
//     container: {
//       width: '100%',
//       marginBottom: 20,
//       paddingHorizontal: 20,
//       gap: 12,
//     },
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     subtleLink: {paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6},
//     subtleLinkText: {fontSize: 13, fontWeight: '600', opacity: 0.9},
//     smallNote: {marginTop: 4, fontSize: 12, opacity: 0.8},
//     button: {
//       height: 48,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginTop: 16,
//     },
//     buttonText: {fontSize: 16, fontWeight: '600'},
//   });

//   const weatherDisabled = !useWeather;

//   return (
//     <View style={styles.container}>
//       {/* WEATHER TOGGLE + CHANGE/HIDE WEATHER */}
//       <View style={[styles.row, {marginBottom: 4}]}>
//         <View style={{flexDirection: 'row', alignItems: 'center'}}>
//           <Switch
//             value={useWeather}
//             onValueChange={enabled => {
//               onToggleWeather(enabled);
//               if (!enabled) setShowOverride(false); // hide when off
//             }}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={{marginLeft: 8, color: theme.colors.foreground}}>
//             Use Weather
//           </Text>
//         </View>

//         <TouchableOpacity
//           disabled={weatherDisabled}
//           onPress={() => setShowOverride(s => !s)}
//           style={[
//             styles.subtleLink,
//             {
//               opacity: weatherDisabled ? 0.0 : 1,
//               backgroundColor: isGenerating ? '#7a88ff' : '#405de6',
//               borderRadius: 20,
//               paddingVertical: 6,
//               paddingHorizontal: 12,
//             },
//           ]}
//           activeOpacity={0.8}>
//           <Text
//             style={[
//               styles.subtleLinkText,
//               {
//                 color: '#fff',
//               },
//             ]}>
//             {showOverride ? 'Hide Weather Options' : 'Choose Weather Options'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Tiny clarity note when OFF */}
//       {/* {!useWeather && (
//         <Text style={[styles.smallNote, {color: theme.colors.muted}]}>
//           Weather is off — outfits ignore weather.
//         </Text>
//       )} */}

//       {/* WEATHER OPTIONS (hidden by default) */}
//       {showOverride && (
//         <View
//           style={{
//             zIndex: 3000,
//             marginBottom: 12,
//             opacity: weatherDisabled ? 0.5 : 1,
//           }}>
//           <DropDownPicker
//             open={openWeather}
//             setOpen={(v: boolean) => {
//               setOpenWeather(v);
//               if (v) {
//                 setOpenOccasion(false);
//                 setOpenStyle(false);
//               }
//             }}
//             value={weather}
//             setValue={val => onChangeWeather(val as unknown as string)}
//             items={weatherOptions}
//             placeholder={
//               useWeather ? 'Choose weather option' : 'Weather (disabled)'
//             }
//             listMode="SCROLLVIEW"
//             style={{backgroundColor: theme.colors.surface}}
//             textStyle={{color: theme.colors.foreground}}
//             dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             disabled={weatherDisabled}
//           />
//           <Text style={{marginTop: 6, fontSize: 12, color: theme.colors.muted}}>
//             Default uses your current location automatically.
//           </Text>
//         </View>
//       )}

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

//       {/* Generate CTA */}
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

////////////////

// import React, {useState} from 'react';
// import {View, TouchableOpacity, Text, StyleSheet, Switch} from 'react-native';
// import DropDownPicker from 'react-native-dropdown-picker';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   // Current selected values coming from parent screen
//   weather: string; // expects 'auto' | 'hot' | 'cold' | 'rainy'
//   occasion: string;
//   style: string;

//   // Callbacks to push changes up to the parent (controlled inputs)
//   onChangeWeather: (value: string) => void;
//   onChangeOccasion: (value: string) => void;
//   onChangeStyle: (value: string) => void;

//   // Weather toggle
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;

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
//   useWeather,
//   onToggleWeather,
//   isGenerating = false,
// }: Props) {
//   const {theme} = useAppTheme();

//   // Local UI state to open/close each dropdown menu.
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openOccasion, setOpenOccasion] = useState(false);
//   const [openStyle, setOpenStyle] = useState(false);

//   // Show/Hide the override controls
//   const [showOverride, setShowOverride] = useState(false);

//   // Option lists
//   const weatherOptions = [
//     {label: 'Auto (Live)', value: 'auto'},
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

//   // Layout styles
//   const styles = StyleSheet.create({
//     container: {
//       width: '100%',
//       marginBottom: 20,
//       paddingHorizontal: 20,
//       gap: 12,
//     },
//     row: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     subtleLink: {
//       paddingVertical: 6,
//       paddingHorizontal: 8,
//       borderRadius: 6,
//     },
//     subtleLinkText: {
//       fontSize: 13,
//       fontWeight: '600',
//       opacity: 0.9,
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

//   const weatherDisabled = !useWeather;

//   return (
//     <View style={styles.container}>
//       {/* WEATHER TOGGLE + PLAN/OVERRIDE */}
//       <View style={[styles.row, {marginBottom: 6}]}>
//         <View style={{flexDirection: 'row', alignItems: 'center'}}>
//           <Switch
//             value={useWeather}
//             onValueChange={enabled => {
//               onToggleWeather(enabled);
//               // If turning OFF, hide override UI to reduce confusion
//               if (!enabled) setShowOverride(false);
//             }}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={{marginLeft: 8, color: theme.colors.foreground}}>
//             Use Weather
//           </Text>
//         </View>

//         <TouchableOpacity
//           disabled={weatherDisabled}
//           onPress={() => setShowOverride(s => !s)}
//           style={[
//             styles.subtleLink,
//             {
//               opacity: weatherDisabled ? 0.5 : 1,
//               backgroundColor: theme.colors.surface,
//             },
//           ]}
//           activeOpacity={0.8}>
//           <Text style={[styles.subtleLinkText, {color: theme.colors.primary}]}>
//             {showOverride ? 'Hide Override' : 'Plan / Override'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* WEATHER OVERRIDE (hidden by default) */}
//       {showOverride && (
//         <View
//           style={{
//             zIndex: 3000,
//             marginBottom: 12,
//             opacity: weatherDisabled ? 0.5 : 1,
//           }}>
//           <DropDownPicker
//             open={openWeather}
//             setOpen={(v: boolean) => {
//               setOpenWeather(v);
//               if (v) {
//                 setOpenOccasion(false);
//                 setOpenStyle(false);
//               }
//             }}
//             value={weather}
//             setValue={val => onChangeWeather(val as unknown as string)}
//             items={weatherOptions}
//             placeholder={
//               useWeather ? 'Weather (Auto / Override)' : 'Weather (disabled)'
//             }
//             listMode="SCROLLVIEW"
//             style={{backgroundColor: theme.colors.surface}}
//             textStyle={{color: theme.colors.foreground}}
//             dropDownContainerStyle={{backgroundColor: theme.colors.surface}}
//             disabled={weatherDisabled}
//           />
//           {/* Tiny hint */}
//           <Text style={{marginTop: 6, fontSize: 12, color: theme.colors.muted}}>
//             Auto uses real weather for your current location/time. Override for
//             travel or planning.
//           </Text>
//         </View>
//       )}

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

//       {/* Generate CTA */}
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

///////////////////////

// // apps/mobile/src/components/OutfitTuningControls/OutfitTuningControls.tsx
// import React, {useState} from 'react';
// import {View, TouchableOpacity, Text, StyleSheet, Switch} from 'react-native';
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

//   // Weather toggle
//   useWeather: boolean;
//   onToggleWeather: (enabled: boolean) => void;

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
//   useWeather,
//   onToggleWeather,
//   isGenerating = false,
// }: Props) {
//   const {theme} = useAppTheme();

//   // Local UI state to open/close each dropdown menu.
//   const [openWeather, setOpenWeather] = useState(false);
//   const [openOccasion, setOpenOccasion] = useState(false);
//   const [openStyle, setOpenStyle] = useState(false);

//   // Option lists
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

//   // Layout styles
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
//       {/* WEATHER */}
//       <View style={{zIndex: 3000, marginBottom: 12}}>
//         <DropDownPicker
//           open={openWeather}
//           setOpen={(v: boolean) => {
//             setOpenWeather(v);
//             if (v) {
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
//         {/* Weather toggle */}
//         <View
//           style={{
//             flexDirection: 'row',
//             alignItems: 'center',
//             marginTop: 8,
//           }}>
//           <Switch
//             value={useWeather}
//             onValueChange={onToggleWeather}
//             trackColor={{false: '#767577', true: '#405de6'}}
//             thumbColor={useWeather ? '#fff' : '#f4f3f4'}
//           />
//           <Text style={{marginLeft: 8, color: theme.colors.foreground}}>
//             Use Weather
//           </Text>
//         </View>
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

//       {/* Generate CTA */}
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
