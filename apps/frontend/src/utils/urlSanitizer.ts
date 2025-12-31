/**
 * URL Sanitization for Analytics
 *
 * Strips sensitive query parameters from URLs before storage or transmission.
 * Prevents accidental PII leakage through URL parameters.
 *
 * @security This is a security-critical file. Changes require security review.
 */

/**
 * List of query parameter names that may contain sensitive data.
 * These are stripped from URLs before analytics storage.
 */
const SENSITIVE_PARAMS = [
  // Authentication & Sessions
  'token',
  'auth',
  'auth_token',
  'access_token',
  'refresh_token',
  'id_token',
  'bearer',
  'jwt',
  'session',
  'sessionid',
  'session_id',
  'sid',
  'ssid',

  // API Keys & Secrets
  'key',
  'apikey',
  'api_key',
  'secret',
  'password',
  'pwd',
  'pass',
  'credential',
  'credentials',

  // OAuth & SSO
  'code',
  'state',
  'nonce',
  'verifier',
  'challenge',
  'redirect_uri',
  'callback',

  // Personal Identifiable Information
  'email',
  'e-mail',
  'mail',
  'phone',
  'tel',
  'mobile',
  'user',
  'username',
  'user_name',
  'userid',
  'user_id',
  'uid',
  'name',
  'firstname',
  'first_name',
  'lastname',
  'last_name',
  'fullname',
  'full_name',
  'address',
  'street',
  'city',
  'zip',
  'zipcode',
  'postal',
  'ssn',
  'social',
  'dob',
  'birthdate',
  'birth_date',

  // Payment Information
  'credit',
  'card',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'ccv',
  'expiry',
  'exp',
  'account',
  'accountnumber',
  'account_number',
  'routing',
  'bank',
  'iban',
  'swift',

  // Tracking IDs that could be used to identify users
  'fbclid',
  'gclid',
  'msclkid',
  'utm_id',
  'click_id',
  'ref',
  'referrer',
  'affiliate',
  'aff_id',
];

/**
 * Creates a Set for O(1) lookup of sensitive params (case-insensitive).
 */
const SENSITIVE_PARAMS_SET = new Set(
  SENSITIVE_PARAMS.map(p => p.toLowerCase()),
);

/**
 * Sanitizes a URL for analytics storage by removing sensitive query parameters.
 *
 * @param url - The URL to sanitize
 * @returns Sanitized URL without sensitive parameters
 *
 * @example
 * sanitizeUrlForAnalytics('https://shop.com/order?email=user@test.com&product=123')
 * // Returns: 'https://shop.com/order?product=123'
 */
export function sanitizeUrlForAnalytics(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);

    // Get all param names that need to be deleted
    const paramsToDelete: string[] = [];

    parsed.searchParams.forEach((_, key) => {
      if (SENSITIVE_PARAMS_SET.has(key.toLowerCase())) {
        paramsToDelete.push(key);
      }
    });

    // Delete sensitive params
    paramsToDelete.forEach(param => {
      parsed.searchParams.delete(param);
    });

    // Also strip hash/fragment as it may contain sensitive data
    parsed.hash = '';

    return parsed.toString();
  } catch {
    // If URL parsing fails, try to at least return the origin + path
    try {
      const match = url.match(/^(https?:\/\/[^?#]+)/i);
      if (match && match[1]) {
        return match[1];
      }
    } catch {
      // Ignore
    }

    // Last resort: return just the origin if we can extract it
    const originMatch = url.match(/^(https?:\/\/[^/?#]+)/i);
    return originMatch ? originMatch[1] : url;
  }
}

/**
 * Extracts just the origin from a URL (protocol + host).
 * Safe fallback when full URL is too sensitive to store.
 *
 * @param url - The URL to extract origin from
 * @returns Origin (e.g., 'https://example.com') or empty string
 */
export function extractOrigin(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    const match = url.match(/^(https?:\/\/[^/?#]+)/i);
    return match ? match[1] : '';
  }
}

/**
 * Checks if a URL contains any known sensitive parameters.
 *
 * @param url - The URL to check
 * @returns true if URL contains sensitive params
 */
export function hasSensitiveParams(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    let hasSensitive = false;

    parsed.searchParams.forEach((_, key) => {
      if (SENSITIVE_PARAMS_SET.has(key.toLowerCase())) {
        hasSensitive = true;
      }
    });

    return hasSensitive;
  } catch {
    return false;
  }
}

/**
 * Validates that a URL is safe for image downloading.
 * Blocks internal hosts, dangerous schemes, and validates structure.
 *
 * @param url - URL to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateImageUrl(url: string): {
  isValid: boolean;
  error?: string;
} {
  if (!url || typeof url !== 'string') {
    return {isValid: false, error: 'Invalid URL'};
  }

  const lowerUrl = url.toLowerCase();

  // Only allow http/https
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
    return {isValid: false, error: 'Only HTTP/HTTPS URLs allowed'};
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Block localhost
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return {isValid: false, error: 'Localhost URLs not allowed'};
    }

    // Block .local domains
    if (host.endsWith('.local')) {
      return {isValid: false, error: 'Local network URLs not allowed'};
    }

    // Block private IP ranges
    // 10.0.0.0/8
    if (/^10\./.test(host)) {
      return {isValid: false, error: 'Private IP range not allowed'};
    }
    // 172.16.0.0/12
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) {
      return {isValid: false, error: 'Private IP range not allowed'};
    }
    // 192.168.0.0/16
    if (/^192\.168\./.test(host)) {
      return {isValid: false, error: 'Private IP range not allowed'};
    }
    // 169.254.0.0/16 (link-local / cloud metadata)
    if (/^169\.254\./.test(host)) {
      return {isValid: false, error: 'Link-local IP range not allowed'};
    }

    return {isValid: true};
  } catch {
    return {isValid: false, error: 'Invalid URL format'};
  }
}

/**
 * Allowed URL schemes for deep-links.
 * Only these schemes can be opened via Linking.openURL from notifications.
 */
const ALLOWED_DEEPLINK_SCHEMES = ['https:', 'styliq:'];

/**
 * Allowed domains for https deep-links.
 * Prevents opening malicious external sites from push notifications.
 */
const ALLOWED_DEEPLINK_DOMAINS = [
  'stylhelpr.com',
  'www.stylhelpr.com',
  'styliq.app',
  'www.styliq.app',
  'backend-161054336483.us-central1.run.app', // Backend domain
];

/**
 * Validates a deep-link URL before opening.
 * Blocks dangerous schemes and untrusted domains to prevent phishing.
 *
 * @param url - The deep-link URL to validate
 * @returns true if the URL is safe to open
 *
 * @security This prevents malicious FCM payloads from redirecting users.
 */
export function isValidDeepLink(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return false;
  }

  try {
    // Check for dangerous schemes first (before URL parsing)
    const lowerUrl = trimmedUrl.toLowerCase();
    const dangerousSchemes = [
      'javascript:',
      'data:',
      'blob:',
      'file:',
      'vbscript:',
      'ftp:',
    ];
    for (const scheme of dangerousSchemes) {
      if (lowerUrl.startsWith(scheme)) {
        console.warn('[DeepLink] Blocked dangerous scheme:', scheme);
        return false;
      }
    }

    const parsed = new URL(trimmedUrl);
    const scheme = parsed.protocol.toLowerCase();

    // Check if scheme is allowed
    if (!ALLOWED_DEEPLINK_SCHEMES.includes(scheme)) {
      console.warn('[DeepLink] Blocked disallowed scheme:', scheme);
      return false;
    }

    // For styliq: scheme, allow all (internal app navigation)
    if (scheme === 'styliq:') {
      return true;
    }

    // For https: scheme, validate domain
    if (scheme === 'https:') {
      const host = parsed.hostname.toLowerCase();
      const isAllowed = ALLOWED_DEEPLINK_DOMAINS.some(
        domain => host === domain || host.endsWith('.' + domain),
      );
      if (!isAllowed) {
        console.warn('[DeepLink] Blocked untrusted domain:', host);
        return false;
      }
      return true;
    }

    return false;
  } catch {
    console.warn('[DeepLink] Failed to parse URL:', trimmedUrl);
    return false;
  }
}
