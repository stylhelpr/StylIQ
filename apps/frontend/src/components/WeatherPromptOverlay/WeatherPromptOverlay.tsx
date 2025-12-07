import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {moderateScale, fontScale} from '../../utils/scale';

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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: moderateScale(120),
      alignSelf: 'center',
      width: '98%',
      borderRadius: 32,
      borderColor: theme.colors.foreground,
      borderWidth: tokens.borderWidth.hairline,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    blur: {
      backgroundColor:
        theme.mode === 'dark'
          ? 'rgba(18, 18, 18, 0.08)'
          : 'rgba(255, 255, 255, 0)', // translucent tint
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: moderateScale(16),
      paddingHorizontal: moderateScale(20),
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: moderateScale(8),
    },
    right: {
      alignItems: 'flex-end',
    },
    city: {
      fontSize: fontScale(tokens.fontSize.xl),
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    temp: {
      fontSize: fontScale(tokens.fontSize['4xl']),
      fontWeight: '500',
    },
    condition: {
      fontSize: fontScale(tokens.fontSize.sm),
      fontWeight: '500',
      opacity: 0.8,
      textTransform: 'capitalize',
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
  }, [visible, fadeAnim, onHide]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
      <BlurView
        style={[
          styles.blur,
          {
            backgroundColor:
              theme.mode === 'dark'
                ? 'rgba(18,18,18,0.25)'
                : 'rgba(255, 255, 255, 0.01)',
          },
        ]}
        blurType={theme.mode === 'dark' ? 'dark' : 'light'}
        blurAmount={25}
        blurRadius={25}
        reducedTransparencyFallbackColor={
          theme.mode === 'dark' ? '#111' : '#fff'
        }>
        <View style={styles.row}>
          <View style={styles.left}>
            <Icon name="location-on" size={20} color={theme.colors.primary} />
            <Text style={[styles.city, {color: theme.colors.foreground}]}>
              {city}
            </Text>
          </View>

          <View style={styles.right}>
            <Text style={[styles.temp, {color: theme.colors.foreground}]}>
              {Math.round(temperature)}°
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

/////////////////

// import React, {useEffect, useRef} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import {BlurView} from '@react-native-community/blur';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {tokens} from '../../styles/tokens/tokens';
// import {moderateScale, fontScale} from '../../utils/scale';

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
//   const fadeAnim = useRef(new Animated.Value(0)).current;

//   const styles = StyleSheet.create({
//     container: {
//       position: 'absolute',
//       top: moderateScale(120),
//       alignSelf: 'center',
//       width: '98%',
//       borderRadius: 28,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.2,
//       shadowRadius: 12,
//       elevation: 8,
//     },
//     blur: {
//       borderRadius: 28,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.foreground,
//       backgroundColor:
//         theme.mode === 'dark'
//           ? 'rgba(18, 18, 18, 0.08)'
//           : 'rgba(255, 255, 255, 0)', // translucent tint
//     },
//     row: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingVertical: moderateScale(16),
//       paddingHorizontal: moderateScale(20),
//     },
//     left: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: moderateScale(8),
//     },
//     right: {
//       alignItems: 'flex-end',
//     },
//     city: {
//       fontSize: fontScale(tokens.fontSize.xl),
//       fontWeight: '600',
//       letterSpacing: 0.3,
//     },
//     temp: {
//       fontSize: fontScale(tokens.fontSize['4xl']),
//       fontWeight: '500',
//     },
//     condition: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: '500',
//       opacity: 0.8,
//       textTransform: 'capitalize',
//     },
//   });

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
//       }, 126000);

//       return () => clearTimeout(timer);
//     }
//   }, [visible, fadeAnim, onHide]);

//   if (!visible) return null;

//   return (
//     <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
//       <BlurView
//         style={styles.blur}
//         blurType={theme.mode === 'dark' ? 'dark' : 'light'}
//         blurAmount={25}
//         reducedTransparencyFallbackColor={
//           theme.mode === 'dark' ? '#111' : '#fff'
//         }>
//         <View style={styles.row}>
//           <View style={styles.left}>
//             <Icon name="location-on" size={20} color={theme.colors.primary} />
//             <Text style={[styles.city, {color: theme.colors.foreground}]}>
//               {city}
//             </Text>
//           </View>

//           <View style={styles.right}>
//             <Text style={[styles.temp, {color: theme.colors.foreground}]}>
//               {Math.round(temperature)}°
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

//////////////

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

//   const styles = StyleSheet.create({
//     container: {
//       position: 'absolute',
//       top: moderateScale(120),
//       alignSelf: 'center',
//       width: '100%',
//       padding: 18,
//       borderRadius: 32,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.foreground,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 10,
//       elevation: 4,
//     },
//     row: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     left: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: moderateScale(6),
//     },
//     right: {
//       alignItems: 'flex-end',
//     },
//     city: {
//       fontSize: fontScale(tokens.fontSize['xl']),
//       fontWeight: '600',
//     },
//     temp: {
//       fontSize: fontScale(tokens.fontSize['4xl']),
//       fontWeight: '500',
//     },
//     condition: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: '500',
//       opacity: 0.7,
//     },
//   });

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
//       }, 56000);

//       return () => clearTimeout(timer);
//     }
//   }, [visible]);

//   if (!visible) return null;

//   return (
//     <Animated.View
//       style={[
//         styles.container,
//         {opacity: fadeAnim, backgroundColor: theme.colors.surface},
//       ]}>
//       <View style={styles.row}>
//         <View style={styles.left}>
//           <Icon name="location-on" size={18} color={theme.colors.foreground} />
//           <Text style={[styles.city, {color: theme.colors.foreground}]}>
//             {city}
//           </Text>
//         </View>
//         <View style={styles.right}>
//           <Text style={[styles.temp, {color: theme.colors.foreground}]}>
//             {temperature}°
//           </Text>
//           <Text style={[styles.condition, {color: theme.colors.foreground}]}>
//             {condition}
//           </Text>
//         </View>
//       </View>
//     </Animated.View>
//   );
// }

///////////////

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

//   const styles = StyleSheet.create({
//     container: {
//       position: 'absolute',
//       top: moderateScale(120),
//       alignSelf: 'center',
//       width: '100%',
//       padding: 18,

//       borderRadius: 32,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.foreground,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 10,
//       elevation: 4,
//     },
//     row: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     left: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: moderateScale(6),
//     },
//     right: {
//       alignItems: 'flex-end',
//     },
//     city: {
//       fontSize: fontScale(tokens.fontSize['xl']),
//       fontWeight: '600',
//     },
//     temp: {
//       fontSize: fontScale(tokens.fontSize['4xl']),
//       fontWeight: '500',
//     },
//     condition: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: '500',
//       opacity: 0.7,
//     },
//   });

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
//       }, 56000);

//       return () => clearTimeout(timer);
//     }
//   }, [visible]);

//   if (!visible) return null;

//   return (
//     <Animated.View
//       style={[
//         styles.container,
//         {opacity: fadeAnim, backgroundColor: theme.colors.surface},
//       ]}>
//       <View style={styles.row}>
//         <View style={styles.left}>
//           <Icon name="location-on" size={18} color={theme.colors.foreground} />
//           <Text style={[styles.city, {color: theme.colors.foreground}]}>
//             {city}
//           </Text>
//         </View>
//         <View style={styles.right}>
//           <Text style={[styles.temp, {color: theme.colors.foreground}]}>
//             {temperature}°
//           </Text>
//           <Text style={[styles.condition, {color: theme.colors.foreground}]}>
//             {condition}
//           </Text>
//         </View>
//       </View>
//     </Animated.View>
//   );
// }

//////////////////

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

//   const styles = StyleSheet.create({
//     container: {
//       position: 'absolute',
//       top: moderateScale(100),
//       alignSelf: 'center',
//       width: '90%',
//       borderRadius: 32,
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: 'white',
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 10,
//       elevation: 4,
//     },
//     blur: {
//       paddingVertical: moderateScale(20),
//       paddingHorizontal: moderateScale(16),
//       borderRadius: tokens.borderRadius.xl,
//     },
//     row: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     left: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: moderateScale(6),
//     },
//     right: {
//       alignItems: 'flex-end',
//     },
//     city: {
//       fontSize: fontScale(tokens.fontSize['xl']),
//       fontWeight: '600',
//     },
//     temp: {
//       fontSize: fontScale(tokens.fontSize['4xl']),
//       fontWeight: '500',
//     },
//     condition: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       fontWeight: '500',
//       opacity: 0.7,
//     },
//   });

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
//       }, 6000);

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
