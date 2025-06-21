import React from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './lib/queryClient';
import {ThemeProvider} from './context/ThemeContext';
import MainApp from './MainApp';

import {Auth0Provider} from 'react-native-auth0';
import {UUIDProvider} from './context/UUIDContext'; // ✅ import this
import {initializeNotifications} from './utils/notificationService';

initializeNotifications();

const App = () => (
  <Auth0Provider
    domain="dev-xeaol4s5b2zd7wuz.us.auth0.com"
    clientId="0VpKzuZyGjkmAMNmEYXNRQQbdysFkLz5">
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UUIDProvider>
          <MainApp />
        </UUIDProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </Auth0Provider>
);

export default App;
