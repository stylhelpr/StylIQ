// components/GlassCard/GlassCard.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';

type Props = {
  children: React.ReactNode;
  image: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export default function GlassCard({
  children,
  image,
  height = 160,
  style,
  imageStyle,
}: Props) {
  return (
    <View style={[styles.wrapper, {height}, style]}>
      <Image
        source={{uri: image}}
        style={[StyleSheet.absoluteFill, imageStyle]}
        resizeMode="cover"
      />
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={20}
        reducedTransparencyFallbackColor="rgba(255,255,255,0.06)"
      />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
    width: '100%',
  },
  inner: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
