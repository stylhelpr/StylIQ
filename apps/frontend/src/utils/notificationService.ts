// utils/notificationService.ts
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {Linking, Platform} from 'react-native';
import {API_BASE_URL} from '../config/api';
import {addToInbox} from './notificationInbox'; // ✅ use your shared inbox util

// ----- inbox record type -----
type InboxItem = {
  id: string;
  title?: string;
  message: string;
  timestamp: string; // ISO
  category?: 'news' | 'outfit' | 'weather' | 'care' | 'other';
  deeplink?: string;
  data?: Record<string, string>;
};

// Map FCM → InboxItem
function mapMessage(msg: FirebaseMessagingTypes.RemoteMessage): InboxItem {
  const id =
    msg.messageId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = msg.notification?.title ?? msg.data?.title ?? undefined;
  const message =
    msg.notification?.body ?? msg.data?.body ?? msg.data?.message ?? '';
  const deeplink = msg.data?.deeplink;
  const category = (msg.data?.category as InboxItem['category']) ?? 'other';
  return {
    id,
    title,
    message,
    timestamp: new Date().toISOString(),
    category,
    deeplink,
    data: msg.data ?? {},
  };
}

// Keep references to unsubscribers
let fgUnsub: (() => void) | null = null;
let openUnsub: (() => void) | null = null;

export const initializeNotifications = async (userId?: string) => {
  try {
    const enabled = await AsyncStorage.getItem('notificationsEnabled');
    if (enabled !== 'true') {
      console.log('🔕 Notifications disabled. Skipping initialization.');
      return;
    }

    console.log('⚡️ Initializing notifications…');

    // 🔔 Local notifications (Android heads-up)
    PushNotification.configure({
      onNotification: n => console.log('🔔 Local notification:', n),
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
    const status = await messaging().requestPermission();
    const granted =
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL;
    console.log('📛 Push permission status:', status, 'granted=', granted);

    await messaging().registerDeviceForRemoteMessages();

    const fcmToken = await messaging().getToken();
    console.log(
      '🎫 FCM token:',
      fcmToken ? fcmToken.slice(0, 28) + '…' : '(null)',
    );

    // 🔍 Gather Firebase project metadata
    let senderId: string | undefined;
    let projectId: string | undefined;
    try {
      const opts = (messaging() as any).app?.options || {};
      senderId = opts.messagingSenderId;
      projectId = opts.projectId;
    } catch {}
    console.log('🏷️ Firebase opts:', {senderId, projectId});

    // 📡 Register token with backend
    if (fcmToken) {
      const r = await fetch(`${API_BASE_URL}/notifications/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          device_token: fcmToken,
          platform: Platform.OS,
          sender_id: senderId,
          project_id: projectId,
        }),
      });
      const j = await r.json().catch(() => ({}));
      console.log('📨 /notifications/register =>', r.status, j);
    } else {
      console.warn('⚠️ No FCM token; cannot register.');
    }

    // 🧹 Clean up any old listeners
    fgUnsub?.();
    openUnsub?.();
    fgUnsub = null;
    openUnsub = null;

    // 📬 Foreground push → show banner only
    fgUnsub = messaging().onMessage(async msg => {
      const mapped = mapMessage(msg);

      // 🔔 Just show a foreground banner (inbox listener will handle persistence)
      try {
        PushNotification.localNotification({
          channelId: 'style-channel',
          title: mapped.title || 'Notification',
          message: mapped.message || '',
          userInfo: mapped,
          playSound: true,
        });
      } catch (e) {
        console.warn('⚠️ Failed to show local notification', e);
      }
    });

    // 📬 Tapped from background → persist + open link
    openUnsub = messaging().onNotificationOpenedApp(async msg => {
      const mapped = mapMessage(msg);
      await addToInbox(mapped); // ✅ only add here on interaction
      if (mapped.deeplink) {
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
      if (mapped.deeplink) {
        try {
          await Linking.openURL(mapped.deeplink);
        } catch {}
      }
    }

    // 🔄 Token refresh → register again
    messaging().onTokenRefresh(async newTok => {
      console.log('🔄 FCM token refreshed:', newTok.slice(0, 28) + '…');
      try {
        await fetch(`${API_BASE_URL}/notifications/register`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            user_id: userId,
            device_token: newTok,
            platform: Platform.OS,
            sender_id: senderId,
            project_id: projectId,
          }),
        });
      } catch (e) {
        console.log('⚠️ register(refresh) failed:', e);
      }
    });

    console.log('✅ Push initialized, listeners armed, inbox enabled');
  } catch (err) {
    console.error('❌ initializeNotifications error:', err);
  }
};

/////////////////////////

// // utils/notificationService.ts
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging, {
//   FirebaseMessagingTypes,
// } from '@react-native-firebase/messaging';
// import {Linking, Platform} from 'react-native';
// import {API_BASE_URL} from '../config/api';

// // ----- inbox helpers (stored under 'notifications' to match your screen) -----
// type InboxItem = {
//   id: string;
//   title?: string;
//   message: string;
//   timestamp: string; // ISO
//   category?: 'news' | 'outfit' | 'weather' | 'care' | 'other';
//   deeplink?: string; // e.g. myapp://news/123
//   data?: Record<string, string>;
// };

// const INBOX_KEY = 'notifications';
// const cap = 200;

// async function loadInbox(): Promise<InboxItem[]> {
//   const raw = await AsyncStorage.getItem(INBOX_KEY);
//   return raw ? JSON.parse(raw) : [];
// }
// async function saveInbox(list: InboxItem[]) {
//   await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(list));
// }
// async function addToInbox(n: InboxItem) {
//   const list = await loadInbox();
//   if (list.some(x => x.id === n.id)) return; // dedupe by id
//   const next = [n, ...list].slice(0, cap);
//   await saveInbox(next);
// }

// // map FCM -> inbox record (robust to different payload shapes)
// function mapMessage(msg: FirebaseMessagingTypes.RemoteMessage): InboxItem {
//   const id =
//     msg.messageId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
//   const title = msg.notification?.title ?? msg.data?.title ?? undefined;
//   const message =
//     msg.notification?.body ?? msg.data?.body ?? msg.data?.message ?? '';
//   const deeplink = msg.data?.deeplink; // your server should send this
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

// // keep refs so we don’t double-register listeners
// let fgUnsub: (() => void) | null = null;
// let openUnsub: (() => void) | null = null;

// export const initializeNotifications = async (userId?: string) => {
//   try {
//     const enabled = await AsyncStorage.getItem('notificationsEnabled');
//     if (enabled !== 'true') {
//       console.log('🔕 Notifications disabled. Skipping initialization.');
//       return;
//     }

//     console.log('⚡️ Initializing notifications…');

//     // Local notifications (channel ensures heads-up on Android)
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

//     // Permissions + remote registration
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

//     // Try to report Firebase app info (optional)
//     let senderId: string | undefined;
//     let projectId: string | undefined;
//     try {
//       const opts = (messaging() as any).app?.options || {};
//       senderId = opts.messagingSenderId;
//       projectId = opts.projectId;
//     } catch {}
//     console.log('🏷️ Firebase opts:', {senderId, projectId});

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

//     // Clean up existing listeners (avoid duplicates on hot reload/user switch)
//     fgUnsub?.();
//     openUnsub?.();
//     fgUnsub = null;
//     openUnsub = null;

//     // Foreground messages → save + (optional) show local banner
//     fgUnsub = messaging().onMessage(async msg => {
//       const mapped = mapMessage(msg);
//       await addToInbox(mapped);

//       // Show a foreground banner so it "feels" like a push while open
//       try {
//         PushNotification.localNotification({
//           channelId: 'style-channel',
//           title: mapped.title || 'Notification',
//           message: mapped.message || '',
//           userInfo: mapped, // iOS: carry data
//           playSound: true,
//         });
//       } catch {}
//     });

//     // Tapped from background → save + open deep link
//     openUnsub = messaging().onNotificationOpenedApp(async msg => {
//       const mapped = mapMessage(msg);
//       await addToInbox(mapped);
//       if (mapped.deeplink) {
//         try {
//           await Linking.openURL(mapped.deeplink);
//         } catch {}
//       }
//     });

//     // Tapped from quit (cold start) → save + open deep link
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

//     // Token refresh handler
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
