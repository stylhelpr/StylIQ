import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
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

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function NotificationsScreen({
  navigate,
}: {
  navigate: (screen: string) => void;
}) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const userId = useUUID() ?? '';

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const styles = StyleSheet.create({
    screen: {flex: 1},
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 22,
      paddingBottom: 4,
    },
    leftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    pill: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.pillDark1,
      marginRight: 8,
    },
    pillActive: {
      backgroundColor: theme.colors.button1,
      borderColor: theme.colors.surfaceBorder,
    },
    pillText: {
      color: theme.colors.buttonText1,
      fontWeight: '700',
      fontSize: 13,
    },
    actionBtn: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.pillDark1,
      marginLeft: 8,
    },
    actionDanger: {backgroundColor: theme.colors.error},
    actionText: {
      color: theme.colors.buttonText1,
      fontWeight: '700',
      fontSize: 13,
    },
    center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    empty: {paddingHorizontal: 16, paddingTop: 40},
    emptyBig: {
      color: theme.colors.foreground,
      fontWeight: '800',
      fontSize: 18,
      marginBottom: 6,
      textAlign: 'center',
    },
    emptySub: {color: theme.colors.muted, textAlign: 'center'},
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Load notifications and subscribe to FCM
  // ─────────────────────────────────────────────────────────────────────────────
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
      await addToInbox({
        user_id: userId,
        id: msg.messageId || `${Date.now()}`,
        title: msg.notification?.title || msg.data?.title,
        message:
          msg.notification?.body || msg.data?.body || msg.data?.message || '',
        timestamp: new Date().toISOString(),
        category:
          (msg.data?.category as AppNotification['category']) ?? 'other',
        deeplink: msg.data?.deeplink,
        data: msg.data,
        read: false,
      });
      await load();
      h('impactLight');
    });

    const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
      await addToInbox({
        user_id: userId,
        id: msg.messageId || `${Date.now()}`,
        title: msg.notification?.title || msg.data?.title,
        message:
          msg.notification?.body || msg.data?.body || msg.data?.message || '',
        timestamp: new Date().toISOString(),
        category:
          (msg.data?.category as AppNotification['category']) ?? 'other',
        deeplink: msg.data?.deeplink,
        data: msg.data,
        read: false,
      });
      await load();
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

  // ─────────────────────────────────────────────────────────────────────────────
  // UI with Motion
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}
      keyboardShouldPersistTaps="handled">
      {/* Animated Page Header */}

      <View style={globalStyles.sectionTitle}>
        <Text style={globalStyles.header}>Notifications</Text>
      </View>

      {/* <Animatable.Text
        animation="fadeInDown"
        duration={800}
        style={[globalStyles.header, {color: theme.colors.foreground}]}>
        Notifications
      </Animatable.Text> */}

      {/* ✅ Combined row with animated filters + actions */}
      <Animatable.View
        animation="fadeInUp"
        delay={200}
        duration={700}
        style={styles.headerRow}>
        {/* LEFT: All + Unread */}
        <Animatable.View
          animation="slideInLeft"
          delay={300}
          style={styles.leftGroup}>
          <AppleTouchFeedback
            onPress={() => {
              if (filter !== 'all') h('selection');
              setFilter('all');
            }}
            hapticStyle="impactLight"
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
            hapticStyle="impactLight"
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

        {/* RIGHT: Mark All + Clear */}
        <Animatable.View
          animation="slideInRight"
          delay={400}
          style={styles.rightGroup}>
          <AppleTouchFeedback
            onPress={async () => {
              h('impactMedium');
              await markAllRead(userId);
              await load();
              h('notificationSuccess');
            }}
            hapticStyle="impactMedium"
            style={styles.actionBtn}>
            <Animatable.Text
              animation="fadeIn"
              duration={800}
              style={styles.actionText}>
              Mark All
            </Animatable.Text>
          </AppleTouchFeedback>

          <AppleTouchFeedback
            onPress={async () => {
              h('impactHeavy');
              await clearAll(userId);
              await load();
              h('notificationWarning');
            }}
            hapticStyle="impactHeavy"
            style={[styles.actionBtn, styles.actionDanger]}>
            <Animatable.Text
              animation="fadeIn"
              duration={800}
              style={styles.actionText}>
              Clear
            </Animatable.Text>
          </AppleTouchFeedback>
        </Animatable.View>
      </Animatable.View>
      {/* Content */}
      {loading ? (
        // 🔄 Animated loading state
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
            // 📭 Animated empty state
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
            // 📬 Notification list with motion
            filtered.map((n, index) => (
              <Animatable.View
                key={n.id}
                animation="bounceInUp"
                duration={3200} // ⏱ slower animation (~1.2s instead of ~0.8s)
                delay={index * 150} // ⏳ slightly more stagger between cards
                easing="ease-out-cubic" // 🪶 smoother easing
                useNativeDriver
                style={{marginBottom: 0}}>
                <NotificationCard
                  n={n}
                  onPress={async () => {
                    // 💥 Bounce when tapped
                    h('selection');
                    await markRead(userId, n.id);
                    if (n.deeplink) {
                      try {
                        await Linking.openURL(n.deeplink);
                      } catch {}
                    } else if (n.category === 'news') {
                      navigate('FashionFeedScreen');
                    }
                    await load();
                  }}
                />
              </Animatable.View>
            ))
          )}
        </ScrollView>
      )}
    </ScrollView>
  );
}

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
