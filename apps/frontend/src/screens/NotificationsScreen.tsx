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
  const userId = useUUID() ?? '';
  const {theme} = useAppTheme();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const styles = StyleSheet.create({
    screen: {flex: 1},
    nav: {
      paddingTop: 10,
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {fontSize: 22, fontWeight: '800'},
    actions: {flexDirection: 'row', marginLeft: 'auto', gap: 8},
    actionBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: theme.colors.pillDark1,
      marginHorizontal: 4,
    },
    actionDanger: {backgroundColor: theme.colors.error},
    actionText: {
      color: theme.colors.buttonText1,
      fontWeight: '700',
      fontSize: 12,
    },
    filters: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.pillDark1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.surfaceBorder,
      marginHorizontal: 4,
    },
    pillActive: {
      backgroundColor: theme.colors.button1,
      borderColor: theme.colors.surfaceBorder,
    },
    pillText: {color: theme.colors.buttonText1, fontWeight: '700'},
    pillTextActive: {color: theme.colors.buttonText1},
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

  const load = useCallback(async () => {
    const list = await loadNotifications(userId);
    list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    setItems(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // 🔥 Subscribe to Firebase push events while screen is open
  useEffect(() => {
    const unsubscribeFg = messaging().onMessage(async msg => {
      console.log('📩 Foreground push:', msg);
      await addToInbox({
        user_id: userId, // ✅ added
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
      await load(); // ✅ Immediately reload inbox
      h('impactLight');
    });

    const unsubscribeOpen = messaging().onNotificationOpenedApp(async msg => {
      console.log('📬 Notification opened from background:', msg);
      await addToInbox({
        user_id: userId, // ✅ added
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
  }, [load, userId]); // ✅ added userId to dependencies

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

  return (
    <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      {/* Header */}
      <View style={styles.nav}>
        <Text style={[styles.title, {color: theme.colors.primary}]}>
          Notifications
        </Text>
        <View style={styles.actions}>
          <AppleTouchFeedback
            onPress={async () => {
              h('impactMedium');
              await markAllRead(userId);
              await load();
              h('notificationSuccess');
            }}
            hapticStyle="impactMedium"
            style={styles.actionBtn}>
            <Text style={styles.actionText}>Mark All</Text>
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
            <Text style={styles.actionText}>Clear</Text>
          </AppleTouchFeedback>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filters}>
        {(['all', 'unread'] as const).map(f => {
          const active = f === filter;
          return (
            <AppleTouchFeedback
              key={f}
              onPress={() => {
                if (f !== filter) h('selection');
                setFilter(f);
              }}
              hapticStyle="impactLight"
              style={[styles.pill, active && styles.pillActive]}>
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {f === 'all' ? 'All' : 'Unread'}
              </Text>
            </AppleTouchFeedback>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
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
            <View style={styles.empty}>
              <Text style={styles.emptyBig}>No notifications yet</Text>
              <Text style={styles.emptySub}>
                You’ll see outfit reminders, weather changes, and brand news
                here.
              </Text>
            </View>
          ) : (
            filtered.map(n => (
              <NotificationCard
                key={n.id}
                n={n}
                onPress={async () => {
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
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

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
//   }, [load]);

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
