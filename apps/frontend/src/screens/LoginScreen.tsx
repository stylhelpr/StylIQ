// screens/LoginScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useAuth0} from 'react-native-auth0';
import jwtDecode from 'jwt-decode';
import Video from 'react-native-video';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {API_BASE_URL} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const windowHeight = Dimensions.get('window').height;

type Props = {
  email: string;
  onFaceIdLogin: () => void;
  onPasswordLogin?: () => void;
  onGoogleLogin?: () => void;
  onLoginSuccess: () => void;
};

export default function LoginScreen({
  email,
  onFaceIdLogin,
  onLoginSuccess,
}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {authorize} = useAuth0();

  const styles = StyleSheet.create({
    background: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    videoOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      zIndex: 1,
    },
    container: {
      width: '80%',
      alignItems: 'center',
      zIndex: 2,
    },
    logoContainer: {
      marginBottom: 40,
      alignItems: 'center',
    },
    logoText: {
      fontSize: 48,
      fontWeight: '900',
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: {width: 0, height: 2},
      textShadowRadius: 6,
    },
    subtitle: {
      fontSize: 18,
      fontWeight: '400',
      marginTop: 4,
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 4,
    },
    googleButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 90,
    },
    googleButtonText: {
      fontSize: 40,
      fontWeight: '900',
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: {width: 0, height: 2},
      textShadowRadius: 4,
    },
    emailText: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 40,
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,0.4)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 3,
    },
    passwordLogin: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 40,
      textDecorationLine: 'underline',
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    loginLink: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 24,
      marginBottom: 40,
    },
    loginLinkText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 3,
    },
    termsContainer: {
      paddingHorizontal: 20,
    },
    termsText: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 18,
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    linkText: {
      color: '#007AFF',
      textDecorationLine: 'underline',
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
  });

  const handleLogin = async () => {
    try {
      const redirectUrl =
        'com.stylhelpr.stylhelpr.auth0://dev-xeaol4s5b2zd7wuz.us.auth0.com/ios/com.stylhelpr.stylhelpr/callback';

      const credentials = await authorize({
        redirectUrl,
        audience: 'http://localhost:3001',
        scope: 'openid profile email',
        responseType: 'token id_token',
      } as any);

      if (!credentials?.idToken) throw new Error('Missing idToken');

      const decoded: any = jwtDecode(credentials.idToken);
      const auth0_sub = decoded.sub;
      const email = decoded.email;
      const name = decoded.name;
      const profile_picture = decoded.picture;
      const [first_name, ...lastParts] = name?.split(' ') || ['User'];
      const last_name = lastParts.join(' ');

      // Create or fetch the user (now returns { user, style_profile } or just user)
      const response = await fetch(`${API_BASE_URL}/users/sync`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          auth0_sub,
          email,
          first_name,
          last_name,
          profile_picture,
        }),
      });
      if (!response.ok) throw new Error('Failed to sync user');

      const raw = await response.json();
      const user = raw?.user ?? raw; // support both shapes
      const styleProfile = raw?.style_profile ?? null;

      // Persist auth + routing flags
      const sets: [string, string][] = [['auth_logged_in', 'true']];
      if (user?.id) sets.push(['user_id', String(user.id)]);

      if (typeof user?.onboarding_complete === 'boolean') {
        sets.push([
          'onboarding_complete',
          user.onboarding_complete ? 'true' : 'false',
        ]);
      } else {
        // If server didn't say, initialize once to 'false' on fresh device
        const existing = await AsyncStorage.getItem('onboarding_complete');
        if (existing == null) sets.push(['onboarding_complete', 'false']);
      }

      if (styleProfile) {
        sets.push(['style_profile', JSON.stringify(styleProfile)]);
      }

      await AsyncStorage.multiSet(sets);

      onLoginSuccess?.(); // calls routeAfterLogin()
    } catch (e) {
      console.error('❌ LOGIN ERROR:', e);
    }
  };

  const maskEmail = (value: string) => {
    const [user, domain] = value.split('@');
    if (!user || !domain) return value;
    const start = user.slice(0, 4);
    const end = user.slice(-2);
    return `${start}***${end}@${domain}`;
  };

  return (
    <View style={styles.background}>
      <Video
        source={require('../assets/images/free3.mp4')}
        style={StyleSheet.absoluteFill}
        muted
        repeat
        resizeMode="cover"
        rate={1.0}
        ignoreSilentSwitch="obey"
      />
      <View style={styles.videoOverlay} />

      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>StylHelpr</Text>
          <Text style={styles.subtitle}>
            Your personal AI fashion concierge
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.googleButton,
            {backgroundColor: theme.colors.background},
          ]}
          activeOpacity={0.8}>
          <Text style={styles.googleButtonText}>G</Text>
        </TouchableOpacity>

        <Text style={styles.emailText}>
          {email ? maskEmail(email) : 'giffinmike@hotmail.com'}
        </Text>

        <TouchableOpacity
          style={[
            globalStyles.buttonHome,
            {backgroundColor: theme.colors.background},
          ]}
          onPress={onFaceIdLogin}
          activeOpacity={0.8}>
          <Text style={globalStyles.buttonHomeText}>Face ID</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogin}>
          <Text style={[styles.passwordLogin, {color: theme.colors.primary}]}>
            Login
          </Text>
        </TouchableOpacity>

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By continuing, you agree to the{' '}
            <Text style={styles.linkText} onPress={() => Linking.openURL('')}>
              StylHelpr Privacy Policy
            </Text>
            ,{' '}
            <Text style={styles.linkText} onPress={() => Linking.openURL('')}>
              Terms of Use
            </Text>
            .
          </Text>
        </View>
      </View>
    </View>
  );
}

//////////////////

// // screens/LoginScreen.tsx
// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Dimensions,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import jwtDecode from 'jwt-decode';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {API_BASE_URL} from '../config/api';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const windowHeight = Dimensions.get('window').height;

// type Props = {
//   email: string;
//   onFaceIdLogin: () => void;
//   onPasswordLogin?: () => void;
//   onGoogleLogin?: () => void;
//   onLoginSuccess: () => void;
// };

// export default function LoginScreen({
//   email,
//   onFaceIdLogin,
//   onLoginSuccess,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {authorize} = useAuth0();

//   const styles = StyleSheet.create({
//     background: {
//       flex: 1,
//       position: 'relative',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     videoOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0, 0, 0, 0.45)',
//       zIndex: 1,
//     },
//     container: {
//       width: '80%',
//       alignItems: 'center',
//       zIndex: 2,
//     },
//     logoContainer: {
//       marginBottom: 40,
//       alignItems: 'center',
//     },
//     logoText: {
//       fontSize: 48,
//       fontWeight: '900',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 2},
//       textShadowRadius: 6,
//     },
//     subtitle: {
//       fontSize: 18,
//       fontWeight: '400',
//       marginTop: 4,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 4,
//     },
//     googleButton: {
//       width: 80,
//       height: 80,
//       borderRadius: 40,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 20,
//       marginTop: 90,
//     },
//     googleButtonText: {
//       fontSize: 40,
//       fontWeight: '900',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 2},
//       textShadowRadius: 4,
//     },
//     emailText: {
//       fontSize: 20,
//       fontWeight: '600',
//       marginBottom: 40,
//       color: '#fff',
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 8,
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 3,
//     },
//     passwordLogin: {
//       fontSize: 18,
//       fontWeight: '600',
//       marginBottom: 40,
//       textDecorationLine: 'underline',
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//     loginLink: {
//       backgroundColor: 'rgba(255,255,255,0.1)',
//       paddingHorizontal: 20,
//       paddingVertical: 10,
//       borderRadius: 24,
//       marginBottom: 40,
//     },
//     loginLinkText: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 3,
//     },
//     termsContainer: {
//       paddingHorizontal: 20,
//     },
//     termsText: {
//       fontSize: 14,
//       textAlign: 'center',
//       lineHeight: 18,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.6)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//     linkText: {
//       color: '#007AFF',
//       textDecorationLine: 'underline',
//       textShadowColor: 'rgba(0,0,0,0.6)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//   });

//   const handleLogin = async () => {
//     try {
//       const redirectUrl =
//         'com.stylhelpr.stylhelpr.auth0://dev-xeaol4s5b2zd7wuz.us.auth0.com/ios/com.stylhelpr.stylhelpr/callback';

//       const credentials = await authorize({
//         redirectUrl,
//         audience: 'http://localhost:3001',
//         scope: 'openid profile email',
//         responseType: 'token id_token',
//       } as any);
//       if (!credentials?.idToken) throw new Error('Missing idToken');

//       const decoded: any = jwtDecode(credentials.idToken);
//       const auth0_sub = decoded.sub;
//       const email = decoded.email;
//       const name = decoded.name;
//       const profile_picture = decoded.picture;
//       const [first_name, ...lastParts] = name?.split(' ') || ['User'];
//       const last_name = lastParts.join(' ');

//       // Create or fetch the user row
//       const response = await fetch(`${API_BASE_URL}/users/sync`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           auth0_sub,
//           email,
//           first_name,
//           last_name,
//           profile_picture,
//         }),
//       });
//       if (!response.ok) throw new Error('Failed to sync user');

//       const result = await response.json();

//       // /users/sync returns the user row directly (NOT { user: {...} })
//       const serverComplete =
//         typeof result?.onboarding_complete === 'boolean'
//           ? result.onboarding_complete
//           : // If you later change the API to { user: {...} }, this still works:
//           typeof result?.user?.onboarding_complete === 'boolean'
//           ? result.user.onboarding_complete
//           : undefined;

//       // Always mark logged in
//       await AsyncStorage.setItem('auth_logged_in', 'true');

//       if (typeof serverComplete === 'boolean') {
//         // Trust the server if it told us explicitly
//         await AsyncStorage.setItem(
//           'onboarding_complete',
//           serverComplete ? 'true' : 'false',
//         );
//       } else {
//         // Server was silent; don't clobber whatever is already stored
//         const existing = await AsyncStorage.getItem('onboarding_complete');
//         if (existing == null) {
//           // Fresh device with no flag yet → require onboarding once
//           await AsyncStorage.setItem('onboarding_complete', 'false');
//         }
//       }

//       onLoginSuccess?.(); // calls routeAfterLogin()
//     } catch (e) {
//       console.error('❌ LOGIN ERROR:', e);
//     }
//   };

//   const maskEmail = (email: string) => {
//     const [user, domain] = email.split('@');
//     if (!user || !domain) return email;
//     const start = user.slice(0, 4);
//     const end = user.slice(-2);
//     return `${start}***${end}@${domain}`;
//   };

//   return (
//     <View style={styles.background}>
//       <Video
//         source={require('../assets/images/free3.mp4')}
//         style={StyleSheet.absoluteFill}
//         muted
//         repeat
//         resizeMode="cover"
//         rate={1.0}
//         ignoreSilentSwitch="obey"
//       />
//       <View style={styles.videoOverlay} />

//       <View style={styles.container}>
//         <View style={styles.logoContainer}>
//           <Text style={styles.logoText}>StylHelpr</Text>
//           <Text style={styles.subtitle}>
//             Your personal AI fashion concierge
//           </Text>
//         </View>

//         <TouchableOpacity
//           style={[
//             styles.googleButton,
//             {backgroundColor: theme.colors.background},
//           ]}
//           activeOpacity={0.8}>
//           <Text style={styles.googleButtonText}>G</Text>
//         </TouchableOpacity>

//         <Text style={styles.emailText}>
//           {email ? maskEmail(email) : 'giffinmike@hotmail.com'}
//         </Text>

//         <TouchableOpacity
//           style={[
//             globalStyles.buttonHome,
//             {backgroundColor: theme.colors.background},
//           ]}
//           onPress={onFaceIdLogin}
//           activeOpacity={0.8}>
//           <Text style={globalStyles.buttonHomeText}>Face ID</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={handleLogin}>
//           <Text style={[styles.passwordLogin, {color: theme.colors.primary}]}>
//             Login
//           </Text>
//         </TouchableOpacity>

//         <View style={styles.termsContainer}>
//           <Text style={styles.termsText}>
//             By continuing, you agree to the{' '}
//             <Text style={styles.linkText} onPress={() => Linking.openURL('')}>
//               StylHelpr Privacy Policy
//             </Text>
//             ,{' '}
//             <Text style={styles.linkText} onPress={() => Linking.openURL('')}>
//               Terms of Use
//             </Text>
//             .
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }

///////////////////////

// // screens/LoginScreen.tsx
// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Dimensions,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import jwtDecode from 'jwt-decode';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {API_BASE_URL} from '../config/api';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const windowHeight = Dimensions.get('window').height;

// type Props = {
//   email: string;
//   onFaceIdLogin: () => void;
//   onPasswordLogin?: () => void;
//   onGoogleLogin?: () => void;
//   onLoginSuccess: () => void;
// };

// export default function LoginScreen({
//   email,
//   onFaceIdLogin,
//   onLoginSuccess,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {authorize} = useAuth0();

//   const styles = StyleSheet.create({
//     background: {
//       flex: 1,
//       position: 'relative',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     videoOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0, 0, 0, 0.45)',
//       zIndex: 1,
//     },
//     container: {
//       width: '80%',
//       alignItems: 'center',
//       zIndex: 2,
//     },
//     logoContainer: {
//       marginBottom: 40,
//       alignItems: 'center',
//     },
//     logoText: {
//       fontSize: 48,
//       fontWeight: '900',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 2},
//       textShadowRadius: 6,
//     },
//     subtitle: {
//       fontSize: 18,
//       fontWeight: '400',
//       marginTop: 4,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 4,
//     },
//     googleButton: {
//       width: 80,
//       height: 80,
//       borderRadius: 40,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 20,
//       marginTop: 90,
//     },
//     googleButtonText: {
//       fontSize: 40,
//       fontWeight: '900',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 2},
//       textShadowRadius: 4,
//     },
//     emailText: {
//       fontSize: 20,
//       fontWeight: '600',
//       marginBottom: 40,
//       color: '#fff',
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 8,
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 3,
//     },
//     passwordLogin: {
//       fontSize: 18,
//       fontWeight: '600',
//       marginBottom: 40,
//       textDecorationLine: 'underline',
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//     loginLink: {
//       backgroundColor: 'rgba(255,255,255,0.1)',
//       paddingHorizontal: 20,
//       paddingVertical: 10,
//       borderRadius: 24,
//       marginBottom: 40,
//     },
//     loginLinkText: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 3,
//     },
//     termsContainer: {
//       paddingHorizontal: 20,
//     },
//     termsText: {
//       fontSize: 14,
//       textAlign: 'center',
//       lineHeight: 18,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.6)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//     linkText: {
//       color: '#007AFF',
//       textDecorationLine: 'underline',
//       textShadowColor: 'rgba(0,0,0,0.6)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//   });

//   const handleLogin = async () => {
//     try {
//       const redirectUrl =
//         'com.stylhelpr.stylhelpr.auth0://dev-xeaol4s5b2zd7wuz.us.auth0.com/ios/com.stylhelpr.stylhelpr/callback';

//       const credentials = await authorize({
//         redirectUrl,
//         audience: 'http://localhost:3001',
//         scope: 'openid profile email',
//         responseType: 'token id_token',
//       } as any);
//       if (!credentials?.idToken) throw new Error('Missing idToken');

//       const decoded: any = jwtDecode(credentials.idToken);
//       const auth0_sub = decoded.sub;
//       const email = decoded.email;
//       const name = decoded.name;
//       const profile_picture = decoded.picture;
//       const [first_name, ...lastParts] = name?.split(' ') || ['User'];
//       const last_name = lastParts.join(' ');

//       const response = await fetch(`${API_BASE_URL}/users/sync`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           auth0_sub,
//           email,
//           first_name,
//           last_name,
//           profile_picture,
//         }),
//       });
//       if (!response.ok) throw new Error('Failed to sync user');
//       const result = await response.json();

//       // ✅ Only treat as "complete" if explicitly told so.
//       // If backend is silent/undefined, we assume onboarding is REQUIRED.
//       const backendNeeds = result?.needsOnboarding;
//       const backendComplete = result?.user?.onboarding_complete;

//       const isComplete = backendNeeds === false || backendComplete === true;

//       const needsOnboarding = !isComplete;

//       await AsyncStorage.multiSet([
//         ['auth_logged_in', 'true'],
//         ['onboarding_complete', needsOnboarding ? 'false' : 'true'],
//       ]);

//       onLoginSuccess?.(); // parent will switch screens
//     } catch (e) {
//       console.error('❌ LOGIN ERROR:', e);
//     }
//   };
//   const maskEmail = (email: string) => {
//     const [user, domain] = email.split('@');
//     if (!user || !domain) return email;
//     const start = user.slice(0, 4);
//     const end = user.slice(-2);
//     return `${start}***${end}@${domain}`;
//   };

//   return (
//     <View style={styles.background}>
//       <Video
//         source={require('../assets/images/free3.mp4')}
//         style={StyleSheet.absoluteFill}
//         muted
//         repeat
//         resizeMode="cover"
//         rate={1.0}
//         ignoreSilentSwitch="obey"
//       />
//       <View style={styles.videoOverlay} />

//       <View style={styles.container}>
//         <View style={styles.logoContainer}>
//           <Text style={styles.logoText}>StylHelpr</Text>
//           <Text style={styles.subtitle}>
//             Your personal AI fashion concierge
//           </Text>
//         </View>

//         <TouchableOpacity
//           style={[
//             styles.googleButton,
//             {backgroundColor: theme.colors.background},
//           ]}
//           activeOpacity={0.8}>
//           <Text style={styles.googleButtonText}>G</Text>
//         </TouchableOpacity>

//         <Text style={styles.emailText}>
//           {email ? maskEmail(email) : 'giffinmike@hotmail.com'}
//         </Text>

//         <TouchableOpacity
//           style={[
//             globalStyles.buttonHome,
//             {backgroundColor: theme.colors.background},
//           ]}
//           onPress={onFaceIdLogin}
//           activeOpacity={0.8}>
//           <Text style={globalStyles.buttonHomeText}>Face ID</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={handleLogin}>
//           <Text style={[styles.passwordLogin, {color: theme.colors.primary}]}>
//             Login
//           </Text>
//         </TouchableOpacity>

//         <View style={styles.termsContainer}>
//           <Text style={styles.termsText}>
//             By continuing, you agree to the{' '}
//             <Text style={styles.linkText} onPress={() => Linking.openURL('')}>
//               StylHelpr Privacy Policy
//             </Text>
//             ,{' '}
//             <Text style={styles.linkText} onPress={() => Linking.openURL('')}>
//               Terms of Use
//             </Text>
//             .
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }

///////////////

// // screens/LoginScreen.tsx
// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Dimensions,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import jwtDecode from 'jwt-decode';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {API_BASE_URL} from '../config/api';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const windowHeight = Dimensions.get('window').height;

// type Props = {
//   email: string;
//   onFaceIdLogin: () => void;
//   onPasswordLogin?: () => void;
//   onGoogleLogin?: () => void;
//   onLoginSuccess: () => void;
// };

// export default function LoginScreen({
//   email,
//   onFaceIdLogin,
//   onLoginSuccess,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {authorize} = useAuth0();

//   const styles = StyleSheet.create({
//     background: {
//       flex: 1,
//       position: 'relative',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     videoOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0, 0, 0, 0.45)',
//       zIndex: 1,
//     },
//     container: {
//       width: '80%',
//       alignItems: 'center',
//       zIndex: 2,
//     },
//     logoContainer: {
//       marginBottom: 40,
//       alignItems: 'center',
//     },
//     logoText: {
//       fontSize: 48,
//       fontWeight: '900',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 2},
//       textShadowRadius: 6,
//     },
//     subtitle: {
//       fontSize: 18,
//       fontWeight: '400',
//       marginTop: 4,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 4,
//     },
//     googleButton: {
//       width: 80,
//       height: 80,
//       borderRadius: 40,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 20,
//       marginTop: 90,
//     },
//     googleButtonText: {
//       fontSize: 40,
//       fontWeight: '900',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 2},
//       textShadowRadius: 4,
//     },
//     emailText: {
//       fontSize: 20,
//       fontWeight: '600',
//       marginBottom: 40,
//       color: '#fff',
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 8,
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 3,
//     },
//     passwordLogin: {
//       fontSize: 18,
//       fontWeight: '600',
//       marginBottom: 40,
//       textDecorationLine: 'underline',
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//     loginLink: {
//       backgroundColor: 'rgba(255,255,255,0.1)',
//       paddingHorizontal: 20,
//       paddingVertical: 10,
//       borderRadius: 24,
//       marginBottom: 40,
//     },
//     loginLinkText: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 3,
//     },
//     termsContainer: {
//       paddingHorizontal: 20,
//     },
//     termsText: {
//       fontSize: 14,
//       textAlign: 'center',
//       lineHeight: 18,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.6)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//     linkText: {
//       color: '#007AFF',
//       textDecorationLine: 'underline',
//       textShadowColor: 'rgba(0,0,0,0.6)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//   });

//   const handleLogin = async () => {
//     try {
//       const redirectUrl =
//         'com.stylhelpr.stylhelpr.auth0://dev-xeaol4s5b2zd7wuz.us.auth0.com/ios/com.stylhelpr.stylhelpr/callback';

//       const credentials = await authorize({
//         redirectUrl,
//         audience: 'http://localhost:3001',
//         scope: 'openid profile email',
//         responseType: 'token id_token',
//       } as any);

//       if (!credentials?.idToken) throw new Error('Missing idToken');

//       const decoded: any = jwtDecode(credentials.idToken);
//       const auth0_sub = decoded.sub;
//       const email = decoded.email;
//       const name = decoded.name;
//       const profile_picture = decoded.picture;
//       const [first_name, ...lastParts] = name?.split(' ') || ['User'];
//       const last_name = lastParts.join(' ');

//       // Create/sync user
//       const response = await fetch(`${API_BASE_URL}/users/sync`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           auth0_sub,
//           email,
//           first_name,
//           last_name,
//           profile_picture,
//         }),
//       });
//       if (!response.ok) throw new Error('Failed to sync user');
//       const result = await response.json();

//       // Decide onboarding
//       const needsOnboarding =
//         result?.needsOnboarding ??
//         result?.user?.onboarding_complete === false ??
//         false;

//       // Just set flags; parent will switch screens
//       await AsyncStorage.multiSet([
//         ['auth_logged_in', 'true'],
//         ['onboarding_complete', needsOnboarding ? 'false' : 'true'],
//       ]);

//       onLoginSuccess?.(); // let parent decide where to go
//     } catch (e) {
//       console.error('❌ LOGIN ERROR:', e);
//     }
//   };

//   const maskEmail = (email: string) => {
//     const [user, domain] = email.split('@');
//     if (!user || !domain) return email;
//     const start = user.slice(0, 4);
//     const end = user.slice(-2);
//     return `${start}***${end}@${domain}`;
//   };

//   return (
//     <View style={styles.background}>
//       <Video
//         source={require('../assets/images/free3.mp4')}
//         style={StyleSheet.absoluteFill}
//         muted
//         repeat
//         resizeMode="cover"
//         rate={1.0}
//         ignoreSilentSwitch="obey"
//       />
//       <View style={styles.videoOverlay} />

//       <View style={styles.container}>
//         <View style={styles.logoContainer}>
//           <Text style={styles.logoText}>StylHelpr</Text>
//           <Text style={styles.subtitle}>
//             Your personal AI fashion concierge
//           </Text>
//         </View>

//         <TouchableOpacity
//           style={[
//             styles.googleButton,
//             {backgroundColor: theme.colors.background},
//           ]}
//           activeOpacity={0.8}>
//           <Text style={styles.googleButtonText}>G</Text>
//         </TouchableOpacity>

//         <Text style={styles.emailText}>
//           {email ? maskEmail(email) : 'giffinmike@hotmail.com'}
//         </Text>

//         <TouchableOpacity
//           style={[
//             globalStyles.buttonHome,
//             {backgroundColor: theme.colors.background},
//           ]}
//           onPress={onFaceIdLogin}
//           activeOpacity={0.8}>
//           <Text style={globalStyles.buttonHomeText}>Face ID</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={handleLogin}>
//           <Text style={[styles.passwordLogin, {color: theme.colors.primary}]}>
//             Login
//           </Text>
//         </TouchableOpacity>

//         <View style={styles.termsContainer}>
//           <Text style={styles.termsText}>
//             By continuing, you agree to the{' '}
//             <Text style={styles.linkText} onPress={() => Linking.openURL('')}>
//               StylHelpr Privacy Policy
//             </Text>
//             ,{' '}
//             <Text style={styles.linkText} onPress={() => Linking.openURL('')}>
//               Terms of Use
//             </Text>
//             .
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }

/////////////////

// // screens/LoginScreen.tsx
// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Dimensions,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import jwtDecode from 'jwt-decode';
// import Video from 'react-native-video';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {API_BASE_URL} from '../config/api';

// const windowHeight = Dimensions.get('window').height;

// type Props = {
//   email: string;
//   onFaceIdLogin: () => void;
//   onPasswordLogin?: () => void;
//   onGoogleLogin?: () => void;
//   onLoginSuccess: () => void;
// };

// export default function LoginScreen({
//   email,
//   onFaceIdLogin,
//   onLoginSuccess,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {authorize} = useAuth0();

//   const styles = StyleSheet.create({
//     background: {
//       flex: 1,
//       position: 'relative',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     videoOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0, 0, 0, 0.45)',
//       zIndex: 1,
//     },
//     container: {
//       width: '80%',
//       alignItems: 'center',
//       zIndex: 2,
//     },
//     logoContainer: {
//       marginBottom: 40,
//       alignItems: 'center',
//     },
//     logoText: {
//       fontSize: 48,
//       fontWeight: '900',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 2},
//       textShadowRadius: 6,
//     },
//     subtitle: {
//       fontSize: 18,
//       fontWeight: '400',
//       marginTop: 4,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 4,
//     },
//     googleButton: {
//       width: 80,
//       height: 80,
//       borderRadius: 40,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 20,
//       marginTop: 90,
//     },
//     googleButtonText: {
//       fontSize: 40,
//       fontWeight: '900',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.8)',
//       textShadowOffset: {width: 0, height: 2},
//       textShadowRadius: 4,
//     },
//     emailText: {
//       fontSize: 20,
//       fontWeight: '600',
//       marginBottom: 40,
//       color: '#fff',
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 8,
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 3,
//     },
//     passwordLogin: {
//       fontSize: 18,
//       fontWeight: '600',
//       marginBottom: 40,
//       textDecorationLine: 'underline',
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//     loginLink: {
//       backgroundColor: 'rgba(255,255,255,0.1)',
//       paddingHorizontal: 20,
//       paddingVertical: 10,
//       borderRadius: 24,
//       marginBottom: 40,
//     },
//     loginLinkText: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.7)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 3,
//     },
//     termsContainer: {
//       paddingHorizontal: 20,
//     },
//     termsText: {
//       fontSize: 14,
//       textAlign: 'center',
//       lineHeight: 18,
//       color: '#fff',
//       textShadowColor: 'rgba(0,0,0,0.6)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//     linkText: {
//       color: '#007AFF',
//       textDecorationLine: 'underline',
//       textShadowColor: 'rgba(0,0,0,0.6)',
//       textShadowOffset: {width: 0, height: 1},
//       textShadowRadius: 2,
//     },
//   });

//   const handleLogin = async () => {
//     try {
//       const redirectUrl =
//         'com.stylhelpr.stylhelpr.auth0://dev-xeaol4s5b2zd7wuz.us.auth0.com/ios/com.stylhelpr.stylhelpr/callback';

//       const credentials = await authorize({
//         redirectUrl,
//         audience: 'http://localhost:3001',
//         scope: 'openid profile email',
//         responseType: 'token id_token',
//       } as any);

//       if (!credentials || !credentials.idToken) {
//         throw new Error('Missing Auth0 credentials or idToken');
//       }

//       const decoded: any = jwtDecode(credentials.idToken);

//       const auth0_sub = decoded.sub;
//       const email = decoded.email;
//       const name = decoded.name;
//       const profile_picture = decoded.picture;
//       const [first_name, ...lastParts] = name?.split(' ') || ['User'];
//       const last_name = lastParts.join(' ');

//       const response = await fetch(`${API_BASE_URL}/users/sync`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           auth0_sub,
//           email,
//           first_name,
//           last_name,
//           profile_picture,
//         }),
//       });

//       const result = await response.json();
//       console.log('✅ SYNC RESPONSE:', result);
//       onLoginSuccess();
//     } catch (e) {
//       console.error('❌ LOGIN ERROR:', e);
//     }
//   };

//   const maskEmail = (email: string) => {
//     const [user, domain] = email.split('@');
//     if (!user || !domain) return email;
//     const start = user.slice(0, 4);
//     const end = user.slice(-2);
//     return `${start}***${end}@${domain}`;
//   };

//   return (
//     <View style={styles.background}>
//       <Video
//         source={require('../assets/images/free3.mp4')}
//         style={StyleSheet.absoluteFill}
//         muted
//         repeat
//         resizeMode="cover"
//         rate={1.0}
//         ignoreSilentSwitch="obey"
//       />
//       <View style={styles.videoOverlay} />

//       <View style={styles.container}>
//         <View style={styles.logoContainer}>
//           <Text style={styles.logoText}>StylHelpr</Text>
//           <Text style={styles.subtitle}>
//             Your personal AI fashion concierge
//           </Text>
//         </View>

//         <TouchableOpacity
//           style={[
//             styles.googleButton,
//             {backgroundColor: theme.colors.background},
//           ]}
//           activeOpacity={0.8}>
//           <Text style={styles.googleButtonText}>G</Text>
//         </TouchableOpacity>

//         <Text style={styles.emailText}>
//           {email ? maskEmail(email) : 'giffinmike@hotmail.com'}
//         </Text>

//         <TouchableOpacity
//           style={[
//             globalStyles.buttonHome,
//             {backgroundColor: theme.colors.background},
//           ]}
//           onPress={onFaceIdLogin}
//           activeOpacity={0.8}>
//           <Text style={globalStyles.buttonHomeText}>Face ID</Text>
//         </TouchableOpacity>

//         <TouchableOpacity onPress={handleLogin}>
//           <Text style={[styles.passwordLogin, {color: theme.colors.primary}]}>
//             Login
//           </Text>
//         </TouchableOpacity>

//         <View style={styles.termsContainer}>
//           <Text style={styles.termsText}>
//             By continuing, you agree to the{' '}
//             <Text style={styles.linkText} onPress={() => Linking.openURL('')}>
//               StylHelpr Privacy Policy
//             </Text>
//             ,{' '}
//             <Text style={styles.linkText} onPress={() => Linking.openURL('')}>
//               Terms of Use
//             </Text>
//             .
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }
