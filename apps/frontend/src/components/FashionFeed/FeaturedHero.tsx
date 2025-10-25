import React, {useRef} from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {useResponsive} from '../../hooks/useResponsive';
import {fontScale, moderateScale} from '../../utils/scale';

type Props = {
  title: string;
  source: string;
  image?: string;
  onPress: () => void;
};

const {width} = Dimensions.get('window');

export default function FeaturedHero({title, source, image, onPress}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const scale = useRef(new Animated.Value(1)).current;

  const styles = StyleSheet.create({
    wrap: {
      paddingHorizontal: moderateScale(tokens.spacing.md),
      paddingTop: moderateScale(tokens.spacing.xs),
      paddingBottom: moderateScale(tokens.spacing.nano),
    },
    bgImg: {
      width: '100%',
      height: '100%',
      transform: [{scale: 1}],
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    textBox: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 20,
    },
    source: {
      color: theme.colors.buttonText1,
      fontSize: fontScale(tokens.fontSize.base),
      fontWeight: tokens.fontWeight.bold,
      marginBottom: 8,
      letterSpacing: 0.5,
      opacity: 0.9,
    },
    title: {
      color: theme.colors.buttonText1,
      fontSize: fontScale(tokens.fontSize['2xl']),
      lineHeight: 30,
      fontWeight: tokens.fontWeight.extraBold,
    },
  });

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 25,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 10,
    }).start();
  };

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={800}
      delay={200}
      useNativeDriver>
      <Animated.View style={{transform: [{scale}]}}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}>
          <View style={styles.wrap}>
            <Animated.View style={globalStyles.bgContainer1}>
              <ImageBackground
                source={image ? {uri: image} : undefined}
                style={styles.bgImg}
                imageStyle={styles.bgImg}
                resizeMode="cover">
                <Animatable.View
                  animation="fadeIn"
                  duration={800}
                  delay={300}
                  style={styles.overlay}
                />
                <Animatable.View
                  animation="fadeInUp"
                  delay={500}
                  duration={800}
                  style={styles.textBox}>
                  <Text style={styles.source}>{source}</Text>
                  <Text numberOfLines={3} style={styles.title}>
                    {title}
                  </Text>
                </Animatable.View>
              </ImageBackground>
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>
    </Animatable.View>
  );
}

//////////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   Text,
//   ImageBackground,
//   StyleSheet,
//   Animated,
//   Dimensions,
//   Pressable,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   title: string;
//   source: string;
//   image?: string;
//   onPress: () => void;
// };

// const {width} = Dimensions.get('window');

// export default function FeaturedHero({title, source, image, onPress}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const scale = useRef(new Animated.Value(1)).current;

//   const styles = StyleSheet.create({
//     wrap: {
//       paddingHorizontal: 16,
//       paddingTop: 8,
//       paddingBottom: 4,
//     },
//     bgContainer: {
//       height: 260,
//       borderRadius: tokens.borderRadius.xl,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.35,
//       shadowRadius: 20,
//       shadowOffset: {width: 0, height: 10},
//       elevation: 12,
//       backgroundColor: theme.colors.surface,
//       transform: [{scale: 1}],
//     },
//     bgImg: {
//       width: '100%',
//       height: '100%',
//       borderRadius: tokens.borderRadius.xl,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//       transform: [{scale: 1}],
//     },
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.25)',
//     },
//     textBox: {
//       position: 'absolute',
//       left: 18,
//       right: 18,
//       bottom: 20,
//     },
//     source: {
//       color: theme.colors.buttonText1,
//       fontWeight: '700',
//       fontSize: 16,
//       marginBottom: 8,
//       letterSpacing: 0.5,
//       opacity: 0.9,
//     },
//     title: {
//       color: theme.colors.buttonText1,
//       fontSize: 24,
//       lineHeight: 30,
//       fontWeight: '800',
//     },
//   });

//   const handlePressIn = () => {
//     Animated.spring(scale, {
//       toValue: 0.97,
//       useNativeDriver: true,
//       speed: 25,
//       bounciness: 8,
//     }).start();
//   };

//   const handlePressOut = () => {
//     Animated.spring(scale, {
//       toValue: 1,
//       useNativeDriver: true,
//       speed: 25,
//       bounciness: 10,
//     }).start();
//   };

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={800}
//       delay={200}
//       useNativeDriver>
//       <Animated.View style={{transform: [{scale}]}}>
//         <Pressable
//           onPressIn={handlePressIn}
//           onPressOut={handlePressOut}
//           onPress={onPress}>
//           <View style={styles.wrap}>
//             <Animated.View style={styles.bgContainer}>
//               <ImageBackground
//                 source={image ? {uri: image} : undefined}
//                 style={styles.bgImg}
//                 imageStyle={styles.bgImg}
//                 resizeMode="cover">
//                 <Animatable.View
//                   animation="fadeIn"
//                   duration={800}
//                   delay={300}
//                   style={styles.overlay}
//                 />
//                 <Animatable.View
//                   animation="fadeInUp"
//                   delay={500}
//                   duration={800}
//                   style={styles.textBox}>
//                   <Text style={styles.source}>{source}</Text>
//                   <Text numberOfLines={3} style={styles.title}>
//                     {title}
//                   </Text>
//                 </Animatable.View>
//               </ImageBackground>
//             </Animated.View>
//           </View>
//         </Pressable>
//       </Animated.View>
//     </Animatable.View>
//   );
// }

//////////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   ImageBackground,
//   TouchableOpacity,
//   StyleSheet,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   title: string;
//   source: string;
//   image?: string;
//   onPress: () => void;
// };

// export default function FeaturedHero({title, source, image, onPress}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     wrap: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4},
//     bg: {height: 240, borderRadius: tokens.borderRadius.lg, overflow: 'hidden'},
//     bgImg: {
//       borderRadius: tokens.borderRadius.lg,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.25)',
//     },
//     textBox: {
//       position: 'absolute',
//       left: 14,
//       right: 14,
//       bottom: 14,
//     },
//     source: {
//       color: theme.colors.foreground3,
//       fontWeight: '700',
//       fontSize: 13,
//       marginBottom: 6,
//     },
//     title: {
//       color: theme.colors.foreground,
//       fontSize: 22,
//       lineHeight: 28,
//       fontWeight: '800',
//     },
//   });

//   return (
//     <AppleTouchFeedback
//       onPress={onPress}
//       hapticStyle="impactLight"
//       style={styles.wrap}>
//       <ImageBackground
//         source={image ? {uri: image} : undefined}
//         style={styles.bg}
//         imageStyle={styles.bgImg}>
//         <View style={styles.overlay} />
//         <View style={styles.textBox}>
//           <Text style={styles.source}>{source}</Text>
//           <Text numberOfLines={3} style={styles.title}>
//             {title}
//           </Text>
//         </View>
//       </ImageBackground>
//     </AppleTouchFeedback>
//   );
// }

//////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   ImageBackground,
//   TouchableOpacity,
//   StyleSheet,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// type Props = {
//   title: string;
//   source: string;
//   image?: string;
//   onPress: () => void;
// };

// export default function FeaturedHero({title, source, image, onPress}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     wrap: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4},
//     bg: {height: 240, borderRadius: 16, overflow: 'hidden'},
//     bgImg: {
//       borderRadius: 16,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.25)',
//     },
//     textBox: {
//       position: 'absolute',
//       left: 14,
//       right: 14,
//       bottom: 14,
//     },
//     source: {
//       color: theme.colors.foreground3,
//       fontWeight: '700',
//       fontSize: 13,
//       marginBottom: 6,
//     },
//     title: {
//       color: theme.colors.foreground,
//       fontSize: 22,
//       lineHeight: 28,
//       fontWeight: '800',
//     },
//   });

//   return (
//     <TouchableOpacity
//       onPress={onPress}
//       activeOpacity={0.92}
//       style={styles.wrap}>
//       <ImageBackground
//         source={image ? {uri: image} : undefined}
//         style={styles.bg}
//         imageStyle={styles.bgImg}>
//         <View style={styles.overlay} />
//         <View style={styles.textBox}>
//           <Text style={styles.source}>{source}</Text>
//           <Text numberOfLines={3} style={styles.title}>
//             {title}
//           </Text>
//         </View>
//       </ImageBackground>
//     </TouchableOpacity>
//   );
// }

///////////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   ImageBackground,
//   TouchableOpacity,
//   StyleSheet,
// } from 'react-native';

// type Props = {
//   title: string;
//   source: string;
//   image?: string;
//   onPress: () => void;
// };

// export default function FeaturedHero({title, source, image, onPress}: Props) {
//   return (
//     <TouchableOpacity
//       onPress={onPress}
//       activeOpacity={0.92}
//       style={styles.wrap}>
//       <ImageBackground
//         source={image ? {uri: image} : undefined}
//         style={styles.bg}
//         imageStyle={styles.bgImg}>
//         <View style={styles.overlay} />
//         <View style={styles.textBox}>
//           <Text style={styles.source}>{source}</Text>
//           <Text numberOfLines={3} style={styles.title}>
//             {title}
//           </Text>
//         </View>
//       </ImageBackground>
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   wrap: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4},
//   bg: {height: 240, borderRadius: 16, overflow: 'hidden'},
//   bgImg: {borderRadius: 16},
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.25)',
//   },
//   textBox: {
//     position: 'absolute',
//     left: 14,
//     right: 14,
//     bottom: 14,
//   },
//   source: {
//     color: 'rgba(255,255,255,0.85)',
//     fontWeight: '700',
//     fontSize: 13,
//     marginBottom: 6,
//   },
//   title: {
//     color: '#fff',
//     fontSize: 22,
//     lineHeight: 28,
//     fontWeight: '800',
//   },
// });
