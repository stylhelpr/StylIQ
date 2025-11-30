import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import {useAppTheme} from '../context/ThemeContext';

const {width: screenWidth} = Dimensions.get('window');

const SHOPPING_SUGGESTIONS = [
  {text: "Looking for deals? Try ASOS! 🛍️", site: 'https://asos.com'},
  {text: "H&M has new arrivals! ✨", site: 'https://hm.com'},
  {text: "Check out Zara's latest! 👗", site: 'https://zara.com'},
  {text: "Nordstrom sale happening! 🔥", site: 'https://nordstrom.com'},
  {text: "Found cute styles on Shein! 💖", site: 'https://shein.com'},
  {text: "SSENSE has designer picks! 💎", site: 'https://ssense.com'},
  {text: "Amazon fashion deals! 📦", site: 'https://amazon.com/fashion'},
  {text: "Farfetch luxury finds! 👠", site: 'https://farfetch.com'},
];

type Props = {
  onSuggestionPress?: (url: string) => void;
  isVisible?: boolean;
};

export default function ShoppingAssistant({
  onSuggestionPress,
  isVisible = true,
}: Props) {
  const {theme} = useAppTheme();
  const [showBubble, setShowBubble] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(
    SHOPPING_SUGGESTIONS[0],
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Animation values
  const bounce = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const blink = useSharedValue(1);
  const bubbleScale = useSharedValue(0);
  const assistantScale = useSharedValue(0);
  const eyeMovement = useSharedValue(0);

  // Entry animation
  useEffect(() => {
    if (isVisible) {
      assistantScale.value = withSpring(1, {damping: 8, stiffness: 100});
    } else {
      assistantScale.value = withSpring(0);
    }
  }, [isVisible]);

  // Continuous idle animations
  useEffect(() => {
    // Gentle bounce
    bounce.value = withRepeat(
      withSequence(
        withTiming(-8, {duration: 1000, easing: Easing.inOut(Easing.ease)}),
        withTiming(0, {duration: 1000, easing: Easing.inOut(Easing.ease)}),
      ),
      -1,
      false,
    );

    // Occasional wiggle
    const startWiggle = () => {
      wiggle.value = withSequence(
        withTiming(-10, {duration: 100}),
        withTiming(10, {duration: 100}),
        withTiming(-5, {duration: 100}),
        withTiming(5, {duration: 100}),
        withTiming(0, {duration: 100}),
      );
    };

    const wiggleInterval = setInterval(startWiggle, 4000);

    // Blinking
    const startBlink = () => {
      blink.value = withSequence(
        withTiming(0, {duration: 100}),
        withTiming(1, {duration: 100}),
      );
    };

    const blinkInterval = setInterval(startBlink, 3000);

    // Eye movement
    eyeMovement.value = withRepeat(
      withSequence(
        withDelay(2000, withTiming(-3, {duration: 500})),
        withDelay(1000, withTiming(3, {duration: 500})),
        withDelay(1500, withTiming(0, {duration: 500})),
      ),
      -1,
      false,
    );

    return () => {
      clearInterval(wiggleInterval);
      clearInterval(blinkInterval);
    };
  }, []);

  // Show suggestion bubble periodically
  useEffect(() => {
    const showSuggestion = () => {
      const randomSuggestion =
        SHOPPING_SUGGESTIONS[
          Math.floor(Math.random() * SHOPPING_SUGGESTIONS.length)
        ];
      setCurrentSuggestion(randomSuggestion);
      setShowBubble(true);
      bubbleScale.value = withSpring(1, {damping: 10, stiffness: 150});

      // Hide after 5 seconds
      setTimeout(() => {
        bubbleScale.value = withTiming(0, {duration: 200});
        setTimeout(() => setShowBubble(false), 200);
      }, 5000);
    };

    // Show first suggestion after 3 seconds
    const initialTimeout = setTimeout(showSuggestion, 3000);

    // Show suggestions every 30 seconds
    const suggestionInterval = setInterval(showSuggestion, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(suggestionInterval);
    };
  }, []);

  const handlePress = () => {
    // Excited animation
    wiggle.value = withSequence(
      withTiming(-15, {duration: 50}),
      withTiming(15, {duration: 50}),
      withTiming(-10, {duration: 50}),
      withTiming(10, {duration: 50}),
      withTiming(0, {duration: 50}),
    );

    if (showBubble && currentSuggestion && onSuggestionPress && !isNavigating) {
      setIsNavigating(true);
      setShowBubble(false);
      bubbleScale.value = withTiming(0, {duration: 200});
      onSuggestionPress(currentSuggestion.site);
      // Reset after navigation completes
      setTimeout(() => setIsNavigating(false), 2000);
    } else if (!showBubble) {
      // Show a random suggestion when tapped
      const randomSuggestion =
        SHOPPING_SUGGESTIONS[
          Math.floor(Math.random() * SHOPPING_SUGGESTIONS.length)
        ];
      setCurrentSuggestion(randomSuggestion);
      setShowBubble(true);
      bubbleScale.value = withSpring(1, {damping: 10, stiffness: 150});
    }
  };

  const handleBubblePress = () => {
    if (currentSuggestion && onSuggestionPress && !isNavigating) {
      setIsNavigating(true);
      setShowBubble(false);
      bubbleScale.value = withTiming(0, {duration: 200});
      onSuggestionPress(currentSuggestion.site);
      // Reset after navigation completes
      setTimeout(() => setIsNavigating(false), 2000);
    }
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: bounce.value},
      {rotate: `${wiggle.value}deg`},
      {scale: assistantScale.value},
    ],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{scale: bubbleScale.value}],
    opacity: bubbleScale.value,
  }));

  const leftEyeStyle = useAnimatedStyle(() => ({
    transform: [{translateX: eyeMovement.value}, {scaleY: blink.value}],
  }));

  const rightEyeStyle = useAnimatedStyle(() => ({
    transform: [{translateX: eyeMovement.value}, {scaleY: blink.value}],
  }));

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 100,
      right: 16,
      alignItems: 'flex-end',
      zIndex: 999,
    },
    bubbleContainer: {
      marginBottom: 8,
      maxWidth: screenWidth * 0.6,
    },
    bubble: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 12,
      paddingRight: 16,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    bubbleText: {
      fontSize: 14,
      color: theme.colors.foreground,
      fontWeight: '500',
    },
    bubbleTail: {
      position: 'absolute',
      bottom: -10,
      right: 20,
      width: 0,
      height: 0,
      borderLeftWidth: 10,
      borderRightWidth: 10,
      borderTopWidth: 12,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: theme.colors.primary,
    },
    tapHint: {
      fontSize: 11,
      color: theme.colors.primary,
      marginTop: 4,
      fontWeight: '600',
    },
    assistant: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    face: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    eyesContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    eye: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#fff',
      marginHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pupil: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#333',
    },
    mouth: {
      width: 20,
      height: 10,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
      backgroundColor: '#fff',
      marginTop: 2,
    },
    blush: {
      position: 'absolute',
      width: 10,
      height: 6,
      borderRadius: 5,
      backgroundColor: 'rgba(255,150,150,0.5)',
    },
    blushLeft: {
      left: 6,
      top: 32,
    },
    blushRight: {
      right: 6,
      top: 32,
    },
    shoppingBag: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: '#FF6B6B',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
    bagIcon: {
      fontSize: 12,
    },
  });

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {/* Speech Bubble */}
      {showBubble && (
        <Animated.View style={[styles.bubbleContainer, bubbleStyle]}>
          <TouchableOpacity
            style={styles.bubble}
            onPress={handleBubblePress}
            activeOpacity={0.8}>
            <Text style={styles.bubbleText}>{currentSuggestion.text}</Text>
            <Text style={styles.tapHint}>Tap to visit →</Text>
            <View style={styles.bubbleTail} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Assistant Character */}
      <Animated.View style={containerStyle}>
        <TouchableOpacity
          style={styles.assistant}
          onPress={handlePress}
          activeOpacity={0.9}>
          <View style={styles.face}>
            {/* Eyes */}
            <View style={styles.eyesContainer}>
              <Animated.View style={[styles.eye, leftEyeStyle]}>
                <View style={styles.pupil} />
              </Animated.View>
              <Animated.View style={[styles.eye, rightEyeStyle]}>
                <View style={styles.pupil} />
              </Animated.View>
            </View>
            {/* Mouth */}
            <View style={styles.mouth} />
            {/* Blush marks */}
            <View style={[styles.blush, styles.blushLeft]} />
            <View style={[styles.blush, styles.blushRight]} />
          </View>
          {/* Shopping bag badge */}
          <View style={styles.shoppingBag}>
            <Text style={styles.bagIcon}>🛍️</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
