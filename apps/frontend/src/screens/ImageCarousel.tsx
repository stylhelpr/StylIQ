import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {tokens} from '../styles/tokens/tokens';

const {width, height} = Dimensions.get('window');

// Card height - shows peek of next card at bottom
const CARD_HEIGHT = height * 0.87;
const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

const images = [
  require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
  require('../assets/images/headshot-6.jpg'),
  require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
  require('../assets/images/headshot-2.webp'),
  require('../assets/images/fashion/runway-200.jpg'),
  require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
  require('../assets/images/headshot-4.jpg'),
  require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
  require('../assets/images/headshot-3.jpg'),
  require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
  require('../assets/images/headshot-1.webp'),
  require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
  require('../assets/images/headshot-5.jpg'),
  require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
  require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
  require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
  require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
  require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
  require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
  require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
  require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
  require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
  require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
  require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
  require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
  require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
  require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
];

const textContent = [
  {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
  {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
  {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
  {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
  {title: 'RUNWAY READY', subtitle: 'OWN THE SPOTLIGHT'},
  {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
  {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
  {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
  {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
  {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
  {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
  {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
  {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
  {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
  {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
  {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
  {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
  {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
  {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
  {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
  {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
  {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
  {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
  {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
  {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
  {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
  {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
];

interface CardProps {
  image: any;
  index: number;
  scrollY: SharedValue<number>;
  title: string;
  subtitle: string;
  progressWidth: SharedValue<number>;
  isActive: boolean;
}

function Card({
  image,
  index,
  scrollY,
  title,
  subtitle,
  progressWidth,
  isActive,
}: CardProps) {
  const progressAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value * 100}%`,
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    const scrollPosition = scrollY.value;
    const cardScrollStart = index * CARD_HEIGHT;

    // Current card slides UP as user scrolls
    const translateY = interpolate(
      scrollPosition,
      [
        cardScrollStart - CARD_HEIGHT,
        cardScrollStart,
        cardScrollStart + CARD_HEIGHT,
      ],
      [CARD_HEIGHT, 0, -CARD_HEIGHT],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{translateY}],
    };
  });

  // Parallax effect for the image - moves slower than the card
  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scrollPosition = scrollY.value;
    const cardScrollStart = index * CARD_HEIGHT;

    // Image shifts up slightly as card scrolls (parallax)
    const imageTranslateY = interpolate(
      scrollPosition,
      [
        cardScrollStart - CARD_HEIGHT,
        cardScrollStart,
        cardScrollStart + CARD_HEIGHT,
      ],
      [50, 0, -50],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{translateY: imageTranslateY}],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    const scrollPosition = scrollY.value;
    const cardScrollStart = index * CARD_HEIGHT;

    const textBottomPosition = interpolate(
      scrollPosition,
      [cardScrollStart - CARD_HEIGHT, cardScrollStart],
      [CARD_HEIGHT - PEEK_HEIGHT / 2 - 25, 40],
      Extrapolation.CLAMP,
    );

    return {
      bottom: textBottomPosition,
    };
  });

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Animated.Image
        source={image}
        style={[styles.cardImage, imageAnimatedStyle]}
        resizeMode="cover"
      />
      {/* Gradient overlay for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)']}
        style={styles.gradientOverlay}
      />
      {/* Text content - animated position */}
      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {/* Progress bar under subtitle - only show on active card */}
        {isActive && (
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[styles.progressBar, progressAnimatedStyle]}
            />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const INTERVAL_DURATION = 8000;

export default function ImageCarouselScreen({
  navigate,
}: {
  navigate: (screen: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const screenOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const {theme} = useAppTheme();
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const currentIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    StatusBar.setHidden(true);
    // Fade in the screen
    screenOpacity.value = withTiming(1, {duration: 400});
    return () => {
      StatusBar.setHidden(false);
    };
  }, []);

  // Auto-advance every 8 seconds with progress bar
  useEffect(() => {
    // Start the progress bar animation
    const startProgress = () => {
      progressWidth.value = 0;
      progressWidth.value = withTiming(1, {duration: INTERVAL_DURATION});
    };

    // Start initial progress
    startProgress();

    const interval = setInterval(() => {
      currentIndexRef.current = (currentIndexRef.current + 1) % images.length;
      setActiveIndex(currentIndexRef.current);
      scrollViewRef.current?.scrollTo({
        y: currentIndexRef.current * CARD_HEIGHT,
        animated: true,
      });
      // Reset and restart progress bar
      startProgress();
    }, INTERVAL_DURATION);

    return () => clearInterval(interval);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      scrollY.value = e.contentOffset.y;
      // Update current index based on scroll position
    },
  });

  const screenAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: screenOpacity.value,
    };
  });

  const handleClose = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigate('HomeScreen');
  };

  const handleCommunity = () => {
    navigate('CommunityShowcaseScreen');
  };

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      {/* Cards rendered in reverse order so first card is on top */}
      <View style={styles.cardsContainer}>
        {[...images].reverse().map((img, reverseIndex) => {
          const i = images.length - 1 - reverseIndex;
          return (
            <Card
              key={i}
              image={img}
              index={i}
              scrollY={scrollY}
              title={textContent[i].title}
              subtitle={textContent[i].subtitle}
              progressWidth={progressWidth}
              isActive={i === activeIndex}
            />
          );
        })}
      </View>

      {/* Invisible scroll view for gesture handling */}
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{height: CARD_HEIGHT * images.length}}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        snapToInterval={CARD_HEIGHT}
        decelerationRate={0.1}
      />

      {/* Video Feed Button */}
      <View style={[styles.communityButton, {top: insets.top + 12}]}>
        <AppleTouchFeedback onPress={() => navigate('VideoFeedScreen')}>
          <View style={styles.fabButton}>
            <BlurView
              style={styles.closeButtonBlur}
              blurType="light"
              blurAmount={0}
              reducedTransparencyFallbackColor="rgba(255, 0, 0, 0.5)"
            />
            <View style={styles.closeButtonTint} />
            <View style={styles.fabButtonInner}>
              <MaterialIcons
                name="play-circle-outline"
                size={22}
                color="black"
              />
            </View>
          </View>
        </AppleTouchFeedback>
      </View>

      {/* Home Button - lower left */}
      <View style={[styles.homeButtonContainer, {bottom: insets.bottom + 15}]}>
        <AppleTouchFeedback onPress={handleClose}>
          <View style={styles.fabButton}>
            <BlurView
              style={styles.closeButtonBlur}
              blurType="light"
              blurAmount={0}
              reducedTransparencyFallbackColor="rgba(255, 0, 0, 0.5)"
            />
            <View style={styles.closeButtonTint} />
            <View style={styles.fabButtonInner}>
              <MaterialIcons name="home" size={22} color="black" />
            </View>
          </View>
        </AppleTouchFeedback>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  progressBarContainer: {
    width: '40%',
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
  cardsContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  cardImage: {
    width: width,
    height: CARD_HEIGHT + 100,
    marginTop: -50,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT * 0.15,
    // Shadow removed - LinearGradient doesn't support shadows efficiently
    // The gradient itself provides the darkening effect
  },
  textContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  communityButton: {
    position: 'absolute',
    right: 15,
    zIndex: 999,
  },
  videoFeedButton: {
    position: 'absolute',
    top: 108,
    right: 15,
    zIndex: 999,
  },
  fabButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    overflow: 'hidden',
  },
  fabButtonInner: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 108,
    right: 15,
    zIndex: 999,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButtonInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeButtonTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  homeButtonContainer: {
    position: 'absolute',
    left: 20,
    zIndex: 999,
  },
});

///////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   Dimensions,
//   Pressable,
//   StatusBar,
// } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
// import Animated, {
//   useSharedValue,
//   useAnimatedScrollHandler,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolation,
//   SharedValue,
//   withTiming,
// } from 'react-native-reanimated';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

// const {width, height} = Dimensions.get('window');

// // Card height - shows peek of next card at bottom
// const CARD_HEIGHT = height * 0.87;
// const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

// const images = [
//   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   require('../assets/images/headshot-6.jpg'),

//   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-3.jpg'),

//   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   require('../assets/images/headshot-1.webp'),

//   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   require('../assets/images/headshot-5.jpg'),
//   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
//   {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
//   {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
//   {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
//   {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
//   {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
//   {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
//   {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
//   {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
//   {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
//   {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
//   {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
//   {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
//   {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
//   {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
//   {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
//   {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
//   {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
//   {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
//   {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
//   {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
// ];

// interface CardProps {
//   image: any;
//   index: number;
//   scrollY: SharedValue<number>;
//   title: string;
//   subtitle: string;
//   progressWidth: SharedValue<number>;
//   isActive: boolean;
// }

// function Card({
//   image,
//   index,
//   scrollY,
//   title,
//   subtitle,
//   progressWidth,
//   isActive,
// }: CardProps) {
//   const progressAnimatedStyle = useAnimatedStyle(() => {
//     return {
//       width: `${progressWidth.value * 100}%`,
//     };
//   });

//   const animatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Current card slides UP as user scrolls
//     const translateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [CARD_HEIGHT, 0, -CARD_HEIGHT],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY}],
//     };
//   });

//   // Parallax effect for the image - moves slower than the card
//   const imageAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Image shifts up slightly as card scrolls (parallax)
//     const imageTranslateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [50, 0, -50],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY: imageTranslateY}],
//     };
//   });

//   const textAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     const textBottomPosition = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart],
//       [CARD_HEIGHT - PEEK_HEIGHT / 2 - 25, 40],
//       Extrapolation.CLAMP,
//     );

//     return {
//       bottom: textBottomPosition,
//     };
//   });

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Animated.Image
//         source={image}
//         style={[styles.cardImage, imageAnimatedStyle]}
//         resizeMode="cover"
//       />
//       {/* Gradient overlay for text readability */}
//       <LinearGradient
//         colors={['transparent', 'rgba(0,0,0,0.5)']}
//         style={styles.gradientOverlay}
//       />
//       {/* Text content - animated position */}
//       <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
//         <Text style={styles.title}>{title}</Text>
//         <Text style={styles.subtitle}>{subtitle}</Text>
//         {/* Progress bar under subtitle - only show on active card */}
//         {isActive && (
//           <View style={styles.progressBarContainer}>
//             <Animated.View
//               style={[styles.progressBar, progressAnimatedStyle]}
//             />
//           </View>
//         )}
//       </Animated.View>
//     </Animated.View>
//   );
// }

// const INTERVAL_DURATION = 8000;

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const scrollY = useSharedValue(0);
//   const screenOpacity = useSharedValue(0);
//   const progressWidth = useSharedValue(0);
//   const {theme} = useAppTheme();
//   const scrollViewRef = useRef<Animated.ScrollView>(null);
//   const currentIndexRef = useRef(0);
//   const [activeIndex, setActiveIndex] = useState(0);

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     // Fade in the screen
//     screenOpacity.value = withTiming(1, {duration: 400});
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   // Auto-advance every 8 seconds with progress bar
//   useEffect(() => {
//     // Start the progress bar animation
//     const startProgress = () => {
//       progressWidth.value = 0;
//       progressWidth.value = withTiming(1, {duration: INTERVAL_DURATION});
//     };

//     // Start initial progress
//     startProgress();

//     const interval = setInterval(() => {
//       currentIndexRef.current = (currentIndexRef.current + 1) % images.length;
//       setActiveIndex(currentIndexRef.current);
//       scrollViewRef.current?.scrollTo({
//         y: currentIndexRef.current * CARD_HEIGHT,
//         animated: true,
//       });
//       // Reset and restart progress bar
//       startProgress();
//     }, INTERVAL_DURATION);

//     return () => clearInterval(interval);
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollY.value = e.contentOffset.y;
//       // Update current index based on scroll position
//     },
//   });

//   const screenAnimatedStyle = useAnimatedStyle(() => {
//     return {
//       opacity: screenOpacity.value,
//     };
//   });

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <Animated.View style={[styles.container, screenAnimatedStyle]}>
//       {/* Cards rendered in reverse order so first card is on top */}
//       <View style={styles.cardsContainer}>
//         {[...images].reverse().map((img, reverseIndex) => {
//           const i = images.length - 1 - reverseIndex;
//           return (
//             <Card
//               key={i}
//               image={img}
//               index={i}
//               scrollY={scrollY}
//               title={textContent[i].title}
//               subtitle={textContent[i].subtitle}
//               progressWidth={progressWidth}
//               isActive={i === activeIndex}
//             />
//           );
//         })}
//       </View>

//       {/* Invisible scroll view for gesture handling */}
//       <Animated.ScrollView
//         ref={scrollViewRef}
//         style={styles.scrollView}
//         contentContainerStyle={{height: CARD_HEIGHT * images.length}}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         onScroll={scrollHandler}
//         snapToInterval={CARD_HEIGHT}
//         decelerationRate={0.1}
//       />

//       {/* Community FAB */}
//       <View style={styles.communityButton}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View style={[styles.fabButton, {borderColor: theme.colors.muted}]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Close button */}
//       <View style={styles.closeButtonContainer}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   progressBarContainer: {
//     width: '40%',
//     height: 3,
//     backgroundColor: 'rgba(255, 255, 255, 0.3)',
//     borderRadius: 1,
//     marginTop: 16,
//   },
//   progressBar: {
//     height: '100%',
//     backgroundColor: 'rgba(144, 0, 255, 1)',
//     borderRadius: 1,
//   },
//   cardsContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   scrollView: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   card: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT,
//     overflow: 'hidden',
//   },
//   cardImage: {
//     width: width,
//     height: CARD_HEIGHT + 100,
//     marginTop: -50,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT * 0.15,
//     backgroundColor: 'transparent',
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: -100},
//     shadowOpacity: 0.3,
//     shadowRadius: 100,
//   },
//   // textContainer: {
//   //   position: 'absolute',
//   //   left: 0,
//   //   right: 0,
//   //   paddingHorizontal: 20,
//   //   textAlign: 'left',
//   // },
//   // title: {
//   //   color: '#fff',
//   //   fontSize: 25,
//   //   fontWeight: '700',
//   //   letterSpacing: 1.5,
//   //   textAlign: 'left',
//   //   textTransform: 'uppercase',
//   // },
//   // subtitle: {
//   //   color: 'rgba(255, 255, 255, 0.85)',
//   //   fontSize: 12,
//   //   fontWeight: '700',
//   //   letterSpacing: 1.5,
//   //   textAlign: 'right',
//   //   textTransform: 'uppercase',
//   //   marginTop: 12,
//   // },
//   textContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   title: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     textTransform: 'uppercase',
//     marginBottom: 8,
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.85)',
//     fontSize: 12,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textTransform: 'uppercase',
//   },
//   communityButton: {
//     position: 'absolute',
//     top: 60,
//     right: 15,
//     zIndex: 999,
//   },
//   fabButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//     borderWidth: tokens.borderWidth.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 4},
//   },
//   closeButtonContainer: {
//     position: 'absolute',
//     top: 108,
//     right: 15,
//     zIndex: 999,
//   },
//   closeButton: {
//     width: 38,
//     height: 38,
//     backgroundColor: 'rgba(7, 0, 0, 1)',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.3)',
//     // shadowColor: '#000',
//     // shadowOpacity: 0.5,
//     // shadowRadius: 8,
//     // shadowOffset: {width: 0, height: 2},
//     // elevation: 10,
//     borderRadius: 20,
//   },
// });

///////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   Dimensions,
//   Pressable,
//   StatusBar,
// } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
// import Animated, {
//   useSharedValue,
//   useAnimatedScrollHandler,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolation,
//   SharedValue,
//   withTiming,
// } from 'react-native-reanimated';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

// const {width, height} = Dimensions.get('window');

// // Card height - shows peek of next card at bottom
// const CARD_HEIGHT = height * 0.87;
// const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

// const images = [
//   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   require('../assets/images/headshot-6.jpg'),

//   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-3.jpg'),

//   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   require('../assets/images/headshot-1.webp'),

//   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   require('../assets/images/headshot-5.jpg'),
//   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
//   {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
//   {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
//   {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
//   {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
//   {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
//   {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
//   {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
//   {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
//   {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
//   {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
//   {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
//   {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
//   {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
//   {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
//   {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
//   {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
//   {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
//   {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
//   {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
//   {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
// ];

// interface CardProps {
//   image: any;
//   index: number;
//   scrollY: SharedValue<number>;
//   title: string;
//   subtitle: string;
//   progressWidth: SharedValue<number>;
//   isActive: boolean;
// }

// function Card({
//   image,
//   index,
//   scrollY,
//   title,
//   subtitle,
//   progressWidth,
//   isActive,
// }: CardProps) {
//   const progressAnimatedStyle = useAnimatedStyle(() => {
//     return {
//       width: `${progressWidth.value * 100}%`,
//     };
//   });

//   const animatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Current card slides UP as user scrolls
//     const translateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [CARD_HEIGHT, 0, -CARD_HEIGHT],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY}],
//     };
//   });

//   // Parallax effect for the image - moves slower than the card
//   const imageAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Image shifts up slightly as card scrolls (parallax)
//     const imageTranslateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [50, 0, -50],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY: imageTranslateY}],
//     };
//   });

//   const textAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     const textBottomPosition = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart],
//       [CARD_HEIGHT - PEEK_HEIGHT / 2 - 25, 40],
//       Extrapolation.CLAMP,
//     );

//     return {
//       bottom: textBottomPosition,
//     };
//   });

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Animated.Image
//         source={image}
//         style={[styles.cardImage, imageAnimatedStyle]}
//         resizeMode="cover"
//       />
//       {/* Gradient overlay for text readability */}
//       <LinearGradient
//         colors={['transparent', 'rgba(0,0,0,0.5)']}
//         style={styles.gradientOverlay}
//       />
//       {/* Text content - animated position */}
//       <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
//         <Text style={styles.title}>{title}</Text>
//         <Text style={styles.subtitle}>{subtitle}</Text>
//         {/* Progress bar under subtitle - only show on active card */}
//         {isActive && (
//           <View style={styles.progressBarContainer}>
//             <Animated.View
//               style={[styles.progressBar, progressAnimatedStyle]}
//             />
//           </View>
//         )}
//       </Animated.View>
//     </Animated.View>
//   );
// }

// const INTERVAL_DURATION = 8000;

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const scrollY = useSharedValue(0);
//   const screenOpacity = useSharedValue(0);
//   const progressWidth = useSharedValue(0);
//   const {theme} = useAppTheme();
//   const scrollViewRef = useRef<Animated.ScrollView>(null);
//   const currentIndexRef = useRef(0);
//   const [activeIndex, setActiveIndex] = useState(0);

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     // Fade in the screen
//     screenOpacity.value = withTiming(1, {duration: 400});
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   // Auto-advance every 8 seconds with progress bar
//   useEffect(() => {
//     // Start the progress bar animation
//     const startProgress = () => {
//       progressWidth.value = 0;
//       progressWidth.value = withTiming(1, {duration: INTERVAL_DURATION});
//     };

//     // Start initial progress
//     startProgress();

//     const interval = setInterval(() => {
//       currentIndexRef.current = (currentIndexRef.current + 1) % images.length;
//       setActiveIndex(currentIndexRef.current);
//       scrollViewRef.current?.scrollTo({
//         y: currentIndexRef.current * CARD_HEIGHT,
//         animated: true,
//       });
//       // Reset and restart progress bar
//       startProgress();
//     }, INTERVAL_DURATION);

//     return () => clearInterval(interval);
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollY.value = e.contentOffset.y;
//       // Update current index based on scroll position
//     },
//   });

//   const screenAnimatedStyle = useAnimatedStyle(() => {
//     return {
//       opacity: screenOpacity.value,
//     };
//   });

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <Animated.View style={[styles.container, screenAnimatedStyle]}>
//       {/* Cards rendered in reverse order so first card is on top */}
//       <View style={styles.cardsContainer}>
//         {[...images].reverse().map((img, reverseIndex) => {
//           const i = images.length - 1 - reverseIndex;
//           return (
//             <Card
//               key={i}
//               image={img}
//               index={i}
//               scrollY={scrollY}
//               title={textContent[i].title}
//               subtitle={textContent[i].subtitle}
//               progressWidth={progressWidth}
//               isActive={i === activeIndex}
//             />
//           );
//         })}
//       </View>

//       {/* Invisible scroll view for gesture handling */}
//       <Animated.ScrollView
//         ref={scrollViewRef}
//         style={styles.scrollView}
//         contentContainerStyle={{height: CARD_HEIGHT * images.length}}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         onScroll={scrollHandler}
//         snapToInterval={CARD_HEIGHT}
//         decelerationRate={0.1}
//       />

//       {/* Community FAB */}
//       <View style={styles.communityButton}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View style={[styles.fabButton, {borderColor: theme.colors.muted}]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Close button */}
//       <View style={styles.closeButtonContainer}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   progressBarContainer: {
//     width: '40%',
//     height: 3,
//     backgroundColor: 'rgba(255, 255, 255, 0.3)',
//     borderRadius: 1,
//     marginTop: 16,
//   },
//   progressBar: {
//     height: '100%',
//     backgroundColor: 'rgba(144, 0, 255, 1)',
//     borderRadius: 1,
//   },
//   cardsContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   scrollView: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   card: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT,
//     overflow: 'hidden',
//   },
//   cardImage: {
//     width: width,
//     height: CARD_HEIGHT + 100,
//     marginTop: -50,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT * 0.15,
//     backgroundColor: 'transparent',
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: -100},
//     shadowOpacity: 0.3,
//     shadowRadius: 100,
//   },
//   // textContainer: {
//   //   position: 'absolute',
//   //   left: 0,
//   //   right: 0,
//   //   paddingHorizontal: 20,
//   //   textAlign: 'left',
//   // },
//   // title: {
//   //   color: '#fff',
//   //   fontSize: 25,
//   //   fontWeight: '700',
//   //   letterSpacing: 1.5,
//   //   textAlign: 'left',
//   //   textTransform: 'uppercase',
//   // },
//   // subtitle: {
//   //   color: 'rgba(255, 255, 255, 0.85)',
//   //   fontSize: 12,
//   //   fontWeight: '700',
//   //   letterSpacing: 1.5,
//   //   textAlign: 'right',
//   //   textTransform: 'uppercase',
//   //   marginTop: 12,
//   // },
//   textContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   title: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     textTransform: 'uppercase',
//     marginBottom: 8,
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.85)',
//     fontSize: 12,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textTransform: 'uppercase',
//   },
//   communityButton: {
//     position: 'absolute',
//     top: 60,
//     right: 15,
//     zIndex: 999,
//   },
//   fabButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//     borderWidth: tokens.borderWidth.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 4},
//   },
//   closeButtonContainer: {
//     position: 'absolute',
//     top: 108,
//     right: 15,
//     zIndex: 999,
//   },
//   closeButton: {
//     width: 38,
//     height: 38,
//     backgroundColor: 'rgba(7, 0, 0, 1)',
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
//   },
// });

////////////////////

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   Dimensions,
//   Pressable,
//   StatusBar,
// } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
// import Animated, {
//   useSharedValue,
//   useAnimatedScrollHandler,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolation,
//   SharedValue,
//   withTiming,
// } from 'react-native-reanimated';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

// const {width, height} = Dimensions.get('window');

// // Card height - shows peek of next card at bottom
// const CARD_HEIGHT = height * 0.87;
// const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

// const images = [
//   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   require('../assets/images/headshot-6.jpg'),

//   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-3.jpg'),

//   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   require('../assets/images/headshot-1.webp'),

//   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   require('../assets/images/headshot-5.jpg'),
//   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
//   {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
//   {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
//   {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
//   {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
//   {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
//   {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
//   {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
//   {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
//   {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
//   {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
//   {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
//   {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
//   {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
//   {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
//   {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
//   {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
//   {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
//   {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
//   {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
//   {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
// ];

// interface CardProps {
//   image: any;
//   index: number;
//   scrollY: SharedValue<number>;
//   title: string;
//   subtitle: string;
//   progressWidth: SharedValue<number>;
//   isActive: boolean;
// }

// function Card({
//   image,
//   index,
//   scrollY,
//   title,
//   subtitle,
//   progressWidth,
//   isActive,
// }: CardProps) {
//   const progressAnimatedStyle = useAnimatedStyle(() => {
//     return {
//       width: `${progressWidth.value * 100}%`,
//     };
//   });

//   const animatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Current card slides UP as user scrolls
//     const translateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [CARD_HEIGHT, 0, -CARD_HEIGHT],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY}],
//     };
//   });

//   // Parallax effect for the image - moves slower than the card
//   const imageAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Image shifts up slightly as card scrolls (parallax)
//     const imageTranslateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [50, 0, -50],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY: imageTranslateY}],
//     };
//   });

//   const textAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     const textBottomPosition = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart],
//       [CARD_HEIGHT - PEEK_HEIGHT / 2 - 25, 40],
//       Extrapolation.CLAMP,
//     );

//     return {
//       bottom: textBottomPosition,
//     };
//   });

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Animated.Image
//         source={image}
//         style={[styles.cardImage, imageAnimatedStyle]}
//         resizeMode="cover"
//       />
//       {/* Gradient overlay for text readability */}
//       <LinearGradient
//         colors={['transparent', 'rgba(0,0,0,0.5)']}
//         style={styles.gradientOverlay}
//       />
//       {/* Text content - animated position */}
//       <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
//         <Text style={styles.title}>{title}</Text>
//         <Text style={styles.subtitle}>{subtitle}</Text>
//         {/* Progress bar under subtitle - only show on active card */}
//         {isActive && (
//           <View style={styles.progressBarContainer}>
//             <Animated.View
//               style={[styles.progressBar, progressAnimatedStyle]}
//             />
//           </View>
//         )}
//       </Animated.View>
//     </Animated.View>
//   );
// }

// const INTERVAL_DURATION = 8000;

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const scrollY = useSharedValue(0);
//   const screenOpacity = useSharedValue(0);
//   const progressWidth = useSharedValue(0);
//   const {theme} = useAppTheme();
//   const scrollViewRef = useRef<Animated.ScrollView>(null);
//   const currentIndexRef = useRef(0);
//   const [activeIndex, setActiveIndex] = useState(0);

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     // Fade in the screen
//     screenOpacity.value = withTiming(1, {duration: 400});
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   // Auto-advance every 8 seconds with progress bar
//   useEffect(() => {
//     // Start the progress bar animation
//     const startProgress = () => {
//       progressWidth.value = 0;
//       progressWidth.value = withTiming(1, {duration: INTERVAL_DURATION});
//     };

//     // Start initial progress
//     startProgress();

//     const interval = setInterval(() => {
//       currentIndexRef.current = (currentIndexRef.current + 1) % images.length;
//       setActiveIndex(currentIndexRef.current);
//       scrollViewRef.current?.scrollTo({
//         y: currentIndexRef.current * CARD_HEIGHT,
//         animated: true,
//       });
//       // Reset and restart progress bar
//       startProgress();
//     }, INTERVAL_DURATION);

//     return () => clearInterval(interval);
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollY.value = e.contentOffset.y;
//       // Update current index based on scroll position
//     },
//   });

//   const screenAnimatedStyle = useAnimatedStyle(() => {
//     return {
//       opacity: screenOpacity.value,
//     };
//   });

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <Animated.View style={[styles.container, screenAnimatedStyle]}>
//       {/* Cards rendered in reverse order so first card is on top */}
//       <View style={styles.cardsContainer}>
//         {[...images].reverse().map((img, reverseIndex) => {
//           const i = images.length - 1 - reverseIndex;
//           return (
//             <Card
//               key={i}
//               image={img}
//               index={i}
//               scrollY={scrollY}
//               title={textContent[i].title}
//               subtitle={textContent[i].subtitle}
//               progressWidth={progressWidth}
//               isActive={i === activeIndex}
//             />
//           );
//         })}
//       </View>

//       {/* Invisible scroll view for gesture handling */}
//       <Animated.ScrollView
//         ref={scrollViewRef}
//         style={styles.scrollView}
//         contentContainerStyle={{height: CARD_HEIGHT * images.length}}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         onScroll={scrollHandler}
//         snapToInterval={CARD_HEIGHT}
//         decelerationRate={0.1}
//       />

//       {/* Community FAB */}
//       <View style={styles.communityButton}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View style={[styles.fabButton, {borderColor: theme.colors.muted}]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Close button */}
//       <View style={styles.closeButtonContainer}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   progressBarContainer: {
//     width: '50%',
//     height: 3,
//     backgroundColor: 'rgba(255, 255, 255, 0.3)',
//     borderRadius: 1,
//     marginTop: 16,
//   },
//   progressBar: {
//     height: '100%',
//     backgroundColor: 'rgba(144, 0, 255, 1)',
//     borderRadius: 1,
//   },
//   cardsContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   scrollView: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   card: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT,
//     overflow: 'hidden',
//   },
//   cardImage: {
//     width: width,
//     height: CARD_HEIGHT + 100,
//     marginTop: -50,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT * 0.15,
//     backgroundColor: 'transparent',
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: -100},
//     shadowOpacity: 0.3,
//     shadowRadius: 100,
//   },
//   // textContainer: {
//   //   position: 'absolute',
//   //   left: 0,
//   //   right: 0,
//   //   paddingHorizontal: 20,
//   //   textAlign: 'left',
//   // },
//   // title: {
//   //   color: '#fff',
//   //   fontSize: 25,
//   //   fontWeight: '700',
//   //   letterSpacing: 1.5,
//   //   textAlign: 'left',
//   //   textTransform: 'uppercase',
//   // },
//   // subtitle: {
//   //   color: 'rgba(255, 255, 255, 0.85)',
//   //   fontSize: 12,
//   //   fontWeight: '700',
//   //   letterSpacing: 1.5,
//   //   textAlign: 'right',
//   //   textTransform: 'uppercase',
//   //   marginTop: 12,
//   // },
//   textContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   title: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     textTransform: 'uppercase',
//     marginBottom: 8,
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.85)',
//     fontSize: 12,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textTransform: 'uppercase',
//   },
//   communityButton: {
//     position: 'absolute',
//     top: 60,
//     right: 15,
//     zIndex: 999,
//   },
//   fabButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//     borderWidth: tokens.borderWidth.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 4},
//   },
//   closeButtonContainer: {
//     position: 'absolute',
//     top: 108,
//     right: 15,
//     zIndex: 999,
//   },
//   closeButton: {
//     width: 38,
//     height: 38,
//     backgroundColor: 'rgba(7, 0, 0, 1)',
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
//   },
// });

////////////////

// import React, {useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   Dimensions,
//   Pressable,
//   StatusBar,
// } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
// import Animated, {
//   useSharedValue,
//   useAnimatedScrollHandler,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolation,
//   SharedValue,
//   withTiming,
// } from 'react-native-reanimated';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

// const {width, height} = Dimensions.get('window');

// // Card height - shows peek of next card at bottom
// const CARD_HEIGHT = height * 0.87;
// const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

// const images = [
//   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   require('../assets/images/headshot-6.jpg'),

//   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-3.jpg'),

//   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   require('../assets/images/headshot-1.webp'),

//   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   require('../assets/images/headshot-5.jpg'),
//   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
//   {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
//   {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
//   {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
//   {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
//   {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
//   {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
//   {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
//   {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
//   {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
//   {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
//   {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
//   {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
//   {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
//   {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
//   {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
//   {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
//   {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
//   {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
//   {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
//   {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
// ];

// interface CardProps {
//   image: any;
//   index: number;
//   scrollY: SharedValue<number>;
//   title: string;
//   subtitle: string;
// }

// function Card({image, index, scrollY, title, subtitle}: CardProps) {
//   const animatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Current card slides UP as user scrolls
//     const translateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [CARD_HEIGHT, 0, -CARD_HEIGHT],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY}],
//     };
//   });

//   // Parallax effect for the image - moves slower than the card
//   const imageAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Image shifts up slightly as card scrolls (parallax)
//     const imageTranslateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [50, 0, -50],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY: imageTranslateY}],
//     };
//   });

//   const textAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     const textBottomPosition = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart],
//       [CARD_HEIGHT - PEEK_HEIGHT / 2 - 25, 40],
//       Extrapolation.CLAMP,
//     );

//     return {
//       bottom: textBottomPosition,
//     };
//   });

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Animated.Image
//         source={image}
//         style={[styles.cardImage, imageAnimatedStyle]}
//         resizeMode="cover"
//       />
//       {/* Gradient overlay for text readability */}
//       <LinearGradient
//         colors={['transparent', 'rgba(0,0,0,0.5)']}
//         style={styles.gradientOverlay}
//       />
//       {/* Text content - animated position */}
//       <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
//         <Text style={styles.title}>{title}</Text>
//         <Text style={styles.subtitle}>{subtitle}</Text>
//       </Animated.View>
//     </Animated.View>
//   );
// }

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const scrollY = useSharedValue(0);
//   const screenOpacity = useSharedValue(0);
//   const {theme} = useAppTheme();
//   const scrollViewRef = useRef<Animated.ScrollView>(null);
//   const currentIndexRef = useRef(0);

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     // Fade in the screen
//     screenOpacity.value = withTiming(1, {duration: 400});
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   // Auto-advance every 8 seconds
//   useEffect(() => {
//     const interval = setInterval(() => {
//       currentIndexRef.current = (currentIndexRef.current + 1) % images.length;
//       scrollViewRef.current?.scrollTo({
//         y: currentIndexRef.current * CARD_HEIGHT,
//         animated: true,
//       });
//     }, 8000);

//     return () => clearInterval(interval);
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollY.value = e.contentOffset.y;
//       // Update current index based on scroll position
//     },
//   });

//   const screenAnimatedStyle = useAnimatedStyle(() => {
//     return {
//       opacity: screenOpacity.value,
//     };
//   });

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <Animated.View style={[styles.container, screenAnimatedStyle]}>
//       {/* Cards rendered in reverse order so first card is on top */}
//       <View style={styles.cardsContainer}>
//         {[...images].reverse().map((img, reverseIndex) => {
//           const i = images.length - 1 - reverseIndex;
//           return (
//             <Card
//               key={i}
//               image={img}
//               index={i}
//               scrollY={scrollY}
//               title={textContent[i].title}
//               subtitle={textContent[i].subtitle}
//             />
//           );
//         })}
//       </View>

//       {/* Invisible scroll view for gesture handling */}
//       <Animated.ScrollView
//         ref={scrollViewRef}
//         style={styles.scrollView}
//         contentContainerStyle={{height: CARD_HEIGHT * images.length}}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         onScroll={scrollHandler}
//         snapToInterval={CARD_HEIGHT}
//         decelerationRate={0.1}
//       />

//       {/* Community FAB */}
//       <View style={styles.communityButton}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View style={[styles.fabButton, {borderColor: theme.colors.muted}]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Close button */}
//       <View style={styles.closeButtonContainer}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   cardsContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   scrollView: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   card: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT,
//     overflow: 'hidden',
//   },
//   cardImage: {
//     width: width,
//     height: CARD_HEIGHT + 100,
//     marginTop: -50,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT * 0.15,
//     backgroundColor: 'transparent',
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: -100},
//     shadowOpacity: 0.3,
//     shadowRadius: 100,
//   },
//   // textContainer: {
//   //   position: 'absolute',
//   //   left: 0,
//   //   right: 0,
//   //   paddingHorizontal: 20,
//   //   textAlign: 'left',
//   // },
//   // title: {
//   //   color: '#fff',
//   //   fontSize: 25,
//   //   fontWeight: '700',
//   //   letterSpacing: 1.5,
//   //   textAlign: 'left',
//   //   textTransform: 'uppercase',
//   // },
//   // subtitle: {
//   //   color: 'rgba(255, 255, 255, 0.85)',
//   //   fontSize: 12,
//   //   fontWeight: '700',
//   //   letterSpacing: 1.5,
//   //   textAlign: 'right',
//   //   textTransform: 'uppercase',
//   //   marginTop: 12,
//   // },
//   textContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   title: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     textTransform: 'uppercase',
//     marginBottom: 8,
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.85)',
//     fontSize: 12,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textTransform: 'uppercase',
//   },
//   communityButton: {
//     position: 'absolute',
//     top: 60,
//     right: 15,
//     zIndex: 999,
//   },
//   fabButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//     borderWidth: tokens.borderWidth.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 4},
//   },
//   closeButtonContainer: {
//     position: 'absolute',
//     top: 108,
//     right: 15,
//     zIndex: 999,
//   },
//   closeButton: {
//     width: 38,
//     height: 38,
//     backgroundColor: 'rgba(7, 0, 0, 1)',
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
//   },
// });

/////////////////

// import React, {useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   Dimensions,
//   Pressable,
//   StatusBar,
// } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
// import Animated, {
//   useSharedValue,
//   useAnimatedScrollHandler,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolation,
//   SharedValue,
//   withTiming,
// } from 'react-native-reanimated';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

// const {width, height} = Dimensions.get('window');

// // Card height - shows peek of next card at bottom
// const CARD_HEIGHT = height * 0.87;
// const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

// const images = [
//   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   require('../assets/images/headshot-6.jpg'),

//   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-3.jpg'),

//   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   require('../assets/images/headshot-1.webp'),

//   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   require('../assets/images/headshot-5.jpg'),
//   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
//   {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
//   {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
//   {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
//   {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
//   {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
//   {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
//   {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
//   {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
//   {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
//   {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
//   {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
//   {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
//   {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
//   {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
//   {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
//   {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
//   {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
//   {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
//   {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
//   {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
// ];

// interface CardProps {
//   image: any;
//   index: number;
//   scrollY: SharedValue<number>;
//   title: string;
//   subtitle: string;
// }

// function Card({image, index, scrollY, title, subtitle}: CardProps) {
//   const animatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Current card slides UP as user scrolls
//     const translateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [CARD_HEIGHT, 0, -CARD_HEIGHT],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY}],
//     };
//   });

//   // Parallax effect for the image - moves slower than the card
//   const imageAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Image shifts up slightly as card scrolls (parallax)
//     const imageTranslateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [50, 0, -50],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY: imageTranslateY}],
//     };
//   });

//   const textAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     const textBottomPosition = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart],
//       [CARD_HEIGHT - PEEK_HEIGHT / 2 - 25, 40],
//       Extrapolation.CLAMP,
//     );

//     return {
//       bottom: textBottomPosition,
//     };
//   });

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Animated.Image
//         source={image}
//         style={[styles.cardImage, imageAnimatedStyle]}
//         resizeMode="cover"
//       />
//       {/* Gradient overlay for text readability */}
//       <LinearGradient
//         colors={['transparent', 'rgba(0,0,0,0.5)']}
//         style={styles.gradientOverlay}
//       />
//       {/* Text content - animated position */}
//       <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
//         <Text style={styles.title}>{title}</Text>
//         <Text style={styles.subtitle}>{subtitle}</Text>
//       </Animated.View>
//     </Animated.View>
//   );
// }

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const scrollY = useSharedValue(0);
//   const screenOpacity = useSharedValue(0);
//   const {theme} = useAppTheme();
//   const scrollViewRef = useRef<Animated.ScrollView>(null);
//   const currentIndexRef = useRef(0);

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     // Fade in the screen
//     screenOpacity.value = withTiming(1, {duration: 400});
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   // Auto-advance every 8 seconds
//   useEffect(() => {
//     const interval = setInterval(() => {
//       currentIndexRef.current = (currentIndexRef.current + 1) % images.length;
//       scrollViewRef.current?.scrollTo({
//         y: currentIndexRef.current * CARD_HEIGHT,
//         animated: true,
//       });
//     }, 8000);

//     return () => clearInterval(interval);
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollY.value = e.contentOffset.y;
//       // Update current index based on scroll position
//     },
//   });

//   const screenAnimatedStyle = useAnimatedStyle(() => {
//     return {
//       opacity: screenOpacity.value,
//     };
//   });

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <Animated.View style={[styles.container, screenAnimatedStyle]}>
//       {/* Cards rendered in reverse order so first card is on top */}
//       <View style={styles.cardsContainer}>
//         {[...images].reverse().map((img, reverseIndex) => {
//           const i = images.length - 1 - reverseIndex;
//           return (
//             <Card
//               key={i}
//               image={img}
//               index={i}
//               scrollY={scrollY}
//               title={textContent[i].title}
//               subtitle={textContent[i].subtitle}
//             />
//           );
//         })}
//       </View>

//       {/* Invisible scroll view for gesture handling */}
//       <Animated.ScrollView
//         ref={scrollViewRef}
//         style={styles.scrollView}
//         contentContainerStyle={{height: CARD_HEIGHT * images.length}}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         onScroll={scrollHandler}
//         snapToInterval={CARD_HEIGHT}
//         decelerationRate={0.1}
//       />

//       {/* Community FAB */}
//       <View style={styles.communityButton}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View style={[styles.fabButton, {borderColor: theme.colors.muted}]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Close button */}
//       <View style={styles.closeButtonContainer}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   cardsContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   scrollView: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   card: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT,
//     overflow: 'hidden',
//   },
//   cardImage: {
//     width: width,
//     height: CARD_HEIGHT + 100,
//     marginTop: -50,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT * 0.15,
//     backgroundColor: 'transparent',
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: -100},
//     shadowOpacity: 0.3,
//     shadowRadius: 100,
//   },
//   textContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   title: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     textTransform: 'uppercase',
//     marginBottom: 8,
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.85)',
//     fontSize: 12,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textTransform: 'uppercase',
//   },
//   communityButton: {
//     position: 'absolute',
//     top: 60,
//     right: 15,
//     zIndex: 999,
//   },
//   fabButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//     borderWidth: tokens.borderWidth.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 4},
//   },
//   closeButtonContainer: {
//     position: 'absolute',
//     top: 108,
//     right: 15,
//     zIndex: 999,
//   },
//   closeButton: {
//     width: 38,
//     height: 38,
//     backgroundColor: 'rgba(7, 0, 0, 1)',
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
//   },
// });

//////////

// import React, {useEffect} from 'react';
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
//   Extrapolation,
//   SharedValue,
// } from 'react-native-reanimated';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

// const {width, height} = Dimensions.get('window');

// // Card height - shows peek of next card at bottom
// const CARD_HEIGHT = height * 0.87;
// const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

// const images = [
//   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   require('../assets/images/headshot-6.jpg'),

//   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-3.jpg'),

//   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   require('../assets/images/headshot-1.webp'),

//   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   require('../assets/images/headshot-5.jpg'),
//   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
//   {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
//   {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
//   {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
//   {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
//   {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
//   {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
//   {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
//   {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
//   {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
//   {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
//   {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
//   {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
//   {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
//   {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
//   {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
//   {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
//   {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
//   {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
//   {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
//   {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
// ];

// interface CardProps {
//   image: any;
//   index: number;
//   scrollY: SharedValue<number>;
//   title: string;
//   subtitle: string;
// }

// function Card({image, index, scrollY, title, subtitle}: CardProps) {
//   const animatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Current card slides UP as user scrolls
//     const translateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [CARD_HEIGHT, 0, -CARD_HEIGHT],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY}],
//     };
//   });

//   // Parallax effect for the image - moves slower than the card
//   const imageAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Image shifts up slightly as card scrolls (parallax)
//     const imageTranslateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [50, 0, -50],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY: imageTranslateY}],
//     };
//   });

//   const textAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     const textBottomPosition = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart],
//       [CARD_HEIGHT - PEEK_HEIGHT / 2 - 30, 40],
//       Extrapolation.CLAMP,
//     );

//     return {
//       bottom: textBottomPosition,
//     };
//   });

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Animated.Image
//         source={image}
//         style={[styles.cardImage, imageAnimatedStyle]}
//         resizeMode="cover"
//       />
//       {/* Gradient overlay for text readability */}
//       <View style={styles.gradientOverlay} />
//       {/* Text content - animated position */}
//       <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
//         <Text style={styles.title}>{title}</Text>
//         <Text style={styles.subtitle}>{subtitle}</Text>
//       </Animated.View>
//     </Animated.View>
//   );
// }

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const scrollY = useSharedValue(0);
//   const {theme} = useAppTheme();

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollY.value = e.contentOffset.y;
//     },
//   });

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <View style={styles.container}>
//       {/* Cards rendered in reverse order so first card is on top */}
//       <View style={styles.cardsContainer}>
//         {[...images].reverse().map((img, reverseIndex) => {
//           const i = images.length - 1 - reverseIndex;
//           return (
//             <Card
//               key={i}
//               image={img}
//               index={i}
//               scrollY={scrollY}
//               title={textContent[i].title}
//               subtitle={textContent[i].subtitle}
//             />
//           );
//         })}
//       </View>

//       {/* Invisible scroll view for gesture handling */}
//       <Animated.ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={{height: CARD_HEIGHT * images.length}}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         onScroll={scrollHandler}
//         snapToInterval={CARD_HEIGHT}
//         decelerationRate={0.1}
//       />

//       {/* Community FAB */}
//       <View style={styles.communityButton}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View style={[styles.fabButton, {borderColor: theme.colors.muted}]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Close button */}
//       <View style={styles.closeButtonContainer}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   cardsContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   scrollView: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   card: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT,
//     overflow: 'hidden',
//   },
//   cardImage: {
//     width: width,
//     height: CARD_HEIGHT + 100,
//     marginTop: -50,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT * 0.4,
//     backgroundColor: 'transparent',
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: -100},
//     shadowOpacity: 0.8,
//     shadowRadius: 100,
//   },
//   textContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   title: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     textTransform: 'uppercase',
//     marginBottom: 8,
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.85)',
//     fontSize: 12,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textTransform: 'uppercase',
//   },
//   communityButton: {
//     position: 'absolute',
//     top: 60,
//     right: 15,
//     zIndex: 999,
//   },
//   fabButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//     borderWidth: tokens.borderWidth.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 4},
//   },
//   closeButtonContainer: {
//     position: 'absolute',
//     top: 108,
//     right: 15,
//     zIndex: 999,
//   },
//   closeButton: {
//     width: 38,
//     height: 38,
//     backgroundColor: 'rgba(7, 0, 0, 1)',
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
//   },
// });

///////////////////

// import React, {useEffect} from 'react';
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
//   Extrapolation,
//   SharedValue,
// } from 'react-native-reanimated';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

// const {width, height} = Dimensions.get('window');

// // Card height - shows peek of next card at bottom
// const CARD_HEIGHT = height * 0.85;
// const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

// const images = [
//   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   require('../assets/images/headshot-6.jpg'),

//   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-3.jpg'),

//   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   require('../assets/images/headshot-1.webp'),

//   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   require('../assets/images/headshot-5.jpg'),
//   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
//   {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
//   {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
//   {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
//   {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
//   {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
//   {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
//   {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
//   {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
//   {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
//   {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
//   {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
//   {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
//   {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
//   {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
//   {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
//   {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
//   {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
//   {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
//   {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
//   {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
// ];

// interface CardProps {
//   image: any;
//   index: number;
//   scrollY: SharedValue<number>;
//   title: string;
//   subtitle: string;
// }

// function Card({image, index, scrollY, title, subtitle}: CardProps) {
//   const animatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Current card slides UP as user scrolls
//     const translateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [CARD_HEIGHT, 0, -CARD_HEIGHT],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY}],
//     };
//   });

//   // Parallax effect for the image - moves slower than the card
//   const imageAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Image shifts up slightly as card scrolls (parallax)
//     const imageTranslateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [50, 0, -50],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY: imageTranslateY}],
//     };
//   });

//   const textAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     const textBottomPosition = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart],
//       [CARD_HEIGHT - PEEK_HEIGHT / 2 - 30, 40],
//       Extrapolation.CLAMP,
//     );

//     return {
//       bottom: textBottomPosition,
//     };
//   });

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Animated.Image
//         source={image}
//         style={[styles.cardImage, imageAnimatedStyle]}
//         resizeMode="cover"
//       />
//       {/* Gradient overlay for text readability */}
//       <View style={styles.gradientOverlay} />
//       {/* Text content - animated position */}
//       <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
//         <Text style={styles.title}>{title}</Text>
//         <Text style={styles.subtitle}>{subtitle}</Text>
//       </Animated.View>
//     </Animated.View>
//   );
// }

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const scrollY = useSharedValue(0);
//   const {theme} = useAppTheme();

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollY.value = e.contentOffset.y;
//     },
//   });

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <View style={styles.container}>
//       {/* Cards rendered in reverse order so first card is on top */}
//       <View style={styles.cardsContainer}>
//         {[...images].reverse().map((img, reverseIndex) => {
//           const i = images.length - 1 - reverseIndex;
//           return (
//             <Card
//               key={i}
//               image={img}
//               index={i}
//               scrollY={scrollY}
//               title={textContent[i].title}
//               subtitle={textContent[i].subtitle}
//             />
//           );
//         })}
//       </View>

//       {/* Invisible scroll view for gesture handling */}
//       <Animated.ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={{height: CARD_HEIGHT * images.length}}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         onScroll={scrollHandler}
//         snapToInterval={CARD_HEIGHT}
//         decelerationRate={0.1}
//       />

//       {/* Community FAB */}
//       <View style={styles.communityButton}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View style={[styles.fabButton, {borderColor: theme.colors.muted}]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Close button */}
//       <View style={styles.closeButtonContainer}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   cardsContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   scrollView: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   card: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT,
//     overflow: 'hidden',
//   },
//   cardImage: {
//     width: width,
//     height: CARD_HEIGHT + 100,
//     marginTop: -50,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT * 0.4,
//     backgroundColor: 'transparent',
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: -100},
//     shadowOpacity: 0.8,
//     shadowRadius: 100,
//   },
//   textContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   title: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     textTransform: 'uppercase',
//     marginBottom: 8,
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.85)',
//     fontSize: 12,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textTransform: 'uppercase',
//   },
//   communityButton: {
//     position: 'absolute',
//     top: 60,
//     right: 15,
//     zIndex: 999,
//   },
//   fabButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//     borderWidth: tokens.borderWidth.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 4},
//   },
//   closeButtonContainer: {
//     position: 'absolute',
//     top: 108,
//     right: 15,
//     zIndex: 999,
//   },
//   closeButton: {
//     width: 38,
//     height: 38,
//     backgroundColor: 'rgba(7, 0, 0, 1)',
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
//   },
// });

////////////////

// import React, {useEffect} from 'react';
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
//   Extrapolation,
//   SharedValue,
// } from 'react-native-reanimated';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

// const {width, height} = Dimensions.get('window');

// // Card height - shows peek of next card at bottom
// const CARD_HEIGHT = height * 0.85;
// const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

// const images = [
//   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   require('../assets/images/headshot-6.jpg'),

//   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-3.jpg'),

//   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   require('../assets/images/headshot-1.webp'),

//   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   require('../assets/images/headshot-5.jpg'),
//   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
//   {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
//   {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
//   {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
//   {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
//   {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
//   {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
//   {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
//   {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
//   {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
//   {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
//   {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
//   {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
//   {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
//   {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
//   {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
//   {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
//   {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
//   {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
//   {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
//   {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
// ];

// interface CardProps {
//   image: any;
//   index: number;
//   scrollY: SharedValue<number>;
//   title: string;
//   subtitle: string;
// }

// function Card({image, index, scrollY, title, subtitle}: CardProps) {
//   const animatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Current card slides UP as user scrolls
//     const translateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [CARD_HEIGHT, 0, -CARD_HEIGHT],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY}],
//     };
//   });

//   // Parallax effect for the image - moves slower than the card
//   const imageAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Image shifts up slightly as card scrolls (parallax)
//     const imageTranslateY = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart, cardScrollStart + CARD_HEIGHT],
//       [50, 0, -50],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY: imageTranslateY}],
//     };
//   });

//   const textAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     const textBottomPosition = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart],
//       [CARD_HEIGHT - PEEK_HEIGHT / 2 - 30, 40],
//       Extrapolation.CLAMP,
//     );

//     return {
//       bottom: textBottomPosition,
//     };
//   });

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Animated.Image source={image} style={[styles.cardImage, imageAnimatedStyle]} resizeMode="cover" />
//       {/* Gradient overlay for text readability */}
//       <View style={styles.gradientOverlay} />
//       {/* Text content - animated position */}
//       <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
//         <Text style={styles.title}>{title}</Text>
//         <Text style={styles.subtitle}>{subtitle}</Text>
//       </Animated.View>
//     </Animated.View>
//   );
// }

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const scrollY = useSharedValue(0);
//   const {theme} = useAppTheme();

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollY.value = e.contentOffset.y;
//     },
//   });

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <View style={styles.container}>
//       {/* Cards rendered in reverse order so first card is on top */}
//       <View style={styles.cardsContainer}>
//         {[...images].reverse().map((img, reverseIndex) => {
//           const i = images.length - 1 - reverseIndex;
//           return (
//             <Card
//               key={i}
//               image={img}
//               index={i}
//               scrollY={scrollY}
//               title={textContent[i].title}
//               subtitle={textContent[i].subtitle}
//             />
//           );
//         })}
//       </View>

//       {/* Invisible scroll view for gesture handling */}
//       <Animated.ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={{height: CARD_HEIGHT * images.length}}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         onScroll={scrollHandler}
//         snapToInterval={CARD_HEIGHT}
//         decelerationRate="fast"
//       />

//       {/* Community FAB */}
//       <View style={styles.communityButton}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View style={[styles.fabButton, {borderColor: theme.colors.muted}]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Close button */}
//       <View style={styles.closeButtonContainer}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   cardsContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   scrollView: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   card: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT,
//     overflow: 'hidden',
//   },
//   cardImage: {
//     width: width,
//     height: CARD_HEIGHT + 100,
//     marginTop: -50,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT * 0.4,
//     backgroundColor: 'transparent',
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: -100},
//     shadowOpacity: 0.8,
//     shadowRadius: 100,
//   },
//   textContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   title: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     textTransform: 'uppercase',
//     marginBottom: 8,
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.85)',
//     fontSize: 12,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textTransform: 'uppercase',
//   },
//   communityButton: {
//     position: 'absolute',
//     top: 60,
//     right: 15,
//     zIndex: 999,
//   },
//   fabButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//     borderWidth: tokens.borderWidth.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 4},
//   },
//   closeButtonContainer: {
//     position: 'absolute',
//     top: 108,
//     right: 15,
//     zIndex: 999,
//   },
//   closeButton: {
//     width: 38,
//     height: 38,
//     backgroundColor: 'rgba(7, 0, 0, 1)',
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
//   },
// });

/////////////

// import React, {useEffect} from 'react';
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
//   Extrapolation,
//   SharedValue,
// } from 'react-native-reanimated';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

// const {width, height} = Dimensions.get('window');

// // Card height - shows peek of next card at bottom
// const CARD_HEIGHT = height * 0.85;
// const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

// const images = [
//   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   require('../assets/images/headshot-6.jpg'),

//   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-3.jpg'),

//   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   require('../assets/images/headshot-1.webp'),

//   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   require('../assets/images/headshot-5.jpg'),
//   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
//   {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
//   {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
//   {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
//   {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
//   {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
//   {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
//   {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
//   {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
//   {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
//   {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
//   {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
//   {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
//   {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
//   {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
//   {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
//   {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
//   {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
//   {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
//   {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
//   {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
// ];

// interface CardProps {
//   image: any;
//   index: number;
//   scrollY: SharedValue<number>;
//   title: string;
//   subtitle: string;
// }

// function Card({image, index, scrollY, title, subtitle}: CardProps) {
//   const animatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Current card slides UP as user scrolls
//     const translateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [CARD_HEIGHT, 0, -CARD_HEIGHT],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY}],
//     };
//   });

//   const textAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     const textBottomPosition = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart],
//       [CARD_HEIGHT - PEEK_HEIGHT / 2 - 30, 40],
//       Extrapolation.CLAMP,
//     );

//     return {
//       bottom: textBottomPosition,
//     };
//   });

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Image source={image} style={styles.cardImage} resizeMode="cover" />
//       {/* Gradient overlay for text readability */}
//       <View style={styles.gradientOverlay} />
//       {/* Text content - animated position */}
//       <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
//         <Text style={styles.title}>{title}</Text>
//         <Text style={styles.subtitle}>{subtitle}</Text>
//       </Animated.View>
//     </Animated.View>
//   );
// }

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const scrollY = useSharedValue(0);
//   const {theme} = useAppTheme();

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollY.value = e.contentOffset.y;
//     },
//   });

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <View style={styles.container}>
//       {/* Cards rendered in reverse order so first card is on top */}
//       <View style={styles.cardsContainer}>
//         {[...images].reverse().map((img, reverseIndex) => {
//           const i = images.length - 1 - reverseIndex;
//           return (
//             <Card
//               key={i}
//               image={img}
//               index={i}
//               scrollY={scrollY}
//               title={textContent[i].title}
//               subtitle={textContent[i].subtitle}
//             />
//           );
//         })}
//       </View>

//       {/* Invisible scroll view for gesture handling */}
//       <Animated.ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={{height: CARD_HEIGHT * images.length}}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         onScroll={scrollHandler}
//         snapToInterval={CARD_HEIGHT}
//         decelerationRate="fast"
//       />

//       {/* Community FAB */}
//       <View style={styles.communityButton}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View style={[styles.fabButton, {borderColor: theme.colors.muted}]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Close button */}
//       <View style={styles.closeButtonContainer}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   cardsContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   scrollView: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   card: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT,
//     overflow: 'hidden',
//   },
//   cardImage: {
//     width: width,
//     height: CARD_HEIGHT,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT * 0.4,
//     backgroundColor: 'transparent',
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: -100},
//     shadowOpacity: 0.8,
//     shadowRadius: 100,
//   },
//   textContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   title: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     textTransform: 'uppercase',
//     marginBottom: 8,
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.85)',
//     fontSize: 12,
//     fontWeight: '700',
//     letterSpacing: 1.5,
//     textTransform: 'uppercase',
//   },
//   communityButton: {
//     position: 'absolute',
//     top: 60,
//     right: 15,
//     zIndex: 999,
//   },
//   fabButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//     borderWidth: tokens.borderWidth.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 4},
//   },
//   closeButtonContainer: {
//     position: 'absolute',
//     top: 108,
//     right: 15,
//     zIndex: 999,
//   },
//   closeButton: {
//     width: 38,
//     height: 38,
//     backgroundColor: 'rgba(7, 0, 0, 1)',
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
//   },
// });

//////////////////

// import React, {useEffect} from 'react';
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
//   Extrapolation,
//   SharedValue,
// } from 'react-native-reanimated';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

// const {width, height} = Dimensions.get('window');

// // Card height - shows peek of next card at bottom
// const CARD_HEIGHT = height * 0.85;
// const PEEK_HEIGHT = height - CARD_HEIGHT; // The visible peek area at bottom

// const images = [
//   require('../assets/images/fashion/fashion-show-glamour-stockcake2.jpg'),
//   require('../assets/images/headshot-6.jpg'),

//   require('../assets/images/fashion/fashion-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-2.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.jpg'),
//   require('../assets/images/headshot-4.jpg'),
//   require('../assets/images/fashion/elegant-runway-model-stockcake.jpg'),
//   require('../assets/images/headshot-3.jpg'),

//   require('../assets/images/fashion/vibrant-model-portrait-stockcake.jpg'),
//   require('../assets/images/headshot-1.webp'),

//   require('../assets/images/fashion/glittering-runway-model-stockcake.webp'),
//   require('../assets/images/headshot-5.jpg'),
//   require('../assets/images/fashion/stylish-model-duo-stockcake.webp'),
//   require('../assets/images/fashion/runway-fashion-moment-stockcake.webp'),
//   require('../assets/images/fashion/starry-night-fashion-stockcake.webp'),
//   require('../assets/images/fashion/futuristic-fashion-model-stockcake.webp'),
//   require('../assets/images/fashion/backstage-fashion-moment-stockcake.jpg'),
//   require('../assets/images/fashion/colorful-fashion-statement-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-event-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-model-stockcake2.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake.webp'),
//   require('../assets/images/fashion/fashion-runway-show-stockcake3.webp'),
//   require('../assets/images/fashion/fashion-show-elegance-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-glamour-stockcake.webp'),
//   require('../assets/images/fashion/fashion-show-silhouette-stockcake.webp'),
// ];

// const textContent = [
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
//   {title: 'DEFINE YOUR EDGE', subtitle: 'STAND OUT FROM THE CROWD'},
//   {title: 'CURATED FOR YOU', subtitle: 'AI-POWERED RECOMMENDATIONS'},
//   {title: 'EFFORTLESS ELEGANCE', subtitle: 'EVERY DAY, EVERY OCCASION'},
//   {title: 'YOUR STYLE JOURNEY', subtitle: 'STARTS HERE'},
//   {title: 'BOLD CHOICES', subtitle: 'MAKE A STATEMENT'},
//   {title: 'TIMELESS LOOKS', subtitle: 'NEVER GO OUT OF STYLE'},
//   {title: 'DRESS THE PART', subtitle: 'FOR EVERY MOMENT'},
//   {title: 'FIND YOUR FIT', subtitle: 'PERFECTLY TAILORED'},
//   {title: 'UNLEASH CREATIVITY', subtitle: 'MIX AND MATCH'},
//   {title: 'ELEVATE EVERYDAY', subtitle: 'FROM CASUAL TO CHIC'},
//   {title: 'BE UNFORGETTABLE', subtitle: 'LEAVE AN IMPRESSION'},
//   {title: 'STYLE REINVENTED', subtitle: 'FRESH PERSPECTIVES'},
//   {title: 'YOUR SIGNATURE LOOK', subtitle: 'UNIQUELY YOU'},
//   {title: 'CONFIDENCE STARTS', subtitle: 'WITH WHAT YOU WEAR'},
//   {title: 'TRANSFORM YOUR CLOSET', subtitle: 'ENDLESS POSSIBILITIES'},
//   {title: 'TREND SETTER', subtitle: 'LEAD THE WAY'},
//   {title: 'WARDROBE GOALS', subtitle: 'ACHIEVE THEM ALL'},
//   {title: 'DRESS SMARTER', subtitle: 'LOOK BETTER'},
//   {title: 'STYLE REVOLUTION', subtitle: 'JOIN THE MOVEMENT'},
//   {title: 'YOUR BEST SELF', subtitle: 'EVERY SINGLE DAY'},
// ];

// interface CardProps {
//   image: any;
//   index: number;
//   scrollY: SharedValue<number>;
//   title: string;
//   subtitle: string;
// }

// function Card({image, index, scrollY, title, subtitle}: CardProps) {
//   const animatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // Current card slides UP as user scrolls
//     const translateY = interpolate(
//       scrollPosition,
//       [
//         cardScrollStart - CARD_HEIGHT,
//         cardScrollStart,
//         cardScrollStart + CARD_HEIGHT,
//       ],
//       [CARD_HEIGHT, 0, -CARD_HEIGHT],
//       Extrapolation.CLAMP,
//     );

//     return {
//       transform: [{translateY}],
//     };
//   });

//   // Text position animation - starts centered in peek area, stays there as card moves up
//   const textAnimatedStyle = useAnimatedStyle(() => {
//     const scrollPosition = scrollY.value;
//     const cardScrollStart = index * CARD_HEIGHT;

//     // When peeking: card is translated down by CARD_HEIGHT, so only top PEEK_HEIGHT of card is visible
//     // Text needs to be near TOP of card (high bottom value) to appear in the peek area
//     // When current: text moves to normal bottom position

//     // Peek position: text should be at CARD_HEIGHT - (PEEK_HEIGHT / 2) from bottom = near top of card
//     // Final position: 40px from bottom

//     const textBottomPosition = interpolate(
//       scrollPosition,
//       [cardScrollStart - CARD_HEIGHT, cardScrollStart],
//       [CARD_HEIGHT - PEEK_HEIGHT / 2 - 30, 40],
//       Extrapolation.CLAMP,
//     );

//     return {
//       bottom: textBottomPosition,
//     };
//   });

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Image source={image} style={styles.cardImage} resizeMode="cover" />
//       {/* Gradient overlay for text readability */}
//       <View style={styles.gradientOverlay} />
//       {/* Text content - animated position */}
//       <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
//         <Text style={styles.subtitle}>{subtitle}</Text>
//         <Text style={styles.title}>{title}</Text>
//       </Animated.View>
//     </Animated.View>
//   );
// }

// export default function ImageCarouselScreen({
//   navigate,
// }: {
//   navigate: (screen: string) => void;
// }) {
//   const scrollY = useSharedValue(0);
//   const {theme} = useAppTheme();

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     return () => {
//       StatusBar.setHidden(false);
//     };
//   }, []);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollY.value = e.contentOffset.y;
//     },
//   });

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <View style={styles.container}>
//       {/* Cards rendered in reverse order so first card is on top */}
//       <View style={styles.cardsContainer}>
//         {[...images].reverse().map((img, reverseIndex) => {
//           const i = images.length - 1 - reverseIndex;
//           return (
//             <Card
//               key={i}
//               image={img}
//               index={i}
//               scrollY={scrollY}
//               title={textContent[i].title}
//               subtitle={textContent[i].subtitle}
//             />
//           );
//         })}
//       </View>

//       {/* Invisible scroll view for gesture handling */}
//       <Animated.ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={{height: CARD_HEIGHT * images.length}}
//         showsVerticalScrollIndicator={false}
//         scrollEventThrottle={16}
//         onScroll={scrollHandler}
//         snapToInterval={CARD_HEIGHT}
//         decelerationRate="fast"
//       />

//       {/* Community FAB */}
//       <View style={styles.communityButton}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View style={[styles.fabButton, {borderColor: theme.colors.muted}]}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Close button */}
//       <View style={styles.closeButtonContainer}>
//         <Pressable onPress={handleClose} style={styles.closeButton}>
//           <MaterialIcons name="close" size={18} color="white" />
//         </Pressable>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   cardsContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   scrollView: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   card: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT,
//     overflow: 'hidden',
//   },
//   cardImage: {
//     width: width,
//     height: CARD_HEIGHT,
//   },
//   gradientOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: CARD_HEIGHT * 0.4,
//     backgroundColor: 'transparent',
//     // Simulated gradient with multiple layers
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: -100},
//     shadowOpacity: 0.8,
//     shadowRadius: 100,
//   },
//   textContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.85)',
//     fontSize: 12,
//     fontWeight: '500',
//     letterSpacing: 2,
//     marginBottom: 8,
//     textTransform: 'uppercase',
//   },
//   title: {
//     color: '#fff',
//     fontSize: 28,
//     fontWeight: '300',
//     letterSpacing: 3,
//     textAlign: 'center',
//     textTransform: 'uppercase',
//   },
//   communityButton: {
//     position: 'absolute',
//     top: 60,
//     right: 15,
//     zIndex: 999,
//   },
//   fabButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.35)',
//     borderWidth: tokens.borderWidth.md,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     shadowOffset: {width: 0, height: 4},
//   },
//   closeButtonContainer: {
//     position: 'absolute',
//     top: 108,
//     right: 15,
//     zIndex: 999,
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
//   },
// });

////////////////

// import React, {useState, useRef, useEffect, useCallback} from 'react';
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

// const AUTO_SCROLL_INTERVAL = 5000; // 5 seconds per image
// import {LiquidGlassView} from '@callstack/liquid-glass';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';

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
//     fontSize: 20,
//     fontWeight: '600',
//     letterSpacing: 1.2,
//     textAlign: 'center',
//   },
//   subtitle: {
//     color: 'rgba(255,255,255,0.75)',
//     fontSize: 12,
//     marginTop: 10,
//     fontWeight: '700',
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
//   {title: 'UPGRADE YOUR STYLE', subtitle: 'LIKE NEVER BEFORE'},
//   {title: 'DISCOVER YOUR LOOK', subtitle: 'EXPRESS YOURSELF'},
//   {title: 'FASHION FORWARD', subtitle: 'STAY AHEAD OF TRENDS'},
//   {title: 'PERSONALIZED STYLE', subtitle: 'MADE JUST FOR YOU'},
//   {title: 'UP YOUR WARDROBE', subtitle: 'LOOK YOUR BEST'},
//   {title: 'STYLE CONFIDENCE', subtitle: 'OWN EVERY MOMENT'},
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
//   const scrollViewRef = useRef<Animated.ScrollView>(null);
//   const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
//   const {theme} = useAppTheme();

//   // Reset auto-scroll timer
//   const resetAutoScrollTimer = useCallback(() => {
//     if (autoScrollTimer.current) {
//       clearInterval(autoScrollTimer.current);
//     }
//     autoScrollTimer.current = setInterval(() => {
//       setIndex(prev => {
//         const nextIndex = prev + 1 >= images.length ? 0 : prev + 1;
//         scrollViewRef.current?.scrollTo({x: nextIndex * width, animated: true});
//         return nextIndex;
//       });
//     }, AUTO_SCROLL_INTERVAL);
//   }, []);

//   useEffect(() => {
//     StatusBar.setHidden(true);
//     resetAutoScrollTimer();
//     return () => {
//       StatusBar.setHidden(false);
//       if (autoScrollTimer.current) {
//         clearInterval(autoScrollTimer.current);
//       }
//     };
//   }, [resetAutoScrollTimer]);

//   const scrollHandler = useAnimatedScrollHandler({
//     onScroll: e => {
//       scrollX.value = e.contentOffset.x;
//     },
//   });

//   const onScrollEnd = (e: any) => {
//     // Reset timer when user manually swipes
//     resetAutoScrollTimer();
//     const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
//     setIndex(newIndex);
//   };

//   const handleClose = () => {
//     navigate('HomeScreen');
//   };

//   const handleCommunity = () => {
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     navigate('CommunityShowcaseScreen');
//   };

//   return (
//     <View style={styles.container}>
//       {/* 🧊 Cube Scroll */}
//       <Animated.ScrollView
//         ref={scrollViewRef}
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
//           paddingVertical: 22,
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

//       {/* 🔘 Community FAB */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 72,
//           right: 15,
//           zIndex: 999999,
//         }}>
//         <AppleTouchFeedback onPress={handleCommunity}>
//           <View
//             style={{
//               width: 38,
//               height: 38,
//               borderRadius: 20,
//               backgroundColor: 'rgba(0,0,0,0.35)',
//               borderWidth: tokens.borderWidth.md,
//               borderColor: theme.colors.muted,
//               alignItems: 'center',
//               justifyContent: 'center',
//               shadowColor: '#000',
//               shadowOpacity: 0.2,
//               shadowRadius: 8,
//               shadowOffset: {width: 0, height: 4},
//             }}>
//             <MaterialIcons
//               name="people"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* ❌ Close button */}
//       <View
//         style={{
//           position: 'absolute',

//           top: 120,
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
