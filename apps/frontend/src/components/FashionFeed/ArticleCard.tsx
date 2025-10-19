import React, {useRef} from 'react';
import {View, Text, Image, StyleSheet, Animated, Pressable} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

type Props = {
  title: string;
  source: string;
  onPress: () => void;
  image?: string;
  time?: string;
  index?: number; // optional index for staggered animation
};

export default function ArticleCard({
  title,
  source,
  onPress,
  image,
  time,
  index = 0,
}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const scale = useRef(new Animated.Value(1)).current;

  const styles = StyleSheet.create({
    row: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      marginBottom: 10,
      borderRadius: tokens.borderRadius.lg,
      borderWidth: tokens.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
      // shadowColor: '#000',
      // shadowOpacity: 0.3,
      // shadowRadius: 14,
      // shadowOffset: {width: 0, height: 8},
      elevation: 10,
      transform: [{scale: 1}],
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      opacity: 0.9,
    },
    source: {
      color: theme.colors.foreground3,
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dot: {marginHorizontal: 6, color: 'rgba(255,255,255,0.35)'},
    time: {color: theme.colors.foreground2, fontSize: 12},
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
      color: theme.colors.foreground,
      fontSize: 17,
      lineHeight: 23,
      fontWeight: '700',
      marginRight: 20,
    },
    image: {
      width: 120,
      height: 120,
      borderRadius: 14,
      marginTop: -10,
      transform: [{scale: 1}],
    },
    imagePlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.06)',
      marginTop: -10,
    },
  });

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
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
      duration={650}
      delay={index * 120}
      useNativeDriver>
      <Animated.View style={{transform: [{scale}]}}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}>
          <View style={styles.row}>
            <View style={styles.meta}>
              <Text style={styles.source}>{source}</Text>
              {time ? <Text style={styles.dot}>•</Text> : null}
              {time ? <Text style={styles.time}>{time}</Text> : null}
            </View>

            <View style={styles.content}>
              <Text numberOfLines={3} style={styles.title}>
                {title}
              </Text>
              {image ? (
                <Animatable.Image
                  source={{uri: image}}
                  style={styles.image}
                  animation="zoomIn"
                  duration={900}
                  delay={index * 150 + 250}
                  useNativeDriver
                />
              ) : (
                <View style={styles.imagePlaceholder} />
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animatable.View>
  );
}

//////////////////

// GRADIENT VERSION BELOW HERE

// import React, {useRef} from 'react';
// import {View, Text, StyleSheet, Animated, Pressable} from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {Surface} from '../../components/Surface/Surface';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   title: string;
//   source: string;
//   onPress: () => void;
//   image?: string;
//   time?: string;
//   index?: number;
// };

// export default function ArticleCard({
//   title,
//   source,
//   onPress,
//   image,
//   time,
//   index = 0,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const scale = useRef(new Animated.Value(1)).current;

//   // 🔁 A/B toggle — flip this to `false` to see the original design
//   const useSurfaceGradient = true;

//   const styles = StyleSheet.create({
//     row: {
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       marginBottom: 10,
//       borderRadius: tokens.borderRadius.lg,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       elevation: 10,
//       transform: [{scale: 1}],
//       overflow: 'hidden',
//       backgroundColor: theme.colors.surface, // fallback color
//     },
//     meta: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 8,
//       opacity: 0.9,
//     },
//     source: {
//       color: theme.colors.foreground3,
//       fontSize: 13,
//       fontWeight: '600',
//       textTransform: 'uppercase',
//       letterSpacing: 0.5,
//     },
//     dot: {marginHorizontal: 6, color: 'rgba(255,255,255,0.35)'},
//     time: {color: theme.colors.foreground2, fontSize: 12},
//     content: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     title: {
//       flex: 1,
//       color: theme.colors.foreground,
//       fontSize: 17,
//       lineHeight: 23,
//       fontWeight: '700',
//       marginRight: 20,
//     },
//     image: {
//       width: 120,
//       height: 120,
//       borderRadius: 14,
//       marginTop: -10,
//       transform: [{scale: 1}],
//     },
//     imagePlaceholder: {
//       width: 120,
//       height: 120,
//       borderRadius: 14,
//       backgroundColor: 'rgba(255,255,255,0.06)',
//       marginTop: -10,
//     },
//   });

//   const handlePressIn = () => {
//     Animated.spring(scale, {
//       toValue: 0.97,
//       useNativeDriver: true,
//       speed: 30,
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

//   const CardContent = () => (
//     <>
//       <View style={styles.meta}>
//         <Text style={styles.source}>{source}</Text>
//         {time ? <Text style={styles.dot}>•</Text> : null}
//         {time ? <Text style={styles.time}>{time}</Text> : null}
//       </View>

//       <View style={styles.content}>
//         <Text numberOfLines={3} style={styles.title}>
//           {title}
//         </Text>
//         {image ? (
//           <Animatable.Image
//             source={{uri: image}}
//             style={styles.image}
//             animation="zoomIn"
//             duration={900}
//             delay={index * 150 + 250}
//             useNativeDriver
//           />
//         ) : (
//           <View style={styles.imagePlaceholder} />
//         )}
//       </View>
//     </>
//   );

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={650}
//       delay={index * 120}
//       useNativeDriver>
//       <Animated.View style={{transform: [{scale}]}}>
//         <Pressable
//           onPressIn={handlePressIn}
//           onPressOut={handlePressOut}
//           onPress={onPress}>
//           {useSurfaceGradient ? (
//             // 🌈 New gradient version
//             <Surface style={styles.row}>
//               <CardContent />
//             </Surface>
//           ) : (
//             // 🎨 Original flat-color version
//             <View style={styles.row}>
//               <CardContent />
//             </View>
//           )}
//         </Pressable>
//       </Animated.View>
//     </Animatable.View>
//   );
// }
