import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {useUUID} from '../context/UUIDContext';
import {useAppTheme} from '../context/ThemeContext';
import {
  loadInbox as loadNotifications,
  markRead,
  markAllRead,
  clearAll,
  AppNotification,
  addToInbox,
} from '../utils/notificationInbox';
import NotificationCard from '../components/Notifications/NotificationCard';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import * as Animatable from 'react-native-animatable';
import {TooltipBubble} from '../components/ToolTip/ToolTip1';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {fontScale, moderateScale} from '../utils/scale';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {tokens} from '../styles/tokens/tokens';
import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';
import ReaderModal from '../components/FashionFeed/ReaderModal';
import {DynamicIsland} from '../native/dynamicIsland';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    // enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

// Helper function to show notification in Dynamic Island
const showInDynamicIsland = async (
  title: string,
  message: string,
  durationMs: number = 5000,
) => {
  try {
    // Check if Live Activities are enabled first
    const enabled = await DynamicIsland.isEnabled();
    console.log('🔔 Live Activities enabled?', enabled);

    if (!enabled) {
      console.log('⚠️ Live Activities not allowed on this device / settings.');
      return;
    }

    // Start the Live Activity with the notification
    const result = await DynamicIsland.start(title, message);
    console.log('✅ Dynamic Island started:', result);
    console.log('📬 Notification:', title, '-', message);

    // Auto-dismiss after duration
    setTimeout(async () => {
      const endResult = await DynamicIsland.end();
      console.log('🏁 Dynamic Island ended:', endResult);
    }, durationMs);
  } catch (error) {
    console.log('❌ Dynamic Island error:', error);
  }
};

export default function NotificationsScreen({
  navigate,
}: {
  navigate: (screen: string) => void;
}) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const userId = useUUID() ?? '';

  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [expandedGroups, setExpandedGroups] = useState<{
    [key: string]: boolean;
  }>({});
  const [openUrl, setOpenUrl] = useState<string | undefined>();
  const [openTitle, setOpenTitle] = useState<string | undefined>();

  const styles = StyleSheet.create({
    screen: {flex: 1},
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: moderateScale(tokens.spacing.md1),
      paddingTop: 22,
      paddingBottom: 4,
    },
    leftGroup: {flexDirection: 'row', alignItems: 'center'},
    rightGroup: {flexDirection: 'row', alignItems: 'center'},
    pill: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: tokens.borderRadius.sm,
      backgroundColor: theme.colors.pillDark1,
      marginRight: 8,
    },
    pillActive: {
      backgroundColor: theme.colors.button1,
      borderColor: theme.colors.surfaceBorder,
    },
    pillText: {
      color: theme.colors.buttonText1,
      fontWeight: tokens.fontWeight.bold,
      fontSize: 13,
    },
    actionBtn: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: tokens.borderRadius.sm,
      backgroundColor: theme.colors.pillDark1,
      marginLeft: 8,
    },
    actionDanger: {backgroundColor: theme.colors.error},
    actionText: {
      color: theme.colors.buttonText1,
      fontWeight: tokens.fontWeight.bold,
      fontSize: 13,
    },
    center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    empty: {paddingHorizontal: 16, paddingTop: 40},
    emptyBig: {
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.bold,
      fontSize: 18,
      marginBottom: 6,
      textAlign: 'center',
    },
    emptySub: {color: theme.colors.muted, textAlign: 'center'},
  });

  const load = useCallback(async () => {
    const list = await loadNotifications(userId);
    list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    setItems(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribeFg = messaging().onMessage(async msg => {
      const title = String(
        msg.notification?.title || msg.data?.title || 'New Notification',
      );
      const message = String(
        msg.notification?.body || msg.data?.body || msg.data?.message || '',
      );

      await addToInbox({
        user_id: userId,
        id: msg.messageId || `${Date.now()}`,
        title,
        message,
        timestamp: new Date().toISOString(),
        category:
          (msg.data?.category as AppNotification['category']) ?? 'other',
        deeplink: msg.data?.deeplink,
        data: msg.data,
        read: false,
      });
      await load();
      h('impactLight');

      // 🏝️ Show in Dynamic Island
      await showInDynamicIsland(title, message, 5000);
    });

    const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
      const title = String(
        msg.notification?.title || msg.data?.title || 'New Notification',
      );
      const message = String(
        msg.notification?.body || msg.data?.body || msg.data?.message || '',
      );

      await addToInbox({
        user_id: userId,
        id: msg.messageId || `${Date.now()}`,
        title,
        message,
        timestamp: new Date().toISOString(),
        category:
          (msg.data?.category as AppNotification['category']) ?? 'other',
        deeplink: msg.data?.deeplink,
        data: msg.data,
        read: false,
      });
      await load();

      // 🏝️ Show in Dynamic Island
      await showInDynamicIsland(title, message, 5000);
    });

    return () => {
      unsubscribeFg();
      unsubscribeOpen();
    };
  }, [load, userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

  return (
    // <GradientBackground>
    <SafeAreaView
      style={[
        globalStyles.container,
        {flex: 1, backgroundColor: theme.colors.background},
      ]}
      edges={['left', 'right']}>
      {/* 🔹 Spacer to match old navbar height */}
      <View
        style={{
          height: insets.top + 53,
          backgroundColor: theme.colors.background,
        }}
      />
      <ScrollView
        style={[
          globalStyles.container,
          {backgroundColor: theme.colors.background},
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.foreground}
            colors={[theme.colors.primary]}
            progressViewOffset={32}
          />
        }
        contentContainerStyle={{paddingBottom: 32}}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={globalStyles.sectionTitle}>
          <Text style={globalStyles.header}>Notifications</Text>
        </View>

        <Animatable.View
          animation="fadeInUp"
          delay={200}
          duration={700}
          style={styles.headerRow}>
          <Animatable.View
            animation="slideInLeft"
            delay={300}
            style={styles.leftGroup}>
            <AppleTouchFeedback
              onPress={() => {
                if (filter !== 'all') h('selection');
                setFilter('all');
              }}
              // hapticStyle="impactLight"
              style={[styles.pill, filter === 'all' && styles.pillActive]}>
              <Animatable.Text
                animation={filter === 'all' ? 'pulse' : undefined}
                iterationCount="infinite"
                duration={2500}
                style={styles.pillText}>
                All
              </Animatable.Text>
            </AppleTouchFeedback>

            <AppleTouchFeedback
              onPress={() => {
                if (filter !== 'unread') h('selection');
                setFilter('unread');
              }}
              // hapticStyle="impactLight"
              style={[styles.pill, filter === 'unread' && styles.pillActive]}>
              <Animatable.Text
                animation={filter === 'unread' ? 'pulse' : undefined}
                iterationCount="infinite"
                duration={2500}
                style={styles.pillText}>
                Unread
              </Animatable.Text>
            </AppleTouchFeedback>
          </Animatable.View>

          <Animatable.View
            animation="slideInRight"
            delay={400}
            style={styles.rightGroup}>
            <AppleTouchFeedback
              onPress={async () => {
                // h('impactMedium');
                await markAllRead(userId);
                await load();
                // h('notificationSuccess');
              }}
              // hapticStyle="impactLight"
              style={styles.actionBtn}>
              <Animatable.Text
                animation="fadeIn"
                duration={800}
                style={styles.actionText}>
                Mark All
              </Animatable.Text>
            </AppleTouchFeedback>

            <AppleTouchFeedback
              onPress={() => {
                // h('impactHeavy');
                Alert.alert(
                  'Clear All Notifications?',
                  'This will permanently delete all your notifications and cannot be undone.',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                      onPress: () => h('selection'),
                    },
                    {
                      text: 'Delete All',
                      style: 'destructive',
                      onPress: async () => {
                        h('notificationWarning');
                        await clearAll(userId);
                        await load();
                      },
                    },
                  ],
                  {cancelable: true},
                );
              }}
              // hapticStyle="impactLight"
              style={[styles.actionBtn, styles.actionDanger]}>
              <Animatable.Text
                animation="fadeIn"
                duration={800}
                style={styles.actionText}>
                Clear All
              </Animatable.Text>
            </AppleTouchFeedback>
          </Animatable.View>
        </Animatable.View>

        {loading ? (
          <Animatable.View
            animation="fadeIn"
            iterationCount="infinite"
            duration={1600}
            style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </Animatable.View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.foreground}
              />
            }
            contentContainerStyle={{padding: 16, paddingBottom: 32}}
            showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <Animatable.View
                animation="fadeInUp"
                delay={300}
                duration={800}
                style={styles.empty}>
                <Animatable.Text
                  animation="pulse"
                  iterationCount="infinite"
                  duration={4000}
                  style={[styles.emptyBig, {lineHeight: 28}]}>
                  {filter === 'unread'
                    ? "You're all caught up — No unread notifications!"
                    : 'No notifications yet'}
                  <TooltipBubble
                    message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
                    position="top"
                  />
                </Animatable.Text>
                <Animatable.Text
                  animation="fadeIn"
                  delay={500}
                  style={styles.emptySub}>
                  {filter === 'unread'
                    ? 'All your notifications have been read.'
                    : 'You’ll see outfit reminders, weather changes, and brand news here.'}
                </Animatable.Text>
              </Animatable.View>
            ) : (
              <>
                {(() => {
                  const sources: {[key: string]: AppNotification[]} = {
                    'Scheduled Outfits': [],
                    'News Stories': [],
                    'Weather Alerts': [],
                    'Care Reminders': [],
                    'Fashion News Stories': [],
                  };

                  filtered.forEach(n => {
                    const cat = (n.category || '').toLowerCase();
                    const title = (n.title || '').toLowerCase();
                    const message = (n.message || '').toLowerCase();

                    if (
                      cat === 'scheduled_outfit' ||
                      title.includes('outfit') ||
                      message.includes('outfit') ||
                      message.includes('reminder') ||
                      message.includes('planned')
                    ) {
                      sources['Scheduled Outfits'].push(n);
                    } else if (
                      cat === 'news' ||
                      title.includes('news') ||
                      message.includes('headline') ||
                      message.includes('story')
                    ) {
                      sources['News Stories'].push(n);
                    } else if (
                      cat === 'weather' ||
                      title.includes('weather') ||
                      message.includes('forecast') ||
                      message.includes('temperature')
                    ) {
                      sources['Weather Alerts'].push(n);
                    } else if (
                      cat === 'care' ||
                      title.includes('care') ||
                      message.includes('wash') ||
                      message.includes('laundry')
                    ) {
                      sources['Care Reminders'].push(n);
                    } else {
                      sources['Fashion News Stories'].push(n);
                    }
                  });

                  const order = [
                    'Scheduled Outfits',
                    'News Stories',
                    'Weather Alerts',
                    'Care Reminders',
                    'Fashion News Stories',
                  ];

                  const toggleGroup = (section: string) => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.create(
                        300,
                        LayoutAnimation.Types.easeInEaseOut,
                        LayoutAnimation.Properties.opacity,
                      ),
                    );
                    setExpandedGroups(prev => ({
                      ...prev,
                      [section]: !prev[section],
                    }));
                    h('selection');
                  };

                  return order.map(section => {
                    const list = sources[section];
                    if (!list || list.length === 0) return null;

                    const expanded = expandedGroups[section] ?? false;
                    const visibleItems = expanded ? list : list.slice(0, 2);

                    return (
                      <View key={section} style={{marginBottom: 18}}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 12,
                            paddingHorizontal: 4,
                          }}>
                          <Text
                            style={{
                              fontSize: 22,
                              fontWeight: tokens.fontWeight.medium,
                              color: theme.colors.foreground,
                            }}>
                            {section}
                          </Text>

                          {list.length > 3 && (
                            <AppleTouchFeedback
                              onPress={() => toggleGroup(section)}
                              hapticStyle="impactLight"
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 2,
                                paddingHorizontal: 6,
                                backgroundColor: theme.colors.button1,
                                borderRadius: 20,
                              }}>
                              <MaterialIcons
                                name="keyboard-arrow-down"
                                size={28}
                                color={theme.colors.buttonText1}
                                style={{
                                  marginTop: 1,
                                  transform: [
                                    {rotate: expanded ? '180deg' : '0deg'},
                                  ],
                                }}
                              />
                              <Text
                                style={{
                                  color: theme.colors.buttonText1,
                                  fontWeight: tokens.fontWeight.medium,
                                  fontSize: 13,
                                  marginRight: 4,
                                }}>
                                {expanded ? 'Show Less' : 'Show More'}
                              </Text>
                            </AppleTouchFeedback>
                          )}
                        </View>

                        {visibleItems.map((n, index) => (
                          <Animatable.View
                            key={n.id}
                            animation="fadeInUp"
                            duration={500}
                            delay={index * 60}
                            useNativeDriver
                            style={{
                              borderRadius: 20,
                              overflow: 'hidden',
                            }}>
                            <NotificationCard
                              n={n}
                              onPress={async () => {
                                h('selection');
                                await markRead(userId, n.id);
                                // Update local state to reflect read status immediately
                                setItems(prev =>
                                  prev.map(item =>
                                    item.id === n.id
                                      ? {...item, read: true}
                                      : item,
                                  ),
                                );

                                if (n.deeplink) {
                                  try {
                                    await Linking.openURL(n.deeplink);
                                    return;
                                  } catch (e) {
                                    console.error(
                                      '❌ Failed to open deeplink:',
                                      e,
                                    );
                                  }
                                }

                                if (n?.data?.url) {
                                  setOpenUrl(n.data.url);
                                  setOpenTitle(n.title || 'Article');
                                  return;
                                }

                                // Handle scheduled_outfit before data.screen to ensure correct navigation
                                if (
                                  (n.category || '').toLowerCase() ===
                                  'scheduled_outfit'
                                ) {
                                  navigate('Planner');
                                  return;
                                }

                                if (n?.data?.screen) {
                                  navigate(n.data.screen);
                                  return;
                                }

                                switch ((n.category || '').toLowerCase()) {
                                  case 'news':
                                    navigate('FashionFeedScreen');
                                    return;
                                  case 'outfit':
                                    navigate('SavedOutfitsScreen');
                                    return;
                                  case 'weather':
                                    navigate('WeatherScreen');
                                    return;
                                  case 'care':
                                    navigate('CareRemindersScreen');
                                    return;
                                }

                                const title = (n.title || '').toLowerCase();
                                const msg = (n.message || '').toLowerCase();

                                if (
                                  title.includes('outfit') ||
                                  msg.includes('outfit')
                                ) {
                                  navigate('SavedOutfits');
                                  return;
                                }

                                if (
                                  title.includes('news') ||
                                  msg.includes('headline')
                                ) {
                                  navigate('FashionFeedScreen');
                                  return;
                                }

                                if (
                                  title.includes('weather') ||
                                  msg.includes('forecast')
                                ) {
                                  navigate('WeatherScreen');
                                  return;
                                }

                                if (
                                  title.includes('care') ||
                                  msg.includes('laundry')
                                ) {
                                  navigate('CareRemindersScreen');
                                  return;
                                }

                                Alert.alert(
                                  'Unknown notification',
                                  `No screen mapped for:\nCategory: ${n.category}\nTitle: ${n.title}`,
                                );
                              }}
                              onDelete={async id => {
                                Alert.alert(
                                  'Delete Notification?',
                                  'Are you sure you want to delete this notification?',
                                  [
                                    {
                                      text: 'Cancel',
                                      style: 'cancel',
                                      onPress: () => h('selection'),
                                    },
                                    {
                                      text: 'Delete',
                                      style: 'destructive',
                                      onPress: async () => {
                                        try {
                                          h('impactHeavy');
                                          await markRead(userId, id);
                                          const updated = items.filter(
                                            item => item.id !== id,
                                          );
                                          setItems(updated);
                                        } catch (err) {
                                          console.error(
                                            '❌ Failed to delete notification:',
                                            err,
                                          );
                                        }
                                      },
                                    },
                                  ],
                                  {cancelable: true},
                                );
                              }}
                            />
                          </Animatable.View>
                        ))}
                      </View>
                    );
                  });
                })()}
              </>
            )}
          </ScrollView>
        )}
      </ScrollView>

      <ReaderModal
        visible={!!openUrl}
        url={openUrl}
        title={openTitle}
        onClose={() => setOpenUrl(undefined)}
      />
    </SafeAreaView>
    // </GradientBackground>
  );
}

////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
//   LayoutAnimation,
//   UIManager,
//   Platform,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {fontScale, moderateScale} from '../utils/scale';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import {tokens} from '../styles/tokens/tokens';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

// if (
//   Platform.OS === 'android' &&
//   UIManager.setLayoutAnimationEnabledExperimental
// ) {
//   UIManager.setLayoutAnimationEnabledExperimental(true);
// }

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     // enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const insets = useSafeAreaInsets();

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');
//   const [expandedGroups, setExpandedGroups] = useState<{
//     [key: string]: boolean;
//   }>({});

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {flexDirection: 'row', alignItems: 'center'},
//     rightGroup: {flexDirection: 'row', alignItems: 'center'},
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   return (
//     // <GradientBackground>
//     <SafeAreaView
//       style={[
//         globalStyles.container,
//         {flex: 1, backgroundColor: theme.colors.background},
//       ]}
//       edges={['left', 'right']}>
//       {/* 🔹 Spacer to match old navbar height */}
//       <View
//         style={{
//           height: insets.top + 53,
//           backgroundColor: theme.colors.background,
//         }}
//       />
//       <ScrollView
//         style={[
//           globalStyles.container,
//           {backgroundColor: theme.colors.background},
//         ]}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             tintColor={theme.colors.foreground}
//             colors={[theme.colors.primary]}
//             progressViewOffset={32}
//           />
//         }
//         contentContainerStyle={{paddingBottom: 32}}
//         showsVerticalScrollIndicator={false}
//         keyboardShouldPersistTaps="handled">
//         <View style={globalStyles.sectionTitle}>
//           <Text style={globalStyles.header}>Notifications</Text>
//         </View>

//         <Animatable.View
//           animation="fadeInUp"
//           delay={200}
//           duration={700}
//           style={styles.headerRow}>
//           <Animatable.View
//             animation="slideInLeft"
//             delay={300}
//             style={styles.leftGroup}>
//             <AppleTouchFeedback
//               onPress={() => {
//                 if (filter !== 'all') h('selection');
//                 setFilter('all');
//               }}
//               // hapticStyle="impactLight"
//               style={[styles.pill, filter === 'all' && styles.pillActive]}>
//               <Animatable.Text
//                 animation={filter === 'all' ? 'pulse' : undefined}
//                 iterationCount="infinite"
//                 duration={2500}
//                 style={styles.pillText}>
//                 All
//               </Animatable.Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               onPress={() => {
//                 if (filter !== 'unread') h('selection');
//                 setFilter('unread');
//               }}
//               // hapticStyle="impactLight"
//               style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//               <Animatable.Text
//                 animation={filter === 'unread' ? 'pulse' : undefined}
//                 iterationCount="infinite"
//                 duration={2500}
//                 style={styles.pillText}>
//                 Unread
//               </Animatable.Text>
//             </AppleTouchFeedback>
//           </Animatable.View>

//           <Animatable.View
//             animation="slideInRight"
//             delay={400}
//             style={styles.rightGroup}>
//             <AppleTouchFeedback
//               onPress={async () => {
//                 // h('impactMedium');
//                 await markAllRead(userId);
//                 await load();
//                 // h('notificationSuccess');
//               }}
//               // hapticStyle="impactLight"
//               style={styles.actionBtn}>
//               <Animatable.Text
//                 animation="fadeIn"
//                 duration={800}
//                 style={styles.actionText}>
//                 Mark All
//               </Animatable.Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               onPress={() => {
//                 // h('impactHeavy');
//                 Alert.alert(
//                   'Clear All Notifications?',
//                   'This will permanently delete all your notifications and cannot be undone.',
//                   [
//                     {
//                       text: 'Cancel',
//                       style: 'cancel',
//                       onPress: () => h('selection'),
//                     },
//                     {
//                       text: 'Delete All',
//                       style: 'destructive',
//                       onPress: async () => {
//                         h('notificationWarning');
//                         await clearAll(userId);
//                         await load();
//                       },
//                     },
//                   ],
//                   {cancelable: true},
//                 );
//               }}
//               // hapticStyle="impactLight"
//               style={[styles.actionBtn, styles.actionDanger]}>
//               <Animatable.Text
//                 animation="fadeIn"
//                 duration={800}
//                 style={styles.actionText}>
//                 Clear All
//               </Animatable.Text>
//             </AppleTouchFeedback>
//           </Animatable.View>
//         </Animatable.View>

//         {loading ? (
//           <Animatable.View
//             animation="fadeIn"
//             iterationCount="infinite"
//             duration={1600}
//             style={styles.center}>
//             <ActivityIndicator color={theme.colors.primary} size="large" />
//           </Animatable.View>
//         ) : (
//           <ScrollView
//             refreshControl={
//               <RefreshControl
//                 refreshing={refreshing}
//                 onRefresh={onRefresh}
//                 tintColor={theme.colors.foreground}
//               />
//             }
//             contentContainerStyle={{padding: 16, paddingBottom: 32}}
//             showsVerticalScrollIndicator={false}>
//             {filtered.length === 0 ? (
//               <Animatable.View
//                 animation="fadeInUp"
//                 delay={300}
//                 duration={800}
//                 style={styles.empty}>
//                 <Animatable.Text
//                   animation="pulse"
//                   iterationCount="infinite"
//                   duration={4000}
//                   style={[styles.emptyBig, {lineHeight: 28}]}>
//                   {filter === 'unread'
//                     ? "You're all caught up — No unread notifications!"
//                     : 'No notifications yet'}
//                   <TooltipBubble
//                     message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                     position="top"
//                   />
//                 </Animatable.Text>
//                 <Animatable.Text
//                   animation="fadeIn"
//                   delay={500}
//                   style={styles.emptySub}>
//                   {filter === 'unread'
//                     ? 'All your notifications have been read.'
//                     : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//                 </Animatable.Text>
//               </Animatable.View>
//             ) : (
//               <>
//                 {(() => {
//                   const sources: {[key: string]: AppNotification[]} = {
//                     'Scheduled Outfits': [],
//                     'News Stories': [],
//                     'Weather Alerts': [],
//                     'Care Reminders': [],
//                     'Fashion News Stories': [],
//                   };

//                   filtered.forEach(n => {
//                     const cat = (n.category || '').toLowerCase();
//                     const title = (n.title || '').toLowerCase();
//                     const message = (n.message || '').toLowerCase();

//                     if (
//                       cat === 'scheduled_outfit' ||
//                       title.includes('outfit') ||
//                       message.includes('outfit') ||
//                       message.includes('reminder') ||
//                       message.includes('planned')
//                     ) {
//                       sources['Scheduled Outfits'].push(n);
//                     } else if (
//                       cat === 'news' ||
//                       title.includes('news') ||
//                       message.includes('headline') ||
//                       message.includes('story')
//                     ) {
//                       sources['News Stories'].push(n);
//                     } else if (
//                       cat === 'weather' ||
//                       title.includes('weather') ||
//                       message.includes('forecast') ||
//                       message.includes('temperature')
//                     ) {
//                       sources['Weather Alerts'].push(n);
//                     } else if (
//                       cat === 'care' ||
//                       title.includes('care') ||
//                       message.includes('wash') ||
//                       message.includes('laundry')
//                     ) {
//                       sources['Care Reminders'].push(n);
//                     } else {
//                       sources['Fashion News Stories'].push(n);
//                     }
//                   });

//                   const order = [
//                     'Scheduled Outfits',
//                     'News Stories',
//                     'Weather Alerts',
//                     'Care Reminders',
//                     'Fashion News Stories',
//                   ];

//                   const toggleGroup = (section: string) => {
//                     LayoutAnimation.configureNext(
//                       LayoutAnimation.create(
//                         300,
//                         LayoutAnimation.Types.easeInEaseOut,
//                         LayoutAnimation.Properties.opacity,
//                       ),
//                     );
//                     setExpandedGroups(prev => ({
//                       ...prev,
//                       [section]: !prev[section],
//                     }));
//                     h('selection');
//                   };

//                   return order.map(section => {
//                     const list = sources[section];
//                     if (!list || list.length === 0) return null;

//                     const expanded = expandedGroups[section] ?? false;
//                     const visibleItems = expanded ? list : list.slice(0, 2);

//                     return (
//                       <View key={section} style={{marginBottom: 18}}>
//                         <View
//                           style={{
//                             flexDirection: 'row',
//                             alignItems: 'center',
//                             justifyContent: 'space-between',
//                             marginBottom: 12,
//                             paddingHorizontal: 4,
//                           }}>
//                           <Text
//                             style={{
//                               fontSize: 22,
//                               fontWeight: tokens.fontWeight.medium,
//                               color: theme.colors.foreground,
//                             }}>
//                             {section}
//                           </Text>

//                           {list.length > 3 && (
//                             <AppleTouchFeedback
//                               onPress={() => toggleGroup(section)}
//                               hapticStyle="impactLight"
//                               style={{
//                                 flexDirection: 'row',
//                                 alignItems: 'center',
//                                 paddingVertical: 2,
//                                 paddingHorizontal: 6,
//                                 backgroundColor: theme.colors.button1,
//                                 borderRadius: 20,
//                               }}>
//                               <MaterialIcons
//                                 name="keyboard-arrow-down"
//                                 size={28}
//                                 color={theme.colors.buttonText1}
//                                 style={{
//                                   marginTop: 1,
//                                   transform: [
//                                     {rotate: expanded ? '180deg' : '0deg'},
//                                   ],
//                                 }}
//                               />
//                               <Text
//                                 style={{
//                                   color: theme.colors.buttonText1,
//                                   fontWeight: tokens.fontWeight.medium,
//                                   fontSize: 13,
//                                   marginRight: 4,
//                                 }}>
//                                 {expanded ? 'Show Less' : 'Show More'}
//                               </Text>
//                             </AppleTouchFeedback>
//                           )}
//                         </View>

//                         {visibleItems.map((n, index) => (
//                           <Animatable.View
//                             key={n.id}
//                             animation="fadeInUp"
//                             duration={500}
//                             delay={index * 60}
//                             useNativeDriver
//                             style={{
//                               borderRadius: 20,
//                               overflow: 'hidden',
//                             }}>
//                             <NotificationCard
//                               n={n}
//                               onPress={async () => {
//                                 h('selection');
//                                 await markRead(userId, n.id);

//                                 if (n.deeplink) {
//                                   try {
//                                     await Linking.openURL(n.deeplink);
//                                     return;
//                                   } catch (e) {
//                                     console.error(
//                                       '❌ Failed to open deeplink:',
//                                       e,
//                                     );
//                                   }
//                                 }

//                                 if (n?.data?.screen) {
//                                   navigate(n.data.screen);
//                                   return;
//                                 }

//                                 switch ((n.category || '').toLowerCase()) {
//                                   case 'news':
//                                     navigate('FashionFeedScreen');
//                                     return;
//                                   case 'outfit':
//                                   case 'scheduled_outfit':
//                                     navigate('SavedOutfitsScreen');
//                                     return;
//                                   case 'weather':
//                                     navigate('WeatherScreen');
//                                     return;
//                                   case 'care':
//                                     navigate('CareRemindersScreen');
//                                     return;
//                                 }

//                                 const title = (n.title || '').toLowerCase();
//                                 const msg = (n.message || '').toLowerCase();

//                                 if (
//                                   title.includes('outfit') ||
//                                   msg.includes('outfit')
//                                 ) {
//                                   navigate('SavedOutfits');
//                                   return;
//                                 }

//                                 if (
//                                   title.includes('news') ||
//                                   msg.includes('headline')
//                                 ) {
//                                   navigate('FashionFeedScreen');
//                                   return;
//                                 }

//                                 if (
//                                   title.includes('weather') ||
//                                   msg.includes('forecast')
//                                 ) {
//                                   navigate('WeatherScreen');
//                                   return;
//                                 }

//                                 if (
//                                   title.includes('care') ||
//                                   msg.includes('laundry')
//                                 ) {
//                                   navigate('CareRemindersScreen');
//                                   return;
//                                 }

//                                 Alert.alert(
//                                   'Unknown notification',
//                                   `No screen mapped for:\nCategory: ${n.category}\nTitle: ${n.title}`,
//                                 );
//                               }}
//                               onDelete={async id => {
//                                 Alert.alert(
//                                   'Delete Notification?',
//                                   'Are you sure you want to delete this notification?',
//                                   [
//                                     {
//                                       text: 'Cancel',
//                                       style: 'cancel',
//                                       onPress: () => h('selection'),
//                                     },
//                                     {
//                                       text: 'Delete',
//                                       style: 'destructive',
//                                       onPress: async () => {
//                                         try {
//                                           h('impactHeavy');
//                                           await markRead(userId, id);
//                                           const updated = items.filter(
//                                             item => item.id !== id,
//                                           );
//                                           setItems(updated);
//                                         } catch (err) {
//                                           console.error(
//                                             '❌ Failed to delete notification:',
//                                             err,
//                                           );
//                                         }
//                                       },
//                                     },
//                                   ],
//                                   {cancelable: true},
//                                 );
//                               }}
//                             />
//                           </Animatable.View>
//                         ))}
//                       </View>
//                     );
//                   });
//                 })()}
//               </>
//             )}
//           </ScrollView>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//     // </GradientBackground>
//   );
// }

/////////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
//   LayoutAnimation,
//   UIManager,
//   Platform,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

// if (
//   Platform.OS === 'android' &&
//   UIManager.setLayoutAnimationEnabledExperimental
// ) {
//   UIManager.setLayoutAnimationEnabledExperimental(true);
// }

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');
//   const [expandedGroups, setExpandedGroups] = useState<{
//     [key: string]: boolean;
//   }>({});

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {flexDirection: 'row', alignItems: 'center'},
//     rightGroup: {flexDirection: 'row', alignItems: 'center'},
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   return (
//     // <GradientBackground>
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       refreshControl={
//         <RefreshControl
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           tintColor={theme.colors.foreground}
//           colors={[theme.colors.primary]}
//           progressViewOffset={32}
//         />
//       }
//       contentContainerStyle={{paddingBottom: 32}}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               h('impactHeavy');
//               Alert.alert(
//                 'Clear All Notifications?',
//                 'This will permanently delete all your notifications and cannot be undone.',
//                 [
//                   {
//                     text: 'Cancel',
//                     style: 'cancel',
//                     onPress: () => h('selection'),
//                   },
//                   {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                       h('notificationWarning');
//                       await clearAll(userId);
//                       await load();
//                     },
//                   },
//                 ],
//                 {cancelable: true},
//               );
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>

//       {loading ? (
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             <>
//               {(() => {
//                 const sources: {[key: string]: AppNotification[]} = {
//                   'Scheduled Outfits': [],
//                   'News Stories': [],
//                   'Weather Alerts': [],
//                   'Care Reminders': [],
//                   'Fashion News Stories': [],
//                 };

//                 filtered.forEach(n => {
//                   const cat = (n.category || '').toLowerCase();
//                   const title = (n.title || '').toLowerCase();
//                   const message = (n.message || '').toLowerCase();

//                   if (
//                     cat === 'scheduled_outfit' ||
//                     title.includes('outfit') ||
//                     message.includes('outfit') ||
//                     message.includes('reminder') ||
//                     message.includes('planned')
//                   ) {
//                     sources['Scheduled Outfits'].push(n);
//                   } else if (
//                     cat === 'news' ||
//                     title.includes('news') ||
//                     message.includes('headline') ||
//                     message.includes('story')
//                   ) {
//                     sources['News Stories'].push(n);
//                   } else if (
//                     cat === 'weather' ||
//                     title.includes('weather') ||
//                     message.includes('forecast') ||
//                     message.includes('temperature')
//                   ) {
//                     sources['Weather Alerts'].push(n);
//                   } else if (
//                     cat === 'care' ||
//                     title.includes('care') ||
//                     message.includes('wash') ||
//                     message.includes('laundry')
//                   ) {
//                     sources['Care Reminders'].push(n);
//                   } else {
//                     sources['Fashion News Stories'].push(n);
//                   }
//                 });

//                 const order = [
//                   'Scheduled Outfits',
//                   'News Stories',
//                   'Weather Alerts',
//                   'Care Reminders',
//                   'Fashion News Stories',
//                 ];

//                 const toggleGroup = (section: string) => {
//                   LayoutAnimation.configureNext(
//                     LayoutAnimation.create(
//                       300,
//                       LayoutAnimation.Types.easeInEaseOut,
//                       LayoutAnimation.Properties.opacity,
//                     ),
//                   );
//                   setExpandedGroups(prev => ({
//                     ...prev,
//                     [section]: !prev[section],
//                   }));
//                   h('selection');
//                 };

//                 return order.map(section => {
//                   const list = sources[section];
//                   if (!list || list.length === 0) return null;

//                   const expanded = expandedGroups[section] ?? false;
//                   const visibleItems = expanded ? list : list.slice(0, 2);

//                   return (
//                     <View key={section} style={{marginBottom: 18}}>
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'space-between',
//                           marginBottom: 8,
//                           paddingHorizontal: 4,
//                         }}>
//                         <Text
//                           style={{
//                             fontSize: 22,
//                             fontWeight: '500',
//                             color: theme.colors.foreground,
//                           }}>
//                           {section}
//                         </Text>

//                         {list.length > 3 && (
//                           <AppleTouchFeedback
//                             onPress={() => toggleGroup(section)}
//                             hapticStyle="impactLight"
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                               paddingVertical: 2,
//                               paddingHorizontal: 6,
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 20,
//                             }}>
//                             <MaterialIcons
//                               name="keyboard-arrow-down"
//                               size={28}
//                               color={theme.colors.buttonText1}
//                               style={{
//                                 marginTop: 1,
//                                 transform: [
//                                   {rotate: expanded ? '180deg' : '0deg'},
//                                 ],
//                               }}
//                             />
//                             <Text
//                               style={{
//                                 color: theme.colors.buttonText1,
//                                 fontWeight: '400',
//                                 fontSize: 13,
//                                 marginRight: 4,
//                               }}>
//                               {expanded ? 'Show Less' : 'Show More'}
//                             </Text>
//                           </AppleTouchFeedback>
//                         )}
//                       </View>

//                       {visibleItems.map((n, index) => (
//                         <Animatable.View
//                           key={n.id}
//                           animation="fadeInUp"
//                           duration={500}
//                           delay={index * 60}
//                           useNativeDriver
//                           style={{
//                             borderRadius: 20,
//                             overflow: 'hidden',
//                             // shadowColor: '#000',
//                             // shadowOpacity: 0.08,
//                             // shadowRadius: 12,
//                             // shadowOffset: {width: 0, height: 4},
//                             // elevation: 3,
//                           }}>
//                           <NotificationCard
//                             n={n}
//                             onPress={async () => {
//                               h('selection');
//                               await markRead(userId, n.id);

//                               if (n.deeplink) {
//                                 try {
//                                   await Linking.openURL(n.deeplink);
//                                   return;
//                                 } catch (e) {
//                                   console.error(
//                                     '❌ Failed to open deeplink:',
//                                     e,
//                                   );
//                                 }
//                               }

//                               if (n?.data?.screen) {
//                                 navigate(n.data.screen);
//                                 return;
//                               }

//                               switch ((n.category || '').toLowerCase()) {
//                                 case 'news':
//                                   navigate('FashionFeedScreen');
//                                   return;
//                                 case 'outfit':
//                                 case 'scheduled_outfit':
//                                   navigate('SavedOutfitsScreen');
//                                   return;
//                                 case 'weather':
//                                   navigate('WeatherScreen');
//                                   return;
//                                 case 'care':
//                                   navigate('CareRemindersScreen');
//                                   return;
//                               }

//                               const title = (n.title || '').toLowerCase();
//                               const msg = (n.message || '').toLowerCase();

//                               if (
//                                 title.includes('outfit') ||
//                                 msg.includes('outfit')
//                               ) {
//                                 navigate('SavedOutfits');
//                                 return;
//                               }

//                               if (
//                                 title.includes('news') ||
//                                 msg.includes('headline')
//                               ) {
//                                 navigate('FashionFeedScreen');
//                                 return;
//                               }

//                               if (
//                                 title.includes('weather') ||
//                                 msg.includes('forecast')
//                               ) {
//                                 navigate('WeatherScreen');
//                                 return;
//                               }

//                               if (
//                                 title.includes('care') ||
//                                 msg.includes('laundry')
//                               ) {
//                                 navigate('CareRemindersScreen');
//                                 return;
//                               }

//                               Alert.alert(
//                                 'Unknown notification',
//                                 `No screen mapped for:\nCategory: ${n.category}\nTitle: ${n.title}`,
//                               );
//                             }}
//                             onDelete={async id => {
//                               Alert.alert(
//                                 'Delete Notification?',
//                                 'Are you sure you want to delete this notification?',
//                                 [
//                                   {
//                                     text: 'Cancel',
//                                     style: 'cancel',
//                                     onPress: () => h('selection'),
//                                   },
//                                   {
//                                     text: 'Delete',
//                                     style: 'destructive',
//                                     onPress: async () => {
//                                       try {
//                                         h('impactHeavy');
//                                         await markRead(userId, id);
//                                         const updated = items.filter(
//                                           item => item.id !== id,
//                                         );
//                                         setItems(updated);
//                                       } catch (err) {
//                                         console.error(
//                                           '❌ Failed to delete notification:',
//                                           err,
//                                         );
//                                       }
//                                     },
//                                   },
//                                 ],
//                                 {cancelable: true},
//                               );
//                             }}
//                           />
//                         </Animatable.View>
//                       ))}
//                     </View>
//                   );
//                 });
//               })()}
//             </>
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//     // </GradientBackground>
//   );
// }

////////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
//   LayoutAnimation,
//   UIManager,
//   Platform,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import Tts from 'react-native-tts';

// if (
//   Platform.OS === 'android' &&
//   UIManager.setLayoutAnimationEnabledExperimental
// ) {
//   UIManager.setLayoutAnimationEnabledExperimental(true);
// }

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');
//   const [expandedGroups, setExpandedGroups] = useState<{
//     [key: string]: boolean;
//   }>({});

//   const {startVoiceCommand} = useVoiceControl();

//   // const handleVoiceCommand = (command: string) => {
//   //   const lower = command.toLowerCase();

//   //   if (lower.includes('mark all')) {
//   //     markAllRead(userId).then(load);
//   //   } else if (lower.includes('clear') || lower.includes('delete all')) {
//   //     clearAll(userId).then(load);
//   //   } else if (lower.includes('unread')) {
//   //     setFilter('unread');
//   //   } else if (lower.includes('all')) {
//   //     setFilter('all');
//   //   } else {
//   //     Alert.alert('Voice Command Not Recognized', command);
//   //   }
//   // };

//   const handleVoiceCommand = async (command: string) => {
//     const lower = command.toLowerCase();
//     console.log('🧠 Voice command received:', lower);

//     if (lower.includes('mark all') || lower.includes('marked as read')) {
//       await markAllRead(userId);
//       await load();
//       h('notificationSuccess');
//     } else if (
//       lower.includes('clear') ||
//       lower.includes('delete all') ||
//       lower.includes('cleared')
//     ) {
//       await clearAll(userId);
//       await load();
//       h('notificationWarning');
//     } else if (lower.includes('unread')) {
//       setFilter('unread');
//       h('selection');
//     } else if (lower.includes('all')) {
//       setFilter('all');
//       h('selection');
//     } else {
//       console.log('⚠️ Unrecognized command:', command);
//     }
//   };

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {flexDirection: 'row', alignItems: 'center'},
//     rightGroup: {flexDirection: 'row', alignItems: 'center'},
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       refreshControl={
//         <RefreshControl
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           tintColor={theme.colors.foreground}
//           colors={[theme.colors.primary]}
//           progressViewOffset={32}
//         />
//       }
//       contentContainerStyle={{paddingBottom: 32}}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       <AppleTouchFeedback
//         onPress={() => startVoiceCommand(handleVoiceCommand)}
//         hapticStyle="impactLight"
//         style={[styles.pill, {backgroundColor: theme.colors.button1}]}>
//         <MaterialIcons
//           name="keyboard-voice"
//           size={20}
//           color={theme.colors.buttonText1}
//         />
//         <Text style={[styles.pillText, {marginLeft: 4}]}>Voice</Text>
//       </AppleTouchFeedback>

//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               h('impactHeavy');
//               Alert.alert(
//                 'Clear All Notifications?',
//                 'This will permanently delete all your notifications and cannot be undone.',
//                 [
//                   {
//                     text: 'Cancel',
//                     style: 'cancel',
//                     onPress: () => h('selection'),
//                   },
//                   {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                       h('notificationWarning');
//                       await clearAll(userId);
//                       await load();
//                     },
//                   },
//                 ],
//                 {cancelable: true},
//               );
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>

//       {loading ? (
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             <>
//               {(() => {
//                 const sources: {[key: string]: AppNotification[]} = {
//                   'Scheduled Outfits': [],
//                   'News Stories': [],
//                   'Weather Alerts': [],
//                   'Care Reminders': [],
//                   'Fashion News Stories': [],
//                 };

//                 filtered.forEach(n => {
//                   const cat = (n.category || '').toLowerCase();
//                   const title = (n.title || '').toLowerCase();
//                   const message = (n.message || '').toLowerCase();

//                   if (
//                     cat === 'scheduled_outfit' ||
//                     title.includes('outfit') ||
//                     message.includes('outfit') ||
//                     message.includes('reminder') ||
//                     message.includes('planned')
//                   ) {
//                     sources['Scheduled Outfits'].push(n);
//                   } else if (
//                     cat === 'news' ||
//                     title.includes('news') ||
//                     message.includes('headline') ||
//                     message.includes('story')
//                   ) {
//                     sources['News Stories'].push(n);
//                   } else if (
//                     cat === 'weather' ||
//                     title.includes('weather') ||
//                     message.includes('forecast') ||
//                     message.includes('temperature')
//                   ) {
//                     sources['Weather Alerts'].push(n);
//                   } else if (
//                     cat === 'care' ||
//                     title.includes('care') ||
//                     message.includes('wash') ||
//                     message.includes('laundry')
//                   ) {
//                     sources['Care Reminders'].push(n);
//                   } else {
//                     sources['Fashion News Stories'].push(n);
//                   }
//                 });

//                 const order = [
//                   'Scheduled Outfits',
//                   'News Stories',
//                   'Weather Alerts',
//                   'Care Reminders',
//                   'Fashion News Stories',
//                 ];

//                 const toggleGroup = (section: string) => {
//                   LayoutAnimation.configureNext(
//                     LayoutAnimation.create(
//                       300,
//                       LayoutAnimation.Types.easeInEaseOut,
//                       LayoutAnimation.Properties.opacity,
//                     ),
//                   );
//                   setExpandedGroups(prev => ({
//                     ...prev,
//                     [section]: !prev[section],
//                   }));
//                   h('selection');
//                 };

//                 return order.map(section => {
//                   const list = sources[section];
//                   if (!list || list.length === 0) return null;

//                   const expanded = expandedGroups[section] ?? false;
//                   const visibleItems = expanded ? list : list.slice(0, 2);

//                   return (
//                     <View key={section} style={{marginBottom: 18}}>
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'space-between',
//                           marginBottom: 8,
//                           paddingHorizontal: 4,
//                         }}>
//                         <Text
//                           style={{
//                             fontSize: 22,
//                             fontWeight: '500',
//                             color: theme.colors.foreground,
//                           }}>
//                           {section}
//                         </Text>

//                         {list.length > 3 && (
//                           <AppleTouchFeedback
//                             onPress={() => toggleGroup(section)}
//                             hapticStyle="impactLight"
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                               paddingVertical: 2,
//                               paddingHorizontal: 6,
//                               backgroundColor: theme.colors.button1,
//                               borderRadius: 20,
//                             }}>
//                             <MaterialIcons
//                               name="keyboard-arrow-down"
//                               size={28}
//                               color={theme.colors.buttonText1}
//                               style={{
//                                 marginTop: 1,
//                                 transform: [
//                                   {rotate: expanded ? '180deg' : '0deg'},
//                                 ],
//                               }}
//                             />
//                             <Text
//                               style={{
//                                 color: theme.colors.buttonText1,
//                                 fontWeight: '400',
//                                 fontSize: 13,
//                                 marginRight: 4,
//                               }}>
//                               {expanded ? 'Show Less' : 'Show More'}
//                             </Text>
//                           </AppleTouchFeedback>
//                         )}
//                       </View>

//                       {visibleItems.map((n, index) => (
//                         <Animatable.View
//                           key={n.id}
//                           animation="fadeInUp"
//                           duration={500}
//                           delay={index * 60}
//                           useNativeDriver
//                           style={{
//                             borderRadius: 20,
//                             overflow: 'hidden',
//                             // shadowColor: '#000',
//                             // shadowOpacity: 0.08,
//                             // shadowRadius: 12,
//                             // shadowOffset: {width: 0, height: 4},
//                             // elevation: 3,
//                           }}>
//                           <NotificationCard
//                             n={n}
//                             onPress={async () => {
//                               h('selection');
//                               await markRead(userId, n.id);

//                               if (n.deeplink) {
//                                 try {
//                                   await Linking.openURL(n.deeplink);
//                                   return;
//                                 } catch (e) {
//                                   console.error(
//                                     '❌ Failed to open deeplink:',
//                                     e,
//                                   );
//                                 }
//                               }

//                               if (n?.data?.screen) {
//                                 navigate(n.data.screen);
//                                 return;
//                               }

//                               switch ((n.category || '').toLowerCase()) {
//                                 case 'news':
//                                   navigate('FashionFeedScreen');
//                                   return;
//                                 case 'outfit':
//                                 case 'scheduled_outfit':
//                                   navigate('SavedOutfitsScreen');
//                                   return;
//                                 case 'weather':
//                                   navigate('WeatherScreen');
//                                   return;
//                                 case 'care':
//                                   navigate('CareRemindersScreen');
//                                   return;
//                               }

//                               const title = (n.title || '').toLowerCase();
//                               const msg = (n.message || '').toLowerCase();

//                               if (
//                                 title.includes('outfit') ||
//                                 msg.includes('outfit')
//                               ) {
//                                 navigate('SavedOutfits');
//                                 return;
//                               }

//                               if (
//                                 title.includes('news') ||
//                                 msg.includes('headline')
//                               ) {
//                                 navigate('FashionFeedScreen');
//                                 return;
//                               }

//                               if (
//                                 title.includes('weather') ||
//                                 msg.includes('forecast')
//                               ) {
//                                 navigate('WeatherScreen');
//                                 return;
//                               }

//                               if (
//                                 title.includes('care') ||
//                                 msg.includes('laundry')
//                               ) {
//                                 navigate('CareRemindersScreen');
//                                 return;
//                               }

//                               Alert.alert(
//                                 'Unknown notification',
//                                 `No screen mapped for:\nCategory: ${n.category}\nTitle: ${n.title}`,
//                               );
//                             }}
//                             onDelete={async id => {
//                               Alert.alert(
//                                 'Delete Notification?',
//                                 'Are you sure you want to delete this notification?',
//                                 [
//                                   {
//                                     text: 'Cancel',
//                                     style: 'cancel',
//                                     onPress: () => h('selection'),
//                                   },
//                                   {
//                                     text: 'Delete',
//                                     style: 'destructive',
//                                     onPress: async () => {
//                                       try {
//                                         h('impactHeavy');
//                                         await markRead(userId, id);
//                                         const updated = items.filter(
//                                           item => item.id !== id,
//                                         );
//                                         setItems(updated);
//                                       } catch (err) {
//                                         console.error(
//                                           '❌ Failed to delete notification:',
//                                           err,
//                                         );
//                                       }
//                                     },
//                                   },
//                                 ],
//                                 {cancelable: true},
//                               );
//                             }}
//                           />
//                         </Animatable.View>
//                       ))}
//                     </View>
//                   );
//                 });
//               })()}
//             </>
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

///////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');
//   const [expandedGroups, setExpandedGroups] = useState<{
//     [key: string]: boolean;
//   }>({});

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {flexDirection: 'row', alignItems: 'center'},
//     rightGroup: {flexDirection: 'row', alignItems: 'center'},
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       refreshControl={
//         <RefreshControl
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           tintColor={theme.colors.foreground}
//           colors={[theme.colors.primary]}
//           progressViewOffset={32}
//         />
//       }
//       contentContainerStyle={{paddingBottom: 32}}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               h('impactHeavy');
//               Alert.alert(
//                 'Clear All Notifications?',
//                 'This will permanently delete all your notifications and cannot be undone.',
//                 [
//                   {
//                     text: 'Cancel',
//                     style: 'cancel',
//                     onPress: () => h('selection'),
//                   },
//                   {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                       h('notificationWarning');
//                       await clearAll(userId);
//                       await load();
//                     },
//                   },
//                 ],
//                 {cancelable: true},
//               );
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>

//       {/* Content */}
//       {loading ? (
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 iOS-style SOURCE-GROUPED notifications
//             <>
//               {(() => {
//                 const sources: {[key: string]: AppNotification[]} = {
//                   'Scheduled Outfits': [],
//                   'News Stories': [],
//                   'Weather Alerts': [],
//                   'Care Reminders': [],
//                   'Fashion News Stories': [],
//                 };

//                 filtered.forEach(n => {
//                   const cat = (n.category || '').toLowerCase();
//                   const title = (n.title || '').toLowerCase();
//                   const message = (n.message || '').toLowerCase();

//                   if (
//                     cat === 'scheduled_outfit' ||
//                     title.includes('outfit') ||
//                     message.includes('outfit') ||
//                     message.includes('reminder') ||
//                     message.includes('planned')
//                   ) {
//                     sources['Scheduled Outfits'].push(n);
//                   } else if (
//                     cat === 'news' ||
//                     title.includes('news') ||
//                     message.includes('headline') ||
//                     message.includes('story')
//                   ) {
//                     sources['News Stories'].push(n);
//                   } else if (
//                     cat === 'weather' ||
//                     title.includes('weather') ||
//                     message.includes('forecast') ||
//                     message.includes('temperature')
//                   ) {
//                     sources['Weather Alerts'].push(n);
//                   } else if (
//                     cat === 'care' ||
//                     title.includes('care') ||
//                     message.includes('wash') ||
//                     message.includes('laundry')
//                   ) {
//                     sources['Care Reminders'].push(n);
//                   } else {
//                     sources['Fashion News Stories'].push(n);
//                   }
//                 });

//                 const order = [
//                   'Scheduled Outfits',
//                   'News Stories',
//                   'Weather Alerts',
//                   'Care Reminders',
//                   'Fashion News Stories',
//                 ];

//                 const toggleGroup = (section: string) => {
//                   setExpandedGroups(prev => ({
//                     ...prev,
//                     [section]: !prev[section],
//                   }));
//                 };

//                 return order.map(section => {
//                   const list = sources[section];
//                   if (!list || list.length === 0) return null;

//                   const expanded = expandedGroups[section] ?? false;
//                   const visibleItems = expanded ? list : list.slice(0, 2);

//                   return (
//                     <View key={section} style={{marginBottom: 18}}>
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'space-between',
//                           marginBottom: 8,
//                           paddingHorizontal: 4,
//                         }}>
//                         <Text
//                           style={{
//                             fontSize: 22,
//                             fontWeight: '500',
//                             color: theme.colors.foreground,
//                           }}>
//                           {section}
//                         </Text>

//                         {list.length > 3 && (
//                           <AppleTouchFeedback
//                             onPress={() => toggleGroup(section)}
//                             hapticStyle="impactLight"
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                               paddingVertical: 2,
//                               paddingHorizontal: 6,
//                               backgroundColor: theme.colors.surface3,
//                               borderRadius: 20,
//                             }}>
//                             <MaterialIcons
//                               name="keyboard-arrow-down"
//                               size={28}
//                               color={theme.colors.buttonText1}
//                               style={{marginTop: 1}}
//                             />
//                             <Text
//                               style={{
//                                 color: theme.colors.buttonText1,
//                                 fontWeight: '400',
//                                 fontSize: 13,
//                                 marginRight: 4,
//                               }}>
//                               {expanded ? 'Show Less' : 'Show More'}
//                             </Text>
//                             <Animatable.View
//                               duration={250}
//                               easing="ease-out"
//                               style={{
//                                 transform: [
//                                   {rotate: expanded ? '180deg' : '0deg'},
//                                 ],
//                               }}></Animatable.View>
//                           </AppleTouchFeedback>
//                         )}
//                       </View>

//                       {visibleItems.map((n, index) => (
//                         <Animatable.View
//                           key={n.id}
//                           animation="fadeInUp"
//                           duration={500}
//                           delay={index * 60}
//                           useNativeDriver
//                           style={{
//                             // marginBottom: 8,
//                             borderRadius: 20,
//                             overflow: 'hidden',
//                             // backgroundColor: theme.isDark
//                             //   ? 'rgba(255,255,255,0.06)'
//                             //   : theme.colors.surface3,
//                             shadowColor: '#000',
//                             shadowOpacity: 0.08,
//                             shadowRadius: 12,
//                             shadowOffset: {width: 0, height: 4},
//                             elevation: 3,
//                           }}>
//                           <NotificationCard
//                             n={n}
//                             onPress={async () => {
//                               h('selection');
//                               await markRead(userId, n.id);

//                               // 1️⃣ Try deep link first (external URL)
//                               if (n.deeplink) {
//                                 try {
//                                   await Linking.openURL(n.deeplink);
//                                   return;
//                                 } catch (e) {
//                                   console.error(
//                                     '❌ Failed to open deeplink:',
//                                     e,
//                                   );
//                                 }
//                               }

//                               // 2️⃣ Try explicit screen field from data payload
//                               if (n?.data?.screen) {
//                                 navigate(n.data.screen);
//                                 return;
//                               }

//                               // 3️⃣ Route based on category (most reliable)
//                               switch ((n.category || '').toLowerCase()) {
//                                 case 'news':
//                                   navigate('FashionFeedScreen');
//                                   return;

//                                 case 'outfit':
//                                 case 'scheduled_outfit':
//                                   navigate('SavedOutfitsScreen');
//                                   return;

//                                 case 'weather':
//                                   navigate('WeatherScreen');
//                                   return;

//                                 case 'care':
//                                   navigate('CareRemindersScreen');
//                                   return;
//                               }

//                               // 4️⃣ Keyword detection fallback
//                               const title = (n.title || '').toLowerCase();
//                               const msg = (n.message || '').toLowerCase();

//                               if (
//                                 title.includes('outfit') ||
//                                 msg.includes('outfit')
//                               ) {
//                                 navigate('SavedOutfits');
//                                 return;
//                               }

//                               if (
//                                 title.includes('news') ||
//                                 msg.includes('headline')
//                               ) {
//                                 navigate('FashionFeedScreen');
//                                 return;
//                               }

//                               if (
//                                 title.includes('weather') ||
//                                 msg.includes('forecast')
//                               ) {
//                                 navigate('WeatherScreen');
//                                 return;
//                               }

//                               if (
//                                 title.includes('care') ||
//                                 msg.includes('laundry')
//                               ) {
//                                 navigate('CareRemindersScreen');
//                                 return;
//                               }

//                               // 5️⃣ If we still can’t guess, show an alert to debug
//                               Alert.alert(
//                                 'Unknown notification',
//                                 `No screen mapped for:\nCategory: ${n.category}\nTitle: ${n.title}`,
//                               );
//                             }}
//                             onDelete={async id => {
//                               Alert.alert(
//                                 'Delete Notification?',
//                                 'Are you sure you want to delete this notification?',
//                                 [
//                                   {
//                                     text: 'Cancel',
//                                     style: 'cancel',
//                                     onPress: () => h('selection'),
//                                   },
//                                   {
//                                     text: 'Delete',
//                                     style: 'destructive',
//                                     onPress: async () => {
//                                       try {
//                                         h('impactHeavy');
//                                         await markRead(userId, id);
//                                         const updated = items.filter(
//                                           item => item.id !== id,
//                                         );
//                                         setItems(updated);
//                                       } catch (err) {
//                                         console.error(
//                                           '❌ Failed to delete notification:',
//                                           err,
//                                         );
//                                       }
//                                     },
//                                   },
//                                 ],
//                                 {cancelable: true},
//                               );
//                             }}
//                           />
//                         </Animatable.View>
//                       ))}
//                     </View>
//                   );
//                 });
//               })()}
//             </>
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');
//   const [expandedGroups, setExpandedGroups] = useState<{
//     [key: string]: boolean;
//   }>({});

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {flexDirection: 'row', alignItems: 'center'},
//     rightGroup: {flexDirection: 'row', alignItems: 'center'},
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       refreshControl={
//         <RefreshControl
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           tintColor={theme.colors.foreground}
//           colors={[theme.colors.primary]}
//           progressViewOffset={32}
//         />
//       }
//       contentContainerStyle={{paddingBottom: 32}}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               h('impactHeavy');
//               Alert.alert(
//                 'Clear All Notifications?',
//                 'This will permanently delete all your notifications and cannot be undone.',
//                 [
//                   {
//                     text: 'Cancel',
//                     style: 'cancel',
//                     onPress: () => h('selection'),
//                   },
//                   {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                       h('notificationWarning');
//                       await clearAll(userId);
//                       await load();
//                     },
//                   },
//                 ],
//                 {cancelable: true},
//               );
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>

//       {/* Content */}
//       {loading ? (
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 iOS-style SOURCE-GROUPED notifications
//             <>
//               {(() => {
//                 const sources: {[key: string]: AppNotification[]} = {
//                   'Scheduled Outfits': [],
//                   'News Stories': [],
//                   'Weather Alerts': [],
//                   'Care Reminders': [],
//                   'Fashion News Stories': [],
//                 };

//                 filtered.forEach(n => {
//                   const cat = (n.category || '').toLowerCase();
//                   const title = (n.title || '').toLowerCase();
//                   const message = (n.message || '').toLowerCase();

//                   if (
//                     cat === 'scheduled_outfit' ||
//                     title.includes('outfit') ||
//                     message.includes('outfit') ||
//                     message.includes('reminder') ||
//                     message.includes('planned')
//                   ) {
//                     sources['Scheduled Outfits'].push(n);
//                   } else if (
//                     cat === 'news' ||
//                     title.includes('news') ||
//                     message.includes('headline') ||
//                     message.includes('story')
//                   ) {
//                     sources['News Stories'].push(n);
//                   } else if (
//                     cat === 'weather' ||
//                     title.includes('weather') ||
//                     message.includes('forecast') ||
//                     message.includes('temperature')
//                   ) {
//                     sources['Weather Alerts'].push(n);
//                   } else if (
//                     cat === 'care' ||
//                     title.includes('care') ||
//                     message.includes('wash') ||
//                     message.includes('laundry')
//                   ) {
//                     sources['Care Reminders'].push(n);
//                   } else {
//                     sources['Fashion News Stories'].push(n);
//                   }
//                 });

//                 const order = [
//                   'Scheduled Outfits',
//                   'News Stories',
//                   'Weather Alerts',
//                   'Care Reminders',
//                   'Fashion News Stories',
//                 ];

//                 const toggleGroup = (section: string) => {
//                   setExpandedGroups(prev => ({
//                     ...prev,
//                     [section]: !prev[section],
//                   }));
//                 };

//                 return order.map(section => {
//                   const list = sources[section];
//                   if (!list || list.length === 0) return null;

//                   const expanded = expandedGroups[section] ?? false;
//                   const visibleItems = expanded ? list : list.slice(0, 2);

//                   return (
//                     <View key={section} style={{marginBottom: 18}}>
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'space-between',
//                           marginBottom: 8,
//                           paddingHorizontal: 4,
//                         }}>
//                         <Text
//                           style={{
//                             fontSize: 22,
//                             fontWeight: '500',
//                             color: theme.colors.foreground,
//                           }}>
//                           {section}
//                         </Text>

//                         {list.length > 3 && (
//                           <AppleTouchFeedback
//                             onPress={() => toggleGroup(section)}
//                             hapticStyle="impactLight"
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                               paddingVertical: 2,
//                               paddingHorizontal: 6,
//                               backgroundColor: theme.colors.surface3,
//                               borderRadius: 20,
//                             }}>
//                             <MaterialIcons
//                               name="keyboard-arrow-down"
//                               size={28}
//                               color={theme.colors.buttonText1}
//                               style={{marginTop: 1}}
//                             />
//                             <Text
//                               style={{
//                                 color: theme.colors.buttonText1,
//                                 fontWeight: '400',
//                                 fontSize: 13,
//                                 marginRight: 4,
//                               }}>
//                               {expanded ? 'Show Less' : 'Show More'}
//                             </Text>
//                             <Animatable.View
//                               duration={250}
//                               easing="ease-out"
//                               style={{
//                                 transform: [
//                                   {rotate: expanded ? '180deg' : '0deg'},
//                                 ],
//                               }}></Animatable.View>
//                           </AppleTouchFeedback>
//                         )}
//                       </View>

//                       {visibleItems.map((n, index) => (
//                         <Animatable.View
//                           key={n.id}
//                           animation="fadeInUp"
//                           duration={500}
//                           delay={index * 60}
//                           useNativeDriver
//                           style={{
//                             // marginBottom: 8,
//                             borderRadius: 20,
//                             overflow: 'hidden',
//                             // backgroundColor: theme.isDark
//                             //   ? 'rgba(255,255,255,0.06)'
//                             //   : theme.colors.surface3,
//                             shadowColor: '#000',
//                             shadowOpacity: 0.08,
//                             shadowRadius: 12,
//                             shadowOffset: {width: 0, height: 4},
//                             elevation: 3,
//                           }}>
//                           <NotificationCard
//                             n={n}
//                             onPress={async () => {
//                               h('selection');
//                               await markRead(userId, n.id);
//                               if (n.deeplink) {
//                                 try {
//                                   await Linking.openURL(n.deeplink);
//                                 } catch {}
//                               } else if (n.category === 'news') {
//                                 navigate('FashionFeedScreen');
//                               }
//                               await load();
//                             }}
//                             onDelete={async id => {
//                               Alert.alert(
//                                 'Delete Notification?',
//                                 'Are you sure you want to delete this notification?',
//                                 [
//                                   {
//                                     text: 'Cancel',
//                                     style: 'cancel',
//                                     onPress: () => h('selection'),
//                                   },
//                                   {
//                                     text: 'Delete',
//                                     style: 'destructive',
//                                     onPress: async () => {
//                                       try {
//                                         h('impactHeavy');
//                                         await markRead(userId, id);
//                                         const updated = items.filter(
//                                           item => item.id !== id,
//                                         );
//                                         setItems(updated);
//                                       } catch (err) {
//                                         console.error(
//                                           '❌ Failed to delete notification:',
//                                           err,
//                                         );
//                                       }
//                                     },
//                                   },
//                                 ],
//                                 {cancelable: true},
//                               );
//                             }}
//                           />
//                         </Animatable.View>
//                       ))}
//                     </View>
//                   );
//                 });
//               })()}
//             </>
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');
//   const [expandedGroups, setExpandedGroups] = useState<{
//     [key: string]: boolean;
//   }>({});

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {flexDirection: 'row', alignItems: 'center'},
//     rightGroup: {flexDirection: 'row', alignItems: 'center'},
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       refreshControl={
//         <RefreshControl
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           tintColor={theme.colors.foreground}
//           colors={[theme.colors.primary]}
//           progressViewOffset={32}
//         />
//       }
//       contentContainerStyle={{paddingBottom: 32}}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               h('impactHeavy');
//               Alert.alert(
//                 'Clear All Notifications?',
//                 'This will permanently delete all your notifications and cannot be undone.',
//                 [
//                   {
//                     text: 'Cancel',
//                     style: 'cancel',
//                     onPress: () => h('selection'),
//                   },
//                   {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                       h('notificationWarning');
//                       await clearAll(userId);
//                       await load();
//                     },
//                   },
//                 ],
//                 {cancelable: true},
//               );
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>

//       {/* Content */}
//       {loading ? (
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 iOS-style SOURCE-GROUPED notifications
//             <>
//               {(() => {
//                 const sources: {[key: string]: AppNotification[]} = {
//                   '📅 Scheduled Outfits': [],
//                   '📰 News Stories': [],
//                   '☁️ Weather Alerts': [],
//                   '🪡 Care Reminders': [],
//                   '📦 Fashion News Stories': [],
//                 };

//                 filtered.forEach(n => {
//                   const cat = (n.category || '').toLowerCase();
//                   const title = (n.title || '').toLowerCase();
//                   const message = (n.message || '').toLowerCase();

//                   if (
//                     cat === 'scheduled_outfit' ||
//                     title.includes('outfit') ||
//                     message.includes('outfit') ||
//                     message.includes('reminder') ||
//                     message.includes('planned')
//                   ) {
//                     sources['📅 Scheduled Outfits'].push(n);
//                   } else if (
//                     cat === 'news' ||
//                     title.includes('news') ||
//                     message.includes('headline') ||
//                     message.includes('story')
//                   ) {
//                     sources['📰 News Stories'].push(n);
//                   } else if (
//                     cat === 'weather' ||
//                     title.includes('weather') ||
//                     message.includes('forecast') ||
//                     message.includes('temperature')
//                   ) {
//                     sources['☁️ Weather Alerts'].push(n);
//                   } else if (
//                     cat === 'care' ||
//                     title.includes('care') ||
//                     message.includes('wash') ||
//                     message.includes('laundry')
//                   ) {
//                     sources['🪡 Care Reminders'].push(n);
//                   } else {
//                     sources['📦 Fashion News Stories'].push(n);
//                   }
//                 });

//                 const order = [
//                   '📅 Scheduled Outfits',
//                   '📰 News Stories',
//                   '☁️ Weather Alerts',
//                   '🪡 Care Reminders',
//                   '📦 Fashion News Stories',
//                 ];

//                 const toggleGroup = (section: string) => {
//                   setExpandedGroups(prev => ({
//                     ...prev,
//                     [section]: !prev[section],
//                   }));
//                 };

//                 return order.map(section => {
//                   const list = sources[section];
//                   if (!list || list.length === 0) return null;

//                   const expanded = expandedGroups[section] ?? false;
//                   const visibleItems = expanded ? list : list.slice(0, 2);

//                   return (
//                     <View key={section} style={{marginBottom: 28}}>
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'space-between',
//                           marginBottom: 12,
//                           paddingHorizontal: 4,
//                         }}>
//                         <Text
//                           style={{
//                             fontSize: 20,
//                             fontWeight: '700',
//                             color: theme.colors.foreground,
//                           }}>
//                           {section}
//                         </Text>

//                         {list.length > 3 && (
//                           <AppleTouchFeedback
//                             onPress={() => toggleGroup(section)}
//                             hapticStyle="impactLight"
//                             style={{
//                               flexDirection: 'row',
//                               alignItems: 'center',
//                               paddingVertical: 2,
//                               paddingHorizontal: 6,
//                               backgroundColor: theme.colors.surface3,
//                               borderRadius: 20,
//                             }}>
//                             <MaterialIcons
//                               name="keyboard-arrow-down"
//                               size={28}
//                               color={theme.colors.buttonText1}
//                               style={{marginTop: 1}}
//                             />
//                             <Text
//                               style={{
//                                 color: theme.colors.buttonText1,
//                                 fontWeight: '400',
//                                 fontSize: 13,
//                                 marginRight: 4,
//                               }}>
//                               {expanded ? 'Show Less' : 'Show More'}
//                             </Text>
//                             <Animatable.View
//                               duration={250}
//                               easing="ease-out"
//                               style={{
//                                 transform: [
//                                   {rotate: expanded ? '180deg' : '0deg'},
//                                 ],
//                               }}></Animatable.View>
//                           </AppleTouchFeedback>
//                         )}
//                       </View>

//                       {visibleItems.map((n, index) => (
//                         <Animatable.View
//                           key={n.id}
//                           animation="fadeInUp"
//                           duration={500}
//                           delay={index * 60}
//                           useNativeDriver
//                           style={{
//                             marginBottom: 8,
//                             borderRadius: 20,
//                             overflow: 'hidden',
//                             // backgroundColor: theme.isDark
//                             //   ? 'rgba(255,255,255,0.06)'
//                             //   : theme.colors.surface3,
//                             shadowColor: '#000',
//                             shadowOpacity: 0.08,
//                             shadowRadius: 12,
//                             shadowOffset: {width: 0, height: 4},
//                             elevation: 3,
//                           }}>
//                           <NotificationCard
//                             n={n}
//                             onPress={async () => {
//                               h('selection');
//                               await markRead(userId, n.id);
//                               if (n.deeplink) {
//                                 try {
//                                   await Linking.openURL(n.deeplink);
//                                 } catch {}
//                               } else if (n.category === 'news') {
//                                 navigate('FashionFeedScreen');
//                               }
//                               await load();
//                             }}
//                             onDelete={async id => {
//                               Alert.alert(
//                                 'Delete Notification?',
//                                 'Are you sure you want to delete this notification?',
//                                 [
//                                   {
//                                     text: 'Cancel',
//                                     style: 'cancel',
//                                     onPress: () => h('selection'),
//                                   },
//                                   {
//                                     text: 'Delete',
//                                     style: 'destructive',
//                                     onPress: async () => {
//                                       try {
//                                         h('impactHeavy');
//                                         await markRead(userId, id);
//                                         const updated = items.filter(
//                                           item => item.id !== id,
//                                         );
//                                         setItems(updated);
//                                       } catch (err) {
//                                         console.error(
//                                           '❌ Failed to delete notification:',
//                                           err,
//                                         );
//                                       }
//                                     },
//                                   },
//                                 ],
//                                 {cancelable: true},
//                               );
//                             }}
//                           />
//                         </Animatable.View>
//                       ))}
//                     </View>
//                   );
//                 });
//               })()}
//             </>
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

//////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');
//   const [expandedGroups, setExpandedGroups] = useState<{
//     [key: string]: boolean;
//   }>({});

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {flexDirection: 'row', alignItems: 'center'},
//     rightGroup: {flexDirection: 'row', alignItems: 'center'},
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       refreshControl={
//         <RefreshControl
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           tintColor={theme.colors.foreground}
//           colors={[theme.colors.primary]}
//           progressViewOffset={32}
//         />
//       }
//       contentContainerStyle={{paddingBottom: 32}}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               h('impactHeavy');
//               Alert.alert(
//                 'Clear All Notifications?',
//                 'This will permanently delete all your notifications and cannot be undone.',
//                 [
//                   {
//                     text: 'Cancel',
//                     style: 'cancel',
//                     onPress: () => h('selection'),
//                   },
//                   {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                       h('notificationWarning');
//                       await clearAll(userId);
//                       await load();
//                     },
//                   },
//                 ],
//                 {cancelable: true},
//               );
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>

//       {/* Content */}
//       {loading ? (
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 iOS-style SOURCE-GROUPED notifications
//             <>
//               {(() => {
//                 const sources: {[key: string]: AppNotification[]} = {
//                   '📅 Scheduled Outfits': [],
//                   '📰 News Stories': [],
//                   '☁️ Weather Alerts': [],
//                   '🪡 Care Reminders': [],
//                   '📦 Fashion News Stories': [],
//                 };

//                 filtered.forEach(n => {
//                   const cat = (n.category || '').toLowerCase();
//                   const title = (n.title || '').toLowerCase();
//                   const message = (n.message || '').toLowerCase();

//                   if (
//                     cat === 'scheduled_outfit' ||
//                     title.includes('outfit') ||
//                     message.includes('outfit') ||
//                     message.includes('reminder') ||
//                     message.includes('planned')
//                   ) {
//                     sources['📅 Scheduled Outfits'].push(n);
//                   } else if (
//                     cat === 'news' ||
//                     title.includes('news') ||
//                     message.includes('headline') ||
//                     message.includes('story')
//                   ) {
//                     sources['📰 News Stories'].push(n);
//                   } else if (
//                     cat === 'weather' ||
//                     title.includes('weather') ||
//                     message.includes('forecast') ||
//                     message.includes('temperature')
//                   ) {
//                     sources['☁️ Weather Alerts'].push(n);
//                   } else if (
//                     cat === 'care' ||
//                     title.includes('care') ||
//                     message.includes('wash') ||
//                     message.includes('laundry')
//                   ) {
//                     sources['🪡 Care Reminders'].push(n);
//                   } else {
//                     sources['📦 Fashion News Stories'].push(n);
//                   }
//                 });

//                 const order = [
//                   '📅 Scheduled Outfits',
//                   '📰 News Stories',
//                   '☁️ Weather Alerts',
//                   '🪡 Care Reminders',
//                   '📦 Fashion News Stories',
//                 ];

//                 const toggleGroup = (section: string) => {
//                   setExpandedGroups(prev => ({
//                     ...prev,
//                     [section]: !prev[section],
//                   }));
//                 };

//                 return order.map(section => {
//                   const list = sources[section];
//                   if (!list || list.length === 0) return null;

//                   const expanded = expandedGroups[section] ?? false;
//                   const visibleItems = expanded ? list : list.slice(0, 2);

//                   return (
//                     <View key={section} style={{marginBottom: 28}}>
//                       <View
//                         style={{
//                           flexDirection: 'row',
//                           alignItems: 'center',
//                           justifyContent: 'space-between',
//                           marginBottom: 12,
//                           paddingHorizontal: 4,
//                         }}>
//                         <Text
//                           style={{
//                             fontSize: 20,
//                             fontWeight: '700',
//                             color: theme.colors.foreground,
//                           }}>
//                           {section}
//                         </Text>

//                         {list.length > 3 && (
//                           <AppleTouchFeedback
//                             onPress={() => toggleGroup(section)}
//                             hapticStyle="impactLight"
//                             style={{
//                               paddingVertical: 4,
//                               paddingHorizontal: 8,
//                             }}>
//                             <Text
//                               style={{
//                                 color: '#0A84FF',
//                                 fontWeight: '600',
//                                 fontSize: 15,
//                               }}>
//                               {expanded ? 'Show Less' : 'Show More'}
//                             </Text>
//                           </AppleTouchFeedback>
//                         )}
//                       </View>

//                       {visibleItems.map((n, index) => (
//                         <Animatable.View
//                           key={n.id}
//                           animation="fadeInUp"
//                           duration={500}
//                           delay={index * 60}
//                           useNativeDriver
//                           style={{
//                             marginBottom: 8,
//                             borderRadius: 20,
//                             overflow: 'hidden',
//                             backgroundColor: theme.isDark
//                               ? 'rgba(255,255,255,0.06)'
//                               : 'rgba(255,255,255,0.9)',
//                             shadowColor: '#000',
//                             shadowOpacity: 0.08,
//                             shadowRadius: 12,
//                             shadowOffset: {width: 0, height: 4},
//                             elevation: 3,
//                           }}>
//                           <NotificationCard
//                             n={n}
//                             onPress={async () => {
//                               h('selection');
//                               await markRead(userId, n.id);
//                               if (n.deeplink) {
//                                 try {
//                                   await Linking.openURL(n.deeplink);
//                                 } catch {}
//                               } else if (n.category === 'news') {
//                                 navigate('FashionFeedScreen');
//                               }
//                               await load();
//                             }}
//                             onDelete={async id => {
//                               Alert.alert(
//                                 'Delete Notification?',
//                                 'Are you sure you want to delete this notification?',
//                                 [
//                                   {
//                                     text: 'Cancel',
//                                     style: 'cancel',
//                                     onPress: () => h('selection'),
//                                   },
//                                   {
//                                     text: 'Delete',
//                                     style: 'destructive',
//                                     onPress: async () => {
//                                       try {
//                                         h('impactHeavy');
//                                         await markRead(userId, id);
//                                         const updated = items.filter(
//                                           item => item.id !== id,
//                                         );
//                                         setItems(updated);
//                                       } catch (err) {
//                                         console.error(
//                                           '❌ Failed to delete notification:',
//                                           err,
//                                         );
//                                       }
//                                     },
//                                   },
//                                 ],
//                                 {cancelable: true},
//                               );
//                             }}
//                           />
//                         </Animatable.View>
//                       ))}
//                     </View>
//                   );
//                 });
//               })()}
//             </>
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {flexDirection: 'row', alignItems: 'center'},
//     rightGroup: {flexDirection: 'row', alignItems: 'center'},
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       refreshControl={
//         <RefreshControl
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           tintColor={theme.colors.foreground}
//           colors={[theme.colors.primary]}
//           progressViewOffset={32}
//         />
//       }
//       contentContainerStyle={{paddingBottom: 32}}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               h('impactHeavy');
//               Alert.alert(
//                 'Clear All Notifications?',
//                 'This will permanently delete all your notifications and cannot be undone.',
//                 [
//                   {
//                     text: 'Cancel',
//                     style: 'cancel',
//                     onPress: () => h('selection'),
//                   },
//                   {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                       h('notificationWarning');
//                       await clearAll(userId);
//                       await load();
//                     },
//                   },
//                 ],
//                 {cancelable: true},
//               );
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>

//       {/* Content */}
//       {loading ? (
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 iOS-style SOURCE-GROUPED notifications
//             <>
//               {(() => {
//                 const sources: {[key: string]: AppNotification[]} = {
//                   '📅 Scheduled Outfits': [],
//                   '📰 News Stories': [],
//                   '☁️ Weather Alerts': [],
//                   '🪡 Care Reminders': [],
//                   '📦 Fashion News Stories': [],
//                 };

//                 filtered.forEach(n => {
//                   const cat = (n.category || '').toLowerCase();
//                   const title = (n.title || '').toLowerCase();
//                   const message = (n.message || '').toLowerCase();

//                   if (
//                     cat === 'scheduled_outfit' ||
//                     title.includes('outfit') ||
//                     message.includes('outfit') ||
//                     message.includes('reminder') ||
//                     message.includes('planned')
//                   ) {
//                     sources['📅 Scheduled Outfits'].push(n);
//                   } else if (
//                     cat === 'news' ||
//                     title.includes('news') ||
//                     message.includes('headline') ||
//                     message.includes('story')
//                   ) {
//                     sources['📰 News Stories'].push(n);
//                   } else if (
//                     cat === 'weather' ||
//                     title.includes('weather') ||
//                     message.includes('forecast') ||
//                     message.includes('temperature')
//                   ) {
//                     sources['☁️ Weather Alerts'].push(n);
//                   } else if (
//                     cat === 'care' ||
//                     title.includes('care') ||
//                     message.includes('wash') ||
//                     message.includes('laundry')
//                   ) {
//                     sources['🪡 Care Reminders'].push(n);
//                   } else {
//                     sources['📦 Fashion News Stories'].push(n);
//                   }
//                 });

//                 const order = [
//                   '📅 Scheduled Outfits',
//                   '📰 News Stories',
//                   '☁️ Weather Alerts',
//                   '🪡 Care Reminders',
//                   '📦 Fashion News Stories',
//                 ];

//                 return order.map(section => {
//                   const list = sources[section];
//                   if (!list || list.length === 0) return null;

//                   return (
//                     <View key={section} style={{marginBottom: 28}}>
//                       <Text
//                         style={{
//                           fontSize: 20,
//                           fontWeight: '700',
//                           color: theme.colors.foreground,
//                           marginBottom: 12,
//                           paddingHorizontal: 4,
//                         }}>
//                         {section}
//                       </Text>
//                       {list.map((n, index) => (
//                         <Animatable.View
//                           key={n.id}
//                           animation="bounceInUp"
//                           duration={3200}
//                           delay={index * 120}
//                           easing="ease-out-cubic"
//                           useNativeDriver
//                           style={{marginBottom: 0}}>
//                           <NotificationCard
//                             n={n}
//                             onPress={async () => {
//                               h('selection');
//                               await markRead(userId, n.id);
//                               if (n.deeplink) {
//                                 try {
//                                   await Linking.openURL(n.deeplink);
//                                 } catch {}
//                               } else if (n.category === 'news') {
//                                 navigate('FashionFeedScreen');
//                               }
//                               await load();
//                             }}
//                             onDelete={async id => {
//                               Alert.alert(
//                                 'Delete Notification?',
//                                 'Are you sure you want to delete this notification?',
//                                 [
//                                   {
//                                     text: 'Cancel',
//                                     style: 'cancel',
//                                     onPress: () => h('selection'),
//                                   },
//                                   {
//                                     text: 'Delete',
//                                     style: 'destructive',
//                                     onPress: async () => {
//                                       try {
//                                         h('impactHeavy');
//                                         await markRead(userId, id);
//                                         const updated = items.filter(
//                                           item => item.id !== id,
//                                         );
//                                         setItems(updated);
//                                       } catch (err) {
//                                         console.error(
//                                           '❌ Failed to delete notification:',
//                                           err,
//                                         );
//                                       }
//                                     },
//                                   },
//                                 ],
//                                 {cancelable: true},
//                               );
//                             }}
//                           />
//                         </Animatable.View>
//                       ))}
//                     </View>
//                   );
//                 });
//               })()}
//             </>
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

/////////////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
//   subscribeInboxChange,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     rightGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       console.log('📦 FULL MSG:', JSON.stringify(msg, null, 2));
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     console.log('[NotificationsScreen] Pull to refresh triggered');
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       refreshControl={
//         <RefreshControl
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           tintColor={theme.colors.foreground}
//           colors={[theme.colors.primary]}
//           progressViewOffset={32}
//         />
//       }
//       contentContainerStyle={{paddingBottom: 32}}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               h('impactHeavy');
//               Alert.alert(
//                 'Clear All Notifications?',
//                 'This will permanently delete all your notifications and cannot be undone.',
//                 [
//                   {
//                     text: 'Cancel',
//                     style: 'cancel',
//                     onPress: () => h('selection'),
//                   },
//                   {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                       h('notificationWarning');
//                       await clearAll(userId);
//                       await load();
//                     },
//                   },
//                 ],
//                 {cancelable: true},
//               );
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>

//       {/* Content */}
//       {loading ? (
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 iOS-style grouped notifications
//             (() => {
//               const groups: {[key: string]: AppNotification[]} = {};
//               filtered.forEach(n => {
//                 const date = new Date(n.timestamp);
//                 const now = new Date();
//                 const diffDays = Math.floor(
//                   (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
//                 );
//                 let label = 'Earlier';
//                 if (diffDays === 0) label = 'Today';
//                 else if (diffDays === 1) label = 'Yesterday';
//                 else if (diffDays < 7) label = 'This Week';
//                 if (!groups[label]) groups[label] = [];
//                 groups[label].push(n);
//               });
//               const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
//               return order.map(group => {
//                 if (!groups[group]) return null;
//                 return (
//                   <View key={group} style={{marginBottom: 28}}>
//                     <Text
//                       style={{
//                         fontSize: 20,
//                         fontWeight: '700',
//                         color: theme.colors.foreground,
//                         marginBottom: 12,
//                         paddingHorizontal: 4,
//                       }}>
//                       {group}
//                     </Text>
//                     {groups[group].map((n, index) => (
//                       <Animatable.View
//                         key={n.id}
//                         animation="bounceInUp"
//                         duration={3200}
//                         delay={index * 120}
//                         easing="ease-out-cubic"
//                         useNativeDriver
//                         style={{marginBottom: 0}}>
//                         <NotificationCard
//                           n={n}
//                           onPress={async () => {
//                             h('selection');
//                             await markRead(userId, n.id);
//                             if (n.deeplink) {
//                               try {
//                                 await Linking.openURL(n.deeplink);
//                               } catch {}
//                             } else if (n.category === 'news') {
//                               navigate('FashionFeedScreen');
//                             }
//                             await load();
//                           }}
//                           onDelete={async id => {
//                             Alert.alert(
//                               'Delete Notification?',
//                               'Are you sure you want to delete this notification?',
//                               [
//                                 {
//                                   text: 'Cancel',
//                                   style: 'cancel',
//                                   onPress: () => h('selection'),
//                                 },
//                                 {
//                                   text: 'Delete',
//                                   style: 'destructive',
//                                   onPress: async () => {
//                                     try {
//                                       h('impactHeavy');
//                                       await markRead(userId, id);
//                                       const updated = items.filter(
//                                         item => item.id !== id,
//                                       );
//                                       setItems(updated);
//                                     } catch (err) {
//                                       console.error(
//                                         '❌ Failed to delete notification:',
//                                         err,
//                                       );
//                                     }
//                                   },
//                                 },
//                               ],
//                               {cancelable: true},
//                             );
//                           }}
//                         />
//                       </Animatable.View>
//                     ))}
//                   </View>
//                 );
//               });
//             })()
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

////////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
//   subscribeInboxChange,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     rightGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       console.log('📦 FULL MSG:', JSON.stringify(msg, null, 2));
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     console.log('[NotificationsScreen] Pull to refresh triggered');
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       refreshControl={
//         <RefreshControl
//           refreshing={refreshing}
//           onRefresh={onRefresh}
//           tintColor={theme.colors.foreground}
//           colors={[theme.colors.primary]}
//           progressViewOffset={32}
//         />
//       }
//       contentContainerStyle={{paddingBottom: 32}}
//       showsVerticalScrollIndicator={false}
//       keyboardShouldPersistTaps="handled">
//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               h('impactHeavy');
//               Alert.alert(
//                 'Clear All Notifications?',
//                 'This will permanently delete all your notifications and cannot be undone.',
//                 [
//                   {
//                     text: 'Cancel',
//                     style: 'cancel',
//                     onPress: () => h('selection'),
//                   },
//                   {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                       h('notificationWarning');
//                       await clearAll(userId);
//                       await load();
//                     },
//                   },
//                 ],
//                 {cancelable: true},
//               );
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>

//       {/* Content */}
//       {loading ? (
//         // 🔄 Animated loading state
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             // 📭 Animated empty state
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 Notification list with motion
//             filtered.map((n, index) => (
//               <Animatable.View
//                 key={n.id}
//                 animation="bounceInUp"
//                 duration={3200} // ⏱ slower animation (~1.2s instead of ~0.8s)
//                 delay={index * 150} // ⏳ slightly more stagger between cards
//                 easing="ease-out-cubic" // 🪶 smoother easing
//                 useNativeDriver
//                 style={{marginBottom: 0}}>
//                 <NotificationCard
//                   n={n}
//                   onPress={async () => {
//                     h('selection');
//                     await markRead(userId, n.id);
//                     if (n.deeplink) {
//                       try {
//                         await Linking.openURL(n.deeplink);
//                       } catch {}
//                     } else if (n.category === 'news') {
//                       navigate('FashionFeedScreen');
//                     }
//                     await load();
//                   }}
//                   onDelete={async id => {
//                     Alert.alert(
//                       'Delete Notification?',
//                       'Are you sure you want to delete this notification?',
//                       [
//                         {
//                           text: 'Cancel',
//                           style: 'cancel',
//                           onPress: () => h('selection'),
//                         },
//                         {
//                           text: 'Delete',
//                           style: 'destructive',
//                           onPress: async () => {
//                             try {
//                               h('impactHeavy');
//                               // 🔥 remove it from storage
//                               await markRead(userId, id); // optional: mark read before delete
//                               // 🧹 use your inbox util to remove it (assuming clearAll removes all,
//                               // there should be a `deleteNotification` or similar function)
//                               const updated = items.filter(
//                                 item => item.id !== id,
//                               );
//                               setItems(updated);
//                             } catch (err) {
//                               console.error(
//                                 '❌ Failed to delete notification:',
//                                 err,
//                               );
//                             }
//                           },
//                         },
//                       ],
//                       {cancelable: true},
//                     );
//                   }}
//                 />
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

///////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
//   Alert,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
//   subscribeInboxChange,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     rightGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   // 🔁 Refresh the list whenever inbox changes — even if screen wasn't open
//   // useEffect(() => {
//   //   const unsubscribe = subscribeInboxChange(() => {
//   //     load();
//   //   });
//   //   return unsubscribe;
//   // }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       console.log('📦 FULL MSG:', JSON.stringify(msg, null, 2));
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled">
//       {/* Animated Page Header */}

//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Notifications
//       </Animatable.Text> */}

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               h('impactHeavy');
//               Alert.alert(
//                 'Clear All Notifications?',
//                 'This will permanently delete all your notifications and cannot be undone.',
//                 [
//                   {
//                     text: 'Cancel',
//                     style: 'cancel',
//                     onPress: () => h('selection'),
//                   },
//                   {
//                     text: 'Delete All',
//                     style: 'destructive',
//                     onPress: async () => {
//                       h('notificationWarning');
//                       await clearAll(userId);
//                       await load();
//                     },
//                   },
//                 ],
//                 {cancelable: true},
//               );
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>

//       {/* Content */}
//       {loading ? (
//         // 🔄 Animated loading state
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             // 📭 Animated empty state
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 Notification list with motion
//             filtered.map((n, index) => (
//               <Animatable.View
//                 key={n.id}
//                 animation="bounceInUp"
//                 duration={3200} // ⏱ slower animation (~1.2s instead of ~0.8s)
//                 delay={index * 150} // ⏳ slightly more stagger between cards
//                 easing="ease-out-cubic" // 🪶 smoother easing
//                 useNativeDriver
//                 style={{marginBottom: 0}}>
//                 <NotificationCard
//                   n={n}
//                   onPress={async () => {
//                     h('selection');
//                     await markRead(userId, n.id);
//                     if (n.deeplink) {
//                       try {
//                         await Linking.openURL(n.deeplink);
//                       } catch {}
//                     } else if (n.category === 'news') {
//                       navigate('FashionFeedScreen');
//                     }
//                     await load();
//                   }}
//                   onDelete={async id => {
//                     Alert.alert(
//                       'Delete Notification?',
//                       'Are you sure you want to delete this notification?',
//                       [
//                         {
//                           text: 'Cancel',
//                           style: 'cancel',
//                           onPress: () => h('selection'),
//                         },
//                         {
//                           text: 'Delete',
//                           style: 'destructive',
//                           onPress: async () => {
//                             try {
//                               h('impactHeavy');
//                               // 🔥 remove it from storage
//                               await markRead(userId, id); // optional: mark read before delete
//                               // 🧹 use your inbox util to remove it (assuming clearAll removes all,
//                               // there should be a `deleteNotification` or similar function)
//                               const updated = items.filter(
//                                 item => item.id !== id,
//                               );
//                               setItems(updated);
//                             } catch (err) {
//                               console.error(
//                                 '❌ Failed to delete notification:',
//                                 err,
//                               );
//                             }
//                           },
//                         },
//                       ],
//                       {cancelable: true},
//                     );
//                   }}
//                 />
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

/////////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
//   subscribeInboxChange,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     rightGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   // 🔁 Refresh the list whenever inbox changes — even if screen wasn't open
//   // useEffect(() => {
//   //   const unsubscribe = subscribeInboxChange(() => {
//   //     load();
//   //   });
//   //   return unsubscribe;
//   // }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       console.log('📦 FULL MSG:', JSON.stringify(msg, null, 2));
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled">
//       {/* Animated Page Header */}

//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Notifications
//       </Animatable.Text> */}

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactHeavy');
//               await clearAll(userId);
//               await load();
//               h('notificationWarning');
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear All
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>
//       {/* Content */}
//       {loading ? (
//         // 🔄 Animated loading state
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             // 📭 Animated empty state
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 Notification list with motion
//             filtered.map((n, index) => (
//               <Animatable.View
//                 key={n.id}
//                 animation="bounceInUp"
//                 duration={3200} // ⏱ slower animation (~1.2s instead of ~0.8s)
//                 delay={index * 150} // ⏳ slightly more stagger between cards
//                 easing="ease-out-cubic" // 🪶 smoother easing
//                 useNativeDriver
//                 style={{marginBottom: 0}}>
//                 <NotificationCard
//                   n={n}
//                   onPress={async () => {
//                     // 💥 Bounce when tapped
//                     h('selection');
//                     await markRead(userId, n.id);
//                     if (n.deeplink) {
//                       try {
//                         await Linking.openURL(n.deeplink);
//                       } catch {}
//                     } else if (n.category === 'news') {
//                       navigate('FashionFeedScreen');
//                     }
//                     await load();
//                   }}
//                 />
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

/////////////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     rightGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       console.log('📦 FULL MSG:', JSON.stringify(msg, null, 2));
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled">
//       {/* Animated Page Header */}

//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Notifications
//       </Animatable.Text> */}

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactHeavy');
//               await clearAll(userId);
//               await load();
//               h('notificationWarning');
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>
//       {/* Content */}
//       {loading ? (
//         // 🔄 Animated loading state
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             // 📭 Animated empty state
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//                 <TooltipBubble
//                   message='Tap "Saved Outfits" in the bottom navigation bar and head to the Saved Outfits screen to schedule an outfit, then you will receive those notifications here.'
//                   position="top"
//                 />
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 Notification list with motion
//             filtered.map((n, index) => (
//               <Animatable.View
//                 key={n.id}
//                 animation="bounceInUp"
//                 duration={3200} // ⏱ slower animation (~1.2s instead of ~0.8s)
//                 delay={index * 150} // ⏳ slightly more stagger between cards
//                 easing="ease-out-cubic" // 🪶 smoother easing
//                 useNativeDriver
//                 style={{marginBottom: 0}}>
//                 <NotificationCard
//                   n={n}
//                   onPress={async () => {
//                     // 💥 Bounce when tapped
//                     h('selection');
//                     await markRead(userId, n.id);
//                     if (n.deeplink) {
//                       try {
//                         await Linking.openURL(n.deeplink);
//                       } catch {}
//                     } else if (n.category === 'news') {
//                       navigate('FashionFeedScreen');
//                     }
//                     await load();
//                   }}
//                 />
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

////////////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import * as Animatable from 'react-native-animatable';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     rightGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Load notifications and subscribe to FCM
//   // ─────────────────────────────────────────────────────────────────────────────
//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // UI with Motion
//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled">
//       {/* Animated Page Header */}

//       <View style={globalStyles.sectionTitle}>
//         <Text style={globalStyles.header}>Notifications</Text>
//       </View>

//       {/* <Animatable.Text
//         animation="fadeInDown"
//         duration={800}
//         style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Notifications
//       </Animatable.Text> */}

//       {/* ✅ Combined row with animated filters + actions */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={200}
//         duration={700}
//         style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <Animatable.View
//           animation="slideInLeft"
//           delay={300}
//           style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'all' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Animatable.Text
//               animation={filter === 'unread' ? 'pulse' : undefined}
//               iterationCount="infinite"
//               duration={2500}
//               style={styles.pillText}>
//               Unread
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>

//         {/* RIGHT: Mark All + Clear */}
//         <Animatable.View
//           animation="slideInRight"
//           delay={400}
//           style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Mark All
//             </Animatable.Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactHeavy');
//               await clearAll(userId);
//               await load();
//               h('notificationWarning');
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Animatable.Text
//               animation="fadeIn"
//               duration={800}
//               style={styles.actionText}>
//               Clear
//             </Animatable.Text>
//           </AppleTouchFeedback>
//         </Animatable.View>
//       </Animatable.View>
//       {/* Content */}
//       {loading ? (
//         // 🔄 Animated loading state
//         <Animatable.View
//           animation="fadeIn"
//           iterationCount="infinite"
//           duration={1600}
//           style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </Animatable.View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             // 📭 Animated empty state
//             <Animatable.View
//               animation="fadeInUp"
//               delay={300}
//               duration={800}
//               style={styles.empty}>
//               <Animatable.Text
//                 animation="pulse"
//                 iterationCount="infinite"
//                 duration={4000}
//                 style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//               </Animatable.Text>
//               <Animatable.Text
//                 animation="fadeIn"
//                 delay={500}
//                 style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Animatable.Text>
//             </Animatable.View>
//           ) : (
//             // 📬 Notification list with motion
//             filtered.map((n, index) => (
//               <Animatable.View
//                 key={n.id}
//                 animation="bounceInUp"
//                 duration={3200} // ⏱ slower animation (~1.2s instead of ~0.8s)
//                 delay={index * 150} // ⏳ slightly more stagger between cards
//                 easing="ease-out-cubic" // 🪶 smoother easing
//                 useNativeDriver
//                 style={{marginBottom: 0}}>
//                 <NotificationCard
//                   n={n}
//                   onPress={async () => {
//                     // 💥 Bounce when tapped
//                     h('selection');
//                     await markRead(userId, n.id);
//                     if (n.deeplink) {
//                       try {
//                         await Linking.openURL(n.deeplink);
//                       } catch {}
//                     } else if (n.category === 'news') {
//                       navigate('FashionFeedScreen');
//                     }
//                     await load();
//                   }}
//                 />
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

/////////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     rightGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled">
//       <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Notifications
//       </Text>

//       {/* ✅ Combined row with left + right groups */}
//       <View style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <View style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Text style={styles.pillText}>All</Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Text style={styles.pillText}>Unread</Text>
//           </AppleTouchFeedback>
//         </View>

//         {/* RIGHT: Mark All + Clear */}
//         <View style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Text style={styles.actionText}>Mark All</Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactHeavy');
//               await clearAll(userId);
//               await load();
//               h('notificationWarning');
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Text style={styles.actionText}>Clear</Text>
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* Content */}
//       {loading ? (
//         <View style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <View style={styles.empty}>
//               <Text style={[styles.emptyBig, {lineHeight: 28}]}>
//                 {filter === 'unread'
//                   ? "You're all caught up — No unread notifications!"
//                   : 'No notifications yet'}
//               </Text>
//               <Text style={styles.emptySub}>
//                 {filter === 'unread'
//                   ? 'All your notifications have been read.'
//                   : 'You’ll see outfit reminders, weather changes, and brand news here.'}
//               </Text>
//             </View>
//           ) : (
//             filtered.map(n => (
//               <NotificationCard
//                 key={n.id}
//                 n={n}
//                 onPress={async () => {
//                   h('selection');
//                   await markRead(userId, n.id);
//                   if (n.deeplink) {
//                     try {
//                       await Linking.openURL(n.deeplink);
//                     } catch {}
//                   } else if (n.category === 'news') {
//                     navigate('FashionFeedScreen');
//                   }
//                   await load();
//                 }}
//               />
//             ))
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       paddingTop: 22,
//       paddingBottom: 4,
//     },
//     leftGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     rightGroup: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginRight: 8,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginLeft: 8,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       await addToInbox({
//         user_id: userId,
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled">
//       <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Notifications
//       </Text>

//       {/* ✅ Combined row with left + right groups */}
//       <View style={styles.headerRow}>
//         {/* LEFT: All + Unread */}
//         <View style={styles.leftGroup}>
//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'all') h('selection');
//               setFilter('all');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'all' && styles.pillActive]}>
//             <Text style={styles.pillText}>All</Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={() => {
//               if (filter !== 'unread') h('selection');
//               setFilter('unread');
//             }}
//             hapticStyle="impactLight"
//             style={[styles.pill, filter === 'unread' && styles.pillActive]}>
//             <Text style={styles.pillText}>Unread</Text>
//           </AppleTouchFeedback>
//         </View>

//         {/* RIGHT: Mark All + Clear */}
//         <View style={styles.rightGroup}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Text style={styles.actionText}>Mark All</Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactHeavy');
//               await clearAll(userId);
//               await load();
//               h('notificationWarning');
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Text style={styles.actionText}>Clear</Text>
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* Content */}
//       {loading ? (
//         <View style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <View style={styles.empty}>
//               <Text style={styles.emptyBig}>No notifications yet</Text>
//               <Text style={styles.emptySub}>
//                 You’ll see outfit reminders, weather changes, and brand news
//                 here.
//               </Text>
//             </View>
//           ) : (
//             filtered.map(n => (
//               <NotificationCard
//                 key={n.id}
//                 n={n}
//                 onPress={async () => {
//                   h('selection');
//                   await markRead(userId, n.id);
//                   if (n.deeplink) {
//                     try {
//                       await Linking.openURL(n.deeplink);
//                     } catch {}
//                   } else if (n.category === 'news') {
//                     navigate('FashionFeedScreen');
//                   }
//                   await load();
//                 }}
//               />
//             ))
//           )}
//         </ScrollView>
//       )}
//     </ScrollView>
//   );
// }

///////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID() ?? '';

//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     nav: {
//       paddingTop: 10,
//       paddingHorizontal: 16,
//       paddingBottom: 8,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     title: {fontSize: 22, fontWeight: '800'},
//     actions: {flexDirection: 'row', marginLeft: 'auto', marginTop: 2},
//     actionBtn: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginHorizontal: 4,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     filters: {
//       flexDirection: 'row',
//       gap: 8,
//       paddingHorizontal: 16,
//       marginBottom: 8,
//     },
//     pill: {
//       paddingHorizontal: 18,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.pillDark1,
//       marginHorizontal: 4,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 13,
//     },
//     pillTextActive: {color: theme.colors.buttonText1},
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   // 🔥 Subscribe to Firebase push events while screen is open
//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       console.log('📩 Foreground push:', msg);
//       await addToInbox({
//         user_id: userId, // ✅ added
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load(); // ✅ Immediately reload inbox
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       console.log('📬 Notification opened from background:', msg);
//       await addToInbox({
//         user_id: userId, // ✅ added
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]); // ✅ added userId to dependencies

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled">
//       <Text style={[globalStyles.header, {color: theme.colors.foreground}]}>
//         Notifications
//       </Text>
//       <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
//         {/* Header */}
//         <View style={styles.nav}>
//           <View style={styles.actions}>
//             <AppleTouchFeedback
//               onPress={async () => {
//                 h('impactMedium');
//                 await markAllRead(userId);
//                 await load();
//                 h('notificationSuccess');
//               }}
//               hapticStyle="impactMedium"
//               style={styles.actionBtn}>
//               <Text style={styles.actionText}>Mark All</Text>
//             </AppleTouchFeedback>

//             <AppleTouchFeedback
//               onPress={async () => {
//                 h('impactHeavy');
//                 await clearAll(userId);
//                 await load();
//                 h('notificationWarning');
//               }}
//               hapticStyle="impactHeavy"
//               style={[styles.actionBtn, styles.actionDanger]}>
//               <Text style={styles.actionText}>Clear</Text>
//             </AppleTouchFeedback>
//           </View>
//         </View>

//         {/* Filter pills */}
//         <View style={styles.filters}>
//           {(['all', 'unread'] as const).map(f => {
//             const active = f === filter;
//             return (
//               <AppleTouchFeedback
//                 key={f}
//                 onPress={() => {
//                   if (f !== filter) h('selection');
//                   setFilter(f);
//                 }}
//                 hapticStyle="impactLight"
//                 style={[styles.pill, active && styles.pillActive]}>
//                 <Text
//                   style={[styles.pillText, active && styles.pillTextActive]}>
//                   {f === 'all' ? 'All' : 'Unread'}
//                 </Text>
//               </AppleTouchFeedback>
//             );
//           })}
//         </View>

//         {/* Content */}
//         {loading ? (
//           <View style={styles.center}>
//             <ActivityIndicator color={theme.colors.primary} size="large" />
//           </View>
//         ) : (
//           <ScrollView
//             refreshControl={
//               <RefreshControl
//                 refreshing={refreshing}
//                 onRefresh={onRefresh}
//                 tintColor={theme.colors.foreground}
//               />
//             }
//             contentContainerStyle={{padding: 16, paddingBottom: 32}}
//             showsVerticalScrollIndicator={false}>
//             {filtered.length === 0 ? (
//               <View style={styles.empty}>
//                 <Text style={styles.emptyBig}>No notifications yet</Text>
//                 <Text style={styles.emptySub}>
//                   You’ll see outfit reminders, weather changes, and brand news
//                   here.
//                 </Text>
//               </View>
//             ) : (
//               filtered.map(n => (
//                 <NotificationCard
//                   key={n.id}
//                   n={n}
//                   onPress={async () => {
//                     h('selection');
//                     await markRead(userId, n.id);
//                     if (n.deeplink) {
//                       try {
//                         await Linking.openURL(n.deeplink);
//                       } catch {}
//                     } else if (n.category === 'news') {
//                       navigate('FashionFeedScreen');
//                     }
//                     await load();
//                   }}
//                 />
//               ))
//             )}
//           </ScrollView>
//         )}
//       </View>
//     </ScrollView>
//   );
// }

///////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Linking,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadInbox as loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
//   addToInbox,
// } from '../utils/notificationInbox';
// import NotificationCard from '../components/Notifications/NotificationCard';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function NotificationsScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const userId = useUUID() ?? '';
//   const {theme} = useAppTheme();
//   const [items, setItems] = useState<AppNotification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filter, setFilter] = useState<'all' | 'unread'>('all');

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     nav: {
//       paddingTop: 10,
//       paddingHorizontal: 16,
//       paddingBottom: 8,
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     title: {fontSize: 22, fontWeight: '800'},
//     actions: {flexDirection: 'row', marginLeft: 'auto', gap: 8},
//     actionBtn: {
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 10,
//       backgroundColor: theme.colors.pillDark1,
//       marginHorizontal: 4,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 12,
//     },
//     filters: {
//       flexDirection: 'row',
//       gap: 8,
//       paddingHorizontal: 16,
//       marginBottom: 8,
//     },
//     pill: {
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 999,
//       backgroundColor: theme.colors.pillDark1,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//       marginHorizontal: 4,
//     },
//     pillActive: {
//       backgroundColor: theme.colors.button1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillText: {color: theme.colors.buttonText1, fontWeight: '700'},
//     pillTextActive: {color: theme.colors.buttonText1},
//     center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//     empty: {paddingHorizontal: 16, paddingTop: 40},
//     emptyBig: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 18,
//       marginBottom: 6,
//       textAlign: 'center',
//     },
//     emptySub: {color: theme.colors.muted, textAlign: 'center'},
//   });

//   const load = useCallback(async () => {
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   // 🔥 Subscribe to Firebase push events while screen is open
//   useEffect(() => {
//     const unsubscribeFg = messaging().onMessage(async msg => {
//       console.log('📩 Foreground push:', msg);
//       await addToInbox({
//         user_id: userId, // ✅ added
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load(); // ✅ Immediately reload inbox
//       h('impactLight');
//     });

//     const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
//       console.log('📬 Notification opened from background:', msg);
//       await addToInbox({
//         user_id: userId, // ✅ added
//         id: msg.messageId || `${Date.now()}`,
//         title: msg.notification?.title || msg.data?.title,
//         message:
//           msg.notification?.body || msg.data?.body || msg.data?.message || '',
//         timestamp: new Date().toISOString(),
//         category:
//           (msg.data?.category as AppNotification['category']) ?? 'other',
//         deeplink: msg.data?.deeplink,
//         data: msg.data,
//         read: false,
//       });
//       await load();
//     });

//     return () => {
//       unsubscribeFg();
//       unsubscribeOpen();
//     };
//   }, [load, userId]); // ✅ added userId to dependencies

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   return (
//     <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
//       {/* Header */}
//       <View style={styles.nav}>
//         <Text style={[styles.title, {color: theme.colors.primary}]}>
//           Notifications
//         </Text>
//         <View style={styles.actions}>
//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactMedium');
//               await markAllRead(userId);
//               await load();
//               h('notificationSuccess');
//             }}
//             hapticStyle="impactMedium"
//             style={styles.actionBtn}>
//             <Text style={styles.actionText}>Mark All</Text>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             onPress={async () => {
//               h('impactHeavy');
//               await clearAll(userId);
//               await load();
//               h('notificationWarning');
//             }}
//             hapticStyle="impactHeavy"
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Text style={styles.actionText}>Clear</Text>
//           </AppleTouchFeedback>
//         </View>
//       </View>

//       {/* Filter pills */}
//       <View style={styles.filters}>
//         {(['all', 'unread'] as const).map(f => {
//           const active = f === filter;
//           return (
//             <AppleTouchFeedback
//               key={f}
//               onPress={() => {
//                 if (f !== filter) h('selection');
//                 setFilter(f);
//               }}
//               hapticStyle="impactLight"
//               style={[styles.pill, active && styles.pillActive]}>
//               <Text style={[styles.pillText, active && styles.pillTextActive]}>
//                 {f === 'all' ? 'All' : 'Unread'}
//               </Text>
//             </AppleTouchFeedback>
//           );
//         })}
//       </View>

//       {/* Content */}
//       {loading ? (
//         <View style={styles.center}>
//           <ActivityIndicator color={theme.colors.primary} size="large" />
//         </View>
//       ) : (
//         <ScrollView
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={theme.colors.foreground}
//             />
//           }
//           contentContainerStyle={{padding: 16, paddingBottom: 32}}
//           showsVerticalScrollIndicator={false}>
//           {filtered.length === 0 ? (
//             <View style={styles.empty}>
//               <Text style={styles.emptyBig}>No notifications yet</Text>
//               <Text style={styles.emptySub}>
//                 You’ll see outfit reminders, weather changes, and brand news
//                 here.
//               </Text>
//             </View>
//           ) : (
//             filtered.map(n => (
//               <NotificationCard
//                 key={n.id}
//                 n={n}
//                 onPress={async () => {
//                   h('selection');
//                   await markRead(userId, n.id);
//                   if (n.deeplink) {
//                     try {
//                       await Linking.openURL(n.deeplink);
//                     } catch {}
//                   } else if (n.category === 'news') {
//                     navigate('FashionFeedScreen');
//                   }
//                   await load();
//                 }}
//               />
//             ))
//           )}
//         </ScrollView>
//       )}
//     </View>
//   );
// }
