import {useEffect, useState, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  locationEnabled: true,
};

export function useHomePrefs() {
  const [prefs, setPrefs] = useState<HomePrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  // ✅ Helper to load prefs from storage
  const loadPrefs = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(KEY);
      const parsed = json ? JSON.parse(json) : {};
      const merged = {...DEFAULT_PREFS, ...parsed};
      setPrefs(merged);
      console.log('🔁 HomePrefs loaded:', merged);
    } catch (err) {
      console.warn('⚠️ Failed to load prefs', err);
    } finally {
      setReady(true);
    }
  }, []);

  // ✅ Run once on mount
  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  // ✅ Update and persist instantly
  const setVisible = async (key: keyof HomePrefs, value: boolean) => {
    const next = {...prefs, [key]: value};
    setPrefs(next);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      console.log(`💾 Updated pref: ${key} → ${value}`);
    } catch (err) {
      console.warn('⚠️ Failed to save prefs', err);
    }
  };

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
