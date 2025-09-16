// utils/notificationService.ts
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {Linking, Platform} from 'react-native';
import {API_BASE_URL} from '../config/api';

// ----- inbox helpers (stored under 'notifications' to match your screen) -----
type InboxItem = {
  id: string;
  title?: string;
  message: string;
  timestamp: string; // ISO
  category?: 'news' | 'outfit' | 'weather' | 'care' | 'other';
  deeplink?: string; // e.g. myapp://news/123
  data?: Record<string, string>;
};

const INBOX_KEY = 'notifications';
const cap = 200;

async function loadInbox(): Promise<InboxItem[]> {
  const raw = await AsyncStorage.getItem(INBOX_KEY);
  return raw ? JSON.parse(raw) : [];
}
async function saveInbox(list: InboxItem[]) {
  await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(list));
}
async function addToInbox(n: InboxItem) {
  const list = await loadInbox();
  if (list.some(x => x.id === n.id)) return; // dedupe by id
  const next = [n, ...list].slice(0, cap);
  await saveInbox(next);
}

// map FCM -> inbox record (robust to different payload shapes)
function mapMessage(msg: FirebaseMessagingTypes.RemoteMessage): InboxItem {
  const id =
    msg.messageId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = msg.notification?.title ?? msg.data?.title ?? undefined;
  const message =
    msg.notification?.body ?? msg.data?.body ?? msg.data?.message ?? '';
  const deeplink = msg.data?.deeplink; // your server should send this
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

// keep refs so we don’t double-register listeners
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

    // Local notifications (channel ensures heads-up on Android)
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

    // Permissions + remote registration
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

    // Try to report Firebase app info (optional)
    let senderId: string | undefined;
    let projectId: string | undefined;
    try {
      const opts = (messaging() as any).app?.options || {};
      senderId = opts.messagingSenderId;
      projectId = opts.projectId;
    } catch {}
    console.log('🏷️ Firebase opts:', {senderId, projectId});

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

    // Clean up existing listeners (avoid duplicates on hot reload/user switch)
    fgUnsub?.();
    openUnsub?.();
    fgUnsub = null;
    openUnsub = null;

    // Foreground messages → save + (optional) show local banner
    fgUnsub = messaging().onMessage(async msg => {
      const mapped = mapMessage(msg);
      await addToInbox(mapped);

      // Show a foreground banner so it "feels" like a push while open
      try {
        PushNotification.localNotification({
          channelId: 'style-channel',
          title: mapped.title || 'Notification',
          message: mapped.message || '',
          userInfo: mapped, // iOS: carry data
          playSound: true,
        });
      } catch {}
    });

    // Tapped from background → save + open deep link
    openUnsub = messaging().onNotificationOpenedApp(async msg => {
      const mapped = mapMessage(msg);
      await addToInbox(mapped);
      if (mapped.deeplink) {
        try {
          await Linking.openURL(mapped.deeplink);
        } catch {}
      }
    });

    // Tapped from quit (cold start) → save + open deep link
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

    // Token refresh handler
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

//////////////////////

// // utils/notificationService.ts
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging from '@react-native-firebase/messaging';
// import {Platform} from 'react-native';
// import {API_BASE_URL} from '../config/api';

// export const initializeNotifications = async (userId?: string) => {
//   try {
//     const enabled = await AsyncStorage.getItem('notificationsEnabled');
//     if (enabled !== 'true') {
//       console.log('🔕 Notifications disabled. Skipping initialization.');
//       return;
//     }

//     console.log('⚡️ Initializing notifications…');

//     // Local notifications (unchanged)
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
//         soundName: 'default', // ← ensure sound on this channel
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

//     // FCM token (the thing we send from the server)
//     const fcmToken = await messaging().getToken();
//     console.log(
//       '🎫 FCM token:',
//       fcmToken ? fcmToken.slice(0, 28) + '…' : '(null)',
//     );

//     // Get runtime Firebase project info WITHOUT calling app() directly
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
//           platform: Platform.OS, // 'ios' | 'android'
//           sender_id: senderId, // ← send to server
//           project_id: projectId, // ← send to server
//         }),
//       });
//       const j = await r.json().catch(() => ({}));
//       console.log('📨 /notifications/register =>', r.status, j);
//     } else {
//       console.warn('⚠️ No FCM token; cannot register.');
//     }

//     // Foreground messages (sanity check path)
//     messaging().onMessage(async msg => {
//       console.log('📩 Foreground FCM:', JSON.stringify(msg));
//     });

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

//     console.log('✅ Push initialized & token registration attempted');
//   } catch (err) {
//     console.error('❌ initializeNotifications error:', err);
//   }
// };

//////////////////

// // utils/notificationService.ts
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging from '@react-native-firebase/messaging';
// import {Platform} from 'react-native';
// import {API_BASE_URL} from '../config/api';

// export const initializeNotifications = async (userId?: string) => {
//   try {
//     const enabled = await AsyncStorage.getItem('notificationsEnabled');
//     if (enabled !== 'true') {
//       console.log('🔕 Notifications disabled. Skipping initialization.');
//       return;
//     }

//     console.log('⚡️ Initializing notifications…');

//     // Local notifications (unchanged)
//     PushNotification.configure({
//       onNotification: n => console.log('🔔 Local notification:', n),
//       requestPermissions: true,
//     });

//     PushNotification.createChannel(
//       {
//         channelId: 'style-channel',
//         channelName: 'Style Reminders',
//         importance: 4,
//         vibrate: true,
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

//     // FCM token (the thing we send from the server)
//     const fcmToken = await messaging().getToken();
//     console.log(
//       '🎫 FCM token:',
//       fcmToken ? fcmToken.slice(0, 28) + '…' : '(null)',
//     );

//     // Get runtime Firebase project info WITHOUT calling app() directly
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
//           platform: Platform.OS, // 'ios' | 'android'
//           sender_id: senderId, // ← send to server
//           project_id: projectId, // ← send to server
//         }),
//       });
//       const j = await r.json().catch(() => ({}));
//       console.log('📨 /notifications/register =>', r.status, j);
//     } else {
//       console.warn('⚠️ No FCM token; cannot register.');
//     }

//     // Foreground messages (sanity check path)
//     messaging().onMessage(async msg => {
//       console.log('📩 Foreground FCM:', JSON.stringify(msg));
//     });

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

//     console.log('✅ Push initialized & token registration attempted');
//   } catch (err) {
//     console.error('❌ initializeNotifications error:', err);
//   }
// };

////////////////////

// // utils/notificationService.ts
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging from '@react-native-firebase/messaging';
// import {Platform} from 'react-native';
// import {API_BASE_URL} from '../config/api';

// export const initializeNotifications = async (userId?: string) => {
//   try {
//     const enabled = await AsyncStorage.getItem('notificationsEnabled');
//     if (enabled !== 'true') {
//       console.log('🔕 Notifications disabled. Skipping initialization.');
//       return;
//     }

//     console.log('⚡️ Initializing notifications…');

//     // Local notifications (unchanged)
//     PushNotification.configure({
//       onNotification: n => console.log('🔔 Local notification:', n),
//       requestPermissions: true,
//     });

//     PushNotification.createChannel(
//       {
//         channelId: 'style-channel',
//         channelName: 'Style Reminders',
//         importance: 4,
//         vibrate: true,
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

//     // FCM token (the thing we send from the server)
//     const fcmToken = await messaging().getToken();
//     console.log(
//       '🎫 FCM token:',
//       fcmToken ? fcmToken.slice(0, 28) + '…' : '(null)',
//     );

//     // Get runtime Firebase project info WITHOUT calling app() directly
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
//           platform: Platform.OS, // 'ios' | 'android'
//           sender_id: senderId, // ← send to server
//           project_id: projectId, // ← send to server
//         }),
//       });
//       const j = await r.json().catch(() => ({}));
//       console.log('📨 /notifications/register =>', r.status, j);
//     } else {
//       console.warn('⚠️ No FCM token; cannot register.');
//     }

//     // Foreground messages (sanity check path)
//     messaging().onMessage(async msg => {
//       console.log('📩 Foreground FCM:', JSON.stringify(msg));
//     });

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

//     console.log('✅ Push initialized & token registration attempted');
//   } catch (err) {
//     console.error('❌ initializeNotifications error:', err);
//   }
// };

////////////////

// // utils/notificationService.ts
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging from '@react-native-firebase/messaging';
// import app from '@react-native-firebase/app';
// import {Platform} from 'react-native';
// import {API_BASE_URL} from '../config/api';

// type InitOpts = {force?: boolean};

// export const initializeNotifications = async (
//   userId?: string,
//   opts?: InitOpts,
// ) => {
//   try {
//     const enabled = await AsyncStorage.getItem('notificationsEnabled');
//     if (!opts?.force && enabled !== 'true') {
//       console.log('🔕 Notifications disabled. Skipping initialization.');
//       return;
//     }

//     console.log('⚡️ Initializing notifications…');

//     PushNotification.configure({
//       onNotification: n => console.log('🔔 Local notification:', n),
//       requestPermissions: true,
//     });

//     PushNotification.createChannel(
//       {
//         channelId: 'style-channel',
//         channelName: 'Style Reminders',
//         importance: 4,
//         vibrate: true,
//       },
//       created => console.log(`📡 Channel ${created ? 'created' : 'exists'}`),
//     );

//     const rt = app().options;
//     const projectId = rt.projectId;
//     const senderId = rt.messagingSenderId;
//     console.log('🔥 Firebase runtime:', {
//       appId: rt.appId,
//       projectId,
//       senderId,
//       apiKeyPresent: !!rt.apiKey,
//     });

//     if (!userId) {
//       console.warn('⚠️ No userId provided. Skipping token registration.');
//       return;
//     }

//     const status = await messaging().requestPermission();
//     const granted =
//       status === messaging.AuthorizationStatus.AUTHORIZED ||
//       status === messaging.AuthorizationStatus.PROVISIONAL;
//     console.log('📛 Notification permission:', status, 'granted=', granted);

//     await messaging().registerDeviceForRemoteMessages();

//     const fcmToken = await messaging().getToken();
//     console.log(
//       '🎫 FCM token:',
//       fcmToken ? fcmToken.slice(0, 28) + '…' : '(null)',
//     );

//     if (Platform.OS === 'ios') {
//       try {
//         const apns = await messaging().getAPNSToken();
//         console.log('🍏 APNs token:', apns ?? '(null)');
//       } catch (e) {
//         console.log('⚠️ getAPNSToken failed:', e);
//       }
//     }

//     if (fcmToken) {
//       const r = await fetch(`${API_BASE_URL}/notifications/register`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           device_token: fcmToken,
//           platform: Platform.OS, // 'ios' | 'android'
//           sender_id: senderId ?? '', // 👈 include sender/project so server can validate
//           project_id: projectId ?? '',
//         }),
//       });
//       const j = await r.json().catch(() => ({}));
//       console.log('📨 /notifications/register (FCM):', r.status, j);
//     } else {
//       console.warn('⚠️ No FCM token; cannot receive pushes.');
//     }

//     // Foreground messages
//     messaging().onMessage(async msg => {
//       console.log('📩 FCM foreground message:', JSON.stringify(msg));
//     });

//     // Token refresh
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
//             sender_id: senderId ?? '',
//             project_id: projectId ?? '',
//           }),
//         });
//       } catch (e) {
//         console.log('⚠️ register(refresh) failed:', e);
//       }
//     });
//   } catch (err) {
//     console.error('❌ initializeNotifications error:', err);
//   }
// };

/////////////

// // utils/initializeNotifications.ts
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging from '@react-native-firebase/messaging';
// import {Platform} from 'react-native';
// import {API_BASE_URL} from '../config/api';

// export const initializeNotifications = async (userId?: string) => {
//   const enabled = await AsyncStorage.getItem('notificationsEnabled');
//   if (enabled !== 'true') {
//     console.log('🔕 Notifications disabled. Skipping initialization.');
//     return;
//   }

//   console.log('⚡️ Initializing notifications...');

//   // Local notification config
//   PushNotification.configure({
//     onNotification: notification => {
//       console.log('🔔 Local notification received:', notification);
//     },
//     requestPermissions: true,
//   });

//   PushNotification.createChannel(
//     {
//       channelId: 'style-channel',
//       channelName: 'Style Reminders',
//       importance: 4,
//       vibrate: true,
//     },
//     created =>
//       console.log(
//         `📡 Notification channel ${created ? 'created' : 'already exists'}`,
//       ),
//   );

//   if (!userId) {
//     console.warn('⚠️ No userId provided. Skipping FCM registration.');
//     return;
//   }

//   try {
//     console.log('📲 Requesting permission & device registration…');
//     await messaging().requestPermission();
//     await messaging().registerDeviceForRemoteMessages();

//     const token = await messaging().getToken();
//     console.log('📱 FCM device token:', token);

//     if (!token) {
//       console.warn('⚠️ No FCM token returned — cannot register with backend.');
//       return;
//     }

//     const res = await fetch(`${API_BASE_URL}/notifications/register`, {
//       method: 'POST',
//       headers: {'Content-Type': 'application/json'},
//       body: JSON.stringify({
//         user_id: userId,
//         device_token: token,
//         platform: Platform.OS,
//       }),
//     });

//     const json = await res.json().catch(() => ({}));
//     console.log('📨 Backend register response:', res.status, json);
//   } catch (err) {
//     console.error('❌ Failed to initialize notifications:', err);
//   }
// };

///////////////

// // utils/initializeNotifications.ts

// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging from '@react-native-firebase/messaging';
// import {Platform} from 'react-native';
// import {API_BASE_URL} from '../config/api';

// export const initializeNotifications = async (userId?: string) => {
//   const enabled = await AsyncStorage.getItem('notificationsEnabled');
//   if (enabled !== 'true') {
//     console.log('🔕 Notifications disabled. Skipping initialization.');
//     return;
//   }

//   // 🔔 Local notification setup (what you already had)
//   PushNotification.configure({
//     onNotification: notification => {
//       console.log('🔔 Notification:', notification);
//     },
//     requestPermissions: true,
//   });

//   PushNotification.createChannel(
//     {
//       channelId: 'style-channel',
//       channelName: 'Style Reminders',
//       importance: 4,
//       vibrate: true,
//     },
//     created =>
//       console.log(
//         `🔔 Notification channel ${created ? 'created' : 'already exists'}`,
//       ),
//   );

//   // ⚡️ NEW: register FCM push token with backend
//   if (userId) {
//     await messaging().requestPermission();
//     await messaging().registerDeviceForRemoteMessages();

//     const token = await messaging().getToken();
//     if (token) {
//       await fetch(`${API_BASE_URL}/notifications/register`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           device_token: token,
//           platform: Platform.OS, // 'ios' | 'android'
//         }),
//       });
//       console.log('📨 Push token registered with backend');
//     }
//   }
// };

////////////////

// // utils/initializeNotifications.ts

// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export const initializeNotifications = async () => {
//   const enabled = await AsyncStorage.getItem('notificationsEnabled');
//   if (enabled !== 'true') {
//     console.log('🔕 Notifications disabled. Skipping initialization.');
//     return;
//   }

//   PushNotification.configure({
//     onNotification: notification => {
//       console.log('🔔 Notification:', notification);
//     },
//     requestPermissions: true,
//   });

//   PushNotification.createChannel(
//     {
//       channelId: 'style-channel',
//       channelName: 'Style Reminders',
//       importance: 4,
//       vibrate: true,
//     },
//     created =>
//       console.log(
//         `🔔 Notification channel ${created ? 'created' : 'already exists'}`,
//       ),
//   );
// };
