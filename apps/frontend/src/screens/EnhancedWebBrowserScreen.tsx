import React, {useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Share,
  Alert,
  FlatList,
} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import {useAppTheme} from '../context/ThemeContext';
import {useShoppingStore, ShoppingItem} from '../../../../store/shoppingStore';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

const {width: screenWidth} = Dimensions.get('window');

type Props = {
  route?: {params?: {url?: string}};
  navigate?: (screen: string, params?: any) => void;
};

const SHOPPING_SITES = [
  {name: 'Amazon', url: 'https://amazon.com', icon: 'shopping-bag'},
  {name: 'ASOS', url: 'https://asos.com', icon: 'shopping-bag'},
  {name: 'H&M', url: 'https://hm.com', icon: 'shopping-bag'},
  {name: 'Zara', url: 'https://zara.com', icon: 'shopping-bag'},
  {name: 'Shein', url: 'https://shein.com', icon: 'shopping-bag'},
  {name: 'SSENSE', url: 'https://ssense.com', icon: 'shopping-bag'},
  {name: 'Farfetch', url: 'https://farfetch.com', icon: 'shopping-bag'},
  {name: 'Google', url: 'https://google.com', icon: 'search'},
];

export default function EnhancedWebBrowserScreen({route, navigate}: Props) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);

  const {
    tabs,
    currentTabId,
    addTab,
    removeTab,
    switchTab,
    updateTab,
    addToHistory,
    addBookmark,
    isBookmarked,
    recentSearches,
    addSearch,
  } = useShoppingStore();

  const initialUrl = route?.params?.url || '';
  const [inputValue, setInputValue] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(!initialUrl);
  const [showTabsPanel, setShowTabsPanel] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [bookmarked, setBookmarked] = useState(isBookmarked(currentUrl));

  const currentTab = tabs.find(t => t.id === currentTabId);

  const normalizeUrl = useCallback((text: string): string => {
    let normalized = text.trim();
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }
    if (normalized.includes('.') && !normalized.includes(' ')) {
      return `https://${normalized}`;
    }
    return `https://google.com/search?q=${encodeURIComponent(normalized)}`;
  }, []);

  const handleUrlSubmit = useCallback(() => {
    const normalized = normalizeUrl(inputValue);
    setCurrentUrl(normalized);
    updateTab(currentTabId!, normalized, inputValue);
    addToHistory(normalized, inputValue, 'Browser');
    addSearch(inputValue);
    setShowSuggestions(false);
  }, [
    inputValue,
    normalizeUrl,
    currentTabId,
    updateTab,
    addToHistory,
    addSearch,
  ]);

  const handleQuickShop = useCallback(
    (shopUrl: string) => {
      setCurrentUrl(shopUrl);
      setInputValue(shopUrl);
      updateTab(currentTabId!, shopUrl, shopUrl);
      addToHistory(shopUrl, shopUrl, 'Quick Shop');
      setShowSuggestions(false);
    },
    [currentTabId, updateTab, addToHistory],
  );

  const handleNewTab = useCallback(() => {
    addTab('about:blank', 'New Tab');
  }, [addTab]);

  const handleAddBookmark = useCallback(() => {
    const item: ShoppingItem = {
      id: `item_${Date.now()}`,
      title: currentTab?.title || 'Saved Page',
      url: currentUrl,
      source: currentUrl.split('/')[2] || 'Web',
      addedAt: Date.now(),
    };
    addBookmark(item);
    setBookmarked(true);
    Alert.alert('✓ Added to Bookmarks', currentTab?.title);
  }, [currentTab, currentUrl, addBookmark]);

  const handleShare = useCallback(() => {
    Share.share({
      message: `Check out: ${currentTab?.title}\n${currentUrl}`,
      url: currentUrl,
      title: currentTab?.title || 'Shared from StylHelpr',
    });
  }, [currentTab, currentUrl]);

  const onNavStateChange = useCallback(
    (navState: any) => {
      setCanGoBack(!!navState.canGoBack);
      setCanGoForward(!!navState.canGoForward);
      setCurrentUrl(navState.url);
      setInputValue(navState.url);
      setBookmarked(isBookmarked(navState.url));
      updateTab(currentTabId!, navState.url, navState.title);
    },
    [currentTabId, updateTab, isBookmarked],
  );

  const handleBack = useCallback(() => {
    if (canGoBack && webRef.current) {
      webRef.current.goBack();
    } else if (navigate) {
      navigate('ShoppingDashboard');
    }
  }, [canGoBack, navigate]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    headerButton: {
      padding: 8,
    },
    urlBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      paddingHorizontal: 12,
      height: 36,
      marginBottom: 8,
    },
    urlInput: {
      flex: 1,
      color: theme.colors.foreground,
      fontSize: 14,
      padding: 0,
    },
    controlsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    controlButton: {
      padding: 8,
      opacity: 0.6,
    },
    controlButtonActive: {
      opacity: 1,
    },
    tabsContainer: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      maxWidth: 120,
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      color: theme.colors.foreground3,
      fontSize: 12,
      marginRight: 6,
      flex: 1,
    },
    activeTabText: {
      color: '#fff',
    },
    newTabButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    suggestionsContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    suggestionsTitle: {
      color: theme.colors.foreground2,
      fontSize: 13,
      fontWeight: '600',
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 12,
    },
    shoppingGrid: {
      paddingHorizontal: 12,
    },
    shoppingButton: {
      alignItems: 'center',
      justifyContent: 'center',
      margin: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      minWidth: (screenWidth - 48) / 2,
    },
    shoppingButtonText: {
      color: theme.colors.foreground,
      fontSize: 13,
      fontWeight: '500',
      marginTop: 8,
      textAlign: 'center',
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    moreMenu: {
      position: 'absolute',
      top: 50,
      right: 0,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      overflow: 'hidden',
      zIndex: 1000,
      minWidth: 200,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    menuIcon: {
      marginRight: 12,
    },
    menuText: {
      color: theme.colors.foreground,
      fontSize: 14,
      fontWeight: '500',
    },
    recentSearchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
    },
    recentSearchLabel: {
      color: theme.colors.foreground3,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
    },
    recentSearchItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    recentSearchText: {
      color: theme.colors.foreground,
      fontSize: 13,
    },
  });

  // Initialize first tab if none exist
  React.useEffect(() => {
    if (tabs.length === 0) {
      addTab(initialUrl || 'about:blank', 'New Tab');
    }
  }, []);

  return (
    <SafeAreaView style={[styles.container, {marginTop: 70}]}>
      {/* Header */}
      <View style={styles.header}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <MaterialIcons
              name="arrow-back-ios"
              size={20}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: '600',
              color: theme.colors.foreground,
              marginHorizontal: 8,
              maxWidth: screenWidth * 0.5,
            }}
            numberOfLines={1}>
            {currentTab?.title || 'Browser'}
          </Text>
          <TouchableOpacity style={styles.headerButton} onPress={handleNewTab}>
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={{position: 'relative'}}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowMore(!showMore)}>
              <MaterialIcons
                name="more-vert"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            {showMore && (
              <View style={styles.moreMenu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    handleAddBookmark();
                    setShowMore(false);
                  }}>
                  <MaterialIcons
                    name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={theme.colors.primary}
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuText}>
                    {bookmarked ? 'Bookmarked' : 'Save'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    handleShare();
                    setShowMore(false);
                  }}>
                  <MaterialIcons
                    name="share"
                    size={18}
                    color={theme.colors.primary}
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    navigate?.('ShoppingDashboard');
                    setShowMore(false);
                  }}>
                  <MaterialIcons
                    name="dashboard"
                    size={18}
                    color={theme.colors.primary}
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuText}>Dashboard</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* URL Bar */}
        <View style={styles.urlBar}>
          <MaterialIcons
            name="search"
            size={18}
            color={theme.colors.foreground3}
          />
          <TextInput
            style={styles.urlInput}
            placeholder="Search or enter URL"
            placeholderTextColor={theme.colors.foreground3}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleUrlSubmit}
            onFocus={() => setShowSuggestions(true)}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Controls */}
        <View style={styles.controlsBar}>
          <View style={{flexDirection: 'row'}}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                canGoBack && styles.controlButtonActive,
              ]}
              onPress={() => webRef.current?.goBack()}
              disabled={!canGoBack}>
              <MaterialIcons
                name="arrow-back"
                size={20}
                color={theme.colors.primary}
                style={{opacity: canGoBack ? 1 : 0.4}}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton,
                canGoForward && styles.controlButtonActive,
              ]}
              onPress={() => webRef.current?.goForward()}
              disabled={!canGoForward}>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={theme.colors.primary}
                style={{opacity: canGoForward ? 1 : 0.4}}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => webRef.current?.reload()}>
              <MaterialIcons
                name="refresh"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {isLoading && (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          )}
        </View>
      </View>

      {/* Tabs Bar */}
      {tabs.length > 0 && (
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{alignItems: 'center'}}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  tab.id === currentTabId && styles.activeTab,
                ]}
                onPress={() => switchTab(tab.id)}>
                <Text
                  style={[
                    styles.tabText,
                    tab.id === currentTabId && styles.activeTabText,
                  ]}
                  numberOfLines={1}>
                  {tab.title}
                </Text>
                {tabs.length > 1 && (
                  <TouchableOpacity
                    onPress={e => {
                      e.stopPropagation();
                      removeTab(tab.id);
                    }}>
                    <MaterialIcons
                      name="close"
                      size={14}
                      color={
                        tab.id === currentTabId
                          ? '#fff'
                          : theme.colors.foreground3
                      }
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.newTabButton} onPress={handleNewTab}>
            <MaterialIcons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* WebView or Suggestions */}
      {!currentUrl || showSuggestions ? (
        <ScrollView style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Popular Shopping Sites</Text>
          <View
            style={[
              styles.shoppingGrid,
              {flexDirection: 'row', flexWrap: 'wrap'},
            ]}>
            {SHOPPING_SITES.map(site => (
              <TouchableOpacity
                key={site.name}
                style={styles.shoppingButton}
                onPress={() => handleQuickShop(site.url)}>
                <MaterialIcons
                  name={site.icon}
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.shoppingButtonText}>{site.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSearchContainer}>
              <Text style={styles.recentSearchLabel}>Recent Searches</Text>
              {recentSearches.slice(0, 5).map((search, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.recentSearchItem}
                  onPress={() => {
                    setInputValue(search);
                    handleUrlSubmit();
                  }}>
                  <Text style={styles.recentSearchText}>{search}</Text>
                  <MaterialIcons
                    name="arrow-forward-ios"
                    size={12}
                    color={theme.colors.foreground3}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <WebView
          ref={webRef}
          source={{uri: currentUrl}}
          style={{flex: 1}}
          onNavigationStateChange={onNavStateChange}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          startInLoadingState
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          renderLoading={() => (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
        />
      )}
    </SafeAreaView>
  );
}
