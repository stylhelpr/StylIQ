import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Keyboard,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  Share,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';
import {useShoppingStore} from '../../../../store/shoppingStore';
import {triggerHaptic} from '../utils/haptics';

const {width: screenWidth} = Dimensions.get('window');
const TAB_CARD_WIDTH = (screenWidth - 48) / 2;
const TAB_CARD_HEIGHT = TAB_CARD_WIDTH * 1.4;

const SHOPPING_SITES = [
  {name: 'Google', url: 'https://google.com'},
  {name: 'Amazon', url: 'https://amazon.com'},
  {name: 'ASOS', url: 'https://asos.com'},
  {name: 'H&M', url: 'https://hm.com'},
  {name: 'Zara', url: 'https://zara.com'},
  {name: 'Shein', url: 'https://shein.com'},
  {name: 'SSENSE', url: 'https://ssense.com'},
  {name: 'Farfetch', url: 'https://farfetch.com'},
  {name: 'Nordstrom', url: 'https://nordstrom.com'},
];

type Props = {
  route?: {params?: {url?: string; title?: string}};
};

export default function WebBrowserScreen({route}: Props) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const initialUrl = route?.params?.url || '';
  const webRef = useRef<WebView>(null);
  const [inputValue, setInputValue] = useState(initialUrl);
  const [showTabsView, setShowTabsView] = useState(false);
  const tabsViewScale = useRef(new Animated.Value(0)).current;

  const {
    tabs,
    currentTabId,
    addTab,
    removeTab,
    switchTab,
    updateTab,
    addBookmark,
    removeBookmark,
    isBookmarked,
    bookmarks,
    collections,
    addItemToCollection,
  } = useShoppingStore();

  const currentTab = tabs.find(t => t.id === currentTabId);
  const bookmarked = currentTab ? isBookmarked(currentTab.url) : false;
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);

  // Initialize with a tab if navigating with URL
  useEffect(() => {
    if (initialUrl && tabs.length === 0) {
      addTab(initialUrl, 'New Tab');
    }
  }, []);

  // Update input when tab changes
  useEffect(() => {
    if (currentTab) {
      setInputValue(currentTab.url);
    }
  }, [currentTabId, currentTab?.url]);

  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url || 'New Tab';
    }
  };

  const normalizeUrl = (text: string): string => {
    const normalized = text.trim();
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }
    if (normalized.includes('.') && !normalized.includes(' ')) {
      return `https://${normalized}`;
    }
    return `https://google.com/search?q=${encodeURIComponent(normalized)}`;
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      const newUrl = normalizeUrl(inputValue);
      if (currentTab) {
        updateTab(currentTab.id, newUrl, currentTab.title);
      } else {
        addTab(newUrl, 'New Tab');
      }
    }
    Keyboard.dismiss();
  };

  const handleQuickShop = (url: string) => {
    addTab(url, getDomain(url));
    setShowTabsView(false);
  };

  const handleSaveMenuOpen = () => {
    if (!currentTab || !currentTab.url) return;
    triggerHaptic('impactLight');
    setShowSaveMenu(true);
  };

  const handleAddToBookmarks = () => {
    if (!currentTab) return;
    triggerHaptic('impactLight');
    if (bookmarked) {
      const bookmark = bookmarks.find(b => b.url === currentTab.url);
      if (bookmark) {
        removeBookmark(bookmark.id);
      }
    } else {
      addBookmark({
        id: Date.now().toString(),
        title: currentTab.title || getDomain(currentTab.url),
        url: currentTab.url,
        source: getDomain(currentTab.url),
        addedAt: Date.now(),
      });
    }
    setShowSaveMenu(false);
  };

  const handleAddToCollection = (collectionId: string) => {
    if (!currentTab) return;
    triggerHaptic('impactLight');
    addItemToCollection(collectionId, {
      id: Date.now().toString(),
      title: currentTab.title || getDomain(currentTab.url),
      url: currentTab.url,
      source: getDomain(currentTab.url),
      addedAt: Date.now(),
    });
    setShowCollectionPicker(false);
    setShowSaveMenu(false);
  };

  const handleShare = async () => {
    if (!currentTab || !currentTab.url) return;
    triggerHaptic('impactLight');
    try {
      await Share.share({
        url: currentTab.url,
        title: currentTab.title || getDomain(currentTab.url),
        message: `${currentTab.title || getDomain(currentTab.url)}\n${currentTab.url}`,
      });
      setShowSaveMenu(false);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleOpenBookmarks = () => {
    triggerHaptic('impactLight');
    setShowSaveMenu(false);
    setShowBookmarksModal(true);
  };

  const handleBookmarkNavigation = (url: string, title: string) => {
    triggerHaptic('impactLight');
    if (currentTab) {
      updateTab(currentTab.id, url, title);
    } else {
      addTab(url, title);
    }
    setShowBookmarksModal(false);
  };

  const openTabsView = () => {
    triggerHaptic('impactLight');
    setShowTabsView(true);
    Animated.spring(tabsViewScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const closeTabsView = () => {
    Animated.timing(tabsViewScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowTabsView(false));
  };

  const handleSelectTab = (tabId: string) => {
    triggerHaptic('impactLight');
    switchTab(tabId);
    closeTabsView();
  };

  const handleCloseTab = (tabId: string) => {
    triggerHaptic('impactMedium');
    removeTab(tabId);
  };

  const handleNewTab = () => {
    triggerHaptic('impactLight');
    addTab('', 'New Tab');
    closeTabsView();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: insets.top + 55,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    urlBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
    },
    urlInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.foreground,
      padding: 0,
    },
    iconButton: {
      padding: 4,
      marginLeft: 8,
    },
    tabsButton: {
      marginLeft: 8,
      width: 28,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.foreground2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabsCount: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.foreground2,
    },
    landingContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    landingTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.foreground,
      marginHorizontal: 16,
      marginTop: 24,
      marginBottom: 16,
    },
    shoppingGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 8,
    },
    shoppingButton: {
      alignItems: 'center',
      justifyContent: 'center',
      margin: 8,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      width: (screenWidth - 48) / 2,
    },
    shoppingButtonText: {
      color: theme.colors.foreground,
      fontSize: 14,
      fontWeight: '500',
      marginTop: 8,
    },
    // Tabs View Overlay
    tabsOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background,
      zIndex: 1000,
    },
    tabsHeader: {
      paddingTop: insets.top + 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tabsHeaderTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    tabsHeaderButton: {
      padding: 8,
    },
    tabsHeaderButtonText: {
      fontSize: 17,
      color: theme.colors.primary,
    },
    tabsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 12,
      paddingTop: 8,
    },
    tabCard: {
      width: TAB_CARD_WIDTH,
      height: TAB_CARD_HEIGHT,
      margin: 6,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    tabCardActive: {
      borderColor: theme.colors.primary,
    },
    tabCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
    },
    tabCardTitle: {
      flex: 1,
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    tabCardClose: {
      padding: 2,
    },
    tabCardContent: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabCardDomain: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground2,
      marginTop: 8,
    },
    newTabCard: {
      width: TAB_CARD_WIDTH,
      height: TAB_CARD_HEIGHT,
      margin: 6,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.surfaceBorder,
      borderStyle: 'dashed',
    },
    newTabText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground3,
      marginTop: 8,
    },
    bottomBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 12,
      paddingBottom: insets.bottom + 12,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.surfaceBorder,
    },
    // Save Menu Styles
    saveMenuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    saveMenuContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: insets.bottom + 20,
    },
    saveMenuHandle: {
      width: 36,
      height: 4,
      backgroundColor: theme.colors.foreground3,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    saveMenuTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.foreground,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    saveMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    saveMenuItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    saveMenuItemText: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.foreground,
    },
    saveMenuItemCheck: {
      marginLeft: 8,
    },
    collectionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    collectionColor: {
      width: 32,
      height: 32,
      borderRadius: 8,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    collectionName: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.foreground,
    },
    collectionCount: {
      fontSize: 13,
      color: theme.colors.foreground3,
    },
    // Bookmarks Modal Styles
    bookmarksModalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      marginTop: insets.top,
    },
    bookmarksModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    bookmarksCloseButton: {
      padding: 8,
    },
    bookmarksMenuButton: {
      padding: 8,
    },
    bookmarksSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      marginHorizontal: 16,
      marginBottom: 16,
      paddingHorizontal: 12,
      height: 40,
    },
    bookmarksSearchIcon: {
      marginRight: 8,
    },
    bookmarksSearchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.foreground,
      padding: 0,
    },
    bookmarksSearchMic: {
      marginLeft: 8,
    },
    bookmarksModalContent: {
      flex: 1,
    },
    // Recently Saved Section
    recentlySavedSection: {
      marginBottom: 24,
    },
    sectionHeaderText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.foreground,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    recentlySavedScroll: {
      paddingLeft: 16,
    },
    recentlySavedCard: {
      width: 160,
      marginRight: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
    },
    recentlySavedPreview: {
      width: '100%',
      height: 100,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    recentlySavedTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    recentlySavedUrl: {
      fontSize: 11,
      color: theme.colors.foreground3,
      marginBottom: 6,
    },
    recentlySavedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    recentlySavedBadgeText: {
      fontSize: 9,
      color: theme.colors.foreground3,
      marginLeft: 2,
    },
    // Folders Section
    foldersSection: {
      marginBottom: 24,
    },
    folderItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
    },
    folderIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    folderName: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    folderCount: {
      fontSize: 14,
      color: theme.colors.foreground3,
      marginRight: 8,
    },
    // Bookmarks Section
    bookmarksSection: {
      marginBottom: 24,
    },
    bookmarkListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
    },
    bookmarkListIcon: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    bookmarkListTitle: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.foreground,
    },
    // Empty State
    bookmarksEmptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    bookmarksEmptyText: {
      fontSize: 16,
      color: theme.colors.foreground3,
      marginTop: 16,
    },
    // Tab Bar
    bookmarksTabBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 12,
      paddingBottom: insets.bottom + 12,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.surfaceBorder,
    },
    bookmarksTab: {
      padding: 8,
    },
    // Legacy styles (for compatibility)
    bookmarkModalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    bookmarkModalIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    bookmarkModalInfo: {
      flex: 1,
      marginRight: 8,
    },
    bookmarkModalTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    bookmarkModalUrl: {
      fontSize: 13,
      color: theme.colors.foreground3,
    },
  });

  const showLanding = !currentTab || !currentTab.url;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.urlBar}>
          <TextInput
            style={styles.urlInput}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleSubmit}
            onFocus={() => triggerHaptic('impactLight')}
            placeholder="Search or enter URL"
            placeholderTextColor={theme.colors.foreground3}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            selectTextOnFocus
          />
          {inputValue.length > 0 && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setInputValue('')}>
              <MaterialIcons
                name="close"
                size={18}
                color={theme.colors.foreground3}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.tabsButton} onPress={openTabsView}>
            <Text style={styles.tabsCount}>{tabs.length || 1}</Text>
          </TouchableOpacity>
          {currentTab && currentTab.url && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSaveMenuOpen}>
              <MaterialIcons
                name="add-circle-outline"
                size={32}
                color={theme.colors.foreground2}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showLanding ? (
        <ScrollView style={styles.landingContainer}>
          <Text style={styles.landingTitle}>Start Shopping</Text>
          <View style={styles.shoppingGrid}>
            {SHOPPING_SITES.map(site => (
              <TouchableOpacity
                key={site.name}
                style={styles.shoppingButton}
                onPress={() => handleQuickShop(site.url)}>
                <MaterialIcons
                  name="shopping-bag"
                  size={28}
                  color={theme.colors.primary}
                />
                <Text style={styles.shoppingButtonText}>{site.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <WebView
          ref={webRef}
          source={{uri: currentTab?.url || ''}}
          style={{flex: 1}}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          // 👇 Inertia / momentum scrolling
          decelerationRate="normal" // gives Safari-style glide
          bounces={true} // iOS bounce effect
          scrollEnabled={true} // ensure scroll isn’t locked
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          overScrollMode="never" // keeps Android smooth too
          androidLayerType="hardware" // helps performance
          onNavigationStateChange={navState => {
            if (currentTab && navState.url) {
              updateTab(
                currentTab.id,
                navState.url,
                navState.title || currentTab.title,
              );
              setInputValue(navState.url);
            }
          }}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        />
      )}

      {/* Safari-style Tabs View */}
      {showTabsView && (
        <Animated.View
          style={[
            styles.tabsOverlay,
            {
              opacity: tabsViewScale,
              transform: [
                {
                  scale: tabsViewScale.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}>
          <View style={styles.tabsHeader}>
            <TouchableOpacity
              style={styles.tabsHeaderButton}
              onPress={handleNewTab}>
              <Text style={styles.tabsHeaderButtonText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.tabsHeaderTitle}>{tabs.length} Tabs</Text>
            <TouchableOpacity
              style={styles.tabsHeaderButton}
              onPress={closeTabsView}>
              <Text style={styles.tabsHeaderButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.tabsGrid}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabCard,
                  tab.id === currentTabId && styles.tabCardActive,
                ]}
                onPress={() => handleSelectTab(tab.id)}
                activeOpacity={0.8}>
                <View style={styles.tabCardHeader}>
                  <Text style={styles.tabCardTitle} numberOfLines={1}>
                    {tab.title || getDomain(tab.url)}
                  </Text>
                  <TouchableOpacity
                    style={styles.tabCardClose}
                    onPress={() => handleCloseTab(tab.id)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <MaterialIcons
                      name="close"
                      size={16}
                      color={theme.colors.foreground3}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.tabCardContent}>
                  <MaterialIcons
                    name="language"
                    size={40}
                    color={theme.colors.foreground3}
                  />
                  <Text style={styles.tabCardDomain}>{getDomain(tab.url)}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.newTabCard} onPress={handleNewTab}>
              <MaterialIcons
                name="add"
                size={2}
                color={theme.colors.foreground3}
              />
              <Text style={styles.newTabText}>New Tab</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}

      {/* Save Menu Modal */}
      <Modal
        visible={showSaveMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaveMenu(false)}>
        <TouchableOpacity
          style={styles.saveMenuOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowSaveMenu(false);
            setShowCollectionPicker(false);
          }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={styles.saveMenuContent}>
            <View style={styles.saveMenuHandle} />
            <Text style={styles.saveMenuTitle}>Save Page</Text>

            {/* Add to Bookmarks */}
            <TouchableOpacity
              style={styles.saveMenuItem}
              onPress={handleAddToBookmarks}>
              <View style={styles.saveMenuItemIcon}>
                <MaterialIcons
                  name="bookmark"
                  size={22}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.saveMenuItemText}>
                {bookmarked ? 'Remove from Bookmarks' : 'Add to Bookmarks'}
              </Text>
              {bookmarked && (
                <MaterialIcons
                  name="check"
                  size={20}
                  color={theme.colors.primary}
                  style={styles.saveMenuItemCheck}
                />
              )}
            </TouchableOpacity>

            {/* Add to Collection */}
            <TouchableOpacity
              style={styles.saveMenuItem}
              onPress={() => setShowCollectionPicker(!showCollectionPicker)}>
              <View style={styles.saveMenuItemIcon}>
                <MaterialIcons
                  name="folder-special"
                  size={22}
                  color={theme.colors.secondary || '#f59e0b'}
                />
              </View>
              <Text style={styles.saveMenuItemText}>Add to Favorites</Text>
              <MaterialIcons
                name={showCollectionPicker ? 'expand-less' : 'expand-more'}
                size={24}
                color={theme.colors.foreground3}
              />
            </TouchableOpacity>

            {/* Collection Picker */}
            {showCollectionPicker && (
              <View>
                {collections.length === 0 ? (
                  <Text
                    style={[
                      styles.collectionName,
                      {paddingHorizontal: 20, paddingVertical: 12},
                    ]}>
                    No collections yet
                  </Text>
                ) : (
                  collections.map(collection => (
                    <TouchableOpacity
                      key={collection.id}
                      style={styles.collectionItem}
                      onPress={() => handleAddToCollection(collection.id)}>
                      <View
                        style={[
                          styles.collectionColor,
                          {backgroundColor: collection.color},
                        ]}>
                        <MaterialIcons name="folder" size={18} color="#fff" />
                      </View>
                      <Text style={styles.collectionName}>
                        {collection.name}
                      </Text>
                      <Text style={styles.collectionCount}>
                        {collection.items.length} items
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Share Link */}
            <TouchableOpacity
              style={styles.saveMenuItem}
              onPress={handleShare}>
              <View style={styles.saveMenuItemIcon}>
                <MaterialIcons
                  name="share"
                  size={22}
                  color="#3b82f6"
                />
              </View>
              <Text style={styles.saveMenuItemText}>Share Link</Text>
              <MaterialIcons
                name="ios-share"
                size={20}
                color={theme.colors.foreground3}
              />
            </TouchableOpacity>

            {/* View Bookmarks */}
            <TouchableOpacity
              style={styles.saveMenuItem}
              onPress={handleOpenBookmarks}>
              <View style={styles.saveMenuItemIcon}>
                <MaterialIcons
                  name="bookmarks"
                  size={22}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.saveMenuItemText}>Bookmarks</Text>
              <Text style={styles.collectionCount}>{bookmarks.length}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Bookmarks Modal */}
      <Modal
        visible={showBookmarksModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookmarksModal(false)}>
        <View style={styles.bookmarksModalContainer}>
          {/* Header */}
          <View style={styles.bookmarksModalHeader}>
            <TouchableOpacity
              onPress={() => setShowBookmarksModal(false)}
              style={styles.bookmarksCloseButton}>
              <MaterialIcons
                name="close"
                size={24}
                color={theme.colors.foreground}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bookmarksMenuButton}>
              <MaterialIcons
                name="more-horiz"
                size={24}
                color={theme.colors.foreground}
              />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.bookmarksSearchContainer}>
            <MaterialIcons
              name="search"
              size={20}
              color={theme.colors.foreground3}
              style={styles.bookmarksSearchIcon}
            />
            <TextInput
              style={styles.bookmarksSearchInput}
              placeholder="Search Bookmarks"
              placeholderTextColor={theme.colors.foreground3}
            />
            <MaterialIcons
              name="mic"
              size={20}
              color={theme.colors.foreground3}
              style={styles.bookmarksSearchMic}
            />
          </View>

          <ScrollView style={styles.bookmarksModalContent}>
            {/* Recently Saved */}
            {bookmarks.length > 0 && (
              <View style={styles.recentlySavedSection}>
                <Text style={styles.sectionHeaderText}>
                  Recently Saved
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color={theme.colors.foreground3}
                  />
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.recentlySavedScroll}>
                  {bookmarks.slice(0, 5).map(bookmark => (
                    <TouchableOpacity
                      key={bookmark.id}
                      style={styles.recentlySavedCard}
                      onPress={() =>
                        handleBookmarkNavigation(bookmark.url, bookmark.title)
                      }>
                      <View style={styles.recentlySavedPreview}>
                        <MaterialIcons
                          name="language"
                          size={32}
                          color={theme.colors.foreground3}
                        />
                      </View>
                      <Text
                        style={styles.recentlySavedTitle}
                        numberOfLines={2}>
                        {bookmark.title}
                      </Text>
                      <Text style={styles.recentlySavedUrl} numberOfLines={1}>
                        {bookmark.source}
                      </Text>
                      <View style={styles.recentlySavedBadge}>
                        <MaterialIcons
                          name="schedule"
                          size={10}
                          color={theme.colors.foreground3}
                        />
                        <Text style={styles.recentlySavedBadgeText}>
                          Bookmarks
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Collections Folders */}
            {collections.length > 0 && (
              <View style={styles.foldersSection}>
                <Text style={styles.sectionHeaderText}>Collections</Text>
                {collections.map(collection => (
                  <TouchableOpacity
                    key={collection.id}
                    style={styles.folderItem}>
                    <View
                      style={[
                        styles.folderIcon,
                        {backgroundColor: collection.color + '33'},
                      ]}>
                      <MaterialIcons
                        name="folder"
                        size={20}
                        color={collection.color}
                      />
                    </View>
                    <Text style={styles.folderName}>{collection.name}</Text>
                    <Text style={styles.folderCount}>
                      {collection.items.length}
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color={theme.colors.foreground3}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* All Bookmarks */}
            {bookmarks.length > 0 && (
              <View style={styles.bookmarksSection}>
                <Text style={styles.sectionHeaderText}>Bookmarks</Text>
                {bookmarks.map(bookmark => (
                  <TouchableOpacity
                    key={bookmark.id}
                    style={styles.bookmarkListItem}
                    onPress={() =>
                      handleBookmarkNavigation(bookmark.url, bookmark.title)
                    }>
                    <View style={styles.bookmarkListIcon}>
                      <MaterialIcons
                        name="language"
                        size={16}
                        color={theme.colors.foreground3}
                      />
                    </View>
                    <Text style={styles.bookmarkListTitle} numberOfLines={1}>
                      {bookmark.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Empty State */}
            {bookmarks.length === 0 && collections.length === 0 && (
              <View style={styles.bookmarksEmptyState}>
                <MaterialIcons
                  name="bookmark-border"
                  size={48}
                  color={theme.colors.foreground3}
                />
                <Text style={styles.bookmarksEmptyText}>No bookmarks yet</Text>
              </View>
            )}
          </ScrollView>

          {/* Bottom Tab Bar */}
          <View style={styles.bookmarksTabBar}>
            <TouchableOpacity style={styles.bookmarksTab}>
              <MaterialIcons
                name="bookmark"
                size={22}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bookmarksTab}>
              <MaterialIcons
                name="history"
                size={22}
                color={theme.colors.foreground3}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

////////////////////

// import React, {useRef, useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   StatusBar,
//   TextInput,
//   Keyboard,
//   ScrollView,
//   Dimensions,
//   Animated,
//   Modal,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {triggerHaptic} from '../utils/haptics';

// const {width: screenWidth} = Dimensions.get('window');
// const TAB_CARD_WIDTH = (screenWidth - 48) / 2;
// const TAB_CARD_HEIGHT = TAB_CARD_WIDTH * 1.4;

// const SHOPPING_SITES = [
//   {name: 'Google', url: 'https://google.com'},
//   {name: 'Amazon', url: 'https://amazon.com'},
//   {name: 'ASOS', url: 'https://asos.com'},
//   {name: 'H&M', url: 'https://hm.com'},
//   {name: 'Zara', url: 'https://zara.com'},
//   {name: 'Shein', url: 'https://shein.com'},
//   {name: 'SSENSE', url: 'https://ssense.com'},
//   {name: 'Farfetch', url: 'https://farfetch.com'},
//   {name: 'Nordstrom', url: 'https://nordstrom.com'},
// ];

// type Props = {
//   route?: {params?: {url?: string; title?: string}};
// };

// export default function WebBrowserScreen({route}: Props) {
//   const {theme} = useAppTheme();
//   const insets = useSafeAreaInsets();
//   const initialUrl = route?.params?.url || '';
//   const webRef = useRef<WebView>(null);
//   const [inputValue, setInputValue] = useState(initialUrl);
//   const [showTabsView, setShowTabsView] = useState(false);
//   const tabsViewScale = useRef(new Animated.Value(0)).current;

//   const {
//     tabs,
//     currentTabId,
//     addTab,
//     removeTab,
//     switchTab,
//     updateTab,
//     addBookmark,
//     removeBookmark,
//     isBookmarked,
//     bookmarks,
//     collections,
//     addItemToCollection,
//   } = useShoppingStore();

//   const currentTab = tabs.find(t => t.id === currentTabId);
//   const bookmarked = currentTab ? isBookmarked(currentTab.url) : false;
//   const [showSaveMenu, setShowSaveMenu] = useState(false);
//   const [showCollectionPicker, setShowCollectionPicker] = useState(false);

//   // Initialize with a tab if navigating with URL
//   useEffect(() => {
//     if (initialUrl && tabs.length === 0) {
//       addTab(initialUrl, 'New Tab');
//     }
//   }, []);

//   // Update input when tab changes
//   useEffect(() => {
//     if (currentTab) {
//       setInputValue(currentTab.url);
//     }
//   }, [currentTabId, currentTab?.url]);

//   const getDomain = (url: string) => {
//     try {
//       const urlObj = new URL(url);
//       return urlObj.hostname.replace('www.', '');
//     } catch {
//       return url || 'New Tab';
//     }
//   };

//   const normalizeUrl = (text: string): string => {
//     const normalized = text.trim();
//     if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
//       return normalized;
//     }
//     if (normalized.includes('.') && !normalized.includes(' ')) {
//       return `https://${normalized}`;
//     }
//     return `https://google.com/search?q=${encodeURIComponent(normalized)}`;
//   };

//   const handleSubmit = () => {
//     if (inputValue.trim()) {
//       const newUrl = normalizeUrl(inputValue);
//       if (currentTab) {
//         updateTab(currentTab.id, newUrl, currentTab.title);
//       } else {
//         addTab(newUrl, 'New Tab');
//       }
//     }
//     Keyboard.dismiss();
//   };

//   const handleQuickShop = (url: string) => {
//     addTab(url, getDomain(url));
//     setShowTabsView(false);
//   };

//   const handleSaveMenuOpen = () => {
//     if (!currentTab || !currentTab.url) return;
//     triggerHaptic('impactLight');
//     setShowSaveMenu(true);
//   };

//   const handleAddToBookmarks = () => {
//     if (!currentTab) return;
//     triggerHaptic('impactLight');
//     if (bookmarked) {
//       const bookmark = bookmarks.find(b => b.url === currentTab.url);
//       if (bookmark) {
//         removeBookmark(bookmark.id);
//       }
//     } else {
//       addBookmark({
//         id: Date.now().toString(),
//         title: currentTab.title || getDomain(currentTab.url),
//         url: currentTab.url,
//         source: getDomain(currentTab.url),
//         addedAt: Date.now(),
//       });
//     }
//     setShowSaveMenu(false);
//   };

//   const handleAddToCollection = (collectionId: string) => {
//     if (!currentTab) return;
//     triggerHaptic('impactLight');
//     addItemToCollection(collectionId, {
//       id: Date.now().toString(),
//       title: currentTab.title || getDomain(currentTab.url),
//       url: currentTab.url,
//       source: getDomain(currentTab.url),
//       addedAt: Date.now(),
//     });
//     setShowCollectionPicker(false);
//     setShowSaveMenu(false);
//   };

//   const openTabsView = () => {
//     triggerHaptic('impactLight');
//     setShowTabsView(true);
//     Animated.spring(tabsViewScale, {
//       toValue: 1,
//       useNativeDriver: true,
//       tension: 50,
//       friction: 8,
//     }).start();
//   };

//   const closeTabsView = () => {
//     Animated.timing(tabsViewScale, {
//       toValue: 0,
//       duration: 200,
//       useNativeDriver: true,
//     }).start(() => setShowTabsView(false));
//   };

//   const handleSelectTab = (tabId: string) => {
//     triggerHaptic('impactLight');
//     switchTab(tabId);
//     closeTabsView();
//   };

//   const handleCloseTab = (tabId: string) => {
//     triggerHaptic('impactMedium');
//     removeTab(tabId);
//   };

//   const handleNewTab = () => {
//     triggerHaptic('impactLight');
//     addTab('', 'New Tab');
//     closeTabsView();
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingTop: insets.top + 55,
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingBottom: 12,
//     },
//     urlBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       borderRadius: 10,
//       paddingHorizontal: 12,
//       height: 40,
//     },
//     urlInput: {
//       flex: 1,
//       fontSize: 15,
//       color: theme.colors.foreground,
//       padding: 0,
//     },
//     iconButton: {
//       padding: 4,
//       marginLeft: 8,
//     },
//     tabsButton: {
//       marginLeft: 8,
//       width: 28,
//       height: 24,
//       borderRadius: 6,
//       borderWidth: 2,
//       borderColor: theme.colors.foreground2,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     tabsCount: {
//       fontSize: 12,
//       fontWeight: '700',
//       color: theme.colors.foreground2,
//     },
//     landingContainer: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     landingTitle: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       marginHorizontal: 16,
//       marginTop: 24,
//       marginBottom: 16,
//     },
//     shoppingGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       paddingHorizontal: 8,
//     },
//     shoppingButton: {
//       alignItems: 'center',
//       justifyContent: 'center',
//       margin: 8,
//       padding: 16,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       width: (screenWidth - 48) / 2,
//     },
//     shoppingButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '500',
//       marginTop: 8,
//     },
//     // Tabs View Overlay
//     tabsOverlay: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: theme.colors.background,
//       zIndex: 1000,
//     },
//     tabsHeader: {
//       paddingTop: insets.top + 12,
//       paddingHorizontal: 16,
//       paddingBottom: 12,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     tabsHeaderTitle: {
//       fontSize: 17,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     tabsHeaderButton: {
//       padding: 8,
//     },
//     tabsHeaderButtonText: {
//       fontSize: 17,
//       color: theme.colors.primary,
//     },
//     tabsGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       paddingHorizontal: 12,
//       paddingTop: 8,
//     },
//     tabCard: {
//       width: TAB_CARD_WIDTH,
//       height: TAB_CARD_HEIGHT,
//       margin: 6,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//       borderWidth: 2,
//       borderColor: 'transparent',
//     },
//     tabCardActive: {
//       borderColor: theme.colors.primary,
//     },
//     tabCardHeader: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 10,
//       paddingVertical: 8,
//       backgroundColor: theme.colors.surface,
//     },
//     tabCardTitle: {
//       flex: 1,
//       fontSize: 12,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     tabCardClose: {
//       padding: 2,
//     },
//     tabCardContent: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     tabCardDomain: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground2,
//       marginTop: 8,
//     },
//     newTabCard: {
//       width: TAB_CARD_WIDTH,
//       height: TAB_CARD_HEIGHT,
//       margin: 6,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       justifyContent: 'center',
//       alignItems: 'center',
//       borderWidth: 2,
//       borderColor: theme.colors.surfaceBorder,
//       borderStyle: 'dashed',
//     },
//     newTabText: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground3,
//       marginTop: 8,
//     },
//     bottomBar: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingBottom: insets.bottom + 12,
//       backgroundColor: theme.colors.surface,
//       borderTopWidth: 1,
//       borderTopColor: theme.colors.surfaceBorder,
//     },
//     // Save Menu Styles
//     saveMenuOverlay: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.5)',
//       justifyContent: 'flex-end',
//     },
//     saveMenuContent: {
//       backgroundColor: theme.colors.surface,
//       borderTopLeftRadius: 20,
//       borderTopRightRadius: 20,
//       paddingTop: 12,
//       paddingBottom: insets.bottom + 20,
//     },
//     saveMenuHandle: {
//       width: 36,
//       height: 4,
//       backgroundColor: theme.colors.foreground3,
//       borderRadius: 2,
//       alignSelf: 'center',
//       marginBottom: 16,
//     },
//     saveMenuTitle: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       paddingHorizontal: 20,
//       marginBottom: 12,
//     },
//     saveMenuItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 14,
//       paddingHorizontal: 20,
//     },
//     saveMenuItemIcon: {
//       width: 40,
//       height: 40,
//       borderRadius: 10,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 12,
//     },
//     saveMenuItemText: {
//       flex: 1,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     saveMenuItemCheck: {
//       marginLeft: 8,
//     },
//     collectionItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingHorizontal: 20,
//     },
//     collectionColor: {
//       width: 32,
//       height: 32,
//       borderRadius: 8,
//       marginRight: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     collectionName: {
//       flex: 1,
//       fontSize: 15,
//       color: theme.colors.foreground,
//     },
//     collectionCount: {
//       fontSize: 13,
//       color: theme.colors.foreground3,
//     },
//   });

//   const showLanding = !currentTab || !currentTab.url;

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" />

//       <View style={styles.header}>
//         <View style={styles.urlBar}>
//           <TextInput
//             style={styles.urlInput}
//             value={inputValue}
//             onChangeText={setInputValue}
//             onSubmitEditing={handleSubmit}
//             onFocus={() => triggerHaptic('impactLight')}
//             placeholder="Search or enter URL"
//             placeholderTextColor={theme.colors.foreground3}
//             autoCapitalize="none"
//             autoCorrect={false}
//             keyboardType="url"
//             returnKeyType="go"
//             selectTextOnFocus
//           />
//           {inputValue.length > 0 && (
//             <TouchableOpacity
//               style={styles.iconButton}
//               onPress={() => setInputValue('')}>
//               <MaterialIcons
//                 name="close"
//                 size={18}
//                 color={theme.colors.foreground3}
//               />
//             </TouchableOpacity>
//           )}
//           <TouchableOpacity style={styles.tabsButton} onPress={openTabsView}>
//             <Text style={styles.tabsCount}>{tabs.length || 1}</Text>
//           </TouchableOpacity>
//           {currentTab && currentTab.url && (
//             <TouchableOpacity
//               style={styles.iconButton}
//               onPress={handleSaveMenuOpen}>
//               <MaterialIcons
//                 name="add-circle-outline"
//                 size={32}
//                 color={theme.colors.foreground2}
//               />
//             </TouchableOpacity>
//           )}
//         </View>
//       </View>

//       {showLanding ? (
//         <ScrollView style={styles.landingContainer}>
//           <Text style={styles.landingTitle}>Start Shopping</Text>
//           <View style={styles.shoppingGrid}>
//             {SHOPPING_SITES.map(site => (
//               <TouchableOpacity
//                 key={site.name}
//                 style={styles.shoppingButton}
//                 onPress={() => handleQuickShop(site.url)}>
//                 <MaterialIcons
//                   name="shopping-bag"
//                   size={28}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.shoppingButtonText}>{site.name}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </ScrollView>
//       ) : (
//         <WebView
//           ref={webRef}
//           source={{uri: currentTab?.url || ''}}
//           style={{flex: 1}}
//           originWhitelist={['*']}
//           javaScriptEnabled
//           domStorageEnabled
//           onNavigationStateChange={navState => {
//             if (currentTab && navState.url) {
//               updateTab(
//                 currentTab.id,
//                 navState.url,
//                 navState.title || currentTab.title,
//               );
//               setInputValue(navState.url);
//             }
//           }}
//           userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
//         />
//       )}

//       {/* Safari-style Tabs View */}
//       {showTabsView && (
//         <Animated.View
//           style={[
//             styles.tabsOverlay,
//             {
//               opacity: tabsViewScale,
//               transform: [
//                 {
//                   scale: tabsViewScale.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0.9, 1],
//                   }),
//                 },
//               ],
//             },
//           ]}>
//           <View style={styles.tabsHeader}>
//             <TouchableOpacity
//               style={styles.tabsHeaderButton}
//               onPress={handleNewTab}>
//               <Text style={styles.tabsHeaderButtonText}>+</Text>
//             </TouchableOpacity>
//             <Text style={styles.tabsHeaderTitle}>{tabs.length} Tabs</Text>
//             <TouchableOpacity
//               style={styles.tabsHeaderButton}
//               onPress={closeTabsView}>
//               <Text style={styles.tabsHeaderButtonText}>Done</Text>
//             </TouchableOpacity>
//           </View>

//           <ScrollView contentContainerStyle={styles.tabsGrid}>
//             {tabs.map(tab => (
//               <TouchableOpacity
//                 key={tab.id}
//                 style={[
//                   styles.tabCard,
//                   tab.id === currentTabId && styles.tabCardActive,
//                 ]}
//                 onPress={() => handleSelectTab(tab.id)}
//                 activeOpacity={0.8}>
//                 <View style={styles.tabCardHeader}>
//                   <Text style={styles.tabCardTitle} numberOfLines={1}>
//                     {tab.title || getDomain(tab.url)}
//                   </Text>
//                   <TouchableOpacity
//                     style={styles.tabCardClose}
//                     onPress={() => handleCloseTab(tab.id)}
//                     hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
//                     <MaterialIcons
//                       name="close"
//                       size={16}
//                       color={theme.colors.foreground3}
//                     />
//                   </TouchableOpacity>
//                 </View>
//                 <View style={styles.tabCardContent}>
//                   <MaterialIcons
//                     name="language"
//                     size={40}
//                     color={theme.colors.foreground3}
//                   />
//                   <Text style={styles.tabCardDomain}>{getDomain(tab.url)}</Text>
//                 </View>
//               </TouchableOpacity>
//             ))}
//             <TouchableOpacity style={styles.newTabCard} onPress={handleNewTab}>
//               <MaterialIcons
//                 name="add"
//                 size={2}
//                 color={theme.colors.foreground3}
//               />
//               <Text style={styles.newTabText}>New Tab</Text>
//             </TouchableOpacity>
//           </ScrollView>
//         </Animated.View>
//       )}

//       {/* Save Menu Modal */}
//       <Modal
//         visible={showSaveMenu}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowSaveMenu(false)}>
//         <TouchableOpacity
//           style={styles.saveMenuOverlay}
//           activeOpacity={1}
//           onPress={() => {
//             setShowSaveMenu(false);
//             setShowCollectionPicker(false);
//           }}>
//           <TouchableOpacity
//             activeOpacity={1}
//             onPress={e => e.stopPropagation()}
//             style={styles.saveMenuContent}>
//             <View style={styles.saveMenuHandle} />
//             <Text style={styles.saveMenuTitle}>Save Page</Text>

//             {/* Add to Bookmarks */}
//             <TouchableOpacity
//               style={styles.saveMenuItem}
//               onPress={handleAddToBookmarks}>
//               <View style={styles.saveMenuItemIcon}>
//                 <MaterialIcons
//                   name="bookmark"
//                   size={22}
//                   color={theme.colors.primary}
//                 />
//               </View>
//               <Text style={styles.saveMenuItemText}>
//                 {bookmarked ? 'Remove from Bookmarks' : 'Add to Bookmarks'}
//               </Text>
//               {bookmarked && (
//                 <MaterialIcons
//                   name="check"
//                   size={20}
//                   color={theme.colors.primary}
//                   style={styles.saveMenuItemCheck}
//                 />
//               )}
//             </TouchableOpacity>

//             {/* Add to Collection */}
//             <TouchableOpacity
//               style={styles.saveMenuItem}
//               onPress={() => setShowCollectionPicker(!showCollectionPicker)}>
//               <View style={styles.saveMenuItemIcon}>
//                 <MaterialIcons
//                   name="folder-special"
//                   size={22}
//                   color={theme.colors.secondary || '#f59e0b'}
//                 />
//               </View>
//               <Text style={styles.saveMenuItemText}>Add to Favorites</Text>
//               <MaterialIcons
//                 name={showCollectionPicker ? 'expand-less' : 'expand-more'}
//                 size={24}
//                 color={theme.colors.foreground3}
//               />
//             </TouchableOpacity>

//             {/* Collection Picker */}
//             {showCollectionPicker && (
//               <View>
//                 {collections.length === 0 ? (
//                   <Text
//                     style={[
//                       styles.collectionName,
//                       {paddingHorizontal: 20, paddingVertical: 12},
//                     ]}>
//                     No collections yet
//                   </Text>
//                 ) : (
//                   collections.map(collection => (
//                     <TouchableOpacity
//                       key={collection.id}
//                       style={styles.collectionItem}
//                       onPress={() => handleAddToCollection(collection.id)}>
//                       <View
//                         style={[
//                           styles.collectionColor,
//                           {backgroundColor: collection.color},
//                         ]}>
//                         <MaterialIcons name="folder" size={18} color="#fff" />
//                       </View>
//                       <Text style={styles.collectionName}>
//                         {collection.name}
//                       </Text>
//                       <Text style={styles.collectionCount}>
//                         {collection.items.length} items
//                       </Text>
//                     </TouchableOpacity>
//                   ))
//                 )}
//               </View>
//             )}
//           </TouchableOpacity>
//         </TouchableOpacity>
//       </Modal>
//     </View>
//   );
// }

//////////////////

// import React, {useRef, useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   StatusBar,
//   TextInput,
//   Keyboard,
//   ScrollView,
//   Dimensions,
//   Animated,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {triggerHaptic} from '../utils/haptics';

// const {width: screenWidth} = Dimensions.get('window');
// const TAB_CARD_WIDTH = (screenWidth - 48) / 2;
// const TAB_CARD_HEIGHT = TAB_CARD_WIDTH * 1.4;

// const SHOPPING_SITES = [
//   {name: 'Google', url: 'https://google.com'},
//   {name: 'Amazon', url: 'https://amazon.com'},
//   {name: 'ASOS', url: 'https://asos.com'},
//   {name: 'H&M', url: 'https://hm.com'},
//   {name: 'Zara', url: 'https://zara.com'},
//   {name: 'Shein', url: 'https://shein.com'},
//   {name: 'SSENSE', url: 'https://ssense.com'},
//   {name: 'Farfetch', url: 'https://farfetch.com'},
//   {name: 'Nordstrom', url: 'https://nordstrom.com'},
// ];

// type Props = {
//   route?: {params?: {url?: string; title?: string}};
// };

// export default function WebBrowserScreen({route}: Props) {
//   const {theme} = useAppTheme();
//   const insets = useSafeAreaInsets();
//   const initialUrl = route?.params?.url || '';
//   const webRef = useRef<WebView>(null);
//   const [inputValue, setInputValue] = useState(initialUrl);
//   const [showTabsView, setShowTabsView] = useState(false);
//   const tabsViewScale = useRef(new Animated.Value(0)).current;

//   const {
//     tabs,
//     currentTabId,
//     addTab,
//     removeTab,
//     switchTab,
//     updateTab,
//     addBookmark,
//     removeBookmark,
//     isBookmarked,
//     bookmarks,
//   } = useShoppingStore();

//   const currentTab = tabs.find(t => t.id === currentTabId);
//   const bookmarked = currentTab ? isBookmarked(currentTab.url) : false;

//   // Initialize with a tab if navigating with URL
//   useEffect(() => {
//     if (initialUrl && tabs.length === 0) {
//       addTab(initialUrl, 'New Tab');
//     }
//   }, []);

//   // Update input when tab changes
//   useEffect(() => {
//     if (currentTab) {
//       setInputValue(currentTab.url);
//     }
//   }, [currentTabId, currentTab?.url]);

//   const getDomain = (url: string) => {
//     try {
//       const urlObj = new URL(url);
//       return urlObj.hostname.replace('www.', '');
//     } catch {
//       return url || 'New Tab';
//     }
//   };

//   const normalizeUrl = (text: string): string => {
//     const normalized = text.trim();
//     if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
//       return normalized;
//     }
//     if (normalized.includes('.') && !normalized.includes(' ')) {
//       return `https://${normalized}`;
//     }
//     return `https://google.com/search?q=${encodeURIComponent(normalized)}`;
//   };

//   const handleSubmit = () => {
//     if (inputValue.trim()) {
//       const newUrl = normalizeUrl(inputValue);
//       if (currentTab) {
//         updateTab(currentTab.id, newUrl, currentTab.title);
//       } else {
//         addTab(newUrl, 'New Tab');
//       }
//     }
//     Keyboard.dismiss();
//   };

//   const handleQuickShop = (url: string) => {
//     addTab(url, getDomain(url));
//     setShowTabsView(false);
//   };

//   const handleBookmark = () => {
//     if (!currentTab) return;
//     if (bookmarked) {
//       const bookmark = bookmarks.find(b => b.url === currentTab.url);
//       if (bookmark) {
//         removeBookmark(bookmark.id);
//       }
//     } else {
//       addBookmark({
//         id: Date.now().toString(),
//         title: currentTab.title || getDomain(currentTab.url),
//         url: currentTab.url,
//         source: getDomain(currentTab.url),
//         addedAt: Date.now(),
//       });
//     }
//   };

//   const openTabsView = () => {
//     triggerHaptic('impactLight');
//     setShowTabsView(true);
//     Animated.spring(tabsViewScale, {
//       toValue: 1,
//       useNativeDriver: true,
//       tension: 50,
//       friction: 8,
//     }).start();
//   };

//   const closeTabsView = () => {
//     Animated.timing(tabsViewScale, {
//       toValue: 0,
//       duration: 200,
//       useNativeDriver: true,
//     }).start(() => setShowTabsView(false));
//   };

//   const handleSelectTab = (tabId: string) => {
//     triggerHaptic('impactLight');
//     switchTab(tabId);
//     closeTabsView();
//   };

//   const handleCloseTab = (tabId: string) => {
//     triggerHaptic('impactMedium');
//     removeTab(tabId);
//   };

//   const handleNewTab = () => {
//     triggerHaptic('impactLight');
//     addTab('', 'New Tab');
//     closeTabsView();
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingTop: insets.top + 55,
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingBottom: 12,
//     },
//     urlBar: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       borderRadius: 10,
//       paddingHorizontal: 12,
//       height: 40,
//     },
//     urlInput: {
//       flex: 1,
//       fontSize: 15,
//       color: theme.colors.foreground,
//       padding: 0,
//     },
//     iconButton: {
//       padding: 4,
//       marginLeft: 8,
//     },
//     tabsButton: {
//       marginLeft: 8,
//       width: 28,
//       height: 24,
//       borderRadius: 6,
//       borderWidth: 2,
//       borderColor: theme.colors.foreground2,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     tabsCount: {
//       fontSize: 12,
//       fontWeight: '700',
//       color: theme.colors.foreground2,
//     },
//     landingContainer: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     landingTitle: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       marginHorizontal: 16,
//       marginTop: 24,
//       marginBottom: 16,
//     },
//     shoppingGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       paddingHorizontal: 8,
//     },
//     shoppingButton: {
//       alignItems: 'center',
//       justifyContent: 'center',
//       margin: 8,
//       padding: 16,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       width: (screenWidth - 48) / 2,
//     },
//     shoppingButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 14,
//       fontWeight: '500',
//       marginTop: 8,
//     },
//     // Tabs View Overlay
//     tabsOverlay: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: theme.colors.background,
//       zIndex: 1000,
//     },
//     tabsHeader: {
//       paddingTop: insets.top + 12,
//       paddingHorizontal: 16,
//       paddingBottom: 12,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     tabsHeaderTitle: {
//       fontSize: 17,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     tabsHeaderButton: {
//       padding: 8,
//     },
//     tabsHeaderButtonText: {
//       fontSize: 17,
//       color: theme.colors.primary,
//     },
//     tabsGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       paddingHorizontal: 12,
//       paddingTop: 8,
//     },
//     tabCard: {
//       width: TAB_CARD_WIDTH,
//       height: TAB_CARD_HEIGHT,
//       margin: 6,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//       borderWidth: 2,
//       borderColor: 'transparent',
//     },
//     tabCardActive: {
//       borderColor: theme.colors.primary,
//     },
//     tabCardHeader: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 10,
//       paddingVertical: 8,
//       backgroundColor: theme.colors.surface,
//     },
//     tabCardTitle: {
//       flex: 1,
//       fontSize: 12,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     tabCardClose: {
//       padding: 2,
//     },
//     tabCardContent: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     tabCardDomain: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground2,
//       marginTop: 8,
//     },
//     newTabCard: {
//       width: TAB_CARD_WIDTH,
//       height: TAB_CARD_HEIGHT,
//       margin: 6,
//       borderRadius: 12,
//       backgroundColor: theme.colors.surface,
//       justifyContent: 'center',
//       alignItems: 'center',
//       borderWidth: 2,
//       borderColor: theme.colors.surfaceBorder,
//       borderStyle: 'dashed',
//     },
//     newTabText: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground3,
//       marginTop: 8,
//     },
//     bottomBar: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingBottom: insets.bottom + 12,
//       backgroundColor: theme.colors.surface,
//       borderTopWidth: 1,
//       borderTopColor: theme.colors.surfaceBorder,
//     },
//   });

//   const showLanding = !currentTab || !currentTab.url;

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" />

//       <View style={styles.header}>
//         <View style={styles.urlBar}>
//           <TextInput
//             style={styles.urlInput}
//             value={inputValue}
//             onChangeText={setInputValue}
//             onSubmitEditing={handleSubmit}
//             onFocus={() => triggerHaptic('impactLight')}
//             placeholder="Search or enter URL"
//             placeholderTextColor={theme.colors.foreground3}
//             autoCapitalize="none"
//             autoCorrect={false}
//             keyboardType="url"
//             returnKeyType="go"
//             selectTextOnFocus
//           />
//           {inputValue.length > 0 && (
//             <TouchableOpacity
//               style={styles.iconButton}
//               onPress={() => setInputValue('')}>
//               <MaterialIcons
//                 name="close"
//                 size={18}
//                 color={theme.colors.foreground3}
//               />
//             </TouchableOpacity>
//           )}
//           {currentTab && currentTab.url && (
//             <TouchableOpacity style={styles.iconButton} onPress={handleBookmark}>
//               <MaterialIcons
//                 name={bookmarked ? 'bookmark' : 'bookmark-border'}
//                 size={22}
//                 color={bookmarked ? theme.colors.primary : theme.colors.foreground3}
//               />
//             </TouchableOpacity>
//           )}
//           <TouchableOpacity style={styles.tabsButton} onPress={openTabsView}>
//             <Text style={styles.tabsCount}>{tabs.length || 1}</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {showLanding ? (
//         <ScrollView style={styles.landingContainer}>
//           <Text style={styles.landingTitle}>Start Shopping</Text>
//           <View style={styles.shoppingGrid}>
//             {SHOPPING_SITES.map(site => (
//               <TouchableOpacity
//                 key={site.name}
//                 style={styles.shoppingButton}
//                 onPress={() => handleQuickShop(site.url)}>
//                 <MaterialIcons
//                   name="shopping-bag"
//                   size={28}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.shoppingButtonText}>{site.name}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </ScrollView>
//       ) : (
//         <WebView
//           ref={webRef}
//           source={{uri: currentTab?.url || ''}}
//           style={{flex: 1}}
//           originWhitelist={['*']}
//           javaScriptEnabled
//           domStorageEnabled
//           onNavigationStateChange={navState => {
//             if (currentTab && navState.url) {
//               updateTab(currentTab.id, navState.url, navState.title || currentTab.title);
//               setInputValue(navState.url);
//             }
//           }}
//           userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
//         />
//       )}

//       {/* Safari-style Tabs View */}
//       {showTabsView && (
//         <Animated.View
//           style={[
//             styles.tabsOverlay,
//             {
//               opacity: tabsViewScale,
//               transform: [
//                 {
//                   scale: tabsViewScale.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0.9, 1],
//                   }),
//                 },
//               ],
//             },
//           ]}>
//           <View style={styles.tabsHeader}>
//             <TouchableOpacity style={styles.tabsHeaderButton} onPress={handleNewTab}>
//               <Text style={styles.tabsHeaderButtonText}>+</Text>
//             </TouchableOpacity>
//             <Text style={styles.tabsHeaderTitle}>{tabs.length} Tabs</Text>
//             <TouchableOpacity style={styles.tabsHeaderButton} onPress={closeTabsView}>
//               <Text style={styles.tabsHeaderButtonText}>Done</Text>
//             </TouchableOpacity>
//           </View>

//           <ScrollView contentContainerStyle={styles.tabsGrid}>
//             {tabs.map(tab => (
//               <TouchableOpacity
//                 key={tab.id}
//                 style={[
//                   styles.tabCard,
//                   tab.id === currentTabId && styles.tabCardActive,
//                 ]}
//                 onPress={() => handleSelectTab(tab.id)}
//                 activeOpacity={0.8}>
//                 <View style={styles.tabCardHeader}>
//                   <Text style={styles.tabCardTitle} numberOfLines={1}>
//                     {tab.title || getDomain(tab.url)}
//                   </Text>
//                   <TouchableOpacity
//                     style={styles.tabCardClose}
//                     onPress={() => handleCloseTab(tab.id)}
//                     hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
//                     <MaterialIcons
//                       name="close"
//                       size={16}
//                       color={theme.colors.foreground3}
//                     />
//                   </TouchableOpacity>
//                 </View>
//                 <View style={styles.tabCardContent}>
//                   <MaterialIcons
//                     name="language"
//                     size={40}
//                     color={theme.colors.foreground3}
//                   />
//                   <Text style={styles.tabCardDomain}>{getDomain(tab.url)}</Text>
//                 </View>
//               </TouchableOpacity>
//             ))}
//             <TouchableOpacity style={styles.newTabCard} onPress={handleNewTab}>
//               <MaterialIcons name="add" size={32} color={theme.colors.foreground3} />
//               <Text style={styles.newTabText}>New Tab</Text>
//             </TouchableOpacity>
//           </ScrollView>
//         </Animated.View>
//       )}
//     </View>
//   );
// }
