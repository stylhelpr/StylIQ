import React, {useEffect, useState, useRef} from 'react';
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
} from 'react-native-reanimated';
import {useAppTheme} from '../context/ThemeContext';
import {API_BASE_URL} from '../config/api';

const {width: screenWidth} = Dimensions.get('window');

// Fallback suggestions when AI is unavailable
const FALLBACK_SUGGESTIONS = [
  {text: "Looking for deals? Try ASOS!", site: 'https://asos.com'},
  {text: "H&M has new arrivals!", site: 'https://hm.com'},
  {text: "Check out Zara's latest!", site: 'https://zara.com'},
  {text: "Nordstrom sale happening!", site: 'https://nordstrom.com'},
  {text: "Found cute styles on Shein!", site: 'https://shein.com'},
  {text: "SSENSE has designer picks!", site: 'https://ssense.com'},
  {text: "Amazon fashion deals!", site: 'https://amazon.com/fashion'},
  {text: "Farfetch luxury finds!", site: 'https://farfetch.com'},
];

// Strategic multi-recommendation prompt - gets 5 suggestions in ONE API call
const SHOPPING_PROMPT = `You are an elite personal shopping assistant with COMPLETE access to this user's fashion data. Analyze their wardrobe, calendar, style profile, outfit feedback, and preferences to generate 5 HIGHLY PERSONALIZED shopping recommendations.

Generate exactly 5 recommendations using these strategies:

1. **CALENDAR URGENCY**: Find an upcoming event and recommend something they NEED for it
   - "Interview Tuesday? Get this power blazer!"
   - "Wedding in 2 weeks - you need formal shoes!"

2. **WARDROBE GAP**: Identify something missing from their wardrobe based on what they own
   - "You have 5 blue shirts but no neutral pants to match"
   - "No winter layers in your favorite earth tones"

3. **STYLE UPGRADE**: Based on their positive outfit feedback, suggest leveling up
   - "You love your navy blazer - here's a premium upgrade"
   - "Your casual style is great, add a statement watch"

4. **TRENDING + PERSONAL**: Something trending that matches THEIR specific style
   - "Oversized blazers are hot - perfect for your minimalist vibe"

5. **COMPLETE THE LOOK**: Based on their saved outfits, suggest missing pieces
   - "Your 'Date Night' outfit needs the right shoes"
   - "Add a belt to complete your work look"

CRITICAL: Each recommendation must be:
- Under 12 words
- Specific to THEIR data (reference actual items, events, colors they like)
- Create urgency or desire
- Feel personal, not generic

Respond with a JSON array of exactly 5 objects:
[
  {"text": "Short punchy recommendation!", "site": "https://nordstrom.com", "search": "navy blazer mens", "strategy": "calendar"},
  {"text": "Another recommendation!", "site": "https://asos.com", "search": "white sneakers", "strategy": "gap"},
  ...
]

Sites to use: nordstrom.com, asos.com, hm.com, zara.com, ssense.com, farfetch.com, amazon.com/fashion, shein.com`;

type Suggestion = {
  text: string;
  site: string;
  search?: string;
};

type Props = {
  onSuggestionPress?: (url: string) => void;
  isVisible?: boolean;
  userId?: string | null;
};

export default function ShoppingAssistant({
  onSuggestionPress,
  isVisible = true,
  userId,
}: Props) {
  const {theme} = useAppTheme();
  const [showBubble, setShowBubble] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion>(
    FALLBACK_SUGGESTIONS[0],
  );
  const [isNavigating, setIsNavigating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([]);
  const aiSuggestionIndex = useRef(0);
  const hasLoadedAI = useRef(false);

  // Fetch AI-powered suggestions on mount
  useEffect(() => {
    if (userId && !hasLoadedAI.current) {
      hasLoadedAI.current = true;
      fetchAISuggestions();
    }
  }, [userId]);

  const fetchAISuggestions = async () => {
    if (!userId) return;

    try {
      // Call the AI chat endpoint which has full data access
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          messages: [
            {role: 'user', content: SHOPPING_PROMPT},
          ],
        }),
      });

      if (!response.ok) throw new Error('AI request failed');

      const data = await response.json();
      // Handle different possible response structures
      const aiText = data.reply || data.text || data.response || data.content || data.message || '';

      // Try to parse as JSON first, then fall back to plain text
      const suggestions = parseAISuggestions(aiText);
      if (suggestions.length > 0) {
        setAiSuggestions(suggestions);
        setCurrentSuggestion(suggestions[0]);
      } else {
        // If parsing failed, create a suggestion from the plain text
        if (aiText.trim()) {
          const plainTextSuggestion: Suggestion = {
            text: aiText.substring(0, 100),
            site: 'https://google.com',
          };
          setAiSuggestions([plainTextSuggestion]);
          setCurrentSuggestion(plainTextSuggestion);
        }
      }
    } catch (err) {
      // Silently fall back to hardcoded suggestions on error
    }
  };

  const parseAISuggestions = (text: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    // First try to parse as a JSON array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.text && item.site) {
              let site = item.site;
              // Ensure proper URL format
              if (!site.startsWith('http')) {
                site = `https://${site}`;
              }
              // Add search query to site URL if available
              if (item.search && !site.includes('?')) {
                site = `${site}/search?q=${encodeURIComponent(item.search)}`;
              }
              suggestions.push({
                text: item.text,
                site: site,
                search: item.search,
              });
            }
          }
          if (suggestions.length > 0) return suggestions;
        }
      } catch (e) {
        // Fall through to individual object parsing
      }
    }

    // Fallback: Try to find individual JSON objects
    const jsonMatch = text.match(/\{[^{}]*"text"[^{}]*\}/g);
    if (jsonMatch) {
      for (const match of jsonMatch) {
        try {
          const parsed = JSON.parse(match);
          if (parsed.text && parsed.site) {
            let site = parsed.site;
            if (!site.startsWith('http')) {
              site = `https://${site}`;
            }
            suggestions.push({
              text: parsed.text,
              site: site,
              search: parsed.search,
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    return suggestions;
  };

  const getNextSuggestion = (): Suggestion => {
    // Prefer AI suggestions if available
    if (aiSuggestions.length > 0) {
      aiSuggestionIndex.current = (aiSuggestionIndex.current + 1) % aiSuggestions.length;
      return aiSuggestions[aiSuggestionIndex.current];
    }
    // Fallback to static suggestions
    return FALLBACK_SUGGESTIONS[Math.floor(Math.random() * FALLBACK_SUGGESTIONS.length)];
  };

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

  // Show suggestion bubble periodically (respectful timing - not spammy)
  useEffect(() => {
    const showSuggestion = () => {
      const nextSuggestion = getNextSuggestion();
      setCurrentSuggestion(nextSuggestion);
      setShowBubble(true);
      bubbleScale.value = withSpring(1, {damping: 10, stiffness: 150});

      // Hide after 6 seconds - enough time to read but not annoying
      setTimeout(() => {
        bubbleScale.value = withTiming(0, {duration: 200});
        setTimeout(() => setShowBubble(false), 200);
      }, 6000);
    };

    // Show first suggestion after 8 seconds (let user settle in first)
    const initialTimeout = setTimeout(showSuggestion, userId ? 8000 : 5000);

    // Show new suggestion every 60 seconds (respectful, not annoying)
    const suggestionInterval = setInterval(showSuggestion, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(suggestionInterval);
    };
  }, [aiSuggestions]);

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
      // Show a suggestion when tapped (AI-powered if available)
      const nextSuggestion = getNextSuggestion();
      setCurrentSuggestion(nextSuggestion);
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
