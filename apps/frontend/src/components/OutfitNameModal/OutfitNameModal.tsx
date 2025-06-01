import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
};

export default function OutfitNameModal({visible, onClose, onSave}: Props) {
  const {theme} = useAppTheme();
  const [name, setName] = useState('');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName('');
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.title, {color: theme.colors.foreground}]}>
            Name this outfit
          </Text>
          <TextInput
            placeholder="e.g. Date Night"
            placeholderTextColor={theme.colors.muted}
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              {
                color: theme.colors.foreground,
                borderColor: theme.colors.surface,
              },
            ]}
          />
          <View style={styles.buttons}>
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.button}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    marginLeft: 12,
  },
  buttonText: {
    fontWeight: '600',
    color: '#007AFF',
    fontSize: 16,
  },
});
