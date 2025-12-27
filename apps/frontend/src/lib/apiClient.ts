import axios from 'axios';
import {API_BASE_URL} from '../config/api';
import {getAccessToken, getCredentials} from '../utils/auth';

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Flag to prevent multiple simultaneous token refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
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

// Response interceptor - refresh token on 401, NO auto-logout
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Only handle 401 errors and only retry once
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.warn('401 received from:', error.config?.url);

      // If already refreshing, wait for refresh to complete
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
          // Timeout after 10s to prevent hanging
          setTimeout(() => reject(error), 10000);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Auth0 credential manager will auto-refresh if token is expired
        const credentials = await getCredentials();
        const newToken = credentials.accessToken;

        if (newToken) {
          console.log('Token refreshed, retrying request');
          onRefreshed(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          isRefreshing = false;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - just log and reject, DO NOT logout
        console.warn('Token refresh failed:', refreshError);
        isRefreshing = false;
        refreshSubscribers = [];
        // Let Auth0 SDK handle session state - no forced logout here
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
