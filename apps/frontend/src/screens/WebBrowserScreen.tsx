import React, {useRef, useState, useEffect, useCallback} from 'react';
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
  Image,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {captureRef} from 'react-native-view-shot';
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
  const containerRef = useRef<View>(null);
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
    updateTabScreenshot,
    reorderTabs,
    addBookmark,
    removeBookmark,
    isBookmarked,
    bookmarks,
    collections,
    addItemToCollection,
    history,
    addToHistory,
    addSearch,
    _hasHydrated,
  } = useShoppingStore();

  const currentTab = tabs.find(t => t.id === currentTabId);
  const bookmarked = currentTab ? isBookmarked(currentTab.url) : false;
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [activeBookmarksTab, setActiveBookmarksTab] = useState<
    'bookmarks' | 'history'
  >('bookmarks');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Drag and drop state for tabs
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const dragAnimatedValue = useRef(new Animated.ValueXY()).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const tabPositions = useRef<
    {x: number; y: number; width: number; height: number}[]
  >([]);

  // Initialize with a tab if navigating with URL (wait for hydration)
  useEffect(() => {
    if (_hasHydrated && initialUrl) {
      // Check if this URL is already open in a tab
      const existingTab = tabs.find(t => t.url === initialUrl);
      if (existingTab) {
        // Switch to existing tab
        switchTab(existingTab.id);
      } else {
        // Add new tab with the URL
        addTab(initialUrl, 'New Tab');
      }
    }
  }, [_hasHydrated, initialUrl]);

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

  const extractImageFromPage = (url: string): string => {
    // Use DuckDuckGo favicon service (more reliable)
    try {
      const domain = new URL(url).hostname;
      // DuckDuckGo favicon service
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch {
      return '';
    }
  };

  const normalizeUrl = (text: string): string => {
    const normalized = text.trim();
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }
    // Check if it looks like a domain (has a dot and looks like a valid domain pattern)
    // Valid domain patterns: example.com, sub.example.com, example.co.uk, etc.
    if (normalized.includes('.') && !normalized.includes(' ')) {
      // Check if it has a valid TLD or domain structure
      const parts = normalized.split('.');
      const lastPart = parts[parts.length - 1];
      // Check if the last part (potential TLD) is at least 2 characters and is alphabetic
      if (lastPart.length >= 2 && /^[a-zA-Z]+$/.test(lastPart)) {
        // Looks like a valid domain
        return `https://${normalized}`;
      }
    }
    // Treat as search query
    return `https://google.com/search?q=${encodeURIComponent(normalized)}`;
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      const normalized = inputValue.trim();
      const newUrl = normalizeUrl(normalized);

      // Track search if user typed a search query (not a full URL)
      if (
        !normalized.startsWith('http://') &&
        !normalized.startsWith('https://') &&
        !normalized.includes('.')
      ) {
        // This is a plain search query
        addSearch(normalized);
      } else if (newUrl.includes('google.com/search?q=')) {
        // User typed a domain-like query that got converted to Google search
        try {
          const query = new URLSearchParams(new URL(newUrl).search).get('q');
          if (query) {
            addSearch(query);
          }
        } catch (e) {
          // URL parsing failed, skip search tracking
        }
      }

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

  // Autocomplete suggestions from history
  const autocompleteSuggestions = React.useMemo(() => {
    if (!isInputFocused || inputValue.length < 1) return [];
    const searchTerm = inputValue.toLowerCase();
    return history
      .filter(
        item =>
          item.url.toLowerCase().includes(searchTerm) ||
          item.title.toLowerCase().includes(searchTerm),
      )
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);
  }, [history, inputValue, isInputFocused]);

  const handleAutocompleteSelect = (url: string) => {
    setInputValue(url);
    setShowAutocomplete(false);
    if (currentTab) {
      updateTab(currentTab.id, url, currentTab.title);
    } else {
      addTab(url, 'New Tab');
    }
    Keyboard.dismiss();
  };

  const handleSaveMenuOpen = () => {
    if (!currentTab || !currentTab.url) return;
    triggerHaptic('impactLight');
    setShowSaveMenu(true);
  };

  const handleAddToBookmarks = async () => {
    if (!currentTab) return;
    triggerHaptic('impactLight');
    if (bookmarked) {
      const bookmark = bookmarks.find(b => b.url === currentTab.url);
      if (bookmark) {
        removeBookmark(bookmark.id);
      }
    } else {
      // Capture screenshot for the bookmark preview
      let screenshot: string | undefined;
      if (containerRef.current) {
        try {
          screenshot = await captureRef(containerRef, {
            format: 'jpg',
            quality: 0.7,
            result: 'data-uri',
          });
        } catch (e) {
          console.log('Failed to capture bookmark screenshot:', e);
        }
      }
      addBookmark({
        id: Date.now().toString(),
        title: currentTab.title || getDomain(currentTab.url),
        url: currentTab.url,
        source: getDomain(currentTab.url),
        imageUrl: extractImageFromPage(currentTab.url),
        screenshot,
        addedAt: Date.now(),
      });
    }
    setShowSaveMenu(false);
  };

  const handleAddToCollection = async (collectionId: string) => {
    if (!currentTab) return;
    triggerHaptic('impactLight');
    // Capture screenshot for the collection item preview
    let screenshot: string | undefined;
    if (containerRef.current) {
      try {
        screenshot = await captureRef(containerRef, {
          format: 'jpg',
          quality: 0.7,
          result: 'data-uri',
        });
      } catch (e) {
        console.log('Failed to capture collection item screenshot:', e);
      }
    }
    addItemToCollection(collectionId, {
      id: Date.now().toString(),
      title: currentTab.title || getDomain(currentTab.url),
      url: currentTab.url,
      source: getDomain(currentTab.url),
      imageUrl: extractImageFromPage(currentTab.url),
      screenshot,
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
        message: `${currentTab.title || getDomain(currentTab.url)}\n${
          currentTab.url
        }`,
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

  const captureCurrentTabScreenshot = useCallback(async () => {
    if (!containerRef.current || !currentTab || !currentTab.url) {
      console.log('Screenshot skipped - no containerRef or currentTab');
      return;
    }
    try {
      console.log('Capturing screenshot for tab:', currentTab.id);
      const uri = await captureRef(containerRef, {
        format: 'jpg',
        quality: 0.7,
        result: 'data-uri',
      });
      console.log('Screenshot captured, length:', uri?.length);
      if (uri) {
        updateTabScreenshot(currentTab.id, uri);
        console.log('Screenshot saved to tab');
      }
    } catch (error) {
      console.log('Screenshot capture error:', error);
    }
  }, [currentTab, updateTabScreenshot]);

  const openTabsView = async () => {
    triggerHaptic('impactLight');
    // Capture screenshot of current tab before showing tabs view
    await captureCurrentTabScreenshot();
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
    if (draggingIndex !== null) return; // Don't select while dragging
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

  // Drag and drop handlers for tab reordering
  const handleLongPress = (index: number) => {
    triggerHaptic('impactHeavy');
    setDraggingIndex(index);
    // Scale up the dragged item
    Animated.spring(dragScale, {
      toValue: 1.05,
      useNativeDriver: true,
    }).start();
  };

  const handleDragMove = (
    index: number,
    gestureState: {dx: number; dy: number},
  ) => {
    if (draggingIndex === null) return;

    dragAnimatedValue.setValue({
      x: gestureState.dx,
      y: gestureState.dy,
    });

    // Calculate which tab we're hovering over
    const currentPos = tabPositions.current[draggingIndex];
    if (!currentPos) return;

    const newX = currentPos.x + gestureState.dx;
    const newY = currentPos.y + gestureState.dy;

    // Find the target index based on position
    let targetIndex = draggingIndex;
    for (let i = 0; i < tabPositions.current.length; i++) {
      const pos = tabPositions.current[i];
      if (
        newX >= pos.x - pos.width / 2 &&
        newX <= pos.x + pos.width * 1.5 &&
        newY >= pos.y - pos.height / 2 &&
        newY <= pos.y + pos.height * 1.5
      ) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex !== draggedOverIndex) {
      setDraggedOverIndex(targetIndex);
      if (targetIndex !== draggingIndex) {
        triggerHaptic('impactLight');
      }
    }
  };

  const handleDragEnd = () => {
    if (
      draggingIndex !== null &&
      draggedOverIndex !== null &&
      draggingIndex !== draggedOverIndex
    ) {
      reorderTabs(draggingIndex, draggedOverIndex);
      triggerHaptic('impactMedium');
    }

    // Reset animations
    Animated.parallel([
      Animated.spring(dragScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(dragAnimatedValue, {
        toValue: {x: 0, y: 0},
        useNativeDriver: true,
      }),
    ]).start();

    setDraggingIndex(null);
    setDraggedOverIndex(null);
  };

  const createPanResponder = (index: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => draggingIndex === index,
      onPanResponderMove: (_, gestureState) => {
        handleDragMove(index, gestureState);
      },
      onPanResponderRelease: () => {
        handleDragEnd();
      },
      onPanResponderTerminate: () => {
        handleDragEnd();
      },
    });
  };

  const handleTabLayout = (index: number, event: LayoutChangeEvent) => {
    const {x, y, width, height} = event.nativeEvent.layout;
    tabPositions.current[index] = {x, y, width, height};
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
    autocompleteContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      overflow: 'hidden',
    },
    autocompleteItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    autocompleteIcon: {
      marginRight: 10,
    },
    autocompleteTextContainer: {
      flex: 1,
    },
    autocompleteTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 2,
    },
    autocompleteUrl: {
      fontSize: 12,
      color: theme.colors.foreground3,
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
      marginTop: 60,
    },
    tabsHeader: {
      paddingTop: insets.top + 4,
      paddingHorizontal: 16,
      paddingBottom: 6,
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
      paddingTop: 4,
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
    tabCardDragging: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.4,
      shadowRadius: 12,
      borderColor: theme.colors.primary,
    },
    tabCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: 'transparent',
    },
    tabCardTitle: {
      flex: 1,
      fontSize: 12,
      fontWeight: '500',
      color: '#fff',
    },
    tabCardClose: {
      padding: 2,
    },
    tabCardContent: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: 8,
    },
    tabCardDomain: {
      fontSize: 13,
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.9)',
      marginTop: 0,
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
    // Tab Card Preview Image
    tabCardPreview: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    tabCardPreviewContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    tabCardScreenshot: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    tabCardPlaceholder: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
    },
    tabCardFavicon: {
      width: 64,
      height: 64,
      borderRadius: 8,
    },
    tabCardOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'space-between',
      padding: 0,
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
            onChangeText={text => {
              setInputValue(text);
              setShowAutocomplete(text.length > 0);
            }}
            onSubmitEditing={handleSubmit}
            onFocus={() => {
              triggerHaptic('impactLight');
              setIsInputFocused(true);
              setShowAutocomplete(inputValue.length > 0);
            }}
            onBlur={() => {
              setTimeout(() => {
                setIsInputFocused(false);
                setShowAutocomplete(false);
              }, 150);
            }}
            placeholder="Search or enter URL"
            placeholderTextColor={theme.colors.foreground3}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="ascii-capable"
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
        {showAutocomplete && autocompleteSuggestions.length > 0 && (
          <View style={styles.autocompleteContainer}>
            {autocompleteSuggestions.map((item, index) => (
              <TouchableOpacity
                key={`${item.url}-${index}`}
                style={styles.autocompleteItem}
                onPress={() => handleAutocompleteSelect(item.url)}>
                <MaterialIcons
                  name="history"
                  size={18}
                  color={theme.colors.foreground3}
                  style={styles.autocompleteIcon}
                />
                <View style={styles.autocompleteTextContainer}>
                  <Text
                    style={styles.autocompleteTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {item.title || getDomain(item.url)}
                  </Text>
                  <Text
                    style={styles.autocompleteUrl}
                    numberOfLines={1}
                    ellipsizeMode="middle">
                    {item.url}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
        <View ref={containerRef} style={{flex: 1}} collapsable={false}>
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
            scrollEnabled={true} // ensure scroll isn't locked
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
                // Track visit history
                addToHistory(
                  navState.url,
                  navState.title || getDomain(navState.url),
                  getDomain(navState.url),
                );
              }
            }}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          />
        </View>
      )}

      {/* Safari-style Tabs View */}
      {showTabsView && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={closeTabsView}
          style={styles.tabsOverlay}>
          <Animated.View
            style={[
              {flex: 1},
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
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}>
              <View style={styles.tabsHeader}>
                {/* <TouchableOpacity
                  style={styles.tabsHeaderButton}
                  onPress={handleNewTab}>
                  <Text style={styles.tabsHeaderButtonText}>+</Text>
                </TouchableOpacity> */}
                <Text style={styles.tabsHeaderTitle}>{tabs.length} Tabs</Text>
                <TouchableOpacity
                  style={styles.tabsHeaderButton}
                  onPress={closeTabsView}>
                  <Text style={styles.tabsHeaderButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={styles.tabsGrid}
              scrollEnabled={draggingIndex === null}>
              {tabs.map((tab, index) => {
                const isDragging = draggingIndex === index;
                const isDropTarget =
                  draggedOverIndex === index && draggingIndex !== index;
                const panResponder = createPanResponder(index);

                return (
                  <Animated.View
                    key={tab.id}
                    onLayout={e => handleTabLayout(index, e)}
                    style={[
                      isDragging && {
                        transform: [
                          {translateX: dragAnimatedValue.x},
                          {translateY: dragAnimatedValue.y},
                          {scale: dragScale},
                        ],
                        zIndex: 1000,
                        elevation: 10,
                      },
                      isDropTarget && {
                        opacity: 0.5,
                      },
                    ]}
                    {...panResponder.panHandlers}>
                    <TouchableOpacity
                      style={[
                        styles.tabCard,
                        tab.id === currentTabId && styles.tabCardActive,
                        isDragging && styles.tabCardDragging,
                      ]}
                      onPress={() => handleSelectTab(tab.id)}
                      onLongPress={() => handleLongPress(index)}
                      delayLongPress={300}
                      activeOpacity={0.8}>
                      {/* Tab Preview Background */}
                      <View style={styles.tabCardPreviewContainer}>
                        {tab.screenshot ? (
                          <Image
                            source={{uri: tab.screenshot}}
                            style={styles.tabCardScreenshot}
                            resizeMode="cover"
                          />
                        ) : (
                          <>
                            {/* Gradient/colored background when no screenshot */}
                            <View
                              style={[
                                styles.tabCardPlaceholder,
                                {backgroundColor: theme.colors.surface},
                              ]}
                            />
                            <Image
                              source={{
                                uri: `https://icons.duckduckgo.com/ip3/${getDomain(
                                  tab.url,
                                )}.ico`,
                              }}
                              style={styles.tabCardFavicon}
                              defaultSource={require('../assets/images/desktop-2.jpg')}
                            />
                          </>
                        )}
                      </View>

                      {/* Overlay with text content */}
                      <View style={styles.tabCardOverlay}>
                        <View style={styles.tabCardHeader}>
                          <Text style={styles.tabCardTitle} numberOfLines={2}>
                            {tab.title || getDomain(tab.url)}
                          </Text>
                          <TouchableOpacity
                            style={styles.tabCardClose}
                            onPress={() => handleCloseTab(tab.id)}
                            hitSlop={{
                              top: 10,
                              bottom: 10,
                              left: 10,
                              right: 10,
                            }}>
                            <MaterialIcons
                              name="close"
                              size={16}
                              color="#fff"
                            />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.tabCardContent}>
                          <Text style={styles.tabCardDomain}>
                            {getDomain(tab.url)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
              <TouchableOpacity
                style={styles.newTabCard}
                onPress={handleNewTab}>
                <MaterialIcons
                  name="add"
                  size={2}
                  color={theme.colors.foreground3}
                />
                <Text style={styles.newTabText}>New Tab</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
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
            <TouchableOpacity style={styles.saveMenuItem} onPress={handleShare}>
              <View style={styles.saveMenuItemIcon}>
                <MaterialIcons name="share" size={22} color="#3b82f6" />
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
            {activeBookmarksTab === 'bookmarks' ? (
              <>
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
                            handleBookmarkNavigation(
                              bookmark.url,
                              bookmark.title,
                            )
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
                          <Text
                            style={styles.recentlySavedUrl}
                            numberOfLines={1}>
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
                        <Text
                          style={styles.bookmarkListTitle}
                          numberOfLines={1}>
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
                    <Text style={styles.bookmarksEmptyText}>
                      No bookmarks yet
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Browsing History */}
                {history.length > 0 ? (
                  <View style={styles.bookmarksSection}>
                    <Text style={styles.sectionHeaderText}>
                      Browsing History
                    </Text>
                    {history.map((item, index) => (
                      <TouchableOpacity
                        key={`${item.url}-${index}`}
                        style={styles.bookmarkListItem}
                        onPress={() =>
                          handleBookmarkNavigation(item.url, item.title)
                        }>
                        <View style={styles.bookmarkListIcon}>
                          <MaterialIcons
                            name="history"
                            size={16}
                            color={theme.colors.foreground3}
                          />
                        </View>
                        <View style={{flex: 1}}>
                          <Text
                            style={styles.bookmarkListTitle}
                            numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text
                            style={styles.recentlySavedUrl}
                            numberOfLines={1}>
                            {item.source}
                          </Text>
                        </View>
                        {item.visitCount > 1 && (
                          <Text style={styles.folderCount}>
                            {item.visitCount}x
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.bookmarksEmptyState}>
                    <MaterialIcons
                      name="history"
                      size={48}
                      color={theme.colors.foreground3}
                    />
                    <Text style={styles.bookmarksEmptyText}>
                      No browsing history
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Bottom Tab Bar */}
          <View style={styles.bookmarksTabBar}>
            <TouchableOpacity
              style={styles.bookmarksTab}
              onPress={() => {
                triggerHaptic('impactLight');
                setActiveBookmarksTab('bookmarks');
              }}>
              <MaterialIcons
                name="bookmark"
                size={22}
                color={
                  activeBookmarksTab === 'bookmarks'
                    ? theme.colors.primary
                    : theme.colors.foreground3
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bookmarksTab}
              onPress={() => {
                triggerHaptic('impactLight');
                setActiveBookmarksTab('history');
              }}>
              <MaterialIcons
                name="history"
                size={22}
                color={
                  activeBookmarksTab === 'history'
                    ? theme.colors.primary
                    : theme.colors.foreground3
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

////////////////////

// import React, {useRef, useState, useEffect, useCallback} from 'react';
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
//   Share,
//   Image,
//   PanResponder,
//   LayoutChangeEvent,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {captureRef} from 'react-native-view-shot';
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
//   const containerRef = useRef<View>(null);
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
//     updateTabScreenshot,
//     reorderTabs,
//     addBookmark,
//     removeBookmark,
//     isBookmarked,
//     bookmarks,
//     collections,
//     addItemToCollection,
//     history,
//     addToHistory,
//     addSearch,
//     _hasHydrated,
//   } = useShoppingStore();

//   const currentTab = tabs.find(t => t.id === currentTabId);
//   const bookmarked = currentTab ? isBookmarked(currentTab.url) : false;
//   const [showSaveMenu, setShowSaveMenu] = useState(false);
//   const [showCollectionPicker, setShowCollectionPicker] = useState(false);
//   const [showBookmarksModal, setShowBookmarksModal] = useState(false);
//   const [activeBookmarksTab, setActiveBookmarksTab] = useState<
//     'bookmarks' | 'history'
//   >('bookmarks');

//   // Drag and drop state for tabs
//   const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
//   const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
//   const dragAnimatedValue = useRef(new Animated.ValueXY()).current;
//   const dragScale = useRef(new Animated.Value(1)).current;
//   const tabPositions = useRef<{x: number; y: number; width: number; height: number}[]>([]);

//   // Initialize with a tab if navigating with URL (wait for hydration)
//   useEffect(() => {
//     if (_hasHydrated && initialUrl) {
//       // Check if this URL is already open in a tab
//       const existingTab = tabs.find(t => t.url === initialUrl);
//       if (existingTab) {
//         // Switch to existing tab
//         switchTab(existingTab.id);
//       } else {
//         // Add new tab with the URL
//         addTab(initialUrl, 'New Tab');
//       }
//     }
//   }, [_hasHydrated, initialUrl]);

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

//   const extractImageFromPage = (url: string): string => {
//     // Use DuckDuckGo favicon service (more reliable)
//     try {
//       const domain = new URL(url).hostname;
//       // DuckDuckGo favicon service
//       return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
//     } catch {
//       return '';
//     }
//   };

//   const normalizeUrl = (text: string): string => {
//     const normalized = text.trim();
//     if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
//       return normalized;
//     }
//     // Check if it looks like a domain (has a dot and looks like a valid domain pattern)
//     // Valid domain patterns: example.com, sub.example.com, example.co.uk, etc.
//     if (normalized.includes('.') && !normalized.includes(' ')) {
//       // Check if it has a valid TLD or domain structure
//       const parts = normalized.split('.');
//       const lastPart = parts[parts.length - 1];
//       // Check if the last part (potential TLD) is at least 2 characters and is alphabetic
//       if (lastPart.length >= 2 && /^[a-zA-Z]+$/.test(lastPart)) {
//         // Looks like a valid domain
//         return `https://${normalized}`;
//       }
//     }
//     // Treat as search query
//     return `https://google.com/search?q=${encodeURIComponent(normalized)}`;
//   };

//   const handleSubmit = () => {
//     if (inputValue.trim()) {
//       const normalized = inputValue.trim();
//       const newUrl = normalizeUrl(normalized);

//       // Track search if user typed a search query (not a full URL)
//       if (!normalized.startsWith('http://') && !normalized.startsWith('https://') && !normalized.includes('.')) {
//         // This is a plain search query
//         addSearch(normalized);
//       } else if (newUrl.includes('google.com/search?q=')) {
//         // User typed a domain-like query that got converted to Google search
//         try {
//           const query = new URLSearchParams(new URL(newUrl).search).get('q');
//           if (query) {
//             addSearch(query);
//           }
//         } catch (e) {
//           // URL parsing failed, skip search tracking
//         }
//       }

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

//   const handleAddToBookmarks = async () => {
//     if (!currentTab) return;
//     triggerHaptic('impactLight');
//     if (bookmarked) {
//       const bookmark = bookmarks.find(b => b.url === currentTab.url);
//       if (bookmark) {
//         removeBookmark(bookmark.id);
//       }
//     } else {
//       // Capture screenshot for the bookmark preview
//       let screenshot: string | undefined;
//       if (containerRef.current) {
//         try {
//           screenshot = await captureRef(containerRef, {
//             format: 'jpg',
//             quality: 0.7,
//             result: 'data-uri',
//           });
//         } catch (e) {
//           console.log('Failed to capture bookmark screenshot:', e);
//         }
//       }
//       addBookmark({
//         id: Date.now().toString(),
//         title: currentTab.title || getDomain(currentTab.url),
//         url: currentTab.url,
//         source: getDomain(currentTab.url),
//         imageUrl: extractImageFromPage(currentTab.url),
//         screenshot,
//         addedAt: Date.now(),
//       });
//     }
//     setShowSaveMenu(false);
//   };

//   const handleAddToCollection = async (collectionId: string) => {
//     if (!currentTab) return;
//     triggerHaptic('impactLight');
//     // Capture screenshot for the collection item preview
//     let screenshot: string | undefined;
//     if (containerRef.current) {
//       try {
//         screenshot = await captureRef(containerRef, {
//           format: 'jpg',
//           quality: 0.7,
//           result: 'data-uri',
//         });
//       } catch (e) {
//         console.log('Failed to capture collection item screenshot:', e);
//       }
//     }
//     addItemToCollection(collectionId, {
//       id: Date.now().toString(),
//       title: currentTab.title || getDomain(currentTab.url),
//       url: currentTab.url,
//       source: getDomain(currentTab.url),
//       imageUrl: extractImageFromPage(currentTab.url),
//       screenshot,
//       addedAt: Date.now(),
//     });
//     setShowCollectionPicker(false);
//     setShowSaveMenu(false);
//   };

//   const handleShare = async () => {
//     if (!currentTab || !currentTab.url) return;
//     triggerHaptic('impactLight');
//     try {
//       await Share.share({
//         url: currentTab.url,
//         title: currentTab.title || getDomain(currentTab.url),
//         message: `${currentTab.title || getDomain(currentTab.url)}\n${
//           currentTab.url
//         }`,
//       });
//       setShowSaveMenu(false);
//     } catch (error) {
//       console.error('Error sharing:', error);
//     }
//   };

//   const handleOpenBookmarks = () => {
//     triggerHaptic('impactLight');
//     setShowSaveMenu(false);
//     setShowBookmarksModal(true);
//   };

//   const handleBookmarkNavigation = (url: string, title: string) => {
//     triggerHaptic('impactLight');
//     if (currentTab) {
//       updateTab(currentTab.id, url, title);
//     } else {
//       addTab(url, title);
//     }
//     setShowBookmarksModal(false);
//   };

//   const captureCurrentTabScreenshot = useCallback(async () => {
//     if (!containerRef.current || !currentTab || !currentTab.url) {
//       console.log('Screenshot skipped - no containerRef or currentTab');
//       return;
//     }
//     try {
//       console.log('Capturing screenshot for tab:', currentTab.id);
//       const uri = await captureRef(containerRef, {
//         format: 'jpg',
//         quality: 0.7,
//         result: 'data-uri',
//       });
//       console.log('Screenshot captured, length:', uri?.length);
//       if (uri) {
//         updateTabScreenshot(currentTab.id, uri);
//         console.log('Screenshot saved to tab');
//       }
//     } catch (error) {
//       console.log('Screenshot capture error:', error);
//     }
//   }, [currentTab, updateTabScreenshot]);

//   const openTabsView = async () => {
//     triggerHaptic('impactLight');
//     // Capture screenshot of current tab before showing tabs view
//     await captureCurrentTabScreenshot();
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
//     if (draggingIndex !== null) return; // Don't select while dragging
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

//   // Drag and drop handlers for tab reordering
//   const handleLongPress = (index: number) => {
//     triggerHaptic('impactHeavy');
//     setDraggingIndex(index);
//     // Scale up the dragged item
//     Animated.spring(dragScale, {
//       toValue: 1.05,
//       useNativeDriver: true,
//     }).start();
//   };

//   const handleDragMove = (index: number, gestureState: {dx: number; dy: number}) => {
//     if (draggingIndex === null) return;

//     dragAnimatedValue.setValue({
//       x: gestureState.dx,
//       y: gestureState.dy,
//     });

//     // Calculate which tab we're hovering over
//     const currentPos = tabPositions.current[draggingIndex];
//     if (!currentPos) return;

//     const newX = currentPos.x + gestureState.dx;
//     const newY = currentPos.y + gestureState.dy;

//     // Find the target index based on position
//     let targetIndex = draggingIndex;
//     for (let i = 0; i < tabPositions.current.length; i++) {
//       const pos = tabPositions.current[i];
//       if (
//         newX >= pos.x - pos.width / 2 &&
//         newX <= pos.x + pos.width * 1.5 &&
//         newY >= pos.y - pos.height / 2 &&
//         newY <= pos.y + pos.height * 1.5
//       ) {
//         targetIndex = i;
//         break;
//       }
//     }

//     if (targetIndex !== draggedOverIndex) {
//       setDraggedOverIndex(targetIndex);
//       if (targetIndex !== draggingIndex) {
//         triggerHaptic('impactLight');
//       }
//     }
//   };

//   const handleDragEnd = () => {
//     if (draggingIndex !== null && draggedOverIndex !== null && draggingIndex !== draggedOverIndex) {
//       reorderTabs(draggingIndex, draggedOverIndex);
//       triggerHaptic('impactMedium');
//     }

//     // Reset animations
//     Animated.parallel([
//       Animated.spring(dragScale, {
//         toValue: 1,
//         useNativeDriver: true,
//       }),
//       Animated.spring(dragAnimatedValue, {
//         toValue: {x: 0, y: 0},
//         useNativeDriver: true,
//       }),
//     ]).start();

//     setDraggingIndex(null);
//     setDraggedOverIndex(null);
//   };

//   const createPanResponder = (index: number) => {
//     return PanResponder.create({
//       onStartShouldSetPanResponder: () => false,
//       onMoveShouldSetPanResponder: () => draggingIndex === index,
//       onPanResponderMove: (_, gestureState) => {
//         handleDragMove(index, gestureState);
//       },
//       onPanResponderRelease: () => {
//         handleDragEnd();
//       },
//       onPanResponderTerminate: () => {
//         handleDragEnd();
//       },
//     });
//   };

//   const handleTabLayout = (index: number, event: LayoutChangeEvent) => {
//     const {x, y, width, height} = event.nativeEvent.layout;
//     tabPositions.current[index] = {x, y, width, height};
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
//     tabCardDragging: {
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 8},
//       shadowOpacity: 0.4,
//       shadowRadius: 12,
//       borderColor: theme.colors.primary,
//     },
//     tabCardHeader: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 10,
//       paddingVertical: 8,
//       backgroundColor: 'transparent',
//     },
//     tabCardTitle: {
//       flex: 1,
//       fontSize: 12,
//       fontWeight: '500',
//       color: '#fff',
//     },
//     tabCardClose: {
//       padding: 2,
//     },
//     tabCardContent: {
//       flex: 1,
//       backgroundColor: 'transparent',
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       paddingBottom: 8,
//     },
//     tabCardDomain: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: 'rgba(255, 255, 255, 0.9)',
//       marginTop: 0,
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
//     // Bookmarks Modal Styles
//     bookmarksModalContainer: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       marginTop: insets.top,
//     },
//     bookmarksModalHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: 16,
//       paddingTop: 16,
//       paddingBottom: 8,
//     },
//     bookmarksCloseButton: {
//       padding: 8,
//     },
//     bookmarksMenuButton: {
//       padding: 8,
//     },
//     bookmarksSearchContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 10,
//       marginHorizontal: 16,
//       marginBottom: 16,
//       paddingHorizontal: 12,
//       height: 40,
//     },
//     bookmarksSearchIcon: {
//       marginRight: 8,
//     },
//     bookmarksSearchInput: {
//       flex: 1,
//       fontSize: 15,
//       color: theme.colors.foreground,
//       padding: 0,
//     },
//     bookmarksSearchMic: {
//       marginLeft: 8,
//     },
//     bookmarksModalContent: {
//       flex: 1,
//     },
//     // Recently Saved Section
//     recentlySavedSection: {
//       marginBottom: 24,
//     },
//     sectionHeaderText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       paddingHorizontal: 16,
//       marginBottom: 12,
//     },
//     recentlySavedScroll: {
//       paddingLeft: 16,
//     },
//     recentlySavedCard: {
//       width: 160,
//       marginRight: 12,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//     },
//     recentlySavedPreview: {
//       width: '100%',
//       height: 100,
//       backgroundColor: theme.colors.background,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     recentlySavedTitle: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     recentlySavedUrl: {
//       fontSize: 11,
//       color: theme.colors.foreground3,
//       marginBottom: 6,
//     },
//     recentlySavedBadge: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       alignSelf: 'flex-start',
//       paddingHorizontal: 6,
//       paddingVertical: 2,
//       borderRadius: 4,
//     },
//     recentlySavedBadgeText: {
//       fontSize: 9,
//       color: theme.colors.foreground3,
//       marginLeft: 2,
//     },
//     // Folders Section
//     foldersSection: {
//       marginBottom: 24,
//     },
//     folderItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     folderIcon: {
//       width: 32,
//       height: 32,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 12,
//     },
//     folderName: {
//       flex: 1,
//       fontSize: 15,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     folderCount: {
//       fontSize: 14,
//       color: theme.colors.foreground3,
//       marginRight: 8,
//     },
//     // Bookmarks Section
//     bookmarksSection: {
//       marginBottom: 24,
//     },
//     bookmarkListItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 10,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     bookmarkListIcon: {
//       width: 24,
//       height: 24,
//       borderRadius: 6,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 12,
//     },
//     bookmarkListTitle: {
//       flex: 1,
//       fontSize: 14,
//       color: theme.colors.foreground,
//     },
//     // Empty State
//     bookmarksEmptyState: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingVertical: 60,
//     },
//     bookmarksEmptyText: {
//       fontSize: 16,
//       color: theme.colors.foreground3,
//       marginTop: 16,
//     },
//     // Tab Bar
//     bookmarksTabBar: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingBottom: insets.bottom + 12,
//       backgroundColor: theme.colors.surface,
//       borderTopWidth: 1,
//       borderTopColor: theme.colors.surfaceBorder,
//     },
//     bookmarksTab: {
//       padding: 8,
//     },
//     // Legacy styles (for compatibility)
//     bookmarkModalItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 14,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     bookmarkModalIcon: {
//       width: 36,
//       height: 36,
//       borderRadius: 8,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 12,
//     },
//     bookmarkModalInfo: {
//       flex: 1,
//       marginRight: 8,
//     },
//     bookmarkModalTitle: {
//       fontSize: 15,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     bookmarkModalUrl: {
//       fontSize: 13,
//       color: theme.colors.foreground3,
//     },
//     // Tab Card Preview Image
//     tabCardPreview: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     tabCardPreviewContainer: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       width: '100%',
//       height: '100%',
//       justifyContent: 'center',
//       alignItems: 'center',
//       overflow: 'hidden',
//     },
//     tabCardScreenshot: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     tabCardPlaceholder: {
//       position: 'absolute',
//       width: '100%',
//       height: '100%',
//       top: 0,
//       left: 0,
//     },
//     tabCardFavicon: {
//       width: 64,
//       height: 64,
//       borderRadius: 8,
//     },
//     tabCardOverlay: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: 'rgba(0, 0, 0, 0.4)',
//       justifyContent: 'space-between',
//       padding: 0,
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
//             keyboardType="ascii-capable"
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
//         <View ref={containerRef} style={{flex: 1}} collapsable={false}>
//           <WebView
//             ref={webRef}
//             source={{uri: currentTab?.url || ''}}
//             style={{flex: 1}}
//             originWhitelist={['*']}
//             javaScriptEnabled
//             domStorageEnabled
//             // 👇 Inertia / momentum scrolling
//             decelerationRate="normal" // gives Safari-style glide
//             bounces={true} // iOS bounce effect
//             scrollEnabled={true} // ensure scroll isn't locked
//             showsVerticalScrollIndicator={false}
//             showsHorizontalScrollIndicator={false}
//             overScrollMode="never" // keeps Android smooth too
//             androidLayerType="hardware" // helps performance
//             onNavigationStateChange={navState => {
//               if (currentTab && navState.url) {
//                 updateTab(
//                   currentTab.id,
//                   navState.url,
//                   navState.title || currentTab.title,
//                 );
//                 setInputValue(navState.url);
//                 // Track visit history
//                 addToHistory(
//                   navState.url,
//                   navState.title || getDomain(navState.url),
//                   getDomain(navState.url),
//                 );
//               }
//             }}
//             userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
//           />
//         </View>
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

//           <ScrollView contentContainerStyle={styles.tabsGrid} scrollEnabled={draggingIndex === null}>
//             {tabs.map((tab, index) => {
//               const isDragging = draggingIndex === index;
//               const isDropTarget = draggedOverIndex === index && draggingIndex !== index;
//               const panResponder = createPanResponder(index);

//               return (
//                 <Animated.View
//                   key={tab.id}
//                   onLayout={(e) => handleTabLayout(index, e)}
//                   style={[
//                     isDragging && {
//                       transform: [
//                         {translateX: dragAnimatedValue.x},
//                         {translateY: dragAnimatedValue.y},
//                         {scale: dragScale},
//                       ],
//                       zIndex: 1000,
//                       elevation: 10,
//                     },
//                     isDropTarget && {
//                       opacity: 0.5,
//                     },
//                   ]}
//                   {...panResponder.panHandlers}>
//                   <TouchableOpacity
//                     style={[
//                       styles.tabCard,
//                       tab.id === currentTabId && styles.tabCardActive,
//                       isDragging && styles.tabCardDragging,
//                     ]}
//                     onPress={() => handleSelectTab(tab.id)}
//                     onLongPress={() => handleLongPress(index)}
//                     delayLongPress={300}
//                     activeOpacity={0.8}>
//                     {/* Tab Preview Background */}
//                     <View style={styles.tabCardPreviewContainer}>
//                       {tab.screenshot ? (
//                         <Image
//                           source={{uri: tab.screenshot}}
//                           style={styles.tabCardScreenshot}
//                           resizeMode="cover"
//                         />
//                       ) : (
//                         <>
//                           {/* Gradient/colored background when no screenshot */}
//                           <View
//                             style={[
//                               styles.tabCardPlaceholder,
//                               {backgroundColor: theme.colors.surface},
//                             ]}
//                           />
//                           <Image
//                             source={{
//                               uri: `https://icons.duckduckgo.com/ip3/${getDomain(
//                                 tab.url,
//                               )}.ico`,
//                             }}
//                             style={styles.tabCardFavicon}
//                             defaultSource={require('../assets/images/desktop-2.jpg')}
//                           />
//                         </>
//                       )}
//                     </View>

//                     {/* Overlay with text content */}
//                     <View style={styles.tabCardOverlay}>
//                       <View style={styles.tabCardHeader}>
//                         <Text style={styles.tabCardTitle} numberOfLines={2}>
//                           {tab.title || getDomain(tab.url)}
//                         </Text>
//                         <TouchableOpacity
//                           style={styles.tabCardClose}
//                           onPress={() => handleCloseTab(tab.id)}
//                           hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
//                           <MaterialIcons name="close" size={16} color="#fff" />
//                         </TouchableOpacity>
//                       </View>
//                       <View style={styles.tabCardContent}>
//                         <Text style={styles.tabCardDomain}>
//                           {getDomain(tab.url)}
//                         </Text>
//                       </View>
//                     </View>
//                   </TouchableOpacity>
//                 </Animated.View>
//               );
//             })}
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

//             {/* Share Link */}
//             <TouchableOpacity style={styles.saveMenuItem} onPress={handleShare}>
//               <View style={styles.saveMenuItemIcon}>
//                 <MaterialIcons name="share" size={22} color="#3b82f6" />
//               </View>
//               <Text style={styles.saveMenuItemText}>Share Link</Text>
//               <MaterialIcons
//                 name="ios-share"
//                 size={20}
//                 color={theme.colors.foreground3}
//               />
//             </TouchableOpacity>

//             {/* View Bookmarks */}
//             <TouchableOpacity
//               style={styles.saveMenuItem}
//               onPress={handleOpenBookmarks}>
//               <View style={styles.saveMenuItemIcon}>
//                 <MaterialIcons
//                   name="bookmarks"
//                   size={22}
//                   color={theme.colors.primary}
//                 />
//               </View>
//               <Text style={styles.saveMenuItemText}>Bookmarks</Text>
//               <Text style={styles.collectionCount}>{bookmarks.length}</Text>
//             </TouchableOpacity>
//           </TouchableOpacity>
//         </TouchableOpacity>
//       </Modal>

//       {/* Bookmarks Modal */}
//       <Modal
//         visible={showBookmarksModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowBookmarksModal(false)}>
//         <View style={styles.bookmarksModalContainer}>
//           {/* Header */}
//           <View style={styles.bookmarksModalHeader}>
//             <TouchableOpacity
//               onPress={() => setShowBookmarksModal(false)}
//               style={styles.bookmarksCloseButton}>
//               <MaterialIcons
//                 name="close"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.bookmarksMenuButton}>
//               <MaterialIcons
//                 name="more-horiz"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </View>

//           {/* Search Bar */}
//           <View style={styles.bookmarksSearchContainer}>
//             <MaterialIcons
//               name="search"
//               size={20}
//               color={theme.colors.foreground3}
//               style={styles.bookmarksSearchIcon}
//             />
//             <TextInput
//               style={styles.bookmarksSearchInput}
//               placeholder="Search Bookmarks"
//               placeholderTextColor={theme.colors.foreground3}
//             />
//             <MaterialIcons
//               name="mic"
//               size={20}
//               color={theme.colors.foreground3}
//               style={styles.bookmarksSearchMic}
//             />
//           </View>

//           <ScrollView style={styles.bookmarksModalContent}>
//             {activeBookmarksTab === 'bookmarks' ? (
//               <>
//                 {/* Recently Saved */}
//                 {bookmarks.length > 0 && (
//                   <View style={styles.recentlySavedSection}>
//                     <Text style={styles.sectionHeaderText}>
//                       Recently Saved
//                       <MaterialIcons
//                         name="chevron-right"
//                         size={18}
//                         color={theme.colors.foreground3}
//                       />
//                     </Text>
//                     <ScrollView
//                       horizontal
//                       showsHorizontalScrollIndicator={false}
//                       style={styles.recentlySavedScroll}>
//                       {bookmarks.slice(0, 5).map(bookmark => (
//                         <TouchableOpacity
//                           key={bookmark.id}
//                           style={styles.recentlySavedCard}
//                           onPress={() =>
//                             handleBookmarkNavigation(
//                               bookmark.url,
//                               bookmark.title,
//                             )
//                           }>
//                           <View style={styles.recentlySavedPreview}>
//                             <MaterialIcons
//                               name="language"
//                               size={32}
//                               color={theme.colors.foreground3}
//                             />
//                           </View>
//                           <Text
//                             style={styles.recentlySavedTitle}
//                             numberOfLines={2}>
//                             {bookmark.title}
//                           </Text>
//                           <Text
//                             style={styles.recentlySavedUrl}
//                             numberOfLines={1}>
//                             {bookmark.source}
//                           </Text>
//                           <View style={styles.recentlySavedBadge}>
//                             <MaterialIcons
//                               name="schedule"
//                               size={10}
//                               color={theme.colors.foreground3}
//                             />
//                             <Text style={styles.recentlySavedBadgeText}>
//                               Bookmarks
//                             </Text>
//                           </View>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </View>
//                 )}

//                 {/* Collections Folders */}
//                 {collections.length > 0 && (
//                   <View style={styles.foldersSection}>
//                     <Text style={styles.sectionHeaderText}>Collections</Text>
//                     {collections.map(collection => (
//                       <TouchableOpacity
//                         key={collection.id}
//                         style={styles.folderItem}>
//                         <View
//                           style={[
//                             styles.folderIcon,
//                             {backgroundColor: collection.color + '33'},
//                           ]}>
//                           <MaterialIcons
//                             name="folder"
//                             size={20}
//                             color={collection.color}
//                           />
//                         </View>
//                         <Text style={styles.folderName}>{collection.name}</Text>
//                         <Text style={styles.folderCount}>
//                           {collection.items.length}
//                         </Text>
//                         <MaterialIcons
//                           name="chevron-right"
//                           size={20}
//                           color={theme.colors.foreground3}
//                         />
//                       </TouchableOpacity>
//                     ))}
//                   </View>
//                 )}

//                 {/* All Bookmarks */}
//                 {bookmarks.length > 0 && (
//                   <View style={styles.bookmarksSection}>
//                     <Text style={styles.sectionHeaderText}>Bookmarks</Text>
//                     {bookmarks.map(bookmark => (
//                       <TouchableOpacity
//                         key={bookmark.id}
//                         style={styles.bookmarkListItem}
//                         onPress={() =>
//                           handleBookmarkNavigation(bookmark.url, bookmark.title)
//                         }>
//                         <View style={styles.bookmarkListIcon}>
//                           <MaterialIcons
//                             name="language"
//                             size={16}
//                             color={theme.colors.foreground3}
//                           />
//                         </View>
//                         <Text
//                           style={styles.bookmarkListTitle}
//                           numberOfLines={1}>
//                           {bookmark.title}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </View>
//                 )}

//                 {/* Empty State */}
//                 {bookmarks.length === 0 && collections.length === 0 && (
//                   <View style={styles.bookmarksEmptyState}>
//                     <MaterialIcons
//                       name="bookmark-border"
//                       size={48}
//                       color={theme.colors.foreground3}
//                     />
//                     <Text style={styles.bookmarksEmptyText}>
//                       No bookmarks yet
//                     </Text>
//                   </View>
//                 )}
//               </>
//             ) : (
//               <>
//                 {/* Browsing History */}
//                 {history.length > 0 ? (
//                   <View style={styles.bookmarksSection}>
//                     <Text style={styles.sectionHeaderText}>
//                       Browsing History
//                     </Text>
//                     {history.map((item, index) => (
//                       <TouchableOpacity
//                         key={`${item.url}-${index}`}
//                         style={styles.bookmarkListItem}
//                         onPress={() =>
//                           handleBookmarkNavigation(item.url, item.title)
//                         }>
//                         <View style={styles.bookmarkListIcon}>
//                           <MaterialIcons
//                             name="history"
//                             size={16}
//                             color={theme.colors.foreground3}
//                           />
//                         </View>
//                         <View style={{flex: 1}}>
//                           <Text
//                             style={styles.bookmarkListTitle}
//                             numberOfLines={1}>
//                             {item.title}
//                           </Text>
//                           <Text
//                             style={styles.recentlySavedUrl}
//                             numberOfLines={1}>
//                             {item.source}
//                           </Text>
//                         </View>
//                         {item.visitCount > 1 && (
//                           <Text style={styles.folderCount}>
//                             {item.visitCount}x
//                           </Text>
//                         )}
//                       </TouchableOpacity>
//                     ))}
//                   </View>
//                 ) : (
//                   <View style={styles.bookmarksEmptyState}>
//                     <MaterialIcons
//                       name="history"
//                       size={48}
//                       color={theme.colors.foreground3}
//                     />
//                     <Text style={styles.bookmarksEmptyText}>
//                       No browsing history
//                     </Text>
//                   </View>
//                 )}
//               </>
//             )}
//           </ScrollView>

//           {/* Bottom Tab Bar */}
//           <View style={styles.bookmarksTabBar}>
//             <TouchableOpacity
//               style={styles.bookmarksTab}
//               onPress={() => {
//                 triggerHaptic('impactLight');
//                 setActiveBookmarksTab('bookmarks');
//               }}>
//               <MaterialIcons
//                 name="bookmark"
//                 size={22}
//                 color={
//                   activeBookmarksTab === 'bookmarks'
//                     ? theme.colors.primary
//                     : theme.colors.foreground3
//                 }
//               />
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={styles.bookmarksTab}
//               onPress={() => {
//                 triggerHaptic('impactLight');
//                 setActiveBookmarksTab('history');
//               }}>
//               <MaterialIcons
//                 name="history"
//                 size={22}
//                 color={
//                   activeBookmarksTab === 'history'
//                     ? theme.colors.primary
//                     : theme.colors.foreground3
//                 }
//               />
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

///////////////

// import React, {useRef, useState, useEffect, useCallback} from 'react';
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
//   Share,
//   Image,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {captureRef} from 'react-native-view-shot';
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
//   const containerRef = useRef<View>(null);
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
//     updateTabScreenshot,
//     addBookmark,
//     removeBookmark,
//     isBookmarked,
//     bookmarks,
//     collections,
//     addItemToCollection,
//     history,
//     addToHistory,
//     _hasHydrated,
//   } = useShoppingStore();

//   const currentTab = tabs.find(t => t.id === currentTabId);
//   const bookmarked = currentTab ? isBookmarked(currentTab.url) : false;
//   const [showSaveMenu, setShowSaveMenu] = useState(false);
//   const [showCollectionPicker, setShowCollectionPicker] = useState(false);
//   const [showBookmarksModal, setShowBookmarksModal] = useState(false);
//   const [activeBookmarksTab, setActiveBookmarksTab] = useState<
//     'bookmarks' | 'history'
//   >('bookmarks');

//   // Initialize with a tab if navigating with URL (wait for hydration)
//   useEffect(() => {
//     if (_hasHydrated && initialUrl && tabs.length === 0) {
//       addTab(initialUrl, 'New Tab');
//     }
//   }, [_hasHydrated, initialUrl, tabs.length]);

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

//   const extractImageFromPage = (url: string): string => {
//     // Use DuckDuckGo favicon service (more reliable)
//     try {
//       const domain = new URL(url).hostname;
//       // DuckDuckGo favicon service
//       return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
//     } catch {
//       return '';
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
//         imageUrl: extractImageFromPage(currentTab.url),
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
//       imageUrl: extractImageFromPage(currentTab.url),
//       addedAt: Date.now(),
//     });
//     setShowCollectionPicker(false);
//     setShowSaveMenu(false);
//   };

//   const handleShare = async () => {
//     if (!currentTab || !currentTab.url) return;
//     triggerHaptic('impactLight');
//     try {
//       await Share.share({
//         url: currentTab.url,
//         title: currentTab.title || getDomain(currentTab.url),
//         message: `${currentTab.title || getDomain(currentTab.url)}\n${
//           currentTab.url
//         }`,
//       });
//       setShowSaveMenu(false);
//     } catch (error) {
//       console.error('Error sharing:', error);
//     }
//   };

//   const handleOpenBookmarks = () => {
//     triggerHaptic('impactLight');
//     setShowSaveMenu(false);
//     setShowBookmarksModal(true);
//   };

//   const handleBookmarkNavigation = (url: string, title: string) => {
//     triggerHaptic('impactLight');
//     if (currentTab) {
//       updateTab(currentTab.id, url, title);
//     } else {
//       addTab(url, title);
//     }
//     setShowBookmarksModal(false);
//   };

//   const captureCurrentTabScreenshot = useCallback(async () => {
//     if (!containerRef.current || !currentTab || !currentTab.url) {
//       console.log('Screenshot skipped - no containerRef or currentTab');
//       return;
//     }
//     try {
//       console.log('Capturing screenshot for tab:', currentTab.id);
//       const uri = await captureRef(containerRef, {
//         format: 'jpg',
//         quality: 0.7,
//         result: 'data-uri',
//       });
//       console.log('Screenshot captured, length:', uri?.length);
//       if (uri) {
//         updateTabScreenshot(currentTab.id, uri);
//         console.log('Screenshot saved to tab');
//       }
//     } catch (error) {
//       console.log('Screenshot capture error:', error);
//     }
//   }, [currentTab, updateTabScreenshot]);

//   const openTabsView = async () => {
//     triggerHaptic('impactLight');
//     // Capture screenshot of current tab before showing tabs view
//     await captureCurrentTabScreenshot();
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
//       backgroundColor: 'transparent',
//     },
//     tabCardTitle: {
//       flex: 1,
//       fontSize: 12,
//       fontWeight: '500',
//       color: '#fff',
//     },
//     tabCardClose: {
//       padding: 2,
//     },
//     tabCardContent: {
//       flex: 1,
//       backgroundColor: 'transparent',
//       justifyContent: 'flex-end',
//       alignItems: 'center',
//       paddingBottom: 8,
//     },
//     tabCardDomain: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: 'rgba(255, 255, 255, 0.9)',
//       marginTop: 0,
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
//     // Bookmarks Modal Styles
//     bookmarksModalContainer: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       marginTop: insets.top,
//     },
//     bookmarksModalHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: 16,
//       paddingTop: 16,
//       paddingBottom: 8,
//     },
//     bookmarksCloseButton: {
//       padding: 8,
//     },
//     bookmarksMenuButton: {
//       padding: 8,
//     },
//     bookmarksSearchContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 10,
//       marginHorizontal: 16,
//       marginBottom: 16,
//       paddingHorizontal: 12,
//       height: 40,
//     },
//     bookmarksSearchIcon: {
//       marginRight: 8,
//     },
//     bookmarksSearchInput: {
//       flex: 1,
//       fontSize: 15,
//       color: theme.colors.foreground,
//       padding: 0,
//     },
//     bookmarksSearchMic: {
//       marginLeft: 8,
//     },
//     bookmarksModalContent: {
//       flex: 1,
//     },
//     // Recently Saved Section
//     recentlySavedSection: {
//       marginBottom: 24,
//     },
//     sectionHeaderText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       paddingHorizontal: 16,
//       marginBottom: 12,
//     },
//     recentlySavedScroll: {
//       paddingLeft: 16,
//     },
//     recentlySavedCard: {
//       width: 160,
//       marginRight: 12,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//     },
//     recentlySavedPreview: {
//       width: '100%',
//       height: 100,
//       backgroundColor: theme.colors.background,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     recentlySavedTitle: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     recentlySavedUrl: {
//       fontSize: 11,
//       color: theme.colors.foreground3,
//       marginBottom: 6,
//     },
//     recentlySavedBadge: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       alignSelf: 'flex-start',
//       paddingHorizontal: 6,
//       paddingVertical: 2,
//       borderRadius: 4,
//     },
//     recentlySavedBadgeText: {
//       fontSize: 9,
//       color: theme.colors.foreground3,
//       marginLeft: 2,
//     },
//     // Folders Section
//     foldersSection: {
//       marginBottom: 24,
//     },
//     folderItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     folderIcon: {
//       width: 32,
//       height: 32,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 12,
//     },
//     folderName: {
//       flex: 1,
//       fontSize: 15,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     folderCount: {
//       fontSize: 14,
//       color: theme.colors.foreground3,
//       marginRight: 8,
//     },
//     // Bookmarks Section
//     bookmarksSection: {
//       marginBottom: 24,
//     },
//     bookmarkListItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 10,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     bookmarkListIcon: {
//       width: 24,
//       height: 24,
//       borderRadius: 6,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 12,
//     },
//     bookmarkListTitle: {
//       flex: 1,
//       fontSize: 14,
//       color: theme.colors.foreground,
//     },
//     // Empty State
//     bookmarksEmptyState: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingVertical: 60,
//     },
//     bookmarksEmptyText: {
//       fontSize: 16,
//       color: theme.colors.foreground3,
//       marginTop: 16,
//     },
//     // Tab Bar
//     bookmarksTabBar: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingBottom: insets.bottom + 12,
//       backgroundColor: theme.colors.surface,
//       borderTopWidth: 1,
//       borderTopColor: theme.colors.surfaceBorder,
//     },
//     bookmarksTab: {
//       padding: 8,
//     },
//     // Legacy styles (for compatibility)
//     bookmarkModalItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 14,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     bookmarkModalIcon: {
//       width: 36,
//       height: 36,
//       borderRadius: 8,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 12,
//     },
//     bookmarkModalInfo: {
//       flex: 1,
//       marginRight: 8,
//     },
//     bookmarkModalTitle: {
//       fontSize: 15,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     bookmarkModalUrl: {
//       fontSize: 13,
//       color: theme.colors.foreground3,
//     },
//     // Tab Card Preview Image
//     tabCardPreview: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     tabCardPreviewContainer: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       width: '100%',
//       height: '100%',
//       justifyContent: 'center',
//       alignItems: 'center',
//       overflow: 'hidden',
//     },
//     tabCardScreenshot: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     tabCardPlaceholder: {
//       position: 'absolute',
//       width: '100%',
//       height: '100%',
//       top: 0,
//       left: 0,
//     },
//     tabCardFavicon: {
//       width: 64,
//       height: 64,
//       borderRadius: 8,
//     },
//     tabCardOverlay: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: 'rgba(0, 0, 0, 0.4)',
//       justifyContent: 'space-between',
//       padding: 0,
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
//         <View ref={containerRef} style={{flex: 1}} collapsable={false}>
//           <WebView
//             ref={webRef}
//             source={{uri: currentTab?.url || ''}}
//             style={{flex: 1}}
//             originWhitelist={['*']}
//             javaScriptEnabled
//             domStorageEnabled
//             // 👇 Inertia / momentum scrolling
//             decelerationRate="normal" // gives Safari-style glide
//             bounces={true} // iOS bounce effect
//             scrollEnabled={true} // ensure scroll isn't locked
//             showsVerticalScrollIndicator={false}
//             showsHorizontalScrollIndicator={false}
//             overScrollMode="never" // keeps Android smooth too
//             androidLayerType="hardware" // helps performance
//             onNavigationStateChange={navState => {
//               if (currentTab && navState.url) {
//                 updateTab(
//                   currentTab.id,
//                   navState.url,
//                   navState.title || currentTab.title,
//                 );
//                 setInputValue(navState.url);
//                 // Track visit history
//                 addToHistory(
//                   navState.url,
//                   navState.title || getDomain(navState.url),
//                   getDomain(navState.url),
//                 );
//               }
//             }}
//             userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
//           />
//         </View>
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
//                 {/* Tab Preview Background */}
//                 <View style={styles.tabCardPreviewContainer}>
//                   {tab.screenshot ? (
//                     <Image
//                       source={{uri: tab.screenshot}}
//                       style={styles.tabCardScreenshot}
//                       resizeMode="cover"
//                     />
//                   ) : (
//                     <>
//                       {/* Gradient/colored background when no screenshot */}
//                       <View style={[styles.tabCardPlaceholder, {backgroundColor: theme.colors.surface}]} />
//                       <Image
//                         source={{
//                           uri: `https://icons.duckduckgo.com/ip3/${getDomain(
//                             tab.url,
//                           )}.ico`,
//                         }}
//                         style={styles.tabCardFavicon}
//                         defaultSource={require('../assets/images/desktop-2.jpg')}
//                       />
//                     </>
//                   )}
//                 </View>

//                 {/* Overlay with text content */}
//                 <View style={styles.tabCardOverlay}>
//                   <View style={styles.tabCardHeader}>
//                     <Text style={styles.tabCardTitle} numberOfLines={2}>
//                       {tab.title || getDomain(tab.url)}
//                     </Text>
//                     <TouchableOpacity
//                       style={styles.tabCardClose}
//                       onPress={() => handleCloseTab(tab.id)}
//                       hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
//                       <MaterialIcons name="close" size={16} color="#fff" />
//                     </TouchableOpacity>
//                   </View>
//                   <View style={styles.tabCardContent}>
//                     <Text style={styles.tabCardDomain}>
//                       {getDomain(tab.url)}
//                     </Text>
//                   </View>
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

//             {/* Share Link */}
//             <TouchableOpacity style={styles.saveMenuItem} onPress={handleShare}>
//               <View style={styles.saveMenuItemIcon}>
//                 <MaterialIcons name="share" size={22} color="#3b82f6" />
//               </View>
//               <Text style={styles.saveMenuItemText}>Share Link</Text>
//               <MaterialIcons
//                 name="ios-share"
//                 size={20}
//                 color={theme.colors.foreground3}
//               />
//             </TouchableOpacity>

//             {/* View Bookmarks */}
//             <TouchableOpacity
//               style={styles.saveMenuItem}
//               onPress={handleOpenBookmarks}>
//               <View style={styles.saveMenuItemIcon}>
//                 <MaterialIcons
//                   name="bookmarks"
//                   size={22}
//                   color={theme.colors.primary}
//                 />
//               </View>
//               <Text style={styles.saveMenuItemText}>Bookmarks</Text>
//               <Text style={styles.collectionCount}>{bookmarks.length}</Text>
//             </TouchableOpacity>
//           </TouchableOpacity>
//         </TouchableOpacity>
//       </Modal>

//       {/* Bookmarks Modal */}
//       <Modal
//         visible={showBookmarksModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowBookmarksModal(false)}>
//         <View style={styles.bookmarksModalContainer}>
//           {/* Header */}
//           <View style={styles.bookmarksModalHeader}>
//             <TouchableOpacity
//               onPress={() => setShowBookmarksModal(false)}
//               style={styles.bookmarksCloseButton}>
//               <MaterialIcons
//                 name="close"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.bookmarksMenuButton}>
//               <MaterialIcons
//                 name="more-horiz"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </View>

//           {/* Search Bar */}
//           <View style={styles.bookmarksSearchContainer}>
//             <MaterialIcons
//               name="search"
//               size={20}
//               color={theme.colors.foreground3}
//               style={styles.bookmarksSearchIcon}
//             />
//             <TextInput
//               style={styles.bookmarksSearchInput}
//               placeholder="Search Bookmarks"
//               placeholderTextColor={theme.colors.foreground3}
//             />
//             <MaterialIcons
//               name="mic"
//               size={20}
//               color={theme.colors.foreground3}
//               style={styles.bookmarksSearchMic}
//             />
//           </View>

//           <ScrollView style={styles.bookmarksModalContent}>
//             {activeBookmarksTab === 'bookmarks' ? (
//               <>
//                 {/* Recently Saved */}
//                 {bookmarks.length > 0 && (
//                   <View style={styles.recentlySavedSection}>
//                     <Text style={styles.sectionHeaderText}>
//                       Recently Saved
//                       <MaterialIcons
//                         name="chevron-right"
//                         size={18}
//                         color={theme.colors.foreground3}
//                       />
//                     </Text>
//                     <ScrollView
//                       horizontal
//                       showsHorizontalScrollIndicator={false}
//                       style={styles.recentlySavedScroll}>
//                       {bookmarks.slice(0, 5).map(bookmark => (
//                         <TouchableOpacity
//                           key={bookmark.id}
//                           style={styles.recentlySavedCard}
//                           onPress={() =>
//                             handleBookmarkNavigation(
//                               bookmark.url,
//                               bookmark.title,
//                             )
//                           }>
//                           <View style={styles.recentlySavedPreview}>
//                             <MaterialIcons
//                               name="language"
//                               size={32}
//                               color={theme.colors.foreground3}
//                             />
//                           </View>
//                           <Text
//                             style={styles.recentlySavedTitle}
//                             numberOfLines={2}>
//                             {bookmark.title}
//                           </Text>
//                           <Text
//                             style={styles.recentlySavedUrl}
//                             numberOfLines={1}>
//                             {bookmark.source}
//                           </Text>
//                           <View style={styles.recentlySavedBadge}>
//                             <MaterialIcons
//                               name="schedule"
//                               size={10}
//                               color={theme.colors.foreground3}
//                             />
//                             <Text style={styles.recentlySavedBadgeText}>
//                               Bookmarks
//                             </Text>
//                           </View>
//                         </TouchableOpacity>
//                       ))}
//                     </ScrollView>
//                   </View>
//                 )}

//                 {/* Collections Folders */}
//                 {collections.length > 0 && (
//                   <View style={styles.foldersSection}>
//                     <Text style={styles.sectionHeaderText}>Collections</Text>
//                     {collections.map(collection => (
//                       <TouchableOpacity
//                         key={collection.id}
//                         style={styles.folderItem}>
//                         <View
//                           style={[
//                             styles.folderIcon,
//                             {backgroundColor: collection.color + '33'},
//                           ]}>
//                           <MaterialIcons
//                             name="folder"
//                             size={20}
//                             color={collection.color}
//                           />
//                         </View>
//                         <Text style={styles.folderName}>{collection.name}</Text>
//                         <Text style={styles.folderCount}>
//                           {collection.items.length}
//                         </Text>
//                         <MaterialIcons
//                           name="chevron-right"
//                           size={20}
//                           color={theme.colors.foreground3}
//                         />
//                       </TouchableOpacity>
//                     ))}
//                   </View>
//                 )}

//                 {/* All Bookmarks */}
//                 {bookmarks.length > 0 && (
//                   <View style={styles.bookmarksSection}>
//                     <Text style={styles.sectionHeaderText}>Bookmarks</Text>
//                     {bookmarks.map(bookmark => (
//                       <TouchableOpacity
//                         key={bookmark.id}
//                         style={styles.bookmarkListItem}
//                         onPress={() =>
//                           handleBookmarkNavigation(bookmark.url, bookmark.title)
//                         }>
//                         <View style={styles.bookmarkListIcon}>
//                           <MaterialIcons
//                             name="language"
//                             size={16}
//                             color={theme.colors.foreground3}
//                           />
//                         </View>
//                         <Text
//                           style={styles.bookmarkListTitle}
//                           numberOfLines={1}>
//                           {bookmark.title}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </View>
//                 )}

//                 {/* Empty State */}
//                 {bookmarks.length === 0 && collections.length === 0 && (
//                   <View style={styles.bookmarksEmptyState}>
//                     <MaterialIcons
//                       name="bookmark-border"
//                       size={48}
//                       color={theme.colors.foreground3}
//                     />
//                     <Text style={styles.bookmarksEmptyText}>
//                       No bookmarks yet
//                     </Text>
//                   </View>
//                 )}
//               </>
//             ) : (
//               <>
//                 {/* Browsing History */}
//                 {history.length > 0 ? (
//                   <View style={styles.bookmarksSection}>
//                     <Text style={styles.sectionHeaderText}>
//                       Browsing History
//                     </Text>
//                     {history.map((item, index) => (
//                       <TouchableOpacity
//                         key={`${item.url}-${index}`}
//                         style={styles.bookmarkListItem}
//                         onPress={() =>
//                           handleBookmarkNavigation(item.url, item.title)
//                         }>
//                         <View style={styles.bookmarkListIcon}>
//                           <MaterialIcons
//                             name="history"
//                             size={16}
//                             color={theme.colors.foreground3}
//                           />
//                         </View>
//                         <View style={{flex: 1}}>
//                           <Text
//                             style={styles.bookmarkListTitle}
//                             numberOfLines={1}>
//                             {item.title}
//                           </Text>
//                           <Text
//                             style={styles.recentlySavedUrl}
//                             numberOfLines={1}>
//                             {item.source}
//                           </Text>
//                         </View>
//                         {item.visitCount > 1 && (
//                           <Text style={styles.folderCount}>
//                             {item.visitCount}x
//                           </Text>
//                         )}
//                       </TouchableOpacity>
//                     ))}
//                   </View>
//                 ) : (
//                   <View style={styles.bookmarksEmptyState}>
//                     <MaterialIcons
//                       name="history"
//                       size={48}
//                       color={theme.colors.foreground3}
//                     />
//                     <Text style={styles.bookmarksEmptyText}>
//                       No browsing history
//                     </Text>
//                   </View>
//                 )}
//               </>
//             )}
//           </ScrollView>

//           {/* Bottom Tab Bar */}
//           <View style={styles.bookmarksTabBar}>
//             <TouchableOpacity
//               style={styles.bookmarksTab}
//               onPress={() => {
//                 triggerHaptic('impactLight');
//                 setActiveBookmarksTab('bookmarks');
//               }}>
//               <MaterialIcons
//                 name="bookmark"
//                 size={22}
//                 color={
//                   activeBookmarksTab === 'bookmarks'
//                     ? theme.colors.primary
//                     : theme.colors.foreground3
//                 }
//               />
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={styles.bookmarksTab}
//               onPress={() => {
//                 triggerHaptic('impactLight');
//                 setActiveBookmarksTab('history');
//               }}>
//               <MaterialIcons
//                 name="history"
//                 size={22}
//                 color={
//                   activeBookmarksTab === 'history'
//                     ? theme.colors.primary
//                     : theme.colors.foreground3
//                 }
//               />
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

/////////////////////

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
//   Share,
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
//   const [showBookmarksModal, setShowBookmarksModal] = useState(false);

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

//   const handleShare = async () => {
//     if (!currentTab || !currentTab.url) return;
//     triggerHaptic('impactLight');
//     try {
//       await Share.share({
//         url: currentTab.url,
//         title: currentTab.title || getDomain(currentTab.url),
//         message: `${currentTab.title || getDomain(currentTab.url)}\n${currentTab.url}`,
//       });
//       setShowSaveMenu(false);
//     } catch (error) {
//       console.error('Error sharing:', error);
//     }
//   };

//   const handleOpenBookmarks = () => {
//     triggerHaptic('impactLight');
//     setShowSaveMenu(false);
//     setShowBookmarksModal(true);
//   };

//   const handleBookmarkNavigation = (url: string, title: string) => {
//     triggerHaptic('impactLight');
//     if (currentTab) {
//       updateTab(currentTab.id, url, title);
//     } else {
//       addTab(url, title);
//     }
//     setShowBookmarksModal(false);
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
//     // Bookmarks Modal Styles
//     bookmarksModalContainer: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       marginTop: insets.top,
//     },
//     bookmarksModalHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: 16,
//       paddingTop: 16,
//       paddingBottom: 8,
//     },
//     bookmarksCloseButton: {
//       padding: 8,
//     },
//     bookmarksMenuButton: {
//       padding: 8,
//     },
//     bookmarksSearchContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 10,
//       marginHorizontal: 16,
//       marginBottom: 16,
//       paddingHorizontal: 12,
//       height: 40,
//     },
//     bookmarksSearchIcon: {
//       marginRight: 8,
//     },
//     bookmarksSearchInput: {
//       flex: 1,
//       fontSize: 15,
//       color: theme.colors.foreground,
//       padding: 0,
//     },
//     bookmarksSearchMic: {
//       marginLeft: 8,
//     },
//     bookmarksModalContent: {
//       flex: 1,
//     },
//     // Recently Saved Section
//     recentlySavedSection: {
//       marginBottom: 24,
//     },
//     sectionHeaderText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       paddingHorizontal: 16,
//       marginBottom: 12,
//     },
//     recentlySavedScroll: {
//       paddingLeft: 16,
//     },
//     recentlySavedCard: {
//       width: 160,
//       marginRight: 12,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//     },
//     recentlySavedPreview: {
//       width: '100%',
//       height: 100,
//       backgroundColor: theme.colors.background,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     recentlySavedTitle: {
//       fontSize: 13,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     recentlySavedUrl: {
//       fontSize: 11,
//       color: theme.colors.foreground3,
//       marginBottom: 6,
//     },
//     recentlySavedBadge: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       alignSelf: 'flex-start',
//       paddingHorizontal: 6,
//       paddingVertical: 2,
//       borderRadius: 4,
//     },
//     recentlySavedBadgeText: {
//       fontSize: 9,
//       color: theme.colors.foreground3,
//       marginLeft: 2,
//     },
//     // Folders Section
//     foldersSection: {
//       marginBottom: 24,
//     },
//     folderItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     folderIcon: {
//       width: 32,
//       height: 32,
//       borderRadius: 8,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 12,
//     },
//     folderName: {
//       flex: 1,
//       fontSize: 15,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     folderCount: {
//       fontSize: 14,
//       color: theme.colors.foreground3,
//       marginRight: 8,
//     },
//     // Bookmarks Section
//     bookmarksSection: {
//       marginBottom: 24,
//     },
//     bookmarkListItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 10,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     bookmarkListIcon: {
//       width: 24,
//       height: 24,
//       borderRadius: 6,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 12,
//     },
//     bookmarkListTitle: {
//       flex: 1,
//       fontSize: 14,
//       color: theme.colors.foreground,
//     },
//     // Empty State
//     bookmarksEmptyState: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingVertical: 60,
//     },
//     bookmarksEmptyText: {
//       fontSize: 16,
//       color: theme.colors.foreground3,
//       marginTop: 16,
//     },
//     // Tab Bar
//     bookmarksTabBar: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingBottom: insets.bottom + 12,
//       backgroundColor: theme.colors.surface,
//       borderTopWidth: 1,
//       borderTopColor: theme.colors.surfaceBorder,
//     },
//     bookmarksTab: {
//       padding: 8,
//     },
//     // Legacy styles (for compatibility)
//     bookmarkModalItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 14,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     bookmarkModalIcon: {
//       width: 36,
//       height: 36,
//       borderRadius: 8,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 12,
//     },
//     bookmarkModalInfo: {
//       flex: 1,
//       marginRight: 8,
//     },
//     bookmarkModalTitle: {
//       fontSize: 15,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     bookmarkModalUrl: {
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
//           // 👇 Inertia / momentum scrolling
//           decelerationRate="normal" // gives Safari-style glide
//           bounces={true} // iOS bounce effect
//           scrollEnabled={true} // ensure scroll isn’t locked
//           showsVerticalScrollIndicator={false}
//           showsHorizontalScrollIndicator={false}
//           overScrollMode="never" // keeps Android smooth too
//           androidLayerType="hardware" // helps performance
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

//             {/* Share Link */}
//             <TouchableOpacity
//               style={styles.saveMenuItem}
//               onPress={handleShare}>
//               <View style={styles.saveMenuItemIcon}>
//                 <MaterialIcons
//                   name="share"
//                   size={22}
//                   color="#3b82f6"
//                 />
//               </View>
//               <Text style={styles.saveMenuItemText}>Share Link</Text>
//               <MaterialIcons
//                 name="ios-share"
//                 size={20}
//                 color={theme.colors.foreground3}
//               />
//             </TouchableOpacity>

//             {/* View Bookmarks */}
//             <TouchableOpacity
//               style={styles.saveMenuItem}
//               onPress={handleOpenBookmarks}>
//               <View style={styles.saveMenuItemIcon}>
//                 <MaterialIcons
//                   name="bookmarks"
//                   size={22}
//                   color={theme.colors.primary}
//                 />
//               </View>
//               <Text style={styles.saveMenuItemText}>Bookmarks</Text>
//               <Text style={styles.collectionCount}>{bookmarks.length}</Text>
//             </TouchableOpacity>
//           </TouchableOpacity>
//         </TouchableOpacity>
//       </Modal>

//       {/* Bookmarks Modal */}
//       <Modal
//         visible={showBookmarksModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowBookmarksModal(false)}>
//         <View style={styles.bookmarksModalContainer}>
//           {/* Header */}
//           <View style={styles.bookmarksModalHeader}>
//             <TouchableOpacity
//               onPress={() => setShowBookmarksModal(false)}
//               style={styles.bookmarksCloseButton}>
//               <MaterialIcons
//                 name="close"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.bookmarksMenuButton}>
//               <MaterialIcons
//                 name="more-horiz"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </TouchableOpacity>
//           </View>

//           {/* Search Bar */}
//           <View style={styles.bookmarksSearchContainer}>
//             <MaterialIcons
//               name="search"
//               size={20}
//               color={theme.colors.foreground3}
//               style={styles.bookmarksSearchIcon}
//             />
//             <TextInput
//               style={styles.bookmarksSearchInput}
//               placeholder="Search Bookmarks"
//               placeholderTextColor={theme.colors.foreground3}
//             />
//             <MaterialIcons
//               name="mic"
//               size={20}
//               color={theme.colors.foreground3}
//               style={styles.bookmarksSearchMic}
//             />
//           </View>

//           <ScrollView style={styles.bookmarksModalContent}>
//             {/* Recently Saved */}
//             {bookmarks.length > 0 && (
//               <View style={styles.recentlySavedSection}>
//                 <Text style={styles.sectionHeaderText}>
//                   Recently Saved
//                   <MaterialIcons
//                     name="chevron-right"
//                     size={18}
//                     color={theme.colors.foreground3}
//                   />
//                 </Text>
//                 <ScrollView
//                   horizontal
//                   showsHorizontalScrollIndicator={false}
//                   style={styles.recentlySavedScroll}>
//                   {bookmarks.slice(0, 5).map(bookmark => (
//                     <TouchableOpacity
//                       key={bookmark.id}
//                       style={styles.recentlySavedCard}
//                       onPress={() =>
//                         handleBookmarkNavigation(bookmark.url, bookmark.title)
//                       }>
//                       <View style={styles.recentlySavedPreview}>
//                         <MaterialIcons
//                           name="language"
//                           size={32}
//                           color={theme.colors.foreground3}
//                         />
//                       </View>
//                       <Text
//                         style={styles.recentlySavedTitle}
//                         numberOfLines={2}>
//                         {bookmark.title}
//                       </Text>
//                       <Text style={styles.recentlySavedUrl} numberOfLines={1}>
//                         {bookmark.source}
//                       </Text>
//                       <View style={styles.recentlySavedBadge}>
//                         <MaterialIcons
//                           name="schedule"
//                           size={10}
//                           color={theme.colors.foreground3}
//                         />
//                         <Text style={styles.recentlySavedBadgeText}>
//                           Bookmarks
//                         </Text>
//                       </View>
//                     </TouchableOpacity>
//                   ))}
//                 </ScrollView>
//               </View>
//             )}

//             {/* Collections Folders */}
//             {collections.length > 0 && (
//               <View style={styles.foldersSection}>
//                 <Text style={styles.sectionHeaderText}>Collections</Text>
//                 {collections.map(collection => (
//                   <TouchableOpacity
//                     key={collection.id}
//                     style={styles.folderItem}>
//                     <View
//                       style={[
//                         styles.folderIcon,
//                         {backgroundColor: collection.color + '33'},
//                       ]}>
//                       <MaterialIcons
//                         name="folder"
//                         size={20}
//                         color={collection.color}
//                       />
//                     </View>
//                     <Text style={styles.folderName}>{collection.name}</Text>
//                     <Text style={styles.folderCount}>
//                       {collection.items.length}
//                     </Text>
//                     <MaterialIcons
//                       name="chevron-right"
//                       size={20}
//                       color={theme.colors.foreground3}
//                     />
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}

//             {/* All Bookmarks */}
//             {bookmarks.length > 0 && (
//               <View style={styles.bookmarksSection}>
//                 <Text style={styles.sectionHeaderText}>Bookmarks</Text>
//                 {bookmarks.map(bookmark => (
//                   <TouchableOpacity
//                     key={bookmark.id}
//                     style={styles.bookmarkListItem}
//                     onPress={() =>
//                       handleBookmarkNavigation(bookmark.url, bookmark.title)
//                     }>
//                     <View style={styles.bookmarkListIcon}>
//                       <MaterialIcons
//                         name="language"
//                         size={16}
//                         color={theme.colors.foreground3}
//                       />
//                     </View>
//                     <Text style={styles.bookmarkListTitle} numberOfLines={1}>
//                       {bookmark.title}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}

//             {/* Empty State */}
//             {bookmarks.length === 0 && collections.length === 0 && (
//               <View style={styles.bookmarksEmptyState}>
//                 <MaterialIcons
//                   name="bookmark-border"
//                   size={48}
//                   color={theme.colors.foreground3}
//                 />
//                 <Text style={styles.bookmarksEmptyText}>No bookmarks yet</Text>
//               </View>
//             )}
//           </ScrollView>

//           {/* Bottom Tab Bar */}
//           <View style={styles.bookmarksTabBar}>
//             <TouchableOpacity style={styles.bookmarksTab}>
//               <MaterialIcons
//                 name="bookmark"
//                 size={22}
//                 color={theme.colors.primary}
//               />
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.bookmarksTab}>
//               <MaterialIcons
//                 name="history"
//                 size={22}
//                 color={theme.colors.foreground3}
//               />
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

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
