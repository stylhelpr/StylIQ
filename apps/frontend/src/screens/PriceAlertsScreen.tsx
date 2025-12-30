import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppTheme } from '../context/ThemeContext';
import { tokens } from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import { usePriceAlerts } from '../hooks/usePriceAlerts';
import { getAccessToken } from '../utils/auth';

type Props = {
  navigate?: (screen: any, params?: any) => void;
};

export default function PriceAlertsScreen({ navigate }: Props) {
  const { theme } = useAppTheme();
  const [token, setToken] = useState<string | undefined>(undefined);

  // Get token on mount
  useEffect(() => {
    getAccessToken()
      .then(t => setToken(t))
      .catch(() => setToken(undefined));
  }, []);

  // Pass token to hook - TanStack Query handles automatic fetching
  const {
    alerts,
    deleteAlert,
    updatePriceAlert,
    getAlertsWithPriceDrop,
  } = usePriceAlerts(token);

  // No need for manual fetch useEffect - TanStack Query auto-fetches when token is available

  const handleDeleteAlert = (alertId: number, title: string) => {
    Alert.alert(
      'Remove Price Alert',
      `Stop tracking ${title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              // Token is passed via hook, use empty string for backward compatibility
              await deleteAlert('', alertId);
            } catch (err) {
              console.error('Failed to delete alert:', err);
            }
          },
          style: 'destructive',
        },
      ],
    );
  };

  const handleToggleAlert = async (alertId: number, currentEnabled: boolean) => {
    try {
      // Token is passed via hook, use empty string for backward compatibility
      await updatePriceAlert('', alertId, { enabled: !currentEnabled });
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  const alertsWithDrop = getAlertsWithPriceDrop();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: tokens.borderRadius.md,
      padding: 12,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.primary,
    },
    statLabel: {
      fontSize: 11,
      color: theme.colors.foreground,
      marginTop: 4,
    },
    listContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    alertCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.md,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    alertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 12,
    },
    alertInfo: {
      flex: 1,
      marginRight: 12,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    alertSource: {
      fontSize: 11,
      color: theme.colors.foreground,
      marginBottom: 6,
    },
    priceRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 8,
    },
    priceItem: {
      flex: 1,
    },
    priceLabel: {
      fontSize: 10,
      color: theme.colors.foreground,
      marginBottom: 2,
    },
    priceValue: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.primary,
    },
    enableButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: tokens.borderRadius.sm,
      backgroundColor: theme.colors.background,
    },
    enableButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    deleteButton: {
      padding: 8,
    },
    statusBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: tokens.borderRadius.sm,
    },
    statusBadgeGreen: {
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
    },
    statusBadgeRed: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
    },
    statusText: {
      fontSize: 10,
      fontWeight: tokens.fontWeight.semiBold,
      color: '#10b981',
    },
    statusTextRed: {
      color: '#ef4444',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.foreground,
      textAlign: 'center',
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
  });

  return (
    <SafeAreaView style={[styles.container, { marginTop: 70 }]}>
      {/* Header */}
      <Animatable.View animation="fadeInDown" style={styles.header}>
        <View style={styles.headerTop}>
          <AppleTouchFeedback
            style={[styles.backButton, { padding: 8 }]}
            onPress={() => navigate?.('ShoppingDashboard')}
            hapticStyle="impactLight">
            <MaterialIcons
              name="arrow-back-ios"
              size={22}
              color={theme.colors.foreground}
            />
          </AppleTouchFeedback>
          <Text style={styles.headerTitle}>Price Alerts</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Animatable.View animation="bounceIn" delay={200} style={styles.statCard}>
            <Text style={styles.statNumber}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total Tracking</Text>
          </Animatable.View>
          <Animatable.View animation="bounceIn" delay={250} style={styles.statCard}>
            <Text style={styles.statNumber}>{alerts.filter(a => a.enabled).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </Animatable.View>
          <Animatable.View animation="bounceIn" delay={300} style={styles.statCard}>
            <Text style={styles.statNumber}>{alertsWithDrop.length}</Text>
            <Text style={styles.statLabel}>Price Dropped</Text>
          </Animatable.View>
        </View>
      </Animatable.View>

      {alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="trending-down"
            size={48}
            color={theme.colors.foreground}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>No price alerts yet</Text>
          <Text style={styles.emptySubtext}>
            Bookmark items and set a target price to get alerts
          </Text>
          <AppleTouchFeedback
            onPress={() => navigate?.('ShoppingDashboard')}
            hapticStyle="impactLight"
            style={{
              backgroundColor: theme.colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: tokens.borderRadius.md,
            }}>
            <Text
              style={{
                color: '#fff',
                fontWeight: tokens.fontWeight.semiBold,
              }}>
              Start Browsing
            </Text>
          </AppleTouchFeedback>
        </View>
      ) : (
        <FlatList
          data={alerts}
          renderItem={({ item, index }) => (
            <Animatable.View animation="slideInLeft" delay={index * 50}>
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.alertSource}>{item.source}</Text>

                    <View style={styles.priceRow}>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Current</Text>
                        <Text style={styles.priceValue}>
                          ${item.currentPrice.toFixed(2)}
                        </Text>
                      </View>
                      {item.targetPrice && (
                        <View style={styles.priceItem}>
                          <Text style={styles.priceLabel}>Target</Text>
                          <Text style={styles.priceValue}>
                            ${item.targetPrice.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {item.currentPrice <= (item.targetPrice || item.currentPrice) && (
                    <View
                      style={[
                        styles.statusBadge,
                        item.currentPrice <= (item.targetPrice || Infinity)
                          ? styles.statusBadgeGreen
                          : styles.statusBadgeRed,
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          item.currentPrice <= (item.targetPrice || Infinity)
                            ? {}
                            : styles.statusTextRed,
                        ]}>
                        💰 Target Hit!
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingBottom: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.surfaceBorder,
                    paddingTop: 12,
                  }}>
                  <AppleTouchFeedback
                    style={[
                      styles.enableButton,
                      item.enabled && styles.enableButtonActive,
                    ]}
                    onPress={() => handleToggleAlert(item.id, item.enabled)}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name={item.enabled ? 'notifications-active' : 'notifications-off'}
                      size={16}
                      color={item.enabled ? '#fff' : theme.colors.foreground}
                    />
                  </AppleTouchFeedback>

                  <AppleTouchFeedback
                    style={styles.deleteButton}
                    onPress={() => handleDeleteAlert(item.id, item.title)}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name="delete"
                      size={20}
                      color={theme.colors.foreground}
                    />
                  </AppleTouchFeedback>
                </View>
              </View>
            </Animatable.View>
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}
