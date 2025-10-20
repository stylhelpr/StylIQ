import {Platform} from 'react-native';
import {LOCAL_IP} from './localIP';
import {PORT} from './port';

const PROD_URL = 'https://backend-161054336483.us-central1.run.app/api';

export const API_BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? `http://10.0.2.2:${PORT}/api`
    : `http://${LOCAL_IP}:${PORT}/api`
  : PROD_URL;

/**
 * 🔊 Global TTS toggle
 * true  → use OpenAI Alloy / remote backend voice
 * false → use local on-device TTS (no network calls, free)
 */
export const ENABLE_REMOTE_TTS = true; // <-- flip this anytime

///////////////////////

// import {Platform} from 'react-native';
// import {LOCAL_IP} from './localIP';
// import {PORT} from './port';

// const PROD_URL = 'https://backend-161054336483.us-central1.run.app/api';

// export const API_BASE_URL = __DEV__
//   ? Platform.OS === 'android'
//     ? `http://10.0.2.2:${PORT}/api`
//     : `http://${LOCAL_IP}:${PORT}/api`
//   : PROD_URL;
