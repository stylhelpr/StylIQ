/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {SafeAreaView} from 'react-native-safe-area-context';

type Props = {
  children?: React.ReactNode;
  style?: ViewStyle;
};

export default function FrostedCard({children, style}: Props) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    wrapper: {
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: 'transparent',
      marginBottom: 16,
    },
    fallback: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    content: {
      padding: 16,
    },
  });

  return (
    <View
      style={[
        {
          borderRadius: tokens.borderRadius['2xl'],
          overflow: 'hidden',
          shadowColor: theme.shadow,
          shadowOpacity: 0.15,
          shadowRadius: 8,
          backgroundColor: theme.card,
        },
        style,
      ]}>
      <BlurView
        style={{...StyleSheet.absoluteFill}}
        blurType={theme.isDark ? 'dark' : 'light'}
        blurAmount={20}
        reducedTransparencyFallbackColor={theme.background}
      />
      {children}
    </View>
  );
}

//////////////////

// import React from 'react';
// import {View, StyleSheet, StyleProp, ViewStyle} from 'react-native';
// import {BlurView} from '@react-native-community/blur';

// type Props = {
//   children: React.ReactNode;
//   style?: StyleProp<ViewStyle>;
// };

// export default function FrostedCard({children, style}: Props) {
//   return (
//     <View style={[styles.wrapper, style]}>
//       <View style={styles.fallback} />
//       <BlurView
//         style={StyleSheet.absoluteFill}
//         blurType="light"
//         blurAmount={20}
//         reducedTransparencyFallbackColor="rgba(255,255,255,0.05)"
//       />
//       <View style={styles.content}>{children}</View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {
//     borderRadius: 20,
//     overflow: 'hidden',
//     backgroundColor: 'transparent',
//     marginBottom: 16,
//   },
//   fallback: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(255,255,255,0.04)',
//   },
//   content: {
//     padding: 16,
//   },
// });
