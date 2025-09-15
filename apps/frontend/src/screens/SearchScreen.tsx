import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  PanResponder,
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

  // 🧠 iOS audio session prep
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
        // Kickstart iOS AVAudioSession
        const AV = require('react-native').NativeModules.AVAudioSession;
        if (AV?.setCategory) {
          await AV.setCategory('PlayAndRecord');
          await AV.setActive(true);
          console.log('🎙️ iOS audio session ready');
        }
      } catch (e) {
        console.warn('AudioSession error', e);
      }
    }
    return true;
  }

  useEffect(() => {
    console.log('[SearchScreen] speech->query:', JSON.stringify(speech));
    setQuery(speech);
  }, [speech]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: async () => {
        console.log('[SearchScreen] GRANT -> startListening()');
        const ok = await prepareAudio();
        if (!ok) return;
        setIsHolding(true);
        startListening();
      },
      onPanResponderMove: () => {},
      onPanResponderRelease: () => {
        console.log('[SearchScreen] RELEASE -> stopListening()');
        setIsHolding(false);
        stopListening();
      },
      onPanResponderTerminate: () => {
        console.log('[SearchScreen] TERMINATE -> stopListening()');
        setIsHolding(false);
        stopListening();
      },
      onShouldBlockNativeResponder: () => true,
    }),
  ).current;

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    inputWrapper: {position: 'relative', marginBottom: 16},
    input: {
      height: 48,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontSize: 16,
      paddingRight: 40,
    },
    clearIcon: {position: 'absolute', right: 12, top: 12},
    card: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    groupLabel: {
      marginTop: 20,
      marginBottom: 6,
      fontSize: 16,
      fontWeight: '600',
      color: '#999',
    },
  });

  const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
    queryKey: ['wardrobe', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch wardrobe items');
      const data = await res.json();
      console.log('[SearchScreen] wardrobe fetched:', data?.length);
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
      console.log('[SearchScreen] savedOutfits fetched:', data?.length);
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

  console.log(
    '[SearchScreen] query:',
    JSON.stringify(query),
    '| wardrobe results:',
    filteredWardrobe.length,
    '| outfit results:',
    filteredOutfits.length,
  );

  return (
    <ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={!isHolding}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
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
          <View
            {...panResponder.panHandlers}
            style={{
              alignSelf: 'center',
              marginBottom: 20,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.surfaceBorder,
              backgroundColor: isRecording
                ? theme.colors.primary
                : theme.colors.surface2,
            }}>
            <Text style={{color: '#fff', fontWeight: '600'}}>
              {isRecording ? '🎤 Listening… (hold)' : '🎤 Hold to Voice Search'}
            </Text>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Search wardrobe, saved outfits..."
              placeholderTextColor={theme.colors.foreground}
              value={query}
              onChangeText={text => {
                console.log('[SearchScreen] onChangeText:', text);
                setQuery(text);
              }}
              style={[
                styles.input,
                {
                  color: theme.colors.foreground,
                  borderColor: theme.colors.foreground,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            />
            {query.length > 0 && (
              <AppleTouchFeedback
                onPress={() => {
                  console.log('[SearchScreen] Clear query');
                  setQuery('');
                }}
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
                  borderColor: theme.colors.surface,
                },
              ]}
              onPress={() => {
                console.log('[SearchScreen] Navigate ItemDetail ->', item.id);
                navigate('ItemDetail', {item});
              }}>
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
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useVoiceControl} from '../hooks/useVoiceControl'; // ✅ uses our super-logged hook

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

//   // Hook with exhaustive logging inside
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   // Mirror speech into input live
//   useEffect(() => {
//     // eslint-disable-next-line no-console
//     console.log('[SearchScreen] speech->query:', JSON.stringify(speech));
//     setQuery(speech);
//   }, [speech]);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
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
//       // eslint-disable-next-line no-console
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
//       // eslint-disable-next-line no-console
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

//   // eslint-disable-next-line no-console
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
//       keyboardShouldPersistTaps="handled">
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
//           {/* Voice Search w/ logs in hook */}
//           <TouchableOpacity
//             onPressIn={() => {
//               // eslint-disable-next-line no-console
//               console.log('[SearchScreen] PressIn -> startListening()');
//               startListening();
//             }}
//             onPressOut={() => {
//               // eslint-disable-next-line no-console
//               console.log('[SearchScreen] PressOut -> stopListening()');
//               stopListening();
//             }}
//             style={{alignSelf: 'center', marginBottom: 20}}>
//             <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//               {isRecording ? '🎤 Listening…' : '🎤 Hold to Voice Search'}
//             </Text>
//           </TouchableOpacity>

//           <View style={styles.inputWrapper}>
//             <TextInput
//               placeholder="Search wardrobe, saved outfits..."
//               placeholderTextColor={theme.colors.foreground}
//               value={query}
//               onChangeText={text => {
//                 // eslint-disable-next-line no-console
//                 console.log(
//                   '[SearchScreen] onChangeText:',
//                   JSON.stringify(text),
//                 );
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
//                   // eslint-disable-next-line no-console
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
//                 // eslint-disable-next-line no-console
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

/////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Voice from '@react-native-voice/voice';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import BackHeader from '../components/Backheader/Backheader';

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
//   const [isListening, setIsListening] = useState(false);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     backButton: {marginBottom: 12, alignSelf: 'flex-start'},
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
//       return await res.json();
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
//       return await res.json();
//     },
//   });

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       const spokenText = e.value?.[0];
//       if (spokenText) setQuery(spokenText);
//     };
//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const startVoice = async () => {
//     try {
//       setIsListening(true);
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//       setIsListening(false);
//     }
//   };

//   const stopVoice = async () => {
//     try {
//       await Voice.stop();
//     } catch (e) {
//       console.error('Voice stop error:', e);
//     }
//     setIsListening(false);
//   };

//   const handlePressIn = () => startVoice();
//   const handlePressOut = () => stopVoice();

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
//       keyboardShouldPersistTaps="handled">
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

//         {/* <AppleTouchFeedback
//         onPressIn={handlePressIn}
//         onPressOut={handlePressOut}
//         hapticStyle="impactLight"
//         style={{alignSelf: 'center', marginBottom: 12}}>
//         <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//           🎤 Hold to Voice Search
//         </Text>
//       </AppleTouchFeedback> */}

//         <View style={globalStyles.centeredSection}>
//           <TouchableOpacity
//             onPressIn={handlePressIn}
//             onPressOut={handlePressOut}
//             style={{alignSelf: 'center', marginBottom: 20}}>
//             <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//               🎤 Hold to Voice Search
//             </Text>
//           </TouchableOpacity>

//           <View style={styles.inputWrapper}>
//             <TextInput
//               placeholder="Search wardrobe, saved outfits..."
//               placeholderTextColor={theme.colors.foreground}
//               value={query}
//               onChangeText={setQuery}
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

///////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Voice from '@react-native-voice/voice';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import BackHeader from '../components/Backheader/Backheader';

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
//   const [isListening, setIsListening] = useState(false);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     backButton: {marginBottom: 12, alignSelf: 'flex-start'},
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
//       return await res.json();
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
//       return await res.json();
//     },
//   });

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       const spokenText = e.value?.[0];
//       if (spokenText) setQuery(spokenText);
//     };
//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const startVoice = async () => {
//     try {
//       setIsListening(true);
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//       setIsListening(false);
//     }
//   };

//   const stopVoice = async () => {
//     try {
//       await Voice.stop();
//     } catch (e) {
//       console.error('Voice stop error:', e);
//     }
//     setIsListening(false);
//   };

//   const handlePressIn = () => startVoice();
//   const handlePressOut = () => stopVoice();

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
//       keyboardShouldPersistTaps="handled">
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

//         {/* <AppleTouchFeedback
//         onPressIn={handlePressIn}
//         onPressOut={handlePressOut}
//         hapticStyle="impactLight"
//         style={{alignSelf: 'center', marginBottom: 12}}>
//         <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//           🎤 Hold to Voice Search
//         </Text>
//       </AppleTouchFeedback> */}

//         <TouchableOpacity
//           onPressIn={handlePressIn}
//           onPressOut={handlePressOut}
//           style={{alignSelf: 'center', marginBottom: 20}}>
//           <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//             🎤 Hold to Voice Search
//           </Text>
//         </TouchableOpacity>

//         <View style={styles.inputWrapper}>
//           <TextInput
//             placeholder="Search wardrobe, saved outfits..."
//             placeholderTextColor={theme.colors.foreground}
//             value={query}
//             onChangeText={setQuery}
//             style={[
//               styles.input,
//               {
//                 color: theme.colors.foreground,
//                 borderColor: theme.colors.foreground,
//                 backgroundColor: theme.colors.surface,
//               },
//             ]}
//           />
//           {query.length > 0 && (
//             <AppleTouchFeedback
//               onPress={() => setQuery('')}
//               hapticStyle="impactLight"
//               style={styles.clearIcon}>
//               <MaterialIcons
//                 name="close"
//                 size={20}
//                 color={theme.colors.foreground}
//               />
//             </AppleTouchFeedback>
//           )}
//         </View>

//         {filteredWardrobe.length > 0 && (
//           <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//         )}
//         {filteredWardrobe.map(item => (
//           <TouchableOpacity
//             key={item.id}
//             style={[
//               styles.card,
//               {
//                 backgroundColor: theme.colors.surface,
//                 borderColor: theme.colors.surface,
//               },
//             ]}
//             onPress={() => navigate('ItemDetail', {item})}>
//             <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//               {item.name}
//             </Text>
//           </TouchableOpacity>
//         ))}

//         {filteredOutfits.length > 0 && (
//           <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//         )}
//         {filteredOutfits.map((outfit: SavedOutfit) => (
//           <View
//             key={outfit.id}
//             style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//             <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//               {outfit.name?.trim() || 'Unnamed Outfit'}
//             </Text>
//             <View style={{flexDirection: 'row', marginTop: 6}}>
//               {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                 i?.image ? (
//                   <Image
//                     key={i.id}
//                     source={{uri: i.image}}
//                     style={{width: 60, height: 60, borderRadius: 8}}
//                   />
//                 ) : null,
//               )}
//             </View>
//           </View>
//         ))}

//         {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
//           <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//             No results found.
//           </Text>
//         )}
//       </View>
//     </ScrollView>
//   );
// }
