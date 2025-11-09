import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

interface Props {
  children?: React.ReactNode;
  style?: ViewStyle;
  tintColor?: string;
}

/**
 * 🔮 ThickLiquidGlassWrapper
 * Use this to wrap *any* component or content in a deep, refractive
 * 3D-style liquid glass container.
 *
 * Example:
 * <ThickLiquidGlassWrapper>
 *   <Text>Glass Button</Text>
 * </ThickLiquidGlassWrapper>
 */
export default function ThickLiquidGlassWrapper({
  children,
  style,
  tintColor = 'rgba(255,255,255,0.35)',
}: Props) {
  if (!isLiquidGlassSupported) {
    return <View style={[styles.fallback, style]}>{children}</View>;
  }

  return (
    <View style={[styles.glassWrapper, style]}>
      {/* Back layer for refractive depth */}
      <LiquidGlassView
        style={[styles.glassLayer, {opacity: 0.55}]}
        effect="clear"
        tintColor={tintColor}
        colorScheme="system"
      />
      {/* Front layer for clarity and highlights */}
      <LiquidGlassView
        style={[styles.glassLayer, {position: 'absolute', opacity: 0.95}]}
        effect="clear"
        tintColor="rgba(255,255,255,0.25)"
        colorScheme="system">
        {children}
      </LiquidGlassView>
      {/* Subtle inner rim + glow */}
      <View style={styles.innerHighlight} pointerEvents="none" />
      <View style={styles.edgeGlow} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  glassWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 8},
  },
  glassLayer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  innerHighlight: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  edgeGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#66ccff',
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
});
