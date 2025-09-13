// utils/auth.ts
import Auth0, {Credentials} from 'react-native-auth0';
import {API_BASE_URL} from '../config/api';

const auth0 = new Auth0({
  domain: process.env.AUTH0_DOMAIN || 'dev-xeaol4s5b2zd7wuz.us.auth0.com',
  clientId: process.env.AUTH0_CLIENT_ID || '0VpKzuZyGjkmAMNmEYXNRQQbdysFkLz5',
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
 */
export const loginWithAuth0 = async (): Promise<void> => {
  const credentials = await auth0.webAuth.authorize({
    scope: 'openid profile email',
    audience: API_BASE_URL,
    responseType: 'token id_token',
    prompt: 'login', // <-- force account chooser
  } as any);

  await saveAuthCredentials(credentials);
};

/**
 * Get only the access token from saved credentials.
 */
export const getAccessToken = async (): Promise<string> => {
  const credentials = await getCredentials();
  return credentials.accessToken;
};

/**
 * Log the user out from Auth0 and clear saved credentials.
 */
export const logout = async (): Promise<void> => {
  await auth0.webAuth.clearSession({federated: true});
  await auth0.credentialsManager.clearCredentials();
};
