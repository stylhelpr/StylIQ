import React from 'react';
import {View, StyleSheet, StyleProp, ViewStyle} from 'react-native';
import {BlurView} from '@react-native-community/blur';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function FrostedCard({children, style}: Props) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.fallback} />
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={20}
        reducedTransparencyFallbackColor="rgba(255,255,255,0.05)"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  content: {
    padding: 16,
  },
});
