import {LogBox} from 'react-native';

/// 🔀 Flip this when you want logs back
const ENABLE_LOG_SILENCER = true;

// 🔇 Dev-only: optionally silence specific noisy warnings that spam your console
if (__DEV__) {
  if (ENABLE_LOG_SILENCER) {
    LogBox.ignoreLogs([
      // RN Firebase modular migration spam
      'This method is deprecated (as well as all React Native Firebase namespaced API)',
      'Please use `getApp()` instead.',
      // Messaging auto-register FYI
      'Usage of "messaging().registerDeviceForRemoteMessages()" is not required.',
      // Your own notifier when userId is missing
      '⚠️ No userId provided. Skipping token registration.',
    ]);

    // Drop just these warn lines even if a lib bypasses LogBox
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
        return; // swallow
      }
      // otherwise forward
      // @ts-expect-error: preserving original signature
      originalWarn(...args);
    };
  } else {
    // Explicitly un-ignore (useful if you previously had ignoreAllLogs(true))
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

function RootWithNotifications() {
  const userId = useUUID();

  useEffect(() => {
    if (userId) initializeNotifications(userId);
  }, [userId]);

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

////////////////

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

// function RootWithNotifications() {
//   const userId = useUUID();

//   useEffect(() => {
//     if (userId) initializeNotifications(userId);
//   }, [userId]);

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

///////////////

// // App.tsx
// import React, {useEffect} from 'react';
// import {QueryClientProvider} from '@tanstack/react-query';
// import {queryClient} from './lib/queryClient';
// import {ThemeProvider} from './context/ThemeContext';
// import MainApp from './MainApp';
// import {Auth0Provider} from 'react-native-auth0';
// import {UUIDProvider, useUUID} from './context/UUIDContext';
// import {initializeNotifications} from './utils/notificationService';

// function RootWithNotifications() {
//   const userId = useUUID();

//   useEffect(() => {
//     if (userId) initializeNotifications(userId);
//   }, [userId]);

//   return <MainApp />;
// }

// const App = () => (
//   <Auth0Provider
//     domain="dev-xeaol4s5b2zd7wuz.us.auth0.com"
//     clientId="0VpKzuZyGjkmAMNmEYXNRQQbdysFkLz5">
//     <QueryClientProvider client={queryClient}>
//       <ThemeProvider>
//         <UUIDProvider>
//           <RootWithNotifications />
//         </UUIDProvider>
//       </ThemeProvider>
//     </QueryClientProvider>
//   </Auth0Provider>
// );

// export default App;

////////////////

// import React from 'react';
// import {QueryClientProvider} from '@tanstack/react-query';
// import {queryClient} from './lib/queryClient';
// import {ThemeProvider} from './context/ThemeContext';
// import MainApp from './MainApp';

// import {Auth0Provider} from 'react-native-auth0';
// import {UUIDProvider} from './context/UUIDContext'; // ✅ import this
// import {initializeNotifications} from './utils/notificationService';

// initializeNotifications();

// const App = () => (
//   <Auth0Provider
//     domain="dev-xeaol4s5b2zd7wuz.us.auth0.com"
//     clientId="0VpKzuZyGjkmAMNmEYXNRQQbdysFkLz5">
//     <QueryClientProvider client={queryClient}>
//       <ThemeProvider>
//         <UUIDProvider>
//           <MainApp />
//         </UUIDProvider>
//       </ThemeProvider>
//     </QueryClientProvider>
//   </Auth0Provider>
// );

// export default App;
