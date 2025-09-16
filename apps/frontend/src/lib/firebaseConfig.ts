// lib/firebaseConfig.ts
import {getApp, getApps} from '@react-native-firebase/app';

// Just importing this file ensures native config is auto-loaded.
// No need to call initializeApp()
// We only use getApp() if needed elsewhere, but not here.
if (!getApps().length) {
  // No need to call initializeApp() manually — it uses native plist/json
  console.log('🔥 Firebase initialized via native config');
}
