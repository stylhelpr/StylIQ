// utils/auth.ts
import Auth0 from 'react-native-auth0';
import {API_BASE_URL} from '../config/api';

const auth0 = new Auth0({
  domain: process.env.AUTH0_DOMAIN || 'dev-xeaol4s5b2zd7wuz.us.auth0.com',
  clientId: process.env.AUTH0_CLIENT_ID || '0VpKzuZyGjkmAMNmEYXNRQQbdysFkLz5',
});

export const loginWithAuth0 = async (): Promise<void> => {
  try {
    const credentials = await auth0.webAuth.authorize({
      scope: 'openid profile email',
      audience: API_BASE_URL,
      responseType: 'token id_token',
    } as any);

    console.log('✅ Logged in! Got RS256 token');
    await auth0.credentialsManager.saveCredentials(credentials);
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string> => {
  try {
    const credentials = await auth0.credentialsManager.getCredentials();
    return credentials.accessToken;
  } catch (error) {
    console.error('❌ Failed to get Auth0 token:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await auth0.webAuth.clearSession();
    await auth0.credentialsManager.clearCredentials();
    console.log('✅ Logged out successfully');
  } catch (error) {
    console.error('❌ Logout failed:', error);
  }
};

//////////////

// // utils/auth.ts
// import Auth0 from 'react-native-auth0';

// const auth0 = new Auth0({
//   domain: 'dev-xeaol4s5b2zd7wuz.us.auth0.com',
//   clientId: '0VpKzuZyGjkmAMNmEYXNRQQbdysFkLz5',
// });

// export const loginWithAuth0 = async (): Promise<void> => {
//   try {
//     const credentials = await auth0.webAuth.authorize({
//       scope: 'openid profile email',
//       audience: 'http://localhost:3001',
//       responseType: 'token id_token',
//     } as any);

//     console.log('✅ Logged in! Got RS256 token');
//     await auth0.credentialsManager.saveCredentials(credentials);
//   } catch (error) {
//     console.error('❌ Login error:', error);
//     throw error;
//   }
// };

// export const getAccessToken = async (): Promise<string> => {
//   try {
//     const credentials = await auth0.credentialsManager.getCredentials();
//     return credentials.accessToken;
//   } catch (error) {
//     console.error('Failed to get Auth0 token:', error);
//     throw error;
//   }
// };

// export const logout = async (): Promise<void> => {
//   try {
//     await auth0.webAuth.clearSession();
//     await auth0.credentialsManager.clearCredentials();
//     console.log('✅ Logged out successfully');
//   } catch (error) {
//     console.error('❌ Logout failed:', error);
//   }
// };
