// <LiquidGlassView
//   style={[styles.glassPill, {opacity: 0.55}]}
//   effect="clear"
//   tintColor="rgba(255,255,255,0.35)"
//   colorScheme="system"
// />

// {/* Foreground layer for clarity + highlights */}
// <LiquidGlassView
//   style={[styles.glassPill, {position: 'absolute', opacity: 0.95}]}
//   effect="clear"
//   tintColor="rgba(255,255,255,0.25)"
//   colorScheme="system">
//   {GlassContent}
// </LiquidGlassView>

///////////////////

import React from 'react';
import {Text, PlatformColor, StyleSheet} from 'react-native';
import {
  LiquidGlassView,
  LiquidGlassContainerView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';

// 🧊 Apple-grade Liquid Glass demo component
export const RealLiquidGlass = () => {
  console.log('🧊 LiquidGlass supported?', isLiquidGlassSupported);

  return (
    <LiquidGlassView
      style={[
        styles.glassCard,
        !isLiquidGlassSupported && styles.fallbackGlass,
      ]}
      interactive
      effect="clear"
      tintColor="rgba(255,255,255,0.25)"
      colorScheme="system">
      <Text style={styles.labelText}>
        {isLiquidGlassSupported
          ? '✨ Real Liquid Glass Active ✨'
          : '💧 Fallback Layer'}
      </Text>
    </LiquidGlassView>
  );
};

// 🧩 Example with multiple merging glass elements
export const MergingGlassElements = () => {
  return (
    <LiquidGlassContainerView spacing={20}>
      <LiquidGlassView style={styles.circleGlass} interactive effect="clear" />
      <LiquidGlassView style={styles.circleGlass} interactive effect="clear" />
    </LiquidGlassContainerView>
  );
};

// 🎨 Styles
const styles = StyleSheet.create({
  glassCard: {
    width: 220,
    height: 120,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackGlass: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  labelText: {
    color: PlatformColor('labelColor'),
    fontWeight: '600',
    fontSize: 16,
  },
  circleGlass: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

////////////////

// import React from 'react';
// import {Text, PlatformColor, StyleSheet} from 'react-native';
// import {
//   LiquidGlassView,
//   LiquidGlassContainerView,
//   isLiquidGlassSupported,
// } from '@callstack/liquid-glass';

// // 🧊 Apple-grade Liquid Glass demo component
// export const RealLiquidGlass = () => {
//   console.log('🧊 LiquidGlass supported?', isLiquidGlassSupported);

//   return (
//     <LiquidGlassView
//       style={[
//         styles.glassCard,
//         !isLiquidGlassSupported && styles.fallbackGlass,
//       ]}
//       interactive
//       effect="clear"
//       tintColor="rgba(255,255,255,0.25)"
//       colorScheme="system">
//       <Text style={styles.labelText}>
//         {isLiquidGlassSupported
//           ? '✨ Real Liquid Glass Active ✨'
//           : '💧 Fallback Layer'}
//       </Text>
//     </LiquidGlassView>
//   );
// };

// // 🧩 Example with multiple merging glass elements
// export const MergingGlassElements = () => {
//   return (
//     <LiquidGlassContainerView spacing={20}>
//       <LiquidGlassView style={styles.circleGlass} interactive effect="clear" />
//       <LiquidGlassView style={styles.circleGlass} interactive effect="clear" />
//     </LiquidGlassContainerView>
//   );
// };

// // 🎨 Styles
// const styles = StyleSheet.create({
//   glassCard: {
//     width: 220,
//     height: 120,
//     borderRadius: 24,
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 16,
//   },
//   fallbackGlass: {
//     backgroundColor: 'rgba(255,255,255,0.4)',
//   },
//   labelText: {
//     color: PlatformColor('labelColor'),
//     fontWeight: '600',
//     fontSize: 16,
//   },
//   circleGlass: {
//     width: 100,
//     height: 100,
//     borderRadius: 50,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });
