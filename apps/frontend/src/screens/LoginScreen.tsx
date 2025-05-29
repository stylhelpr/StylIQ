import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  Linking,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';

const windowHeight = Dimensions.get('window').height;

type Props = {
  email: string;
  onGoogleLogin: () => void;
  onFaceIdLogin: () => void;
  onPasswordLogin: () => void;
  onLoginSuccess: () => void;
};

export default function LoginScreen({
  email,
  onGoogleLogin,
  onFaceIdLogin,
  onPasswordLogin,
  onLoginSuccess,
}: Props) {
  const {theme} = useAppTheme();

  // mask email for privacy, e.g. giff***ike@hotmail.com
  const maskEmail = (email: string) => {
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    const start = user.slice(0, 4);
    const end = user.slice(-2);
    return `${start}***${end}@${domain}`;
  };

  return (
    <ImageBackground
      source={require('../assets/images/free1.jpg')}
      style={styles.background}
      resizeMode="cover"
      //   blurRadius={3}
    >
      <View style={styles.container}>
        {/* Logo + Subtitle */}
        <View style={styles.logoContainer}>
          <Text style={[styles.logoText, {color: theme.colors.foreground}]}>
            StylIQ
          </Text>
          <Text style={[styles.subtitle, {color: theme.colors.foreground}]}>
            Your personal fashion concierge
          </Text>
        </View>

        {/* Google Button */}
        <TouchableOpacity
          style={[
            styles.googleButton,
            {backgroundColor: theme.colors.background},
          ]}
          onPress={onGoogleLogin}
          activeOpacity={0.8}>
          <Text style={styles.googleButtonText}>G</Text>
        </TouchableOpacity>

        {/* Masked Email */}
        <Text
          style={[
            styles.emailText,
            {
              color: 'white',
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            },
          ]}>
          {email ? maskEmail(email) : 'giffinmike@hotmail.con'}
        </Text>

        {/* Face ID Button */}
        <TouchableOpacity
          style={[
            styles.faceIdButton,
            {backgroundColor: theme.colors.background},
          ]}
          onPress={onFaceIdLogin}
          activeOpacity={0.8}>
          <Text style={styles.faceIdButtonText}>Face ID</Text>
        </TouchableOpacity>

        {/* Password Login */}
        <TouchableOpacity onPress={onPasswordLogin}>
          <Text style={[styles.passwordLogin, {color: theme.colors.primary}]}>
            Password login
          </Text>
        </TouchableOpacity>

        {/* Terms and Privacy */}
        <View style={styles.termsContainer}>
          <Text style={[styles.termsText, {color: theme.colors.foreground}]}>
            By continuing, you agree to the{' '}
            <Text
              style={styles.linkText}
              onPress={() => Linking.openURL('https://www.anker.com/privacy')}>
              Anker Innovations Privacy Policy
            </Text>
            ,{' '}
            <Text
              style={styles.linkText}
              onPress={() => Linking.openURL('https://www.anker.com/terms')}>
              Terms of Use
            </Text>
            .
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    // height: windowHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    marginTop: 4,
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
  },
  emailText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 40,
    zIndex: 1000,
    elevation: 10,
  },
  faceIdButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  faceIdButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  passwordLogin: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 40,
    textDecorationLine: 'underline',
  },
  termsContainer: {
    paddingHorizontal: 20,
  },
  termsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#007AFF', // link blue color
    textDecorationLine: 'underline',
  },
});
