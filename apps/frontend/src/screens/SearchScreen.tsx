import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';
import type {WardrobeItem} from '../types/wardrobe';
import {useUUID} from '../context/UUIDContext';
import {useQuery} from '@tanstack/react-query';
import {API_BASE_URL} from '../config/api';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {useVoiceControl} from '../hooks/useVoiceControl';
import {tokens} from '../styles/tokens/tokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as Animatable from 'react-native-animatable';
import {TooltipBubble} from '../components/ToolTip/ToolTip1';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

// ✅ Responsive imports
import {useResponsive} from '../hooks/useResponsive';
import {useResponsiveTheme} from '../theme/responsiveTheme';
import {moderateScale} from '../utils/scale';

type SavedOutfit = {
  id: string;
  name?: string;
  top: WardrobeItem;
  bottom: WardrobeItem;
  shoes: WardrobeItem;
  createdAt: string;
  tags?: string[];
  notes?: string;
  rating?: number;
  favorited?: boolean;
};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function SearchScreen({navigate, goBack}) {
  const userId = useUUID();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const [query, setQuery] = useState('');
  const [isHolding, setIsHolding] = useState(false);

  const insets = useSafeAreaInsets();

  const {speech, isRecording, startListening, stopListening} =
    useVoiceControl();

  // ✅ Responsive helpers
  const {isXS, isSM} = useResponsive();
  const {spacing, typography} = useResponsiveTheme();

  async function prepareAudio() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('🎙️ Mic permission denied');
        return false;
      }
    } else {
      try {
        const AV = require('react-native').NativeModules.AVAudioSession;
        if (AV?.setCategory) {
          await AV.setCategory('PlayAndRecord');
          await AV.setActive(true);
        }
      } catch (e) {
        console.warn('AudioSession error', e);
      }
    }
    return true;
  }

  useEffect(() => {
    setQuery(speech);
  }, [speech]);

  const handleMicPressIn = async () => {
    const ok = await prepareAudio();
    if (!ok) return;
    h('impactLight');
    setIsHolding(true);
    startListening();
  };

  const handleMicPressOut = () => {
    setIsHolding(false);
    stopListening();
    h('selection');
  };

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    inputWrapper: {position: 'relative', marginBottom: spacing.md},
    input: {
      height: moderateScale(48),
      paddingHorizontal: spacing.md,
      fontSize: typography.body,
      paddingRight: spacing.xl * 2.5,
      marginTop: spacing.md,
      borderWidth: tokens.borderWidth.xl,
      borderColor: theme.colors.surfaceBorder,
      backgroundColor: theme.colors.surface3,
      borderRadius: moderateScale(20),
      color: theme.colors.foreground,
    },
    micWrap: {
      position: 'absolute',
      right: spacing.lg * 1.5,
      top: spacing.xs,
      zIndex: 2,
      elevation: 2,
      pointerEvents: 'box-none',
      marginTop: spacing.md,
    },
    micTouch: {
      width: moderateScale(36),
      height: moderateScale(38),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: moderateScale(10),
    },
    iconRow: {
      position: 'absolute',
      right: spacing.md,
      top: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 3,
      marginTop: spacing.md,
    },
    clearIconInline: {
      marginRight: spacing.sm, // space between x and mic
    },
    clearIcon: {position: 'absolute', right: spacing.md, top: spacing.sm},
    card: {
      padding: spacing.md,
      borderRadius: moderateScale(14),
      marginBottom: spacing.sm,
    },
    groupLabel: {
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      fontSize: typography.body,
      fontWeight: '600',
      color: theme.colors.foreground2,
    },
    outfitImage: {
      width: isXS ? 50 : isSM ? 56 : 60,
      height: isXS ? 50 : isSM ? 56 : 60,
      borderRadius: moderateScale(8),
      marginRight: spacing.sm,
    },
  });

  const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
    queryKey: ['wardrobe', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch wardrobe items');
      return res.json();
    },
  });

  const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
    queryKey: ['savedOutfits', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch saved outfits');
      return res.json();
    },
  });

  const matchesQuery = (text: string | undefined): boolean =>
    !!text?.toLowerCase().includes(query.toLowerCase());

  const filteredWardrobe = wardrobe.filter(item =>
    matchesQuery(
      [
        item.name,
        (item as any).mainCategory,
        (item as any).subCategory,
        (item as any).color,
        (item as any).material,
        (item as any).fit,
        (item as any).size,
        Array.isArray((item as any).tags) ? (item as any).tags.join(' ') : '',
        (item as any).notes,
      ]
        .filter(Boolean)
        .join(' '),
    ),
  );

  const filteredOutfits = savedOutfits.filter(outfit =>
    matchesQuery(
      [outfit.name, outfit.tags?.join(' '), outfit.notes]
        .filter(Boolean)
        .join(' '),
    ),
  );

  const noWardrobeItems = wardrobe.length === 0;

  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 24,
        }}
      />
      <View
        style={{
          height: insets.top + 60, // ⬅️ 56 is about the old navbar height
          backgroundColor: theme.colors.background,
          // same tone as old nav
        }}
      />
      <ScrollView
        style={[
          globalStyles.container,
          {backgroundColor: theme.colors.background, marginBottom: 80},
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isHolding}
        contentInsetAdjustmentBehavior="automatic">
        <Text
          style={[
            globalStyles.header,
            {color: theme.colors.foreground, fontSize: typography.heading},
          ]}>
          Search Wardrobe Items
        </Text>

        <Animatable.View
          animation="fadeIn"
          duration={600}
          easing="ease-out-cubic"
          style={{flex: 1}}>
          <View style={globalStyles.section}>
            <View
              style={[
                globalStyles.backContainer,
                {marginTop: spacing.md, paddingLeft: 8},
              ]}>
              <AppleTouchFeedback onPress={goBack} hapticStyle="impactLight">
                <MaterialIcons
                  name="arrow-back"
                  size={moderateScale(26)}
                  color={theme.colors.button3}
                />
              </AppleTouchFeedback>
              <Text
                style={[
                  globalStyles.backText,
                  {marginLeft: spacing.sm, fontSize: typography.body},
                ]}>
                Back
              </Text>
            </View>

            <View style={globalStyles.centeredSection}>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Say type of clothing items.. shoes, pants, coats"
                  placeholderTextColor={'#9b9b9bff'}
                  value={query}
                  onChangeText={setQuery}
                  style={styles.input}
                />

                {/* <View style={styles.micWrap} pointerEvents="box-none">
                  <AppleTouchFeedback hapticStyle="impactLight">
                    <TouchableOpacity
                      style={styles.micTouch}
                      onPressIn={handleMicPressIn}
                      onPressOut={handleMicPressOut}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      <MaterialIcons
                        name={isRecording ? 'mic' : 'mic-none'}
                        size={moderateScale(24)}
                        color={
                          isRecording
                            ? theme.colors.primary
                            : theme.colors.foreground2
                        }
                      />
                    </TouchableOpacity>
                  </AppleTouchFeedback>
                </View> */}

                {/* ✅ Clear button now stops mic too */}
                <View style={styles.iconRow}>
                  {query.length > 0 && (
                    <AppleTouchFeedback
                      onPress={async () => {
                        await stopListening();
                        setQuery('');
                      }}
                      hapticStyle="impactLight"
                      style={styles.clearIconInline}>
                      <MaterialIcons
                        name="close"
                        size={moderateScale(22)}
                        color={theme.colors.foreground}
                      />
                    </AppleTouchFeedback>
                  )}

                  <Pressable>
                    <TouchableOpacity
                      style={styles.micTouch}
                      onPressIn={handleMicPressIn}
                      onPressOut={handleMicPressOut}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      <MaterialIcons
                        name={isRecording ? 'mic' : 'mic-none'}
                        size={moderateScale(24)}
                        color={
                          isRecording
                            ? theme.colors.primary
                            : theme.colors.foreground2
                        }
                      />
                    </TouchableOpacity>
                  </Pressable>
                </View>
              </View>

              {filteredWardrobe.length > 0 && (
                <Text style={styles.groupLabel}>👕 Wardrobe</Text>
              )}
              {filteredWardrobe.map(item => (
                <AppleTouchFeedback
                  key={item.id}
                  hapticStyle="impactLight"
                  onPress={() => {
                    navigate('ItemDetail', {item});
                  }}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.surfaceBorder,
                      borderWidth: tokens.borderWidth.hairline,
                    },
                  ]}>
                  {/* <Text
                    style={{
                      color: theme.colors.foreground,
                      fontWeight: '500',
                      fontSize: typography.small,
                    }}>
                    {item.name}
                  </Text> */}
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                      color: theme.colors.foreground,
                      fontWeight: '500',
                      fontSize: typography.small,
                      flexShrink: 1,
                      paddingRight: 8, // keeps text from touching edges
                    }}>
                    {item.name}
                  </Text>
                </AppleTouchFeedback>
              ))}

              {filteredOutfits.length > 0 && (
                <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
              )}
              {filteredOutfits.map((outfit: SavedOutfit) => (
                <View
                  key={outfit.id}
                  style={[
                    styles.card,
                    {backgroundColor: theme.colors.surface},
                  ]}>
                  {/* <Text
                    style={{
                      color: theme.colors.foreground,
                      fontWeight: '500',
                      fontSize: typography.body,
                    }}>
                    {outfit.name?.trim() || 'Unnamed Outfit'}
                  </Text> */}
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                      color: theme.colors.foreground,
                      fontWeight: '500',
                      fontSize: typography.body,
                      flexShrink: 1,
                      paddingRight: 8,
                    }}>
                    {outfit.name?.trim() || 'Unnamed Outfit'}
                  </Text>
                  <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
                    {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
                      (i as any)?.image ? (
                        <Image
                          key={(i as any).id}
                          source={{uri: (i as any).image}}
                          style={styles.outfitImage}
                        />
                      ) : null,
                    )}
                  </View>
                </View>
              ))}

              {noWardrobeItems && (
                <View style={{flexDirection: 'row', alignSelf: 'center'}}>
                  <Text
                    style={[
                      globalStyles.missingDataMessage1,
                      {fontSize: typography.body},
                    ]}>
                    No wardrobe items.
                  </Text>
                  <TooltipBubble
                    message='Add wardrobe items from the "Wardrobe" page to be able to search wardrobe items here.'
                    position="top"
                  />
                </View>
              )}

              {filteredWardrobe.length === 0 &&
                filteredOutfits.length === 0 &&
                !noWardrobeItems && (
                  <Text
                    style={{
                      color: theme.colors.foreground,
                      marginTop: spacing.lg,
                      fontSize: typography.body,
                    }}>
                    No results found.
                  </Text>
                )}
            </View>
          </View>
        </Animatable.View>
      </ScrollView>
    </>
  );
}

///////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {tokens} from '../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// // ✅ Responsive imports
// import {useResponsive} from '../hooks/useResponsive';
// import {useResponsiveTheme} from '../theme/responsiveTheme';
// import {moderateScale} from '../utils/scale';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // ✅ Responsive helpers
//   const {isXS, isSM} = useResponsive();
//   const {spacing, typography} = useResponsiveTheme();

//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     h('impactLight');
//     setIsHolding(true);
//     startListening();
//   };

//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: spacing.md},
//     input: {
//       height: moderateScale(48),
//       paddingHorizontal: spacing.md,
//       fontSize: typography.body,
//       paddingRight: spacing.xl * 2.5,
//       marginTop: spacing.md,
//       borderWidth: tokens.borderWidth.xl,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: moderateScale(20),
//       color: theme.colors.foreground,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: spacing.lg * 1.5,
//       top: spacing.xs,
//       zIndex: 2,
//       elevation: 2,
//       pointerEvents: 'box-none',
//       marginTop: spacing.md,
//     },
//     micTouch: {
//       width: moderateScale(36),
//       height: moderateScale(38),
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: moderateScale(10),
//     },
//     clearIcon: {position: 'absolute', right: spacing.md, top: spacing.sm},
//     card: {
//       padding: spacing.md,
//       borderRadius: moderateScale(14),
//       marginBottom: spacing.sm,
//     },
//     groupLabel: {
//       marginTop: spacing.lg,
//       marginBottom: spacing.sm,
//       fontSize: typography.body,
//       fontWeight: '600',
//       color: theme.colors.foreground2,
//     },
//     outfitImage: {
//       width: isXS ? 50 : isSM ? 56 : 60,
//       height: isXS ? 50 : isSM ? 56 : 60,
//       borderRadius: moderateScale(8),
//       marginRight: spacing.sm,
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       return res.json();
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       return res.json();
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         (item as any).mainCategory,
//         (item as any).subCategory,
//         (item as any).color,
//         (item as any).material,
//         (item as any).fit,
//         (item as any).size,
//         Array.isArray((item as any).tags) ? (item as any).tags.join(' ') : '',
//         (item as any).notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const noWardrobeItems = wardrobe.length === 0;

//   return (
//     <>
//       <View
//         pointerEvents="none"
//         style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 24}}
//       />

//       <ScrollView
//         style={[
//           globalStyles.container,
//           {backgroundColor: theme.colors.background},
//         ]}
//         keyboardShouldPersistTaps="handled"
//         scrollEnabled={!isHolding}
//         contentInsetAdjustmentBehavior="automatic">
//         <Text
//           style={[
//             globalStyles.header,
//             {color: theme.colors.foreground, fontSize: typography.heading},
//           ]}>
//           Search Wardrobe Items
//         </Text>

//         <Animatable.View
//           animation="fadeIn"
//           duration={600}
//           easing="ease-out-cubic"
//           style={{flex: 1}}>
//           <View style={globalStyles.section}>
//             <View
//               style={[
//                 globalStyles.backContainer,
//                 {marginTop: spacing.md, paddingLeft: 8},
//               ]}>
//               <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//                 <MaterialIcons
//                   name="arrow-back"
//                   size={moderateScale(26)}
//                   color={theme.colors.button3}
//                 />
//               </AppleTouchFeedback>
//               <Text
//                 style={[
//                   globalStyles.backText,
//                   {marginLeft: spacing.sm, fontSize: typography.body},
//                 ]}>
//                 Back
//               </Text>
//             </View>

//             <View style={globalStyles.centeredSection}>
//               <View style={styles.inputWrapper}>
//                 <TextInput
//                   placeholder="Say type of clothing items.. shoes, pants, coats"
//                   placeholderTextColor={'#9b9b9bff'}
//                   value={query}
//                   onChangeText={setQuery}
//                   style={styles.input}
//                 />

//                 <View style={styles.micWrap} pointerEvents="box-none">
//                   <AppleTouchFeedback hapticStyle="impactLight">
//                     <TouchableOpacity
//                       style={styles.micTouch}
//                       onPressIn={handleMicPressIn}
//                       onPressOut={handleMicPressOut}
//                       hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                       <MaterialIcons
//                         name={isRecording ? 'mic' : 'mic-none'}
//                         size={moderateScale(24)}
//                         color={
//                           isRecording
//                             ? theme.colors.primary
//                             : theme.colors.foreground2
//                         }
//                       />
//                     </TouchableOpacity>
//                   </AppleTouchFeedback>
//                 </View>

//                 {/* ✅ Clear button now stops mic too */}
//                 {query.length > 0 && (
//                   <AppleTouchFeedback
//                     onPress={async () => {
//                       await stopListening(); // ✅ stop mic session first
//                       setQuery(''); // ✅ clear query text
//                       h('selection');
//                     }}
//                     hapticStyle="impactLight"
//                     style={styles.clearIcon}>
//                     <MaterialIcons
//                       name="close"
//                       size={moderateScale(22)}
//                       color={theme.colors.foreground}
//                     />
//                   </AppleTouchFeedback>
//                 )}
//               </View>

//               {filteredWardrobe.length > 0 && (
//                 <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//               )}
//               {filteredWardrobe.map(item => (
//                 <AppleTouchFeedback
//                   key={item.id}
//                   hapticStyle="impactLight"
//                   onPress={() => {
//                     h('selection');
//                     navigate('ItemDetail', {item});
//                   }}
//                   style={[
//                     styles.card,
//                     {
//                       backgroundColor: theme.colors.surface,
//                       borderColor: theme.colors.surfaceBorder,
//                       borderWidth: tokens.borderWidth.hairline,
//                     },
//                   ]}>
//                   {/* <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '500',
//                       fontSize: typography.small,
//                     }}>
//                     {item.name}
//                   </Text> */}
//                   <Text
//                     numberOfLines={1}
//                     ellipsizeMode="tail"
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '500',
//                       fontSize: typography.small,
//                       flexShrink: 1,
//                       paddingRight: 8, // keeps text from touching edges
//                     }}>
//                     {item.name}
//                   </Text>
//                 </AppleTouchFeedback>
//               ))}

//               {filteredOutfits.length > 0 && (
//                 <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//               )}
//               {filteredOutfits.map((outfit: SavedOutfit) => (
//                 <View
//                   key={outfit.id}
//                   style={[
//                     styles.card,
//                     {backgroundColor: theme.colors.surface},
//                   ]}>
//                   {/* <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '500',
//                       fontSize: typography.body,
//                     }}>
//                     {outfit.name?.trim() || 'Unnamed Outfit'}
//                   </Text> */}
//                   <Text
//                     numberOfLines={1}
//                     ellipsizeMode="tail"
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '500',
//                       fontSize: typography.body,
//                       flexShrink: 1,
//                       paddingRight: 8,
//                     }}>
//                     {outfit.name?.trim() || 'Unnamed Outfit'}
//                   </Text>
//                   <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
//                     {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                       (i as any)?.image ? (
//                         <Image
//                           key={(i as any).id}
//                           source={{uri: (i as any).image}}
//                           style={styles.outfitImage}
//                         />
//                       ) : null,
//                     )}
//                   </View>
//                 </View>
//               ))}

//               {noWardrobeItems && (
//                 <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//                   <Text
//                     style={[
//                       globalStyles.missingDataMessage1,
//                       {fontSize: typography.body},
//                     ]}>
//                     No wardrobe items.
//                   </Text>
//                   <TooltipBubble
//                     message='Add wardrobe items from the "Wardrobe" page to be able to search wardrobe items here.'
//                     position="top"
//                   />
//                 </View>
//               )}

//               {filteredWardrobe.length === 0 &&
//                 filteredOutfits.length === 0 &&
//                 !noWardrobeItems && (
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       marginTop: spacing.lg,
//                       fontSize: typography.body,
//                     }}>
//                     No results found.
//                   </Text>
//                 )}
//             </View>
//           </View>
//         </Animatable.View>
//       </ScrollView>
//     </>
//   );
// }

///////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {tokens} from '../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// // ✅ Responsive imports
// import {useResponsive} from '../hooks/useResponsive';
// import {useResponsiveTheme} from '../theme/responsiveTheme';
// import {moderateScale} from '../utils/scale';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // ✅ Responsive helpers
//   const {isXS, isSM} = useResponsive();
//   const {spacing, typography} = useResponsiveTheme();

//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     h('impactLight');
//     setIsHolding(true);
//     startListening();
//   };

//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: spacing.md},
//     input: {
//       height: moderateScale(48),
//       paddingHorizontal: spacing.md,
//       fontSize: typography.body,
//       paddingRight: spacing.xl * 2.5,
//       marginTop: spacing.md,
//       borderWidth: tokens.borderWidth.xl,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: moderateScale(20),
//       color: theme.colors.foreground,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: spacing.lg * 1.5,
//       top: spacing.xs,
//       zIndex: 2,
//       elevation: 2,
//       pointerEvents: 'box-none',
//       marginTop: spacing.md,
//     },
//     micTouch: {
//       width: moderateScale(36),
//       height: moderateScale(38),
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: moderateScale(10),
//     },
//     clearIcon: {position: 'absolute', right: spacing.md, top: spacing.sm},
//     card: {
//       padding: spacing.md,
//       borderRadius: moderateScale(14),
//       marginBottom: spacing.sm,
//     },
//     groupLabel: {
//       marginTop: spacing.lg,
//       marginBottom: spacing.sm,
//       fontSize: typography.body,
//       fontWeight: '600',
//       color: theme.colors.foreground2,
//     },
//     outfitImage: {
//       width: isXS ? 50 : isSM ? 56 : 60,
//       height: isXS ? 50 : isSM ? 56 : 60,
//       borderRadius: moderateScale(8),
//       marginRight: spacing.sm,
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       return res.json();
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       return res.json();
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         (item as any).mainCategory,
//         (item as any).subCategory,
//         (item as any).color,
//         (item as any).material,
//         (item as any).fit,
//         (item as any).size,
//         Array.isArray((item as any).tags) ? (item as any).tags.join(' ') : '',
//         (item as any).notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const noWardrobeItems = wardrobe.length === 0;

//   return (
//     <>
//       <View
//         pointerEvents="none"
//         style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 24}}
//       />

//       <ScrollView
//         style={[
//           globalStyles.container,
//           {backgroundColor: theme.colors.background},
//         ]}
//         keyboardShouldPersistTaps="handled"
//         scrollEnabled={!isHolding}
//         contentInsetAdjustmentBehavior="automatic">
//         <Text
//           style={[
//             globalStyles.header,
//             {color: theme.colors.foreground, fontSize: typography.heading},
//           ]}>
//           Search Wardrobe Items
//         </Text>

//         <Animatable.View
//           animation="fadeIn"
//           duration={600}
//           easing="ease-out-cubic"
//           style={{flex: 1}}>
//           <View style={globalStyles.section}>
//             <View
//               style={[
//                 globalStyles.backContainer,
//                 {marginTop: spacing.md, paddingLeft: 8},
//               ]}>
//               <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//                 <MaterialIcons
//                   name="arrow-back"
//                   size={moderateScale(26)}
//                   color={theme.colors.button3}
//                 />
//               </AppleTouchFeedback>
//               <Text
//                 style={[
//                   globalStyles.backText,
//                   {marginLeft: spacing.sm, fontSize: typography.body},
//                 ]}>
//                 Back
//               </Text>
//             </View>

//             <View style={globalStyles.centeredSection}>
//               <View style={styles.inputWrapper}>
//                 <TextInput
//                   placeholder="Say type of clothing items.. shoes, pants, coats"
//                   placeholderTextColor={'#9b9b9bff'}
//                   value={query}
//                   onChangeText={setQuery}
//                   style={styles.input}
//                 />

//                 <View style={styles.micWrap} pointerEvents="box-none">
//                   <AppleTouchFeedback hapticStyle="impactLight">
//                     <TouchableOpacity
//                       style={styles.micTouch}
//                       onPressIn={handleMicPressIn}
//                       onPressOut={handleMicPressOut}
//                       hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                       <MaterialIcons
//                         name={isRecording ? 'mic' : 'mic-none'}
//                         size={moderateScale(24)}
//                         color={
//                           isRecording
//                             ? theme.colors.primary
//                             : theme.colors.foreground2
//                         }
//                       />
//                     </TouchableOpacity>
//                   </AppleTouchFeedback>
//                 </View>

//                 {/* ✅ Clear button now stops mic too */}
//                 {query.length > 0 && (
//                   <AppleTouchFeedback
//                     onPress={async () => {
//                       await stopListening(); // ✅ stop mic session first
//                       setQuery(''); // ✅ clear query text
//                       h('selection');
//                     }}
//                     hapticStyle="impactLight"
//                     style={styles.clearIcon}>
//                     <MaterialIcons
//                       name="close"
//                       size={moderateScale(22)}
//                       color={theme.colors.foreground}
//                     />
//                   </AppleTouchFeedback>
//                 )}
//               </View>

//               {filteredWardrobe.length > 0 && (
//                 <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//               )}
//               {filteredWardrobe.map(item => (
//                 <AppleTouchFeedback
//                   key={item.id}
//                   hapticStyle="impactLight"
//                   onPress={() => {
//                     h('selection');
//                     navigate('ItemDetail', {item});
//                   }}
//                   style={[
//                     styles.card,
//                     {
//                       backgroundColor: theme.colors.surface,
//                       borderColor: theme.colors.surfaceBorder,
//                       borderWidth: tokens.borderWidth.hairline,
//                     },
//                   ]}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '500',
//                       fontSize: typography.small,
//                     }}>
//                     {item.name}
//                   </Text>
//                 </AppleTouchFeedback>
//               ))}

//               {filteredOutfits.length > 0 && (
//                 <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//               )}
//               {filteredOutfits.map((outfit: SavedOutfit) => (
//                 <View
//                   key={outfit.id}
//                   style={[
//                     styles.card,
//                     {backgroundColor: theme.colors.surface},
//                   ]}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '500',
//                       fontSize: typography.body,
//                     }}>
//                     {outfit.name?.trim() || 'Unnamed Outfit'}
//                   </Text>
//                   <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
//                     {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                       (i as any)?.image ? (
//                         <Image
//                           key={(i as any).id}
//                           source={{uri: (i as any).image}}
//                           style={styles.outfitImage}
//                         />
//                       ) : null,
//                     )}
//                   </View>
//                 </View>
//               ))}

//               {noWardrobeItems && (
//                 <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//                   <Text
//                     style={[
//                       globalStyles.missingDataMessage1,
//                       {fontSize: typography.body},
//                     ]}>
//                     No wardrobe items.
//                   </Text>
//                   <TooltipBubble
//                     message='Add wardrobe items from the "Wardrobe" page to be able to search wardrobe items here.'
//                     position="top"
//                   />
//                 </View>
//               )}

//               {filteredWardrobe.length === 0 &&
//                 filteredOutfits.length === 0 &&
//                 !noWardrobeItems && (
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       marginTop: spacing.lg,
//                       fontSize: typography.body,
//                     }}>
//                     No results found.
//                   </Text>
//                 )}
//             </View>
//           </View>
//         </Animatable.View>
//       </ScrollView>
//     </>
//   );
// }

////////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
//   Animated,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {tokens} from '../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import {useResponsive} from '../hooks/useResponsive';
// import {useResponsiveTheme} from '../theme/responsiveTheme';
// import {moderateScale} from '../utils/scale';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();
//   const {isXS, isSM} = useResponsive();
//   const {spacing, typography} = useResponsiveTheme();

//   // 🍎 Animated scroll value
//   const scrollY = useRef(new Animated.Value(0)).current;

//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     h('impactLight');
//     setIsHolding(true);
//     startListening();
//   };

//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     headerContainer: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       zIndex: 10,
//       paddingHorizontal: spacing.md,
//       backgroundColor: theme.colors.background,
//     },
//     inputWrapper: {position: 'relative', marginBottom: spacing.md},
//     input: {
//       height: moderateScale(48),
//       paddingHorizontal: spacing.md,
//       fontSize: typography.body,
//       paddingRight: spacing.xl * 2.5,
//       marginTop: spacing.md,
//       borderWidth: tokens.borderWidth.xl,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: moderateScale(20),
//       color: theme.colors.foreground,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: spacing.lg * 1.5,
//       top: spacing.xs,
//       zIndex: 2,
//       elevation: 2,
//       pointerEvents: 'box-none',
//       marginTop: spacing.md,
//     },
//     micTouch: {
//       width: moderateScale(36),
//       height: moderateScale(38),
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: moderateScale(10),
//     },
//     clearIcon: {position: 'absolute', right: spacing.md, top: spacing.sm},
//     card: {
//       padding: spacing.md,
//       borderRadius: moderateScale(14),
//       marginBottom: spacing.sm,
//     },
//     groupLabel: {
//       marginTop: spacing.lg,
//       marginBottom: spacing.sm,
//       fontSize: typography.body,
//       fontWeight: '600',
//       color: theme.colors.foreground2,
//     },
//     outfitImage: {
//       width: isXS ? 50 : isSM ? 56 : 60,
//       height: isXS ? 50 : isSM ? 56 : 60,
//       borderRadius: moderateScale(8),
//       marginRight: spacing.sm,
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       return res.json();
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       return res.json();
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         (item as any).mainCategory,
//         (item as any).subCategory,
//         (item as any).color,
//         (item as any).material,
//         (item as any).fit,
//         (item as any).size,
//         Array.isArray((item as any).tags) ? (item as any).tags.join(' ') : '',
//         (item as any).notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const noWardrobeItems = wardrobe.length === 0;

//   // 🍎 Header animation (no opacity, just transform + shrink)
//   const translateY = scrollY.interpolate({
//     inputRange: [0, 100],
//     outputRange: [0, -40],
//     extrapolate: 'clamp',
//   });

//   const fontSize = scrollY.interpolate({
//     inputRange: [0, 100],
//     outputRange: [typography.heading, typography.body * 1.2],
//     extrapolate: 'clamp',
//   });

//   return (
//     <View style={styles.screen}>
//       {/* 🍎 Collapsible Header */}
//       <Animated.View
//         style={[
//           styles.headerContainer,
//           {
//             transform: [{translateY}],
//             paddingTop: spacing.xl,
//             paddingBottom: spacing.md,
//           },
//         ]}>
//         <Animated.Text
//           style={{
//             fontSize,
//             fontWeight: '700',
//             color: theme.colors.foreground,
//           }}>
//           Search Wardrobe Items
//         </Animated.Text>
//       </Animated.View>

//       {/* 🍎 Animated Scroll */}
//       <Animated.ScrollView
//         contentContainerStyle={{paddingTop: 80}}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: false}, // 👈 must be false because we're animating fontSize
//         )}
//         scrollEventThrottle={16}
//         keyboardShouldPersistTaps="handled"
//         scrollEnabled={!isHolding}
//         contentInsetAdjustmentBehavior="automatic">
//         <Animatable.View
//           animation="fadeIn"
//           duration={600}
//           easing="ease-out-cubic">
//           <View style={globalStyles.section}>
//             <View
//               style={[
//                 globalStyles.backContainer,
//                 {marginTop: spacing.md, paddingLeft: 8},
//               ]}>
//               <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//                 <MaterialIcons
//                   name="arrow-back"
//                   size={moderateScale(26)}
//                   color={theme.colors.button3}
//                 />
//               </AppleTouchFeedback>
//               <Text
//                 style={[
//                   globalStyles.backText,
//                   {marginLeft: spacing.sm, fontSize: typography.body},
//                 ]}>
//                 Back
//               </Text>
//             </View>

//             <View style={globalStyles.centeredSection}>
//               <View style={styles.inputWrapper}>
//                 <TextInput
//                   placeholder="Say type of clothing items.. shoes, pants, coats"
//                   placeholderTextColor={'#9b9b9bff'}
//                   value={query}
//                   onChangeText={setQuery}
//                   style={styles.input}
//                 />

//                 <View style={styles.micWrap} pointerEvents="box-none">
//                   <AppleTouchFeedback hapticStyle="impactLight">
//                     <TouchableOpacity
//                       style={styles.micTouch}
//                       onPressIn={handleMicPressIn}
//                       onPressOut={handleMicPressOut}
//                       hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                       <MaterialIcons
//                         name={isRecording ? 'mic' : 'mic-none'}
//                         size={moderateScale(24)}
//                         color={
//                           isRecording
//                             ? theme.colors.primary
//                             : theme.colors.foreground2
//                         }
//                       />
//                     </TouchableOpacity>
//                   </AppleTouchFeedback>
//                 </View>

//                 {query.length > 0 && (
//                   <AppleTouchFeedback
//                     onPress={() => {
//                       setQuery('');
//                       h('selection');
//                     }}
//                     hapticStyle="impactLight"
//                     style={styles.clearIcon}>
//                     <MaterialIcons
//                       name="close"
//                       size={moderateScale(22)}
//                       color={theme.colors.foreground}
//                     />
//                   </AppleTouchFeedback>
//                 )}
//               </View>

//               {filteredWardrobe.length > 0 && (
//                 <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//               )}
//               {filteredWardrobe.map(item => (
//                 <AppleTouchFeedback
//                   key={item.id}
//                   hapticStyle="impactLight"
//                   onPress={() => {
//                     h('selection');
//                     navigate('ItemDetail', {item});
//                   }}
//                   style={[
//                     styles.card,
//                     {
//                       backgroundColor: theme.colors.surface,
//                       borderColor: theme.colors.surfaceBorder,
//                       borderWidth: tokens.borderWidth.hairline,
//                     },
//                   ]}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '500',
//                       fontSize: typography.small,
//                     }}>
//                     {item.name}
//                   </Text>
//                 </AppleTouchFeedback>
//               ))}

//               {filteredOutfits.length > 0 && (
//                 <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//               )}
//               {filteredOutfits.map((outfit: SavedOutfit) => (
//                 <View
//                   key={outfit.id}
//                   style={[
//                     styles.card,
//                     {backgroundColor: theme.colors.surface},
//                   ]}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '500',
//                       fontSize: typography.body,
//                     }}>
//                     {outfit.name?.trim() || 'Unnamed Outfit'}
//                   </Text>
//                   <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
//                     {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                       (i as any)?.image ? (
//                         <Image
//                           key={(i as any).id}
//                           source={{uri: (i as any).image}}
//                           style={styles.outfitImage}
//                         />
//                       ) : null,
//                     )}
//                   </View>
//                 </View>
//               ))}

//               {noWardrobeItems && (
//                 <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//                   <Text
//                     style={[
//                       globalStyles.missingDataMessage1,
//                       {fontSize: typography.body},
//                     ]}>
//                     No wardrobe items.
//                   </Text>
//                   <TooltipBubble
//                     message='Add wardrobe items from the "Wardrobe" page to be able to search wardrobe items here.'
//                     position="top"
//                   />
//                 </View>
//               )}

//               {filteredWardrobe.length === 0 &&
//                 filteredOutfits.length === 0 &&
//                 !noWardrobeItems && (
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       marginTop: spacing.lg,
//                       fontSize: typography.body,
//                     }}>
//                     No results found.
//                   </Text>
//                 )}
//             </View>
//           </View>
//         </Animatable.View>
//       </Animated.ScrollView>
//     </View>
//   );
// }

/////////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {tokens} from '../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// // ✅ Responsive imports
// import {useResponsive} from '../hooks/useResponsive';
// import {useResponsiveTheme} from '../theme/responsiveTheme';
// import {moderateScale} from '../utils/scale';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // ✅ Responsive helpers
//   const {isXS, isSM} = useResponsive();
//   const {spacing, typography} = useResponsiveTheme();

//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     h('impactLight');
//     setIsHolding(true);
//     startListening();
//   };
//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: spacing.md},
//     input: {
//       height: moderateScale(48),
//       paddingHorizontal: spacing.md,
//       fontSize: typography.body, // static font size from theme
//       paddingRight: spacing.xl * 2.5,
//       marginTop: spacing.md,
//       borderWidth: tokens.borderWidth.xl,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: moderateScale(20),
//       color: theme.colors.foreground,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: spacing.lg * 1.5,
//       top: spacing.xs,
//       zIndex: 2,
//       elevation: 2,
//       pointerEvents: 'box-none',
//       marginTop: spacing.md,
//     },
//     micTouch: {
//       width: moderateScale(36),
//       height: moderateScale(38),
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: moderateScale(10),
//     },
//     clearIcon: {position: 'absolute', right: spacing.md, top: spacing.sm},
//     card: {
//       padding: spacing.md,
//       borderRadius: moderateScale(14),
//       marginBottom: spacing.sm,
//     },
//     groupLabel: {
//       marginTop: spacing.lg,
//       marginBottom: spacing.sm,
//       fontSize: typography.body,
//       fontWeight: '600',
//       color: theme.colors.foreground2,
//     },
//     outfitImage: {
//       width: isXS ? 50 : isSM ? 56 : 60,
//       height: isXS ? 50 : isSM ? 56 : 60,
//       borderRadius: moderateScale(8),
//       marginRight: spacing.sm,
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       return res.json();
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       return res.json();
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         (item as any).mainCategory,
//         (item as any).subCategory,
//         (item as any).color,
//         (item as any).material,
//         (item as any).fit,
//         (item as any).size,
//         Array.isArray((item as any).tags) ? (item as any).tags.join(' ') : '',
//         (item as any).notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const noWardrobeItems = wardrobe.length === 0;

//   return (
//     <>
//       {/* Reserve the first ~24px at the left edge for the global iOS back-swipe.
//           This doesn't intercept touches; it simply keeps your own touchables
//           a hair off the edge so the edge-swipe can start reliably. */}
//       <View
//         pointerEvents="none"
//         style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 24}}
//       />

//       <ScrollView
//         style={[
//           globalStyles.container,
//           {backgroundColor: theme.colors.background},
//         ]}
//         keyboardShouldPersistTaps="handled"
//         scrollEnabled={!isHolding}
//         contentInsetAdjustmentBehavior="automatic">
//         <Text
//           style={[
//             globalStyles.header,
//             {color: theme.colors.foreground, fontSize: typography.heading},
//           ]}>
//           Search Wardrobe Items
//         </Text>

//         <Animatable.View
//           animation="fadeIn"
//           duration={600}
//           easing="ease-out-cubic"
//           style={{flex: 1}}>
//           <View style={globalStyles.section}>
//             <View
//               style={[
//                 globalStyles.backContainer,
//                 {marginTop: spacing.md, paddingLeft: 8}, // nudge off edge
//               ]}>
//               <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//                 <MaterialIcons
//                   name="arrow-back"
//                   size={moderateScale(26)}
//                   color={theme.colors.button3}
//                 />
//               </AppleTouchFeedback>
//               <Text
//                 style={[
//                   globalStyles.backText,
//                   {marginLeft: spacing.sm, fontSize: typography.body},
//                 ]}>
//                 Back
//               </Text>
//             </View>

//             <View style={globalStyles.centeredSection}>
//               <View style={styles.inputWrapper}>
//                 <TextInput
//                   placeholder="Say type of clothing items.. shoes, pants, coats"
//                   placeholderTextColor={'#9b9b9bff'}
//                   value={query}
//                   onChangeText={setQuery}
//                   style={styles.input}
//                 />

//                 <View style={styles.micWrap} pointerEvents="box-none">
//                   <AppleTouchFeedback hapticStyle="impactLight">
//                     <TouchableOpacity
//                       style={styles.micTouch}
//                       onPressIn={handleMicPressIn}
//                       onPressOut={handleMicPressOut}
//                       hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                       <MaterialIcons
//                         name={isRecording ? 'mic' : 'mic-none'}
//                         size={moderateScale(24)}
//                         color={
//                           isRecording
//                             ? theme.colors.primary
//                             : theme.colors.foreground2
//                         }
//                       />
//                     </TouchableOpacity>
//                   </AppleTouchFeedback>
//                 </View>

//                 {query.length > 0 && (
//                   <AppleTouchFeedback
//                     onPress={() => {
//                       setQuery('');
//                       h('selection');
//                     }}
//                     hapticStyle="impactLight"
//                     style={styles.clearIcon}>
//                     <MaterialIcons
//                       name="close"
//                       size={moderateScale(22)}
//                       color={theme.colors.foreground}
//                     />
//                   </AppleTouchFeedback>
//                 )}
//               </View>

//               {filteredWardrobe.length > 0 && (
//                 <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//               )}
//               {filteredWardrobe.map(item => (
//                 <AppleTouchFeedback
//                   key={item.id}
//                   hapticStyle="impactLight"
//                   onPress={() => {
//                     h('selection');
//                     navigate('ItemDetail', {item});
//                   }}
//                   style={[
//                     styles.card,
//                     {
//                       backgroundColor: theme.colors.surface,
//                       borderColor: theme.colors.surfaceBorder,
//                       borderWidth: tokens.borderWidth.hairline,
//                     },
//                   ]}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '500',
//                       fontSize: typography.small,
//                     }}>
//                     {item.name}
//                   </Text>
//                 </AppleTouchFeedback>
//               ))}

//               {filteredOutfits.length > 0 && (
//                 <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//               )}
//               {filteredOutfits.map((outfit: SavedOutfit) => (
//                 <View
//                   key={outfit.id}
//                   style={[
//                     styles.card,
//                     {backgroundColor: theme.colors.surface},
//                   ]}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       fontWeight: '500',
//                       fontSize: typography.body,
//                     }}>
//                     {outfit.name?.trim() || 'Unnamed Outfit'}
//                   </Text>
//                   <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
//                     {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                       (i as any)?.image ? (
//                         <Image
//                           key={(i as any).id}
//                           source={{uri: (i as any).image}}
//                           style={styles.outfitImage}
//                         />
//                       ) : null,
//                     )}
//                   </View>
//                 </View>
//               ))}

//               {noWardrobeItems && (
//                 <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//                   <Text
//                     style={[
//                       globalStyles.missingDataMessage1,
//                       {fontSize: typography.body},
//                     ]}>
//                     No wardrobe items.
//                   </Text>
//                   <TooltipBubble
//                     message='Add wardrobe items from the "Wardrobe" page to be able to search wardrobe items here.'
//                     position="top"
//                   />
//                 </View>
//               )}

//               {filteredWardrobe.length === 0 &&
//                 filteredOutfits.length === 0 &&
//                 !noWardrobeItems && (
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       marginTop: spacing.lg,
//                       fontSize: typography.body,
//                     }}>
//                     No results found.
//                   </Text>
//                 )}
//             </View>
//           </View>
//         </Animatable.View>
//       </ScrollView>
//     </>
//   );
// }

//////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {tokens} from '../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// // ✅ Responsive imports
// import {useResponsive} from '../hooks/useResponsive';
// import {useResponsiveTheme} from '../theme/responsiveTheme';
// import {moderateScale} from '../utils/scale';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // ✅ Responsive helpers
//   const {isXS, isSM, isMD, isLG} = useResponsive();
//   const {spacing, typography} = useResponsiveTheme();

//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     h('impactLight');
//     setIsHolding(true);
//     startListening();
//   };
//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//     h('selection');
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: spacing.md},
//     input: {
//       height: moderateScale(48),
//       paddingHorizontal: spacing.md,
//       fontSize: typography.body, // static font size from theme
//       paddingRight: spacing.xl * 2.5,
//       marginTop: spacing.md,
//       borderWidth: tokens.borderWidth.xl,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: moderateScale(20),
//       color: theme.colors.foreground,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: spacing.lg * 1.5,
//       top: spacing.xs,
//       zIndex: 2,
//       elevation: 2,
//       pointerEvents: 'box-none',
//       marginTop: spacing.md,
//     },
//     micTouch: {
//       width: moderateScale(36),
//       height: moderateScale(38),
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: moderateScale(10),
//     },
//     clearIcon: {position: 'absolute', right: spacing.md, top: spacing.sm},
//     card: {
//       padding: spacing.md,
//       borderRadius: moderateScale(14),
//       marginBottom: spacing.sm,
//     },
//     groupLabel: {
//       marginTop: spacing.lg,
//       marginBottom: spacing.sm,
//       fontSize: typography.body,
//       fontWeight: '600',
//       color: theme.colors.foreground2,
//     },
//     outfitImage: {
//       width: isXS ? 50 : isSM ? 56 : 60,
//       height: isXS ? 50 : isSM ? 56 : 60,
//       borderRadius: moderateScale(8),
//       marginRight: spacing.sm,
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       return res.json();
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       return res.json();
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         (item as any).mainCategory,
//         (item as any).subCategory,
//         (item as any).color,
//         (item as any).material,
//         (item as any).fit,
//         (item as any).size,
//         Array.isArray((item as any).tags) ? (item as any).tags.join(' ') : '',
//         (item as any).notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const noWardrobeItems = wardrobe.length === 0;

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled"
//       scrollEnabled={!isHolding}>
//       <Text
//         style={[
//           globalStyles.header,
//           {color: theme.colors.foreground, fontSize: typography.heading},
//         ]}>
//         Search Wardrobe Items
//       </Text>

//       <Animatable.View
//         animation="fadeIn"
//         duration={600}
//         easing="ease-out-cubic"
//         style={{flex: 1}}>
//         <View style={globalStyles.section}>
//           <View style={[globalStyles.backContainer, {marginTop: spacing.md}]}>
//             <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//               <MaterialIcons
//                 name="arrow-back"
//                 size={moderateScale(26)}
//                 color={theme.colors.button3}
//               />
//             </AppleTouchFeedback>
//             <Text
//               style={[
//                 globalStyles.backText,
//                 {marginLeft: spacing.sm, fontSize: typography.body},
//               ]}>
//               Back
//             </Text>
//           </View>

//           <View style={globalStyles.centeredSection}>
//             <View style={styles.inputWrapper}>
//               <TextInput
//                 placeholder="Say type of clothing items.. shoes, pants, coats"
//                 placeholderTextColor={'#9b9b9bff'}
//                 value={query}
//                 onChangeText={setQuery}
//                 style={styles.input}
//               />

//               <View style={styles.micWrap} pointerEvents="box-none">
//                 <AppleTouchFeedback hapticStyle="impactLight">
//                   <TouchableOpacity
//                     style={styles.micTouch}
//                     onPressIn={handleMicPressIn}
//                     onPressOut={handleMicPressOut}
//                     hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                     <MaterialIcons
//                       name={isRecording ? 'mic' : 'mic-none'}
//                       size={moderateScale(24)}
//                       color={
//                         isRecording
//                           ? theme.colors.primary
//                           : theme.colors.foreground2
//                       }
//                     />
//                   </TouchableOpacity>
//                 </AppleTouchFeedback>
//               </View>

//               {query.length > 0 && (
//                 <AppleTouchFeedback
//                   onPress={() => {
//                     setQuery('');
//                     h('selection');
//                   }}
//                   hapticStyle="impactLight"
//                   style={styles.clearIcon}>
//                   <MaterialIcons
//                     name="close"
//                     size={moderateScale(22)}
//                     color={theme.colors.foreground}
//                   />
//                 </AppleTouchFeedback>
//               )}
//             </View>

//             {filteredWardrobe.length > 0 && (
//               <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//             )}
//             {filteredWardrobe.map(item => (
//               <AppleTouchFeedback
//                 key={item.id}
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   h('selection');
//                   navigate('ItemDetail', {item});
//                 }}
//                 style={[
//                   styles.card,
//                   {
//                     backgroundColor: theme.colors.surface,
//                     borderColor: theme.colors.surfaceBorder,
//                     borderWidth: tokens.borderWidth.hairline,
//                   },
//                 ]}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '500',
//                     fontSize: typography.small,
//                   }}>
//                   {item.name}
//                 </Text>
//               </AppleTouchFeedback>
//             ))}

//             {filteredOutfits.length > 0 && (
//               <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//             )}
//             {filteredOutfits.map((outfit: SavedOutfit) => (
//               <View
//                 key={outfit.id}
//                 style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '500',
//                     fontSize: typography.body,
//                   }}>
//                   {outfit.name?.trim() || 'Unnamed Outfit'}
//                 </Text>
//                 <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
//                   {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                     (i as any)?.image ? (
//                       <Image
//                         key={(i as any).id}
//                         source={{uri: (i as any).image}}
//                         style={styles.outfitImage}
//                       />
//                     ) : null,
//                   )}
//                 </View>
//               </View>
//             ))}

//             {noWardrobeItems && (
//               <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//                 <Text
//                   style={[
//                     globalStyles.missingDataMessage1,
//                     {fontSize: typography.body},
//                   ]}>
//                   No wardrobe items.
//                 </Text>
//                 <TooltipBubble
//                   message='Add wardrobe items from the "Wardrobe" page to be able to search wardrobe items here.'
//                   position="top"
//                 />
//               </View>
//             )}

//             {filteredWardrobe.length === 0 &&
//               filteredOutfits.length === 0 &&
//               !noWardrobeItems && (
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: spacing.lg,
//                     fontSize: typography.body,
//                   }}>
//                   No results found.
//                 </Text>
//               )}
//           </View>
//         </View>
//       </Animatable.View>
//     </ScrollView>
//   );
// }

////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {tokens} from '../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // iOS audio session prep
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   // voice -> input
//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     h('impactLight'); // start recording
//     setIsHolding(true);
//     startListening();
//   };
//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//     h('selection'); // stop recording
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: 16},
//     input: {
//       height: 45,
//       paddingHorizontal: 14,
//       fontSize: 16,
//       paddingRight: 88,
//       marginTop: 22,
//       borderWidth: tokens.borderWidth.xl,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 20,
//       color: theme.colors.foreground,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: 44,
//       top: 5,
//       zIndex: 2,
//       elevation: 2,
//       pointerEvents: 'box-none',
//       marginTop: 22,
//     },
//     micTouch: {
//       width: 30,
//       height: 37,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 8,
//     },
//     clearIcon: {position: 'absolute', right: 12, top: 12},
//     card: {
//       padding: 14,
//       borderRadius: 12,
//       marginBottom: 10,
//     },
//     groupLabel: {
//       marginTop: 20,
//       marginBottom: 6,
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.foreground2,
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         (item as any).mainCategory,
//         (item as any).subCategory,
//         (item as any).color,
//         (item as any).material,
//         (item as any).fit,
//         (item as any).size,
//         Array.isArray((item as any).tags) ? (item as any).tags.join(' ') : '',
//         (item as any).notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const noWardrobeItems = wardrobe.length === 0;

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled"
//       scrollEnabled={!isHolding}>
//       {/* 🧭 Static header — no animation */}
//       <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Search Wardrobe Items
//       </Text>

//       {/* ✨ Animate everything below */}
//       <Animatable.View
//         animation="fadeIn"
//         duration={600}
//         easing="ease-out-cubic"
//         style={{flex: 1}}>
//         <View style={globalStyles.section}>
//           <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//             <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//               <MaterialIcons
//                 name="arrow-back"
//                 size={24}
//                 color={theme.colors.button3}
//               />
//             </AppleTouchFeedback>
//             <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//           </View>

//           <View style={globalStyles.centeredSection}>
//             {/* Input + Mic + Clear */}
//             <View style={styles.inputWrapper}>
//               <TextInput
//                 placeholder="Say type of clothing items..shoes, pants, coats"
//                 placeholderTextColor={'#9b9b9bff'}
//                 value={query}
//                 onChangeText={text => {
//                   setQuery(text);
//                 }}
//                 style={styles.input}
//               />

//               {/* 🎙️ Mic INSIDE the input (press-and-hold) */}
//               <View style={styles.micWrap} pointerEvents="box-none">
//                 <AppleTouchFeedback hapticStyle="impactLight">
//                   <TouchableOpacity
//                     style={styles.micTouch}
//                     onPressIn={handleMicPressIn}
//                     onPressOut={handleMicPressOut}
//                     hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                     <MaterialIcons
//                       name={isRecording ? 'mic' : 'mic-none'}
//                       size={22}
//                       color={
//                         isRecording
//                           ? theme.colors.primary
//                           : theme.colors.foreground2
//                       }
//                     />
//                   </TouchableOpacity>
//                 </AppleTouchFeedback>
//               </View>

//               {/* Clear */}
//               {query.length > 0 && (
//                 <AppleTouchFeedback
//                   onPress={() => {
//                     setQuery('');
//                     h('selection');
//                   }}
//                   hapticStyle="impactLight"
//                   style={styles.clearIcon}>
//                   <MaterialIcons
//                     name="close"
//                     size={20}
//                     color={theme.colors.foreground}
//                   />
//                 </AppleTouchFeedback>
//               )}
//             </View>

//             {/* 👕 Wardrobe results */}
//             {filteredWardrobe.length > 0 && (
//               <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//             )}
//             {filteredWardrobe.map(item => (
//               <AppleTouchFeedback
//                 key={item.id}
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   h('selection');
//                   navigate('ItemDetail', {item});
//                 }}
//                 style={[
//                   styles.card,
//                   {
//                     backgroundColor: theme.colors.surface,
//                     borderColor: theme.colors.surfaceBorder,
//                     borderWidth: tokens.borderWidth.hairline,
//                   },
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                   {item.name}
//                 </Text>
//               </AppleTouchFeedback>
//             ))}

//             {/* 📦 Saved Outfits */}
//             {filteredOutfits.length > 0 && (
//               <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//             )}
//             {filteredOutfits.map((outfit: SavedOutfit) => (
//               <View
//                 key={outfit.id}
//                 style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                   {outfit.name?.trim() || 'Unnamed Outfit'}
//                 </Text>
//                 <View style={{flexDirection: 'row', marginTop: 6}}>
//                   {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                     (i as any)?.image ? (
//                       <Image
//                         key={(i as any).id}
//                         source={{uri: (i as any).image}}
//                         style={{width: 60, height: 60, borderRadius: 8}}
//                       />
//                     ) : null,
//                   )}
//                 </View>
//               </View>
//             ))}

//             {/* 🪶 Empty States */}
//             {noWardrobeItems && (
//               <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//                 <Text style={globalStyles.missingDataMessage1}>
//                   No wardrobe items.
//                 </Text>
//                 <TooltipBubble
//                   message='Add wardrobe items from the "Wardrobe" page to be able to search wardrobe items here.'
//                   position="top"
//                 />
//               </View>
//             )}

//             {filteredWardrobe.length === 0 &&
//               filteredOutfits.length === 0 &&
//               !noWardrobeItems && (
//                 <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//                   No results found.
//                 </Text>
//               )}
//           </View>
//         </View>
//       </Animatable.View>
//     </ScrollView>
//   );
// }

////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {tokens} from '../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // iOS audio session prep
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   // voice -> input
//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     h('impactLight'); // start recording
//     setIsHolding(true);
//     startListening();
//   };
//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//     h('selection'); // stop recording
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: 16},
//     input: {
//       height: 45,
//       paddingHorizontal: 14,
//       fontSize: 16,
//       paddingRight: 88,
//       marginTop: 22,
//       borderWidth: tokens.borderWidth.xl,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 20,
//       color: theme.colors.foreground,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: 44,
//       top: 5,
//       zIndex: 2,
//       elevation: 2,
//       pointerEvents: 'box-none',
//       marginTop: 22,
//     },
//     micTouch: {
//       width: 30,
//       height: 37,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 8,
//     },
//     clearIcon: {position: 'absolute', right: 12, top: 12},
//     card: {
//       padding: 14,
//       borderRadius: 12,
//       marginBottom: 10,
//     },
//     groupLabel: {
//       marginTop: 20,
//       marginBottom: 6,
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.foreground2,
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         (item as any).mainCategory,
//         (item as any).subCategory,
//         (item as any).color,
//         (item as any).material,
//         (item as any).fit,
//         (item as any).size,
//         Array.isArray((item as any).tags) ? (item as any).tags.join(' ') : '',
//         (item as any).notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const noWardrobeItems = wardrobe.length === 0;

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled"
//       scrollEnabled={!isHolding}>
//       {/* 🧭 Static header — no animation */}
//       <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Search
//       </Text>

//       {/* ✨ Animate everything below */}
//       <Animatable.View
//         animation="fadeIn"
//         duration={600}
//         easing="ease-out-cubic"
//         style={{flex: 1}}>
//         <View style={globalStyles.section}>
//           <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//             <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//               <MaterialIcons
//                 name="arrow-back"
//                 size={24}
//                 color={theme.colors.button3}
//               />
//             </AppleTouchFeedback>
//             <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//           </View>

//           <View style={globalStyles.centeredSection}>
//             {/* Input + Mic + Clear */}
//             <View style={styles.inputWrapper}>
//               <TextInput
//                 placeholder="Say type of clothing items..shoes, pants, coats"
//                 placeholderTextColor={'#9b9b9bff'}
//                 value={query}
//                 onChangeText={text => {
//                   setQuery(text);
//                 }}
//                 style={styles.input}
//               />

//               {/* 🎙️ Mic INSIDE the input (press-and-hold) */}
//               <View style={styles.micWrap} pointerEvents="box-none">
//                 <AppleTouchFeedback hapticStyle="impactLight">
//                   <TouchableOpacity
//                     style={styles.micTouch}
//                     onPressIn={handleMicPressIn}
//                     onPressOut={handleMicPressOut}
//                     hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                     <MaterialIcons
//                       name={isRecording ? 'mic' : 'mic-none'}
//                       size={22}
//                       color={
//                         isRecording
//                           ? theme.colors.primary
//                           : theme.colors.foreground2
//                       }
//                     />
//                   </TouchableOpacity>
//                 </AppleTouchFeedback>
//               </View>

//               {/* Clear */}
//               {query.length > 0 && (
//                 <AppleTouchFeedback
//                   onPress={() => {
//                     setQuery('');
//                     h('selection');
//                   }}
//                   hapticStyle="impactLight"
//                   style={styles.clearIcon}>
//                   <MaterialIcons
//                     name="close"
//                     size={20}
//                     color={theme.colors.foreground}
//                   />
//                 </AppleTouchFeedback>
//               )}
//             </View>

//             {/* 👕 Wardrobe results */}
//             {filteredWardrobe.length > 0 && (
//               <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//             )}
//             {filteredWardrobe.map(item => (
//               <AppleTouchFeedback
//                 key={item.id}
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   h('selection');
//                   navigate('ItemDetail', {item});
//                 }}
//                 style={[
//                   styles.card,
//                   {
//                     backgroundColor: theme.colors.surface,
//                     borderColor: theme.colors.surfaceBorder,
//                     borderWidth: tokens.borderWidth.hairline,
//                   },
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                   {item.name}
//                 </Text>
//               </AppleTouchFeedback>
//             ))}

//             {/* 📦 Saved Outfits */}
//             {filteredOutfits.length > 0 && (
//               <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//             )}
//             {filteredOutfits.map((outfit: SavedOutfit) => (
//               <View
//                 key={outfit.id}
//                 style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                   {outfit.name?.trim() || 'Unnamed Outfit'}
//                 </Text>
//                 <View style={{flexDirection: 'row', marginTop: 6}}>
//                   {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                     (i as any)?.image ? (
//                       <Image
//                         key={(i as any).id}
//                         source={{uri: (i as any).image}}
//                         style={{width: 60, height: 60, borderRadius: 8}}
//                       />
//                     ) : null,
//                   )}
//                 </View>
//               </View>
//             ))}

//             {/* 🪶 Empty States */}
//             {noWardrobeItems && (
//               <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//                 <Text style={globalStyles.missingDataMessage1}>
//                   No wardrobe items.
//                 </Text>
//                 <TooltipBubble
//                   message='Add wardrobe items from the "Wardrobe" page to be able to search wardrobe items here.'
//                   position="top"
//                 />
//               </View>
//             )}

//             {filteredWardrobe.length === 0 &&
//               filteredOutfits.length === 0 &&
//               !noWardrobeItems && (
//                 <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//                   No results found.
//                 </Text>
//               )}
//           </View>
//         </View>
//       </Animatable.View>
//     </ScrollView>
//   );
// }

//////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {tokens} from '../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // iOS audio session prep
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   // voice -> input
//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     h('impactLight'); // start recording
//     setIsHolding(true);
//     startListening();
//   };
//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//     h('selection'); // stop recording
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: 16},
//     input: {
//       height: 45,
//       paddingHorizontal: 14,
//       fontSize: 16,
//       paddingRight: 88,
//       marginTop: 22,
//       borderWidth: tokens.borderWidth.xl,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 20,
//       color: theme.colors.foreground,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: 44,
//       top: 5,
//       zIndex: 2,
//       elevation: 2,
//       pointerEvents: 'box-none',
//       marginTop: 22,
//     },
//     micTouch: {
//       width: 30,
//       height: 37,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 8,
//     },
//     clearIcon: {position: 'absolute', right: 12, top: 12},
//     card: {
//       padding: 14,
//       borderRadius: 12,
//       marginBottom: 10,
//     },
//     groupLabel: {
//       marginTop: 20,
//       marginBottom: 6,
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.foreground2,
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         (item as any).mainCategory,
//         (item as any).subCategory,
//         (item as any).color,
//         (item as any).material,
//         (item as any).fit,
//         (item as any).size,
//         Array.isArray((item as any).tags) ? (item as any).tags.join(' ') : '',
//         (item as any).notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled"
//       scrollEnabled={!isHolding}>
//       {/* 🧭 Static header — no animation */}
//       <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Search
//       </Text>

//       {/* ✨ Animate everything below */}
//       <Animatable.View
//         animation="fadeIn"
//         duration={600}
//         easing="ease-out-cubic"
//         style={{flex: 1}}>
//         <View style={globalStyles.section}>
//           <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//             <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//               <MaterialIcons
//                 name="arrow-back"
//                 size={24}
//                 color={theme.colors.button3}
//               />
//             </AppleTouchFeedback>
//             <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//           </View>

//           <View style={globalStyles.centeredSection}>
//             {/* Input + Mic + Clear */}
//             <View style={styles.inputWrapper}>
//               <TextInput
//                 placeholder="Say type of clothing items..shoes, pants, coats"
//                 placeholderTextColor={'#9b9b9bff'}
//                 value={query}
//                 onChangeText={text => {
//                   setQuery(text);
//                 }}
//                 style={styles.input}
//               />

//               {/* 🎙️ Mic INSIDE the input (press-and-hold) */}
//               <View style={styles.micWrap} pointerEvents="box-none">
//                 <AppleTouchFeedback hapticStyle="impactLight">
//                   <TouchableOpacity
//                     style={styles.micTouch}
//                     onPressIn={handleMicPressIn}
//                     onPressOut={handleMicPressOut}
//                     hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                     <MaterialIcons
//                       name={isRecording ? 'mic' : 'mic-none'}
//                       size={22}
//                       color={
//                         isRecording
//                           ? theme.colors.primary
//                           : theme.colors.foreground2
//                       }
//                     />
//                   </TouchableOpacity>
//                 </AppleTouchFeedback>
//               </View>

//               {/* Clear */}
//               {query.length > 0 && (
//                 <AppleTouchFeedback
//                   onPress={() => {
//                     setQuery('');
//                     h('selection');
//                   }}
//                   hapticStyle="impactLight"
//                   style={styles.clearIcon}>
//                   <MaterialIcons
//                     name="close"
//                     size={20}
//                     color={theme.colors.foreground}
//                   />
//                 </AppleTouchFeedback>
//               )}
//             </View>

//             {filteredWardrobe.length > 0 && (
//               <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//             )}
//             {filteredWardrobe.map(item => (
//               <AppleTouchFeedback
//                 key={item.id}
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   h('selection');
//                   navigate('ItemDetail', {item});
//                 }}
//                 style={[
//                   styles.card,
//                   {
//                     backgroundColor: theme.colors.surface,
//                     borderColor: theme.colors.surfaceBorder,
//                     borderWidth: tokens.borderWidth.hairline,
//                   },
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                   {item.name}
//                 </Text>
//               </AppleTouchFeedback>
//             ))}

//             {filteredOutfits.length > 0 && (
//               <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//             )}
//             {filteredOutfits.map((outfit: SavedOutfit) => (
//               <View
//                 key={outfit.id}
//                 style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                   {outfit.name?.trim() || 'Unnamed Outfit'}
//                 </Text>
//                 <View style={{flexDirection: 'row', marginTop: 6}}>
//                   {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                     (i as any)?.image ? (
//                       <Image
//                         key={(i as any).id}
//                         source={{uri: (i as any).image}}
//                         style={{width: 60, height: 60, borderRadius: 8}}
//                       />
//                     ) : null,
//                   )}
//                 </View>
//               </View>
//             ))}

//             {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
//               <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//                 No results found.
//               </Text>
//             )}
//           </View>
//         </View>
//       </Animatable.View>
//     </ScrollView>
//   );
// }

///////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {tokens} from '../styles/tokens/tokens';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // iOS audio session prep
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   // voice -> input
//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     h('impactLight'); // start recording
//     setIsHolding(true);
//     startListening();
//   };
//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//     h('selection'); // stop recording
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: 16},
//     input: {
//       height: 45,
//       paddingHorizontal: 14,
//       fontSize: 16,
//       paddingRight: 88,
//       marginTop: 22,
//       borderWidth: tokens.borderWidth.xl,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 20,
//       color: theme.colors.foreground,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: 44,
//       top: 5,
//       zIndex: 2,
//       elevation: 2,
//       pointerEvents: 'box-none',
//       marginTop: 22,
//     },
//     micTouch: {
//       width: 30,
//       height: 37,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 8,
//     },
//     clearIcon: {position: 'absolute', right: 12, top: 12},
//     card: {
//       padding: 14,
//       borderRadius: 12,
//       marginBottom: 10,
//     },
//     groupLabel: {
//       marginTop: 20,
//       marginBottom: 6,
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.foreground2,
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         (item as any).mainCategory,
//         (item as any).subCategory,
//         (item as any).color,
//         (item as any).material,
//         (item as any).fit,
//         (item as any).size,
//         Array.isArray((item as any).tags) ? (item as any).tags.join(' ') : '',
//         (item as any).notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled"
//       scrollEnabled={!isHolding}>
//       <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Search
//       </Text>

//       <View style={globalStyles.section}>
//         <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//           <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//             <MaterialIcons
//               name="arrow-back"
//               size={24}
//               color={theme.colors.button3}
//             />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           {/* Input + Mic + Clear */}
//           <View style={styles.inputWrapper}>
//             <TextInput
//               placeholder="Say type of clothing items..shoes, pants, coats"
//               placeholderTextColor={'#9b9b9bff'}
//               value={query}
//               onChangeText={text => {
//                 setQuery(text);
//               }}
//               style={styles.input}
//             />

//             {/* 🎙️ Mic INSIDE the input (press-and-hold) */}
//             <View style={styles.micWrap} pointerEvents="box-none">
//               <AppleTouchFeedback hapticStyle="impactLight">
//                 <TouchableOpacity
//                   style={styles.micTouch}
//                   onPressIn={handleMicPressIn}
//                   onPressOut={handleMicPressOut}
//                   hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                   <MaterialIcons
//                     name={isRecording ? 'mic' : 'mic-none'}
//                     size={22}
//                     color={
//                       isRecording
//                         ? theme.colors.primary
//                         : theme.colors.foreground2
//                     }
//                   />
//                 </TouchableOpacity>
//               </AppleTouchFeedback>
//             </View>

//             {/* Clear */}
//             {query.length > 0 && (
//               <AppleTouchFeedback
//                 onPress={() => {
//                   setQuery('');
//                   h('selection');
//                 }}
//                 hapticStyle="impactLight"
//                 style={styles.clearIcon}>
//                 <MaterialIcons
//                   name="close"
//                   size={20}
//                   color={theme.colors.foreground}
//                 />
//               </AppleTouchFeedback>
//             )}
//           </View>

//           {filteredWardrobe.length > 0 && (
//             <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//           )}
//           {filteredWardrobe.map(item => (
//             <AppleTouchFeedback
//               key={item.id}
//               hapticStyle="impactLight"
//               onPress={() => {
//                 h('selection');
//                 navigate('ItemDetail', {item});
//               }}
//               style={[
//                 styles.card,
//                 {
//                   backgroundColor: theme.colors.surface,
//                   borderColor: theme.colors.surfaceBorder,
//                   borderWidth: tokens.borderWidth.hairline,
//                 },
//               ]}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {item.name}
//               </Text>
//             </AppleTouchFeedback>
//           ))}

//           {filteredOutfits.length > 0 && (
//             <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//           )}
//           {filteredOutfits.map((outfit: SavedOutfit) => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {outfit.name?.trim() || 'Unnamed Outfit'}
//               </Text>
//               <View style={{flexDirection: 'row', marginTop: 6}}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   (i as any)?.image ? (
//                     <Image
//                       key={(i as any).id}
//                       source={{uri: (i as any).image}}
//                       style={{width: 60, height: 60, borderRadius: 8}}
//                     />
//                   ) : null,
//                 )}
//               </View>
//             </View>
//           ))}

//           {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
//             <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//               No results found.
//             </Text>
//           )}
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

/////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {tokens} from '../styles/tokens/tokens';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // iOS audio session prep
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   // voice -> input
//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     setIsHolding(true);
//     startListening();
//   };
//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: 16},
//     input: {
//       height: 40,
//       paddingHorizontal: 14,
//       fontSize: 16,
//       paddingRight: 88,
//       marginTop: 22,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 20,
//       color: theme.colors.foreground,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: 44,
//       top: 5, // centers 22px icon in 48px input
//       zIndex: 2, // iOS
//       elevation: 2, // Android
//       // let input still get touches outside the icon bounds
//       pointerEvents: 'box-none',
//       marginTop: 22,
//     },
//     micTouch: {
//       width: 30,
//       height: 32,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 8,
//     },
//     clearIcon: {position: 'absolute', right: 12, top: 12},
//     card: {
//       padding: 14,
//       borderRadius: 12,
//       marginBottom: 10,
//     },
//     groupLabel: {
//       marginTop: 20,
//       marginBottom: 6,
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.foreground2,
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         item.mainCategory,
//         item.subCategory,
//         item.color,
//         item.material,
//         item.fit,
//         item.size,
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled"
//       scrollEnabled={!isHolding}>
//       <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Search
//       </Text>

//       <View style={globalStyles.section}>
//         <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//           <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//             <MaterialIcons
//               name="arrow-back"
//               size={24}
//               color={theme.colors.button3}
//             />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           {/* Input + Mic + Clear */}
//           <View style={styles.inputWrapper}>
//             <TextInput
//               placeholder="Say type of clothing items..shoes, pants, coats"
//               placeholderTextColor={'#9b9b9bff'}
//               value={query}
//               onChangeText={text => {
//                 setQuery(text);
//               }}
//               style={styles.input}
//             />

//             {/* 🎙️ Mic INSIDE the input (press-and-hold) */}
//             <View style={styles.micWrap} pointerEvents="box-none">
//               <AppleTouchFeedback type="light">
//                 <TouchableOpacity
//                   style={styles.micTouch}
//                   onPressIn={handleMicPressIn}
//                   onPressOut={handleMicPressOut}
//                   hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                   <MaterialIcons
//                     name={isRecording ? 'mic' : 'mic-none'}
//                     size={22}
//                     color={
//                       isRecording
//                         ? theme.colors.primary
//                         : theme.colors.foreground2
//                     }
//                   />
//                 </TouchableOpacity>
//               </AppleTouchFeedback>
//             </View>

//             {/* Clear (unchanged) */}
//             {query.length > 0 && (
//               <AppleTouchFeedback
//                 onPress={() => setQuery('')}
//                 hapticStyle="impactLight"
//                 style={styles.clearIcon}>
//                 <MaterialIcons
//                   name="close"
//                   size={20}
//                   color={theme.colors.foreground}
//                 />
//               </AppleTouchFeedback>
//             )}
//           </View>

//           {filteredWardrobe.length > 0 && (
//             <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//           )}
//           {filteredWardrobe.map(item => (
//             <TouchableOpacity
//               key={item.id}
//               style={[
//                 styles.card,
//                 {
//                   backgroundColor: theme.colors.surface,
//                   borderColor: theme.colors.surfaceBorder,
//                   borderWidth: tokens.borderWidth.hairline,
//                 },
//               ]}
//               onPress={() => navigate('ItemDetail', {item})}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {item.name}
//               </Text>
//             </TouchableOpacity>
//           ))}

//           {filteredOutfits.length > 0 && (
//             <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//           )}
//           {filteredOutfits.map((outfit: SavedOutfit) => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {outfit.name?.trim() || 'Unnamed Outfit'}
//               </Text>
//               <View style={{flexDirection: 'row', marginTop: 6}}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   i?.image ? (
//                     <Image
//                       key={i.id}
//                       source={{uri: i.image}}
//                       style={{width: 60, height: 60, borderRadius: 8}}
//                     />
//                   ) : null,
//                 )}
//               </View>
//             </View>
//           ))}

//           {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
//             <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//               No results found.
//             </Text>
//           )}
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

//////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // iOS audio session prep
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   // voice -> input
//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     setIsHolding(true);
//     startListening();
//   };
//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: 16},
//     input: {
//       height: 50,
//       borderWidth: 1,
//       borderRadius: 18,
//       paddingHorizontal: 14,
//       fontSize: 16,
//       // space for mic (right:44) + clear (right:12)
//       paddingRight: 88,
//       marginTop: 22,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: 44,
//       top: 8, // centers 22px icon in 48px input
//       zIndex: 2, // iOS
//       elevation: 2, // Android
//       // let input still get touches outside the icon bounds
//       pointerEvents: 'box-none',
//       marginTop: 22,
//     },
//     micTouch: {
//       width: 30,
//       height: 32,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 8,
//     },
//     clearIcon: {position: 'absolute', right: 12, top: 12},
//     card: {
//       padding: 14,
//       borderRadius: 12,
//       borderWidth: 1,
//       marginBottom: 12,
//     },
//     groupLabel: {
//       marginTop: 20,
//       marginBottom: 6,
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#999',
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         item.mainCategory,
//         item.subCategory,
//         item.color,
//         item.material,
//         item.fit,
//         item.size,
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled"
//       scrollEnabled={!isHolding}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Search
//       </Text>
//       <View style={globalStyles.section}>
//         <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//           <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//             <MaterialIcons
//               name="arrow-back"
//               size={24}
//               color={theme.colors.button3}
//             />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           {/* Input + Mic + Clear */}
//           <View style={styles.inputWrapper}>
//             <TextInput
//               placeholder="Say type of clothing items..shoes, pants, coats"
//               placeholderTextColor={'#9b9b9bff'}
//               value={query}
//               onChangeText={text => {
//                 // SEARCH LOGIC UNTOUCHED
//                 setQuery(text);
//               }}
//               style={[
//                 styles.input,
//                 {
//                   color: theme.colors.input,
//                   borderColor: theme.colors.foreground,
//                   backgroundColor: 'rgb(48, 48, 48)',
//                 },
//               ]}
//             />

//             {/* 🎙️ Mic INSIDE the input (press-and-hold) */}
//             <View style={styles.micWrap} pointerEvents="box-none">
//               <AppleTouchFeedback type="light">
//                 <TouchableOpacity
//                   style={styles.micTouch}
//                   onPressIn={handleMicPressIn}
//                   onPressOut={handleMicPressOut}
//                   hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                   <MaterialIcons
//                     name={isRecording ? 'mic' : 'mic-none'}
//                     size={22}
//                     color={
//                       isRecording
//                         ? theme.colors.primary
//                         : theme.colors.foreground2
//                     }
//                   />
//                 </TouchableOpacity>
//               </AppleTouchFeedback>
//             </View>

//             {/* Clear (unchanged) */}
//             {query.length > 0 && (
//               <AppleTouchFeedback
//                 onPress={() => setQuery('')}
//                 hapticStyle="impactLight"
//                 style={styles.clearIcon}>
//                 <MaterialIcons
//                   name="close"
//                   size={20}
//                   color={theme.colors.foreground}
//                 />
//               </AppleTouchFeedback>
//             )}
//           </View>

//           {filteredWardrobe.length > 0 && (
//             <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//           )}
//           {filteredWardrobe.map(item => (
//             <TouchableOpacity
//               key={item.id}
//               style={[
//                 styles.card,
//                 {
//                   backgroundColor: theme.colors.surface,
//                   borderColor: theme.colors.surface,
//                 },
//               ]}
//               onPress={() => navigate('ItemDetail', {item})}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {item.name}
//               </Text>
//             </TouchableOpacity>
//           ))}

//           {filteredOutfits.length > 0 && (
//             <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//           )}
//           {filteredOutfits.map((outfit: SavedOutfit) => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {outfit.name?.trim() || 'Unnamed Outfit'}
//               </Text>
//               <View style={{flexDirection: 'row', marginTop: 6}}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   i?.image ? (
//                     <Image
//                       key={i.id}
//                       source={{uri: i.image}}
//                       style={{width: 60, height: 60, borderRadius: 8}}
//                     />
//                   ) : null,
//                 )}
//               </View>
//             </View>
//           ))}

//           {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
//             <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//               No results found.
//             </Text>
//           )}
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

//////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // iOS audio session prep
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   // voice -> input
//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     setIsHolding(true);
//     startListening();
//   };
//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: 16},
//     input: {
//       height: 50,
//       borderWidth: 1,
//       borderRadius: 18,
//       paddingHorizontal: 14,
//       fontSize: 16,
//       // space for mic (right:44) + clear (right:12)
//       paddingRight: 88,
//       marginTop: 22,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: 44,
//       top: 8, // centers 22px icon in 48px input
//       zIndex: 2, // iOS
//       elevation: 2, // Android
//       // let input still get touches outside the icon bounds
//       pointerEvents: 'box-none',
//       marginTop: 22,
//     },
//     micTouch: {
//       width: 30,
//       height: 32,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 8,
//     },
//     clearIcon: {position: 'absolute', right: 12, top: 12},
//     card: {
//       padding: 14,
//       borderRadius: 12,
//       borderWidth: 1,
//       marginBottom: 12,
//     },
//     groupLabel: {
//       marginTop: 20,
//       marginBottom: 6,
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#999',
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         item.mainCategory,
//         item.subCategory,
//         item.color,
//         item.material,
//         item.fit,
//         item.size,
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled"
//       scrollEnabled={!isHolding}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Search
//       </Text>
//       <View style={globalStyles.section}>
//         <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//           <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//             <MaterialIcons
//               name="arrow-back"
//               size={24}
//               color={theme.colors.button3}
//             />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           {/* Input + Mic + Clear */}
//           <View style={styles.inputWrapper}>
//             <TextInput
//               placeholder="Say type of clothing items..shoes, pants, coats"
//               placeholderTextColor={'#9b9b9bff'}
//               value={query}
//               onChangeText={text => {
//                 // SEARCH LOGIC UNTOUCHED
//                 setQuery(text);
//               }}
//               style={[
//                 styles.input,
//                 {
//                   color: theme.colors.input,
//                   borderColor: theme.colors.foreground,
//                   backgroundColor: 'rgb(48, 48, 48)',
//                 },
//               ]}
//             />

//             {/* 🎙️ Mic INSIDE the input (press-and-hold) */}
//             <View style={styles.micWrap} pointerEvents="box-none">
//               <AppleTouchFeedback type="light">
//                 <TouchableOpacity
//                   style={styles.micTouch}
//                   onPressIn={handleMicPressIn}
//                   onPressOut={handleMicPressOut}
//                   hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                   <MaterialIcons
//                     name={isRecording ? 'mic' : 'mic-none'}
//                     size={22}
//                     color={
//                       isRecording
//                         ? theme.colors.primary
//                         : theme.colors.foreground2
//                     }
//                   />
//                 </TouchableOpacity>
//               </AppleTouchFeedback>
//             </View>

//             {/* Clear (unchanged) */}
//             {query.length > 0 && (
//               <AppleTouchFeedback
//                 onPress={() => setQuery('')}
//                 hapticStyle="impactLight"
//                 style={styles.clearIcon}>
//                 <MaterialIcons
//                   name="close"
//                   size={20}
//                   color={theme.colors.foreground}
//                 />
//               </AppleTouchFeedback>
//             )}
//           </View>

//           {filteredWardrobe.length > 0 && (
//             <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//           )}
//           {filteredWardrobe.map(item => (
//             <TouchableOpacity
//               key={item.id}
//               style={[
//                 styles.card,
//                 {
//                   backgroundColor: theme.colors.surface,
//                   borderColor: theme.colors.surface,
//                 },
//               ]}
//               onPress={() => navigate('ItemDetail', {item})}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {item.name}
//               </Text>
//             </TouchableOpacity>
//           ))}

//           {filteredOutfits.length > 0 && (
//             <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//           )}
//           {filteredOutfits.map((outfit: SavedOutfit) => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {outfit.name?.trim() || 'Unnamed Outfit'}
//               </Text>
//               <View style={{flexDirection: 'row', marginTop: 6}}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   i?.image ? (
//                     <Image
//                       key={i.id}
//                       source={{uri: i.image}}
//                       style={{width: 60, height: 60, borderRadius: 8}}
//                     />
//                   ) : null,
//                 )}
//               </View>
//             </View>
//           ))}

//           {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
//             <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//               No results found.
//             </Text>
//           )}
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // iOS audio session prep
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   // voice -> input
//   useEffect(() => {
//     setQuery(speech);
//   }, [speech]);

//   const handleMicPressIn = async () => {
//     const ok = await prepareAudio();
//     if (!ok) return;
//     setIsHolding(true);
//     startListening();
//   };
//   const handleMicPressOut = () => {
//     setIsHolding(false);
//     stopListening();
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: 16},
//     input: {
//       height: 50,
//       borderWidth: 1,
//       borderRadius: 18,
//       paddingHorizontal: 14,
//       fontSize: 16,
//       // space for mic (right:44) + clear (right:12)
//       paddingRight: 88,
//       marginTop: 22,
//     },
//     micWrap: {
//       position: 'absolute',
//       right: 44,
//       top: 8, // centers 22px icon in 48px input
//       zIndex: 2, // iOS
//       elevation: 2, // Android
//       // let input still get touches outside the icon bounds
//       pointerEvents: 'box-none',
//       marginTop: 22,
//     },
//     micTouch: {
//       width: 30,
//       height: 32,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 8,
//     },
//     clearIcon: {position: 'absolute', right: 12, top: 12},
//     card: {
//       padding: 14,
//       borderRadius: 12,
//       borderWidth: 1,
//       marginBottom: 12,
//     },
//     groupLabel: {
//       marginTop: 20,
//       marginBottom: 6,
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#999',
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       const data = await res.json();
//       return data;
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         item.mainCategory,
//         item.subCategory,
//         item.color,
//         item.material,
//         item.fit,
//         item.size,
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled"
//       scrollEnabled={!isHolding}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Search
//       </Text>
//       <View style={globalStyles.section}>
//         <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//           <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//             <MaterialIcons
//               name="arrow-back"
//               size={24}
//               color={theme.colors.button3}
//             />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           {/* Input + Mic + Clear */}
//           <View style={styles.inputWrapper}>
//             <TextInput
//               placeholder="Search wardrobe, saved outfits..."
//               placeholderTextColor={'#9b9b9bff'}
//               value={query}
//               onChangeText={text => {
//                 // SEARCH LOGIC UNTOUCHED
//                 setQuery(text);
//               }}
//               style={[
//                 styles.input,
//                 {
//                   color: theme.colors.input,
//                   borderColor: theme.colors.foreground,
//                   backgroundColor: 'rgb(48, 48, 48)',
//                 },
//               ]}
//             />

//             {/* 🎙️ Mic INSIDE the input (press-and-hold) */}
//             <View style={styles.micWrap} pointerEvents="box-none">
//               <AppleTouchFeedback type="light">
//                 <TouchableOpacity
//                   style={styles.micTouch}
//                   onPressIn={handleMicPressIn}
//                   onPressOut={handleMicPressOut}
//                   hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
//                   <MaterialIcons
//                     name={isRecording ? 'mic' : 'mic-none'}
//                     size={22}
//                     color={
//                       isRecording
//                         ? theme.colors.primary
//                         : theme.colors.foreground2
//                     }
//                   />
//                 </TouchableOpacity>
//               </AppleTouchFeedback>
//             </View>

//             {/* Clear (unchanged) */}
//             {query.length > 0 && (
//               <AppleTouchFeedback
//                 onPress={() => setQuery('')}
//                 hapticStyle="impactLight"
//                 style={styles.clearIcon}>
//                 <MaterialIcons
//                   name="close"
//                   size={20}
//                   color={theme.colors.foreground}
//                 />
//               </AppleTouchFeedback>
//             )}
//           </View>

//           {filteredWardrobe.length > 0 && (
//             <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//           )}
//           {filteredWardrobe.map(item => (
//             <TouchableOpacity
//               key={item.id}
//               style={[
//                 styles.card,
//                 {
//                   backgroundColor: theme.colors.surface,
//                   borderColor: theme.colors.surface,
//                 },
//               ]}
//               onPress={() => navigate('ItemDetail', {item})}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {item.name}
//               </Text>
//             </TouchableOpacity>
//           ))}

//           {filteredOutfits.length > 0 && (
//             <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//           )}
//           {filteredOutfits.map((outfit: SavedOutfit) => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {outfit.name?.trim() || 'Unnamed Outfit'}
//               </Text>
//               <View style={{flexDirection: 'row', marginTop: 6}}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   i?.image ? (
//                     <Image
//                       key={i.id}
//                       source={{uri: i.image}}
//                       style={{width: 60, height: 60, borderRadius: 8}}
//                     />
//                   ) : null,
//                 )}
//               </View>
//             </View>
//           ))}

//           {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
//             <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//               No results found.
//             </Text>
//           )}
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

/////////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   PanResponder,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [query, setQuery] = useState('');
//   const [isHolding, setIsHolding] = useState(false);

//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // 🧠 iOS audio session prep
//   async function prepareAudio() {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//       );
//       if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//         console.warn('🎙️ Mic permission denied');
//         return false;
//       }
//     } else {
//       try {
//         // Kickstart iOS AVAudioSession
//         const AV = require('react-native').NativeModules.AVAudioSession;
//         if (AV?.setCategory) {
//           await AV.setCategory('PlayAndRecord');
//           await AV.setActive(true);
//           console.log('🎙️ iOS audio session ready');
//         }
//       } catch (e) {
//         console.warn('AudioSession error', e);
//       }
//     }
//     return true;
//   }

//   useEffect(() => {
//     console.log('[SearchScreen] speech->query:', JSON.stringify(speech));
//     setQuery(speech);
//   }, [speech]);

//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,
//       onPanResponderGrant: async () => {
//         console.log('[SearchScreen] GRANT -> startListening()');
//         const ok = await prepareAudio();
//         if (!ok) return;
//         setIsHolding(true);
//         startListening();
//       },
//       onPanResponderMove: () => {},
//       onPanResponderRelease: () => {
//         console.log('[SearchScreen] RELEASE -> stopListening()');
//         setIsHolding(false);
//         stopListening();
//       },
//       onPanResponderTerminate: () => {
//         console.log('[SearchScreen] TERMINATE -> stopListening()');
//         setIsHolding(false);
//         stopListening();
//       },
//       onShouldBlockNativeResponder: () => true,
//     }),
//   ).current;

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     inputWrapper: {position: 'relative', marginBottom: 16},
//     input: {
//       height: 48,
//       borderWidth: 1,
//       borderRadius: 12,
//       paddingHorizontal: 14,
//       fontSize: 16,
//       paddingRight: 40,
//     },
//     clearIcon: {position: 'absolute', right: 12, top: 12},
//     card: {
//       padding: 14,
//       borderRadius: 12,
//       borderWidth: 1,
//       marginBottom: 12,
//     },
//     groupLabel: {
//       marginTop: 20,
//       marginBottom: 6,
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#999',
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       const data = await res.json();
//       console.log('[SearchScreen] wardrobe fetched:', data?.length);
//       return data;
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       const data = await res.json();
//       console.log('[SearchScreen] savedOutfits fetched:', data?.length);
//       return data;
//     },
//   });

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         item.mainCategory,
//         item.subCategory,
//         item.color,
//         item.material,
//         item.fit,
//         item.size,
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   console.log(
//     '[SearchScreen] query:',
//     JSON.stringify(query),
//     '| wardrobe results:',
//     filteredWardrobe.length,
//     '| outfit results:',
//     filteredOutfits.length,
//   );

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled"
//       scrollEnabled={!isHolding}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Search
//       </Text>
//       <View style={globalStyles.section}>
//         <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//           <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
//             <MaterialIcons
//               name="arrow-back"
//               size={24}
//               color={theme.colors.button3}
//             />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <View
//             {...panResponder.panHandlers}
//             style={{
//               alignSelf: 'center',
//               marginBottom: 20,
//               paddingVertical: 14,
//               paddingHorizontal: 16,
//               borderRadius: 12,
//               borderWidth: 1,
//               borderColor: theme.colors.surfaceBorder,
//               backgroundColor: isRecording
//                 ? theme.colors.primary
//                 : theme.colors.surface2,
//             }}>
//             <Text style={{color: '#fff', fontWeight: '600'}}>
//               {isRecording ? '🎤 Listening… (hold)' : '🎤 Hold to Voice Search'}
//             </Text>
//           </View>

//           <View style={styles.inputWrapper}>
//             <TextInput
//               placeholder="Search wardrobe, saved outfits..."
//               placeholderTextColor={theme.colors.foreground}
//               value={query}
//               onChangeText={text => {
//                 console.log('[SearchScreen] onChangeText:', text);
//                 setQuery(text);
//               }}
//               style={[
//                 styles.input,
//                 {
//                   color: theme.colors.foreground,
//                   borderColor: theme.colors.foreground,
//                   backgroundColor: theme.colors.surface,
//                 },
//               ]}
//             />
//             {query.length > 0 && (
//               <AppleTouchFeedback
//                 onPress={() => {
//                   console.log('[SearchScreen] Clear query');
//                   setQuery('');
//                 }}
//                 hapticStyle="impactLight"
//                 style={styles.clearIcon}>
//                 <MaterialIcons
//                   name="close"
//                   size={20}
//                   color={theme.colors.foreground}
//                 />
//               </AppleTouchFeedback>
//             )}
//           </View>

//           {filteredWardrobe.length > 0 && (
//             <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//           )}
//           {filteredWardrobe.map(item => (
//             <TouchableOpacity
//               key={item.id}
//               style={[
//                 styles.card,
//                 {
//                   backgroundColor: theme.colors.surface,
//                   borderColor: theme.colors.surface,
//                 },
//               ]}
//               onPress={() => {
//                 console.log('[SearchScreen] Navigate ItemDetail ->', item.id);
//                 navigate('ItemDetail', {item});
//               }}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {item.name}
//               </Text>
//             </TouchableOpacity>
//           ))}

//           {filteredOutfits.length > 0 && (
//             <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//           )}
//           {filteredOutfits.map((outfit: SavedOutfit) => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//                 {outfit.name?.trim() || 'Unnamed Outfit'}
//               </Text>
//               <View style={{flexDirection: 'row', marginTop: 6}}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   i?.image ? (
//                     <Image
//                       key={i.id}
//                       source={{uri: i.image}}
//                       style={{width: 60, height: 60, borderRadius: 8}}
//                     />
//                   ) : null,
//                 )}
//               </View>
//             </View>
//           ))}

//           {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
//             <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//               No results found.
//             </Text>
//           )}
//         </View>
//       </View>
//     </ScrollView>
//   );
// }
