import {useState, useEffect, useCallback, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '../constants/storage';

export function useBrowserOnboarding() {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasChecked = useRef(false);
  const isDismissing = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem(
          STORAGE_KEYS.HAS_SEEN_BROWSER_ONBOARDING,
        );
        if (value !== 'true') {
          setShowModal(true);
        }
      } catch {
        // On error, do not show modal (fail closed)
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const dismissModal = useCallback(async () => {
    if (isDismissing.current) return;
    isDismissing.current = true;

    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.HAS_SEEN_BROWSER_ONBOARDING,
        'true',
      );
      setShowModal(false);
    } catch {
      // Persist failed, still dismiss UI but will show again next time
      setShowModal(false);
    }
  }, []);

  return {showModal, isLoading, dismissModal};
}
