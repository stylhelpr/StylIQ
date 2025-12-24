import React, {useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, Dimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useAppTheme} from '../context/ThemeContext';
import {useShoppingStore} from '../../../../store/shoppingStore';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useStyleProfile} from '../hooks/useStyleProfile';
import {useAuth0} from 'react-native-auth0';

const {width: screenWidth} = Dimensions.get('window');

type Props = {
  navigate?: (screen: any, params?: any) => void;
};

export default function ShoppingInsightsScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile} = useStyleProfile(userId);

  // Get budget from style profile (use budget_max as the monthly spending limit)
  const monthlyBudget = styleProfile?.budget_max || 0;

  const {
    bookmarks,
    history,
    collections,
    recentSearches,
    getTopShops,
    getMostVisitedSites,
    cartHistory,
    clearCartHistory,
    _hasHydrated,
  } = useShoppingStore();

  // Calculate insights
  const insights = useMemo(() => {
    // Most visited stores - use helper function
    const topStores = getTopShops(5).map(
      shop => [shop.source, shop.visits] as [string, number],
    );

    // Price insights from bookmarks
    const prices = bookmarks.filter(b => b.price).map(b => b.price as number);
    const avgPrice =
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    // Brand distribution from browsing history (weighted by visit count)
    const brandCounts: Record<string, number> = {};
    history.forEach(h => {
      if (h.brand) {
        // Weight by visit count - brands you visit more often rank higher
        brandCounts[h.brand] = (brandCounts[h.brand] || 0) + h.visitCount;
      }
    });
    const topBrands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Shopping activity by day (last 7 days) - count by visitCount
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentActivity = history.filter(h => h.visitedAt > weekAgo);
    const activityByDay: Record<string, number> = {};
    recentActivity.forEach(h => {
      const day = new Date(h.visitedAt).toLocaleDateString('en-US', {
        weekday: 'short',
      });
      activityByDay[day] = (activityByDay[day] || 0) + h.visitCount;
    });
    // Count actual days with activity for daily average
    const activeDays = Object.keys(activityByDay).length || 1;

    // Total items in collections
    const totalCollectionItems = collections.reduce(
      (sum, c) => sum + c.items.length,
      0,
    );

    return {
      topStores,
      avgPrice,
      maxPrice,
      minPrice,
      topBrands,
      activityByDay,
      activeDays,
      totalBookmarks: bookmarks.length,
      totalCollections: collections.length,
      totalCollectionItems,
      totalVisits: history.reduce((sum, h) => sum + h.visitCount, 0),
      recentSearchCount: recentSearches.length,
    };
  }, [bookmarks, history, collections, recentSearches, getTopShops]);

  // Calculate trend insights (separate from main insights to not disrupt existing logic)
  const trendInsights = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    // Split bookmarks into this week and last week
    const thisWeekBookmarks = bookmarks.filter(b => b.addedAt > weekAgo);
    const lastWeekBookmarks = bookmarks.filter(
      b => b.addedAt > twoWeeksAgo && b.addedAt <= weekAgo,
    );

    // Most saved items (top 5 by view count or recency)
    const mostSavedItems = [...bookmarks]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0) || b.addedAt - a.addedAt)
      .slice(0, 5);

    // Category trends with week-over-week change
    const thisWeekCategories: Record<string, number> = {};
    const lastWeekCategories: Record<string, number> = {};

    thisWeekBookmarks.forEach(b => {
      if (b.category) {
        thisWeekCategories[b.category] = (thisWeekCategories[b.category] || 0) + 1;
      }
    });

    lastWeekBookmarks.forEach(b => {
      if (b.category) {
        lastWeekCategories[b.category] = (lastWeekCategories[b.category] || 0) + 1;
      }
    });

    // Calculate category trends with percentage change
    const allCategories = new Set([
      ...Object.keys(thisWeekCategories),
      ...Object.keys(lastWeekCategories),
    ]);

    const categoryTrends = Array.from(allCategories)
      .map(category => {
        const thisWeek = thisWeekCategories[category] || 0;
        const lastWeek = lastWeekCategories[category] || 0;
        let percentChange = 0;
        if (lastWeek > 0) {
          percentChange = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
        } else if (thisWeek > 0) {
          percentChange = 100; // New category this week
        }
        return {category, thisWeek, lastWeek, percentChange};
      })
      .filter(t => t.thisWeek > 0 || t.lastWeek > 0)
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 5);

    // Rising brands (brands with increased saves this week vs last week)
    const thisWeekBrands: Record<string, number> = {};
    const lastWeekBrands: Record<string, number> = {};

    thisWeekBookmarks.forEach(b => {
      if (b.brand) {
        thisWeekBrands[b.brand] = (thisWeekBrands[b.brand] || 0) + 1;
      }
    });

    lastWeekBookmarks.forEach(b => {
      if (b.brand) {
        lastWeekBrands[b.brand] = (lastWeekBrands[b.brand] || 0) + 1;
      }
    });

    const allBrands = new Set([
      ...Object.keys(thisWeekBrands),
      ...Object.keys(lastWeekBrands),
    ]);

    const risingBrands = Array.from(allBrands)
      .map(brand => {
        const thisWeek = thisWeekBrands[brand] || 0;
        const lastWeek = lastWeekBrands[brand] || 0;
        let percentChange = 0;
        if (lastWeek > 0) {
          percentChange = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
        } else if (thisWeek > 0) {
          percentChange = 100; // New brand this week
        }
        return {brand, thisWeek, lastWeek, percentChange};
      })
      .filter(b => b.percentChange > 0 && b.thisWeek > 0)
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 5);

    return {
      mostSavedItems,
      categoryTrends,
      risingBrands,
      hasData: bookmarks.length > 0,
    };
  }, [bookmarks]);

  // Calculate spending insights from cartHistory (read-only)
  const spendingInsights = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get all checkout_complete events with their values
    const completedPurchases: {value: number; timestamp: number}[] = [];

    cartHistory.forEach(cart => {
      cart.events.forEach(event => {
        if (event.type === 'checkout_complete' && event.cartValue) {
          completedPurchases.push({
            value: event.cartValue,
            timestamp: event.timestamp,
          });
        }
      });
    });

    // Filter to this month's purchases
    const thisMonthPurchases = completedPurchases.filter(p => {
      const date = new Date(p.timestamp);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Calculate totals
    const spentThisMonth = thisMonthPurchases.reduce((sum, p) => sum + p.value, 0);
    const totalAllTime = completedPurchases.reduce((sum, p) => sum + p.value, 0);
    const purchaseCount = thisMonthPurchases.length;

    return {
      spentThisMonth: Math.round(spentThisMonth),
      totalAllTime: Math.round(totalAllTime),
      purchaseCount,
      hasPurchases: completedPurchases.length > 0,
    };
  }, [cartHistory]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
      // borderBottomWidth: 1,
      // borderBottomColor: theme.colors.muted,
      marginTop: 60,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,

      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 1,
      justifyContent: 'space-between',
    },
    statCard: {
      width: (screenWidth - 48) / 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    statGradient: {
      borderRadius: 16,
      width: (screenWidth - 68) / 4,
      height: 90,
      overflow: 'hidden',
    },
    statIcon: {
      marginBottom: 2,
    },
    statValue: {
      fontSize: 18,
      fontWeight: tokens.fontWeight.bold,
      color: '#fff',
      marginBottom: 0,
      textAlign: 'center',
    },
    statLabel: {
      fontSize: 13,
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.medium,
      textAlign: 'center',
    },
    listCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.muted,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.muted,
    },
    listItemLast: {
      borderBottomWidth: 0,
    },
    listItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    listRank: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.foreground + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    listRankText: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.primary,
    },
    listItemName: {
      fontSize: 15,
      fontWeight: tokens.fontWeight.medium,
      color: theme.colors.foreground,
      flex: 1,
    },
    listItemValue: {
      fontSize: 14,
      color: theme.colors.foreground,
    },
    priceCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.muted,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    priceItem: {
      alignItems: 'center',
      flex: 1,
    },
    priceDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.muted,
    },
    priceValue: {
      fontSize: 22,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    priceLabel: {
      fontSize: 12,
      color: theme.colors.foreground,
    },
    activityContainer: {
      gap: 16,
    },
    activityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    activityTitle: {
      fontSize: 13,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    activityMetric: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.primary,
    },
    activityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 120,
      paddingTop: 20,
      gap: 4,
    },
    activityBar: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'flex-end',
    },
    activityBarContainer: {
      alignItems: 'center',
      width: '100%',
    },
    activityBarValue: {
      fontSize: 10,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    activityBarFill: {
      width: 20,
      borderRadius: 10,
      marginBottom: 8,
    },
    activityBarLabel: {
      fontSize: 11,
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.medium,
    },
    activityStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.muted,
    },
    activityStat: {
      flex: 1,
      alignItems: 'center',
    },
    activityStatValue: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.primary,
    },
    activityStatLabel: {
      fontSize: 11,
      color: theme.colors.foreground,
      marginTop: 4,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.foreground,
      marginTop: 12,
      textAlign: 'center',
    },
    tipCard: {
      backgroundColor: theme.colors.primary + '10',
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    tipIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      fontSize: 15,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    tipText: {
      fontSize: 13,
      color: theme.colors.foreground,
      lineHeight: 18,
    },
    // Trend Dashboard styles
    trendHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    trendHeaderIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    trendSectionTitle: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginTop: 16,
      marginBottom: 8,
    },
    trendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.muted,
    },
    trendItemLast: {
      borderBottomWidth: 0,
    },
    trendItemLeft: {
      flex: 1,
      marginRight: 12,
    },
    trendItemTitle: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.medium,
      color: theme.colors.foreground,
    },
    trendItemSubtitle: {
      fontSize: 12,
      color: theme.colors.foreground,
      marginTop: 2,
    },
    trendBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    trendBadgePositive: {
      backgroundColor: '#10b98120',
    },
    trendBadgeNegative: {
      backgroundColor: '#ef444420',
    },
    trendBadgeNeutral: {
      backgroundColor: theme.colors.muted,
    },
    trendBadgeText: {
      fontSize: 12,
      fontWeight: tokens.fontWeight.semiBold,
    },
    trendBadgeTextPositive: {
      color: '#10b981',
    },
    trendBadgeTextNegative: {
      color: '#ef4444',
    },
    trendBadgeTextNeutral: {
      color: theme.colors.foreground,
    },
    savedItemImage: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.colors.muted,
      marginRight: 12,
    },
    savedItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    // Spending Tracker styles
    spendingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.muted,
    },
    spendingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    spendingHeaderIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#10b98120',
      justifyContent: 'center',
      alignItems: 'center',
    },
    spendingHeaderTitle: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
    },
    spendingAmountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 12,
    },
    spendingAmountMain: {
      fontSize: 32,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
    },
    spendingAmountLabel: {
      fontSize: 12,
      color: theme.colors.foreground,
      marginTop: 4,
    },
    spendingProgressContainer: {
      height: 8,
      backgroundColor: theme.colors.muted,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 16,
    },
    spendingProgressBar: {
      height: '100%',
      borderRadius: 4,
    },
    spendingStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.muted,
    },
    spendingStat: {
      alignItems: 'center',
      flex: 1,
    },
    spendingStatValue: {
      fontSize: 18,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
    },
    spendingStatLabel: {
      fontSize: 11,
      color: theme.colors.foreground,
      marginTop: 4,
    },
  });

  const statCards = [
    {
      icon: 'bookmark',
      value: insights.totalBookmarks,
      label: 'Bookmarks',
      gradient: ['#6366f1', '#8b5cf6'],
    },
    {
      icon: 'folder',
      value: insights.totalCollections,
      label: 'Collections',
      gradient: ['#ec4899', '#f43f5e'],
    },
    {
      icon: 'visibility',
      value: insights.totalVisits,
      label: 'Store Visits',
      gradient: ['#14b8a6', '#06b6d4'],
    },
    {
      icon: 'search',
      value: insights.recentSearchCount,
      label: 'Searches',
      gradient: ['#f59e0b', '#f97316'],
    },
  ];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxActivity = Math.max(
    ...days.map(d => insights.activityByDay[d] || 0),
    1,
  );

  // Wait for store to hydrate before showing data
  if (!_hasHydrated) {
    return (
      <SafeAreaView
        style={[styles.container, {marginTop: 70}]}
        edges={['bottom']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <AppleTouchFeedback
              style={[styles.backButton, {padding: 8}]}
              onPress={() => navigate?.('ShoppingDashboard')}
              hapticStyle="impactLight">
              <MaterialIcons
                name="arrow-back-ios"
                size={24}
                color={theme.colors.foreground}
              />
            </AppleTouchFeedback>
            <Text style={[styles.headerTitle, {color: theme.colors.foreground}]}>
              Shopping Insights
            </Text>
            <View style={{width: 40}} />
          </View>
        </View>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{color: theme.colors.muted}}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, {marginTop: 70}]}
      edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Animatable.View
          animation="fadeInDown"
          duration={400}
          style={styles.headerRow}>
          <AppleTouchFeedback
            style={[styles.backButton, {padding: 8}]}
            onPress={() => navigate?.('ShoppingDashboard')}
            hapticStyle="impactLight">
            <MaterialIcons
              name="arrow-back-ios"
              size={24}
              color={theme.colors.foreground}
            />
          </AppleTouchFeedback>
          <Text style={styles.headerTitle}>Shopping Insights</Text>
        </Animatable.View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <Animatable.View
          animation="fadeInUp"
          duration={500}
          delay={100}
          style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            {statCards.map((stat, index) => (
              <Animatable.View
                key={stat.label}
                animation="fadeInUp"
                duration={500}
                delay={150 + index * 100}
                style={{alignItems: 'center'}}>
                <LinearGradient
                  colors={stat.gradient as [string, string]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.statGradient}>
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 1,
                      paddingHorizontal: 20,
                      paddingVertical: 20,
                    }}>
                    <MaterialIcons
                      name={stat.icon as any}
                      size={32}
                      color="#fff"
                      style={styles.statIcon}
                    />
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                </LinearGradient>
                <Text style={[styles.statLabel, {marginTop: 12}]}>
                  {stat.label}
                </Text>
              </Animatable.View>
            ))}
          </View>
        </Animatable.View>

        {/* Price Insights */}
        {insights.avgPrice > 0 && (
          <Animatable.View
            animation="fadeInUp"
            duration={500}
            delay={400}
            style={styles.section}>
            <Text style={styles.sectionTitle}>Price Range of Bookmarked Items</Text>
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.priceValue}>${insights.minPrice}</Text>
                  <Text style={styles.priceLabel}>Lowest</Text>
                </View>
                <View style={styles.priceDivider} />
                <View style={styles.priceItem}>
                  <Text style={styles.priceValue}>${insights.avgPrice}</Text>
                  <Text style={styles.priceLabel}>Average</Text>
                </View>
                <View style={styles.priceDivider} />
                <View style={styles.priceItem}>
                  <Text style={styles.priceValue}>${insights.maxPrice}</Text>
                  <Text style={styles.priceLabel}>Highest</Text>
                </View>
              </View>
            </View>
          </Animatable.View>
        )}

        {/* Spending Tracker */}
        <Animatable.View
          animation="fadeInUp"
          duration={500}
          delay={450}
          style={styles.section}>
          <Text style={styles.sectionTitle}>Spending Tracker</Text>
          <View style={styles.spendingCard}>
            <View style={styles.spendingHeader}>
              <View style={styles.spendingHeaderIcon}>
                <MaterialIcons
                  name="account-balance-wallet"
                  size={18}
                  color="#10b981"
                />
              </View>
              <Text style={styles.spendingHeaderTitle}>This Month</Text>
            </View>

            <View style={styles.spendingAmountRow}>
              <View>
                <Text style={styles.spendingAmountMain}>
                  ${spendingInsights.spentThisMonth}
                </Text>
                <Text style={styles.spendingAmountLabel}>
                  {monthlyBudget > 0
                    ? `of $${monthlyBudget} budget`
                    : 'spent'}
                </Text>
              </View>
              {monthlyBudget > 0 && (
                <View style={{alignItems: 'flex-end'}}>
                  <Text
                    style={[
                      styles.spendingStatValue,
                      {
                        color:
                          spendingInsights.spentThisMonth > monthlyBudget
                            ? '#ef4444'
                            : spendingInsights.spentThisMonth > monthlyBudget * 0.8
                              ? '#f59e0b'
                              : '#10b981',
                      },
                    ]}>
                    ${Math.max(0, monthlyBudget - spendingInsights.spentThisMonth)}
                  </Text>
                  <Text style={styles.spendingAmountLabel}>remaining</Text>
                </View>
              )}
            </View>

            {/* Budget Progress Bar */}
            {monthlyBudget > 0 && (
              <View style={styles.spendingProgressContainer}>
                <View
                  style={[
                    styles.spendingProgressBar,
                    {
                      width: `${Math.min(
                        (spendingInsights.spentThisMonth / monthlyBudget) * 100,
                        100,
                      )}%`,
                      backgroundColor:
                        spendingInsights.spentThisMonth > monthlyBudget
                          ? '#ef4444'
                          : spendingInsights.spentThisMonth > monthlyBudget * 0.8
                            ? '#f59e0b'
                            : '#10b981',
                    },
                  ]}
                />
              </View>
            )}

            {/* Budget Alert */}
            {monthlyBudget > 0 && spendingInsights.spentThisMonth > monthlyBudget * 0.8 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor:
                    spendingInsights.spentThisMonth > monthlyBudget
                      ? '#ef444420'
                      : '#f59e0b20',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 12,
                  gap: 8,
                }}>
                <MaterialIcons
                  name={
                    spendingInsights.spentThisMonth > monthlyBudget
                      ? 'error'
                      : 'warning'
                  }
                  size={18}
                  color={
                    spendingInsights.spentThisMonth > monthlyBudget
                      ? '#ef4444'
                      : '#f59e0b'
                  }
                />
                <Text
                  style={{
                    fontSize: 13,
                    color:
                      spendingInsights.spentThisMonth > monthlyBudget
                        ? '#ef4444'
                        : '#f59e0b',
                    flex: 1,
                  }}>
                  {spendingInsights.spentThisMonth > monthlyBudget
                    ? `You've exceeded your budget by $${spendingInsights.spentThisMonth - monthlyBudget}`
                    : `You're at ${Math.round((spendingInsights.spentThisMonth / monthlyBudget) * 100)}% of your budget`}
                </Text>
              </View>
            )}

            {/* No budget set prompt */}
            {monthlyBudget === 0 && (
              <AppleTouchFeedback
                onPress={() => navigate?.('BudgetAndBrandsScreen')}
                hapticStyle="impactLight">
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.primary + '15',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 12,
                    gap: 8,
                  }}>
                  <MaterialIcons
                    name="add-circle-outline"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.colors.primary,
                      flex: 1,
                    }}>
                    Set a monthly budget to track your spending
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
              </AppleTouchFeedback>
            )}

            <View style={styles.spendingStatsRow}>
              <View style={styles.spendingStat}>
                <Text style={styles.spendingStatValue}>
                  {spendingInsights.purchaseCount}
                </Text>
                <Text style={styles.spendingStatLabel}>Purchases</Text>
              </View>
              <View style={styles.spendingStat}>
                <Text style={styles.spendingStatValue}>
                  ${spendingInsights.totalAllTime}
                </Text>
                <Text style={styles.spendingStatLabel}>All Time</Text>
              </View>
              <View style={styles.spendingStat}>
                <Text style={styles.spendingStatValue}>
                  {insights.totalBookmarks}
                </Text>
                <Text style={styles.spendingStatLabel}>Wishlisted</Text>
              </View>
            </View>

            {/* Reset Spending Data */}
            {(spendingInsights.spentThisMonth > 0 || spendingInsights.totalAllTime > 0) && (
              <AppleTouchFeedback
                onPress={() => clearCartHistory()}
                hapticStyle="impactLight"
                style={{marginTop: 12}}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                  }}>
                  <MaterialIcons
                    name="refresh"
                    size={16}
                    color={theme.colors.foreground + '80'}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.colors.foreground + '80',
                      marginLeft: 4,
                    }}>
                    Reset Spending Data
                  </Text>
                </View>
              </AppleTouchFeedback>
            )}
          </View>
        </Animatable.View>

        {/* Weekly Activity */}
        <Animatable.View
          animation="fadeInUp"
          duration={500}
          delay={550}
          style={styles.section}>
          <View style={styles.activityHeader}>
            <View style={{}}>
              <Text style={styles.sectionTitle}>Weekly Activity</Text>
            </View>
          </View>
          <View style={styles.listCard}>
            <View style={styles.activityContainer}>
              <View style={{}}>
                <View
                  style={{...styles.activityHeader, justifyContent: 'center'}}>
                  <Text style={{color: theme.colors.foreground}}>
                    Pages Visited
                  </Text>
                </View>
                <View style={styles.activityRow}>
                  {days.map(day => {
                    const count = insights.activityByDay[day] || 0;
                    const height =
                      count > 0 ? (count / maxActivity) * 60 + 10 : 10;
                    return (
                      <View key={day} style={styles.activityBar}>
                        <View style={styles.activityBarContainer}>
                          {count > 0 && (
                            <Text style={styles.activityBarValue}>{count}</Text>
                          )}
                          <View
                            style={[
                              styles.activityBarFill,
                              {
                                height,
                                backgroundColor:
                                  count > 0
                                    ? theme.colors.primary
                                    : theme.colors.muted,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.activityBarLabel}>{day}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Activity Stats Summary */}

              <View style={styles.activityStats}>
                <View style={styles.activityStat}>
                  <Text style={styles.activityStatValue}>
                    {insights.totalVisits}
                  </Text>
                  <Text style={styles.activityStatLabel}>Total Visits</Text>
                </View>
                <View style={styles.activityStat}>
                  <Text style={styles.activityStatValue}>
                    {Math.ceil(insights.totalVisits / insights.activeDays)}
                  </Text>
                  <Text style={styles.activityStatLabel}>Daily Avg</Text>
                </View>
                <View style={styles.activityStat}>
                  <Text style={styles.activityStatValue}>
                    {Math.max(...days.map(d => insights.activityByDay[d] || 0))}
                  </Text>
                  <Text style={styles.activityStatLabel}>Peak Day</Text>
                </View>
              </View>
            </View>
          </View>
        </Animatable.View>

        {/* Top Stores */}
        <Animatable.View
          animation="fadeInUp"
          duration={500}
          delay={600}
          style={styles.section}>
          <Text style={styles.sectionTitle}>Top Sites Visited</Text>
          <View style={styles.listCard}>
            {insights.topStores.length > 0 ? (
              insights.topStores.map(([store, visits], index) => (
                <View
                  key={store}
                  style={[
                    styles.listItem,
                    index === insights.topStores.length - 1 &&
                      styles.listItemLast,
                  ]}>
                  <View style={styles.listItemLeft}>
                    <View style={styles.listRank}>
                      <Text style={styles.listRankText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.listItemName}>{store}</Text>
                  </View>
                  <Text style={styles.listItemValue}>{visits} visits</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="store"
                  size={40}
                  color={theme.colors.foreground}
                />
                <Text style={styles.emptyText}>
                  Start browsing stores to see your top visits
                </Text>
              </View>
            )}
          </View>
        </Animatable.View>

        {/* Top Brands */}
        {insights.topBrands.length > 0 && (
          <Animatable.View
            animation="fadeInUp"
            duration={500}
            delay={700}
            style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Brands Visited</Text>
            <View style={styles.listCard}>
              {insights.topBrands.map(([brand, count], index) => (
                <View
                  key={brand}
                  style={[
                    styles.listItem,
                    index === insights.topBrands.length - 1 &&
                      styles.listItemLast,
                  ]}>
                  <View style={styles.listItemLeft}>
                    <View style={styles.listRank}>
                      <Text style={styles.listRankText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.listItemName}>{brand}</Text>
                  </View>
                  <Text style={styles.listItemValue}>{count} items</Text>
                </View>
              ))}
            </View>
          </Animatable.View>
        )}

        {/* Trend Dashboard */}
        {trendInsights.hasData && (
          <Animatable.View
            animation="fadeInUp"
            duration={500}
            delay={750}
            style={styles.section}>
            <View style={styles.trendHeader}>
              <View style={styles.trendHeaderIcon}>
                <MaterialIcons
                  name="trending-up"
                  size={18}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.sectionTitle}>Trend Dashboard</Text>
            </View>
            <View style={styles.listCard}>
              {/* Most Saved Items */}
              {trendInsights.mostSavedItems.length > 0 && (
                <>
                  <Text style={[styles.trendSectionTitle, {marginTop: 0}]}>
                    What's Trending Now
                  </Text>
                  {trendInsights.mostSavedItems.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.trendItem,
                        index === trendInsights.mostSavedItems.length - 1 &&
                          trendInsights.categoryTrends.length === 0 &&
                          trendInsights.risingBrands.length === 0 &&
                          styles.trendItemLast,
                      ]}>
                      <View style={styles.savedItemRow}>
                        {item.imageUrl && (
                          <View
                            style={[
                              styles.savedItemImage,
                              {overflow: 'hidden'},
                            ]}>
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                backgroundColor: theme.colors.muted,
                              }}
                            />
                          </View>
                        )}
                        <View style={styles.trendItemLeft}>
                          <Text
                            style={styles.trendItemTitle}
                            numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.trendItemSubtitle}>
                            {item.brand || item.source}
                            {item.price ? ` · $${item.price}` : ''}
                          </Text>
                        </View>
                      </View>
                      {(item.viewCount ?? 0) > 1 && (
                        <View
                          style={[styles.trendBadge, styles.trendBadgeNeutral]}>
                          <MaterialIcons
                            name="visibility"
                            size={12}
                            color={theme.colors.foreground}
                          />
                          <Text
                            style={[
                              styles.trendBadgeText,
                              styles.trendBadgeTextNeutral,
                            ]}>
                            {item.viewCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}

              {/* Category Trends */}
              {trendInsights.categoryTrends.length > 0 && (
                <>
                  <Text style={styles.trendSectionTitle}>Category Trends</Text>
                  {trendInsights.categoryTrends.map((trend, index) => (
                    <View
                      key={trend.category}
                      style={[
                        styles.trendItem,
                        index === trendInsights.categoryTrends.length - 1 &&
                          trendInsights.risingBrands.length === 0 &&
                          styles.trendItemLast,
                      ]}>
                      <View style={styles.trendItemLeft}>
                        <Text style={styles.trendItemTitle}>
                          {trend.category}
                        </Text>
                        <Text style={styles.trendItemSubtitle}>
                          {trend.thisWeek} saved this week
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.trendBadge,
                          trend.percentChange > 0
                            ? styles.trendBadgePositive
                            : trend.percentChange < 0
                              ? styles.trendBadgeNegative
                              : styles.trendBadgeNeutral,
                        ]}>
                        <MaterialIcons
                          name={
                            trend.percentChange > 0
                              ? 'trending-up'
                              : trend.percentChange < 0
                                ? 'trending-down'
                                : 'trending-flat'
                          }
                          size={12}
                          color={
                            trend.percentChange > 0
                              ? '#10b981'
                              : trend.percentChange < 0
                                ? '#ef4444'
                                : theme.colors.foreground
                          }
                        />
                        <Text
                          style={[
                            styles.trendBadgeText,
                            trend.percentChange > 0
                              ? styles.trendBadgeTextPositive
                              : trend.percentChange < 0
                                ? styles.trendBadgeTextNegative
                                : styles.trendBadgeTextNeutral,
                          ]}>
                          {trend.percentChange > 0 ? '+' : ''}
                          {trend.percentChange}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Rising Brands */}
              {trendInsights.risingBrands.length > 0 && (
                <>
                  <Text style={styles.trendSectionTitle}>Rising Brands</Text>
                  {trendInsights.risingBrands.map((brand, index) => (
                    <View
                      key={brand.brand}
                      style={[
                        styles.trendItem,
                        index === trendInsights.risingBrands.length - 1 &&
                          styles.trendItemLast,
                      ]}>
                      <View style={styles.trendItemLeft}>
                        <Text style={styles.trendItemTitle}>{brand.brand}</Text>
                        <Text style={styles.trendItemSubtitle}>
                          {brand.thisWeek} saved this week
                        </Text>
                      </View>
                      <View
                        style={[styles.trendBadge, styles.trendBadgePositive]}>
                        <MaterialIcons
                          name="trending-up"
                          size={12}
                          color="#10b981"
                        />
                        <Text
                          style={[
                            styles.trendBadgeText,
                            styles.trendBadgeTextPositive,
                          ]}>
                          +{brand.percentChange}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Empty state for trends */}
              {trendInsights.mostSavedItems.length === 0 &&
                trendInsights.categoryTrends.length === 0 &&
                trendInsights.risingBrands.length === 0 && (
                  <View style={styles.emptyState}>
                    <MaterialIcons
                      name="trending-up"
                      size={40}
                      color={theme.colors.foreground}
                    />
                    <Text style={styles.emptyText}>
                      Save more items to see your shopping trends
                    </Text>
                  </View>
                )}
            </View>
          </Animatable.View>
        )}

        {/* Smart Tip */}
        <Animatable.View
          animation="fadeInUp"
          duration={500}
          delay={850}
          style={styles.section}>
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <MaterialIcons
                name="lightbulb"
                size={24}
                color={theme.colors.foreground}
              />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Shopping Tip</Text>
              <Text style={styles.tipText}>
                {insights.totalBookmarks > 10
                  ? 'Organize your saved items into collections to keep track of different styles or occasions.'
                  : 'Start saving items you love by tapping the bookmark icon while browsing stores.'}
              </Text>
            </View>
          </View>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/////////////////

// import React, {useMemo} from 'react';
// import {View, Text, StyleSheet, ScrollView, Dimensions} from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const {width: screenWidth} = Dimensions.get('window');

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
// };

// export default function ShoppingInsightsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {
//     bookmarks,
//     history,
//     collections,
//     recentSearches,
//     getTopShops,
//     getMostVisitedSites,
//   } = useShoppingStore();

//   // Calculate insights
//   const insights = useMemo(() => {
//     // Most visited stores - use helper function
//     const topStores = getTopShops(5).map(
//       shop => [shop.source, shop.visits] as [string, number],
//     );

//     // Price insights from bookmarks
//     const prices = bookmarks.filter(b => b.price).map(b => b.price as number);
//     const avgPrice =
//       prices.length > 0
//         ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
//         : 0;
//     const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
//     const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

//     // Brand distribution
//     const brandCounts: Record<string, number> = {};
//     bookmarks.forEach(b => {
//       if (b.brand) {
//         brandCounts[b.brand] = (brandCounts[b.brand] || 0) + 1;
//       }
//     });
//     const topBrands = Object.entries(brandCounts)
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 5);

//     // Shopping activity by day (last 7 days)
//     const now = Date.now();
//     const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
//     const recentActivity = history.filter(h => h.visitedAt > weekAgo);
//     const activityByDay: Record<string, number> = {};
//     recentActivity.forEach(h => {
//       const day = new Date(h.visitedAt).toLocaleDateString('en-US', {
//         weekday: 'short',
//       });
//       activityByDay[day] = (activityByDay[day] || 0) + 1;
//     });

//     // Total items in collections
//     const totalCollectionItems = collections.reduce(
//       (sum, c) => sum + c.items.length,
//       0,
//     );

//     return {
//       topStores,
//       avgPrice,
//       maxPrice,
//       minPrice,
//       topBrands,
//       activityByDay,
//       totalBookmarks: bookmarks.length,
//       totalCollections: collections.length,
//       totalCollectionItems,
//       totalVisits: history.reduce((sum, h) => sum + h.visitCount, 0),
//       recentSearchCount: recentSearches.length,
//     };
//   }, [bookmarks, history, collections, recentSearches, getTopShops]);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.surface,
//       // borderBottomWidth: 1,
//       // borderBottomColor: theme.colors.muted,
//       marginTop: 60,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,

//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     headerTitle: {
//       fontSize: 24,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     scrollContent: {
//       padding: 16,
//       paddingBottom: 100,
//     },
//     section: {
//       marginBottom: 24,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     statsGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 1,
//       justifyContent: 'space-between',
//     },
//     statCard: {
//       width: (screenWidth - 48) / 2,
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       position: 'relative',
//     },
//     statGradient: {
//       borderRadius: 16,
//       width: (screenWidth - 68) / 4,
//       height: 90,
//       overflow: 'hidden',
//     },
//     statIcon: {
//       marginBottom: 2,
//     },
//     statValue: {
//       fontSize: 18,
//       fontWeight: tokens.fontWeight.bold,
//       color: '#fff',
//       marginBottom: 0,
//       textAlign: 'center',
//     },
//     statLabel: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.medium,
//       textAlign: 'center',
//     },
//     listCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       borderWidth: 1,
//       borderColor: theme.colors.muted,
//     },
//     listItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingVertical: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.muted,
//     },
//     listItemLast: {
//       borderBottomWidth: 0,
//     },
//     listItemLeft: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//       flex: 1,
//     },
//     listRank: {
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       backgroundColor: theme.colors.foreground + '20',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     listRankText: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.primary,
//     },
//     listItemName: {
//       fontSize: 15,
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.foreground,
//       flex: 1,
//     },
//     listItemValue: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//     },
//     priceCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 20,
//       borderWidth: 1,
//       borderColor: theme.colors.muted,
//     },
//     priceRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     priceItem: {
//       alignItems: 'center',
//       flex: 1,
//     },
//     priceDivider: {
//       width: 1,
//       height: 40,
//       backgroundColor: theme.colors.muted,
//     },
//     priceValue: {
//       fontSize: 22,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     priceLabel: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//     },
//     activityRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-end',
//       height: 100,
//       paddingTop: 20,
//     },
//     activityBar: {
//       alignItems: 'center',
//       flex: 1,
//     },
//     activityBarFill: {
//       width: 24,
//       borderRadius: 12,
//       marginBottom: 8,
//     },
//     activityBarLabel: {
//       fontSize: 11,
//       color: theme.colors.foreground,
//     },
//     emptyState: {
//       alignItems: 'center',
//       paddingVertical: 32,
//     },
//     emptyText: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//       marginTop: 12,
//       textAlign: 'center',
//     },
//     tipCard: {
//       backgroundColor: theme.colors.primary + '10',
//       borderRadius: 16,
//       padding: 16,
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },
//     tipIcon: {
//       width: 44,
//       height: 44,
//       borderRadius: 22,
//       backgroundColor: theme.colors.primary + '20',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     tipContent: {
//       flex: 1,
//     },
//     tipTitle: {
//       fontSize: 15,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     tipText: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       lineHeight: 18,
//     },
//   });

//   const statCards = [
//     {
//       icon: 'bookmark',
//       value: insights.totalBookmarks,
//       label: 'Saved Items',
//       gradient: ['#6366f1', '#8b5cf6'],
//     },
//     {
//       icon: 'folder',
//       value: insights.totalCollections,
//       label: 'Collections',
//       gradient: ['#ec4899', '#f43f5e'],
//     },
//     {
//       icon: 'visibility',
//       value: insights.totalVisits,
//       label: 'Store Visits',
//       gradient: ['#14b8a6', '#06b6d4'],
//     },
//     {
//       icon: 'search',
//       value: insights.recentSearchCount,
//       label: 'Searches',
//       gradient: ['#f59e0b', '#f97316'],
//     },
//   ];

//   const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//   const maxActivity = Math.max(
//     ...days.map(d => insights.activityByDay[d] || 0),
//     1,
//   );

//   return (
//     <SafeAreaView
//       style={[styles.container, {marginTop: 70}]}
//       edges={['bottom']}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Animatable.View
//           animation="fadeInDown"
//           duration={400}
//           style={styles.headerRow}>
//           <AppleTouchFeedback
//             style={[styles.backButton, {padding: 8}]}
//             onPress={() => navigate?.('ShoppingDashboard')}
//             hapticStyle="impactLight">
//             <MaterialIcons
//               name="arrow-back-ios"
//               size={24}
//               color={theme.colors.foreground}
//             />
//           </AppleTouchFeedback>
//           <Text style={styles.headerTitle}>Shopping Insights</Text>
//         </Animatable.View>
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {/* Stats Grid */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={100}
//           style={styles.section}>
//           <Text style={styles.sectionTitle}>Overview</Text>
//           <View style={styles.statsGrid}>
//             {statCards.map((stat, index) => (
//               <Animatable.View
//                 key={stat.label}
//                 animation="fadeInUp"
//                 duration={500}
//                 delay={150 + index * 100}
//                 style={{alignItems: 'center'}}>
//                 <LinearGradient
//                   colors={stat.gradient as [string, string]}
//                   start={{x: 0, y: 0}}
//                   end={{x: 1, y: 1}}
//                   style={styles.statGradient}>
//                   <View
//                     style={{
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                       flex: 1,
//                       paddingHorizontal: 20,
//                       paddingVertical: 20,
//                     }}>
//                     <MaterialIcons
//                       name={stat.icon as any}
//                       size={32}
//                       color="#fff"
//                       style={styles.statIcon}
//                     />
//                     <Text style={styles.statValue}>{stat.value}</Text>
//                   </View>
//                 </LinearGradient>
//                 <Text style={[styles.statLabel, {marginTop: 12}]}>
//                   {stat.label}
//                 </Text>
//               </Animatable.View>
//             ))}
//           </View>
//         </Animatable.View>

//         {/* Price Insights */}
//         {insights.avgPrice > 0 && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={500}
//             delay={400}
//             style={styles.section}>
//             <Text style={styles.sectionTitle}>Price Range</Text>
//             <View style={styles.priceCard}>
//               <View style={styles.priceRow}>
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.minPrice}</Text>
//                   <Text style={styles.priceLabel}>Lowest</Text>
//                 </View>
//                 <View style={styles.priceDivider} />
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.avgPrice}</Text>
//                   <Text style={styles.priceLabel}>Average</Text>
//                 </View>
//                 <View style={styles.priceDivider} />
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.maxPrice}</Text>
//                   <Text style={styles.priceLabel}>Highest</Text>
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Weekly Activity */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={500}
//           style={styles.section}>
//           <Text style={styles.sectionTitle}>Weekly Activity</Text>
//           <View style={styles.listCard}>
//             <View style={styles.activityRow}>
//               {days.map(day => {
//                 const count = insights.activityByDay[day] || 0;
//                 const height = count > 0 ? (count / maxActivity) * 60 + 10 : 10;
//                 return (
//                   <View key={day} style={styles.activityBar}>
//                     <View
//                       style={[
//                         styles.activityBarFill,
//                         {
//                           height,
//                           backgroundColor:
//                             count > 0
//                               ? theme.colors.primary
//                               : theme.colors.border,
//                         },
//                       ]}
//                     />
//                     <Text style={styles.activityBarLabel}>{day}</Text>
//                   </View>
//                 );
//               })}
//             </View>
//           </View>
//         </Animatable.View>

//         {/* Top Stores */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={600}
//           style={styles.section}>
//           <Text style={styles.sectionTitle}>Top Stores</Text>
//           <View style={styles.listCard}>
//             {insights.topStores.length > 0 ? (
//               insights.topStores.map(([store, visits], index) => (
//                 <View
//                   key={store}
//                   style={[
//                     styles.listItem,
//                     index === insights.topStores.length - 1 &&
//                       styles.listItemLast,
//                   ]}>
//                   <View style={styles.listItemLeft}>
//                     <View style={styles.listRank}>
//                       <Text style={styles.listRankText}>{index + 1}</Text>
//                     </View>
//                     <Text style={styles.listItemName}>{store}</Text>
//                   </View>
//                   <Text style={styles.listItemValue}>{visits} visits</Text>
//                 </View>
//               ))
//             ) : (
//               <View style={styles.emptyState}>
//                 <MaterialIcons
//                   name="store"
//                   size={40}
//                   color={theme.colors.foreground}
//                 />
//                 <Text style={styles.emptyText}>
//                   Start browsing stores to see your top visits
//                 </Text>
//               </View>
//             )}
//           </View>
//         </Animatable.View>

//         {/* Top Brands */}
//         {insights.topBrands.length > 0 && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={500}
//             delay={700}
//             style={styles.section}>
//             <Text style={styles.sectionTitle}>Favorite Brands</Text>
//             <View style={styles.listCard}>
//               {insights.topBrands.map(([brand, count], index) => (
//                 <View
//                   key={brand}
//                   style={[
//                     styles.listItem,
//                     index === insights.topBrands.length - 1 &&
//                       styles.listItemLast,
//                   ]}>
//                   <View style={styles.listItemLeft}>
//                     <View style={styles.listRank}>
//                       <Text style={styles.listRankText}>{index + 1}</Text>
//                     </View>
//                     <Text style={styles.listItemName}>{brand}</Text>
//                   </View>
//                   <Text style={styles.listItemValue}>{count} items</Text>
//                 </View>
//               ))}
//             </View>
//           </Animatable.View>
//         )}

//         {/* Smart Tip */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={800}
//           style={styles.section}>
//           <View style={styles.tipCard}>
//             <View style={styles.tipIcon}>
//               <MaterialIcons
//                 name="lightbulb"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//             <View style={styles.tipContent}>
//               <Text style={styles.tipTitle}>Shopping Tip</Text>
//               <Text style={styles.tipText}>
//                 {insights.totalBookmarks > 10
//                   ? 'Organize your saved items into collections to keep track of different styles or occasions.'
//                   : 'Start saving items you love by tapping the bookmark icon while browsing stores.'}
//               </Text>
//             </View>
//           </View>
//         </Animatable.View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

///////////////////

// import React, {useMemo} from 'react';
// import {View, Text, StyleSheet, ScrollView, Dimensions} from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const {width: screenWidth} = Dimensions.get('window');

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
// };

// export default function ShoppingInsightsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {
//     bookmarks,
//     history,
//     collections,
//     recentSearches,
//     getTopShops,
//     getMostVisitedSites,
//   } = useShoppingStore();

//   // Calculate insights
//   const insights = useMemo(() => {
//     // Most visited stores - use helper function
//     const topStores = getTopShops(5).map(
//       shop => [shop.source, shop.visits] as [string, number],
//     );

//     // Price insights from bookmarks
//     const prices = bookmarks.filter(b => b.price).map(b => b.price as number);
//     const avgPrice =
//       prices.length > 0
//         ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
//         : 0;
//     const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
//     const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

//     // Brand distribution
//     const brandCounts: Record<string, number> = {};
//     bookmarks.forEach(b => {
//       if (b.brand) {
//         brandCounts[b.brand] = (brandCounts[b.brand] || 0) + 1;
//       }
//     });
//     const topBrands = Object.entries(brandCounts)
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 5);

//     // Shopping activity by day (last 7 days)
//     const now = Date.now();
//     const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
//     const recentActivity = history.filter(h => h.visitedAt > weekAgo);
//     const activityByDay: Record<string, number> = {};
//     recentActivity.forEach(h => {
//       const day = new Date(h.visitedAt).toLocaleDateString('en-US', {
//         weekday: 'short',
//       });
//       activityByDay[day] = (activityByDay[day] || 0) + 1;
//     });

//     // Total items in collections
//     const totalCollectionItems = collections.reduce(
//       (sum, c) => sum + c.items.length,
//       0,
//     );

//     return {
//       topStores,
//       avgPrice,
//       maxPrice,
//       minPrice,
//       topBrands,
//       activityByDay,
//       totalBookmarks: bookmarks.length,
//       totalCollections: collections.length,
//       totalCollectionItems,
//       totalVisits: history.reduce((sum, h) => sum + h.visitCount, 0),
//       recentSearchCount: recentSearches.length,
//     };
//   }, [bookmarks, history, collections, recentSearches, getTopShops]);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.surface,
//       // borderBottomWidth: 1,
//       // borderBottomColor: theme.colors.muted,
//       marginTop: 60,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     headerTitle: {
//       fontSize: 24,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     scrollContent: {
//       padding: 16,
//       paddingBottom: 100,
//     },
//     section: {
//       marginBottom: 24,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     statsGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 1,
//       justifyContent: 'space-between',
//     },
//     statCard: {
//       width: (screenWidth - 48) / 2,
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       position: 'relative',
//     },
//     statGradient: {
//       borderRadius: 16,
//       width: (screenWidth - 68) / 4,
//       height: 90,
//       overflow: 'hidden',
//     },
//     statIcon: {
//       marginBottom: 2,
//     },
//     statValue: {
//       fontSize: 18,
//       fontWeight: tokens.fontWeight.bold,
//       color: '#fff',
//       marginBottom: 0,
//       textAlign: 'center',
//     },
//     statLabel: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.medium,
//       textAlign: 'center',
//     },
//     listCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       borderWidth: 1,
//       borderColor: theme.colors.muted,
//     },
//     listItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingVertical: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.muted,
//     },
//     listItemLast: {
//       borderBottomWidth: 0,
//     },
//     listItemLeft: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//       flex: 1,
//     },
//     listRank: {
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       backgroundColor: theme.colors.foreground + '20',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     listRankText: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.primary,
//     },
//     listItemName: {
//       fontSize: 15,
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.foreground,
//       flex: 1,
//     },
//     listItemValue: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//     },
//     priceCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 20,
//       borderWidth: 1,
//       borderColor: theme.colors.muted,
//     },
//     priceRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     priceItem: {
//       alignItems: 'center',
//       flex: 1,
//     },
//     priceDivider: {
//       width: 1,
//       height: 40,
//       backgroundColor: theme.colors.muted,
//     },
//     priceValue: {
//       fontSize: 22,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     priceLabel: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//     },
//     activityRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-end',
//       height: 100,
//       paddingTop: 20,
//     },
//     activityBar: {
//       alignItems: 'center',
//       flex: 1,
//     },
//     activityBarFill: {
//       width: 24,
//       borderRadius: 12,
//       marginBottom: 8,
//     },
//     activityBarLabel: {
//       fontSize: 11,
//       color: theme.colors.foreground,
//     },
//     emptyState: {
//       alignItems: 'center',
//       paddingVertical: 32,
//     },
//     emptyText: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//       marginTop: 12,
//       textAlign: 'center',
//     },
//     tipCard: {
//       backgroundColor: theme.colors.primary + '10',
//       borderRadius: 16,
//       padding: 16,
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },
//     tipIcon: {
//       width: 44,
//       height: 44,
//       borderRadius: 22,
//       backgroundColor: theme.colors.primary + '20',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     tipContent: {
//       flex: 1,
//     },
//     tipTitle: {
//       fontSize: 15,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     tipText: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       lineHeight: 18,
//     },
//   });

//   const statCards = [
//     {
//       icon: 'bookmark',
//       value: insights.totalBookmarks,
//       label: 'Saved Items',
//       gradient: ['#6366f1', '#8b5cf6'],
//     },
//     {
//       icon: 'folder',
//       value: insights.totalCollections,
//       label: 'Collections',
//       gradient: ['#ec4899', '#f43f5e'],
//     },
//     {
//       icon: 'visibility',
//       value: insights.totalVisits,
//       label: 'Store Visits',
//       gradient: ['#14b8a6', '#06b6d4'],
//     },
//     {
//       icon: 'search',
//       value: insights.recentSearchCount,
//       label: 'Searches',
//       gradient: ['#f59e0b', '#f97316'],
//     },
//   ];

//   const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//   const maxActivity = Math.max(
//     ...days.map(d => insights.activityByDay[d] || 0),
//     1,
//   );

//   return (
//     <SafeAreaView
//       style={[styles.container, {marginTop: 70}]}
//       edges={['bottom']}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Animatable.View
//           animation="fadeInDown"
//           duration={400}
//           style={styles.headerRow}>
//           <AppleTouchFeedback
//             style={styles.backButton}
//             onPress={() => navigate?.('ShoppingDashboard')}
//             hapticStyle="impactLight">
//             <MaterialIcons
//               name="arrow-back"
//               size={24}
//               color={theme.colors.foreground}
//             />
//           </AppleTouchFeedback>
//           <Text style={styles.headerTitle}>Shopping Insights</Text>
//         </Animatable.View>
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {/* Stats Grid */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={100}
//           style={styles.section}>
//           <Text style={styles.sectionTitle}>Overview</Text>
//           <View style={styles.statsGrid}>
//             {statCards.map((stat, index) => (
//               <Animatable.View
//                 key={stat.label}
//                 animation="fadeInUp"
//                 duration={500}
//                 delay={150 + index * 100}
//                 style={{alignItems: 'center'}}>
//                 <LinearGradient
//                   colors={stat.gradient as [string, string]}
//                   start={{x: 0, y: 0}}
//                   end={{x: 1, y: 1}}
//                   style={styles.statGradient}>
//                   <View
//                     style={{
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                       flex: 1,
//                       paddingHorizontal: 20,
//                       paddingVertical: 20,
//                     }}>
//                     <MaterialIcons
//                       name={stat.icon as any}
//                       size={32}
//                       color="#fff"
//                       style={styles.statIcon}
//                     />
//                     <Text style={styles.statValue}>{stat.value}</Text>
//                   </View>
//                 </LinearGradient>
//                 <Text style={[styles.statLabel, {marginTop: 12}]}>
//                   {stat.label}
//                 </Text>
//               </Animatable.View>
//             ))}
//           </View>
//         </Animatable.View>

//         {/* Price Insights */}
//         {insights.avgPrice > 0 && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={500}
//             delay={400}
//             style={styles.section}>
//             <Text style={styles.sectionTitle}>Price Range</Text>
//             <View style={styles.priceCard}>
//               <View style={styles.priceRow}>
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.minPrice}</Text>
//                   <Text style={styles.priceLabel}>Lowest</Text>
//                 </View>
//                 <View style={styles.priceDivider} />
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.avgPrice}</Text>
//                   <Text style={styles.priceLabel}>Average</Text>
//                 </View>
//                 <View style={styles.priceDivider} />
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.maxPrice}</Text>
//                   <Text style={styles.priceLabel}>Highest</Text>
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Weekly Activity */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={500}
//           style={styles.section}>
//           <Text style={styles.sectionTitle}>Weekly Activity</Text>
//           <View style={styles.listCard}>
//             <View style={styles.activityRow}>
//               {days.map(day => {
//                 const count = insights.activityByDay[day] || 0;
//                 const height = count > 0 ? (count / maxActivity) * 60 + 10 : 10;
//                 return (
//                   <View key={day} style={styles.activityBar}>
//                     <View
//                       style={[
//                         styles.activityBarFill,
//                         {
//                           height,
//                           backgroundColor:
//                             count > 0
//                               ? theme.colors.primary
//                               : theme.colors.border,
//                         },
//                       ]}
//                     />
//                     <Text style={styles.activityBarLabel}>{day}</Text>
//                   </View>
//                 );
//               })}
//             </View>
//           </View>
//         </Animatable.View>

//         {/* Top Stores */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={600}
//           style={styles.section}>
//           <Text style={styles.sectionTitle}>Top Stores</Text>
//           <View style={styles.listCard}>
//             {insights.topStores.length > 0 ? (
//               insights.topStores.map(([store, visits], index) => (
//                 <View
//                   key={store}
//                   style={[
//                     styles.listItem,
//                     index === insights.topStores.length - 1 &&
//                       styles.listItemLast,
//                   ]}>
//                   <View style={styles.listItemLeft}>
//                     <View style={styles.listRank}>
//                       <Text style={styles.listRankText}>{index + 1}</Text>
//                     </View>
//                     <Text style={styles.listItemName}>{store}</Text>
//                   </View>
//                   <Text style={styles.listItemValue}>{visits} visits</Text>
//                 </View>
//               ))
//             ) : (
//               <View style={styles.emptyState}>
//                 <MaterialIcons
//                   name="store"
//                   size={40}
//                   color={theme.colors.foreground}
//                 />
//                 <Text style={styles.emptyText}>
//                   Start browsing stores to see your top visits
//                 </Text>
//               </View>
//             )}
//           </View>
//         </Animatable.View>

//         {/* Top Brands */}
//         {insights.topBrands.length > 0 && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={500}
//             delay={700}
//             style={styles.section}>
//             <Text style={styles.sectionTitle}>Favorite Brands</Text>
//             <View style={styles.listCard}>
//               {insights.topBrands.map(([brand, count], index) => (
//                 <View
//                   key={brand}
//                   style={[
//                     styles.listItem,
//                     index === insights.topBrands.length - 1 &&
//                       styles.listItemLast,
//                   ]}>
//                   <View style={styles.listItemLeft}>
//                     <View style={styles.listRank}>
//                       <Text style={styles.listRankText}>{index + 1}</Text>
//                     </View>
//                     <Text style={styles.listItemName}>{brand}</Text>
//                   </View>
//                   <Text style={styles.listItemValue}>{count} items</Text>
//                 </View>
//               ))}
//             </View>
//           </Animatable.View>
//         )}

//         {/* Smart Tip */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={800}
//           style={styles.section}>
//           <View style={styles.tipCard}>
//             <View style={styles.tipIcon}>
//               <MaterialIcons
//                 name="lightbulb"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//             <View style={styles.tipContent}>
//               <Text style={styles.tipTitle}>Shopping Tip</Text>
//               <Text style={styles.tipText}>
//                 {insights.totalBookmarks > 10
//                   ? 'Organize your saved items into collections to keep track of different styles or occasions.'
//                   : 'Start saving items you love by tapping the bookmark icon while browsing stores.'}
//               </Text>
//             </View>
//           </View>
//         </Animatable.View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

//////////////////////

// import React, {useMemo} from 'react';
// import {View, Text, StyleSheet, ScrollView, Dimensions} from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const {width: screenWidth} = Dimensions.get('window');

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
// };

// export default function ShoppingInsightsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {
//     bookmarks,
//     history,
//     collections,
//     recentSearches,
//     getTopShops,
//     getMostVisitedSites,
//   } = useShoppingStore();

//   // Calculate insights
//   const insights = useMemo(() => {
//     // Most visited stores - use helper function
//     const topStores = getTopShops(5).map(shop => [shop.source, shop.visits] as [string, number]);

//     // Price insights from bookmarks
//     const prices = bookmarks.filter(b => b.price).map(b => b.price as number);
//     const avgPrice =
//       prices.length > 0
//         ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
//         : 0;
//     const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
//     const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

//     // Brand distribution
//     const brandCounts: Record<string, number> = {};
//     bookmarks.forEach(b => {
//       if (b.brand) {
//         brandCounts[b.brand] = (brandCounts[b.brand] || 0) + 1;
//       }
//     });
//     const topBrands = Object.entries(brandCounts)
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 5);

//     // Shopping activity by day (last 7 days)
//     const now = Date.now();
//     const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
//     const recentActivity = history.filter(h => h.visitedAt > weekAgo);
//     const activityByDay: Record<string, number> = {};
//     recentActivity.forEach(h => {
//       const day = new Date(h.visitedAt).toLocaleDateString('en-US', {
//         weekday: 'short',
//       });
//       activityByDay[day] = (activityByDay[day] || 0) + 1;
//     });

//     // Total items in collections
//     const totalCollectionItems = collections.reduce(
//       (sum, c) => sum + c.items.length,
//       0,
//     );

//     return {
//       topStores,
//       avgPrice,
//       maxPrice,
//       minPrice,
//       topBrands,
//       activityByDay,
//       totalBookmarks: bookmarks.length,
//       totalCollections: collections.length,
//       totalCollectionItems,
//       totalVisits: history.reduce((sum, h) => sum + h.visitCount, 0),
//       recentSearchCount: recentSearches.length,
//     };
//   }, [bookmarks, history, collections, recentSearches, getTopShops]);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.surface,
//       // borderBottomWidth: 1,
//       // borderBottomColor: theme.colors.muted,
//       marginTop: 60,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     headerTitle: {
//       fontSize: 24,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     scrollContent: {
//       padding: 16,
//       paddingBottom: 100,
//     },
//     section: {
//       marginBottom: 24,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     statsGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 12,
//     },
//     statCard: {
//       width: (screenWidth - 44) / 2,
//       borderRadius: 16,
//       padding: 16,
//       overflow: 'hidden',
//     },
//     statGradient: {
//       borderRadius: 16,
//       padding: 16,
//     },
//     statIcon: {
//       marginBottom: 8,
//     },
//     statValue: {
//       fontSize: 28,
//       fontWeight: tokens.fontWeight.bold,
//       color: '#fff',
//       marginBottom: 4,
//     },
//     statLabel: {
//       fontSize: 13,
//       color: 'rgba(255,255,255,0.85)',
//     },
//     listCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       borderWidth: 1,
//       borderColor: theme.colors.muted,
//     },
//     listItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingVertical: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.muted,
//     },
//     listItemLast: {
//       borderBottomWidth: 0,
//     },
//     listItemLeft: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//       flex: 1,
//     },
//     listRank: {
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       backgroundColor: theme.colors.foreground + '20',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     listRankText: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.primary,
//     },
//     listItemName: {
//       fontSize: 15,
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.foreground,
//       flex: 1,
//     },
//     listItemValue: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//     },
//     priceCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 20,
//       borderWidth: 1,
//       borderColor: theme.colors.muted,
//     },
//     priceRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     priceItem: {
//       alignItems: 'center',
//       flex: 1,
//     },
//     priceDivider: {
//       width: 1,
//       height: 40,
//       backgroundColor: theme.colors.muted,
//     },
//     priceValue: {
//       fontSize: 22,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     priceLabel: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//     },
//     activityRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-end',
//       height: 100,
//       paddingTop: 20,
//     },
//     activityBar: {
//       alignItems: 'center',
//       flex: 1,
//     },
//     activityBarFill: {
//       width: 24,
//       borderRadius: 12,
//       marginBottom: 8,
//     },
//     activityBarLabel: {
//       fontSize: 11,
//       color: theme.colors.foreground,
//     },
//     emptyState: {
//       alignItems: 'center',
//       paddingVertical: 32,
//     },
//     emptyText: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//       marginTop: 12,
//       textAlign: 'center',
//     },
//     tipCard: {
//       backgroundColor: theme.colors.primary + '10',
//       borderRadius: 16,
//       padding: 16,
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },
//     tipIcon: {
//       width: 44,
//       height: 44,
//       borderRadius: 22,
//       backgroundColor: theme.colors.primary + '20',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     tipContent: {
//       flex: 1,
//     },
//     tipTitle: {
//       fontSize: 15,
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     tipText: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       lineHeight: 18,
//     },
//   });

//   const statCards = [
//     {
//       icon: 'bookmark',
//       value: insights.totalBookmarks,
//       label: 'Saved Items',
//       gradient: ['#6366f1', '#8b5cf6'],
//     },
//     {
//       icon: 'folder',
//       value: insights.totalCollections,
//       label: 'Collections',
//       gradient: ['#ec4899', '#f43f5e'],
//     },
//     {
//       icon: 'visibility',
//       value: insights.totalVisits,
//       label: 'Store Visits',
//       gradient: ['#14b8a6', '#06b6d4'],
//     },
//     {
//       icon: 'search',
//       value: insights.recentSearchCount,
//       label: 'Recent Searches',
//       gradient: ['#f59e0b', '#f97316'],
//     },
//   ];

//   const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//   const maxActivity = Math.max(
//     ...days.map(d => insights.activityByDay[d] || 0),
//     1,
//   );

//   return (
//     <SafeAreaView
//       style={[styles.container, {marginTop: 70}]}
//       edges={['bottom']}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Animatable.View
//           animation="fadeInDown"
//           duration={400}
//           style={styles.headerRow}>
//           <AppleTouchFeedback
//             style={styles.backButton}
//             onPress={() => navigate?.('ShoppingDashboard')}
//             hapticStyle="impactLight">
//             <MaterialIcons
//               name="arrow-back"
//               size={24}
//               color={theme.colors.foreground}
//             />
//           </AppleTouchFeedback>
//           <Text style={styles.headerTitle}>Shopping Insights</Text>
//         </Animatable.View>
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {/* Stats Grid */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={100}
//           style={styles.section}>
//           <Text style={styles.sectionTitle}>Overview</Text>
//           <View style={styles.statsGrid}>
//             {statCards.map((stat, index) => (
//               <Animatable.View
//                 key={stat.label}
//                 animation="fadeInUp"
//                 duration={500}
//                 delay={150 + index * 100}>
//                 <LinearGradient
//                   colors={stat.gradient as [string, string]}
//                   start={{x: 0, y: 0}}
//                   end={{x: 1, y: 1}}
//                   style={styles.statGradient}>
//                   <MaterialIcons
//                     name={stat.icon as any}
//                     size={28}
//                     color="#fff"
//                     style={styles.statIcon}
//                   />
//                   <Text style={styles.statValue}>{stat.value}</Text>
//                   <Text style={styles.statLabel}>{stat.label}</Text>
//                 </LinearGradient>
//               </Animatable.View>
//             ))}
//           </View>
//         </Animatable.View>

//         {/* Price Insights */}
//         {insights.avgPrice > 0 && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={500}
//             delay={400}
//             style={styles.section}>
//             <Text style={styles.sectionTitle}>Price Range</Text>
//             <View style={styles.priceCard}>
//               <View style={styles.priceRow}>
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.minPrice}</Text>
//                   <Text style={styles.priceLabel}>Lowest</Text>
//                 </View>
//                 <View style={styles.priceDivider} />
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.avgPrice}</Text>
//                   <Text style={styles.priceLabel}>Average</Text>
//                 </View>
//                 <View style={styles.priceDivider} />
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.maxPrice}</Text>
//                   <Text style={styles.priceLabel}>Highest</Text>
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Weekly Activity */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={500}
//           style={styles.section}>
//           <Text style={styles.sectionTitle}>Weekly Activity</Text>
//           <View style={styles.listCard}>
//             <View style={styles.activityRow}>
//               {days.map(day => {
//                 const count = insights.activityByDay[day] || 0;
//                 const height = count > 0 ? (count / maxActivity) * 60 + 10 : 10;
//                 return (
//                   <View key={day} style={styles.activityBar}>
//                     <View
//                       style={[
//                         styles.activityBarFill,
//                         {
//                           height,
//                           backgroundColor:
//                             count > 0
//                               ? theme.colors.primary
//                               : theme.colors.border,
//                         },
//                       ]}
//                     />
//                     <Text style={styles.activityBarLabel}>{day}</Text>
//                   </View>
//                 );
//               })}
//             </View>
//           </View>
//         </Animatable.View>

//         {/* Top Stores */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={600}
//           style={styles.section}>
//           <Text style={styles.sectionTitle}>Top Stores</Text>
//           <View style={styles.listCard}>
//             {insights.topStores.length > 0 ? (
//               insights.topStores.map(([store, visits], index) => (
//                 <View
//                   key={store}
//                   style={[
//                     styles.listItem,
//                     index === insights.topStores.length - 1 &&
//                       styles.listItemLast,
//                   ]}>
//                   <View style={styles.listItemLeft}>
//                     <View style={styles.listRank}>
//                       <Text style={styles.listRankText}>{index + 1}</Text>
//                     </View>
//                     <Text style={styles.listItemName}>{store}</Text>
//                   </View>
//                   <Text style={styles.listItemValue}>{visits} visits</Text>
//                 </View>
//               ))
//             ) : (
//               <View style={styles.emptyState}>
//                 <MaterialIcons
//                   name="store"
//                   size={40}
//                   color={theme.colors.foreground}
//                 />
//                 <Text style={styles.emptyText}>
//                   Start browsing stores to see your top visits
//                 </Text>
//               </View>
//             )}
//           </View>
//         </Animatable.View>

//         {/* Top Brands */}
//         {insights.topBrands.length > 0 && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={500}
//             delay={700}
//             style={styles.section}>
//             <Text style={styles.sectionTitle}>Favorite Brands</Text>
//             <View style={styles.listCard}>
//               {insights.topBrands.map(([brand, count], index) => (
//                 <View
//                   key={brand}
//                   style={[
//                     styles.listItem,
//                     index === insights.topBrands.length - 1 &&
//                       styles.listItemLast,
//                   ]}>
//                   <View style={styles.listItemLeft}>
//                     <View style={styles.listRank}>
//                       <Text style={styles.listRankText}>{index + 1}</Text>
//                     </View>
//                     <Text style={styles.listItemName}>{brand}</Text>
//                   </View>
//                   <Text style={styles.listItemValue}>{count} items</Text>
//                 </View>
//               ))}
//             </View>
//           </Animatable.View>
//         )}

//         {/* Smart Tip */}
//         <Animatable.View
//           animation="fadeInUp"
//           duration={500}
//           delay={800}
//           style={styles.section}>
//           <View style={styles.tipCard}>
//             <View style={styles.tipIcon}>
//               <MaterialIcons
//                 name="lightbulb"
//                 size={24}
//                 color={theme.colors.foreground}
//               />
//             </View>
//             <View style={styles.tipContent}>
//               <Text style={styles.tipTitle}>Shopping Tip</Text>
//               <Text style={styles.tipText}>
//                 {insights.totalBookmarks > 10
//                   ? 'Organize your saved items into collections to keep track of different styles or occasions.'
//                   : 'Start saving items you love by tapping the bookmark icon while browsing stores.'}
//               </Text>
//             </View>
//           </View>
//         </Animatable.View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

///////////////

// import React, {useMemo} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   Dimensions,
// } from 'react-native';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import {useAppTheme} from '../context/ThemeContext';
// import {useShoppingStore} from '../../../../store/shoppingStore';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// const {width: screenWidth} = Dimensions.get('window');

// type Props = {
//   navigate?: (screen: any, params?: any) => void;
// };

// export default function ShoppingInsightsScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {bookmarks, history, collections, recentSearches} = useShoppingStore();

//   // Calculate insights
//   const insights = useMemo(() => {
//     // Most visited stores
//     const storeVisits: Record<string, number> = {};
//     history.forEach(h => {
//       storeVisits[h.source] = (storeVisits[h.source] || 0) + h.visitCount;
//     });
//     const topStores = Object.entries(storeVisits)
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 5);

//     // Price insights from bookmarks
//     const prices = bookmarks.filter(b => b.price).map(b => b.price as number);
//     const avgPrice = prices.length > 0
//       ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
//       : 0;
//     const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
//     const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

//     // Brand distribution
//     const brandCounts: Record<string, number> = {};
//     bookmarks.forEach(b => {
//       if (b.brand) {
//         brandCounts[b.brand] = (brandCounts[b.brand] || 0) + 1;
//       }
//     });
//     const topBrands = Object.entries(brandCounts)
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 5);

//     // Shopping activity by day (last 7 days)
//     const now = Date.now();
//     const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
//     const recentActivity = history.filter(h => h.visitedAt > weekAgo);
//     const activityByDay: Record<string, number> = {};
//     recentActivity.forEach(h => {
//       const day = new Date(h.visitedAt).toLocaleDateString('en-US', {weekday: 'short'});
//       activityByDay[day] = (activityByDay[day] || 0) + 1;
//     });

//     // Total items in collections
//     const totalCollectionItems = collections.reduce(
//       (sum, c) => sum + c.items.length,
//       0,
//     );

//     return {
//       topStores,
//       avgPrice,
//       maxPrice,
//       minPrice,
//       topBrands,
//       activityByDay,
//       totalBookmarks: bookmarks.length,
//       totalCollections: collections.length,
//       totalCollectionItems,
//       totalVisits: history.reduce((sum, h) => sum + h.visitCount, 0),
//       recentSearchCount: recentSearches.length,
//     };
//   }, [bookmarks, history, collections, recentSearches]);

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       paddingHorizontal: 16,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.surface,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.border,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       backgroundColor: theme.colors.background,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     headerTitle: {
//       fontSize: 24,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     scrollContent: {
//       padding: 16,
//       paddingBottom: 100,
//     },
//     section: {
//       marginBottom: 24,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: tokens.fontWeight.semibold,
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     statsGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 12,
//     },
//     statCard: {
//       width: (screenWidth - 44) / 2,
//       borderRadius: 16,
//       padding: 16,
//       overflow: 'hidden',
//     },
//     statGradient: {
//       borderRadius: 16,
//       padding: 16,
//     },
//     statIcon: {
//       marginBottom: 8,
//     },
//     statValue: {
//       fontSize: 28,
//       fontWeight: tokens.fontWeight.bold,
//       color: '#fff',
//       marginBottom: 4,
//     },
//     statLabel: {
//       fontSize: 13,
//       color: 'rgba(255,255,255,0.85)',
//     },
//     listCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       borderWidth: 1,
//       borderColor: theme.colors.border,
//     },
//     listItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingVertical: 12,
//       borderBottomWidth: 1,
//       borderBottomColor: theme.colors.border,
//     },
//     listItemLast: {
//       borderBottomWidth: 0,
//     },
//     listItemLeft: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//       flex: 1,
//     },
//     listRank: {
//       width: 28,
//       height: 28,
//       borderRadius: 14,
//       backgroundColor: theme.colors.primary + '20',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     listRankText: {
//       fontSize: 14,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.primary,
//     },
//     listItemName: {
//       fontSize: 15,
//       fontWeight: tokens.fontWeight.medium,
//       color: theme.colors.foreground,
//       flex: 1,
//     },
//     listItemValue: {
//       fontSize: 14,
//       color: theme.colors.mutedForeground,
//     },
//     priceCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 20,
//       borderWidth: 1,
//       borderColor: theme.colors.border,
//     },
//     priceRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     priceItem: {
//       alignItems: 'center',
//       flex: 1,
//     },
//     priceDivider: {
//       width: 1,
//       height: 40,
//       backgroundColor: theme.colors.border,
//     },
//     priceValue: {
//       fontSize: 22,
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     priceLabel: {
//       fontSize: 12,
//       color: theme.colors.mutedForeground,
//     },
//     activityRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-end',
//       height: 100,
//       paddingTop: 20,
//     },
//     activityBar: {
//       alignItems: 'center',
//       flex: 1,
//     },
//     activityBarFill: {
//       width: 24,
//       borderRadius: 12,
//       marginBottom: 8,
//     },
//     activityBarLabel: {
//       fontSize: 11,
//       color: theme.colors.mutedForeground,
//     },
//     emptyState: {
//       alignItems: 'center',
//       paddingVertical: 32,
//     },
//     emptyText: {
//       fontSize: 14,
//       color: theme.colors.mutedForeground,
//       marginTop: 12,
//       textAlign: 'center',
//     },
//     tipCard: {
//       backgroundColor: theme.colors.primary + '10',
//       borderRadius: 16,
//       padding: 16,
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },
//     tipIcon: {
//       width: 44,
//       height: 44,
//       borderRadius: 22,
//       backgroundColor: theme.colors.primary + '20',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     tipContent: {
//       flex: 1,
//     },
//     tipTitle: {
//       fontSize: 15,
//       fontWeight: tokens.fontWeight.semibold,
//       color: theme.colors.foreground,
//       marginBottom: 4,
//     },
//     tipText: {
//       fontSize: 13,
//       color: theme.colors.mutedForeground,
//       lineHeight: 18,
//     },
//   });

//   const statCards = [
//     {
//       icon: 'bookmark',
//       value: insights.totalBookmarks,
//       label: 'Saved Items',
//       gradient: ['#6366f1', '#8b5cf6'],
//     },
//     {
//       icon: 'folder',
//       value: insights.totalCollections,
//       label: 'Collections',
//       gradient: ['#ec4899', '#f43f5e'],
//     },
//     {
//       icon: 'visibility',
//       value: insights.totalVisits,
//       label: 'Store Visits',
//       gradient: ['#14b8a6', '#06b6d4'],
//     },
//     {
//       icon: 'search',
//       value: insights.recentSearchCount,
//       label: 'Recent Searches',
//       gradient: ['#f59e0b', '#f97316'],
//     },
//   ];

//   const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//   const maxActivity = Math.max(
//     ...days.map(d => insights.activityByDay[d] || 0),
//     1,
//   );

//   return (
//     <SafeAreaView style={[styles.container, {marginTop: 70}]} edges={['bottom']}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Animatable.View animation="fadeInDown" duration={400} style={styles.headerRow}>
//           <AppleTouchFeedback
//             style={styles.backButton}
//             onPress={() => navigate?.('ShoppingDashboard')}
//             hapticStyle="impactLight">
//             <MaterialIcons
//               name="arrow-back"
//               size={24}
//               color={theme.colors.foreground}
//             />
//           </AppleTouchFeedback>
//           <Text style={styles.headerTitle}>Shopping Insights</Text>
//         </Animatable.View>
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}>
//         {/* Stats Grid */}
//         <Animatable.View animation="fadeInUp" duration={500} delay={100} style={styles.section}>
//           <Text style={styles.sectionTitle}>Overview</Text>
//           <View style={styles.statsGrid}>
//             {statCards.map((stat, index) => (
//               <Animatable.View
//                 key={stat.label}
//                 animation="fadeInUp"
//                 duration={500}
//                 delay={150 + index * 100}>
//                 <LinearGradient
//                   colors={stat.gradient as [string, string]}
//                   start={{x: 0, y: 0}}
//                   end={{x: 1, y: 1}}
//                   style={styles.statGradient}>
//                   <MaterialIcons
//                     name={stat.icon as any}
//                     size={28}
//                     color="#fff"
//                     style={styles.statIcon}
//                   />
//                   <Text style={styles.statValue}>{stat.value}</Text>
//                   <Text style={styles.statLabel}>{stat.label}</Text>
//                 </LinearGradient>
//               </Animatable.View>
//             ))}
//           </View>
//         </Animatable.View>

//         {/* Price Insights */}
//         {insights.avgPrice > 0 && (
//           <Animatable.View animation="fadeInUp" duration={500} delay={400} style={styles.section}>
//             <Text style={styles.sectionTitle}>Price Range</Text>
//             <View style={styles.priceCard}>
//               <View style={styles.priceRow}>
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.minPrice}</Text>
//                   <Text style={styles.priceLabel}>Lowest</Text>
//                 </View>
//                 <View style={styles.priceDivider} />
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.avgPrice}</Text>
//                   <Text style={styles.priceLabel}>Average</Text>
//                 </View>
//                 <View style={styles.priceDivider} />
//                 <View style={styles.priceItem}>
//                   <Text style={styles.priceValue}>${insights.maxPrice}</Text>
//                   <Text style={styles.priceLabel}>Highest</Text>
//                 </View>
//               </View>
//             </View>
//           </Animatable.View>
//         )}

//         {/* Weekly Activity */}
//         <Animatable.View animation="fadeInUp" duration={500} delay={500} style={styles.section}>
//           <Text style={styles.sectionTitle}>Weekly Activity</Text>
//           <View style={styles.listCard}>
//             <View style={styles.activityRow}>
//               {days.map(day => {
//                 const count = insights.activityByDay[day] || 0;
//                 const height = count > 0 ? (count / maxActivity) * 60 + 10 : 10;
//                 return (
//                   <View key={day} style={styles.activityBar}>
//                     <View
//                       style={[
//                         styles.activityBarFill,
//                         {
//                           height,
//                           backgroundColor:
//                             count > 0 ? theme.colors.primary : theme.colors.border,
//                         },
//                       ]}
//                     />
//                     <Text style={styles.activityBarLabel}>{day}</Text>
//                   </View>
//                 );
//               })}
//             </View>
//           </View>
//         </Animatable.View>

//         {/* Top Stores */}
//         <Animatable.View animation="fadeInUp" duration={500} delay={600} style={styles.section}>
//           <Text style={styles.sectionTitle}>Top Stores</Text>
//           <View style={styles.listCard}>
//             {insights.topStores.length > 0 ? (
//               insights.topStores.map(([store, visits], index) => (
//                 <View
//                   key={store}
//                   style={[
//                     styles.listItem,
//                     index === insights.topStores.length - 1 && styles.listItemLast,
//                   ]}>
//                   <View style={styles.listItemLeft}>
//                     <View style={styles.listRank}>
//                       <Text style={styles.listRankText}>{index + 1}</Text>
//                     </View>
//                     <Text style={styles.listItemName}>{store}</Text>
//                   </View>
//                   <Text style={styles.listItemValue}>{visits} visits</Text>
//                 </View>
//               ))
//             ) : (
//               <View style={styles.emptyState}>
//                 <MaterialIcons
//                   name="store"
//                   size={40}
//                   color={theme.colors.mutedForeground}
//                 />
//                 <Text style={styles.emptyText}>
//                   Start browsing stores to see your top visits
//                 </Text>
//               </View>
//             )}
//           </View>
//         </Animatable.View>

//         {/* Top Brands */}
//         {insights.topBrands.length > 0 && (
//           <Animatable.View animation="fadeInUp" duration={500} delay={700} style={styles.section}>
//             <Text style={styles.sectionTitle}>Favorite Brands</Text>
//             <View style={styles.listCard}>
//               {insights.topBrands.map(([brand, count], index) => (
//                 <View
//                   key={brand}
//                   style={[
//                     styles.listItem,
//                     index === insights.topBrands.length - 1 && styles.listItemLast,
//                   ]}>
//                   <View style={styles.listItemLeft}>
//                     <View style={styles.listRank}>
//                       <Text style={styles.listRankText}>{index + 1}</Text>
//                     </View>
//                     <Text style={styles.listItemName}>{brand}</Text>
//                   </View>
//                   <Text style={styles.listItemValue}>{count} items</Text>
//                 </View>
//               ))}
//             </View>
//           </Animatable.View>
//         )}

//         {/* Smart Tip */}
//         <Animatable.View animation="fadeInUp" duration={500} delay={800} style={styles.section}>
//           <View style={styles.tipCard}>
//             <View style={styles.tipIcon}>
//               <MaterialIcons
//                 name="lightbulb"
//                 size={24}
//                 color={theme.colors.primary}
//               />
//             </View>
//             <View style={styles.tipContent}>
//               <Text style={styles.tipTitle}>Shopping Tip</Text>
//               <Text style={styles.tipText}>
//                 {insights.totalBookmarks > 10
//                   ? 'Organize your saved items into collections to keep track of different styles or occasions.'
//                   : 'Start saving items you love by tapping the bookmark icon while browsing stores.'}
//               </Text>
//             </View>
//           </View>
//         </Animatable.View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }
