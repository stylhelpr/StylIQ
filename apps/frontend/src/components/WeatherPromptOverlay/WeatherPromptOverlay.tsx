// src/components/WeatherPromptOverlay.tsx
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {moderateScale, fontScale} from '../../utils/scale';
import Icon from 'react-native-vector-icons/MaterialIcons';

type Props = {
  city: string;
  temperature: number;
  condition: string;
  visible: boolean;
  onHide: () => void;
};

export default function WeatherPromptOverlay({
  city,
  temperature,
  condition,
  visible,
  onHide,
}: Props) {
  const {theme} = useAppTheme();
  const fadeAnim = new Animated.Value(0);

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: moderateScale(100),
      alignSelf: 'center',
      width: '90%',
      borderRadius: 32,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: 'white',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 4,
    },
    blur: {
      paddingVertical: moderateScale(20),
      paddingHorizontal: moderateScale(16),
      borderRadius: tokens.borderRadius.xl,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: moderateScale(6),
    },
    right: {
      alignItems: 'flex-end',
    },
    city: {
      fontSize: fontScale(tokens.fontSize['xl']),
      fontWeight: '600',
    },
    temp: {
      fontSize: fontScale(tokens.fontSize['4xl']),
      fontWeight: '500',
    },
    condition: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: '500',
      opacity: 0.7,
    },
  });

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onHide());
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
      <BlurView
        style={styles.blur}
        blurType={theme.mode === 'dark' ? 'dark' : 'light'}
        blurAmount={20}
        reducedTransparencyFallbackColor={
          theme.mode === 'dark' ? '#111' : '#fff'
        }>
        <View style={styles.row}>
          <View style={styles.left}>
            <Icon name="location-on" size={18} color={theme.colors.primary} />
            <Text style={[styles.city, {color: theme.colors.foreground}]}>
              {city}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={[styles.temp, {color: theme.colors.foreground}]}>
              {temperature}°
            </Text>
            <Text style={[styles.condition, {color: theme.colors.foreground}]}>
              {condition}
            </Text>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
}

///////////////////////

// // src/components/WeatherPromptOverlay.tsx
// import React, {useEffect, useState} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import {useAppTheme} from '../../context/ThemeContext';
// import {tokens} from '../../styles/tokens/tokens';
// import {moderateScale, fontScale} from '../../utils/scale';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   city: string;
//   temperature: number;
//   condition: string;
//   visible: boolean;
//   onHide: () => void;
// };

// export default function WeatherPromptOverlay({
//   city,
//   temperature,
//   condition,
//   visible,
//   onHide,
// }: Props) {
//   const {theme} = useAppTheme();
//   const fadeAnim = new Animated.Value(0);

//   useEffect(() => {
//     if (visible) {
//       Animated.timing(fadeAnim, {
//         toValue: 1,
//         duration: 300,
//         useNativeDriver: true,
//       }).start();

//       const timer = setTimeout(() => {
//         Animated.timing(fadeAnim, {
//           toValue: 0,
//           duration: 300,
//           useNativeDriver: true,
//         }).start(() => onHide());
//       }, 14000);

//       return () => clearTimeout(timer);
//     }
//   }, [visible]);

//   if (!visible) return null;

//   return (
//     <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
//       <BlurView
//         style={styles.blur}
//         blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//         blurAmount={20}
//         reducedTransparencyFallbackColor={
//           theme.mode === 'dark' ? '#111' : '#fff'
//         }>
//         <View style={styles.row}>
//           <View style={styles.left}>
//             <Icon name="location-on" size={18} color={theme.colors.primary} />
//             <Text style={[styles.city, {color: theme.colors.foreground}]}>
//               {city}
//             </Text>
//           </View>
//           <View style={styles.right}>
//             <Text style={[styles.temp, {color: theme.colors.foreground}]}>
//               {temperature}°
//             </Text>
//             <Text style={[styles.condition, {color: theme.colors.foreground}]}>
//               {condition}
//             </Text>
//           </View>
//         </View>
//       </BlurView>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     position: 'absolute',
//     top: moderateScale(60),
//     alignSelf: 'center',
//     width: '90%',
//     borderRadius: tokens.borderRadius.xl,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOpacity: 0.15,
//     shadowRadius: 10,
//     elevation: 4,
//   },
//   blur: {
//     paddingVertical: moderateScale(12),
//     paddingHorizontal: moderateScale(16),
//     borderRadius: tokens.borderRadius.xl,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   left: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: moderateScale(6),
//   },
//   right: {
//     alignItems: 'flex-end',
//   },
//   city: {
//     fontSize: fontScale(tokens.fontSize.md),
//     fontWeight: '600',
//   },
//   temp: {
//     fontSize: fontScale(tokens.fontSize.xl),
//     fontWeight: '700',
//   },
//   condition: {
//     fontSize: fontScale(tokens.fontSize.sm),
//     fontWeight: '500',
//     opacity: 0.7,
//   },
// });
