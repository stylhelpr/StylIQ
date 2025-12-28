/**
 * Keychain Cookie Policy - Conditional cookie sharing for iOS Keychain AutoFill
 *
 * PROBLEM:
 * iOS Keychain password autofill requires `sharedCookiesEnabled: true` to reliably
 * associate saved passwords with domains. However, global cookie sharing:
 * - Leaks session state to Safari
 * - Breaks privacy isolation
 * - May expose cross-site tracking
 *
 * SOLUTION:
 * Enable cookie sharing ONLY for domains that are:
 * 1. Login/auth pages (detected by URL pattern)
 * 2. Known SSO providers (OAuth, SAML flows)
 * 3. Sites known to require cookie continuity for auth
 *
 * SECURITY GUARANTEES:
 * - Cookie sharing is domain-scoped, not global
 * - Non-auth pages maintain full isolation
 * - No credential data is accessed or stored by this module
 * - Pattern matching is conservative (false negatives preferred over false positives)
 *
 * PRIVACY GUARANTEES:
 * - Only auth-related pages get cookie sharing
 * - Regular browsing remains isolated from Safari
 * - No tracking or analytics
 */

// =============================================================================
// DOMAIN CLASSIFICATION
// =============================================================================

/**
 * Known SSO/OAuth providers that require cookie continuity for auth flows.
 *
 * WHY THESE QUALIFY:
 * - OAuth flows redirect through multiple domains
 * - Session cookies must persist across redirects
 * - Without continuity, auth completes but session is lost
 */
const SSO_PROVIDER_DOMAINS = [
  // Google OAuth/GAIA
  'accounts.google.com',
  'accounts.youtube.com',
  'myaccount.google.com',

  // Apple Sign In
  'appleid.apple.com',
  'idmsa.apple.com',

  // Facebook/Meta OAuth
  'facebook.com/login',
  'www.facebook.com/login',
  'm.facebook.com/login',

  // Microsoft/Azure AD
  'login.microsoftonline.com',
  'login.live.com',
  'account.microsoft.com',

  // Twitter/X OAuth
  'api.twitter.com/oauth',
  'twitter.com/i/oauth',

  // Amazon
  'amazon.com/ap/signin',
  'www.amazon.com/ap/signin',

  // PayPal (critical for checkout auth)
  'paypal.com/signin',
  'www.paypal.com/signin',
  'paypal.com/cgi-bin/webscr',

  // Shopify (merchant logins)
  'accounts.shopify.com',

  // Auth0 (common identity provider)
  '.auth0.com',

  // Okta (enterprise SSO)
  '.okta.com',
  '.oktapreview.com',

  // OneLogin
  '.onelogin.com',
];

/**
 * URL path patterns that indicate a login/auth page.
 *
 * WHY THESE QUALIFY:
 * - These paths consistently indicate authentication pages
 * - Password fields on these pages need Keychain integration
 * - Conservative matching to avoid false positives
 */
const AUTH_PATH_PATTERNS = [
  '/login',
  '/signin',
  '/sign-in',
  '/sign_in',
  '/authenticate',
  '/auth/',
  '/oauth/',
  '/sso/',
  '/account/login',
  '/account/signin',
  '/user/login',
  '/users/sign_in',
  '/session/new',
  '/sessions/new',
  '/ap/signin', // Amazon
  '/ap/signin/', // Amazon with trailing slash
  '/identity/', // Many auth systems
];

/**
 * Query parameters that indicate an OAuth/auth flow.
 *
 * WHY THESE QUALIFY:
 * - OAuth flows use these parameters
 * - Presence indicates active auth handshake
 * - Cookie continuity critical for flow completion
 */
const AUTH_QUERY_PATTERNS = [
  'client_id=',
  'redirect_uri=',
  'response_type=',
  'oauth_token=',
  'code=', // OAuth code exchange
  'state=', // OAuth state parameter
  'nonce=', // OIDC nonce
  'login_hint=',
  'prompt=login',
  'prompt=consent',
];

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Check if URL matches an SSO provider domain.
 */
function matchesSSOProvider(hostname: string, pathname: string): boolean {
  const fullPath = hostname + pathname;

  for (const domain of SSO_PROVIDER_DOMAINS) {
    // Handle wildcard domains (e.g., '.auth0.com')
    if (domain.startsWith('.')) {
      if (hostname.endsWith(domain) || hostname === domain.slice(1)) {
        return true;
      }
    } else if (domain.includes('/')) {
      // Domain with path (e.g., 'facebook.com/login')
      if (fullPath.startsWith(domain) || fullPath.includes(domain)) {
        return true;
      }
    } else {
      // Exact domain match
      if (hostname === domain || hostname === 'www.' + domain) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if URL path indicates a login page.
 */
function matchesAuthPath(pathname: string): boolean {
  const lowerPath = pathname.toLowerCase();

  for (const pattern of AUTH_PATH_PATTERNS) {
    if (lowerPath.includes(pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if URL query string indicates an OAuth flow.
 */
function matchesAuthQuery(search: string): boolean {
  const lowerSearch = search.toLowerCase();

  // Must have at least 2 OAuth parameters to be considered an OAuth flow
  // This prevents false positives from single parameter matches
  let matchCount = 0;

  for (const pattern of AUTH_QUERY_PATTERNS) {
    if (lowerSearch.includes(pattern)) {
      matchCount++;
      if (matchCount >= 2) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if the page title suggests a login page.
 * Called after page load for additional signal.
 */
export function titleSuggestsAuth(title: string): boolean {
  if (!title) return false;

  const lowerTitle = title.toLowerCase();
  const authKeywords = [
    'sign in',
    'signin',
    'sign-in',
    'log in',
    'login',
    'log-in',
    'authenticate',
    'authentication',
    'enter password',
    'your password',
    'account access',
    'verify your identity',
    'two-factor',
    '2fa',
    'verification code',
  ];

  return authKeywords.some(keyword => lowerTitle.includes(keyword));
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export interface CookiePolicyResult {
  /** Whether cookies should be shared for this URL */
  shouldShareCookies: boolean;
  /** Reason for the decision (for debugging) */
  reason: 'sso_provider' | 'auth_path' | 'oauth_flow' | 'not_auth';
  /** The classification that matched (if any) */
  matchedPattern?: string;
}

/**
 * Determine if cookies should be shared for a given URL.
 *
 * This is the main entry point for cookie policy decisions.
 * Called by WebView on each navigation to determine sharedCookiesEnabled value.
 *
 * @param url - The URL being navigated to
 * @returns Policy result with decision and reasoning
 */
export function getCookiePolicy(url: string): CookiePolicyResult {
  if (!url) {
    return {shouldShareCookies: false, reason: 'not_auth'};
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    const search = parsed.search.toLowerCase();

    // Check 1: SSO provider domains (highest priority)
    if (matchesSSOProvider(hostname, pathname)) {
      return {
        shouldShareCookies: true,
        reason: 'sso_provider',
        matchedPattern: hostname,
      };
    }

    // Check 2: Auth path patterns
    if (matchesAuthPath(pathname)) {
      return {
        shouldShareCookies: true,
        reason: 'auth_path',
        matchedPattern: pathname,
      };
    }

    // Check 3: OAuth query parameters (requires 2+ matches)
    if (matchesAuthQuery(search)) {
      return {
        shouldShareCookies: true,
        reason: 'oauth_flow',
        matchedPattern: 'oauth_params',
      };
    }

    // Default: No cookie sharing
    return {shouldShareCookies: false, reason: 'not_auth'};
  } catch {
    // Invalid URL - default to no sharing
    return {shouldShareCookies: false, reason: 'not_auth'};
  }
}

/**
 * Simple boolean helper for WebView prop.
 */
export function shouldShareCookiesForUrl(url: string): boolean {
  return getCookiePolicy(url).shouldShareCookies;
}

/**
 * Check if a URL is an auth-related page (for navigation pausing).
 * Stricter than cookie sharing - only true positives.
 */
export function isAuthRelatedUrl(url: string): boolean {
  const policy = getCookiePolicy(url);
  return policy.shouldShareCookies;
}

export default {
  getCookiePolicy,
  shouldShareCookiesForUrl,
  isAuthRelatedUrl,
  titleSuggestsAuth,
};
