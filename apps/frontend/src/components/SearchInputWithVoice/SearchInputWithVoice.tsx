// src/components/SearchInput/SearchInputWithVoice.tsx
import React, {useState, useEffect} from 'react';
import {View, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';

export const SearchInputWithVoice = ({
  onSearch,
}: {
  onSearch: (q: string) => void;
}) => {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);

  const startSearchVoice = async () => {
    try {
      await Voice.start('en-US');
      setListening(true);
    } catch (e) {
      console.error('Voice start error:', e);
    }
  };

  const stopSearchVoice = async () => {
    await Voice.stop();
    setListening(false);
  };

  useEffect(() => {
    Voice.onSpeechResults = e => {
      const spoken = e.value?.[0] || '';
      setText(spoken);
      onSearch(spoken);
      stopSearchVoice();
    };
    return () => Voice.destroy().then(Voice.removeAllListeners);
  }, []);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search by voice..."
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => onSearch(text)}
      />
      <TouchableOpacity
        onPress={listening ? stopSearchVoice : startSearchVoice}>
        <Icon
          name="mic"
          size={24}
          color={listening ? '#007AFF' : '#888'}
          style={styles.micIcon}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  micIcon: {
    padding: 8,
  },
});
