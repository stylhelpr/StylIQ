// hooks/useHomePrefs.ts
// MULTI-ACCOUNT: Home preferences are user-scoped

import {useEffect, useState, useCallback, useRef} from 'react';
import {UserScopedStorage} from '../storage/userScopedStorage';

export type HomePrefs = {
  weather: boolean;
  locationMap: boolean;
  aiSuggestions: boolean;
  quickAccess: boolean;
  topFashionStories: boolean;
  recommendedItems: boolean;
  inspiredLooks: boolean;
  locationEnabled: boolean;
};

const KEY = 'home_prefs_v1';

const DEFAULT_PREFS: HomePrefs = {
  weather: true,
  locationMap: true,
  aiSuggestions: true,
  quickAccess: false,
  topFashionStories: true,
  recommendedItems: true,
  inspiredLooks: true,
  locationEnabled: false,
};

/**
 * User-scoped home preferences hook
 * @param userId - The current user's ID (required for user-scoped storage)
 */
export function useHomePrefs(userId: string | null) {
  const [prefs, setPrefs] = useState<HomePrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Helper to load prefs from user-scoped storage
  const loadPrefs = useCallback(async () => {
    if (!userId) {
      setPrefs(DEFAULT_PREFS);
      setReady(true);
      return;
    }

    try {
      const json = await UserScopedStorage.getItem(userId, KEY);
      const parsed = json ? JSON.parse(json) : {};
      const merged = {...DEFAULT_PREFS, ...parsed};
      setPrefs(merged);
    } catch (err) {
      console.warn('[useHomePrefs] Failed to load prefs:', err);
    } finally {
      setReady(true);
    }
  }, [userId]);

  // Reload when userId changes
  useEffect(() => {
    if (currentUserIdRef.current !== userId) {
      currentUserIdRef.current = userId;
      setReady(false);
      loadPrefs();
    }
  }, [userId, loadPrefs]);

  // Update and persist instantly (user-scoped)
  const setVisible = useCallback(async (key: keyof HomePrefs, value: boolean) => {
    if (!userId) {
      console.warn('[useHomePrefs] Cannot save prefs without userId');
      return;
    }

    const next = {...prefs, [key]: value};
    setPrefs(next);
    try {
      await UserScopedStorage.setItem(userId, KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('[useHomePrefs] Failed to save prefs:', err);
    }
  }, [userId, prefs]);

  return {prefs, ready, setVisible, reloadPrefs: loadPrefs};
}

////////////////

// import {useEffect, useState} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export type HomePrefs = {
//   weather: boolean;
//   locationMap: boolean;
//   aiSuggestions: boolean;
//   quickAccess: boolean;
//   topFashionStories: boolean;
//   recommendedItems: boolean;
//   inspiredLooks: boolean; // 👈 NEW
//   locationEnabled: boolean; // ✅ NEW
// };

// const KEY = 'home_prefs_v1';

// const DEFAULT_PREFS: HomePrefs = {
//   weather: true,
//   locationMap: true,
//   aiSuggestions: true,
//   quickAccess: false,
//   topFashionStories: true,
//   recommendedItems: true,
//   inspiredLooks: true, // 👈 NEW default ON
//   locationEnabled: true, // ✅ NEW default ON
// };

// export function useHomePrefs() {
//   const [prefs, setPrefs] = useState<HomePrefs>(DEFAULT_PREFS);
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         const json = await AsyncStorage.getItem(KEY);
//         if (json && mounted) {
//           const parsed = JSON.parse(json);
//           setPrefs({...DEFAULT_PREFS, ...parsed});
//         }
//       } catch {
//         // noop
//       } finally {
//         if (mounted) setReady(true);
//       }
//     })();
//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const setVisible = (key: keyof HomePrefs, value: boolean) => {
//     const next = {...prefs, [key]: value};
//     setPrefs(next);
//     AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
//   };

//   return {prefs, ready, setVisible};
// }

/////////////////////

// import {useEffect, useState} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export type HomePrefs = {
//   weather: boolean;
//   locationMap: boolean;
//   aiSuggestions: boolean;
//   quickAccess: boolean;
//   topFashionStories: boolean;
//   recommendedItems: boolean;
//   inspiredLooks: boolean; // 👈 NEW
// };

// const KEY = 'home_prefs_v1';

// const DEFAULT_PREFS: HomePrefs = {
//   weather: true,
//   locationMap: true,
//   aiSuggestions: true,
//   quickAccess: false,
//   topFashionStories: true,
//   recommendedItems: true,
//   inspiredLooks: true, // 👈 NEW default ON
// };

// export function useHomePrefs() {
//   const [prefs, setPrefs] = useState<HomePrefs>(DEFAULT_PREFS);
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         const json = await AsyncStorage.getItem(KEY);
//         if (json && mounted) {
//           const parsed = JSON.parse(json);
//           setPrefs({...DEFAULT_PREFS, ...parsed});
//         }
//       } catch {
//         // noop
//       } finally {
//         if (mounted) setReady(true);
//       }
//     })();
//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const setVisible = (key: keyof HomePrefs, value: boolean) => {
//     const next = {...prefs, [key]: value};
//     setPrefs(next);
//     AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
//   };

//   return {prefs, ready, setVisible};
// }

///////////////////

// import {useEffect, useState} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export type HomePrefs = {
//   weather: boolean;
//   locationMap: boolean;
//   aiSuggestions: boolean;
//   quickAccess: boolean;
//   topFashionStories: boolean;
//   recommendedItems: boolean;
//   savedLooks: boolean;
// };

// const KEY = 'home_prefs_v1';
// const DEFAULT_PREFS: HomePrefs = {
//   weather: true,
//   locationMap: true,
//   aiSuggestions: true,
//   quickAccess: false,
//   topFashionStories: true,
//   recommendedItems: true,
//   savedLooks: true,
// };

// export function useHomePrefs() {
//   const [prefs, setPrefs] = useState<HomePrefs>(DEFAULT_PREFS);
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         const json = await AsyncStorage.getItem(KEY);
//         if (json && mounted) {
//           const parsed = JSON.parse(json);
//           setPrefs({...DEFAULT_PREFS, ...parsed});
//         }
//       } catch {
//         // noop
//       } finally {
//         if (mounted) setReady(true);
//       }
//     })();
//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const setVisible = (key: keyof HomePrefs, value: boolean) => {
//     const next = {...prefs, [key]: value};
//     setPrefs(next);
//     AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
//   };

//   return {prefs, ready, setVisible};
// }

/////////////////////

// import {useEffect, useState} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export type HomePrefs = {
//   weather: boolean;
//   locationMap: boolean;
//   quickAccess: boolean;
//   topFashionStories: boolean;
//   recommendedItems: boolean;
//   savedLooks: boolean;
// };

// const KEY = 'home_prefs_v1';
// const DEFAULT_PREFS: HomePrefs = {
//   weather: true,
//   locationMap: true,
//   quickAccess: true,
//   topFashionStories: true,
//   recommendedItems: true,
//   savedLooks: true,
// };

// export function useHomePrefs() {
//   const [prefs, setPrefs] = useState<HomePrefs>(DEFAULT_PREFS);
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         const json = await AsyncStorage.getItem(KEY);
//         if (json && mounted) {
//           const parsed = JSON.parse(json);
//           setPrefs({...DEFAULT_PREFS, ...parsed});
//         }
//       } catch {
//         // noop
//       } finally {
//         if (mounted) setReady(true);
//       }
//     })();
//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const setVisible = (key: keyof HomePrefs, value: boolean) => {
//     const next = {...prefs, [key]: value};
//     setPrefs(next);
//     AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
//   };

//   return {prefs, ready, setVisible};
// }
