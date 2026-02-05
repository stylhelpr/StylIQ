import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = {
  visible: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
};

export default function DiscardConfirmModal({
  visible,
  onClose,
  onDiscard,
  onSave,
}: Props) {
  const {theme} = useAppTheme();

  const handleDiscard = () => {
    ReactNativeHapticFeedback.trigger('notificationWarning', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    onDiscard();
  };

  const handleSave = () => {
    ReactNativeHapticFeedback.trigger('selection', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    onSave();
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
      maxWidth: 300,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 10,
    },
    content: {
      padding: 24,
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.foreground,
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: theme.colors.muted || theme.colors.foreground,
      textAlign: 'center',
      lineHeight: 20,
    },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.surfaceBorder || 'rgba(0,0,0,0.1)',
    },
    buttonRow: {
      flexDirection: 'row',
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.surfaceBorder || 'rgba(0,0,0,0.1)',
    },
    discardButton: {
      borderBottomLeftRadius: 16,
    },
    saveButton: {
      borderBottomRightRadius: 16,
    },
    cancelButton: {
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.surfaceBorder || 'rgba(0,0,0,0.1)',
    },
    discardText: {
      fontSize: 16,
      color: '#FF3B30',
      fontWeight: '500',
    },
    saveText: {
      fontSize: 16,
      color: theme.colors.primary || '#007AFF',
      fontWeight: '600',
    },
    cancelText: {
      fontSize: 16,
      color: theme.colors.muted || theme.colors.foreground,
      fontWeight: '500',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              <View style={styles.content}>
                <Text style={styles.title}>Unsaved Changes</Text>
                <Text style={styles.message}>
                  You have unsaved changes to your outfit. Would you like to save
                  before leaving?
                </Text>
              </View>

              <View style={styles.footer}>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.discardButton]}
                    onPress={handleDiscard}
                    activeOpacity={0.7}>
                    <Text style={styles.discardText}>Discard</Text>
                  </TouchableOpacity>

                  <View style={styles.buttonDivider} />

                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSave}
                    activeOpacity={0.7}>
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  activeOpacity={0.7}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
