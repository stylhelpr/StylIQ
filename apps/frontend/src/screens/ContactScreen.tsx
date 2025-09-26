// apps/mobile/src/screens/ContactScreen.tsx
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {tokens} from '../styles/tokens/tokens';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function ContactScreen({navigate}: any) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

  // ✨ Fade-in animation setup
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
    title: {
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 4,
    },
    formCard: {
      borderRadius: 16,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 4},
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      marginTop: 12,
      marginBottom: 6,
    },
    input: {
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      backgroundColor: theme.colors.surface3,
      borderWidth: tokens.borderWidth.lg,
      borderColor: theme.colors.surfaceBorder,
      marginBottom: 10,
    },
    textarea: {
      height: 140,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    primaryBtn: {
      width: 220,
      borderRadius: 50,
      paddingHorizontal: 22,
    },
    tipCard: {
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      gap: 8,
    },
    tipIcon: {
      width: 24,
      height: 24,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    tipText: {
      fontSize: 13,
      lineHeight: 18,
      flexShrink: 1,
    },
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const disabled = !name || !email || !message || sending;

  const sendEmail = async () => {
    try {
      setSending(true);
      const to = 'mike@stylhelpr.com';
      const subjectBase = topic ? `[${topic}]` : 'Contact';
      const subject = encodeURIComponent(`${subjectBase} — ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nTopic: ${
          topic || '(none)'
        }\n\n${message}`,
      );
      const url = `mailto:${to}?subject=${subject}&body=${body}`;

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`mailto:${to}`);
      }
    } catch (e) {
      Alert.alert(
        'Email not available',
        'We couldn’t open your mail app on this device.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Animated.ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background, opacity: fadeAnim},
      ]}
      keyboardShouldPersistTaps="handled">
      <Text style={globalStyles.header}>Contact Us</Text>

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

        {/* Form Card */}
        <ScrollView style={[globalStyles.screen, globalStyles.container]}>
          {/* Name */}
          <View
            style={[styles.formCard, {backgroundColor: theme.colors.surface}]}>
            <Text style={[styles.label, {color: theme.colors.foreground}]}>
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, {color: theme.colors.foreground}]}
              placeholder="Your full name"
              placeholderTextColor={theme.colors.muted}
            />

            {/* Email */}
            <Text style={[styles.label, {color: colors.foreground}]}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={[styles.input, {color: theme.colors.foreground}]}
              placeholder="you@domain.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Topic */}
            <Text style={[styles.label, {color: colors.foreground}]}>
              Topic (optional)
            </Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              style={[styles.input, {color: theme.colors.foreground}]}
              placeholder="Bug report, feedback, feature request…"
              placeholderTextColor={colors.muted}
            />

            {/* Message */}
            <Text style={[styles.label, {color: colors.foreground}]}>
              Message
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              style={[
                styles.input,
                styles.textarea,
                {color: theme.colors.foreground},
              ]}
              placeholder="How can we help?"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Primary Action */}
          <View style={styles.buttonRow}>
            <AppleTouchFeedback
              onPress={!disabled ? sendEmail : () => {}}
              hapticStyle="impactMedium"
              style={[
                globalStyles.buttonPrimary,
                styles.primaryBtn,
                {opacity: disabled ? 0.5 : 1, marginTop: 22, marginBottom: 22},
              ]}>
              {sending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={globalStyles.buttonPrimaryText}>Send Message</Text>
              )}
            </AppleTouchFeedback>
          </View>

          {/* Tip Banner */}
          <View
            style={[
              styles.tipCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.surfaceBorder,
              },
            ]}>
            <View style={[styles.tipIcon]}>
              <MaterialIcons
                name="help-outline"
                size={16}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.tipText, {color: colors.foreground}]}>
              Tip: Include screenshots or steps to reproduce if you’re reporting
              a bug.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Animated.ScrollView>
  );
}

//////////////////

// // apps/mobile/src/screens/ContactScreen.tsx
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   SafeAreaView,
//   ActivityIndicator,
//   Alert,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// export default function ContactScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     content: {padding: 24, paddingBottom: 60, gap: 24},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 4,
//     },
//     formCard: {
//       borderRadius: 16,
//       padding: 18,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {
//       fontSize: 15,
//       fontWeight: '600',
//       marginTop: 12,
//       marginBottom: 6,
//     },
//     input: {
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderWidth: tokens.borderWidth.lg,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     textarea: {
//       height: 140,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//     },
//     primaryBtn: {
//       width: 220,
//       borderRadius: 50,
//       paddingHorizontal: 22,
//     },
//     tipCard: {
//       borderRadius: 12,
//       padding: 14,
//       flexDirection: 'row',
//       alignItems: 'center',
//       borderWidth: 1,
//       gap: 8,
//     },
//     tipIcon: {
//       width: 24,
//       height: 24,
//       borderRadius: 6,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.surface,
//     },
//     tipText: {
//       fontSize: 13,
//       lineHeight: 18,
//       flexShrink: 1,
//     },
//   });

//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [topic, setTopic] = useState('');
//   const [message, setMessage] = useState('');
//   const [sending, setSending] = useState(false);

//   const disabled = !name || !email || !message || sending;

//   const sendEmail = async () => {
//     try {
//       setSending(true);

//       const to = 'mike@stylhelpr.com';

//       const subjectBase = topic ? `[${topic}]` : 'Contact';
//       const subject = encodeURIComponent(`${subjectBase} — ${name}`);

//       const body = encodeURIComponent(
//         `Name: ${name}\nEmail: ${email}\nTopic: ${
//           topic || '(none)'
//         }\n\n${message}`,
//       );

//       const url = `mailto:${to}?subject=${subject}&body=${body}`;

//       const supported = await Linking.canOpenURL(url);
//       if (supported) {
//         await Linking.openURL(url);
//       } else {
//         // Fallback to basic mailto without params
//         await Linking.openURL(`mailto:${to}`);
//       }
//     } catch (e) {
//       Alert.alert(
//         'Email not available',
//         'We couldn’t open your mail app on this device.',
//       );
//     } finally {
//       setSending(false);
//     }
//   };

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}
//       keyboardShouldPersistTaps="handled">
//       <Text style={globalStyles.header}>Contact Us</Text>

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
//           {/* Name */}
//           <View
//             style={[styles.formCard, {backgroundColor: theme.colors.surface}]}>
//             {/* Name */}
//             <Text style={[styles.label, {color: theme.colors.foreground}]}>
//               Name
//             </Text>
//             <TextInput
//               value={name}
//               onChangeText={setName}
//               style={[
//                 styles.input,
//                 {
//                   color: theme.colors.foreground,
//                 },
//               ]}
//               placeholder="Your full name"
//               placeholderTextColor={theme.colors.muted}
//             />

//             {/* Email */}
//             <Text style={[styles.label, {color: colors.foreground}]}>
//               Email
//             </Text>
//             <TextInput
//               value={email}
//               onChangeText={setEmail}
//               style={[
//                 styles.input,
//                 {
//                   color: theme.colors.foreground,
//                 },
//               ]}
//               placeholder="you@domain.com"
//               placeholderTextColor={colors.muted}
//               keyboardType="email-address"
//               autoCapitalize="none"
//             />

//             {/* Topic */}
//             <Text style={[styles.label, {color: colors.foreground}]}>
//               Topic (optional)
//             </Text>
//             <TextInput
//               value={topic}
//               onChangeText={setTopic}
//               style={[
//                 styles.input,
//                 {
//                   color: theme.colors.foreground,
//                 },
//               ]}
//               placeholder="Bug report, feedback, feature request…"
//               placeholderTextColor={colors.muted}
//             />

//             {/* Message */}
//             <Text style={[styles.label, {color: colors.foreground}]}>
//               Message
//             </Text>
//             <TextInput
//               value={message}
//               onChangeText={setMessage}
//               style={[
//                 styles.input,
//                 styles.textarea,
//                 {
//                   color: theme.colors.foreground,
//                 },
//               ]}
//               placeholder="How can we help?"
//               placeholderTextColor={colors.muted}
//               multiline
//               textAlignVertical="top"
//             />
//           </View>

//           {/* Primary Action */}
//           <View style={styles.buttonRow}>
//             <AppleTouchFeedback
//               onPress={!disabled ? sendEmail : () => {}}
//               hapticStyle="impactMedium"
//               style={[
//                 globalStyles.buttonPrimary,
//                 styles.primaryBtn,
//                 {
//                   opacity: disabled ? 0.5 : 1,
//                   marginTop: 22,
//                   marginBottom: 22,
//                 },
//               ]}>
//               {sending ? (
//                 <ActivityIndicator color={colors.background} />
//               ) : (
//                 <Text style={globalStyles.buttonPrimaryText}>Send Message</Text>
//               )}
//             </AppleTouchFeedback>
//           </View>

//           {/* Tip Banner */}
//           <View
//             style={[
//               styles.tipCard,
//               {
//                 backgroundColor: theme.colors.surface,
//                 borderColor: theme.colors.surfaceBorder,
//               },
//             ]}>
//             <View style={[styles.tipIcon]}>
//               <MaterialIcons
//                 name="help-outline"
//                 size={16}
//                 color={colors.primary}
//               />
//             </View>
//             <Text style={[styles.tipText, {color: colors.foreground}]}>
//               Tip: Include screenshots or steps to reproduce if you’re reporting
//               a bug.
//             </Text>
//           </View>
//         </ScrollView>
//       </View>
//     </ScrollView>
//   );
// }
