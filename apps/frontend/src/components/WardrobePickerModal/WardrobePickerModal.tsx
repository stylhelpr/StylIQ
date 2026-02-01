import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useWardrobeItems} from '../../hooks/useWardrobeItems';
import {useUUID} from '../../context/UUIDContext';
import {API_BASE_URL} from '../../config/api';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {SafeAreaView} from 'react-native-safe-area-context';

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

// Category tabs for filtering
const CATEGORY_TABS = [
  {value: 'All', label: 'All', icon: 'category'},
  {value: 'Tops', label: 'Tops', icon: 'checkroom'},
  {value: 'Bottoms', label: 'Bottoms', icon: 'drag-handle'},
  {value: 'Shoes', label: 'Shoes', icon: 'hiking'},
  {value: 'Outerwear', label: 'Outerwear', icon: 'ac-unit'},
  {value: 'Accessories', label: 'Accessories', icon: 'watch'},
];

type WardrobeItem = {
  id: string;
  image_url?: string;
  image?: string; // API may return either image or image_url
  name?: string;
  label?: string;
  main_category?: string;
  mainCategory?: string; // API may return either snake_case or camelCase
  subcategory?: string;
  subCategory?: string;
  color?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectItem: (item: WardrobeItem) => void;
  defaultCategory?: string; // Pre-select a category (e.g., "Tops" for swap mode)
};

function resolveUri(u?: string): string {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const base = API_BASE_URL.replace(/\/+$/, '');
  const path = u.replace(/^\/+/, '');
  return `${base}/${path}`;
}

export default function WardrobePickerModal({
  visible,
  onClose,
  onSelectItem,
  defaultCategory,
}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const userId = useUUID();

  const {data: wardrobe, isLoading} = useWardrobeItems(userId || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory || 'All');

  // Reset to default category when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedCategory(defaultCategory || 'All');
    }
  }, [visible, defaultCategory]);

  // Filter wardrobe by category
  const filteredItems = useMemo(() => {
    if (!wardrobe || !Array.isArray(wardrobe)) return [];
    if (selectedCategory === 'All') return wardrobe;
    return wardrobe.filter(
      (item: WardrobeItem) => {
        const category = item.main_category || item.mainCategory;
        return category?.toLowerCase() === selectedCategory.toLowerCase();
      },
    );
  }, [wardrobe, selectedCategory]);

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      flex: 1,
      backgroundColor: theme.colors.background,
      marginTop: 60,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    closeButton: {
      padding: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.muted,
      textAlign: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    categoryTabs: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    categoryTab: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      backgroundColor: theme.colors.surface3,
    },
    categoryTabActive: {
      backgroundColor: theme.colors.foreground,
    },
    categoryTabText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    categoryTabTextActive: {
      color: theme.colors.background,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      padding: 12,
    },
    itemWrapper: {
      width: '31%',
      aspectRatio: 1,
      margin: '1%',
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: '#fff',
    },
    itemImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    itemPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surface3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.muted,
      textAlign: 'center',
    },
  });

  const handleSelectItem = (item: WardrobeItem) => {
    h('impactMedium');
    onSelectItem(item);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContent} edges={['bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Start from a Piece</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                h('impactLight');
                onClose();
              }}>
              <MaterialIcons
                name="close"
                size={24}
                color={theme.colors.foreground}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select an item to build your outfit around
          </Text>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.categoryTabs, {minHeight: 57, maxHeight: 58, backgroundColor: theme.colors.surface}]}>
            {CATEGORY_TABS.map(tab => (
              <TouchableOpacity
                key={tab.value}
                onPress={() => {
                  h('selection');
                  setSelectedCategory(tab.value);
                }}
                style={[
                  styles.categoryTab,
                  selectedCategory === tab.value && styles.categoryTabActive,
                ]}>
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === tab.value &&
                      styles.categoryTabTextActive,
                  ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{marginTop: 12, color: theme.colors.muted}}>
                Loading wardrobe...
              </Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="checkroom"
                size={48}
                color={theme.colors.muted}
              />
              <Text style={styles.emptyText}>
                {selectedCategory === 'All'
                  ? 'No items in your wardrobe yet.'
                  : `No ${selectedCategory.toLowerCase()} in your wardrobe.`}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.grid}>
              {filteredItems.map((item: WardrobeItem) => {
                const uri = resolveUri(item.image_url || item.image);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemWrapper}
                    onPress={() => handleSelectItem(item)}
                    activeOpacity={0.8}>
                    {uri ? (
                      <Image source={{uri}} style={styles.itemImage} />
                    ) : (
                      <View style={styles.itemPlaceholder}>
                        <MaterialIcons
                          name="image"
                          size={32}
                          color={theme.colors.muted}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
