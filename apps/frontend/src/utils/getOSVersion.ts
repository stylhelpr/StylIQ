// src/utils/isIOS26.ts
import {Platform} from 'react-native';

export const isIOS26 = () => {
  if (Platform.OS !== 'ios') return false;
  const version = parseFloat(String(Platform.Version));
  return version >= 26; // ✅ true for iOS 26+
};
