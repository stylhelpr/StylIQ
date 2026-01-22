/**
 * useLogout Hook
 *
 * Centralized logout logic that:
 * - Clears in-memory Zustand stores
 * - Clears React Query cache
 * - Resets active user pointer
 * - DOES NOT clear persisted user data (stays for next login)
 * - DOES NOT call auth0.clearSession() (preserves Face ID)
 */
import {useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {clearActiveUser} from '../storage/activeUserManager';
import {queryClient} from '../lib/queryClient';
import {useMeasurementStore} from '../../../../store/measurementStore';
import {useCalendarEventPromptStore} from '../../../../store/calendarEventPromptStore';
import {useConnectedAccountsStore} from '../../../../store/connectedAccountsStore';
import {useCalendarEventsStore} from '../../../../store/calendarEventsStore';
import {useSetUUID} from '../context/UUIDContext';
import type {Screen} from '../navigation/types';

type LogoutOptions = {
  navigate: (screen: Screen) => void;
};

export function useLogout({navigate}: LogoutOptions) {
  const setUUID = useSetUUID();

  // Get store reset functions for NON-PERSISTED stores only
  // DO NOT reset Zustand persist stores (shoppingStore, priceAlertStore) -
  // calling set() triggers persist middleware which could write empty state to storage
  const resetMeasurements = useMeasurementStore(state => state.reset);
  const resetCalendarPrompts = useCalendarEventPromptStore(state => state.resetForLogout);
  const resetConnectedAccounts = useConnectedAccountsStore(state => state.reset);
  const clearCalendarEvents = useCalendarEventsStore(state => state.clearEvents);

  const logout = useCallback(async () => {
    try {
      console.log('[useLogout] Starting logout...');

      // CRITICAL: Clear active user pointer FIRST
      // This prevents any further writes to the user's storage
      await clearActiveUser();
      console.log('[useLogout] Active user cleared');

      // DO NOT call resetForLogout() on Zustand persist stores!
      // Even though active user is cleared, calling set() triggers persist middleware
      // which could race with the clearActiveUser() and write empty state to the old user's storage.
      // Instead, we leave stores in memory with stale data - they will be replaced on next login's rehydration.

      // Only reset non-persisted stores and React Query cache
      console.log('[useLogout] Resetting non-persisted stores...');
      resetMeasurements();
      resetConnectedAccounts();
      clearCalendarEvents();
      resetCalendarPrompts();
      console.log('[useLogout] Non-persisted stores reset');

      // 2. Clear React Query cache
      queryClient.clear();

      // 3. Clear session-related AsyncStorage keys (NOT user data)
      // NOTE: We intentionally do NOT call clearSession() here
      // This preserves Auth0 credentials in Keychain for Face ID login
      await AsyncStorage.multiRemove([
        'auth_logged_in',
        'user_id',
        'style_profile',
      ]);

      // 4. Reset UUID context
      setUUID(null);

      console.log('[useLogout] Logout complete');

      // 5. Navigate to Login
      navigate('Login');
    } catch (err) {
      console.error('[useLogout] Logout failed:', err);
      // Still try to navigate even if cleanup fails
      navigate('Login');
    }
  }, [
    navigate,
    setUUID,
    resetMeasurements,
    resetCalendarPrompts,
    resetConnectedAccounts,
    clearCalendarEvents,
  ]);

  return logout;
}

export default useLogout;
