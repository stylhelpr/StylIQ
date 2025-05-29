import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  Button,
  PermissionsAndroid,
  Platform,
  StyleSheet,
} from 'react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import {Picker} from '@react-native-picker/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {TouchableOpacity} from 'react-native';

type Props = {
  onPromptResult?: (text: string) => void;
};

const VoiceControlComponent: React.FC<Props> = ({onPromptResult}) => {
  const [speech, setSpeech] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voices, setVoices] = useState<
    Array<{id: string; name: string; language: string}>
  >([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  const isRecordingRef = useRef(isRecording);
  const wasListeningRef = useRef(false);

  // keep ref in sync
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // initialize TTS and fetch voices, picking Samantha (female) + Daniel (male)
  useEffect(() => {
    const initTts = async () => {
      try {
        await Tts.getInitStatus();
        await Tts.setDefaultLanguage('en-US');

        // get all installed voices
        const all = await Tts.voices();
        const en = all.filter(
          v =>
            v.language?.startsWith('en') &&
            !v.networkConnectionRequired &&
            !v.notInstalled,
        );

        // pick Samantha
        const samantha = en.find(v => v.name.toLowerCase() === 'samantha');
        // pick Daniel
        const daniel = en.find(v => v.name.toLowerCase() === 'daniel');
        // fallback to first two if missing
        const defaultVoice = samantha || en[0];
        const maleVoice =
          daniel || en.find(v => v.id !== defaultVoice.id) || defaultVoice;

        // only two options
        const list = [defaultVoice, maleVoice];
        setVoices(list);

        // set initial
        setSelectedVoice(defaultVoice.id);
        await Tts.setDefaultVoice(defaultVoice.id);
      } catch (e) {
        console.warn('TTS init error', e);
      }
    };
    initTts();

    // voice recognition handlers
    Voice.onSpeechResults = e => {
      const text = e.value?.[0] || '';
      setSpeech(text);
    };
    Voice.onSpeechError = e => {
      console.warn('Speech recognition error:', e.error);
      setIsRecording(false);
    };

    // pause/resume around TTS
    const onTtsStart = () => {
      if (isRecordingRef.current) {
        wasListeningRef.current = true;
        Voice.stop();
        setIsRecording(false);
      } else {
        wasListeningRef.current = false;
      }
    };
    const onTtsFinish = () => {
      if (wasListeningRef.current && !isRecordingRef.current) {
        Voice.start('en-US');
        setIsRecording(true);
      }
      wasListeningRef.current = false;
    };
    Tts.addEventListener('tts-start', onTtsStart);
    Tts.addEventListener('tts-finish', onTtsFinish);

    return () => {
      Tts.removeEventListener('tts-start', onTtsStart);
      Tts.removeEventListener('tts-finish', onTtsFinish);
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // request mic permission
  const requestMic = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'App needs mic access.',
          buttonPositive: '',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startRecording = async () => {
    if (!(await requestMic())) return;
    try {
      await Voice.start('en-US');
      setIsRecording(true);
      setSpeech('');
    } catch (e) {
      console.error('Voice.start error', e);
    }
  };

  const stopRecording = async () => {
    try {
      await Voice.stop();
      setIsRecording(false);
      if (speech) {
        Tts.speak(`You said: ${speech}`);
      }
    } catch (e) {
      console.error('Voice.stop error', e);
    }
  };

  // handle voice selection
  const onVoiceChange = async (id: string) => {
    setSelectedVoice(id);
    try {
      await Tts.stop();
      await Tts.setDefaultVoice(id);
    } catch (e) {
      console.warn('Error switching voice:', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.micButton}
          onPressIn={startRecording}
          onPressOut={stopRecording}>
          <MaterialIcons
            name="mic"
            size={32}
            color={isRecording ? '#d32f2f' : '#000'}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.resultLabel}>Recognized:</Text>
      <Text style={styles.resultText}>{speech}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    gap: 12,
  },
  resultLabel: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
  resultText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#111',
    marginTop: 4,
    paddingHorizontal: 12,
  },
  micButton: {
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default VoiceControlComponent;

///////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   Button,
//   PermissionsAndroid,
//   Platform,
//   StyleSheet,
// } from 'react-native';
// import Voice from '@react-native-voice/voice';
// import Tts from 'react-native-tts';
// import {Picker} from '@react-native-picker/picker';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {TouchableOpacity} from 'react-native';

// type Props = {
//   onPromptResult?: (text: string) => void;
// };

// const VoiceControlComponent: React.FC<Props> = ({onPromptResult}) => {
//   const [speech, setSpeech] = useState<string>('');
//   const [isRecording, setIsRecording] = useState<boolean>(false);
//   const [voices, setVoices] = useState<
//     Array<{id: string; name: string; language: string}>
//   >([]);
//   const [selectedVoice, setSelectedVoice] = useState<string>('');

//   const isRecordingRef = useRef(isRecording);
//   const wasListeningRef = useRef(false);

//   // keep ref in sync
//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   // initialize TTS and fetch voices, picking Samantha (female) + Daniel (male)
//   useEffect(() => {
//     const initTts = async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.setDefaultLanguage('en-US');

//         // get all installed voices
//         const all = await Tts.voices();
//         const en = all.filter(
//           v =>
//             v.language?.startsWith('en') &&
//             !v.networkConnectionRequired &&
//             !v.notInstalled,
//         );

//         // pick Samantha
//         const samantha = en.find(v => v.name.toLowerCase() === 'samantha');
//         // pick Daniel
//         const daniel = en.find(v => v.name.toLowerCase() === 'daniel');
//         // fallback to first two if missing
//         const defaultVoice = samantha || en[0];
//         const maleVoice =
//           daniel || en.find(v => v.id !== defaultVoice.id) || defaultVoice;

//         // only two options
//         const list = [defaultVoice, maleVoice];
//         setVoices(list);

//         // set initial
//         setSelectedVoice(defaultVoice.id);
//         await Tts.setDefaultVoice(defaultVoice.id);
//       } catch (e) {
//         console.warn('TTS init error', e);
//       }
//     };
//     initTts();

//     // voice recognition handlers
//     Voice.onSpeechResults = e => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//     };
//     Voice.onSpeechError = e => {
//       console.warn('Speech recognition error:', e.error);
//       setIsRecording(false);
//     };

//     // pause/resume around TTS
//     const onTtsStart = () => {
//       if (isRecordingRef.current) {
//         wasListeningRef.current = true;
//         Voice.stop();
//         setIsRecording(false);
//       } else {
//         wasListeningRef.current = false;
//       }
//     };
//     const onTtsFinish = () => {
//       if (wasListeningRef.current && !isRecordingRef.current) {
//         Voice.start('en-US');
//         setIsRecording(true);
//       }
//       wasListeningRef.current = false;
//     };
//     Tts.addEventListener('tts-start', onTtsStart);
//     Tts.addEventListener('tts-finish', onTtsFinish);

//     return () => {
//       Tts.removeEventListener('tts-start', onTtsStart);
//       Tts.removeEventListener('tts-finish', onTtsFinish);
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   // request mic permission
//   const requestMic = async (): Promise<boolean> => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'App needs mic access.',
//           buttonPositive: '',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startRecording = async () => {
//     if (!(await requestMic())) return;
//     try {
//       await Voice.start('en-US');
//       setIsRecording(true);
//       setSpeech('');
//     } catch (e) {
//       console.error('Voice.start error', e);
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await Voice.stop();
//       setIsRecording(false);
//       if (speech) {
//         Tts.speak(`You said: ${speech}`);
//       }
//     } catch (e) {
//       console.error('Voice.stop error', e);
//     }
//   };

//   // handle voice selection
//   const onVoiceChange = async (id: string) => {
//     setSelectedVoice(id);
//     try {
//       await Tts.stop();
//       await Tts.setDefaultVoice(id);
//     } catch (e) {
//       console.warn('Error switching voice:', e);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.controls}>
//         <TouchableOpacity
//           style={styles.micButton}
//           onPress={startRecording}
//           disabled={isRecording}>
//           <MaterialIcons
//             name="mic"
//             size={32}
//             color={isRecording ? '#888' : '#000'}
//           />
//         </TouchableOpacity>
//         <Button title="Stop" onPress={stopRecording} disabled={!isRecording} />
//       </View>

//       <Text style={styles.resultLabel}>Recognized:</Text>
//       <Text style={styles.resultText}>{speech}</Text>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingHorizontal: 24,
//     paddingVertical: 32,
//     justifyContent: 'space-between',
//   },
//   controls: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     paddingVertical: 16,
//     gap: 12,
//   },
//   resultLabel: {
//     fontSize: 16,
//     textAlign: 'center',
//     color: '#666',
//     marginTop: 16,
//   },
//   resultText: {
//     fontSize: 18,
//     textAlign: 'center',
//     color: '#111',
//     marginTop: 4,
//     paddingHorizontal: 12,
//   },
//   micButton: {
//     backgroundColor: '#e0e0e0',
//     padding: 16,
//     borderRadius: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });

// export default VoiceControlComponent;

///////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   Button,
//   PermissionsAndroid,
//   Platform,
//   StyleSheet,
// } from 'react-native';
// import Voice from '@react-native-voice/voice';
// import Tts from 'react-native-tts';
// import {Picker} from '@react-native-picker/picker';

// type Props = {
//   onPromptResult?: (text: string) => void;
// };

// const VoiceControlComponent: React.FC<Props> = ({onPromptResult}) => {
//   const [speech, setSpeech] = useState<string>('');
//   const [isRecording, setIsRecording] = useState<boolean>(false);
//   const [voices, setVoices] = useState<
//     Array<{id: string; name: string; language: string}>
//   >([]);
//   const [selectedVoice, setSelectedVoice] = useState<string>('');

//   const isRecordingRef = useRef(isRecording);
//   const wasListeningRef = useRef(false);

//   // keep ref in sync
//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   // initialize TTS and fetch voices, picking Samantha (female) + Daniel (male)
//   useEffect(() => {
//     const initTts = async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.setDefaultLanguage('en-US');

//         // get all installed voices
//         const all = await Tts.voices();
//         const en = all.filter(
//           v =>
//             v.language?.startsWith('en') &&
//             !v.networkConnectionRequired &&
//             !v.notInstalled,
//         );

//         // pick Samantha
//         const samantha = en.find(v => v.name.toLowerCase() === 'samantha');
//         // pick Daniel
//         const daniel = en.find(v => v.name.toLowerCase() === 'daniel');
//         // fallback to first two if missing
//         const defaultVoice = samantha || en[0];
//         const maleVoice =
//           daniel || en.find(v => v.id !== defaultVoice.id) || defaultVoice;

//         // only two options
//         const list = [defaultVoice, maleVoice];
//         setVoices(list);

//         // set initial
//         setSelectedVoice(defaultVoice.id);
//         await Tts.setDefaultVoice(defaultVoice.id);
//       } catch (e) {
//         console.warn('TTS init error', e);
//       }
//     };
//     initTts();

//     // voice recognition handlers
//     Voice.onSpeechResults = e => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//     };
//     Voice.onSpeechError = e => {
//       console.warn('Speech recognition error:', e.error);
//       setIsRecording(false);
//     };

//     // pause/resume around TTS
//     const onTtsStart = () => {
//       if (isRecordingRef.current) {
//         wasListeningRef.current = true;
//         Voice.stop();
//         setIsRecording(false);
//       } else {
//         wasListeningRef.current = false;
//       }
//     };
//     const onTtsFinish = () => {
//       if (wasListeningRef.current && !isRecordingRef.current) {
//         Voice.start('en-US');
//         setIsRecording(true);
//       }
//       wasListeningRef.current = false;
//     };
//     Tts.addEventListener('tts-start', onTtsStart);
//     Tts.addEventListener('tts-finish', onTtsFinish);

//     return () => {
//       Tts.removeEventListener('tts-start', onTtsStart);
//       Tts.removeEventListener('tts-finish', onTtsFinish);
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   // request mic permission
//   const requestMic = async (): Promise<boolean> => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'App needs mic access.',
//           buttonPositive: '',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startRecording = async () => {
//     if (!(await requestMic())) return;
//     try {
//       await Voice.start('en-US');
//       setIsRecording(true);
//       setSpeech('');
//     } catch (e) {
//       console.error('Voice.start error', e);
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await Voice.stop();
//       setIsRecording(false);
//       if (speech) {
//         Tts.speak(`You said: ${speech}`);
//       }
//     } catch (e) {
//       console.error('Voice.stop error', e);
//     }
//   };

//   // handle voice selection
//   const onVoiceChange = async (id: string) => {
//     setSelectedVoice(id);
//     try {
//       await Tts.stop();
//       await Tts.setDefaultVoice(id);
//     } catch (e) {
//       console.warn('Error switching voice:', e);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.controls}>
//         <Button
//           title={isRecording ? 'Listening…' : 'Start Listening'}
//           onPress={startRecording}
//           disabled={isRecording}
//         />
//         <Button title="Stop" onPress={stopRecording} disabled={!isRecording} />
//       </View>

//       <Text style={styles.resultLabel}>Recognized:</Text>
//       <Text style={styles.resultText}>{speech}</Text>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingHorizontal: 24,
//     paddingVertical: 32,
//     justifyContent: 'space-between',
//   },
//   controls: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     paddingVertical: 16,
//     gap: 12,
//   },
//   resultLabel: {
//     fontSize: 16,
//     textAlign: 'center',
//     color: '#666',
//     marginTop: 16,
//   },
//   resultText: {
//     fontSize: 18,
//     textAlign: 'center',
//     color: '#111',
//     marginTop: 4,
//     paddingHorizontal: 12,
//   },
// });

// export default VoiceControlComponent;

/////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   Button,
//   PermissionsAndroid,
//   Platform,
//   StyleSheet,
// } from 'react-native';
// import Voice from '@react-native-voice/voice';
// import Tts from 'react-native-tts';

// type Props = {
//   onPromptResult?: (text: string) => void;
// };

// const VoiceControlComponent: React.FC<Props> = ({onPromptResult}) => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const isRecordingRef = useRef(false);
//   const wasListeningRef = useRef(false);

//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   useEffect(() => {
//     const init = async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.setDefaultLanguage('en-US');
//       } catch (e) {
//         console.warn('❌ TTS init error:', e);
//       }
//     };
//     init();

//     Voice.onSpeechResults = e => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//       onPromptResult?.(text);
//     };

//     Voice.onSpeechError = e => {
//       console.warn('❌ Speech error:', e.error);
//       setIsRecording(false);
//     };

//     const handleTtsStart = () => {
//       if (isRecordingRef.current) {
//         wasListeningRef.current = true;
//         Voice.stop();
//         setIsRecording(false);
//       }
//     };

//     const handleTtsFinish = () => {
//       if (wasListeningRef.current && !isRecordingRef.current) {
//         Voice.start('en-US');
//         setIsRecording(true);
//       }
//       wasListeningRef.current = false;
//     };

//     Tts.addEventListener('tts-start', handleTtsStart);
//     Tts.addEventListener('tts-finish', handleTtsFinish);

//     return () => {
//       Tts.removeEventListener('tts-start', handleTtsStart);
//       Tts.removeEventListener('tts-finish', handleTtsFinish);
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, [onPromptResult]);

//   const requestMicPermission = async (): Promise<boolean> => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'App needs mic access.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startRecording = async () => {
//     if (!(await requestMicPermission())) return;
//     try {
//       await Voice.start('en-US');
//       setIsRecording(true);
//       setSpeech('');
//     } catch (e) {
//       console.error('❌ Voice.start error:', e);
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await Voice.stop();
//       setIsRecording(false);
//       if (speech) {
//         Tts.speak(`You said: ${speech}`);
//       }
//     } catch (e) {
//       console.error('❌ Voice.stop error:', e);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Voice Assistant</Text>

//       <View style={styles.controls}>
//         <Button
//           title={isRecording ? 'Listening…' : 'Start Listening'}
//           onPress={startRecording}
//           disabled={isRecording}
//         />
//         <Button title="Stop" onPress={stopRecording} disabled={!isRecording} />
//       </View>

//       <Text style={styles.resultLabel}>Recognized:</Text>
//       <Text style={styles.resultText}>{speech}</Text>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {flex: 1, padding: 16, justifyContent: 'center'},
//   title: {fontSize: 24, textAlign: 'center', marginBottom: 16},
//   controls: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 20,
//   },
//   resultLabel: {fontSize: 18, textAlign: 'center', marginBottom: 4},
//   resultText: {fontSize: 16, textAlign: 'center', color: '#333'},
// });

// export default VoiceControlComponent;

///////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   Button,
//   PermissionsAndroid,
//   Platform,
//   StyleSheet,
// } from 'react-native';
// import Voice from '@react-native-voice/voice';

// const VoiceControlComponent = () => {
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const isRecordingRef = useRef(false);

//   useEffect(() => {
//     console.log('✅ VoiceControlComponent mounted');

//     Voice.onSpeechResults = e => {
//       const text = e.value?.[0] || '';
//       console.log('🎙️ Speech result:', text);
//       setSpeech(text);
//     };

//     Voice.onSpeechError = e => {
//       console.warn('❌ Speech error:', e.error);
//       setIsRecording(false);
//     };

//     return () => {
//       if (Voice?.destroy) Voice.destroy();
//       if (Voice?.removeAllListeners) Voice.removeAllListeners();
//       console.log('🧹 Cleaned up voice listeners');
//     };
//   }, []);

//   const requestMicPermission = async (): Promise<boolean> => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'App needs mic access.',
//           buttonPositive: 'OK',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startRecording = async () => {
//     if (!(await requestMicPermission())) return;

//     if (!Voice?.start) {
//       console.error('🚨 Voice.start is undefined');
//       return;
//     }

//     try {
//       await Voice.start('en-US');
//       setIsRecording(true);
//       setSpeech('');
//       console.log('🎤 Started recording...');
//     } catch (e) {
//       console.error('❌ Voice.start error:', e);
//     }
//   };

//   const stopRecording = async () => {
//     if (!Voice?.stop) {
//       console.error('🚨 Voice.stop is undefined');
//       return;
//     }

//     try {
//       await Voice.stop();
//       setIsRecording(false);
//       console.log('🛑 Stopped recording');
//     } catch (e) {
//       console.error('❌ Voice.stop error:', e);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Voice Assistant</Text>

//       <View style={styles.controls}>
//         <Button
//           title={isRecording ? 'Listening…' : 'Start Listening'}
//           onPress={startRecording}
//           disabled={isRecording}
//         />
//         <Button title="Stop" onPress={stopRecording} disabled={!isRecording} />
//       </View>

//       <Text style={styles.resultLabel}>Recognized:</Text>
//       <Text style={styles.resultText}>{speech}</Text>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {flex: 1, padding: 16, justifyContent: 'center'},
//   title: {fontSize: 24, textAlign: 'center', marginBottom: 16},
//   controls: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 20,
//   },
//   resultLabel: {fontSize: 18, textAlign: 'center', marginBottom: 4},
//   resultText: {fontSize: 16, textAlign: 'center', color: '#333'},
// });

// export default VoiceControlComponent;

//////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   Button,
//   PermissionsAndroid,
//   Platform,
//   StyleSheet,
// } from 'react-native';
// import Voice from '@react-native-voice/voice';
// import Tts from 'react-native-tts';
// import {Picker} from '@react-native-picker/picker';

// type Props = {
//   onPromptResult?: (text: string) => void;
// };

// const VoiceControlComponent: React.FC<Props> = ({onPromptResult}) => {
//   const [speech, setSpeech] = useState<string>('');
//   const [isRecording, setIsRecording] = useState<boolean>(false);
//   const [voices, setVoices] = useState<
//     Array<{id: string; name: string; language: string}>
//   >([]);
//   const [selectedVoice, setSelectedVoice] = useState<string>('');

//   const isRecordingRef = useRef(isRecording);
//   const wasListeningRef = useRef(false);

//   // keep ref in sync
//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   // initialize TTS and fetch voices, picking Samantha (female) + Daniel (male)
//   useEffect(() => {
//     const initTts = async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.setDefaultLanguage('en-US');

//         // get all installed voices
//         const all = await Tts.voices();
//         const en = all.filter(
//           v =>
//             v.language?.startsWith('en') &&
//             !v.networkConnectionRequired &&
//             !v.notInstalled,
//         );

//         // pick Samantha
//         const samantha = en.find(v => v.name.toLowerCase() === 'samantha');
//         // pick Daniel
//         const daniel = en.find(v => v.name.toLowerCase() === 'daniel');
//         // fallback to first two if missing
//         const defaultVoice = samantha || en[0];
//         const maleVoice =
//           daniel || en.find(v => v.id !== defaultVoice.id) || defaultVoice;

//         // only two options
//         const list = [defaultVoice, maleVoice];
//         setVoices(list);

//         // set initial
//         setSelectedVoice(defaultVoice.id);
//         await Tts.setDefaultVoice(defaultVoice.id);
//       } catch (e) {
//         console.warn('TTS init error', e);
//       }
//     };
//     initTts();

//     // voice recognition handlers
//     Voice.onSpeechResults = e => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//     };
//     Voice.onSpeechError = e => {
//       console.warn('Speech recognition error:', e.error);
//       setIsRecording(false);
//     };

//     // pause/resume around TTS
//     const onTtsStart = () => {
//       if (isRecordingRef.current) {
//         wasListeningRef.current = true;
//         Voice.stop();
//         setIsRecording(false);
//       } else {
//         wasListeningRef.current = false;
//       }
//     };
//     const onTtsFinish = () => {
//       if (wasListeningRef.current && !isRecordingRef.current) {
//         Voice.start('en-US');
//         setIsRecording(true);
//       }
//       wasListeningRef.current = false;
//     };
//     Tts.addEventListener('tts-start', onTtsStart);
//     Tts.addEventListener('tts-finish', onTtsFinish);

//     return () => {
//       Tts.removeEventListener('tts-start', onTtsStart);
//       Tts.removeEventListener('tts-finish', onTtsFinish);
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   // request mic permission
//   const requestMic = async (): Promise<boolean> => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'App needs mic access.',
//           buttonPositive: '',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startRecording = async () => {
//     if (!(await requestMic())) return;
//     try {
//       await Voice.start('en-US');
//       setIsRecording(true);
//       setSpeech('');
//     } catch (e) {
//       console.error('Voice.start error', e);
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await Voice.stop();
//       setIsRecording(false);
//       if (speech) {
//         Tts.speak(`You said: ${speech}`);
//       }
//     } catch (e) {
//       console.error('Voice.stop error', e);
//     }
//   };

//   // handle voice selection
//   const onVoiceChange = async (id: string) => {
//     setSelectedVoice(id);
//     try {
//       await Tts.stop();
//       await Tts.setDefaultVoice(id);
//     } catch (e) {
//       console.warn('Error switching voice:', e);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.controls}>
//         <Button
//           title={isRecording ? 'Listening…' : 'Start Listening'}
//           onPress={startRecording}
//           disabled={isRecording}
//         />
//         <Button title="Stop" onPress={stopRecording} disabled={!isRecording} />
//       </View>

//       <Text style={styles.resultLabel}>Recognized:</Text>
//       <Text style={styles.resultText}>{speech}</Text>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {flex: 1, padding: 16, justifyContent: 'center'},
//   title: {fontSize: 24, textAlign: 'center', marginBottom: 16},
//   label: {fontSize: 16, marginBottom: 8},
//   pickerContainer: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 4,
//     marginBottom: 20,
//   },
//   controls: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 20,
//   },
//   resultLabel: {fontSize: 18, textAlign: 'center', marginBottom: 4},
//   resultText: {fontSize: 16, textAlign: 'center', color: '#333'},
// });

// export default VoiceControlComponent;

///////////////

// import React, {useEffect, useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   Button,
//   PermissionsAndroid,
//   Platform,
//   StyleSheet,
// } from 'react-native';
// import Voice from '@react-native-voice/voice';
// import Tts from 'react-native-tts';
// import {Picker} from '@react-native-picker/picker';

// const VoiceControlComponent: React.FC = () => {
//   const [speech, setSpeech] = useState<string>('');
//   const [isRecording, setIsRecording] = useState<boolean>(false);
//   const [voices, setVoices] = useState<
//     Array<{id: string; name: string; language: string}>
//   >([]);
//   const [selectedVoice, setSelectedVoice] = useState<string>('');

//   const isRecordingRef = useRef(isRecording);
//   const wasListeningRef = useRef(false);

//   // keep ref in sync
//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   // initialize TTS and fetch voices, picking Samantha (female) + Daniel (male)
//   useEffect(() => {
//     const initTts = async () => {
//       try {
//         await Tts.getInitStatus();
//         await Tts.setDefaultLanguage('en-US');

//         // get all installed voices
//         const all = await Tts.voices();
//         const en = all.filter(
//           v =>
//             v.language?.startsWith('en') &&
//             !v.networkConnectionRequired &&
//             !v.notInstalled,
//         );

//         // pick Samantha
//         const samantha = en.find(v => v.name.toLowerCase() === 'samantha');
//         // pick Daniel
//         const daniel = en.find(v => v.name.toLowerCase() === 'daniel');
//         // fallback to first two if missing
//         const defaultVoice = samantha || en[0];
//         const maleVoice =
//           daniel || en.find(v => v.id !== defaultVoice.id) || defaultVoice;

//         // only two options
//         const list = [defaultVoice, maleVoice];
//         setVoices(list);

//         // set initial
//         setSelectedVoice(defaultVoice.id);
//         await Tts.setDefaultVoice(defaultVoice.id);
//       } catch (e) {
//         console.warn('TTS init error', e);
//       }
//     };
//     initTts();

//     // voice recognition handlers
//     Voice.onSpeechResults = e => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//     };
//     Voice.onSpeechError = e => {
//       console.warn('Speech recognition error:', e.error);
//       setIsRecording(false);
//     };

//     // pause/resume around TTS
//     const onTtsStart = () => {
//       if (isRecordingRef.current) {
//         wasListeningRef.current = true;
//         Voice.stop();
//         setIsRecording(false);
//       } else {
//         wasListeningRef.current = false;
//       }
//     };
//     const onTtsFinish = () => {
//       if (wasListeningRef.current && !isRecordingRef.current) {
//         Voice.start('en-US');
//         setIsRecording(true);
//       }
//       wasListeningRef.current = false;
//     };
//     Tts.addEventListener('tts-start', onTtsStart);
//     Tts.addEventListener('tts-finish', onTtsFinish);

//     return () => {
//       Tts.removeEventListener('tts-start', onTtsStart);
//       Tts.removeEventListener('tts-finish', onTtsFinish);
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   // request mic permission
//   const requestMic = async (): Promise<boolean> => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'App needs mic access.',
//           buttonPositive: '',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startRecording = async () => {
//     if (!(await requestMic())) return;
//     try {
//       await Voice.start('en-US');
//       setIsRecording(true);
//       setSpeech('');
//     } catch (e) {
//       console.error('Voice.start error', e);
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await Voice.stop();
//       setIsRecording(false);
//       if (speech) {
//         Tts.speak(`You said: ${speech}`);
//       }
//     } catch (e) {
//       console.error('Voice.stop error', e);
//     }
//   };

//   // handle voice selection
//   const onVoiceChange = async (id: string) => {
//     setSelectedVoice(id);
//     try {
//       await Tts.stop();
//       await Tts.setDefaultVoice(id);
//     } catch (e) {
//       console.warn('Error switching voice:', e);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Voice Control</Text>

//       {voices.length === 2 && (
//         <>
//           <Text style={styles.label}>Select Voice:</Text>
//           <View style={styles.pickerContainer}>
//             <Picker selectedValue={selectedVoice} onValueChange={onVoiceChange}>
//               {voices.map(v => (
//                 <Picker.Item
//                   key={v.id}
//                   label={`${v.name} (${v.language})`}
//                   value={v.id}
//                 />
//               ))}
//             </Picker>
//           </View>
//         </>
//       )}

//       <View style={styles.controls}>
//         <Button
//           title={isRecording ? 'Listening…' : 'Start Listening'}
//           onPress={startRecording}
//           disabled={isRecording}
//         />
//         <Button title="Stop" onPress={stopRecording} disabled={!isRecording} />
//       </View>

//       <Text style={styles.resultLabel}>Recognized:</Text>
//       <Text style={styles.resultText}>{speech}</Text>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {flex: 1, padding: 16, justifyContent: 'center'},
//   title: {fontSize: 24, textAlign: 'center', marginBottom: 16},
//   label: {fontSize: 16, marginBottom: 8},
//   pickerContainer: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 4,
//     marginBottom: 20,
//   },
//   controls: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 20,
//   },
//   resultLabel: {fontSize: 18, textAlign: 'center', marginBottom: 4},
//   resultText: {fontSize: 16, textAlign: 'center', color: '#333'},
// });

// export default VoiceControlComponent;
