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
import {useUUID} from '../context/UUIDContext';
import {useAppTheme} from '../context/ThemeContext';
import {
  loadNotifications,
  markRead,
  markAllRead,
  clearAll,
  AppNotification,
} from '../storage/notifications';
import NotificationCard from '../components/Notifications/NotificationCard';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

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
  const globalStyles = useGlobalStyles();
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
    setLoading(true);
    const list = await loadNotifications(userId);
    list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    setItems(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

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
                  } else {
                    if (n.category === 'news') navigate('FashionFeedScreen');
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

///////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   TouchableOpacity,
//   Linking,
// } from 'react-native';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {
//   loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
// } from '../storage/notifications';
// import NotificationCard from '../components/Notifications/NotificationCard';

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

//   const load = useCallback(async () => {
//     setLoading(true);
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
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
//           <TouchableOpacity
//             onPress={async () => {
//               await markAllRead(userId);
//               await load();
//             }}
//             style={styles.actionBtn}>
//             <Text style={styles.actionText}>Mark All</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={async () => {
//               await clearAll(userId);
//               await load();
//             }}
//             style={[styles.actionBtn, styles.actionDanger]}>
//             <Text style={styles.actionText}>Clear</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Filter pills */}
//       <View style={styles.filters}>
//         {(['all', 'unread'] as const).map(f => {
//           const active = f === filter;
//           return (
//             <TouchableOpacity
//               key={f}
//               onPress={() => setFilter(f)}
//               style={[styles.pill, active && styles.pillActive]}>
//               <Text style={[styles.pillText, active && styles.pillTextActive]}>
//                 {f === 'all' ? 'All' : 'Unread'}
//               </Text>
//             </TouchableOpacity>
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
//               tintColor="#fff"
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
//                   await markRead(userId, n.id);
//                   if (n.deeplink) {
//                     try {
//                       await Linking.openURL(n.deeplink);
//                     } catch {}
//                   } else {
//                     // fallback: route by category
//                     if (n.category === 'news') navigate('FashionFeedScreen');
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

// const styles = StyleSheet.create({
//   screen: {flex: 1},
//   nav: {
//     paddingTop: 10,
//     paddingHorizontal: 16,
//     paddingBottom: 8,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   title: {fontSize: 22, fontWeight: '800'},
//   actions: {flexDirection: 'row', marginLeft: 'auto', gap: 8},
//   actionBtn: {
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 10,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//   },
//   actionDanger: {backgroundColor: 'rgba(255,59,48,0.22)'},
//   actionText: {color: '#fff', fontWeight: '700', fontSize: 12},
//   filters: {
//     flexDirection: 'row',
//     gap: 8,
//     paddingHorizontal: 16,
//     marginBottom: 8,
//   },
//   pill: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 999,
//     backgroundColor: 'rgba(255,255,255,0.08)',
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: 'rgba(255,255,255,0.12)',
//   },
//   pillActive: {
//     backgroundColor: 'rgba(99,102,241,0.25)',
//     borderColor: 'rgba(99,102,241,0.45)',
//   },
//   pillText: {color: 'rgba(255,255,255,0.9)', fontWeight: '700'},
//   pillTextActive: {color: '#fff'},
//   center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//   empty: {paddingHorizontal: 16, paddingTop: 40},
//   emptyBig: {
//     color: '#fff',
//     fontWeight: '800',
//     fontSize: 18,
//     marginBottom: 6,
//     textAlign: 'center',
//   },
//   emptySub: {color: 'rgba(255,255,255,0.7)', textAlign: 'center'},
// });

///////////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   TouchableOpacity,
//   Linking,
// } from 'react-native';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {
//   loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
// } from '../storage/notifications';
// import NotificationCard from '../components/Notifications/NotificationCard';

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

//   const BUTTON = globalStyles.buttonPrimary;
//   const BUTTON_TEXT = globalStyles.buttonPrimaryText;
//   const activePillBg = (theme.colors.pillDark1 ??
//     theme.colors.primary) as string;
//   const activePillBorder = (theme.colors.surfaceBorder ??
//     theme.colors.surfaceBorder) as string;

//   const styles = StyleSheet.create({
//     screen: {flex: 1},
//     nav: {
//       paddingBottom: 8,
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 18,
//     },
//     title: {fontSize: 22, fontWeight: '800'},
//     actions: {flexDirection: 'row', marginLeft: 'auto', gap: 8},

//     actionBtn: {
//       paddingHorizontal: tokens.spacing.md,
//       paddingVertical: tokens.spacing.sm,
//       marginRight: 8,
//     },
//     actionDanger: {
//       backgroundColor: theme.colors.error,
//       borderColor: theme.colors.error ?? theme.colors.error,
//     },

//     filters: {
//       flexDirection: 'row',
//       gap: 8,
//       paddingHorizontal: 16,
//       marginBottom: 8,
//     },

//     pill: {
//       paddingHorizontal: tokens.spacing.md,
//       paddingVertical: tokens.spacing.sm,
//       borderRadius: 999,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillActive: {
//       backgroundColor: activePillBg,
//       borderColor: activePillBorder,
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
//     setLoading(true);
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   return (
//     <View
//       style={[
//         styles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* Header */}
//       <View style={styles.nav}>
//         <Text style={globalStyles.header}>Notifications</Text>
//         <View style={styles.actions}>
//           <TouchableOpacity
//             onPress={async () => {
//               await markAllRead(userId);
//               await load();
//             }}
//             style={[BUTTON, styles.actionBtn]}>
//             <Text style={BUTTON_TEXT}>Mark All</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             onPress={async () => {
//               await clearAll(userId);
//               await load();
//             }}
//             style={[BUTTON, styles.actionBtn, styles.actionDanger]}>
//             <Text style={BUTTON_TEXT}>Clear</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Filter pills */}
//       <View style={styles.filters}>
//         {(['all', 'unread'] as const).map(f => {
//           const active = f === filter;
//           return (
//             <TouchableOpacity
//               key={f}
//               onPress={() => setFilter(f)}
//               style={[
//                 BUTTON,
//                 styles.pill,
//                 active && styles.pillActive,
//                 {marginRight: 8},
//               ]}>
//               <Text style={BUTTON_TEXT}>{f === 'all' ? 'All' : 'Unread'}</Text>
//             </TouchableOpacity>
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
//               tintColor={theme.colors.primary}
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
//                   await markRead(userId, n.id);
//                   if (n.deeplink) {
//                     try {
//                       await Linking.openURL(n.deeplink);
//                     } catch {}
//                   } else {
//                     // fallback: route by category
//                     if (n.category === 'news') navigate('FashionFeedScreen');
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

//////////////

// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   TouchableOpacity,
//   Linking,
// } from 'react-native';
// import {useUUID} from '../context/UUIDContext';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {
//   loadNotifications,
//   markRead,
//   markAllRead,
//   clearAll,
//   AppNotification,
// } from '../storage/notifications';
// import NotificationCard from '../components/Notifications/NotificationCard';

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
//       paddingBottom: 8,
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 18,
//     },
//     title: {fontSize: 22, fontWeight: '800'},
//     actions: {flexDirection: 'row', marginLeft: 'auto', gap: 8},
//     actionBtn: {
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 20,
//       backgroundColor: theme.colors.surface3,
//       marginRight: 6,
//     },
//     actionDanger: {backgroundColor: theme.colors.error},
//     actionText: {
//       color: theme.colors.foreground,
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
//       backgroundColor: theme.colors.surface3,
//       borderWidth: StyleSheet.hairlineWidth,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     pillActive: {
//       backgroundColor: 'rgba(99, 101, 241, 1)',
//       borderColor: 'rgba(99,102,241,0.45)',
//     },
//     pillText: {color: theme.colors.foreground, fontWeight: '700'},
//     pillTextActive: {color: theme.colors.foreground},
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
//     setLoading(true);
//     const list = await loadNotifications(userId);
//     list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
//     setItems(list);
//     setLoading(false);
//   }, [userId]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await load();
//     setRefreshing(false);
//   }, [load]);

//   const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

//   return (
//     <View
//       style={[
//         styles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       {/* Header */}
//       <View style={styles.nav}>
//         <Text style={globalStyles.header}>Notifications</Text>
//         <View style={styles.actions}>
//           <TouchableOpacity
//             onPress={async () => {
//               await markAllRead(userId);
//               await load();
//             }}
//             style={styles.actionBtn}>
//             <Text style={styles.actionText}>Mark All</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={async () => {
//               await clearAll(userId);
//               await load();
//             }}
//             style={[
//               styles.actionBtn,
//               styles.actionDanger,
//               {backgroundColor: theme.colors.error},
//             ]}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '700',
//                 fontSize: 12,
//               }}>
//               Clear
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Filter pills */}
//       <View style={styles.filters}>
//         {(['all', 'unread'] as const).map(f => {
//           const active = f === filter;
//           return (
//             <TouchableOpacity
//               key={f}
//               onPress={() => setFilter(f)}
//               style={[
//                 styles.pill,
//                 active && styles.pillActive,
//                 {marginRight: 6},
//               ]}>
//               <Text style={[styles.pillText, active && styles.pillTextActive]}>
//                 {f === 'all' ? 'All' : 'Unread'}
//               </Text>
//             </TouchableOpacity>
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
//               tintColor="#fff"
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
//                   await markRead(userId, n.id);
//                   if (n.deeplink) {
//                     try {
//                       await Linking.openURL(n.deeplink);
//                     } catch {}
//                   } else {
//                     // fallback: route by category
//                     if (n.category === 'news') navigate('FashionFeedScreen');
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
