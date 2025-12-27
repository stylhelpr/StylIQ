import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config/api';
import {getAccessToken} from '../utils/auth';
import {queryClient} from './queryClient';

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Flag to prevent multiple simultaneous logout triggers
let isLoggingOut = false;

// Logout handler - clears auth state but preserves device-level analytics
const handleAuthExpired = async () => {
  if (isLoggingOut) return;
  isLoggingOut = true;

  try {
    // Clear AsyncStorage auth keys
    await AsyncStorage.multiRemove([
      'auth_logged_in',
      'user_id',
      'onboarding_complete',
      'style_profile',
    ]);

    // Clear React Query cache
    queryClient.clear();

    // NOTE: We intentionally do NOT clear shopping-store here
    // Shopping analytics (browsing history, product interactions, etc.)
    // are device-level behavior data that should persist across logout/login
    // The resetForLogout() function in shoppingStore handles clearing
    // only user-specific data (bookmarks, collections, etc.)

    // Clear measurement store (body measurements are user-specific)
    await AsyncStorage.removeItem('measurement-store');
  } catch (e) {
    console.error('Error during auth cleanup:', e);
  } finally {
    isLoggingOut = false;
  }
};

// Request interceptor - automatically add auth token
apiClient.interceptors.request.use(
  async config => {
    try {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // No token available, continue without auth header
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor - handle 401 errors
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      console.warn('Token expired or invalid - triggering logout');
      console.warn('401 from URL:', error.config?.url);
      await handleAuthExpired();

      // Emit event for UI to handle navigation to login
      // This allows the RootNavigator to respond
      if (global.__onAuthExpired) {
        global.__onAuthExpired();
      }
    }
    return Promise.reject(error);
  },
);

// Type declaration for global auth expired callback
declare global {
  var __onAuthExpired: (() => void) | undefined;
}

export default apiClient;
