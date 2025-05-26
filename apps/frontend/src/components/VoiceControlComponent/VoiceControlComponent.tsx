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

const VoiceControlComponent: React.FC = () => {
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
      <Text style={styles.title}>Voice Control</Text>

      {voices.length === 2 && (
        <>
          <Text style={styles.label}>Select Voice:</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedVoice} onValueChange={onVoiceChange}>
              {voices.map(v => (
                <Picker.Item
                  key={v.id}
                  label={`${v.name} (${v.language})`}
                  value={v.id}
                />
              ))}
            </Picker>
          </View>
        </>
      )}

      <View style={styles.controls}>
        <Button
          title={isRecording ? 'Listening…' : 'Start Listening'}
          onPress={startRecording}
          disabled={isRecording}
        />
        <Button title="Stop" onPress={stopRecording} disabled={!isRecording} />
      </View>

      <Text style={styles.resultLabel}>Recognized:</Text>
      <Text style={styles.resultText}>{speech}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, justifyContent: 'center'},
  title: {fontSize: 24, textAlign: 'center', marginBottom: 16},
  label: {fontSize: 16, marginBottom: 8},
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  resultLabel: {fontSize: 18, textAlign: 'center', marginBottom: 4},
  resultText: {fontSize: 16, textAlign: 'center', color: '#333'},
});

export default VoiceControlComponent;

/////////////////

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

//   // refs to track recording state
//   const isRecordingRef = useRef(isRecording);
//   const wasListeningRef = useRef(false);

//   // keep ref in sync
//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   // Initialize TTS and fetch installed voices
//   useEffect(() => {
//     Tts.getInitStatus()
//       .then(async () => {
//         await Tts.setDefaultLanguage('en-US');
//         const allVoices = await Tts.voices();
//         const available = allVoices.filter(
//           v =>
//             v.language?.startsWith('en') &&
//             !v.networkConnectionRequired &&
//             !v.notInstalled,
//         );
//         setVoices(available);
//         if (available.length > 0) {
//           setSelectedVoice(available[0].id);
//           await Tts.setDefaultVoice(available[0].id);
//         }
//       })
//       .catch(err => console.warn('TTS init error', err));

//     // Voice recognition handlers
//     Voice.onSpeechResults = e => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//     };
//     Voice.onSpeechError = e => {
//       console.warn('Speech recognition error:', e.error);
//       setIsRecording(false);
//     };

//     // Pause/resume recognition around TTS
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

//   // Microphone permission helper
//   const requestMicrophone = async (): Promise<boolean> => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'App needs access to your microphone.',
//           buttonPositive: '',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startRecording = async () => {
//     if (!(await requestMicrophone())) return;
//     try {
//       await Voice.start('en-US');
//       setIsRecording(true);
//       setSpeech('');
//     } catch (e) {
//       console.error('Voice.start error:', e);
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
//       console.error('Voice.stop error:', e);
//     }
//   };

//   // Handle voice selection change
//   const onVoiceChange = async (voiceId: string) => {
//     setSelectedVoice(voiceId);
//     try {
//       await Tts.stop();
//       await Tts.setDefaultVoice(voiceId);
//     } catch (e) {
//       console.warn('Error switching voice:', e);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Voice Control</Text>

//       <Text style={styles.label}>Select Voice:</Text>
//       <View style={styles.pickerContainer}>
//         <Picker
//           selectedValue={selectedVoice}
//           onValueChange={onVoiceChange}
//           mode="dropdown">
//           {voices.map(v => (
//             <Picker.Item
//               key={v.id}
//               label={`${v.name} (${v.language})`}
//               value={v.id}
//             />
//           ))}
//         </Picker>
//       </View>

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
//     padding: 16,
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 24,
//     textAlign: 'center',
//     marginBottom: 16,
//   },
//   label: {
//     fontSize: 16,
//     marginBottom: 8,
//   },
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
//   resultLabel: {
//     fontSize: 18,
//     textAlign: 'center',
//     marginBottom: 4,
//   },
//   resultText: {
//     fontSize: 16,
//     textAlign: 'center',
//     color: '#333',
//   },
// });

// export default VoiceControlComponent;

////////////////

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
//   const [speech, setSpeech] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const [voices, setVoices] = useState<
//     Array<{id: string; name: string; language: string}>
//   >([]);
//   const [selectedVoice, setSelectedVoice] = useState<string>('');

//   const isRecordingRef = useRef(isRecording);
//   const wasListeningRef = useRef(false);

//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   useEffect(() => {
//     // Initialize TTS
//     Tts.getInitStatus()
//       .then(() => {
//         Tts.setDefaultLanguage('en-US');
//         // Load available voices
//         Tts.voices()
//           .then(avail => {
//             const filtered = avail.filter(
//               v => !v.networkConnectionRequired && !v.notInstalled,
//             );
//             setVoices(filtered);
//             if (filtered.length) {
//               setSelectedVoice(filtered[0].id);
//               Tts.setDefaultVoice(filtered[0].id);
//             }
//           })
//           .catch(err => console.warn('TTS voices error', err));
//       })
//       .catch(err => console.warn('TTS init error', err));

//     // Voice handlers
//     Voice.onSpeechResults = e => {
//       const text = e.value?.[0] || '';
//       setSpeech(text);
//     };
//     Voice.onSpeechError = e => {
//       console.warn('Speech recognition error:', e.error);
//       setIsRecording(false);
//     };

//     // Pause/resume recognition around TTS
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

//   useEffect(() => {
//     // When user selects a new voice
//     if (selectedVoice) {
//       Tts.setDefaultVoice(selectedVoice);
//     }
//   }, [selectedVoice]);

//   const requestMicrophone = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'App needs access to your microphone.',
//           buttonPositive: '',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startRecording = async () => {
//     if (!(await requestMicrophone())) return;
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
//       if (speech) Tts.speak(`You said: ${speech}`);
//     } catch (e) {
//       console.error('Voice.stop error', e);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Voice Control</Text>

//       <Text style={styles.label}>Select Voice:</Text>
//       <View style={styles.pickerContainer}>
//         <Picker
//           selectedValue={selectedVoice}
//           onValueChange={v => setSelectedVoice(v)}
//           mode="dropdown">
//           {voices.map(v => (
//             <Picker.Item
//               key={v.id}
//               label={`${v.name} (${v.language})`}
//               value={v.id}
//             />
//           ))}
//         </Picker>
//       </View>

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
//   label: {fontSize: 16, marginBottom: 4},
//   pickerContainer: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 4,
//     marginBottom: 16,
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

////////////////

// import React, {useEffect, useState} from 'react';
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

// const VoiceControlComponent: React.FC = () => {
//   const [isRecording, setIsRecording] = useState(false);
//   const [speech, setSpeech] = useState<string>('');

//   useEffect(() => {
//     // Initialize TTS
//     Tts.getInitStatus()
//       .then(() => Tts.setDefaultLanguage('en-US'))
//       .catch(err => console.warn('TTS init error:', err));

//     // Voice event handlers
//     Voice.onSpeechResults = onSpeechResults;
//     Voice.onSpeechError = onSpeechError;

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const onSpeechResults = (e: any) => {
//     const text = e.value?.[0] || '';
//     setSpeech(text);
//   };

//   const onSpeechError = (e: any) => {
//     console.warn('Speech recognition error:', e.error);
//     setIsRecording(false);
//   };

//   const requestMicrophone = async () => {
//     if (Platform.OS === 'android') {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//         {
//           title: 'Microphone Permission',
//           message: 'App needs access to your microphone.',
//           buttonPositive: '',
//         },
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const startRecording = async () => {
//     const ok = await requestMicrophone();
//     if (!ok) return;
//     try {
//       await Voice.start('en-US');
//       setIsRecording(true);
//       setSpeech('');
//     } catch (e) {
//       console.error('Voice.start error:', e);
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await Voice.stop();
//       setIsRecording(false);
//       // Speak back after user stops
//       if (speech) {
//         Tts.speak(`You said: ${speech}`);
//       }
//     } catch (e) {
//       console.error('Voice.stop error:', e);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Voice Control</Text>

//       <View style={styles.controls}>
//         <Button
//           title={isRecording ? 'Listening...' : 'Start Listening'}
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
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 16,
//   },
//   title: {fontSize: 24, marginBottom: 20},
//   controls: {flexDirection: 'row', gap: 16, marginBottom: 20},
//   resultLabel: {fontSize: 18, marginBottom: 8},
//   resultText: {fontSize: 16, color: '#333'},
// });

// export default VoiceControlComponent;
