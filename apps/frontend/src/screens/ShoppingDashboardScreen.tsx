import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {useShoppingStore} from '../../../../store/shoppingStore';
import {shoppingAnalytics} from '../../../../store/shoppingAnalytics';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useAuth0} from 'react-native-auth0';

const {width: screenWidth} = Dimensions.get('window');

type Props = {
  navigate?: (screen: any, params?: any) => void;
};

export default function ShoppingDashboardScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile} = useStyleProfile(userId);

  const {
    bookmarks,
    collections,
    history,
    recentSearches,
    tabs,
    addTab,
    cartHistory,
  } = useShoppingStore();
  const [refreshing, setRefreshing] = useState(false);

  // Track page view on mount
  useEffect(() => {
    // console.log('[Analytics] Shopping Dashboard screen mounted');
    shoppingAnalytics.recordPageVisitQueue(
      'https://styliq.com/shopping/dashboard',
      'Shopping Dashboard',
      0,
      0
    );
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Calculate budget status (use budget_max as the monthly spending limit)
  const budgetStatus = useMemo(() => {
    const monthlyBudget = styleProfile?.budget_max || 0;
    if (monthlyBudget === 0) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let spentThisMonth = 0;
    cartHistory.forEach(cart => {
      cart.events.forEach(event => {
        if (event.type === 'checkout_complete' && event.cartValue) {
          const date = new Date(event.timestamp);
          if (
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
          ) {
            spentThisMonth += event.cartValue;
          }
        }
      });
    });

    const remaining = monthlyBudget - spentThisMonth;
    const percentage = Math.min((spentThisMonth / monthlyBudget) * 100, 100);

    return {
      budget: monthlyBudget,
      spent: Math.round(spentThisMonth),
      remaining: Math.max(0, remaining),
      percentage,
    };
  }, [styleProfile?.budget_max, cartHistory]);

  const recentVisits = history.slice(0, 5);
  const topCollections = collections.slice(0, 3);

  // Helper to generate favicon URL for items without images
  const getImageUrl = (item: any): string => {
    if (item.imageUrl) return item.imageUrl;
    try {
      const domain = new URL(item.url).hostname;
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch {
      return '';
    }
  };

  // Populate trending items from bookmarks (most recently saved)
  const trendingItems = bookmarks.map(item => ({
    ...item,
    imageUrl: getImageUrl(item),
  }));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
    },
    headerIcons: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      // borderWidth: tokens.borderWidth.hairline,
      // borderColor: theme.colors.muted,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.foreground,
      marginTop: 4,
    },
    sectionContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    quickActionGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    quickActionButton: {
      flex: 1,
      width: '100%',
      borderRadius: 16,
      paddingVertical: 18,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 100,
      // borderWidth: 1,
      // borderColor: theme.colors.muted,
      backgroundColor: theme.colors.button1,
    },
    quickActionIcon: {
      marginBottom: 8,
    },
    quickActionLabel: {
      fontSize: 12,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      textAlign: 'center',
    },
    trendingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      marginRight: 12,
      width: screenWidth * 0.45,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      overflow: 'hidden',
    },
    trendingImage: {
      width: '100%',
      height: 140,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    trendingScreenshot: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    trendingPlaceholder: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    trendingFavicon: {
      width: 48,
      height: 48,
      borderRadius: 8,
    },
    trendingGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '50%',
    },
    trendingInfo: {
      padding: 12,
    },
    trendingTitle: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    trendingSource: {
      fontSize: 12,
      color: theme.colors.foreground,
    },
    trendingMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    brand: {
      fontSize: 12,
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.medium,
    },
    price: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.primary,
    },
    collectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      marginRight: 12,
      width: screenWidth * 0.6,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    collectionBadge: {
      width: '100%',
      height: 100,
      borderRadius: 8,
      marginBottom: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    collectionName: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    collectionCount: {
      fontSize: 12,
      color: theme.colors.foreground,
    },
    recentItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    recentText: {
      flex: 1,
    },
    recentTitle: {
      fontSize: 13,
      fontWeight: tokens.fontWeight.medium,
      color: theme.colors.foreground,
    },
    recentSource: {
      fontSize: 11,
      color: theme.colors.foreground,
      marginTop: 2,
    },
    recentArrow: {
      marginLeft: 8,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
    },
    emptyIcon: {
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.foreground,
      textAlign: 'center',
    },
    budgetOverview: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    budgetLabel: {
      fontSize: 12,
      color: theme.colors.foreground,
      marginBottom: 8,
      fontWeight: tokens.fontWeight.medium,
    },
    budgetProgress: {
      height: 6,
      backgroundColor: theme.colors.background,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 8,
    },
    budgetBar: {
      height: '100%',
      borderRadius: 3,
    },
    budgetText: {
      fontSize: 12,
      color: theme.colors.foreground,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    budgetAmount: {
      fontWeight: tokens.fontWeight.semiBold,
    },
  });

  return (
    <SafeAreaView style={[styles.container, {marginTop: 60}]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <Animatable.View animation="fadeInDown" style={styles.header}>
          <View style={styles.headerTop}>
            <AppleTouchFeedback
              style={{padding: 8}}
              onPress={() => navigate?.('Home')}>
              <MaterialIcons
                name="arrow-back-ios"
                size={22}
                color={theme.colors.primary}
              />
            </AppleTouchFeedback>
            <Text style={styles.headerTitle}>Shop Dashboard</Text>
            <View style={styles.headerIcons}>
              <AppleTouchFeedback
                onPress={() => navigate?.('GoldDataViewer')}
                hapticStyle="impactLight">
                <MaterialIcons
                  name="insights"
                  size={22}
                  color={theme.colors.primary}
                />
              </AppleTouchFeedback>
            </View>
          </View>

          <View
            style={{
              marginBottom: 20,
              justifyContent: 'center',
            }}>
            <AppleTouchFeedback
              onPress={() => navigate?.('WebBrowser')}
              hapticStyle="impactLight"
              style={[
                globalStyles.buttonPrimary,
                {
                  width: '100%',
                  alignSelf: 'stretch',
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}>
              <Text
                style={{
                  color: theme.colors.buttonText1,
                  fontWeight: tokens.fontWeight.semiBold,
                }}>
                Start Browsing
              </Text>
            </AppleTouchFeedback>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <Animatable.View
              animation="bounceIn"
              delay={200}
              style={[
                styles.statCard,
                // {backgroundColor: 'rgba(215, 38, 255, 1)'},
              ]}>
              <Text style={styles.statNumber}>{bookmarks.length}</Text>
              <Text style={styles.statLabel}>Bookmarks</Text>
            </Animatable.View>
            <Animatable.View
              animation="bounceIn"
              delay={250}
              style={[
                styles.statCard,
                // {backgroundColor: 'rgba(4, 255, 0, 1)'},
              ]}>
              <Text style={styles.statNumber}>{collections.length}</Text>
              <Text style={styles.statLabel}>Collections</Text>
            </Animatable.View>
            <Animatable.View
              animation="bounceIn"
              delay={300}
              style={[
                styles.statCard,
                // {backgroundColor: 'rgba(255, 38, 38, 1)'},
              ]}>
              <Text style={styles.statNumber}>{history.length}</Text>
              <Text style={styles.statLabel}>Visited</Text>
            </Animatable.View>
            <Animatable.View
              animation="bounceIn"
              delay={350}
              style={[
                styles.statCard,
                // {backgroundColor: 'rgba(0, 21, 255, 1)'},
              ]}>
              <Text style={styles.statNumber}>{tabs.filter(t => t.url).length}</Text>
              <Text style={styles.statLabel}>Open Tabs</Text>
            </Animatable.View>
          </View>
        </Animatable.View>

        {/* Quick Actions */}
        <Animatable.View
          animation="fadeInUp"
          delay={200}
          style={styles.sectionContainer}>
          <View style={styles.quickActionGrid}>
            <AppleTouchFeedback
              style={styles.quickActionButton}
              onPress={() => navigate?.('ShoppingBookmarks')}
              hapticStyle="impactLight">
              <MaterialIcons
                name="bookmark"
                size={28}
                color={theme.colors.primary}
                style={styles.quickActionIcon}
              />
              <Text style={styles.quickActionLabel}>Bookmarks</Text>
            </AppleTouchFeedback>

            <AppleTouchFeedback
              style={styles.quickActionButton}
              onPress={() => navigate?.('ShoppingCollections')}
              hapticStyle="impactLight">
              <MaterialIcons
                name="collections"
                size={28}
                color={theme.colors.primary}
                style={styles.quickActionIcon}
              />
              <Text style={styles.quickActionLabel}>Collections</Text>
            </AppleTouchFeedback>

            <AppleTouchFeedback
              style={styles.quickActionButton}
              onPress={() => navigate?.('ShoppingInsights')}
              hapticStyle="impactLight">
              <MaterialIcons
                name="trending-up"
                size={28}
                color={theme.colors.primary}
                style={styles.quickActionIcon}
              />
              <Text style={styles.quickActionLabel}>Insights</Text>
            </AppleTouchFeedback>
          </View>
        </Animatable.View>

        {/* Budget Overview */}
        {budgetStatus && (
          <Animatable.View
            animation="fadeInUp"
            delay={250}
            style={styles.budgetOverview}>
            <Text style={styles.budgetLabel}>Monthly Budget</Text>
            <View style={styles.budgetProgress}>
              <View
                style={[
                  styles.budgetBar,
                  {
                    width: `${budgetStatus.percentage}%`,
                    backgroundColor:
                      budgetStatus.spent > budgetStatus.budget
                        ? '#ef4444'
                        : budgetStatus.spent > budgetStatus.budget * 0.8
                        ? '#f59e0b'
                        : '#10b981',
                  },
                ]}
              />
            </View>
            <View
              style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={styles.budgetText}>
                <Text style={styles.budgetAmount}>${budgetStatus.spent}</Text>
                <Text> of ${budgetStatus.budget}</Text>
              </Text>
              <Text style={{fontSize: 12, color: theme.colors.foreground}}>
                {Math.round(budgetStatus.percentage)}%
              </Text>
            </View>
          </Animatable.View>
        )}

        {/* Trending Items */}
        {trendingItems.length > 0 && (
          <Animatable.View animation="fadeInLeft" delay={300}>
            <View style={styles.sectionContainer}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                <Text style={styles.sectionTitle}>Recent Bookmarks</Text>
                <AppleTouchFeedback
                  onPress={() => navigate?.('ShoppingBookmarks')}>
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: 14,
                      fontWeight: tokens.fontWeight.semiBold,
                    }}>
                    See All
                  </Text>
                </AppleTouchFeedback>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {trendingItems.map((item: any, idx: number) => (
                  <Animatable.View
                    key={item.id}
                    animation="zoomIn"
                    delay={400 + idx * 100}>
                    <AppleTouchFeedback
                      onPress={() => navigate?.('WebBrowser', {url: item.url})}
                      hapticStyle="impactLight"
                      style={styles.trendingCard}>
                      <View style={styles.trendingImage}>
                        {item.screenshot ? (
                          <>
                            <Image
                              source={{uri: item.screenshot}}
                              style={styles.trendingScreenshot}
                            />
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.6)']}
                              start={{x: 0, y: 0.5}}
                              end={{x: 0, y: 1}}
                              style={styles.trendingGradient}
                            />
                          </>
                        ) : (
                          <>
                            <View
                              style={[
                                styles.trendingPlaceholder,
                                {backgroundColor: theme.colors.surface},
                              ]}
                            />
                            <Image
                              source={{uri: item.imageUrl}}
                              style={styles.trendingFavicon}
                            />
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.5)']}
                              start={{x: 0, y: 0.5}}
                              end={{x: 0, y: 1}}
                              style={styles.trendingGradient}
                            />
                          </>
                        )}
                      </View>
                      <View style={styles.trendingInfo}>
                        <Text style={styles.trendingTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.trendingSource} numberOfLines={1}>
                          {item.source}
                        </Text>
                      </View>
                    </AppleTouchFeedback>
                  </Animatable.View>
                ))}
              </ScrollView>
            </View>
          </Animatable.View>
        )}
        {/* Top Collections */}
        {topCollections.length > 0 && (
          <Animatable.View animation="fadeInRight" delay={400}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Your Collections</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {topCollections.map((collection: any, idx: number) => (
                  <Animatable.View
                    key={collection.id}
                    animation="zoomIn"
                    delay={500 + idx * 100}>
                    <AppleTouchFeedback
                      onPress={() =>
                        navigate?.('ShoppingCollections', {id: collection.id})
                      }
                      style={styles.collectionCard}>
                      <TouchableOpacity
                        style={[
                          styles.collectionBadge,
                          {
                            backgroundColor: theme.colors.background,
                            // borderColor: theme.colors.muted,
                            // borderWidth: tokens.borderWidth.hairline,
                            borderRadius: tokens.borderRadius.sm,
                          },
                        ]}>
                        <MaterialIcons
                          name="collections"
                          size={40}
                          color="#fff"
                        />
                      </TouchableOpacity>
                      <Text style={styles.collectionName}>
                        {collection.name}
                      </Text>
                      <Text style={styles.collectionCount}>
                        {collection.items.length} items
                      </Text>
                    </AppleTouchFeedback>
                  </Animatable.View>
                ))}
              </ScrollView>
            </View>
          </Animatable.View>
        )}
        {/* Recent Visits */}
        {recentVisits.length > 0 && (
          <Animatable.View animation="fadeInUp" delay={500}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Recently Visited</Text>
              {recentVisits.map((visit: any, idx: number) => (
                <Animatable.View
                  key={`${visit.url}-${idx}`}
                  animation="slideInLeft"
                  delay={600 + idx * 100}>
                  <AppleTouchFeedback
                    onPress={() => navigate?.('WebBrowser', {url: visit.url})}
                    style={styles.recentItem}>
                    <View style={styles.recentText}>
                      <Text style={styles.recentTitle} numberOfLines={1}>
                        {visit.title}
                      </Text>
                      <Text style={styles.recentSource}>{visit.source}</Text>
                    </View>
                    <MaterialIcons
                      name="arrow-forward-ios"
                      size={16}
                      color={theme.colors.foreground}
                      style={styles.recentArrow}
                    />
                  </AppleTouchFeedback>
                </Animatable.View>
              ))}
            </View>
          </Animatable.View>
        )}
        {/* Empty State */}
        {collections.length === 0 && recentVisits.length === 0 && (
          <View style={styles.emptyState}>
            {/* <MaterialIcons
                name="shopping-bag"
                size={48}
                color={theme.colors.foreground3}
                style={styles.emptyIcon}
              /> */}
            <Text style={styles.emptyText}>
              Start exploring and saving your favorite items
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

//////////////////

// import React, {useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   RefreshControl,
//   Dimensions,
//   Image,
// } from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const {width: screenWidth} = Dimensions.get('window');

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
// };

// export default function ShoppingDashboardScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {bookmarks, collections, history, recentSearches, tabs, addTab} =
//     useShoppingStore();
//   const [refreshing, setRefreshing] = useState(false);

//   const onRefresh = useCallback(() => {
//     setRefreshing(true);
//     // Simulate refresh
//     setTimeout(() => setRefreshing(false), 1000);
//   }, []);

//   const recentVisits = history.slice(0, 5);
//   const topCollections = collections.slice(0, 3);

//   // Helper to generate favicon URL for items without images
//   const getImageUrl = (item: any): string => {
//     if (item.imageUrl) return item.imageUrl;
//     try {
//       const domain = new URL(item.url).hostname;
//       return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
//     } catch {
//       return '';
//     }
//   };

//   // Populate trending items from bookmarks (most recently saved)
//   const trendingItems = bookmarks.map(item => ({
//     ...item,
//     imageUrl: getImageUrl(item),
//   }));

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     headerTop: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 16,
//     },
//     headerTitle: {
//       fontSize: 28,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     headerIcons: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     iconButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     statsRow: {
//       flexDirection: 'row',
//       gap: 12,
//     },
//     statCard: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       borderRadius: 12,
//       padding: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     statNumber: {
//       fontSize: 24,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.primary,
//     },
//     statLabel: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//       marginTop: 4,
//     },
//     sectionContainer: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     quickActionGrid: {
//       flexDirection: 'row',
//       gap: 12,
//       marginBottom: 24,
//     },
//     quickActionButton: {
//       flex: 1,
//       aspectRatio: 1,
//       borderRadius: 16,
//       justifyContent: 'center',
//       alignItems: 'center',
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//     },
//     quickActionIcon: {
//       marginBottom: 8,
//     },
//     quickActionLabel: {
//       fontSize: 12,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       textAlign: 'center',
//     },
//     trendingCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       marginRight: 12,
//       width: screenWidth * 0.45,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       overflow: 'hidden',
//     },
//     trendingImage: {
//       width: '100%',
//       height: 140,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//       overflow: 'hidden',
//     },
//     trendingScreenshot: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     trendingPlaceholder: {
//       position: 'absolute',
//       width: '100%',
//       height: '100%',
//     },
//     trendingFavicon: {
//       width: 48,
//       height: 48,
//       borderRadius: 8,
//     },
//     trendingGradient: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: '50%',
//     },
//     trendingInfo: {
//       padding: 12,
//     },
//     trendingTitle: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     trendingSource: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//     },
//     trendingMeta: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginTop: 8,
//     },
//     brand: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.medium,
//     },
//     price: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.primary,
//     },
//     collectionCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       marginRight: 12,
//       width: screenWidth * 0.6,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     collectionBadge: {
//       width: '100%',
//       height: 100,
//       borderRadius: 8,
//       marginBottom: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     collectionName: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     collectionCount: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//     },
//     recentItem: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 8,
//       padding: 10,
//       marginBottom: 8,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     recentText: {
//       flex: 1,
//     },
//     recentTitle: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.foreground,
//     },
//     recentSource: {
//       fontSize: 11,
//       color: theme.colors.foreground,
//       marginTop: 2,
//     },
//     recentArrow: {
//       marginLeft: 8,
//     },
//     emptyState: {
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingVertical: 32,
//     },
//     emptyIcon: {
//       marginBottom: 12,
//     },
//     emptyText: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//       textAlign: 'center',
//     },
//   });

//   return (
//     <SafeAreaView style={[styles.container, {marginTop: 60}]}>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }>
//         {/* Header */}
//         <Animatable.View animation="fadeInDown" style={styles.header}>
//           <View style={styles.headerTop}>
//             <AppleTouchFeedback
//               style={{padding: 8}}
//               onPress={() => navigate?.('Home')}>
//               <MaterialIcons
//                 name="arrow-back-ios"
//                 size={22}
//                 color={theme.colors.primary}
//               />
//             </AppleTouchFeedback>
//             <Text style={styles.headerTitle}>Shop Dashboard</Text>
//             <View style={styles.headerIcons}></View>
//           </View>

//           <View style={{flexDirection: 'row', gap: 8, marginBottom: 20}}>
//             <AppleTouchFeedback
//               onPress={() => navigate?.('WebBrowser')}
//               hapticStyle="impactLight"
//               style={[
//                 globalStyles.buttonPrimary,
//                 {flex: 1},
//               ]}>
//               <Text
//                 style={{
//                   color: theme.colors.buttonText1,
//                   fontWeight: tokens.fontWeight.semiBold,
//                 }}>
//                 Start Shopping
//               </Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               onPress={() => navigate?.('GoldDataViewer')}
//               hapticStyle="impactLight"
//               style={[
//                 globalStyles.buttonPrimary,
//                 {
//                   backgroundColor: '#fbbf24',
//                 },
//               ]}>
//               <Text
//                 style={{
//                   color: '#000',
//                   fontWeight: tokens.fontWeight.semiBold,
//                 }}>
//                 🏆 Data
//               </Text>
//             </AppleTouchFeedback>
//           </View>

//           {/* Stats */}
//           <View style={styles.statsRow}>
//             <Animatable.View
//               animation="bounceIn"
//               delay={200}
//               style={styles.statCard}>
//               <Text style={styles.statNumber}>{bookmarks.length}</Text>
//               <Text style={styles.statLabel}>Bookmarked</Text>
//             </Animatable.View>
//             <Animatable.View
//               animation="bounceIn"
//               delay={250}
//               style={styles.statCard}>
//               <Text style={styles.statNumber}>{collections.length}</Text>
//               <Text style={styles.statLabel}>Wishlists</Text>
//             </Animatable.View>
//             <Animatable.View
//               animation="bounceIn"
//               delay={300}
//               style={styles.statCard}>
//               <Text style={styles.statNumber}>{history.length}</Text>
//               <Text style={styles.statLabel}>Visited</Text>
//             </Animatable.View>
//             <Animatable.View
//               animation="bounceIn"
//               delay={350}
//               style={styles.statCard}>
//               <Text style={styles.statNumber}>{tabs.length}</Text>
//               <Text style={styles.statLabel}>Open Tabs</Text>
//             </Animatable.View>
//           </View>
//         </Animatable.View>
//         {/* Quick Actions */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={200}
//           style={styles.sectionContainer}>
//           <View style={styles.quickActionGrid}>
//             <AppleTouchFeedback
//               style={styles.quickActionButton}
//               onPress={() => navigate?.('ShoppingBookmarks')}
//               hapticStyle="impactLight">
//               <MaterialIcons
//                 name="bookmark"
//                 size={28}
//                 color={theme.colors.primary}
//                 style={styles.quickActionIcon}
//               />
//               <Text style={styles.quickActionLabel}>Bookmarks</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.quickActionButton}
//               onPress={() => navigate?.('ShoppingCollections')}
//               hapticStyle="impactLight">
//               <MaterialIcons
//                 name="collections"
//                 size={28}
//                 color={theme.colors.primary}
//                 style={styles.quickActionIcon}
//               />
//               <Text style={styles.quickActionLabel}>Wishlists</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.quickActionButton}
//               onPress={() => navigate?.('ShoppingInsights')}
//               hapticStyle="impactLight">
//               <MaterialIcons
//                 name="trending-up"
//                 size={28}
//                 color={theme.colors.primary}
//                 style={styles.quickActionIcon}
//               />
//               <Text style={styles.quickActionLabel}>Insights</Text>
//             </AppleTouchFeedback>
//           </View>
//         </Animatable.View>
//         {/* Trending Items */}
//         {trendingItems.length > 0 && (
//           <Animatable.View animation="fadeInLeft" delay={300}>
//             <View style={styles.sectionContainer}>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   justifyContent: 'space-between',
//                   alignItems: 'center',
//                   marginBottom: 12,
//                 }}>
//                 <Text style={styles.sectionTitle}>Trending Now</Text>
//                 <AppleTouchFeedback
//                   onPress={() => navigate?.('ShoppingBookmarks')}>
//                   <Text
//                     style={{
//                       color: theme.colors.primary,
//                       fontSize: 12,
//                       fontWeight: tokens.fontWeight.semiBold,
//                     }}>
//                     See All →
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {trendingItems.map((item: any, idx: number) => (
//                   <Animatable.View
//                     key={item.id}
//                     animation="zoomIn"
//                     delay={400 + idx * 100}>
//                     <AppleTouchFeedback
//                       onPress={() => navigate?.('WebBrowser', {url: item.url})}
//                       hapticStyle="impactLight"
//                       style={styles.trendingCard}>
//                       <View style={styles.trendingImage}>
//                         {item.screenshot ? (
//                           <>
//                             <Image
//                               source={{uri: item.screenshot}}
//                               style={styles.trendingScreenshot}
//                             />
//                             <LinearGradient
//                               colors={['transparent', 'rgba(0,0,0,0.6)']}
//                               start={{x: 0, y: 0.5}}
//                               end={{x: 0, y: 1}}
//                               style={styles.trendingGradient}
//                             />
//                           </>
//                         ) : (
//                           <>
//                             <View
//                               style={[
//                                 styles.trendingPlaceholder,
//                                 {backgroundColor: theme.colors.surface},
//                               ]}
//                             />
//                             <Image
//                               source={{uri: item.imageUrl}}
//                               style={styles.trendingFavicon}
//                             />
//                             <LinearGradient
//                               colors={['transparent', 'rgba(0,0,0,0.5)']}
//                               start={{x: 0, y: 0.5}}
//                               end={{x: 0, y: 1}}
//                               style={styles.trendingGradient}
//                             />
//                           </>
//                         )}
//                       </View>
//                       <View style={styles.trendingInfo}>
//                         <Text style={styles.trendingTitle} numberOfLines={2}>
//                           {item.title}
//                         </Text>
//                         <Text style={styles.trendingSource} numberOfLines={1}>
//                           {item.source}
//                         </Text>
//                       </View>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             </View>
//           </Animatable.View>
//         )}
//         {/* Top Collections */}
//         {topCollections.length > 0 && (
//           <Animatable.View animation="fadeInRight" delay={400}>
//             <View style={styles.sectionContainer}>
//               <Text style={styles.sectionTitle}>Your Collections</Text>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {topCollections.map((collection: any, idx: number) => (
//                   <Animatable.View
//                     key={collection.id}
//                     animation="zoomIn"
//                     delay={500 + idx * 100}>
//                     <AppleTouchFeedback
//                       onPress={() =>
//                         navigate?.('ShoppingCollections', {id: collection.id})
//                       }
//                       style={styles.collectionCard}>
//                       <LinearGradient
//                         colors={[collection.color, collection.color + '80']}
//                         start={{x: 0, y: 0}}
//                         end={{x: 1, y: 1}}
//                         style={styles.collectionBadge}>
//                         <MaterialIcons
//                           name="collections"
//                           size={40}
//                           color="#fff"
//                         />
//                       </LinearGradient>
//                       <Text style={styles.collectionName}>
//                         {collection.name}
//                       </Text>
//                       <Text style={styles.collectionCount}>
//                         {collection.items.length} items
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             </View>
//           </Animatable.View>
//         )}
//         {/* Recent Visits */}
//         {recentVisits.length > 0 && (
//           <Animatable.View animation="fadeInUp" delay={500}>
//             <View style={styles.sectionContainer}>
//               <Text style={styles.sectionTitle}>Recently Visited</Text>
//               {recentVisits.map((visit: any, idx: number) => (
//                 <Animatable.View
//                   key={`${visit.url}-${idx}`}
//                   animation="slideInLeft"
//                   delay={600 + idx * 100}>
//                   <AppleTouchFeedback
//                     onPress={() =>
//                       navigate?.('EnhancedWebBrowser', {url: visit.url})
//                     }
//                     style={styles.recentItem}>
//                     <View style={styles.recentText}>
//                       <Text style={styles.recentTitle} numberOfLines={1}>
//                         {visit.title}
//                       </Text>
//                       <Text style={styles.recentSource}>{visit.source}</Text>
//                     </View>
//                     <MaterialIcons
//                       name="arrow-forward-ios"
//                       size={16}
//                       color={theme.colors.foreground}
//                       style={styles.recentArrow}
//                     />
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </View>
//           </Animatable.View>
//         )}
//         {/* Empty State */}
//         {collections.length === 0 && recentVisits.length === 0 && (
//           <View style={styles.emptyState}>
//             {/* <MaterialIcons
//                 name="shopping-bag"
//                 size={48}
//                 color={theme.colors.foreground3}
//                 style={styles.emptyIcon}
//               /> */}
//             <Text style={styles.emptyText}>
//               Start exploring and saving your favorite items
//             </Text>
//           </View>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

/////////////////

// import React, {useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   RefreshControl,
//   Dimensions,
//   Image,
// } from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const {width: screenWidth} = Dimensions.get('window');

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
// };

// export default function ShoppingDashboardScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {bookmarks, collections, history, recentSearches, addTab} =
//     useShoppingStore();
//   const [refreshing, setRefreshing] = useState(false);

//   const onRefresh = useCallback(() => {
//     setRefreshing(true);
//     // Simulate refresh
//     setTimeout(() => setRefreshing(false), 1000);
//   }, []);

//   const recentVisits = history.slice(0, 5);
//   const topCollections = collections.slice(0, 3);

//   // Helper to generate favicon URL for items without images
//   const getImageUrl = (item: any): string => {
//     if (item.imageUrl) return item.imageUrl;
//     try {
//       const domain = new URL(item.url).hostname;
//       return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
//     } catch {
//       return '';
//     }
//   };

//   // Populate trending items from bookmarks (most recently saved)
//   const trendingItems = bookmarks.slice(0, 4).map(item => ({
//     ...item,
//     imageUrl: getImageUrl(item),
//   }));

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     headerTop: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 16,
//     },
//     headerTitle: {
//       fontSize: 28,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     headerIcons: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     iconButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     statsRow: {
//       flexDirection: 'row',
//       gap: 12,
//     },
//     statCard: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       borderRadius: 12,
//       padding: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     statNumber: {
//       fontSize: 24,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.primary,
//     },
//     statLabel: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//     },
//     sectionContainer: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     quickActionGrid: {
//       flexDirection: 'row',
//       gap: 12,
//       marginBottom: 24,
//     },
//     quickActionButton: {
//       flex: 1,
//       aspectRatio: 1,
//       borderRadius: 16,
//       justifyContent: 'center',
//       alignItems: 'center',
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//     },
//     quickActionIcon: {
//       marginBottom: 8,
//     },
//     quickActionLabel: {
//       fontSize: 12,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       textAlign: 'center',
//     },
//     trendingCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       marginRight: 12,
//       width: screenWidth * 0.45,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       overflow: 'hidden',
//     },
//     trendingImage: {
//       width: '100%',
//       height: 140,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//       overflow: 'hidden',
//     },
//     trendingScreenshot: {
//       width: '100%',
//       height: '100%',
//       resizeMode: 'cover',
//     },
//     trendingPlaceholder: {
//       position: 'absolute',
//       width: '100%',
//       height: '100%',
//     },
//     trendingFavicon: {
//       width: 48,
//       height: 48,
//       borderRadius: 8,
//     },
//     trendingGradient: {
//       position: 'absolute',
//       left: 0,
//       right: 0,
//       bottom: 0,
//       height: '50%',
//     },
//     trendingInfo: {
//       padding: 12,
//     },
//     trendingTitle: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     trendingSource: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//     },
//     trendingMeta: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginTop: 8,
//     },
//     brand: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       fontWeight: tokens.fontWeight.medium,
//     },
//     price: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.primary,
//     },
//     collectionCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       marginRight: 12,
//       width: screenWidth * 0.6,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     collectionBadge: {
//       width: '100%',
//       height: 100,
//       borderRadius: 8,
//       marginBottom: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     collectionName: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     collectionCount: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//     },
//     recentItem: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 8,
//       padding: 10,
//       marginBottom: 8,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     recentText: {
//       flex: 1,
//     },
//     recentTitle: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.foreground,
//     },
//     recentSource: {
//       fontSize: 11,
//       color: theme.colors.foreground3,
//       marginTop: 2,
//     },
//     recentArrow: {
//       marginLeft: 8,
//     },
//     emptyState: {
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingVertical: 32,
//     },
//     emptyIcon: {
//       marginBottom: 12,
//     },
//     emptyText: {
//       fontSize: 14,
//       color: theme.colors.foreground2,
//       textAlign: 'center',
//     },
//   });

//   return (
//     <SafeAreaView style={[styles.container, {marginTop: 60}]}>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }>
//         {/* Header */}
//         <Animatable.View animation="fadeInDown" style={styles.header}>
//           <View style={styles.headerTop}>
//             <TouchableOpacity
//               style={{padding: 8}}
//               onPress={() => navigate?.('Home')}>
//               <MaterialIcons
//                 name="arrow-back-ios"
//                 size={22}
//                 color={theme.colors.primary}
//               />
//             </TouchableOpacity>
//             <Text style={styles.headerTitle}>Shop</Text>
//             <View style={styles.headerIcons}>
//               {/* <TouchableOpacity
//                 style={styles.iconButton}
//                 onPress={() => navigate?.('ShoppingBookmarks')}>
//                 <MaterialIcons
//                   name="bookmark"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity> */}
//             </View>
//           </View>

//           <AppleTouchFeedback
//             onPress={() => navigate?.('WebBrowser')}
//             hapticStyle="impactLight"
//             style={[
//               globalStyles.buttonPrimary,
//               {marginBottom: 20, minWidth: 180},
//             ]}>
//             <Text
//               style={{
//                 color: theme.colors.buttonText1,
//                 fontWeight: tokens.fontWeight.semiBold,
//               }}>
//               Start Shopping
//             </Text>
//           </AppleTouchFeedback>

//           {/* Stats */}
//           <View style={styles.statsRow}>
//             <Animatable.View
//               animation="bounceIn"
//               delay={200}
//               style={styles.statCard}>
//               <Text style={styles.statNumber}>{bookmarks.length}</Text>
//               <Text style={styles.statLabel}>Bookmarked</Text>
//             </Animatable.View>
//             <Animatable.View
//               animation="bounceIn"
//               delay={300}
//               style={styles.statCard}>
//               <Text style={styles.statNumber}>{collections.length}</Text>
//               <Text style={styles.statLabel}>Wishlists</Text>
//             </Animatable.View>
//             <Animatable.View
//               animation="bounceIn"
//               delay={400}
//               style={styles.statCard}>
//               <Text style={styles.statNumber}>{history.length}</Text>
//               <Text style={styles.statLabel}>Visited</Text>
//             </Animatable.View>
//           </View>
//         </Animatable.View>
//         {/* Quick Actions */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={200}
//           style={styles.sectionContainer}>
//           <View style={styles.quickActionGrid}>
//             <AppleTouchFeedback
//               style={styles.quickActionButton}
//               onPress={() => navigate?.('ShoppingBookmarks')}
//               hapticStyle="impactLight">
//               <MaterialIcons
//                 name="bookmark"
//                 size={28}
//                 color={theme.colors.primary}
//                 style={styles.quickActionIcon}
//               />
//               <Text style={styles.quickActionLabel}>Bookmarks</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.quickActionButton}
//               onPress={() => navigate?.('ShoppingCollections')}
//               hapticStyle="impactLight">
//               <MaterialIcons
//                 name="collections"
//                 size={28}
//                 color={theme.colors.primary}
//                 style={styles.quickActionIcon}
//               />
//               <Text style={styles.quickActionLabel}>Wishlists</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.quickActionButton}
//               onPress={() => navigate?.('ShoppingInsights')}
//               hapticStyle="impactLight">
//               <MaterialIcons
//                 name="trending-up"
//                 size={28}
//                 color={theme.colors.primary}
//                 style={styles.quickActionIcon}
//               />
//               <Text style={styles.quickActionLabel}>Insights</Text>
//             </AppleTouchFeedback>
//           </View>
//         </Animatable.View>
//         {/* Trending Items */}
//         {trendingItems.length > 0 && (
//           <Animatable.View animation="fadeInLeft" delay={300}>
//             <View style={styles.sectionContainer}>
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   justifyContent: 'space-between',
//                   alignItems: 'center',
//                   marginBottom: 12,
//                 }}>
//                 <Text style={styles.sectionTitle}>Trending Now</Text>
//                 <TouchableOpacity onPress={() => navigate?.('ShoppingBookmarks')}>
//                   <Text
//                     style={{
//                       color: theme.colors.primary,
//                       fontSize: 12,
//                       fontWeight: tokens.fontWeight.semiBold,
//                     }}>
//                     See All →
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {trendingItems.map((item: any, idx: number) => (
//                   <Animatable.View
//                     key={item.id}
//                     animation="zoomIn"
//                     delay={400 + idx * 100}>
//                     <AppleTouchFeedback
//                       onPress={() => navigate?.('WebBrowser', {url: item.url})}
//                       hapticStyle="impactLight"
//                       style={styles.trendingCard}>
//                       <View style={styles.trendingImage}>
//                         {item.screenshot ? (
//                           <>
//                             <Image
//                               source={{uri: item.screenshot}}
//                               style={styles.trendingScreenshot}
//                             />
//                             <LinearGradient
//                               colors={['transparent', 'rgba(0,0,0,0.6)']}
//                               start={{x: 0, y: 0.5}}
//                               end={{x: 0, y: 1}}
//                               style={styles.trendingGradient}
//                             />
//                           </>
//                         ) : (
//                           <>
//                             <View style={[styles.trendingPlaceholder, {backgroundColor: theme.colors.surface}]} />
//                             <Image
//                               source={{uri: item.imageUrl}}
//                               style={styles.trendingFavicon}
//                             />
//                             <LinearGradient
//                               colors={['transparent', 'rgba(0,0,0,0.5)']}
//                               start={{x: 0, y: 0.5}}
//                               end={{x: 0, y: 1}}
//                               style={styles.trendingGradient}
//                             />
//                           </>
//                         )}
//                       </View>
//                       <View style={styles.trendingInfo}>
//                         <Text style={styles.trendingTitle} numberOfLines={2}>
//                           {item.title}
//                         </Text>
//                         <Text style={styles.trendingSource} numberOfLines={1}>
//                           {item.source}
//                         </Text>
//                       </View>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             </View>
//           </Animatable.View>
//         )}
//         {/* Top Collections */}
//         {topCollections.length > 0 && (
//           <Animatable.View animation="fadeInRight" delay={400}>
//             <View style={styles.sectionContainer}>
//               <Text style={styles.sectionTitle}>Your Collections</Text>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {topCollections.map((collection: any, idx: number) => (
//                   <Animatable.View
//                     key={collection.id}
//                     animation="zoomIn"
//                     delay={500 + idx * 100}>
//                     <AppleTouchFeedback
//                       onPress={() =>
//                         navigate?.('ShoppingCollections', {id: collection.id})
//                       }
//                       style={styles.collectionCard}>
//                       <LinearGradient
//                         colors={[collection.color, collection.color + '80']}
//                         start={{x: 0, y: 0}}
//                         end={{x: 1, y: 1}}
//                         style={styles.collectionBadge}>
//                         <MaterialIcons
//                           name="collections"
//                           size={40}
//                           color="#fff"
//                         />
//                       </LinearGradient>
//                       <Text style={styles.collectionName}>
//                         {collection.name}
//                       </Text>
//                       <Text style={styles.collectionCount}>
//                         {collection.items.length} items
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             </View>
//           </Animatable.View>
//         )}
//         {/* Recent Visits */}
//         {recentVisits.length > 0 && (
//           <Animatable.View animation="fadeInUp" delay={500}>
//             <View style={styles.sectionContainer}>
//               <Text style={styles.sectionTitle}>Recently Visited</Text>
//               {recentVisits.map((visit: any, idx: number) => (
//                 <Animatable.View
//                   key={`${visit.url}-${idx}`}
//                   animation="slideInLeft"
//                   delay={600 + idx * 100}>
//                   <AppleTouchFeedback
//                     onPress={() =>
//                       navigate?.('EnhancedWebBrowser', {url: visit.url})
//                     }
//                     style={styles.recentItem}>
//                     <View style={styles.recentText}>
//                       <Text style={styles.recentTitle} numberOfLines={1}>
//                         {visit.title}
//                       </Text>
//                       <Text style={styles.recentSource}>{visit.source}</Text>
//                     </View>
//                     <MaterialIcons
//                       name="arrow-forward-ios"
//                       size={16}
//                       color={theme.colors.foreground3}
//                       style={styles.recentArrow}
//                     />
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </View>
//           </Animatable.View>
//         )}
//         {/* Empty State */}
//         {collections.length === 0 && recentVisits.length === 0 && (
//           <View style={styles.emptyState}>
//           {/* <MaterialIcons
//                 name="shopping-bag"
//                 size={48}
//                 color={theme.colors.foreground3}
//                 style={styles.emptyIcon}
//               /> */}
//           <Text style={styles.emptyText}>
//             Start exploring and saving your favorite items
//           </Text>
//           </View>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

///////////////

// import React, {useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   RefreshControl,
//   Dimensions,
// } from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const {width: screenWidth} = Dimensions.get('window');

// const TRENDING_ITEMS = [
//   {
//     id: '1',
//     title: 'Oversized Blazer',
//     brand: 'ASOS',
//     price: 89,
//     category: 'Outerwear',
//   },
//   {
//     id: '2',
//     title: 'Wide Leg Jeans',
//     brand: 'Zara',
//     price: 79,
//     category: 'Denim',
//   },
//   {
//     id: '3',
//     title: 'Vintage Tee',
//     brand: 'Shein',
//     price: 12,
//     category: 'Tops',
//   },
//   {
//     id: '4',
//     title: 'Leather Sneakers',
//     brand: 'Amazon',
//     price: 65,
//     category: 'Shoes',
//   },
// ];

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
// };

// export default function ShoppingDashboardScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {bookmarks, collections, history, recentSearches, addTab} =
//     useShoppingStore();
//   const [refreshing, setRefreshing] = useState(false);

//   const onRefresh = useCallback(() => {
//     setRefreshing(true);
//     // Simulate refresh
//     setTimeout(() => setRefreshing(false), 1000);
//   }, []);

//   const recentVisits = history.slice(0, 5);
//   const topCollections = collections.slice(0, 3);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.surface,
//     },
//     headerTop: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 16,
//     },
//     headerTitle: {
//       fontSize: 28,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     headerIcons: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     iconButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     statsRow: {
//       flexDirection: 'row',
//       gap: 12,
//     },
//     statCard: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       borderRadius: 12,
//       padding: 12,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     statNumber: {
//       fontSize: 24,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.primary,
//     },
//     statLabel: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       marginTop: 4,
//     },
//     sectionContainer: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     quickActionGrid: {
//       flexDirection: 'row',
//       gap: 12,
//       marginBottom: 24,
//     },
//     quickActionButton: {
//       flex: 1,
//       aspectRatio: 1,
//       borderRadius: 16,
//       justifyContent: 'center',
//       alignItems: 'center',
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//     },
//     quickActionIcon: {
//       marginBottom: 8,
//     },
//     quickActionLabel: {
//       fontSize: 12,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       textAlign: 'center',
//     },
//     trendingCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       marginRight: 12,
//       width: screenWidth * 0.7,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     trendingImage: {
//       width: '100%',
//       height: 150,
//       borderRadius: 8,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 12,
//     },
//     trendingTitle: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     trendingMeta: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginTop: 8,
//     },
//     brand: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//       fontWeight: tokens.fontWeight.medium,
//     },
//     price: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.primary,
//     },
//     collectionCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       marginRight: 12,
//       width: screenWidth * 0.6,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     collectionBadge: {
//       width: '100%',
//       height: 100,
//       borderRadius: 8,
//       marginBottom: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     collectionName: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     collectionCount: {
//       fontSize: 12,
//       color: theme.colors.foreground3,
//     },
//     recentItem: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 8,
//       padding: 10,
//       marginBottom: 8,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     recentText: {
//       flex: 1,
//     },
//     recentTitle: {
//       fontSize: 13,
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.foreground,
//     },
//     recentSource: {
//       fontSize: 11,
//       color: theme.colors.foreground3,
//       marginTop: 2,
//     },
//     recentArrow: {
//       marginLeft: 8,
//     },
//     emptyState: {
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingVertical: 32,
//     },
//     emptyIcon: {
//       marginBottom: 12,
//     },
//     emptyText: {
//       fontSize: 14,
//       color: theme.colors.foreground2,
//       textAlign: 'center',
//     },
//   });

//   return (
//     <SafeAreaView style={[styles.container, {marginTop: 70}]}>
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }>
//         {/* Header */}
//         <Animatable.View animation="fadeInDown" style={styles.header}>
//           <View style={styles.headerTop}>
//             <TouchableOpacity
//               style={{padding: 8}}
//               onPress={() => navigate?.('Home')}>
//               <MaterialIcons
//                 name="arrow-back-ios"
//                 size={22}
//                 color={theme.colors.primary}
//               />
//             </TouchableOpacity>
//             <Text style={styles.headerTitle}>Shop</Text>
//             <View style={styles.headerIcons}>
//               <TouchableOpacity
//                 style={styles.iconButton}
//                 onPress={() => navigate?.('EnhancedWebBrowser')}>
//                 <MaterialIcons
//                   name="search"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={styles.iconButton}
//                 onPress={() => navigate?.('ShoppingBookmarks')}>
//                 <MaterialIcons
//                   name="bookmark"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Stats */}
//           <View style={styles.statsRow}>
//             <Animatable.View
//               animation="bounceIn"
//               delay={200}
//               style={styles.statCard}>
//               <Text style={styles.statNumber}>{bookmarks.length}</Text>
//               <Text style={styles.statLabel}>Bookmarked</Text>
//             </Animatable.View>
//             <Animatable.View
//               animation="bounceIn"
//               delay={300}
//               style={styles.statCard}>
//               <Text style={styles.statNumber}>{collections.length}</Text>
//               <Text style={styles.statLabel}>Collections</Text>
//             </Animatable.View>
//             <Animatable.View
//               animation="bounceIn"
//               delay={400}
//               style={styles.statCard}>
//               <Text style={styles.statNumber}>{history.length}</Text>
//               <Text style={styles.statLabel}>Visited</Text>
//             </Animatable.View>
//           </View>
//         </Animatable.View>

//         {/* Quick Actions */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={200}
//           style={styles.sectionContainer}>
//           <View style={styles.quickActionGrid}>
//             <AppleTouchFeedback
//               style={styles.quickActionButton}
//               onPress={() => navigate?.('WebBrowser')}
//               hapticStyle="impactLight">
//               <MaterialIcons
//                 name="language"
//                 size={28}
//                 color={theme.colors.primary}
//                 style={styles.quickActionIcon}
//               />
//               <Text style={styles.quickActionLabel}>Browse</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.quickActionButton}
//               onPress={() => navigate?.('ShoppingBookmarks')}
//               hapticStyle="impactLight">
//               <MaterialIcons
//                 name="favorite"
//                 size={28}
//                 color={theme.colors.primary}
//                 style={styles.quickActionIcon}
//               />
//               <Text style={styles.quickActionLabel}>Saved</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.quickActionButton}
//               onPress={() => navigate?.('ShoppingCollections')}
//               hapticStyle="impactLight">
//               <MaterialIcons
//                 name="collections"
//                 size={28}
//                 color={theme.colors.primary}
//                 style={styles.quickActionIcon}
//               />
//               <Text style={styles.quickActionLabel}>Lists</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               style={styles.quickActionButton}
//               onPress={() => navigate?.('ShoppingInsights')}
//               hapticStyle="impactLight">
//               <MaterialIcons
//                 name="trending-up"
//                 size={28}
//                 color={theme.colors.primary}
//                 style={styles.quickActionIcon}
//               />
//               <Text style={styles.quickActionLabel}>Insights</Text>
//             </AppleTouchFeedback>
//           </View>
//         </Animatable.View>

//         {/* Trending Items */}
//         <Animatable.View animation="fadeInLeft" delay={300}>
//           <View style={styles.sectionContainer}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 marginBottom: 12,
//               }}>
//               <Text style={styles.sectionTitle}>Trending Now</Text>
//               <TouchableOpacity>
//                 <Text
//                   style={{
//                     color: theme.colors.primary,
//                     fontSize: 12,
//                     fontWeight: tokens.fontWeight.semiBold,
//                   }}>
//                   See All →
//                 </Text>
//               </TouchableOpacity>
//             </View>
//             <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//               {TRENDING_ITEMS.map((item, idx) => (
//                 <Animatable.View
//                   key={item.id}
//                   animation="zoomIn"
//                   delay={400 + idx * 100}
//                   style={styles.trendingCard}>
//                   <LinearGradient
//                     colors={[theme.colors.primary, theme.colors.primary + '80']}
//                     start={{x: 0, y: 0}}
//                     end={{x: 1, y: 1}}
//                     style={styles.trendingImage}>
//                     <MaterialIcons
//                       name={
//                         item.category === 'Outerwear'
//                           ? 'checkroom'
//                           : 'shopping-bag'
//                       }
//                       size={40}
//                       color="#fff"
//                     />
//                   </LinearGradient>
//                   <Text style={styles.trendingTitle}>{item.title}</Text>
//                   <Text style={{fontSize: 12, color: theme.colors.foreground3}}>
//                     {item.category}
//                   </Text>
//                   <View style={styles.trendingMeta}>
//                     <Text style={styles.brand}>{item.brand}</Text>
//                     <Text style={styles.price}>${item.price}</Text>
//                   </View>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           </View>
//         </Animatable.View>

//         {/* Top Collections */}
//         {topCollections.length > 0 && (
//           <Animatable.View animation="fadeInRight" delay={400}>
//             <View style={styles.sectionContainer}>
//               <Text style={styles.sectionTitle}>Your Collections</Text>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {topCollections.map((collection: any, idx: number) => (
//                   <Animatable.View
//                     key={collection.id}
//                     animation="zoomIn"
//                     delay={500 + idx * 100}>
//                     <AppleTouchFeedback
//                       onPress={() =>
//                         navigate?.('ShoppingCollections', {id: collection.id})
//                       }
//                       style={styles.collectionCard}>
//                       <LinearGradient
//                         colors={[collection.color, collection.color + '80']}
//                         start={{x: 0, y: 0}}
//                         end={{x: 1, y: 1}}
//                         style={styles.collectionBadge}>
//                         <MaterialIcons
//                           name="collections"
//                           size={40}
//                           color="#fff"
//                         />
//                       </LinearGradient>
//                       <Text style={styles.collectionName}>
//                         {collection.name}
//                       </Text>
//                       <Text style={styles.collectionCount}>
//                         {collection.items.length} items
//                       </Text>
//                     </AppleTouchFeedback>
//                   </Animatable.View>
//                 ))}
//               </ScrollView>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Recent Visits */}
//         {recentVisits.length > 0 && (
//           <Animatable.View animation="fadeInUp" delay={500}>
//             <View style={styles.sectionContainer}>
//               <Text style={styles.sectionTitle}>Recently Visited</Text>
//               {recentVisits.map((visit: any, idx: number) => (
//                 <Animatable.View
//                   key={`${visit.url}-${idx}`}
//                   animation="slideInLeft"
//                   delay={600 + idx * 100}>
//                   <AppleTouchFeedback
//                     onPress={() =>
//                       navigate?.('EnhancedWebBrowser', {url: visit.url})
//                     }
//                     style={styles.recentItem}>
//                     <View style={styles.recentText}>
//                       <Text
//                         style={styles.recentTitle}
//                         numberOfLines={1}>
//                         {visit.title}
//                       </Text>
//                       <Text style={styles.recentSource}>{visit.source}</Text>
//                     </View>
//                     <MaterialIcons
//                       name="arrow-forward-ios"
//                       size={16}
//                       color={theme.colors.foreground3}
//                       style={styles.recentArrow}
//                     />
//                   </AppleTouchFeedback>
//                 </Animatable.View>
//               ))}
//             </View>
//           </Animatable.View>
//         )}

//         {/* Empty State */}
//         {bookmarks.length === 0 &&
//           collections.length === 0 &&
//           recentVisits.length === 0 && (
//             <View style={styles.emptyState}>
//               <MaterialIcons
//                 name="shopping-bag"
//                 size={48}
//                 color={theme.colors.foreground3}
//                 style={styles.emptyIcon}
//               />
//               <Text style={styles.emptyText}>
//                 Start exploring and saving your favorite items
//               </Text>
//               <AppleTouchFeedback
//                 onPress={() => navigate?.('WebBrowser')}
//                 hapticStyle="impactLight"
//                 style={[
//                   globalStyles.buttonPrimary,
//                   {marginTop: 16, minWidth: 180},
//                 ]}>
//                 <Text
//                   style={{
//                     color: theme.colors.buttonText1,
//                     fontWeight: tokens.fontWeight.semiBold,
//                   }}>
//                   Start Shopping
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }
