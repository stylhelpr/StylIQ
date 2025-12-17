import React, {useEffect, useRef} from 'react';
import {View, Text, Animated, Easing, StyleSheet} from 'react-native';
import {useEmotion} from '../hooks/useEmotiion';
import {useEmotionMeter} from '../hooks/useEmotionMeter';
import EmotionMeter from '../components/EmotionMeter/EmotionMeter';
import EmotionPulse from '../components/EmotionPulse/EmotionPulse';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

export default function EmotionTestScreen() {
  const emotion = useEmotion();
  const weights = useEmotionMeter();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const scale = useRef(new Animated.Value(1)).current;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    card: {
      alignItems: 'center',
      paddingVertical: tokens.spacing.xl,
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: 20,
    },
    emoji: {
      fontSize: 250,
      marginTop: tokens.spacing.xxl,
    },
    label: {
      fontSize: tokens.fontSize.xxl,
      fontWeight: '600',
      letterSpacing: 1.2,
      color: theme.colors.foreground,
    },
    confidence: {
      fontSize: tokens.fontSize.lg,
      marginTop: tokens.spacing.xs,
      color: theme.colors.foreground,
    },
    overlayRight: {
      position: 'absolute',
      top: 120,
      right: 20,
    },
  });

  const colorMap: Record<string, string> = {
    happy: '#FFD166',
    sad: '#118AB2',
    angry: '#EF476F',
    fear: '#9D4EDD',
    surprise: '#FB8500',
    neutral: '#AAAAAA',
    error: '#FF3B30',
  };

  const emojiMap: Record<string, string> = {
    happy: '😊',
    sad: '😞',
    angry: '😡',
    fear: '😱',
    surprise: '😲',
    neutral: '😐',
    error: '⚠️',
  };

  const mood = emotion?.emotion || 'neutral';
  const pulseColor = colorMap[mood] || colorMap.neutral;

  // 🔹 Animate pulse ring when emotion changes
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.15,
        duration: 250,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [mood]);

  return (
    <View style={styles.container}>
      {/* 🔹 Central mood card */}
      <View style={styles.card}>
        <Text style={[styles.emoji, {color: pulseColor}]}>
          {emojiMap[mood]}
        </Text>
        <Text style={styles.label}>{mood.toUpperCase()}</Text>
        {emotion?.confidence !== undefined && emotion?.emotion !== 'error' && (
          <Text style={styles.confidence}>
            {(emotion.confidence || 0).toFixed(1)}%
          </Text>
        )}
        {emotion?.errorMessage && (
          <Text style={[styles.confidence, {color: colorMap.error, marginTop: 8}]}>
            {emotion.errorType}: {emotion.errorMessage}
          </Text>
        )}
      </View>

      {/* 🔹 Live emotion pulse ring */}
      {/* <EmotionPulse emotion={mood} /> */}

      {/* 🔹 Meter overlay (top-right) */}
      <View style={styles.overlayRight}>
        <EmotionMeter data={weights} />
      </View>
    </View>
  );
}

/////////////////

// import React, {useEffect, useRef} from 'react';
// import {View, Text, Animated, Easing, StyleSheet} from 'react-native';
// import {useEmotion} from '../hooks/useEmotiion';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAppTheme} from '../context/ThemeContext';

// export default function EmotionTestScreen() {
//   const emotion = useEmotion();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const scale = useRef(new Animated.Value(1)).current;

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     pulse: {
//       position: 'absolute',
//       width: 400,
//       height: 400,
//       borderRadius: 200,
//       borderWidth: 10,
//       opacity: 0.4,
//     },
//     card: {
//       alignItems: 'center',
//       paddingVertical: tokens.spacing.xl,
//       paddingHorizontal: tokens.spacing.lg,
//       borderRadius: 20,
//     },
//     emoji: {
//       fontSize: 300,
//       marginBottom: tokens.spacing.sm,
//     },
//     label: {
//       fontSize: tokens.fontSize.xxl,
//       fontWeight: '600',
//       letterSpacing: 1.2,
//     },
//     confidence: {
//       fontSize: tokens.fontSize.lg,
//       marginTop: tokens.spacing.xs,
//     },
//   });

//   const colorMap: Record<string, string> = {
//     happy: '#FFD166',
//     sad: '#118AB2',
//     angry: '#EF476F',
//     fear: '#9D4EDD',
//     surprise: '#FB8500',
//     neutral: '#AAAAAA',
//   };

//   const emojiMap: Record<string, string> = {
//     happy: '😊',
//     sad: '😞',
//     angry: '😡',
//     fear: '😱',
//     surprise: '😲',
//     neutral: '😐',
//   };

//   const mood = emotion?.emotion || 'neutral';
//   const pulseColor = colorMap[mood] || colorMap.neutral;

//   // 🔹 animate subtle pulse when emotion changes
//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(scale, {
//         toValue: 1.15,
//         duration: 250,
//         easing: Easing.ease,
//         useNativeDriver: true,
//       }),
//       Animated.timing(scale, {
//         toValue: 1,
//         duration: 400,
//         easing: Easing.out(Easing.ease),
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, [mood]);

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       {/* <Animated.View
//         style={[styles.pulse, {borderColor: pulseColor, transform: [{scale}]}]}
//       /> */}
//       <View style={styles.card}>
//         <Text style={[styles.emoji, {color: pulseColor}]}>
//           {emojiMap[mood]}
//         </Text>
//         <Text style={[styles.label, {color: theme.colors.foreground}]}>
//           {mood.toUpperCase()}
//         </Text>
//         {emotion?.confidence && (
//           <Text style={[styles.confidence, {color: theme.colors.foreground}]}>
//             {(emotion.confidence || 0).toFixed(1)}%
//           </Text>
//         )}
//       </View>
//     </View>
//   );
// }

////////////////

// import React, {useEffect, useRef} from 'react';
// import {View, Text, Animated, Easing, StyleSheet} from 'react-native';
// import {useEmotion} from '../hooks/useEmotiion';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useAppTheme} from '../context/ThemeContext';

// export default function EmotionTestScreen() {
//   const emotion = useEmotion();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const scale = useRef(new Animated.Value(1)).current;

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     pulse: {
//       position: 'absolute',
//       width: 160,
//       height: 160,
//       borderRadius: 80,
//       borderWidth: 5,
//       opacity: 0.4,
//     },
//     card: {
//       alignItems: 'center',
//       paddingVertical: tokens.spacing.xl,
//       paddingHorizontal: tokens.spacing.lg,
//       borderRadius: 20,
//     },
//     emoji: {
//       fontSize: 64,
//       marginBottom: tokens.spacing.sm,
//     },
//     label: {
//       fontSize: tokens.fontSize.xl,
//       fontWeight: '600',
//       letterSpacing: 1.2,
//     },
//     confidence: {
//       fontSize: tokens.fontSize.sm,
//       marginTop: tokens.spacing.xs,
//     },
//   });

//   const colorMap: Record<string, string> = {
//     happy: '#FFD166',
//     sad: '#118AB2',
//     angry: '#EF476F',
//     fear: '#9D4EDD',
//   };

//   const emojiMap: Record<string, string> = {
//     happy: '😊',
//     sad: '😞',
//     angry: '😡',
//     fear: '😱',
//     neutral: '😐',
//   };

//   const mood = emotion?.emotion || 'neutral';
//   const pulseColor = colorMap[mood] || colorMap.neutral;

//   // 🔹 animate subtle pulse when emotion changes
//   useEffect(() => {
//     Animated.sequence([
//       Animated.timing(scale, {
//         toValue: 1.15,
//         duration: 250,
//         easing: Easing.ease,
//         useNativeDriver: true,
//       }),
//       Animated.timing(scale, {
//         toValue: 1,
//         duration: 400,
//         easing: Easing.out(Easing.ease),
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, [mood]);

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Animated.View
//         style={[styles.pulse, {borderColor: pulseColor, transform: [{scale}]}]}
//       />
//       <View style={styles.card}>
//         <Text style={[styles.emoji, {color: pulseColor}]}>
//           {emojiMap[mood]}
//         </Text>
//         <Text style={[styles.label, {color: theme.colors.foreground}]}>
//           {mood.toUpperCase()}
//         </Text>
//         {emotion?.confidence && (
//           <Text style={[styles.confidence, {color: theme.colors.foreground}]}>
//             {(emotion.confidence || 0).toFixed(1)}%
//           </Text>
//         )}
//       </View>
//     </View>
//   );
// }

//////////////////

// import React from 'react';
// import {View, Text} from 'react-native';
// import {useEmotion} from '../hooks/useEmotiion';

// export default function EmotionTestScreen() {
//   const emotion = useEmotion();

//   return (
//     <View>
//       <Text>Emotion: {emotion?.emotion}</Text>
//       <Text>Confidence: {emotion?.confidence}</Text>
//     </View>
//   );
// }
