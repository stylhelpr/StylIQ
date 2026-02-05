import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {createUserScopedZustandStorage} from './userScopedZustandStorage';

export type PriceAlert = {
  id: number;
  url: string;
  title: string;
  currentPrice: number;
  targetPrice?: number;
  brand?: string;
  source: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  priceHistory?: {id: number; price: number; recordedAt: string}[];
};

type PriceAlertState = {
  alerts: PriceAlert[];
  loading: boolean;
  error: string | null;

  // Local actions
  setAlerts: (alerts: PriceAlert[]) => void;
  addAlert: (alert: PriceAlert) => void;
  updateAlert: (id: number, update: Partial<PriceAlert>) => void;
  removeAlert: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Computed
  getAlertsBySource: (source: string) => PriceAlert[];
  getAlertsWithPriceDrop: () => PriceAlert[];
  getPriceChangePercent: (alertId: number) => number | null;
  hasActiveAlerts: () => boolean;

  // Logout - clears in-memory state for multi-account support
  resetForLogout: () => void;

  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const usePriceAlertStore = create<PriceAlertState>()(
  persist(
    (set, get) => ({
      alerts: [],
      loading: false,
      error: null,

      setAlerts: (alerts: PriceAlert[]) => set({alerts}),

      addAlert: (alert: PriceAlert) => {
        set(state => ({
          alerts: [alert, ...state.alerts],
        }));
      },

      updateAlert: (id: number, update: Partial<PriceAlert>) => {
        set(state => ({
          alerts: state.alerts.map(a => (a.id === id ? {...a, ...update} : a)),
        }));
      },

      removeAlert: (id: number) => {
        set(state => ({
          alerts: state.alerts.filter(a => a.id !== id),
        }));
      },

      setLoading: (loading: boolean) => set({loading}),
      setError: (error: string | null) => set({error}),
      clearError: () => set({error: null}),

      getAlertsBySource: (source: string) => {
        return get().alerts.filter(a => a.source === source && a.enabled);
      },

      getAlertsWithPriceDrop: () => {
        return get().alerts.filter(
          a =>
            a.enabled &&
            a.targetPrice &&
            a.currentPrice <= a.targetPrice &&
            a.priceHistory &&
            a.priceHistory.length > 1,
        );
      },

      getPriceChangePercent: (alertId: number) => {
        const alert = get().alerts.find(a => a.id === alertId);
        if (!alert || !alert.priceHistory || alert.priceHistory.length < 2)
          return null;

        const oldest = alert.priceHistory[alert.priceHistory.length - 1];
        const newest = alert.priceHistory[0];

        const change = ((newest.price - oldest.price) / oldest.price) * 100;
        return Math.round(change * 10) / 10;
      },

      hasActiveAlerts: () => {
        return get().alerts.some(a => a.enabled && a.targetPrice);
      },

      // MULTI-ACCOUNT: Reset in-memory state on logout
      resetForLogout: () => {
        set({
          alerts: [],
          loading: false,
          error: null,
          _hasHydrated: false,
        });
      },

      _hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) =>
        set({_hasHydrated: hasHydrated}),
    }),
    {
      name: 'price-alert-store',
      // Use user-scoped storage adapter for multi-account support
      storage: createJSONStorage(() => createUserScopedZustandStorage('price-alert-store')),
      // MULTI-ACCOUNT: Skip auto-hydration on store creation
      // We manually trigger rehydration after active user is set in UUIDContext
      skipHydration: true,
      version: 1,
      partialize: state => ({
        alerts: state.alerts,
      }),
      // MULTI-ACCOUNT: Use a merge function that completely replaces persisted state
      merge: (persistedState, currentState) => {
        // CRITICAL: When switching users, we need to COMPLETELY replace the state
        // If persistedState is null/empty (new user), we MUST clear existing data
        if (persistedState && typeof persistedState === 'object' && Object.keys(persistedState as object).length > 0) {
          console.log('[PriceAlertStore] Merging persisted state');
          return {
            ...currentState,
            ...(persistedState as object),
          };
        }
        // No persisted state = new user or empty storage
        console.log('[PriceAlertStore] No persisted state - returning fresh state');
        return {
          ...currentState,
          alerts: [],
        };
      },
      onRehydrateStorage: () => state => {
        if (state) {
          console.log('[PriceAlertStore] Rehydration complete, alerts:', state.alerts?.length || 0);
          state.setHasHydrated(true);
        }
      },
    },
  ),
);

////////////////

// import {create} from 'zustand';
// import {persist, createJSONStorage} from 'zustand/middleware';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export type PriceAlert = {
//   id: number;
//   url: string;
//   title: string;
//   currentPrice: number;
//   targetPrice?: number;
//   brand?: string;
//   source: string;
//   enabled: boolean;
//   createdAt: string;
//   updatedAt: string;
//   priceHistory?: {id: number; price: number; recordedAt: string}[];
// };

// type PriceAlertState = {
//   alerts: PriceAlert[];
//   loading: boolean;
//   error: string | null;

//   // Local actions
//   setAlerts: (alerts: PriceAlert[]) => void;
//   addAlert: (alert: PriceAlert) => void;
//   updateAlert: (id: number, update: Partial<PriceAlert>) => void;
//   removeAlert: (id: number) => void;
//   setLoading: (loading: boolean) => void;
//   setError: (error: string | null) => void;
//   clearError: () => void;

//   // Computed
//   getAlertsBySource: (source: string) => PriceAlert[];
//   getAlertsWithPriceDrop: () => PriceAlert[];
//   getPriceChangePercent: (alertId: number) => number | null;
//   hasActiveAlerts: () => boolean;

//   // Hydration
//   _hasHydrated: boolean;
//   setHasHydrated: (hasHydrated: boolean) => void;
// };

// export const usePriceAlertStore = create<PriceAlertState>()(
//   persist(
//     (set, get) => ({
//       alerts: [],
//       loading: false,
//       error: null,

//       setAlerts: (alerts: PriceAlert[]) => set({alerts}),

//       addAlert: (alert: PriceAlert) => {
//         set(state => ({
//           alerts: [alert, ...state.alerts],
//         }));
//       },

//       updateAlert: (id: number, update: Partial<PriceAlert>) => {
//         set(state => ({
//           alerts: state.alerts.map(a => (a.id === id ? {...a, ...update} : a)),
//         }));
//       },

//       removeAlert: (id: number) => {
//         set(state => ({
//           alerts: state.alerts.filter(a => a.id !== id),
//         }));
//       },

//       setLoading: (loading: boolean) => set({loading}),
//       setError: (error: string | null) => set({error}),
//       clearError: () => set({error: null}),

//       getAlertsBySource: (source: string) => {
//         return get().alerts.filter(a => a.source === source && a.enabled);
//       },

//       getAlertsWithPriceDrop: () => {
//         return get().alerts.filter(
//           a =>
//             a.enabled &&
//             a.targetPrice &&
//             a.currentPrice <= a.targetPrice &&
//             a.priceHistory &&
//             a.priceHistory.length > 1,
//         );
//       },

//       getPriceChangePercent: (alertId: number) => {
//         const alert = get().alerts.find(a => a.id === alertId);
//         if (!alert || !alert.priceHistory || alert.priceHistory.length < 2)
//           return null;

//         const oldest = alert.priceHistory[alert.priceHistory.length - 1];
//         const newest = alert.priceHistory[0];

//         const change = ((newest.price - oldest.price) / oldest.price) * 100;
//         return Math.round(change * 10) / 10;
//       },

//       hasActiveAlerts: () => {
//         return get().alerts.some(a => a.enabled && a.targetPrice);
//       },

//       _hasHydrated: false,
//       setHasHydrated: (hasHydrated: boolean) =>
//         set({_hasHydrated: hasHydrated}),
//     }),
//     {
//       name: 'price-alert-store',
//       storage: createJSONStorage(() => AsyncStorage),
//       version: 1,
//       partialize: state => ({
//         alerts: state.alerts,
//       }),
//       onRehydrateStorage: () => state => {
//         if (state) {
//           state.setHasHydrated(true);
//         }
//       },
//     },
//   ),
// );
