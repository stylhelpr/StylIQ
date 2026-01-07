// utils/auth.ts
import Auth0, {Credentials} from 'react-native-auth0';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH0_DOMAIN = 'dev-xeaol4s5b2zd7wuz.us.auth0.com';
const AUTH0_CLIENT_ID = '0VpKzuZyGjkmAMNmEYXNRQQbdysFkLz5';

// Auth0 audience must match what the backend expects for JWT validation
// Must match: Auth0 API Identifier + Cloud Run AUTH0_AUDIENCE env var
// Using single audience for both dev and prod - update local backend .env to match
export const AUTH0_AUDIENCE = 'https://api.stylhelpr.com';

// Auth0 instance without biometrics (for normal operations)
const auth0 = new Auth0({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
});

// Auth0 instance with biometrics enabled (for Face ID login)
// Uses same domain/clientId so credentials are shared
const auth0WithBiometrics = new Auth0({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  localAuthenticationOptions: {
    title: 'Log in with Face ID',
    cancelTitle: 'Cancel',
    fallbackTitle: 'Use Password',
  },
});

/**
 * Save credentials from Auth0 login — must include `expiresAt`.
 */
export async function saveAuthCredentials(credentials: Credentials) {
  await auth0.credentialsManager.saveCredentials(credentials);
}

/**
 * Get saved credentials (access token, id token, etc.)
 */
export async function getCredentials(): Promise<Credentials> {
  return auth0.credentialsManager.getCredentials();
}

/**
 * Log in using Auth0 and save the returned credentials.
 * Uses Authorization Code + PKCE (SDK default).
 */
export const loginWithAuth0 = async (): Promise<void> => {
  const credentials = await auth0.webAuth.authorize({
    scope: 'openid profile email offline_access',
    audience: AUTH0_AUDIENCE,
    additionalParameters: {prompt: 'login'},
  });

  await saveAuthCredentials(credentials);
};

/**
 * Get only the access token from saved credentials.
 */
export const getAccessToken = async (): Promise<string> => {
  const credentials = await getCredentials();
  // console.log('ACCESS TOKEN >>>', credentials.accessToken);
  return credentials.accessToken;
};

/**
 * Log the user out from Auth0 and clear saved credentials.
 */
export const logout = async (): Promise<void> => {
  await auth0.webAuth.clearSession({federated: true});
  await auth0.credentialsManager.clearCredentials();
  // Clear cached user ID to prevent stale data on next login
  await AsyncStorage.removeItem('user_id');
};

/**
 * Clear only the stored credentials (without clearing Auth0 web session).
 */
export const clearCredentials = async (): Promise<void> => {
  await auth0.credentialsManager.clearCredentials();
};

/**
 * Clear Auth0 session for signup - clears both web session and credentials.
 */
export const clearSessionForSignup = async (): Promise<void> => {
  try {
    await auth0.webAuth.clearSession();
  } catch {
    // Ignore - user may have dismissed or no session exists
  }
  await auth0.credentialsManager.clearCredentials();
};

/**
 * Check if credentials exist in the credential manager.
 * Uses minTtl=0 to check for any credentials, even if expired.
 * The credential manager will auto-refresh if refresh token exists.
 */
export const hasStoredCredentials = async (): Promise<boolean> => {
  try {
    // hasValidCredentials with minTtl=0 returns true if any credentials exist
    // (even expired ones that can be refreshed)
    return await auth0.credentialsManager.hasValidCredentials(0);
  } catch {
    return false;
  }
};

/**
 * Get credentials using biometric authentication (Face ID / Touch ID).
 * This retrieves stored credentials from Keychain without needing Auth0 web login.
 * The biometric prompt is shown automatically by Auth0.
 * If token is expired, it will be refreshed automatically.
 * Returns null if no credentials stored or biometric fails.
 */
export const getCredentialsWithBiometrics =
  async (): Promise<Credentials | null> => {
    try {
      // Check if we have any stored credentials first
      const hasCredentials = await hasStoredCredentials();
      if (!hasCredentials) {
        console.log('No stored credentials found');
        return null;
      }

      // Get credentials using biometric-enabled instance
      // This will:
      // 1. Prompt Face ID automatically
      // 2. Auto-refresh the token if expired (using refresh token)
      const credentials =
        await auth0WithBiometrics.credentialsManager.getCredentials();
      return credentials;
    } catch (error) {
      console.error('Failed to get credentials with biometrics:', error);
      return null;
    }
  };
