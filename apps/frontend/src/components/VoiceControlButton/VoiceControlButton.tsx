import React from 'react';
import {Pressable, StyleSheet, View, Text} from 'react-native';
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
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  label: {
    marginTop: 10,
    color: '#aaa',
    fontSize: 14,
  },
});

export default VoiceControlButton;
