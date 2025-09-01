import {Platform} from 'react-native';
import {LOCAL_IP} from './localIP';
import {PORT} from './port';

export const API_BASE_URL =
  Platform.OS === 'android'
    ? `http://10.0.2.2:${PORT}/api`
    : `http://${LOCAL_IP}:${PORT}/api`;
