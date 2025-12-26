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

  // Trigger 1: App goes to background or inactive (iOS sends 'inactive' before 'background')
  useEffect(() => {
    console.log('[Analytics Hook] 🔧 Setting up background sync listener');
    const subscription = AppState.addEventListener('change', (state) => {
      console.log('[Analytics Hook] AppState changed to:', state, 'prev:', appStateRef.current);
      // Sync when app goes to background OR inactive (iOS behavior)
      if ((state === 'background' || state === 'inactive') && appStateRef.current === 'active') {
        console.log('[Analytics Hook] 📴 App backgrounded/inactive, starting sync...');
        // Get JWT token and call sync
        getCredentials()
          .then((creds) => {
            console.log('[Analytics Hook] ✅ Got credentials, calling sync');
            AnalyticsSyncService.syncEvents(creds?.accessToken || '', 'accepted');
          })
          .catch((err) => {
            console.error('[Analytics Hook] ❌ Failed to get credentials:', err);
          });
      }
      appStateRef.current = state;
    });

    return () => {
      console.log('[Analytics Hook] 🗑️ Cleaning up background sync listener');
      subscription.remove();
    };
  }, [user, getCredentials]);

  // Trigger 2: Periodic timer (15 minutes)
  useEffect(() => {
    console.log('[Analytics Hook] ⏰ Setting up 15-min timer sync');
    const interval = setInterval(() => {
      console.log('[Analytics Hook] ⏰ 15-min sync timer fired');
      getCredentials()
        .then((creds) => {
          console.log('[Analytics Hook] ✅ Got credentials from timer, calling sync');
          AnalyticsSyncService.syncEvents(creds?.accessToken || '', 'accepted');
        })
        .catch((err) => {
          console.error('[Analytics Hook] ❌ Timer: Failed to get credentials:', err);
        });
    }, 15 * 60 * 1000);

    return () => {
      console.log('[Analytics Hook] 🗑️ Cleaning up 15-min timer');
      clearInterval(interval);
    };
  }, [getCredentials]);
}

// Usage in App.tsx:
// function App() {
//   useAnalyticsSyncTriggers();  // ✅ Hooks called in React component
//   return <MainApp />;
// }
