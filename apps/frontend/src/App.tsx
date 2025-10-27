import './utils/WeatherBus';
import {LogBox} from 'react-native';

/// 🔀 Flip this when you want logs back
const ENABLE_LOG_SILENCER = true;

if (__DEV__) {
  if (ENABLE_LOG_SILENCER) {
    LogBox.ignoreLogs([
      'This method is deprecated (as well as all React Native Firebase namespaced API)',
      'Please use `getApp()` instead.',
      'Usage of "messaging().registerDeviceForRemoteMessages()" is not required.',
      '⚠️ No userId provided. Skipping token registration.',
    ]);

    const originalWarn = console.warn;
    // @ts-expect-error: preserving original signature
    console.warn = (...args) => {
      const msg = String(args?.[0] ?? '');
      if (
        msg.includes(
          'This method is deprecated (as well as all React Native Firebase namespaced API)',
        ) ||
        msg.includes('Please use `getApp()` instead.') ||
        msg.includes(
          'Usage of "messaging().registerDeviceForRemoteMessages()" is not required.',
        ) ||
        msg.includes('⚠️ No userId provided. Skipping token registration.')
      ) {
        return;
      }
      // @ts-expect-error: preserving original signature
      originalWarn(...args);
    };
  } else {
    LogBox.ignoreAllLogs(false);
  }
}

import React, {useEffect} from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './lib/queryClient';
import {ThemeProvider} from './context/ThemeContext';
import MainApp from './MainApp';
import {Auth0Provider} from 'react-native-auth0';
import {UUIDProvider, useUUID} from './context/UUIDContext';
import {initializeNotifications} from './utils/notificationService';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import {addToInbox, AppNotification} from './utils/notificationInbox';

function RootWithNotifications() {
  const userId = useUUID();

  useEffect(() => {
    if (userId) {
      initializeNotifications(userId);

      const unsubscribe = messaging().onMessage(async msg => {
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
      });

      return unsubscribe;
    }
  }, [userId]);

  // ✅ No gesture wrapper here — it's handled inside RootNavigator where goBack() lives
  return <MainApp />;
}

const App = () => (
  <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <Auth0Provider
      domain="dev-xeaol4s5b2zd7wuz.us.auth0.com"
      clientId="0VpKzuZyGjkmAMNmEYXNRQQbdysFkLz5">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <UUIDProvider>
            <RootWithNotifications />
          </UUIDProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Auth0Provider>
  </SafeAreaProvider>
);

export default App;

////////////////////

// import {LogBox} from 'react-native';

// /// 🔀 Flip this when you want logs back
// const ENABLE_LOG_SILENCER = true;

// if (__DEV__) {
//   if (ENABLE_LOG_SILENCER) {
//     LogBox.ignoreLogs([
//       'This method is deprecated (as well as all React Native Firebase namespaced API)',
//       'Please use `getApp()` instead.',
//       'Usage of "messaging().registerDeviceForRemoteMessages()" is not required.',
//       '⚠️ No userId provided. Skipping token registration.',
//     ]);

//     const originalWarn = console.warn;
//     // @ts-expect-error: preserving original signature
//     console.warn = (...args) => {
//       const msg = String(args?.[0] ?? '');
//       if (
//         msg.includes(
//           'This method is deprecated (as well as all React Native Firebase namespaced API)',
//         ) ||
//         msg.includes('Please use `getApp()` instead.') ||
//         msg.includes(
//           'Usage of "messaging().registerDeviceForRemoteMessages()" is not required.',
//         ) ||
//         msg.includes('⚠️ No userId provided. Skipping token registration.')
//       ) {
//         return;
//       }
//       // @ts-expect-error: preserving original signature
//       originalWarn(...args);
//     };
//   } else {
//     LogBox.ignoreAllLogs(false);
//   }
// }

// import React, {useEffect} from 'react';
// import {QueryClientProvider} from '@tanstack/react-query';
// import {queryClient} from './lib/queryClient';
// import {ThemeProvider} from './context/ThemeContext';
// import MainApp from './MainApp';
// import {Auth0Provider} from 'react-native-auth0';
// import {UUIDProvider, useUUID} from './context/UUIDContext';
// import {initializeNotifications} from './utils/notificationService';
// import {
//   SafeAreaProvider,
//   initialWindowMetrics,
// } from 'react-native-safe-area-context';
// import messaging from '@react-native-firebase/messaging';
// import {addToInbox, AppNotification} from './utils/notificationInbox';

// function RootWithNotifications() {
//   const userId = useUUID();

//   useEffect(() => {
//     if (userId) {
//       initializeNotifications(userId);

//       const unsubscribe = messaging().onMessage(async msg => {
//         await addToInbox({
//           user_id: userId,
//           id: msg.messageId || `${Date.now()}`,
//           title: msg.notification?.title || msg.data?.title,
//           message:
//             msg.notification?.body || msg.data?.body || msg.data?.message || '',
//           timestamp: new Date().toISOString(),
//           category:
//             (msg.data?.category as AppNotification['category']) ?? 'other',
//           deeplink: msg.data?.deeplink,
//           data: msg.data,
//           read: false,
//         });
//       });

//       return unsubscribe;
//     }
//   }, [userId]);

//   // ✅ No gesture wrapper here — it's handled inside RootNavigator where goBack() lives
//   return <MainApp />;
// }

// const App = () => (
//   <SafeAreaProvider initialMetrics={initialWindowMetrics}>
//     <Auth0Provider
//       domain="dev-xeaol4s5b2zd7wuz.us.auth0.com"
//       clientId="0VpKzuZyGjkmAMNmEYXNRQQbdysFkLz5">
//       <QueryClientProvider client={queryClient}>
//         <ThemeProvider>
//           <UUIDProvider>
//             <RootWithNotifications />
//           </UUIDProvider>
//         </ThemeProvider>
//       </QueryClientProvider>
//     </Auth0Provider>
//   </SafeAreaProvider>
// );

// export default App;
