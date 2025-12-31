// utils/notificationService.ts
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {Linking, Platform} from 'react-native';
import {apiClient} from '../lib/apiClient';
import {addToInbox} from './notificationInbox';
import {DynamicIsland} from '../native/dynamicIsland';
import {isValidDeepLink} from './urlSanitizer';

// ----- inbox record type -----
type InboxItem = {
  id: string;
  title?: string;
  message: string;
  timestamp: string;
  category?: 'news' | 'outfit' | 'weather' | 'care' | 'message' | 'other';
  deeplink?: string;
  data?: Record<string, string>;
};

// ✅ Helper: Map FCM → InboxItem
function mapMessage(msg: FirebaseMessagingTypes.RemoteMessage): InboxItem {
  const id =
    msg.messageId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const data = msg.data as Record<string, string> | undefined;
  const title = msg.notification?.title ?? data?.title ?? undefined;
  const message =
    msg.notification?.body ?? data?.body ?? data?.message ?? '';
  const deeplink = data?.deeplink;

  // Community notifications (like, comment, follow) should go to Community Messages
  const notifType = data?.type;
  let category: InboxItem['category'] = 'other';
  if (notifType === 'like' || notifType === 'comment' || notifType === 'follow') {
    category = 'message';
  } else if (data?.category) {
    category = data.category as InboxItem['category'];
  }

  return {
    id,
    title,
    message,
    timestamp: new Date().toISOString(),
    category,
    deeplink,
    data: data ?? {},
  };
}

// Keep references to unsubscribers so we don’t double-register listeners
let fgUnsub: (() => void) | null = null;
let openUnsub: (() => void) | null = null;
let fgRegistered = false;

// 🔥 Used to suppress duplicate banners
let lastShownId: string | null = null;

export const initializeNotifications = async (userId?: string) => {
  try {
    const enabled = await AsyncStorage.getItem('notificationsEnabled');
    if (enabled !== 'true') {
      console.log('🔕 Notifications disabled. Skipping initialization.');
      return;
    }

    // 🔔 Local notification setup (Android heads-up support)
    PushNotification.configure({
      onNotification: async (n: any) => {

        // 🏝️ Show in Dynamic Island for local notifications (scheduled outfits)
        try {
          const title = String(n.title || 'Notification');
          const message = String(n.message || n.body || '');

          // Check if Live Activities are enabled
          const enabled = await DynamicIsland.isEnabled();
          console.log('🔔 Live Activities enabled?', enabled);

          if (!enabled) {
            console.log('⚠️ Live Activities not allowed on this device / settings.');
            return;
          }

          // Start the Live Activity
          const result = await DynamicIsland.start(title, message);
          console.log('✅ Dynamic Island started (local):', result);
          console.log('📬 Local Notification:', title, '-', message);

          // Auto-dismiss after 15 seconds (gives user time to interact)
          setTimeout(async () => {
            const endResult = await DynamicIsland.end();
            console.log('🏁 Dynamic Island ended:', endResult);
          }, 15000);
        } catch (error) {
          console.log('❌ Dynamic Island error (local):', error);
        }
      },
      requestPermissions: true,
    });

    PushNotification.createChannel(
      {
        channelId: 'style-channel',
        channelName: 'Style Alerts',
        importance: 4,
        vibrate: true,
        soundName: 'default',
      },
      created => console.log(`📡 Channel ${created ? 'created' : 'exists'}`),
    );

    if (!userId) {
      console.warn('⚠️ No userId provided. Skipping token registration.');
      return;
    }

    // 🔐 Request push permissions
    await messaging().requestPermission();
    await messaging().registerDeviceForRemoteMessages();

    const fcmToken = await messaging().getToken();

    // 🔍 Gather Firebase project metadata
    let senderId: string | undefined;
    let projectId: string | undefined;
    try {
      const opts = (messaging() as any).app?.options || {};
      senderId = opts.messagingSenderId;
      projectId = opts.projectId;
    } catch {}

    // 📡 Register token with backend
    if (fcmToken) {
      await apiClient.post('/notifications/register', {
        device_token: fcmToken,
        platform: Platform.OS,
        sender_id: senderId,
        project_id: projectId,
      });
    }

    // 🧹 Clean up any old listeners
    fgUnsub?.();
    openUnsub?.();
    fgUnsub = null;
    openUnsub = null;
    fgRegistered = false;
    lastShownId = null;

    // 📬 Foreground push → show banner + add to inbox (only once)
    if (!fgRegistered) {
      fgUnsub = messaging().onMessage(async msg => {
        const mapped = mapMessage(msg);
        console.log('📩 Foreground push:', mapped.id);

        // ✅ Skip if we've already processed this message ID
        if (mapped.id === lastShownId) {
          console.log('⚠️ Skipping duplicate for:', mapped.id);
          return;
        }
        lastShownId = mapped.id;

        // 📥 Add to inbox immediately so it shows in NotificationsScreen
        await addToInbox(mapped);
        console.log('📥 Added to inbox:', mapped.id);

        const title = String(mapped.title || 'Notification');
        const message = String(mapped.message || '');

        // 🔔 Show local notification banner with sound
        // Firebase onMessage intercepts remote notifications in foreground,
        // so we must trigger a local notification to display the banner/alert
        PushNotification.localNotification({
          channelId: 'style-channel',
          title,
          message,
          playSound: true,
          soundName: 'default',
        });

        // 🏝️ Show in Dynamic Island (scheduled outfit notifications)
        try {
          console.log('🏝️ Attempting Dynamic Island for FCM:', {title, message});

          // Check if Live Activities are enabled
          const enabled = await DynamicIsland.isEnabled();
          console.log('🔔 Live Activities enabled?', enabled);

          if (enabled) {
            // Start the Live Activity
            const result = await DynamicIsland.start(title, message);
            console.log('✅ Dynamic Island started (FCM):', result);

            // Auto-dismiss after 60 seconds (gives user time to interact)
            setTimeout(async () => {
              try {
                const endResult = await DynamicIsland.end();
                console.log('🏁 Dynamic Island ended:', endResult);
              } catch (e) {
                console.log('❌ Error ending Dynamic Island:', e);
              }
            }, 60000);
          } else {
            console.log('⚠️ Live Activities not allowed on this device / settings.');
          }
        } catch (error) {
          console.log('❌ Dynamic Island error (FCM):', error);
        }
      });
      fgRegistered = true;
    }

    // 📬 Tapped from background → persist + open link
    openUnsub = messaging().onNotificationOpenedApp(async msg => {
      const mapped = mapMessage(msg);
      await addToInbox(mapped);
      // Validate deep-link before opening to prevent phishing attacks
      if (mapped.deeplink && isValidDeepLink(mapped.deeplink)) {
        try {
          await Linking.openURL(mapped.deeplink);
        } catch {}
      }
    });

    // 📬 Tapped from quit (cold start)
    const initial = await messaging().getInitialNotification();
    if (initial) {
      const mapped = mapMessage(initial);
      await addToInbox(mapped);
      // Validate deep-link before opening to prevent phishing attacks
      if (mapped.deeplink && isValidDeepLink(mapped.deeplink)) {
        try {
          await Linking.openURL(mapped.deeplink);
        } catch {}
      }
    }

    // 🔄 Token refresh → register again
    messaging().onTokenRefresh(async newTok => {
      try {
        await apiClient.post('/notifications/register', {
          device_token: newTok,
          platform: Platform.OS,
          sender_id: senderId,
          project_id: projectId,
        });
      } catch (e) {
        // register(refresh) failed
      }
    });

  } catch (err) {
    // initializeNotifications error
  }
};

////////////////////////

// // utils/notificationService.ts
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging, {
//   FirebaseMessagingTypes,
// } from '@react-native-firebase/messaging';
// import {Linking, Platform} from 'react-native';
// import {API_BASE_URL} from '../config/api';
// import {addToInbox} from './notificationInbox';

// // ----- inbox record type -----
// type InboxItem = {
//   id: string;
//   title?: string;
//   message: string;
//   timestamp: string;
//   category?: 'news' | 'outfit' | 'weather' | 'care' | 'other';
//   deeplink?: string;
//   data?: Record<string, string>;
// };

// // ✅ Helper: Map FCM → InboxItem
// function mapMessage(msg: FirebaseMessagingTypes.RemoteMessage): InboxItem {
//   const id =
//     msg.messageId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
//   const title = msg.notification?.title ?? msg.data?.title ?? undefined;
//   const message =
//     msg.notification?.body ?? msg.data?.body ?? msg.data?.message ?? '';
//   const deeplink = msg.data?.deeplink;
//   const category = (msg.data?.category as InboxItem['category']) ?? 'other';

//   return {
//     id,
//     title,
//     message,
//     timestamp: new Date().toISOString(),
//     category,
//     deeplink,
//     data: msg.data ?? {},
//   };
// }

// // Keep references to unsubscribers so we don’t double-register listeners
// let fgUnsub: (() => void) | null = null;
// let openUnsub: (() => void) | null = null;
// let fgRegistered = false;

// // 🔥 Used to suppress duplicate banners
// let lastShownId: string | null = null;

// export const initializeNotifications = async (userId?: string) => {
//   try {
//     const enabled = await AsyncStorage.getItem('notificationsEnabled');
//     if (enabled !== 'true') {
//       console.log('🔕 Notifications disabled. Skipping initialization.');
//       return;
//     }

//     console.log('⚡️ Initializing notifications…');

//     // 🔔 Local notification setup (Android heads-up support)
//     PushNotification.configure({
//       onNotification: n => console.log('🔔 Local notification:', n),
//       requestPermissions: true,
//     });

//     PushNotification.createChannel(
//       {
//         channelId: 'style-channel',
//         channelName: 'Style Alerts',
//         importance: 4,
//         vibrate: true,
//         soundName: 'default',
//       },
//       created => console.log(`📡 Channel ${created ? 'created' : 'exists'}`),
//     );

//     if (!userId) {
//       console.warn('⚠️ No userId provided. Skipping token registration.');
//       return;
//     }

//     // 🔐 Request push permissions
//     const status = await messaging().requestPermission();
//     const granted =
//       status === messaging.AuthorizationStatus.AUTHORIZED ||
//       status === messaging.AuthorizationStatus.PROVISIONAL;
//     console.log('📛 Push permission status:', status, 'granted=', granted);

//     await messaging().registerDeviceForRemoteMessages();

//     const fcmToken = await messaging().getToken();
//     console.log(
//       '🎫 FCM token:',
//       fcmToken ? fcmToken.slice(0, 28) + '…' : '(null)',
//     );

//     // 🔍 Gather Firebase project metadata
//     let senderId: string | undefined;
//     let projectId: string | undefined;
//     try {
//       const opts = (messaging() as any).app?.options || {};
//       senderId = opts.messagingSenderId;
//       projectId = opts.projectId;
//     } catch {}
//     console.log('🏷️ Firebase opts:', {senderId, projectId});

//     // 📡 Register token with backend
//     if (fcmToken) {
//       const r = await fetch(`${API_BASE_URL}/notifications/register`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           device_token: fcmToken,
//           platform: Platform.OS,
//           sender_id: senderId,
//           project_id: projectId,
//         }),
//       });
//       const j = await r.json().catch(() => ({}));
//       console.log('📨 /notifications/register =>', r.status, j);
//     } else {
//       console.warn('⚠️ No FCM token; cannot register.');
//     }

//     // 🧹 Clean up any old listeners
//     fgUnsub?.();
//     openUnsub?.();
//     fgUnsub = null;
//     openUnsub = null;
//     fgRegistered = false;
//     lastShownId = null;

//     // 📬 Foreground push → show banner (only once)
//     if (!fgRegistered) {
//       fgUnsub = messaging().onMessage(async msg => {
//         const mapped = mapMessage(msg);
//         console.log('📩 Foreground push:', mapped.id);

//         // ✅ Skip banner if we've already shown this message ID
//         if (mapped.id === lastShownId) {
//           console.log('⚠️ Skipping duplicate banner for:', mapped.id);
//           return;
//         }
//         lastShownId = mapped.id;

//         // 🔔 Show local banner (but DO NOT add to inbox here to prevent duplicates)
//         try {
//           PushNotification.localNotification({
//             channelId: 'style-channel',
//             title: mapped.title || 'Notification',
//             message: mapped.message || '',
//             userInfo: mapped,
//             playSound: true,
//           });
//         } catch (e) {
//           console.warn('⚠️ Failed to show local notification', e);
//         }
//       });
//       fgRegistered = true;
//     }

//     // 📬 Tapped from background → persist + open link
//     openUnsub = messaging().onNotificationOpenedApp(async msg => {
//       const mapped = mapMessage(msg);
//       await addToInbox(mapped);
//       if (mapped.deeplink) {
//         try {
//           await Linking.openURL(mapped.deeplink);
//         } catch {}
//       }
//     });

//     // 📬 Tapped from quit (cold start)
//     const initial = await messaging().getInitialNotification();
//     if (initial) {
//       const mapped = mapMessage(initial);
//       await addToInbox(mapped);
//       if (mapped.deeplink) {
//         try {
//           await Linking.openURL(mapped.deeplink);
//         } catch {}
//       }
//     }

//     // 🔄 Token refresh → register again
//     messaging().onTokenRefresh(async newTok => {
//       console.log('🔄 FCM token refreshed:', newTok.slice(0, 28) + '…');
//       try {
//         await fetch(`${API_BASE_URL}/notifications/register`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             device_token: newTok,
//             platform: Platform.OS,
//             sender_id: senderId,
//             project_id: projectId,
//           }),
//         });
//       } catch (e) {
//         console.log('⚠️ register(refresh) failed:', e);
//       }
//     });

//     console.log('✅ Push initialized, listeners armed, inbox enabled');
//   } catch (err) {
//     console.error('❌ initializeNotifications error:', err);
//   }
// };
