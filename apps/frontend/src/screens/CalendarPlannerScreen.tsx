import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {useAuth0} from 'react-native-auth0';
import {Calendar, DateObject} from 'react-native-calendars';
import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

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

export default function OutfitPlannerScreen() {
  const {theme} = useAppTheme();
  const {user} = useAuth0();
  const userId = useUUID() || user?.sub || '';

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
    const date = outfit.plannedDate!.split('T')[0];
    if (!acc[date]) acc[date] = {dots: []};
    acc[date].dots.push({
      color: outfit.type === 'ai' ? '#405de6' : '#00c6ae',
    });
    return acc;
  }, {} as Record<string, any>);

  const outfitsByDate = scheduledOutfits.reduce((acc, outfit) => {
    const date = outfit.plannedDate!.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(outfit);
    return acc;
  }, {} as Record<string, SavedOutfit[]>);

  const handleDayPress = (day: DateObject) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  return (
    <View style={{flex: 1, backgroundColor: theme.colors.background}}>
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

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: '75%',
            }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: theme.colors.foreground,
                marginBottom: 12,
              }}>
              Outfits on {selectedDate}
            </Text>

            <ScrollView>
              {(outfitsByDate[selectedDate!] || []).map((o, index) => (
                <View
                  key={index}
                  style={{
                    marginBottom: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#ddd',
                    paddingBottom: 8,
                  }}>
                  <Text style={{color: theme.colors.foreground, fontSize: 16}}>
                    {o.name?.trim() || 'Unnamed Outfit'}
                  </Text>

                  <View style={{flexDirection: 'row', marginTop: 8}}>
                    {[o.top, o.bottom, o.shoes].map(item =>
                      item?.image ? (
                        <Image
                          key={item.id}
                          source={{uri: item.image}}
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 8,
                            marginRight: 8,
                          }}
                        />
                      ) : null,
                    )}
                  </View>

                  {o.notes ? (
                    <Text
                      style={{
                        fontStyle: 'italic',
                        color: theme.colors.foreground2,
                        marginTop: 6,
                      }}>
                      {o.notes}
                    </Text>
                  ) : null}

                  {typeof o.rating === 'number' && (
                    <Text style={{color: '#FFD700', marginTop: 4}}>
                      {'⭐'.repeat(o.rating)} {'☆'.repeat(5 - o.rating)}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>

            <AppleTouchFeedback
              onPress={() => setModalVisible(false)}
              hapticStyle="impactMedium"
              style={{
                marginTop: 20,
                alignSelf: 'flex-end',
                backgroundColor: theme.colors.secondary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 6,
              }}>
              <Text
                style={{
                  color: 'white',
                  fontWeight: '600',
                }}>
                Close
              </Text>
            </AppleTouchFeedback>
          </View>
        </View>
      </Modal>
    </View>
  );
}

////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   Modal,
//   TouchableOpacity,
//   ScrollView,
//   Image,
// } from 'react-native';
// import {useAuth0} from 'react-native-auth0';
// import {Calendar, DateObject} from 'react-native-calendars';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';

// // 🔷 Types

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
//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const userId = useUUID() || user?.sub || '';

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
//     <View style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <Calendar
//         onDayPress={handleDayPress}
//         markedDates={{
//           ...markedDates,
//           ...(selectedDate
//             ? {
//                 [selectedDate]: {
//                   selected: true,
//                   selectedColor: theme.colors.primary,
//                 },
//               }
//             : {}),
//         }}
//         markingType="multi-dot"
//         theme={{
//           calendarBackground: theme.colors.background,
//           textSectionTitleColor: theme.colors.foreground2,
//           dayTextColor: theme.colors.foreground,
//           todayTextColor: theme.colors.primary,
//           selectedDayBackgroundColor: theme.colors.primary,
//           selectedDayTextColor: '#fff',
//           arrowColor: theme.colors.primary,
//           monthTextColor: theme.colors.primary,
//           textMonthFontWeight: 'bold',
//           textDayFontSize: 16,
//           textMonthFontSize: 18,
//           textDayHeaderFontSize: 14,
//           dotColor: theme.colors.primary,
//           selectedDotColor: '#fff',
//           disabledArrowColor: '#444',
//         }}
//       />

//       <Modal visible={modalVisible} animationType="slide" transparent>
//         <View
//           style={{
//             flex: 1,
//             justifyContent: 'flex-end',
//             backgroundColor: 'rgba(0,0,0,0.35)',
//           }}>
//           <View
//             style={{
//               backgroundColor: theme.colors.surface,
//               borderTopLeftRadius: 20,
//               borderTopRightRadius: 20,
//               padding: 20,
//               maxHeight: '75%',
//             }}>
//             <Text
//               style={{
//                 fontSize: 18,
//                 fontWeight: '600',
//                 color: theme.colors.foreground,
//                 marginBottom: 12,
//               }}>
//               Outfits on {selectedDate}
//             </Text>

//             <ScrollView>
//               {(outfitsByDate[selectedDate!] || []).map((o, index) => (
//                 <View
//                   key={index}
//                   style={{
//                     marginBottom: 16,
//                     borderBottomWidth: 1,
//                     borderBottomColor: '#ddd',
//                     paddingBottom: 8,
//                   }}>
//                   <Text style={{color: theme.colors.foreground, fontSize: 16}}>
//                     {o.name?.trim() || 'Unnamed Outfit'}
//                   </Text>

//                   <View style={{flexDirection: 'row', marginTop: 8}}>
//                     {[o.top, o.bottom, o.shoes].map(item =>
//                       item?.image ? (
//                         <Image
//                           key={item.id}
//                           source={{uri: item.image}}
//                           style={{
//                             width: 60,
//                             height: 60,
//                             borderRadius: 8,
//                             marginRight: 8,
//                           }}
//                         />
//                       ) : null,
//                     )}
//                   </View>

//                   {o.notes ? (
//                     <Text
//                       style={{
//                         fontStyle: 'italic',
//                         color: theme.colors.foreground2,
//                         marginTop: 6,
//                       }}>
//                       {o.notes}
//                     </Text>
//                   ) : null}

//                   {typeof o.rating === 'number' && (
//                     <Text style={{color: '#FFD700', marginTop: 4}}>
//                       {'⭐'.repeat(o.rating)} {'☆'.repeat(5 - o.rating)}
//                     </Text>
//                   )}
//                 </View>
//               ))}
//             </ScrollView>

//             <TouchableOpacity
//               onPress={() => setModalVisible(false)}
//               style={{
//                 marginTop: 20,
//                 alignSelf: 'flex-end',
//                 backgroundColor: theme.colors.secondary,
//                 paddingHorizontal: 16,
//                 paddingVertical: 8,
//                 borderRadius: 6,
//               }}>
//               <Text
//                 style={{
//                   color: 'whte',

//                   fontWeight: '600',
//                 }}>
//                 Close
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }
