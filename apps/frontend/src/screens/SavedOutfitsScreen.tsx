import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {WardrobeItem} from '../hooks/useOutfitSuggestion';
import DateTimePicker from '@react-native-community/datetimepicker';

// [same imports as before...]
type SavedOutfit = {
  id: string;
  name?: string;
  top: WardrobeItem;
  bottom: WardrobeItem;
  shoes: WardrobeItem;
  createdAt: string;
  tags?: string[];
  notes?: string;
  rating?: number; // ✅ ADDED
  favorited?: boolean;
};

const CLOSET_KEY = 'savedOutfits';
const FAVORITES_KEY = 'favoriteOutfits';

export default function SavedOutfitsScreen() {
  const {theme} = useAppTheme();
  const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [planningOutfitId, setPlanningOutfitId] = useState<string | null>(null);

  const normalizeOutfit = (o: any): SavedOutfit | null => {
    if (o.top && o.bottom && o.shoes) {
      return {
        id: o.id || Date.now().toString(),
        name: o.name || '',
        top: o.top,
        bottom: o.bottom,
        shoes: o.shoes,
        createdAt: o.createdAt || new Date().toISOString(),
        tags: o.tags || [],
        notes: o.notes || '',
        rating: o.rating ?? undefined, // ✅ ADDED
        favorited: o.favorited || false,
      };
    }
    if (Array.isArray(o.items) && o.items.length >= 3) {
      return {
        id: o.name || Date.now().toString(),
        name: o.name || '',
        top: o.items[0],
        bottom: o.items[1],
        shoes: o.items[2],
        createdAt: new Date().toISOString(),
        tags: [],
        notes: '',
        rating: undefined,
        favorited: o.favorited || false,
      };
    }
    console.warn('Bad outfit:', o);
    return null;
  };

  const loadOutfits = async () => {
    const [manualData, favoriteData] = await Promise.all([
      AsyncStorage.getItem(CLOSET_KEY),
      AsyncStorage.getItem(FAVORITES_KEY),
    ]);
    const manualOutfitsRaw = manualData ? JSON.parse(manualData) : [];
    const favoriteOutfitsRaw = favoriteData ? JSON.parse(favoriteData) : [];
    const merged = [...manualOutfitsRaw, ...favoriteOutfitsRaw];
    const valid = merged
      .map(normalizeOutfit)
      .filter((o): o is SavedOutfit => o !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    setCombinedOutfits(valid);
  };

  const handleDelete = async (id: string) => {
    const updated = combinedOutfits.filter(o => o.id !== id);
    const manual = updated.filter(o => !o.favorited);
    const favorites = updated.filter(o => o.favorited);
    await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    setCombinedOutfits(updated);
  };

  const toggleFavorite = async (id: string) => {
    const updated = combinedOutfits.map(o =>
      o.id === id ? {...o, favorited: !o.favorited} : o,
    );
    const manual = updated.filter(o => !o.favorited);
    const favorites = updated.filter(o => o.favorited);
    await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    setCombinedOutfits(updated);
  };

  const handleNameSave = async () => {
    if (!editingOutfitId) return;
    const updated = combinedOutfits.map(o =>
      o.id === editingOutfitId ? {...o, name: editedName} : o,
    );
    const manual = updated.filter(o => !o.favorited);
    const favorites = updated.filter(o => o.favorited);
    await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    setCombinedOutfits(updated);
    setEditingOutfitId(null);
    setEditedName('');
  };

  useEffect(() => {
    loadOutfits();
  }, []);

  const styles = StyleSheet.create({
    container: {padding: 12, paddingBottom: 40},
    card: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      elevation: 2,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    name: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    timestamp: {
      fontSize: 12,
      color: '#888',
      marginTop: 2,
    },
    actions: {flexDirection: 'row', alignItems: 'center'},
    imageRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    image: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 6,
      marginBottom: 6,
    },
    notes: {
      marginTop: 8,
      fontStyle: 'italic',
      color: theme.colors.foreground,
    },
    stars: {
      flexDirection: 'row',
      marginTop: 6,
    },
    modalContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderRadius: 10,
      width: '80%',
    },
    input: {
      marginTop: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#ccc',
      paddingVertical: 6,
      color: theme.colors.foreground,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 16,
    },
  });

  return (
    <>
      <ScrollView
        style={{backgroundColor: theme.colors.background}}
        contentContainerStyle={styles.container}>
        {combinedOutfits.length === 0 ? (
          <Text style={{color: theme.colors.foreground, textAlign: 'center'}}>
            No saved outfits yet.
          </Text>
        ) : (
          combinedOutfits.map(outfit => (
            <View
              key={outfit.id}
              style={[styles.card, {backgroundColor: theme.colors.surface}]}>
              <View style={styles.headerRow}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingOutfitId(outfit.id);
                    setEditedName(outfit.name || '');
                  }}>
                  <View>
                    <Text style={styles.name}>
                      {outfit.name?.trim() || 'Unnamed Outfit'}
                    </Text>
                    <Text style={styles.timestamp}>
                      {new Date(outfit.createdAt).toLocaleString()}
                    </Text>
                    {outfit.plannedDate && (
                      <Text style={[styles.timestamp, {color: '#4ade80'}]}>
                        Planned for:{' '}
                        {new Date(outfit.plannedDate).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => toggleFavorite(outfit.id)}>
                    <Text style={{fontSize: 18}}>
                      {outfit.favorited ? '❤️' : '🤍'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(outfit.id)}>
                    <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.imageRow}>
                {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
                  i?.image ? (
                    <Image
                      key={i.id}
                      source={{uri: i.image}}
                      style={styles.image}
                    />
                  ) : null,
                )}
              </View>

              {/* ⭐ Rating display */}
              {typeof outfit.rating === 'number' && (
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Text key={star} style={{fontSize: 20, marginRight: 2}}>
                      {(outfit.rating as number) >= star ? '⭐' : '☆'}
                    </Text>
                  ))}
                </View>
              )}

              {/* 📝 Notes display */}
              {outfit.notes?.trim() && (
                <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
              )}

              {/* 📅 Plan + 🔁 Wear Again */}
              <View style={{flexDirection: 'row', marginTop: 10}}>
                <TouchableOpacity
                  onPress={() => {
                    setPlanningOutfitId(outfit.id);
                    setShowDatePicker(true);
                  }}
                  style={{marginRight: 16}}>
                  <Text
                    style={{color: theme.colors.primary, fontWeight: '600'}}>
                    📅 Plan This Outfit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Rewearing outfit:',
                      outfit.name || 'Unnamed Outfit',
                    );
                  }}>
                  <Text
                    style={{color: theme.colors.primary, fontWeight: '600'}}>
                    🔁 Wear Again
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 🏷️ Tags */}
              {(outfit.tags || []).length > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginTop: 8,
                  }}>
                  {outfit.tags?.map(tag => (
                    <View
                      key={tag}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: theme.colors.surface || '#ddd',
                        borderRadius: 16,
                        marginRight: 6,
                        marginBottom: 4,
                      }}>
                      <Text
                        style={{fontSize: 12, color: theme.colors.foreground}}>
                        #{tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {editingOutfitId && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
              Edit Outfit Name
            </Text>
            <TextInput
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Enter new name"
              placeholderTextColor="#888"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setEditingOutfitId(null);
                  setEditedName('');
                }}
                style={{marginRight: 12}}>
                <Text style={{color: '#999'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNameSave}>
                <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showDatePicker && planningOutfitId && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000', // Force dark background
          }}>
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="spinner" // spinner supports dark theme better
            themeVariant="dark" // ✅ this forces white text on Android
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (!selectedDate) return;
              const updated = combinedOutfits.map(o =>
                o.id === planningOutfitId
                  ? {...o, plannedDate: selectedDate.toISOString()}
                  : o,
              );
              const manual = updated.filter(o => !o.favorited);
              const favorites = updated.filter(o => o.favorited);
              AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
              AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
              setCombinedOutfits(updated);
              setPlanningOutfitId(null);
            }}
          />
        </View>
      )}
    </>
  );
}

//////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
//   TextInput,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// // [same imports as before...]
// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number; // ✅ ADDED
//   favorited?: boolean;
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';

// export default function SavedOutfitsScreen() {
//   const {theme} = useAppTheme();
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

//   const normalizeOutfit = (o: any): SavedOutfit | null => {
//     if (o.top && o.bottom && o.shoes) {
//       return {
//         id: o.id || Date.now().toString(),
//         name: o.name || '',
//         top: o.top,
//         bottom: o.bottom,
//         shoes: o.shoes,
//         createdAt: o.createdAt || new Date().toISOString(),
//         tags: o.tags || [],
//         notes: o.notes || '',
//         rating: o.rating ?? undefined, // ✅ ADDED
//         favorited: o.favorited || false,
//       };
//     }
//     if (Array.isArray(o.items) && o.items.length >= 3) {
//       return {
//         id: o.name || Date.now().toString(),
//         name: o.name || '',
//         top: o.items[0],
//         bottom: o.items[1],
//         shoes: o.items[2],
//         createdAt: new Date().toISOString(),
//         tags: [],
//         notes: '',
//         rating: undefined,
//         favorited: o.favorited || false,
//       };
//     }
//     console.warn('Bad outfit:', o);
//     return null;
//   };

//   const loadOutfits = async () => {
//     const [manualData, favoriteData] = await Promise.all([
//       AsyncStorage.getItem(CLOSET_KEY),
//       AsyncStorage.getItem(FAVORITES_KEY),
//     ]);
//     const manualOutfitsRaw = manualData ? JSON.parse(manualData) : [];
//     const favoriteOutfitsRaw = favoriteData ? JSON.parse(favoriteData) : [];
//     const merged = [...manualOutfitsRaw, ...favoriteOutfitsRaw];
//     const valid = merged
//       .map(normalizeOutfit)
//       .filter((o): o is SavedOutfit => o !== null)
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       );
//     setCombinedOutfits(valid);
//   };

//   const handleDelete = async (id: string) => {
//     Alert.alert('Delete Outfit', 'Are you sure?', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           const filtered = combinedOutfits.filter(o => o.id !== id);
//           const manual = filtered.filter(o => !o.favorited);
//           const favorites = filtered.filter(o => o.favorited);
//           await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//           await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//           setCombinedOutfits(filtered);
//         },
//       },
//     ]);
//   };

//   const toggleFavorite = async (id: string) => {
//     const updated = combinedOutfits.map(o =>
//       o.id === id ? {...o, favorited: !o.favorited} : o,
//     );
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);
//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId) return;
//     const updated = combinedOutfits.map(o =>
//       o.id === editingOutfitId ? {...o, name: editedName} : o,
//     );
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);
//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//     setEditingOutfitId(null);
//     setEditedName('');
//   };

//   useEffect(() => {
//     loadOutfits();
//   }, []);

//   const styles = StyleSheet.create({
//     container: {padding: 12, paddingBottom: 40},
//     card: {
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 16,
//       elevation: 2,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 10,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     timestamp: {
//       fontSize: 12,
//       color: '#888',
//       marginTop: 2,
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//       marginBottom: 6,
//     },
//     notes: {
//       marginTop: 8,
//       fontStyle: 'italic',
//       color: theme.colors.foreground,
//     },
//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },
//     modalContainer: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 10,
//       width: '80%',
//     },
//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: '#ccc',
//       paddingVertical: 6,
//       color: theme.colors.foreground,
//     },
//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 16,
//     },
//   });

//   return (
//     <>
//       <ScrollView
//         style={{backgroundColor: theme.colors.background}}
//         contentContainerStyle={styles.container}>
//         {combinedOutfits.length === 0 ? (
//           <Text style={{color: theme.colors.foreground, textAlign: 'center'}}>
//             No saved outfits yet.
//           </Text>
//         ) : (
//           combinedOutfits.map(outfit => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <View style={styles.headerRow}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setEditingOutfitId(outfit.id);
//                     setEditedName(outfit.name || '');
//                   }}>
//                   <View>
//                     <Text style={styles.name}>
//                       {outfit.name?.trim() || 'Unnamed Outfit'}
//                     </Text>
//                     <Text style={styles.timestamp}>
//                       {new Date(outfit.createdAt).toLocaleString()}
//                     </Text>
//                   </View>
//                 </TouchableOpacity>
//                 <View style={styles.actions}>
//                   <TouchableOpacity onPress={() => toggleFavorite(outfit.id)}>
//                     <Text style={{fontSize: 18}}>
//                       {outfit.favorited ? '❤️' : '🤍'}
//                     </Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity onPress={() => handleDelete(outfit.id)}>
//                     <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>

//               <View style={styles.imageRow}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   i?.image ? (
//                     <Image
//                       key={i.id}
//                       source={{uri: i.image}}
//                       style={styles.image}
//                     />
//                   ) : null,
//                 )}
//               </View>

//               {/* ⭐ Rating display */}
//               {typeof outfit.rating === 'number' && (
//                 <View style={styles.stars}>
//                   {[1, 2, 3, 4, 5].map(star => (
//                     <Text key={star} style={{fontSize: 20, marginRight: 2}}>
//                       {(outfit.rating as number) >= star ? '⭐' : '☆'}
//                     </Text>
//                   ))}
//                 </View>
//               )}

//               {/* 📝 Notes display */}
//               {outfit.notes?.trim() && (
//                 <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
//               )}

//               {/* 📅 Plan + 🔁 Wear Again */}
//               <View style={{flexDirection: 'row', marginTop: 10}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     Alert.alert(
//                       'Planned outfit:',
//                       outfit.name || 'Unnamed Outfit',
//                     );
//                   }}
//                   style={{marginRight: 16}}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '600'}}>
//                     📅 Plan This Outfit
//                   </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   onPress={() => {
//                     Alert.alert(
//                       'Rewearing outfit:',
//                       outfit.name || 'Unnamed Outfit',
//                     );
//                   }}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '600'}}>
//                     🔁 Wear Again
//                   </Text>
//                 </TouchableOpacity>
//               </View>

//               {/* 🏷️ Tags */}
//               {(outfit.tags || []).length > 0 && (
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     marginTop: 8,
//                   }}>
//                   {outfit.tags?.map(tag => (
//                     <View
//                       key={tag}
//                       style={{
//                         paddingHorizontal: 8,
//                         paddingVertical: 4,
//                         backgroundColor: theme.colors.surface || '#ddd',
//                         borderRadius: 16,
//                         marginRight: 6,
//                         marginBottom: 4,
//                       }}>
//                       <Text
//                         style={{fontSize: 12, color: theme.colors.foreground}}>
//                         #{tag}
//                       </Text>
//                     </View>
//                   ))}
//                 </View>
//               )}
//             </View>
//           ))
//         )}
//       </ScrollView>

//       {editingOutfitId && (
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor="#888"
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <TouchableOpacity
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}
//                 style={{marginRight: 12}}>
//                 <Text style={{color: '#999'}}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity onPress={handleNameSave}>
//                 <Text
//                   style={{
//                     color: theme.colors.primary,
//                     fontWeight: '600',
//                   }}>
//                   Save
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       )}
//     </>
//   );
// }

///////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
//   TextInput,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// // [same imports as before...]
// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number; // ✅ ADDED
//   favorited?: boolean;
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';

// export default function SavedOutfitsScreen() {
//   const {theme} = useAppTheme();
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

//   const normalizeOutfit = (o: any): SavedOutfit | null => {
//     if (o.top && o.bottom && o.shoes) {
//       return {
//         id: o.id || Date.now().toString(),
//         name: o.name || '',
//         top: o.top,
//         bottom: o.bottom,
//         shoes: o.shoes,
//         createdAt: o.createdAt || new Date().toISOString(),
//         tags: o.tags || [],
//         notes: o.notes || '',
//         rating: o.rating ?? undefined, // ✅ ADDED
//         favorited: o.favorited || false,
//       };
//     }
//     if (Array.isArray(o.items) && o.items.length >= 3) {
//       return {
//         id: o.name || Date.now().toString(),
//         name: o.name || '',
//         top: o.items[0],
//         bottom: o.items[1],
//         shoes: o.items[2],
//         createdAt: new Date().toISOString(),
//         tags: [],
//         notes: '',
//         rating: undefined,
//         favorited: o.favorited || false,
//       };
//     }
//     console.warn('Bad outfit:', o);
//     return null;
//   };

//   const loadOutfits = async () => {
//     const [manualData, favoriteData] = await Promise.all([
//       AsyncStorage.getItem(CLOSET_KEY),
//       AsyncStorage.getItem(FAVORITES_KEY),
//     ]);
//     const manualOutfitsRaw = manualData ? JSON.parse(manualData) : [];
//     const favoriteOutfitsRaw = favoriteData ? JSON.parse(favoriteData) : [];
//     const merged = [...manualOutfitsRaw, ...favoriteOutfitsRaw];
//     const valid = merged
//       .map(normalizeOutfit)
//       .filter((o): o is SavedOutfit => o !== null)
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       );
//     setCombinedOutfits(valid);
//   };

//   const handleDelete = async (id: string) => {
//     Alert.alert('Delete Outfit', 'Are you sure?', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           const filtered = combinedOutfits.filter(o => o.id !== id);
//           const manual = filtered.filter(o => !o.favorited);
//           const favorites = filtered.filter(o => o.favorited);
//           await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//           await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//           setCombinedOutfits(filtered);
//         },
//       },
//     ]);
//   };

//   const toggleFavorite = async (id: string) => {
//     const updated = combinedOutfits.map(o =>
//       o.id === id ? {...o, favorited: !o.favorited} : o,
//     );
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);
//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId) return;
//     const updated = combinedOutfits.map(o =>
//       o.id === editingOutfitId ? {...o, name: editedName} : o,
//     );
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);
//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//     setEditingOutfitId(null);
//     setEditedName('');
//   };

//   useEffect(() => {
//     loadOutfits();
//   }, []);

//   const styles = StyleSheet.create({
//     container: {padding: 12, paddingBottom: 40},
//     card: {
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 16,
//       elevation: 2,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 10,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     timestamp: {
//       fontSize: 12,
//       color: '#888',
//       marginTop: 2,
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//       marginBottom: 6,
//     },
//     notes: {
//       marginTop: 8,
//       fontStyle: 'italic',
//       color: theme.colors.foreground,
//     },
//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },
//     modalContainer: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 10,
//       width: '80%',
//     },
//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: '#ccc',
//       paddingVertical: 6,
//       color: theme.colors.foreground,
//     },
//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 16,
//     },
//   });

//   return (
//     <>
//       <ScrollView
//         style={{backgroundColor: theme.colors.background}}
//         contentContainerStyle={styles.container}>
//         {combinedOutfits.length === 0 ? (
//           <Text style={{color: theme.colors.foreground, textAlign: 'center'}}>
//             No saved outfits yet.
//           </Text>
//         ) : (
//           combinedOutfits.map(outfit => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <View style={styles.headerRow}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setEditingOutfitId(outfit.id);
//                     setEditedName(outfit.name || '');
//                   }}>
//                   <View>
//                     <Text style={styles.name}>
//                       {outfit.name?.trim() || 'Unnamed Outfit'}
//                     </Text>
//                     <Text style={styles.timestamp}>
//                       {new Date(outfit.createdAt).toLocaleString()}
//                     </Text>
//                   </View>
//                 </TouchableOpacity>
//                 <View style={styles.actions}>
//                   <TouchableOpacity onPress={() => toggleFavorite(outfit.id)}>
//                     <Text style={{fontSize: 18}}>
//                       {outfit.favorited ? '❤️' : '🤍'}
//                     </Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity onPress={() => handleDelete(outfit.id)}>
//                     <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>

//               <View style={styles.imageRow}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   i?.image ? (
//                     <Image
//                       key={i.id}
//                       source={{uri: i.image}}
//                       style={styles.image}
//                     />
//                   ) : null,
//                 )}
//               </View>

//               {/* ⭐ Rating display */}
//               {typeof outfit.rating === 'number' && (
//                 <View style={styles.stars}>
//                   {[1, 2, 3, 4, 5].map(star => (
//                     <Text key={star} style={{fontSize: 20, marginRight: 2}}>
//                       {(outfit.rating as number) >= star ? '⭐' : '☆'}
//                     </Text>
//                   ))}
//                 </View>
//               )}

//               {/* 📝 Notes display */}
//               {outfit.notes?.trim() && (
//                 <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
//               )}

//               {/* 📅 Plan + 🔁 Wear Again */}
//               <View style={{flexDirection: 'row', marginTop: 10}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     Alert.alert(
//                       'Planned outfit:',
//                       outfit.name || 'Unnamed Outfit',
//                     );
//                   }}
//                   style={{marginRight: 16}}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '600'}}>
//                     📅 Plan This Outfit
//                   </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   onPress={() => {
//                     Alert.alert(
//                       'Rewearing outfit:',
//                       outfit.name || 'Unnamed Outfit',
//                     );
//                   }}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '600'}}>
//                     🔁 Wear Again
//                   </Text>
//                 </TouchableOpacity>
//               </View>

//               {/* 🏷️ Tags */}
//               {(outfit.tags || []).length > 0 && (
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     marginTop: 8,
//                   }}>
//                   {outfit.tags?.map(tag => (
//                     <View
//                       key={tag}
//                       style={{
//                         paddingHorizontal: 8,
//                         paddingVertical: 4,
//                         backgroundColor: theme.colors.surface || '#ddd',
//                         borderRadius: 16,
//                         marginRight: 6,
//                         marginBottom: 4,
//                       }}>
//                       <Text
//                         style={{fontSize: 12, color: theme.colors.foreground}}>
//                         #{tag}
//                       </Text>
//                     </View>
//                   ))}
//                 </View>
//               )}
//             </View>
//           ))
//         )}
//       </ScrollView>

//       {editingOutfitId && (
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor="#888"
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <TouchableOpacity
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}
//                 style={{marginRight: 12}}>
//                 <Text style={{color: '#999'}}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity onPress={handleNameSave}>
//                 <Text
//                   style={{
//                     color: theme.colors.primary,
//                     fontWeight: '600',
//                   }}>
//                   Save
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       )}
//     </>
//   );
// }

/////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
//   TextInput,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// // [same imports as before...]
// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number; // ✅ ADDED
//   favorited?: boolean;
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';

// export default function SavedOutfitsScreen() {
//   const {theme} = useAppTheme();
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

//   const normalizeOutfit = (o: any): SavedOutfit | null => {
//     if (o.top && o.bottom && o.shoes) {
//       return {
//         id: o.id || Date.now().toString(),
//         name: o.name || '',
//         top: o.top,
//         bottom: o.bottom,
//         shoes: o.shoes,
//         createdAt: o.createdAt || new Date().toISOString(),
//         tags: o.tags || [],
//         notes: o.notes || '',
//         rating: o.rating ?? undefined, // ✅ ADDED
//         favorited: o.favorited || false,
//       };
//     }
//     if (Array.isArray(o.items) && o.items.length >= 3) {
//       return {
//         id: o.name || Date.now().toString(),
//         name: o.name || '',
//         top: o.items[0],
//         bottom: o.items[1],
//         shoes: o.items[2],
//         createdAt: new Date().toISOString(),
//         tags: [],
//         notes: '',
//         rating: undefined,
//         favorited: o.favorited || false,
//       };
//     }
//     console.warn('Bad outfit:', o);
//     return null;
//   };

//   const loadOutfits = async () => {
//     const [manualData, favoriteData] = await Promise.all([
//       AsyncStorage.getItem(CLOSET_KEY),
//       AsyncStorage.getItem(FAVORITES_KEY),
//     ]);
//     const manualOutfitsRaw = manualData ? JSON.parse(manualData) : [];
//     const favoriteOutfitsRaw = favoriteData ? JSON.parse(favoriteData) : [];
//     const merged = [...manualOutfitsRaw, ...favoriteOutfitsRaw];
//     const valid = merged
//       .map(normalizeOutfit)
//       .filter((o): o is SavedOutfit => o !== null)
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       );
//     setCombinedOutfits(valid);
//   };

//   const handleDelete = async (id: string) => {
//     Alert.alert('Delete Outfit', 'Are you sure?', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           const filtered = combinedOutfits.filter(o => o.id !== id);
//           const manual = filtered.filter(o => !o.favorited);
//           const favorites = filtered.filter(o => o.favorited);
//           await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//           await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//           setCombinedOutfits(filtered);
//         },
//       },
//     ]);
//   };

//   const toggleFavorite = async (id: string) => {
//     const updated = combinedOutfits.map(o =>
//       o.id === id ? {...o, favorited: !o.favorited} : o,
//     );
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);
//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId) return;
//     const updated = combinedOutfits.map(o =>
//       o.id === editingOutfitId ? {...o, name: editedName} : o,
//     );
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);
//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//     setEditingOutfitId(null);
//     setEditedName('');
//   };

//   useEffect(() => {
//     loadOutfits();
//   }, []);

//   const styles = StyleSheet.create({
//     container: {padding: 12, paddingBottom: 40},
//     card: {
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 16,
//       elevation: 2,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 10,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     timestamp: {
//       fontSize: 12,
//       color: '#888',
//       marginTop: 2,
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//       marginBottom: 6,
//     },
//     notes: {
//       marginTop: 8,
//       fontStyle: 'italic',
//       color: theme.colors.foreground,
//     },
//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },
//     modalContainer: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 10,
//       width: '80%',
//     },
//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: '#ccc',
//       paddingVertical: 6,
//       color: theme.colors.foreground,
//     },
//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 16,
//     },
//   });

//   return (
//     <>
//       <ScrollView
//         style={{backgroundColor: theme.colors.background}}
//         contentContainerStyle={styles.container}>
//         {combinedOutfits.length === 0 ? (
//           <Text style={{color: theme.colors.foreground, textAlign: 'center'}}>
//             No saved outfits yet.
//           </Text>
//         ) : (
//           combinedOutfits.map(outfit => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <View style={styles.headerRow}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setEditingOutfitId(outfit.id);
//                     setEditedName(outfit.name || '');
//                   }}>
//                   <View>
//                     <Text style={styles.name}>
//                       {outfit.name?.trim() || 'Unnamed Outfit'}
//                     </Text>
//                     <Text style={styles.timestamp}>
//                       {new Date(outfit.createdAt).toLocaleString()}
//                     </Text>
//                   </View>
//                 </TouchableOpacity>
//                 <View style={styles.actions}>
//                   <TouchableOpacity onPress={() => toggleFavorite(outfit.id)}>
//                     <Text style={{fontSize: 18}}>
//                       {outfit.favorited ? '❤️' : '🤍'}
//                     </Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity onPress={() => handleDelete(outfit.id)}>
//                     <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>

//               <View style={styles.imageRow}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   i?.image ? (
//                     <Image
//                       key={i.id}
//                       source={{uri: i.image}}
//                       style={styles.image}
//                     />
//                   ) : null,
//                 )}
//               </View>

//               {/* ⭐ Rating display */}
//               {typeof outfit.rating === 'number' && (
//                 <View style={styles.stars}>
//                   {[1, 2, 3, 4, 5].map(star => (
//                     <Text key={star} style={{fontSize: 20, marginRight: 2}}>
//                       {(outfit.rating as number) >= star ? '⭐' : '☆'}
//                     </Text>
//                   ))}
//                 </View>
//               )}

//               {/* 📝 Notes display */}
//               {outfit.notes?.trim() && (
//                 <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
//               )}

//               {/* 📅 Plan + 🔁 Wear Again */}
//               <View style={{flexDirection: 'row', marginTop: 10}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     Alert.alert(
//                       'Planned outfit:',
//                       outfit.name || 'Unnamed Outfit',
//                     );
//                   }}
//                   style={{marginRight: 16}}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '600'}}>
//                     📅 Plan This Outfit
//                   </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   onPress={() => {
//                     Alert.alert(
//                       'Rewearing outfit:',
//                       outfit.name || 'Unnamed Outfit',
//                     );
//                   }}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '600'}}>
//                     🔁 Wear Again
//                   </Text>
//                 </TouchableOpacity>
//               </View>

//               {/* 🏷️ Tags */}
//               {(outfit.tags || []).length > 0 && (
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     marginTop: 8,
//                   }}>
//                   {outfit.tags?.map(tag => (
//                     <View
//                       key={tag}
//                       style={{
//                         paddingHorizontal: 8,
//                         paddingVertical: 4,
//                         backgroundColor: theme.colors.surface || '#ddd',
//                         borderRadius: 16,
//                         marginRight: 6,
//                         marginBottom: 4,
//                       }}>
//                       <Text
//                         style={{fontSize: 12, color: theme.colors.foreground}}>
//                         #{tag}
//                       </Text>
//                     </View>
//                   ))}
//                 </View>
//               )}
//             </View>
//           ))
//         )}
//       </ScrollView>

//       {editingOutfitId && (
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor="#888"
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <TouchableOpacity
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}
//                 style={{marginRight: 12}}>
//                 <Text style={{color: '#999'}}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity onPress={handleNameSave}>
//                 <Text
//                   style={{
//                     color: theme.colors.primary,
//                     fontWeight: '600',
//                   }}>
//                   Save
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       )}
//     </>
//   );
// }

////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
//   TextInput,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// // [same imports as before...]
// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number; // ✅ ADDED
//   favorited?: boolean;
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';

// export default function SavedOutfitsScreen() {
//   const {theme} = useAppTheme();
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

//   const normalizeOutfit = (o: any): SavedOutfit | null => {
//     if (o.top && o.bottom && o.shoes) {
//       return {
//         id: o.id || Date.now().toString(),
//         name: o.name || '',
//         top: o.top,
//         bottom: o.bottom,
//         shoes: o.shoes,
//         createdAt: o.createdAt || new Date().toISOString(),
//         tags: o.tags || [],
//         notes: o.notes || '',
//         rating: o.rating ?? undefined, // ✅ ADDED
//         favorited: o.favorited || false,
//       };
//     }
//     if (Array.isArray(o.items) && o.items.length >= 3) {
//       return {
//         id: o.name || Date.now().toString(),
//         name: o.name || '',
//         top: o.items[0],
//         bottom: o.items[1],
//         shoes: o.items[2],
//         createdAt: new Date().toISOString(),
//         tags: [],
//         notes: '',
//         rating: undefined,
//         favorited: o.favorited || false,
//       };
//     }
//     console.warn('Bad outfit:', o);
//     return null;
//   };

//   const loadOutfits = async () => {
//     const [manualData, favoriteData] = await Promise.all([
//       AsyncStorage.getItem(CLOSET_KEY),
//       AsyncStorage.getItem(FAVORITES_KEY),
//     ]);
//     const manualOutfitsRaw = manualData ? JSON.parse(manualData) : [];
//     const favoriteOutfitsRaw = favoriteData ? JSON.parse(favoriteData) : [];
//     const merged = [...manualOutfitsRaw, ...favoriteOutfitsRaw];
//     const valid = merged
//       .map(normalizeOutfit)
//       .filter((o): o is SavedOutfit => o !== null)
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       );
//     setCombinedOutfits(valid);
//   };

//   const handleDelete = async (id: string) => {
//     Alert.alert('Delete Outfit', 'Are you sure?', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           const filtered = combinedOutfits.filter(o => o.id !== id);
//           const manual = filtered.filter(o => !o.favorited);
//           const favorites = filtered.filter(o => o.favorited);
//           await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//           await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//           setCombinedOutfits(filtered);
//         },
//       },
//     ]);
//   };

//   const toggleFavorite = async (id: string) => {
//     const updated = combinedOutfits.map(o =>
//       o.id === id ? {...o, favorited: !o.favorited} : o,
//     );
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);
//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId) return;
//     const updated = combinedOutfits.map(o =>
//       o.id === editingOutfitId ? {...o, name: editedName} : o,
//     );
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);
//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//     setEditingOutfitId(null);
//     setEditedName('');
//   };

//   useEffect(() => {
//     loadOutfits();
//   }, []);

//   const styles = StyleSheet.create({
//     container: {padding: 12, paddingBottom: 40},
//     card: {
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 16,
//       elevation: 2,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 10,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     timestamp: {
//       fontSize: 12,
//       color: '#888',
//       marginTop: 2,
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//       marginBottom: 6,
//     },
//     notes: {
//       marginTop: 8,
//       fontStyle: 'italic',
//       color: theme.colors.foreground,
//     },
//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },
//     modalContainer: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 10,
//       width: '80%',
//     },
//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: '#ccc',
//       paddingVertical: 6,
//       color: theme.colors.foreground,
//     },
//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 16,
//     },
//   });

//   return (
//     <>
//       <ScrollView
//         style={{backgroundColor: theme.colors.background}}
//         contentContainerStyle={styles.container}>
//         {combinedOutfits.length === 0 ? (
//           <Text style={{color: theme.colors.foreground, textAlign: 'center'}}>
//             No saved outfits yet.
//           </Text>
//         ) : (
//           combinedOutfits.map(outfit => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <View style={styles.headerRow}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setEditingOutfitId(outfit.id);
//                     setEditedName(outfit.name || '');
//                   }}>
//                   <View>
//                     <Text style={styles.name}>
//                       {outfit.name?.trim() || 'Unnamed Outfit'}
//                     </Text>
//                     <Text style={styles.timestamp}>
//                       {new Date(outfit.createdAt).toLocaleString()}
//                     </Text>
//                   </View>
//                 </TouchableOpacity>
//                 <View style={styles.actions}>
//                   <TouchableOpacity onPress={() => toggleFavorite(outfit.id)}>
//                     <Text style={{fontSize: 18}}>
//                       {outfit.favorited ? '❤️' : '🤍'}
//                     </Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity onPress={() => handleDelete(outfit.id)}>
//                     <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>

//               <View style={styles.imageRow}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   i?.image ? (
//                     <Image
//                       key={i.id}
//                       source={{uri: i.image}}
//                       style={styles.image}
//                     />
//                   ) : null,
//                 )}
//               </View>

//               {/* ⭐ Rating display */}
//               {typeof outfit.rating === 'number' && (
//                 <View style={styles.stars}>
//                   {[1, 2, 3, 4, 5].map(star => (
//                     <Text key={star} style={{fontSize: 20, marginRight: 2}}>
//                       {(outfit.rating as number) >= star ? '⭐' : '☆'}
//                     </Text>
//                   ))}
//                 </View>
//               )}

//               {/* 📝 Notes display */}
//               {outfit.notes?.trim() && (
//                 <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
//               )}

//               {/* 🏷️ Tags display */}
//               {(outfit.tags || []).length > 0 && (
//                 <View>
//                   {(outfit.tags || []).map(tag => (
//                     <Text key={tag}>{tag}</Text>
//                   ))}
//                 </View>
//               )}
//             </View>
//           ))
//         )}
//       </ScrollView>

//       {editingOutfitId && (
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor="#888"
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <TouchableOpacity
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}
//                 style={{marginRight: 12}}>
//                 <Text style={{color: '#999'}}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity onPress={handleNameSave}>
//                 <Text
//                   style={{
//                     color: theme.colors.primary,
//                     fontWeight: '600',
//                   }}>
//                   Save
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       )}
//     </>
//   );
// }

////////////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
//   TextInput,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   favorited?: boolean;
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';

// export default function SavedOutfitsScreen() {
//   const {theme} = useAppTheme();
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

//   const normalizeOutfit = (o: any): SavedOutfit | null => {
//     if (o.top && o.bottom && o.shoes) {
//       return {
//         id: o.id || Date.now().toString(),
//         name: o.name || '',
//         top: o.top,
//         bottom: o.bottom,
//         shoes: o.shoes,
//         createdAt: o.createdAt || new Date().toISOString(),
//         tags: o.tags || [],
//         notes: o.notes || '',
//         favorited: o.favorited || false,
//       };
//     }

//     if (Array.isArray(o.items) && o.items.length >= 3) {
//       return {
//         id: o.name || Date.now().toString(),
//         name: o.name || '',
//         top: o.items[0],
//         bottom: o.items[1],
//         shoes: o.items[2],
//         createdAt: new Date().toISOString(),
//         tags: [],
//         notes: '',
//         favorited: o.favorited || false,
//       };
//     }

//     console.warn('Bad outfit:', o);
//     return null;
//   };

//   const loadOutfits = async () => {
//     const [manualData, favoriteData] = await Promise.all([
//       AsyncStorage.getItem(CLOSET_KEY),
//       AsyncStorage.getItem(FAVORITES_KEY),
//     ]);

//     const manualOutfitsRaw = manualData ? JSON.parse(manualData) : [];
//     const favoriteOutfitsRaw = favoriteData ? JSON.parse(favoriteData) : [];

//     const merged = [...manualOutfitsRaw, ...favoriteOutfitsRaw];
//     const valid = merged
//       .map(normalizeOutfit)
//       .filter((o): o is SavedOutfit => o !== null)
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       );

//     setCombinedOutfits(valid);
//   };

//   const handleDelete = async (id: string) => {
//     Alert.alert('Delete Outfit', 'Are you sure?', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           const filtered = combinedOutfits.filter(o => o.id !== id);
//           const manual = filtered.filter(o => !o.favorited);
//           const favorites = filtered.filter(o => o.favorited);

//           await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//           await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//           setCombinedOutfits(filtered);
//         },
//       },
//     ]);
//   };

//   const toggleFavorite = async (id: string) => {
//     const updated = combinedOutfits.map(o =>
//       o.id === id ? {...o, favorited: !o.favorited} : o,
//     );
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);

//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId) return;

//     const updated = combinedOutfits.map(o =>
//       o.id === editingOutfitId ? {...o, name: editedName} : o,
//     );

//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);

//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//     setEditingOutfitId(null);
//     setEditedName('');
//   };

//   useEffect(() => {
//     loadOutfits();
//   }, []);

//   const styles = StyleSheet.create({
//     container: {padding: 12, paddingBottom: 40},
//     card: {
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 16,
//       elevation: 2,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 10,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     timestamp: {
//       fontSize: 12,
//       color: '#888',
//       marginTop: 2,
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//       marginBottom: 6,
//     },
//     modalContainer: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 10,
//       width: '80%',
//     },
//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: '#ccc',
//       paddingVertical: 6,
//       color: theme.colors.foreground,
//     },
//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 16,
//     },
//   });

//   return (
//     <>
//       <ScrollView
//         style={{backgroundColor: theme.colors.background}}
//         contentContainerStyle={styles.container}>
//         {combinedOutfits.length === 0 ? (
//           <Text style={{color: theme.colors.foreground, textAlign: 'center'}}>
//             No saved outfits yet.
//           </Text>
//         ) : (
//           combinedOutfits.map(outfit => (
//             <View
//               key={outfit.id}
//               style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//               <View style={styles.headerRow}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setEditingOutfitId(outfit.id);
//                     setEditedName(outfit.name || '');
//                   }}>
//                   <View>
//                     <Text style={styles.name}>
//                       {outfit.name?.trim() || 'Unnamed Outfit'}
//                     </Text>
//                     <Text style={styles.timestamp}>
//                       {new Date(outfit.createdAt).toLocaleString()}
//                     </Text>
//                   </View>
//                 </TouchableOpacity>
//                 <View style={styles.actions}>
//                   <TouchableOpacity onPress={() => toggleFavorite(outfit.id)}>
//                     <Text style={{fontSize: 18}}>
//                       {outfit.favorited ? '❤️' : '🤍'}
//                     </Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity onPress={() => handleDelete(outfit.id)}>
//                     <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>
//               <View style={styles.imageRow}>
//                 {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                   i?.image ? (
//                     <Image
//                       key={i.id}
//                       source={{uri: i.image}}
//                       style={styles.image}
//                     />
//                   ) : null,
//                 )}
//               </View>
//             </View>
//           ))
//         )}
//       </ScrollView>

//       {editingOutfitId && (
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor="#888"
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <TouchableOpacity
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}
//                 style={{marginRight: 12}}>
//                 <Text style={{color: '#999'}}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity onPress={handleNameSave}>
//                 <Text
//                   style={{
//                     color: theme.colors.primary,
//                     fontWeight: '600',
//                   }}>
//                   Save
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       )}
//     </>
//   );
// }

////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   favorited?: boolean;
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';

// export default function SavedOutfitsScreen() {
//   const {theme} = useAppTheme();
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);

//   const normalizeOutfit = (o: any): SavedOutfit | null => {
//     if (o.top && o.bottom && o.shoes) {
//       return {
//         id: o.id || Date.now().toString(),
//         name: o.name || '',
//         top: o.top,
//         bottom: o.bottom,
//         shoes: o.shoes,
//         createdAt: o.createdAt || new Date().toISOString(),
//         tags: o.tags || [],
//         notes: o.notes || '',
//         favorited: o.favorited || false,
//       };
//     }

//     if (Array.isArray(o.items) && o.items.length >= 3) {
//       return {
//         id: o.name || Date.now().toString(),
//         name: o.name || '',
//         top: o.items[0],
//         bottom: o.items[1],
//         shoes: o.items[2],
//         createdAt: new Date().toISOString(),
//         tags: [],
//         notes: '',
//         favorited: o.favorited || false,
//       };
//     }

//     console.warn('Bad outfit:', o);
//     return null;
//   };

//   const loadOutfits = async () => {
//     const [manualData, favoriteData] = await Promise.all([
//       AsyncStorage.getItem(CLOSET_KEY),
//       AsyncStorage.getItem(FAVORITES_KEY),
//     ]);

//     const manualOutfitsRaw = manualData ? JSON.parse(manualData) : [];
//     const favoriteOutfitsRaw = favoriteData ? JSON.parse(favoriteData) : [];

//     const merged = [...manualOutfitsRaw, ...favoriteOutfitsRaw];
//     const valid = merged
//       .map(normalizeOutfit)
//       .filter((o): o is SavedOutfit => o !== null)
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       );

//     setCombinedOutfits(valid);
//   };

//   const handleDelete = async (id: string) => {
//     Alert.alert('Delete Outfit', 'Are you sure?', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           const filtered = combinedOutfits.filter(o => o.id !== id);
//           const manual = filtered.filter(o => !o.favorited);
//           const favorites = filtered.filter(o => o.favorited);

//           await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//           await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//           setCombinedOutfits(filtered);
//         },
//       },
//     ]);
//   };

//   const toggleFavorite = async (id: string) => {
//     const updated = combinedOutfits.map(o =>
//       o.id === id ? {...o, favorited: !o.favorited} : o,
//     );
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);

//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//     setCombinedOutfits(updated);
//   };

//   useEffect(() => {
//     loadOutfits();
//   }, []);

//   const styles = StyleSheet.create({
//     container: {padding: 12, paddingBottom: 40},
//     card: {
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 16,
//       elevation: 2,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 10,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//       marginBottom: 6,
//     },
//   });

//   return (
//     <ScrollView
//       style={{backgroundColor: theme.colors.background}}
//       contentContainerStyle={styles.container}>
//       {combinedOutfits.length === 0 ? (
//         <Text style={{color: theme.colors.foreground, textAlign: 'center'}}>
//           No saved outfits yet.
//         </Text>
//       ) : (
//         combinedOutfits.map(outfit => (
//           <View
//             key={outfit.id}
//             style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//             <View style={styles.headerRow}>
//               <View>
//                 <Text style={styles.name}>
//                   {outfit.name?.trim() || 'Unnamed Outfit'}
//                 </Text>
//                 <Text
//                   style={{
//                     fontSize: 13,
//                     color: theme.colors.foreground,
//                     opacity: 0.6,
//                     marginTop: 2,
//                   }}>
//                   {new Date(outfit.createdAt).toLocaleString()}
//                 </Text>
//               </View>

//               <View style={styles.actions}>
//                 <TouchableOpacity onPress={() => toggleFavorite(outfit.id)}>
//                   <Text style={{fontSize: 18}}>
//                     {outfit.favorited ? '❤️' : '🤍'}
//                   </Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity onPress={() => handleDelete(outfit.id)}>
//                   <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//             <View style={styles.imageRow}>
//               {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                 i?.image ? (
//                   <Image
//                     key={i.id}
//                     source={{uri: i.image}}
//                     style={styles.image}
//                   />
//                 ) : null,
//               )}
//             </View>
//           </View>
//         ))
//       )}
//     </ScrollView>
//   );
// }

///////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type SavedOutfit = {
//   id: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   favorited?: boolean;
// };

// const CLOSET_KEY = 'savedOutfits'; // manually created
// const FAVORITES_KEY = 'favoriteOutfits'; // generated favorites

// export default function SavedOutfitsScreen() {
//   const {theme} = useAppTheme();
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const normalizeOutfit = (o: any): SavedOutfit | null => {
//     // Handle new format
//     if (o.top && o.bottom && o.shoes) {
//       return {
//         id: o.id || Date.now().toString(),
//         top: o.top,
//         bottom: o.bottom,
//         shoes: o.shoes,
//         createdAt: o.createdAt || new Date().toISOString(),
//         tags: o.tags || [],
//         notes: o.notes || '',
//         favorited: o.favorited || false,
//       };
//     }

//     // Handle legacy format (manually saved outfits with `items`)
//     if (Array.isArray(o.items) && o.items.length >= 3) {
//       return {
//         id: o.name || Date.now().toString(),
//         top: o.items[0],
//         bottom: o.items[1],
//         shoes: o.items[2],
//         createdAt: new Date().toISOString(),
//         tags: [],
//         notes: '',
//         favorited: o.favorited || false,
//       };
//     }

//     console.warn('Bad outfit:', o);
//     return null;
//   };

//   const loadOutfits = async () => {
//     const [manualData, favoriteData] = await Promise.all([
//       AsyncStorage.getItem(CLOSET_KEY),
//       AsyncStorage.getItem(FAVORITES_KEY),
//     ]);

//     const manualOutfitsRaw = manualData ? JSON.parse(manualData) : [];
//     const favoriteOutfitsRaw = favoriteData ? JSON.parse(favoriteData) : [];

//     const merged = [...manualOutfitsRaw, ...favoriteOutfitsRaw];
//     const valid = merged
//       .map(normalizeOutfit)
//       .filter((o): o is SavedOutfit => o !== null)
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       );

//     setCombinedOutfits(valid);
//   };

//   const handleDelete = async (id: string) => {
//     Alert.alert('Delete Outfit', 'Are you sure?', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           const filtered = combinedOutfits.filter(o => o.id !== id);

//           // Split back into manual vs favorite
//           const manual = filtered.filter(o => !o.favorited);
//           const favorites = filtered.filter(o => o.favorited);

//           await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//           await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
//           setCombinedOutfits(filtered);
//         },
//       },
//     ]);
//   };

//   const toggleFavorite = async (id: string) => {
//     const updated = combinedOutfits.map(o =>
//       o.id === id ? {...o, favorited: !o.favorited} : o,
//     );

//     // Re-split and save
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);

//     await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

//     setCombinedOutfits(updated);
//   };

//   useEffect(() => {
//     loadOutfits();
//   }, []);

//   const styles = StyleSheet.create({
//     container: {padding: 12, paddingBottom: 40},
//     card: {
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 16,
//       elevation: 2,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 10,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//       marginBottom: 6,
//     },
//   });

//   useEffect(() => {
//     combinedOutfits.forEach(o => {
//       if (!o.top || !o.bottom || !o.shoes) {
//         console.warn('Bad outfit:', o);
//       }
//     });
//   }, [combinedOutfits]);

//   return (
//     <ScrollView
//       style={{backgroundColor: theme.colors.background}}
//       contentContainerStyle={styles.container}>
//       {combinedOutfits.length === 0 ? (
//         <Text style={{color: theme.colors.foreground, textAlign: 'center'}}>
//           No saved outfits yet.
//         </Text>
//       ) : (
//         combinedOutfits.map(outfit => (
//           <View
//             key={outfit.id}
//             style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//             <View style={styles.headerRow}>
//               <Text style={styles.name}>
//                 {new Date(outfit.createdAt).toLocaleDateString()}
//               </Text>
//               <View style={styles.actions}>
//                 <TouchableOpacity onPress={() => toggleFavorite(outfit.id)}>
//                   <Text style={{fontSize: 18}}>
//                     {outfit.favorited ? '❤️' : '🤍'}
//                   </Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity onPress={() => handleDelete(outfit.id)}>
//                   <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//             <View style={styles.imageRow}>
//               {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                 i?.image ? (
//                   <Image
//                     key={i.id}
//                     source={{uri: i.image}}
//                     style={styles.image}
//                   />
//                 ) : null,
//               )}
//             </View>
//           </View>
//         ))
//       )}
//     </ScrollView>
//   );
// }

/////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type SavedOutfit = {
//   name: string;
//   items: WardrobeItem[];
//   favorited: boolean;
// };

// type Props = {
//   savedOutfits: SavedOutfit[];
//   onDelete: (name: string) => void;
//   onToggleFavorite: (name: string) => void;
// };

// export default function SavedOutfitsScreen({
//   savedOutfits,
//   onDelete,
//   onToggleFavorite,
// }: Props) {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     container: {
//       padding: 12,
//       paddingBottom: 40,
//     },
//     card: {
//       borderRadius: 12,
//       padding: 12,
//       marginBottom: 16,
//       elevation: 2,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 10,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     imageRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     image: {
//       width: 60,
//       height: 60,
//       borderRadius: 8,
//       marginRight: 6,
//       marginBottom: 6,
//     },
//   });

//   const confirmDelete = (name: string) => {
//     Alert.alert('Delete Outfit', 'Are you sure?', [
//       {text: 'Cancel', style: 'cancel'},
//       {text: 'Delete', style: 'destructive', onPress: () => onDelete(name)},
//     ]);
//   };

//   return (
//     <ScrollView
//       style={{backgroundColor: theme.colors.background}}
//       contentContainerStyle={styles.container}>
//       {savedOutfits.map(item => (
//         <View
//           key={item.name}
//           style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//           <View style={styles.headerRow}>
//             <Text style={styles.name}>{item.name}</Text>
//             <View style={styles.actions}>
//               <TouchableOpacity onPress={() => onToggleFavorite(item.name)}>
//                 <Text style={{fontSize: 18}}>
//                   {item.favorited ? '❤️' : '🤍'}
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity onPress={() => confirmDelete(item.name)}>
//                 <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//           <View style={styles.imageRow}>
//             {item.items.map(i => (
//               <Image key={i.id} source={{uri: i.image}} style={styles.image} />
//             ))}
//           </View>
//         </View>
//       ))}
//     </ScrollView>
//   );
// }

///////////

// import React from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type SavedOutfit = {
//   name: string;
//   items: WardrobeItem[];
//   favorited: boolean;
// };

// type Props = {
//   savedOutfits: SavedOutfit[];
//   onDelete: (name: string) => void;
//   onToggleFavorite: (name: string) => void;
// };

// export default function SavedOutfitsScreen({
//   savedOutfits,
//   onDelete,
//   onToggleFavorite,
// }: Props) {
//   const {theme} = useAppTheme();

//   const confirmDelete = (name: string) => {
//     Alert.alert('Delete Outfit', 'Are you sure?', [
//       {text: 'Cancel', style: 'cancel'},
//       {text: 'Delete', style: 'destructive', onPress: () => onDelete(name)},
//     ]);
//   };

//   const renderOutfit = ({item}: {item: SavedOutfit}) => (
//     <View style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//       <View style={styles.headerRow}>
//         <Text style={styles.name}>{item.name}</Text>
//         <View style={styles.actions}>
//           <TouchableOpacity onPress={() => onToggleFavorite(item.name)}>
//             <Text style={{fontSize: 18}}>{item.favorited ? '❤️' : '🤍'}</Text>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => confirmDelete(item.name)}>
//             <Text style={{fontSize: 18, marginLeft: 10}}>🗑️</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//       <View style={styles.imageRow}>
//         {item.items.map(i => (
//           <Image key={i.id} source={{uri: i.image}} style={styles.image} />
//         ))}
//       </View>
//     </View>
//   );

//   return (
//     <FlatList
//       data={savedOutfits}
//       keyExtractor={item => item.name}
//       renderItem={renderOutfit}
//       contentContainerStyle={[
//         styles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//     />
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 12,
//   },
//   card: {
//     borderRadius: 12,
//     padding: 12,
//     marginBottom: 16,
//     elevation: 2,
//   },
//   headerRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 10,
//   },
//   name: {
//     fontSize: 18,
//     fontWeight: '600',
//   },
//   actions: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   imageRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   image: {
//     width: 60,
//     height: 60,
//     borderRadius: 8,
//     marginRight: 6,
//     marginBottom: 6,
//   },
// });
