import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

type Props = {
  title: string;
  source: string;
  image?: string;
  onPress: () => void;
};

export default function FeaturedHero({title, source, image, onPress}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    wrap: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4},
    bg: {height: 240, borderRadius: tokens.borderRadius.lg, overflow: 'hidden'},
    bgImg: {
      borderRadius: tokens.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    textBox: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 14,
    },
    source: {
      color: theme.colors.buttonText1,
      fontWeight: '700',
      fontSize: 13,
      marginBottom: 6,
    },
    title: {
      color: theme.colors.buttonText1,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '800',
    },
  });

  return (
    <AppleTouchFeedback
      onPress={onPress}
      hapticStyle="impactLight"
      style={styles.wrap}>
      <ImageBackground
        source={image ? {uri: image} : undefined}
        style={styles.bg}
        imageStyle={styles.bgImg}>
        <View style={styles.overlay} />
        <View style={styles.textBox}>
          <Text style={styles.source}>{source}</Text>
          <Text numberOfLines={3} style={styles.title}>
            {title}
          </Text>
        </View>
      </ImageBackground>
    </AppleTouchFeedback>
  );
}

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
