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

  // Weather toggle
  useWeather: boolean;
  onToggleWeather: (enabled: boolean) => void;

  // NEW: Style profile toggle
  useStylePrefs: boolean;
  onToggleStylePrefs: (enabled: boolean) => void;

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

  // NEW props
  useStylePrefs,
  onToggleStylePrefs,

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
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
            dropDownDirection="AUTO"
            style={{backgroundColor: theme.colors.surface}}
            textStyle={{color: theme.colors.foreground}}
            dropDownContainerStyle={{
              backgroundColor: theme.colors.surface,
              zIndex: 9999,
              elevation: 9999,
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

      {/* NEW: Style Profile toggle (simple on/off like Weather) */}
      <View style={[S.row, {marginTop: 6}]}>
        <View style={S.subRow}>
          <Switch
            value={useStylePrefs}
            onValueChange={onToggleStylePrefs}
            trackColor={{false: '#767577', true: '#405de6'}}
            thumbColor={useStylePrefs ? '#fff' : '#f4f3f4'}
          />
          <Text style={S.label}>Use Style Profile</Text>
          <Text style={[S.label, {marginLeft: 10, color: theme.colors.muted}]}>
            ({useStylePrefs ? 'On' : 'Off'})
          </Text>
        </View>

        {/* No advanced panel for style profile—just a placeholder to balance layout */}
        <View style={{width: 1}} />
      </View>

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
            name="settings"
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
//       </View>

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
