import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {getAccessToken} from '../utils/auth';
import OutfitCanvas from '../components/OutfitCanvas/OutfitCanvas';
import ItemDrawer from '../components/OutfitCanvas/ItemDrawer';
import SaveOutfitModal from '../components/OutfitCanvas/SaveOutfitModal';
import DiscardConfirmModal from '../components/OutfitCanvas/DiscardConfirmModal';
import {CanvasItemData} from '../components/OutfitCanvas/CanvasItem';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import uuid from 'react-native-uuid';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type WardrobeItem = {
  id: string;
  image?: string;
  image_url?: string;
  thumbnailUrl?: string;
  processedImageUrl?: string;
  touchedUpImageUrl?: string;
  name?: string;
  main_category?: string;
  mainCategory?: string;
};

type Props = {
  navigate: (screen: string, params?: any) => void;
  initialItem?: WardrobeItem;
};

export default function OutfitCanvasScreen({navigate, initialItem}: Props) {
  const {theme} = useAppTheme();
  const userId = useUUID();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // Get best image URL from wardrobe item (prefer processed versions)
  const getItemImageUrl = (item: WardrobeItem): string => {
    return (
      item.touchedUpImageUrl ??
      item.processedImageUrl ??
      item.thumbnailUrl ??
      item.image_url ??
      item.image ??
      ''
    );
  };

  // Canvas state
  const [placedItems, setPlacedItems] = useState<CanvasItemData[]>(() => {
    // Initialize with initial item if provided
    if (initialItem) {
      const imageUrl = getItemImageUrl(initialItem);
      return [
        {
          id: uuid.v4() as string,
          wardrobeItemId: initialItem.id,
          imageUrl: resolveImageUrl(imageUrl),
          x: 0.5,
          y: 0.4,
          scale: 1.0,
          zIndex: 1,
        },
      ];
    }
    return [];
  });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(2);
  const [isDirty, setIsDirty] = useState(false);

  // Modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Resolve image URL helper
  function resolveImageUrl(u: string): string {
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    const base = API_BASE_URL.replace(/\/+$/, '');
    const path = u.replace(/^\/+/, '');
    return `${base}/${path}`;
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: {name: string}) => {
      const accessToken = await getAccessToken();

      // Build canvas_data for API
      const canvasData = {
        version: 1,
        placedItems: placedItems.map(item => ({
          id: item.id,
          wardrobeItemId: item.wardrobeItemId,
          x: item.x,
          y: item.y,
          scale: item.scale,
          zIndex: item.zIndex,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/custom-outfits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          user_id: userId,
          name: payload.name,
          canvas_data: canvasData,
          // Also set thumbnail from first item
          thumbnail_url: placedItems[0]?.imageUrl || '',
        }),
      });

      if (!res.ok) throw new Error('Failed to save outfit');
      return res.json();
    },
    onSuccess: async newOutfit => {
      // Auto-favorite the new outfit
      const accessToken = await getAccessToken();
      await fetch(`${API_BASE_URL}/outfit/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({user_id: userId, outfit_id: newOutfit.outfit?.id || newOutfit.id}),
      }).catch(() => {});

      // Invalidate caches
      queryClient.invalidateQueries({queryKey: ['saved-outfits', userId]});
      queryClient.invalidateQueries({queryKey: ['savedOutfits', userId]});
      queryClient.invalidateQueries({queryKey: ['favorites', userId]});

      ReactNativeHapticFeedback.trigger('notificationSuccess', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      setShowSaveModal(false);
      setIsDirty(false);
      navigate('SavedOutfits');
    },
    onError: error => {
      console.error('Failed to save outfit:', error);
      ReactNativeHapticFeedback.trigger('notificationError', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    },
  });

  // Get placed wardrobe item IDs for drawer
  const placedItemIds = useMemo(
    () => placedItems.map(item => item.wardrobeItemId),
    [placedItems],
  );

  // Add item to canvas
  const handleAddItem = useCallback(
    (wardrobeItem: WardrobeItem) => {
      const imageUrl = getItemImageUrl(wardrobeItem);
      const newItem: CanvasItemData = {
        id: uuid.v4() as string,
        wardrobeItemId: wardrobeItem.id,
        imageUrl: resolveImageUrl(imageUrl),
        x: 0.5,
        y: 0.4,
        scale: 1.0,
        zIndex: nextZIndex,
      };

      setPlacedItems(prev => [...prev, newItem]);
      setNextZIndex(prev => prev + 1);
      setSelectedItemId(newItem.id);
      setIsDirty(true);
    },
    [nextZIndex],
  );

  // Update item position/scale
  const handleUpdateItem = useCallback(
    (id: string, updates: Partial<CanvasItemData>) => {
      setPlacedItems(prev =>
        prev.map(item => (item.id === id ? {...item, ...updates} : item)),
      );
      setIsDirty(true);
    },
    [],
  );

  // Bring item to front
  const handleBringToFront = useCallback(
    (id: string) => {
      setPlacedItems(prev =>
        prev.map(item =>
          item.id === id ? {...item, zIndex: nextZIndex} : item,
        ),
      );
      setNextZIndex(prev => prev + 1);
      setIsDirty(true);
    },
    [nextZIndex],
  );

  // Send item to back
  const handleSendToBack = useCallback((id: string) => {
    setPlacedItems(prev => {
      const minZ = Math.min(...prev.map(i => i.zIndex));
      return prev.map(item =>
        item.id === id ? {...item, zIndex: minZ - 1} : item,
      );
    });
    setIsDirty(true);
  }, []);

  // Remove item
  const handleRemoveItem = useCallback((id: string) => {
    setPlacedItems(prev => prev.filter(item => item.id !== id));
    setSelectedItemId(null);
    setIsDirty(true);
  }, []);

  // Handle back button
  const handleBack = useCallback(() => {
    if (isDirty && placedItems.length > 0) {
      setShowDiscardModal(true);
    } else {
      navigate('Closet');
    }
  }, [isDirty, placedItems.length, navigate]);

  // Handle save button
  const handleSavePress = useCallback(() => {
    if (placedItems.length === 0) {
      ReactNativeHapticFeedback.trigger('notificationWarning', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
      return;
    }
    setShowSaveModal(true);
  }, [placedItems.length]);

  // Handle save from modal
  const handleSave = useCallback(
    (name: string) => {
      saveMutation.mutate({name});
    },
    [saveMutation],
  );

  // Handle discard
  const handleDiscard = useCallback(() => {
    setShowDiscardModal(false);
    navigate('Closet');
  }, [navigate]);

  // Handle save from discard modal
  const handleSaveFromDiscard = useCallback(() => {
    setShowDiscardModal(false);
    setShowSaveModal(true);
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: insets.top > 0 ? 8 : 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    headerSpacer: {
      width: 40,
    },
    canvasContainer: {
      flex: 1,
      margin: 16,
      marginBottom: 0,
    },
    floatingSaveButton: {
      position: 'absolute',
      right: 20,
      bottom: 200,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.button1,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    floatingSaveButtonDisabled: {
      opacity: 0.5,
    },
    itemCount: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: theme.colors.primary || '#007AFF',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    itemCountText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.foreground}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Build Outfit</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Canvas */}
      <View style={styles.canvasContainer}>
        <OutfitCanvas
          placedItems={placedItems}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          onUpdateItem={handleUpdateItem}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onRemoveItem={handleRemoveItem}
        />
      </View>

      {/* Item Drawer */}
      <ItemDrawer onAddItem={handleAddItem} placedItemIds={placedItemIds} />

      {/* Floating Save Button */}
      <TouchableOpacity
        style={[
          styles.floatingSaveButton,
          placedItems.length === 0 && styles.floatingSaveButtonDisabled,
        ]}
        onPress={handleSavePress}
        activeOpacity={0.8}
        disabled={placedItems.length === 0}>
        <MaterialIcons
          name="check"
          size={28}
          color={theme.colors.buttonText1}
        />
        {placedItems.length > 0 && (
          <View style={styles.itemCount}>
            <Text style={styles.itemCountText}>{placedItems.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modals */}
      <SaveOutfitModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
      />

      <DiscardConfirmModal
        visible={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onDiscard={handleDiscard}
        onSave={handleSaveFromDiscard}
      />
    </SafeAreaView>
  );
}
