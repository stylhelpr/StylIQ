// src/components/VoiceOverlay/VoiceOverlay.tsx
// -----------------------------------------------------------------------------
// 💜 VoiceOverlay — Purple Pulse Edition (Global Reactive Version)
// -----------------------------------------------------------------------------
// • Subscribes to VoiceBus for live speech + recording updates
// • Persists across navigation transitions
// • Glowing purple pulse and ripple ring
// • Subtle frosted mic bubble
// -----------------------------------------------------------------------------

import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'react-native-haptic-feedback';
import {useAppTheme} from '../../context/ThemeContext';
import {moderateScale, fontScale} from '../../utils/scale';
import {tokens} from '../../styles/tokens/tokens';
import {VoiceBus} from '../../utils/VoiceUtils/VoiceBus';

const {width} = Dimensions.get('window');

export const VoiceOverlay: React.FC = () => {
  const {theme} = useAppTheme();

  // 🔹 Global reactive state
  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');

  // 🔹 Animations
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  const pulseColor = '#9000ffff';
  const ringColor = '#b26bff';

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    },
    glow: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      shadowOpacity: 0.6,
      shadowRadius: 30,
    },
    ring: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      borderWidth: 2,
    },
    inner: {
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
    },
    micBlur: {
      width: 90,
      height: 90,
      borderRadius: 45,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    text: {
      marginTop: moderateScale(tokens.spacing.xsm),
      fontSize: fontScale(tokens.fontSize.lg),
      fontWeight: tokens.fontWeight.medium,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
  });

  // 🧠 Subscribe to global VoiceBus events
  useEffect(() => {
    const handleStatus = ({speech, isRecording}: any) => {
      setPartialText(speech);
      setIsListening(isRecording);
    };
    VoiceBus.on('status', handleStatus);
    return () => {
      VoiceBus.off('status', handleStatus);
    };
  }, []);

  // 💫 Animate overlay appearance and pulse
  useEffect(() => {
    if (isListening) {
      Haptics.trigger('impactMedium');
      Animated.parallel([
        Animated.spring(fade, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 120,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 0,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(ring, {
              toValue: 1,
              duration: 2400,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(ring, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]).start();
    } else {
      Haptics.trigger('impactLight');
      Animated.timing(fade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      pulse.stopAnimation();
      ring.stopAnimation();
    }
  }, [isListening]);

  // 🔹 Interpolations
  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });
  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });
  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity: fade,
        },
      ]}>
      {/* 💜 Pulsing purple glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: pulseColor,
            transform: [{scale: glowScale}],
            opacity: glowOpacity,
            shadowColor: pulseColor,
          },
        ]}
      />

      {/* 💫 Expanding purple ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: ringColor,
            transform: [{scale: ringScale}],
            opacity: ringOpacity,
          },
        ]}
      />

      {/* 🎙 Center frosted mic bubble */}
      <View style={styles.inner}>
        {Platform.OS === 'ios' ? (
          <BlurView
            style={styles.micBlur}
            blurType={theme.mode === 'dark' ? 'dark' : 'light'}
            blurAmount={25}
            reducedTransparencyFallbackColor={
              theme.mode === 'dark'
                ? 'rgba(80,0,130,0.4)'
                : 'rgba(161, 0, 254, 1)'
            }>
            <Icon
              name="graphic-eq"
              size={46}
              color="white"
              style={{opacity: 0.95}}
            />
          </BlurView>
        ) : (
          <View
            style={[
              styles.micBlur,
              {
                backgroundColor:
                  theme.mode === 'dark'
                    ? 'rgba(80,0,130,0.25)'
                    : 'rgba(210,150,255,0.25)',
              },
            ]}>
            <Icon
              name="graphic-eq"
              size={46}
              color={theme.colors.buttonText1}
              style={{opacity: 0.95}}
            />
          </View>
        )}

        {/* 🎧 Live recognized speech text */}
        <Text
          numberOfLines={1}
          style={[
            styles.text,
            {
              color: theme.colors.foreground,
              maxWidth: width * 0.8,
            },
          ]}>
          {isListening
            ? partialText?.length
              ? partialText
              : 'Listening...'
            : ''}
        </Text>
      </View>
    </Animated.View>
  );
};
