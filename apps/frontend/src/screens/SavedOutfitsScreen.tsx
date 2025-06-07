import React, {useEffect, useRef, useState} from 'react';
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
import ViewShot from 'react-native-view-shot';
import {useAuth0} from 'react-native-auth0';
import {useFavorites} from '../hooks/useFavorites';
// import Share from 'react-native-share';

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
  plannedDate?: string;
};

const CLOSET_KEY = 'savedOutfits';
const FAVORITES_KEY = 'favoriteOutfits';

export default function SavedOutfitsScreen() {
  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {favorites, addFavorite, removeFavorite} = useFavorites(userId);

  const {theme} = useAppTheme();
  const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [planningOutfitId, setPlanningOutfitId] = useState<string | null>(null);
  const [lastDeletedOutfit, setLastDeletedOutfit] =
    useState<SavedOutfit | null>(null);

  const [selectedTempDate, setSelectedTempDate] = useState<Date | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const viewRefs = useRef<{[key: string]: ViewShot | null}>({});

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
        rating: o.rating ?? undefined,
        favorited: o.favorited || false,
        plannedDate: o.plannedDate || undefined,
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
      AsyncStorage.getItem(FAVORITES_KEY), // ← legacy fallback
    ]);

    const manualOutfitsRaw = manualData ? JSON.parse(manualData) : [];
    const favoriteOutfitsRaw = favoriteData ? JSON.parse(favoriteData) : [];

    const merged = [...manualOutfitsRaw, ...favoriteOutfitsRaw];
    const valid = merged
      .map(normalizeOutfit)
      .filter((o): o is SavedOutfit => o !== null)
      .map(outfit => ({
        ...outfit,
        favorited: Array.isArray(favorites) && favorites.includes(outfit.id),
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    setCombinedOutfits(valid);
  };

  const handleDelete = (id: string) => {
    const deleted = combinedOutfits.find(o => o.id === id);
    if (!deleted) return;

    const updated = combinedOutfits.filter(o => o.id !== id);
    const manual = updated.filter(o => !o.favorited);
    const favorites = updated.filter(o => o.favorited);
    setCombinedOutfits(updated);
    setLastDeletedOutfit(deleted);

    AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

    setTimeout(() => {
      setLastDeletedOutfit(null);
    }, 3000); // 3 seconds
  };

  const toggleFavorite = async (id: string) => {
    const isFavorited = favorites.includes(id);
    try {
      if (isFavorited) {
        await removeFavorite(id);
      } else {
        await addFavorite(id);
      }
    } catch (err) {
      console.error('Error toggling favorite', err);
    }
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
      fontWeight: '800',
      color: theme.colors.foreground,
    },
    timestamp: {
      fontSize: 12,
      color: '#CCCCCC',
      marginTop: 2,
      marginBottom: 4,
      fontWeight: '500',
    },
    actions: {flexDirection: 'row', alignItems: 'center'},
    imageRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
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
    header: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.colors.primary,
      paddingHorizontal: 16,
    },
  });

  const [sortType, setSortType] = useState<
    'newest' | 'favorites' | 'planned' | 'stars'
  >('newest');

  const sortedOutfits = [...combinedOutfits].sort((a, b) => {
    switch (sortType) {
      case 'favorites':
        return Number(b.favorited) - Number(a.favorited);
      case 'planned':
        return (
          new Date(b.plannedDate || 0).getTime() -
          new Date(a.plannedDate || 0).getTime()
        );
      case 'stars':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });

  return (
    <>
      <Text style={styles.header}>Saved Outfit</Text>
      {/* 🔀 Sort/Filter Bar */}
      <View style={{paddingHorizontal: 16, marginBottom: 0, marginTop: 4}}>
        <Text
          style={{
            color: theme.colors.foreground,
            fontWeight: '600',
            fontSize: 15,
            marginBottom: 14,
          }}>
          Sort by:
        </Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
          {(
            [
              {key: 'newest', label: 'Newest'},
              {key: 'favorites', label: 'Favorites'},
              {key: 'planned', label: 'Planned'},
              {key: 'stars', label: 'Rating'},
            ] as const
          ).map(({key, label}, idx) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSortType(key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor:
                  sortType === key
                    ? theme.colors.primary
                    : theme.colors.surface,
                marginRight: 8,
                marginBottom: 8,
              }}>
              <Text
                style={{
                  color: sortType === key ? 'black' : theme.colors.foreground2,
                  fontWeight: '500',
                  fontSize: 13,
                }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={{backgroundColor: theme.colors.background}}
        contentContainerStyle={styles.container}>
        {sortedOutfits.length === 0 ? (
          <Text style={{color: theme.colors.foreground, textAlign: 'center'}}>
            No saved outfits yet.
          </Text>
        ) : (
          sortedOutfits.map(outfit => (
            <ViewShot
              key={outfit.id + '_shot'}
              ref={ref => (viewRefs.current[outfit.id] = ref)}
              options={{format: 'png', quality: 0.9}}>
              <View
                style={[styles.card, {backgroundColor: theme.colors.surface}]}>
                <View style={styles.headerRow}></View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingOutfitId(outfit.id);
                      setEditedName(outfit.name || '');
                    }}
                    style={{flex: 1, marginRight: 12}}>
                    <Text style={styles.name}>
                      {outfit.name?.trim() || 'Unnamed Outfit'}
                    </Text>
                    {(outfit.createdAt || outfit.plannedDate) && (
                      <View style={{marginTop: 4}}>
                        {outfit.plannedDate && (
                          <Text style={styles.timestamp}>
                            Planned for:{' '}
                            {new Date(outfit.plannedDate).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              },
                            )}
                          </Text>
                        )}
                        {outfit.createdAt && (
                          <Text style={styles.timestamp}>
                            Saved:{' '}
                            {new Date(outfit.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              },
                            )}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <TouchableOpacity onPress={() => toggleFavorite(outfit.id)}>
                      <Text style={{fontSize: 18}}>
                        {outfit.favorited ? '❤️' : '🤍'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setPendingDeleteId(outfit.id);
                        setShowDeleteConfirm(true);
                      }}
                      style={{marginLeft: 10}}>
                      <Text style={{fontSize: 18}}>🗑️</Text>
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

                {typeof outfit.rating === 'number' && (
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Text key={star} style={{fontSize: 20, marginRight: 2}}>
                        {outfit.rating >= star ? '⭐' : '☆'}
                      </Text>
                    ))}
                  </View>
                )}

                {outfit.notes?.trim() && (
                  <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
                )}

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginTop: 10,
                  }}>
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
                    }}
                    style={{marginRight: 16}}>
                    <Text
                      style={{color: theme.colors.primary, fontWeight: '600'}}>
                      🔁 Wear Again
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Share feature coming soon');
                    }}>
                    <Text
                      style={{color: theme.colors.primary, fontWeight: '600'}}>
                      🔗 Share Outfit
                    </Text>
                  </TouchableOpacity>
                </View>

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
                          backgroundColor: theme.colors.surface,
                          borderRadius: 16,
                          marginRight: 6,
                          marginBottom: 4,
                        }}>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.colors.foreground,
                          }}>
                          #{tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ViewShot>
          ))
        )}
      </ScrollView>

      {/* 📝 Edit Name Modal */}
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

      {/* 📅 Date Picker */}
      {showDatePicker && planningOutfitId && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
            paddingBottom: 40,
          }}>
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="spinner"
            themeVariant="dark"
            onChange={(event, selectedDate) => {
              if (selectedDate) {
                setSelectedTempDate(selectedDate);
              }
            }}
          />
          <View style={{alignItems: 'center', marginTop: 12}}>
            <TouchableOpacity
              style={{
                backgroundColor: '#405de6',
                paddingVertical: 8,
                paddingHorizontal: 20,
                borderRadius: 20,
              }}
              onPress={() => {
                if (selectedTempDate && planningOutfitId) {
                  const updated = combinedOutfits.map(o =>
                    o.id === planningOutfitId
                      ? {...o, plannedDate: selectedTempDate.toISOString()}
                      : o,
                  );
                  const manual = updated.filter(o => !o.favorited);
                  const favorites = updated.filter(o => o.favorited);
                  AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
                  AsyncStorage.setItem(
                    FAVORITES_KEY,
                    JSON.stringify(favorites),
                  );
                  setCombinedOutfits(updated);
                }

                setShowDatePicker(false);
                setPlanningOutfitId(null);
              }}>
              <Text style={{color: 'white', fontWeight: '600'}}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 🧼 Undo Toast */}
      {lastDeletedOutfit && (
        <View
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: theme.colors.surface,
            padding: 12,
            borderRadius: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
          <TouchableOpacity
            onPress={async () => {
              const updated = [...combinedOutfits, lastDeletedOutfit];
              const manual = updated.filter(o => !o.favorited);
              const favorites = updated.filter(o => o.favorited);
              await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
              await AsyncStorage.setItem(
                FAVORITES_KEY,
                JSON.stringify(favorites),
              );
              setCombinedOutfits(updated);
              setLastDeletedOutfit(null);
            }}>
            <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
              Undo
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {showDeleteConfirm && pendingDeleteId && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              padding: 24,
              borderRadius: 12,
              width: '100%',
              maxWidth: 360,
            }}>
            <Text
              style={{
                fontSize: 16,
                color: theme.colors.foreground,
                fontWeight: '600',
                marginBottom: 12,
              }}>
              Delete this outfit?
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.foreground2,
                marginBottom: 20,
              }}>
              This action cannot be undone.
            </Text>
            <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
              <TouchableOpacity
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setPendingDeleteId(null);
                }}
                style={{marginRight: 16}}>
                <Text style={{color: theme.colors.foreground}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (pendingDeleteId) handleDelete(pendingDeleteId);
                  setShowDeleteConfirm(false);
                  setPendingDeleteId(null);
                }}>
                <Text style={{color: 'red', fontWeight: '600'}}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

///////////

// import React, {useEffect, useRef, useState} from 'react';
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
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// // import Share from 'react-native-share';

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
//   plannedDate?: string;
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';

// export default function SavedOutfitsScreen() {
//   const {theme} = useAppTheme();
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [planningOutfitId, setPlanningOutfitId] = useState<string | null>(null);
//   const [lastDeletedOutfit, setLastDeletedOutfit] =
//     useState<SavedOutfit | null>(null);

//   const [selectedTempDate, setSelectedTempDate] = useState<Date | null>(null);

//   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//   const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

//   const viewRefs = useRef<{[key: string]: ViewShot | null}>({});

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
//         rating: o.rating ?? undefined,
//         favorited: o.favorited || false,
//         plannedDate: o.plannedDate || undefined,
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

//   const handleDelete = (id: string) => {
//     const deleted = combinedOutfits.find(o => o.id === id);
//     if (!deleted) return;

//     const updated = combinedOutfits.filter(o => o.id !== id);
//     const manual = updated.filter(o => !o.favorited);
//     const favorites = updated.filter(o => o.favorited);
//     setCombinedOutfits(updated);
//     setLastDeletedOutfit(deleted);

//     AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//     AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

//     setTimeout(() => {
//       setLastDeletedOutfit(null);
//     }, 3000); // 3 seconds
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
//       fontWeight: '800',
//       color: theme.colors.foreground,
//     },
//     timestamp: {
//       fontSize: 12,
//       color: '#CCCCCC',
//       marginTop: 2,
//       marginBottom: 4,
//       fontWeight: '500',
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
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
//     header: {
//       fontSize: 28,
//       fontWeight: '600',
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//   });

//   const [sortType, setSortType] = useState<
//     'newest' | 'favorites' | 'planned' | 'stars'
//   >('newest');

//   const sortedOutfits = [...combinedOutfits].sort((a, b) => {
//     switch (sortType) {
//       case 'favorites':
//         return Number(b.favorited) - Number(a.favorited);
//       case 'planned':
//         return (
//           new Date(b.plannedDate || 0).getTime() -
//           new Date(a.plannedDate || 0).getTime()
//         );
//       case 'stars':
//         return (b.rating || 0) - (a.rating || 0);
//       default:
//         return (
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//         );
//     }
//   });

//   return (
//     <>
//       <Text style={styles.header}>Saved Outfit</Text>
//       {/* 🔀 Sort/Filter Bar */}
//       <View style={{paddingHorizontal: 16, marginBottom: 0, marginTop: 4}}>
//         <Text
//           style={{
//             color: theme.colors.foreground,
//             fontWeight: '600',
//             fontSize: 15,
//             marginBottom: 14,
//           }}>
//           Sort by:
//         </Text>
//         <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
//           {(
//             [
//               {key: 'newest', label: 'Newest'},
//               {key: 'favorites', label: 'Favorites'},
//               {key: 'planned', label: 'Planned'},
//               {key: 'stars', label: 'Rating'},
//             ] as const
//           ).map(({key, label}, idx) => (
//             <TouchableOpacity
//               key={key}
//               onPress={() => setSortType(key)}
//               style={{
//                 paddingHorizontal: 14,
//                 paddingVertical: 7,
//                 borderRadius: 20,
//                 backgroundColor:
//                   sortType === key
//                     ? theme.colors.primary
//                     : theme.colors.surface,
//                 marginRight: 8,
//                 marginBottom: 8,
//               }}>
//               <Text
//                 style={{
//                   color: sortType === key ? 'black' : theme.colors.foreground2,
//                   fontWeight: '500',
//                   fontSize: 13,
//                 }}>
//                 {label}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </View>

//       <ScrollView
//         style={{backgroundColor: theme.colors.background}}
//         contentContainerStyle={styles.container}>
//         {sortedOutfits.length === 0 ? (
//           <Text style={{color: theme.colors.foreground, textAlign: 'center'}}>
//             No saved outfits yet.
//           </Text>
//         ) : (
//           sortedOutfits.map(outfit => (
//             <ViewShot
//               key={outfit.id + '_shot'}
//               ref={ref => (viewRefs.current[outfit.id] = ref)}
//               options={{format: 'png', quality: 0.9}}>
//               <View
//                 style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//                 <View style={styles.headerRow}></View>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     alignItems: 'center',
//                     justifyContent: 'space-between',
//                     marginBottom: 4,
//                   }}>
//                   <TouchableOpacity
//                     onPress={() => {
//                       setEditingOutfitId(outfit.id);
//                       setEditedName(outfit.name || '');
//                     }}
//                     style={{flex: 1, marginRight: 12}}>
//                     <Text style={styles.name}>
//                       {outfit.name?.trim() || 'Unnamed Outfit'}
//                     </Text>
//                     {(outfit.createdAt || outfit.plannedDate) && (
//                       <View style={{marginTop: 4}}>
//                         {outfit.plannedDate && (
//                           <Text style={styles.timestamp}>
//                             Planned for:{' '}
//                             {new Date(outfit.plannedDate).toLocaleDateString(
//                               undefined,
//                               {
//                                 month: 'short',
//                                 day: 'numeric',
//                                 year: 'numeric',
//                               },
//                             )}
//                           </Text>
//                         )}
//                         {outfit.createdAt && (
//                           <Text style={styles.timestamp}>
//                             Saved:{' '}
//                             {new Date(outfit.createdAt).toLocaleDateString(
//                               undefined,
//                               {
//                                 month: 'short',
//                                 day: 'numeric',
//                                 year: 'numeric',
//                               },
//                             )}
//                           </Text>
//                         )}
//                       </View>
//                     )}
//                   </TouchableOpacity>
//                   <View style={{flexDirection: 'row', alignItems: 'center'}}>
//                     <TouchableOpacity onPress={() => toggleFavorite(outfit.id)}>
//                       <Text style={{fontSize: 18}}>
//                         {outfit.favorited ? '❤️' : '🤍'}
//                       </Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       onPress={() => {
//                         setPendingDeleteId(outfit.id);
//                         setShowDeleteConfirm(true);
//                       }}
//                       style={{marginLeft: 10}}>
//                       <Text style={{fontSize: 18}}>🗑️</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>

//                 <View style={styles.imageRow}>
//                   {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                     i?.image ? (
//                       <Image
//                         key={i.id}
//                         source={{uri: i.image}}
//                         style={styles.image}
//                       />
//                     ) : null,
//                   )}
//                 </View>

//                 {typeof outfit.rating === 'number' && (
//                   <View style={styles.stars}>
//                     {[1, 2, 3, 4, 5].map(star => (
//                       <Text key={star} style={{fontSize: 20, marginRight: 2}}>
//                         {outfit.rating >= star ? '⭐' : '☆'}
//                       </Text>
//                     ))}
//                   </View>
//                 )}

//                 {outfit.notes?.trim() && (
//                   <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
//                 )}

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     marginTop: 10,
//                   }}>
//                   <TouchableOpacity
//                     onPress={() => {
//                       setPlanningOutfitId(outfit.id);
//                       setShowDatePicker(true);
//                     }}
//                     style={{marginRight: 16}}>
//                     <Text
//                       style={{color: theme.colors.primary, fontWeight: '600'}}>
//                       📅 Plan This Outfit
//                     </Text>
//                   </TouchableOpacity>

//                   <TouchableOpacity
//                     onPress={() => {
//                       Alert.alert(
//                         'Rewearing outfit:',
//                         outfit.name || 'Unnamed Outfit',
//                       );
//                     }}
//                     style={{marginRight: 16}}>
//                     <Text
//                       style={{color: theme.colors.primary, fontWeight: '600'}}>
//                       🔁 Wear Again
//                     </Text>
//                   </TouchableOpacity>

//                   <TouchableOpacity
//                     onPress={() => {
//                       Alert.alert('Share feature coming soon');
//                     }}>
//                     <Text
//                       style={{color: theme.colors.primary, fontWeight: '600'}}>
//                       🔗 Share Outfit
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 {(outfit.tags || []).length > 0 && (
//                   <View
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       marginTop: 8,
//                     }}>
//                     {outfit.tags?.map(tag => (
//                       <View
//                         key={tag}
//                         style={{
//                           paddingHorizontal: 8,
//                           paddingVertical: 4,
//                           backgroundColor: theme.colors.surface,
//                           borderRadius: 16,
//                           marginRight: 6,
//                           marginBottom: 4,
//                         }}>
//                         <Text
//                           style={{
//                             fontSize: 12,
//                             color: theme.colors.foreground,
//                           }}>
//                           #{tag}
//                         </Text>
//                       </View>
//                     ))}
//                   </View>
//                 )}
//               </View>
//             </ViewShot>
//           ))
//         )}
//       </ScrollView>

//       {/* 📝 Edit Name Modal */}
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
//                 <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//                   Save
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       )}

//       {/* 📅 Date Picker */}
//       {showDatePicker && planningOutfitId && (
//         <View
//           style={{
//             position: 'absolute',
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: '#000',
//             paddingBottom: 40,
//           }}>
//           <DateTimePicker
//             value={new Date()}
//             mode="date"
//             display="spinner"
//             themeVariant="dark"
//             onChange={(event, selectedDate) => {
//               if (selectedDate) {
//                 setSelectedTempDate(selectedDate);
//               }
//             }}
//           />
//           <View style={{alignItems: 'center', marginTop: 12}}>
//             <TouchableOpacity
//               style={{
//                 backgroundColor: '#405de6',
//                 paddingVertical: 8,
//                 paddingHorizontal: 20,
//                 borderRadius: 20,
//               }}
//               onPress={() => {
//                 if (selectedTempDate && planningOutfitId) {
//                   const updated = combinedOutfits.map(o =>
//                     o.id === planningOutfitId
//                       ? {...o, plannedDate: selectedTempDate.toISOString()}
//                       : o,
//                   );
//                   const manual = updated.filter(o => !o.favorited);
//                   const favorites = updated.filter(o => o.favorited);
//                   AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//                   AsyncStorage.setItem(
//                     FAVORITES_KEY,
//                     JSON.stringify(favorites),
//                   );
//                   setCombinedOutfits(updated);
//                 }

//                 setShowDatePicker(false);
//                 setPlanningOutfitId(null);
//               }}>
//               <Text style={{color: 'white', fontWeight: '600'}}>Done</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <View
//           style={{
//             position: 'absolute',
//             bottom: 20,
//             left: 20,
//             right: 20,
//             backgroundColor: theme.colors.surface,
//             padding: 12,
//             borderRadius: 8,
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//           }}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <TouchableOpacity
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favorites = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(
//                 FAVORITES_KEY,
//                 JSON.stringify(favorites),
//               );
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//               Undo
//             </Text>
//           </TouchableOpacity>
//         </View>
//       )}
//       {showDeleteConfirm && pendingDeleteId && (
//         <View
//           style={{
//             position: 'absolute',
//             top: 0,
//             bottom: 0,
//             left: 0,
//             right: 0,
//             backgroundColor: 'rgba(0,0,0,0.6)',
//             justifyContent: 'center',
//             alignItems: 'center',
//             padding: 20,
//           }}>
//           <View
//             style={{
//               backgroundColor: theme.colors.surface,
//               padding: 24,
//               borderRadius: 12,
//               width: '100%',
//               maxWidth: 360,
//             }}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '600',
//                 marginBottom: 12,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 20,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <TouchableOpacity
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}
//                 style={{marginRight: 16}}>
//                 <Text style={{color: theme.colors.foreground}}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: 'red', fontWeight: '600'}}>Delete</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       )}
//     </>
//   );
// }
