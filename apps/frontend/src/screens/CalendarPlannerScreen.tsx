import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import {useAuth0} from 'react-native-auth0';
import {Calendar, DateObject} from 'react-native-calendars';
import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type WardrobeItem = {
  id: string;
  name: string;
  image: string;
  mainCategory: string;
  subCategory: string;
  material: string;
  fit: string;
  color: string;
  size: string;
  notes: string;
};

type SavedOutfit = {
  id: string;
  name?: string;
  top: WardrobeItem | null;
  bottom: WardrobeItem | null;
  shoes: WardrobeItem | null;
  createdAt: string;
  tags?: string[];
  notes?: string;
  rating?: number;
  favorited?: boolean;
  plannedDate?: string;
  type?: 'custom' | 'ai';
};

// ───────── helpers ─────────
const getLocalDateKey = (iso: string) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatLocalTime = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function OutfitPlannerScreen() {
  const {user} = useAuth0();
  const userId = useUUID() || user?.sub || '';
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const colors = theme.colors;

  // ✨ Fade animation for content
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, []);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    card: {
      borderRadius: 16,
      padding: 14,
      marginBottom: 6,
      backgroundColor: theme.colors.surface3 ?? theme.colors.surface3,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.input2 ?? theme.colors.surfaceBorder,
    },
    name: {color: theme.colors.foreground, fontSize: 16, fontWeight: '600'},
    time: {color: theme.colors.foreground2, marginTop: 4, fontSize: 13},
    row: {flexDirection: 'row', marginTop: 10},
    thumb: {
      width: 68,
      height: 68,
      borderRadius: 12,
      marginRight: 8,
      borderWidth: theme.borderWidth?.md ?? StyleSheet.hairlineWidth,
      borderColor: theme.colors.surfaceBorder,
      backgroundColor: theme.colors.surface,
    },
    notes: {
      fontStyle: 'italic',
      color: theme.colors.foreground2,
      marginTop: 8,
      lineHeight: 18,
    },
    rating: {color: '#FFD700', marginTop: 6, fontSize: 16},
  });

  const [scheduledOutfits, setScheduledOutfits] = useState<SavedOutfit[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const normalizeImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  };

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const [aiRes, customRes, scheduledRes] = await Promise.all([
          fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
          fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
          fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
        ]);

        if (!aiRes.ok || !customRes.ok || !scheduledRes.ok) {
          throw new Error('Failed to fetch outfit schedule data');
        }

        const [aiData, customData, scheduledData] = await Promise.all([
          aiRes.json(),
          customRes.json(),
          scheduledRes.json(),
        ]);

        const scheduleMap: Record<string, string> = {};
        for (const s of scheduledData) {
          if (s.ai_outfit_id) {
            scheduleMap[s.ai_outfit_id] = s.scheduled_for;
          } else if (s.custom_outfit_id) {
            scheduleMap[s.custom_outfit_id] = s.scheduled_for;
          }
        }

        const normalize = (o: any, isCustom: boolean): SavedOutfit | null => {
          const id = o.id;
          const plannedDate = scheduleMap[id];
          if (!plannedDate) return null;

          return {
            id,
            name: o.name || '',
            top: o.top
              ? {
                  id: o.top.id,
                  name: o.top.name,
                  image: normalizeImageUrl(o.top.image || o.top.image_url),
                  mainCategory: '',
                  subCategory: '',
                  material: '',
                  fit: '',
                  color: '',
                  size: '',
                  notes: '',
                }
              : null,
            bottom: o.bottom
              ? {
                  id: o.bottom.id,
                  name: o.bottom.name,
                  image: normalizeImageUrl(
                    o.bottom.image || o.bottom.image_url,
                  ),
                  mainCategory: '',
                  subCategory: '',
                  material: '',
                  fit: '',
                  color: '',
                  size: '',
                  notes: '',
                }
              : null,
            shoes: o.shoes
              ? {
                  id: o.shoes.id,
                  name: o.shoes.name,
                  image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
                  mainCategory: '',
                  subCategory: '',
                  material: '',
                  fit: '',
                  color: '',
                  size: '',
                  notes: '',
                }
              : null,
            createdAt: o.created_at
              ? new Date(o.created_at).toISOString()
              : new Date().toISOString(),
            tags: o.tags || [],
            notes: o.notes || '',
            rating: o.rating ?? undefined,
            favorited: false,
            plannedDate,
            type: isCustom ? 'custom' : 'ai',
          };
        };

        const outfits = [
          ...aiData.map(o => normalize(o, false)),
          ...customData.map(o => normalize(o, true)),
        ].filter(Boolean) as SavedOutfit[];

        setScheduledOutfits(outfits);
      } catch (err) {
        console.error('❌ Failed to load calendar outfits:', err);
      }
    };

    fetchData();
  }, [userId]);

  const markedDates = scheduledOutfits.reduce((acc, outfit) => {
    const date = getLocalDateKey(outfit.plannedDate!);
    if (!acc[date]) acc[date] = {dots: []};
    acc[date].dots.push({
      color: outfit.type === 'ai' ? '#405de6' : '#00c6ae',
    });
    return acc;
  }, {} as Record<string, any>);

  const outfitsByDate = scheduledOutfits.reduce((acc, outfit) => {
    const date = getLocalDateKey(outfit.plannedDate!);
    if (!acc[date]) acc[date] = [];
    acc[date].push(outfit);
    return acc;
  }, {} as Record<string, SavedOutfit[]>);

  const handleDayPress = (day: DateObject) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
    h('selection');
  };

  return (
    <View
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {marginBottom: 8}]}>
        Planned Outfits
      </Text>

      <Animated.View style={{opacity: fadeAnim, flex: 1}}>
        {/* 📅 Calendar with bottom border */}
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.surfaceBorder,
          }}>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{
              ...markedDates,
              ...(selectedDate
                ? {
                    [selectedDate]: {
                      selected: true,
                      selectedColor: theme.colors.primary,
                    },
                  }
                : {}),
            }}
            markingType="multi-dot"
            theme={{
              calendarBackground: theme.colors.background,
              textSectionTitleColor: theme.colors.foreground2,
              dayTextColor: theme.colors.foreground,
              todayTextColor: theme.colors.primary,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: '#fff',
              arrowColor: theme.colors.primary,
              monthTextColor: theme.colors.primary,
              textMonthFontWeight: 'bold',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
              dotColor: theme.colors.primary,
              selectedDotColor: '#fff',
              disabledArrowColor: '#444',
            }}
          />
        </View>

        {/* 🪄 Directly below calendar */}
        {modalVisible && (
          <View
            style={{
              flex: 1,
              marginTop: 0,
              paddingTop: 2,
              paddingHorizontal: 16,
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}></View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 40,
                paddingTop: 4,
              }}>
              {(outfitsByDate[selectedDate!] || []).map((o, index) => (
                <View key={index} style={styles.card}>
                  <Text style={styles.name}>
                    {o.name?.trim() || 'Unnamed Outfit'}
                  </Text>
                  <Text style={styles.time}>
                    🕒 {formatLocalTime(o.plannedDate)}
                  </Text>

                  <View style={styles.row}>
                    {[o.top, o.bottom, o.shoes].map(item =>
                      item?.image ? (
                        <Image
                          key={item.id}
                          source={{uri: item.image}}
                          style={styles.thumb}
                          resizeMode="cover"
                        />
                      ) : null,
                    )}
                  </View>

                  {o.notes ? <Text style={styles.notes}>{o.notes}</Text> : null}

                  {typeof o.rating === 'number' && (
                    <Text style={styles.rating}>
                      {'⭐'.repeat(o.rating)} {'☆'.repeat(5 - o.rating)}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

//////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   Image,
//   StyleSheet,
//   Animated,
// } from 'react-native';
// import {useAuth0} from 'react-native-auth0';
// import {Calendar, DateObject} from 'react-native-calendars';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type WardrobeItem = {
//   id: string;
//   name: string;
//   image: string;
//   mainCategory: string;
//   subCategory: string;
//   material: string;
//   fit: string;
//   color: string;
//   size: string;
//   notes: string;
// };

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem | null;
//   bottom: WardrobeItem | null;
//   shoes: WardrobeItem | null;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
//   plannedDate?: string;
//   type?: 'custom' | 'ai';
// };

// // ───────── helpers ─────────
// const getLocalDateKey = (iso: string) => {
//   const d = new Date(iso);
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, '0');
//   const day = String(d.getDate()).padStart(2, '0');
//   return `${y}-${m}-${day}`;
// };

// const formatLocalTime = (iso?: string) => {
//   if (!iso) return '';
//   return new Date(iso).toLocaleTimeString(undefined, {
//     hour: 'numeric',
//     minute: '2-digit',
//     timeZoneName: 'short',
//   });
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function OutfitPlannerScreen() {
//   const {user} = useAuth0();
//   const userId = useUUID() || user?.sub || '';
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const colors = theme.colors;

//   // ✨ Fade animation for content
//   const fadeAnim = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 650,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     chipGroup: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       marginTop: 4,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: colors.surface,
//       borderRadius: 8,
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       fontSize: 16,
//       color: colors.foreground,
//     },
//     chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 4},
//     card: {
//       borderRadius: 16,
//       padding: 14,
//       marginBottom: 12,
//       backgroundColor: theme.colors.surface3 ?? theme.colors.surface3,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.input2 ?? theme.colors.surfaceBorder,
//     },
//     name: {color: theme.colors.foreground, fontSize: 16, fontWeight: '600'},
//     time: {color: theme.colors.foreground2, marginTop: 4, fontSize: 13},
//     row: {flexDirection: 'row', marginTop: 10},
//     thumb: {
//       width: 68,
//       height: 68,
//       borderRadius: 12,
//       marginRight: 8,
//       borderWidth: theme.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//     },
//     notes: {
//       fontStyle: 'italic',
//       color: theme.colors.foreground2,
//       marginTop: 8,
//       lineHeight: 18,
//     },
//     rating: {color: '#FFD700', marginTop: 6, fontSize: 16},
//   });

//   const [scheduledOutfits, setScheduledOutfits] = useState<SavedOutfit[]>([]);
//   const [selectedDate, setSelectedDate] = useState<string | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   useEffect(() => {
//     if (!userId) return;

//     const fetchData = async () => {
//       try {
//         const [aiRes, customRes, scheduledRes] = await Promise.all([
//           fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//           fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//           fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//         ]);

//         if (!aiRes.ok || !customRes.ok || !scheduledRes.ok) {
//           throw new Error('Failed to fetch outfit schedule data');
//         }

//         const [aiData, customData, scheduledData] = await Promise.all([
//           aiRes.json(),
//           customRes.json(),
//           scheduledRes.json(),
//         ]);

//         const scheduleMap: Record<string, string> = {};
//         for (const s of scheduledData) {
//           if (s.ai_outfit_id) {
//             scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//           } else if (s.custom_outfit_id) {
//             scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//           }
//         }

//         const normalize = (o: any, isCustom: boolean): SavedOutfit | null => {
//           const id = o.id;
//           const plannedDate = scheduleMap[id];
//           if (!plannedDate) return null;

//           return {
//             id,
//             name: o.name || '',
//             top: o.top
//               ? {
//                   id: o.top.id,
//                   name: o.top.name,
//                   image: normalizeImageUrl(o.top.image || o.top.image_url),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             bottom: o.bottom
//               ? {
//                   id: o.bottom.id,
//                   name: o.bottom.name,
//                   image: normalizeImageUrl(
//                     o.bottom.image || o.bottom.image_url,
//                   ),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             shoes: o.shoes
//               ? {
//                   id: o.shoes.id,
//                   name: o.shoes.name,
//                   image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             createdAt: o.created_at
//               ? new Date(o.created_at).toISOString()
//               : new Date().toISOString(),
//             tags: o.tags || [],
//             notes: o.notes || '',
//             rating: o.rating ?? undefined,
//             favorited: false,
//             plannedDate,
//             type: isCustom ? 'custom' : 'ai',
//           };
//         };

//         const outfits = [
//           ...aiData.map(o => normalize(o, false)),
//           ...customData.map(o => normalize(o, true)),
//         ].filter(Boolean) as SavedOutfit[];

//         setScheduledOutfits(outfits);
//       } catch (err) {
//         console.error('❌ Failed to load calendar outfits:', err);
//       }
//     };

//     fetchData();
//   }, [userId]);

//   const markedDates = scheduledOutfits.reduce((acc, outfit) => {
//     const date = getLocalDateKey(outfit.plannedDate!);
//     if (!acc[date]) acc[date] = {dots: []};
//     acc[date].dots.push({
//       color: outfit.type === 'ai' ? '#405de6' : '#00c6ae',
//     });
//     return acc;
//   }, {} as Record<string, any>);

//   const outfitsByDate = scheduledOutfits.reduce((acc, outfit) => {
//     const date = getLocalDateKey(outfit.plannedDate!);
//     if (!acc[date]) acc[date] = [];
//     acc[date].push(outfit);
//     return acc;
//   }, {} as Record<string, SavedOutfit[]>);

//   const handleDayPress = (day: DateObject) => {
//     setSelectedDate(day.dateString);
//     setModalVisible(true);
//     h('selection');
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* 📌 Static header (does not animate) */}
//       <Text style={[globalStyles.header, {marginBottom: 8}]}>
//         Planned Outfits
//       </Text>

//       {/* ✨ Fade-in content */}
//       <Animated.View style={{opacity: fadeAnim}}>
//         <View style={globalStyles.section}>
//           <Calendar
//             onDayPress={handleDayPress}
//             markedDates={{
//               ...markedDates,
//               ...(selectedDate
//                 ? {
//                     [selectedDate]: {
//                       selected: true,
//                       selectedColor: theme.colors.primary,
//                     },
//                   }
//                 : {}),
//             }}
//             markingType="multi-dot"
//             theme={{
//               calendarBackground: theme.colors.background,
//               textSectionTitleColor: theme.colors.foreground2,
//               dayTextColor: theme.colors.foreground,
//               todayTextColor: theme.colors.primary,
//               selectedDayBackgroundColor: theme.colors.primary,
//               selectedDayTextColor: '#fff',
//               arrowColor: theme.colors.primary,
//               monthTextColor: theme.colors.primary,
//               textMonthFontWeight: 'bold',
//               textDayFontSize: 16,
//               textMonthFontSize: 18,
//               textDayHeaderFontSize: 14,
//               dotColor: theme.colors.primary,
//               selectedDotColor: '#fff',
//               disabledArrowColor: '#444',
//             }}
//           />

//           {modalVisible && (
//             <View
//               style={{
//                 position: 'absolute',
//                 top: 300,
//                 left: 0,
//                 right: 0,
//                 alignItems: 'center',
//                 paddingVertical: 20,
//               }}>
//               <View
//                 style={{
//                   position: 'relative',
//                   backgroundColor: theme.colors.surface,
//                   borderRadius: 20,
//                   padding: 20,
//                   maxHeight: '65%',
//                   width: 'auto',
//                   minWidth: 400,
//                   alignSelf: 'center',
//                 }}>
//                 <AppleTouchFeedback
//                   onPress={() => setModalVisible(false)}
//                   hapticStyle="impactMedium"
//                   hitSlop={{top: 12, right: 12, bottom: 12, left: 12}}
//                   style={{
//                     position: 'absolute',
//                     top: 4,
//                     right: 12,
//                     backgroundColor: theme.colors.secondary,
//                     paddingHorizontal: 12,
//                     paddingVertical: 6,
//                     borderRadius: 20,
//                     zIndex: 100,
//                     elevation: 95,
//                   }}>
//                   <Text
//                     style={{color: 'white', fontWeight: '700', fontSize: 14}}>
//                     ✕
//                   </Text>
//                 </AppleTouchFeedback>
//                 <Text
//                   style={{
//                     fontSize: 18,
//                     fontWeight: '600',
//                     color: theme.colors.foreground,
//                     marginBottom: 12,
//                   }}>
//                   Outfits on {selectedDate}
//                 </Text>

//                 <ScrollView
//                   contentContainerStyle={{
//                     paddingBottom: 1000,
//                   }}>
//                   {(outfitsByDate[selectedDate!] || []).map((o, index) => (
//                     <View key={index} style={styles.card}>
//                       <Text style={styles.name}>
//                         {o.name?.trim() || 'Unnamed Outfit'}
//                       </Text>

//                       <Text style={styles.time}>
//                         🕒 {formatLocalTime(o.plannedDate)}
//                       </Text>

//                       <View style={styles.row}>
//                         {[o.top, o.bottom, o.shoes].map(item =>
//                           item?.image ? (
//                             <Image
//                               key={item.id}
//                               source={{uri: item.image}}
//                               style={styles.thumb}
//                               resizeMode="cover"
//                             />
//                           ) : null,
//                         )}
//                       </View>

//                       {o.notes ? (
//                         <Text style={styles.notes}>{o.notes}</Text>
//                       ) : null}

//                       {typeof o.rating === 'number' && (
//                         <Text style={styles.rating}>
//                           {'⭐'.repeat(o.rating)} {'☆'.repeat(5 - o.rating)}
//                         </Text>
//                       )}
//                     </View>
//                   ))}
//                 </ScrollView>
//               </View>
//             </View>
//           )}
//         </View>
//       </Animated.View>
//     </View>
//   );
// }

/////////////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, ScrollView, Image, StyleSheet} from 'react-native';
// import {useAuth0} from 'react-native-auth0';
// import {Calendar, DateObject} from 'react-native-calendars';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type WardrobeItem = {
//   id: string;
//   name: string;
//   image: string;
//   mainCategory: string;
//   subCategory: string;
//   material: string;
//   fit: string;
//   color: string;
//   size: string;
//   notes: string;
// };

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem | null;
//   bottom: WardrobeItem | null;
//   shoes: WardrobeItem | null;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
//   plannedDate?: string;
//   type?: 'custom' | 'ai';
// };

// // ───────── helpers (local date key + local time formatter) ─────────
// const getLocalDateKey = (iso: string) => {
//   const d = new Date(iso);
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, '0');
//   const day = String(d.getDate()).padStart(2, '0');
//   return `${y}-${m}-${day}`; // YYYY-MM-DD in *local* time
// };

// const formatLocalTime = (iso?: string) => {
//   if (!iso) return '';
//   return new Date(iso).toLocaleTimeString(undefined, {
//     hour: 'numeric',
//     minute: '2-digit',
//     timeZoneName: 'short',
//   });
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function OutfitPlannerScreen() {
//   const {user} = useAuth0();
//   const userId = useUUID() || user?.sub || '';
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const colors = theme.colors;

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     chipGroup: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       marginTop: 4,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: colors.surface,
//       borderRadius: 8,
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       fontSize: 16,
//       color: colors.foreground,
//     },
//     chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 4},

//     // ▼▼ Card styles copied to match your other screen ▼▼
//     card: {
//       borderRadius: 16,
//       padding: 14,
//       marginBottom: 12,
//       backgroundColor: theme.colors.surface3 ?? theme.colors.surface3,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.input2 ?? theme.colors.surfaceBorder,
//     },
//     name: {color: theme.colors.foreground, fontSize: 16, fontWeight: '600'},
//     time: {color: theme.colors.foreground2, marginTop: 4, fontSize: 13},
//     row: {flexDirection: 'row', marginTop: 10},
//     thumb: {
//       width: 68,
//       height: 68,
//       borderRadius: 12,
//       marginRight: 8,
//       borderWidth: theme.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//     },
//     notes: {
//       fontStyle: 'italic',
//       color: theme.colors.foreground2,
//       marginTop: 8,
//       lineHeight: 18,
//     },
//     rating: {color: '#FFD700', marginTop: 6, fontSize: 16},
//     // ▲▲ Only used for the modal cards ▲▲
//   });

//   const [scheduledOutfits, setScheduledOutfits] = useState<SavedOutfit[]>([]);
//   const [selectedDate, setSelectedDate] = useState<string | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   useEffect(() => {
//     if (!userId) return;

//     const fetchData = async () => {
//       try {
//         const [aiRes, customRes, scheduledRes] = await Promise.all([
//           fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//           fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//           fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//         ]);

//         if (!aiRes.ok || !customRes.ok || !scheduledRes.ok) {
//           throw new Error('Failed to fetch outfit schedule data');
//         }

//         const [aiData, customData, scheduledData] = await Promise.all([
//           aiRes.json(),
//           customRes.json(),
//           scheduledRes.json(),
//         ]);

//         const scheduleMap: Record<string, string> = {};
//         for (const s of scheduledData) {
//           if (s.ai_outfit_id) {
//             scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//           } else if (s.custom_outfit_id) {
//             scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//           }
//         }

//         const normalize = (o: any, isCustom: boolean): SavedOutfit | null => {
//           const id = o.id;
//           const plannedDate = scheduleMap[id];
//           if (!plannedDate) return null;

//           return {
//             id,
//             name: o.name || '',
//             top: o.top
//               ? {
//                   id: o.top.id,
//                   name: o.top.name,
//                   image: normalizeImageUrl(o.top.image || o.top.image_url),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             bottom: o.bottom
//               ? {
//                   id: o.bottom.id,
//                   name: o.bottom.name,
//                   image: normalizeImageUrl(
//                     o.bottom.image || o.bottom.image_url,
//                   ),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             shoes: o.shoes
//               ? {
//                   id: o.shoes.id,
//                   name: o.shoes.name,
//                   image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             createdAt: o.created_at
//               ? new Date(o.created_at).toISOString()
//               : new Date().toISOString(),
//             tags: o.tags || [],
//             notes: o.notes || '',
//             rating: o.rating ?? undefined,
//             favorited: false,
//             plannedDate,
//             type: isCustom ? 'custom' : 'ai',
//           };
//         };

//         const outfits = [
//           ...aiData.map(o => normalize(o, false)),
//           ...customData.map(o => normalize(o, true)),
//         ].filter(Boolean) as SavedOutfit[];

//         setScheduledOutfits(outfits);
//       } catch (err) {
//         console.error('❌ Failed to load calendar outfits:', err);
//       }
//     };

//     fetchData();
//   }, [userId]);

//   // Use *local* date keys so dots/cards line up with the device’s local day.
//   const markedDates = scheduledOutfits.reduce((acc, outfit) => {
//     const date = getLocalDateKey(outfit.plannedDate!);
//     if (!acc[date]) acc[date] = {dots: []};
//     acc[date].dots.push({
//       color: outfit.type === 'ai' ? '#405de6' : '#00c6ae',
//     });
//     return acc;
//   }, {} as Record<string, any>);

//   const outfitsByDate = scheduledOutfits.reduce((acc, outfit) => {
//     const date = getLocalDateKey(outfit.plannedDate!);
//     if (!acc[date]) acc[date] = [];
//     acc[date].push(outfit);
//     return acc;
//   }, {} as Record<string, SavedOutfit[]>);

//   const handleDayPress = (day: DateObject) => {
//     setSelectedDate(day.dateString); // YYYY-MM-DD local from Calendar
//     setModalVisible(true);
//     h('selection'); // subtle feedback on day select
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {marginBottom: 8}]}>
//         Planned Outfits
//       </Text>

//       <View style={globalStyles.section}>
//         <Calendar
//           onDayPress={handleDayPress}
//           markedDates={{
//             ...markedDates,
//             ...(selectedDate
//               ? {
//                   [selectedDate]: {
//                     selected: true,
//                     selectedColor: theme.colors.primary,
//                   },
//                 }
//               : {}),
//           }}
//           markingType="multi-dot"
//           theme={{
//             calendarBackground: theme.colors.background,
//             textSectionTitleColor: theme.colors.foreground2,
//             dayTextColor: theme.colors.foreground,
//             todayTextColor: theme.colors.primary,
//             selectedDayBackgroundColor: theme.colors.primary,
//             selectedDayTextColor: '#fff',
//             arrowColor: theme.colors.primary,
//             monthTextColor: theme.colors.primary,
//             textMonthFontWeight: 'bold',
//             textDayFontSize: 16,
//             textMonthFontSize: 18,
//             textDayHeaderFontSize: 14,
//             dotColor: theme.colors.primary,
//             selectedDotColor: '#fff',
//             disabledArrowColor: '#444',
//           }}
//         />

//         {modalVisible && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 300,
//               left: 0,
//               right: 0,
//               alignItems: 'center',
//               // backgroundColor: 'rgba(0,0,0,0.35)',
//               paddingVertical: 20,
//             }}>
//             <View
//               style={{
//                 position: 'relative',
//                 backgroundColor: theme.colors.surface,
//                 borderRadius: 20,
//                 padding: 20,
//                 maxHeight: '65%',
//                 width: 'auto',
//                 minWidth: 400,
//                 alignSelf: 'center',
//               }}>
//               <AppleTouchFeedback
//                 onPress={() => setModalVisible(false)}
//                 hapticStyle="impactMedium"
//                 hitSlop={{top: 12, right: 12, bottom: 12, left: 12}}
//                 style={{
//                   position: 'absolute',
//                   top: 4,
//                   right: 12,
//                   backgroundColor: theme.colors.secondary,
//                   paddingHorizontal: 12,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   zIndex: 100,
//                   elevation: 95,
//                 }}>
//                 <Text style={{color: 'white', fontWeight: '700', fontSize: 14}}>
//                   ✕
//                 </Text>
//               </AppleTouchFeedback>
//               <Text
//                 style={{
//                   fontSize: 18,
//                   fontWeight: '600',
//                   color: theme.colors.foreground,
//                   marginBottom: 12,
//                 }}>
//                 Outfits on {selectedDate}
//               </Text>

//               <ScrollView
//                 contentContainerStyle={{
//                   paddingBottom: 1000, // 👈 add more space so the last card clears the bottom nav
//                 }}>
//                 {(outfitsByDate[selectedDate!] || []).map((o, index) => (
//                   <View key={index} style={styles.card}>
//                     <Text style={styles.name}>
//                       {o.name?.trim() || 'Unnamed Outfit'}
//                     </Text>

//                     {/* 🕒 show scheduled time */}
//                     <Text style={styles.time}>
//                       🕒 {formatLocalTime(o.plannedDate)}
//                     </Text>

//                     <View style={styles.row}>
//                       {[o.top, o.bottom, o.shoes].map(item =>
//                         item?.image ? (
//                           <Image
//                             key={item.id}
//                             source={{uri: item.image}}
//                             style={styles.thumb}
//                             resizeMode="cover"
//                           />
//                         ) : null,
//                       )}
//                     </View>

//                     {o.notes ? (
//                       <Text style={styles.notes}>{o.notes}</Text>
//                     ) : null}

//                     {typeof o.rating === 'number' && (
//                       <Text style={styles.rating}>
//                         {'⭐'.repeat(o.rating)} {'☆'.repeat(5 - o.rating)}
//                       </Text>
//                     )}
//                   </View>
//                 ))}
//               </ScrollView>
//             </View>
//           </View>
//         )}
//       </View>
//     </View>
//   );
// }

//////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, ScrollView, Image, StyleSheet} from 'react-native';
// import {useAuth0} from 'react-native-auth0';
// import {Calendar, DateObject} from 'react-native-calendars';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type WardrobeItem = {
//   id: string;
//   name: string;
//   image: string;
//   mainCategory: string;
//   subCategory: string;
//   material: string;
//   fit: string;
//   color: string;
//   size: string;
//   notes: string;
// };

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem | null;
//   bottom: WardrobeItem | null;
//   shoes: WardrobeItem | null;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
//   plannedDate?: string;
//   type?: 'custom' | 'ai';
// };

// // ───────── helpers (local date key + local time formatter) ─────────
// const getLocalDateKey = (iso: string) => {
//   const d = new Date(iso);
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, '0');
//   const day = String(d.getDate()).padStart(2, '0');
//   return `${y}-${m}-${day}`; // YYYY-MM-DD in *local* time
// };

// const formatLocalTime = (iso?: string) => {
//   if (!iso) return '';
//   return new Date(iso).toLocaleTimeString(undefined, {
//     hour: 'numeric',
//     minute: '2-digit',
//     timeZoneName: 'short',
//   });
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function OutfitPlannerScreen() {
//   const {user} = useAuth0();
//   const userId = useUUID() || user?.sub || '';
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const colors = theme.colors;

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     chipGroup: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       marginTop: 4,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: colors.surface,
//       borderRadius: 8,
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       fontSize: 16,
//       color: colors.foreground,
//     },
//     chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 4},
//   });

//   const [scheduledOutfits, setScheduledOutfits] = useState<SavedOutfit[]>([]);
//   const [selectedDate, setSelectedDate] = useState<string | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   useEffect(() => {
//     if (!userId) return;

//     const fetchData = async () => {
//       try {
//         const [aiRes, customRes, scheduledRes] = await Promise.all([
//           fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//           fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//           fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//         ]);

//         if (!aiRes.ok || !customRes.ok || !scheduledRes.ok) {
//           throw new Error('Failed to fetch outfit schedule data');
//         }

//         const [aiData, customData, scheduledData] = await Promise.all([
//           aiRes.json(),
//           customRes.json(),
//           scheduledRes.json(),
//         ]);

//         const scheduleMap: Record<string, string> = {};
//         for (const s of scheduledData) {
//           if (s.ai_outfit_id) {
//             scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//           } else if (s.custom_outfit_id) {
//             scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//           }
//         }

//         const normalize = (o: any, isCustom: boolean): SavedOutfit | null => {
//           const id = o.id;
//           const plannedDate = scheduleMap[id];
//           if (!plannedDate) return null;

//           return {
//             id,
//             name: o.name || '',
//             top: o.top
//               ? {
//                   id: o.top.id,
//                   name: o.top.name,
//                   image: normalizeImageUrl(o.top.image || o.top.image_url),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             bottom: o.bottom
//               ? {
//                   id: o.bottom.id,
//                   name: o.bottom.name,
//                   image: normalizeImageUrl(
//                     o.bottom.image || o.bottom.image_url,
//                   ),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             shoes: o.shoes
//               ? {
//                   id: o.shoes.id,
//                   name: o.shoes.name,
//                   image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             createdAt: o.created_at
//               ? new Date(o.created_at).toISOString()
//               : new Date().toISOString(),
//             tags: o.tags || [],
//             notes: o.notes || '',
//             rating: o.rating ?? undefined,
//             favorited: false,
//             plannedDate,
//             type: isCustom ? 'custom' : 'ai',
//           };
//         };

//         const outfits = [
//           ...aiData.map(o => normalize(o, false)),
//           ...customData.map(o => normalize(o, true)),
//         ].filter(Boolean) as SavedOutfit[];

//         setScheduledOutfits(outfits);
//       } catch (err) {
//         console.error('❌ Failed to load calendar outfits:', err);
//       }
//     };

//     fetchData();
//   }, [userId]);

//   // Use *local* date keys so dots/cards line up with the device’s local day.
//   const markedDates = scheduledOutfits.reduce((acc, outfit) => {
//     const date = getLocalDateKey(outfit.plannedDate!);
//     if (!acc[date]) acc[date] = {dots: []};
//     acc[date].dots.push({
//       color: outfit.type === 'ai' ? '#405de6' : '#00c6ae',
//     });
//     return acc;
//   }, {} as Record<string, any>);

//   const outfitsByDate = scheduledOutfits.reduce((acc, outfit) => {
//     const date = getLocalDateKey(outfit.plannedDate!);
//     if (!acc[date]) acc[date] = [];
//     acc[date].push(outfit);
//     return acc;
//   }, {} as Record<string, SavedOutfit[]>);

//   const handleDayPress = (day: DateObject) => {
//     setSelectedDate(day.dateString); // YYYY-MM-DD local from Calendar
//     setModalVisible(true);
//     h('selection'); // subtle feedback on day select
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {marginBottom: 8}]}>
//         Planned Outfits
//       </Text>

//       <View style={globalStyles.section}>
//         <Calendar
//           onDayPress={handleDayPress}
//           markedDates={{
//             ...markedDates,
//             ...(selectedDate
//               ? {
//                   [selectedDate]: {
//                     selected: true,
//                     selectedColor: theme.colors.primary,
//                   },
//                 }
//               : {}),
//           }}
//           markingType="multi-dot"
//           theme={{
//             calendarBackground: theme.colors.background,
//             textSectionTitleColor: theme.colors.foreground2,
//             dayTextColor: theme.colors.foreground,
//             todayTextColor: theme.colors.primary,
//             selectedDayBackgroundColor: theme.colors.primary,
//             selectedDayTextColor: '#fff',
//             arrowColor: theme.colors.primary,
//             monthTextColor: theme.colors.primary,
//             textMonthFontWeight: 'bold',
//             textDayFontSize: 16,
//             textMonthFontSize: 18,
//             textDayHeaderFontSize: 14,
//             dotColor: theme.colors.primary,
//             selectedDotColor: '#fff',
//             disabledArrowColor: '#444',
//           }}
//         />

//         {modalVisible && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 300,
//               left: 0,
//               right: 0,
//               alignItems: 'center',
//               backgroundColor: 'rgba(0,0,0,0.35)',
//               paddingVertical: 20,
//             }}>
//             <View
//               style={{
//                 position: 'relative',
//                 backgroundColor: theme.colors.surface,
//                 borderRadius: 20,
//                 padding: 20,
//                 maxHeight: '65%',
//                 width: 'auto',
//                 minWidth: 400,
//                 alignSelf: 'center',
//               }}>
//               <AppleTouchFeedback
//                 onPress={() => setModalVisible(false)}
//                 hapticStyle="impactMedium"
//                 hitSlop={{top: 12, right: 12, bottom: 12, left: 12}}
//                 style={{
//                   position: 'absolute',
//                   top: 4,
//                   right: 12,
//                   backgroundColor: theme.colors.secondary,
//                   paddingHorizontal: 12,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   zIndex: 100,
//                   elevation: 95,
//                 }}>
//                 <Text style={{color: 'white', fontWeight: '700', fontSize: 14}}>
//                   ✕
//                 </Text>
//               </AppleTouchFeedback>
//               <Text
//                 style={{
//                   fontSize: 18,
//                   fontWeight: '600',
//                   color: theme.colors.foreground,
//                   marginBottom: 12,
//                 }}>
//                 Outfits on {selectedDate}
//               </Text>

//               <ScrollView>
//                 {(outfitsByDate[selectedDate!] || []).map((o, index) => (
//                   <View
//                     key={index}
//                     style={{
//                       marginBottom: 8,
//                       borderBottomColor: '#ddd',
//                       paddingBottom: 8,
//                       backgroundColor: '#141414ff',
//                       padding: 16,
//                       borderRadius: 15,
//                     }}>
//                     <Text
//                       style={{color: theme.colors.foreground, fontSize: 16}}>
//                       {o.name?.trim() || 'Unnamed Outfit'}
//                     </Text>

//                     {/* 🕒 show scheduled time */}
//                     <Text
//                       style={{color: theme.colors.foreground2, marginTop: 4}}>
//                       🕒 {formatLocalTime(o.plannedDate)}
//                     </Text>

//                     <View style={{flexDirection: 'row', marginTop: 8}}>
//                       {[o.top, o.bottom, o.shoes].map(item =>
//                         item?.image ? (
//                           <Image
//                             key={item.id}
//                             source={{uri: item.image}}
//                             style={{
//                               width: 60,
//                               height: 60,
//                               borderRadius: 8,
//                               marginRight: 8,
//                               marginBottom: 16,
//                             }}
//                           />
//                         ) : null,
//                       )}
//                     </View>

//                     {o.notes ? (
//                       <Text
//                         style={{
//                           fontStyle: 'italic',
//                           color: theme.colors.foreground2,
//                           marginTop: 6,
//                         }}>
//                         {o.notes}
//                       </Text>
//                     ) : null}

//                     {typeof o.rating === 'number' && (
//                       <Text style={{color: '#FFD700', marginTop: 4}}>
//                         {'⭐'.repeat(o.rating)} {'☆'.repeat(5 - o.rating)}
//                       </Text>
//                     )}
//                   </View>
//                 ))}
//               </ScrollView>
//             </View>
//           </View>
//         )}
//       </View>
//     </View>
//   );
// }

//////////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, ScrollView, Image, StyleSheet} from 'react-native';
// import {useAuth0} from 'react-native-auth0';
// import {Calendar, DateObject} from 'react-native-calendars';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type WardrobeItem = {
//   id: string;
//   name: string;
//   image: string;
//   mainCategory: string;
//   subCategory: string;
//   material: string;
//   fit: string;
//   color: string;
//   size: string;
//   notes: string;
// };

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem | null;
//   bottom: WardrobeItem | null;
//   shoes: WardrobeItem | null;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
//   plannedDate?: string;
//   type?: 'custom' | 'ai';
// };

// // ───────── helpers (local date key + local time formatter) ─────────
// const getLocalDateKey = (iso: string) => {
//   const d = new Date(iso);
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, '0');
//   const day = String(d.getDate()).padStart(2, '0');
//   return `${y}-${m}-${day}`; // YYYY-MM-DD in *local* time
// };

// const formatLocalTime = (iso?: string) => {
//   if (!iso) return '';
//   return new Date(iso).toLocaleTimeString(undefined, {
//     hour: 'numeric',
//     minute: '2-digit',
//     timeZoneName: 'short',
//   });
// };

// export default function OutfitPlannerScreen() {
//   const {user} = useAuth0();
//   const userId = useUUID() || user?.sub || '';
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const colors = theme.colors;

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     chipGroup: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       marginTop: 4,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: colors.surface,
//       borderRadius: 8,
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       fontSize: 16,
//       color: colors.foreground,
//     },
//     chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 4},
//   });

//   const [scheduledOutfits, setScheduledOutfits] = useState<SavedOutfit[]>([]);
//   const [selectedDate, setSelectedDate] = useState<string | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   useEffect(() => {
//     if (!userId) return;

//     const fetchData = async () => {
//       try {
//         const [aiRes, customRes, scheduledRes] = await Promise.all([
//           fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//           fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//           fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//         ]);

//         if (!aiRes.ok || !customRes.ok || !scheduledRes.ok) {
//           throw new Error('Failed to fetch outfit schedule data');
//         }

//         const [aiData, customData, scheduledData] = await Promise.all([
//           aiRes.json(),
//           customRes.json(),
//           scheduledRes.json(),
//         ]);

//         const scheduleMap: Record<string, string> = {};
//         for (const s of scheduledData) {
//           if (s.ai_outfit_id) {
//             scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//           } else if (s.custom_outfit_id) {
//             scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//           }
//         }

//         const normalize = (o: any, isCustom: boolean): SavedOutfit | null => {
//           const id = o.id;
//           const plannedDate = scheduleMap[id];
//           if (!plannedDate) return null;

//           return {
//             id,
//             name: o.name || '',
//             top: o.top
//               ? {
//                   id: o.top.id,
//                   name: o.top.name,
//                   image: normalizeImageUrl(o.top.image || o.top.image_url),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             bottom: o.bottom
//               ? {
//                   id: o.bottom.id,
//                   name: o.bottom.name,
//                   image: normalizeImageUrl(
//                     o.bottom.image || o.bottom.image_url,
//                   ),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             shoes: o.shoes
//               ? {
//                   id: o.shoes.id,
//                   name: o.shoes.name,
//                   image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             createdAt: o.created_at
//               ? new Date(o.created_at).toISOString()
//               : new Date().toISOString(),
//             tags: o.tags || [],
//             notes: o.notes || '',
//             rating: o.rating ?? undefined,
//             favorited: false,
//             plannedDate,
//             type: isCustom ? 'custom' : 'ai',
//           };
//         };

//         const outfits = [
//           ...aiData.map(o => normalize(o, false)),
//           ...customData.map(o => normalize(o, true)),
//         ].filter(Boolean) as SavedOutfit[];

//         setScheduledOutfits(outfits);
//       } catch (err) {
//         console.error('❌ Failed to load calendar outfits:', err);
//       }
//     };

//     fetchData();
//   }, [userId]);

//   // Use *local* date keys so dots/cards line up with the device’s local day.
//   const markedDates = scheduledOutfits.reduce((acc, outfit) => {
//     const date = getLocalDateKey(outfit.plannedDate!);
//     if (!acc[date]) acc[date] = {dots: []};
//     acc[date].dots.push({
//       color: outfit.type === 'ai' ? '#405de6' : '#00c6ae',
//     });
//     return acc;
//   }, {} as Record<string, any>);

//   const outfitsByDate = scheduledOutfits.reduce((acc, outfit) => {
//     const date = getLocalDateKey(outfit.plannedDate!);
//     if (!acc[date]) acc[date] = [];
//     acc[date].push(outfit);
//     return acc;
//   }, {} as Record<string, SavedOutfit[]>);

//   const handleDayPress = (day: DateObject) => {
//     setSelectedDate(day.dateString); // YYYY-MM-DD local from Calendar
//     setModalVisible(true);
//   };

//   return (
//     <View
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {marginBottom: 8}]}>
//         Planned Outfits
//       </Text>

//       <View style={globalStyles.section}>
//         <Calendar
//           onDayPress={handleDayPress}
//           markedDates={{
//             ...markedDates,
//             ...(selectedDate
//               ? {
//                   [selectedDate]: {
//                     selected: true,
//                     selectedColor: theme.colors.primary,
//                   },
//                 }
//               : {}),
//           }}
//           markingType="multi-dot"
//           theme={{
//             calendarBackground: theme.colors.background,
//             textSectionTitleColor: theme.colors.foreground2,
//             dayTextColor: theme.colors.foreground,
//             todayTextColor: theme.colors.primary,
//             selectedDayBackgroundColor: theme.colors.primary,
//             selectedDayTextColor: '#fff',
//             arrowColor: theme.colors.primary,
//             monthTextColor: theme.colors.primary,
//             textMonthFontWeight: 'bold',
//             textDayFontSize: 16,
//             textMonthFontSize: 18,
//             textDayHeaderFontSize: 14,
//             dotColor: theme.colors.primary,
//             selectedDotColor: '#fff',
//             disabledArrowColor: '#444',
//           }}
//         />

//         {modalVisible && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 300,
//               left: 0,
//               right: 0,
//               alignItems: 'center',
//               backgroundColor: 'rgba(0,0,0,0.35)',
//               paddingVertical: 20,
//             }}>
//             <View
//               style={{
//                 position: 'relative',
//                 backgroundColor: theme.colors.surface,
//                 borderRadius: 20,
//                 padding: 20,
//                 maxHeight: '65%',
//                 width: 'auto',
//                 minWidth: 400,
//                 alignSelf: 'center',
//               }}>
//               <AppleTouchFeedback
//                 onPress={() => setModalVisible(false)}
//                 hapticStyle="impactMedium"
//                 hitSlop={{top: 12, right: 12, bottom: 12, left: 12}} // ✅ bigger tap target
//                 style={{
//                   position: 'absolute',
//                   top: 4,
//                   right: 12,
//                   backgroundColor: theme.colors.secondary,
//                   paddingHorizontal: 12,
//                   paddingVertical: 6,
//                   borderRadius: 20,
//                   zIndex: 100,
//                   elevation: 95,
//                 }}>
//                 <Text style={{color: 'white', fontWeight: '700', fontSize: 14}}>
//                   ✕
//                 </Text>
//               </AppleTouchFeedback>
//               <Text
//                 style={{
//                   fontSize: 18,
//                   fontWeight: '600',
//                   color: theme.colors.foreground,
//                   marginBottom: 12,
//                 }}>
//                 Outfits on {selectedDate}
//               </Text>

//               <ScrollView>
//                 {(outfitsByDate[selectedDate!] || []).map((o, index) => (
//                   <View
//                     key={index}
//                     style={{
//                       marginBottom: 8,
//                       borderBottomColor: '#ddd',
//                       paddingBottom: 8,
//                       backgroundColor: '#141414ff',
//                       padding: 16,
//                       borderRadius: 15,
//                     }}>
//                     <Text
//                       style={{color: theme.colors.foreground, fontSize: 16}}>
//                       {o.name?.trim() || 'Unnamed Outfit'}
//                     </Text>

//                     {/* 🕒 show scheduled time */}
//                     <Text
//                       style={{color: theme.colors.foreground2, marginTop: 4}}>
//                       🕒 {formatLocalTime(o.plannedDate)}
//                     </Text>

//                     <View style={{flexDirection: 'row', marginTop: 8}}>
//                       {[o.top, o.bottom, o.shoes].map(item =>
//                         item?.image ? (
//                           <Image
//                             key={item.id}
//                             source={{uri: item.image}}
//                             style={{
//                               width: 60,
//                               height: 60,
//                               borderRadius: 8,
//                               marginRight: 8,
//                               marginBottom: 16,
//                             }}
//                           />
//                         ) : null,
//                       )}
//                     </View>

//                     {o.notes ? (
//                       <Text
//                         style={{
//                           fontStyle: 'italic',
//                           color: theme.colors.foreground2,
//                           marginTop: 6,
//                         }}>
//                         {o.notes}
//                       </Text>
//                     ) : null}

//                     {typeof o.rating === 'number' && (
//                       <Text style={{color: '#FFD700', marginTop: 4}}>
//                         {'⭐'.repeat(o.rating)} {'☆'.repeat(5 - o.rating)}
//                       </Text>
//                     )}
//                   </View>
//                 ))}
//               </ScrollView>
//             </View>
//           </View>
//         )}
//       </View>
//     </View>
//   );
// }

//////////////////

// import React, {useEffect, useState} from 'react';
// import {View, Text, ScrollView, Image, StyleSheet} from 'react-native';
// import {useAuth0} from 'react-native-auth0';
// import {Calendar, DateObject} from 'react-native-calendars';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// type WardrobeItem = {
//   id: string;
//   name: string;
//   image: string;
//   mainCategory: string;
//   subCategory: string;
//   material: string;
//   fit: string;
//   color: string;
//   size: string;
//   notes: string;
// };

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem | null;
//   bottom: WardrobeItem | null;
//   shoes: WardrobeItem | null;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
//   plannedDate?: string;
//   type?: 'custom' | 'ai';
// };

// export default function OutfitPlannerScreen() {
//   const {user} = useAuth0();
//   const userId = useUUID() || user?.sub || '';
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const colors = theme.colors;

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     chipGroup: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       marginTop: 4,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: colors.surface,
//       borderRadius: 8,
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       fontSize: 16,
//       color: colors.foreground,
//     },
//     chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 4},
//   });

//   const [scheduledOutfits, setScheduledOutfits] = useState<SavedOutfit[]>([]);
//   const [selectedDate, setSelectedDate] = useState<string | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   useEffect(() => {
//     if (!userId) return;

//     const fetchData = async () => {
//       try {
//         const [aiRes, customRes, scheduledRes] = await Promise.all([
//           fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//           fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//           fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//         ]);

//         if (!aiRes.ok || !customRes.ok || !scheduledRes.ok) {
//           throw new Error('Failed to fetch outfit schedule data');
//         }

//         const [aiData, customData, scheduledData] = await Promise.all([
//           aiRes.json(),
//           customRes.json(),
//           scheduledRes.json(),
//         ]);

//         const scheduleMap: Record<string, string> = {};
//         for (const s of scheduledData) {
//           if (s.ai_outfit_id) {
//             scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//           } else if (s.custom_outfit_id) {
//             scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//           }
//         }

//         const normalize = (o: any, isCustom: boolean): SavedOutfit | null => {
//           const id = o.id;
//           const plannedDate = scheduleMap[id];
//           if (!plannedDate) return null;

//           return {
//             id,
//             name: o.name || '',
//             top: o.top
//               ? {
//                   id: o.top.id,
//                   name: o.top.name,
//                   image: normalizeImageUrl(o.top.image || o.top.image_url),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             bottom: o.bottom
//               ? {
//                   id: o.bottom.id,
//                   name: o.bottom.name,
//                   image: normalizeImageUrl(
//                     o.bottom.image || o.bottom.image_url,
//                   ),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             shoes: o.shoes
//               ? {
//                   id: o.shoes.id,
//                   name: o.shoes.name,
//                   image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//                   mainCategory: '',
//                   subCategory: '',
//                   material: '',
//                   fit: '',
//                   color: '',
//                   size: '',
//                   notes: '',
//                 }
//               : null,
//             createdAt: o.created_at
//               ? new Date(o.created_at).toISOString()
//               : new Date().toISOString(),
//             tags: o.tags || [],
//             notes: o.notes || '',
//             rating: o.rating ?? undefined,
//             favorited: false,
//             plannedDate,
//             type: isCustom ? 'custom' : 'ai',
//           };
//         };

//         const outfits = [
//           ...aiData.map(o => normalize(o, false)),
//           ...customData.map(o => normalize(o, true)),
//         ].filter(Boolean) as SavedOutfit[];

//         setScheduledOutfits(outfits);
//       } catch (err) {
//         console.error('❌ Failed to load calendar outfits:', err);
//       }
//     };

//     fetchData();
//   }, [userId]);

//   const markedDates = scheduledOutfits.reduce((acc, outfit) => {
//     const date = outfit.plannedDate!.split('T')[0];
//     if (!acc[date]) acc[date] = {dots: []};
//     acc[date].dots.push({
//       color: outfit.type === 'ai' ? '#405de6' : '#00c6ae',
//     });
//     return acc;
//   }, {} as Record<string, any>);

//   const outfitsByDate = scheduledOutfits.reduce((acc, outfit) => {
//     const date = outfit.plannedDate!.split('T')[0];
//     if (!acc[date]) acc[date] = [];
//     acc[date].push(outfit);
//     return acc;
//   }, {} as Record<string, SavedOutfit[]>);

//   const handleDayPress = (day: DateObject) => {
//     setSelectedDate(day.dateString);
//     setModalVisible(true);
//   };

//   return (
//     <View style={[globalStyles.container]}>
//       <Text style={[globalStyles.header, {marginBottom: 20}]}>
//         Planned Outfits
//       </Text>

//       <View style={globalStyles.section}>
//         <Calendar
//           onDayPress={handleDayPress}
//           markedDates={{
//             ...markedDates,
//             ...(selectedDate
//               ? {
//                   [selectedDate]: {
//                     selected: true,
//                     selectedColor: theme.colors.primary,
//                   },
//                 }
//               : {}),
//           }}
//           markingType="multi-dot"
//           theme={{
//             calendarBackground: theme.colors.background,
//             textSectionTitleColor: theme.colors.foreground2,
//             dayTextColor: theme.colors.foreground,
//             todayTextColor: theme.colors.primary,
//             selectedDayBackgroundColor: theme.colors.primary,
//             selectedDayTextColor: '#fff',
//             arrowColor: theme.colors.primary,
//             monthTextColor: theme.colors.primary,
//             textMonthFontWeight: 'bold',
//             textDayFontSize: 16,
//             textMonthFontSize: 18,
//             textDayHeaderFontSize: 14,
//             dotColor: theme.colors.primary,
//             selectedDotColor: '#fff',
//             disabledArrowColor: '#444',
//           }}
//         />

//         {modalVisible && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 300, // keep your current vertical position
//               left: 0,
//               right: 0,
//               alignItems: 'center', // ⬅️ centers the inner card horizontally
//               backgroundColor: 'rgba(0,0,0,0.35)',
//               paddingVertical: 20,
//             }}>
//             <View
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 borderRadius: 20,
//                 padding: 20,
//                 maxHeight: '100%',
//                 width: 'auto', // let width fit content
//                 minWidth: 400, // optional: enforce a comfortable min width
//                 alignSelf: 'center', // center horizontally
//               }}>
//               <Text
//                 style={{
//                   fontSize: 18,
//                   fontWeight: '600',
//                   color: theme.colors.foreground,
//                   marginBottom: 12,
//                   // textAlign: 'center',
//                 }}>
//                 Outfits on {selectedDate}
//               </Text>

//               <ScrollView>
//                 {(outfitsByDate[selectedDate!] || []).map((o, index) => (
//                   <View
//                     key={index}
//                     style={{
//                       marginBottom: 16,
//                       borderBottomWidth: 1,
//                       borderBottomColor: '#ddd',
//                       paddingBottom: 8,
//                     }}>
//                     <Text
//                       style={{color: theme.colors.foreground, fontSize: 16}}>
//                       {o.name?.trim() || 'Unnamed Outfit'}
//                     </Text>

//                     <View style={{flexDirection: 'row', marginTop: 8}}>
//                       {[o.top, o.bottom, o.shoes].map(item =>
//                         item?.image ? (
//                           <Image
//                             key={item.id}
//                             source={{uri: item.image}}
//                             style={{
//                               width: 60,
//                               height: 60,
//                               borderRadius: 8,
//                               marginRight: 8,
//                             }}
//                           />
//                         ) : null,
//                       )}
//                     </View>

//                     {o.notes ? (
//                       <Text
//                         style={{
//                           fontStyle: 'italic',
//                           color: theme.colors.foreground2,
//                           marginTop: 6,
//                         }}>
//                         {o.notes}
//                       </Text>
//                     ) : null}

//                     {typeof o.rating === 'number' && (
//                       <Text style={{color: '#FFD700', marginTop: 4}}>
//                         {'⭐'.repeat(o.rating)} {'☆'.repeat(5 - o.rating)}
//                       </Text>
//                     )}
//                   </View>
//                 ))}
//               </ScrollView>

//               <AppleTouchFeedback
//                 onPress={() => setModalVisible(false)}
//                 hapticStyle="impactMedium"
//                 style={{
//                   marginTop: 20,
//                   alignSelf: 'center',
//                   backgroundColor: theme.colors.secondary,
//                   paddingHorizontal: 16,
//                   paddingVertical: 8,
//                   borderRadius: 6,
//                 }}>
//                 <Text
//                   style={{
//                     color: 'white',
//                     fontWeight: '600',
//                   }}>
//                   Close
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         )}
//       </View>
//     </View>
//   );
// }
