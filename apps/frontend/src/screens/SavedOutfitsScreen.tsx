import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  Animated,
  Easing,
  ScrollView,
  PanResponder,
  Pressable,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import {useAppTheme} from '../context/ThemeContext';
import {useFavorites} from '../hooks/useFavorites';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {WardrobeItem} from '../hooks/useOutfitSuggestion';
import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
import {TooltipBubble} from '../components/ToolTip/ToolTip1';
import SwipeableCard from '../components/SwipeableCard/SwipeableCard';
import {Share} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

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
const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.2, 560);

export default function SavedOutfitsScreen() {
  const userId = useUUID();
  if (!userId) return null;

  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // 🪩 Core Outfit Card
    card: {
      backgroundColor: 'red',
      borderRadius: 24,
      padding: 18,
      marginBottom: 6,
      borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
      borderColor: theme.colors.surfaceBorder,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 22,
      shadowOffset: {width: 0, height: 10},
      transform: [{scale: 0.98}],
      elevation: 12,
    },

    timestamp: {
      fontSize: 12,
      color: theme.colors.foreground3,
      marginTop: 4,
      marginBottom: 4,
      fontWeight: '500',
      letterSpacing: 0.2,
    },

    actions: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    imageRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginTop: 12,
      gap: 12,
    },

    notes: {
      marginTop: 12,
      fontStyle: 'italic',
      color: theme.colors.foreground3,
      fontSize: 14,
      lineHeight: 20,
    },

    stars: {
      flexDirection: 'row',
      marginTop: 6,
    },

    // 🌫️ Overlay for blur modals / pickers
    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },

    // 📦 Centered modal container
    modalContainer: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ✏️ Edit Name / Delete Confirmation Modal
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 22,
      borderRadius: 20,
      width: '100%',
      maxWidth: 400,
      borderWidth: tokens.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 28,
      shadowOffset: {width: 0, height: 14},
      elevation: 20,
      transform: [{scale: 1}],
    },

    input: {
      marginTop: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.muted,
      paddingVertical: 8,
      color: theme.colors.foreground,
      fontSize: 16,
    },

    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 20,
      gap: 20,
    },

    // 🪟 Full-screen Outfit Viewer
    fullModalContainer: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 72,
      paddingHorizontal: 124,
    },

    fullImage: {
      width: '70%',
      aspectRatio: 1,
      marginVertical: 16,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 24,
      shadowOffset: {width: 0, height: 16},
      elevation: 18,
    },

    // 📅 Bottom Sheet
    sheetContainer: {
      width: '90%',
      backgroundColor: theme.colors.surface3,
      borderRadius: 30,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 16 : 16,
      paddingHorizontal: 20,
      // maxHeight: SHEET_MAX_H,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 32,
      shadowOffset: {width: 0, height: -14},
      elevation: 26,
    },

    grabber: {
      alignSelf: 'center',
      width: 50,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.25)',
      marginBottom: 12,
    },

    sheetHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingHorizontal: 4,
    },

    sheetTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.foreground,
      letterSpacing: 0.3,
    },

    sheetPill: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 22,
      backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
    },

    sheetPillText: {
      color: theme.colors.foreground3 ?? '#EAEAEA',
      fontWeight: '700',
      letterSpacing: 0.2,
    },

    sheetFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      marginTop: 14,
      marginBottom: 10,
    },

    // 🍞 Toast
    toast: {
      position: 'absolute',
      bottom: 30,
      left: 20,
      right: 20,
      backgroundColor: theme.colors.surface,
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.surfaceBorder,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: {width: 0, height: 10},
      elevation: 20,
    },
  });

  // 🧠 State Management
  const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

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
  const displayedOutfitRef = useRef<SavedOutfit | null>(null);

  // ✨ Animated value for parallax depth
  const scrollY = useRef(new Animated.Value(0)).current;

  // Sync local scrollY with global nav scrollY for bottom nav hide/show
  useEffect(() => {
    const listenerId = scrollY.addListener(({value}) => {
      if (global.__navScrollY) {
        global.__navScrollY.setValue(value);
      }
    });
    return () => scrollY.removeListener(listenerId);
  }, [scrollY]);

  const screenH = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(screenH)).current;

  useEffect(() => {
    if (fullScreenOutfit) {
      // 🟢 Animate up from offscreen only when opening
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [fullScreenOutfit]);

  const handleClose = useCallback(() => {
    // 🧠 just trigger the modal to close
    setFullScreenOutfit(null);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 100 || g.vy > 0.3) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const hSelect = () =>
    ReactNativeHapticFeedback.trigger('selection', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

  // ⏱️ Utility: Combine date + time
  const combineDateAndTime = (date: Date, time: Date) => {
    const d = new Date(date);
    const t = new Date(time);
    d.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return d;
  };

  // const handleShareOutfit = async (outfit: SavedOutfit) => {
  //   try {
  //     hSelect(); // ✅ haptic feedback
  //     const shareMessage = outfit.name
  //       ? `Check out my outfit "${outfit.name}" 👕 via StylHelpr`
  //       : 'Check out my outfit 👕 via StylHelpr';

  //     const imageUrl =
  //       outfit.top?.image || outfit.bottom?.image || outfit.shoes?.image;

  //     await Share.share({
  //       message: shareMessage,
  //       url: imageUrl,
  //       title: 'Share Your Look',
  //     });

  //     h('selection'); // ✅ subtle tap after share
  //     Toast.show('Look shared successfully ✅', {
  //       duration: Toast.durations.SHORT,
  //       position: Toast.positions.BOTTOM,
  //     });

  //     console.log('✅ Shared successfully');
  //   } catch (error) {
  //     console.error('❌ Error sharing look:', error);
  //   }
  // };

  // const handleShareOutfit = async (outfit: SavedOutfit) => {
  //   try {
  //     hSelect();
  //     const ref = viewRefs.current[outfit.id];
  //     if (!ref) return;

  //     // 🧩 Capture outfit card as image
  //     const uri = await ref.capture();

  //     await Share.share({
  //       url: uri,
  //       message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
  //       title: 'Share Your Look',
  //     });

  //     Toast.show('Look shared successfully ✅', {
  //       duration: Toast.durations.SHORT,
  //       position: Toast.positions.BOTTOM,
  //     });
  //   } catch (err) {
  //     console.error('❌ Error sharing look:', err);
  //     Toast.show('Error sharing look ❌', {
  //       duration: Toast.durations.SHORT,
  //       position: Toast.positions.BOTTOM,
  //     });
  //   }
  // };

  const handleShareOutfit = async (outfit: SavedOutfit) => {
    try {
      // ✅ subtle tap
      ReactNativeHapticFeedback.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      const ref = viewRefs.current[outfit.id];
      if (!ref) return;

      // 🧩 Create a temp view with watermark overlay for capture
      const watermarkedRef = React.createRef<ViewShot>();
      const WatermarkedCard = (
        <ViewShot ref={watermarkedRef} options={{format: 'png', quality: 0.95}}>
          <View
            style={{
              backgroundColor: '#000',
              borderRadius: 24,
              overflow: 'hidden',
            }}>
            {/* ✅ Reuse your card snapshot */}
            <Image
              source={{uri: await ref.capture()}}
              style={{width: '100%', aspectRatio: 1, borderRadius: 24}}
              resizeMode="cover"
            />
            {/* 💧 StylHelpr watermark */}
            <View
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
              }}>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 0.3,
                }}>
                StylHelpr
              </Text>
            </View>
          </View>
        </ViewShot>
      );

      // capture new watermarked image
      const watermarkedUri = await ref.capture();

      // 📨 open native iOS share sheet
      await Share.share({
        url: watermarkedUri,
        message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
        title: 'Share Your Look',
      });

      // ✅ nice toast feedback
      Toast.show('Look shared successfully ✅', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
    } catch (err) {
      console.error('❌ Error sharing look:', err);
      Toast.show('Error sharing look ❌', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
    }
  };

  const handleNameSave = async () => {
    if (!editingOutfitId || editedName.trim() === '') return;

    const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
    if (!outfit) return;

    try {
      // ✅ dynamically hit the correct endpoint just like the old version
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

      // ✅ update state so UI reflects the change immediately
      const updated = combinedOutfits.map(o =>
        o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
      );
      setCombinedOutfits(updated);

      // ✅ reset modal state
      setEditingOutfitId(null);
      setEditedName('');
    } catch (err) {
      console.error('❌ Error updating outfit name:', err);
      Alert.alert('Error', 'Failed to update outfit name in the database.');
    }
  };

  // ✅ Restore old delete logic (single DELETE endpoint)
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
      setLastDeletedOutfit(deleted); // keep your existing Undo toast
      setTimeout(() => setLastDeletedOutfit(null), 3000);
    } catch (err) {
      console.error('❌ Error deleting outfit:', err);
      Alert.alert('Error', 'Could not delete outfit from the database.');
    }
  };

  // 📅 Local notification helpers
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

  // 👇 Custom slide-in-from-right animation
  const slideInFromRight = {
    from: {opacity: 0, translateX: 80},
    to: {opacity: 1, translateX: 0},
  };

  // 🔄 Reset all scheduling state (Close / Cancel handlers)
  // ⏮️ Restored originals

  const resetPlanFlow = () => {
    setPlanningOutfitId(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setSelectedTempDate(null);
    setSelectedTempTime(null);
  };

  const commitSchedule = async () => {
    if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
    try {
      const selectedOutfit = combinedOutfits.find(
        o => o.id === planningOutfitId,
      );
      if (!selectedOutfit) return;

      const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
      const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

      // clear any previous local alert + calendar event
      cancelOutfitLocalAlert(planningOutfitId);
      const oldKey = `outfitCalendar:${planningOutfitId}`;
      const oldEventId = await AsyncStorage.getItem(oldKey);
      if (oldEventId) {
        await removeCalendarEvent(oldEventId);
        await AsyncStorage.removeItem(oldKey);
      }

      // save to server
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

      // reflect in UI
      setCombinedOutfits(prev =>
        prev.map(o =>
          o.id === planningOutfitId
            ? {...o, plannedDate: combined.toISOString()}
            : o,
        ),
      );

      // local notification
      scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

      // add to calendar & remember event id
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

  const cancelPlannedOutfit = async (outfitId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
      });
      if (!res.ok) throw new Error('Failed to cancel planned outfit');

      // Update UI
      setCombinedOutfits(prev =>
        prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
      );

      // Cancel local alert
      cancelOutfitLocalAlert(outfitId);

      // Remove calendar event (if any)
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

  const cancelOutfitLocalAlert = (outfitId: string) => {
    PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
  };

  const normalizeImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  };

  // 🧠 Fetch outfits and merge AI + custom
  const loadOutfits = async () => {
    try {
      const [aiRes, customRes, scheduledRes] = await Promise.all([
        fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
        fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
        fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
      ]);

      if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
        throw new Error('Failed to fetch outfits');

      const [aiData, customData, scheduledData] = await Promise.all([
        aiRes.json(),
        customRes.json(),
        scheduledRes.json(),
      ]);

      const scheduleMap: Record<string, string> = {};
      for (const s of scheduledData) {
        if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
        else if (s.custom_outfit_id)
          scheduleMap[s.custom_outfit_id] = s.scheduled_for;
      }

      const normalize = (o: any, isCustom: boolean): SavedOutfit => {
        const outfitId = o.id;
        return {
          id: outfitId,
          name: o.name || '',
          top: o.top
            ? ({
                id: o.top.id,
                name: o.top.name,
                image: normalizeImageUrl(o.top.image || o.top.image_url),
              } as any)
            : ({} as any),
          bottom: o.bottom
            ? ({
                id: o.bottom.id,
                name: o.bottom.name,
                image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
              } as any)
            : ({} as any),
          shoes: o.shoes
            ? ({
                id: o.shoes.id,
                name: o.shoes.name,
                image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
              } as any)
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

  useEffect(() => {
    if (userId && !favoritesLoading) loadOutfits();
  }, [userId, favoritesLoading]);
  // ✨ Sort state and computed outfits
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

  // 🔄 Keep favorites synced
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

  // function resetPlanFlow(): void {
  //   throw new Error('Function not implemented.');
  // }

  return (
    // <GradientBackground>
    <SafeAreaView
      edges={['top']}
      style={[
        globalStyles.screen,
        globalStyles.container,
        {backgroundColor: theme.colors.background, paddingBottom: 0},
      ]}>
      {/* 🧭 Spacer to restore old navbar height */}
      <View
        style={{
          height: insets.top - 10, // ✅ matches GlobalHeader spacing
          backgroundColor: theme.colors.background,
        }}
      />
      <Text
        style={[
          globalStyles.header,
          globalStyles.section,
          {color: theme.colors.primary},
        ]}>
        Saved Outfits
      </Text>

      <Animatable.View
        animation="fadeInDown"
        delay={300}
        duration={800}
        style={[globalStyles.section]}>
        <Text
          style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
          Sort by:
        </Text>

        {/* Responsive pills in one fixed row */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'nowrap', // ✅ never wrap to next line
          }}>
          {(
            [
              {key: 'newest', label: 'Newest'},
              {key: 'favorites', label: 'Favorites'},
              {key: 'planned', label: 'Planned'},
              {key: 'stars', label: 'Rating'},
            ] as const
          ).map(({key, label}, idx) => {
            // dynamically size each pill to fit any phone width
            const screenWidth = Dimensions.get('window').width;
            const totalSpacing = 12 * 3 + 32; // margins + section padding
            const pillWidth = (screenWidth - totalSpacing) / 4;

            return (
              <Animatable.View
                key={key}
                animation={{
                  from: {opacity: 0, translateX: 40},
                  to: {opacity: 1, translateX: 0},
                }}
                delay={150 + idx * 100}
                duration={600}
                easing="ease-out-cubic">
                <TouchableOpacity
                  onPress={() => {
                    hSelect();
                    setSortType(key);
                  }}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor:
                      sortType === key
                        ? theme.colors.foreground
                        : theme.colors.surface3,
                    paddingVertical: 9,
                    borderRadius: 22,
                    width: pillWidth, // ✅ auto width fits all screens
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="clip"
                    adjustsFontSizeToFit={false}
                    style={{
                      color:
                        sortType === key
                          ? theme.colors.background
                          : theme.colors.foreground2,
                      fontSize: 14,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              </Animatable.View>
            );
          })}
        </View>
      </Animatable.View>

      {/* 🪩 Dramatic Parallax ScrollView */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true},
        )}>
        <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
          {sortedOutfits.length === 0 ? (
            <View style={{flexDirection: 'row', alignSelf: 'center'}}>
              <Text style={globalStyles.missingDataMessage1}>
                No saved outfits.
              </Text>
              <TooltipBubble
                message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
              then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
                position="top"
              />
            </View>
          ) : (
            sortedOutfits.map((outfit, index) => {
              // 🎞️ Compute parallax transform for each card
              const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
              const scale = scrollY.interpolate({
                inputRange,
                outputRange: [1, 1, 1, 0.9],
                extrapolate: 'clamp',
              });
              const translateY = scrollY.interpolate({
                inputRange,
                outputRange: [0, 0, 0, -20],
                extrapolate: 'clamp',
              });

              return (
                <SwipeableCard
                  key={outfit.id}
                  deleteThreshold={0.15}
                  onSwipeLeft={() => {
                    setPendingDeleteId(outfit.id);
                    setShowDeleteConfirm(true);
                  }}
                  deleteBackground={
                    <View
                      style={{
                        flex: 1,
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        paddingRight: 24,
                      }}>
                      <MaterialIcons
                        name="delete"
                        size={28}
                        color={theme.colors.error}
                      />
                    </View>
                  }>
                  <Animatable.View
                    key={outfit.id}
                    animation="fadeInUp"
                    delay={150 + index * 120}
                    duration={800}
                    easing="ease-out-cubic"
                    style={{
                      transform: [{scale}, {translateY}],
                      paddingHorizontal: 6,
                    }}>
                    <ViewShot
                      ref={ref => (viewRefs.current[outfit.id] = ref)}
                      options={{format: 'png', quality: 0.9}}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setFullScreenOutfit(outfit)}
                        style={[globalStyles.cardStyles1, {marginBottom: 12}]}>
                        {/* 🧵 Outfit Header Row */}
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                          <View style={{flex: 1, marginRight: 12}}>
                            <Text
                              style={[
                                globalStyles.titleBold,
                                {
                                  fontSize: 20,
                                  color: theme.colors.foreground,
                                },
                              ]}>
                              {outfit.name?.trim() || 'Unnamed Outfit'}
                            </Text>

                            {/* 🗓️ Date & Time Info */}
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
                                        color: theme.colors.muted,
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
                          </View>

                          {/* ❤️ & ✏️ Buttons */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}>
                            {/* ✏️ Edit */}
                            <Pressable
                              onPress={e => {
                                hSelect();
                                setEditingOutfitId(outfit.id);
                                setEditedName(outfit.name || '');
                              }}
                              style={{
                                padding: 8,
                                borderRadius: 14,
                                backgroundColor:
                                  theme.colors.input2 ?? 'rgba(43,43,43,1)',
                                marginRight: 6,
                              }}>
                              <MaterialIcons
                                name="edit"
                                size={20}
                                color={theme.colors.foreground}
                              />
                            </Pressable>

                            {/* ❤️ Favorite */}
                            <Pressable
                              onPress={e => {
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
                                size={20}
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
                            </Pressable>
                            {/* 📤 Share */}
                            <Pressable
                              onPress={() => handleShareOutfit(outfit)}
                              style={{
                                padding: 8,
                                borderRadius: 14,
                                backgroundColor:
                                  theme.colors.input2 ?? 'rgba(43,43,43,1)',
                                marginLeft: 6,
                              }}>
                              <MaterialIcons
                                name="ios-share"
                                size={20}
                                color={theme.colors.primary}
                              />
                            </Pressable>
                          </View>
                        </View>

                        {/* 👕 Outfit Images */}
                        <View style={styles.imageRow}>
                          {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
                            i?.image ? (
                              <Image
                                key={i.id}
                                source={{uri: i.image}}
                                style={[
                                  globalStyles.image1,
                                  {
                                    marginRight: 12,
                                    borderRadius: 12,
                                    marginBottom: 8,
                                    marginTop: -6,
                                  },
                                ]}
                              />
                            ) : null,
                          )}
                        </View>

                        {/* 📝 Notes */}
                        {outfit.notes?.trim() && (
                          <Text style={styles.notes}>
                            “{outfit.notes.trim()}”
                          </Text>
                        )}

                        {/* 📅 Schedule & Cancel Buttons – keep them working */}
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            flexWrap: 'wrap',
                            marginTop: 10,
                          }}>
                          <AppleTouchFeedback
                            hapticStyle="impactLight"
                            onPress={e => {
                              setPlanningOutfitId(outfit.id);
                              const now = new Date();
                              setSelectedTempDate(now);
                              setSelectedTempTime(now);
                              setShowDatePicker(true);
                            }}
                            style={{
                              backgroundColor: theme.colors.button1,
                              borderRadius: 18,
                              paddingVertical: 8,
                              paddingHorizontal: 14,
                              marginRight: 10,
                            }}>
                            <Text
                              style={{
                                color: theme.colors.foreground,
                                fontWeight: '600',
                                fontSize: 13,
                              }}>
                              Schedule This Outfit
                            </Text>
                          </AppleTouchFeedback>

                          {outfit.plannedDate && (
                            <AppleTouchFeedback
                              hapticStyle="impactLight"
                              onPress={e => {
                                cancelPlannedOutfit(outfit.id);
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 8.5,
                                paddingHorizontal: 14,
                                borderRadius: 18,
                                backgroundColor:
                                  theme.colors.surface3 ?? 'rgba(43,43,43,1)',
                              }}>
                              {/* <MaterialIcons
                                name="close"
                                size={19}
                                color="red"
                                style={{marginRight: 6}}
                              /> */}
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
                      </TouchableOpacity>
                    </ViewShot>
                  </Animatable.View>
                </SwipeableCard>
              );
            })
          )}
        </View>
      </Animated.ScrollView>
      {/* 📝 Edit Name Modal */}
      {editingOutfitId && (
        <BlurView
          style={styles.modalContainer}
          blurType="dark"
          blurAmount={20}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
          <Animatable.View
            animation="zoomIn"
            duration={600}
            style={styles.modalContent}>
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
                <Text style={{color: theme.colors.foreground, marginRight: 24}}>
                  Cancel
                </Text>
              </AppleTouchFeedback>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={handleNameSave}>
                <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
                  Save
                </Text>
              </AppleTouchFeedback>
            </View>
          </Animatable.View>
        </BlurView>
      )}

      {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
      {showDatePicker && planningOutfitId && (
        <BlurView
          style={[styles.overlay, {marginTop: 0}]}
          blurType="dark"
          blurAmount={20}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
          <Animatable.View
            animation="slideInUp"
            duration={650}
            easing="ease-out-cubic"
            style={[styles.sheetContainer]}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>📆 Pick a date</Text>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={resetPlanFlow}
                style={styles.sheetPill}>
                <Text style={styles.sheetPillText}>Close</Text>
              </AppleTouchFeedback>
            </View>

            <View
              style={{
                position: 'relative',
                backgroundColor: theme.colors.background,
                borderRadius: 25,
                paddingBottom: insets.bottom + 10,
                paddingTop: 6,
                alignItems: 'center',
              }}>
              <DateTimePicker
                value={selectedTempDate || new Date()}
                mode="date"
                display="spinner"
                themeVariant="dark"
                textColor={theme.colors.foreground}
                onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
                style={{marginVertical: -10}}
              />
            </View>

            <View style={styles.sheetFooterRow}>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={resetPlanFlow}
                style={[
                  styles.sheetPill,
                  {backgroundColor: theme.colors.surface},
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
                  {backgroundColor: theme.colors.background},
                ]}>
                <Text
                  style={{color: theme.colors.foreground, fontWeight: '800'}}>
                  Next: Time
                </Text>
              </AppleTouchFeedback>
            </View>
          </Animatable.View>
        </BlurView>
      )}

      {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
      {showTimePicker && planningOutfitId && (
        <BlurView
          style={styles.overlay}
          blurType="dark"
          blurAmount={20}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
          <Animatable.View
            animation="slideInUp"
            duration={650}
            easing="ease-out-cubic"
            style={[styles.sheetContainer]}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={resetPlanFlow}
                style={styles.sheetPill}>
                <Text style={styles.sheetPillText}>Close</Text>
              </AppleTouchFeedback>
            </View>

            <View
              style={{
                position: 'relative',
                backgroundColor: 'rgba(0, 0, 0, 1)',
                borderRadius: 25,
                paddingBottom: insets.bottom + 10,
                paddingTop: 12,
                alignItems: 'center',
                overflow: 'hidden',
              }}>
              <DateTimePicker
                value={selectedTempTime || new Date()}
                mode="time"
                display="spinner"
                // themeVariant="dark"
                textColor={theme.colors.foreground}
                onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
                style={{
                  width: '100%',
                  transform: [{scale: 1.05}],
                  opacity: 1.0,
                }}
              />
            </View>

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
                  {backgroundColor: theme.colors.button1},
                ]}>
                <Text
                  style={{
                    color: theme.colors.buttonText1,
                    fontWeight: '800',
                  }}>
                  Done
                </Text>
              </AppleTouchFeedback>
            </View>
          </Animatable.View>
        </BlurView>
      )}

      {/* 🧼 Undo Toast */}
      {lastDeletedOutfit && (
        <Animatable.View
          animation="bounceInUp"
          duration={800}
          easing="ease-out-back"
          style={styles.toast}>
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
        </Animatable.View>
      )}

      {/* 🗑 Delete Confirmation */}
      <Modal
        visible={showDeleteConfirm && !!pendingDeleteId}
        transparent
        animationType="fade">
        <BlurView
          style={styles.modalContainer}
          blurType="dark"
          blurAmount={20}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
          <Animatable.View
            animation="zoomIn"
            duration={500}
            style={styles.modalContent}>
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
            <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setPendingDeleteId(null);
                }}>
                <Text
                  style={{
                    color: theme.colors.foreground,
                    marginHorizontal: 16,
                  }}>
                  Cancel
                </Text>
              </AppleTouchFeedback>
              <AppleTouchFeedback
                hapticStyle="notificationWarning"
                onPress={() => {
                  if (pendingDeleteId) handleDelete(pendingDeleteId);
                  setShowDeleteConfirm(false);
                  setPendingDeleteId(null);
                }}>
                <Text style={{color: theme.colors.error, fontWeight: '800'}}>
                  Delete
                </Text>
              </AppleTouchFeedback>
            </View>
          </Animatable.View>
        </BlurView>
      </Modal>

      {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
      <Modal
        visible={!!fullScreenOutfit}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onDismiss={() => translateY.setValue(0)}
        onRequestClose={() => setFullScreenOutfit(null)}>
        <SafeAreaView
          style={{flex: 1, backgroundColor: 'transparent'}}
          edges={[]}>
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: '#000',
              transform: [{translateY}],
              width: '100%',
              height: '100%',
              marginTop: 60,
            }}>
            {/* ✨ Backdrop */}
            <View
              style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}]}
            />

            {/* ✖️ Close Button ABOVE gesture zone */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 0,
                right: 20,
                zIndex: 20,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 50,
                paddingHorizontal: 8,
                paddingVertical: 6,
              }}
              onPress={handleClose}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <Text style={{color: '#fff', fontSize: 20}}>✕</Text>
            </TouchableOpacity>

            {/* 🟥 Swipe Gesture Zone */}
            <View
              {...panResponder.panHandlers}
              style={{
                position: 'absolute',
                top: 28,
                height: 280,
                width: '100%',
                zIndex: 999,
                // backgroundColor: 'rgba(255,0,0,0.3)', // debug
              }}
              onStartShouldSetResponder={() => true}
            />

            {/* 📸 Outfit Scroll Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{flex: 1, width: '100%'}}
              contentContainerStyle={{
                paddingBottom: 180,
                alignItems: 'center',
                paddingHorizontal: 24,
              }}>
              {/* 🧥 Outfit Name */}
              <Animatable.Text
                animation="fadeInDown"
                delay={200}
                duration={700}
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: '#fff',
                  textAlign: 'center',
                  marginTop: 25,
                  marginBottom: 20,
                  letterSpacing: 0.5,
                }}>
                {fullScreenOutfit?.name || 'Unnamed Outfit'}
              </Animatable.Text>

              {/* 👕 Outfit Images */}
              {[
                fullScreenOutfit?.top,
                fullScreenOutfit?.bottom,
                fullScreenOutfit?.shoes,
              ].map(
                (i, idx) =>
                  i?.image && (
                    <Animatable.Image
                      key={i.id || idx}
                      source={{uri: i.image}}
                      animation="fadeInUp"
                      delay={300 + idx * 200}
                      duration={800}
                      style={{
                        width: '100%',
                        height: 400,
                        maxWidth: 400,
                        borderRadius: 20,
                        marginBottom: 28,
                        shadowColor: '#000',
                        shadowOpacity: 0.35,
                        shadowRadius: 24,
                        shadowOffset: {width: 0, height: 14},
                      }}
                      resizeMode="cover"
                    />
                  ),
              )}

              {/* 📝 Notes */}
              {fullScreenOutfit?.notes?.trim() && (
                <Animatable.Text
                  animation="fadeInUp"
                  delay={700}
                  duration={800}
                  style={{
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: 'rgba(255,255,255,0.9)',
                    textAlign: 'center',
                    marginTop: 10,
                    lineHeight: 22,
                  }}>
                  "{fullScreenOutfit.notes.trim()}"
                </Animatable.Text>
              )}

              {/* 🏷️ Tags */}
              {fullScreenOutfit?.tags?.length ? (
                <Animatable.View
                  animation="fadeInUp"
                  delay={900}
                  duration={800}
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    marginTop: 24,
                  }}>
                  {fullScreenOutfit.tags.map(tag => (
                    <View
                      key={tag}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        margin: 6,
                      }}>
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: '600',
                          letterSpacing: 0.2,
                        }}>
                        #{tag}
                      </Text>
                    </View>
                  ))}
                </Animatable.View>
              ) : null}
            </ScrollView>
          </Animated.View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    // </GradientBackground>
  );
}

//////////////

// import React, {useEffect, useRef, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   ScrollView,
//   PanResponder,
//   Pressable,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';
// import {Share} from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const insets = useSafeAreaInsets();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: 'red',
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 4,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 400,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.muted,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 124,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '90%',
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 16 : 16,
//       paddingHorizontal: 20,
//       // maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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
//   const displayedOutfitRef = useRef<SavedOutfit | null>(null);

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // Sync local scrollY with global nav scrollY for bottom nav hide/show
//   useEffect(() => {
//     const listenerId = scrollY.addListener(({value}) => {
//       if (global.__navScrollY) {
//         global.__navScrollY.setValue(value);
//       }
//     });
//     return () => scrollY.removeListener(listenerId);
//   }, [scrollY]);

//   const screenH = Dimensions.get('window').height;
//   const translateY = useRef(new Animated.Value(screenH)).current;

//   useEffect(() => {
//     if (fullScreenOutfit) {
//       // 🟢 Animate up from offscreen only when opening
//       Animated.timing(translateY, {
//         toValue: 0,
//         duration: 300,
//         easing: Easing.out(Easing.cubic),
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [fullScreenOutfit]);

//   const handleClose = useCallback(() => {
//     // 🧠 just trigger the modal to close
//     setFullScreenOutfit(null);
//   }, []);

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect(); // ✅ haptic feedback
//   //     const shareMessage = outfit.name
//   //       ? `Check out my outfit "${outfit.name}" 👕 via StylHelpr`
//   //       : 'Check out my outfit 👕 via StylHelpr';

//   //     const imageUrl =
//   //       outfit.top?.image || outfit.bottom?.image || outfit.shoes?.image;

//   //     await Share.share({
//   //       message: shareMessage,
//   //       url: imageUrl,
//   //       title: 'Share Your Look',
//   //     });

//   //     h('selection'); // ✅ subtle tap after share
//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });

//   //     console.log('✅ Shared successfully');
//   //   } catch (error) {
//   //     console.error('❌ Error sharing look:', error);
//   //   }
//   // };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect();
//   //     const ref = viewRefs.current[outfit.id];
//   //     if (!ref) return;

//   //     // 🧩 Capture outfit card as image
//   //     const uri = await ref.capture();

//   //     await Share.share({
//   //       url: uri,
//   //       message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//   //       title: 'Share Your Look',
//   //     });

//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   } catch (err) {
//   //     console.error('❌ Error sharing look:', err);
//   //     Toast.show('Error sharing look ❌', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   }
//   // };

//   const handleShareOutfit = async (outfit: SavedOutfit) => {
//     try {
//       // ✅ subtle tap
//       ReactNativeHapticFeedback.trigger('impactLight', {
//         enableVibrateFallback: true,
//         ignoreAndroidSystemSettings: false,
//       });

//       const ref = viewRefs.current[outfit.id];
//       if (!ref) return;

//       // 🧩 Create a temp view with watermark overlay for capture
//       const watermarkedRef = React.createRef<ViewShot>();
//       const WatermarkedCard = (
//         <ViewShot ref={watermarkedRef} options={{format: 'png', quality: 0.95}}>
//           <View
//             style={{
//               backgroundColor: '#000',
//               borderRadius: 24,
//               overflow: 'hidden',
//             }}>
//             {/* ✅ Reuse your card snapshot */}
//             <Image
//               source={{uri: await ref.capture()}}
//               style={{width: '100%', aspectRatio: 1, borderRadius: 24}}
//               resizeMode="cover"
//             />
//             {/* 💧 StylHelpr watermark */}
//             <View
//               style={{
//                 position: 'absolute',
//                 bottom: 12,
//                 right: 12,
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 12,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   fontSize: 12,
//                   fontWeight: '700',
//                   letterSpacing: 0.3,
//                 }}>
//                 StylHelpr
//               </Text>
//             </View>
//           </View>
//         </ViewShot>
//       );

//       // capture new watermarked image
//       const watermarkedUri = await ref.capture();

//       // 📨 open native iOS share sheet
//       await Share.share({
//         url: watermarkedUri,
//         message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//         title: 'Share Your Look',
//       });

//       // ✅ nice toast feedback
//       Toast.show('Look shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing look:', err);
//       Toast.show('Error sharing look ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     // <GradientBackground>
//     <SafeAreaView
//       edges={['top']}
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background, paddingBottom: 0},
//       ]}>
//       {/* 🧭 Spacer to restore old navbar height */}
//       <View
//         style={{
//           height: insets.top - 10, // ✅ matches GlobalHeader spacing
//           backgroundColor: theme.colors.background,
//         }}
//       />
//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         {/* Responsive pills in one fixed row */}
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             flexWrap: 'nowrap', // ✅ never wrap to next line
//           }}>
//           {(
//             [
//               {key: 'newest', label: 'Newest'},
//               {key: 'favorites', label: 'Favorites'},
//               {key: 'planned', label: 'Planned'},
//               {key: 'stars', label: 'Rating'},
//             ] as const
//           ).map(({key, label}, idx) => {
//             // dynamically size each pill to fit any phone width
//             const screenWidth = Dimensions.get('window').width;
//             const totalSpacing = 12 * 3 + 32; // margins + section padding
//             const pillWidth = (screenWidth - totalSpacing) / 4;

//             return (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic">
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: pillWidth, // ✅ auto width fits all screens
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                   }}>
//                   <Text
//                     numberOfLines={1}
//                     ellipsizeMode="clip"
//                     adjustsFontSizeToFit={false}
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                       textAlign: 'center',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             );
//           })}
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <SwipeableCard
//                   key={outfit.id}
//                   deleteThreshold={0.15}
//                   onSwipeLeft={() => {
//                     setPendingDeleteId(outfit.id);
//                     setShowDeleteConfirm(true);
//                   }}
//                   deleteBackground={
//                     <View
//                       style={{
//                         flex: 1,
//                         alignItems: 'flex-end',
//                         justifyContent: 'center',
//                         paddingRight: 24,
//                       }}>
//                       <MaterialIcons
//                         name="delete"
//                         size={28}
//                         color={theme.colors.error}
//                       />
//                     </View>
//                   }>
//                   <Animatable.View
//                     key={outfit.id}
//                     animation="fadeInUp"
//                     delay={150 + index * 120}
//                     duration={800}
//                     easing="ease-out-cubic"
//                     style={{
//                       transform: [{scale}, {translateY}],
//                       paddingHorizontal: 6,
//                     }}>
//                     <ViewShot
//                       ref={ref => (viewRefs.current[outfit.id] = ref)}
//                       options={{format: 'png', quality: 0.9}}>
//                       <TouchableOpacity
//                         activeOpacity={0.9}
//                         onPress={() => setFullScreenOutfit(outfit)}
//                         style={[globalStyles.cardStyles1, {marginBottom: 12}]}>
//                         {/* 🧵 Outfit Header Row */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                           }}>
//                           <View style={{flex: 1, marginRight: 12}}>
//                             <Text
//                               style={[
//                                 globalStyles.titleBold,
//                                 {
//                                   fontSize: 20,
//                                   color: theme.colors.foreground,
//                                 },
//                               ]}>
//                               {outfit.name?.trim() || 'Unnamed Outfit'}
//                             </Text>

//                             {/* 🗓️ Date & Time Info */}
//                             {(outfit.createdAt || outfit.plannedDate) && (
//                               <View style={{marginTop: 6}}>
//                                 {outfit.plannedDate && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 13,
//                                         fontWeight: '600',
//                                         color: theme.colors.foreground2,
//                                       },
//                                     ]}>
//                                     {`Planned for ${new Date(
//                                       outfit.plannedDate,
//                                     ).toLocaleString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       hour: 'numeric',
//                                       minute: '2-digit',
//                                     })}`}
//                                   </Text>
//                                 )}
//                                 {outfit.createdAt && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 12,
//                                         color: theme.colors.muted,
//                                       },
//                                     ]}>
//                                     {`Saved ${new Date(
//                                       outfit.createdAt,
//                                     ).toLocaleDateString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       year: 'numeric',
//                                     })}`}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </View>

//                           {/* ❤️ & ✏️ Buttons */}
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                             }}>
//                             {/* ✏️ Edit */}
//                             <Pressable
//                               onPress={e => {
//                                 hSelect();
//                                 setEditingOutfitId(outfit.id);
//                                 setEditedName(outfit.name || '');
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginRight: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="edit"
//                                 size={20}
//                                 color={theme.colors.foreground}
//                               />
//                             </Pressable>

//                             {/* ❤️ Favorite */}
//                             <Pressable
//                               onPress={e => {
//                                 hSelect();
//                                 toggleFavorite(
//                                   outfit.id,
//                                   outfit.type === 'custom'
//                                     ? 'custom'
//                                     : 'suggestion',
//                                   setCombinedOutfits,
//                                 );
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={20}
//                                 color={
//                                   favorites.some(
//                                     f =>
//                                       f.id === outfit.id &&
//                                       f.source ===
//                                         (outfit.type === 'custom'
//                                           ? 'custom'
//                                           : 'suggestion'),
//                                   )
//                                     ? 'red'
//                                     : theme.colors.foreground
//                                 }
//                               />
//                             </Pressable>
//                             {/* 📤 Share */}
//                             <Pressable
//                               onPress={() => handleShareOutfit(outfit)}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginLeft: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="ios-share"
//                                 size={20}
//                                 color={theme.colors.primary}
//                               />
//                             </Pressable>
//                           </View>
//                         </View>

//                         {/* 👕 Outfit Images */}
//                         <View style={styles.imageRow}>
//                           {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                             i?.image ? (
//                               <Image
//                                 key={i.id}
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {
//                                     marginRight: 12,
//                                     borderRadius: 12,
//                                     marginBottom: 8,
//                                     marginTop: -6,
//                                   },
//                                 ]}
//                               />
//                             ) : null,
//                           )}
//                         </View>

//                         {/* 📝 Notes */}
//                         {outfit.notes?.trim() && (
//                           <Text style={styles.notes}>
//                             “{outfit.notes.trim()}”
//                           </Text>
//                         )}

//                         {/* 📅 Schedule & Cancel Buttons – keep them working */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'flex-start',
//                             flexWrap: 'wrap',
//                             marginTop: 10,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={e => {
//                               setPlanningOutfitId(outfit.id);
//                               const now = new Date();
//                               setSelectedTempDate(now);
//                               setSelectedTempTime(now);
//                               setShowDatePicker(true);
//                             }}
//                             style={{
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 18,
//                               paddingVertical: 8,
//                               paddingHorizontal: 14,
//                               marginRight: 10,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               Schedule This Outfit
//                             </Text>
//                           </AppleTouchFeedback>

//                           {outfit.plannedDate && (
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 cancelPlannedOutfit(outfit.id);
//                               }}
//                               style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 paddingVertical: 8.5,
//                                 paddingHorizontal: 14,
//                                 borderRadius: 18,
//                                 backgroundColor:
//                                   theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               {/* <MaterialIcons
//                                 name="close"
//                                 size={19}
//                                 color="red"
//                                 style={{marginRight: 6}}
//                               /> */}
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                 }}>
//                                 Cancel Schedule
//                               </Text>
//                             </AppleTouchFeedback>
//                           )}
//                         </View>

//                         {/* 🏷️ Tags */}
//                         {(outfit.tags || []).length > 0 && (
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               flexWrap: 'wrap',
//                               marginTop: 8,
//                             }}>
//                             {outfit.tags?.map(tag => (
//                               <View
//                                 key={tag}
//                                 style={{
//                                   paddingHorizontal: 10,
//                                   paddingVertical: 6,
//                                   backgroundColor:
//                                     theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                   borderRadius: 16,
//                                   marginRight: 6,
//                                   marginBottom: 6,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     fontSize: 12,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   #{tag}
//                                 </Text>
//                               </View>
//                             ))}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                     </ViewShot>
//                   </Animatable.View>
//                 </SwipeableCard>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={[styles.overlay, {marginTop: 0}]}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <View
//               style={{
//                 position: 'relative',
//                 backgroundColor: theme.colors.background,
//                 borderRadius: 25,
//                 paddingBottom: insets.bottom + 10,
//                 paddingTop: 6,
//                 alignItems: 'center',
//               }}>
//               <DateTimePicker
//                 value={selectedTempDate || new Date()}
//                 mode="date"
//                 display="spinner"
//                 themeVariant="dark"
//                 textColor={theme.colors.foreground}
//                 onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//                 style={{marginVertical: -10}}
//               />
//             </View>

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <View
//               style={{
//                 position: 'relative',
//                 backgroundColor: 'rgba(0, 0, 0, 1)',
//                 borderRadius: 25,
//                 paddingBottom: insets.bottom + 10,
//                 paddingTop: 12,
//                 alignItems: 'center',
//                 overflow: 'hidden',
//               }}>
//               <DateTimePicker
//                 value={selectedTempTime || new Date()}
//                 mode="time"
//                 display="spinner"
//                 // themeVariant="dark"
//                 textColor={theme.colors.foreground}
//                 onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//                 style={{
//                   width: '100%',
//                   transform: [{scale: 1.05}],
//                   opacity: 1.0,
//                 }}
//               />
//             </View>

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{
//                     color: theme.colors.buttonText1,
//                     fontWeight: '800',
//                   }}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       <Modal
//         visible={showDeleteConfirm && !!pendingDeleteId}
//         transparent
//         animationType="fade">
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       </Modal>

//       {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
//       <Modal
//         visible={!!fullScreenOutfit}
//         transparent
//         animationType="slide"
//         presentationStyle="overFullScreen"
//         statusBarTranslucent
//         onDismiss={() => translateY.setValue(0)}
//         onRequestClose={() => setFullScreenOutfit(null)}>
//         <SafeAreaView style={{flex: 1, backgroundColor: 'transparent'}}>
//           <Animated.View
//             style={{
//               flex: 1,
//               backgroundColor: '#000',
//               transform: [{translateY}],
//               width: '100%',
//               height: '100%',
//             }}>
//             {/* ✨ Backdrop */}
//             <View
//               style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}]}
//             />

//             {/* ✖️ Close Button ABOVE gesture zone */}
//             <TouchableOpacity
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 right: 20,
//                 zIndex: 20,
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 borderRadius: 50,
//                 paddingHorizontal: 8,
//                 paddingVertical: 6,
//               }}
//               onPress={handleClose}
//               hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//               <Text style={{color: '#fff', fontSize: 20}}>✕</Text>
//             </TouchableOpacity>

//             {/* 🟥 Swipe Gesture Zone */}
//             <View
//               {...panResponder.panHandlers}
//               style={{
//                 position: 'absolute',
//                 top: 28,
//                 height: 280,
//                 width: '100%',
//                 zIndex: 999,
//                 // backgroundColor: 'rgba(255,0,0,0.3)', // debug
//               }}
//               onStartShouldSetResponder={() => true}
//             />

//             {/* 📸 Outfit Scroll Content */}
//             <ScrollView
//               showsVerticalScrollIndicator={false}
//               style={{flex: 1, width: '100%'}}
//               contentContainerStyle={{
//                 paddingBottom: 180,
//                 alignItems: 'center',
//                 paddingHorizontal: 24,
//               }}>
//               {/* 🧥 Outfit Name */}
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 duration={700}
//                 style={{
//                   fontSize: 28,
//                   fontWeight: '800',
//                   color: '#fff',
//                   textAlign: 'center',
//                   marginTop: 25,
//                   marginBottom: 20,
//                   letterSpacing: 0.5,
//                 }}>
//                 {fullScreenOutfit?.name || 'Unnamed Outfit'}
//               </Animatable.Text>

//               {/* 👕 Outfit Images */}
//               {[
//                 fullScreenOutfit?.top,
//                 fullScreenOutfit?.bottom,
//                 fullScreenOutfit?.shoes,
//               ].map(
//                 (i, idx) =>
//                   i?.image && (
//                     <Animatable.Image
//                       key={i.id || idx}
//                       source={{uri: i.image}}
//                       animation="fadeInUp"
//                       delay={300 + idx * 200}
//                       duration={800}
//                       style={{
//                         width: '100%',
//                         height: 400,
//                         maxWidth: 400,
//                         borderRadius: 20,
//                         marginBottom: 28,
//                         shadowColor: '#000',
//                         shadowOpacity: 0.35,
//                         shadowRadius: 24,
//                         shadowOffset: {width: 0, height: 14},
//                       }}
//                       resizeMode="cover"
//                     />
//                   ),
//               )}

//               {/* 📝 Notes */}
//               {fullScreenOutfit?.notes?.trim() && (
//                 <Animatable.Text
//                   animation="fadeInUp"
//                   delay={700}
//                   duration={800}
//                   style={{
//                     fontStyle: 'italic',
//                     fontSize: 16,
//                     color: 'rgba(255,255,255,0.9)',
//                     textAlign: 'center',
//                     marginTop: 10,
//                     lineHeight: 22,
//                   }}>
//                   "{fullScreenOutfit.notes.trim()}"
//                 </Animatable.Text>
//               )}

//               {/* 🏷️ Tags */}
//               {fullScreenOutfit?.tags?.length ? (
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={900}
//                   duration={800}
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'center',
//                     marginTop: 24,
//                   }}>
//                   {fullScreenOutfit.tags.map(tag => (
//                     <View
//                       key={tag}
//                       style={{
//                         backgroundColor: 'rgba(255,255,255,0.1)',
//                         borderRadius: 20,
//                         paddingHorizontal: 14,
//                         paddingVertical: 6,
//                         margin: 6,
//                       }}>
//                       <Text
//                         style={{
//                           color: '#fff',
//                           fontSize: 14,
//                           fontWeight: '600',
//                           letterSpacing: 0.2,
//                         }}>
//                         #{tag}
//                       </Text>
//                     </View>
//                   ))}
//                 </Animatable.View>
//               ) : null}
//             </ScrollView>
//           </Animated.View>
//         </SafeAreaView>
//       </Modal>
//     </SafeAreaView>
//     // </GradientBackground>
//   );
// }

////////////////

// import React, {useEffect, useRef, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   ScrollView,
//   PanResponder,
//   Pressable,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';
// import {Share} from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const insets = useSafeAreaInsets();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: 'red',
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 4,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 400,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.muted,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 124,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '90%',
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 16 : 16,
//       paddingHorizontal: 20,
//       // maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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
//   const displayedOutfitRef = useRef<SavedOutfit | null>(null);

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // 👆 put these near your other hooks at the top of the component
//   const translateY = useRef(new Animated.Value(0)).current;

//   // Update displayed outfit ref when fullScreenOutfit changes
//   useEffect(() => {
//     if (fullScreenOutfit) {
//       displayedOutfitRef.current = fullScreenOutfit;
//     }
//   }, [fullScreenOutfit]);

//   const handleClose = useCallback(() => {
//     Animated.timing(translateY, {
//       toValue: Dimensions.get('window').height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         setFullScreenOutfit(null);
//         // Reset after modal is closed
//         setTimeout(() => {
//           translateY.setValue(0);
//         }, 100);
//       }
//     });
//   }, [translateY, setFullScreenOutfit]);
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect(); // ✅ haptic feedback
//   //     const shareMessage = outfit.name
//   //       ? `Check out my outfit "${outfit.name}" 👕 via StylHelpr`
//   //       : 'Check out my outfit 👕 via StylHelpr';

//   //     const imageUrl =
//   //       outfit.top?.image || outfit.bottom?.image || outfit.shoes?.image;

//   //     await Share.share({
//   //       message: shareMessage,
//   //       url: imageUrl,
//   //       title: 'Share Your Look',
//   //     });

//   //     h('selection'); // ✅ subtle tap after share
//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });

//   //     console.log('✅ Shared successfully');
//   //   } catch (error) {
//   //     console.error('❌ Error sharing look:', error);
//   //   }
//   // };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect();
//   //     const ref = viewRefs.current[outfit.id];
//   //     if (!ref) return;

//   //     // 🧩 Capture outfit card as image
//   //     const uri = await ref.capture();

//   //     await Share.share({
//   //       url: uri,
//   //       message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//   //       title: 'Share Your Look',
//   //     });

//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   } catch (err) {
//   //     console.error('❌ Error sharing look:', err);
//   //     Toast.show('Error sharing look ❌', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   }
//   // };

//   const handleShareOutfit = async (outfit: SavedOutfit) => {
//     try {
//       // ✅ subtle tap
//       ReactNativeHapticFeedback.trigger('impactLight', {
//         enableVibrateFallback: true,
//         ignoreAndroidSystemSettings: false,
//       });

//       const ref = viewRefs.current[outfit.id];
//       if (!ref) return;

//       // 🧩 Create a temp view with watermark overlay for capture
//       const watermarkedRef = React.createRef<ViewShot>();
//       const WatermarkedCard = (
//         <ViewShot ref={watermarkedRef} options={{format: 'png', quality: 0.95}}>
//           <View
//             style={{
//               backgroundColor: '#000',
//               borderRadius: 24,
//               overflow: 'hidden',
//             }}>
//             {/* ✅ Reuse your card snapshot */}
//             <Image
//               source={{uri: await ref.capture()}}
//               style={{width: '100%', aspectRatio: 1, borderRadius: 24}}
//               resizeMode="cover"
//             />
//             {/* 💧 StylHelpr watermark */}
//             <View
//               style={{
//                 position: 'absolute',
//                 bottom: 12,
//                 right: 12,
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 12,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   fontSize: 12,
//                   fontWeight: '700',
//                   letterSpacing: 0.3,
//                 }}>
//                 StylHelpr
//               </Text>
//             </View>
//           </View>
//         </ViewShot>
//       );

//       // capture new watermarked image
//       const watermarkedUri = await ref.capture();

//       // 📨 open native iOS share sheet
//       await Share.share({
//         url: watermarkedUri,
//         message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//         title: 'Share Your Look',
//       });

//       // ✅ nice toast feedback
//       Toast.show('Look shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing look:', err);
//       Toast.show('Error sharing look ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     // <GradientBackground>
//     <SafeAreaView
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* 🧭 Spacer to restore old navbar height */}
//       <View
//         style={{
//           height: insets.top - 10, // ✅ matches GlobalHeader spacing
//           backgroundColor: theme.colors.background,
//         }}
//       />
//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         {/* Responsive pills in one fixed row */}
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             flexWrap: 'nowrap', // ✅ never wrap to next line
//           }}>
//           {(
//             [
//               {key: 'newest', label: 'Newest'},
//               {key: 'favorites', label: 'Favorites'},
//               {key: 'planned', label: 'Planned'},
//               {key: 'stars', label: 'Rating'},
//             ] as const
//           ).map(({key, label}, idx) => {
//             // dynamically size each pill to fit any phone width
//             const screenWidth = Dimensions.get('window').width;
//             const totalSpacing = 12 * 3 + 32; // margins + section padding
//             const pillWidth = (screenWidth - totalSpacing) / 4;

//             return (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic">
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: pillWidth, // ✅ auto width fits all screens
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                   }}>
//                   <Text
//                     numberOfLines={1}
//                     ellipsizeMode="clip"
//                     adjustsFontSizeToFit={false}
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                       textAlign: 'center',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             );
//           })}
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <SwipeableCard
//                   key={outfit.id}
//                   deleteThreshold={0.15}
//                   onSwipeLeft={() => {
//                     setPendingDeleteId(outfit.id);
//                     setShowDeleteConfirm(true);
//                   }}
//                   deleteBackground={
//                     <View
//                       style={{
//                         flex: 1,
//                         alignItems: 'flex-end',
//                         justifyContent: 'center',
//                         paddingRight: 24,
//                       }}>
//                       <MaterialIcons
//                         name="delete"
//                         size={28}
//                         color={theme.colors.error}
//                       />
//                     </View>
//                   }>
//                   <Animatable.View
//                     key={outfit.id}
//                     animation="fadeInUp"
//                     delay={150 + index * 120}
//                     duration={800}
//                     easing="ease-out-cubic"
//                     style={{
//                       transform: [{scale}, {translateY}],
//                       paddingHorizontal: 6,
//                     }}>
//                     <ViewShot
//                       ref={ref => (viewRefs.current[outfit.id] = ref)}
//                       options={{format: 'png', quality: 0.9}}>
//                       <TouchableOpacity
//                         activeOpacity={0.9}
//                         onPress={() => setFullScreenOutfit(outfit)}
//                         style={[globalStyles.cardStyles1, {marginBottom: 12}]}>
//                         {/* 🧵 Outfit Header Row */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                           }}>
//                           <View style={{flex: 1, marginRight: 12}}>
//                             <Text
//                               style={[
//                                 globalStyles.titleBold,
//                                 {
//                                   fontSize: 20,
//                                   color: theme.colors.foreground,
//                                 },
//                               ]}>
//                               {outfit.name?.trim() || 'Unnamed Outfit'}
//                             </Text>

//                             {/* 🗓️ Date & Time Info */}
//                             {(outfit.createdAt || outfit.plannedDate) && (
//                               <View style={{marginTop: 6}}>
//                                 {outfit.plannedDate && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 13,
//                                         fontWeight: '600',
//                                         color: theme.colors.foreground2,
//                                       },
//                                     ]}>
//                                     {`Planned for ${new Date(
//                                       outfit.plannedDate,
//                                     ).toLocaleString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       hour: 'numeric',
//                                       minute: '2-digit',
//                                     })}`}
//                                   </Text>
//                                 )}
//                                 {outfit.createdAt && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 12,
//                                         color: theme.colors.muted,
//                                       },
//                                     ]}>
//                                     {`Saved ${new Date(
//                                       outfit.createdAt,
//                                     ).toLocaleDateString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       year: 'numeric',
//                                     })}`}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </View>

//                           {/* ❤️ & ✏️ Buttons */}
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                             }}>
//                             {/* ✏️ Edit */}
//                             <Pressable
//                               onPress={e => {
//                                 hSelect();
//                                 setEditingOutfitId(outfit.id);
//                                 setEditedName(outfit.name || '');
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginRight: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="edit"
//                                 size={20}
//                                 color={theme.colors.foreground}
//                               />
//                             </Pressable>

//                             {/* ❤️ Favorite */}
//                             <Pressable
//                               onPress={e => {
//                                 hSelect();
//                                 toggleFavorite(
//                                   outfit.id,
//                                   outfit.type === 'custom'
//                                     ? 'custom'
//                                     : 'suggestion',
//                                   setCombinedOutfits,
//                                 );
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={20}
//                                 color={
//                                   favorites.some(
//                                     f =>
//                                       f.id === outfit.id &&
//                                       f.source ===
//                                         (outfit.type === 'custom'
//                                           ? 'custom'
//                                           : 'suggestion'),
//                                   )
//                                     ? 'red'
//                                     : theme.colors.foreground
//                                 }
//                               />
//                             </Pressable>
//                             {/* 📤 Share */}
//                             <Pressable
//                               onPress={() => handleShareOutfit(outfit)}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginLeft: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="ios-share"
//                                 size={20}
//                                 color={theme.colors.primary}
//                               />
//                             </Pressable>
//                           </View>
//                         </View>

//                         {/* 👕 Outfit Images */}
//                         <View style={styles.imageRow}>
//                           {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                             i?.image ? (
//                               <Image
//                                 key={i.id}
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {
//                                     marginRight: 12,
//                                     borderRadius: 12,
//                                     marginBottom: 8,
//                                     marginTop: -6,
//                                   },
//                                 ]}
//                               />
//                             ) : null,
//                           )}
//                         </View>

//                         {/* 📝 Notes */}
//                         {outfit.notes?.trim() && (
//                           <Text style={styles.notes}>
//                             “{outfit.notes.trim()}”
//                           </Text>
//                         )}

//                         {/* 📅 Schedule & Cancel Buttons – keep them working */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'flex-start',
//                             flexWrap: 'wrap',
//                             marginTop: 10,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={e => {
//                               setPlanningOutfitId(outfit.id);
//                               const now = new Date();
//                               setSelectedTempDate(now);
//                               setSelectedTempTime(now);
//                               setShowDatePicker(true);
//                             }}
//                             style={{
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 18,
//                               paddingVertical: 8,
//                               paddingHorizontal: 14,
//                               marginRight: 10,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               Schedule This Outfit
//                             </Text>
//                           </AppleTouchFeedback>

//                           {outfit.plannedDate && (
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 cancelPlannedOutfit(outfit.id);
//                               }}
//                               style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 paddingVertical: 8.5,
//                                 paddingHorizontal: 14,
//                                 borderRadius: 18,
//                                 backgroundColor:
//                                   theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               {/* <MaterialIcons
//                                 name="close"
//                                 size={19}
//                                 color="red"
//                                 style={{marginRight: 6}}
//                               /> */}
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                 }}>
//                                 Cancel Schedule
//                               </Text>
//                             </AppleTouchFeedback>
//                           )}
//                         </View>

//                         {/* 🏷️ Tags */}
//                         {(outfit.tags || []).length > 0 && (
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               flexWrap: 'wrap',
//                               marginTop: 8,
//                             }}>
//                             {outfit.tags?.map(tag => (
//                               <View
//                                 key={tag}
//                                 style={{
//                                   paddingHorizontal: 10,
//                                   paddingVertical: 6,
//                                   backgroundColor:
//                                     theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                   borderRadius: 16,
//                                   marginRight: 6,
//                                   marginBottom: 6,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     fontSize: 12,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   #{tag}
//                                 </Text>
//                               </View>
//                             ))}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                     </ViewShot>
//                   </Animatable.View>
//                 </SwipeableCard>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={[styles.overlay, {marginTop: 0}]}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <View
//               style={{
//                 position: 'relative',
//                 backgroundColor: theme.colors.background,
//                 borderRadius: 25,
//                 paddingBottom: insets.bottom + 10,
//                 paddingTop: 6,
//                 alignItems: 'center',
//               }}>
//               <DateTimePicker
//                 value={selectedTempDate || new Date()}
//                 mode="date"
//                 display="spinner"
//                 themeVariant="dark"
//                 textColor={theme.colors.foreground}
//                 onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//                 style={{marginVertical: -10}}
//               />
//             </View>

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <View
//               style={{
//                 position: 'relative',
//                 backgroundColor: 'rgba(0, 0, 0, 1)',
//                 borderRadius: 25,
//                 paddingBottom: insets.bottom + 10,
//                 paddingTop: 12,
//                 alignItems: 'center',
//                 overflow: 'hidden',
//               }}>
//               <DateTimePicker
//                 value={selectedTempTime || new Date()}
//                 mode="time"
//                 display="spinner"
//                 // themeVariant="dark"
//                 textColor={theme.colors.foreground}
//                 onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//                 style={{
//                   width: '100%',
//                   transform: [{scale: 1.05}],
//                   opacity: 1.0,
//                 }}
//               />
//             </View>

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{
//                     color: theme.colors.buttonText1,
//                     fontWeight: '800',
//                   }}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       <Modal
//         visible={showDeleteConfirm && !!pendingDeleteId}
//         transparent
//         animationType="fade">
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       </Modal>

//       {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
//       <Modal
//         visible={!!fullScreenOutfit}
//         transparent
//         animationType="none"
//         onRequestClose={() => setFullScreenOutfit(null)}>
//         <SafeAreaView style={{flex: 1, backgroundColor: 'transparent'}}>
//           <Animated.View
//             style={{
//               flex: 1,
//               backgroundColor: '#000',
//               transform: [{translateY}],
//               width: '100%',
//               height: '100%',
//             }}>
//             {/* ✨ Backdrop */}
//             <View
//               style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}]}
//             />

//             {/* ✖️ Close Button ABOVE gesture zone */}
//             <TouchableOpacity
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 right: 20,
//                 zIndex: 20,
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 borderRadius: 50,
//                 paddingHorizontal: 8,
//                 paddingVertical: 6,
//               }}
//               onPress={handleClose}
//               hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//               <Text style={{color: '#fff', fontSize: 20}}>✕</Text>
//             </TouchableOpacity>

//             {/* 🟥 Swipe Gesture Zone */}
//             <View
//               {...panResponder.panHandlers}
//               style={{
//                 position: 'absolute',
//                 top: 28,
//                 height: 280,
//                 width: '100%',
//                 zIndex: 999,
//                 // backgroundColor: 'rgba(255,0,0,0.3)', // debug
//               }}
//               onStartShouldSetResponder={() => true}
//             />

//             {/* 📸 Outfit Scroll Content */}
//             <ScrollView
//               showsVerticalScrollIndicator={false}
//               style={{flex: 1, width: '100%'}}
//               contentContainerStyle={{
//                 paddingBottom: 180,
//                 alignItems: 'center',
//                 paddingHorizontal: 24,
//               }}>
//               {/* 🧥 Outfit Name */}
//               <Animatable.Text
//                 animation="fadeInDown"
//                 delay={200}
//                 duration={700}
//                 style={{
//                   fontSize: 28,
//                   fontWeight: '800',
//                   color: '#fff',
//                   textAlign: 'center',
//                   marginTop: 25,
//                   marginBottom: 20,
//                   letterSpacing: 0.5,
//                 }}>
//                 {fullScreenOutfit?.name || 'Unnamed Outfit'}
//               </Animatable.Text>

//               {/* 👕 Outfit Images */}
//               {[
//                 fullScreenOutfit?.top,
//                 fullScreenOutfit?.bottom,
//                 fullScreenOutfit?.shoes,
//               ].map(
//                 (i, idx) =>
//                   i?.image && (
//                     <Animatable.Image
//                       key={i.id || idx}
//                       source={{uri: i.image}}
//                       animation="fadeInUp"
//                       delay={300 + idx * 200}
//                       duration={800}
//                       style={{
//                         width: '100%',
//                         height: 400,
//                         maxWidth: 400,
//                         borderRadius: 20,
//                         marginBottom: 28,
//                         shadowColor: '#000',
//                         shadowOpacity: 0.35,
//                         shadowRadius: 24,
//                         shadowOffset: {width: 0, height: 14},
//                       }}
//                       resizeMode="cover"
//                     />
//                   ),
//               )}

//               {/* 📝 Notes */}
//               {fullScreenOutfit?.notes?.trim() && (
//                 <Animatable.Text
//                   animation="fadeInUp"
//                   delay={700}
//                   duration={800}
//                   style={{
//                     fontStyle: 'italic',
//                     fontSize: 16,
//                     color: 'rgba(255,255,255,0.9)',
//                     textAlign: 'center',
//                     marginTop: 10,
//                     lineHeight: 22,
//                   }}>
//                   "{fullScreenOutfit.notes.trim()}"
//                 </Animatable.Text>
//               )}

//               {/* 🏷️ Tags */}
//               {fullScreenOutfit?.tags?.length ? (
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={900}
//                   duration={800}
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'center',
//                     marginTop: 24,
//                   }}>
//                   {fullScreenOutfit.tags.map(tag => (
//                     <View
//                       key={tag}
//                       style={{
//                         backgroundColor: 'rgba(255,255,255,0.1)',
//                         borderRadius: 20,
//                         paddingHorizontal: 14,
//                         paddingVertical: 6,
//                         margin: 6,
//                       }}>
//                       <Text
//                         style={{
//                           color: '#fff',
//                           fontSize: 14,
//                           fontWeight: '600',
//                           letterSpacing: 0.2,
//                         }}>
//                         #{tag}
//                       </Text>
//                     </View>
//                   ))}
//                 </Animatable.View>
//               ) : null}
//             </ScrollView>

//             {/* 🪩 Frosted Bottom Panel */}
//             <Animatable.View
//               animation="fadeInUp"
//               delay={400}
//               duration={700}
//               style={{
//                 position: 'absolute',
//                 bottom: 0,
//                 width: '100%',
//                 // paddingVertical: 28,
//                 // paddingHorizontal: 24,
//                 // borderTopLeftRadius: 26,
//                 // borderTopRightRadius: 26,
//                 // backgroundColor:
//                 //   Platform.OS === 'android'
//                 //     ? 'rgba(20,20,20,0.9)'
//                 //     : 'transparent',
//                 // shadowColor: '#000',
//                 // shadowOpacity: 0.4,
//                 // shadowRadius: 30,
//                 // shadowOffset: {width: 0, height: -10},
//               }}>
//               {Platform.OS === 'ios' && (
//                 <BlurView
//                   style={StyleSheet.absoluteFill}
//                   blurType="systemMaterialDark"
//                   blurAmount={30}
//                 />
//               )}
//             </Animatable.View>
//           </Animated.View>
//         </SafeAreaView>
//       </Modal>
//     </SafeAreaView>
//     // </GradientBackground>
//   );
// }

//////////////////

// import React, {useEffect, useRef, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   ScrollView,
//   PanResponder,
//   Pressable,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';
// import {Share} from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const insets = useSafeAreaInsets();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: 'red',
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 4,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 400,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.muted,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 124,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '90%',
//       backgroundColor: theme.colors.surface3,
//       borderRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 16 : 16,
//       paddingHorizontal: 20,
//       // maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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
//   const displayedOutfitRef = useRef<SavedOutfit | null>(null);

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // 👆 put these near your other hooks at the top of the component
//   const translateY = useRef(new Animated.Value(0)).current;

//   // Update displayed outfit ref when fullScreenOutfit changes
//   useEffect(() => {
//     if (fullScreenOutfit) {
//       displayedOutfitRef.current = fullScreenOutfit;
//     }
//   }, [fullScreenOutfit]);

//   const handleClose = useCallback(() => {
//     Animated.timing(translateY, {
//       toValue: Dimensions.get('window').height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         setFullScreenOutfit(null);
//         // Reset after modal is closed
//         setTimeout(() => {
//           translateY.setValue(0);
//         }, 100);
//       }
//     });
//   }, [translateY, setFullScreenOutfit]);
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect(); // ✅ haptic feedback
//   //     const shareMessage = outfit.name
//   //       ? `Check out my outfit "${outfit.name}" 👕 via StylHelpr`
//   //       : 'Check out my outfit 👕 via StylHelpr';

//   //     const imageUrl =
//   //       outfit.top?.image || outfit.bottom?.image || outfit.shoes?.image;

//   //     await Share.share({
//   //       message: shareMessage,
//   //       url: imageUrl,
//   //       title: 'Share Your Look',
//   //     });

//   //     h('selection'); // ✅ subtle tap after share
//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });

//   //     console.log('✅ Shared successfully');
//   //   } catch (error) {
//   //     console.error('❌ Error sharing look:', error);
//   //   }
//   // };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect();
//   //     const ref = viewRefs.current[outfit.id];
//   //     if (!ref) return;

//   //     // 🧩 Capture outfit card as image
//   //     const uri = await ref.capture();

//   //     await Share.share({
//   //       url: uri,
//   //       message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//   //       title: 'Share Your Look',
//   //     });

//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   } catch (err) {
//   //     console.error('❌ Error sharing look:', err);
//   //     Toast.show('Error sharing look ❌', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   }
//   // };

//   const handleShareOutfit = async (outfit: SavedOutfit) => {
//     try {
//       // ✅ subtle tap
//       ReactNativeHapticFeedback.trigger('impactLight', {
//         enableVibrateFallback: true,
//         ignoreAndroidSystemSettings: false,
//       });

//       const ref = viewRefs.current[outfit.id];
//       if (!ref) return;

//       // 🧩 Create a temp view with watermark overlay for capture
//       const watermarkedRef = React.createRef<ViewShot>();
//       const WatermarkedCard = (
//         <ViewShot ref={watermarkedRef} options={{format: 'png', quality: 0.95}}>
//           <View
//             style={{
//               backgroundColor: '#000',
//               borderRadius: 24,
//               overflow: 'hidden',
//             }}>
//             {/* ✅ Reuse your card snapshot */}
//             <Image
//               source={{uri: await ref.capture()}}
//               style={{width: '100%', aspectRatio: 1, borderRadius: 24}}
//               resizeMode="cover"
//             />
//             {/* 💧 StylHelpr watermark */}
//             <View
//               style={{
//                 position: 'absolute',
//                 bottom: 12,
//                 right: 12,
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 12,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   fontSize: 12,
//                   fontWeight: '700',
//                   letterSpacing: 0.3,
//                 }}>
//                 StylHelpr
//               </Text>
//             </View>
//           </View>
//         </ViewShot>
//       );

//       // capture new watermarked image
//       const watermarkedUri = await ref.capture();

//       // 📨 open native iOS share sheet
//       await Share.share({
//         url: watermarkedUri,
//         message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//         title: 'Share Your Look',
//       });

//       // ✅ nice toast feedback
//       Toast.show('Look shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing look:', err);
//       Toast.show('Error sharing look ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     // <GradientBackground>
//     <SafeAreaView
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* 🧭 Spacer to restore old navbar height */}
//       <View
//         style={{
//           height: insets.top - 10, // ✅ matches GlobalHeader spacing
//           backgroundColor: theme.colors.background,
//         }}
//       />
//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         {/* Responsive pills in one fixed row */}
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             flexWrap: 'nowrap', // ✅ never wrap to next line
//           }}>
//           {(
//             [
//               {key: 'newest', label: 'Newest'},
//               {key: 'favorites', label: 'Favorites'},
//               {key: 'planned', label: 'Planned'},
//               {key: 'stars', label: 'Rating'},
//             ] as const
//           ).map(({key, label}, idx) => {
//             // dynamically size each pill to fit any phone width
//             const screenWidth = Dimensions.get('window').width;
//             const totalSpacing = 12 * 3 + 32; // margins + section padding
//             const pillWidth = (screenWidth - totalSpacing) / 4;

//             return (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic">
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: pillWidth, // ✅ auto width fits all screens
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                   }}>
//                   <Text
//                     numberOfLines={1}
//                     ellipsizeMode="clip"
//                     adjustsFontSizeToFit={false}
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                       textAlign: 'center',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             );
//           })}
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <SwipeableCard
//                   key={outfit.id}
//                   deleteThreshold={0.15}
//                   onSwipeLeft={() => {
//                     setPendingDeleteId(outfit.id);
//                     setShowDeleteConfirm(true);
//                   }}
//                   deleteBackground={
//                     <View
//                       style={{
//                         flex: 1,
//                         alignItems: 'flex-end',
//                         justifyContent: 'center',
//                         paddingRight: 24,
//                       }}>
//                       <MaterialIcons
//                         name="delete"
//                         size={28}
//                         color={theme.colors.error}
//                       />
//                     </View>
//                   }>
//                   <Animatable.View
//                     key={outfit.id}
//                     animation="fadeInUp"
//                     delay={150 + index * 120}
//                     duration={800}
//                     easing="ease-out-cubic"
//                     style={{
//                       transform: [{scale}, {translateY}],
//                       paddingHorizontal: 6,
//                     }}>
//                     <ViewShot
//                       ref={ref => (viewRefs.current[outfit.id] = ref)}
//                       options={{format: 'png', quality: 0.9}}>
//                       <TouchableOpacity
//                         activeOpacity={0.9}
//                         onPress={() => setFullScreenOutfit(outfit)}
//                         style={[globalStyles.cardStyles1, {marginBottom: 12}]}>
//                         {/* 🧵 Outfit Header Row */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                           }}>
//                           <View style={{flex: 1, marginRight: 12}}>
//                             <Text
//                               style={[
//                                 globalStyles.titleBold,
//                                 {
//                                   fontSize: 20,
//                                   color: theme.colors.foreground,
//                                 },
//                               ]}>
//                               {outfit.name?.trim() || 'Unnamed Outfit'}
//                             </Text>

//                             {/* 🗓️ Date & Time Info */}
//                             {(outfit.createdAt || outfit.plannedDate) && (
//                               <View style={{marginTop: 6}}>
//                                 {outfit.plannedDate && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 13,
//                                         fontWeight: '600',
//                                         color: theme.colors.foreground2,
//                                       },
//                                     ]}>
//                                     {`Planned for ${new Date(
//                                       outfit.plannedDate,
//                                     ).toLocaleString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       hour: 'numeric',
//                                       minute: '2-digit',
//                                     })}`}
//                                   </Text>
//                                 )}
//                                 {outfit.createdAt && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 12,
//                                         color: theme.colors.muted,
//                                       },
//                                     ]}>
//                                     {`Saved ${new Date(
//                                       outfit.createdAt,
//                                     ).toLocaleDateString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       year: 'numeric',
//                                     })}`}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </View>

//                           {/* ❤️ & ✏️ Buttons */}
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                             }}>
//                             {/* ✏️ Edit */}
//                             <Pressable
//                               onPress={e => {
//                                 hSelect();
//                                 setEditingOutfitId(outfit.id);
//                                 setEditedName(outfit.name || '');
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginRight: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="edit"
//                                 size={20}
//                                 color={theme.colors.foreground}
//                               />
//                             </Pressable>

//                             {/* ❤️ Favorite */}
//                             <Pressable
//                               onPress={e => {
//                                 hSelect();
//                                 toggleFavorite(
//                                   outfit.id,
//                                   outfit.type === 'custom'
//                                     ? 'custom'
//                                     : 'suggestion',
//                                   setCombinedOutfits,
//                                 );
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={20}
//                                 color={
//                                   favorites.some(
//                                     f =>
//                                       f.id === outfit.id &&
//                                       f.source ===
//                                         (outfit.type === 'custom'
//                                           ? 'custom'
//                                           : 'suggestion'),
//                                   )
//                                     ? 'red'
//                                     : theme.colors.foreground
//                                 }
//                               />
//                             </Pressable>
//                             {/* 📤 Share */}
//                             <Pressable
//                               onPress={() => handleShareOutfit(outfit)}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginLeft: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="ios-share"
//                                 size={20}
//                                 color={theme.colors.primary}
//                               />
//                             </Pressable>
//                           </View>
//                         </View>

//                         {/* 👕 Outfit Images */}
//                         <View style={styles.imageRow}>
//                           {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                             i?.image ? (
//                               <Image
//                                 key={i.id}
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {
//                                     marginRight: 12,
//                                     borderRadius: 12,
//                                     marginBottom: 8,
//                                     marginTop: -6,
//                                   },
//                                 ]}
//                               />
//                             ) : null,
//                           )}
//                         </View>

//                         {/* 📝 Notes */}
//                         {outfit.notes?.trim() && (
//                           <Text style={styles.notes}>
//                             “{outfit.notes.trim()}”
//                           </Text>
//                         )}

//                         {/* 📅 Schedule & Cancel Buttons – keep them working */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'flex-start',
//                             flexWrap: 'wrap',
//                             marginTop: 10,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={e => {
//                               setPlanningOutfitId(outfit.id);
//                               const now = new Date();
//                               setSelectedTempDate(now);
//                               setSelectedTempTime(now);
//                               setShowDatePicker(true);
//                             }}
//                             style={{
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 18,
//                               paddingVertical: 8,
//                               paddingHorizontal: 14,
//                               marginRight: 10,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               Schedule This Outfit
//                             </Text>
//                           </AppleTouchFeedback>

//                           {outfit.plannedDate && (
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 cancelPlannedOutfit(outfit.id);
//                               }}
//                               style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 paddingVertical: 8.5,
//                                 paddingHorizontal: 14,
//                                 borderRadius: 18,
//                                 backgroundColor:
//                                   theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               {/* <MaterialIcons
//                                 name="close"
//                                 size={19}
//                                 color="red"
//                                 style={{marginRight: 6}}
//                               /> */}
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                 }}>
//                                 Cancel Schedule
//                               </Text>
//                             </AppleTouchFeedback>
//                           )}
//                         </View>

//                         {/* 🏷️ Tags */}
//                         {(outfit.tags || []).length > 0 && (
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               flexWrap: 'wrap',
//                               marginTop: 8,
//                             }}>
//                             {outfit.tags?.map(tag => (
//                               <View
//                                 key={tag}
//                                 style={{
//                                   paddingHorizontal: 10,
//                                   paddingVertical: 6,
//                                   backgroundColor:
//                                     theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                   borderRadius: 16,
//                                   marginRight: 6,
//                                   marginBottom: 6,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     fontSize: 12,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   #{tag}
//                                 </Text>
//                               </View>
//                             ))}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                     </ViewShot>
//                   </Animatable.View>
//                 </SwipeableCard>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={[styles.overlay, {marginTop: 0}]}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <View
//               style={{
//                 position: 'relative',
//                 backgroundColor: theme.colors.background,
//                 borderRadius: 25,
//                 paddingBottom: insets.bottom + 10,
//                 paddingTop: 6,
//                 alignItems: 'center',
//               }}>
//               <DateTimePicker
//                 value={selectedTempDate || new Date()}
//                 mode="date"
//                 display="spinner"
//                 themeVariant="dark"
//                 textColor={theme.colors.foreground}
//                 onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//                 style={{marginVertical: -10}}
//               />
//             </View>

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <View
//               style={{
//                 position: 'relative',
//                 backgroundColor: 'rgba(0, 0, 0, 1)',
//                 borderRadius: 25,
//                 paddingBottom: insets.bottom + 10,
//                 paddingTop: 12,
//                 alignItems: 'center',
//                 overflow: 'hidden',
//               }}>
//               <DateTimePicker
//                 value={selectedTempTime || new Date()}
//                 mode="time"
//                 display="spinner"
//                 // themeVariant="dark"
//                 textColor={theme.colors.foreground}
//                 onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//                 style={{
//                   width: '100%',
//                   transform: [{scale: 1.05}],
//                   opacity: 1.0,
//                 }}
//               />
//             </View>

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{
//                     color: theme.colors.buttonText1,
//                     fontWeight: '800',
//                   }}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       <Modal
//         visible={showDeleteConfirm && !!pendingDeleteId}
//         transparent
//         animationType="fade">
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       </Modal>

//       {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
//       <Modal
//         visible={!!fullScreenOutfit}
//         transparent
//         animationType="none"
//         onRequestClose={() => setFullScreenOutfit(null)}>
//         <SafeAreaView style={{flex: 1, backgroundColor: 'transparent'}}>
//           <Animated.View
//             style={{
//               flex: 1,
//               backgroundColor: '#000',
//               transform: [{translateY}],
//               width: '100%',
//               height: '100%',
//             }}>
//               {/* ✨ Backdrop */}
//               <View
//                 style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}]}
//               />

//               {/* ✖️ Close Button ABOVE gesture zone */}
//               <TouchableOpacity
//                 style={{
//                   position: 'absolute',
//                   top: 0,
//                   right: 20,
//                   zIndex: 20,
//                   backgroundColor: 'rgba(0,0,0,0.5)',
//                   borderRadius: 50,
//                   paddingHorizontal: 8,
//                   paddingVertical: 6,
//                 }}
//                 onPress={handleClose}
//                 hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//                 <Text style={{color: '#fff', fontSize: 20}}>✕</Text>
//               </TouchableOpacity>

//               {/* 🟥 Swipe Gesture Zone */}
//               <View
//                 {...panResponder.panHandlers}
//                 style={{
//                   position: 'absolute',
//                   top: 28,
//                   height: 280,
//                   width: '100%',
//                   zIndex: 999,
//                   // backgroundColor: 'rgba(255,0,0,0.3)', // debug
//                 }}
//                 onStartShouldSetResponder={() => true}
//               />

//               {/* 📸 Outfit Scroll Content */}
//               <ScrollView
//                 showsVerticalScrollIndicator={false}
//                 style={{flex: 1, width: '100%'}}
//                 contentContainerStyle={{
//                   paddingBottom: 180,
//                   alignItems: 'center',
//                   paddingHorizontal: 24,
//                 }}>
//                 {/* 🧥 Outfit Name */}
//                 <Animatable.Text
//                   animation="fadeInDown"
//                   delay={200}
//                   duration={700}
//                   style={{
//                     fontSize: 28,
//                     fontWeight: '800',
//                     color: '#fff',
//                     textAlign: 'center',
//                     marginTop: 25,
//                     marginBottom: 20,
//                     letterSpacing: 0.5,
//                   }}>
//                   {fullScreenOutfit?.name || 'Unnamed Outfit'}
//                 </Animatable.Text>

//                 {/* 👕 Outfit Images */}
//                 {[
//                   fullScreenOutfit?.top,
//                   fullScreenOutfit?.bottom,
//                   fullScreenOutfit?.shoes,
//                 ].map(
//                   (i, idx) =>
//                     i?.image && (
//                       <Animatable.Image
//                         key={i.id || idx}
//                         source={{uri: i.image}}
//                         animation="fadeInUp"
//                         delay={300 + idx * 200}
//                         duration={800}
//                         style={{
//                           width: '100%',
//                           height: 400,
//                           maxWidth: 400,
//                           borderRadius: 20,
//                           marginBottom: 28,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.35,
//                           shadowRadius: 24,
//                           shadowOffset: {width: 0, height: 14},
//                         }}
//                         resizeMode="cover"
//                       />
//                     ),
//                 )}

//                 {/* 📝 Notes */}
//                 {fullScreenOutfit?.notes?.trim() && (
//                   <Animatable.Text
//                     animation="fadeInUp"
//                     delay={700}
//                     duration={800}
//                     style={{
//                       fontStyle: 'italic',
//                       fontSize: 16,
//                       color: 'rgba(255,255,255,0.9)',
//                       textAlign: 'center',
//                       marginTop: 10,
//                       lineHeight: 22,
//                     }}>
//                     "{fullScreenOutfit.notes.trim()}"
//                   </Animatable.Text>
//                 )}

//                 {/* 🏷️ Tags */}
//                 {fullScreenOutfit?.tags?.length ? (
//                   <Animatable.View
//                     animation="fadeInUp"
//                     delay={900}
//                     duration={800}
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       justifyContent: 'center',
//                       marginTop: 24,
//                     }}>
//                     {fullScreenOutfit.tags.map(tag => (
//                       <View
//                         key={tag}
//                         style={{
//                           backgroundColor: 'rgba(255,255,255,0.1)',
//                           borderRadius: 20,
//                           paddingHorizontal: 14,
//                           paddingVertical: 6,
//                           margin: 6,
//                         }}>
//                         <Text
//                           style={{
//                             color: '#fff',
//                             fontSize: 14,
//                             fontWeight: '600',
//                             letterSpacing: 0.2,
//                           }}>
//                           #{tag}
//                         </Text>
//                       </View>
//                     ))}
//                   </Animatable.View>
//                 ) : null}
//               </ScrollView>

//               {/* 🪩 Frosted Bottom Panel */}
//               <Animatable.View
//                 animation="fadeInUp"
//                 delay={400}
//                 duration={700}
//                 style={{
//                   position: 'absolute',
//                   bottom: 0,
//                   width: '100%',
//                   // paddingVertical: 28,
//                   // paddingHorizontal: 24,
//                   // borderTopLeftRadius: 26,
//                   // borderTopRightRadius: 26,
//                   // backgroundColor:
//                   //   Platform.OS === 'android'
//                   //     ? 'rgba(20,20,20,0.9)'
//                   //     : 'transparent',
//                   // shadowColor: '#000',
//                   // shadowOpacity: 0.4,
//                   // shadowRadius: 30,
//                   // shadowOffset: {width: 0, height: -10},
//                 }}>
//                 {Platform.OS === 'ios' && (
//                   <BlurView
//                     style={StyleSheet.absoluteFill}
//                     blurType="systemMaterialDark"
//                     blurAmount={30}
//                   />
//                 )}
//               </Animatable.View>
//             </Animated.View>
//           </SafeAreaView>
//       </Modal>
//     </SafeAreaView>
//     // </GradientBackground>
//   );
// }

///////////////

// import React, {useEffect, useRef, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   SafeAreaView,
//   ScrollView,
//   PanResponder,
//   Pressable,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';
// import {Share} from 'react-native';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: 'red',
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 4,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 24,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '100%',
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 30,
//       borderTopRightRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 28,
//       paddingHorizontal: 20,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // 👆 put these near your other hooks at the top of the component
//   const translateY = useRef(new Animated.Value(0)).current;

//   const handleClose = useCallback(() => {
//     Animated.timing(translateY, {
//       toValue: Dimensions.get('window').height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         translateY.setValue(0);
//         setFullScreenOutfit(null);
//       }
//     });
//   }, [translateY, setFullScreenOutfit]);
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect(); // ✅ haptic feedback
//   //     const shareMessage = outfit.name
//   //       ? `Check out my outfit "${outfit.name}" 👕 via StylHelpr`
//   //       : 'Check out my outfit 👕 via StylHelpr';

//   //     const imageUrl =
//   //       outfit.top?.image || outfit.bottom?.image || outfit.shoes?.image;

//   //     await Share.share({
//   //       message: shareMessage,
//   //       url: imageUrl,
//   //       title: 'Share Your Look',
//   //     });

//   //     h('selection'); // ✅ subtle tap after share
//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });

//   //     console.log('✅ Shared successfully');
//   //   } catch (error) {
//   //     console.error('❌ Error sharing look:', error);
//   //   }
//   // };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect();
//   //     const ref = viewRefs.current[outfit.id];
//   //     if (!ref) return;

//   //     // 🧩 Capture outfit card as image
//   //     const uri = await ref.capture();

//   //     await Share.share({
//   //       url: uri,
//   //       message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//   //       title: 'Share Your Look',
//   //     });

//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   } catch (err) {
//   //     console.error('❌ Error sharing look:', err);
//   //     Toast.show('Error sharing look ❌', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   }
//   // };

//   const handleShareOutfit = async (outfit: SavedOutfit) => {
//     try {
//       // ✅ subtle tap
//       ReactNativeHapticFeedback.trigger('impactLight', {
//         enableVibrateFallback: true,
//         ignoreAndroidSystemSettings: false,
//       });

//       const ref = viewRefs.current[outfit.id];
//       if (!ref) return;

//       // 🧩 Create a temp view with watermark overlay for capture
//       const watermarkedRef = React.createRef<ViewShot>();
//       const WatermarkedCard = (
//         <ViewShot ref={watermarkedRef} options={{format: 'png', quality: 0.95}}>
//           <View
//             style={{
//               backgroundColor: '#000',
//               borderRadius: 24,
//               overflow: 'hidden',
//             }}>
//             {/* ✅ Reuse your card snapshot */}
//             <Image
//               source={{uri: await ref.capture()}}
//               style={{width: '100%', aspectRatio: 1, borderRadius: 24}}
//               resizeMode="cover"
//             />
//             {/* 💧 StylHelpr watermark */}
//             <View
//               style={{
//                 position: 'absolute',
//                 bottom: 12,
//                 right: 12,
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 12,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   fontSize: 12,
//                   fontWeight: '700',
//                   letterSpacing: 0.3,
//                 }}>
//                 StylHelpr
//               </Text>
//             </View>
//           </View>
//         </ViewShot>
//       );

//       // capture new watermarked image
//       const watermarkedUri = await ref.capture();

//       // 📨 open native iOS share sheet
//       await Share.share({
//         url: watermarkedUri,
//         message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//         title: 'Share Your Look',
//       });

//       // ✅ nice toast feedback
//       Toast.show('Look shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing look:', err);
//       Toast.show('Error sharing look ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     // <GradientBackground>
//     <SafeAreaView
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

//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         {/* Responsive pills in one fixed row */}
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             flexWrap: 'nowrap', // ✅ never wrap to next line
//           }}>
//           {(
//             [
//               {key: 'newest', label: 'Newest'},
//               {key: 'favorites', label: 'Favorites'},
//               {key: 'planned', label: 'Planned'},
//               {key: 'stars', label: 'Rating'},
//             ] as const
//           ).map(({key, label}, idx) => {
//             // dynamically size each pill to fit any phone width
//             const screenWidth = Dimensions.get('window').width;
//             const totalSpacing = 12 * 3 + 32; // margins + section padding
//             const pillWidth = (screenWidth - totalSpacing) / 4;

//             return (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic">
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: pillWidth, // ✅ auto width fits all screens
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                   }}>
//                   <Text
//                     numberOfLines={1}
//                     ellipsizeMode="clip"
//                     adjustsFontSizeToFit={false}
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                       textAlign: 'center',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             );
//           })}
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <SwipeableCard
//                   key={outfit.id}
//                   deleteThreshold={0.15}
//                   onSwipeLeft={() => {
//                     setPendingDeleteId(outfit.id);
//                     setShowDeleteConfirm(true);
//                   }}
//                   deleteBackground={
//                     <View
//                       style={{
//                         flex: 1,
//                         alignItems: 'flex-end',
//                         justifyContent: 'center',
//                         paddingRight: 24,
//                       }}>
//                       <MaterialIcons
//                         name="delete"
//                         size={28}
//                         color={theme.colors.error}
//                       />
//                     </View>
//                   }>
//                   <Animatable.View
//                     key={outfit.id}
//                     animation="fadeInUp"
//                     delay={150 + index * 120}
//                     duration={800}
//                     easing="ease-out-cubic"
//                     style={{
//                       transform: [{scale}, {translateY}],
//                       paddingHorizontal: 6,
//                     }}>
//                     <ViewShot
//                       ref={ref => (viewRefs.current[outfit.id] = ref)}
//                       options={{format: 'png', quality: 0.9}}>
//                       <TouchableOpacity
//                         activeOpacity={0.9}
//                         onPress={() => setFullScreenOutfit(outfit)}
//                         style={[globalStyles.cardStyles1, {marginBottom: 12}]}>
//                         {/* 🧵 Outfit Header Row */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                           }}>
//                           <View style={{flex: 1, marginRight: 12}}>
//                             <Text
//                               style={[
//                                 globalStyles.titleBold,
//                                 {
//                                   fontSize: 20,
//                                   color: theme.colors.foreground,
//                                 },
//                               ]}>
//                               {outfit.name?.trim() || 'Unnamed Outfit'}
//                             </Text>

//                             {/* 🗓️ Date & Time Info */}
//                             {(outfit.createdAt || outfit.plannedDate) && (
//                               <View style={{marginTop: 6}}>
//                                 {outfit.plannedDate && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 13,
//                                         fontWeight: '600',
//                                         color: theme.colors.foreground2,
//                                       },
//                                     ]}>
//                                     {`Planned for ${new Date(
//                                       outfit.plannedDate,
//                                     ).toLocaleString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       hour: 'numeric',
//                                       minute: '2-digit',
//                                     })}`}
//                                   </Text>
//                                 )}
//                                 {outfit.createdAt && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 12,
//                                         color: theme.colors.muted,
//                                       },
//                                     ]}>
//                                     {`Saved ${new Date(
//                                       outfit.createdAt,
//                                     ).toLocaleDateString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       year: 'numeric',
//                                     })}`}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </View>

//                           {/* ❤️ & ✏️ Buttons */}
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                             }}>
//                             {/* ✏️ Edit */}
//                             <Pressable
//                               onPress={e => {
//                                 hSelect();
//                                 setEditingOutfitId(outfit.id);
//                                 setEditedName(outfit.name || '');
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginRight: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="edit"
//                                 size={20}
//                                 color={theme.colors.foreground}
//                               />
//                             </Pressable>

//                             {/* ❤️ Favorite */}
//                             <Pressable
//                               onPress={e => {
//                                 hSelect();
//                                 toggleFavorite(
//                                   outfit.id,
//                                   outfit.type === 'custom'
//                                     ? 'custom'
//                                     : 'suggestion',
//                                   setCombinedOutfits,
//                                 );
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={20}
//                                 color={
//                                   favorites.some(
//                                     f =>
//                                       f.id === outfit.id &&
//                                       f.source ===
//                                         (outfit.type === 'custom'
//                                           ? 'custom'
//                                           : 'suggestion'),
//                                   )
//                                     ? 'red'
//                                     : theme.colors.foreground
//                                 }
//                               />
//                             </Pressable>
//                             {/* 📤 Share */}
//                             <Pressable
//                               onPress={() => handleShareOutfit(outfit)}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginLeft: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="ios-share"
//                                 size={20}
//                                 color={theme.colors.primary}
//                               />
//                             </Pressable>
//                           </View>
//                         </View>

//                         {/* 👕 Outfit Images */}
//                         <View style={styles.imageRow}>
//                           {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                             i?.image ? (
//                               <Image
//                                 key={i.id}
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {
//                                     marginRight: 12,
//                                     borderRadius: 12,
//                                     marginBottom: 8,
//                                     marginTop: -6,
//                                   },
//                                 ]}
//                               />
//                             ) : null,
//                           )}
//                         </View>

//                         {/* 📝 Notes */}
//                         {outfit.notes?.trim() && (
//                           <Text style={styles.notes}>
//                             “{outfit.notes.trim()}”
//                           </Text>
//                         )}

//                         {/* 📅 Schedule & Cancel Buttons – keep them working */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'center',
//                             flexWrap: 'wrap',
//                             marginTop: 10,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={e => {
//                               setPlanningOutfitId(outfit.id);
//                               const now = new Date();
//                               setSelectedTempDate(now);
//                               setSelectedTempTime(now);
//                               setShowDatePicker(true);
//                             }}
//                             style={{
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 18,
//                               paddingVertical: 8,
//                               paddingHorizontal: 8,
//                               marginRight: 10,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               📅 Schedule This Outfit
//                             </Text>
//                           </AppleTouchFeedback>

//                           {outfit.plannedDate && (
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 cancelPlannedOutfit(outfit.id);
//                               }}
//                               style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 paddingVertical: 7,
//                                 paddingHorizontal: 12,
//                                 borderRadius: 18,
//                                 backgroundColor:
//                                   theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="close"
//                                 size={19}
//                                 color="red"
//                                 style={{marginRight: 6}}
//                               />
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                 }}>
//                                 Cancel Schedule
//                               </Text>
//                             </AppleTouchFeedback>
//                           )}
//                         </View>

//                         {/* 🏷️ Tags */}
//                         {(outfit.tags || []).length > 0 && (
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               flexWrap: 'wrap',
//                               marginTop: 8,
//                             }}>
//                             {outfit.tags?.map(tag => (
//                               <View
//                                 key={tag}
//                                 style={{
//                                   paddingHorizontal: 10,
//                                   paddingVertical: 6,
//                                   backgroundColor:
//                                     theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                   borderRadius: 16,
//                                   marginRight: 6,
//                                   marginBottom: 6,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     fontSize: 12,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   #{tag}
//                                 </Text>
//                               </View>
//                             ))}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                     </ViewShot>
//                   </Animatable.View>
//                 </SwipeableCard>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{
//                     color: theme.colors.buttonText1,
//                     fontWeight: '800',
//                   }}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       {showDeleteConfirm && pendingDeleteId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
//       <Modal
//         visible={!!fullScreenOutfit}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setFullScreenOutfit(null)}>
//         {fullScreenOutfit && (
//           <SafeAreaView style={{flex: 1, backgroundColor: 'transparent'}}>
//             <Animated.View
//               style={{
//                 flex: 1,
//                 backgroundColor: '#000',
//                 transform: [{translateY}],
//                 width: '100%',
//                 height: '100%',
//               }}>
//               {/* ✨ Backdrop */}
//               <Animatable.View
//                 animation="fadeIn"
//                 duration={300}
//                 style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}]}
//               />

//               {/* ✖️ Close Button ABOVE gesture zone */}
//               <TouchableOpacity
//                 style={{
//                   position: 'absolute',
//                   top: 0,
//                   right: 20,
//                   zIndex: 20,
//                   backgroundColor: 'rgba(0,0,0,0.5)',
//                   borderRadius: 50,
//                   paddingHorizontal: 8,
//                   paddingVertical: 6,
//                 }}
//                 onPress={handleClose}
//                 hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//                 <Text style={{color: '#fff', fontSize: 20}}>✕</Text>
//               </TouchableOpacity>

//               {/* 🟥 Swipe Gesture Zone */}
//               <View
//                 {...panResponder.panHandlers}
//                 style={{
//                   position: 'absolute',
//                   top: 28,
//                   height: 280,
//                   width: '100%',
//                   zIndex: 999,
//                   // backgroundColor: 'rgba(255,0,0,0.3)', // debug
//                 }}
//                 onStartShouldSetResponder={() => true}
//               />

//               {/* 📸 Outfit Scroll Content */}
//               <ScrollView
//                 showsVerticalScrollIndicator={false}
//                 style={{flex: 1, width: '100%'}}
//                 contentContainerStyle={{
//                   paddingBottom: 180,
//                   alignItems: 'center',
//                   paddingHorizontal: 24,
//                 }}>
//                 {/* 🧥 Outfit Name */}
//                 <Animatable.Text
//                   animation="fadeInDown"
//                   delay={200}
//                   duration={700}
//                   style={{
//                     fontSize: 28,
//                     fontWeight: '800',
//                     color: '#fff',
//                     textAlign: 'center',
//                     marginTop: 25,
//                     marginBottom: 20,
//                     letterSpacing: 0.5,
//                   }}>
//                   {fullScreenOutfit.name || 'Unnamed Outfit'}
//                 </Animatable.Text>

//                 {/* 👕 Outfit Images */}
//                 {[
//                   fullScreenOutfit.top,
//                   fullScreenOutfit.bottom,
//                   fullScreenOutfit.shoes,
//                 ].map(
//                   (i, idx) =>
//                     i?.image && (
//                       <Animatable.Image
//                         key={i.id || idx}
//                         source={{uri: i.image}}
//                         animation="fadeInUp"
//                         delay={300 + idx * 200}
//                         duration={800}
//                         style={{
//                           width: '100%',
//                           height: 400,
//                           maxWidth: 400,
//                           borderRadius: 20,
//                           marginBottom: 28,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.35,
//                           shadowRadius: 24,
//                           shadowOffset: {width: 0, height: 14},
//                         }}
//                         resizeMode="cover"
//                       />
//                     ),
//                 )}

//                 {/* 📝 Notes */}
//                 {fullScreenOutfit.notes?.trim() && (
//                   <Animatable.Text
//                     animation="fadeInUp"
//                     delay={700}
//                     duration={800}
//                     style={{
//                       fontStyle: 'italic',
//                       fontSize: 16,
//                       color: 'rgba(255,255,255,0.9)',
//                       textAlign: 'center',
//                       marginTop: 10,
//                       lineHeight: 22,
//                     }}>
//                     “{fullScreenOutfit.notes.trim()}”
//                   </Animatable.Text>
//                 )}

//                 {/* 🏷️ Tags */}
//                 {fullScreenOutfit.tags?.length ? (
//                   <Animatable.View
//                     animation="fadeInUp"
//                     delay={900}
//                     duration={800}
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       justifyContent: 'center',
//                       marginTop: 24,
//                     }}>
//                     {fullScreenOutfit.tags.map(tag => (
//                       <View
//                         key={tag}
//                         style={{
//                           backgroundColor: 'rgba(255,255,255,0.1)',
//                           borderRadius: 20,
//                           paddingHorizontal: 14,
//                           paddingVertical: 6,
//                           margin: 6,
//                         }}>
//                         <Text
//                           style={{
//                             color: '#fff',
//                             fontSize: 14,
//                             fontWeight: '600',
//                             letterSpacing: 0.2,
//                           }}>
//                           #{tag}
//                         </Text>
//                       </View>
//                     ))}
//                   </Animatable.View>
//                 ) : null}
//               </ScrollView>

//               {/* 🪩 Frosted Bottom Panel */}
//               <Animatable.View
//                 animation="fadeInUp"
//                 delay={400}
//                 duration={700}
//                 style={{
//                   position: 'absolute',
//                   bottom: 0,
//                   width: '100%',
//                   // paddingVertical: 28,
//                   // paddingHorizontal: 24,
//                   // borderTopLeftRadius: 26,
//                   // borderTopRightRadius: 26,
//                   // backgroundColor:
//                   //   Platform.OS === 'android'
//                   //     ? 'rgba(20,20,20,0.9)'
//                   //     : 'transparent',
//                   // shadowColor: '#000',
//                   // shadowOpacity: 0.4,
//                   // shadowRadius: 30,
//                   // shadowOffset: {width: 0, height: -10},
//                 }}>
//                 {Platform.OS === 'ios' && (
//                   <BlurView
//                     style={StyleSheet.absoluteFill}
//                     blurType="systemMaterialDark"
//                     blurAmount={30}
//                   />
//                 )}
//               </Animatable.View>
//             </Animated.View>
//           </SafeAreaView>
//         )}
//       </Modal>
//     </SafeAreaView>
//     // </GradientBackground>
//   );
// }

////////////////////

// import React, {useEffect, useRef, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   SafeAreaView,
//   ScrollView,
//   PanResponder,
//   Pressable,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';
// import {Share} from 'react-native';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: 'red',
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 4,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 24,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '100%',
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 30,
//       borderTopRightRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 28,
//       paddingHorizontal: 20,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // 👆 put these near your other hooks at the top of the component
//   const translateY = useRef(new Animated.Value(0)).current;

//   const handleClose = useCallback(() => {
//     Animated.timing(translateY, {
//       toValue: Dimensions.get('window').height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         translateY.setValue(0);
//         setFullScreenOutfit(null);
//       }
//     });
//   }, [translateY, setFullScreenOutfit]);
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect(); // ✅ haptic feedback
//   //     const shareMessage = outfit.name
//   //       ? `Check out my outfit "${outfit.name}" 👕 via StylHelpr`
//   //       : 'Check out my outfit 👕 via StylHelpr';

//   //     const imageUrl =
//   //       outfit.top?.image || outfit.bottom?.image || outfit.shoes?.image;

//   //     await Share.share({
//   //       message: shareMessage,
//   //       url: imageUrl,
//   //       title: 'Share Your Look',
//   //     });

//   //     h('selection'); // ✅ subtle tap after share
//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });

//   //     console.log('✅ Shared successfully');
//   //   } catch (error) {
//   //     console.error('❌ Error sharing look:', error);
//   //   }
//   // };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect();
//   //     const ref = viewRefs.current[outfit.id];
//   //     if (!ref) return;

//   //     // 🧩 Capture outfit card as image
//   //     const uri = await ref.capture();

//   //     await Share.share({
//   //       url: uri,
//   //       message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//   //       title: 'Share Your Look',
//   //     });

//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   } catch (err) {
//   //     console.error('❌ Error sharing look:', err);
//   //     Toast.show('Error sharing look ❌', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   }
//   // };

//   const handleShareOutfit = async (outfit: SavedOutfit) => {
//     try {
//       // ✅ subtle tap
//       ReactNativeHapticFeedback.trigger('impactLight', {
//         enableVibrateFallback: true,
//         ignoreAndroidSystemSettings: false,
//       });

//       const ref = viewRefs.current[outfit.id];
//       if (!ref) return;

//       // 🧩 Create a temp view with watermark overlay for capture
//       const watermarkedRef = React.createRef<ViewShot>();
//       const WatermarkedCard = (
//         <ViewShot ref={watermarkedRef} options={{format: 'png', quality: 0.95}}>
//           <View
//             style={{
//               backgroundColor: '#000',
//               borderRadius: 24,
//               overflow: 'hidden',
//             }}>
//             {/* ✅ Reuse your card snapshot */}
//             <Image
//               source={{uri: await ref.capture()}}
//               style={{width: '100%', aspectRatio: 1, borderRadius: 24}}
//               resizeMode="cover"
//             />
//             {/* 💧 StylHelpr watermark */}
//             <View
//               style={{
//                 position: 'absolute',
//                 bottom: 12,
//                 right: 12,
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 12,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   fontSize: 12,
//                   fontWeight: '700',
//                   letterSpacing: 0.3,
//                 }}>
//                 StylHelpr
//               </Text>
//             </View>
//           </View>
//         </ViewShot>
//       );

//       // capture new watermarked image
//       const watermarkedUri = await ref.capture();

//       // 📨 open native iOS share sheet
//       await Share.share({
//         url: watermarkedUri,
//         message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//         title: 'Share Your Look',
//       });

//       // ✅ nice toast feedback
//       Toast.show('Look shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing look:', err);
//       Toast.show('Error sharing look ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     // <GradientBackground>
//     <SafeAreaView
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

//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         {/* Responsive pills in one fixed row */}
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             flexWrap: 'nowrap', // ✅ never wrap to next line
//           }}>
//           {(
//             [
//               {key: 'newest', label: 'Newest'},
//               {key: 'favorites', label: 'Favorites'},
//               {key: 'planned', label: 'Planned'},
//               {key: 'stars', label: 'Rating'},
//             ] as const
//           ).map(({key, label}, idx) => {
//             // dynamically size each pill to fit any phone width
//             const screenWidth = Dimensions.get('window').width;
//             const totalSpacing = 12 * 3 + 32; // margins + section padding
//             const pillWidth = (screenWidth - totalSpacing) / 4;

//             return (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic">
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: pillWidth, // ✅ auto width fits all screens
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                   }}>
//                   <Text
//                     numberOfLines={1}
//                     ellipsizeMode="clip"
//                     adjustsFontSizeToFit={false}
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                       textAlign: 'center',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             );
//           })}
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <SwipeableCard
//                   key={outfit.id}
//                   deleteThreshold={0.15}
//                   onSwipeLeft={() => {
//                     setPendingDeleteId(outfit.id);
//                     setShowDeleteConfirm(true);
//                   }}
//                   deleteBackground={
//                     <View
//                       style={{
//                         flex: 1,
//                         alignItems: 'flex-end',
//                         justifyContent: 'center',
//                         paddingRight: 24,
//                       }}>
//                       <MaterialIcons
//                         name="delete"
//                         size={28}
//                         color={theme.colors.error}
//                       />
//                     </View>
//                   }>
//                   <Animatable.View
//                     key={outfit.id}
//                     animation="fadeInUp"
//                     delay={150 + index * 120}
//                     duration={800}
//                     easing="ease-out-cubic"
//                     style={{
//                       transform: [{scale}, {translateY}],
//                       paddingHorizontal: 6,
//                     }}>
//                     <ViewShot
//                       ref={ref => (viewRefs.current[outfit.id] = ref)}
//                       options={{format: 'png', quality: 0.9}}>
//                       <TouchableOpacity
//                         activeOpacity={0.9}
//                         onPress={() => setFullScreenOutfit(outfit)}
//                         style={[globalStyles.cardStyles1, {marginBottom: 12}]}>
//                         {/* 🧵 Outfit Header Row */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                           }}>
//                           <View style={{flex: 1, marginRight: 12}}>
//                             <Text
//                               style={[
//                                 globalStyles.titleBold,
//                                 {
//                                   fontSize: 20,
//                                   color: theme.colors.foreground,
//                                 },
//                               ]}>
//                               {outfit.name?.trim() || 'Unnamed Outfit'}
//                             </Text>

//                             {/* 🗓️ Date & Time Info */}
//                             {(outfit.createdAt || outfit.plannedDate) && (
//                               <View style={{marginTop: 6}}>
//                                 {outfit.plannedDate && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 13,
//                                         fontWeight: '600',
//                                         color: theme.colors.foreground2,
//                                       },
//                                     ]}>
//                                     {`Planned for ${new Date(
//                                       outfit.plannedDate,
//                                     ).toLocaleString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       hour: 'numeric',
//                                       minute: '2-digit',
//                                     })}`}
//                                   </Text>
//                                 )}
//                                 {outfit.createdAt && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 12,
//                                         color: theme.colors.muted,
//                                       },
//                                     ]}>
//                                     {`Saved ${new Date(
//                                       outfit.createdAt,
//                                     ).toLocaleDateString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       year: 'numeric',
//                                     })}`}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </View>

//                           {/* ❤️ & ✏️ Buttons */}
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                             }}>
//                             {/* ✏️ Edit */}
//                             <Pressable
//                               onPress={e => {
//                                 hSelect();
//                                 setEditingOutfitId(outfit.id);
//                                 setEditedName(outfit.name || '');
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginRight: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="edit"
//                                 size={20}
//                                 color={theme.colors.foreground}
//                               />
//                             </Pressable>

//                             {/* ❤️ Favorite */}
//                             <Pressable
//                               onPress={e => {
//                                 hSelect();
//                                 toggleFavorite(
//                                   outfit.id,
//                                   outfit.type === 'custom'
//                                     ? 'custom'
//                                     : 'suggestion',
//                                   setCombinedOutfits,
//                                 );
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={20}
//                                 color={
//                                   favorites.some(
//                                     f =>
//                                       f.id === outfit.id &&
//                                       f.source ===
//                                         (outfit.type === 'custom'
//                                           ? 'custom'
//                                           : 'suggestion'),
//                                   )
//                                     ? 'red'
//                                     : theme.colors.foreground
//                                 }
//                               />
//                             </Pressable>
//                             {/* 📤 Share */}
//                             <Pressable
//                               onPress={() => handleShareOutfit(outfit)}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginLeft: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="ios-share"
//                                 size={20}
//                                 color={theme.colors.primary}
//                               />
//                             </Pressable>
//                           </View>
//                         </View>

//                         {/* 👕 Outfit Images */}
//                         <View style={styles.imageRow}>
//                           {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                             i?.image ? (
//                               <Image
//                                 key={i.id}
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {
//                                     marginRight: 12,
//                                     borderRadius: 12,
//                                     marginBottom: 8,
//                                     marginTop: -6,
//                                   },
//                                 ]}
//                               />
//                             ) : null,
//                           )}
//                         </View>

//                         {/* 📝 Notes */}
//                         {outfit.notes?.trim() && (
//                           <Text style={styles.notes}>
//                             “{outfit.notes.trim()}”
//                           </Text>
//                         )}

//                         {/* 📅 Schedule & Cancel Buttons – keep them working */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'center',
//                             flexWrap: 'wrap',
//                             marginTop: 10,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={e => {
//                               setPlanningOutfitId(outfit.id);
//                               const now = new Date();
//                               setSelectedTempDate(now);
//                               setSelectedTempTime(now);
//                               setShowDatePicker(true);
//                             }}
//                             style={{
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 18,
//                               paddingVertical: 8,
//                               paddingHorizontal: 8,
//                               marginRight: 10,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               📅 Schedule This Outfit
//                             </Text>
//                           </AppleTouchFeedback>

//                           {outfit.plannedDate && (
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 cancelPlannedOutfit(outfit.id);
//                               }}
//                               style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 paddingVertical: 7,
//                                 paddingHorizontal: 12,
//                                 borderRadius: 18,
//                                 backgroundColor:
//                                   theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="close"
//                                 size={19}
//                                 color="red"
//                                 style={{marginRight: 6}}
//                               />
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                 }}>
//                                 Cancel Schedule
//                               </Text>
//                             </AppleTouchFeedback>
//                           )}
//                         </View>

//                         {/* 🏷️ Tags */}
//                         {(outfit.tags || []).length > 0 && (
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               flexWrap: 'wrap',
//                               marginTop: 8,
//                             }}>
//                             {outfit.tags?.map(tag => (
//                               <View
//                                 key={tag}
//                                 style={{
//                                   paddingHorizontal: 10,
//                                   paddingVertical: 6,
//                                   backgroundColor:
//                                     theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                   borderRadius: 16,
//                                   marginRight: 6,
//                                   marginBottom: 6,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     fontSize: 12,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   #{tag}
//                                 </Text>
//                               </View>
//                             ))}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                     </ViewShot>
//                   </Animatable.View>
//                 </SwipeableCard>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{
//                     color: theme.colors.buttonText1,
//                     fontWeight: '800',
//                   }}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       {showDeleteConfirm && pendingDeleteId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
//       <Modal
//         visible={!!fullScreenOutfit}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setFullScreenOutfit(null)}>
//         {fullScreenOutfit && (
//           <SafeAreaView style={{flex: 1, backgroundColor: 'transparent'}}>
//             <Animated.View
//               style={{
//                 flex: 1,
//                 backgroundColor: '#000',
//                 transform: [{translateY}],
//                 width: '100%',
//                 height: '100%',
//               }}>
//               {/* ✨ Backdrop */}
//               <Animatable.View
//                 animation="fadeIn"
//                 duration={300}
//                 style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}]}
//               />

//               {/* ✖️ Close Button ABOVE gesture zone */}
//               <TouchableOpacity
//                 style={{
//                   position: 'absolute',
//                   top: 0,
//                   right: 20,
//                   zIndex: 20,
//                   backgroundColor: 'rgba(0,0,0,0.5)',
//                   borderRadius: 50,
//                   paddingHorizontal: 8,
//                   paddingVertical: 6,
//                 }}
//                 onPress={handleClose}
//                 hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//                 <Text style={{color: '#fff', fontSize: 20}}>✕</Text>
//               </TouchableOpacity>

//               {/* 🟥 Swipe Gesture Zone */}
//               <View
//                 {...panResponder.panHandlers}
//                 style={{
//                   position: 'absolute',
//                   top: 28,
//                   height: 280,
//                   width: '100%',
//                   zIndex: 999,
//                   // backgroundColor: 'rgba(255,0,0,0.3)', // debug
//                 }}
//                 onStartShouldSetResponder={() => true}
//               />

//               {/* 📸 Outfit Scroll Content */}
//               <ScrollView
//                 showsVerticalScrollIndicator={false}
//                 style={{flex: 1, width: '100%'}}
//                 contentContainerStyle={{
//                   paddingBottom: 180,
//                   alignItems: 'center',
//                   paddingHorizontal: 24,
//                 }}>
//                 {/* 🧥 Outfit Name */}
//                 <Animatable.Text
//                   animation="fadeInDown"
//                   delay={200}
//                   duration={700}
//                   style={{
//                     fontSize: 28,
//                     fontWeight: '800',
//                     color: '#fff',
//                     textAlign: 'center',
//                     marginTop: 25,
//                     marginBottom: 20,
//                     letterSpacing: 0.5,
//                   }}>
//                   {fullScreenOutfit.name || 'Unnamed Outfit'}
//                 </Animatable.Text>

//                 {/* 👕 Outfit Images */}
//                 {[
//                   fullScreenOutfit.top,
//                   fullScreenOutfit.bottom,
//                   fullScreenOutfit.shoes,
//                 ].map(
//                   (i, idx) =>
//                     i?.image && (
//                       <Animatable.Image
//                         key={i.id || idx}
//                         source={{uri: i.image}}
//                         animation="fadeInUp"
//                         delay={300 + idx * 200}
//                         duration={800}
//                         style={{
//                           width: '100%',
//                           height: 400,
//                           maxWidth: 400,
//                           borderRadius: 20,
//                           marginBottom: 28,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.35,
//                           shadowRadius: 24,
//                           shadowOffset: {width: 0, height: 14},
//                         }}
//                         resizeMode="cover"
//                       />
//                     ),
//                 )}

//                 {/* 📝 Notes */}
//                 {fullScreenOutfit.notes?.trim() && (
//                   <Animatable.Text
//                     animation="fadeInUp"
//                     delay={700}
//                     duration={800}
//                     style={{
//                       fontStyle: 'italic',
//                       fontSize: 16,
//                       color: 'rgba(255,255,255,0.9)',
//                       textAlign: 'center',
//                       marginTop: 10,
//                       lineHeight: 22,
//                     }}>
//                     “{fullScreenOutfit.notes.trim()}”
//                   </Animatable.Text>
//                 )}

//                 {/* 🏷️ Tags */}
//                 {fullScreenOutfit.tags?.length ? (
//                   <Animatable.View
//                     animation="fadeInUp"
//                     delay={900}
//                     duration={800}
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       justifyContent: 'center',
//                       marginTop: 24,
//                     }}>
//                     {fullScreenOutfit.tags.map(tag => (
//                       <View
//                         key={tag}
//                         style={{
//                           backgroundColor: 'rgba(255,255,255,0.1)',
//                           borderRadius: 20,
//                           paddingHorizontal: 14,
//                           paddingVertical: 6,
//                           margin: 6,
//                         }}>
//                         <Text
//                           style={{
//                             color: '#fff',
//                             fontSize: 14,
//                             fontWeight: '600',
//                             letterSpacing: 0.2,
//                           }}>
//                           #{tag}
//                         </Text>
//                       </View>
//                     ))}
//                   </Animatable.View>
//                 ) : null}
//               </ScrollView>

//               {/* 🪩 Frosted Bottom Panel */}
//               <Animatable.View
//                 animation="fadeInUp"
//                 delay={400}
//                 duration={700}
//                 style={{
//                   position: 'absolute',
//                   bottom: 0,
//                   width: '100%',
//                   // paddingVertical: 28,
//                   // paddingHorizontal: 24,
//                   // borderTopLeftRadius: 26,
//                   // borderTopRightRadius: 26,
//                   // backgroundColor:
//                   //   Platform.OS === 'android'
//                   //     ? 'rgba(20,20,20,0.9)'
//                   //     : 'transparent',
//                   // shadowColor: '#000',
//                   // shadowOpacity: 0.4,
//                   // shadowRadius: 30,
//                   // shadowOffset: {width: 0, height: -10},
//                 }}>
//                 {Platform.OS === 'ios' && (
//                   <BlurView
//                     style={StyleSheet.absoluteFill}
//                     blurType="systemMaterialDark"
//                     blurAmount={30}
//                   />
//                 )}
//               </Animatable.View>
//             </Animated.View>
//           </SafeAreaView>
//         )}
//       </Modal>
//     </SafeAreaView>
//     // </GradientBackground>
//   );
// }

/////////////////////

// import React, {useEffect, useRef, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   SafeAreaView,
//   ScrollView,
//   PanResponder,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';
// import {Share} from 'react-native';

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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 8,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 24,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '100%',
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 30,
//       borderTopRightRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 28,
//       paddingHorizontal: 20,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // 👆 put these near your other hooks at the top of the component
//   const translateY = useRef(new Animated.Value(0)).current;

//   const handleClose = useCallback(() => {
//     Animated.timing(translateY, {
//       toValue: Dimensions.get('window').height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         translateY.setValue(0);
//         setFullScreenOutfit(null);
//       }
//     });
//   }, [translateY, setFullScreenOutfit]);
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect(); // ✅ haptic feedback
//   //     const shareMessage = outfit.name
//   //       ? `Check out my outfit "${outfit.name}" 👕 via StylHelpr`
//   //       : 'Check out my outfit 👕 via StylHelpr';

//   //     const imageUrl =
//   //       outfit.top?.image || outfit.bottom?.image || outfit.shoes?.image;

//   //     await Share.share({
//   //       message: shareMessage,
//   //       url: imageUrl,
//   //       title: 'Share Your Look',
//   //     });

//   //     h('selection'); // ✅ subtle tap after share
//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });

//   //     console.log('✅ Shared successfully');
//   //   } catch (error) {
//   //     console.error('❌ Error sharing look:', error);
//   //   }
//   // };

//   // const handleShareOutfit = async (outfit: SavedOutfit) => {
//   //   try {
//   //     hSelect();
//   //     const ref = viewRefs.current[outfit.id];
//   //     if (!ref) return;

//   //     // 🧩 Capture outfit card as image
//   //     const uri = await ref.capture();

//   //     await Share.share({
//   //       url: uri,
//   //       message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//   //       title: 'Share Your Look',
//   //     });

//   //     Toast.show('Look shared successfully ✅', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   } catch (err) {
//   //     console.error('❌ Error sharing look:', err);
//   //     Toast.show('Error sharing look ❌', {
//   //       duration: Toast.durations.SHORT,
//   //       position: Toast.positions.BOTTOM,
//   //     });
//   //   }
//   // };

//   const handleShareOutfit = async (outfit: SavedOutfit) => {
//     try {
//       // ✅ subtle tap
//       ReactNativeHapticFeedback.trigger('impactLight', {
//         enableVibrateFallback: true,
//         ignoreAndroidSystemSettings: false,
//       });

//       const ref = viewRefs.current[outfit.id];
//       if (!ref) return;

//       // 🧩 Create a temp view with watermark overlay for capture
//       const watermarkedRef = React.createRef<ViewShot>();
//       const WatermarkedCard = (
//         <ViewShot ref={watermarkedRef} options={{format: 'png', quality: 0.95}}>
//           <View
//             style={{
//               backgroundColor: '#000',
//               borderRadius: 24,
//               overflow: 'hidden',
//             }}>
//             {/* ✅ Reuse your card snapshot */}
//             <Image
//               source={{uri: await ref.capture()}}
//               style={{width: '100%', aspectRatio: 1, borderRadius: 24}}
//               resizeMode="cover"
//             />
//             {/* 💧 StylHelpr watermark */}
//             <View
//               style={{
//                 position: 'absolute',
//                 bottom: 12,
//                 right: 12,
//                 backgroundColor: 'rgba(0,0,0,0.5)',
//                 paddingHorizontal: 10,
//                 paddingVertical: 6,
//                 borderRadius: 12,
//               }}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   fontSize: 12,
//                   fontWeight: '700',
//                   letterSpacing: 0.3,
//                 }}>
//                 StylHelpr
//               </Text>
//             </View>
//           </View>
//         </ViewShot>
//       );

//       // capture new watermarked image
//       const watermarkedUri = await ref.capture();

//       // 📨 open native iOS share sheet
//       await Share.share({
//         url: watermarkedUri,
//         message: `Check out my outfit "${outfit.name || ''}" 👕 via StylHelpr`,
//         title: 'Share Your Look',
//       });

//       // ✅ nice toast feedback
//       Toast.show('Look shared successfully ✅', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     } catch (err) {
//       console.error('❌ Error sharing look:', err);
//       Toast.show('Error sharing look ❌', {
//         duration: Toast.durations.SHORT,
//         position: Toast.positions.BOTTOM,
//       });
//     }
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     <View
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* 📱 Header */}
//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         delay={100}
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Animatable.Text> */}

//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       {/* 🔀 Sort Bar */}
//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         <View
//           style={{
//             justifyContent: 'center',
//             // alignItems: 'center',
//             // paddingLeft: 5,
//           }}>
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               // paddingVertical: 2,
//             }}>
//             {(
//               [
//                 {key: 'newest', label: 'Newest'},
//                 {key: 'favorites', label: 'Favorites'},
//                 {key: 'planned', label: 'Planned'},
//                 {key: 'stars', label: 'Rating'},
//               ] as const
//             ).map(({key, label}, idx) => (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic"
//                 style={{marginRight: 7}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     // paddingHorizontal: 16,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: 92,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     // shadowColor: '#000',
//                     // shadowOpacity: 0.15,
//                     // shadowRadius: 6,
//                     // shadowOffset: {width: 0, height: 2},
//                   }}>
//                   <Text
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <SwipeableCard
//                   key={outfit.id}
//                   deleteThreshold={0.15}
//                   onSwipeLeft={() => {
//                     setPendingDeleteId(outfit.id);
//                     setShowDeleteConfirm(true);
//                   }}
//                   deleteBackground={
//                     <View
//                       style={{
//                         flex: 1,
//                         alignItems: 'flex-end',
//                         justifyContent: 'center',
//                         paddingRight: 24,
//                       }}>
//                       <MaterialIcons
//                         name="delete"
//                         size={28}
//                         color={theme.colors.error}
//                       />
//                     </View>
//                   }>
//                   <Animatable.View
//                     key={outfit.id}
//                     animation="fadeInUp"
//                     delay={150 + index * 120}
//                     duration={800}
//                     easing="ease-out-cubic"
//                     style={{transform: [{scale}, {translateY}]}}>
//                     <ViewShot
//                       ref={ref => (viewRefs.current[outfit.id] = ref)}
//                       options={{format: 'png', quality: 0.9}}>
//                       <TouchableOpacity
//                         activeOpacity={0.9}
//                         onPress={() => setFullScreenOutfit(outfit)}
//                         style={[styles.card, globalStyles.cardStyles1]}>
//                         {/* 🧵 Outfit Header Row */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                           }}>
//                           <View style={{flex: 1, marginRight: 12}}>
//                             <Text
//                               style={[
//                                 globalStyles.titleBold,
//                                 {fontSize: 20, color: theme.colors.foreground},
//                               ]}>
//                               {outfit.name?.trim() || 'Unnamed Outfit'}
//                             </Text>

//                             {/* 🗓️ Date & Time Info */}
//                             {(outfit.createdAt || outfit.plannedDate) && (
//                               <View style={{marginTop: 6}}>
//                                 {outfit.plannedDate && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 13,
//                                         fontWeight: '600',
//                                         color: theme.colors.foreground2,
//                                       },
//                                     ]}>
//                                     {`Planned for ${new Date(
//                                       outfit.plannedDate,
//                                     ).toLocaleString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       hour: 'numeric',
//                                       minute: '2-digit',
//                                     })}`}
//                                   </Text>
//                                 )}
//                                 {outfit.createdAt && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 12,
//                                         color: theme.colors.muted,
//                                       },
//                                     ]}>
//                                     {`Saved ${new Date(
//                                       outfit.createdAt,
//                                     ).toLocaleDateString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       year: 'numeric',
//                                     })}`}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </View>

//                           {/* ❤️ & ✏️ Buttons */}
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                             }}>
//                             {/* ✏️ Edit */}
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 hSelect();
//                                 setEditingOutfitId(outfit.id);
//                                 setEditedName(outfit.name || '');
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginRight: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="edit"
//                                 size={20}
//                                 color={theme.colors.foreground}
//                               />
//                             </AppleTouchFeedback>

//                             {/* ❤️ Favorite */}
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 hSelect();
//                                 toggleFavorite(
//                                   outfit.id,
//                                   outfit.type === 'custom'
//                                     ? 'custom'
//                                     : 'suggestion',
//                                   setCombinedOutfits,
//                                 );
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={20}
//                                 color={
//                                   favorites.some(
//                                     f =>
//                                       f.id === outfit.id &&
//                                       f.source ===
//                                         (outfit.type === 'custom'
//                                           ? 'custom'
//                                           : 'suggestion'),
//                                   )
//                                     ? 'red'
//                                     : theme.colors.foreground
//                                 }
//                               />
//                             </AppleTouchFeedback>
//                             {/* 📤 Share */}
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={() => handleShareOutfit(outfit)}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginLeft: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="ios-share"
//                                 size={20}
//                                 color={theme.colors.primary}
//                               />
//                             </AppleTouchFeedback>
//                           </View>
//                         </View>

//                         {/* 👕 Outfit Images */}
//                         <View style={styles.imageRow}>
//                           {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                             i?.image ? (
//                               <Image
//                                 key={i.id}
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {
//                                     marginRight: 12,
//                                     borderRadius: 12,
//                                     marginBottom: 8,
//                                     marginTop: -6,
//                                   },
//                                 ]}
//                               />
//                             ) : null,
//                           )}
//                         </View>

//                         {/* 📝 Notes */}
//                         {outfit.notes?.trim() && (
//                           <Text style={styles.notes}>
//                             “{outfit.notes.trim()}”
//                           </Text>
//                         )}

//                         {/* 📅 Schedule & Cancel Buttons – keep them working */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             flexWrap: 'wrap',
//                             marginTop: 10,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={e => {
//                               setPlanningOutfitId(outfit.id);
//                               const now = new Date();
//                               setSelectedTempDate(now);
//                               setSelectedTempTime(now);
//                               setShowDatePicker(true);
//                             }}
//                             style={{
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 18,
//                               paddingVertical: 8,
//                               paddingHorizontal: 12,
//                               marginRight: 10,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               📅 Schedule This Outfit
//                             </Text>
//                           </AppleTouchFeedback>

//                           {outfit.plannedDate && (
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 cancelPlannedOutfit(outfit.id);
//                               }}
//                               style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 paddingVertical: 7,
//                                 paddingHorizontal: 12,
//                                 borderRadius: 18,
//                                 backgroundColor:
//                                   theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="close"
//                                 size={19}
//                                 color="red"
//                                 style={{marginRight: 6}}
//                               />
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                 }}>
//                                 Cancel Schedule
//                               </Text>
//                             </AppleTouchFeedback>
//                           )}
//                         </View>

//                         {/* 🏷️ Tags */}
//                         {(outfit.tags || []).length > 0 && (
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               flexWrap: 'wrap',
//                               marginTop: 8,
//                             }}>
//                             {outfit.tags?.map(tag => (
//                               <View
//                                 key={tag}
//                                 style={{
//                                   paddingHorizontal: 10,
//                                   paddingVertical: 6,
//                                   backgroundColor:
//                                     theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                   borderRadius: 16,
//                                   marginRight: 6,
//                                   marginBottom: 6,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     fontSize: 12,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   #{tag}
//                                 </Text>
//                               </View>
//                             ))}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                     </ViewShot>
//                   </Animatable.View>
//                 </SwipeableCard>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.buttonText1, fontWeight: '800'}}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       {showDeleteConfirm && pendingDeleteId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
//       <Modal
//         visible={!!fullScreenOutfit}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setFullScreenOutfit(null)}>
//         {fullScreenOutfit && (
//           <SafeAreaView style={{flex: 1, backgroundColor: 'transparent'}}>
//             <Animated.View
//               style={{
//                 flex: 1,
//                 backgroundColor: '#000',
//                 transform: [{translateY}],
//                 width: '100%',
//                 height: '100%',
//               }}>
//               {/* ✨ Backdrop */}
//               <Animatable.View
//                 animation="fadeIn"
//                 duration={300}
//                 style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}]}
//               />

//               {/* ✖️ Close Button ABOVE gesture zone */}
//               <TouchableOpacity
//                 style={{
//                   position: 'absolute',
//                   top: 0,
//                   right: 20,
//                   zIndex: 20,
//                   backgroundColor: 'rgba(0,0,0,0.5)',
//                   borderRadius: 50,
//                   paddingHorizontal: 8,
//                   paddingVertical: 6,
//                 }}
//                 onPress={handleClose}
//                 hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//                 <Text style={{color: '#fff', fontSize: 20}}>✕</Text>
//               </TouchableOpacity>

//               {/* 🟥 Swipe Gesture Zone */}
//               <View
//                 {...panResponder.panHandlers}
//                 style={{
//                   position: 'absolute',
//                   top: 28,
//                   height: 280,
//                   width: '100%',
//                   zIndex: 999,
//                   // backgroundColor: 'rgba(255,0,0,0.3)', // debug
//                 }}
//                 onStartShouldSetResponder={() => true}
//               />

//               {/* 📸 Outfit Scroll Content */}
//               <ScrollView
//                 showsVerticalScrollIndicator={false}
//                 style={{flex: 1, width: '100%'}}
//                 contentContainerStyle={{
//                   paddingBottom: 180,
//                   alignItems: 'center',
//                   paddingHorizontal: 24,
//                 }}>
//                 {/* 🧥 Outfit Name */}
//                 <Animatable.Text
//                   animation="fadeInDown"
//                   delay={200}
//                   duration={700}
//                   style={{
//                     fontSize: 28,
//                     fontWeight: '800',
//                     color: '#fff',
//                     textAlign: 'center',
//                     marginTop: 25,
//                     marginBottom: 20,
//                     letterSpacing: 0.5,
//                   }}>
//                   {fullScreenOutfit.name || 'Unnamed Outfit'}
//                 </Animatable.Text>

//                 {/* 👕 Outfit Images */}
//                 {[
//                   fullScreenOutfit.top,
//                   fullScreenOutfit.bottom,
//                   fullScreenOutfit.shoes,
//                 ].map(
//                   (i, idx) =>
//                     i?.image && (
//                       <Animatable.Image
//                         key={i.id || idx}
//                         source={{uri: i.image}}
//                         animation="fadeInUp"
//                         delay={300 + idx * 200}
//                         duration={800}
//                         style={{
//                           width: '100%',
//                           height: 400,
//                           maxWidth: 400,
//                           borderRadius: 20,
//                           marginBottom: 28,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.35,
//                           shadowRadius: 24,
//                           shadowOffset: {width: 0, height: 14},
//                         }}
//                         resizeMode="cover"
//                       />
//                     ),
//                 )}

//                 {/* 📝 Notes */}
//                 {fullScreenOutfit.notes?.trim() && (
//                   <Animatable.Text
//                     animation="fadeInUp"
//                     delay={700}
//                     duration={800}
//                     style={{
//                       fontStyle: 'italic',
//                       fontSize: 16,
//                       color: 'rgba(255,255,255,0.9)',
//                       textAlign: 'center',
//                       marginTop: 10,
//                       lineHeight: 22,
//                     }}>
//                     “{fullScreenOutfit.notes.trim()}”
//                   </Animatable.Text>
//                 )}

//                 {/* 🏷️ Tags */}
//                 {fullScreenOutfit.tags?.length ? (
//                   <Animatable.View
//                     animation="fadeInUp"
//                     delay={900}
//                     duration={800}
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       justifyContent: 'center',
//                       marginTop: 24,
//                     }}>
//                     {fullScreenOutfit.tags.map(tag => (
//                       <View
//                         key={tag}
//                         style={{
//                           backgroundColor: 'rgba(255,255,255,0.1)',
//                           borderRadius: 20,
//                           paddingHorizontal: 14,
//                           paddingVertical: 6,
//                           margin: 6,
//                         }}>
//                         <Text
//                           style={{
//                             color: '#fff',
//                             fontSize: 14,
//                             fontWeight: '600',
//                             letterSpacing: 0.2,
//                           }}>
//                           #{tag}
//                         </Text>
//                       </View>
//                     ))}
//                   </Animatable.View>
//                 ) : null}
//               </ScrollView>

//               {/* 🪩 Frosted Bottom Panel */}
//               <Animatable.View
//                 animation="fadeInUp"
//                 delay={400}
//                 duration={700}
//                 style={{
//                   position: 'absolute',
//                   bottom: 0,
//                   width: '100%',
//                   // paddingVertical: 28,
//                   // paddingHorizontal: 24,
//                   // borderTopLeftRadius: 26,
//                   // borderTopRightRadius: 26,
//                   // backgroundColor:
//                   //   Platform.OS === 'android'
//                   //     ? 'rgba(20,20,20,0.9)'
//                   //     : 'transparent',
//                   // shadowColor: '#000',
//                   // shadowOpacity: 0.4,
//                   // shadowRadius: 30,
//                   // shadowOffset: {width: 0, height: -10},
//                 }}>
//                 {Platform.OS === 'ios' && (
//                   <BlurView
//                     style={StyleSheet.absoluteFill}
//                     blurType="systemMaterialDark"
//                     blurAmount={30}
//                   />
//                 )}
//               </Animatable.View>
//             </Animated.View>
//           </SafeAreaView>
//         )}
//       </Modal>
//     </View>
//   );
// }

///////////////////////

// import React, {useEffect, useRef, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   SafeAreaView,
//   ScrollView,
//   PanResponder,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';

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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 8,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 24,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '100%',
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 30,
//       borderTopRightRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 28,
//       paddingHorizontal: 20,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   // 👆 put these near your other hooks at the top of the component
//   const translateY = useRef(new Animated.Value(0)).current;

//   const handleClose = useCallback(() => {
//     Animated.timing(translateY, {
//       toValue: Dimensions.get('window').height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         translateY.setValue(0);
//         setFullScreenOutfit(null);
//       }
//     });
//   }, [translateY, setFullScreenOutfit]);
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     <View
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* 📱 Header */}
//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         delay={100}
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Animatable.Text> */}

//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       {/* 🔀 Sort Bar */}
//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         <View
//           style={{
//             justifyContent: 'center',
//             // alignItems: 'center',
//             // paddingLeft: 5,
//           }}>
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               // paddingVertical: 2,
//             }}>
//             {(
//               [
//                 {key: 'newest', label: 'Newest'},
//                 {key: 'favorites', label: 'Favorites'},
//                 {key: 'planned', label: 'Planned'},
//                 {key: 'stars', label: 'Rating'},
//               ] as const
//             ).map(({key, label}, idx) => (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic"
//                 style={{marginRight: 7}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     // paddingHorizontal: 16,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: 92,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     // shadowColor: '#000',
//                     // shadowOpacity: 0.15,
//                     // shadowRadius: 6,
//                     // shadowOffset: {width: 0, height: 2},
//                   }}>
//                   <Text
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <SwipeableCard
//                   key={outfit.id}
//                   deleteThreshold={0.15}
//                   onSwipeLeft={() => {
//                     setPendingDeleteId(outfit.id);
//                     setShowDeleteConfirm(true);
//                   }}
//                   deleteBackground={
//                     <View
//                       style={{
//                         flex: 1,
//                         alignItems: 'flex-end',
//                         justifyContent: 'center',
//                         paddingRight: 24,
//                       }}>
//                       <MaterialIcons
//                         name="delete"
//                         size={28}
//                         color={theme.colors.error}
//                       />
//                     </View>
//                   }>
//                   <Animatable.View
//                     key={outfit.id}
//                     animation="fadeInUp"
//                     delay={150 + index * 120}
//                     duration={800}
//                     easing="ease-out-cubic"
//                     style={{transform: [{scale}, {translateY}]}}>
//                     <ViewShot
//                       ref={ref => (viewRefs.current[outfit.id] = ref)}
//                       options={{format: 'png', quality: 0.9}}>
//                       <TouchableOpacity
//                         activeOpacity={0.9}
//                         onPress={() => setFullScreenOutfit(outfit)}
//                         style={[styles.card, globalStyles.cardStyles1]}>
//                         {/* 🧵 Outfit Header Row */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                           }}>
//                           <View style={{flex: 1, marginRight: 12}}>
//                             <Text
//                               style={[
//                                 globalStyles.titleBold,
//                                 {fontSize: 20, color: theme.colors.foreground},
//                               ]}>
//                               {outfit.name?.trim() || 'Unnamed Outfit'}
//                             </Text>

//                             {/* 🗓️ Date & Time Info */}
//                             {(outfit.createdAt || outfit.plannedDate) && (
//                               <View style={{marginTop: 6}}>
//                                 {outfit.plannedDate && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 13,
//                                         fontWeight: '600',
//                                         color: theme.colors.foreground2,
//                                       },
//                                     ]}>
//                                     {`Planned for ${new Date(
//                                       outfit.plannedDate,
//                                     ).toLocaleString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       hour: 'numeric',
//                                       minute: '2-digit',
//                                     })}`}
//                                   </Text>
//                                 )}
//                                 {outfit.createdAt && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 12,
//                                         color: theme.colors.muted,
//                                       },
//                                     ]}>
//                                     {`Saved ${new Date(
//                                       outfit.createdAt,
//                                     ).toLocaleDateString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       year: 'numeric',
//                                     })}`}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </View>

//                           {/* ❤️ & ✏️ Buttons */}
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                             }}>
//                             {/* ✏️ Edit */}
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 hSelect();
//                                 setEditingOutfitId(outfit.id);
//                                 setEditedName(outfit.name || '');
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginRight: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="edit"
//                                 size={20}
//                                 color={theme.colors.foreground}
//                               />
//                             </AppleTouchFeedback>

//                             {/* ❤️ Favorite */}
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 hSelect();
//                                 toggleFavorite(
//                                   outfit.id,
//                                   outfit.type === 'custom'
//                                     ? 'custom'
//                                     : 'suggestion',
//                                   setCombinedOutfits,
//                                 );
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={20}
//                                 color={
//                                   favorites.some(
//                                     f =>
//                                       f.id === outfit.id &&
//                                       f.source ===
//                                         (outfit.type === 'custom'
//                                           ? 'custom'
//                                           : 'suggestion'),
//                                   )
//                                     ? 'red'
//                                     : theme.colors.foreground
//                                 }
//                               />
//                             </AppleTouchFeedback>
//                           </View>
//                         </View>

//                         {/* 👕 Outfit Images */}
//                         <View style={styles.imageRow}>
//                           {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                             i?.image ? (
//                               <Image
//                                 key={i.id}
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {
//                                     marginRight: 12,
//                                     borderRadius: 12,
//                                     marginBottom: 8,
//                                     marginTop: -6,
//                                   },
//                                 ]}
//                               />
//                             ) : null,
//                           )}
//                         </View>

//                         {/* 📝 Notes */}
//                         {outfit.notes?.trim() && (
//                           <Text style={styles.notes}>
//                             “{outfit.notes.trim()}”
//                           </Text>
//                         )}

//                         {/* 📅 Schedule & Cancel Buttons – keep them working */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             flexWrap: 'wrap',
//                             marginTop: 10,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={e => {
//                               setPlanningOutfitId(outfit.id);
//                               const now = new Date();
//                               setSelectedTempDate(now);
//                               setSelectedTempTime(now);
//                               setShowDatePicker(true);
//                             }}
//                             style={{
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 18,
//                               paddingVertical: 8,
//                               paddingHorizontal: 12,
//                               marginRight: 10,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               📅 Schedule This Outfit
//                             </Text>
//                           </AppleTouchFeedback>

//                           {outfit.plannedDate && (
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 cancelPlannedOutfit(outfit.id);
//                               }}
//                               style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 paddingVertical: 7,
//                                 paddingHorizontal: 12,
//                                 borderRadius: 18,
//                                 backgroundColor:
//                                   theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="close"
//                                 size={19}
//                                 color="red"
//                                 style={{marginRight: 6}}
//                               />
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                 }}>
//                                 Cancel Schedule
//                               </Text>
//                             </AppleTouchFeedback>
//                           )}
//                         </View>

//                         {/* 🏷️ Tags */}
//                         {(outfit.tags || []).length > 0 && (
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               flexWrap: 'wrap',
//                               marginTop: 8,
//                             }}>
//                             {outfit.tags?.map(tag => (
//                               <View
//                                 key={tag}
//                                 style={{
//                                   paddingHorizontal: 10,
//                                   paddingVertical: 6,
//                                   backgroundColor:
//                                     theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                   borderRadius: 16,
//                                   marginRight: 6,
//                                   marginBottom: 6,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     fontSize: 12,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   #{tag}
//                                 </Text>
//                               </View>
//                             ))}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                     </ViewShot>
//                   </Animatable.View>
//                 </SwipeableCard>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.buttonText1, fontWeight: '800'}}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       {showDeleteConfirm && pendingDeleteId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
//       <Modal
//         visible={!!fullScreenOutfit}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setFullScreenOutfit(null)}>
//         {fullScreenOutfit && (
//           <SafeAreaView style={{flex: 1, backgroundColor: 'transparent'}}>
//             <Animated.View
//               style={{
//                 flex: 1,
//                 backgroundColor: '#000',
//                 transform: [{translateY}],
//                 width: '100%',
//                 height: '100%',
//               }}>
//               {/* ✨ Backdrop */}
//               <Animatable.View
//                 animation="fadeIn"
//                 duration={300}
//                 style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}]}
//               />

//               {/* ✖️ Close Button ABOVE gesture zone */}
//               <TouchableOpacity
//                 style={{
//                   position: 'absolute',
//                   top: 0,
//                   right: 20,
//                   zIndex: 20,
//                   backgroundColor: 'rgba(0,0,0,0.5)',
//                   borderRadius: 50,
//                   paddingHorizontal: 8,
//                   paddingVertical: 6,
//                 }}
//                 onPress={handleClose}
//                 hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//                 <Text style={{color: '#fff', fontSize: 20}}>✕</Text>
//               </TouchableOpacity>

//               {/* 🟥 Swipe Gesture Zone */}
//               <View
//                 {...panResponder.panHandlers}
//                 style={{
//                   position: 'absolute',
//                   top: 28,
//                   height: 280,
//                   width: '100%',
//                   zIndex: 999,
//                   // backgroundColor: 'rgba(255,0,0,0.3)', // debug
//                 }}
//                 onStartShouldSetResponder={() => true}
//               />

//               {/* 📸 Outfit Scroll Content */}
//               <ScrollView
//                 showsVerticalScrollIndicator={false}
//                 style={{flex: 1, width: '100%'}}
//                 contentContainerStyle={{
//                   paddingBottom: 180,
//                   alignItems: 'center',
//                   paddingHorizontal: 24,
//                 }}>
//                 {/* 🧥 Outfit Name */}
//                 <Animatable.Text
//                   animation="fadeInDown"
//                   delay={200}
//                   duration={700}
//                   style={{
//                     fontSize: 28,
//                     fontWeight: '800',
//                     color: '#fff',
//                     textAlign: 'center',
//                     marginTop: 25,
//                     marginBottom: 20,
//                     letterSpacing: 0.5,
//                   }}>
//                   {fullScreenOutfit.name || 'Unnamed Outfit'}
//                 </Animatable.Text>

//                 {/* 👕 Outfit Images */}
//                 {[
//                   fullScreenOutfit.top,
//                   fullScreenOutfit.bottom,
//                   fullScreenOutfit.shoes,
//                 ].map(
//                   (i, idx) =>
//                     i?.image && (
//                       <Animatable.Image
//                         key={i.id || idx}
//                         source={{uri: i.image}}
//                         animation="fadeInUp"
//                         delay={300 + idx * 200}
//                         duration={800}
//                         style={{
//                           width: '100%',
//                           height: 400,
//                           maxWidth: 400,
//                           borderRadius: 20,
//                           marginBottom: 28,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.35,
//                           shadowRadius: 24,
//                           shadowOffset: {width: 0, height: 14},
//                         }}
//                         resizeMode="cover"
//                       />
//                     ),
//                 )}

//                 {/* 📝 Notes */}
//                 {fullScreenOutfit.notes?.trim() && (
//                   <Animatable.Text
//                     animation="fadeInUp"
//                     delay={700}
//                     duration={800}
//                     style={{
//                       fontStyle: 'italic',
//                       fontSize: 16,
//                       color: 'rgba(255,255,255,0.9)',
//                       textAlign: 'center',
//                       marginTop: 10,
//                       lineHeight: 22,
//                     }}>
//                     “{fullScreenOutfit.notes.trim()}”
//                   </Animatable.Text>
//                 )}

//                 {/* 🏷️ Tags */}
//                 {fullScreenOutfit.tags?.length ? (
//                   <Animatable.View
//                     animation="fadeInUp"
//                     delay={900}
//                     duration={800}
//                     style={{
//                       flexDirection: 'row',
//                       flexWrap: 'wrap',
//                       justifyContent: 'center',
//                       marginTop: 24,
//                     }}>
//                     {fullScreenOutfit.tags.map(tag => (
//                       <View
//                         key={tag}
//                         style={{
//                           backgroundColor: 'rgba(255,255,255,0.1)',
//                           borderRadius: 20,
//                           paddingHorizontal: 14,
//                           paddingVertical: 6,
//                           margin: 6,
//                         }}>
//                         <Text
//                           style={{
//                             color: '#fff',
//                             fontSize: 14,
//                             fontWeight: '600',
//                             letterSpacing: 0.2,
//                           }}>
//                           #{tag}
//                         </Text>
//                       </View>
//                     ))}
//                   </Animatable.View>
//                 ) : null}
//               </ScrollView>

//               {/* 🪩 Frosted Bottom Panel */}
//               <Animatable.View
//                 animation="fadeInUp"
//                 delay={400}
//                 duration={700}
//                 style={{
//                   position: 'absolute',
//                   bottom: 0,
//                   width: '100%',
//                   // paddingVertical: 28,
//                   // paddingHorizontal: 24,
//                   // borderTopLeftRadius: 26,
//                   // borderTopRightRadius: 26,
//                   // backgroundColor:
//                   //   Platform.OS === 'android'
//                   //     ? 'rgba(20,20,20,0.9)'
//                   //     : 'transparent',
//                   // shadowColor: '#000',
//                   // shadowOpacity: 0.4,
//                   // shadowRadius: 30,
//                   // shadowOffset: {width: 0, height: -10},
//                 }}>
//                 {Platform.OS === 'ios' && (
//                   <BlurView
//                     style={StyleSheet.absoluteFill}
//                     blurType="systemMaterialDark"
//                     blurAmount={30}
//                   />
//                 )}
//               </Animatable.View>
//             </Animated.View>
//           </SafeAreaView>
//         )}
//       </Modal>
//     </View>
//   );
// }

/////////////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   ScrollView,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';

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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 8,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 24,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '100%',
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 30,
//       borderTopRightRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 28,
//       paddingHorizontal: 20,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     <View
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* 📱 Header */}
//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         delay={100}
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Animatable.Text> */}

//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       {/* 🔀 Sort Bar */}
//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         <View
//           style={{
//             justifyContent: 'center',
//             // alignItems: 'center',
//             // paddingLeft: 5,
//           }}>
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               // paddingVertical: 2,
//             }}>
//             {(
//               [
//                 {key: 'newest', label: 'Newest'},
//                 {key: 'favorites', label: 'Favorites'},
//                 {key: 'planned', label: 'Planned'},
//                 {key: 'stars', label: 'Rating'},
//               ] as const
//             ).map(({key, label}, idx) => (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic"
//                 style={{marginRight: 7}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     // paddingHorizontal: 16,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: 92,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     // shadowColor: '#000',
//                     // shadowOpacity: 0.15,
//                     // shadowRadius: 6,
//                     // shadowOffset: {width: 0, height: 2},
//                   }}>
//                   <Text
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <SwipeableCard
//                   key={outfit.id}
//                   deleteThreshold={0.15}
//                   onSwipeLeft={() => {
//                     setPendingDeleteId(outfit.id);
//                     setShowDeleteConfirm(true);
//                   }}
//                   deleteBackground={
//                     <View
//                       style={{
//                         flex: 1,
//                         alignItems: 'flex-end',
//                         justifyContent: 'center',
//                         paddingRight: 24,
//                       }}>
//                       <MaterialIcons
//                         name="delete"
//                         size={28}
//                         color={theme.colors.error}
//                       />
//                     </View>
//                   }>
//                   <Animatable.View
//                     key={outfit.id}
//                     animation="fadeInUp"
//                     delay={150 + index * 120}
//                     duration={800}
//                     easing="ease-out-cubic"
//                     style={{transform: [{scale}, {translateY}]}}>
//                     <ViewShot
//                       ref={ref => (viewRefs.current[outfit.id] = ref)}
//                       options={{format: 'png', quality: 0.9}}>
//                       <TouchableOpacity
//                         activeOpacity={0.9}
//                         onPress={() => setFullScreenOutfit(outfit)}
//                         style={[styles.card, globalStyles.cardStyles1]}>
//                         {/* 🧵 Outfit Header Row */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                           }}>
//                           <View style={{flex: 1, marginRight: 12}}>
//                             <Text
//                               style={[
//                                 globalStyles.titleBold,
//                                 {fontSize: 20, color: theme.colors.foreground},
//                               ]}>
//                               {outfit.name?.trim() || 'Unnamed Outfit'}
//                             </Text>

//                             {/* 🗓️ Date & Time Info */}
//                             {(outfit.createdAt || outfit.plannedDate) && (
//                               <View style={{marginTop: 6}}>
//                                 {outfit.plannedDate && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 13,
//                                         fontWeight: '600',
//                                         color: theme.colors.foreground2,
//                                       },
//                                     ]}>
//                                     {`Planned for ${new Date(
//                                       outfit.plannedDate,
//                                     ).toLocaleString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       hour: 'numeric',
//                                       minute: '2-digit',
//                                     })}`}
//                                   </Text>
//                                 )}
//                                 {outfit.createdAt && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 12,
//                                         color: theme.colors.muted,
//                                       },
//                                     ]}>
//                                     {`Saved ${new Date(
//                                       outfit.createdAt,
//                                     ).toLocaleDateString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       year: 'numeric',
//                                     })}`}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </View>

//                           {/* ❤️ & ✏️ Buttons */}
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                             }}>
//                             {/* ✏️ Edit */}
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 hSelect();
//                                 setEditingOutfitId(outfit.id);
//                                 setEditedName(outfit.name || '');
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 marginRight: 6,
//                               }}>
//                               <MaterialIcons
//                                 name="edit"
//                                 size={20}
//                                 color={theme.colors.foreground}
//                               />
//                             </AppleTouchFeedback>

//                             {/* ❤️ Favorite */}
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 hSelect();
//                                 toggleFavorite(
//                                   outfit.id,
//                                   outfit.type === 'custom'
//                                     ? 'custom'
//                                     : 'suggestion',
//                                   setCombinedOutfits,
//                                 );
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={20}
//                                 color={
//                                   favorites.some(
//                                     f =>
//                                       f.id === outfit.id &&
//                                       f.source ===
//                                         (outfit.type === 'custom'
//                                           ? 'custom'
//                                           : 'suggestion'),
//                                   )
//                                     ? 'red'
//                                     : theme.colors.foreground
//                                 }
//                               />
//                             </AppleTouchFeedback>
//                           </View>
//                         </View>

//                         {/* 👕 Outfit Images */}
//                         <View style={styles.imageRow}>
//                           {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                             i?.image ? (
//                               <Image
//                                 key={i.id}
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {
//                                     marginRight: 12,
//                                     borderRadius: 12,
//                                     marginBottom: 8,
//                                     marginTop: -6,
//                                   },
//                                 ]}
//                               />
//                             ) : null,
//                           )}
//                         </View>

//                         {/* 📝 Notes */}
//                         {outfit.notes?.trim() && (
//                           <Text style={styles.notes}>
//                             “{outfit.notes.trim()}”
//                           </Text>
//                         )}

//                         {/* 📅 Schedule & Cancel Buttons – keep them working */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             flexWrap: 'wrap',
//                             marginTop: 10,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={e => {
//                               setPlanningOutfitId(outfit.id);
//                               const now = new Date();
//                               setSelectedTempDate(now);
//                               setSelectedTempTime(now);
//                               setShowDatePicker(true);
//                             }}
//                             style={{
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 18,
//                               paddingVertical: 8,
//                               paddingHorizontal: 12,
//                               marginRight: 10,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               📅 Schedule This Outfit
//                             </Text>
//                           </AppleTouchFeedback>

//                           {outfit.plannedDate && (
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={e => {
//                                 cancelPlannedOutfit(outfit.id);
//                               }}
//                               style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 paddingVertical: 7,
//                                 paddingHorizontal: 12,
//                                 borderRadius: 18,
//                                 backgroundColor:
//                                   theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="close"
//                                 size={19}
//                                 color="red"
//                                 style={{marginRight: 6}}
//                               />
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                 }}>
//                                 Cancel Schedule
//                               </Text>
//                             </AppleTouchFeedback>
//                           )}
//                         </View>

//                         {/* 🏷️ Tags */}
//                         {(outfit.tags || []).length > 0 && (
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               flexWrap: 'wrap',
//                               marginTop: 8,
//                             }}>
//                             {outfit.tags?.map(tag => (
//                               <View
//                                 key={tag}
//                                 style={{
//                                   paddingHorizontal: 10,
//                                   paddingVertical: 6,
//                                   backgroundColor:
//                                     theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                   borderRadius: 16,
//                                   marginRight: 6,
//                                   marginBottom: 6,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     fontSize: 12,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   #{tag}
//                                 </Text>
//                               </View>
//                             ))}
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                     </ViewShot>
//                   </Animatable.View>
//                 </SwipeableCard>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.buttonText1, fontWeight: '800'}}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       {showDeleteConfirm && pendingDeleteId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
//       <Modal visible={!!fullScreenOutfit} transparent animationType="fade">
//         {fullScreenOutfit && (
//           <Animatable.View
//             animation="fadeIn"
//             duration={350}
//             style={{
//               flex: 1,
//               backgroundColor: '#000',
//               justifyContent: 'flex-start',
//               alignItems: 'center',
//             }}>
//             {/* ✨ Edge-to-edge full background blur */}
//             <BlurView
//               style={StyleSheet.absoluteFill}
//               blurType="systemUltraThinMaterialDark"
//               blurAmount={30}
//               reducedTransparencyFallbackColor="rgba(0,0,0,0.85)"
//             />

//             {/* ✖️ Close Button */}
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               style={{
//                 position: 'absolute',
//                 top: 60,
//                 left: 150,
//                 zIndex: 10,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 borderRadius: 28,
//                 paddingVertical: 8,
//                 paddingHorizontal: 14,
//                 shadowColor: '#000',
//                 shadowOpacity: 0.25,
//                 shadowRadius: 10,
//               }}
//               onPress={() => setFullScreenOutfit(null)}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   fontSize: 20,
//                   fontWeight: '600',
//                 }}>
//                 ✕
//               </Text>
//             </AppleTouchFeedback>

//             {/* 🧥 Outfit Name */}
//             <Animatable.Text
//               animation="fadeInDown"
//               delay={200}
//               duration={700}
//               style={{
//                 fontSize: 28,
//                 fontWeight: '800',
//                 color: '#fff',
//                 textAlign: 'center',
//                 marginTop: 100,
//                 marginBottom: 20,
//                 letterSpacing: 0.5,
//               }}>
//               {fullScreenOutfit.name || 'Unnamed Outfit'}
//             </Animatable.Text>
//             {/* 📸 Scrollable Outfit Details */}
//             <ScrollView
//               showsVerticalScrollIndicator={false}
//               style={{flex: 1, width: '100%'}}
//               contentContainerStyle={{
//                 paddingBottom: 180,
//                 alignItems: 'center',
//                 paddingHorizontal: 24,
//               }}>
//               {/* 👕 Outfit Images (stacked vertically) */}
//               {[
//                 fullScreenOutfit.top,
//                 fullScreenOutfit.bottom,
//                 fullScreenOutfit.shoes,
//               ].map(
//                 (i, idx) =>
//                   i?.image && (
//                     <Animatable.Image
//                       key={i.id || idx}
//                       source={{uri: i.image}}
//                       animation="fadeInUp"
//                       delay={300 + idx * 200}
//                       duration={800}
//                       style={{
//                         width: '100%',
//                         // aspectRatio: 3 / 4,
//                         height: 400,
//                         maxWidth: 400,
//                         borderRadius: 20,
//                         marginBottom: 28,
//                         shadowColor: '#000',
//                         shadowOpacity: 0.35,
//                         shadowRadius: 24,
//                         shadowOffset: {width: 0, height: 14},
//                       }}
//                       resizeMode="cover"
//                     />
//                   ),
//               )}

//               {/* 📝 Notes */}
//               {fullScreenOutfit.notes?.trim() && (
//                 <Animatable.Text
//                   animation="fadeInUp"
//                   delay={700}
//                   duration={800}
//                   style={{
//                     fontStyle: 'italic',
//                     fontSize: 16,
//                     color: 'rgba(255,255,255,0.9)',
//                     textAlign: 'center',
//                     marginTop: 10,
//                     lineHeight: 22,
//                   }}>
//                   “{fullScreenOutfit.notes.trim()}”
//                 </Animatable.Text>
//               )}

//               {/* 🏷️ Tags */}
//               {fullScreenOutfit.tags?.length ? (
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={900}
//                   duration={800}
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'center',
//                     marginTop: 24,
//                   }}>
//                   {fullScreenOutfit.tags.map(tag => (
//                     <View
//                       key={tag}
//                       style={{
//                         backgroundColor: 'rgba(255,255,255,0.1)',
//                         borderRadius: 20,
//                         paddingHorizontal: 14,
//                         paddingVertical: 6,
//                         margin: 6,
//                       }}>
//                       <Text
//                         style={{
//                           color: '#fff',
//                           fontSize: 14,
//                           fontWeight: '600',
//                           letterSpacing: 0.2,
//                         }}>
//                         #{tag}
//                       </Text>
//                     </View>
//                   ))}
//                 </Animatable.View>
//               ) : null}
//             </ScrollView>
//             {/* 🪩 Frosted Bottom Action Sheet */}
//             <Animatable.View
//               animation="fadeInUp"
//               delay={400}
//               duration={700}
//               style={{
//                 position: 'absolute',
//                 bottom: 0,
//                 width: '100%',
//                 paddingVertical: 28,
//                 paddingHorizontal: 24,
//                 borderTopLeftRadius: 26,
//                 borderTopRightRadius: 26,
//                 backgroundColor:
//                   Platform.OS === 'android'
//                     ? 'rgba(20,20,20,0.9)'
//                     : 'transparent',
//                 shadowColor: '#000',
//                 shadowOpacity: 0.4,
//                 shadowRadius: 30,
//                 shadowOffset: {width: 0, height: -10},
//               }}>
//               {Platform.OS === 'ios' && (
//                 <BlurView
//                   style={StyleSheet.absoluteFill}
//                   blurType="systemMaterialDark"
//                   blurAmount={30}
//                 />
//               )}
//             </Animatable.View>
//           </Animatable.View>
//         )}
//       </Modal>
//     </View>
//   );
// }

//////////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   ScrollView,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import SwipeableCard from '../components/SwipeableCard/SwipeableCard';

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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 8,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 24,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '100%',
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 30,
//       borderTopRightRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 28,
//       paddingHorizontal: 20,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     <View
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* 📱 Header */}
//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         delay={100}
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Animatable.Text> */}

//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       {/* 🔀 Sort Bar */}
//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         <View
//           style={{
//             justifyContent: 'center',
//             // alignItems: 'center',
//             // paddingLeft: 5,
//           }}>
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               // paddingVertical: 2,
//             }}>
//             {(
//               [
//                 {key: 'newest', label: 'Newest'},
//                 {key: 'favorites', label: 'Favorites'},
//                 {key: 'planned', label: 'Planned'},
//                 {key: 'stars', label: 'Rating'},
//               ] as const
//             ).map(({key, label}, idx) => (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic"
//                 style={{marginRight: 7}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     // paddingHorizontal: 16,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: 92,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     // shadowColor: '#000',
//                     // shadowOpacity: 0.15,
//                     // shadowRadius: 6,
//                     // shadowOffset: {width: 0, height: 2},
//                   }}>
//                   <Text
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <SwipeableCard
//                   key={outfit.id}
//                   deleteThreshold={0.15}
//                   onSwipeLeft={() => {
//                     setPendingDeleteId(outfit.id);
//                     setShowDeleteConfirm(true);
//                   }}
//                   deleteBackground={
//                     <View
//                       style={{
//                         flex: 1,
//                         alignItems: 'flex-end',
//                         justifyContent: 'center',
//                         paddingRight: 24,
//                       }}>
//                       <MaterialIcons
//                         name="delete"
//                         size={28}
//                         color={theme.colors.error}
//                       />
//                     </View>
//                   }>
//                   <Animatable.View
//                     key={outfit.id}
//                     animation="fadeInUp"
//                     delay={150 + index * 120}
//                     duration={800}
//                     easing="ease-out-cubic"
//                     style={{transform: [{scale}, {translateY}]}}>
//                     <ViewShot
//                       ref={ref => (viewRefs.current[outfit.id] = ref)}
//                       options={{format: 'png', quality: 0.9}}>
//                       <View style={[styles.card, globalStyles.cardStyles1]}>
//                         {/* 🧵 Outfit Header Row */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                           }}>
//                           <TouchableOpacity
//                             onPress={() => {
//                               hSelect();
//                               setEditingOutfitId(outfit.id);
//                               setEditedName(outfit.name || '');
//                             }}
//                             style={{flex: 1, marginRight: 12}}>
//                             <Text
//                               style={[
//                                 globalStyles.titleBold,
//                                 {fontSize: 20, color: theme.colors.foreground},
//                               ]}>
//                               {outfit.name?.trim() || 'Unnamed Outfit'}
//                             </Text>

//                             {/* 🗓️ Date & Time Info */}
//                             {(outfit.createdAt || outfit.plannedDate) && (
//                               <View style={{marginTop: 6}}>
//                                 {outfit.plannedDate && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 13,
//                                         fontWeight: '600',
//                                         color: theme.colors.foreground2,
//                                       },
//                                     ]}>
//                                     {`Planned for ${new Date(
//                                       outfit.plannedDate,
//                                     ).toLocaleString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       hour: 'numeric',
//                                       minute: '2-digit',
//                                     })}`}
//                                   </Text>
//                                 )}
//                                 {outfit.createdAt && (
//                                   <Text
//                                     style={[
//                                       styles.timestamp,
//                                       {
//                                         fontSize: 12,
//                                         color: theme.colors.muted,
//                                       },
//                                     ]}>
//                                     {`Saved ${new Date(
//                                       outfit.createdAt,
//                                     ).toLocaleDateString([], {
//                                       month: 'short',
//                                       day: 'numeric',
//                                       year: 'numeric',
//                                     })}`}
//                                   </Text>
//                                 )}
//                               </View>
//                             )}
//                           </TouchableOpacity>

//                           {/* ❤️ & 🗑️ Buttons */}
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                             }}>
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={() => {
//                                 hSelect();
//                                 toggleFavorite(
//                                   outfit.id,
//                                   outfit.type === 'custom'
//                                     ? 'custom'
//                                     : 'suggestion',
//                                   setCombinedOutfits,
//                                 );
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="favorite"
//                                 size={20}
//                                 color={
//                                   favorites.some(
//                                     f =>
//                                       f.id === outfit.id &&
//                                       f.source ===
//                                         (outfit.type === 'custom'
//                                           ? 'custom'
//                                           : 'suggestion'),
//                                   )
//                                     ? 'red'
//                                     : theme.colors.foreground
//                                 }
//                               />
//                             </AppleTouchFeedback>

//                             {/* <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={() => {
//                                 setPendingDeleteId(outfit.id);
//                                 setShowDeleteConfirm(true);
//                               }}
//                               style={{
//                                 padding: 8,
//                                 borderRadius: 14,
//                                 marginLeft: 6,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               }}>
//                               <MaterialIcons
//                                 name="delete"
//                                 size={20}
//                                 color={theme.colors.foreground}
//                               />
//                             </AppleTouchFeedback> */}
//                           </View>
//                         </View>

//                         {/* 👕 Outfit Images */}
//                         <View style={styles.imageRow}>
//                           {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                             i?.image ? (
//                               <AppleTouchFeedback
//                                 key={i.id}
//                                 hapticStyle="impactLight"
//                                 onPress={() => setFullScreenOutfit(outfit)}>
//                                 <Image
//                                   source={{uri: i.image}}
//                                   style={[
//                                     globalStyles.image1,
//                                     {
//                                       marginRight: 12,
//                                       borderRadius: 12,
//                                       marginBottom: 8,
//                                       marginTop: -6,
//                                     },
//                                   ]}
//                                 />
//                               </AppleTouchFeedback>
//                             ) : null,
//                           )}
//                         </View>

//                         {/* 📝 Notes */}
//                         {outfit.notes?.trim() && (
//                           <Text style={styles.notes}>
//                             “{outfit.notes.trim()}”
//                           </Text>
//                         )}

//                         {/* 📅 Schedule & Cancel Buttons */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             flexWrap: 'wrap',
//                             marginTop: 10,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               setPlanningOutfitId(outfit.id);
//                               const now = new Date();
//                               setSelectedTempDate(now);
//                               setSelectedTempTime(now);
//                               setShowDatePicker(true);
//                             }}
//                             style={{
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 18,
//                               paddingVertical: 8,
//                               paddingHorizontal: 12,
//                               marginRight: 10,
//                             }}>
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               📅 Schedule This Outfit
//                             </Text>
//                           </AppleTouchFeedback>

//                           {outfit.plannedDate && (
//                             <AppleTouchFeedback
//                               hapticStyle="impactLight"
//                               onPress={() => cancelPlannedOutfit(outfit.id)} // ✅ correct full cancel flow
//                               style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 paddingVertical: 7,
//                                 paddingHorizontal: 12,
//                                 borderRadius: 18,
//                                 backgroundColor:
//                                   theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                                 // borderWidth: theme.borderWidth.hairline,
//                                 // borderColor: theme.colors.buttonText1,
//                               }}>
//                               <MaterialIcons
//                                 name="close"
//                                 size={19}
//                                 color="red"
//                                 style={{marginRight: 6}}
//                               />
//                               <Text
//                                 style={{
//                                   color: theme.colors.foreground,
//                                   fontWeight: '600',
//                                   fontSize: 13,
//                                 }}>
//                                 Cancel Schedule
//                               </Text>
//                             </AppleTouchFeedback>
//                           )}
//                         </View>

//                         {/* 🏷️ Tags */}
//                         {(outfit.tags || []).length > 0 && (
//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               flexWrap: 'wrap',
//                               marginTop: 8,
//                             }}>
//                             {outfit.tags?.map(tag => (
//                               <View
//                                 key={tag}
//                                 style={{
//                                   paddingHorizontal: 10,
//                                   paddingVertical: 6,
//                                   backgroundColor:
//                                     theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                   borderRadius: 16,
//                                   marginRight: 6,
//                                   marginBottom: 6,
//                                 }}>
//                                 <Text
//                                   style={{
//                                     fontSize: 12,
//                                     color: theme.colors.foreground,
//                                   }}>
//                                   #{tag}
//                                 </Text>
//                               </View>
//                             ))}
//                           </View>
//                         )}
//                       </View>
//                     </ViewShot>
//                   </Animatable.View>
//                 </SwipeableCard>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.buttonText1, fontWeight: '800'}}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       {showDeleteConfirm && pendingDeleteId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
//       <Modal visible={!!fullScreenOutfit} transparent animationType="fade">
//         {fullScreenOutfit && (
//           <Animatable.View
//             animation="fadeIn"
//             duration={350}
//             style={{
//               flex: 1,
//               backgroundColor: '#000',
//               justifyContent: 'flex-start',
//               alignItems: 'center',
//             }}>
//             {/* ✨ Edge-to-edge full background blur */}
//             <BlurView
//               style={StyleSheet.absoluteFill}
//               blurType="systemUltraThinMaterialDark"
//               blurAmount={30}
//               reducedTransparencyFallbackColor="rgba(0,0,0,0.85)"
//             />

//             {/* ✖️ Close Button */}
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               style={{
//                 position: 'absolute',
//                 top: 60,
//                 left: 150,
//                 zIndex: 10,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 borderRadius: 28,
//                 paddingVertical: 8,
//                 paddingHorizontal: 14,
//                 shadowColor: '#000',
//                 shadowOpacity: 0.25,
//                 shadowRadius: 10,
//               }}
//               onPress={() => setFullScreenOutfit(null)}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   fontSize: 20,
//                   fontWeight: '600',
//                 }}>
//                 ✕
//               </Text>
//             </AppleTouchFeedback>

//             {/* 🧥 Outfit Name */}
//             <Animatable.Text
//               animation="fadeInDown"
//               delay={200}
//               duration={700}
//               style={{
//                 fontSize: 28,
//                 fontWeight: '800',
//                 color: '#fff',
//                 textAlign: 'center',
//                 marginTop: 100,
//                 marginBottom: 20,
//                 letterSpacing: 0.5,
//               }}>
//               {fullScreenOutfit.name || 'Unnamed Outfit'}
//             </Animatable.Text>
//             {/* 📸 Scrollable Outfit Details */}
//             <ScrollView
//               showsVerticalScrollIndicator={false}
//               style={{flex: 1, width: '100%'}}
//               contentContainerStyle={{
//                 paddingBottom: 180,
//                 alignItems: 'center',
//                 paddingHorizontal: 24,
//               }}>
//               {/* 👕 Outfit Images (stacked vertically) */}
//               {[
//                 fullScreenOutfit.top,
//                 fullScreenOutfit.bottom,
//                 fullScreenOutfit.shoes,
//               ].map(
//                 (i, idx) =>
//                   i?.image && (
//                     <Animatable.Image
//                       key={i.id || idx}
//                       source={{uri: i.image}}
//                       animation="fadeInUp"
//                       delay={300 + idx * 200}
//                       duration={800}
//                       style={{
//                         width: '100%',
//                         // aspectRatio: 3 / 4,
//                         height: 400,
//                         maxWidth: 400,
//                         borderRadius: 20,
//                         marginBottom: 28,
//                         shadowColor: '#000',
//                         shadowOpacity: 0.35,
//                         shadowRadius: 24,
//                         shadowOffset: {width: 0, height: 14},
//                       }}
//                       resizeMode="cover"
//                     />
//                   ),
//               )}

//               {/* 📝 Notes */}
//               {fullScreenOutfit.notes?.trim() && (
//                 <Animatable.Text
//                   animation="fadeInUp"
//                   delay={700}
//                   duration={800}
//                   style={{
//                     fontStyle: 'italic',
//                     fontSize: 16,
//                     color: 'rgba(255,255,255,0.9)',
//                     textAlign: 'center',
//                     marginTop: 10,
//                     lineHeight: 22,
//                   }}>
//                   “{fullScreenOutfit.notes.trim()}”
//                 </Animatable.Text>
//               )}

//               {/* 🏷️ Tags */}
//               {fullScreenOutfit.tags?.length ? (
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={900}
//                   duration={800}
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'center',
//                     marginTop: 24,
//                   }}>
//                   {fullScreenOutfit.tags.map(tag => (
//                     <View
//                       key={tag}
//                       style={{
//                         backgroundColor: 'rgba(255,255,255,0.1)',
//                         borderRadius: 20,
//                         paddingHorizontal: 14,
//                         paddingVertical: 6,
//                         margin: 6,
//                       }}>
//                       <Text
//                         style={{
//                           color: '#fff',
//                           fontSize: 14,
//                           fontWeight: '600',
//                           letterSpacing: 0.2,
//                         }}>
//                         #{tag}
//                       </Text>
//                     </View>
//                   ))}
//                 </Animatable.View>
//               ) : null}
//             </ScrollView>
//             {/* 🪩 Frosted Bottom Action Sheet */}
//             <Animatable.View
//               animation="fadeInUp"
//               delay={400}
//               duration={700}
//               style={{
//                 position: 'absolute',
//                 bottom: 0,
//                 width: '100%',
//                 paddingVertical: 28,
//                 paddingHorizontal: 24,
//                 borderTopLeftRadius: 26,
//                 borderTopRightRadius: 26,
//                 backgroundColor:
//                   Platform.OS === 'android'
//                     ? 'rgba(20,20,20,0.9)'
//                     : 'transparent',
//                 shadowColor: '#000',
//                 shadowOpacity: 0.4,
//                 shadowRadius: 30,
//                 shadowOffset: {width: 0, height: -10},
//               }}>
//               {Platform.OS === 'ios' && (
//                 <BlurView
//                   style={StyleSheet.absoluteFill}
//                   blurType="systemMaterialDark"
//                   blurAmount={30}
//                 />
//               )}
//             </Animatable.View>
//           </Animatable.View>
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
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   ScrollView,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
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
//   plannedDate?: string;
//   type: 'custom' | 'ai';
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 8,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 24,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '100%',
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 30,
//       borderTopRightRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 28,
//       paddingHorizontal: 20,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     <View
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* 📱 Header */}
//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         delay={100}
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Animatable.Text> */}

//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       {/* 🔀 Sort Bar */}
//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         <View
//           style={{
//             justifyContent: 'center',
//             // alignItems: 'center',
//             // paddingLeft: 5,
//           }}>
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               // paddingVertical: 2,
//             }}>
//             {(
//               [
//                 {key: 'newest', label: 'Newest'},
//                 {key: 'favorites', label: 'Favorites'},
//                 {key: 'planned', label: 'Planned'},
//                 {key: 'stars', label: 'Rating'},
//               ] as const
//             ).map(({key, label}, idx) => (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic"
//                 style={{marginRight: 7}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     // paddingHorizontal: 16,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: 92,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     // shadowColor: '#000',
//                     // shadowOpacity: 0.15,
//                     // shadowRadius: 6,
//                     // shadowOffset: {width: 0, height: 2},
//                   }}>
//                   <Text
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <Animatable.View
//                   key={outfit.id}
//                   animation="fadeInUp"
//                   delay={150 + index * 120}
//                   duration={800}
//                   easing="ease-out-cubic"
//                   style={{transform: [{scale}, {translateY}]}}>
//                   <ViewShot
//                     ref={ref => (viewRefs.current[outfit.id] = ref)}
//                     options={{format: 'png', quality: 0.9}}>
//                     <View style={[styles.card, globalStyles.cardStyles1]}>
//                       {/* 🧵 Outfit Header Row */}
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           justifyContent: 'space-between',
//                           alignItems: 'center',
//                         }}>
//                         <TouchableOpacity
//                           onPress={() => {
//                             hSelect();
//                             setEditingOutfitId(outfit.id);
//                             setEditedName(outfit.name || '');
//                           }}
//                           style={{flex: 1, marginRight: 12}}>
//                           <Text
//                             style={[
//                               globalStyles.titleBold,
//                               {fontSize: 20, color: theme.colors.foreground},
//                             ]}>
//                             {outfit.name?.trim() || 'Unnamed Outfit'}
//                           </Text>

//                           {/* 🗓️ Date & Time Info */}
//                           {(outfit.createdAt || outfit.plannedDate) && (
//                             <View style={{marginTop: 6}}>
//                               {outfit.plannedDate && (
//                                 <Text
//                                   style={[
//                                     styles.timestamp,
//                                     {
//                                       fontSize: 13,
//                                       fontWeight: '600',
//                                       color: theme.colors.foreground2,
//                                     },
//                                   ]}>
//                                   {`Planned for ${new Date(
//                                     outfit.plannedDate,
//                                   ).toLocaleString([], {
//                                     month: 'short',
//                                     day: 'numeric',
//                                     hour: 'numeric',
//                                     minute: '2-digit',
//                                   })}`}
//                                 </Text>
//                               )}
//                               {outfit.createdAt && (
//                                 <Text
//                                   style={[
//                                     styles.timestamp,
//                                     {
//                                       fontSize: 12,
//                                       color: theme.colors.muted,
//                                     },
//                                   ]}>
//                                   {`Saved ${new Date(
//                                     outfit.createdAt,
//                                   ).toLocaleDateString([], {
//                                     month: 'short',
//                                     day: 'numeric',
//                                     year: 'numeric',
//                                   })}`}
//                                 </Text>
//                               )}
//                             </View>
//                           )}
//                         </TouchableOpacity>

//                         {/* ❤️ & 🗑️ Buttons */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             alignItems: 'center',
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               hSelect();
//                               toggleFavorite(
//                                 outfit.id,
//                                 outfit.type === 'custom'
//                                   ? 'custom'
//                                   : 'suggestion',
//                                 setCombinedOutfits,
//                               );
//                             }}
//                             style={{
//                               padding: 8,
//                               borderRadius: 14,
//                               backgroundColor:
//                                 theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                             }}>
//                             <MaterialIcons
//                               name="favorite"
//                               size={20}
//                               color={
//                                 favorites.some(
//                                   f =>
//                                     f.id === outfit.id &&
//                                     f.source ===
//                                       (outfit.type === 'custom'
//                                         ? 'custom'
//                                         : 'suggestion'),
//                                 )
//                                   ? 'red'
//                                   : theme.colors.foreground
//                               }
//                             />
//                           </AppleTouchFeedback>

//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               setPendingDeleteId(outfit.id);
//                               setShowDeleteConfirm(true);
//                             }}
//                             style={{
//                               padding: 8,
//                               borderRadius: 14,
//                               marginLeft: 6,
//                               backgroundColor:
//                                 theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                             }}>
//                             <MaterialIcons
//                               name="delete"
//                               size={20}
//                               color={theme.colors.foreground}
//                             />
//                           </AppleTouchFeedback>
//                         </View>
//                       </View>

//                       {/* 👕 Outfit Images */}
//                       <View style={styles.imageRow}>
//                         {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                           i?.image ? (
//                             <AppleTouchFeedback
//                               key={i.id}
//                               hapticStyle="impactLight"
//                               onPress={() => setFullScreenOutfit(outfit)}>
//                               <Image
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {
//                                     marginRight: 12,
//                                     borderRadius: 12,
//                                     marginBottom: 8,
//                                     marginTop: -6,
//                                   },
//                                 ]}
//                               />
//                             </AppleTouchFeedback>
//                           ) : null,
//                         )}
//                       </View>

//                       {/* 📝 Notes */}
//                       {outfit.notes?.trim() && (
//                         <Text style={styles.notes}>
//                           “{outfit.notes.trim()}”
//                         </Text>
//                       )}

//                       {/* 📅 Schedule & Cancel Buttons */}
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           flexWrap: 'wrap',
//                           marginTop: 10,
//                         }}>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() => {
//                             setPlanningOutfitId(outfit.id);
//                             const now = new Date();
//                             setSelectedTempDate(now);
//                             setSelectedTempTime(now);
//                             setShowDatePicker(true);
//                           }}
//                           style={{
//                             backgroundColor: theme.colors.button1,
//                             borderRadius: 18,
//                             paddingVertical: 8,
//                             paddingHorizontal: 12,
//                             marginRight: 10,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontWeight: '600',
//                               fontSize: 13,
//                             }}>
//                             📅 Schedule This Outfit
//                           </Text>
//                         </AppleTouchFeedback>

//                         {outfit.plannedDate && (
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => cancelPlannedOutfit(outfit.id)} // ✅ correct full cancel flow
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                               paddingVertical: 7,
//                               paddingHorizontal: 12,
//                               borderRadius: 18,
//                               backgroundColor:
//                                 theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               // borderWidth: theme.borderWidth.hairline,
//                               // borderColor: theme.colors.buttonText1,
//                             }}>
//                             <MaterialIcons
//                               name="close"
//                               size={19}
//                               color="red"
//                               style={{marginRight: 6}}
//                             />
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               Cancel Schedule
//                             </Text>
//                           </AppleTouchFeedback>
//                         )}
//                       </View>

//                       {/* 🏷️ Tags */}
//                       {(outfit.tags || []).length > 0 && (
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             flexWrap: 'wrap',
//                             marginTop: 8,
//                           }}>
//                           {outfit.tags?.map(tag => (
//                             <View
//                               key={tag}
//                               style={{
//                                 paddingHorizontal: 10,
//                                 paddingVertical: 6,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 borderRadius: 16,
//                                 marginRight: 6,
//                                 marginBottom: 6,
//                               }}>
//                               <Text
//                                 style={{
//                                   fontSize: 12,
//                                   color: theme.colors.foreground,
//                                 }}>
//                                 #{tag}
//                               </Text>
//                             </View>
//                           ))}
//                         </View>
//                       )}
//                     </View>
//                   </ViewShot>
//                 </Animatable.View>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.buttonText1, fontWeight: '800'}}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       {showDeleteConfirm && pendingDeleteId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🖼 Full-Screen Outfit Modal — IMMERSIVE VERSION */}
//       <Modal visible={!!fullScreenOutfit} transparent animationType="fade">
//         {fullScreenOutfit && (
//           <Animatable.View
//             animation="fadeIn"
//             duration={350}
//             style={{
//               flex: 1,
//               backgroundColor: '#000',
//               justifyContent: 'flex-start',
//               alignItems: 'center',
//             }}>
//             {/* ✨ Edge-to-edge full background blur */}
//             <BlurView
//               style={StyleSheet.absoluteFill}
//               blurType="systemUltraThinMaterialDark"
//               blurAmount={30}
//               reducedTransparencyFallbackColor="rgba(0,0,0,0.85)"
//             />

//             {/* ✖️ Close Button */}
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               style={{
//                 position: 'absolute',
//                 top: 60,
//                 left: 150,
//                 zIndex: 10,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 borderRadius: 28,
//                 paddingVertical: 8,
//                 paddingHorizontal: 14,
//                 shadowColor: '#000',
//                 shadowOpacity: 0.25,
//                 shadowRadius: 10,
//               }}
//               onPress={() => setFullScreenOutfit(null)}>
//               <Text
//                 style={{
//                   color: '#fff',
//                   fontSize: 20,
//                   fontWeight: '600',
//                 }}>
//                 ✕
//               </Text>
//             </AppleTouchFeedback>

//             {/* 🧥 Outfit Name */}
//             <Animatable.Text
//               animation="fadeInDown"
//               delay={200}
//               duration={700}
//               style={{
//                 fontSize: 28,
//                 fontWeight: '800',
//                 color: '#fff',
//                 textAlign: 'center',
//                 marginTop: 100,
//                 marginBottom: 20,
//                 letterSpacing: 0.5,
//               }}>
//               {fullScreenOutfit.name || 'Unnamed Outfit'}
//             </Animatable.Text>
//             {/* 📸 Scrollable Outfit Details */}
//             <ScrollView
//               showsVerticalScrollIndicator={false}
//               style={{flex: 1, width: '100%'}}
//               contentContainerStyle={{
//                 paddingBottom: 180,
//                 alignItems: 'center',
//                 paddingHorizontal: 24,
//               }}>
//               {/* 👕 Outfit Images (stacked vertically) */}
//               {[
//                 fullScreenOutfit.top,
//                 fullScreenOutfit.bottom,
//                 fullScreenOutfit.shoes,
//               ].map(
//                 (i, idx) =>
//                   i?.image && (
//                     <Animatable.Image
//                       key={i.id || idx}
//                       source={{uri: i.image}}
//                       animation="fadeInUp"
//                       delay={300 + idx * 200}
//                       duration={800}
//                       style={{
//                         width: '100%',
//                         // aspectRatio: 3 / 4,
//                         height: 400,
//                         maxWidth: 400,
//                         borderRadius: 20,
//                         marginBottom: 28,
//                         shadowColor: '#000',
//                         shadowOpacity: 0.35,
//                         shadowRadius: 24,
//                         shadowOffset: {width: 0, height: 14},
//                       }}
//                       resizeMode="cover"
//                     />
//                   ),
//               )}

//               {/* 📝 Notes */}
//               {fullScreenOutfit.notes?.trim() && (
//                 <Animatable.Text
//                   animation="fadeInUp"
//                   delay={700}
//                   duration={800}
//                   style={{
//                     fontStyle: 'italic',
//                     fontSize: 16,
//                     color: 'rgba(255,255,255,0.9)',
//                     textAlign: 'center',
//                     marginTop: 10,
//                     lineHeight: 22,
//                   }}>
//                   “{fullScreenOutfit.notes.trim()}”
//                 </Animatable.Text>
//               )}

//               {/* 🏷️ Tags */}
//               {fullScreenOutfit.tags?.length ? (
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={900}
//                   duration={800}
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'center',
//                     marginTop: 24,
//                   }}>
//                   {fullScreenOutfit.tags.map(tag => (
//                     <View
//                       key={tag}
//                       style={{
//                         backgroundColor: 'rgba(255,255,255,0.1)',
//                         borderRadius: 20,
//                         paddingHorizontal: 14,
//                         paddingVertical: 6,
//                         margin: 6,
//                       }}>
//                       <Text
//                         style={{
//                           color: '#fff',
//                           fontSize: 14,
//                           fontWeight: '600',
//                           letterSpacing: 0.2,
//                         }}>
//                         #{tag}
//                       </Text>
//                     </View>
//                   ))}
//                 </Animatable.View>
//               ) : null}
//             </ScrollView>
//             {/* 🪩 Frosted Bottom Action Sheet */}
//             <Animatable.View
//               animation="fadeInUp"
//               delay={400}
//               duration={700}
//               style={{
//                 position: 'absolute',
//                 bottom: 0,
//                 width: '100%',
//                 paddingVertical: 28,
//                 paddingHorizontal: 24,
//                 borderTopLeftRadius: 26,
//                 borderTopRightRadius: 26,
//                 backgroundColor:
//                   Platform.OS === 'android'
//                     ? 'rgba(20,20,20,0.9)'
//                     : 'transparent',
//                 shadowColor: '#000',
//                 shadowOpacity: 0.4,
//                 shadowRadius: 30,
//                 shadowOffset: {width: 0, height: -10},
//               }}>
//               {Platform.OS === 'ios' && (
//                 <BlurView
//                   style={StyleSheet.absoluteFill}
//                   blurType="systemMaterialDark"
//                   blurAmount={30}
//                 />
//               )}
//             </Animatable.View>
//           </Animatable.View>
//         )}
//       </Modal>
//     </View>
//   );
// }

/////////////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   ScrollView,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
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
//   plannedDate?: string;
//   type: 'custom' | 'ai';
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 8,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 24,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '100%',
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 30,
//       borderTopRightRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 28,
//       paddingHorizontal: 20,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     <View
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* 📱 Header */}
//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         delay={100}
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Animatable.Text> */}

//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       {/* 🔀 Sort Bar */}
//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         <View
//           style={{
//             justifyContent: 'center',
//             // alignItems: 'center',
//             // paddingLeft: 5,
//           }}>
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               // paddingVertical: 2,
//             }}>
//             {(
//               [
//                 {key: 'newest', label: 'Newest'},
//                 {key: 'favorites', label: 'Favorites'},
//                 {key: 'planned', label: 'Planned'},
//                 {key: 'stars', label: 'Rating'},
//               ] as const
//             ).map(({key, label}, idx) => (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic"
//                 style={{marginRight: 7}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     // paddingHorizontal: 16,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: 92,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     shadowColor: '#000',
//                     shadowOpacity: 0.15,
//                     shadowRadius: 6,
//                     shadowOffset: {width: 0, height: 2},
//                   }}>
//                   <Text
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'center'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved outfits.
//               </Text>
//               <TooltipBubble
//                 message='You don’t have any saved outfits yet. Tap "Wardrobe" in the bottom navigation bar to head to the Wardrobe screen, and
//               then tap "Build an Outfit". Once you build your first outfit, it will appear back here automatically.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <Animatable.View
//                   key={outfit.id}
//                   animation="fadeInUp"
//                   delay={150 + index * 120}
//                   duration={800}
//                   easing="ease-out-cubic"
//                   style={{transform: [{scale}, {translateY}]}}>
//                   <ViewShot
//                     ref={ref => (viewRefs.current[outfit.id] = ref)}
//                     options={{format: 'png', quality: 0.9}}>
//                     <View style={[styles.card, globalStyles.cardStyles1]}>
//                       {/* 🧵 Outfit Header Row */}
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           justifyContent: 'space-between',
//                           alignItems: 'center',
//                         }}>
//                         <TouchableOpacity
//                           onPress={() => {
//                             hSelect();
//                             setEditingOutfitId(outfit.id);
//                             setEditedName(outfit.name || '');
//                           }}
//                           style={{flex: 1, marginRight: 12}}>
//                           <Text
//                             style={[
//                               globalStyles.titleBold,
//                               {fontSize: 20, color: theme.colors.foreground},
//                             ]}>
//                             {outfit.name?.trim() || 'Unnamed Outfit'}
//                           </Text>

//                           {/* 🗓️ Date & Time Info */}
//                           {(outfit.createdAt || outfit.plannedDate) && (
//                             <View style={{marginTop: 6}}>
//                               {outfit.plannedDate && (
//                                 <Text
//                                   style={[
//                                     styles.timestamp,
//                                     {
//                                       fontSize: 13,
//                                       fontWeight: '600',
//                                       color: theme.colors.foreground2,
//                                     },
//                                   ]}>
//                                   {`Planned for ${new Date(
//                                     outfit.plannedDate,
//                                   ).toLocaleString([], {
//                                     month: 'short',
//                                     day: 'numeric',
//                                     hour: 'numeric',
//                                     minute: '2-digit',
//                                   })}`}
//                                 </Text>
//                               )}
//                               {outfit.createdAt && (
//                                 <Text
//                                   style={[
//                                     styles.timestamp,
//                                     {
//                                       fontSize: 12,
//                                       color: theme.colors.foreground3,
//                                     },
//                                   ]}>
//                                   {`Saved ${new Date(
//                                     outfit.createdAt,
//                                   ).toLocaleDateString([], {
//                                     month: 'short',
//                                     day: 'numeric',
//                                     year: 'numeric',
//                                   })}`}
//                                 </Text>
//                               )}
//                             </View>
//                           )}
//                         </TouchableOpacity>

//                         {/* ❤️ & 🗑️ Buttons */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             alignItems: 'center',
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               hSelect();
//                               toggleFavorite(
//                                 outfit.id,
//                                 outfit.type === 'custom'
//                                   ? 'custom'
//                                   : 'suggestion',
//                                 setCombinedOutfits,
//                               );
//                             }}
//                             style={{
//                               padding: 8,
//                               borderRadius: 14,
//                               backgroundColor:
//                                 theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                             }}>
//                             <MaterialIcons
//                               name="favorite"
//                               size={20}
//                               color={
//                                 favorites.some(
//                                   f =>
//                                     f.id === outfit.id &&
//                                     f.source ===
//                                       (outfit.type === 'custom'
//                                         ? 'custom'
//                                         : 'suggestion'),
//                                 )
//                                   ? 'red'
//                                   : theme.colors.foreground
//                               }
//                             />
//                           </AppleTouchFeedback>

//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               setPendingDeleteId(outfit.id);
//                               setShowDeleteConfirm(true);
//                             }}
//                             style={{
//                               padding: 8,
//                               borderRadius: 14,
//                               marginLeft: 6,
//                               backgroundColor:
//                                 theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                             }}>
//                             <MaterialIcons
//                               name="delete"
//                               size={20}
//                               color={theme.colors.foreground}
//                             />
//                           </AppleTouchFeedback>
//                         </View>
//                       </View>

//                       {/* 👕 Outfit Images */}
//                       <View style={styles.imageRow}>
//                         {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                           i?.image ? (
//                             <AppleTouchFeedback
//                               key={i.id}
//                               hapticStyle="impactLight"
//                               onPress={() => setFullScreenOutfit(outfit)}>
//                               <Image
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {
//                                     marginRight: 12,
//                                     borderRadius: 12,
//                                     marginBottom: 8,
//                                     // marginTop: -6,
//                                   },
//                                 ]}
//                               />
//                             </AppleTouchFeedback>
//                           ) : null,
//                         )}
//                       </View>

//                       {/* 📝 Notes */}
//                       {outfit.notes?.trim() && (
//                         <Text style={styles.notes}>
//                           “{outfit.notes.trim()}”
//                         </Text>
//                       )}

//                       {/* 📅 Schedule & Cancel Buttons */}
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           flexWrap: 'wrap',
//                           marginTop: 10,
//                         }}>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() => {
//                             setPlanningOutfitId(outfit.id);
//                             const now = new Date();
//                             setSelectedTempDate(now);
//                             setSelectedTempTime(now);
//                             setShowDatePicker(true);
//                           }}
//                           style={{
//                             backgroundColor: theme.colors.button1,
//                             borderRadius: 18,
//                             paddingVertical: 8,
//                             paddingHorizontal: 12,
//                             marginRight: 10,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontWeight: '600',
//                               fontSize: 13,
//                             }}>
//                             📅 Schedule This Outfit
//                           </Text>
//                         </AppleTouchFeedback>

//                         {outfit.plannedDate && (
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => cancelPlannedOutfit(outfit.id)} // ✅ correct full cancel flow
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                               paddingVertical: 7,
//                               paddingHorizontal: 12,
//                               borderRadius: 18,
//                               backgroundColor:
//                                 theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               // borderWidth: theme.borderWidth.hairline,
//                               // borderColor: theme.colors.buttonText1,
//                             }}>
//                             <MaterialIcons
//                               name="close"
//                               size={19}
//                               color="red"
//                               style={{marginRight: 6}}
//                             />
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               Cancel Schedule
//                             </Text>
//                           </AppleTouchFeedback>
//                         )}
//                       </View>

//                       {/* 🏷️ Tags */}
//                       {(outfit.tags || []).length > 0 && (
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             flexWrap: 'wrap',
//                             marginTop: 8,
//                           }}>
//                           {outfit.tags?.map(tag => (
//                             <View
//                               key={tag}
//                               style={{
//                                 paddingHorizontal: 10,
//                                 paddingVertical: 6,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 borderRadius: 16,
//                                 marginRight: 6,
//                                 marginBottom: 6,
//                               }}>
//                               <Text
//                                 style={{
//                                   fontSize: 12,
//                                   color: theme.colors.foreground,
//                                 }}>
//                                 #{tag}
//                               </Text>
//                             </View>
//                           ))}
//                         </View>
//                       )}
//                     </View>
//                   </ViewShot>
//                 </Animatable.View>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.buttonText1, fontWeight: '800'}}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       {showDeleteConfirm && pendingDeleteId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🖼 Full-Screen Outfit Modal */}
//       <Modal visible={!!fullScreenOutfit} transparent animationType="fade">
//         {fullScreenOutfit && (
//           <BlurView
//             style={styles.fullModalContainer}
//             blurType="dark"
//             blurAmount={25}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Animatable.View
//               animation="zoomIn"
//               duration={700}
//               easing="ease-out-cubic"
//               style={{alignItems: 'center', width: '100%'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 style={{position: 'absolute', top: 20, left: 150, zIndex: 5}}
//                 onPress={() => setFullScreenOutfit(null)}>
//                 <MaterialIcons
//                   name="close"
//                   size={32}
//                   color={theme.colors.foreground}
//                 />
//               </AppleTouchFeedback>

//               <Text
//                 style={{
//                   color: theme.colors.foreground,
//                   fontSize: 30,
//                   fontWeight: '800',
//                   marginBottom: 20,
//                 }}>
//                 {fullScreenOutfit.name || 'Unnamed Outfit'}
//               </Text>

//               <ScrollView
//                 style={{alignSelf: 'stretch'}}
//                 contentContainerStyle={{
//                   paddingBottom: 24,
//                   alignItems: 'center',
//                 }}>
//                 {[
//                   fullScreenOutfit.top,
//                   fullScreenOutfit.bottom,
//                   fullScreenOutfit.shoes,
//                 ].map(i =>
//                   i?.image ? (
//                     <Animatable.Image
//                       key={i.id}
//                       animation="fadeInUp"
//                       duration={800}
//                       delay={200}
//                       source={{uri: i.image}}
//                       style={styles.fullImage}
//                       resizeMode="contain"
//                     />
//                   ) : null,
//                 )}
//               </ScrollView>

//               {fullScreenOutfit.notes ? (
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontStyle: 'italic',
//                     textAlign: 'center',
//                     marginTop: 10,
//                   }}>
//                   “{fullScreenOutfit.notes}”
//                 </Text>
//               ) : null}

//               {fullScreenOutfit.tags?.length ? (
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     marginTop: 14,
//                   }}>
//                   {fullScreenOutfit.tags.map(tag => (
//                     <View
//                       key={tag}
//                       style={{
//                         backgroundColor: theme.colors.surface3,
//                         borderRadius: 16,
//                         paddingHorizontal: 8,
//                         paddingVertical: 4,
//                         margin: 4,
//                       }}>
//                       <Text
//                         style={{color: theme.colors.foreground, fontSize: 12}}>
//                         #{tag}
//                       </Text>
//                     </View>
//                   ))}
//                 </View>
//               ) : null}
//             </Animatable.View>
//           </BlurView>
//         )}
//       </Modal>
//     </View>
//   );
// }

/////////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   Alert,
//   TextInput,
//   Modal,
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
//   Animated,
//   Easing,
//   ScrollView,
// } from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import ViewShot from 'react-native-view-shot';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {useFavorites} from '../hooks/useFavorites';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import {addOutfitToCalendar, removeCalendarEvent} from '../utils/calendar';
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
//   plannedDate?: string;
//   type: 'custom' | 'ai';
// };

// const CLOSET_KEY = 'savedOutfits';
// const FAVORITES_KEY = 'favoriteOutfits';
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

// export default function SavedOutfitsScreen() {
//   const userId = useUUID();
//   if (!userId) return null;

//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },

//     // 🪩 Core Outfit Card
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 6,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 22,
//       shadowOffset: {width: 0, height: 10},
//       transform: [{scale: 0.98}],
//       elevation: 12,
//     },

//     timestamp: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//       marginBottom: 8,
//       fontWeight: '500',
//       letterSpacing: 0.2,
//     },

//     actions: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },

//     imageRow: {
//       flexDirection: 'row',
//       justifyContent: 'flex-start',
//       marginTop: 12,
//       gap: 12,
//     },

//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },

//     stars: {
//       flexDirection: 'row',
//       marginTop: 6,
//     },

//     // 🌫️ Overlay for blur modals / pickers
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.3)',
//     },

//     // 📦 Centered modal container
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },

//     // ✏️ Edit Name / Delete Confirmation Modal
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 22,
//       borderRadius: 20,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 28,
//       shadowOffset: {width: 0, height: 14},
//       elevation: 20,
//       transform: [{scale: 1}],
//     },

//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },

//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 20,
//       gap: 20,
//     },

//     // 🪟 Full-screen Outfit Viewer
//     fullModalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       paddingTop: 72,
//       paddingHorizontal: 24,
//     },

//     fullImage: {
//       width: '70%',
//       aspectRatio: 1,
//       marginVertical: 16,
//       borderRadius: 18,
//       backgroundColor: theme.colors.background,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 16},
//       elevation: 18,
//     },

//     // 📅 Bottom Sheet
//     sheetContainer: {
//       width: '100%',
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 30,
//       borderTopRightRadius: 30,
//       paddingTop: 12,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 28,
//       paddingHorizontal: 20,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 32,
//       shadowOffset: {width: 0, height: -14},
//       elevation: 26,
//     },

//     grabber: {
//       alignSelf: 'center',
//       width: 50,
//       height: 6,
//       borderRadius: 3,
//       backgroundColor: 'rgba(255,255,255,0.25)',
//       marginBottom: 12,
//     },

//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },

//     sheetTitle: {
//       fontSize: 18,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       letterSpacing: 0.3,
//     },

//     sheetPill: {
//       paddingHorizontal: 16,
//       paddingVertical: 10,
//       borderRadius: 22,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },

//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//       letterSpacing: 0.2,
//     },

//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 14,
//       marginBottom: 10,
//     },

//     // 🍞 Toast
//     toast: {
//       position: 'absolute',
//       bottom: 30,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 14,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.3,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 20,
//     },
//   });

//   // 🧠 State Management
//   const [combinedOutfits, setCombinedOutfits] = useState<SavedOutfit[]>([]);
//   const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
//   const [editedName, setEditedName] = useState('');

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

//   // ✨ Animated value for parallax depth
//   const scrollY = useRef(new Animated.Value(0)).current;

//   const hSelect = () =>
//     ReactNativeHapticFeedback.trigger('selection', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   // ⏱️ Utility: Combine date + time
//   const combineDateAndTime = (date: Date, time: Date) => {
//     const d = new Date(date);
//     const t = new Date(time);
//     d.setHours(t.getHours(), t.getMinutes(), 0, 0);
//     return d;
//   };

//   const handleNameSave = async () => {
//     if (!editingOutfitId || editedName.trim() === '') return;

//     const outfit = combinedOutfits.find(o => o.id === editingOutfitId);
//     if (!outfit) return;

//     try {
//       // ✅ dynamically hit the correct endpoint just like the old version
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

//       // ✅ update state so UI reflects the change immediately
//       const updated = combinedOutfits.map(o =>
//         o.id === editingOutfitId ? {...o, name: editedName.trim()} : o,
//       );
//       setCombinedOutfits(updated);

//       // ✅ reset modal state
//       setEditingOutfitId(null);
//       setEditedName('');
//     } catch (err) {
//       console.error('❌ Error updating outfit name:', err);
//       Alert.alert('Error', 'Failed to update outfit name in the database.');
//     }
//   };

//   // ✅ Restore old delete logic (single DELETE endpoint)
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
//       setLastDeletedOutfit(deleted); // keep your existing Undo toast
//       setTimeout(() => setLastDeletedOutfit(null), 3000);
//     } catch (err) {
//       console.error('❌ Error deleting outfit:', err);
//       Alert.alert('Error', 'Could not delete outfit from the database.');
//     }
//   };

//   // 📅 Local notification helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
//       allowWhileIdle: true,
//       playSound: true,
//       soundName: 'default',
//     });
//   };

//   // 👇 Custom slide-in-from-right animation
//   const slideInFromRight = {
//     from: {opacity: 0, translateX: 80},
//     to: {opacity: 1, translateX: 0},
//   };

//   // 🔄 Reset all scheduling state (Close / Cancel handlers)
//   // ⏮️ Restored originals

//   const resetPlanFlow = () => {
//     setPlanningOutfitId(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);
//     setSelectedTempDate(null);
//     setSelectedTempTime(null);
//   };

//   const commitSchedule = async () => {
//     if (!planningOutfitId || !selectedTempDate || !selectedTempTime) return;
//     try {
//       const selectedOutfit = combinedOutfits.find(
//         o => o.id === planningOutfitId,
//       );
//       if (!selectedOutfit) return;

//       const outfit_type = selectedOutfit.type === 'custom' ? 'custom' : 'ai';
//       const combined = combineDateAndTime(selectedTempDate, selectedTempTime);

//       // clear any previous local alert + calendar event
//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

//       // save to server
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

//       // reflect in UI
//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       // local notification
//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       // add to calendar & remember event id
//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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

//   const cancelPlannedOutfit = async (outfitId: string) => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/scheduled-outfits`, {
//         method: 'DELETE',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({user_id: userId, outfit_id: outfitId}),
//       });
//       if (!res.ok) throw new Error('Failed to cancel planned outfit');

//       // Update UI
//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       // Cancel local alert
//       cancelOutfitLocalAlert(outfitId);

//       // Remove calendar event (if any)
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

//   const cancelOutfitLocalAlert = (outfitId: string) => {
//     PushNotification.cancelLocalNotifications({id: `outfit-${outfitId}`});
//   };

//   const normalizeImageUrl = (url: string | undefined | null): string => {
//     if (!url) return '';
//     return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//   };

//   // 🧠 Fetch outfits and merge AI + custom
//   const loadOutfits = async () => {
//     try {
//       const [aiRes, customRes, scheduledRes] = await Promise.all([
//         fetch(`${API_BASE_URL}/outfit/suggestions/${userId}`),
//         fetch(`${API_BASE_URL}/outfit/custom/${userId}`),
//         fetch(`${API_BASE_URL}/scheduled-outfits/${userId}`),
//       ]);

//       if (!aiRes.ok || !customRes.ok || !scheduledRes.ok)
//         throw new Error('Failed to fetch outfits');

//       const [aiData, customData, scheduledData] = await Promise.all([
//         aiRes.json(),
//         customRes.json(),
//         scheduledRes.json(),
//       ]);

//       const scheduleMap: Record<string, string> = {};
//       for (const s of scheduledData) {
//         if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
//         else if (s.custom_outfit_id)
//           scheduleMap[s.custom_outfit_id] = s.scheduled_for;
//       }

//       const normalize = (o: any, isCustom: boolean): SavedOutfit => {
//         const outfitId = o.id;
//         return {
//           id: outfitId,
//           name: o.name || '',
//           top: o.top
//             ? ({
//                 id: o.top.id,
//                 name: o.top.name,
//                 image: normalizeImageUrl(o.top.image || o.top.image_url),
//               } as any)
//             : ({} as any),
//           bottom: o.bottom
//             ? ({
//                 id: o.bottom.id,
//                 name: o.bottom.name,
//                 image: normalizeImageUrl(o.bottom.image || o.bottom.image_url),
//               } as any)
//             : ({} as any),
//           shoes: o.shoes
//             ? ({
//                 id: o.shoes.id,
//                 name: o.shoes.name,
//                 image: normalizeImageUrl(o.shoes.image || o.shoes.image_url),
//               } as any)
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

//   useEffect(() => {
//     if (userId && !favoritesLoading) loadOutfits();
//   }, [userId, favoritesLoading]);
//   // ✨ Sort state and computed outfits
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

//   // 🔄 Keep favorites synced
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

//   // function resetPlanFlow(): void {
//   //   throw new Error('Function not implemented.');
//   // }

//   return (
//     <View
//       style={[
//         globalStyles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* 📱 Header */}
//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         delay={100}
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Animatable.Text> */}

//       <Text
//         style={[
//           globalStyles.header,
//           globalStyles.section,
//           {color: theme.colors.primary},
//         ]}>
//         Saved Outfits
//       </Text>

//       {/* 🔀 Sort Bar */}
//       <Animatable.View
//         animation="fadeInDown"
//         delay={300}
//         duration={800}
//         style={[globalStyles.section]}>
//         <Text
//           style={[globalStyles.label, {marginBottom: 12, textAlign: 'left'}]}>
//           Sort by:
//         </Text>

//         <View
//           style={{
//             justifyContent: 'center',
//             // alignItems: 'center',
//             // paddingLeft: 5,
//           }}>
//           <View
//             style={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               // paddingVertical: 2,
//             }}>
//             {(
//               [
//                 {key: 'newest', label: 'Newest'},
//                 {key: 'favorites', label: 'Favorites'},
//                 {key: 'planned', label: 'Planned'},
//                 {key: 'stars', label: 'Rating'},
//               ] as const
//             ).map(({key, label}, idx) => (
//               <Animatable.View
//                 key={key}
//                 animation={{
//                   from: {opacity: 0, translateX: 40},
//                   to: {opacity: 1, translateX: 0},
//                 }}
//                 delay={150 + idx * 100}
//                 duration={600}
//                 easing="ease-out-cubic"
//                 style={{marginRight: 7}}>
//                 <TouchableOpacity
//                   onPress={() => {
//                     hSelect();
//                     setSortType(key);
//                   }}
//                   activeOpacity={0.8}
//                   style={{
//                     backgroundColor:
//                       sortType === key
//                         ? theme.colors.foreground
//                         : theme.colors.surface3,
//                     // paddingHorizontal: 16,
//                     paddingVertical: 9,
//                     borderRadius: 22,
//                     width: 92,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     shadowColor: '#000',
//                     shadowOpacity: 0.15,
//                     shadowRadius: 6,
//                     shadowOffset: {width: 0, height: 2},
//                   }}>
//                   <Text
//                     style={{
//                       color:
//                         sortType === key
//                           ? theme.colors.background
//                           : theme.colors.foreground2,
//                       fontSize: 14,
//                       fontWeight: '600',
//                     }}>
//                     {label}
//                   </Text>
//                 </TouchableOpacity>
//               </Animatable.View>
//             ))}
//           </View>
//         </View>
//       </Animatable.View>

//       {/* 🪩 Dramatic Parallax ScrollView */}
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{paddingBottom: 160, alignItems: 'center'}}
//         scrollEventThrottle={16}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {y: scrollY}}}],
//           {useNativeDriver: true},
//         )}>
//         <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
//           {sortedOutfits.length === 0 ? (
//             <Animatable.Text
//               animation="fadeIn"
//               delay={300}
//               style={globalStyles.missingDataMessage1}>
//               You don’t have any saved outfits yet. Go to the Wardrobe page and
//               tap
//               <Text style={{fontWeight: '900'}}> "Build an Outfit"</Text>. Once
//               you create your first outfit, it will appear here automatically.
//             </Animatable.Text>
//           ) : (
//             sortedOutfits.map((outfit, index) => {
//               // 🎞️ Compute parallax transform for each card
//               const inputRange = [-1, 0, 200 * index, 200 * (index + 2)];
//               const scale = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [1, 1, 1, 0.9],
//                 extrapolate: 'clamp',
//               });
//               const translateY = scrollY.interpolate({
//                 inputRange,
//                 outputRange: [0, 0, 0, -20],
//                 extrapolate: 'clamp',
//               });

//               return (
//                 <Animatable.View
//                   key={outfit.id}
//                   animation="fadeInUp"
//                   delay={150 + index * 120}
//                   duration={800}
//                   easing="ease-out-cubic"
//                   style={{transform: [{scale}, {translateY}]}}>
//                   <ViewShot
//                     ref={ref => (viewRefs.current[outfit.id] = ref)}
//                     options={{format: 'png', quality: 0.9}}>
//                     <View style={[styles.card, globalStyles.cardStyles1]}>
//                       {/* 🧵 Outfit Header Row */}
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           justifyContent: 'space-between',
//                           alignItems: 'center',
//                         }}>
//                         <TouchableOpacity
//                           onPress={() => {
//                             hSelect();
//                             setEditingOutfitId(outfit.id);
//                             setEditedName(outfit.name || '');
//                           }}
//                           style={{flex: 1, marginRight: 12}}>
//                           <Text
//                             style={[
//                               globalStyles.titleBold,
//                               {fontSize: 20, color: theme.colors.foreground},
//                             ]}>
//                             {outfit.name?.trim() || 'Unnamed Outfit'}
//                           </Text>

//                           {/* 🗓️ Date & Time Info */}
//                           {(outfit.createdAt || outfit.plannedDate) && (
//                             <View style={{marginTop: 6}}>
//                               {outfit.plannedDate && (
//                                 <Text
//                                   style={[
//                                     styles.timestamp,
//                                     {
//                                       fontSize: 13,
//                                       fontWeight: '600',
//                                       color: theme.colors.foreground2,
//                                     },
//                                   ]}>
//                                   {`Planned for ${new Date(
//                                     outfit.plannedDate,
//                                   ).toLocaleString([], {
//                                     month: 'short',
//                                     day: 'numeric',
//                                     hour: 'numeric',
//                                     minute: '2-digit',
//                                   })}`}
//                                 </Text>
//                               )}
//                               {outfit.createdAt && (
//                                 <Text
//                                   style={[
//                                     styles.timestamp,
//                                     {
//                                       fontSize: 12,
//                                       color: theme.colors.foreground3,
//                                     },
//                                   ]}>
//                                   {`Saved ${new Date(
//                                     outfit.createdAt,
//                                   ).toLocaleDateString([], {
//                                     month: 'short',
//                                     day: 'numeric',
//                                     year: 'numeric',
//                                   })}`}
//                                 </Text>
//                               )}
//                             </View>
//                           )}
//                         </TouchableOpacity>

//                         {/* ❤️ & 🗑️ Buttons */}
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             alignItems: 'center',
//                             gap: 10,
//                           }}>
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               hSelect();
//                               toggleFavorite(
//                                 outfit.id,
//                                 outfit.type === 'custom'
//                                   ? 'custom'
//                                   : 'suggestion',
//                                 setCombinedOutfits,
//                               );
//                             }}
//                             style={{
//                               padding: 8,
//                               borderRadius: 14,
//                               backgroundColor:
//                                 theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                             }}>
//                             <MaterialIcons
//                               name="favorite"
//                               size={22}
//                               color={
//                                 favorites.some(
//                                   f =>
//                                     f.id === outfit.id &&
//                                     f.source ===
//                                       (outfit.type === 'custom'
//                                         ? 'custom'
//                                         : 'suggestion'),
//                                 )
//                                   ? 'red'
//                                   : theme.colors.foreground
//                               }
//                             />
//                           </AppleTouchFeedback>

//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => {
//                               setPendingDeleteId(outfit.id);
//                               setShowDeleteConfirm(true);
//                             }}
//                             style={{
//                               padding: 8,
//                               borderRadius: 14,
//                               backgroundColor:
//                                 theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                             }}>
//                             <MaterialIcons
//                               name="delete"
//                               size={22}
//                               color={theme.colors.foreground}
//                             />
//                           </AppleTouchFeedback>
//                         </View>
//                       </View>

//                       {/* 👕 Outfit Images */}
//                       <View style={styles.imageRow}>
//                         {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//                           i?.image ? (
//                             <AppleTouchFeedback
//                               key={i.id}
//                               hapticStyle="impactLight"
//                               onPress={() => setFullScreenOutfit(outfit)}>
//                               <Image
//                                 source={{uri: i.image}}
//                                 style={[
//                                   globalStyles.image1,
//                                   {marginRight: 12, borderRadius: 16},
//                                 ]}
//                               />
//                             </AppleTouchFeedback>
//                           ) : null,
//                         )}
//                       </View>

//                       {/* 📝 Notes */}
//                       {outfit.notes?.trim() && (
//                         <Text style={styles.notes}>
//                           “{outfit.notes.trim()}”
//                         </Text>
//                       )}

//                       {/* 📅 Schedule & Cancel Buttons */}
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           flexWrap: 'wrap',
//                           marginTop: 10,
//                         }}>
//                         <AppleTouchFeedback
//                           hapticStyle="impactLight"
//                           onPress={() => {
//                             setPlanningOutfitId(outfit.id);
//                             const now = new Date();
//                             setSelectedTempDate(now);
//                             setSelectedTempTime(now);
//                             setShowDatePicker(true);
//                           }}
//                           style={{
//                             backgroundColor: theme.colors.button1,
//                             borderRadius: 18,
//                             paddingVertical: 8,
//                             paddingHorizontal: 12,
//                             marginRight: 10,
//                           }}>
//                           <Text
//                             style={{
//                               color: theme.colors.foreground,
//                               fontWeight: '600',
//                               fontSize: 13,
//                             }}>
//                             📅 Schedule This Outfit
//                           </Text>
//                         </AppleTouchFeedback>

//                         {outfit.plannedDate && (
//                           <AppleTouchFeedback
//                             hapticStyle="impactLight"
//                             onPress={() => cancelPlannedOutfit(outfit.id)} // ✅ correct full cancel flow
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                               paddingVertical: 7,
//                               paddingHorizontal: 12,
//                               borderRadius: 18,
//                               backgroundColor:
//                                 theme.colors.surface3 ?? 'rgba(43,43,43,1)',
//                               // borderWidth: theme.borderWidth.hairline,
//                               // borderColor: theme.colors.buttonText1,
//                             }}>
//                             <MaterialIcons
//                               name="close"
//                               size={19}
//                               color="red"
//                               style={{marginRight: 6}}
//                             />
//                             <Text
//                               style={{
//                                 color: theme.colors.foreground,
//                                 fontWeight: '600',
//                                 fontSize: 13,
//                               }}>
//                               Cancel Schedule
//                             </Text>
//                           </AppleTouchFeedback>
//                         )}
//                       </View>

//                       {/* 🏷️ Tags */}
//                       {(outfit.tags || []).length > 0 && (
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             flexWrap: 'wrap',
//                             marginTop: 8,
//                           }}>
//                           {outfit.tags?.map(tag => (
//                             <View
//                               key={tag}
//                               style={{
//                                 paddingHorizontal: 10,
//                                 paddingVertical: 6,
//                                 backgroundColor:
//                                   theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                                 borderRadius: 16,
//                                 marginRight: 6,
//                                 marginBottom: 6,
//                               }}>
//                               <Text
//                                 style={{
//                                   fontSize: 12,
//                                   color: theme.colors.foreground,
//                                 }}>
//                                 #{tag}
//                               </Text>
//                             </View>
//                           ))}
//                         </View>
//                       )}
//                     </View>
//                   </ViewShot>
//                 </Animatable.View>
//               );
//             })
//           )}
//         </View>
//       </Animated.ScrollView>
//       {/* 📝 Edit Name Modal */}
//       {editingOutfitId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={600}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 16,
//               }}>
//               Edit Outfit Name
//             </Text>
//             <TextInput
//               value={editedName}
//               onChangeText={setEditedName}
//               placeholder="Enter new name"
//               placeholderTextColor={theme.colors.foreground3}
//               style={styles.input}
//             />
//             <View style={styles.modalActions}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setEditingOutfitId(null);
//                   setEditedName('');
//                 }}>
//                 <Text style={{color: theme.colors.foreground, marginRight: 24}}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleNameSave}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                   Save
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 📅 Step 1: Date Picker — Dramatic Blur Bottom Sheet */}
//       {showDatePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>📆 Pick a date</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempDate || new Date()}
//               mode="date"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDatePicker(false);
//                   setShowTimePicker(true);
//                 }}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.background},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '800'}}>
//                   Next: Time
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* ⏰ Step 2: Time Picker — Dramatic Blur Bottom Sheet */}
//       {showTimePicker && planningOutfitId && (
//         <BlurView
//           style={styles.overlay}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="slideInUp"
//             duration={650}
//             easing="ease-out-cubic"
//             style={[styles.sheetContainer]}>
//             <View style={styles.grabber} />
//             <View style={styles.sheetHeaderRow}>
//               <Text style={styles.sheetTitle}>⏱️ Pick a time</Text>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={styles.sheetPill}>
//                 <Text style={styles.sheetPillText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             <DateTimePicker
//               value={selectedTempTime || new Date()}
//               mode="time"
//               display="spinner"
//               themeVariant="dark"
//               textColor={theme.colors.foreground}
//               onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//               style={{marginVertical: -10}}
//             />

//             <View style={styles.sheetFooterRow}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={resetPlanFlow}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.input2},
//                 ]}>
//                 <Text style={styles.sheetPillText}>Cancel</Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={commitSchedule}
//                 style={[
//                   styles.sheetPill,
//                   {backgroundColor: theme.colors.button1},
//                 ]}>
//                 <Text
//                   style={{color: theme.colors.buttonText1, fontWeight: '800'}}>
//                   Done
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🧼 Undo Toast */}
//       {lastDeletedOutfit && (
//         <Animatable.View
//           animation="bounceInUp"
//           duration={800}
//           easing="ease-out-back"
//           style={styles.toast}>
//           <Text style={{color: theme.colors.foreground}}>Outfit deleted</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={async () => {
//               const updated = [...combinedOutfits, lastDeletedOutfit];
//               const manual = updated.filter(o => !o.favorited);
//               const favs = updated.filter(o => o.favorited);
//               await AsyncStorage.setItem(CLOSET_KEY, JSON.stringify(manual));
//               await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
//               setCombinedOutfits(updated);
//               setLastDeletedOutfit(null);
//             }}>
//             <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//               Undo
//             </Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       )}

//       {/* 🗑 Delete Confirmation */}
//       {showDeleteConfirm && pendingDeleteId && (
//         <BlurView
//           style={styles.modalContainer}
//           blurType="dark"
//           blurAmount={20}
//           reducedTransparencyFallbackColor="rgba(0,0,0,0.7)">
//           <Animatable.View
//             animation="zoomIn"
//             duration={500}
//             style={styles.modalContent}>
//             <Text
//               style={{
//                 fontSize: 16,
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 marginBottom: 8,
//               }}>
//               Delete this outfit?
//             </Text>
//             <Text
//               style={{
//                 fontSize: 14,
//                 color: theme.colors.foreground2,
//                 marginBottom: 18,
//               }}>
//               This action cannot be undone.
//             </Text>
//             <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginHorizontal: 16,
//                   }}>
//                   Cancel
//                 </Text>
//               </AppleTouchFeedback>
//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   if (pendingDeleteId) handleDelete(pendingDeleteId);
//                   setShowDeleteConfirm(false);
//                   setPendingDeleteId(null);
//                 }}>
//                 <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                   Delete
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </Animatable.View>
//         </BlurView>
//       )}

//       {/* 🖼 Full-Screen Outfit Modal */}
//       <Modal visible={!!fullScreenOutfit} transparent animationType="fade">
//         {fullScreenOutfit && (
//           <BlurView
//             style={styles.fullModalContainer}
//             blurType="dark"
//             blurAmount={25}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Animatable.View
//               animation="zoomIn"
//               duration={700}
//               easing="ease-out-cubic"
//               style={{alignItems: 'center', width: '100%'}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 style={{position: 'absolute', top: 20, right: 30, zIndex: 5}}
//                 onPress={() => setFullScreenOutfit(null)}>
//                 <MaterialIcons
//                   name="close"
//                   size={32}
//                   color={theme.colors.foreground}
//                 />
//               </AppleTouchFeedback>

//               <Text
//                 style={{
//                   color: theme.colors.foreground,
//                   fontSize: 30,
//                   fontWeight: '800',
//                   marginBottom: 20,
//                 }}>
//                 {fullScreenOutfit.name || 'Unnamed Outfit'}
//               </Text>

//               <ScrollView
//                 style={{alignSelf: 'stretch'}}
//                 contentContainerStyle={{
//                   paddingBottom: 24,
//                   alignItems: 'center',
//                 }}>
//                 {[
//                   fullScreenOutfit.top,
//                   fullScreenOutfit.bottom,
//                   fullScreenOutfit.shoes,
//                 ].map(i =>
//                   i?.image ? (
//                     <Animatable.Image
//                       key={i.id}
//                       animation="fadeInUp"
//                       duration={800}
//                       delay={200}
//                       source={{uri: i.image}}
//                       style={styles.fullImage}
//                       resizeMode="contain"
//                     />
//                   ) : null,
//                 )}
//               </ScrollView>

//               {fullScreenOutfit.notes ? (
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontStyle: 'italic',
//                     textAlign: 'center',
//                     marginTop: 10,
//                   }}>
//                   “{fullScreenOutfit.notes}”
//                 </Text>
//               ) : null}

//               {fullScreenOutfit.tags?.length ? (
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     marginTop: 14,
//                   }}>
//                   {fullScreenOutfit.tags.map(tag => (
//                     <View
//                       key={tag}
//                       style={{
//                         backgroundColor: theme.colors.surface3,
//                         borderRadius: 16,
//                         paddingHorizontal: 8,
//                         paddingVertical: 4,
//                         margin: 4,
//                       }}>
//                       <Text
//                         style={{color: theme.colors.foreground, fontSize: 12}}>
//                         #{tag}
//                       </Text>
//                     </View>
//                   ))}
//                 </View>
//               ) : null}
//             </Animatable.View>
//           </BlurView>
//         )}
//       </Modal>
//     </View>
//   );
// }

/////////////////////////

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
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

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

//   // 🔔 Local alert helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
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

//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       cancelOutfitLocalAlert(outfitId);

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

//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

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

//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 12,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
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
//       marginTop: 10,
//       gap: 12,
//     },
//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },
//     stars: {flexDirection: 'row', marginTop: 6},

//     // Generic overlay
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.5)',
//       justifyContent: 'flex-end',
//     },

//     // Centered modal (edit name)
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.5)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 18,
//       borderRadius: 18,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.28,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 12},
//     },
//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 16,
//       gap: 14,
//     },

//     // Full-screen outfit viewer
//     fullModalContainer: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       padding: 20,
//       paddingTop: 72,
//     },
//     fullImage: {
//       width: '68%',
//       aspectRatio: 1,
//       // borderRadius: tokens.borderRadius.md,
//       marginVertical: 10,
//       backgroundColor: theme.colors.background,
//     },

//     // Bottom sheet base (for pickers)
//     sheetContainer: {
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 20,
//       borderTopRightRadius: 20,
//       paddingTop: 8,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 20,
//       paddingHorizontal: 16,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.2,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: -10},
//       elevation: 22,
//     },
//     grabber: {
//       alignSelf: 'center',
//       width: 40,
//       height: 5,
//       borderRadius: 3,
//       backgroundColor: theme.colors.inputText1 ?? 'rgba(121,121,121,0.45)',
//       marginBottom: 8,
//     },
//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 8,
//       paddingHorizontal: 2,
//     },
//     sheetTitle: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     sheetPill: {
//       paddingHorizontal: 14,
//       paddingVertical: 8,
//       borderRadius: 18,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },
//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//     },
//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 10,
//       marginBottom: 6,
//     },

//     // Toast
//     toast: {
//       position: 'absolute',
//       bottom: 20,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       borderRadius: 14,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 16,
//       shadowOffset: {width: 0, height: 10},
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
//                           ? theme.colors.foreground
//                           : theme.colors.surface3,
//                       marginRight: 7,
//                     },
//                   ]}>
//                   <Text
//                     style={[
//                       globalStyles.pillTextFixedWidth2,
//                       {
//                         color:
//                           sortType === key
//                             ? theme.colors.background
//                             : theme.colors.foreground2,
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
//           contentContainerStyle={{
//             paddingBottom: 100,
//             alignItems: 'center',
//           }}>
//           <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
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
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           gap: 10,
//                         }}>
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
//                           }}
//                           style={{
//                             padding: 8,
//                             borderRadius: 14,
//                             backgroundColor:
//                               theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                           }}>
//                           <MaterialIcons
//                             name="favorite"
//                             size={22}
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
//                           style={{
//                             padding: 8,
//                             borderRadius: 14,
//                             marginLeft: 6,
//                             backgroundColor:
//                               theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                           }}>
//                           <MaterialIcons
//                             name="delete"
//                             size={22}
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
//                               style={[
//                                 globalStyles.image1,
//                                 {marginRight: 12, borderRadius: 16},
//                               ]}
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
//                         style={{
//                           backgroundColor: theme.colors.surface3,
//                           borderRadius: 18,
//                           paddingVertical: 8,
//                           paddingHorizontal: 12,
//                           marginRight: 10,
//                         }}>
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
//                             paddingVertical: 8,
//                             paddingHorizontal: 12,
//                             borderRadius: 18,
//                             backgroundColor:
//                               theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                           }}>
//                           <MaterialIcons
//                             name="close"
//                             size={20}
//                             color="red"
//                             style={{marginRight: 6}}
//                           />
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
//                               paddingHorizontal: 10,
//                               paddingVertical: 6,
//                               backgroundColor:
//                                 theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               borderRadius: 16,
//                               marginRight: 6,
//                               marginBottom: 6,
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
//               <Text
//                 style={{
//                   color: theme.colors.foreground,
//                   fontWeight: '700',
//                   fontSize: 16,
//                 }}>
//                 Edit Outfit Name
//               </Text>
//               <TextInput
//                 value={editedName}
//                 onChangeText={setEditedName}
//                 placeholder="Enter new name"
//                 placeholderTextColor={theme.colors.foreground3}
//                 style={styles.input}
//               />
//               <View style={styles.modalActions}>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={() => {
//                     setEditingOutfitId(null);
//                     setEditedName('');
//                   }}>
//                   <Text
//                     style={{color: theme.colors.foreground, marginRight: 24}}>
//                     Cancel
//                   </Text>
//                 </AppleTouchFeedback>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={handleNameSave}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '700'}}>
//                     Save
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </View>
//         )}

//         {/* 📅 Step 1: Date Picker — Apple-style bottom sheet */}
//         {showDatePicker && planningOutfitId && (
//           <TouchableWithoutFeedback onPress={resetPlanFlow}>
//             <View style={styles.overlay}>
//               <TouchableWithoutFeedback onPress={() => {}}>
//                 <View style={[styles.sheetContainer]}>
//                   <View style={styles.grabber} />
//                   <View style={styles.sheetHeaderRow}>
//                     <Text style={styles.sheetTitle}>Pick a date</Text>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={resetPlanFlow}
//                       style={styles.sheetPill}>
//                       <Text style={styles.sheetPillText}>Close</Text>
//                     </AppleTouchFeedback>
//                   </View>

//                   <DateTimePicker
//                     value={selectedTempDate || new Date()}
//                     mode="date"
//                     display="spinner"
//                     themeVariant="dark"
//                     textColor={theme.colors.foreground} // ← your theme color
//                     onChange={(e, d) => d && setSelectedTempDate(new Date(d))}
//                     style={{marginVertical: -10}}
//                   />

//                   <View style={styles.sheetFooterRow}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={resetPlanFlow}
//                       style={[
//                         styles.sheetPill,
//                         {backgroundColor: theme.colors.surface},
//                       ]}>
//                       <Text style={styles.sheetPillText}>Cancel</Text>
//                     </AppleTouchFeedback>

//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         setShowDatePicker(false);
//                         setShowTimePicker(true);
//                       }}
//                       style={[
//                         styles.sheetPill,
//                         {backgroundColor: theme.colors.background},
//                       ]}>
//                       <Text
//                         style={{
//                           color: theme.colors.foreground,
//                           fontWeight: '800',
//                         }}>
//                         Next: Time
//                       </Text>
//                     </AppleTouchFeedback>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         )}

//         {/* ⏰ Step 2: Time Picker — Apple-style bottom sheet */}
//         {showTimePicker && planningOutfitId && (
//           <TouchableWithoutFeedback onPress={resetPlanFlow}>
//             <View style={styles.overlay}>
//               <TouchableWithoutFeedback onPress={() => {}}>
//                 <View style={[styles.sheetContainer]}>
//                   <View style={styles.grabber} />
//                   <View style={styles.sheetHeaderRow}>
//                     <Text style={styles.sheetTitle}>Pick a time</Text>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={resetPlanFlow}
//                       style={styles.sheetPill}>
//                       <Text style={styles.sheetPillText}>Close</Text>
//                     </AppleTouchFeedback>
//                   </View>

//                   <DateTimePicker
//                     value={selectedTempTime || new Date()}
//                     mode="time"
//                     display="spinner"
//                     themeVariant="dark"
//                     textColor={theme.colors.foreground} // ← your theme color
//                     onChange={(e, t) => t && setSelectedTempTime(new Date(t))}
//                     style={{marginVertical: -10}}
//                   />

//                   <View style={styles.sheetFooterRow}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={resetPlanFlow}
//                       style={[
//                         styles.sheetPill,
//                         {backgroundColor: theme.colors.input2},
//                       ]}>
//                       <Text style={styles.sheetPillText}>Cancel</Text>
//                     </AppleTouchFeedback>

//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={commitSchedule}
//                       style={[
//                         styles.sheetPill,
//                         {backgroundColor: theme.colors.button1},
//                       ]}>
//                       <Text
//                         style={{
//                           color: theme.colors.buttonText1,
//                           fontWeight: '800',
//                         }}>
//                         Done
//                       </Text>
//                     </AppleTouchFeedback>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         )}

//         {/* 🧼 Undo Toast */}
//         {lastDeletedOutfit && (
//           <View style={styles.toast}>
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
//               <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                 Undo
//               </Text>
//             </AppleTouchFeedback>
//           </View>
//         )}

//         {/* 🗑 Delete confirm */}
//         {showDeleteConfirm && pendingDeleteId && (
//           <View
//             style={{
//               ...StyleSheet.absoluteFillObject,
//               backgroundColor: 'rgba(0,0,0,0.5)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               padding: 24,
//             }}>
//             <View
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 padding: 22,
//                 borderRadius: 18,
//                 width: '100%',
//                 maxWidth: 380,
//                 borderWidth: StyleSheet.hairlineWidth,
//                 borderColor: theme.colors.surfaceBorder,
//                 shadowColor: '#000',
//                 shadowOpacity: 0.28,
//                 shadowRadius: 24,
//                 shadowOffset: {width: 0, height: 12},
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   color: theme.colors.foreground,
//                   fontWeight: '700',
//                   marginBottom: 8,
//                 }}>
//                 Delete this outfit?
//               </Text>
//               <Text
//                 style={{
//                   fontSize: 14,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                 }}>
//                 This action cannot be undone.
//               </Text>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   justifyContent: 'flex-end',
//                 }}>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={() => {
//                     setShowDeleteConfirm(false);
//                     setPendingDeleteId(null);
//                   }}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       marginHorizontal: 16,
//                     }}>
//                     Cancel
//                   </Text>
//                 </AppleTouchFeedback>
//                 <AppleTouchFeedback
//                   hapticStyle="notificationWarning"
//                   onPress={() => {
//                     if (pendingDeleteId) handleDelete(pendingDeleteId);
//                     setShowDeleteConfirm(false);
//                     setPendingDeleteId(null);
//                   }}>
//                   <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                     Delete
//                   </Text>
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
//               <MaterialIcons
//                 name="close"
//                 size={32}
//                 color={theme.colors.foreground}
//               />
//             </AppleTouchFeedback>

//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontSize: 30,
//                 fontWeight: '800',
//                 marginBottom: 12,
//               }}>
//               {fullScreenOutfit.name || 'Unnamed Outfit'}
//             </Text>

//             <ScrollView
//               style={{alignSelf: 'stretch'}}
//               contentContainerStyle={{
//                 paddingBottom: 24,
//                 alignItems: 'center',
//                 // backgroundColor: theme.colors.surface3,
//                 borderRadius: tokens.borderRadius.xl,
//               }}>
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
//                   color: theme.colors.foreground,
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
//                       backgroundColor: theme.colors.surface3,
//                       borderRadius: 16,
//                       paddingHorizontal: 8,
//                       paddingVertical: 4,
//                       margin: 4,
//                     }}>
//                     <Text
//                       style={{color: theme.colors.foreground, fontSize: 12}}>
//                       #{tag}
//                     </Text>
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

////////////////////////

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
//   Dimensions,
//   TouchableWithoutFeedback,
//   Platform,
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
// const SHEET_MAX_H = Math.min(Dimensions.get('window').height * 0.72, 560);

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

//   // 🔔 Local alert helpers
//   const scheduleOutfitLocalAlert = (
//     outfitId: string,
//     outfitName: string | undefined,
//     when: Date,
//   ) => {
//     const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
//     PushNotification.localNotificationSchedule({
//       id: `outfit-${outfitId}`,
//       channelId: 'outfits',
//       title: 'Outfit Reminder',
//       message: `Wear ${outfitName?.trim() || 'your planned outfit'} 👕`,
//       date: local,
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

//       setCombinedOutfits(prev =>
//         prev.map(o => (o.id === outfitId ? {...o, plannedDate: undefined} : o)),
//       );

//       cancelOutfitLocalAlert(outfitId);

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

//       cancelOutfitLocalAlert(planningOutfitId);
//       const oldKey = `outfitCalendar:${planningOutfitId}`;
//       const oldEventId = await AsyncStorage.getItem(oldKey);
//       if (oldEventId) {
//         await removeCalendarEvent(oldEventId);
//         await AsyncStorage.removeItem(oldKey);
//       }

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

//       setCombinedOutfits(prev =>
//         prev.map(o =>
//           o.id === planningOutfitId
//             ? {...o, plannedDate: combined.toISOString()}
//             : o,
//         ),
//       );

//       scheduleOutfitLocalAlert(planningOutfitId, selectedOutfit.name, combined);

//       const eventId = await addOutfitToCalendar({
//         title: selectedOutfit.name?.trim() || 'Outfit',
//         startISO: combined.toISOString(),
//         notes: selectedOutfit.notes || '',
//         alarmMinutesBefore: 0,
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
//       borderRadius: 24,
//       padding: 18,
//       marginBottom: 12,
//       borderWidth: tokens.borderWidth?.md ?? StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
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
//       marginTop: 10,
//       gap: 12,
//     },
//     notes: {
//       marginTop: 12,
//       fontStyle: 'italic',
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 20,
//     },
//     stars: {flexDirection: 'row', marginTop: 6},

//     // Generic overlay
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.5)',
//       justifyContent: 'flex-end',
//     },

//     // Centered modal (edit name)
//     modalContainer: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.5)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 24,
//     },
//     modalContent: {
//       backgroundColor: theme.colors.surface,
//       padding: 18,
//       borderRadius: 18,
//       width: '100%',
//       maxWidth: 420,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.28,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: 12},
//     },
//     input: {
//       marginTop: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingVertical: 8,
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//     modalActions: {
//       flexDirection: 'row',
//       justifyContent: 'flex-end',
//       marginTop: 16,
//       gap: 14,
//     },

//     // Full-screen outfit viewer
//     fullModalContainer: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       padding: 20,
//       paddingTop: 72,
//     },
//     fullImage: {
//       width: '68%',
//       aspectRatio: 1,
//       // borderRadius: tokens.borderRadius.md,
//       marginVertical: 10,
//       backgroundColor: theme.colors.background,
//     },

//     // Bottom sheet base (for pickers)
//     sheetContainer: {
//       backgroundColor: theme.colors.surface3,
//       borderTopLeftRadius: 20,
//       borderTopRightRadius: 20,
//       paddingTop: 8,
//       paddingBottom: Platform.OS === 'ios' ? 100 : 20,
//       paddingHorizontal: 16,
//       maxHeight: SHEET_MAX_H,
//       shadowColor: '#000',
//       shadowOpacity: 0.2,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: -10},
//       elevation: 22,
//     },
//     grabber: {
//       alignSelf: 'center',
//       width: 40,
//       height: 5,
//       borderRadius: 3,
//       backgroundColor: theme.colors.inputText1 ?? 'rgba(121,121,121,0.45)',
//       marginBottom: 8,
//     },
//     sheetHeaderRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: 8,
//       paddingHorizontal: 2,
//     },
//     sheetTitle: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     sheetPill: {
//       paddingHorizontal: 14,
//       paddingVertical: 8,
//       borderRadius: 18,
//       backgroundColor: theme.colors.input2 ?? 'rgba(43,43,43,1)',
//     },
//     sheetPillText: {
//       color: theme.colors.foreground3 ?? '#EAEAEA',
//       fontWeight: '700',
//     },
//     sheetFooterRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//       marginTop: 10,
//       marginBottom: 6,
//     },

//     // Toast
//     toast: {
//       position: 'absolute',
//       bottom: 20,
//       left: 20,
//       right: 20,
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 12,
//       paddingHorizontal: 14,
//       borderRadius: 14,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 16,
//       shadowOffset: {width: 0, height: 10},
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
//                           ? theme.colors.foreground
//                           : theme.colors.surface3,
//                       marginRight: 7,
//                     },
//                   ]}>
//                   <Text
//                     style={[
//                       globalStyles.pillTextFixedWidth2,
//                       {
//                         color:
//                           sortType === key
//                             ? theme.colors.background
//                             : theme.colors.foreground2,
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
//           contentContainerStyle={{
//             paddingBottom: 100,
//             alignItems: 'center',
//           }}>
//           <View style={{width: '100%', maxWidth: 420, alignSelf: 'center'}}>
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
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           gap: 10,
//                         }}>
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
//                           }}
//                           style={{
//                             padding: 8,
//                             borderRadius: 14,
//                             backgroundColor:
//                               theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                           }}>
//                           <MaterialIcons
//                             name="favorite"
//                             size={22}
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
//                           style={{
//                             padding: 8,
//                             borderRadius: 14,
//                             marginLeft: 6,
//                             backgroundColor:
//                               theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                           }}>
//                           <MaterialIcons
//                             name="delete"
//                             size={22}
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
//                               style={[
//                                 globalStyles.image1,
//                                 {marginRight: 12, borderRadius: 16},
//                               ]}
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
//                         style={{
//                           backgroundColor: theme.colors.surface3,
//                           borderRadius: 18,
//                           paddingVertical: 8,
//                           paddingHorizontal: 12,
//                           marginRight: 10,
//                         }}>
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
//                             paddingVertical: 8,
//                             paddingHorizontal: 12,
//                             borderRadius: 18,
//                             backgroundColor:
//                               theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                           }}>
//                           <MaterialIcons
//                             name="close"
//                             size={20}
//                             color="red"
//                             style={{marginRight: 6}}
//                           />
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
//                               paddingHorizontal: 10,
//                               paddingVertical: 6,
//                               backgroundColor:
//                                 theme.colors.input2 ?? 'rgba(43,43,43,1)',
//                               borderRadius: 16,
//                               marginRight: 6,
//                               marginBottom: 6,
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
//               <Text
//                 style={{
//                   color: theme.colors.foreground,
//                   fontWeight: '700',
//                   fontSize: 16,
//                 }}>
//                 Edit Outfit Name
//               </Text>
//               <TextInput
//                 value={editedName}
//                 onChangeText={setEditedName}
//                 placeholder="Enter new name"
//                 placeholderTextColor={theme.colors.foreground3}
//                 style={styles.input}
//               />
//               <View style={styles.modalActions}>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={() => {
//                     setEditingOutfitId(null);
//                     setEditedName('');
//                   }}>
//                   <Text
//                     style={{color: theme.colors.foreground, marginRight: 24}}>
//                     Cancel
//                   </Text>
//                 </AppleTouchFeedback>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={handleNameSave}>
//                   <Text
//                     style={{color: theme.colors.primary, fontWeight: '700'}}>
//                     Save
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>
//           </View>
//         )}

//         {/* 📅 Step 1: Date Picker — Apple-style bottom sheet */}
//         {showDatePicker && planningOutfitId && (
//           <TouchableWithoutFeedback onPress={resetPlanFlow}>
//             <View style={styles.overlay}>
//               <TouchableWithoutFeedback onPress={() => {}}>
//                 <View style={[styles.sheetContainer]}>
//                   <View style={styles.grabber} />
//                   <View style={styles.sheetHeaderRow}>
//                     <Text style={styles.sheetTitle}>Pick a date</Text>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={resetPlanFlow}
//                       style={styles.sheetPill}>
//                       <Text style={styles.sheetPillText}>Close</Text>
//                     </AppleTouchFeedback>
//                   </View>

//                   <DateTimePicker
//                     value={selectedTempDate || new Date()}
//                     mode="date"
//                     display="spinner"
//                     themeVariant="dark"
//                     onChange={(event, selectedDate) => {
//                       if (selectedDate)
//                         setSelectedTempDate(new Date(selectedDate));
//                     }}
//                     style={{marginVertical: -10}}
//                   />

//                   <View style={styles.sheetFooterRow}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={resetPlanFlow}
//                       style={[
//                         styles.sheetPill,
//                         {backgroundColor: theme.colors.surface},
//                       ]}>
//                       <Text style={styles.sheetPillText}>Cancel</Text>
//                     </AppleTouchFeedback>

//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={() => {
//                         setShowDatePicker(false);
//                         setShowTimePicker(true);
//                       }}
//                       style={[
//                         styles.sheetPill,
//                         {backgroundColor: theme.colors.background},
//                       ]}>
//                       <Text
//                         style={{
//                           color: theme.colors.foreground,
//                           fontWeight: '800',
//                         }}>
//                         Next: Time
//                       </Text>
//                     </AppleTouchFeedback>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         )}

//         {/* ⏰ Step 2: Time Picker — Apple-style bottom sheet */}
//         {showTimePicker && planningOutfitId && (
//           <TouchableWithoutFeedback onPress={resetPlanFlow}>
//             <View style={styles.overlay}>
//               <TouchableWithoutFeedback onPress={() => {}}>
//                 <View style={[styles.sheetContainer]}>
//                   <View style={styles.grabber} />
//                   <View style={styles.sheetHeaderRow}>
//                     <Text style={styles.sheetTitle}>Pick a time</Text>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={resetPlanFlow}
//                       style={styles.sheetPill}>
//                       <Text style={styles.sheetPillText}>Close</Text>
//                     </AppleTouchFeedback>
//                   </View>

//                   <DateTimePicker
//                     value={selectedTempTime || new Date()}
//                     mode="time"
//                     display="spinner"
//                     themeVariant="dark"
//                     onChange={(event, selectedTime) => {
//                       if (selectedTime)
//                         setSelectedTempTime(new Date(selectedTime));
//                     }}
//                     style={{marginVertical: -10}}
//                   />

//                   <View style={styles.sheetFooterRow}>
//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={resetPlanFlow}
//                       style={[
//                         styles.sheetPill,
//                         {backgroundColor: theme.colors.input2},
//                       ]}>
//                       <Text style={styles.sheetPillText}>Cancel</Text>
//                     </AppleTouchFeedback>

//                     <AppleTouchFeedback
//                       hapticStyle="impactLight"
//                       onPress={commitSchedule}
//                       style={[
//                         styles.sheetPill,
//                         {backgroundColor: theme.colors.primary},
//                       ]}>
//                       <Text style={{color: '#000', fontWeight: '800'}}>
//                         Done
//                       </Text>
//                     </AppleTouchFeedback>
//                   </View>
//                 </View>
//               </TouchableWithoutFeedback>
//             </View>
//           </TouchableWithoutFeedback>
//         )}

//         {/* 🧼 Undo Toast */}
//         {lastDeletedOutfit && (
//           <View style={styles.toast}>
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
//               <Text style={{color: theme.colors.primary, fontWeight: '700'}}>
//                 Undo
//               </Text>
//             </AppleTouchFeedback>
//           </View>
//         )}

//         {/* 🗑 Delete confirm */}
//         {showDeleteConfirm && pendingDeleteId && (
//           <View
//             style={{
//               ...StyleSheet.absoluteFillObject,
//               backgroundColor: 'rgba(0,0,0,0.5)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               padding: 24,
//             }}>
//             <View
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 padding: 22,
//                 borderRadius: 18,
//                 width: '100%',
//                 maxWidth: 380,
//                 borderWidth: StyleSheet.hairlineWidth,
//                 borderColor: theme.colors.surfaceBorder,
//                 shadowColor: '#000',
//                 shadowOpacity: 0.28,
//                 shadowRadius: 24,
//                 shadowOffset: {width: 0, height: 12},
//               }}>
//               <Text
//                 style={{
//                   fontSize: 16,
//                   color: theme.colors.foreground,
//                   fontWeight: '700',
//                   marginBottom: 8,
//                 }}>
//                 Delete this outfit?
//               </Text>
//               <Text
//                 style={{
//                   fontSize: 14,
//                   color: theme.colors.foreground2,
//                   marginBottom: 18,
//                 }}>
//                 This action cannot be undone.
//               </Text>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   justifyContent: 'flex-end',
//                 }}>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={() => {
//                     setShowDeleteConfirm(false);
//                     setPendingDeleteId(null);
//                   }}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground,
//                       marginHorizontal: 16,
//                     }}>
//                     Cancel
//                   </Text>
//                 </AppleTouchFeedback>
//                 <AppleTouchFeedback
//                   hapticStyle="notificationWarning"
//                   onPress={() => {
//                     if (pendingDeleteId) handleDelete(pendingDeleteId);
//                     setShowDeleteConfirm(false);
//                     setPendingDeleteId(null);
//                   }}>
//                   <Text style={{color: theme.colors.error, fontWeight: '800'}}>
//                     Delete
//                   </Text>
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
//               <MaterialIcons
//                 name="close"
//                 size={32}
//                 color={theme.colors.foreground}
//               />
//             </AppleTouchFeedback>

//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontSize: 20,
//                 marginBottom: 12,
//               }}>
//               {fullScreenOutfit.name || 'Unnamed Outfit'}
//             </Text>

//             <ScrollView
//               style={{alignSelf: 'stretch'}}
//               contentContainerStyle={{
//                 paddingBottom: 24,
//                 alignItems: 'center',
//                 // backgroundColor: theme.colors.surface3,
//                 borderRadius: tokens.borderRadius.xl,
//               }}>
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
//                   color: theme.colors.foreground,
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
//                       backgroundColor: theme.colors.surface3,
//                       borderRadius: 16,
//                       paddingHorizontal: 8,
//                       paddingVertical: 4,
//                       margin: 4,
//                     }}>
//                     <Text
//                       style={{color: theme.colors.foreground, fontSize: 12}}>
//                       #{tag}
//                     </Text>
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
