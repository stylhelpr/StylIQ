import React from 'react';
import {StyleSheet, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface GradientWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: string[];
  start?: {x: number; y: number};
  end?: {x: number; y: number};
}

export default function LinearGradientWrapper({
  children,
  style,
  colors = ['#6a11cb', '#2575fc'],
  // colors = ['#eaeaeaff', '#0026ffff'],
  // colors = ['#dfdfdfff', '#84fbffff', '#0026ffff'],
  // colors = ['#000000ff', '#1e1e1eff'],
  start = {x: 0.0, y: 0},
  end = {x: 1, y: 1},
}: GradientWrapperProps) {
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[styles.container, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

///////////////////

// import React from 'react';
// import {StyleSheet, ViewStyle} from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';

// interface GradientWrapperProps {
//   children: React.ReactNode;
//   style?: ViewStyle;
//   colors?: string[];
//   start?: {x: number; y: number};
//   end?: {x: number; y: number};
// }

// export default function LinearGradientWrapper({
//   children,
//   style,
//   colors = ['#6a11cb', '#2575fc'],
//   start = {x: 0, y: 0},
//   end = {x: 1, y: 1},
// }: GradientWrapperProps) {
//   return (
//     <LinearGradient
//       colors={colors}
//       start={start}
//       end={end}
//       style={[styles.container, style]}>
//       {children}
//     </LinearGradient>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });
