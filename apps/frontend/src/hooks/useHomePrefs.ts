import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type HomePrefs = {
  weather: boolean;
  locationMap: boolean;
  quickAccess: boolean;
  savedLooks: boolean;
};

const KEY = 'home_prefs_v1';
const DEFAULT_PREFS: HomePrefs = {
  weather: true,
  locationMap: true,
  quickAccess: true,
  savedLooks: true,
};

export function useHomePrefs() {
  const [prefs, setPrefs] = useState<HomePrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const json = await AsyncStorage.getItem(KEY);
        if (json && mounted) {
          const parsed = JSON.parse(json);
          setPrefs({...DEFAULT_PREFS, ...parsed});
        }
      } catch {
        // noop
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setVisible = (key: keyof HomePrefs, value: boolean) => {
    const next = {...prefs, [key]: value};
    setPrefs(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  return {prefs, ready, setVisible};
}
