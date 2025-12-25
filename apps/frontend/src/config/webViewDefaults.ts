/**
 * Secure WebView Configuration Defaults
 *
 * This module provides security-hardened defaults for all WebView instances.
 * ALL WebViews in the app MUST import and apply these defaults.
 *
 * @security This is a security-critical file. Changes require security review.
 */

import {WebViewProps} from 'react-native-webview';
import {Linking, Alert} from 'react-native';

/**
 * Secure defaults for all WebView instances.
 * Spread these defaults first, then override only what's necessary.
 */
export const SECURE_WEBVIEW_DEFAULTS: Partial<WebViewProps> = {
  // === SCHEME & ORIGIN RESTRICTIONS ===
  // Only allow HTTPS by default - override with care
  originWhitelist: ['https://*'],

  // === JAVASCRIPT & STORAGE ===
  javaScriptEnabled: true,
  domStorageEnabled: true,
  javaScriptCanOpenWindowsAutomatically: false,

  // === COOKIES & PRIVACY ===
  // Don't share cookies with Safari - isolate our browser
  sharedCookiesEnabled: false,
  // Block third-party cookies for privacy
  thirdPartyCookiesEnabled: false,
  // Set true for private mode if needed
  incognito: false,

  // === MEDIA ===
  // Require user action for media to prevent audio/video autoplay abuse
  mediaPlaybackRequiresUserAction: true,
  allowsInlineMediaPlayback: true,

  // === FILE ACCESS (all disabled for security) ===
  allowFileAccess: false,
  allowFileAccessFromFileURLs: false,
  allowUniversalAccessFromFileURLs: false,

  // === CACHING ===
  cacheEnabled: true,

  // === SECURITY CALLBACKS ===
  onError: syntheticEvent => {
    console.error('[WebView] Error:', syntheticEvent.nativeEvent);
  },

  onHttpError: syntheticEvent => {
    const {statusCode, url} = syntheticEvent.nativeEvent;
    console.warn(`[WebView] HTTP ${statusCode} for ${url}`);
  },
};

/**
 * Options for URL request handler
 */
export type OnShouldStartLoadOptions = {
  /** Allow HTTP URLs (default: true for compatibility, but logs warning) */
  allowHttp?: boolean;
  /** Callback when an external link is opened */
  onExternalLink?: (url: string) => void;
  /** Custom WebView ref for reload on crash */
  webRef?: React.RefObject<any>;
};

/**
 * Creates a secure onShouldStartLoadWithRequest handler.
 * This function gates all URL navigation in the WebView.
 *
 * Blocked schemes: javascript:, data:, blob:, file:, vbscript:, ftp:
 * Allowed schemes: https:, http: (with warning), about:
 * External schemes: tel:, mailto:, sms:, facetime:, maps: (opened via Linking)
 * App Store: itms:, itms-apps: (with user confirmation)
 */
export const createOnShouldStartLoadWithRequest = (
  options: OnShouldStartLoadOptions = {},
) => {
  const {allowHttp = true, onExternalLink} = options;

  return (request: {url: string; navigationType?: string}): boolean => {
    const url = request.url.toLowerCase();
    const originalUrl = request.url;

    // === HTTPS - always allow ===
    if (url.startsWith('https://')) {
      return true;
    }

    // === HTTP - allow with warning (many fashion sites still use HTTP) ===
    if (url.startsWith('http://')) {
      if (allowHttp) {
        // Block localhost/internal IPs even for HTTP
        if (
          url.includes('localhost') ||
          url.includes('127.0.0.1') ||
          url.match(/http:\/\/10\./) ||
          url.match(/http:\/\/192\.168\./) ||
          url.match(/http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
          url.match(/http:\/\/169\.254\./)
        ) {
          console.log('[SECURITY] Blocked internal HTTP URL:', url);
          return false;
        }
        console.warn('[SECURITY] HTTP URL allowed but not recommended:', url);
        return true;
      }
      console.log('[SECURITY] HTTP blocked:', url);
      return false;
    }

    // === about: - allow for blank pages ===
    if (url.startsWith('about:') || url === 'about:blank') {
      return true;
    }

    // === External app schemes - open natively via Linking ===
    const externalSchemes = [
      'tel:',
      'mailto:',
      'sms:',
      'facetime:',
      'facetime-audio:',
      'maps:',
      'comgooglemaps:',
      'waze:',
    ];

    for (const scheme of externalSchemes) {
      if (url.startsWith(scheme)) {
        Linking.canOpenURL(originalUrl)
          .then(supported => {
            if (supported) {
              Linking.openURL(originalUrl);
              onExternalLink?.(originalUrl);
            } else {
              console.warn('[WebView] Cannot open URL:', originalUrl);
            }
          })
          .catch(err => {
            console.error('[WebView] Error opening URL:', err);
          });
        return false; // Don't load in WebView
      }
    }

    // === App Store links - require user confirmation ===
    if (
      url.startsWith('itms:') ||
      url.startsWith('itms-apps:') ||
      url.startsWith('itms-appss:') ||
      url.includes('apps.apple.com')
    ) {
      Alert.alert(
        'Open App Store?',
        'This page wants to open the App Store.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Open',
            onPress: () => {
              Linking.openURL(originalUrl);
              onExternalLink?.(originalUrl);
            },
          },
        ],
        {cancelable: true},
      );
      return false;
    }

    // === BLOCK dangerous schemes ===
    // javascript:, data:, blob:, file:, vbscript:, ftp:, etc.
    const dangerousSchemes = [
      'javascript:',
      'data:',
      'blob:',
      'file:',
      'vbscript:',
      'ftp:',
      'ws:',
      'wss:',
    ];

    for (const scheme of dangerousSchemes) {
      if (url.startsWith(scheme)) {
        console.log(`[SECURITY] Blocked dangerous scheme "${scheme}":`, url);
        return false;
      }
    }

    // === Block any other unknown schemes ===
    console.log('[SECURITY] Blocked unknown URL scheme:', url);
    return false;
  };
};

/**
 * Creates an onContentProcessDidTerminate handler for crash recovery.
 * Call webRef.current?.reload() when the WebView process crashes.
 */
export const createCrashRecoveryHandler = (
  webRef: React.RefObject<any>,
  onCrash?: () => void,
) => {
  return () => {
    console.warn('[WebView] Content process terminated, attempting reload...');
    onCrash?.();
    // Small delay to prevent rapid crash loops
    setTimeout(() => {
      webRef.current?.reload();
    }, 100);
  };
};

/**
 * Secure defaults specifically for TTS/Audio WebViews that load local HTML.
 * These have stricter origin restrictions since they don't navigate externally.
 *
 * TTS WebViews load HTML content locally but fetch audio from the API backend.
 * We restrict navigation to HTTPS only (blocks javascript:, data:, etc).
 */
export const TTS_WEBVIEW_DEFAULTS: Partial<WebViewProps> = {
  // === SCHEME RESTRICTIONS ===
  // Allow HTTPS for audio fetching from API, block dangerous schemes
  originWhitelist: ['https://*'],

  // === JAVASCRIPT & STORAGE ===
  javaScriptEnabled: true,
  // TTS needs media playback without user action
  mediaPlaybackRequiresUserAction: false,
  allowsInlineMediaPlayback: true,
  // Disable storage for TTS - not needed
  domStorageEnabled: false,

  // === COOKIES & PRIVACY ===
  sharedCookiesEnabled: false,
  thirdPartyCookiesEnabled: false,

  // === FILE ACCESS (all disabled) ===
  allowFileAccess: false,
  allowFileAccessFromFileURLs: false,
  allowUniversalAccessFromFileURLs: false,

  // === CACHING ===
  cacheEnabled: false, // TTS audio doesn't need caching

  // === WINDOW OPENING ===
  javaScriptCanOpenWindowsAutomatically: false,
};

/**
 * Creates a strict onShouldStartLoadWithRequest handler for TTS WebViews.
 * Only allows navigation to the known API backend for audio loading.
 */
export const createTtsUrlHandler = (apiBaseUrl: string) => {
  return (request: {url: string}): boolean => {
    const url = request.url.toLowerCase();

    // Allow about: for local HTML
    if (url.startsWith('about:') || url === 'about:blank') {
      return true;
    }

    // Allow API backend URL for audio fetching
    if (url.startsWith(apiBaseUrl.toLowerCase())) {
      return true;
    }

    // In dev mode, also allow local URLs
    if (__DEV__ && (url.startsWith('http://localhost') || url.startsWith('http://10.') || url.startsWith('http://192.168.'))) {
      return true;
    }

    // Block everything else
    console.log('[TTS SECURITY] Blocked non-API URL:', url);
    return false;
  };
};
