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
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {WardrobeItem} from '../hooks/useOutfitSuggestion';
import DateTimePicker from '@react-native-community/datetimepicker';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFavorites} from '../hooks/useFavorites';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import PushNotification from 'react-native-push-notification';
import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

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
  type: 'custom' | 'ai';
};

const CLOSET_KEY = 'savedOutfits';
const FAVORITES_KEY = 'favoriteOutfits';
const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

export default function SavedOutfitsScreen() {
  const userId = useUUID();
  if (!userId) return null;

  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  // ⏰ Two-step Date → Time scheduling state
  const [planningOutfitId, setPlanningOutfitId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTempDate, setSelectedTempDate] = useState<Date | null>(null);
  const [selectedTempTime, setSelectedTempTime] = useState<Date | null>(null);

  const [lastDeletedOutfit, setLastDeletedOutfit] =
    useState<SavedOutfit | null>(null);

  const {
    favorites,
    isLoading: favoritesLoading,
    toggleFavorite,
  } = useFavorites(userId);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const viewRefs = useRef<{[key: string]: ViewShot | null}>({});
  const [fullScreenOutfit, setFullScreenOutfit] = useState<SavedOutfit | null>(
    null,
  );

  const hSelect = () =>
    ReactNativeHapticFeedback.trigger('selection', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

  const resetPlanFlow = () => {
    setPlanningOutfitId(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setSelectedTempDate(null);
    setSelectedTempTime(null);
  };

  const combineDateAndTime = (date: Date, time: Date) => {
    const d = new Date(date);
    const t = new Date(time);
    d.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return d;
  };

  // 🔔 Local alert helpers
  const scheduleOutfitLocalAlert = (
    outfitId: string,
    outfitName: string | undefined,
    when: Date,
  ) => {
    const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
    PushNotification.localNotificationSchedule({
      id: `outfit-${outfitId}`,
      channelId: 'outfits',
      title: 'Outfit Reminder',
      message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
      date: local,
      allowWhileIdle: true,
      playSound: true,
      soundName: 'default',
    });
  };

  const cancelOutfitLocalAlert = (outfitId: string) => {
    PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
  };

  const normalizeImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  };

  const loadOutfits = async () => {
    try {
      const [aiRes, customRes, scheduledRes] = await Promise.all([
        fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
        fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
        fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
      ]);

      if (!aiRes.ok || !customRes.ok || !scheduledRes.ok) {
        throw new Error('Failed to fetch outfits or schedule');
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

      const normalize = (o: any, isCustom: boolean): SavedOutfit => {
        const outfitId = o.id;
        return {
          id: outfitId,
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
            : ({} as any),
          bottom: o.bottom
            ? {
                id: o.bottom.id,
                name: o.bottom.name,
                image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
                mainCategory: '',
                subCategory: '',
                material: '',
                fit: '',
                color: '',
                size: '',
                notes: '',
              }
            : ({} as any),
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
            : ({} as any),
          createdAt: o.created_at
            ? new Date(o.created_at).toISOString()
            : new Date().toISOString(),
          tags: o.tags || [],
          notes: o.notes || '',
          rating: o.rating ?? undefined,
          favorited: favorites.some(
            f =>
              f.id === outfitId &&
              f.source === (isCustom ? 'custom' : 'suggestion'),
          ),
          plannedDate: scheduleMap[outfitId] ?? undefined,
          type: isCustom ? 'custom' : 'ai',
        };
      };

      const allOutfits = [
        ...aiData.map((o: any) => normalize(o, false)),
        ...customData.map((o: any) => normalize(o, true)),
      ];
      setCombinedOutfits(allOutfits);
    } catch (err) {
      console.error('❌ Failed to load outfits:', err);
    }
  };

  const cancelPlannedOutfit = async (outfitId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
      });
      if (!res.ok) throw new Error('Failed to cancel planned outfit');

      setCombinedOutfits(prev =>
        prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
      );

      cancelOutfitLocalAlert(outfitId);

      const key = `outfitCalendar:${outfitId}`;
      const existingId = await AsyncStorage.getItem(key);
      if (existingId) {
        await removeCalendarEvent(existingId);
        await AsyncStorage.removeItem(key);
      }
    } catch (err) {
      console.error('❌ Failed to cancel plan:', err);
      Alert.alert('Error', 'Could not cancel the planned date.');
    }
  };

  const handleDelete = async (id: string) => {
    const deleted = combinedOutfits.find(o => o.id === id);
    if (!deleted) return;
    try {
      const res = await fetch(`${API_BASE_URL}/outfit/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete from DB');

      const updated = combinedOutfits.filter(o => o.id !== id);
      setCombinedOutfits(updated);
      setLastDeletedOutfit(deleted);
      setTimeout(() => setLastDeletedOutfit(null), 3000);
    } catch (err) {
      console.error('❌ Error deleting outfit:', err);
      Alert.alert('Error', 'Could not delete outfit from the database.');
    }
  };

  const handleNameSave = async () => {
    if (!editingOutfitId || editedName.trim() === '') return;
    const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
    if (!outfit) return;
    try {
      const table = outfit.type === 'custom' ? 'custom' : 'suggestions';
      const res = await fetch(
        `${API_BASE_URL}/outfit/${table}/${editingOutfitId}`,
        {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({name: editedName.trim()}),
        },
      );
      if (!res.ok) throw new Error('Failed to update outfit name');
      const updated = combinedOutfits.map(o =>
        o.id === editingOutfitId ? {...o, name: editedName} : o,
      );
      setCombinedOutfits(updated);
      setEditingOutfitId(null);
      setEditedName('');
    } catch (err) {
      console.error('❌ Error updating outfit name:', err);
      Alert.alert('Error', 'Failed to update outfit name in the database.');
    }
  };

  // Commit schedule after both date and time picked
  const commitSchedule = async () => {
    if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
    try {
      const selectedOutfit = combinedOutfits.find(
        o => o.id === planningOutfitId,
      );
      if (!selectedOutfit) return;

      const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
      const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

      cancelOutfitLocalAlert(planningOutfitId);
      const oldKey = `outfitCalendar:${planningOutfitId}`;
      const oldEventId = await AsyncStorage.getItem(oldKey);
      if (oldEventId) {
        await removeCalendarEvent(oldEventId);
        await AsyncStorage.removeItem(oldKey);
      }

      await fetch(`${API_BASE_URL}/scheduled-outfits`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          outfit_id: planningOutfitId,
          outfit_type,
          scheduled_for: combined.toISOString(),
        }),
      });

      setCombinedOutfits(prev =>
        prev.map(o =>
          o.id === planningOutfitId
            ? {...o, plannedDate: combined.toISOString()}
            : o,
        ),
      );

      scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

      const eventId = await addOutfitToCalendar({
        title: selectedOutfit.name?.trim() || 'Outfit',
        startISO: combined.toISOString(),
        notes: selectedOutfit.notes || '',
        alarmMinutesBefore: 0,
      });
      if (eventId) {
        await AsyncStorage.setItem(
          `outfitCalendar:${planningOutfitId}`,
          eventId,
        );
      }
    } catch (err) {
      console.error('❌ Failed to schedule outfit:', err);
    } finally {
      resetPlanFlow();
    }
  };

  useEffect(() => {
    if (userId && !favoritesLoading) loadOutfits();
  }, [userId, favoritesLoading]);

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 18,
      marginBottom: 12,
      borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
      borderColor: theme.colors.surfaceBorder,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowOffset: {width: 0, height: 14},
      shadowRadius: 28,
      elevation: 10,
    },
    timestamp: {
      fontSize: 12,
      color: theme.colors.foreground3,
      marginTop: 4,
      marginBottom: 8,
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    actions: {flexDirection: 'row', alignItems: 'center'},
    imageRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginTop: 10,
      gap: 12,
    },
    notes: {
      marginTop: 12,
      fontStyle: 'italic',
      color: theme.colors.foreground3,
      fontSize: 14,
      lineHeight: 20,
    },
    stars: {flexDirection: 'row', marginTop: 6},

    // Generic overlay
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },

    // Centered modal (edit name)
    modalContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 18,
      borderRadius: 18,
      width: '100%',
      maxWidth: 420,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.surfaceBorder,
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 24,
      shadowOffset: {width: 0, height: 12},
    },
    input: {
      marginTop: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
      paddingVertical: 8,
      color: theme.colors.foreground,
      fontSize: 16,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 16,
      gap: 14,
    },

    // Full-screen outfit viewer
    fullModalContainer: {
      flex: 1,
      backgroundColor: '#000',
      justifyContent: 'flex-start',
      alignItems: 'center',
      padding: 20,
      paddingTop: 72,
    },
    fullImage: {
      width: '68%',
      aspectRatio: 1,
      borderRadius: 14,
      marginVertical: 10,
      backgroundColor: '#111',
    },

    // Bottom sheet base (for pickers)
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 8,
      paddingBottom: Platform.OS === 'ios' ? 100 : 20,
      paddingHorizontal: 16,
      maxHeight: SHEET_MAX_H,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 24,
      shadowOffset: {width: 0, height: -10},
      elevation: 22,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.inputText1 ?? 'rgba(121,121,121,0.45)',
      marginBottom: 8,
    },
    sheetHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    sheetPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
    },
    sheetPillText: {
      color: theme.colors.foreground3 ?? '#EAEAEA',
      fontWeight: '700',
    },
    sheetFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      marginTop: 10,
      marginBottom: 6,
    },

    // Toast
    toast: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      backgroundColor: theme.colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.surfaceBorder,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: {width: 0, height: 10},
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

  // keep favorited flag in sync
  useEffect(() => {
    setCombinedOutfits(prev =>
      prev.map(outfit => ({
        ...outfit,
        favorited: favorites.some(
          f =>
            f.id === outfit.id &&
            f.source === (outfit.type === 'custom' ? 'custom' : 'suggestion'),
        ),
      })),
    );
  }, [favorites]);

  return (
    <View
      style={[
        globalStyles.screen,
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text
        style={[
          globalStyles.header,
          globalStyles.section,
          {color: theme.colors.primary},
        ]}>
        Saved Outfits
      </Text>

      {/* 🔀 Sort/Filter Bar */}
      <View style={globalStyles.section}>
        <View style={globalStyles.centeredSection}>
          <Text style={[globalStyles.label, {marginBottom: 12}]}>Sort by:</Text>

          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              paddingLeft: 5,
              marginBottom: 20,
            }}>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                paddingVertical: 2,
              }}>
              {(
                [
                  {key: 'newest', label: 'Newest'},
                  {key: 'favorites', label: 'Favorites'},
                  {key: 'planned', label: 'Planned'},
                  {key: 'stars', label: 'Rating'},
                ] as const
              ).map(({key, label}) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    hSelect();
                    setSortType(key);
                  }}
                  style={[
                    globalStyles.pillFixedWidth2,
                    {
                      backgroundColor:
                        sortType === key
                          ? theme.colors.primary
                          : theme.colors.pillDark2,
                      marginRight: 7,
                    },
                  ]}>
                  <Text
                    style={[
                      globalStyles.pillTextFixedWidth2,
                      {
                        color:
                          sortType === key ? 'black' : theme.colors.foreground2,
                      },
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* CARD LIST */}
        <ScrollView
          contentContainerStyle={{paddingBottom: 100, alignItems: 'center'}}>
          <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
            {sortedOutfits.length === 0 ? (
              <Text
                style={{color: theme.colors.foreground, textAlign: 'center'}}>
                No saved outfits yet.
              </Text>
            ) : (
              sortedOutfits.map(outfit => (
                <ViewShot
                  key={outfit.id + '_shot'}
                  ref={ref => (viewRefs.current[outfit.id] = ref)}
                  options={{format: 'png', quality: 0.9}}>
                  <View style={[styles.card, globalStyles.cardStyles1]}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                      <TouchableOpacity
                        onPress={() => {
                          hSelect();
                          setEditingOutfitId(outfit.id);
                          setEditedName(outfit.name || '');
                        }}
                        style={{flex: 1, marginRight: 12}}>
                        <Text
                          style={[
                            globalStyles.titleBold,
                            {
                              fontSize: 20,
                              marginBottom: 0,
                              color: theme.colors.button1,
                            },
                          ]}>
                          {outfit.name?.trim() || 'Unnamed Outfit'}
                        </Text>

                        {(outfit.createdAt || outfit.plannedDate) && (
                          <View style={{marginTop: 6}}>
                            {outfit.plannedDate && (
                              <Text
                                style={[
                                  styles.timestamp,
                                  {
                                    fontSize: 13,
                                    fontWeight: '600',
                                    color: theme.colors.foreground2,
                                    marginBottom: 2,
                                  },
                                ]}>
                                {`Planned for ${new Date(
                                  outfit.plannedDate,
                                ).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}`}
                              </Text>
                            )}
                            {outfit.createdAt && (
                              <Text
                                style={[
                                  styles.timestamp,
                                  {
                                    fontSize: 12,
                                    color: theme.colors.foreground3,
                                    letterSpacing: 0.2,
                                  },
                                ]}>
                                {`Saved ${new Date(
                                  outfit.createdAt,
                                ).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}`}
                              </Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                        }}>
                        <TouchableOpacity
                          onPress={() => {
                            hSelect();
                            toggleFavorite(
                              outfit.id,
                              outfit.type === 'custom'
                                ? 'custom'
                                : 'suggestion',
                              setCombinedOutfits,
                            );
                          }}
                          style={{
                            padding: 8,
                            borderRadius: 14,
                            backgroundColor:
                              theme.colors.input2 ?? 'rgba(43,43,43,1)',
                          }}>
                          <MaterialIcons
                            name="favorite"
                            size={22}
                            color={
                              favorites.some(
                                f =>
                                  f.id === outfit.id &&
                                  f.source ===
                                    (outfit.type === 'custom'
                                      ? 'custom'
                                      : 'suggestion'),
                              )
                                ? 'red'
                                : theme.colors.foreground
                            }
                          />
                        </TouchableOpacity>

                        <AppleTouchFeedback
                          hapticStyle="impactLight"
                          onPress={() => {
                            setPendingDeleteId(outfit.id);
                            setShowDeleteConfirm(true);
                          }}
                          style={{
                            padding: 8,
                            borderRadius: 14,
                            marginLeft: 6,
                            backgroundColor:
                              theme.colors.input2 ?? 'rgba(43,43,43,1)',
                          }}>
                          <MaterialIcons
                            name="delete"
                            size={22}
                            color={theme.colors.foreground}
                          />
                        </AppleTouchFeedback>
                      </View>
                    </View>

                    <View style={styles.imageRow}>
                      {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
                        i?.image ? (
                          <AppleTouchFeedback
                            key={i.id}
                            hapticStyle="impactLight"
                            onPress={() => setFullScreenOutfit(outfit)}>
                            <Image
                              source={{uri: i.image}}
                              style={[
                                globalStyles.image1,
                                {marginRight: 12, borderRadius: 16},
                              ]}
                            />
                          </AppleTouchFeedback>
                        ) : null,
                      )}
                    </View>

                    {outfit.notes?.trim() && (
                      <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
                    )}

                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        marginTop: 10,
                      }}>
                      <AppleTouchFeedback
                        hapticStyle="impactLight"
                        onPress={() => {
                          setPlanningOutfitId(outfit.id);
                          const now = new Date();
                          setSelectedTempDate(now);
                          setSelectedTempTime(now);
                          setShowDatePicker(true);
                        }}
                        style={{
                          backgroundColor: theme.colors.pillDark2,
                          borderRadius: 18,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          marginRight: 10,
                        }}>
                        <Text
                          style={{
                            color: theme.colors.foreground,
                            fontWeight: '600',
                            fontSize: 13,
                          }}>
                          📅 Schedule This Outfit
                        </Text>
                      </AppleTouchFeedback>

                      {outfit.plannedDate && (
                        <AppleTouchFeedback
                          hapticStyle="impactLight"
                          onPress={() => cancelPlannedOutfit(outfit.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 18,
                            backgroundColor:
                              theme.colors.input2 ?? 'rgba(43,43,43,1)',
                          }}>
                          <MaterialIcons
                            name="close"
                            size={20}
                            color="red"
                            style={{marginRight: 6}}
                          />
                          <Text
                            style={{
                              color: theme.colors.foreground,
                              fontWeight: '600',
                              fontSize: 13,
                            }}>
                            Cancel Schedule
                          </Text>
                        </AppleTouchFeedback>
                      )}
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
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              backgroundColor:
                                theme.colors.input2 ?? 'rgba(43,43,43,1)',
                              borderRadius: 16,
                              marginRight: 6,
                              marginBottom: 6,
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
          </View>
        </ScrollView>

        {/* 📝 Edit Name Modal */}
        {editingOutfitId && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text
                style={{
                  color: theme.colors.foreground,
                  fontWeight: '700',
                  fontSize: 16,
                }}>
                Edit Outfit Name
              </Text>
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter new name"
                placeholderTextColor={theme.colors.foreground3}
                style={styles.input}
              />
              <View style={styles.modalActions}>
                <AppleTouchFeedback
                  hapticStyle="impactLight"
                  onPress={() => {
                    setEditingOutfitId(null);
                    setEditedName('');
                  }}>
                  <Text
                    style={{color: theme.colors.foreground, marginRight: 24}}>
                    Cancel
                  </Text>
                </AppleTouchFeedback>
                <AppleTouchFeedback
                  hapticStyle="impactLight"
                  onPress={handleNameSave}>
                  <Text
                    style={{color: theme.colors.primary, fontWeight: '700'}}>
                    Save
                  </Text>
                </AppleTouchFeedback>
              </View>
            </View>
          </View>
        )}

        {/* 📅 Step 1: Date Picker — Apple-style bottom sheet */}
        {showDatePicker && planningOutfitId && (
          <TouchableWithoutFeedback onPress={resetPlanFlow}>
            <View style={styles.overlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.sheetContainer]}>
                  <View style={styles.grabber} />
                  <View style={styles.sheetHeaderRow}>
                    <Text style={styles.sheetTitle}>Pick a date</Text>
                    <AppleTouchFeedback
                      hapticStyle="impactLight"
                      onPress={resetPlanFlow}
                      style={styles.sheetPill}>
                      <Text style={styles.sheetPillText}>Close</Text>
                    </AppleTouchFeedback>
                  </View>

                  <DateTimePicker
                    value={selectedTempDate || new Date()}
                    mode="date"
                    display="spinner"
                    themeVariant="dark"
                    onChange={(event, selectedDate) => {
                      if (selectedDate)
                        setSelectedTempDate(new Date(selectedDate));
                    }}
                    style={{marginVertical: -10}}
                  />

                  <View style={styles.sheetFooterRow}>
                    <AppleTouchFeedback
                      hapticStyle="impactLight"
                      onPress={resetPlanFlow}
                      style={[
                        styles.sheetPill,
                        {backgroundColor: theme.colors.input2},
                      ]}>
                      <Text style={styles.sheetPillText}>Cancel</Text>
                    </AppleTouchFeedback>

                    <AppleTouchFeedback
                      hapticStyle="impactLight"
                      onPress={() => {
                        setShowDatePicker(false);
                        setShowTimePicker(true);
                      }}
                      style={[
                        styles.sheetPill,
                        {backgroundColor: theme.colors.primary},
                      ]}>
                      <Text style={{color: '#000', fontWeight: '800'}}>
                        Next: Time
                      </Text>
                    </AppleTouchFeedback>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* ⏰ Step 2: Time Picker — Apple-style bottom sheet */}
        {showTimePicker && planningOutfitId && (
          <TouchableWithoutFeedback onPress={resetPlanFlow}>
            <View style={styles.overlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.sheetContainer]}>
                  <View style={styles.grabber} />
                  <View style={styles.sheetHeaderRow}>
                    <Text style={styles.sheetTitle}>Pick a time</Text>
                    <AppleTouchFeedback
                      hapticStyle="impactLight"
                      onPress={resetPlanFlow}
                      style={styles.sheetPill}>
                      <Text style={styles.sheetPillText}>Close</Text>
                    </AppleTouchFeedback>
                  </View>

                  <DateTimePicker
                    value={selectedTempTime || new Date()}
                    mode="time"
                    display="spinner"
                    themeVariant="dark"
                    onChange={(event, selectedTime) => {
                      if (selectedTime)
                        setSelectedTempTime(new Date(selectedTime));
                    }}
                    style={{marginVertical: -10}}
                  />

                  <View style={styles.sheetFooterRow}>
                    <AppleTouchFeedback
                      hapticStyle="impactLight"
                      onPress={resetPlanFlow}
                      style={[
                        styles.sheetPill,
                        {backgroundColor: theme.colors.input2},
                      ]}>
                      <Text style={styles.sheetPillText}>Cancel</Text>
                    </AppleTouchFeedback>

                    <AppleTouchFeedback
                      hapticStyle="impactLight"
                      onPress={commitSchedule}
                      style={[
                        styles.sheetPill,
                        {backgroundColor: theme.colors.primary},
                      ]}>
                      <Text style={{color: '#000', fontWeight: '800'}}>
                        Done
                      </Text>
                    </AppleTouchFeedback>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* 🧼 Undo Toast */}
        {lastDeletedOutfit && (
          <View style={styles.toast}>
            <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
            <AppleTouchFeedback
              hapticStyle="impactLight"
              onPress={async () => {
                const updated = [...combinedOutfits, lastDeletedOutfit];
                const manual = updated.filter(o => !o.favorited);
                const favs = updated.filter(o => o.favorited);
                await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
                await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
                setCombinedOutfits(updated);
                setLastDeletedOutfit(null);
              }}>
              <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
                Undo
              </Text>
            </AppleTouchFeedback>
          </View>
        )}

        {/* 🗑 Delete confirm */}
        {showDeleteConfirm && pendingDeleteId && (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}>
            <View
              style={{
                backgroundColor: theme.colors.surface,
                padding: 22,
                borderRadius: 18,
                width: '100%',
                maxWidth: 380,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.surfaceBorder,
                shadowColor: '#000',
                shadowOpacity: 0.28,
                shadowRadius: 24,
                shadowOffset: {width: 0, height: 12},
              }}>
              <Text
                style={{
                  fontSize: 16,
                  color: theme.colors.foreground,
                  fontWeight: '700',
                  marginBottom: 8,
                }}>
                Delete this outfit?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.foreground2,
                  marginBottom: 18,
                }}>
                This action cannot be undone.
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 14,
                }}>
                <AppleTouchFeedback
                  hapticStyle="impactLight"
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setPendingDeleteId(null);
                  }}>
                  <Text style={{color: theme.colors.foreground}}>Cancel</Text>
                </AppleTouchFeedback>
                <AppleTouchFeedback
                  hapticStyle="notificationWarning"
                  onPress={() => {
                    if (pendingDeleteId) handleDelete(pendingDeleteId);
                    setShowDeleteConfirm(false);
                    setPendingDeleteId(null);
                  }}>
                  <Text style={{color: 'red', fontWeight: '800'}}>Delete</Text>
                </AppleTouchFeedback>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 🖼 Full-Screen Outfit Modal */}
      <Modal visible={!!fullScreenOutfit} transparent animationType="fade">
        {fullScreenOutfit && (
          <View style={styles.fullModalContainer}>
            <AppleTouchFeedback
              hapticStyle="impactLight"
              style={{position: 'absolute', top: 10, left: 150}}
              onPress={() => setFullScreenOutfit(null)}>
              <MaterialIcons name="close" size={32} color="#fff" />
            </AppleTouchFeedback>

            <Text style={{color: '#fff', fontSize: 20, marginBottom: 12}}>
              {fullScreenOutfit.name || 'Unnamed Outfit'}
            </Text>

            <ScrollView
              style={{alignSelf: 'stretch'}}
              contentContainerStyle={{paddingBottom: 24, alignItems: 'center'}}>
              {[
                fullScreenOutfit.top,
                fullScreenOutfit.bottom,
                fullScreenOutfit.shoes,
              ].map(i =>
                i?.image ? (
                  <Image
                    key={i.id}
                    source={{uri: i.image}}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                ) : null,
              )}
            </ScrollView>

            {fullScreenOutfit.notes ? (
              <Text
                style={{
                  color: '#bbb',
                  fontStyle: 'italic',
                  textAlign: 'center',
                }}>
                “{fullScreenOutfit.notes}”
              </Text>
            ) : null}

            {fullScreenOutfit.tags?.length ? (
              <View
                style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 10}}>
                {fullScreenOutfit.tags.map(tag => (
                  <View
                    key={tag}
                    style={{
                      backgroundColor: '#222',
                      borderRadius: 16,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      margin: 4,
                    }}>
                    <Text style={{color: '#fff', fontSize: 12}}>#{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </Modal>
    </View>
  );
}

//////////////////////////

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
//   Modal,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import PushNotification from 'react-native-push-notification';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
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
//   plannedDate?: string;
//   type: 'custom' | 'ai';
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

//   // ⏰ Two-step Date → Time scheduling state
//   const [planningOutfitId, setPlanningOutfitId] = useState<string | null>(null);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [showTimePicker, setShowTimePicker] = useState(false);
//   const [selectedTempDate, setSelectedTempDate] = useState<Date | null>(null);
//   const [selectedTempTime, setSelectedTempTime] = useState<Date | null>(null);

//   const [lastDeletedOutfit, setLastDeletedOutfit] =
//     useState<SavedOutfit | null>(null);

//   const {
//     favorites,
//     isLoading: favoritesLoading,
//     toggleFavorite,
//   } = useFavorites(userId);

//   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//   const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

//   const viewRefs = useRef<{[key: string]: ViewShot | null}>({});
//   const [fullScreenOutfit, setFullScreenOutfit] = useState<SavedOutfit | null>(
//     null,
//   );

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   // 🔔 Local alert helpers (reuse your existing notifications stack)
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     // ✅ Convert to local time explicitly before passing to PushNotification
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);

//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local, // ✅ now interpreted as local time
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok) {
//         throw new Error('Failed to fetch outfits or schedule');
//       }

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) {
//           scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         } else if (s.custom_outfit_id) {
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//         }
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? {
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//                 mainCategory: '',
//                 subCategory: '',
//                 material: '',
//                 fit: '',
//                 color: '',
//                 size: '',
//                 notes: '',
//               }
//             : ({} as any),
//           bottom: o.bottom
//             ? {
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//                 mainCategory: '',
//                 subCategory: '',
//                 material: '',
//                 fit: '',
//                 color: '',
//                 size: '',
//                 notes: '',
//               }
//             : ({} as any),
//           shoes: o.shoes
//             ? {
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//                 mainCategory: '',
//                 subCategory: '',
//                 material: '',
//                 fit: '',
//                 color: '',
//                 size: '',
//                 notes: '',
//               }
//             : ({} as any),
//           createdAt: o.created_at
//             ? new Date(o.created_at).toISOString()
//             : new Date().toISOString(),
//           tags: o.tags || [],
//           notes: o.notes || '',
//           rating: o.rating ?? undefined,
//           favorited: favorites.some(
//             f =>
//               f.id === outfitId &&
//               f.source === (isCustom ? 'custom' : 'suggestion'),
//           ),
//           plannedDate: scheduleMap[outfitId] ?? undefined,
//           type: isCustom ? 'custom' : 'ai',
//         };
//       };

//       const allOutfits = [
//         ...aiData.map((o: any) => normalize(o, false)),
//         ...customData.map((o: any) => normalize(o, true)),
//       ];
//       setCombinedOutfits(allOutfits);
//     } catch (err) {
//       console.error('❌ Failed to load outfits:', err);
//     }
//   };

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // 🔔 cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // 🗓️ remove calendar event if we created one
//       const key = `outfitCalendar:${outfitId}`;
//       const existingId = await AsyncStorage.getItem(key);
//       if (existingId) {
//         await removeCalendarEvent(existingId);
//         await AsyncStorage.removeItem(key);
//       }
//     } catch (err) {
//       console.error('❌ Failed to cancel plan:', err);
//       Alert.alert('Error', 'Could not cancel the planned date.');
//     }
//   };

//   const handleDelete = async (id: string) => {
//     const deleted = combinedOutfits.find(o => o.id === id);
//     if (!deleted) return;
//     try {
//       const res = await fetch(`${API_BASE_URL}/outfit/${id}`, {
//         method: 'DELETE',
//       });
//       if (!res.ok) throw new Error('Failed to delete from DB');

//       const updated = combinedOutfits.filter(o => o.id !== id);
//       setCombinedOutfits(updated);
//       setLastDeletedOutfit(deleted);
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;
//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;
//     try {
//       const table = outfit.type === 'custom' ? 'custom' : 'suggestions';
//       const res = await fetch(
//         `${API_BASE_URL}/outfit/${table}/${editingOutfitId}`,
//         {
//           method: 'PUT',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({name: editedName.trim()}),
//         },
//       );
//       if (!res.ok) throw new Error('Failed to update outfit name');
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName} : o,
//       );
//       setCombinedOutfits(updated);
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // Commit schedule after both date and time picked
//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // (optional) if rescheduling the same outfit, clear old alerts/events to avoid dupes
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // Save to backend
//       await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           outfit_id: planningOutfitId,
//           outfit_type,
//           scheduled_for: combined.toISOString(),
//         }),
//       });

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // 🔔 Local iOS/Android alert (exact time)
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // 🗓️ Add to Calendar (silent)
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0, // fire at the start time
//       });
//       if (eventId) {
//         await AsyncStorage.setItem(
//           `outfitCalendar:${planningOutfitId}`,
//           eventId,
//         );
//       }
//     } catch (err) {
//       console.error('❌ Failed to schedule outfit:', err);
//     } finally {
//       resetPlanFlow();
//     }
//   };

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 28,
//       padding: 20,
//       marginBottom: 10,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.2,
//       shadowOffset: {width: 0, height: 12},
//       shadowRadius: 24,
//       elevation: 10,
//       overflow: 'hidden',
//     },
//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 8,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       // marginBottom: 12,
//       gap: 14,
//     },
//     imageThumb: {
//       width: 80,
//       height: 80,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface3,
//     },
//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },
//     stars: {flexDirection: 'row', marginTop: 6},
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
//       borderRadius: tokens.borderRadius.md,
//       width: '80%',
//     },
//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 6,
//       color: theme.colors.foreground,
//     },
//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 16,
//     },
//     fullModalContainer: {
//       flex: 1,
//       backgroundColor: '#000',
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       padding: 20,
//       paddingTop: 80,
//     },
//     fullImage: {
//       width: '65%',
//       height: undefined,
//       aspectRatio: 1,
//       borderRadius: 12,
//       marginVertical: 10,
//       backgroundColor: '#111',
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

//   // keep favorited flag in sync
//   useEffect(() => {
//     setCombinedOutfits(prev =>
//       prev.map(outfit => ({
//         ...outfit,
//         favorited: favorites.some(
//           f =>
//             f.id === outfit.id &&
//             f.source === (outfit.type === 'custom' ? 'custom' : 'suggestion'),
//         ),
//       })),
//     );
//   }, [favorites]);

//   return (
//     <View
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       {/* 🔀 Sort/Filter Bar */}
//       <View style={globalStyles.section}>
//         <View style={globalStyles.centeredSection}>
//           <Text style={[globalStyles.label, {marginBottom: 12}]}>Sort by:</Text>

//           <View
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingLeft: 5,
//               marginBottom: 20,
//             }}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 flexWrap: 'wrap',
//                 paddingVertical: 2,
//               }}>
//               {(
//                 [
//                   {key: 'newest', label: 'Newest'},
//                   {key: 'favorites', label: 'Favorites'},
//                   {key: 'planned', label: 'Planned'},
//                   {key: 'stars', label: 'Rating'},
//                 ] as const
//               ).map(({key, label}) => (
//                 <TouchableOpacity
//                   key={key}
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   style={[
//                     globalStyles.pillFixedWidth2,
//                     {
//                       backgroundColor:
//                         sortType === key
//                           ? theme.colors.primary
//                           : theme.colors.pillDark2,
//                       marginRight: 7,
//                     },
//                   ]}>
//                   <Text
//                     style={[
//                       globalStyles.pillTextFixedWidth2,
//                       {
//                         color:
//                           sortType === key ? 'black' : theme.colors.foreground2,
//                       },
//                     ]}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>
//         </View>

//         {/* CARD LIST */}
//         <ScrollView
//           contentContainerStyle={{paddingBottom: 100, alignItems: 'center'}}>
//           <View style={{width: '100%', maxWidth: 400, alignSelf: 'center'}}>
//             {sortedOutfits.length === 0 ? (
//               <Text
//                 style={{color: theme.colors.foreground, textAlign: 'center'}}>
//                 No saved outfits yet.
//               </Text>
//             ) : (
//               sortedOutfits.map(outfit => (
//                 <ViewShot
//                   key={outfit.id + '_shot'}
//                   ref={ref => (viewRefs.current[outfit.id] = ref)}
//                   options={{format: 'png', quality: 0.9}}>
//                   <View style={[styles.card, globalStyles.cardStyles1]}>
//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         alignItems: 'center',
//                         justifyContent: 'space-between',
//                       }}>
//                       <TouchableOpacity
//                         onPress={() => {
//                           hSelect();
//                           setEditingOutfitId(outfit.id);
//                           setEditedName(outfit.name || '');
//                         }}
//                         style={{flex: 1, marginRight: 12}}>
//                         <Text
//                           style={[
//                             globalStyles.titleBold,
//                             {
//                               fontSize: 20,
//                               marginBottom: 0,
//                               color: theme.colors.button1,
//                             },
//                           ]}>
//                           {outfit.name?.trim() || 'Unnamed Outfit'}
//                         </Text>
//                         {(outfit.createdAt || outfit.plannedDate) && (
//                           <View style={{marginTop: 6}}>
//                             {outfit.plannedDate && (
//                               <Text
//                                 style={[
//                                   styles.timestamp,
//                                   {
//                                     fontSize: 13,
//                                     fontWeight: '600',
//                                     color: theme.colors.foreground2,
//                                     marginBottom: 2,
//                                   },
//                                 ]}>
//                                 {`Planned for ${new Date(
//                                   outfit.plannedDate,
//                                 ).toLocaleString([], {
//                                   month: 'short',
//                                   day: 'numeric',
//                                   hour: 'numeric',
//                                   minute: '2-digit',
//                                 })}`}
//                               </Text>
//                             )}

//                             {outfit.createdAt && (
//                               <Text
//                                 style={[
//                                   styles.timestamp,
//                                   {
//                                     fontSize: 12,
//                                     color: theme.colors.foreground3,
//                                     letterSpacing: 0.2,
//                                   },
//                                 ]}>
//                                 {`Saved ${new Date(
//                                   outfit.createdAt,
//                                 ).toLocaleDateString([], {
//                                   month: 'short',
//                                   day: 'numeric',
//                                   year: 'numeric',
//                                 })}`}
//                               </Text>
//                             )}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                       <View
//                         style={{flexDirection: 'row', alignItems: 'center'}}>
//                         <TouchableOpacity
//                           onPress={() => {
//                             hSelect();
//                             toggleFavorite(
//                               outfit.id,
//                               outfit.type === 'custom'
//                                 ? 'custom'
//                                 : 'suggestion',
//                               setCombinedOutfits,
//                             );
//                           }}>
//                           <MaterialIcons
//                             name="favorite"
//                             size={24}
//                             color={
//                               favorites.some(
//                                 f =>
//                                   f.id === outfit.id &&
//                                   f.source ===
//                                     (outfit.type === 'custom'
//                                       ? 'custom'
//                                       : 'suggestion'),
//                               )
//                                 ? 'red'
//                                 : theme.colors.foreground
//                             }
//                           />
//                         </TouchableOpacity>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() => {
//                             setPendingDeleteId(outfit.id);
//                             setShowDeleteConfirm(true);
//                           }}
//                           style={{marginLeft: 10}}>
//                           <MaterialIcons
//                             name="delete"
//                             size={24}
//                             color={theme.colors.foreground}
//                           />
//                         </AppleTouchFeedback>
//                       </View>
//                     </View>

//                     <View style={styles.imageRow}>
//                       {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                         i?.image ? (
//                           <AppleTouchFeedback
//                             key={i.id}
//                             hapticStyle="impactLight"
//                             onPress={() => setFullScreenOutfit(outfit)}>
//                             <Image
//                               source={{uri: i.image}}
//                               style={[globalStyles.image1, {marginRight: 12}]}
//                             />
//                           </AppleTouchFeedback>
//                         ) : null,
//                       )}
//                     </View>
//                     {outfit.notes?.trim() && (
//                       <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
//                     )}

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         alignItems: 'center',
//                         marginTop: 10,
//                       }}>
//                       <AppleTouchFeedback
//                         hapticStyle="impactLight"
//                         onPress={() => {
//                           setPlanningOutfitId(outfit.id);
//                           const now = new Date();
//                           setSelectedTempDate(now);
//                           setSelectedTempTime(now);
//                           setShowDatePicker(true);
//                         }}
//                         style={{marginRight: 10}}>
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             fontWeight: '600',
//                             fontSize: 13,
//                           }}>
//                           📅 Schedule This Outfit
//                         </Text>
//                       </AppleTouchFeedback>

//                       {outfit.plannedDate && (
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() => cancelPlannedOutfit(outfit.id)}
//                           style={{
//                             flexDirection: 'row',
//                             alignItems: 'center',
//                             paddingRight: 12,
//                           }}>
//                           <MaterialIcons name="close" size={26} color="red" />
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontWeight: '600',
//                               fontSize: 13,
//                             }}>
//                             Cancel Schedule
//                           </Text>
//                         </AppleTouchFeedback>
//                       )}
//                     </View>

//                     {(outfit.tags || []).length > 0 && (
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           flexWrap: 'wrap',
//                           marginTop: 8,
//                         }}>
//                         {outfit.tags?.map(tag => (
//                           <View
//                             key={tag}
//                             style={{
//                               paddingHorizontal: 8,
//                               paddingVertical: 4,
//                               backgroundColor: theme.colors.surface,
//                               borderRadius: 16,
//                               marginRight: 6,
//                               marginBottom: 4,
//                             }}>
//                             <Text
//                               style={{
//                                 fontSize: 12,
//                                 color: theme.colors.foreground,
//                               }}>
//                               #{tag}
//                             </Text>
//                           </View>
//                         ))}
//                       </View>
//                     )}
//                   </View>
//                 </ViewShot>
//               ))
//             )}
//           </View>
//         </ScrollView>

//         {/* 📝 Edit Name Modal */}
//         {editingOutfitId && (
//           <View style={styles.modalContainer}>
//             <View style={styles.modalContent}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                 Edit Outfit Name
//               </Text>
//               <TextInput
//                 value={editedName}
//                 onChangeText={setEditedName}
//                 placeholder="Enter new name"
//                 placeholderTextColor="#888"
//                 style={styles.input}
//               />
//               <View style={styles.modalActions}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setEditingOutfitId(null);
//                     setEditedName('');
//                   }}
//                   style={{marginRight: 12}}>
//                   <Text style={{color: '#999'}}>Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity onPress={handleNameSave}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '600'}}>
//                     Save
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         )}

//         {/* 📅 Step 1: Date Picker */}
//         {showDatePicker && planningOutfitId && (
//           <View
//             style={{
//               position: 'absolute',
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: '#000',
//               paddingBottom: 180,
//             }}>
//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               onChange={(event, selectedDate) => {
//                 if (selectedDate) setSelectedTempDate(new Date(selectedDate));
//               }}
//             />
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 paddingHorizontal: 20,
//                 marginTop: 12,
//                 marginBottom: 50,
//               }}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={{
//                   backgroundColor: '#333',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={{
//                   backgroundColor: '#405de6',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>
//                   Next: Choose Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         )}

//         {/* ⏰ Step 2: Time Picker */}
//         {showTimePicker && planningOutfitId && (
//           <View
//             style={{
//               position: 'absolute',
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: '#000',
//               paddingBottom: 180,
//             }}>
//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               onChange={(event, selectedTime) => {
//                 if (selectedTime) setSelectedTempTime(new Date(selectedTime));
//               }}
//             />
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 paddingHorizontal: 20,
//                 marginTop: 12,
//                 marginBottom: 50,
//               }}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={{
//                   backgroundColor: '#333',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={{
//                   backgroundColor: '#405de6',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>Done</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         )}

//         {/* 🧼 Undo Toast */}
//         {lastDeletedOutfit && (
//           <View
//             style={{
//               position: 'absolute',
//               bottom: 20,
//               left: 20,
//               right: 20,
//               backgroundColor: theme.colors.surface,
//               padding: 12,
//               borderRadius: 8,
//               flexDirection: 'row',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//             }}>
//             <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={async () => {
//                 const updated = [...combinedOutfits, lastDeletedOutfit];
//                 const manual = updated.filter(o => !o.favorited);
//                 const favs = updated.filter(o => o.favorited);
//                 await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//                 await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//                 setCombinedOutfits(updated);
//                 setLastDeletedOutfit(null);
//               }}>
//               <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//                 Undo
//               </Text>
//             </AppleTouchFeedback>
//           </View>
//         )}

//         {/* 🗑 Delete confirm */}
//         {showDeleteConfirm && pendingDeleteId && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               bottom: 0,
//               left: 0,
//               right: 0,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               padding: 20,
//             }}>
//             <View
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 padding: 24,
//                 borderRadius: 12,
//                 width: '100%',
//                 maxWidth: 360,
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   color: theme.colors.foreground,
//                   fontWeight: '600',
//                   marginBottom: 12,
//                 }}>
//                 Delete this outfit?
//               </Text>
//               <Text
//                 style={{
//                   fontSize: 14,
//                   color: theme.colors.foreground2,
//                   marginBottom: 20,
//                 }}>
//                 This action cannot be undone.
//               </Text>
//               <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={() => {
//                     setShowDeleteConfirm(false);
//                     setPendingDeleteId(null);
//                   }}
//                   style={{marginRight: 16}}>
//                   <Text style={{color: theme.colors.foreground}}>Cancel</Text>
//                 </AppleTouchFeedback>
//                 <AppleTouchFeedback
//                   hapticStyle="notificationWarning"
//                   onPress={() => {
//                     if (pendingDeleteId) handleDelete(pendingDeleteId);
//                     setShowDeleteConfirm(false);
//                     setPendingDeleteId(null);
//                   }}>
//                   <Text style={{color: 'red', fontWeight: '600'}}>Delete</Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </View>
//         )}
//       </View>

//       {/* 🖼 Full-Screen Outfit Modal */}
//       <Modal visible={!!fullScreenOutfit} transparent animationType="fade">
//         {fullScreenOutfit && (
//           <View style={styles.fullModalContainer}>
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               style={{position: 'absolute', top: 10, left: 150}}
//               onPress={() => setFullScreenOutfit(null)}>
//               <MaterialIcons name="close" size={32} color="#fff" />
//             </AppleTouchFeedback>

//             <Text style={{color: '#fff', fontSize: 20, marginBottom: 12}}>
//               {fullScreenOutfit.name || 'Unnamed Outfit'}
//             </Text>

//             <ScrollView
//               style={{alignSelf: 'stretch'}}
//               contentContainerStyle={{paddingBottom: 24, alignItems: 'center'}}>
//               {[
//                 fullScreenOutfit.top,
//                 fullScreenOutfit.bottom,
//                 fullScreenOutfit.shoes,
//               ].map(i =>
//                 i?.image ? (
//                   <Image
//                     key={i.id}
//                     source={{uri: i.image}}
//                     style={styles.fullImage}
//                     resizeMode="contain"
//                   />
//                 ) : null,
//               )}
//             </ScrollView>

//             {fullScreenOutfit.notes ? (
//               <Text
//                 style={{
//                   color: '#bbb',
//                   fontStyle: 'italic',
//                   textAlign: 'center',
//                 }}>
//                 “{fullScreenOutfit.notes}”
//               </Text>
//             ) : null}

//             {fullScreenOutfit.tags?.length ? (
//               <View
//                 style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 10}}>
//                 {fullScreenOutfit.tags.map(tag => (
//                   <View
//                     key={tag}
//                     style={{
//                       backgroundColor: '#222',
//                       borderRadius: 16,
//                       paddingHorizontal: 8,
//                       paddingVertical: 4,
//                       margin: 4,
//                     }}>
//                     <Text style={{color: '#fff', fontSize: 12}}>#{tag}</Text>
//                   </View>
//                 ))}
//               </View>
//             ) : null}
//           </View>
//         )}
//       </Modal>
//     </View>
//   );
// }

//////////////////

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
//   Modal,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import PushNotification from 'react-native-push-notification';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';

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
//   type: 'custom' | 'ai';
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

//   // ⏰ Two-step Date → Time scheduling state
//   const [planningOutfitId, setPlanningOutfitId] = useState<string | null>(null);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [showTimePicker, setShowTimePicker] = useState(false);
//   const [selectedTempDate, setSelectedTempDate] = useState<Date | null>(null);
//   const [selectedTempTime, setSelectedTempTime] = useState<Date | null>(null);

//   const [lastDeletedOutfit, setLastDeletedOutfit] =
//     useState<SavedOutfit | null>(null);

//   const {
//     favorites,
//     isLoading: favoritesLoading,
//     toggleFavorite,
//   } = useFavorites(userId);

//   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//   const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

//   const viewRefs = useRef<{[key: string]: ViewShot | null}>({});
//   const [fullScreenOutfit, setFullScreenOutfit] = useState<SavedOutfit | null>(
//     null,
//   );

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   // 🔔 Local alert helpers (reuse your existing notifications stack)
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     // ✅ Convert to local time explicitly before passing to PushNotification
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);

//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local, // ✅ now interpreted as local time
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok) {
//         throw new Error('Failed to fetch outfits or schedule');
//       }

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) {
//           scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         } else if (s.custom_outfit_id) {
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//         }
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? {
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//                 mainCategory: '',
//                 subCategory: '',
//                 material: '',
//                 fit: '',
//                 color: '',
//                 size: '',
//                 notes: '',
//               }
//             : ({} as any),
//           bottom: o.bottom
//             ? {
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//                 mainCategory: '',
//                 subCategory: '',
//                 material: '',
//                 fit: '',
//                 color: '',
//                 size: '',
//                 notes: '',
//               }
//             : ({} as any),
//           shoes: o.shoes
//             ? {
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//                 mainCategory: '',
//                 subCategory: '',
//                 material: '',
//                 fit: '',
//                 color: '',
//                 size: '',
//                 notes: '',
//               }
//             : ({} as any),
//           createdAt: o.created_at
//             ? new Date(o.created_at).toISOString()
//             : new Date().toISOString(),
//           tags: o.tags || [],
//           notes: o.notes || '',
//           rating: o.rating ?? undefined,
//           favorited: favorites.some(
//             f =>
//               f.id === outfitId &&
//               f.source === (isCustom ? 'custom' : 'suggestion'),
//           ),
//           plannedDate: scheduleMap[outfitId] ?? undefined,
//           type: isCustom ? 'custom' : 'ai',
//         };
//       };

//       const allOutfits = [
//         ...aiData.map((o: any) => normalize(o, false)),
//         ...customData.map((o: any) => normalize(o, true)),
//       ];
//       setCombinedOutfits(allOutfits);
//     } catch (err) {
//       console.error('❌ Failed to load outfits:', err);
//     }
//   };

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // 🔔 cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // 🗓️ remove calendar event if we created one
//       const key = `outfitCalendar:${outfitId}`;
//       const existingId = await AsyncStorage.getItem(key);
//       if (existingId) {
//         await removeCalendarEvent(existingId);
//         await AsyncStorage.removeItem(key);
//       }
//     } catch (err) {
//       console.error('❌ Failed to cancel plan:', err);
//       Alert.alert('Error', 'Could not cancel the planned date.');
//     }
//   };

//   const handleDelete = async (id: string) => {
//     const deleted = combinedOutfits.find(o => o.id === id);
//     if (!deleted) return;
//     try {
//       const res = await fetch(`${API_BASE_URL}/outfit/${id}`, {
//         method: 'DELETE',
//       });
//       if (!res.ok) throw new Error('Failed to delete from DB');

//       const updated = combinedOutfits.filter(o => o.id !== id);
//       setCombinedOutfits(updated);
//       setLastDeletedOutfit(deleted);
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;
//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;
//     try {
//       const table = outfit.type === 'custom' ? 'custom' : 'suggestions';
//       const res = await fetch(
//         `${API_BASE_URL}/outfit/${table}/${editingOutfitId}`,
//         {
//           method: 'PUT',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({name: editedName.trim()}),
//         },
//       );
//       if (!res.ok) throw new Error('Failed to update outfit name');
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName} : o,
//       );
//       setCombinedOutfits(updated);
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // Commit schedule after both date and time picked
//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // (optional) if rescheduling the same outfit, clear old alerts/events to avoid dupes
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // Save to backend
//       await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           outfit_id: planningOutfitId,
//           outfit_type,
//           scheduled_for: combined.toISOString(),
//         }),
//       });

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // 🔔 Local iOS/Android alert (exact time)
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // 🗓️ Add to Calendar (silent)
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0, // fire at the start time
//       });
//       if (eventId) {
//         await AsyncStorage.setItem(
//           `outfitCalendar:${planningOutfitId}`,
//           eventId,
//         );
//       }
//     } catch (err) {
//       console.error('❌ Failed to schedule outfit:', err);
//     } finally {
//       resetPlanFlow();
//     }
//   };

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 28,
//       padding: 20,
//       marginBottom: 10,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.2,
//       shadowOffset: {width: 0, height: 12},
//       shadowRadius: 24,
//       elevation: 10,
//       overflow: 'hidden',
//     },
//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 8,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       // marginBottom: 12,
//       gap: 14,
//     },
//     imageThumb: {
//       width: 80,
//       height: 80,
//       borderRadius: 18,
//       backgroundColor: theme.colors.surface3,
//     },
//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },
//     stars: {flexDirection: 'row', marginTop: 6},
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
//       borderRadius: tokens.borderRadius.md,
//       width: '80%',
//     },
//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 6,
//       color: theme.colors.foreground,
//     },
//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 16,
//     },
//     fullModalContainer: {
//       flex: 1,
//       backgroundColor: '#000',
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       padding: 20,
//       paddingTop: 80,
//     },
//     fullImage: {
//       width: '65%',
//       height: undefined,
//       aspectRatio: 1,
//       borderRadius: 12,
//       marginVertical: 10,
//       backgroundColor: '#111',
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

//   // keep favorited flag in sync
//   useEffect(() => {
//     setCombinedOutfits(prev =>
//       prev.map(outfit => ({
//         ...outfit,
//         favorited: favorites.some(
//           f =>
//             f.id === outfit.id &&
//             f.source === (outfit.type === 'custom' ? 'custom' : 'suggestion'),
//         ),
//       })),
//     );
//   }, [favorites]);

//   return (
//     <View
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       {/* 🔀 Sort/Filter Bar */}
//       <View style={globalStyles.section}>
//         <View style={globalStyles.centeredSection}>
//           <Text style={[globalStyles.label, {marginBottom: 12}]}>Sort by:</Text>

//           <View
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingLeft: 5,
//               marginBottom: 20,
//             }}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 flexWrap: 'wrap',
//                 paddingVertical: 2,
//               }}>
//               {(
//                 [
//                   {key: 'newest', label: 'Newest'},
//                   {key: 'favorites', label: 'Favorites'},
//                   {key: 'planned', label: 'Planned'},
//                   {key: 'stars', label: 'Rating'},
//                 ] as const
//               ).map(({key, label}) => (
//                 <TouchableOpacity
//                   key={key}
//                   onPress={() => setSortType(key)}
//                   style={[
//                     globalStyles.pillFixedWidth2,
//                     {
//                       backgroundColor:
//                         sortType === key
//                           ? theme.colors.primary
//                           : theme.colors.pillDark2,
//                       marginRight: 7,
//                     },
//                   ]}>
//                   <Text
//                     style={[
//                       globalStyles.pillTextFixedWidth2,
//                       {
//                         color:
//                           sortType === key ? 'black' : theme.colors.foreground2,
//                       },
//                     ]}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>
//         </View>

//         {/* CARD LIST */}
//         <ScrollView
//           contentContainerStyle={{paddingBottom: 100, alignItems: 'center'}}>
//           <View style={{width: '100%', maxWidth: 400, alignSelf: 'center'}}>
//             {sortedOutfits.length === 0 ? (
//               <Text
//                 style={{color: theme.colors.foreground, textAlign: 'center'}}>
//                 No saved outfits yet.
//               </Text>
//             ) : (
//               sortedOutfits.map(outfit => (
//                 <ViewShot
//                   key={outfit.id + '_shot'}
//                   ref={ref => (viewRefs.current[outfit.id] = ref)}
//                   options={{format: 'png', quality: 0.9}}>
//                   <View style={[styles.card, globalStyles.cardStyles1]}>
//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         alignItems: 'center',
//                         justifyContent: 'space-between',
//                       }}>
//                       <TouchableOpacity
//                         onPress={() => {
//                           setEditingOutfitId(outfit.id);
//                           setEditedName(outfit.name || '');
//                         }}
//                         style={{flex: 1, marginRight: 12}}>
//                         <Text
//                           style={[
//                             globalStyles.titleBold,
//                             {
//                               fontSize: 20,
//                               marginBottom: 0,
//                               color: theme.colors.button1,
//                             },
//                           ]}>
//                           {outfit.name?.trim() || 'Unnamed Outfit'}
//                         </Text>
//                         {(outfit.createdAt || outfit.plannedDate) && (
//                           <View style={{marginTop: 6}}>
//                             {outfit.plannedDate && (
//                               <Text
//                                 style={[
//                                   styles.timestamp,
//                                   {
//                                     fontSize: 13,
//                                     fontWeight: '600',
//                                     color: theme.colors.foreground2,
//                                     marginBottom: 2,
//                                   },
//                                 ]}>
//                                 {`Planned for ${new Date(
//                                   outfit.plannedDate,
//                                 ).toLocaleString([], {
//                                   month: 'short',
//                                   day: 'numeric',
//                                   hour: 'numeric',
//                                   minute: '2-digit',
//                                 })}`}
//                               </Text>
//                             )}

//                             {outfit.createdAt && (
//                               <Text
//                                 style={[
//                                   styles.timestamp,
//                                   {
//                                     fontSize: 12,
//                                     color: theme.colors.foreground3,
//                                     letterSpacing: 0.2,
//                                   },
//                                 ]}>
//                                 {`Saved ${new Date(
//                                   outfit.createdAt,
//                                 ).toLocaleDateString([], {
//                                   month: 'short',
//                                   day: 'numeric',
//                                   year: 'numeric',
//                                 })}`}
//                               </Text>
//                             )}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                       <View
//                         style={{flexDirection: 'row', alignItems: 'center'}}>
//                         <TouchableOpacity
//                           onPress={() =>
//                             toggleFavorite(
//                               outfit.id,
//                               outfit.type === 'custom'
//                                 ? 'custom'
//                                 : 'suggestion',
//                               setCombinedOutfits,
//                             )
//                           }>
//                           <MaterialIcons
//                             name="favorite"
//                             size={24}
//                             color={
//                               favorites.some(
//                                 f =>
//                                   f.id === outfit.id &&
//                                   f.source ===
//                                     (outfit.type === 'custom'
//                                       ? 'custom'
//                                       : 'suggestion'),
//                               )
//                                 ? 'red'
//                                 : theme.colors.foreground
//                             }
//                           />
//                         </TouchableOpacity>
//                         <TouchableOpacity
//                           onPress={() => {
//                             setPendingDeleteId(outfit.id);
//                             setShowDeleteConfirm(true);
//                           }}
//                           style={{marginLeft: 10}}>
//                           <MaterialIcons
//                             name="delete"
//                             size={24}
//                             color={theme.colors.foreground}
//                           />
//                         </TouchableOpacity>
//                       </View>
//                     </View>

//                     <View style={styles.imageRow}>
//                       {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                         i?.image ? (
//                           <TouchableOpacity
//                             key={i.id}
//                             onPress={() => setFullScreenOutfit(outfit)}>
//                             <Image
//                               source={{uri: i.image}}
//                               style={[globalStyles.image1, {marginRight: 12}]}
//                             />
//                           </TouchableOpacity>
//                         ) : null,
//                       )}
//                     </View>
//                     {outfit.notes?.trim() && (
//                       <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
//                     )}

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         alignItems: 'center',
//                         marginTop: 10,
//                       }}>
//                       <TouchableOpacity
//                         onPress={() => {
//                           setPlanningOutfitId(outfit.id);
//                           const now = new Date();
//                           setSelectedTempDate(now);
//                           setSelectedTempTime(now);
//                           setShowDatePicker(true);
//                         }}
//                         style={{marginRight: 10}}>
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             fontWeight: '600',
//                             fontSize: 13,
//                           }}>
//                           📅 Schedule This Outfit
//                         </Text>
//                       </TouchableOpacity>

//                       {outfit.plannedDate && (
//                         <TouchableOpacity
//                           onPress={() => cancelPlannedOutfit(outfit.id)}
//                           style={{
//                             flexDirection: 'row',
//                             alignItems: 'center',
//                             paddingRight: 12,
//                           }}>
//                           <MaterialIcons name="close" size={26} color="red" />
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontWeight: '600',
//                               fontSize: 13,
//                             }}>
//                             Cancel Schedule
//                           </Text>
//                         </TouchableOpacity>
//                       )}
//                     </View>

//                     {(outfit.tags || []).length > 0 && (
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           flexWrap: 'wrap',
//                           marginTop: 8,
//                         }}>
//                         {outfit.tags?.map(tag => (
//                           <View
//                             key={tag}
//                             style={{
//                               paddingHorizontal: 8,
//                               paddingVertical: 4,
//                               backgroundColor: theme.colors.surface,
//                               borderRadius: 16,
//                               marginRight: 6,
//                               marginBottom: 4,
//                             }}>
//                             <Text
//                               style={{
//                                 fontSize: 12,
//                                 color: theme.colors.foreground,
//                               }}>
//                               #{tag}
//                             </Text>
//                           </View>
//                         ))}
//                       </View>
//                     )}
//                   </View>
//                 </ViewShot>
//               ))
//             )}
//           </View>
//         </ScrollView>

//         {/* 📝 Edit Name Modal */}
//         {editingOutfitId && (
//           <View style={styles.modalContainer}>
//             <View style={styles.modalContent}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                 Edit Outfit Name
//               </Text>
//               <TextInput
//                 value={editedName}
//                 onChangeText={setEditedName}
//                 placeholder="Enter new name"
//                 placeholderTextColor="#888"
//                 style={styles.input}
//               />
//               <View style={styles.modalActions}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setEditingOutfitId(null);
//                     setEditedName('');
//                   }}
//                   style={{marginRight: 12}}>
//                   <Text style={{color: '#999'}}>Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity onPress={handleNameSave}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '600'}}>
//                     Save
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         )}

//         {/* 📅 Step 1: Date Picker */}
//         {showDatePicker && planningOutfitId && (
//           <View
//             style={{
//               position: 'absolute',
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: '#000',
//               paddingBottom: 180,
//             }}>
//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               onChange={(event, selectedDate) => {
//                 if (selectedDate) setSelectedTempDate(new Date(selectedDate));
//               }}
//             />
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 paddingHorizontal: 20,
//                 marginTop: 12,
//                 marginBottom: 50,
//               }}>
//               <TouchableOpacity
//                 style={{
//                   backgroundColor: '#333',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}
//                 onPress={resetPlanFlow}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={{
//                   backgroundColor: '#405de6',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>
//                   Next: Choose Time
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}

//         {/* ⏰ Step 2: Time Picker */}
//         {showTimePicker && planningOutfitId && (
//           <View
//             style={{
//               position: 'absolute',
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: '#000',
//               paddingBottom: 180,
//             }}>
//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               onChange={(event, selectedTime) => {
//                 if (selectedTime) setSelectedTempTime(new Date(selectedTime));
//               }}
//             />
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 paddingHorizontal: 20,
//                 marginTop: 12,
//                 marginBottom: 50,
//               }}>
//               <TouchableOpacity
//                 style={{
//                   backgroundColor: '#333',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}
//                 onPress={resetPlanFlow}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={{
//                   backgroundColor: '#405de6',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}
//                 onPress={commitSchedule}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>Done</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}

//         {/* 🧼 Undo Toast */}
//         {lastDeletedOutfit && (
//           <View
//             style={{
//               position: 'absolute',
//               bottom: 20,
//               left: 20,
//               right: 20,
//               backgroundColor: theme.colors.surface,
//               padding: 12,
//               borderRadius: 8,
//               flexDirection: 'row',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//             }}>
//             <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//             <TouchableOpacity
//               onPress={async () => {
//                 const updated = [...combinedOutfits, lastDeletedOutfit];
//                 const manual = updated.filter(o => !o.favorited);
//                 const favs = updated.filter(o => o.favorited);
//                 await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//                 await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//                 setCombinedOutfits(updated);
//                 setLastDeletedOutfit(null);
//               }}>
//               <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//                 Undo
//               </Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {/* 🗑 Delete confirm */}
//         {showDeleteConfirm && pendingDeleteId && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               bottom: 0,
//               left: 0,
//               right: 0,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               padding: 20,
//             }}>
//             <View
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 padding: 24,
//                 borderRadius: 12,
//                 width: '100%',
//                 maxWidth: 360,
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   color: theme.colors.foreground,
//                   fontWeight: '600',
//                   marginBottom: 12,
//                 }}>
//                 Delete this outfit?
//               </Text>
//               <Text
//                 style={{
//                   fontSize: 14,
//                   color: theme.colors.foreground2,
//                   marginBottom: 20,
//                 }}>
//                 This action cannot be undone.
//               </Text>
//               <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setShowDeleteConfirm(false);
//                     setPendingDeleteId(null);
//                   }}
//                   style={{marginRight: 16}}>
//                   <Text style={{color: theme.colors.foreground}}>Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={() => {
//                     if (pendingDeleteId) handleDelete(pendingDeleteId);
//                     setShowDeleteConfirm(false);
//                     setPendingDeleteId(null);
//                   }}>
//                   <Text style={{color: 'red', fontWeight: '600'}}>Delete</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         )}
//       </View>

//       {/* 🖼 Full-Screen Outfit Modal */}
//       <Modal visible={!!fullScreenOutfit} transparent animationType="fade">
//         {fullScreenOutfit && (
//           <View style={styles.fullModalContainer}>
//             <TouchableOpacity
//               style={{position: 'absolute', top: 60, right: 20}}
//               onPress={() => setFullScreenOutfit(null)}>
//               <MaterialIcons name="close" size={32} color="#fff" />
//             </TouchableOpacity>

//             <Text style={{color: '#fff', fontSize: 20, marginBottom: 12}}>
//               {fullScreenOutfit.name || 'Unnamed Outfit'}
//             </Text>

//             <ScrollView
//               style={{alignSelf: 'stretch'}}
//               contentContainerStyle={{paddingBottom: 24, alignItems: 'center'}}>
//               {[
//                 fullScreenOutfit.top,
//                 fullScreenOutfit.bottom,
//                 fullScreenOutfit.shoes,
//               ].map(i =>
//                 i?.image ? (
//                   <Image
//                     key={i.id}
//                     source={{uri: i.image}}
//                     style={styles.fullImage}
//                     resizeMode="contain"
//                   />
//                 ) : null,
//               )}
//             </ScrollView>

//             {fullScreenOutfit.notes ? (
//               <Text
//                 style={{
//                   color: '#bbb',
//                   fontStyle: 'italic',
//                   textAlign: 'center',
//                 }}>
//                 “{fullScreenOutfit.notes}”
//               </Text>
//             ) : null}

//             {fullScreenOutfit.tags?.length ? (
//               <View
//                 style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 10}}>
//                 {fullScreenOutfit.tags.map(tag => (
//                   <View
//                     key={tag}
//                     style={{
//                       backgroundColor: '#222',
//                       borderRadius: 16,
//                       paddingHorizontal: 8,
//                       paddingVertical: 4,
//                       margin: 4,
//                     }}>
//                     <Text style={{color: '#fff', fontSize: 12}}>#{tag}</Text>
//                   </View>
//                 ))}
//               </View>
//             ) : null}
//           </View>
//         )}
//       </Modal>
//     </View>
//   );
// }

///////////////////

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
//   Modal,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import PushNotification from 'react-native-push-notification';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';

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
//   type: 'custom' | 'ai';
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

//   // ⏰ Two-step Date → Time scheduling state
//   const [planningOutfitId, setPlanningOutfitId] = useState<string | null>(null);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [showTimePicker, setShowTimePicker] = useState(false);
//   const [selectedTempDate, setSelectedTempDate] = useState<Date | null>(null);
//   const [selectedTempTime, setSelectedTempTime] = useState<Date | null>(null);

//   const [lastDeletedOutfit, setLastDeletedOutfit] =
//     useState<SavedOutfit | null>(null);

//   const {
//     favorites,
//     isLoading: favoritesLoading,
//     toggleFavorite,
//   } = useFavorites(userId);

//   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//   const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

//   const viewRefs = useRef<{[key: string]: ViewShot | null}>({});
//   const [fullScreenOutfit, setFullScreenOutfit] = useState<SavedOutfit | null>(
//     null,
//   );

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   // 🔔 Local alert helpers (reuse your existing notifications stack)
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     // ✅ Convert to local time explicitly before passing to PushNotification
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);

//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local, // ✅ now interpreted as local time
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok) {
//         throw new Error('Failed to fetch outfits or schedule');
//       }

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) {
//           scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         } else if (s.custom_outfit_id) {
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//         }
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? {
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//                 mainCategory: '',
//                 subCategory: '',
//                 material: '',
//                 fit: '',
//                 color: '',
//                 size: '',
//                 notes: '',
//               }
//             : ({} as any),
//           bottom: o.bottom
//             ? {
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//                 mainCategory: '',
//                 subCategory: '',
//                 material: '',
//                 fit: '',
//                 color: '',
//                 size: '',
//                 notes: '',
//               }
//             : ({} as any),
//           shoes: o.shoes
//             ? {
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//                 mainCategory: '',
//                 subCategory: '',
//                 material: '',
//                 fit: '',
//                 color: '',
//                 size: '',
//                 notes: '',
//               }
//             : ({} as any),
//           createdAt: o.created_at
//             ? new Date(o.created_at).toISOString()
//             : new Date().toISOString(),
//           tags: o.tags || [],
//           notes: o.notes || '',
//           rating: o.rating ?? undefined,
//           favorited: favorites.some(
//             f =>
//               f.id === outfitId &&
//               f.source === (isCustom ? 'custom' : 'suggestion'),
//           ),
//           plannedDate: scheduleMap[outfitId] ?? undefined,
//           type: isCustom ? 'custom' : 'ai',
//         };
//       };

//       const allOutfits = [
//         ...aiData.map((o: any) => normalize(o, false)),
//         ...customData.map((o: any) => normalize(o, true)),
//       ];
//       setCombinedOutfits(allOutfits);
//     } catch (err) {
//       console.error('❌ Failed to load outfits:', err);
//     }
//   };

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // 🔔 cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // 🗓️ remove calendar event if we created one
//       const key = `outfitCalendar:${outfitId}`;
//       const existingId = await AsyncStorage.getItem(key);
//       if (existingId) {
//         await removeCalendarEvent(existingId);
//         await AsyncStorage.removeItem(key);
//       }
//     } catch (err) {
//       console.error('❌ Failed to cancel plan:', err);
//       Alert.alert('Error', 'Could not cancel the planned date.');
//     }
//   };

//   const handleDelete = async (id: string) => {
//     const deleted = combinedOutfits.find(o => o.id === id);
//     if (!deleted) return;
//     try {
//       const res = await fetch(`${API_BASE_URL}/outfit/${id}`, {
//         method: 'DELETE',
//       });
//       if (!res.ok) throw new Error('Failed to delete from DB');

//       const updated = combinedOutfits.filter(o => o.id !== id);
//       setCombinedOutfits(updated);
//       setLastDeletedOutfit(deleted);
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;
//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;
//     try {
//       const table = outfit.type === 'custom' ? 'custom' : 'suggestions';
//       const res = await fetch(
//         `${API_BASE_URL}/outfit/${table}/${editingOutfitId}`,
//         {
//           method: 'PUT',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({name: editedName.trim()}),
//         },
//       );
//       if (!res.ok) throw new Error('Failed to update outfit name');
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName} : o,
//       );
//       setCombinedOutfits(updated);
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // Commit schedule after both date and time picked
//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // (optional) if rescheduling the same outfit, clear old alerts/events to avoid dupes
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // Save to backend
//       await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           outfit_id: planningOutfitId,
//           outfit_type,
//           scheduled_for: combined.toISOString(),
//         }),
//       });

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // 🔔 Local iOS/Android alert (exact time)
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // 🗓️ Add to Calendar (silent)
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0, // fire at the start time
//       });
//       if (eventId) {
//         await AsyncStorage.setItem(
//           `outfitCalendar:${planningOutfitId}`,
//           eventId,
//         );
//       }
//     } catch (err) {
//       console.error('❌ Failed to schedule outfit:', err);
//     } finally {
//       resetPlanFlow();
//     }
//   };

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     card: {
//       backgroundColor: 'rgba(255,255,255,0.06)',
//       borderRadius: 28,
//       padding: 20,
//       marginBottom: 20,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: 'rgba(255,255,255,0.15)',
//       shadowColor: '#000',
//       shadowOpacity: 0.2,
//       shadowOffset: {width: 0, height: 12},
//       shadowRadius: 24,
//       elevation: 10,
//       overflow: 'hidden',
//     },
//     timestamp: {
//       fontSize: 12,
//       color: 'rgba(255,255,255,0.4)',
//       marginTop: 4,
//       marginBottom: 8,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },
//     actions: {flexDirection: 'row', alignItems: 'center'},
//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       // marginBottom: 12,
//       gap: 14,
//     },
//     imageThumb: {
//       width: 80,
//       height: 80,
//       borderRadius: 18,
//       backgroundColor: '#1a1a1a',
//     },
//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: 'rgba(255,255,255,0.6)',
//       fontSize: 14,
//       lineHeight: 20,
//     },
//     stars: {flexDirection: 'row', marginTop: 6},
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
//       borderRadius: tokens.borderRadius.md,
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
//     fullModalContainer: {
//       flex: 1,
//       backgroundColor: '#000',
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       padding: 20,
//       paddingTop: 80,
//     },
//     fullImage: {
//       width: '65%',
//       height: undefined,
//       aspectRatio: 1,
//       borderRadius: 12,
//       marginVertical: 10,
//       backgroundColor: '#111',
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

//   // keep favorited flag in sync
//   useEffect(() => {
//     setCombinedOutfits(prev =>
//       prev.map(outfit => ({
//         ...outfit,
//         favorited: favorites.some(
//           f =>
//             f.id === outfit.id &&
//             f.source === (outfit.type === 'custom' ? 'custom' : 'suggestion'),
//         ),
//       })),
//     );
//   }, [favorites]);

//   return (
//     <View
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       {/* 🔀 Sort/Filter Bar */}
//       <View style={globalStyles.section}>
//         <View style={globalStyles.centeredSection}>
//           <Text style={[globalStyles.label, {marginBottom: 12}]}>Sort by:</Text>

//           <View
//             style={{
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingLeft: 5,
//               marginBottom: 20,
//             }}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 flexWrap: 'wrap',
//                 paddingVertical: 2,
//               }}>
//               {(
//                 [
//                   {key: 'newest', label: 'Newest'},
//                   {key: 'favorites', label: 'Favorites'},
//                   {key: 'planned', label: 'Planned'},
//                   {key: 'stars', label: 'Rating'},
//                 ] as const
//               ).map(({key, label}) => (
//                 <TouchableOpacity
//                   key={key}
//                   onPress={() => setSortType(key)}
//                   style={[
//                     globalStyles.pillFixedWidth2,
//                     {
//                       backgroundColor:
//                         sortType === key
//                           ? theme.colors.primary
//                           : theme.colors.surface,
//                       marginRight: 7,
//                     },
//                   ]}>
//                   <Text
//                     style={[
//                       globalStyles.pillTextFixedWidth2,
//                       {
//                         color:
//                           sortType === key ? 'black' : theme.colors.foreground2,
//                       },
//                     ]}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>
//         </View>

//         {/* CARD LIST */}
//         <ScrollView
//           contentContainerStyle={{paddingBottom: 100, alignItems: 'center'}}>
//           <View style={{width: '100%', maxWidth: 400, alignSelf: 'center'}}>
//             {sortedOutfits.length === 0 ? (
//               <Text
//                 style={{color: theme.colors.foreground, textAlign: 'center'}}>
//                 No saved outfits yet.
//               </Text>
//             ) : (
//               sortedOutfits.map(outfit => (
//                 <ViewShot
//                   key={outfit.id + '_shot'}
//                   ref={ref => (viewRefs.current[outfit.id] = ref)}
//                   options={{format: 'png', quality: 0.9}}>
//                   <View
//                     style={[
//                       styles.card,
//                       globalStyles.cardStyles2,
//                       {backgroundColor: '#1b1b1bff'},
//                     ]}>
//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         alignItems: 'center',
//                         justifyContent: 'space-between',
//                       }}>
//                       <TouchableOpacity
//                         onPress={() => {
//                           setEditingOutfitId(outfit.id);
//                           setEditedName(outfit.name || '');
//                         }}
//                         style={{flex: 1, marginRight: 12}}>
//                         <Text
//                           style={[
//                             globalStyles.titleBold,
//                             {fontSize: 20, marginBottom: 0, color: '#6600ffff'},
//                           ]}>
//                           {outfit.name?.trim() || 'Unnamed Outfit'}
//                         </Text>
//                         {(outfit.createdAt || outfit.plannedDate) && (
//                           <View style={{marginTop: 6}}>
//                             {outfit.plannedDate && (
//                               <Text
//                                 style={[
//                                   styles.timestamp,
//                                   {
//                                     fontSize: 13,
//                                     fontWeight: '600',
//                                     color: 'rgba(255,255,255,0.75)',
//                                     marginBottom: 2,
//                                   },
//                                 ]}>
//                                 {`Planned for ${new Date(
//                                   outfit.plannedDate,
//                                 ).toLocaleString([], {
//                                   month: 'short',
//                                   day: 'numeric',
//                                   hour: 'numeric',
//                                   minute: '2-digit',
//                                 })}`}
//                               </Text>
//                             )}

//                             {outfit.createdAt && (
//                               <Text
//                                 style={[
//                                   styles.timestamp,
//                                   {
//                                     fontSize: 12,
//                                     color: 'rgba(255,255,255,0.45)',
//                                     letterSpacing: 0.2,
//                                   },
//                                 ]}>
//                                 {`Saved ${new Date(
//                                   outfit.createdAt,
//                                 ).toLocaleDateString([], {
//                                   month: 'short',
//                                   day: 'numeric',
//                                   year: 'numeric',
//                                 })}`}
//                               </Text>
//                             )}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                       <View
//                         style={{flexDirection: 'row', alignItems: 'center'}}>
//                         <TouchableOpacity
//                           onPress={() =>
//                             toggleFavorite(
//                               outfit.id,
//                               outfit.type === 'custom'
//                                 ? 'custom'
//                                 : 'suggestion',
//                               setCombinedOutfits,
//                             )
//                           }>
//                           <MaterialIcons
//                             name="favorite"
//                             size={24}
//                             color={
//                               favorites.some(
//                                 f =>
//                                   f.id === outfit.id &&
//                                   f.source ===
//                                     (outfit.type === 'custom'
//                                       ? 'custom'
//                                       : 'suggestion'),
//                               )
//                                 ? 'red'
//                                 : theme.colors.foreground
//                             }
//                           />
//                         </TouchableOpacity>
//                         <TouchableOpacity
//                           onPress={() => {
//                             setPendingDeleteId(outfit.id);
//                             setShowDeleteConfirm(true);
//                           }}
//                           style={{marginLeft: 10}}>
//                           <MaterialIcons
//                             name="delete"
//                             size={24}
//                             color={theme.colors.foreground}
//                           />
//                         </TouchableOpacity>
//                       </View>
//                     </View>

//                     <View style={styles.imageRow}>
//                       {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                         i?.image ? (
//                           <TouchableOpacity
//                             key={i.id}
//                             onPress={() => setFullScreenOutfit(outfit)}>
//                             <Image
//                               source={{uri: i.image}}
//                               style={[globalStyles.image1, {marginRight: 12}]}
//                             />
//                           </TouchableOpacity>
//                         ) : null,
//                       )}
//                     </View>
//                     {outfit.notes?.trim() && (
//                       <Text style={styles.notes}>“{outfit.notes.trim()}”</Text>
//                     )}

//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         flexWrap: 'wrap',
//                         alignItems: 'center',
//                         marginTop: 10,
//                       }}>
//                       <TouchableOpacity
//                         onPress={() => {
//                           setPlanningOutfitId(outfit.id);
//                           const now = new Date();
//                           setSelectedTempDate(now);
//                           setSelectedTempTime(now);
//                           setShowDatePicker(true);
//                         }}
//                         style={{marginRight: 10}}>
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '600',
//                             fontSize: 13,
//                           }}>
//                           📅 Schedule This Outfit
//                         </Text>
//                       </TouchableOpacity>

//                       {outfit.plannedDate && (
//                         <TouchableOpacity
//                           onPress={() => cancelPlannedOutfit(outfit.id)}
//                           style={{
//                             flexDirection: 'row',
//                             alignItems: 'center',
//                             paddingRight: 12,
//                           }}>
//                           <MaterialIcons name="close" size={26} color="red" />
//                           <Text
//                             style={{
//                               color: theme.colors.primary,
//                               fontWeight: '600',
//                               fontSize: 13,
//                             }}>
//                             Cancel Schedule
//                           </Text>
//                         </TouchableOpacity>
//                       )}
//                     </View>

//                     {(outfit.tags || []).length > 0 && (
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           flexWrap: 'wrap',
//                           marginTop: 8,
//                         }}>
//                         {outfit.tags?.map(tag => (
//                           <View
//                             key={tag}
//                             style={{
//                               paddingHorizontal: 8,
//                               paddingVertical: 4,
//                               backgroundColor: theme.colors.surface,
//                               borderRadius: 16,
//                               marginRight: 6,
//                               marginBottom: 4,
//                             }}>
//                             <Text
//                               style={{
//                                 fontSize: 12,
//                                 color: theme.colors.foreground,
//                               }}>
//                               #{tag}
//                             </Text>
//                           </View>
//                         ))}
//                       </View>
//                     )}
//                   </View>
//                 </ViewShot>
//               ))
//             )}
//           </View>
//         </ScrollView>

//         {/* 📝 Edit Name Modal */}
//         {editingOutfitId && (
//           <View style={styles.modalContainer}>
//             <View style={styles.modalContent}>
//               <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                 Edit Outfit Name
//               </Text>
//               <TextInput
//                 value={editedName}
//                 onChangeText={setEditedName}
//                 placeholder="Enter new name"
//                 placeholderTextColor="#888"
//                 style={styles.input}
//               />
//               <View style={styles.modalActions}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setEditingOutfitId(null);
//                     setEditedName('');
//                   }}
//                   style={{marginRight: 12}}>
//                   <Text style={{color: '#999'}}>Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity onPress={handleNameSave}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '600'}}>
//                     Save
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         )}

//         {/* 📅 Step 1: Date Picker */}
//         {showDatePicker && planningOutfitId && (
//           <View
//             style={{
//               position: 'absolute',
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: '#000',
//               paddingBottom: 180,
//             }}>
//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               onChange={(event, selectedDate) => {
//                 if (selectedDate) setSelectedTempDate(new Date(selectedDate));
//               }}
//             />
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 paddingHorizontal: 20,
//                 marginTop: 12,
//                 marginBottom: 50,
//               }}>
//               <TouchableOpacity
//                 style={{
//                   backgroundColor: '#333',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}
//                 onPress={resetPlanFlow}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={{
//                   backgroundColor: '#405de6',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>
//                   Next: Choose Time
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}

//         {/* ⏰ Step 2: Time Picker */}
//         {showTimePicker && planningOutfitId && (
//           <View
//             style={{
//               position: 'absolute',
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: '#000',
//               paddingBottom: 180,
//             }}>
//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               onChange={(event, selectedTime) => {
//                 if (selectedTime) setSelectedTempTime(new Date(selectedTime));
//               }}
//             />
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 paddingHorizontal: 20,
//                 marginTop: 12,
//                 marginBottom: 50,
//               }}>
//               <TouchableOpacity
//                 style={{
//                   backgroundColor: '#333',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}
//                 onPress={resetPlanFlow}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={{
//                   backgroundColor: '#405de6',
//                   paddingVertical: 8,
//                   paddingHorizontal: 20,
//                   borderRadius: 20,
//                 }}
//                 onPress={commitSchedule}>
//                 <Text style={{color: 'white', fontWeight: '600'}}>Done</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}

//         {/* 🧼 Undo Toast */}
//         {lastDeletedOutfit && (
//           <View
//             style={{
//               position: 'absolute',
//               bottom: 20,
//               left: 20,
//               right: 20,
//               backgroundColor: theme.colors.surface,
//               padding: 12,
//               borderRadius: 8,
//               flexDirection: 'row',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//             }}>
//             <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//             <TouchableOpacity
//               onPress={async () => {
//                 const updated = [...combinedOutfits, lastDeletedOutfit];
//                 const manual = updated.filter(o => !o.favorited);
//                 const favs = updated.filter(o => o.favorited);
//                 await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//                 await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//                 setCombinedOutfits(updated);
//                 setLastDeletedOutfit(null);
//               }}>
//               <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//                 Undo
//               </Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {/* 🗑 Delete confirm */}
//         {showDeleteConfirm && pendingDeleteId && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               bottom: 0,
//               left: 0,
//               right: 0,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               padding: 20,
//             }}>
//             <View
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 padding: 24,
//                 borderRadius: 12,
//                 width: '100%',
//                 maxWidth: 360,
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   color: theme.colors.foreground,
//                   fontWeight: '600',
//                   marginBottom: 12,
//                 }}>
//                 Delete this outfit?
//               </Text>
//               <Text
//                 style={{
//                   fontSize: 14,
//                   color: theme.colors.foreground2,
//                   marginBottom: 20,
//                 }}>
//                 This action cannot be undone.
//               </Text>
//               <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     setShowDeleteConfirm(false);
//                     setPendingDeleteId(null);
//                   }}
//                   style={{marginRight: 16}}>
//                   <Text style={{color: theme.colors.foreground}}>Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={() => {
//                     if (pendingDeleteId) handleDelete(pendingDeleteId);
//                     setShowDeleteConfirm(false);
//                     setPendingDeleteId(null);
//                   }}>
//                   <Text style={{color: 'red', fontWeight: '600'}}>Delete</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         )}
//       </View>

//       {/* 🖼 Full-Screen Outfit Modal */}
//       <Modal visible={!!fullScreenOutfit} transparent animationType="fade">
//         {fullScreenOutfit && (
//           <View style={styles.fullModalContainer}>
//             <TouchableOpacity
//               style={{position: 'absolute', top: 60, right: 20}}
//               onPress={() => setFullScreenOutfit(null)}>
//               <MaterialIcons name="close" size={32} color="#fff" />
//             </TouchableOpacity>

//             <Text style={{color: '#fff', fontSize: 20, marginBottom: 12}}>
//               {fullScreenOutfit.name || 'Unnamed Outfit'}
//             </Text>

//             <ScrollView
//               style={{alignSelf: 'stretch'}}
//               contentContainerStyle={{paddingBottom: 24, alignItems: 'center'}}>
//               {[
//                 fullScreenOutfit.top,
//                 fullScreenOutfit.bottom,
//                 fullScreenOutfit.shoes,
//               ].map(i =>
//                 i?.image ? (
//                   <Image
//                     key={i.id}
//                     source={{uri: i.image}}
//                     style={styles.fullImage}
//                     resizeMode="contain"
//                   />
//                 ) : null,
//               )}
//             </ScrollView>

//             {fullScreenOutfit.notes ? (
//               <Text
//                 style={{
//                   color: '#bbb',
//                   fontStyle: 'italic',
//                   textAlign: 'center',
//                 }}>
//                 “{fullScreenOutfit.notes}”
//               </Text>
//             ) : null}

//             {fullScreenOutfit.tags?.length ? (
//               <View
//                 style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 10}}>
//                 {fullScreenOutfit.tags.map(tag => (
//                   <View
//                     key={tag}
//                     style={{
//                       backgroundColor: '#222',
//                       borderRadius: 16,
//                       paddingHorizontal: 8,
//                       paddingVertical: 4,
//                       margin: 4,
//                     }}>
//                     <Text style={{color: '#fff', fontSize: 12}}>#{tag}</Text>
//                   </View>
//                 ))}
//               </View>
//             ) : null}
//           </View>
//         )}
//       </Modal>
//     </View>
//   );
// }
