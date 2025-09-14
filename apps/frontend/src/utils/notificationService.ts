// utils/notificationService.ts
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import {API_BASE_URL} from '../config/api';

export const initializeNotifications = async (userId?: string) => {
  try {
    const enabled = await AsyncStorage.getItem('notificationsEnabled');
    if (enabled !== 'true') {
      console.log('🔕 Notifications disabled. Skipping initialization.');
      return;
    }

    console.log('⚡️ Initializing notifications…');

    // Local notifications (unchanged)
    PushNotification.configure({
      onNotification: n => console.log('🔔 Local notification:', n),
      requestPermissions: true,
    });

    PushNotification.createChannel(
      {
        channelId: 'style-channel',
        channelName: 'Style Reminders',
        importance: 4,
        vibrate: true,
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

    // FCM token (the thing we send from the server)
    const fcmToken = await messaging().getToken();
    console.log(
      '🎫 FCM token:',
      fcmToken ? fcmToken.slice(0, 28) + '…' : '(null)',
    );

    // Get runtime Firebase project info WITHOUT calling app() directly
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
          platform: Platform.OS, // 'ios' | 'android'
          sender_id: senderId, // ← send to server
          project_id: projectId, // ← send to server
        }),
      });
      const j = await r.json().catch(() => ({}));
      console.log('📨 /notifications/register =>', r.status, j);
    } else {
      console.warn('⚠️ No FCM token; cannot register.');
    }

    // Foreground messages (sanity check path)
    messaging().onMessage(async msg => {
      console.log('📩 Foreground FCM:', JSON.stringify(msg));
    });

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

    console.log('✅ Push initialized & token registration attempted');
  } catch (err) {
    console.error('❌ initializeNotifications error:', err);
  }
};

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
