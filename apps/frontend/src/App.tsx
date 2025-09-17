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
