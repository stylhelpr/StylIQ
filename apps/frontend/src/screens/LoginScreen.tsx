import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  Image,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '../context/ThemeContext';
import {useAuth0} from 'react-native-auth0';
import jwtDecode from 'jwt-decode';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {moderateScale, fontScale} from '../utils/scale';
import {tokens} from '../styles/tokens/tokens';
import {API_BASE_URL} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveAuthCredentials,
  getCredentials,
  clearCredentials,
  AUTH0_AUDIENCE,
} from '../utils/auth';
import {useSetUUID} from '../context/UUIDContext';
import {triggerHaptic} from '../utils/haptics';
import {queryClient} from '../lib/queryClient';

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
  const {authorize, clearSession} = useAuth0();
  const setUUID = useSetUUID();
  const insets = useSafeAreaInsets();

  // On phones without a home indicator (like iPhone SE), add extra padding
  // to push buttons up into the visible black area
  const bottomPadding = insets.bottom > 0 ? 30 : 7;

  const styles = StyleSheet.create({
    background: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'black',
    },
    imageBackground: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: '192%',
      height: '87%',
      left: '-62%',
    },
    imageOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0, 0, 0, 0.22)',
      zIndex: 1,
    },
    container: {
      width: '80%',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      height: '100%',
    },
    logoContainer: {
      marginBottom: 22,
      alignItems: 'center',
    },
    logoText: {
      fontSize: 58,
      fontWeight: '900',
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: {width: 0, height: 2},
      textShadowRadius: 6,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '500',
      marginTop: 4,
      color: '#fff',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 4,
    },
    buttonContainer: {
      position: 'absolute',
      bottom: bottomPadding,
      gap: 30,
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
    },
    passwordLogin: {
      fontSize: 18,
      fontWeight: '600',
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
      color: '#fff',
      width: 140,
      textAlign: 'center',
      backgroundColor: 'transparent',
      borderColor: 'rgba(144, 0, 255, 1)',
      borderRadius: 20,
      borderWidth: 3,
      paddingVertical: 8,
    },
    signup: {
      fontSize: 18,
      fontWeight: '600',
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
      color: '#fff',
      width: 140,
      textAlign: 'center',
      backgroundColor: 'transparent',
      borderColor: 'rgba(144, 0, 255, 1)',
      borderRadius: 20,
      borderWidth: 3,
      paddingVertical: 8,
    },
    termsContainer: {
      position: 'absolute',
      bottom: bottomPadding + 130,
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
      color: '#fff',
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
        audience: AUTH0_AUDIENCE,
        scope: 'openid profile email offline_access',
        additionalParameters: {
          prompt: 'login', // Force fresh login
        },
      });

      const idToken = credentials?.idToken;
      if (!idToken) throw new Error('Missing idToken');

      if (credentials) {
        await saveAuthCredentials(credentials);
      }

      const decoded: any = jwtDecode(idToken);
      const auth0_sub = decoded.sub;
      const email = decoded.email;
      const name = decoded.name;
      const profile_picture = decoded.picture;
      const [first_name, ...lastParts] = name?.split(' ') || ['User'];
      const last_name = lastParts.join(' ');

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
      const user = raw?.user ?? raw;
      const styleProfile = raw?.style_profile ?? null;

      const sets: [string, string][] = [['auth_logged_in', 'true']];
      if (user?.id) sets.push(['user_id', String(user.id)]);

      // Always use server value, fallback to existing or false
      const serverOnboarded = user?.onboarding_complete === true;
      sets.push(['onboarding_complete', serverOnboarded ? 'true' : 'false']);

      if (styleProfile) {
        sets.push(['style_profile', JSON.stringify(styleProfile)]);
      }

      await AsyncStorage.multiSet(sets);

      if (user?.id) {
        setUUID(String(user.id));
        // CRITICAL: Clear ALL React Query cache after setting new user
        // This ensures profile queries fetch fresh data for the NEW user
        // and don't return stale cached data from a previous user session
        queryClient.clear();
      }

      // Small delay to ensure UUID state propagates through context before navigation
      // This prevents race conditions where screens try to fetch data before userId is set
      await new Promise(resolve => setTimeout(resolve, 100));

      onLoginSuccess?.();
    } catch (e) {
      console.error('❌ LOGIN ERROR:', e);
    }
  };

  const handleSignup = async () => {
    try {
      // Clear local credentials
      try {
        await clearCredentials();
      } catch {
        // Ignore if no credentials exist
      }

      const redirectUrl =
        'com.stylhelpr.stylhelpr.auth0://dev-xeaol4s5b2zd7wuz.us.auth0.com/ios/com.stylhelpr.stylhelpr/callback';

      const credentials = await authorize({
        redirectUrl,
        audience: AUTH0_AUDIENCE,
        scope: 'openid profile email offline_access',
        additionalParameters: {
          screen_hint: 'signup',
          prompt: 'login',
          max_age: '0',
        },
      });

      // User canceled or no credentials returned
      if (!credentials) {
        console.log('Signup canceled or no credentials returned');
        return;
      }

      await saveAuthCredentials(credentials);

      const idToken = credentials.idToken;
      if (!idToken) throw new Error('Missing idToken');

      const decoded: any = jwtDecode(idToken);
      const auth0_sub = decoded.sub;
      const email = decoded.email;
      const name = decoded.name;
      const profile_picture = decoded.picture;
      const [first_name, ...lastParts] = name?.split(' ') || ['User'];
      const last_name = lastParts.join(' ');

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
      const user = raw?.user ?? raw;
      const styleProfile = raw?.style_profile ?? null;

      const sets: [string, string][] = [['auth_logged_in', 'true']];
      if (user?.id) sets.push(['user_id', String(user.id)]);

      // New signup - always start fresh with onboarding
      sets.push(['onboarding_complete', 'false']);

      if (styleProfile) {
        sets.push(['style_profile', JSON.stringify(styleProfile)]);
      }

      await AsyncStorage.multiSet(sets);

      if (user?.id) {
        setUUID(String(user.id));
        // CRITICAL: Clear ALL React Query cache after setting new user
        // This ensures profile queries fetch fresh data for the NEW user
        queryClient.clear();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      onLoginSuccess?.();
    } catch (e) {
      console.error('❌ SIGNUP ERROR:', e);
    }
  };

  return (
    <View style={styles.background}>
      {/* ✅ Replace video with still image */}
      <Image
        source={require('../assets/images/landing-page28.jpg')}
        style={styles.imageBackground}
        resizeMode="cover"
      />
      <View style={styles.imageOverlay} />

      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText} numberOfLines={1} adjustsFontSizeToFit>STYLHELPR</Text>
          <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit>
            A fashion intelligence platform centered on you
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={{marginBottom: 12}}
            onPress={() => {
              triggerHaptic('impactMedium');
              handleLogin();
            }}>
            <Text style={[styles.passwordLogin]}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              triggerHaptic('impactMedium');
              handleSignup();
            }}>
            <Text style={[styles.signup]}>Signup</Text>
          </TouchableOpacity>
        </View>

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
