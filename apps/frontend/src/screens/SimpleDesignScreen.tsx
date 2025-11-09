import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import * as Animatable from 'react-native-animatable';
import {
  Canvas,
  Circle,
  SweepGradient,
  RadialGradient,
  vec,
  BlurMask,
} from '@shopify/react-native-skia';
import {useAppTheme} from '../context/ThemeContext';
import {SafeAreaView} from 'react-native-safe-area-context';
import {moderateScale, fontScale} from '../utils/scale';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

const bgImage = require('../assets/images/desktop-3.jpg');
const {width, height} = Dimensions.get('window');

export default function CreativeVoiceScreen() {
  const {theme} = useAppTheme();

  const tags = [
    {label: 'retro lights', top: height * 0.33, left: width * 0.25},
    {label: 'glass', top: height * 0.38, left: width * 0.45},
    {label: 'dark sphere', top: height * 0.36, left: width * 0.68},
    {label: 'motion', top: height * 0.47, left: width * 0.32},
    {label: 'flare', top: height * 0.5, left: width * 0.6},
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, {backgroundColor: theme.colors.background}]}>
      <ImageBackground
        source={bgImage}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        blurRadius={0}>
        {/* <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={0}
          // reducedTransparencyFallbackColor="white"
        /> */}

        <Canvas style={StyleSheet.absoluteFill}>
          <RadialGradient
            c={vec(width / 2, height / 2)}
            r={width * 0.8}
            colors={['rgba(150,120,255,0.25)', 'rgba(255,255,255,0.05)']}
          />
        </Canvas>

        {/* ✨ Floating Tags (accurate positioning) */}
        {tags.map((t, i) => (
          <Animatable.View
            key={t.label}
            animation="pulse"
            iterationCount="infinite"
            delay={i * 600}
            easing="ease-in-out"
            duration={4500}
            style={[
              styles.tagBubble,
              {top: t.top, left: t.left, position: 'absolute'},
            ]}>
            <Text style={styles.tagText}>{t.label}</Text>
          </Animatable.View>
        ))}
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagBubble: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  tagText: {
    color: '#020000ff',
    fontWeight: '500',
    fontSize: fontScale(14),
  },
  orbContainer: {
    position: 'absolute',
    bottom: height * 0.12,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    position: 'absolute',
    top: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerMic: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  micIcon: {
    fontSize: fontScale(28),
    color: '#fff',
  },
});
