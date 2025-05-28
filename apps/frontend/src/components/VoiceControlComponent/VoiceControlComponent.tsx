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
