import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  FadeInUp,
  FadeOutDown,
  ZoomIn,
  Easing,
} from 'react-native-reanimated';

const AUTO_SCROLL_INTERVAL = 5000; // 5 seconds per image
import {LiquidGlassView} from '@callstack/liquid-glass';
import {useAppTheme} from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {tokens} from '../styles/tokens/tokens';

const {width, height} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  face: {
    position: 'absolute',
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
  },
  image: {width, height},
  focusFrame: {
    position: 'absolute',
    top: '30%',
    left: width * 0.15,
    width: width * 0.7,
    height: width * 0.9,
  },
  corner: {position: 'absolute', width: 40, height: 40, borderColor: 'white'},
  topLeft: {top: 0, left: 0, borderLeftWidth: 2, borderTopWidth: 2},
  topRight: {top: 0, right: 0, borderRightWidth: 2, borderTopWidth: 2},
  bottomLeft: {bottom: 0, left: 0, borderLeftWidth: 2, borderBottomWidth: 2},
  bottomRight: {bottom: 0, right: 0, borderRightWidth: 2, borderBottomWidth: 2},
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  pagination: {
    position: 'absolute',
    bottom: 100,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginHorizontal: 5,
  },
  closeButton: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 10,
    borderRadius: 20,
    padding: 6,
  },
});

const images = [
  require('../assets/images/headshot-3.jpg'),
  require('../assets/images/headshot-6.jpg'),
  require('../assets/images/headshot-2.webp'),
  require('../assets/images/headshot-4.jpg'),
  require('../assets/images/headshot-1.webp'),
  require('../assets/images/headshot-5.jpg'),
];

const textContent = [
  {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
  {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
  {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
  {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
  {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
  {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
];

function CubeFace({img, i, scrollX}: any) {
  const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

  const animatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      scrollX.value,
      inputRange,
      [200, 0, -200],
      Extrapolate.CLAMP,
    );
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [width / 2.2, 0, -width / 2.2],
      Extrapolate.CLAMP,
    );
    return {
      transform: [
        {perspective: width * 1.5},
        {translateX},
        {rotateY: `${rotateY}deg`},
      ],
    };
  });

  const nextIndex = i + 1 < images.length ? i + 1 : 0;
  const nextImage = images[nextIndex];

  return (
    <View key={i} style={{width, height}}>
      <Animated.View style={[styles.face, animatedStyle]}>
        <Image source={img} style={styles.image} resizeMode="cover" />
      </Animated.View>
      <Animated.View
        style={[
          styles.face,
          {
            transform: [
              {perspective: width * 1.5},
              {rotateY: '90deg'},
              {translateX: width / 2},
            ],
          },
        ]}>
        <Image source={nextImage} style={styles.image} resizeMode="cover" />
      </Animated.View>
    </View>
  );
}

export default function ImageCarouselScreen({
  navigate,
}: {
  navigate: (screen: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const {theme} = useAppTheme();

  // Reset auto-scroll timer
  const resetAutoScrollTimer = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
    autoScrollTimer.current = setInterval(() => {
      setIndex(prev => {
        const nextIndex = prev + 1 >= images.length ? 0 : prev + 1;
        scrollViewRef.current?.scrollTo({x: nextIndex * width, animated: true});
        return nextIndex;
      });
    }, AUTO_SCROLL_INTERVAL);
  }, []);

  useEffect(() => {
    StatusBar.setHidden(true);
    resetAutoScrollTimer();
    return () => {
      StatusBar.setHidden(false);
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [resetAutoScrollTimer]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const onScrollEnd = (e: any) => {
    // Reset timer when user manually swipes
    resetAutoScrollTimer();
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  };

  const handleClose = () => {
    navigate('HomeScreen');
  };

  const handleCommunity = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigate('CommunityShowcaseScreen');
  };

  return (
    <View style={styles.container}>
      {/* 🧊 Cube Scroll */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={onScrollEnd}>
        {images.map((img, i) => (
          <CubeFace key={i} img={img} i={i} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      {/* 🔲 Overlay */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* 🔳 Focus frame */}
      {/* <View style={styles.focusFrame} pointerEvents="none">
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View> */}

      {/* 💎 LiquidGlass text area */}
      <LiquidGlassView
        interactive
        effect="clear"
        tintColor="rgba(255, 255, 255, 0)"
        colorScheme="system"
        style={{
          position: 'absolute',
          bottom: 150,
          alignSelf: 'center',
          width: width * 0.9,
          borderRadius: 40,
          paddingVertical: 22,
          paddingHorizontal: 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Animated.View
          key={index}
          entering={FadeInUp.duration(900)
            .delay(100)
            .easing(Easing.out(Easing.exp))}
          exiting={FadeOutDown.duration(400)}
          pointerEvents="none">
          <Animated.Text
            entering={ZoomIn.duration(1000).easing(Easing.out(Easing.exp))}
            style={styles.title}>
            {textContent[index].title}
          </Animated.Text>
          <Text style={styles.subtitle}>{textContent[index].subtitle}</Text>
        </Animated.View>
      </LiquidGlassView>

      {/* ▓ Dots */}
      <View style={styles.pagination} pointerEvents="none">
        {images.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                opacity: i === index ? 1 : 0.3,
                width: i === index ? 30 : 8,
                backgroundColor:
                  i === index ? theme.colors.buttonText1 : '#fff',
              },
            ]}
          />
        ))}
      </View>

      {/* 🔘 Community FAB */}
      <View
        style={{
          position: 'absolute',
          top: 72,
          right: 15,
          zIndex: 999999,
        }}>
        <AppleTouchFeedback onPress={handleCommunity}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.35)',
              borderWidth: tokens.borderWidth.md,
              borderColor: theme.colors.muted,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: {width: 0, height: 4},
            }}>
            <MaterialIcons
              name="people"
              size={22}
              color={theme.colors.buttonText1}
            />
          </View>
        </AppleTouchFeedback>
      </View>

      {/* ❌ Close button */}
      <View
        style={{
          position: 'absolute',

          top: 120,
          right: 15,
          zIndex: 999999,
        }}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={18} color="white" />
        </Pressable>
      </View>
    </View>
  );
}

///////////////

// import React, {useState, useRef, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   Dimensions,
//   Pressable,
//   StatusBar,
// } from 'react-native';
// import Animated, {
//   useSharedValue,
//   useAnimatedScrollHandler,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolate,
//   FadeInUp,
//   FadeOutDown,
//   ZoomIn,
//   Easing,
// } from 'react-native-reanimated';
// import {LiquidGlassView} from '@callstack/liquid-glass';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// const {width, height} = Dimensions.get('window');

// const styles = StyleSheet.create({
//   container: {flex: 1, backgroundColor: '#000'},
//   overlay: {
//     ...StyleSheet.absoluteFill,
//     backgroundColor: 'rgba(0,0,0,0.25)',
//   },
//   face: {
//     position: 'absolute',
//     width,
//     height,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backfaceVisibility: 'hidden',
//   },
//   image: {width, height},
//   focusFrame: {
//     position: 'absolute',
//     top: '30%',
//     left: width * 0.15,
//     width: width * 0.7,
//     height: width * 0.9,
//   },
//   corner: {position: 'absolute', width: 40, height: 40, borderColor: 'white'},
//   topLeft: {top: 0, left: 0, borderLeftWidth: 2, borderTopWidth: 2},
//   topRight: {top: 0, right: 0, borderRightWidth: 2, borderTopWidth: 2},
//   bottomLeft: {bottom: 0, left: 0, borderLeftWidth: 2, borderBottomWidth: 2},
//   bottomRight: {bottom: 0, right: 0, borderRightWidth: 2, borderBottomWidth: 2},
//   title: {
//     color: '#fff',
//     fontSize: 28,
//     fontWeight: '900',
//     letterSpacing: 1.2,
//     textAlign: 'center',
//   },
//   subtitle: {
//     color: 'rgba(255,255,255,0.75)',
//     fontSize: 18,
//     marginTop: 6,
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   pagination: {
//     position: 'absolute',
//     bottom: 100,
//     width: '100%',
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },
//   dot: {
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#fff',
//     marginHorizontal: 5,
//   },
//   closeButton: {
//     width: 38,
//     height: 38,
//     backgroundColor: 'rgba(255, 255, 255, 0.15)',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.3)',
//     shadowColor: '#000',
//     shadowOpacity: 0.5,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 2},
//     elevation: 10,
//     borderRadius: 20,
//     padding: 6,
//   },
// });

// const images = [
//   require('../assets/images/headshot-3.jpg'),
//   require('../assets/images/headshot-6.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/headshot-1.webp'),
//   require('../assets/images/headshot-5.jpg'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'Like never before'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'Express yourself'},
//   {title: 'FASHION FORWARD', subtitle: 'Stay ahead of trends'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'Made just for you'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'Look your best'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'Own every moment'},
// ];

// function CubeFace({img, i, scrollX}: any) {
//   const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

//   const animatedStyle = useAnimatedStyle(() => {
//     const rotateY = interpolate(
//       scrollX.value,
//       inputRange,
//       [200, 0, -200],
//       Extrapolate.CLAMP,
//     );
//     const translateX = interpolate(
//       scrollX.value,
//       inputRange,
//       [width / 2.2, 0, -width / 2.2],
//       Extrapolate.CLAMP,
//     );
//     return {
//       transform: [
//         {perspective: width * 1.5},
//         {translateX},
//         {rotateY: `${rotateY}deg`},
//       ],
//     };
//   });

//   const nextIndex = i + 1 < images.length ? i + 1 : 0;
//   const nextImage = images[nextIndex];

//   return (
//     <View key={i} style={{width, height}}>
//       <Animated.View style={[styles.face, animatedStyle]}>
//         <Image source={img} style={styles.image} resizeMode="cover" />
//       </Animated.View>
//       <Animated.View
//         style={[
//           styles.face,
//           {
//             transform: [
//               {perspective: width * 1.5},
//               {rotateY: '90deg'},
//               {translateX: width / 2},
//             ],
//           },
//         ]}>
//         <Image source={nextImage} style={styles.image} resizeMode="cover" />
//       </Animated.View>
//     </View>
//   );
// }

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const [index, setIndex] = useState(0);
//   const scrollX = useSharedValue(0);
//   const {theme} = useAppTheme();

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollX.value = e.contentOffset.x;
//     },
//   });

//   const onScrollEnd = (e: any) => {
//     const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
//     setIndex(newIndex);
//   };

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   return (
//     <View style={styles.container}>
//       {/* 🧊 Cube Scroll */}
//       <Animated.ScrollView
//         horizontal
//         pagingEnabled
//         scrollEventThrottle={16}
//         showsHorizontalScrollIndicator={false}
//         onScroll={scrollHandler}
//         onMomentumScrollEnd={onScrollEnd}>
//         {images.map((img, i) => (
//           <CubeFace key={i} img={img} i={i} scrollX={scrollX} />
//         ))}
//       </Animated.ScrollView>

//       {/* 🔲 Overlay */}
//       <View style={styles.overlay} pointerEvents="none" />

//       {/* 🔳 Focus frame */}
//       {/* <View style={styles.focusFrame} pointerEvents="none">
//         <View style={[styles.corner, styles.topLeft]} />
//         <View style={[styles.corner, styles.topRight]} />
//         <View style={[styles.corner, styles.bottomLeft]} />
//         <View style={[styles.corner, styles.bottomRight]} />
//       </View> */}

//       {/* 💎 LiquidGlass text area */}
//       <LiquidGlassView
//         interactive
//         effect="clear"
//         tintColor="rgba(255, 255, 255, 0)"
//         colorScheme="system"
//         style={{
//           position: 'absolute',
//           bottom: 150,
//           alignSelf: 'center',
//           width: width * 0.9,
//           borderRadius: 40,
//           paddingVertical: 18,
//           paddingHorizontal: 8,
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <Animated.View
//           key={index}
//           entering={FadeInUp.duration(900)
//             .delay(100)
//             .easing(Easing.out(Easing.exp))}
//           exiting={FadeOutDown.duration(400)}
//           pointerEvents="none">
//           <Animated.Text
//             entering={ZoomIn.duration(1000).easing(Easing.out(Easing.exp))}
//             style={styles.title}>
//             {textContent[index].title}
//           </Animated.Text>
//           <Text style={styles.subtitle}>{textContent[index].subtitle}</Text>
//         </Animated.View>
//       </LiquidGlassView>

//       {/* ▓ Dots */}
//       <View style={styles.pagination} pointerEvents="none">
//         {images.map((_, i) => (
//           <View
//             key={i}
//             style={[
//               styles.dot,
//               {
//                 opacity: i === index ? 1 : 0.3,
//                 width: i === index ? 30 : 8,
//                 backgroundColor:
//                   i === index ? theme.colors.buttonText1 : '#fff',
//               },
//             ]}
//           />
//         ))}
//       </View>

//       {/* ❌ Close button */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 72,
//           right: 15,
//           zIndex: 999999,
//         }}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </View>
//   );
// }

///////////////////

// import React, {useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   Dimensions,
//   Pressable,
// } from 'react-native';
// import Animated, {
//   useSharedValue,
//   useAnimatedScrollHandler,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolate,
//   FadeInUp,
//   FadeOutDown,
//   ZoomIn,
//   Easing,
// } from 'react-native-reanimated';
// import {LiquidGlassView} from '@callstack/liquid-glass';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// const {width, height} = Dimensions.get('window');

// const styles = StyleSheet.create({
//   container: {flex: 1, backgroundColor: '#000'},
//   overlay: {
//     ...StyleSheet.absoluteFill,
//     backgroundColor: 'rgba(0,0,0,0.25)',
//   },
//   face: {
//     position: 'absolute',
//     width,
//     height,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backfaceVisibility: 'hidden',
//   },
//   image: {width, height},
//   focusFrame: {
//     position: 'absolute',
//     top: '30%',
//     left: width * 0.15,
//     width: width * 0.7,
//     height: width * 0.9,
//   },
//   corner: {position: 'absolute', width: 40, height: 40, borderColor: 'white'},
//   topLeft: {top: 0, left: 0, borderLeftWidth: 2, borderTopWidth: 2},
//   topRight: {top: 0, right: 0, borderRightWidth: 2, borderTopWidth: 2},
//   bottomLeft: {bottom: 0, left: 0, borderLeftWidth: 2, borderBottomWidth: 2},
//   bottomRight: {bottom: 0, right: 0, borderRightWidth: 2, borderBottomWidth: 2},
//   title: {
//     color: '#fff',
//     fontSize: 28,
//     fontWeight: '900',
//     letterSpacing: 1.2,
//     textAlign: 'center',
//   },
//   subtitle: {
//     color: 'rgba(255,255,255,0.75)',
//     fontSize: 18,
//     marginTop: 6,
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   pagination: {
//     position: 'absolute',
//     bottom: 100,
//     width: '100%',
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },
//   dot: {
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#fff',
//     marginHorizontal: 5,
//   },
//   closeButton: {
//     width: 40,
//     height: 40,
//     backgroundColor: 'rgba(255, 255, 255, 0.15)',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.3)',
//     shadowColor: '#000',
//     shadowOpacity: 0.5,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 2},
//     elevation: 10,
//     borderRadius: 20,
//     padding: 6,
//   },
// });

// const images = [
//   require('../assets/images/headshot-3.jpg'),
//   require('../assets/images/headshot-6.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/headshot-1.webp'),
//   require('../assets/images/headshot-5.jpg'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'Like never before'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'Express yourself'},
//   {title: 'FASHION FORWARD', subtitle: 'Stay ahead of trends'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'Made just for you'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'Look your best'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'Own every moment'},
// ];

// function CubeFace({img, i, scrollX}: any) {
//   const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

//   const animatedStyle = useAnimatedStyle(() => {
//     const rotateY = interpolate(
//       scrollX.value,
//       inputRange,
//       [200, 0, -200],
//       Extrapolate.CLAMP,
//     );
//     const translateX = interpolate(
//       scrollX.value,
//       inputRange,
//       [width / 2.2, 0, -width / 2.2],
//       Extrapolate.CLAMP,
//     );
//     return {
//       transform: [
//         {perspective: width * 1.5},
//         {translateX},
//         {rotateY: `${rotateY}deg`},
//       ],
//     };
//   });

//   const nextIndex = i + 1 < images.length ? i + 1 : 0;
//   const nextImage = images[nextIndex];

//   return (
//     <View key={i} style={{width, height}}>
//       <Animated.View style={[styles.face, animatedStyle]}>
//         <Image source={img} style={styles.image} resizeMode="cover" />
//       </Animated.View>
//       <Animated.View
//         style={[
//           styles.face,
//           {
//             transform: [
//               {perspective: width * 1.5},
//               {rotateY: '90deg'},
//               {translateX: width / 2},
//             ],
//           },
//         ]}>
//         <Image source={nextImage} style={styles.image} resizeMode="cover" />
//       </Animated.View>
//     </View>
//   );
// }

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const [index, setIndex] = useState(0);
//   const scrollX = useSharedValue(0);
//   const {theme} = useAppTheme();

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollX.value = e.contentOffset.x;
//     },
//   });

//   const onScrollEnd = (e: any) => {
//     const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
//     setIndex(newIndex);
//   };

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* 🧊 Cube Scroll */}
//       <Animated.ScrollView
//         horizontal
//         pagingEnabled
//         scrollEventThrottle={16}
//         showsHorizontalScrollIndicator={false}
//         onScroll={scrollHandler}
//         onMomentumScrollEnd={onScrollEnd}>
//         {images.map((img, i) => (
//           <CubeFace key={i} img={img} i={i} scrollX={scrollX} />
//         ))}
//       </Animated.ScrollView>

//       {/* 🔲 Overlay */}
//       <View style={styles.overlay} pointerEvents="none" />

//       {/* 🔳 Focus frame */}
//       <View style={styles.focusFrame} pointerEvents="none">
//         <View style={[styles.corner, styles.topLeft]} />
//         <View style={[styles.corner, styles.topRight]} />
//         <View style={[styles.corner, styles.bottomLeft]} />
//         <View style={[styles.corner, styles.bottomRight]} />
//       </View>

//       {/* 💎 LiquidGlass text area */}
//       <LiquidGlassView
//         interactive
//         effect="clear"
//         tintColor="rgba(255, 255, 255, 0)"
//         colorScheme="system"
//         style={{
//           position: 'absolute',
//           bottom: 170,
//           alignSelf: 'center',
//           width: width * 0.9,
//           borderRadius: 40,
//           paddingVertical: 18,
//           paddingHorizontal: 8,
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <Animated.View
//           key={index}
//           entering={FadeInUp.duration(900)
//             .delay(100)
//             .easing(Easing.out(Easing.exp))}
//           exiting={FadeOutDown.duration(400)}
//           pointerEvents="none">
//           <Animated.Text
//             entering={ZoomIn.duration(1000).easing(Easing.out(Easing.exp))}
//             style={styles.title}>
//             {textContent[index].title}
//           </Animated.Text>
//           <Text style={styles.subtitle}>{textContent[index].subtitle}</Text>
//         </Animated.View>
//       </LiquidGlassView>

//       {/* ▓ Dots */}
//       <View style={styles.pagination} pointerEvents="none">
//         {images.map((_, i) => (
//           <View
//             key={i}
//             style={[
//               styles.dot,
//               {
//                 opacity: i === index ? 1 : 0.3,
//                 width: i === index ? 30 : 8,
//                 backgroundColor: i === index ? theme.colors.button1 : '#fff',
//               },
//             ]}
//           />
//         ))}
//       </View>

//       {/* ❌ Close button */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 130,
//           right: 20,
//           zIndex: 999999,
//         }}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={28} color="white" />
//         </Pressable>
//       </View>
//     </SafeAreaView>
//   );
// }

////////////////

// import React, {useState, useRef} from 'react';
// import {View, Text, StyleSheet, Image, Dimensions, Pressable} from 'react-native';
// import Animated, {
//   useSharedValue,
//   useAnimatedScrollHandler,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolate,
//   FadeInUp,
//   FadeOutDown,
//   ZoomIn,
//   Easing,
// } from 'react-native-reanimated';
// import {LiquidGlassView} from '@callstack/liquid-glass';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// const {width, height} = Dimensions.get('window');

// const styles = StyleSheet.create({
//   container: {flex: 1, backgroundColor: '#000'},
//   overlay: {
//     ...StyleSheet.absoluteFill,
//     backgroundColor: 'rgba(0,0,0,0.25)',
//   },
//   face: {
//     position: 'absolute',
//     width,
//     height,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backfaceVisibility: 'hidden',
//   },
//   image: {width, height},
//   focusFrame: {
//     position: 'absolute',
//     top: '30%',
//     left: width * 0.15,
//     width: width * 0.7,
//     height: width * 0.9,
//   },
//   corner: {position: 'absolute', width: 40, height: 40, borderColor: 'white'},
//   topLeft: {top: 0, left: 0, borderLeftWidth: 2, borderTopWidth: 2},
//   topRight: {top: 0, right: 0, borderRightWidth: 2, borderTopWidth: 2},
//   bottomLeft: {bottom: 0, left: 0, borderLeftWidth: 2, borderBottomWidth: 2},
//   bottomRight: {bottom: 0, right: 0, borderRightWidth: 2, borderBottomWidth: 2},
//   title: {
//     color: '#fff',
//     fontSize: 28,
//     fontWeight: '900',
//     letterSpacing: 1.2,
//     textAlign: 'center',
//   },
//   subtitle: {
//     color: 'rgba(255,255,255,0.75)',
//     fontSize: 18,
//     marginTop: 6,
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   pagination: {
//     position: 'absolute',
//     bottom: 100,
//     width: '100%',
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },
//   dot: {
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#fff',
//     marginHorizontal: 5,
//   },
//   closeButton: {
//     width: 40,
//     height: 40,
//     backgroundColor: 'rgba(255, 255, 255, 0.15)',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.3)',
//     shadowColor: '#000',
//     shadowOpacity: 0.5,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 2},
//     elevation: 10,
//     borderRadius: 20,
//     padding: 6,
//   },
// });

// const images = [
//   require('../assets/images/headshot-3.jpg'),
//   require('../assets/images/headshot-6.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/headshot-1.webp'),
//   require('../assets/images/headshot-5.jpg'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'Like never before'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'Express yourself'},
//   {title: 'FASHION FORWARD', subtitle: 'Stay ahead of trends'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'Made just for you'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'Look your best'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'Own every moment'},
// ];

// function CubeFace({img, i, scrollX}: any) {
//   const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

//   const animatedStyle = useAnimatedStyle(() => {
//     const rotateY = interpolate(
//       scrollX.value,
//       inputRange,
//       [200, 0, -200],
//       Extrapolate.CLAMP,
//     );
//     const translateX = interpolate(
//       scrollX.value,
//       inputRange,
//       [width / 2.2, 0, -width / 2.2],
//       Extrapolate.CLAMP,
//     );
//     return {
//       transform: [
//         {perspective: width * 1.5},
//         {translateX},
//         {rotateY: `${rotateY}deg`},
//       ],
//     };
//   });

//   const nextIndex = i + 1 < images.length ? i + 1 : 0;
//   const nextImage = images[nextIndex];

//   return (
//     <View key={i} style={{width, height}}>
//       <Animated.View style={[styles.face, animatedStyle]}>
//         <Image source={img} style={styles.image} resizeMode="cover" />
//       </Animated.View>
//       <Animated.View
//         style={[
//           styles.face,
//           {
//             transform: [
//               {perspective: width * 1.5},
//               {rotateY: '90deg'},
//               {translateX: width / 2},
//             ],
//           },
//         ]}>
//         <Image source={nextImage} style={styles.image} resizeMode="cover" />
//       </Animated.View>
//     </View>
//   );
// }

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const [index, setIndex] = useState(0);
//   const scrollX = useSharedValue(0);
//   const {theme} = useAppTheme();

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollX.value = e.contentOffset.x;
//     },
//   });

//   const onScrollEnd = (e: any) => {
//     const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
//     setIndex(newIndex);
//   };

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* 🧊 Cube Scroll */}
//       <Animated.ScrollView
//         horizontal
//         pagingEnabled
//         scrollEventThrottle={16}
//         showsHorizontalScrollIndicator={false}
//         onScroll={scrollHandler}
//         onMomentumScrollEnd={onScrollEnd}>
//         {images.map((img, i) => (
//           <CubeFace key={i} img={img} i={i} scrollX={scrollX} />
//         ))}
//       </Animated.ScrollView>

//       {/* 🔲 Overlay */}
//       <View style={styles.overlay} pointerEvents="none" />

//       {/* 🔳 Focus frame */}
//       <View style={styles.focusFrame} pointerEvents="none">
//         <View style={[styles.corner, styles.topLeft]} />
//         <View style={[styles.corner, styles.topRight]} />
//         <View style={[styles.corner, styles.bottomLeft]} />
//         <View style={[styles.corner, styles.bottomRight]} />
//       </View>

//       {/* 💎 LiquidGlass text area */}
//       <LiquidGlassView
//         interactive
//         effect="clear"
//         tintColor="rgba(255, 255, 255, 0)"
//         colorScheme="system"
//         style={{
//           position: 'absolute',
//           bottom: 170,
//           alignSelf: 'center',
//           width: width * 0.9,
//           borderRadius: 40,
//           paddingVertical: 18,
//           paddingHorizontal: 8,
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <Animated.View
//           key={index}
//           entering={FadeInUp.duration(900)
//             .delay(100)
//             .easing(Easing.out(Easing.exp))}
//           exiting={FadeOutDown.duration(400)}
//           pointerEvents="none">
//           <Animated.Text
//             entering={ZoomIn.duration(1000).easing(Easing.out(Easing.exp))}
//             style={styles.title}>
//             {textContent[index].title}
//           </Animated.Text>
//           <Text style={styles.subtitle}>{textContent[index].subtitle}</Text>
//         </Animated.View>
//       </LiquidGlassView>

//       {/* ▓ Dots */}
//       <View style={styles.pagination} pointerEvents="none">
//         {images.map((_, i) => (
//           <View
//             key={i}
//             style={[
//               styles.dot,
//               {
//                 opacity: i === index ? 1 : 0.3,
//                 width: i === index ? 30 : 8,
//                 backgroundColor: i === index ? theme.colors.button1 : '#fff',
//               },
//             ]}
//           />
//         ))}
//       </View>

//       {/* ❌ Close button */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 130,
//           right: 20,
//           zIndex: 999999,
//         }}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={28} color="white" />
//         </Pressable>
//       </View>
//     </SafeAreaView>
//   );
// }

///////////////////

// import React, {useState, useRef} from 'react';
// import {View, Text, StyleSheet, Image, Dimensions} from 'react-native';
// import Animated, {
//   useSharedValue,
//   useAnimatedScrollHandler,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolate,
//   FadeInUp,
//   FadeOutDown,
//   ZoomIn,
//   Easing,
// } from 'react-native-reanimated';
// import {LiquidGlassView} from '@callstack/liquid-glass';
// import {SafeAreaView} from 'react-native-safe-area-context';

// const {width, height} = Dimensions.get('window');

// const styles = StyleSheet.create({
//   container: {flex: 1, backgroundColor: '#000'},
//   overlay: {
//     ...StyleSheet.absoluteFill,
//     backgroundColor: 'rgba(0,0,0,0.25)',
//   },
//   face: {
//     position: 'absolute',
//     width,
//     height,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backfaceVisibility: 'hidden',
//   },
//   image: {width, height},
//   focusFrame: {
//     position: 'absolute',
//     top: '30%',
//     left: width * 0.15,
//     width: width * 0.7,
//     height: width * 0.9,
//   },
//   corner: {position: 'absolute', width: 40, height: 40, borderColor: 'white'},
//   topLeft: {top: 0, left: 0, borderLeftWidth: 2, borderTopWidth: 2},
//   topRight: {top: 0, right: 0, borderRightWidth: 2, borderTopWidth: 2},
//   bottomLeft: {bottom: 0, left: 0, borderLeftWidth: 2, borderBottomWidth: 2},
//   bottomRight: {bottom: 0, right: 0, borderRightWidth: 2, borderBottomWidth: 2},
//   title: {
//     color: '#fff',
//     fontSize: 28,
//     fontWeight: '900',
//     letterSpacing: 1.2,
//     textAlign: 'center',
//   },
//   subtitle: {
//     color: 'rgba(255,255,255,0.75)',
//     fontSize: 18,
//     marginTop: 6,
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   pagination: {
//     position: 'absolute',
//     bottom: 100,
//     width: '100%',
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },
//   dot: {
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#fff',
//     marginHorizontal: 5,
//   },
// });

// const images = [
//   require('../assets/images/headshot-3.jpg'),
//   require('../assets/images/headshot-6.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/headshot-1.webp'),
//   require('../assets/images/headshot-5.jpg'),
// ];

// function CubeFace({img, i, scrollX}: any) {
//   const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

//   const animatedStyle = useAnimatedStyle(() => {
//     const rotateY = interpolate(
//       scrollX.value,
//       inputRange,
//       [200, 0, -200],
//       Extrapolate.CLAMP,
//     );
//     const translateX = interpolate(
//       scrollX.value,
//       inputRange,
//       [width / 2.2, 0, -width / 2.2],
//       Extrapolate.CLAMP,
//     );
//     return {
//       transform: [
//         {perspective: width * 1.5},
//         {translateX},
//         {rotateY: `${rotateY}deg`},
//       ],
//     };
//   });

//   const nextIndex = i + 1 < images.length ? i + 1 : 0;
//   const nextImage = images[nextIndex];

//   return (
//     <View key={i} style={{width, height}}>
//       <Animated.View style={[styles.face, animatedStyle]}>
//         <Image source={img} style={styles.image} resizeMode="cover" />
//       </Animated.View>
//       <Animated.View
//         style={[
//           styles.face,
//           {
//             transform: [
//               {perspective: width * 1.5},
//               {rotateY: '90deg'},
//               {translateX: width / 2},
//             ],
//           },
//         ]}>
//         <Image source={nextImage} style={styles.image} resizeMode="cover" />
//       </Animated.View>
//     </View>
//   );
// }

// export default function ImageCarouselScreen() {
//   const [index, setIndex] = useState(0);
//   const scrollX = useSharedValue(0);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollX.value = e.contentOffset.x;
//     },
//   });

//   const onScrollEnd = (e: any) => {
//     const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
//     setIndex(newIndex);
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* 🧊 Cube Scroll */}
//       <Animated.ScrollView
//         horizontal
//         pagingEnabled
//         scrollEventThrottle={16}
//         showsHorizontalScrollIndicator={false}
//         onScroll={scrollHandler}
//         onMomentumScrollEnd={onScrollEnd}>
//         {images.map((img, i) => (
//           <CubeFace key={i} img={img} i={i} scrollX={scrollX} />
//         ))}
//       </Animated.ScrollView>

//       {/* 🔲 Overlay */}
//       <View style={styles.overlay} pointerEvents="none" />

//       {/* 🔳 Focus frame */}
//       <View style={styles.focusFrame} pointerEvents="none">
//         <View style={[styles.corner, styles.topLeft]} />
//         <View style={[styles.corner, styles.topRight]} />
//         <View style={[styles.corner, styles.bottomLeft]} />
//         <View style={[styles.corner, styles.bottomRight]} />
//       </View>

//       {/* 💎 LiquidGlass text area */}
//       <LiquidGlassView
//         interactive
//         effect="clear"
//         tintColor="rgba(255, 255, 255, 0)"
//         colorScheme="system"
//         style={{
//           position: 'absolute',
//           bottom: 170,
//           alignSelf: 'center',
//           width: width * 0.9,
//           borderRadius: 40,
//           paddingVertical: 18,
//           paddingHorizontal: 8,
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         <Animated.View
//           key={index}
//           entering={FadeInUp.duration(900)
//             .delay(100)
//             .easing(Easing.out(Easing.exp))}
//           exiting={FadeOutDown.duration(400)}
//           pointerEvents="none">
//           <Animated.Text
//             entering={ZoomIn.duration(1000).easing(Easing.out(Easing.exp))}
//             style={styles.title}>
//             UPGRADE YOUR STYLE
//           </Animated.Text>
//           <Text style={styles.subtitle}>Like never before</Text>
//         </Animated.View>
//       </LiquidGlassView>

//       {/* ▓ Dots */}
//       <View style={styles.pagination} pointerEvents="none">
//         {images.map((_, i) => (
//           <View
//             key={i}
//             style={[
//               styles.dot,
//               {opacity: i === index ? 1 : 0.3, width: i === index ? 30 : 8},
//             ]}
//           />
//         ))}
//       </View>
//     </SafeAreaView>
//   );
// }

////////////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   Image,
//   Dimensions,
//   FlatList,
// } from 'react-native';
// import Animated, {
//   FadeInUp,
//   FadeOutDown,
//   ZoomIn,
//   Easing,
// } from 'react-native-reanimated';

// const {width, height} = Dimensions.get('window');

// const images = [
//   require('../assets/images/headshot-3.jpg'),
//   require('../assets/images/headshot-6.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/headshot-1.webp'),
//   require('../assets/images/headshot-5.jpg'),
// ];

// export default function ImageCarouselScreen() {
//   const [index, setIndex] = useState(0);

//   const onViewRef = React.useRef(({viewableItems}: any) => {
//     if (viewableItems.length > 0) setIndex(viewableItems[0].index);
//   });
//   const viewConfigRef = React.useRef({viewAreaCoveragePercentThreshold: 50});

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* 🖼️ Swipeable image carousel */}
//       <FlatList
//         data={images}
//         keyExtractor={(_, i) => i.toString()}
//         horizontal
//         pagingEnabled
//         decelerationRate="fast"
//         snapToInterval={width}
//         showsHorizontalScrollIndicator={false}
//         onViewableItemsChanged={onViewRef.current}
//         viewabilityConfig={viewConfigRef.current}
//         renderItem={({item}) => (
//           <Image
//             source={item}
//             style={styles.centeredImage}
//             resizeMode="cover"
//           />
//         )}
//       />

//       {/* 🔲 Dim overlay */}
//       <View style={styles.overlay} pointerEvents="none" />

//       {/* 🔳 Focus frame */}
//       <View style={styles.focusFrame} pointerEvents="none">
//         <View style={[styles.corner, styles.topLeft]} />
//         <View style={[styles.corner, styles.topRight]} />
//         <View style={[styles.corner, styles.bottomLeft]} />
//         <View style={[styles.corner, styles.bottomRight]} />
//       </View>

//       {/* ✨ Animated Text */}
//       <Animated.View
//         key={index} // re-triggers animation every time index changes
//         entering={FadeInUp.duration(900)
//           .delay(100)
//           .easing(Easing.out(Easing.exp))}
//         exiting={FadeOutDown.duration(400)}
//         style={styles.textContainer}
//         pointerEvents="none">
//         <Animated.Text
//           entering={ZoomIn.duration(1000).easing(Easing.out(Easing.exp))}
//           style={styles.title}>
//           UPGRADE YOUR STYLE
//         </Animated.Text>
//         <Text style={styles.subtitle}>Like never before</Text>
//       </Animated.View>

//       {/* ▓ pagination dots */}
//       <View style={styles.pagination} pointerEvents="none">
//         {images.map((_, i) => (
//           <View
//             key={i}
//             style={[
//               styles.dot,
//               {opacity: i === index ? 1 : 0.3, width: i === index ? 30 : 8},
//             ]}
//           />
//         ))}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, backgroundColor: 'black'},
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.25)',
//   },
//   centeredImage: {
//     width,
//     height,
//     alignSelf: 'center',
//     justifyContent: 'center',
//   },
//   focusFrame: {
//     position: 'absolute',
//     top: '30%',
//     left: width * 0.15,
//     width: width * 0.7,
//     height: width * 0.9,
//   },
//   corner: {
//     position: 'absolute',
//     width: 40,
//     height: 40,
//     borderColor: 'white',
//   },
//   topLeft: {top: 0, left: 0, borderLeftWidth: 2, borderTopWidth: 2},
//   topRight: {top: 0, right: 0, borderRightWidth: 2, borderTopWidth: 2},
//   bottomLeft: {bottom: 0, left: 0, borderLeftWidth: 2, borderBottomWidth: 2},
//   bottomRight: {bottom: 0, right: 0, borderRightWidth: 2, borderBottomWidth: 2},
//   textContainer: {
//     position: 'absolute',
//     bottom: 200,
//     width: '100%',
//     alignItems: 'center',
//   },
//   title: {
//     color: '#fff',
//     fontSize: 32,
//     fontWeight: '900',
//     letterSpacing: 1.2,
//   },
//   subtitle: {
//     color: 'rgba(255,255,255,0.75)',
//     fontSize: 20,
//     marginTop: 4,
//     fontWeight: '600',
//   },
//   pagination: {
//     position: 'absolute',
//     bottom: 100,
//     width: '100%',
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },
//   dot: {
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#fff',
//     marginHorizontal: 5,
//   },
// });

//////////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   Image,
//   Dimensions,
//   FlatList,
// } from 'react-native';

// const {width, height} = Dimensions.get('window');

// const images = [
//   require('../assets/images/headshot-3.jpg'),
//   require('../assets/images/headshot-6.jpg'),
//   require('../assets/images/headshot-2.webp'),

//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/headshot-1.webp'),
//   require('../assets/images/headshot-5.jpg'),
// ];

// export default function ImageCarouselScreen() {
//   const [index, setIndex] = useState(0);

//   const onViewRef = React.useRef(({viewableItems}: any) => {
//     if (viewableItems.length > 0) setIndex(viewableItems[0].index);
//   });
//   const viewConfigRef = React.useRef({viewAreaCoveragePercentThreshold: 50});

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* 🖼️ Swipeable image carousel */}
//       <FlatList
//         data={images}
//         keyExtractor={(_, i) => i.toString()}
//         horizontal
//         pagingEnabled
//         decelerationRate="fast"
//         snapToInterval={width}
//         showsHorizontalScrollIndicator={false}
//         onViewableItemsChanged={onViewRef.current}
//         viewabilityConfig={viewConfigRef.current}
//         renderItem={({item}) => (
//           <Image
//             source={item}
//             style={styles.centeredImage}
//             resizeMode="cover"
//           />
//         )}
//       />

//       {/* 🔲 Dim overlay */}
//       <View style={styles.overlay} pointerEvents="none" />

//       {/* 🔳 Focus frame */}
//       <View style={styles.focusFrame} pointerEvents="none">
//         <View style={[styles.corner, styles.topLeft]} />
//         <View style={[styles.corner, styles.topRight]} />
//         <View style={[styles.corner, styles.bottomLeft]} />
//         <View style={[styles.corner, styles.bottomRight]} />
//       </View>

//       {/* 📝 Texts */}
//       <View style={styles.textContainer} pointerEvents="none">
//         <Text style={styles.title}>UPGRADE YOUR STYLE</Text>
//         <Text style={styles.subtitle}>Like never before</Text>
//       </View>

//       {/* ▓ pagination dots */}
//       <View style={styles.pagination} pointerEvents="none">
//         {images.map((_, i) => (
//           <View
//             key={i}
//             style={[
//               styles.dot,
//               {opacity: i === index ? 1 : 0.3, width: i === index ? 30 : 8},
//             ]}
//           />
//         ))}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, backgroundColor: 'black'},
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.25)',
//   },
//   centeredImage: {
//     width,
//     height,
//     alignSelf: 'center',
//     justifyContent: 'center',
//   },
//   focusFrame: {
//     position: 'absolute',
//     top: '30%',
//     left: width * 0.15,
//     width: width * 0.7,
//     height: width * 0.9,
//   },
//   corner: {
//     position: 'absolute',
//     width: 40,
//     height: 40,
//     borderColor: 'white',
//   },
//   topLeft: {top: 0, left: 0, borderLeftWidth: 2, borderTopWidth: 2},
//   topRight: {top: 0, right: 0, borderRightWidth: 2, borderTopWidth: 2},
//   bottomLeft: {bottom: 0, left: 0, borderLeftWidth: 2, borderBottomWidth: 2},
//   bottomRight: {bottom: 0, right: 0, borderRightWidth: 2, borderBottomWidth: 2},
//   textContainer: {
//     position: 'absolute',
//     bottom: 200,
//     width: '100%',
//     alignItems: 'center',
//   },
//   title: {
//     color: '#fff',
//     fontSize: 32,
//     fontWeight: '900',
//     letterSpacing: 1.2,
//   },
//   subtitle: {
//     color: 'rgba(255,255,255,0.75)',
//     fontSize: 20,
//     marginTop: 4,
//     fontWeight: 600,
//   },
//   pagination: {
//     position: 'absolute',
//     bottom: 100,
//     width: '100%',
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },
//   dot: {
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#fff',
//     marginHorizontal: 5,
//   },
// });
