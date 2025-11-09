// apps/mobile/src/screens/AboutScreen.tsx
import React, {useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Animated,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {tokens} from '../styles/tokens/tokens';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

const APP_NAME = 'StylHelpr';
const APP_TAGLINE =
  'Your Personal AI Concierge — Outfits that actually fit your life.';
const VERSION = 'v0.9.0';

export default function AboutScreen({navigate}: any) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  const insets = useSafeAreaInsets();

  // ✨ Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const styles = StyleSheet.create({
    content: {padding: 24, paddingBottom: 60, gap: 24},
    header: {alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 22},
    logoBadge: {
      width: 64,
      height: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 0.2,
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {fontSize: 15, textAlign: 'center', opacity: 0.9},
    version: {fontSize: 12, marginTop: -2},
    card: {
      borderRadius: 16,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 4},
      marginBottom: 12,
    },
    cardTitle: {fontSize: 16, fontWeight: '700', marginBottom: 8},
    cardBody: {fontSize: 15, lineHeight: 22},
    linkRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    link: {fontSize: 15, textDecorationLine: 'underline'},
    footer: {alignItems: 'center', marginTop: 8},
    primaryBtn: {
      width: 220,
      borderRadius: 50,
      paddingHorizontal: 22,
    },
  });

  const openURL = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <Animated.ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background, opacity: fadeAnim},
      ]}
      keyboardShouldPersistTaps="handled">
      <View
        style={{
          height: insets.top + 60, // ⬅️ 56 is about the old navbar height
          backgroundColor: theme.colors.background, // same tone as old nav
        }}
      />
      <Text style={globalStyles.header}>About</Text>

      <View style={globalStyles.section}>
        <View style={[globalStyles.backContainer, {marginTop: 16}]}>
          <AppleTouchFeedback
            onPress={() => navigate('Settings')}
            hapticStyle="impactMedium"
            style={{alignSelf: 'flex-start'}}>
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.button3}
            />
          </AppleTouchFeedback>
          <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
        </View>

        {/* Main Content */}
        <ScrollView style={[globalStyles.screen, globalStyles.container]}>
          {/* Title / Hero */}
          <View style={styles.header}>
            <Text style={[styles.title, {color: theme.colors.foreground}]}>
              {APP_NAME}
            </Text>
            <Text style={[styles.subtitle, {color: colors.foreground}]}>
              {APP_TAGLINE}
            </Text>
          </View>

          {/* What it does */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderWidth: tokens.borderWidth.md,
                borderColor: theme.colors.surfaceBorder,
              },
            ]}>
            <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
              What it does
            </Text>
            <Text style={[styles.cardBody, {color: theme.colors.foreground}]}>
              Photograph your wardrobe, get intelligent outfit suggestions for
              any event or weather, and discover gaps with tailored
              recommendations.
            </Text>
          </View>

          {/* Privacy & Data */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderWidth: tokens.borderWidth.md,
                borderColor: theme.colors.surfaceBorder,
              },
            ]}>
            <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
              Privacy & Data
            </Text>
            <Text style={[styles.cardBody, {color: theme.colors.foreground}]}>
              We store wardrobe data and preference settings to personalize
              results. You can request export or deletion anytime.
            </Text>

            <View style={styles.linkRow}>
              <TouchableOpacity
                onPress={() => openURL('https://stylhelpr.com/privacy')}>
                <Text style={[styles.link, {color: theme.colors.foreground2}]}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>
              <Text style={{color: theme.colors.foreground2}}> • </Text>
              <TouchableOpacity
                onPress={() => openURL('https://stylhelpr.com/terms')}>
                <Text style={[styles.link, {color: theme.colors.foreground2}]}>
                  Terms of Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Credits */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderWidth: tokens.borderWidth.md,
                borderColor: theme.colors.surfaceBorder,
              },
            ]}>
            <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
              Credits
            </Text>
            <Text style={[styles.cardBody, {color: theme.colors.foreground}]}>
              Built with React Native, NestJS + Fastify, Vertex AI, and
              Pinecone. Designed for a premium, dark-mode experience.
            </Text>
          </View>

          {/* Contact Support button */}
          <View style={styles.footer}>
            <AppleTouchFeedback
              onPress={() => openURL('mailto:mike@stylhelpr.com')}
              hapticStyle="impactMedium"
              style={[globalStyles.buttonPrimary, styles.primaryBtn]}>
              <Text style={globalStyles.buttonPrimaryText}>
                Contact Support
              </Text>
            </AppleTouchFeedback>
          </View>
        </ScrollView>
      </View>
    </Animated.ScrollView>
  );
}

/////////////////

// // apps/mobile/src/screens/AboutScreen.tsx
// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   SafeAreaView,
//   TouchableOpacity,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// const APP_NAME = 'StylHelpr';
// const APP_TAGLINE =
//   'Your Personal AI Concierge — Outfits that actually fit your life.';
// const VERSION = 'v0.9.0';

// export default function AboutScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     content: {padding: 24, paddingBottom: 60, gap: 24},
//     header: {alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 22},
//     logoBadge: {
//       width: 64,
//       height: 64,
//       borderRadius: 16,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderWidth: 1,
//     },
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       letterSpacing: 0.2,
//       textAlign: 'center',
//       marginBottom: 12,
//     },
//     subtitle: {fontSize: 15, textAlign: 'center', opacity: 0.9},
//     version: {fontSize: 12, marginTop: -2},
//     card: {
//       borderRadius: 16,
//       padding: 18,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//       marginBottom: 12,
//     },
//     cardTitle: {fontSize: 16, fontWeight: '700', marginBottom: 8},
//     cardBody: {fontSize: 15, lineHeight: 22},
//     linkRow: {
//       marginTop: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 10,
//     },
//     link: {fontSize: 15, textDecorationLine: 'underline'},
//     footer: {alignItems: 'center', marginTop: 8},
//     primaryBtn: {
//       width: 220,
//       borderRadius: 50,
//       paddingHorizontal: 22,
//     },
//   });

//   const openURL = (url: string) => Linking.openURL(url).catch(() => {});

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled">
//       <Text style={globalStyles.header}>About</Text>

//       <View style={globalStyles.section}>
//         <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactMedium"
//             style={{alignSelf: 'flex-start'}}>
//             <MaterialIcons
//               name="arrow-back"
//               size={24}
//               color={theme.colors.button3}
//             />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         {/* Form Card */}
//         <ScrollView style={[globalStyles.screen, globalStyles.container]}>
//           {/* Title / Hero */}
//           <View style={styles.header}>
//             {/* <View
//               style={[
//                 styles.logoBadge,
//                 {
//                   backgroundColor: theme.colors.surface,
//                   borderColor: theme.colors.surfaceBorder,
//                 },
//               ]}>
//               <MaterialIcons
//                 name="styler"
//                 size={26}
//                 color={theme.colors.foreground}
//               />
//             </View> */}
//             <Text style={[styles.title, {color: theme.colors.foreground}]}>
//               {APP_NAME}
//             </Text>
//             <Text style={[styles.subtitle, {color: colors.foreground}]}>
//               {APP_TAGLINE}
//             </Text>
//             {/* <Text style={[styles.version, {color: theme.colors.foreground}]}>
//               {VERSION}
//             </Text> */}
//           </View>

//           {/* What it does */}
//           <View
//             style={[
//               styles.card,
//               {
//                 backgroundColor: theme.colors.surface,
//                 borderWidth: tokens.borderWidth.md,
//                 borderColor: theme.colors.surfaceBorder,
//               },
//             ]}>
//             <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
//               What it does
//             </Text>
//             <Text style={[styles.cardBody, {color: theme.colors.foreground}]}>
//               Photograph your wardrobe, get intelligent outfit suggestions for
//               any event or weather, and discover gaps with tailored
//               recommendations.
//             </Text>
//           </View>

//           {/* Privacy & Data */}
//           <View
//             style={[
//               styles.card,
//               {
//                 backgroundColor: theme.colors.surface,
//                 borderWidth: tokens.borderWidth.md,
//                 borderColor: theme.colors.surfaceBorder,
//               },
//             ]}>
//             <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
//               Privacy & Data
//             </Text>
//             <Text style={[styles.cardBody, {color: theme.colors.foreground}]}>
//               We store wardrobe data and preference settings to personalize
//               results. You can request export or deletion anytime.
//             </Text>

//             <View style={styles.linkRow}>
//               <TouchableOpacity
//                 onPress={() => openURL('https://stylhelpr.com/privacy')}>
//                 <Text style={[styles.link, {color: theme.colors.foreground2}]}>
//                   Privacy Policy
//                 </Text>
//               </TouchableOpacity>
//               <Text style={{color: theme.colors.foreground2}}> • </Text>
//               <TouchableOpacity
//                 onPress={() => openURL('https://stylhelpr.com/terms')}>
//                 <Text style={[styles.link, {color: theme.colors.foreground2}]}>
//                   Terms of Service
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Credits */}
//           <View
//             style={[
//               styles.card,
//               {
//                 backgroundColor: theme.colors.surface,
//                 borderWidth: tokens.borderWidth.md,
//                 borderColor: theme.colors.surfaceBorder,
//               },
//             ]}>
//             <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
//               Credits
//             </Text>
//             <Text style={[styles.cardBody, {color: theme.colors.foreground}]}>
//               Built with React Native, NestJS + Fastify, Vertex AI, and
//               Pinecone. Designed for a premium, dark-mode experience.
//             </Text>
//           </View>

//           {/* Contact Support button */}
//           <View style={styles.footer}>
//             <AppleTouchFeedback
//               onPress={() => openURL('mailto:mike@stylhelpr.com')}
//               hapticStyle="impactMedium"
//               style={[globalStyles.buttonPrimary, styles.primaryBtn]}>
//               <Text style={globalStyles.buttonPrimaryText}>
//                 Contact Support
//               </Text>
//             </AppleTouchFeedback>
//           </View>
//         </ScrollView>
//       </View>
//     </ScrollView>
//   );
// }
