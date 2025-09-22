// apps/mobile/src/screens/FeedbackScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {tokens} from '../styles/tokens/tokens';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DeviceInfo from 'react-native-device-info';
import {API_BASE_URL} from '../config/api';

export default function FeedbackScreen({navigate}: any) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();

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
    label: {fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 6},
    input: {
      backgroundColor: theme.colors.surface3,
      borderWidth: tokens.borderWidth.lg,
      borderColor: theme.colors.surfaceBorder,
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      marginBottom: 10,
    },
    textarea: {height: 140},
    toggleRow: {
      marginTop: 8,
      paddingTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    toggleTitle: {fontSize: 15, fontWeight: '600'},
    toggleSub: {fontSize: 12},
    buttonRow: {flexDirection: 'row', justifyContent: 'center'},
    primaryBtn: {width: 220, borderRadius: 50, paddingHorizontal: 22},
    tipCard: {
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface3,
      borderWidth: tokens.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
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
    tipText: {fontSize: 13, lineHeight: 18, flexShrink: 1},
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('StyliQ Feedback');
  const [message, setMessage] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [sending, setSending] = useState(false);

  const disabled = !message.trim() || sending;

  const buildDiagnostics = async () => {
    try {
      const appVersion = DeviceInfo.getVersion();
      const buildNumber = DeviceInfo.getBuildNumber();
      const systemName = DeviceInfo.getSystemName();
      const systemVersion = DeviceInfo.getSystemVersion();
      const model = DeviceInfo.getModel();
      const deviceId = DeviceInfo.getDeviceId();
      return `\n\n---\nDiagnostics (auto-included):\nApp: ${appVersion} (Build ${buildNumber})\nDevice: ${model} (${deviceId})\nOS: ${systemName} ${systemVersion}`;
    } catch {
      return '\n\n---\nDiagnostics unavailable.';
    }
  };

  const openMailComposer = async () => {
    const diag = includeDiagnostics ? await buildDiagnostics() : '';
    const to = 'mike@stylhelpr.com'; // ⬅️ send to Mike (matches Contact screen)
    const mailSubject = encodeURIComponent(subject || 'StyliQ Feedback');
    const intro =
      (name ? `From: ${name}\n` : '') + (email ? `Email: ${email}\n` : '');
    const body = encodeURIComponent(`${intro}${message}${diag}`);
    const url = `mailto:${to}?subject=${mailSubject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      // fallback to bare mailto
      const fallback = `mailto:${to}`;
      const canOpenBare = await Linking.canOpenURL(fallback);
      if (canOpenBare) {
        await Linking.openURL(fallback);
        return true;
      }
    } catch {}
    return false;
  };

  const submit = async () => {
    try {
      setSending(true);

      // Prefer native mail app to Mike
      const launchedMail = await openMailComposer();
      if (launchedMail) {
        setMessage('');
        setName('');
        setEmail('');
        Alert.alert('Thank you!', 'Your email draft is ready to send.');
        return;
      }

      // Fallback: send to backend if no mail app
      const diag = includeDiagnostics ? await buildDiagnostics() : '';
      const res = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: name || undefined,
          email: email || undefined,
          subject: subject || 'StyliQ Feedback',
          message,
          diagnostics: includeDiagnostics ? diag : undefined,
          // (optional) you can include a "to" here if your backend routes mail:
          to: 'mike@stylhelpr.com',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setMessage('');
      setName('');
      setEmail('');
      Alert.alert('Thanks!', 'Your feedback has been sent.');
    } catch {
      Alert.alert('Oops', 'Unable to send your feedback right now.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}
      keyboardShouldPersistTaps="handled">
      <Text style={globalStyles.header}>Send Feedback</Text>

      <View style={globalStyles.section}>
        <View style={[globalStyles.backContainer, {marginTop: 16}]}>
          <AppleTouchFeedback
            onPress={() => navigate('Settings')}
            hapticStyle="impactMedium"
            style={{alignSelf: 'flex-start'}}>
            <MaterialIcons name="arrow-back" size={24} color={colors.button3} />
          </AppleTouchFeedback>
          <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
        </View>

        {/* Form Card */}
        <ScrollView style={[globalStyles.screen, globalStyles.container]}>
          <View
            style={[styles.formCard, {backgroundColor: theme.colors.surface}]}>
            {/* Subject */}
            <Text style={[styles.label, {color: colors.foreground}]}>
              Subject
            </Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              style={[styles.input, {color: theme.colors.foreground}]}
              placeholder="Subject"
              placeholderTextColor={theme.colors.muted}
            />

            {/* Name (optional) */}
            <Text style={[styles.label, {color: colors.foreground}]}>
              Name (optional)
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, {color: theme.colors.foreground}]}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
            />

            {/* Email (optional) */}
            <Text style={[styles.label, {color: colors.foreground}]}>
              Email (optional)
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={[styles.input, {color: colors.foreground}]}
              placeholder="you@domain.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
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
              placeholder="Share your idea, feedback, or a quick bug report…"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
            />

            {/* Include diagnostics toggle */}
            <View style={styles.toggleRow}>
              <View style={{flex: 1}}>
                <Text style={[styles.toggleTitle, {color: colors.foreground}]}>
                  Include diagnostics
                </Text>
                <Text style={[styles.toggleSub, {color: colors.foreground3}]}>
                  Device and app info helps us debug faster
                </Text>
              </View>
              <Switch
                value={includeDiagnostics}
                onValueChange={setIncludeDiagnostics}
                trackColor={{false: colors.muted, true: theme.colors.button1}}
                ios_backgroundColor={colors.muted}
              />
            </View>
          </View>

          {/* Primary Action */}
          <View style={styles.buttonRow}>
            <AppleTouchFeedback
              onPress={!disabled ? submit : () => {}}
              hapticStyle="impactMedium"
              style={[
                globalStyles.buttonPrimary,
                styles.primaryBtn,
                {opacity: disabled ? 0.5 : 1, marginTop: 22, marginBottom: 22},
              ]}>
              {sending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={globalStyles.buttonPrimaryText}>
                  Send Feedback
                </Text>
              )}
            </AppleTouchFeedback>
          </View>

          {/* Tip Banner */}
          <View
            style={[
              styles.tipCard,
              {
                backgroundColor: theme.colors.surface3,
                borderWidth: tokens.borderWidth.md,
                borderColor: theme.colors.surfaceBorder,
              },
            ]}>
            <View style={styles.tipIcon}>
              <MaterialIcons
                name="lightbulb-outline"
                size={16}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.tipText, {color: colors.foreground}]}>
              Thanks for helping improve StylHelpr — we read every message.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

//////////////////

// // apps/mobile/src/screens/FeedbackScreen.tsx
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
//   Switch,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DeviceInfo from 'react-native-device-info';
// import {API_BASE_URL} from '../config/api';

// export default function FeedbackScreen({navigate}: any) {
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
//       backgroundColor: theme.colors.surface3,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,

//       marginBottom: 10,
//     },
//     textarea: {
//       height: 140,
//     },
//     toggleRow: {
//       marginTop: 8,
//       paddingTop: 8,
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },
//     toggleTitle: {
//       fontSize: 15,
//       fontWeight: '600',
//     },
//     toggleSub: {
//       fontSize: 12,
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
//       backgroundColor: theme.colors.surface3,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
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
//   const [subject, setSubject] = useState('StyliQ Feedback');
//   const [message, setMessage] = useState('');
//   const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
//   const [sending, setSending] = useState(false);

//   const disabled = !message.trim() || sending;

//   const buildDiagnostics = async () => {
//     try {
//       const appVersion = DeviceInfo.getVersion();
//       const buildNumber = DeviceInfo.getBuildNumber();
//       const systemName = DeviceInfo.getSystemName();
//       const systemVersion = DeviceInfo.getSystemVersion();
//       const model = DeviceInfo.getModel();
//       const deviceId = DeviceInfo.getDeviceId();
//       return `\n\n---\nDiagnostics (auto-included):\nApp: ${appVersion} (Build ${buildNumber})\nDevice: ${model} (${deviceId})\nOS: ${systemName} ${systemVersion}`;
//     } catch {
//       return '\n\n---\nDiagnostics unavailable.';
//     }
//   };

//   const openMailComposer = async () => {
//     const diag = includeDiagnostics ? await buildDiagnostics() : '';
//     const to = 'feedback@styliq.app';
//     const mailSubject = encodeURIComponent(subject || 'StyliQ Feedback');
//     const intro =
//       (name ? `From: ${name}\n` : '') + (email ? `Email: ${email}\n` : '');
//     const body = encodeURIComponent(`${intro}${message}${diag}`);
//     const url = `mailto:${to}?subject=${mailSubject}&body=${body}`;
//     const canOpen = await Linking.canOpenURL(url);
//     if (canOpen) {
//       await Linking.openURL(url);
//       return true;
//     }
//     return false;
//   };

//   const submit = async () => {
//     try {
//       setSending(true);

//       // Try native mail composer first (Apple-style)
//       const launchedMail = await openMailComposer();
//       if (launchedMail) {
//         setMessage('');
//         setName('');
//         setEmail('');
//         Alert.alert('Thank you!', 'Your email draft is ready to send.');
//         return;
//       }

//       // Fallback to backend endpoint if no mail app available
//       const diag = includeDiagnostics ? await buildDiagnostics() : '';
//       const res = await fetch(`${API_BASE_URL}/feedback`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           name: name || undefined,
//           email: email || undefined,
//           subject: subject || 'StyliQ Feedback',
//           message,
//           diagnostics: includeDiagnostics ? diag : undefined,
//         }),
//       });
//       if (!res.ok) throw new Error('Failed');
//       setMessage('');
//       setName('');
//       setEmail('');
//       Alert.alert('Thanks!', 'Your feedback has been sent.');
//     } catch {
//       Alert.alert('Oops', 'Unable to send your feedback right now.');
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
//       <Text style={globalStyles.header}>Send Feedback</Text>

//       <View style={globalStyles.section}>
//         <View style={[globalStyles.backContainer, {marginTop: 16}]}>
//           <AppleTouchFeedback
//             onPress={() => navigate('Settings')}
//             hapticStyle="impactMedium"
//             style={{alignSelf: 'flex-start'}}>
//             <MaterialIcons name="arrow-back" size={24} color={colors.button3} />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         {/* Form Card */}
//         <ScrollView style={[globalStyles.screen, globalStyles.container]}>
//           <View
//             style={[styles.formCard, {backgroundColor: theme.colors.surface}]}>
//             {/* Subject */}
//             <Text style={[styles.label, {color: colors.foreground}]}>
//               Subject
//             </Text>
//             <TextInput
//               value={subject}
//               onChangeText={setSubject}
//               style={[
//                 styles.input,
//                 {
//                   color: theme.colors.foreground,
//                 },
//               ]}
//               placeholder="Subject"
//               placeholderTextColor={theme.colors.muted}
//             />

//             {/* Name (optional) */}
//             <Text style={[styles.label, {color: colors.foreground}]}>
//               Name (optional)
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
//               placeholder="Your name"
//               placeholderTextColor={colors.muted}
//             />

//             {/* Email (optional) */}
//             <Text style={[styles.label, {color: colors.foreground}]}>
//               Email (optional)
//             </Text>
//             <TextInput
//               value={email}
//               onChangeText={setEmail}
//               style={[
//                 styles.input,
//                 {
//                   color: colors.foreground,
//                 },
//               ]}
//               placeholder="you@domain.com"
//               placeholderTextColor={colors.muted}
//               keyboardType="email-address"
//               autoCapitalize="none"
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
//               placeholder="Share your idea, feedback, or a quick bug report…"
//               placeholderTextColor={colors.muted}
//               multiline
//               textAlignVertical="top"
//             />

//             {/* Include diagnostics toggle */}
//             <View style={styles.toggleRow}>
//               <View style={{flex: 1}}>
//                 <Text style={[styles.toggleTitle, {color: colors.foreground}]}>
//                   Include diagnostics
//                 </Text>
//                 <Text style={[styles.toggleSub, {color: colors.foreground3}]}>
//                   Device and app info helps us debug faster
//                 </Text>
//               </View>
//               <Switch
//                 value={includeDiagnostics}
//                 onValueChange={setIncludeDiagnostics}
//                 trackColor={{false: colors.muted, true: theme.colors.button1}}
//                 ios_backgroundColor={colors.muted}
//               />
//             </View>
//           </View>

//           {/* Primary Action */}
//           <View style={styles.buttonRow}>
//             <AppleTouchFeedback
//               onPress={!disabled ? submit : () => {}}
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
//                 <Text style={globalStyles.buttonPrimaryText}>
//                   Send Feedback
//                 </Text>
//               )}
//             </AppleTouchFeedback>
//           </View>

//           {/* Tip Banner */}
//           <View
//             style={[
//               styles.tipCard,
//               {
//                 backgroundColor: theme.colors.surface3,
//                 borderWidth: tokens.borderWidth.md,
//                 borderColor: theme.colors.surfaceBorder,
//               },
//             ]}>
//             <View style={styles.tipIcon}>
//               <MaterialIcons
//                 name="lightbulb-outline"
//                 size={16}
//                 color={colors.primary}
//               />
//             </View>
//             <Text style={[styles.tipText, {color: colors.foreground}]}>
//               Thanks for helping improve StylHelpr — we read every message.
//             </Text>
//           </View>
//         </ScrollView>
//       </View>
//     </ScrollView>
//   );
// }

///////////////////

// // apps/mobile/src/screens/FeedbackScreen.tsx
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
//   Switch,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../styles/tokens/tokens';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import DeviceInfo from 'react-native-device-info';
// import {API_BASE_URL} from '../config/api';

// export default function FeedbackScreen() {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const global = useGlobalStyles();

//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [subject, setSubject] = useState('StyliQ Feedback');
//   const [message, setMessage] = useState('');
//   const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
//   const [sending, setSending] = useState(false);

//   const disabled = !message.trim() || sending;

//   const buildDiagnostics = async () => {
//     try {
//       const appVersion = DeviceInfo.getVersion();
//       const buildNumber = DeviceInfo.getBuildNumber();
//       const systemName = DeviceInfo.getSystemName();
//       const systemVersion = DeviceInfo.getSystemVersion();
//       const model = DeviceInfo.getModel();
//       const deviceId = DeviceInfo.getDeviceId();
//       return `\n\n---\nDiagnostics (auto-included):\nApp: ${appVersion} (Build ${buildNumber})\nDevice: ${model} (${deviceId})\nOS: ${systemName} ${systemVersion}`;
//     } catch {
//       return '\n\n---\nDiagnostics unavailable.';
//     }
//   };

//   const openMailComposer = async () => {
//     const diag = includeDiagnostics ? await buildDiagnostics() : '';
//     const to = 'feedback@styliq.app';
//     const mailSubject = encodeURIComponent(subject || 'StyliQ Feedback');
//     const intro =
//       (name ? `From: ${name}\n` : '') + (email ? `Email: ${email}\n` : '');
//     const body = encodeURIComponent(`${intro}${message}${diag}`);
//     const url = `mailto:${to}?subject=${mailSubject}&body=${body}`;
//     const canOpen = await Linking.canOpenURL(url);
//     if (canOpen) {
//       await Linking.openURL(url);
//       return true;
//     }
//     return false;
//   };

//   const submit = async () => {
//     try {
//       setSending(true);

//       // Try native mail composer first (Apple-style)
//       const launchedMail = await openMailComposer();
//       if (launchedMail) {
//         setMessage('');
//         setName('');
//         setEmail('');
//         Alert.alert('Thank you!', 'Your email draft is ready to send.');
//         return;
//       }

//       // Fallback to backend endpoint if no mail app available
//       const diag = includeDiagnostics ? await buildDiagnostics() : '';
//       const res = await fetch(`${API_BASE_URL}/feedback`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           name: name || undefined,
//           email: email || undefined,
//           subject: subject || 'StyliQ Feedback',
//           message,
//           diagnostics: includeDiagnostics ? diag : undefined,
//         }),
//       });
//       if (!res.ok) throw new Error('Failed');
//       setMessage('');
//       setName('');
//       setEmail('');
//       Alert.alert('Thanks!', 'Your feedback has been sent.');
//     } catch {
//       Alert.alert('Oops', 'Unable to send your feedback right now.');
//     } finally {
//       setSending(false);
//     }
//   };

//   return (
//     <SafeAreaView style={[global.screen, {backgroundColor: colors.background}]}>
//       <KeyboardAvoidingView
//         style={{flex: 1}}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
//         <ScrollView
//           style={[global.container, {backgroundColor: colors.background}]}
//           contentContainerStyle={styles.content}
//           keyboardShouldPersistTaps="handled">
//           {/* Title */}
//           <Text style={[styles.title, {color: colors.primary}]}>
//             Send Feedback
//           </Text>

//           {/* Form Card */}
//           <View
//             style={[styles.formCard, {backgroundColor: 'rgba(20,20,20,1)'}]}>
//             {/* Subject */}
//             <Text style={[styles.label, {color: colors.foreground}]}>
//               Subject
//             </Text>
//             <TextInput
//               value={subject}
//               onChangeText={setSubject}
//               style={[
//                 styles.input,
//                 {
//                   color: colors.foreground,
//                   borderColor: 'rgba(200,200,200,0.3)',
//                 },
//               ]}
//               placeholder="Subject"
//               placeholderTextColor={colors.muted}
//             />

//             {/* Name (optional) */}
//             <Text style={[styles.label, {color: colors.foreground}]}>
//               Name (optional)
//             </Text>
//             <TextInput
//               value={name}
//               onChangeText={setName}
//               style={[
//                 styles.input,
//                 {
//                   color: colors.foreground,
//                   borderColor: 'rgba(200,200,200,0.3)',
//                 },
//               ]}
//               placeholder="Your name"
//               placeholderTextColor={colors.muted}
//             />

//             {/* Email (optional) */}
//             <Text style={[styles.label, {color: colors.foreground}]}>
//               Email (optional)
//             </Text>
//             <TextInput
//               value={email}
//               onChangeText={setEmail}
//               style={[
//                 styles.input,
//                 {
//                   color: colors.foreground,
//                   borderColor: 'rgba(200,200,200,0.3)',
//                 },
//               ]}
//               placeholder="you@domain.com"
//               placeholderTextColor={colors.muted}
//               keyboardType="email-address"
//               autoCapitalize="none"
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
//                   color: colors.foreground,
//                   borderColor: 'rgba(200,200,200,0.3)',
//                 },
//               ]}
//               placeholder="Share your idea, feedback, or a quick bug report…"
//               placeholderTextColor={colors.muted}
//               multiline
//               textAlignVertical="top"
//             />

//             {/* Include diagnostics toggle */}
//             <View style={styles.toggleRow}>
//               <View style={{flex: 1}}>
//                 <Text style={[styles.toggleTitle, {color: colors.foreground}]}>
//                   Include diagnostics
//                 </Text>
//                 <Text style={[styles.toggleSub, {color: colors.foreground3}]}>
//                   Device and app info helps us debug faster
//                 </Text>
//               </View>
//               <Switch
//                 value={includeDiagnostics}
//                 onValueChange={setIncludeDiagnostics}
//                 trackColor={{false: colors.muted, true: theme.colors.button1}}
//                 ios_backgroundColor={colors.muted}
//               />
//             </View>
//           </View>

//           {/* Primary Action */}
//           <View style={styles.buttonRow}>
//             <AppleTouchFeedback
//               onPress={!disabled ? submit : () => {}}
//               hapticStyle="impactMedium"
//               style={[
//                 global.buttonPrimary,
//                 styles.primaryBtn,
//                 {opacity: disabled ? 0.5 : 1},
//               ]}>
//               {sending ? (
//                 <ActivityIndicator color={colors.background} />
//               ) : (
//                 <Text style={global.buttonPrimaryText}>Send Feedback</Text>
//               )}
//             </AppleTouchFeedback>
//           </View>

//           {/* Tip Banner */}
//           <View
//             style={[
//               styles.tipCard,
//               {
//                 backgroundColor: 'rgba(20,20,20,1)',
//                 borderColor: 'rgba(200,200,200,0.2)',
//               },
//             ]}>
//             <View style={styles.tipIcon}>
//               <MaterialIcons
//                 name="lightbulb-outline"
//                 size={16}
//                 color={colors.primary}
//               />
//             </View>
//             <Text style={[styles.tipText, {color: colors.foreground}]}>
//               Thanks for helping improve StylHelpr — we read every message.
//             </Text>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   content: {padding: 24, paddingBottom: 60, gap: 24},
//   title: {
//     fontSize: 28,
//     fontWeight: '700',
//     textAlign: 'center',
//     marginBottom: 4,
//   },
//   formCard: {
//     borderRadius: 16,
//     padding: 18,
//     shadowColor: '#000',
//     shadowOpacity: 0.08,
//     shadowRadius: 12,
//     shadowOffset: {width: 0, height: 4},
//   },
//   label: {
//     fontSize: 15,
//     fontWeight: '600',
//     marginTop: 12,
//     marginBottom: 6,
//   },
//   input: {
//     borderWidth: 1,
//     borderRadius: 10,
//     padding: 14,
//     fontSize: 16,
//     backgroundColor: 'rgba(250,250,250,0.05)',
//     marginBottom: 10,
//   },
//   textarea: {
//     height: 140,
//   },
//   toggleRow: {
//     marginTop: 8,
//     paddingTop: 8,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   toggleTitle: {
//     fontSize: 15,
//     fontWeight: '600',
//   },
//   toggleSub: {
//     fontSize: 12,
//   },
//   buttonRow: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },
//   primaryBtn: {
//     width: 220,
//     borderRadius: 50,
//     paddingHorizontal: 22,
//   },
//   tipCard: {
//     borderRadius: 12,
//     padding: 14,
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1,
//     gap: 8,
//   },
//   tipIcon: {
//     width: 24,
//     height: 24,
//     borderRadius: 6,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'rgba(250,250,250,0.06)',
//   },
//   tipText: {
//     fontSize: 13,
//     lineHeight: 18,
//     flexShrink: 1,
//   },
// });
