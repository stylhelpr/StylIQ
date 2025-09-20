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

export default function SearchScreen({navigate, goBack}) {
  const userId = useUUID();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const [query, setQuery] = useState('');
  const [isHolding, setIsHolding] = useState(false);

  const {speech, isRecording, startListening, stopListening} =
    useVoiceControl();

  // iOS audio session prep
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

  // voice -> input
  useEffect(() => {
    setQuery(speech);
  }, [speech]);

  const handleMicPressIn = async () => {
    const ok = await prepareAudio();
    if (!ok) return;
    setIsHolding(true);
    startListening();
  };
  const handleMicPressOut = () => {
    setIsHolding(false);
    stopListening();
  };

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    inputWrapper: {position: 'relative', marginBottom: 16},
    input: {
      height: 40,
      paddingHorizontal: 14,
      fontSize: 16,
      paddingRight: 88,
      marginTop: 22,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      backgroundColor: theme.colors.surface3,
      borderRadius: 20,
    },
    micWrap: {
      position: 'absolute',
      right: 44,
      top: 5, // centers 22px icon in 48px input
      zIndex: 2, // iOS
      elevation: 2, // Android
      // let input still get touches outside the icon bounds
      pointerEvents: 'box-none',
      marginTop: 22,
    },
    micTouch: {
      width: 30,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    clearIcon: {position: 'absolute', right: 12, top: 12},
    card: {
      padding: 14,
      borderRadius: 12,
      marginBottom: 12,
    },
    groupLabel: {
      marginTop: 20,
      marginBottom: 6,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.foreground2,
    },
  });

  const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
    queryKey: ['wardrobe', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch wardrobe items');
      const data = await res.json();
      return data;
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
      const data = await res.json();
      return data;
    },
  });

  const matchesQuery = (text: string | undefined): boolean =>
    !!text?.toLowerCase().includes(query.toLowerCase());

  const filteredWardrobe = wardrobe.filter(item =>
    matchesQuery(
      [
        item.name,
        item.mainCategory,
        item.subCategory,
        item.color,
        item.material,
        item.fit,
        item.size,
        Array.isArray(item.tags) ? item.tags.join(' ') : '',
        item.notes,
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

  return (
    <ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={!isHolding}>
      <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
        Search
      </Text>
      <View style={globalStyles.section}>
        <View style={[globalStyles.backContainer, {marginTop: 16}]}>
          <AppleTouchFeedback onPress={goBack} hapticStyle="impactMedium">
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.button3}
            />
          </AppleTouchFeedback>
          <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
        </View>

        <View style={globalStyles.centeredSection}>
          {/* Input + Mic + Clear */}
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Say type of clothing items..shoes, pants, coats"
              placeholderTextColor={'#9b9b9bff'}
              value={query}
              onChangeText={text => {
                // SEARCH LOGIC UNTOUCHED
                setQuery(text);
              }}
              style={styles.input}
            />

            {/* 🎙️ Mic INSIDE the input (press-and-hold) */}
            <View style={styles.micWrap} pointerEvents="box-none">
              <AppleTouchFeedback type="light">
                <TouchableOpacity
                  style={styles.micTouch}
                  onPressIn={handleMicPressIn}
                  onPressOut={handleMicPressOut}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <MaterialIcons
                    name={isRecording ? 'mic' : 'mic-none'}
                    size={22}
                    color={
                      isRecording
                        ? theme.colors.primary
                        : theme.colors.foreground2
                    }
                  />
                </TouchableOpacity>
              </AppleTouchFeedback>
            </View>

            {/* Clear (unchanged) */}
            {query.length > 0 && (
              <AppleTouchFeedback
                onPress={() => setQuery('')}
                hapticStyle="impactLight"
                style={styles.clearIcon}>
                <MaterialIcons
                  name="close"
                  size={20}
                  color={theme.colors.foreground}
                />
              </AppleTouchFeedback>
            )}
          </View>

          {filteredWardrobe.length > 0 && (
            <Text style={styles.groupLabel}>👕 Wardrobe</Text>
          )}
          {filteredWardrobe.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.surfaceBorder,
                  borderWidth: tokens.borderWidth.hairline,
                },
              ]}
              onPress={() => navigate('ItemDetail', {item})}>
              <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}

          {filteredOutfits.length > 0 && (
            <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
          )}
          {filteredOutfits.map((outfit: SavedOutfit) => (
            <View
              key={outfit.id}
              style={[styles.card, {backgroundColor: theme.colors.surface}]}>
              <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
                {outfit.name?.trim() || 'Unnamed Outfit'}
              </Text>
              <View style={{flexDirection: 'row', marginTop: 6}}>
                {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
                  i?.image ? (
                    <Image
                      key={i.id}
                      source={{uri: i.image}}
                      style={{width: 60, height: 60, borderRadius: 8}}
                    />
                  ) : null,
                )}
              </View>
            </View>
          ))}

          {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
            <Text style={{color: theme.colors.foreground, marginTop: 20}}>
              No results found.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

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
