// components/VoiceControlButton.tsx
import React from 'react';
import {Pressable, StyleSheet, View, Text} from 'react-native';
import {Mic} from 'lucide-react-native';
import {useVoiceControl} from '../../hooks/useVoiceControl';

const VoiceControlButton = () => {
  const {startListening, stopListening, isRecording} = useVoiceControl();

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPressIn={startListening}
        onPressOut={stopListening}
        style={({pressed}) => [
          styles.button,
          {backgroundColor: pressed || isRecording ? '#111' : '#333'},
        ]}>
        {/* <Mic stroke="#fff" size={32} /> */}
        <Text style={styles.label}>
          {isRecording ? 'Listening…' : 'Hold to Speak'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  label: {
    marginTop: 10,
    color: '#888',
    fontSize: 14,
  },
});

export default VoiceControlButton;
