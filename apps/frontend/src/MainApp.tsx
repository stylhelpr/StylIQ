// import React, {useEffect, useState, useRef} from 'react';
// import {View, StyleSheet, PermissionsAndroid, Platform} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceBus';
// import './utils/AssistantSessionManager'; // 🧠 Core voice session manager
// import {startWakeListener} from './utils/WakeWordManager'; // 🎧 Wake phrase handler

// // 🌐 Global TTS reference (used by TTS generator)
// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref;

//   // 🗣 Overlay + assistant state
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const [assistantState, setAssistantState] = useState<
//     'idle' | 'listening' | 'thinking' | 'speaking'
//   >('idle');

//   // 🎙️ Listen for overlay updates from VoiceBus
//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => VoiceBus.off('status', handle);
//   }, []);

//   // 🧠 Track assistant lifecycle states
//   useEffect(() => {
//     VoiceBus.on('assistant:stateChange', setAssistantState);
//     return () => VoiceBus.off('assistant:stateChange', setAssistantState);
//   }, []);

//   // 🔊 Request audio permission and start wake listener once
//   useEffect(() => {
//     (async () => {
//       if (Platform.OS === 'android') {
//         await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         );
//       }
//       startWakeListener(); // Passive wake phrase “Hey Charlie”
//     })();
//   }, []);

//   return (
//     <View style={styles.root}>
//       {/* 🎧 Voice overlay (real-time transcript + visual feedback) */}
//       <VoiceOverlay
//         isListening={isRecording}
//         partialText={speech}
//         assistantState={assistantState}
//         pointerEvents="none"
//       />

//       {/* 🌐 App navigation */}
//       <RootNavigator />

//       {/* 🔇 Hidden WebView for in-app speech synthesis (TTS) */}
//       <View pointerEvents="none" style={styles.ttsContainer}>
//         <WebView
//           ref={ref}
//           originWhitelist={['*']}
//           allowsInlineMediaPlayback
//           mediaPlaybackRequiresUserAction={false}
//           javaScriptEnabled
//           source={{html: '<html><body></body></html>'}}
//           style={styles.hiddenWebView}
//         />
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   root: {flex: 1},
//   ttsContainer: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: -9999,
//   },
//   hiddenWebView: {width: 1, height: 1, opacity: 0},
// });

// export default MainApp;

////////////////////////

// src/MainApp.tsx
// -----------------------------------------------------------------------------
// 🎤 MainApp — Global entrypoint
// -----------------------------------------------------------------------------
// • Hosts RootNavigator and FloatingMicButton
// • Manages voice overlay + WebView TTS renderer
// • Ensures all voice sessions stop cleanly on navigation
// -----------------------------------------------------------------------------

import React, {useState, useRef, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {WebView} from 'react-native-webview';
import RootNavigator from './navigation/RootNavigator';
import FloatingMicButton from './components/FloatingMicButton';
import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
import {VoiceBus} from './utils/VoiceBus';
import {VoiceTarget} from './utils/voiceTarget';

// ✅ Create a global proxy for navigation
export let globalNavigate = (_screen: string, _params?: any) => {
  console.warn('⚠️ globalNavigate called before RootNavigator initialized');
};

const MainApp = () => {
  const ref = useRef<WebView>(null);
  const [speech, setSpeech] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // 🧠 Listen for voice overlay status updates
  useEffect(() => {
    const handle = ({speech, isRecording}: any) => {
      setSpeech(speech);
      setIsRecording(isRecording);
    };
    VoiceBus.on('status', handle);
    return () => VoiceBus.off('status', handle);
  }, []);

  // 🧭 dynamically inject navigate from RootNavigator
  const setGlobalNavigate = (navFn: any) => {
    globalNavigate = (screen: string, params?: any) => {
      // 🛑 Stop any active listening or stuck overlay before navigation
      VoiceBus.emit('stopListening');
      VoiceTarget.clear();

      // slight delay ensures the voice overlay unmounts before switching
      setTimeout(() => {
        navFn(screen, params);
      }, 80);
    };
  };

  return (
    <View style={styles.root}>
      {/* 🎧 Global overlay for active speech recognition */}
      <VoiceOverlay
        isListening={isRecording}
        partialText={speech}
        pointerEvents="none"
      />

      {/* 🔹 Root app navigation (registers globalNavigate callback) */}
      <RootNavigator registerNavigate={setGlobalNavigate} />

      {/* 🔹 Floating voice mic, usable across all screens */}
      <FloatingMicButton navigate={globalNavigate} />

      {/* 🔹 Hidden WebView used for TTS playback buffer */}
      <View pointerEvents="none" style={styles.ttsContainer}>
        <WebView
          ref={ref}
          originWhitelist={['*']}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          source={{html: '<html><body></body></html>'}}
          style={styles.hiddenWebView}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  ttsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -9999,
  },
  hiddenWebView: {width: 1, height: 1, opacity: 0},
});

export default MainApp;

///////////////////////////////

// import RootNavigator from './navigation/RootNavigator';
// import FloatingMicButton from './components/FloatingMicButton';
// import React, {useState, useRef, useEffect} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceBus';

// // ✅ Create a global proxy for navigation
// export let globalNavigate = (_screen: string, _params?: any) => {
//   console.warn('⚠️ globalNavigate called before RootNavigator initialized');
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => VoiceBus.off('status', handle);
//   }, []);

//   // 🧭 dynamically inject navigate from RootNavigator
//   const setGlobalNavigate = (navFn: any) => {
//     globalNavigate = navFn;
//   };

//   return (
//     <View style={styles.root}>
//       <VoiceOverlay
//         isListening={isRecording}
//         partialText={speech}
//         pointerEvents="none"
//       />

//       {/* 🔹 Pass down callback so RootNavigator can attach navigate */}
//       <RootNavigator registerNavigate={setGlobalNavigate} />

//       {/* 🔹 Floating mic button now uses working navigate */}
//       <FloatingMicButton navigate={globalNavigate} />

//       <View pointerEvents="none" style={styles.ttsContainer}>
//         <WebView
//           ref={ref}
//           originWhitelist={['*']}
//           allowsInlineMediaPlayback
//           mediaPlaybackRequiresUserAction={false}
//           javaScriptEnabled
//           source={{html: '<html><body></body></html>'}}
//           style={styles.hiddenWebView}
//         />
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   root: {flex: 1},
//   ttsContainer: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: -9999,
//   },
//   hiddenWebView: {width: 1, height: 1, opacity: 0},
// });

// export default MainApp;

////////////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceBus';

// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref;

//   // 🔄 passive overlay state
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => {
//       VoiceBus.off('status', handle);
//     };
//   }, []);

//   return (
//     <View style={styles.root}>
//       <VoiceOverlay
//         isListening={isRecording}
//         partialText={speech}
//         pointerEvents="none"
//       />
//       <RootNavigator />
//       <View pointerEvents="none" style={styles.ttsContainer}>
//         <WebView
//           ref={ref}
//           originWhitelist={['*']}
//           allowsInlineMediaPlayback
//           mediaPlaybackRequiresUserAction={false}
//           javaScriptEnabled
//           source={{html: '<html><body></body></html>'}}
//           style={styles.hiddenWebView}
//         />
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   root: {flex: 1},
//   ttsContainer: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: -9999,
//   },
//   hiddenWebView: {width: 1, height: 1, opacity: 0},
// });

// export default MainApp;

/////////////////////////

// import React, {useRef} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';

// // 🔊 Shared global reference
// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref;

//   return (
//     <View style={styles.root}>
//       {/* App content (normal layout) */}
//       <RootNavigator />

//       {/* ✅ Invisible persistent TTS WebView — completely detached from layout */}
//       <View pointerEvents="none" style={styles.ttsContainer}>
//         <WebView
//           ref={ref}
//           originWhitelist={['*']}
//           allowsInlineMediaPlayback
//           mediaPlaybackRequiresUserAction={false}
//           javaScriptEnabled
//           source={{html: '<html><body></body></html>'}}
//           style={styles.hiddenWebView}
//         />
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   root: {flex: 1},
//   ttsContainer: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: -9999, // push far behind everything
//   },
//   hiddenWebView: {
//     width: 1,
//     height: 1,
//     opacity: 0,
//   },
// });

// export default MainApp;

/////////////////////

// import React from 'react';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import RootNavigator from './navigation/RootNavigator';

// const MainApp = () => <RootNavigator />;

// export default MainApp;
