// ✅ Hooks ONLY in React components

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { AnalyticsSyncService } from '../services/analyticsSyncService';

/**
 * React hook: Set up analytics sync triggers.
 *
 * Call once in main app component.
 */
export function useAnalyticsSyncTriggers() {
  const appStateRef = useRef<AppStateStatus>('active');
  const { user, getCredentials } = useAuth0(); // Get JWT token

  // Trigger 1: App goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && appStateRef.current !== 'background') {
        console.log('[Analytics] App backgrounded, syncing...');
        // Get JWT token and call sync
        getCredentials()
          .then((creds) => {
            AnalyticsSyncService.syncEvents(creds?.accessToken || '', 'accepted');
          })
          .catch((err) => {
            console.error('[Analytics] Failed to get credentials:', err);
          });
      }
      appStateRef.current = state;
    });

    return () => subscription.remove();
  }, [user, getCredentials]);

  // Trigger 2: Periodic timer (15 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[Analytics] 15-min sync timer fired');
      getCredentials()
        .then((creds) => {
          AnalyticsSyncService.syncEvents(creds?.accessToken || '', 'accepted');
        })
        .catch((err) => {
          console.error('[Analytics] Failed to get credentials:', err);
        });
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [getCredentials]);
}

// Usage in App.tsx:
// function App() {
//   useAnalyticsSyncTriggers();  // ✅ Hooks called in React component
//   return <MainApp />;
// }
