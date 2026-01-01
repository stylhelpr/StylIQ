import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../context/ThemeContext';
import {useShoppingStore} from '../../../../store/shoppingStore';
import {shoppingAnalytics} from '../../../../store/shoppingAnalytics';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {navigate: (screen: string) => void};

export default function GoldDataViewer({navigate}: Props) {
  const {theme} = useAppTheme();
  const store = useShoppingStore();
  const [selectedTab, setSelectedTab] = useState<
    'summary' | 'bookmarks' | 'interactions' | 'cart' | 'raw'
  >('summary');
  const [logOutput, setLogOutput] = useState<string>('');

  const insights = shoppingAnalytics.getGoldInsights();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
      marginTop: 60,
    },
    title: {
      fontSize: 20,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
      paddingHorizontal: 16,
    },
    tab: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground3,
    },
    activeTabText: {
      color: theme.colors.primary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginBottom: 8,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 13,
      color: theme.colors.foreground3,
    },
    statValue: {
      fontSize: 13,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.primary,
    },
    bookmarkItem: {
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    bookmarkTitle: {
      fontSize: 13,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    bookmarkMeta: {
      fontSize: 12,
      color: theme.colors.foreground3,
      marginBottom: 2,
    },
    interactionBadge: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    badge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginRight: 4,
    },
    badgeText: {
      fontSize: 11,
      color: '#fff',
      fontWeight: tokens.fontWeight.semiBold,
    },
    rawText: {
      fontSize: 11,
      fontFamily: 'Menlo',
      color: theme.colors.foreground,
      padding: 8,
      backgroundColor: theme.colors.background,
      borderRadius: 4,
      marginBottom: 12,
    },
    clearButton: {
      backgroundColor: '#ff6b6b',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      marginTop: 12,
    },
    clearButtonText: {
      color: '#fff',
      fontWeight: tokens.fontWeight.semiBold,
      fontSize: 12,
      textAlign: 'center',
    },
  });

  const renderSummary = () => (
    <ScrollView>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Session Stats</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Sessions</Text>
          <Text style={styles.statValue}>{insights.totalSessions}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Current Session ID</Text>
          <Text style={styles.statValue}>
            {store.currentSessionId ? '✅ Active' : '❌ None'}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Avg Dwell Time</Text>
          <Text style={styles.statValue}>{insights.avgDwellTime}s</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Avg Scroll Depth</Text>
          <Text style={styles.statValue}>
            {Math.round(
              store.history.reduce((sum, h) => sum + (h.scrollDepth || 0), 0) /
                store.history.filter(h => h.scrollDepth !== undefined).length ||
                0,
            )}
            %
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Pages with Dwell Time</Text>
          <Text style={styles.statValue}>
            {store.history.filter(h => h.dwellTime).length}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 Bookmarks</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Bookmarks</Text>
          <Text style={styles.statValue}>{store.bookmarks.length}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>With Category</Text>
          <Text style={styles.statValue}>
            {store.bookmarks.filter(b => b.category).length}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>With Brand</Text>
          <Text style={styles.statValue}>
            {store.bookmarks.filter(b => b.brand).length}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>With Price</Text>
          <Text style={styles.statValue}>
            {store.bookmarks.filter(b => b.price).length}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>With Emotion</Text>
          <Text style={styles.statValue}>{insights.bookmarksWithEmotion}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>With Price History</Text>
          <Text style={styles.statValue}>
            {insights.bookmarksWithPriceHistory}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Top Categories</Text>
        {insights.topCategories.length > 0 ? (
          insights.topCategories.map(([cat, count], idx) => (
            <View key={idx} style={styles.statRow}>
              <Text style={styles.statLabel}>{cat}</Text>
              <Text style={styles.statValue}>{count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.statLabel}>No categories yet</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏢 Top Brands</Text>
        {(() => {
          const brandCounts = store.bookmarks
            .filter(b => b.brand)
            .reduce(
              (acc, b) => {
                const brand = b.brand!;
                acc[brand] = (acc[brand] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            );
          const topBrands = Object.entries(brandCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          return topBrands.length > 0 ? (
            topBrands.map(([brand, count], idx) => (
              <View key={idx} style={styles.statRow}>
                <Text style={styles.statLabel}>{brand}</Text>
                <Text style={styles.statValue}>{count}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.statLabel}>No brands detected yet</Text>
          );
        })()}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📏 Size Preferences</Text>
        {(() => {
          const allSizes = store.bookmarks.flatMap(b => b.sizesViewed || []);
          const sizeCounts = allSizes.reduce(
            (acc, size) => {
              acc[size] = (acc[size] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );
          const topSizes = Object.entries(sizeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          return (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Bookmarks with Sizes</Text>
                <Text style={styles.statValue}>
                  {store.bookmarks.filter(b => b.sizesViewed?.length).length}
                </Text>
              </View>
              {topSizes.length > 0 ? (
                topSizes.map(([size, count], idx) => (
                  <View key={idx} style={styles.statRow}>
                    <Text style={styles.statLabel}>{size}</Text>
                    <Text style={styles.statValue}>{count}x</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.statLabel}>No sizes tracked yet</Text>
              )}
            </>
          );
        })()}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎨 Color Preferences</Text>
        {(() => {
          const allColors = store.bookmarks.flatMap(b => b.colorsViewed || []);
          const colorCounts = allColors.reduce(
            (acc, color) => {
              acc[color] = (acc[color] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );
          const topColors = Object.entries(colorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          return (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Bookmarks with Colors</Text>
                <Text style={styles.statValue}>
                  {store.bookmarks.filter(b => b.colorsViewed?.length).length}
                </Text>
              </View>
              {topColors.length > 0 ? (
                topColors.map(([color, count], idx) => (
                  <View key={idx} style={styles.statRow}>
                    <Text style={styles.statLabel}>{color}</Text>
                    <Text style={styles.statValue}>{count}x</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.statLabel}>No colors tracked yet</Text>
              )}
            </>
          );
        })()}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔗 Interactions</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Interactions</Text>
          <Text style={styles.statValue}>
            {store.productInteractions.length}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Views</Text>
          <Text style={styles.statValue}>
            {store.productInteractions.filter(i => i.type === 'view').length}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Bookmarks</Text>
          <Text style={styles.statValue}>
            {
              store.productInteractions.filter(i => i.type === 'bookmark')
                .length
            }
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Cart Adds</Text>
          <Text style={styles.statValue}>
            {
              store.productInteractions.filter(i => i.type === 'add_to_cart')
                .length
            }
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛒 Cart Behavior</Text>
        {(() => {
          const cartStats = store.getCartAbandonmentStats();
          const completedCarts =
            cartStats.totalCarts - cartStats.abandonedCarts;
          const completionRate =
            cartStats.totalCarts > 0
              ? Math.round(
                  ((cartStats.totalCarts - cartStats.abandonedCarts) /
                    cartStats.totalCarts) *
                    100,
                )
              : 0;
          return (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Carts</Text>
                <Text style={styles.statValue}>{cartStats.totalCarts}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Completed Purchases</Text>
                <Text style={styles.statValue}>{completedCarts}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Abandoned Carts</Text>
                <Text style={styles.statValue}>{cartStats.abandonedCarts}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Conversion Rate</Text>
                <Text style={styles.statValue}>{completionRate}%</Text>
              </View>
              {cartStats.avgTimeToCheckout > 0 && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Avg Time to Checkout</Text>
                  <Text style={styles.statValue}>
                    {Math.round(cartStats.avgTimeToCheckout / 1000)}s
                  </Text>
                </View>
              )}
            </>
          );
        })()}
      </View>
    </ScrollView>
  );

  const renderBookmarks = () => {
    const getHistoryForUrl = (url: string) => {
      return store.history.find(h => h.url === url);
    };

    return (
      <ScrollView>
        {store.bookmarks.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.statLabel}>No bookmarks yet</Text>
          </View>
        ) : (
          store.bookmarks.map((bookmark, idx) => {
            const historyEntry = getHistoryForUrl(bookmark.url);
            return (
              <View key={idx} style={[styles.card, styles.bookmarkItem]}>
                <Text style={styles.bookmarkTitle}>{bookmark.title}</Text>
                <Text style={styles.bookmarkMeta}>🔗 {bookmark.source}</Text>
                <Text style={styles.bookmarkMeta}>
                  📂 {bookmark.category || 'N/A'}
                </Text>
                {bookmark.brand && (
                  <Text style={styles.bookmarkMeta}>
                    🏢 Brand: {bookmark.brand}
                  </Text>
                )}
                <Text style={styles.bookmarkMeta}>
                  👀 Views: {bookmark.viewCount || 1}
                </Text>
                {historyEntry?.dwellTime !== undefined && (
                  <Text style={styles.bookmarkMeta}>
                    ⏱️ Dwell: {historyEntry.dwellTime}s
                  </Text>
                )}
                {historyEntry?.scrollDepth !== undefined && (
                  <Text style={styles.bookmarkMeta}>
                    📜 Scroll: {historyEntry.scrollDepth}%
                  </Text>
                )}
                {bookmark.priceHistory && bookmark.priceHistory.length > 0 && (
                  <Text style={styles.bookmarkMeta}>
                    💰 ${bookmark.priceHistory[0].price.toFixed(2)}{' '}
                    {bookmark.priceHistory.length > 1 &&
                      `(${bookmark.priceHistory.length} price points)`}
                  </Text>
                )}
                {bookmark.emotionAtSave && (
                  <Text style={styles.bookmarkMeta}>
                    😊 Emotion: {bookmark.emotionAtSave}
                  </Text>
                )}
                {bookmark.sizesViewed && bookmark.sizesViewed.length > 0 && (
                  <Text style={styles.bookmarkMeta}>
                    📏 Sizes: {bookmark.sizesViewed.join(', ')}
                  </Text>
                )}
                {bookmark.colorsViewed && bookmark.colorsViewed.length > 0 && (
                  <Text style={styles.bookmarkMeta}>
                    🎨 Colors: {bookmark.colorsViewed.join(', ')}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  const renderInteractions = () => (
    <ScrollView>
      {store.productInteractions.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.statLabel}>No interactions yet</Text>
        </View>
      ) : (
        store.productInteractions.map((interaction, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.bookmarkMeta}>
              {interaction.type === 'view' && '👁️ View'}
              {interaction.type === 'bookmark' && '⭐ Bookmark'}
              {interaction.type === 'add_to_cart' && '🛒 Add to Cart'}
            </Text>
            <Text style={styles.bookmarkMeta} numberOfLines={1}>
              {interaction.productUrl}
            </Text>
            <Text style={styles.bookmarkMeta}>
              {new Date(interaction.timestamp).toLocaleTimeString()}
            </Text>
            {interaction.sessionId && (
              <Text style={styles.bookmarkMeta}>
                Session: {interaction.sessionId.slice(0, 15)}...
              </Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderCart = () => (
    <ScrollView>
      {store.cartHistory.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.statLabel}>No cart activity yet</Text>
        </View>
      ) : (
        store.cartHistory.map((cartSession, idx) => {
          const completed = cartSession.events.some(
            e => e.type === 'checkout_complete',
          );
          const addEvent = cartSession.events.find(e => e.type === 'add');
          const checkoutEvent = cartSession.events.find(
            e => e.type === 'checkout_start' || e.type === 'checkout_complete',
          );
          const timeToCheckout = cartSession.timeToCheckout
            ? `${Math.round(cartSession.timeToCheckout / 1000)}s`
            : '—';
          const purchaseEvent = cartSession.events.find(
            e => e.type === 'checkout_complete',
          );
          const purchaseTotal = purchaseEvent?.cartValue || 0;
          const purchaseItems = purchaseEvent?.itemCount || 0;

          return (
            <View key={idx} style={[styles.card, styles.bookmarkItem]}>
              <Text style={styles.bookmarkTitle}>Cart #{idx + 1}</Text>
              <Text style={styles.bookmarkMeta}>
                🔗 {cartSession.cartUrl.split('/').pop() || 'cart'}
              </Text>
              <Text style={styles.bookmarkMeta}>
                {completed ? '✅ Completed' : '❌ Abandoned'}
              </Text>
              <Text style={styles.bookmarkMeta}>
                📅{' '}
                {new Date(addEvent?.timestamp || Date.now()).toLocaleString()}
              </Text>
              {cartSession.timeToCheckout !== undefined && (
                <Text style={styles.bookmarkMeta}>
                  ⏱️ Time to Checkout: {timeToCheckout}
                </Text>
              )}
              {completed && purchaseTotal > 0 && (
                <Text style={styles.bookmarkMeta}>
                  💰 Purchase Total: ${purchaseTotal.toFixed(2)}
                </Text>
              )}
              {completed && purchaseItems > 0 && (
                <Text style={styles.bookmarkMeta}>
                  📦 Items Purchased: {purchaseItems}
                </Text>
              )}
              <Text style={styles.bookmarkMeta}>
                📊 Events: {cartSession.events.length}
              </Text>
              {cartSession.events.map((event, eIdx) => (
                <Text
                  key={eIdx}
                  style={[styles.bookmarkMeta, {marginLeft: 8, fontSize: 11}]}>
                  {event.type === 'add' && '➕ Item Added'}
                  {event.type === 'remove' && '➖ Item Removed'}
                  {event.type === 'cart_view' && '👁️ Cart Viewed'}
                  {event.type === 'checkout_start' && '🛒 Checkout Started'}
                  {event.type === 'checkout_complete' && '✅ Purchase Complete'}
                  {event.itemCount ? ` (${event.itemCount} items)` : ''}
                  {event.cartValue ? ` - $${event.cartValue.toFixed(2)}` : ''}
                </Text>
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );

  const renderRaw = () => (
    <ScrollView>
      {logOutput ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 GOLD DATA LOG</Text>
          <Text style={styles.rawText}>{logOutput}</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bookmarks JSON</Text>
            <Text style={styles.rawText}>
              {JSON.stringify(store.bookmarks, null, 2)}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Interactions JSON</Text>
            <Text style={styles.rawText}>
              {JSON.stringify(store.productInteractions, null, 2)}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>History JSON</Text>
            <Text style={styles.rawText}>
              {JSON.stringify(store.history.slice(0, 5), null, 2)}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );

  const handleLogData = () => {
    const output = shoppingAnalytics.getGoldDataString();
    setLogOutput(output);
    setSelectedTab('raw');
  };

  const handleShare = async () => {
    const output = shoppingAnalytics.getGoldDataString();
    try {
      await Share.share({
        message: output,
        title: 'Gold Data Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share data');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* CLOSE BUTTON + TITLE */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text style={styles.title}>🏆 GOLD DATA VIEWER</Text>

          <AppleTouchFeedback
            hapticStyle="impactLight"
            onPress={() => navigate('ShoppingDashboard')}>
            <View
              style={{
                position: 'absolute',
                right: -90,
                bottom: -16,
                padding: 6,
                borderRadius: 20,
                backgroundColor: theme.colors.surface3,
              }}>
              <MaterialIcons
                name="close"
                size={22}
                color={theme.colors.foreground}
              />
            </View>
          </AppleTouchFeedback>
        </View>
      </View>

      <View style={styles.tabs}>
        {(['summary', 'bookmarks', 'interactions', 'cart', 'raw'] as const).map(
          tabName => (
            <TouchableOpacity
              key={tabName}
              style={[styles.tab, selectedTab === tabName && styles.activeTab]}
              onPress={() => setSelectedTab(tabName)}>
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tabName && styles.activeTabText,
                ]}>
                {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      <View style={styles.content}>
        {selectedTab === 'summary' && renderSummary()}
        {selectedTab === 'bookmarks' && renderBookmarks()}
        {selectedTab === 'interactions' && renderInteractions()}
        {selectedTab === 'cart' && renderCart()}
        {selectedTab === 'raw' && renderRaw()}
      </View>
    </SafeAreaView>
  );
}

////////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   SafeAreaView,
//   Alert,
//   Share,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {shoppingAnalytics} from '../../../../store/shoppingAnalytics';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// export default function GoldDataViewer() {
//   const {theme} = useAppTheme();
//   const store = useShoppingStore.getState();
//   const [selectedTab, setSelectedTab] = useState<
//     'summary' | 'bookmarks' | 'interactions' | 'cart' | 'raw'
//   >('summary');
//   const [logOutput, setLogOutput] = useState<string>('');

//   const insights = shoppingAnalytics.getGoldInsights();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       marginTop: 60,
//     },
//     title: {
//       fontSize: 20,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     tabs: {
//       flexDirection: 'row',
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingHorizontal: 16,
//     },
//     tab: {
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderBottomWidth: 2,
//       borderBottomColor: 'transparent',
//     },
//     activeTab: {
//       borderBottomColor: theme.colors.primary,
//     },
//     tabText: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground3,
//     },
//     activeTabText: {
//       color: theme.colors.primary,
//     },
//     content: {
//       flex: 1,
//       padding: 16,
//     },
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 8,
//       padding: 12,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     cardTitle: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     statRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 8,
//     },
//     statLabel: {
//       fontSize: 13,
//       color: theme.colors.foreground3,
//     },
//     statValue: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.primary,
//     },
//     bookmarkItem: {
//       marginBottom: 12,
//       paddingBottom: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     bookmarkTitle: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     bookmarkMeta: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginBottom: 2,
//     },
//     interactionBadge: {
//       display: 'flex',
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 4,
//     },
//     badge: {
//       backgroundColor: theme.colors.primary,
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 4,
//       marginRight: 4,
//     },
//     badgeText: {
//       fontSize: 11,
//       color: '#fff',
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     rawText: {
//       fontSize: 11,
//       fontFamily: 'Menlo',
//       color: theme.colors.foreground,
//       padding: 8,
//       backgroundColor: theme.colors.background,
//       borderRadius: 4,
//       marginBottom: 12,
//     },
//     clearButton: {
//       backgroundColor: '#ff6b6b',
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       borderRadius: 6,
//       marginTop: 12,
//     },
//     clearButtonText: {
//       color: '#fff',
//       fontWeight: tokens.fontWeight.semiBold,
//       fontSize: 12,
//       textAlign: 'center',
//     },
//   });

//   const renderSummary = () => (
//     <ScrollView>
//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>📊 Session Stats</Text>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Total Sessions</Text>
//           <Text style={styles.statValue}>{insights.totalSessions}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Current Session ID</Text>
//           <Text style={styles.statValue}>
//             {store.currentSessionId ? '✅ Active' : '❌ None'}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Avg Dwell Time</Text>
//           <Text style={styles.statValue}>{insights.avgDwellTime}s</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Avg Scroll Depth</Text>
//           <Text style={styles.statValue}>
//             {Math.round(
//               store.history.reduce((sum, h) => sum + (h.scrollDepth || 0), 0) /
//                 store.history.filter(h => h.scrollDepth !== undefined).length ||
//                 0,
//             )}
//             %
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Pages with Dwell Time</Text>
//           <Text style={styles.statValue}>
//             {store.history.filter(h => h.dwellTime).length}
//           </Text>
//         </View>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>📝 Bookmarks</Text>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Total Bookmarks</Text>
//           <Text style={styles.statValue}>{store.bookmarks.length}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Category</Text>
//           <Text style={styles.statValue}>
//             {store.bookmarks.filter(b => b.category).length}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Brand</Text>
//           <Text style={styles.statValue}>
//             {store.bookmarks.filter(b => b.brand).length}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Price</Text>
//           <Text style={styles.statValue}>
//             {store.bookmarks.filter(b => b.price).length}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Emotion</Text>
//           <Text style={styles.statValue}>{insights.bookmarksWithEmotion}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Price History</Text>
//           <Text style={styles.statValue}>
//             {insights.bookmarksWithPriceHistory}
//           </Text>
//         </View>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🎯 Top Categories</Text>
//         {insights.topCategories.length > 0 ? (
//           insights.topCategories.map(([cat, count], idx) => (
//             <View key={idx} style={styles.statRow}>
//               <Text style={styles.statLabel}>{cat}</Text>
//               <Text style={styles.statValue}>{count}</Text>
//             </View>
//           ))
//         ) : (
//           <Text style={styles.statLabel}>No categories yet</Text>
//         )}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🏢 Top Brands</Text>
//         {(() => {
//           const brandCounts = store.bookmarks
//             .filter(b => b.brand)
//             .reduce((acc, b) => {
//               const brand = b.brand!;
//               acc[brand] = (acc[brand] || 0) + 1;
//               return acc;
//             }, {} as Record<string, number>);
//           const topBrands = Object.entries(brandCounts)
//             .sort((a, b) => b[1] - a[1])
//             .slice(0, 5);
//           return topBrands.length > 0 ? (
//             topBrands.map(([brand, count], idx) => (
//               <View key={idx} style={styles.statRow}>
//                 <Text style={styles.statLabel}>{brand}</Text>
//                 <Text style={styles.statValue}>{count}</Text>
//               </View>
//             ))
//           ) : (
//             <Text style={styles.statLabel}>No brands detected yet</Text>
//           );
//         })()}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>📏 Size Preferences</Text>
//         {(() => {
//           const allSizes = store.bookmarks.flatMap(b => b.sizesViewed || []);
//           const sizeCounts = allSizes.reduce((acc, size) => {
//             acc[size] = (acc[size] || 0) + 1;
//             return acc;
//           }, {} as Record<string, number>);
//           const topSizes = Object.entries(sizeCounts)
//             .sort((a, b) => b[1] - a[1])
//             .slice(0, 5);
//           return (
//             <>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Bookmarks with Sizes</Text>
//                 <Text style={styles.statValue}>
//                   {store.bookmarks.filter(b => b.sizesViewed?.length).length}
//                 </Text>
//               </View>
//               {topSizes.length > 0 ? (
//                 topSizes.map(([size, count], idx) => (
//                   <View key={idx} style={styles.statRow}>
//                     <Text style={styles.statLabel}>{size}</Text>
//                     <Text style={styles.statValue}>{count}x</Text>
//                   </View>
//                 ))
//               ) : (
//                 <Text style={styles.statLabel}>No sizes tracked yet</Text>
//               )}
//             </>
//           );
//         })()}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🎨 Color Preferences</Text>
//         {(() => {
//           const allColors = store.bookmarks.flatMap(b => b.colorsViewed || []);
//           const colorCounts = allColors.reduce((acc, color) => {
//             acc[color] = (acc[color] || 0) + 1;
//             return acc;
//           }, {} as Record<string, number>);
//           const topColors = Object.entries(colorCounts)
//             .sort((a, b) => b[1] - a[1])
//             .slice(0, 5);
//           return (
//             <>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Bookmarks with Colors</Text>
//                 <Text style={styles.statValue}>
//                   {store.bookmarks.filter(b => b.colorsViewed?.length).length}
//                 </Text>
//               </View>
//               {topColors.length > 0 ? (
//                 topColors.map(([color, count], idx) => (
//                   <View key={idx} style={styles.statRow}>
//                     <Text style={styles.statLabel}>{color}</Text>
//                     <Text style={styles.statValue}>{count}x</Text>
//                   </View>
//                 ))
//               ) : (
//                 <Text style={styles.statLabel}>No colors tracked yet</Text>
//               )}
//             </>
//           );
//         })()}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🔗 Interactions</Text>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Total Interactions</Text>
//           <Text style={styles.statValue}>
//             {store.productInteractions.length}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Views</Text>
//           <Text style={styles.statValue}>
//             {store.productInteractions.filter(i => i.type === 'view').length}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Bookmarks</Text>
//           <Text style={styles.statValue}>
//             {
//               store.productInteractions.filter(i => i.type === 'bookmark')
//                 .length
//             }
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Cart Adds</Text>
//           <Text style={styles.statValue}>
//             {
//               store.productInteractions.filter(i => i.type === 'add_to_cart')
//                 .length
//             }
//           </Text>
//         </View>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🛒 Cart Behavior</Text>
//         {(() => {
//           const cartStats = store.getCartAbandonmentStats();
//           const completedCarts =
//             cartStats.totalCarts - cartStats.abandonedCarts;
//           const completionRate =
//             cartStats.totalCarts > 0
//               ? Math.round(
//                   ((cartStats.totalCarts - cartStats.abandonedCarts) /
//                     cartStats.totalCarts) *
//                     100,
//                 )
//               : 0;
//           return (
//             <>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Total Carts</Text>
//                 <Text style={styles.statValue}>{cartStats.totalCarts}</Text>
//               </View>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Completed Purchases</Text>
//                 <Text style={styles.statValue}>{completedCarts}</Text>
//               </View>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Abandoned Carts</Text>
//                 <Text style={styles.statValue}>{cartStats.abandonedCarts}</Text>
//               </View>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Conversion Rate</Text>
//                 <Text style={styles.statValue}>{completionRate}%</Text>
//               </View>
//               {cartStats.avgTimeToCheckout > 0 && (
//                 <View style={styles.statRow}>
//                   <Text style={styles.statLabel}>Avg Time to Checkout</Text>
//                   <Text style={styles.statValue}>
//                     {Math.round(cartStats.avgTimeToCheckout / 1000)}s
//                   </Text>
//                 </View>
//               )}
//             </>
//           );
//         })()}
//       </View>
//     </ScrollView>
//   );

//   const renderBookmarks = () => {
//     const getHistoryForUrl = (url: string) => {
//       return store.history.find(h => h.url === url);
//     };

//     return (
//       <ScrollView>
//         {store.bookmarks.length === 0 ? (
//           <View style={styles.card}>
//             <Text style={styles.statLabel}>No bookmarks yet</Text>
//           </View>
//         ) : (
//           store.bookmarks.map((bookmark, idx) => {
//             const historyEntry = getHistoryForUrl(bookmark.url);
//             return (
//               <View key={idx} style={[styles.card, styles.bookmarkItem]}>
//                 <Text style={styles.bookmarkTitle}>{bookmark.title}</Text>
//                 <Text style={styles.bookmarkMeta}>🔗 {bookmark.source}</Text>
//                 <Text style={styles.bookmarkMeta}>
//                   📂 {bookmark.category || 'N/A'}
//                 </Text>
//                 {bookmark.brand && (
//                   <Text style={styles.bookmarkMeta}>
//                     🏢 Brand: {bookmark.brand}
//                   </Text>
//                 )}
//                 <Text style={styles.bookmarkMeta}>
//                   👀 Views: {bookmark.viewCount || 1}
//                 </Text>
//                 {historyEntry?.dwellTime !== undefined && (
//                   <Text style={styles.bookmarkMeta}>
//                     ⏱️ Dwell: {historyEntry.dwellTime}s
//                   </Text>
//                 )}
//                 {historyEntry?.scrollDepth !== undefined && (
//                   <Text style={styles.bookmarkMeta}>
//                     📜 Scroll: {historyEntry.scrollDepth}%
//                   </Text>
//                 )}
//                 {bookmark.priceHistory && bookmark.priceHistory.length > 0 && (
//                   <Text style={styles.bookmarkMeta}>
//                     💰 ${bookmark.priceHistory[0].price.toFixed(2)}{' '}
//                     {bookmark.priceHistory.length > 1 &&
//                       `(${bookmark.priceHistory.length} price points)`}
//                   </Text>
//                 )}
//                 {bookmark.emotionAtSave && (
//                   <Text style={styles.bookmarkMeta}>
//                     😊 Emotion: {bookmark.emotionAtSave}
//                   </Text>
//                 )}
//                 {bookmark.sizesViewed && bookmark.sizesViewed.length > 0 && (
//                   <Text style={styles.bookmarkMeta}>
//                     📏 Sizes: {bookmark.sizesViewed.join(', ')}
//                   </Text>
//                 )}
//                 {bookmark.colorsViewed && bookmark.colorsViewed.length > 0 && (
//                   <Text style={styles.bookmarkMeta}>
//                     🎨 Colors: {bookmark.colorsViewed.join(', ')}
//                   </Text>
//                 )}
//               </View>
//             );
//           })
//         )}
//       </ScrollView>
//     );
//   };

//   const renderInteractions = () => (
//     <ScrollView>
//       {store.productInteractions.length === 0 ? (
//         <View style={styles.card}>
//           <Text style={styles.statLabel}>No interactions yet</Text>
//         </View>
//       ) : (
//         store.productInteractions.map((interaction, idx) => (
//           <View key={idx} style={styles.card}>
//             <Text style={styles.bookmarkMeta}>
//               {interaction.type === 'view' && '👁️ View'}
//               {interaction.type === 'bookmark' && '⭐ Bookmark'}
//               {interaction.type === 'add_to_cart' && '🛒 Add to Cart'}
//             </Text>
//             <Text style={styles.bookmarkMeta} numberOfLines={1}>
//               {interaction.productUrl}
//             </Text>
//             <Text style={styles.bookmarkMeta}>
//               {new Date(interaction.timestamp).toLocaleTimeString()}
//             </Text>
//             {interaction.sessionId && (
//               <Text style={styles.bookmarkMeta}>
//                 Session: {interaction.sessionId.slice(0, 15)}...
//               </Text>
//             )}
//           </View>
//         ))
//       )}
//     </ScrollView>
//   );

//   const renderCart = () => (
//     <ScrollView>
//       {store.cartHistory.length === 0 ? (
//         <View style={styles.card}>
//           <Text style={styles.statLabel}>No cart activity yet</Text>
//         </View>
//       ) : (
//         store.cartHistory.map((cartSession, idx) => {
//           const completed = cartSession.events.some(
//             e => e.type === 'checkout_complete',
//           );
//           const addEvent = cartSession.events.find(e => e.type === 'add');
//           const checkoutEvent = cartSession.events.find(
//             e => e.type === 'checkout_start' || e.type === 'checkout_complete',
//           );
//           const timeToCheckout = cartSession.timeToCheckout
//             ? `${Math.round(cartSession.timeToCheckout / 1000)}s`
//             : '—';
//           const purchaseEvent = cartSession.events.find(
//             e => e.type === 'checkout_complete',
//           );
//           const purchaseTotal = purchaseEvent?.cartValue || 0;
//           const purchaseItems = purchaseEvent?.itemCount || 0;

//           return (
//             <View key={idx} style={[styles.card, styles.bookmarkItem]}>
//               <Text style={styles.bookmarkTitle}>Cart #{idx + 1}</Text>
//               <Text style={styles.bookmarkMeta}>
//                 🔗 {cartSession.cartUrl.split('/').pop() || 'cart'}
//               </Text>
//               <Text style={styles.bookmarkMeta}>
//                 {completed ? '✅ Completed' : '❌ Abandoned'}
//               </Text>
//               <Text style={styles.bookmarkMeta}>
//                 📅{' '}
//                 {new Date(addEvent?.timestamp || Date.now()).toLocaleString()}
//               </Text>
//               {cartSession.timeToCheckout !== undefined && (
//                 <Text style={styles.bookmarkMeta}>
//                   ⏱️ Time to Checkout: {timeToCheckout}
//                 </Text>
//               )}
//               {completed && purchaseTotal > 0 && (
//                 <Text style={styles.bookmarkMeta}>
//                   💰 Purchase Total: ${purchaseTotal.toFixed(2)}
//                 </Text>
//               )}
//               {completed && purchaseItems > 0 && (
//                 <Text style={styles.bookmarkMeta}>
//                   📦 Items Purchased: {purchaseItems}
//                 </Text>
//               )}
//               <Text style={styles.bookmarkMeta}>
//                 📊 Events: {cartSession.events.length}
//               </Text>
//               {cartSession.events.map((event, eIdx) => (
//                 <Text
//                   key={eIdx}
//                   style={[styles.bookmarkMeta, {marginLeft: 8, fontSize: 11}]}>
//                   {event.type === 'add' && '➕ Item Added'}
//                   {event.type === 'remove' && '➖ Item Removed'}
//                   {event.type === 'cart_view' && '👁️ Cart Viewed'}
//                   {event.type === 'checkout_start' && '🛒 Checkout Started'}
//                   {event.type === 'checkout_complete' && '✅ Purchase Complete'}
//                   {event.itemCount ? ` (${event.itemCount} items)` : ''}
//                   {event.cartValue ? ` - $${event.cartValue.toFixed(2)}` : ''}
//                 </Text>
//               ))}
//             </View>
//           );
//         })
//       )}
//     </ScrollView>
//   );

//   const renderRaw = () => (
//     <ScrollView>
//       {logOutput ? (
//         <View style={styles.card}>
//           <Text style={styles.cardTitle}>📋 GOLD DATA LOG</Text>
//           <Text style={styles.rawText}>{logOutput}</Text>
//         </View>
//       ) : (
//         <>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>Bookmarks JSON</Text>
//             <Text style={styles.rawText}>
//               {JSON.stringify(store.bookmarks, null, 2)}
//             </Text>
//           </View>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>Interactions JSON</Text>
//             <Text style={styles.rawText}>
//               {JSON.stringify(store.productInteractions, null, 2)}
//             </Text>
//           </View>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>History JSON</Text>
//             <Text style={styles.rawText}>
//               {JSON.stringify(store.history.slice(0, 5), null, 2)}
//             </Text>
//           </View>
//         </>
//       )}
//     </ScrollView>
//   );

//   const handleLogData = () => {
//     const output = shoppingAnalytics.getGoldDataString();
//     setLogOutput(output);
//     setSelectedTab('raw');
//   };

//   const handleShare = async () => {
//     const output = shoppingAnalytics.getGoldDataString();
//     try {
//       await Share.share({
//         message: output,
//         title: 'Gold Data Export',
//       });
//     } catch (error) {
//       Alert.alert('Error', 'Failed to share data');
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'center',
//             alignItems: 'center',
//           }}>
//           <Text style={styles.title}>🏆 GOLD DATA VIEWER</Text>
//           <AppleTouchFeedback
//             hapticStyle="impactLight"
//             onPress={() => {
//               /* close viewer screen here */
//             }}>
//             <View
//               style={{
//                 position: 'absolute',
//                 right: -90,
//                 bottom: -16,
//                 padding: 6,
//                 borderRadius: 20,
//                 backgroundColor: theme.colors.surface3, // subtle translucent surface
//               }}>
//               <MaterialIcons
//                 name="close"
//                 size={22}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       <View style={styles.tabs}>
//         {(['summary', 'bookmarks', 'interactions', 'cart', 'raw'] as const).map(
//           tabName => (
//             <TouchableOpacity
//               key={tabName}
//               style={[styles.tab, selectedTab === tabName && styles.activeTab]}
//               onPress={() => setSelectedTab(tabName)}>
//               <Text
//                 style={[
//                   styles.tabText,
//                   selectedTab === tabName && styles.activeTabText,
//                 ]}>
//                 {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
//               </Text>
//             </TouchableOpacity>
//           ),
//         )}
//       </View>

//       <View style={styles.content}>
//         {selectedTab === 'summary' && renderSummary()}
//         {selectedTab === 'bookmarks' && renderBookmarks()}
//         {selectedTab === 'interactions' && renderInteractions()}
//         {selectedTab === 'cart' && renderCart()}
//         {selectedTab === 'raw' && renderRaw()}
//       </View>
//     </SafeAreaView>
//   );
// }

//////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   SafeAreaView,
//   Alert,
//   Share,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {shoppingAnalytics} from '../../../../store/shoppingAnalytics';
// import {tokens} from '../styles/tokens/tokens';

// export default function GoldDataViewer() {
//   const {theme} = useAppTheme();
//   const store = useShoppingStore.getState();
//   const [selectedTab, setSelectedTab] = useState<
//     'summary' | 'bookmarks' | 'interactions' | 'cart' | 'raw'
//   >('summary');
//   const [logOutput, setLogOutput] = useState<string>('');

//   const insights = shoppingAnalytics.getGoldInsights();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       marginTop: 60,
//     },
//     title: {
//       fontSize: 20,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     tabs: {
//       flexDirection: 'row',
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingHorizontal: 16,
//     },
//     tab: {
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderBottomWidth: 2,
//       borderBottomColor: 'transparent',
//     },
//     activeTab: {
//       borderBottomColor: theme.colors.primary,
//     },
//     tabText: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground3,
//     },
//     activeTabText: {
//       color: theme.colors.primary,
//     },
//     content: {
//       flex: 1,
//       padding: 16,
//     },
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 8,
//       padding: 12,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     cardTitle: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     statRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 8,
//     },
//     statLabel: {
//       fontSize: 13,
//       color: theme.colors.foreground3,
//     },
//     statValue: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.primary,
//     },
//     bookmarkItem: {
//       marginBottom: 12,
//       paddingBottom: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     bookmarkTitle: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     bookmarkMeta: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginBottom: 2,
//     },
//     interactionBadge: {
//       display: 'flex',
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 4,
//     },
//     badge: {
//       backgroundColor: theme.colors.primary,
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 4,
//       marginRight: 4,
//     },
//     badgeText: {
//       fontSize: 11,
//       color: '#fff',
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     rawText: {
//       fontSize: 11,
//       fontFamily: 'Menlo',
//       color: theme.colors.foreground,
//       padding: 8,
//       backgroundColor: theme.colors.background,
//       borderRadius: 4,
//       marginBottom: 12,
//     },
//     clearButton: {
//       backgroundColor: '#ff6b6b',
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       borderRadius: 6,
//       marginTop: 12,
//     },
//     clearButtonText: {
//       color: '#fff',
//       fontWeight: tokens.fontWeight.semiBold,
//       fontSize: 12,
//       textAlign: 'center',
//     },
//   });

//   const renderSummary = () => (
//     <ScrollView>
//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>📊 Session Stats</Text>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Total Sessions</Text>
//           <Text style={styles.statValue}>{insights.totalSessions}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Current Session ID</Text>
//           <Text style={styles.statValue}>
//             {store.currentSessionId ? '✅ Active' : '❌ None'}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Avg Dwell Time</Text>
//           <Text style={styles.statValue}>{insights.avgDwellTime}s</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Avg Scroll Depth</Text>
//           <Text style={styles.statValue}>
//             {Math.round(
//               store.history.reduce((sum, h) => sum + (h.scrollDepth || 0), 0) /
//                 store.history.filter(h => h.scrollDepth !== undefined).length || 0
//             )}%
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Pages with Dwell Time</Text>
//           <Text style={styles.statValue}>
//             {store.history.filter(h => h.dwellTime).length}
//           </Text>
//         </View>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>📝 Bookmarks</Text>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Total Bookmarks</Text>
//           <Text style={styles.statValue}>{store.bookmarks.length}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Category</Text>
//           <Text style={styles.statValue}>
//             {store.bookmarks.filter(b => b.category).length}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Brand</Text>
//           <Text style={styles.statValue}>
//             {store.bookmarks.filter(b => b.brand).length}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Price</Text>
//           <Text style={styles.statValue}>
//             {store.bookmarks.filter(b => b.price).length}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Emotion</Text>
//           <Text style={styles.statValue}>{insights.bookmarksWithEmotion}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Price History</Text>
//           <Text style={styles.statValue}>
//             {insights.bookmarksWithPriceHistory}
//           </Text>
//         </View>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🎯 Top Categories</Text>
//         {insights.topCategories.length > 0 ? (
//           insights.topCategories.map(([cat, count], idx) => (
//             <View key={idx} style={styles.statRow}>
//               <Text style={styles.statLabel}>{cat}</Text>
//               <Text style={styles.statValue}>{count}</Text>
//             </View>
//           ))
//         ) : (
//           <Text style={styles.statLabel}>No categories yet</Text>
//         )}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🏢 Top Brands</Text>
//         {(() => {
//           const brandCounts = store.bookmarks
//             .filter(b => b.brand)
//             .reduce((acc, b) => {
//               const brand = b.brand!;
//               acc[brand] = (acc[brand] || 0) + 1;
//               return acc;
//             }, {} as Record<string, number>);
//           const topBrands = Object.entries(brandCounts)
//             .sort((a, b) => b[1] - a[1])
//             .slice(0, 5);
//           return topBrands.length > 0 ? (
//             topBrands.map(([brand, count], idx) => (
//               <View key={idx} style={styles.statRow}>
//                 <Text style={styles.statLabel}>{brand}</Text>
//                 <Text style={styles.statValue}>{count}</Text>
//               </View>
//             ))
//           ) : (
//             <Text style={styles.statLabel}>No brands detected yet</Text>
//           );
//         })()}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>📏 Size Preferences</Text>
//         {(() => {
//           const allSizes = store.bookmarks
//             .flatMap(b => b.sizesViewed || []);
//           const sizeCounts = allSizes.reduce((acc, size) => {
//             acc[size] = (acc[size] || 0) + 1;
//             return acc;
//           }, {} as Record<string, number>);
//           const topSizes = Object.entries(sizeCounts)
//             .sort((a, b) => b[1] - a[1])
//             .slice(0, 5);
//           return (
//             <>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Bookmarks with Sizes</Text>
//                 <Text style={styles.statValue}>
//                   {store.bookmarks.filter(b => b.sizesViewed?.length).length}
//                 </Text>
//               </View>
//               {topSizes.length > 0 ? (
//                 topSizes.map(([size, count], idx) => (
//                   <View key={idx} style={styles.statRow}>
//                     <Text style={styles.statLabel}>{size}</Text>
//                     <Text style={styles.statValue}>{count}x</Text>
//                   </View>
//                 ))
//               ) : (
//                 <Text style={styles.statLabel}>No sizes tracked yet</Text>
//               )}
//             </>
//           );
//         })()}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🎨 Color Preferences</Text>
//         {(() => {
//           const allColors = store.bookmarks
//             .flatMap(b => b.colorsViewed || []);
//           const colorCounts = allColors.reduce((acc, color) => {
//             acc[color] = (acc[color] || 0) + 1;
//             return acc;
//           }, {} as Record<string, number>);
//           const topColors = Object.entries(colorCounts)
//             .sort((a, b) => b[1] - a[1])
//             .slice(0, 5);
//           return (
//             <>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Bookmarks with Colors</Text>
//                 <Text style={styles.statValue}>
//                   {store.bookmarks.filter(b => b.colorsViewed?.length).length}
//                 </Text>
//               </View>
//               {topColors.length > 0 ? (
//                 topColors.map(([color, count], idx) => (
//                   <View key={idx} style={styles.statRow}>
//                     <Text style={styles.statLabel}>{color}</Text>
//                     <Text style={styles.statValue}>{count}x</Text>
//                   </View>
//                 ))
//               ) : (
//                 <Text style={styles.statLabel}>No colors tracked yet</Text>
//               )}
//             </>
//           );
//         })()}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🔗 Interactions</Text>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Total Interactions</Text>
//           <Text style={styles.statValue}>
//             {store.productInteractions.length}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Views</Text>
//           <Text style={styles.statValue}>
//             {store.productInteractions.filter(i => i.type === 'view').length}
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Bookmarks</Text>
//           <Text style={styles.statValue}>
//             {
//               store.productInteractions.filter(i => i.type === 'bookmark')
//                 .length
//             }
//           </Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Cart Adds</Text>
//           <Text style={styles.statValue}>
//             {
//               store.productInteractions.filter(i => i.type === 'add_to_cart')
//                 .length
//             }
//           </Text>
//         </View>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🛒 Cart Behavior</Text>
//         {(() => {
//           const cartStats = store.getCartAbandonmentStats();
//           const completedCarts = cartStats.totalCarts - cartStats.abandonedCarts;
//           const completionRate = cartStats.totalCarts > 0
//             ? Math.round(((cartStats.totalCarts - cartStats.abandonedCarts) / cartStats.totalCarts) * 100)
//             : 0;
//           return (
//             <>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Total Carts</Text>
//                 <Text style={styles.statValue}>{cartStats.totalCarts}</Text>
//               </View>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Completed Purchases</Text>
//                 <Text style={styles.statValue}>{completedCarts}</Text>
//               </View>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Abandoned Carts</Text>
//                 <Text style={styles.statValue}>{cartStats.abandonedCarts}</Text>
//               </View>
//               <View style={styles.statRow}>
//                 <Text style={styles.statLabel}>Conversion Rate</Text>
//                 <Text style={styles.statValue}>{completionRate}%</Text>
//               </View>
//               {cartStats.avgTimeToCheckout > 0 && (
//                 <View style={styles.statRow}>
//                   <Text style={styles.statLabel}>Avg Time to Checkout</Text>
//                   <Text style={styles.statValue}>
//                     {Math.round(cartStats.avgTimeToCheckout / 1000)}s
//                   </Text>
//                 </View>
//               )}
//             </>
//           );
//         })()}
//       </View>
//     </ScrollView>
//   );

//   const renderBookmarks = () => {
//     const getHistoryForUrl = (url: string) => {
//       return store.history.find(h => h.url === url);
//     };

//     return (
//       <ScrollView>
//         {store.bookmarks.length === 0 ? (
//           <View style={styles.card}>
//             <Text style={styles.statLabel}>No bookmarks yet</Text>
//           </View>
//         ) : (
//           store.bookmarks.map((bookmark, idx) => {
//             const historyEntry = getHistoryForUrl(bookmark.url);
//             return (
//               <View key={idx} style={[styles.card, styles.bookmarkItem]}>
//                 <Text style={styles.bookmarkTitle}>{bookmark.title}</Text>
//                 <Text style={styles.bookmarkMeta}>🔗 {bookmark.source}</Text>
//                 <Text style={styles.bookmarkMeta}>
//                   📂 {bookmark.category || 'N/A'}
//                 </Text>
//                 {bookmark.brand && (
//                   <Text style={styles.bookmarkMeta}>
//                     🏢 Brand: {bookmark.brand}
//                   </Text>
//                 )}
//                 <Text style={styles.bookmarkMeta}>
//                   👀 Views: {bookmark.viewCount || 1}
//                 </Text>
//                 {historyEntry?.dwellTime !== undefined && (
//                   <Text style={styles.bookmarkMeta}>
//                     ⏱️ Dwell: {historyEntry.dwellTime}s
//                   </Text>
//                 )}
//                 {historyEntry?.scrollDepth !== undefined && (
//                   <Text style={styles.bookmarkMeta}>
//                     📜 Scroll: {historyEntry.scrollDepth}%
//                   </Text>
//                 )}
//                 {bookmark.priceHistory && bookmark.priceHistory.length > 0 && (
//                   <Text style={styles.bookmarkMeta}>
//                     💰 ${bookmark.priceHistory[0].price.toFixed(2)} {bookmark.priceHistory.length > 1 && `(${bookmark.priceHistory.length} price points)`}
//                   </Text>
//                 )}
//                 {bookmark.emotionAtSave && (
//                   <Text style={styles.bookmarkMeta}>
//                     😊 Emotion: {bookmark.emotionAtSave}
//                   </Text>
//                 )}
//                 {bookmark.sizesViewed && bookmark.sizesViewed.length > 0 && (
//                   <Text style={styles.bookmarkMeta}>
//                     📏 Sizes: {bookmark.sizesViewed.join(', ')}
//                   </Text>
//                 )}
//                 {bookmark.colorsViewed && bookmark.colorsViewed.length > 0 && (
//                   <Text style={styles.bookmarkMeta}>
//                     🎨 Colors: {bookmark.colorsViewed.join(', ')}
//                   </Text>
//                 )}
//               </View>
//             );
//           })
//         )}
//       </ScrollView>
//     );
//   };

//   const renderInteractions = () => (
//     <ScrollView>
//       {store.productInteractions.length === 0 ? (
//         <View style={styles.card}>
//           <Text style={styles.statLabel}>No interactions yet</Text>
//         </View>
//       ) : (
//         store.productInteractions.map((interaction, idx) => (
//           <View key={idx} style={styles.card}>
//             <Text style={styles.bookmarkMeta}>
//               {interaction.type === 'view' && '👁️ View'}
//               {interaction.type === 'bookmark' && '⭐ Bookmark'}
//               {interaction.type === 'add_to_cart' && '🛒 Add to Cart'}
//             </Text>
//             <Text style={styles.bookmarkMeta} numberOfLines={1}>
//               {interaction.productUrl}
//             </Text>
//             <Text style={styles.bookmarkMeta}>
//               {new Date(interaction.timestamp).toLocaleTimeString()}
//             </Text>
//             {interaction.sessionId && (
//               <Text style={styles.bookmarkMeta}>
//                 Session: {interaction.sessionId.slice(0, 15)}...
//               </Text>
//             )}
//           </View>
//         ))
//       )}
//     </ScrollView>
//   );

//   const renderCart = () => (
//     <ScrollView>
//       {store.cartHistory.length === 0 ? (
//         <View style={styles.card}>
//           <Text style={styles.statLabel}>No cart activity yet</Text>
//         </View>
//       ) : (
//         store.cartHistory.map((cartSession, idx) => {
//           const completed = cartSession.events.some(e => e.type === 'checkout_complete');
//           const addEvent = cartSession.events.find(e => e.type === 'add');
//           const checkoutEvent = cartSession.events.find(e => e.type === 'checkout_start' || e.type === 'checkout_complete');
//           const timeToCheckout = cartSession.timeToCheckout
//             ? `${Math.round(cartSession.timeToCheckout / 1000)}s`
//             : '—';
//           const purchaseEvent = cartSession.events.find(e => e.type === 'checkout_complete');
//           const purchaseTotal = purchaseEvent?.cartValue || 0;
//           const purchaseItems = purchaseEvent?.itemCount || 0;

//           return (
//             <View key={idx} style={[styles.card, styles.bookmarkItem]}>
//               <Text style={styles.bookmarkTitle}>Cart #{idx + 1}</Text>
//               <Text style={styles.bookmarkMeta}>
//                 🔗 {cartSession.cartUrl.split('/').pop() || 'cart'}
//               </Text>
//               <Text style={styles.bookmarkMeta}>
//                 {completed ? '✅ Completed' : '❌ Abandoned'}
//               </Text>
//               <Text style={styles.bookmarkMeta}>
//                 📅 {new Date(addEvent?.timestamp || Date.now()).toLocaleString()}
//               </Text>
//               {cartSession.timeToCheckout !== undefined && (
//                 <Text style={styles.bookmarkMeta}>
//                   ⏱️ Time to Checkout: {timeToCheckout}
//                 </Text>
//               )}
//               {completed && purchaseTotal > 0 && (
//                 <Text style={styles.bookmarkMeta}>
//                   💰 Purchase Total: ${purchaseTotal.toFixed(2)}
//                 </Text>
//               )}
//               {completed && purchaseItems > 0 && (
//                 <Text style={styles.bookmarkMeta}>
//                   📦 Items Purchased: {purchaseItems}
//                 </Text>
//               )}
//               <Text style={styles.bookmarkMeta}>
//                 📊 Events: {cartSession.events.length}
//               </Text>
//               {cartSession.events.map((event, eIdx) => (
//                 <Text key={eIdx} style={[styles.bookmarkMeta, {marginLeft: 8, fontSize: 11}]}>
//                   {event.type === 'add' && '➕ Item Added'}
//                   {event.type === 'remove' && '➖ Item Removed'}
//                   {event.type === 'cart_view' && '👁️ Cart Viewed'}
//                   {event.type === 'checkout_start' && '🛒 Checkout Started'}
//                   {event.type === 'checkout_complete' && '✅ Purchase Complete'}
//                   {event.itemCount ? ` (${event.itemCount} items)` : ''}
//                   {event.cartValue ? ` - $${event.cartValue.toFixed(2)}` : ''}
//                 </Text>
//               ))}
//             </View>
//           );
//         })
//       )}
//     </ScrollView>
//   );

//   const renderRaw = () => (
//     <ScrollView>
//       {logOutput ? (
//         <View style={styles.card}>
//           <Text style={styles.cardTitle}>📋 GOLD DATA LOG</Text>
//           <Text style={styles.rawText}>{logOutput}</Text>
//         </View>
//       ) : (
//         <>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>Bookmarks JSON</Text>
//             <Text style={styles.rawText}>
//               {JSON.stringify(store.bookmarks, null, 2)}
//             </Text>
//           </View>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>Interactions JSON</Text>
//             <Text style={styles.rawText}>
//               {JSON.stringify(store.productInteractions, null, 2)}
//             </Text>
//           </View>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>History JSON</Text>
//             <Text style={styles.rawText}>
//               {JSON.stringify(store.history.slice(0, 5), null, 2)}
//             </Text>
//           </View>
//         </>
//       )}
//     </ScrollView>
//   );

//   const handleLogData = () => {
//     const output = shoppingAnalytics.getGoldDataString();
//     setLogOutput(output);
//     setSelectedTab('raw');
//   };

//   const handleShare = async () => {
//     const output = shoppingAnalytics.getGoldDataString();
//     try {
//       await Share.share({
//         message: output,
//         title: 'Gold Data Export',
//       });
//     } catch (error) {
//       Alert.alert('Error', 'Failed to share data');
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//           }}>
//           <Text style={styles.title}>🏆 GOLD DATA VIEWER</Text>
//           <TouchableOpacity
//             onPress={handleShare}
//             style={{
//               backgroundColor: '#10b981',
//               paddingHorizontal: 12,
//               paddingVertical: 8,
//               borderRadius: 6,
//             }}>
//             <Text
//               style={{
//                 color: '#fff',
//                 fontSize: 12,
//                 fontWeight: tokens.fontWeight.semiBold,
//               }}>
//               SHARE
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.tabs}>
//         {(['summary', 'bookmarks', 'interactions', 'cart', 'raw'] as const).map(
//           tabName => (
//             <TouchableOpacity
//               key={tabName}
//               style={[styles.tab, selectedTab === tabName && styles.activeTab]}
//               onPress={() => setSelectedTab(tabName)}>
//               <Text
//                 style={[
//                   styles.tabText,
//                   selectedTab === tabName && styles.activeTabText,
//                 ]}>
//                 {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
//               </Text>
//             </TouchableOpacity>
//           ),
//         )}
//       </View>

//       <View style={styles.content}>
//         {selectedTab === 'summary' && renderSummary()}
//         {selectedTab === 'bookmarks' && renderBookmarks()}
//         {selectedTab === 'interactions' && renderInteractions()}
//         {selectedTab === 'cart' && renderCart()}
//         {selectedTab === 'raw' && renderRaw()}
//       </View>
//     </SafeAreaView>
//   );
// }

///////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   SafeAreaView,
//   Alert,
//   Share,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {shoppingAnalytics} from '../../../../store/shoppingAnalytics';
// import {tokens} from '../styles/tokens/tokens';

// export default function GoldDataViewer() {
//   const {theme} = useAppTheme();
//   const store = useShoppingStore.getState();
//   const [selectedTab, setSelectedTab] = useState<'summary' | 'bookmarks' | 'interactions' | 'raw'>('summary');
//   const [logOutput, setLogOutput] = useState<string>('');

//   const insights = shoppingAnalytics.getGoldInsights();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     title: {
//       fontSize: 20,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     tabs: {
//       flexDirection: 'row',
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//       paddingHorizontal: 16,
//     },
//     tab: {
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       borderBottomWidth: 2,
//       borderBottomColor: 'transparent',
//     },
//     activeTab: {
//       borderBottomColor: theme.colors.primary,
//     },
//     tabText: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground3,
//     },
//     activeTabText: {
//       color: theme.colors.primary,
//     },
//     content: {
//       flex: 1,
//       padding: 16,
//     },
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 8,
//       padding: 12,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     cardTitle: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     statRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginBottom: 8,
//     },
//     statLabel: {
//       fontSize: 13,
//       color: theme.colors.foreground3,
//     },
//     statValue: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.primary,
//     },
//     bookmarkItem: {
//       marginBottom: 12,
//       paddingBottom: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.surfaceBorder,
//     },
//     bookmarkTitle: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     bookmarkMeta: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginBottom: 2,
//     },
//     interactionBadge: {
//       display: 'flex',
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 4,
//     },
//     badge: {
//       backgroundColor: theme.colors.primary,
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 4,
//       marginRight: 4,
//     },
//     badgeText: {
//       fontSize: 11,
//       color: '#fff',
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     rawText: {
//       fontSize: 11,
//       fontFamily: 'Menlo',
//       color: theme.colors.foreground,
//       padding: 8,
//       backgroundColor: theme.colors.background,
//       borderRadius: 4,
//       marginBottom: 12,
//     },
//     clearButton: {
//       backgroundColor: '#ff6b6b',
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       borderRadius: 6,
//       marginTop: 12,
//     },
//     clearButtonText: {
//       color: '#fff',
//       fontWeight: tokens.fontWeight.semiBold,
//       fontSize: 12,
//       textAlign: 'center',
//     },
//   });

//   const renderSummary = () => (
//     <ScrollView>
//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>📊 Session Stats</Text>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Total Sessions</Text>
//           <Text style={styles.statValue}>{insights.totalSessions}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Current Session ID</Text>
//           <Text style={styles.statValue}>{store.currentSessionId ? '✅ Active' : '❌ None'}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Avg Dwell Time</Text>
//           <Text style={styles.statValue}>{insights.avgDwellTime}s</Text>
//         </View>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>📝 Bookmarks</Text>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Total Bookmarks</Text>
//           <Text style={styles.statValue}>{store.bookmarks.length}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Category</Text>
//           <Text style={styles.statValue}>{store.bookmarks.filter(b => b.category).length}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Emotion</Text>
//           <Text style={styles.statValue}>{insights.bookmarksWithEmotion}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>With Price History</Text>
//           <Text style={styles.statValue}>{insights.bookmarksWithPriceHistory}</Text>
//         </View>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🎯 Top Categories</Text>
//         {insights.topCategories.length > 0 ? (
//           insights.topCategories.map(([cat, count], idx) => (
//             <View key={idx} style={styles.statRow}>
//               <Text style={styles.statLabel}>{cat}</Text>
//               <Text style={styles.statValue}>{count}</Text>
//             </View>
//           ))
//         ) : (
//           <Text style={styles.statLabel}>No categories yet</Text>
//         )}
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>🔗 Interactions</Text>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Total Interactions</Text>
//           <Text style={styles.statValue}>{store.productInteractions.length}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Views</Text>
//           <Text style={styles.statValue}>{store.productInteractions.filter(i => i.type === 'view').length}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Bookmarks</Text>
//           <Text style={styles.statValue}>{store.productInteractions.filter(i => i.type === 'bookmark').length}</Text>
//         </View>
//         <View style={styles.statRow}>
//           <Text style={styles.statLabel}>Cart Adds</Text>
//           <Text style={styles.statValue}>{store.productInteractions.filter(i => i.type === 'add_to_cart').length}</Text>
//         </View>
//       </View>
//     </ScrollView>
//   );

//   const renderBookmarks = () => (
//     <ScrollView>
//       {store.bookmarks.length === 0 ? (
//         <View style={styles.card}>
//           <Text style={styles.statLabel}>No bookmarks yet</Text>
//         </View>
//       ) : (
//         store.bookmarks.map((bookmark, idx) => (
//           <View key={idx} style={[styles.card, styles.bookmarkItem]}>
//             <Text style={styles.bookmarkTitle}>{bookmark.title}</Text>
//             <Text style={styles.bookmarkMeta}>🔗 {bookmark.source}</Text>
//             <Text style={styles.bookmarkMeta}>📂 {bookmark.category || 'N/A'}</Text>
//             <Text style={styles.bookmarkMeta}>👀 Views: {bookmark.viewCount || 1}</Text>
//             {bookmark.emotionAtSave && (
//               <Text style={styles.bookmarkMeta}>😊 Emotion: {bookmark.emotionAtSave}</Text>
//             )}
//             {bookmark.sizesViewed && bookmark.sizesViewed.length > 0 && (
//               <Text style={styles.bookmarkMeta}>📏 Sizes: {bookmark.sizesViewed.join(', ')}</Text>
//             )}
//             {bookmark.colorsViewed && bookmark.colorsViewed.length > 0 && (
//               <Text style={styles.bookmarkMeta}>🎨 Colors: {bookmark.colorsViewed.join(', ')}</Text>
//             )}
//             {bookmark.priceHistory && bookmark.priceHistory.length > 0 && (
//               <Text style={styles.bookmarkMeta}>💰 ${bookmark.priceHistory[0].price}</Text>
//             )}
//           </View>
//         ))
//       )}
//     </ScrollView>
//   );

//   const renderInteractions = () => (
//     <ScrollView>
//       {store.productInteractions.length === 0 ? (
//         <View style={styles.card}>
//           <Text style={styles.statLabel}>No interactions yet</Text>
//         </View>
//       ) : (
//         store.productInteractions.map((interaction, idx) => (
//           <View key={idx} style={styles.card}>
//             <Text style={styles.bookmarkMeta}>
//               {interaction.type === 'view' && '👁️ View'}
//               {interaction.type === 'bookmark' && '⭐ Bookmark'}
//               {interaction.type === 'add_to_cart' && '🛒 Add to Cart'}
//             </Text>
//             <Text style={styles.bookmarkMeta} numberOfLines={1}>
//               {interaction.productUrl}
//             </Text>
//             <Text style={styles.bookmarkMeta}>
//               {new Date(interaction.timestamp).toLocaleTimeString()}
//             </Text>
//             {interaction.sessionId && (
//               <Text style={styles.bookmarkMeta}>Session: {interaction.sessionId.slice(0, 15)}...</Text>
//             )}
//           </View>
//         ))
//       )}
//     </ScrollView>
//   );

//   const renderRaw = () => (
//     <ScrollView>
//       {logOutput ? (
//         <View style={styles.card}>
//           <Text style={styles.cardTitle}>📋 GOLD DATA LOG</Text>
//           <Text style={styles.rawText}>{logOutput}</Text>
//         </View>
//       ) : (
//         <>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>Bookmarks JSON</Text>
//             <Text style={styles.rawText}>{JSON.stringify(store.bookmarks, null, 2)}</Text>
//           </View>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>Interactions JSON</Text>
//             <Text style={styles.rawText}>{JSON.stringify(store.productInteractions, null, 2)}</Text>
//           </View>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>History JSON</Text>
//             <Text style={styles.rawText}>{JSON.stringify(store.history.slice(0, 5), null, 2)}</Text>
//           </View>
//         </>
//       )}
//     </ScrollView>
//   );

//   const handleLogData = () => {
//     const output = shoppingAnalytics.getGoldDataString();
//     setLogOutput(output);
//     setSelectedTab('raw');
//   };

//   const handleShare = async () => {
//     const output = shoppingAnalytics.getGoldDataString();
//     try {
//       await Share.share({
//         message: output,
//         title: 'Gold Data Export',
//       });
//     } catch (error) {
//       Alert.alert('Error', 'Failed to share data');
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
//           <Text style={styles.title}>🏆 GOLD DATA VIEWER</Text>
//           <TouchableOpacity
//             onPress={handleShare}
//             style={{
//               backgroundColor: '#10b981',
//               paddingHorizontal: 12,
//               paddingVertical: 8,
//               borderRadius: 6,
//             }}>
//             <Text style={{color: '#fff', fontSize: 12, fontWeight: tokens.fontWeight.semiBold}}>
//               SHARE
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.tabs}>
//         {(['summary', 'bookmarks', 'interactions', 'raw'] as const).map(tabName => (
//           <TouchableOpacity
//             key={tabName}
//             style={[styles.tab, selectedTab === tabName && styles.activeTab]}
//             onPress={() => setSelectedTab(tabName)}>
//             <Text
//               style={[
//                 styles.tabText,
//                 selectedTab === tabName && styles.activeTabText,
//               ]}>
//               {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>

//       <View style={styles.content}>
//         {selectedTab === 'summary' && renderSummary()}
//         {selectedTab === 'bookmarks' && renderBookmarks()}
//         {selectedTab === 'interactions' && renderInteractions()}
//         {selectedTab === 'raw' && renderRaw()}
//       </View>
//     </SafeAreaView>
//   );
// }
