import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  isSaving: boolean;
};

export default function SaveOutfitModal({
  visible,
  onClose,
  onSave,
  isSaving,
}: Props) {
  const {theme} = useAppTheme();
  const [name, setName] = useState('');

  const generateDefaultName = () => {
    const now = new Date();
    return `Outfit ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const handleSave = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    const outfitName = name.trim() || generateDefaultName();
    onSave(outfitName);
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modal: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      width: '100%',
      maxWidth: 340,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 10,
    },
    header: {
      padding: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.surfaceBorder || 'rgba(0,0,0,0.1)',
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.foreground,
      textAlign: 'center',
    },
    body: {
      padding: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.muted || theme.colors.foreground,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.foreground,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder || 'rgba(0,0,0,0.1)',
    },
    footer: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.surfaceBorder || 'rgba(0,0,0,0.1)',
    },
    button: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.surfaceBorder || 'rgba(0,0,0,0.1)',
    },
    cancelText: {
      fontSize: 16,
      color: theme.colors.muted || theme.colors.foreground,
      fontWeight: '500',
    },
    saveText: {
      fontSize: 16,
      color: theme.colors.primary || '#007AFF',
      fontWeight: '600',
    },
    saveTextDisabled: {
      opacity: 0.5,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modal}>
                <View style={styles.header}>
                  <Text style={styles.title}>Save Outfit</Text>
                </View>

                <View style={styles.body}>
                  <Text style={styles.label}>Outfit Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter a name (optional)"
                    placeholderTextColor={theme.colors.muted || 'rgba(0,0,0,0.4)'}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                    editable={!isSaving}
                  />
                </View>

                <View style={styles.footer}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleClose}
                    disabled={isSaving}
                    activeOpacity={0.7}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <View style={styles.buttonDivider} />

                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleSave}
                    disabled={isSaving}
                    activeOpacity={0.7}>
                    {isSaving ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Text
                        style={[
                          styles.saveText,
                          isSaving && styles.saveTextDisabled,
                        ]}>
                        Save
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
