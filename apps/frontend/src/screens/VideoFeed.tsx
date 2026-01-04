import {useCallback, useEffect, useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  Platform,
  TextStyle,
  View,
  ViewStyle,
  Text,
  Pressable,
  StyleSheet,
  ImageStyle,
  Share,
  Image,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import Video, {ResizeMode, VideoRef} from 'react-native-video';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {allVideos} from '../assets/data/video-urls';
import {fontScale, moderateScale} from '../utils/scale';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

// ✅ Use full 'screen' height on Android; 'window' on iOS
const SCREEN = Platform.select({
  android: Dimensions.get('screen'),
  ios: Dimensions.get('window'),
});
const SCREEN_HEIGHT = SCREEN!.height;
const SCREEN_WIDTH = SCREEN!.width;

interface VideoWrapperProps {
  data: ListRenderItemInfo<string>;
  allVideos: string[];
  visibleIndex: number;
  pause: () => void;
  share: (videoURL: string) => void;
  pauseOverride: boolean;
  onVideoReady?: () => void;
}

const VideoWrapper = ({
  data,
  allVideos,
  visibleIndex,
  pause,
  pauseOverride,
  share,
  onVideoReady,
}: VideoWrapperProps) => {
  const {index, item} = data;
  const videoRef = useRef<VideoRef>(null);
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'black',
      opacity: 0.15,
    },
    overlayTextContainer: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
    overlayText: {
      fontSize: fontScale(tokens.fontSize['5xl']),
      fontWeight: '900',
      letterSpacing: 3,
      color: 'white',
      textTransform: 'uppercase',
    },
  });

  useEffect(() => {
    videoRef.current?.seek(0);
  }, [visibleIndex]);

  return (
    // ✅ Each item fills the screen exactly
    <View
      style={{
        height: SCREEN_HEIGHT,
        width: SCREEN_WIDTH,
        backgroundColor: 'black',
      }}>
      <Video
        ref={videoRef}
        source={{uri: allVideos[index]}}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        // paused={visibleIndex !== index || pauseOverride}
        repeat
        onReadyForDisplay={() => {
          if (index === 0 && onVideoReady) {
            onVideoReady();
          }
        }}
      />
      <Pressable onPress={pause} style={styles.overlay} />
    </View>
  );
};

const AUTO_SCROLL_INTERVAL = 8000; // 8 seconds per video
const SCROLL_ANIMATION_DURATION = 700; // 700ms for gradual scroll
const LAUNCH_VIDEO_DURATION = 5000; // 6 seconds for intro video on app launch

export default function VideoFeedScreen({
  navigate,
  autoNavigateToHome,
}: {
  navigate: (screen: string) => void;
  autoNavigateToHome?: boolean;
}) {
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [pauseOverride, setPauseOverride] = useState(false);
  const [firstVideoReady, setFirstVideoReady] = useState(false);
  const flatListRef = useRef<FlatList<string>>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  // Entrance animation values
  const screenOpacity = useSharedValue(0);
  const screenScale = useSharedValue(0.92);
  const screenTranslateY = useSharedValue(40);

  // Entrance animation - buttery smooth fade + scale + slide
  useEffect(() => {
    screenOpacity.value = withTiming(1, {duration: 350});
    screenScale.value = withSpring(1, {
      damping: 20,
      stiffness: 90,
      mass: 0.8,
    });
    screenTranslateY.value = withSpring(0, {
      damping: 20,
      stiffness: 90,
      mass: 0.8,
    });
  }, []);

  // Auto-navigate to Home after first video starts playing (only on app launch)
  useEffect(() => {
    if (!autoNavigateToHome || !firstVideoReady) return;

    const autoNavTimer = setTimeout(() => {
      navigate('Home');
    }, LAUNCH_VIDEO_DURATION);

    return () => clearTimeout(autoNavTimer);
  }, [navigate, autoNavigateToHome, firstVideoReady]);

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [
      {scale: screenScale.value},
      {translateY: screenTranslateY.value},
    ],
  }));

  // Start progress bar animation
  const startProgressBar = useCallback(() => {
    progressAnimation.setValue(0);
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: AUTO_SCROLL_INTERVAL,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [progressAnimation]);

  // Smooth scroll to a specific index with custom duration
  const smoothScrollToIndex = useCallback(
    (targetIndex: number) => {
      const currentOffset = visibleIndex * SCREEN_HEIGHT;
      const targetOffset = targetIndex * SCREEN_HEIGHT;

      scrollAnimation.setValue(currentOffset);
      Animated.timing(scrollAnimation, {
        toValue: targetOffset,
        duration: SCROLL_ANIMATION_DURATION,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Listen to animation and update scroll position
      const listenerId = scrollAnimation.addListener(({value}) => {
        flatListRef.current?.scrollToOffset({offset: value, animated: false});
      });

      // Clean up listener after animation
      setTimeout(() => {
        scrollAnimation.removeListener(listenerId);
      }, SCROLL_ANIMATION_DURATION + 50);
    },
    [visibleIndex, scrollAnimation],
  );

  // Reset auto-scroll timer
  const resetAutoScrollTimer = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
    // Start progress bar immediately
    startProgressBar();
    autoScrollTimer.current = setInterval(() => {
      setVisibleIndex(prev => {
        const nextIndex = prev + 1 >= allVideos.length ? 0 : prev + 1;
        smoothScrollToIndex(nextIndex);
        return nextIndex;
      });
      // Reset and restart progress bar
      startProgressBar();
    }, AUTO_SCROLL_INTERVAL);
  }, [smoothScrollToIndex, startProgressBar]);

  // Start auto-scroll on mount, cleanup on unmount
  useEffect(() => {
    resetAutoScrollTimer();
    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [resetAutoScrollTimer]);

  const styles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'black',
      opacity: 0.15,
    },
    overlayTextContainer: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
    overlayText: {
      fontSize: 42,
      fontWeight: '700',
      letterSpacing: 3,
      color: 'white',
      textTransform: 'uppercase',
    },
    fabContainer: {
      position: 'absolute',
      top: insets.top + 12,
      right: 15,
      zIndex: 10,
    },
    fabButton: {
      width: 35,
      height: 35,
      borderRadius: 50,
      // backgroundColor: 'transparent',
      // alignItems: 'center',
      // justifyContent: 'center',
      // shadowColor: '#000',
      // shadowOpacity: 0.25,
      // shadowRadius: 10,
      // elevation: 6,
      overflow: 'hidden',
    },
    fabButtonBlur: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    fabButtonTint: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    fabButtonInner: {
      width: 35,
      height: 35,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButton: {
      width: 40,
      height: 40,
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
    homeButtonContainer: {
      position: 'absolute',
      bottom: insets.bottom + 15,
      left: 20,
      zIndex: 10,
    },
    progressBarContainer: {
      position: 'absolute',
      bottom: 80,
      width: '50%',
      height: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 1,
      marginTop: 16,
    },
    progressBar: {
      height: '100%',
      backgroundColor: 'rgba(144, 0, 255, 1)',
      borderRadius: 1,
    },
  });

  useEffect(() => {
    // setTranslucent and setBackgroundColor are Android-only
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
    StatusBar.setBarStyle('light-content');
  }, []);

  const onViewableItemsChanged = (event: any) => {
    // Reset auto-scroll timer when user manually swipes
    resetAutoScrollTimer();
    const newIndex = Number(event.viewableItems.at(-1)?.key ?? 0);
    setVisibleIndex(newIndex);
  };

  const pause = () => setPauseOverride(v => !v);

  const handleNavigate = () => {
    // ReactNativeHapticFeedback.trigger('impactMedium');
    navigate('ImageCarouselScreen'); // ✅ navigate to your screen
  };

  const handleCommunity = () => {
    navigate('CommunityShowcaseScreen');
  };

  const handleClose = () => {
    navigate('HomeScreen');
  };

  // 🔹 iOS version detection for fallback
  const isiOS25OrLower =
    Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) <= 25;

  return (
    <ReAnimated.View
      style={[{flex: 1, backgroundColor: 'black'}, screenAnimatedStyle]}>
      <StatusBar hidden />
      <FlatList
        data={allVideos}
        renderItem={data => (
          <VideoWrapper
            data={data}
            allVideos={allVideos}
            visibleIndex={visibleIndex}
            pause={pause}
            pauseOverride={pauseOverride}
            share={function (videoURL: string): void {
              throw new Error('Function not implemented.');
            }}
            onVideoReady={() => setFirstVideoReady(true)}
          />
        )}
        ref={flatListRef}
        keyExtractor={(_, i) => String(i)}
        initialNumToRender={1}
        pagingEnabled
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        snapToInterval={SCREEN_HEIGHT}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        removeClippedSubviews
        windowSize={3}
      />

      {/* 🟣 Centered transparent overlay text */}
      <View style={styles.overlayTextContainer} pointerEvents="none">
        <Text style={styles.overlayText}>StylHelpr</Text>
      </View>

      {/* 🔘 Floating FABs */}
      <View style={styles.fabContainer}>
        {/* Community Button */}
        {/* <AppleTouchFeedback
          onPress={handleCommunity}
          style={{marginBottom: 12}}>
          <View style={styles.fabButton}>
            <BlurView
              style={styles.fabButtonBlur}
              blurType="light"
              blurAmount={0}
              reducedTransparencyFallbackColor="rgba(255, 0, 0, 0.5)"
            />
            <View style={styles.fabButtonTint} />
            <View style={styles.fabButtonInner}>
              <MaterialIcons name="people" size={22} color="black" />
            </View>
          </View>
        </AppleTouchFeedback> */}

        {/* Photo Library Button */}
        <AppleTouchFeedback onPress={handleNavigate}>
          <View style={styles.fabButton}>
            <BlurView
              style={styles.fabButtonBlur}
              blurType="light"
              blurAmount={0}
              reducedTransparencyFallbackColor="rgba(255, 0, 0, 0.5)"
            />
            <View style={styles.fabButtonTint} />
            <View style={styles.fabButtonInner}>
              {/* <Feather name="image" color="black" size={22} /> */}
              <MaterialIcons name="photo-library" size={22} color="black" />
            </View>
          </View>
        </AppleTouchFeedback>
      </View>

      {/* Home Button - lower left */}
      <View style={styles.homeButtonContainer}>
        <AppleTouchFeedback onPress={handleClose}>
          <View style={styles.fabButton}>
            <BlurView
              style={styles.fabButtonBlur}
              blurType="light"
              blurAmount={0}
              reducedTransparencyFallbackColor="rgba(255, 0, 0, 0.5)"
            />
            <View style={styles.fabButtonTint} />
            <View style={styles.fabButtonInner}>
              <MaterialIcons name="home" size={22} color="black" />
            </View>
          </View>
        </AppleTouchFeedback>
      </View>
    </ReAnimated.View>
  );
}

///////////////

// import {useCallback, useEffect, useRef, useState} from 'react';
// import {
//   Dimensions,
//   FlatList,
//   ListRenderItemInfo,
//   Platform,
//   TextStyle,
//   View,
//   ViewStyle,
//   Text,
//   Pressable,
//   StyleSheet,
//   ImageStyle,
//   Share,
//   Image,
//   StatusBar,
//   Animated,
//   Easing,
// } from 'react-native';
// import ReAnimated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
//   withSpring,
// } from 'react-native-reanimated';
// import Video, {ResizeMode, VideoRef} from 'react-native-video';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {allVideos} from '../assets/data/video-urls';
// import {fontScale, moderateScale} from '../utils/scale';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

// // ✅ Use full 'screen' height on Android; 'window' on iOS
// const SCREEN = Platform.select({
//   android: Dimensions.get('screen'),
//   ios: Dimensions.get('window'),
// });
// const SCREEN_HEIGHT = SCREEN!.height;
// const SCREEN_WIDTH = SCREEN!.width;

// interface VideoWrapperProps {
//   data: ListRenderItemInfo<string>;
//   allVideos: string[];
//   visibleIndex: number;
//   pause: () => void;
//   share: (videoURL: string) => void;
//   pauseOverride: boolean;
// }

// const VideoWrapper = ({
//   data,
//   allVideos,
//   visibleIndex,
//   pause,
//   pauseOverride,
//   share,
// }: VideoWrapperProps) => {
//   const {index, item} = data;
//   const videoRef = useRef<VideoRef>(null);
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: fontScale(tokens.fontSize['5xl']),
//       fontWeight: '900',
//       letterSpacing: 3,
//       color: 'white',
//       textTransform: 'uppercase',
//     },
//   });

//   useEffect(() => {
//     videoRef.current?.seek(0);
//   }, [visibleIndex]);

//   return (
//     // ✅ Each item fills the screen exactly
//     <View
//       style={{
//         height: SCREEN_HEIGHT,
//         width: SCREEN_WIDTH,
//         backgroundColor: 'black',
//       }}>
//       <Video
//         ref={videoRef}
//         source={{uri: allVideos[index]}}
//         style={StyleSheet.absoluteFill}
//         resizeMode={ResizeMode.COVER}
//         paused={visibleIndex !== index || pauseOverride}
//         repeat
//       />
//       <Pressable onPress={pause} style={styles.overlay} />
//     </View>
//   );
// };

// const AUTO_SCROLL_INTERVAL = 8000; // 7 seconds per video
// const SCROLL_ANIMATION_DURATION = 700; // 800ms for gradual scroll

// export default function VideoFeedScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const [visibleIndex, setVisibleIndex] = useState(0);
//   const [pauseOverride, setPauseOverride] = useState(false);
//   const flatListRef = useRef<FlatList<string>>(null);
//   const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
//   const scrollAnimation = useRef(new Animated.Value(0)).current;
//   const progressAnimation = useRef(new Animated.Value(0)).current;
//   const insets = useSafeAreaInsets();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   // Entrance animation values
//   const screenOpacity = useSharedValue(0);
//   const screenScale = useSharedValue(0.92);
//   const screenTranslateY = useSharedValue(40);

//   // Entrance animation - buttery smooth fade + scale + slide
//   useEffect(() => {
//     screenOpacity.value = withTiming(1, {duration: 350});
//     screenScale.value = withSpring(1, {
//       damping: 20,
//       stiffness: 90,
//       mass: 0.8,
//     });
//     screenTranslateY.value = withSpring(0, {
//       damping: 20,
//       stiffness: 90,
//       mass: 0.8,
//     });
//   }, []);

//   const screenAnimatedStyle = useAnimatedStyle(() => ({
//     opacity: screenOpacity.value,
//     transform: [
//       {scale: screenScale.value},
//       {translateY: screenTranslateY.value},
//     ],
//   }));

//   // Start progress bar animation
//   const startProgressBar = useCallback(() => {
//     progressAnimation.setValue(0);
//     Animated.timing(progressAnimation, {
//       toValue: 1,
//       duration: AUTO_SCROLL_INTERVAL,
//       easing: Easing.linear,
//       useNativeDriver: false,
//     }).start();
//   }, [progressAnimation]);

//   // Smooth scroll to a specific index with custom duration
//   const smoothScrollToIndex = useCallback(
//     (targetIndex: number) => {
//       const currentOffset = visibleIndex * SCREEN_HEIGHT;
//       const targetOffset = targetIndex * SCREEN_HEIGHT;

//       scrollAnimation.setValue(currentOffset);
//       Animated.timing(scrollAnimation, {
//         toValue: targetOffset,
//         duration: SCROLL_ANIMATION_DURATION,
//         easing: Easing.inOut(Easing.cubic),
//         useNativeDriver: false,
//       }).start();

//       // Listen to animation and update scroll position
//       const listenerId = scrollAnimation.addListener(({value}) => {
//         flatListRef.current?.scrollToOffset({offset: value, animated: false});
//       });

//       // Clean up listener after animation
//       setTimeout(() => {
//         scrollAnimation.removeListener(listenerId);
//       }, SCROLL_ANIMATION_DURATION + 50);
//     },
//     [visibleIndex, scrollAnimation],
//   );

//   // Reset auto-scroll timer
//   const resetAutoScrollTimer = useCallback(() => {
//     if (autoScrollTimer.current) {
//       clearInterval(autoScrollTimer.current);
//     }
//     // Start progress bar immediately
//     startProgressBar();
//     autoScrollTimer.current = setInterval(() => {
//       setVisibleIndex(prev => {
//         const nextIndex = prev + 1 >= allVideos.length ? 0 : prev + 1;
//         smoothScrollToIndex(nextIndex);
//         return nextIndex;
//       });
//       // Reset and restart progress bar
//       startProgressBar();
//     }, AUTO_SCROLL_INTERVAL);
//   }, [smoothScrollToIndex, startProgressBar]);

//   // Start auto-scroll on mount, cleanup on unmount
//   useEffect(() => {
//     resetAutoScrollTimer();
//     return () => {
//       if (autoScrollTimer.current) {
//         clearInterval(autoScrollTimer.current);
//       }
//     };
//   }, [resetAutoScrollTimer]);

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: 42,
//       fontWeight: '700',
//       letterSpacing: 3,
//       color: 'white',
//       textTransform: 'uppercase',
//     },
//     fabContainer: {
//       position: 'absolute',
//       top: insets.bottom + 37,
//       right: 15,
//       zIndex: 10,
//     },
//     fabButton: {
//       width: 35,
//       height: 35,
//       borderRadius: 50,
//       backgroundColor: 'transparent',
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 10,
//       elevation: 6,
//     },
//     closeButton: {
//       width: 40,
//       height: 40,
//       backgroundColor: 'rgba(255, 255, 255, 0.15)',
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderWidth: 1,
//       borderColor: 'rgba(255, 255, 255, 0.3)',
//       shadowColor: '#000',
//       shadowOpacity: 0.5,
//       shadowRadius: 8,
//       shadowOffset: {width: 0, height: 2},
//       elevation: 10,
//       borderRadius: 20,
//       padding: 6,
//     },
//     progressBarContainer: {
//       position: 'absolute',
//       bottom: 80,
//       width: '50%',
//       height: 3,
//       backgroundColor: 'rgba(255, 255, 255, 0.3)',
//       borderRadius: 1,
//       marginTop: 16,
//     },
//     progressBar: {
//       height: '100%',
//       backgroundColor: 'rgba(144, 0, 255, 1)',
//       borderRadius: 1,
//     },
//   });

//   useEffect(() => {
//     StatusBar.setTranslucent(true);
//     StatusBar.setBackgroundColor('transparent');
//     StatusBar.setBarStyle('light-content');
//   }, []);

//   const onViewableItemsChanged = (event: any) => {
//     // Reset auto-scroll timer when user manually swipes
//     resetAutoScrollTimer();
//     const newIndex = Number(event.viewableItems.at(-1)?.key ?? 0);
//     setVisibleIndex(newIndex);
//   };

//   const pause = () => setPauseOverride(v => !v);

//   const handleNavigate = () => {
//     // ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('ImageCarouselScreen'); // ✅ navigate to your screen
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   // 🔹 iOS version detection for fallback
//   const isiOS25OrLower =
//     Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) <= 25;

//   return (
//     <ReAnimated.View style={[{flex: 1, backgroundColor: 'black'}, screenAnimatedStyle]}>
//       <StatusBar hidden />
//       <FlatList
//         data={allVideos}
//         renderItem={data => (
//           <VideoWrapper
//             data={data}
//             allVideos={allVideos}
//             visibleIndex={visibleIndex}
//             pause={pause}
//             pauseOverride={pauseOverride}
//             share={function (videoURL: string): void {
//               throw new Error('Function not implemented.');
//             }}
//           />
//         )}
//         ref={flatListRef}
//         keyExtractor={(_, i) => String(i)}
//         initialNumToRender={1}
//         pagingEnabled
//         decelerationRate="fast"
//         showsVerticalScrollIndicator={false}
//         onViewableItemsChanged={onViewableItemsChanged}
//         snapToInterval={SCREEN_HEIGHT}
//         getItemLayout={(_, index) => ({
//           length: SCREEN_HEIGHT,
//           offset: SCREEN_HEIGHT * index,
//           index,
//         })}
//         removeClippedSubviews
//         windowSize={3}
//       />

//       {/* 🟣 Centered transparent overlay text */}
//       <View style={styles.overlayTextContainer} pointerEvents="none">
//         <Text style={styles.overlayText}>StylHelpr</Text>
//         {/* <View style={styles.progressBarContainer}>
//           <Animated.View
//             style={[
//               styles.progressBar,
//               {
//                 width: progressAnimation.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: ['0%', '100%'],
//                 }),
//               },
//             ]}
//           />
//         </View> */}
//       </View>

//       {/* ❌ Close button */}
//       {/* <View
//         style={{
//           position: 'absolute',
//           top: 70,
//           right: 20,
//           zIndex: 999999,
//         }}>
//         <Pressable onPress={handleClose}>
//           <MaterialIcons name="close" size={28} color="white" />
//         </Pressable>
//       </View> */}

//       {/* 🔘 Floating FABs */}
//       <View style={styles.fabContainer}>
//         {/* Community Button */}
//         <AppleTouchFeedback
//           onPress={handleCommunity}
//           style={{marginBottom: 12}}>
//           <View
//             style={[
//               styles.fabButton,
//               {
//                 backgroundColor: 'rgba(0,0,0,0.35)',
//                 borderWidth: tokens.borderWidth.md,
//                 borderColor: theme.colors.muted,
//                 shadowColor: '#000',
//                 shadowOpacity: 0.2,
//                 shadowRadius: 8,
//                 shadowOffset: {width: 0, height: 4},
//               },
//             ]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>

//         {/* Photo Library Button */}
//         <AppleTouchFeedback onPress={handleNavigate}>
//           <View
//             style={[
//               styles.fabButton,
//               {
//                 backgroundColor: 'rgba(0,0,0,0.35)',
//                 borderWidth: tokens.borderWidth.md,
//                 borderColor: theme.colors.muted,
//                 shadowColor: '#000',
//                 shadowOpacity: 0.2,
//                 shadowRadius: 8,
//                 shadowOffset: {width: 0, height: 4},
//               },
//             ]}>
//             <MaterialIcons
//               name="photo-library"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>
//     </ReAnimated.View>
//   );
// }

///////////////////

// import {useEffect, useRef, useState} from 'react';
// import {
//   Dimensions,
//   FlatList,
//   ListRenderItemInfo,
//   Platform,
//   TextStyle,
//   View,
//   ViewStyle,
//   Text,
//   Pressable,
//   StyleSheet,
//   ImageStyle,
//   Share,
//   Image,
//   StatusBar,
// } from 'react-native';
// import Video, {ResizeMode, VideoRef} from 'react-native-video';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {videos, videos2, videos3} from '../assets/data/video-urls';
// import {fontScale, moderateScale} from '../utils/scale';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

// // ✅ Use full 'screen' height on Android; 'window' on iOS
// const SCREEN = Platform.select({
//   android: Dimensions.get('screen'),
//   ios: Dimensions.get('window'),
// });
// const SCREEN_HEIGHT = SCREEN!.height;
// const SCREEN_WIDTH = SCREEN!.width;

// interface VideoWrapperProps {
//   data: ListRenderItemInfo<string>;
//   allVideos: string[];
//   visibleIndex: number;
//   pause: () => void;
//   share: (videoURL: string) => void;
//   pauseOverride: boolean;
// }

// const VideoWrapper = ({
//   data,
//   allVideos,
//   visibleIndex,
//   pause,
//   pauseOverride,
//   share,
// }: VideoWrapperProps) => {
//   const {index, item} = data;
//   const videoRef = useRef<VideoRef>(null);
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: fontScale(tokens.fontSize['5xl']),
//       fontWeight: '900',
//       letterSpacing: 3,
//       color: 'white',
//       textTransform: 'uppercase',
//     },
//   });

//   useEffect(() => {
//     videoRef.current?.seek(0);
//   }, [visibleIndex]);

//   return (
//     // ✅ Each item fills the screen exactly
//     <View
//       style={{
//         height: SCREEN_HEIGHT,
//         width: SCREEN_WIDTH,
//         backgroundColor: 'black',
//       }}>
//       <Video
//         ref={videoRef}
//         source={{uri: allVideos[index]}}
//         style={StyleSheet.absoluteFill}
//         resizeMode={ResizeMode.COVER}
//         paused={visibleIndex !== index || pauseOverride}
//         repeat
//       />
//       <Pressable onPress={pause} style={styles.overlay} />
//     </View>
//   );
// };

// export default function VideoFeedScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const [allVideos, setAllVideos] = useState(videos);
//   const [visibleIndex, setVisibleIndex] = useState(0);
//   const [pauseOverride, setPauseOverride] = useState(false);
//   const numOfRefreshes = useRef(0);
//   const insets = useSafeAreaInsets();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: 42,
//       fontWeight: '700',
//       letterSpacing: 3,
//       color: 'white',
//       textTransform: 'uppercase',
//     },
//     fabContainer: {
//       position: 'absolute',
//       bottom: insets.bottom + 80,
//       right: 24,
//       zIndex: 10,
//     },
//     fabButton: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       backgroundColor: 'transparent',

//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 10,
//       elevation: 6,
//     },
//   });

//   useEffect(() => {
//     StatusBar.setTranslucent(true);
//     StatusBar.setBackgroundColor('transparent');
//     StatusBar.setBarStyle('light-content');
//   }, []);

//   const fetchMoreData = () => {
//     if (numOfRefreshes.current === 0)
//       setAllVideos(prev => [...prev, ...videos2]);
//     if (numOfRefreshes.current === 1)
//       setAllVideos(prev => [...prev, ...videos3]);
//     numOfRefreshes.current += 1;
//   };

//   const onViewableItemsChanged = (event: any) => {
//     const newIndex = Number(event.viewableItems.at(-1)?.key ?? 0);
//     setVisibleIndex(newIndex);
//   };

//   const pause = () => setPauseOverride(v => !v);

//   const handleNavigate = () => {
//     // ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('ImageCarouselScreen'); // ✅ navigate to your screen
//   };

//   // 🔹 iOS version detection for fallback
//   const isiOS25OrLower =
//     Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) <= 25;

//   return (
//     <View style={{flex: 1, backgroundColor: 'black'}}>
//       <FlatList
//         data={allVideos}
//         renderItem={data => (
//           <VideoWrapper
//             data={data}
//             allVideos={allVideos}
//             visibleIndex={visibleIndex}
//             pause={pause}
//             pauseOverride={pauseOverride}
//             share={function (videoURL: string): void {
//               throw new Error('Function not implemented.');
//             }}
//           />
//         )}
//         keyExtractor={(_, i) => String(i)}
//         initialNumToRender={1}
//         pagingEnabled
//         decelerationRate="fast"
//         showsVerticalScrollIndicator={false}
//         onViewableItemsChanged={onViewableItemsChanged}
//         onEndReached={fetchMoreData}
//         onEndReachedThreshold={0.3}
//         snapToInterval={SCREEN_HEIGHT}
//         getItemLayout={(_, index) => ({
//           length: SCREEN_HEIGHT,
//           offset: SCREEN_HEIGHT * index,
//           index,
//         })}
//         removeClippedSubviews
//         windowSize={3}
//       />

//       {/* 🟣 Centered transparent overlay text */}
//       <View style={styles.overlayTextContainer} pointerEvents="none">
//         <Text style={styles.overlayText}>StylHelpr</Text>
//       </View>

//       {/* 🔘 Floating FAB */}
//       <View style={styles.fabContainer}>
//         <AppleTouchFeedback onPress={handleNavigate}>
//           {isLiquidGlassSupported && !isiOS25OrLower ? (
//             <LiquidGlassView
//               style={{
//                 borderRadius: 50,
//                 borderWidth: tokens.borderWidth.md,
//                 borderColor: theme.colors.foreground,
//               }}
//               effect="clear"
//               tintColor={
//                 theme.mode === 'light'
//                   ? 'rgba(255,255,255,0.55)'
//                   : 'rgba(0,0,0,0.44)'
//               }
//               colorScheme={theme.mode === 'light' ? 'light' : 'dark'}>
//               <View style={styles.fabButton}>
//                 <MaterialIcons
//                   name="photo-library"
//                   size={30}
//                   color={theme.colors.foreground}
//                 />
//               </View>
//             </LiquidGlassView>
//           ) : (
//             // 🔹 Fallback for iOS 25 and below or unsupported devices
//             <View
//               style={[
//                 styles.fabButton,
//                 {
//                   backgroundColor: 'rgba(0,0,0,0.35)',
//                   borderWidth: tokens.borderWidth.md,
//                   borderColor: theme.colors.muted,
//                   shadowColor: '#000',
//                   shadowOpacity: 0.2,
//                   shadowRadius: 8,
//                   shadowOffset: {width: 0, height: 4},
//                 },
//               ]}>
//               <MaterialIcons
//                 name="photo-library"
//                 size={30}
//                 color={theme.colors.buttonText1}
//               />
//             </View>
//           )}
//         </AppleTouchFeedback>
//       </View>
//     </View>
//   );
// }

/////////////////

// import {useEffect, useRef, useState} from 'react';
// import {
//   Dimensions,
//   FlatList,
//   ListRenderItemInfo,
//   Platform,
//   TextStyle,
//   View,
//   ViewStyle,
//   Text,
//   Pressable,
//   StyleSheet,
//   ImageStyle,
//   Share,
//   Image,
//   StatusBar,
// } from 'react-native';
// import Video, {ResizeMode, VideoRef} from 'react-native-video';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {videos, videos2, videos3} from '../assets/data/video-urls';
// import {fontScale, moderateScale} from '../utils/scale';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

// // ✅ Use full 'screen' height on Android; 'window' on iOS
// const SCREEN = Platform.select({
//   android: Dimensions.get('screen'),
//   ios: Dimensions.get('window'),
// });
// const SCREEN_HEIGHT = SCREEN!.height;
// const SCREEN_WIDTH = SCREEN!.width;

// interface VideoWrapperProps {
//   data: ListRenderItemInfo<string>;
//   allVideos: string[];
//   visibleIndex: number;
//   pause: () => void;
//   share: (videoURL: string) => void;
//   pauseOverride: boolean;
// }

// const VideoWrapper = ({
//   data,
//   allVideos,
//   visibleIndex,
//   pause,
//   pauseOverride,
//   share,
// }: VideoWrapperProps) => {
//   const {index, item} = data;
//   const videoRef = useRef<VideoRef>(null);
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: fontScale(tokens.fontSize['5xl']),
//       fontWeight: '900',
//       letterSpacing: 3,
//       color: 'white',
//       textTransform: 'uppercase',
//     },
//   });

//   useEffect(() => {
//     videoRef.current?.seek(0);
//   }, [visibleIndex]);

//   return (
//     // ✅ Each item fills the screen exactly
//     <View
//       style={{
//         height: SCREEN_HEIGHT,
//         width: SCREEN_WIDTH,
//         backgroundColor: 'black',
//       }}>
//       <Video
//         ref={videoRef}
//         source={{uri: allVideos[index]}}
//         style={StyleSheet.absoluteFill}
//         resizeMode={ResizeMode.COVER}
//         paused={visibleIndex !== index || pauseOverride}
//         repeat
//       />
//       <Pressable onPress={pause} style={styles.overlay} />
//     </View>
//   );
// };

// export default function VideoFeedScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const [allVideos, setAllVideos] = useState(videos);
//   const [visibleIndex, setVisibleIndex] = useState(0);
//   const [pauseOverride, setPauseOverride] = useState(false);
//   const numOfRefreshes = useRef(0);
//   const insets = useSafeAreaInsets();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: 88,
//       fontWeight: '900',
//       letterSpacing: 3,
//       color: 'white',
//     },
//     fabContainer: {
//       position: 'absolute',
//       bottom: insets.bottom + 80,
//       right: 24,
//       zIndex: 10,
//     },
//     fabButton: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       backgroundColor: 'transparent',

//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 10,
//       elevation: 6,
//     },
//   });

//   useEffect(() => {
//     StatusBar.setTranslucent(true);
//     StatusBar.setBackgroundColor('transparent');
//     StatusBar.setBarStyle('light-content');
//   }, []);

//   const fetchMoreData = () => {
//     if (numOfRefreshes.current === 0)
//       setAllVideos(prev => [...prev, ...videos2]);
//     if (numOfRefreshes.current === 1)
//       setAllVideos(prev => [...prev, ...videos3]);
//     numOfRefreshes.current += 1;
//   };

//   const onViewableItemsChanged = (event: any) => {
//     const newIndex = Number(event.viewableItems.at(-1)?.key ?? 0);
//     setVisibleIndex(newIndex);
//   };

//   const pause = () => setPauseOverride(v => !v);

//   const handleNavigate = () => {
//     // ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('ImageCarouselScreen'); // ✅ navigate to your screen
//   };

//   // 🔹 iOS version detection for fallback
//   const isiOS25OrLower =
//     Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) <= 25;

//   return (
//     <View style={{flex: 1, backgroundColor: 'black'}}>
//       <FlatList
//         data={allVideos}
//         renderItem={data => (
//           <VideoWrapper
//             data={data}
//             allVideos={allVideos}
//             visibleIndex={visibleIndex}
//             pause={pause}
//             pauseOverride={pauseOverride}
//             share={function (videoURL: string): void {
//               throw new Error('Function not implemented.');
//             }}
//           />
//         )}
//         keyExtractor={(_, i) => String(i)}
//         initialNumToRender={1}
//         pagingEnabled
//         decelerationRate="fast"
//         showsVerticalScrollIndicator={false}
//         onViewableItemsChanged={onViewableItemsChanged}
//         onEndReached={fetchMoreData}
//         onEndReachedThreshold={0.3}
//         snapToInterval={SCREEN_HEIGHT}
//         getItemLayout={(_, index) => ({
//           length: SCREEN_HEIGHT,
//           offset: SCREEN_HEIGHT * index,
//           index,
//         })}
//         removeClippedSubviews
//         windowSize={3}
//       />

//       {/* 🟣 Centered transparent overlay text */}
//       <View style={styles.overlayTextContainer} pointerEvents="none">
//         <Text style={styles.overlayText}>StylHelpr</Text>
//       </View>

//       {/* 🔘 Floating FAB */}
//       <View style={styles.fabContainer}>
//         <AppleTouchFeedback onPress={handleNavigate}>
//           {isLiquidGlassSupported && !isiOS25OrLower ? (
//             <LiquidGlassView
//               style={{
//                 borderRadius: 50,
//                 borderWidth: tokens.borderWidth.md,
//                 borderColor: theme.colors.foreground,
//               }}
//               effect="clear"
//               tintColor={
//                 theme.mode === 'light'
//                   ? 'rgba(255,255,255,0.55)'
//                   : 'rgba(0,0,0,0.44)'
//               }
//               colorScheme={theme.mode === 'light' ? 'light' : 'dark'}>
//               <View style={styles.fabButton}>
//                 <MaterialIcons
//                   name="photo-library"
//                   size={30}
//                   color={theme.colors.foreground}
//                 />
//               </View>
//             </LiquidGlassView>
//           ) : (
//             // 🔹 Fallback for iOS 25 and below or unsupported devices
//             <View
//               style={[
//                 styles.fabButton,
//                 {
//                   backgroundColor: 'rgba(0,0,0,0.35)',
//                   borderWidth: tokens.borderWidth.md,
//                   borderColor: theme.colors.muted,
//                   shadowColor: '#000',
//                   shadowOpacity: 0.2,
//                   shadowRadius: 8,
//                   shadowOffset: {width: 0, height: 4},
//                 },
//               ]}>
//               <MaterialIcons
//                 name="photo-library"
//                 size={30}
//                 color={theme.colors.buttonText1}
//               />
//             </View>
//           )}
//         </AppleTouchFeedback>
//       </View>
//     </View>
//   );
// }

/////////////////////////

// import {useEffect, useRef, useState} from 'react';
// import {
//   Dimensions,
//   FlatList,
//   ListRenderItemInfo,
//   Platform,
//   TextStyle,
//   View,
//   ViewStyle,
//   Text,
//   Pressable,
//   StyleSheet,
//   ImageStyle,
//   Share,
//   Image,
//   StatusBar,
// } from 'react-native';
// import Video, {ResizeMode, VideoRef} from 'react-native-video';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {videos, videos2, videos3} from '../assets/data/video-urls';
// import {fontScale, moderateScale} from '../utils/scale';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

// // ✅ Use full 'screen' height on Android; 'window' on iOS
// const SCREEN = Platform.select({
//   android: Dimensions.get('screen'),
//   ios: Dimensions.get('window'),
// });
// const SCREEN_HEIGHT = SCREEN!.height;
// const SCREEN_WIDTH = SCREEN!.width;

// interface VideoWrapperProps {
//   data: ListRenderItemInfo<string>;
//   allVideos: string[];
//   visibleIndex: number;
//   pause: () => void;
//   share: (videoURL: string) => void;
//   pauseOverride: boolean;
// }

// const VideoWrapper = ({
//   data,
//   allVideos,
//   visibleIndex,
//   pause,
//   pauseOverride,
//   share,
// }: VideoWrapperProps) => {
//   const {index, item} = data;
//   const videoRef = useRef<VideoRef>(null);
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: fontScale(tokens.fontSize['5xl']),
//       fontWeight: '900',
//       letterSpacing: 3,
//       color: 'white',
//       textTransform: 'uppercase',
//     },
//   });

//   useEffect(() => {
//     videoRef.current?.seek(0);
//   }, [visibleIndex]);

//   return (
//     // ✅ Each item fills the screen exactly
//     <View
//       style={{
//         height: SCREEN_HEIGHT,
//         width: SCREEN_WIDTH,
//         backgroundColor: 'black',
//       }}>
//       <Video
//         ref={videoRef}
//         source={{uri: allVideos[index]}}
//         style={StyleSheet.absoluteFill}
//         resizeMode={ResizeMode.COVER}
//         paused={visibleIndex !== index || pauseOverride}
//         repeat
//       />
//       <Pressable onPress={pause} style={styles.overlay} />
//     </View>
//   );
// };

// export default function VideoFeedScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const [allVideos, setAllVideos] = useState(videos);
//   const [visibleIndex, setVisibleIndex] = useState(0);
//   const [pauseOverride, setPauseOverride] = useState(false);
//   const numOfRefreshes = useRef(0);
//   const insets = useSafeAreaInsets();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFill,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFill,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: 88,
//       fontWeight: '900',
//       letterSpacing: 3,
//       color: 'white',
//     },
//     fabContainer: {
//       position: 'absolute',
//       bottom: insets.bottom + 80,
//       right: 24,
//       zIndex: 10,
//     },
//     fabButton: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       backgroundColor: 'transparent',

//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 10,
//       elevation: 6,
//     },
//   });

//   useEffect(() => {
//     StatusBar.setTranslucent(true);
//     StatusBar.setBackgroundColor('transparent');
//     StatusBar.setBarStyle('light-content');
//   }, []);

//   const fetchMoreData = () => {
//     if (numOfRefreshes.current === 0)
//       setAllVideos(prev => [...prev, ...videos2]);
//     if (numOfRefreshes.current === 1)
//       setAllVideos(prev => [...prev, ...videos3]);
//     numOfRefreshes.current += 1;
//   };

//   const onViewableItemsChanged = (event: any) => {
//     const newIndex = Number(event.viewableItems.at(-1)?.key ?? 0);
//     setVisibleIndex(newIndex);
//   };

//   const pause = () => setPauseOverride(v => !v);

//   const handleNavigate = () => {
//     // ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('ImageCarouselScreen'); // ✅ navigate to your screen
//   };

//   return (
//     <View style={{flex: 1, backgroundColor: 'black'}}>
//       <FlatList
//         data={allVideos}
//         renderItem={data => (
//           <VideoWrapper
//             data={data}
//             allVideos={allVideos}
//             visibleIndex={visibleIndex}
//             pause={pause}
//             pauseOverride={pauseOverride}
//             share={function (videoURL: string): void {
//               throw new Error('Function not implemented.');
//             }}
//           />
//         )}
//         keyExtractor={(_, i) => String(i)}
//         initialNumToRender={1}
//         pagingEnabled
//         decelerationRate="fast"
//         showsVerticalScrollIndicator={false}
//         onViewableItemsChanged={onViewableItemsChanged}
//         onEndReached={fetchMoreData}
//         onEndReachedThreshold={0.3}
//         snapToInterval={SCREEN_HEIGHT}
//         getItemLayout={(_, index) => ({
//           length: SCREEN_HEIGHT,
//           offset: SCREEN_HEIGHT * index,
//           index,
//         })}
//         removeClippedSubviews
//         windowSize={3}
//       />

//       {/* 🟣 Centered transparent overlay text */}
//       <View style={styles.overlayTextContainer} pointerEvents="none">
//         <Text style={styles.overlayText}>StylHelpr</Text>
//       </View>

//       {/* 🔘 Floating FAB */}
//       <View style={styles.fabContainer}>
//         <AppleTouchFeedback onPress={handleNavigate}>
//           <LiquidGlassView
//             style={{
//               borderRadius: 50,
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.foreground,
//             }}
//             // interactive
//             effect="clear"
//             tintColor="rgba(0, 0, 0, 0)"
//             colorScheme="system">
//             <View style={styles.fabButton}>
//               <MaterialIcons
//                 name="photo-library"
//                 size={30}
//                 color={theme.colors.foreground}
//               />
//             </View>
//           </LiquidGlassView>
//         </AppleTouchFeedback>
//       </View>
//     </View>
//   );
// }

/////////////////

// import {useEffect, useRef, useState} from 'react';
// import {
//   Dimensions,
//   FlatList,
//   ListRenderItemInfo,
//   Platform,
//   TextStyle,
//   View,
//   ViewStyle,
//   Text,
//   Pressable,
//   StyleSheet,
//   ImageStyle,
//   Share,
//   Image,
//   StatusBar,
// } from 'react-native';
// import Video, {ResizeMode, VideoRef} from 'react-native-video';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {videos, videos2, videos3} from '../assets/data/video-urls';
// import {fontScale, moderateScale} from '../utils/scale';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// // ✅ Use full 'screen' height on Android; 'window' on iOS
// const SCREEN = Platform.select({
//   android: Dimensions.get('screen'),
//   ios: Dimensions.get('window'),
// });
// const SCREEN_HEIGHT = SCREEN!.height;
// const SCREEN_WIDTH = SCREEN!.width;

// interface VideoWrapperProps {
//   data: ListRenderItemInfo<string>;
//   allVideos: string[];
//   visibleIndex: number;
//   pause: () => void;
//   share: (videoURL: string) => void;
//   pauseOverride: boolean;
// }

// const VideoWrapper = ({
//   data,
//   allVideos,
//   visibleIndex,
//   pause,
//   pauseOverride,
//   share,
// }: VideoWrapperProps) => {
//   const {index, item} = data;
//   const videoRef = useRef<VideoRef>(null);
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: fontScale(tokens.fontSize['5xl']),
//       fontWeight: '900',
//       letterSpacing: 3,
//       color: 'white',
//       textTransform: 'uppercase',
//     },
//   });

//   useEffect(() => {
//     videoRef.current?.seek(0);
//   }, [visibleIndex]);

//   return (
//     // ✅ Each item fills the screen exactly
//     <View
//       style={{
//         height: SCREEN_HEIGHT,
//         width: SCREEN_WIDTH,
//         backgroundColor: 'black',
//       }}>
//       <Video
//         ref={videoRef}
//         source={{uri: allVideos[index]}}
//         style={StyleSheet.absoluteFill}
//         resizeMode={ResizeMode.COVER}
//         paused={visibleIndex !== index || pauseOverride}
//         repeat
//       />
//       <Pressable onPress={pause} style={styles.overlay} />
//     </View>
//   );
// };

// export default function VideoFeedScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const [allVideos, setAllVideos] = useState(videos);
//   const [visibleIndex, setVisibleIndex] = useState(0);
//   const [pauseOverride, setPauseOverride] = useState(false);
//   const numOfRefreshes = useRef(0);
//   const insets = useSafeAreaInsets();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: 88,
//       fontWeight: '900',
//       letterSpacing: 3,
//       color: 'white',
//     },
//     fabContainer: {
//       position: 'absolute',
//       bottom: insets.bottom + 90,
//       right: 24,
//       zIndex: 10,
//       borderRadius: 50,
//       borderWidth: 2,
//       borderColor: 'white',
//     },
//     fabButton: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       backgroundColor: 'transparent',

//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 10,
//       elevation: 6,
//     },
//   });

//   useEffect(() => {
//     StatusBar.setTranslucent(true);
//     StatusBar.setBackgroundColor('transparent');
//     StatusBar.setBarStyle('light-content');
//   }, []);

//   const fetchMoreData = () => {
//     if (numOfRefreshes.current === 0)
//       setAllVideos(prev => [...prev, ...videos2]);
//     if (numOfRefreshes.current === 1)
//       setAllVideos(prev => [...prev, ...videos3]);
//     numOfRefreshes.current += 1;
//   };

//   const onViewableItemsChanged = (event: any) => {
//     const newIndex = Number(event.viewableItems.at(-1)?.key ?? 0);
//     setVisibleIndex(newIndex);
//   };

//   const pause = () => setPauseOverride(v => !v);

//   const handleNavigate = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('ImageCarouselScreen'); // ✅ navigate to your screen
//   };

//   return (
//     <View style={{flex: 1, backgroundColor: 'black'}}>
//       <FlatList
//         data={allVideos}
//         renderItem={data => (
//           <VideoWrapper
//             data={data}
//             allVideos={allVideos}
//             visibleIndex={visibleIndex}
//             pause={pause}
//             pauseOverride={pauseOverride}
//             share={function (videoURL: string): void {
//               throw new Error('Function not implemented.');
//             }}
//           />
//         )}
//         keyExtractor={(_, i) => String(i)}
//         initialNumToRender={1}
//         pagingEnabled
//         decelerationRate="fast"
//         showsVerticalScrollIndicator={false}
//         onViewableItemsChanged={onViewableItemsChanged}
//         onEndReached={fetchMoreData}
//         onEndReachedThreshold={0.3}
//         snapToInterval={SCREEN_HEIGHT}
//         getItemLayout={(_, index) => ({
//           length: SCREEN_HEIGHT,
//           offset: SCREEN_HEIGHT * index,
//           index,
//         })}
//         removeClippedSubviews
//         windowSize={3}
//       />

//       {/* 🟣 Centered transparent overlay text */}
//       <View style={styles.overlayTextContainer} pointerEvents="none">
//         <Text style={styles.overlayText}>StylHelpr</Text>
//       </View>

//       {/* 🔘 Floating FAB */}
//       <View style={styles.fabContainer}>
//         <AppleTouchFeedback onPress={handleNavigate} hapticStyle="impactMedium">
//           <View style={styles.fabButton}>
//             <MaterialIcons
//               name="photo-library"
//               size={30}
//               color={theme.colors.foreground}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>
//     </View>
//   );
// }

//////////////////

// import {useEffect, useRef, useState} from 'react';
// import {
//   Dimensions,
//   FlatList,
//   ListRenderItemInfo,
//   Platform,
//   TextStyle,
//   View,
//   ViewStyle,
//   Text,
//   Pressable,
//   StyleSheet,
//   ImageStyle,
//   Share,
//   Image,
//   StatusBar,
// } from 'react-native';
// import Video, {ResizeMode, VideoRef} from 'react-native-video';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {videos, videos2, videos3} from '../assets/data/video-urls';
// import {fontScale, moderateScale} from '../utils/scale';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {SafeAreaView} from 'react-native-safe-area-context';

// // ✅ Use full 'screen' height on Android; 'window' on iOS
// const SCREEN = Platform.select({
//   android: Dimensions.get('screen'),
//   ios: Dimensions.get('window'),
// });
// const SCREEN_HEIGHT = SCREEN!.height;
// const SCREEN_WIDTH = SCREEN!.width;

// interface VideoWrapperProps {
//   data: ListRenderItemInfo<string>;
//   allVideos: string[];
//   visibleIndex: number;
//   pause: () => void;
//   share: (videoURL: string) => void;
//   pauseOverride: boolean;
// }

// const VideoWrapper = ({
//   data,
//   allVideos,
//   visibleIndex,
//   pause,
//   pauseOverride,
//   share,
// }: VideoWrapperProps) => {
//   const {index, item} = data;
//   const videoRef = useRef<VideoRef>(null);
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: fontScale(tokens.fontSize['5xl']),
//       fontWeight: '900',
//       letterSpacing: 3,
//       color: 'white',
//       textTransform: 'uppercase',
//     },
//   });

//   useEffect(() => {
//     videoRef.current?.seek(0);
//   }, [visibleIndex]);

//   return (
//     // ✅ Each item fills the screen exactly
//     <View
//       style={{
//         height: SCREEN_HEIGHT,
//         width: SCREEN_WIDTH,
//         backgroundColor: 'black',
//       }}>
//       <Video
//         ref={videoRef}
//         source={{uri: allVideos[index]}}
//         style={StyleSheet.absoluteFill}
//         resizeMode={ResizeMode.COVER}
//         paused={visibleIndex !== index || pauseOverride}
//         repeat
//       />
//       <Pressable onPress={pause} style={styles.overlay} />
//     </View>
//   );
// };

// export default function VideoFeedScreen() {
//   const [allVideos, setAllVideos] = useState(videos);
//   const [visibleIndex, setVisibleIndex] = useState(0);
//   const [pauseOverride, setPauseOverride] = useState(false);
//   const numOfRefreshes = useRef(0);
//   const insets = useSafeAreaInsets();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     overlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'black',
//       opacity: 0.15,
//     },
//     overlayTextContainer: {
//       ...StyleSheet.absoluteFillObject,
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 9999,
//     },
//     overlayText: {
//       fontSize: 88,
//       fontWeight: '900',
//       letterSpacing: 3,
//       color: 'white',
//     },
//   });

//   useEffect(() => {
//     StatusBar.setTranslucent(true);
//     StatusBar.setBackgroundColor('transparent');
//     StatusBar.setBarStyle('light-content');
//   }, []);

//   const fetchMoreData = () => {
//     if (numOfRefreshes.current === 0)
//       setAllVideos(prev => [...prev, ...videos2]);
//     if (numOfRefreshes.current === 1)
//       setAllVideos(prev => [...prev, ...videos3]);
//     numOfRefreshes.current += 1;
//   };

//   const onViewableItemsChanged = (event: any) => {
//     const newIndex = Number(event.viewableItems.at(-1)?.key ?? 0);
//     setVisibleIndex(newIndex);
//   };

//   const pause = () => setPauseOverride(v => !v);

//   const share = (videoURL: string) => {
//     setPauseOverride(true);
//     setTimeout(() => {
//       Share.share({
//         title: 'Share This Video',
//         message: `Check out: ${videoURL}`,
//       });
//     }, 100);
//   };

//   return (
//     <View style={{flex: 1, backgroundColor: 'black'}}>
//       <FlatList
//         data={allVideos}
//         renderItem={data => (
//           <VideoWrapper
//             data={data}
//             allVideos={allVideos}
//             visibleIndex={visibleIndex}
//             pause={pause}
//             share={share}
//             pauseOverride={pauseOverride}
//           />
//         )}
//         keyExtractor={(_, i) => String(i)}
//         initialNumToRender={1}
//         pagingEnabled
//         decelerationRate="fast"
//         showsVerticalScrollIndicator={false}
//         onViewableItemsChanged={onViewableItemsChanged}
//         onEndReached={fetchMoreData}
//         onEndReachedThreshold={0.3}
//         snapToInterval={SCREEN_HEIGHT}
//         getItemLayout={(_, index) => ({
//           length: SCREEN_HEIGHT,
//           offset: SCREEN_HEIGHT * index,
//           index,
//         })}
//         removeClippedSubviews
//         windowSize={3}
//       />

//       {/* 🟣 Centered transparent overlay text */}
//       <View style={styles.overlayTextContainer} pointerEvents="none">
//         <Text style={styles.overlayText}>StylHelpr</Text>
//       </View>
//     </View>
//   );
// }

///////////////////////

// import {useEffect, useRef, useState} from 'react';
// import {
//   Dimensions,
//   FlatList,
//   ListRenderItemInfo,
//   Platform,
//   TextStyle,
//   View,
//   ViewStyle,
//   Text,
//   Pressable,
//   StyleSheet,
//   ImageStyle,
//   Share,
//   Image,
//   StatusBar,
// } from 'react-native';
// import Video, {ResizeMode, VideoRef} from 'react-native-video';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {videos, videos2, videos3} from '../assets/data/video-urls';

// // ✅ Use full 'screen' height on Android; 'window' on iOS
// const SCREEN = Platform.select({
//   android: Dimensions.get('screen'),
//   ios: Dimensions.get('window'),
// });
// const SCREEN_HEIGHT = SCREEN!.height;
// const SCREEN_WIDTH = SCREEN!.width;

// interface VideoWrapperProps {
//   data: ListRenderItemInfo<string>;
//   allVideos: string[];
//   visibleIndex: number;
//   pause: () => void;
//   share: (videoURL: string) => void;
//   pauseOverride: boolean;
// }

// const VideoWrapper = ({
//   data,
//   allVideos,
//   visibleIndex,
//   pause,
//   pauseOverride,
//   share,
// }: VideoWrapperProps) => {
//   const {index, item} = data;
//   const videoRef = useRef<VideoRef>(null);

//   useEffect(() => {
//     videoRef.current?.seek(0);
//   }, [visibleIndex]);

//   return (
//     // ✅ Item is EXACTLY one screen tall
//     <View
//       style={{
//         height: SCREEN_HEIGHT,
//         width: SCREEN_WIDTH,
//         backgroundColor: 'black',
//       }}>
//       <Video
//         ref={videoRef}
//         source={{uri: allVideos[index]}}
//         // ✅ Fill the item completely
//         style={StyleSheet.absoluteFill}
//         resizeMode={ResizeMode.COVER}
//         // resizeMode={ResizeMode.CONTAIN}
//         paused={visibleIndex !== index || pauseOverride}
//         repeat
//       />

//       <Pressable onPress={pause} style={styles.overlay} />

//       <Pressable
//         onPress={() => share(item)}
//         style={styles.shareButtonContainer}>
//         <Image
//           source={{uri: 'share_icon_placeholder'}}
//           style={styles.shareButtonImage}
//         />
//         <Text style={styles.shareButtonText}>Share</Text>
//       </Pressable>
//     </View>
//   );
// };

// export default function VideoFeedScreen() {
//   const [allVideos, setAllVideos] = useState(videos);
//   const [visibleIndex, setVisibleIndex] = useState(0);
//   const [pauseOverride, setPauseOverride] = useState(false);
//   const numOfRefreshes = useRef(0);
//   const insets = useSafeAreaInsets();

//   useEffect(() => {
//     // ✅ allow content under status bar
//     StatusBar.setTranslucent(true);
//     StatusBar.setBackgroundColor('transparent');
//     StatusBar.setBarStyle('light-content');
//   }, []);

//   const fetchMoreData = () => {
//     if (numOfRefreshes.current === 0)
//       setAllVideos(prev => [...prev, ...videos2]);
//     if (numOfRefreshes.current === 1)
//       setAllVideos(prev => [...prev, ...videos3]);
//     numOfRefreshes.current += 1;
//   };

//   const onViewableItemsChanged = (event: any) => {
//     const newIndex = Number(event.viewableItems.at(-1)?.key ?? 0);
//     setVisibleIndex(newIndex);
//   };

//   const pause = () => setPauseOverride(v => !v);

//   const share = (videoURL: string) => {
//     setPauseOverride(true);
//     setTimeout(() => {
//       Share.share({
//         title: 'Share This Video',
//         message: `Check out: ${videoURL}`,
//       });
//     }, 100);
//   };

//   return (
//     // ⚠️ Do NOT wrap this screen with SafeAreaView; keep it a plain View
//     <View style={{flex: 1, backgroundColor: 'black'}}>
//       <FlatList
//         data={allVideos}
//         renderItem={data => (
//           <VideoWrapper
//             data={data}
//             allVideos={allVideos}
//             visibleIndex={visibleIndex}
//             pause={pause}
//             share={share}
//             pauseOverride={pauseOverride}
//           />
//         )}
//         keyExtractor={(_, i) => String(i)}
//         initialNumToRender={1}
//         pagingEnabled
//         decelerationRate="fast"
//         showsVerticalScrollIndicator={false}
//         onViewableItemsChanged={onViewableItemsChanged}
//         onEndReached={fetchMoreData}
//         onEndReachedThreshold={0.3}
//         // ✅ Snap exactly to screen height
//         snapToInterval={SCREEN_HEIGHT}
//         getItemLayout={(_, index) => ({
//           length: SCREEN_HEIGHT,
//           offset: SCREEN_HEIGHT * index,
//           index,
//         })}
//         // Optional perf
//         removeClippedSubviews
//         windowSize={3}
//       />

//       {/* {pauseOverride && (
//         <Pressable style={styles.pauseIndicator}>
//           <Image
//             source={{uri: 'pause_icon_placeholder'}}
//             style={styles.playButtonImage}
//           />
//         </Pressable>
//       )} */}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'black',
//     opacity: 0.15,
//   },
//   pauseIndicator: {
//     position: 'absolute',
//     alignSelf: 'center',
//     top: SCREEN_HEIGHT / 2 - 25,
//   },
//   playButtonImage: {
//     height: 50,
//     width: 50,
//     resizeMode: 'contain',
//   },
//   // shareButtonContainer: {
//   //   position: 'absolute',
//   //   zIndex: 999,
//   //   bottom: Platform.OS === 'ios' ? 80 : 60,
//   //   right: 16,
//   //   alignItems: 'center',
//   //   gap: 8,
//   // },
//   // shareButtonImage: {
//   //   height: 25,
//   //   width: 25,
//   //   resizeMode: 'contain',
//   //   tintColor: 'white',
//   // },
//   // shareButtonText: {
//   //   color: 'white',
//   //   fontSize: 12,
//   //   fontWeight: 'bold',
//   // },
// });

//////////////////////////

// import {useEffect, useRef, useState} from 'react';
// import {
//   Dimensions,
//   FlatList,
//   ListRenderItemInfo,
//   Platform,
//   TextStyle,
//   View,
//   ViewStyle,
//   Text,
//   Pressable,
//   StyleSheet,
//   ImageStyle,
//   Share,
//   Image,
//   StatusBar,
// } from 'react-native';
// import Video, {ResizeMode, VideoRef} from 'react-native-video';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
// import {videos, videos2, videos3} from '../assets/data/video-urls';

// const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');

// interface VideoWrapperProps {
//   data: ListRenderItemInfo<string>;
//   allVideos: string[];
//   visibleIndex: number;
//   pause: () => void;
//   share: (videoURL: string) => void;
//   pauseOverride: boolean;
// }

// const VideoWrapper = ({
//   data,
//   allVideos,
//   visibleIndex,
//   pause,
//   pauseOverride,
//   share,
// }: VideoWrapperProps) => {
//   const {index, item} = data;
//   const videoRef = useRef<VideoRef>(null);

//   useEffect(() => {
//     videoRef.current?.seek(0);
//   }, [visibleIndex]);

//   return (
//     <View style={{height: SCREEN_HEIGHT, width: SCREEN_WIDTH}}>
//       <Video
//         ref={videoRef}
//         source={{uri: allVideos[index]}}
//         style={StyleSheet.absoluteFill}
//         resizeMode={ResizeMode.COVER}
//         paused={visibleIndex !== index || pauseOverride}
//         repeat
//       />

//       <Pressable onPress={pause} style={$overlay} />

//       <Pressable onPress={() => share(item)} style={$shareButtonContainer}>
//         <Image
//           source={{uri: 'share_icon_placeholder'}}
//           style={$shareButtonImage}
//         />
//         <Text style={$shareButtonText}>Share</Text>
//       </Pressable>
//     </View>
//   );
// };

// export default function VideoFeedScreen() {
//   const [allVideos, setAllVideos] = useState(videos);
//   const [visibleIndex, setVisibleIndex] = useState(0);
//   const [pauseOverride, setPauseOverride] = useState(false);
//   const numOfRefreshes = useRef(0);
//   const insets = useSafeAreaInsets();

//   // ensure full-bleed content behind transparent header/nav
//   useEffect(() => {
//     StatusBar.setTranslucent(true);
//     StatusBar.setBackgroundColor('transparent');
//     StatusBar.setBarStyle('light-content');
//   }, []);

//   const fetchMoreData = () => {
//     if (numOfRefreshes.current === 0) setAllVideos([...allVideos, ...videos2]);
//     if (numOfRefreshes.current === 1) setAllVideos([...allVideos, ...videos3]);
//     numOfRefreshes.current += 1;
//   };

//   const onViewableItemsChanged = (event: any) => {
//     const newIndex = Number(event.viewableItems.at(-1)?.key ?? 0);
//     setVisibleIndex(newIndex);
//   };

//   const pause = () => setPauseOverride(!pauseOverride);

//   const share = (videoURL: string) => {
//     setPauseOverride(true);
//     setTimeout(() => {
//       Share.share({
//         title: 'Share This Video',
//         message: `Check out: ${videoURL}`,
//       });
//     }, 100);
//   };

//   return (
//     <View style={{flex: 1, backgroundColor: 'black'}}>
//       <FlatList
//         data={allVideos}
//         renderItem={data => (
//           <VideoWrapper
//             data={data}
//             allVideos={allVideos}
//             visibleIndex={visibleIndex}
//             pause={pause}
//             share={share}
//             pauseOverride={pauseOverride}
//           />
//         )}
//         pagingEnabled
//         showsVerticalScrollIndicator={false}
//         initialNumToRender={1}
//         keyExtractor={(_, i) => String(i)}
//         onViewableItemsChanged={onViewableItemsChanged}
//         onEndReached={fetchMoreData}
//         onEndReachedThreshold={0.3}
//         snapToInterval={SCREEN_HEIGHT}
//         decelerationRate="fast"
//       />

//       {pauseOverride && (
//         <Pressable style={$pauseIndicator}>
//           <Image
//             source={{uri: 'pause_icon_placeholder'}}
//             style={$playButtonImage}
//           />
//         </Pressable>
//       )}
//     </View>
//   );
// }

// const $overlay: ViewStyle = {
//   ...StyleSheet.absoluteFillObject,
//   backgroundColor: 'black',
//   opacity: 0.2,
// };

// const $pauseIndicator: ViewStyle = {
//   position: 'absolute',
//   alignSelf: 'center',
//   top: SCREEN_HEIGHT / 2 - 25,
// };

// const $playButtonImage: ImageStyle = {
//   height: 50,
//   width: 50,
//   resizeMode: 'contain',
// };

// const $shareButtonContainer: ViewStyle = {
//   position: 'absolute',
//   zIndex: 999,
//   bottom: Platform.OS === 'ios' ? 90 : 70,
//   right: 16,
//   alignItems: 'center',
//   gap: 8,
// };

// const $shareButtonImage: ImageStyle = {
//   height: 25,
//   width: 25,
//   resizeMode: 'contain',
//   tintColor: 'white',
// };

// const $shareButtonText: TextStyle = {
//   color: 'white',
//   fontSize: 12,
//   fontWeight: 'bold',
// };

/////////////////////

// import {useEffect, useRef, useState} from 'react';
// import {
//   Dimensions,
//   FlatList,
//   ListRenderItemInfo,
//   Platform,
//   TextStyle,
//   View,
//   ViewStyle,
//   Text,
//   Pressable,
//   StyleSheet,
//   ImageStyle,
//   Share,
//   Image,
// } from 'react-native';

// import {videos, videos2, videos3} from '../assets/data/video-urls';
// import Video, {ResizeMode, VideoRef} from 'react-native-video';
// // import {Image} from 'expo-image';

// const {height, width} = Dimensions.get('window');

// interface VideoWrapper {
//   data: ListRenderItemInfo<string>;
//   allVideos: string[];
//   visibleIndex: number;
//   pause: () => void;
//   share: (videoURL: string) => void;
//   pauseOverride: boolean;
// }

// const VideoWrapper = ({
//   data,
//   allVideos,
//   visibleIndex,
//   pause,
//   pauseOverride,
//   share,
// }: VideoWrapper) => {
//   const bottomHeight = 98;
//   const {index, item} = data;

//   const videoRef = useRef<VideoRef>(null);

//   useEffect(() => {
//     videoRef.current?.seek(0);
//   }, [visibleIndex]);

//   return (
//     <View
//       style={{
//         height: Platform.OS === 'android' ? height - bottomHeight : height,
//         width,
//       }}>
//       <Video
//         ref={videoRef}
//         source={{uri: allVideos[index]}}
//         style={{height: height - bottomHeight, width}}
//         resizeMode="cover"
//         paused={visibleIndex !== index || pauseOverride}
//       />

//       <Pressable onPress={pause} style={$overlay} />

//       <Pressable onPress={() => share(item)} style={$shareButtonContainer}>
//         <Image source="share" style={$shareButtonImage} />
//         <Text style={$shareButtonText}>Share</Text>
//       </Pressable>
//     </View>
//   );
// };

// export default function VideoFeedScreen() {
//   const bottomHeight = 98;

//   const [allVideos, setAllVideos] = useState(videos);
//   const [visibleIndex, setVisibleIndex] = useState(0);
//   const [pauseOverride, setPauseOverride] = useState(false);

//   const numOfRefreshes = useRef(0);

//   const fetchMoreData = () => {
//     if (numOfRefreshes.current === 0) {
//       setAllVideos([...allVideos, ...videos2]);
//     }
//     if (numOfRefreshes.current === 1) {
//       setAllVideos([...allVideos, ...videos3]);
//     }

//     numOfRefreshes.current += 1;
//   };

//   const onViewableItemsChanged = (event: any) => {
//     const newIndex = Number(event.viewableItems.at(-1).key);
//     setVisibleIndex(newIndex);
//   };

//   const pause = () => {
//     setPauseOverride(!pauseOverride);
//   };

//   const share = (videoURL: string) => {
//     setPauseOverride(true);
//     setTimeout(() => {
//       Share.share({
//         title: 'Share This Video',
//         message: `Check out: ${videoURL}`,
//       });
//     }, 100);
//   };

//   return (
//     <View style={{flex: 1, backgroundColor: 'black'}}>
//       <FlatList
//         pagingEnabled
//         snapToInterval={
//           Platform.OS === 'android' ? height - bottomHeight : undefined
//         }
//         initialNumToRender={1}
//         showsVerticalScrollIndicator={false}
//         onViewableItemsChanged={onViewableItemsChanged}
//         data={allVideos}
//         onEndReachedThreshold={0.3}
//         onEndReached={fetchMoreData}
//         renderItem={data => {
//           return (
//             <VideoWrapper
//               data={data}
//               allVideos={allVideos}
//               visibleIndex={visibleIndex}
//               pause={pause}
//               share={share}
//               pauseOverride={pauseOverride}
//             />
//           );
//         }}
//       />
//       {pauseOverride && (
//         <Pressable style={$pauseIndicator}>
//           <Image source="pause" style={$playButtonImage} />
//         </Pressable>
//       )}
//     </View>
//   );
// }

// const $overlay: ViewStyle = {
//   ...StyleSheet.absoluteFillObject,
//   backgroundColor: 'black',
//   opacity: 0.3,
// };

// const $pauseIndicator: ViewStyle = {
//   position: 'absolute',
//   alignSelf: 'center',
//   top: height / 2 - 25,
// };

// const $playButtonImage: ImageStyle = {
//   height: 50,
//   width: 50,
//   justifyContent: 'center',
//   alignItems: 'center',
//   resizeMode: 'contain',
// };

// const $shareButtonContainer: ViewStyle = {
//   position: 'absolute',
//   zIndex: 999,
//   elevation: 999,
//   bottom: Platform.OS === 'android' ? 70 : 100,
//   right: 10,
//   alignItems: 'center',
//   gap: 8,
// };

// const $shareButtonImage: ImageStyle = {
//   height: 25,
//   width: 25,
//   justifyContent: 'center',
//   alignItems: 'center',
//   resizeMode: 'contain',
//   tintColor: 'white',
// };

// const $shareButtonText: TextStyle = {
//   color: 'white',
//   fontSize: 12,
//   fontWeight: 'bold',
// };
