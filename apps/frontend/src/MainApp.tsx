import WeatherBus from './utils/WeatherBus';
import React, {useState, useRef, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {WebView} from 'react-native-webview';
import RootNavigator from './navigation/RootNavigator';
import FloatingMicButton from './components/FloatingMicButton';
import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
import {VoiceBus} from './utils/VoiceUtils/VoiceBus';
import {VoiceTarget} from './utils/VoiceUtils/voiceTarget';
import {initInstantTts} from './utils/VoiceUtils/instantTts';
import WeatherPromptOverlay from './components/WeatherPromptOverlay/WeatherPromptOverlay';
import {syncNativeCalendarToBackend} from './utils/calendarSync';
import WeatherOverlay from './components/WeatherOverlay/WeatherOverlay';
import LocationOverlay from './components/LocationOverlay/LocationOverlay';
import {NativeModules, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
const {AudioSessionManager} = NativeModules;

// 🔊 Export global WebView ref so other files can inject JS speech
export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
  current: null,
};

// ✅ Create a global proxy for navigation
export let globalNavigate = (_screen: string, _params?: any) => {
  console.warn('⚠️ globalNavigate called before RootNavigator initialized');
};

const MainApp = () => {
  const ref = useRef<WebView>(null);
  globalTtsRef.current = ref; // ✅ assign once

  const [activeScreen, setActiveScreen] = useState('Home');

  const [speech, setSpeech] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // 🗣️ First: Register TTS lifecycle handlers BEFORE anything else
  useEffect(() => {
    const handleTtsStart = () => {
      setIsRecording(false);
      VoiceBus.emit('stopListening');
      console.log('🛑 TTS started → stopping mic');
    };
    const handleTtsFinish = () => {
      console.log('✅ TTS finished → resuming mic');
      VoiceBus.emit('startListening');
    };
    VoiceBus.on('tts-start', handleTtsStart);
    VoiceBus.on('tts-finish', handleTtsFinish);
    return () => {
      VoiceBus.off('tts-start', handleTtsStart);
      VoiceBus.off('tts-finish', handleTtsFinish);
    };
  }, []);

  // 🔊 Initialize TTS once
  useEffect(() => {
    initInstantTts(); // preload Siri / Google voice
  }, []);

  useEffect(() => {
    if (Platform.OS === 'ios' && AudioSessionManager?.configure) {
      AudioSessionManager.configure()
        .then(() =>
          console.log('🔊 iOS audio session configured for playback+record'),
        )
        .catch((err: any) => console.warn('AudioSession config error', err));
    }
  }, []);

  // 🗓️ Sync native iOS calendar on startup
  useEffect(() => {
    syncNativeCalendarToBackend();
  }, []);

  // 🔁 Sync overlay with recognition
  useEffect(() => {
    const handle = ({speech, isRecording}: any) => {
      setSpeech(speech);
      setIsRecording(isRecording);
    };
    VoiceBus.on('status', handle);
    return () => VoiceBus.off('status', handle);
  }, []);

  // 🗣️ Sync overlay + recording state with TTS events
  useEffect(() => {
    const handleTtsStart = () => {
      setIsRecording(false); // stop listening while TTS speaks
    };
    const handleTtsFinish = () => {
      setIsRecording(false); // reset overlay after speech
    };

    VoiceBus.on('tts-start', handleTtsStart);
    VoiceBus.on('tts-finish', handleTtsFinish);

    return () => {
      VoiceBus.off('tts-start', handleTtsStart);
      VoiceBus.off('tts-finish', handleTtsFinish);
    };
  }, []);

  // 🌤️ Weather overlay event binding
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherVisible, setWeatherVisible] = useState(false);

  useEffect(() => {
    const handleWeather = (payload: any) => {
      setWeatherData(payload);
      setWeatherVisible(true);
    };
    VoiceBus.on('weather', handleWeather);
    return () => VoiceBus.off('weather', handleWeather);
  }, []);

  // 🧭 Global navigation proxy
  const setGlobalNavigate = (navFn: any) => {
    globalNavigate = (screen: string, params?: any) => {
      VoiceBus.emit('stopListening');
      VoiceTarget.clear();
      setTimeout(() => navFn(screen, params), 80);
    };
  };

  return (
    <View style={styles.root}>
      <VoiceOverlay isListening={isRecording} partialText={speech} />
      <RootNavigator
        registerNavigate={setGlobalNavigate}
        onScreenChange={setActiveScreen}
      />
      <WeatherOverlay />
      <LocationOverlay />
      {activeScreen !== 'VideoFeedScreen' && activeScreen !== 'WebBrowser' && activeScreen !== 'ImageCarouselScreen' && (
        <FloatingMicButton navigate={globalNavigate} />
      )}
      <WeatherPromptOverlay
        visible={weatherVisible}
        city={weatherData?.city || 'Los Angeles'}
        temperature={weatherData?.temperature || 0}
        condition={weatherData?.condition || 'Clear skies'}
        onHide={() => setWeatherVisible(false)}
      />
      {/* Hidden WebView used for GPT-style TTS playback */}
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

/////////////////

// import WeatherBus from './utils/WeatherBus';
// import React, {useState, useRef, useEffect} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import FloatingMicButton from './components/FloatingMicButton';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceUtils/VoiceBus';
// import {VoiceTarget} from './utils/VoiceUtils/voiceTarget';
// import {initInstantTts, instantSpeak} from './utils/VoiceUtils/instantTts';
// import WeatherPromptOverlay from './components/WeatherPromptOverlay/WeatherPromptOverlay';
// import {syncNativeCalendarToBackend} from './utils/calendarSync';
// import WeatherOverlay from './components/WeatherOverlay/WeatherOverlay';
// import {NativeModules, Platform} from 'react-native';
// const {AudioSessionManager} = NativeModules;

// // 🔊 Export global WebView ref so other files can inject JS speech
// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// // ✅ Create a global proxy for navigation
// export let globalNavigate = (_screen: string, _params?: any) => {
//   console.warn('⚠️ globalNavigate called before RootNavigator initialized');
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref; // ✅ assign once

//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   // 🗣️ First: Register TTS lifecycle handlers BEFORE anything else
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false);
//       VoiceBus.emit('stopListening');
//       console.log('🛑 TTS started → stopping mic');
//     };
//     const handleTtsFinish = () => {
//       console.log('✅ TTS finished → resuming mic');
//       VoiceBus.emit('startListening');
//     };
//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);
//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🔊 Initialize TTS once
//   useEffect(() => {
//     initInstantTts(); // preload Siri / Google voice
//     instantSpeak('Ready.'); // optional startup cue
//   }, []);

//   useEffect(() => {
//     if (Platform.OS === 'ios' && AudioSessionManager?.configure) {
//       AudioSessionManager.configure()
//         .then(() =>
//           console.log('🔊 iOS audio session configured for playback+record'),
//         )
//         .catch((err: any) => console.warn('AudioSession config error', err));
//     }
//   }, []);

//   // 🗓️ Sync native iOS calendar on startup
//   useEffect(() => {
//     syncNativeCalendarToBackend();
//   }, []);

//   // 🔁 Sync overlay with recognition
//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => VoiceBus.off('status', handle);
//   }, []);

//   // 🗣️ Sync overlay + recording state with TTS events
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false); // stop listening while TTS speaks
//     };
//     const handleTtsFinish = () => {
//       setIsRecording(false); // reset overlay after speech
//     };

//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);

//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🌤️ Weather overlay event binding
//   const [weatherData, setWeatherData] = useState<any>(null);
//   const [weatherVisible, setWeatherVisible] = useState(false);

//   useEffect(() => {
//     const handleWeather = (payload: any) => {
//       setWeatherData(payload);
//       setWeatherVisible(true);
//     };
//     VoiceBus.on('weather', handleWeather);
//     return () => VoiceBus.off('weather', handleWeather);
//   }, []);

//   // 🧭 Global navigation proxy
//   const setGlobalNavigate = (navFn: any) => {
//     globalNavigate = (screen: string, params?: any) => {
//       VoiceBus.emit('stopListening');
//       VoiceTarget.clear();
//       setTimeout(() => navFn(screen, params), 80);
//     };
//   };
//   console.log('🌡️ Weather overlay data:', weatherData);

//   return (
//     <View style={styles.root}>
//       <VoiceOverlay isListening={isRecording} partialText={speech} />
//       <RootNavigator registerNavigate={setGlobalNavigate} />
//       <WeatherOverlay />
//       <FloatingMicButton navigate={globalNavigate} />
//       <WeatherPromptOverlay
//         visible={weatherVisible}
//         city={weatherData?.city || 'Los Angeles'}
//         temperature={weatherData?.temperature || 0}
//         condition={weatherData?.condition || 'Clear skies'}
//         onHide={() => setWeatherVisible(false)}
//       />
//       {/* Hidden WebView used for GPT-style TTS playback */}
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

///////////////

// import WeatherBus from './utils/WeatherBus';
// import React, {useState, useRef, useEffect} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import FloatingMicButton from './components/FloatingMicButton';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceUtils/VoiceBus';
// import {VoiceTarget} from './utils/VoiceUtils/voiceTarget';
// import {initInstantTts, instantSpeak} from './utils/VoiceUtils/instantTts';
// import WeatherPromptOverlay from './components/WeatherPromptOverlay/WeatherPromptOverlay';
// import {syncNativeCalendarToBackend} from './utils/calendarSync';
// import WeatherOverlay from './components/WeatherOverlay/WeatherOverlay';

// // 🔊 Export global WebView ref so other files can inject JS speech
// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// // ✅ Create a global proxy for navigation
// export let globalNavigate = (_screen: string, _params?: any) => {
//   console.warn('⚠️ globalNavigate called before RootNavigator initialized');
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref; // ✅ assign once

//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   // 🗣️ First: Register TTS lifecycle handlers BEFORE anything else
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false);
//       VoiceBus.emit('stopListening');
//       console.log('🛑 TTS started → stopping mic');
//     };
//     const handleTtsFinish = () => {
//       console.log('✅ TTS finished → resuming mic');
//       VoiceBus.emit('startListening');
//     };
//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);
//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🔊 Initialize TTS once
//   useEffect(() => {
//     initInstantTts(); // preload Siri / Google voice
//     instantSpeak('Ready.'); // optional startup cue
//   }, []);

//   // 🗓️ Sync native iOS calendar on startup
//   useEffect(() => {
//     syncNativeCalendarToBackend();
//   }, []);

//   // 🔁 Sync overlay with recognition
//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => VoiceBus.off('status', handle);
//   }, []);

//   // 🗣️ Sync overlay + recording state with TTS events
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false); // stop listening while TTS speaks
//     };
//     const handleTtsFinish = () => {
//       setIsRecording(false); // reset overlay after speech
//     };

//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);

//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🌤️ Weather overlay event binding
//   const [weatherData, setWeatherData] = useState<any>(null);
//   const [weatherVisible, setWeatherVisible] = useState(false);

//   useEffect(() => {
//     const handleWeather = (payload: any) => {
//       setWeatherData(payload);
//       setWeatherVisible(true);
//     };
//     VoiceBus.on('weather', handleWeather);
//     return () => VoiceBus.off('weather', handleWeather);
//   }, []);

//   // 🧭 Global navigation proxy
//   const setGlobalNavigate = (navFn: any) => {
//     globalNavigate = (screen: string, params?: any) => {
//       VoiceBus.emit('stopListening');
//       VoiceTarget.clear();
//       setTimeout(() => navFn(screen, params), 80);
//     };
//   };
//   console.log('🌡️ Weather overlay data:', weatherData);

//   return (
//     <View style={styles.root}>
//       <VoiceOverlay isListening={isRecording} partialText={speech} />
//       <RootNavigator registerNavigate={setGlobalNavigate} />
//       <WeatherOverlay />
//       <FloatingMicButton navigate={globalNavigate} />
//       <WeatherPromptOverlay
//         visible={weatherVisible}
//         city={weatherData?.city || 'Los Angeles'}
//         temperature={weatherData?.temperature || 0}
//         condition={weatherData?.condition || 'Clear skies'}
//         onHide={() => setWeatherVisible(false)}
//       />
//       {/* Hidden WebView used for GPT-style TTS playback */}
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

//////////////////////

// import WeatherBus from './utils/WeatherBus';
// import React, {useState, useRef, useEffect} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import FloatingMicButton from './components/FloatingMicButton';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceUtils/VoiceBus';
// import {VoiceTarget} from './utils/VoiceUtils/voiceTarget';
// import {initInstantTts, instantSpeak} from './utils/VoiceUtils/instantTts';
// import WeatherPromptOverlay from './components/WeatherPromptOverlay/WeatherPromptOverlay';
// import {syncNativeCalendarToBackend} from './utils/calendarSync';
// import WeatherOverlay from './components/WeatherOverlay/WeatherOverlay';

// // 🔊 Export global WebView ref so other files can inject JS speech
// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// // ✅ Create a global proxy for navigation
// export let globalNavigate = (_screen: string, _params?: any) => {
//   console.warn('⚠️ globalNavigate called before RootNavigator initialized');
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref; // ✅ assign once

//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   // 🗣️ First: Register TTS lifecycle handlers BEFORE anything else
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false);
//       VoiceBus.emit('stopListening');
//       console.log('🛑 TTS started → stopping mic');
//     };
//     const handleTtsFinish = () => {
//       console.log('✅ TTS finished → resuming mic');
//       VoiceBus.emit('startListening');
//     };
//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);
//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🔊 Initialize TTS once
//   useEffect(() => {
//     initInstantTts(); // preload Siri / Google voice
//     instantSpeak('Ready.'); // optional startup cue
//   }, []);

//   // 🗓️ Sync native iOS calendar on startup
//   useEffect(() => {
//     syncNativeCalendarToBackend();
//   }, []);

//   // 🔁 Sync overlay with recognition
//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => VoiceBus.off('status', handle);
//   }, []);

//   // 🗣️ Sync overlay + recording state with TTS events
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false); // stop listening while TTS speaks
//     };
//     const handleTtsFinish = () => {
//       setIsRecording(false); // reset overlay after speech
//     };

//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);

//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🌤️ Weather overlay event binding
//   const [weatherData, setWeatherData] = useState<any>(null);
//   const [weatherVisible, setWeatherVisible] = useState(false);

//   useEffect(() => {
//     const handleWeather = (payload: any) => {
//       setWeatherData(payload);
//       setWeatherVisible(true);
//     };
//     VoiceBus.on('weather', handleWeather);
//     return () => VoiceBus.off('weather', handleWeather);
//   }, []);

//   // 🧭 Global navigation proxy
//   const setGlobalNavigate = (navFn: any) => {
//     globalNavigate = (screen: string, params?: any) => {
//       VoiceBus.emit('stopListening');
//       VoiceTarget.clear();
//       setTimeout(() => navFn(screen, params), 80);
//     };
//   };
//   console.log('🌡️ Weather overlay data:', weatherData);

//   return (
//     <View style={styles.root}>
//       <VoiceOverlay isListening={isRecording} partialText={speech} />
//       <RootNavigator registerNavigate={setGlobalNavigate} />
//       <WeatherOverlay />
//       <FloatingMicButton navigate={globalNavigate} />
//       <WeatherPromptOverlay
//         visible={weatherVisible}
//         city={weatherData?.city || 'Los Angeles'}
//         temperature={weatherData?.temperature || 0}
//         condition={weatherData?.condition || 'Clear skies'}
//         onHide={() => setWeatherVisible(false)}
//       />
//       {/* Hidden WebView used for GPT-style TTS playback */}
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

// import WeatherBus from './utils/WeatherBus';
// import React, {useState, useRef, useEffect} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import FloatingMicButton from './components/FloatingMicButton';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceUtils/VoiceBus';
// import {VoiceTarget} from './utils/VoiceUtils/voiceTarget';
// import {initInstantTts, instantSpeak} from './utils/VoiceUtils/instantTts';
// import WeatherPromptOverlay from './components/WeatherPromptOverlay/WeatherPromptOverlay';
// import {useUUID} from './context/UUIDContext';
// import {syncNativeCalendarToBackend} from './utils/calendarSync';
// import WeatherOverlay from './components/WeatherOverlay/WeatherOverlay';

// // 🔊 Export global WebView ref so other files can inject JS speech
// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// // ✅ Create a global proxy for navigation
// export let globalNavigate = (_screen: string, _params?: any) => {
//   console.warn('⚠️ globalNavigate called before RootNavigator initialized');
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref; // ✅ assign once
//   const userId = useUUID();

//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   // 🗣️ First: Register TTS lifecycle handlers BEFORE anything else
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false);
//       VoiceBus.emit('stopListening');
//       console.log('🛑 TTS started → stopping mic');
//     };
//     const handleTtsFinish = () => {
//       console.log('✅ TTS finished → resuming mic');
//       VoiceBus.emit('startListening');
//     };
//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);
//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🔊 Initialize TTS once
//   useEffect(() => {
//     initInstantTts(); // preload Siri / Google voice
//     instantSpeak('Ready.'); // optional startup cue
//   }, []);

//   // 🗓️ Sync native iOS calendar on startup (once userId is ready)
//   useEffect(() => {
//     if (userId) {
//       syncNativeCalendarToBackend(userId);
//     }
//   }, [userId]);

//   // 🔁 Sync overlay with recognition
//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => VoiceBus.off('status', handle);
//   }, []);

//   // 🗣️ Sync overlay + recording state with TTS events
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false); // stop listening while TTS speaks
//     };
//     const handleTtsFinish = () => {
//       setIsRecording(false); // reset overlay after speech
//     };

//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);

//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🌤️ Weather overlay event binding
//   const [weatherData, setWeatherData] = useState<any>(null);
//   const [weatherVisible, setWeatherVisible] = useState(false);

//   useEffect(() => {
//     const handleWeather = (payload: any) => {
//       setWeatherData(payload);
//       setWeatherVisible(true);
//     };
//     VoiceBus.on('weather', handleWeather);
//     return () => VoiceBus.off('weather', handleWeather);
//   }, []);

//   // 🧭 Global navigation proxy
//   const setGlobalNavigate = (navFn: any) => {
//     globalNavigate = (screen: string, params?: any) => {
//       VoiceBus.emit('stopListening');
//       VoiceTarget.clear();
//       setTimeout(() => navFn(screen, params), 80);
//     };
//   };
//   console.log('🌡️ Weather overlay data:', weatherData);

//   return (
//     <View style={styles.root}>
//       <VoiceOverlay isListening={isRecording} partialText={speech} />
//       <RootNavigator registerNavigate={setGlobalNavigate} />
//       <WeatherOverlay />
//       <FloatingMicButton navigate={globalNavigate} />
//       <WeatherPromptOverlay
//         visible={weatherVisible}
//         city={weatherData?.city || 'Los Angeles'}
//         temperature={weatherData?.temperature || 0}
//         condition={weatherData?.condition || 'Clear skies'}
//         onHide={() => setWeatherVisible(false)}
//       />
//       {/* Hidden WebView used for GPT-style TTS playback */}
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

// src/MainApp.tsx
// -----------------------------------------------------------------------------
// 🎤 MainApp — Global entrypoint
// -----------------------------------------------------------------------------
// • Hosts RootNavigator and FloatingMicButton
// • Manages voice overlay + WebView TTS renderer
// • Ensures all voice sessions stop cleanly on navigation
// -----------------------------------------------------------------------------

// import WeatherBus from 'utils/WeatherBus';
// import React, {useState, useRef, useEffect} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import FloatingMicButton from './components/FloatingMicButton';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceUtils/VoiceBus';
// import {VoiceTarget} from './utils/VoiceUtils/voiceTarget';
// import {initInstantTts, instantSpeak} from './utils/VoiceUtils/instantTts';
// import WeatherPromptOverlay from './components/WeatherPromptOverlay/WeatherPromptOverlay';
// import {syncNativeCalendarToBackend} from './utils/calendarSync';
// import WeatherOverlay from './components/WeatherOverlay/WeatherOverlay';

// // 🔊 Export global WebView ref so other files can inject JS speech
// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// // ✅ Create a global proxy for navigation
// export let globalNavigate = (_screen: string, _params?: any) => {
//   console.warn('⚠️ globalNavigate called before RootNavigator initialized');
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref; // ✅ assign once

//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   // 🗣️ First: Register TTS lifecycle handlers BEFORE anything else
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false);
//       VoiceBus.emit('stopListening');
//       console.log('🛑 TTS started → stopping mic');
//     };
//     const handleTtsFinish = () => {
//       console.log('✅ TTS finished → resuming mic');
//       VoiceBus.emit('startListening');
//     };
//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);
//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🔊 Initialize TTS once
//   useEffect(() => {
//     initInstantTts(); // preload Siri / Google voice
//     instantSpeak('Ready.'); // optional startup cue
//   }, []);

//   // 🗓️ Sync native iOS calendar on startup
//   useEffect(() => {
//     syncNativeCalendarToBackend();
//   }, []);

//   // 🔁 Sync overlay with recognition
//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => VoiceBus.off('status', handle);
//   }, []);

//   // 🗣️ Sync overlay + recording state with TTS events
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false); // stop listening while TTS speaks
//     };
//     const handleTtsFinish = () => {
//       setIsRecording(false); // reset overlay after speech
//     };

//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);

//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🌤️ Weather overlay event binding
//   const [weatherData, setWeatherData] = useState<any>(null);
//   const [weatherVisible, setWeatherVisible] = useState(false);

//   useEffect(() => {
//     const handleWeather = (payload: any) => {
//       setWeatherData(payload);
//       setWeatherVisible(true);
//     };
//     VoiceBus.on('weather', handleWeather);
//     return () => VoiceBus.off('weather', handleWeather);
//   }, []);

//   // 🧭 Global navigation proxy
//   const setGlobalNavigate = (navFn: any) => {
//     globalNavigate = (screen: string, params?: any) => {
//       VoiceBus.emit('stopListening');
//       VoiceTarget.clear();
//       setTimeout(() => navFn(screen, params), 80);
//     };
//   };
//   console.log('🌡️ Weather overlay data:', weatherData);

//   return (
//     <View style={styles.root}>
//       <VoiceOverlay isListening={isRecording} partialText={speech} />
//       <RootNavigator registerNavigate={setGlobalNavigate} />
//       <WeatherOverlay />
//       <FloatingMicButton navigate={globalNavigate} />
//       <WeatherPromptOverlay
//         visible={weatherVisible}
//         city={weatherData?.city || 'Los Angeles'}
//         temperature={weatherData?.temperature || 0}
//         condition={weatherData?.condition || 'Clear skies'}
//         onHide={() => setWeatherVisible(false)}
//       />
//       {/* Hidden WebView used for GPT-style TTS playback */}
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

//////////////////////////

// // src/MainApp.tsx
// // -----------------------------------------------------------------------------
// // 🎤 MainApp — Global entrypoint
// // -----------------------------------------------------------------------------
// // • Hosts RootNavigator and FloatingMicButton
// // • Manages voice overlay + WebView TTS renderer
// // • Ensures all voice sessions stop cleanly on navigation
// // -----------------------------------------------------------------------------

// import React, {useState, useRef, useEffect} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import FloatingMicButton from './components/FloatingMicButton';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceUtils/VoiceBus';
// import {VoiceTarget} from './utils/VoiceUtils/voiceTarget';
// import {initInstantTts, instantSpeak} from './utils/VoiceUtils/instantTts';
// import WeatherPromptOverlay from './components/WeatherPromptOverlay/WeatherPromptOverlay';

// // 🔊 Export global WebView ref so other files can inject JS speech
// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// // ✅ Create a global proxy for navigation
// export let globalNavigate = (_screen: string, _params?: any) => {
//   console.warn('⚠️ globalNavigate called before RootNavigator initialized');
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref; // ✅ assign once

//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   // 🗣️ First: Register TTS lifecycle handlers BEFORE anything else
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false);
//       VoiceBus.emit('stopListening');
//       console.log('🛑 TTS started → stopping mic');
//     };
//     const handleTtsFinish = () => {
//       console.log('✅ TTS finished → resuming mic');
//       VoiceBus.emit('startListening');
//     };
//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);
//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🔊 Initialize TTS once
//   useEffect(() => {
//     initInstantTts(); // preload Siri / Google voice
//     instantSpeak('Ready.'); // optional startup cue
//   }, []);

//   // 🔁 Sync overlay with recognition
//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => VoiceBus.off('status', handle);
//   }, []);

//   // 🗣️ Sync overlay + recording state with TTS events
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false); // stop listening while TTS speaks
//     };
//     const handleTtsFinish = () => {
//       setIsRecording(false); // reset overlay after speech
//     };

//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);

//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🌤️ Weather overlay event binding
//   const [weatherData, setWeatherData] = useState<any>(null);
//   const [weatherVisible, setWeatherVisible] = useState(false);

//   useEffect(() => {
//     const handleWeather = (payload: any) => {
//       setWeatherData(payload);
//       setWeatherVisible(true);
//     };
//     VoiceBus.on('weather', handleWeather);
//     return () => VoiceBus.off('weather', handleWeather);
//   }, []);

//   // 🧭 Global navigation proxy
//   const setGlobalNavigate = (navFn: any) => {
//     globalNavigate = (screen: string, params?: any) => {
//       VoiceBus.emit('stopListening');
//       VoiceTarget.clear();
//       setTimeout(() => navFn(screen, params), 80);
//     };
//   };
//   console.log('🌡️ Weather overlay data:', weatherData);

//   return (
//     <View style={styles.root}>
//       <VoiceOverlay isListening={isRecording} partialText={speech} />
//       <RootNavigator registerNavigate={setGlobalNavigate} />
//       <FloatingMicButton navigate={globalNavigate} />

//       <WeatherPromptOverlay
//         visible={weatherVisible}
//         city={weatherData?.city || 'Los Angeles'}
//         temperature={weatherData?.temperature || 0}
//         condition={weatherData?.condition || 'Clear skies'}
//         onHide={() => setWeatherVisible(false)}
//       />

//       {/* Hidden WebView used for GPT-style TTS playback */}
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

////////////////////////////

// // src/MainApp.tsx
// // -----------------------------------------------------------------------------
// // 🎤 MainApp — Global entrypoint
// // -----------------------------------------------------------------------------
// // • Hosts RootNavigator and FloatingMicButton
// // • Manages voice overlay + WebView TTS renderer
// // • Ensures all voice sessions stop cleanly on navigation
// // -----------------------------------------------------------------------------

// import React, {useState, useRef, useEffect} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import FloatingMicButton from './components/FloatingMicButton';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceBus';
// import {VoiceTarget} from './utils/voiceTarget';
// import {initInstantTts, instantSpeak} from './utils/instantTts';
// import WeatherPromptOverlay from './components/WeatherPromptOverlay/WeatherPromptOverlay';

// // 🔊 Export global WebView ref so other files can inject JS speech
// export const globalTtsRef: {current: React.RefObject<WebView> | null} = {
//   current: null,
// };

// // ✅ Create a global proxy for navigation
// export let globalNavigate = (_screen: string, _params?: any) => {
//   console.warn('⚠️ globalNavigate called before RootNavigator initialized');
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   globalTtsRef.current = ref; // ✅ assign once

//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   // 🔊 Initialize TTS once
//   useEffect(() => {
//     initInstantTts(); // preload Siri / Google voice
//     instantSpeak('Ready.'); // optional startup cue
//   }, []);

//   // 🔁 Sync overlay with recognition
//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => VoiceBus.off('status', handle);
//   }, []);

//   // 🗣️ Sync overlay + recording state with TTS events
//   useEffect(() => {
//     const handleTtsStart = () => {
//       setIsRecording(false); // stop listening while TTS speaks
//     };
//     const handleTtsFinish = () => {
//       setIsRecording(false); // reset overlay after speech
//     };

//     VoiceBus.on('tts-start', handleTtsStart);
//     VoiceBus.on('tts-finish', handleTtsFinish);

//     return () => {
//       VoiceBus.off('tts-start', handleTtsStart);
//       VoiceBus.off('tts-finish', handleTtsFinish);
//     };
//   }, []);

//   // 🌤️ Weather overlay event binding
//   const [weatherData, setWeatherData] = useState<any>(null);
//   const [weatherVisible, setWeatherVisible] = useState(false);

//   useEffect(() => {
//     const handleWeather = (payload: any) => {
//       setWeatherData(payload);
//       setWeatherVisible(true);
//     };
//     VoiceBus.on('weather', handleWeather);
//     return () => VoiceBus.off('weather', handleWeather);
//   }, []);

//   // 🧭 Global navigation proxy
//   const setGlobalNavigate = (navFn: any) => {
//     globalNavigate = (screen: string, params?: any) => {
//       VoiceBus.emit('stopListening');
//       VoiceTarget.clear();
//       setTimeout(() => navFn(screen, params), 80);
//     };
//   };
//   console.log('🌡️ Weather overlay data:', weatherData);

//   return (
//     <View style={styles.root}>
//       <VoiceOverlay isListening={isRecording} partialText={speech} />
//       <RootNavigator registerNavigate={setGlobalNavigate} />
//       <FloatingMicButton navigate={globalNavigate} />

//       <WeatherPromptOverlay
//         visible={weatherVisible}
//         city={weatherData?.city || 'Los Angeles'}
//         temperature={weatherData?.temperature || 0}
//         condition={weatherData?.condition || 'Clear skies'}
//         onHide={() => setWeatherVisible(false)}
//       />

//       {/* Hidden WebView used for GPT-style TTS playback */}
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

// import React, {useState, useRef, useEffect} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import FloatingMicButton from './components/FloatingMicButton';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceBus';
// import {VoiceTarget} from './utils/voiceTarget';
// import {initInstantTts, instantSpeak} from './utils/instantTts'; // 👈 add this line

// export let globalNavigate = (_screen: string, _params?: any) => {
//   console.warn('⚠️ globalNavigate called before RootNavigator initialized');
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   // 🔊 Initialize TTS once
//   useEffect(() => {
//     initInstantTts(); // 👈 preload Siri / Google voice
//     instantSpeak('Ready.'); // 👈 optional startup cue
//   }, []);

//   useEffect(() => {
//     const handle = ({speech, isRecording}: any) => {
//       setSpeech(speech);
//       setIsRecording(isRecording);
//     };
//     VoiceBus.on('status', handle);
//     return () => VoiceBus.off('status', handle);
//   }, []);

//   const setGlobalNavigate = (navFn: any) => {
//     globalNavigate = (screen: string, params?: any) => {
//       VoiceBus.emit('stopListening');
//       VoiceTarget.clear();
//       setTimeout(() => navFn(screen, params), 80);
//     };
//   };

//   return (
//     <View style={styles.root}>
//       <VoiceOverlay isListening={isRecording} partialText={speech} />
//       <RootNavigator registerNavigate={setGlobalNavigate} />
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

//////////////////////

// // src/MainApp.tsx
// // -----------------------------------------------------------------------------
// // 🎤 MainApp — Global entrypoint
// // -----------------------------------------------------------------------------
// // • Hosts RootNavigator and FloatingMicButton
// // • Manages voice overlay + WebView TTS renderer
// // • Ensures all voice sessions stop cleanly on navigation
// // -----------------------------------------------------------------------------

// import React, {useState, useRef, useEffect} from 'react';
// import {View, StyleSheet} from 'react-native';
// import {WebView} from 'react-native-webview';
// import RootNavigator from './navigation/RootNavigator';
// import FloatingMicButton from './components/FloatingMicButton';
// import {VoiceOverlay} from './components/VoiceOverlay/VoiceOverlay';
// import {VoiceBus} from './utils/VoiceBus';
// import {VoiceTarget} from './utils/voiceTarget';

// // ✅ Create a global proxy for navigation
// export let globalNavigate = (_screen: string, _params?: any) => {
//   console.warn('⚠️ globalNavigate called before RootNavigator initialized');
// };

// const MainApp = () => {
//   const ref = useRef<WebView>(null);
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);

//   // 🧠 Listen for voice overlay status updates
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
//     globalNavigate = (screen: string, params?: any) => {
//       // 🛑 Stop any active listening or stuck overlay before navigation
//       VoiceBus.emit('stopListening');
//       VoiceTarget.clear();

//       // slight delay ensures the voice overlay unmounts before switching
//       setTimeout(() => {
//         navFn(screen, params);
//       }, 80);
//     };
//   };

//   return (
//     <View style={styles.root}>
//       {/* 🎧 Global overlay for active speech recognition */}
//       <VoiceOverlay
//         isListening={isRecording}
//         partialText={speech}
//         pointerEvents="none"
//       />

//       {/* 🔹 Root app navigation (registers globalNavigate callback) */}
//       <RootNavigator registerNavigate={setGlobalNavigate} />

//       {/* 🔹 Floating voice mic, usable across all screens */}
//       <FloatingMicButton navigate={globalNavigate} />

//       {/* 🔹 Hidden WebView used for TTS playback buffer */}
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
