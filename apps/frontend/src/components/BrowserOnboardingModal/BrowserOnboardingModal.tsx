import React from 'react';
import {Modal, View, Text, Pressable, StyleSheet} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function BrowserOnboardingModal({visible, onDismiss}: Props) {
  const {theme} = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View
          style={[styles.container, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.title, {color: theme.colors.foreground}]}>
            Save What Inspires You
          </Text>
          <Text style={[styles.body, {color: theme.colors.foreground2}]}>
            Long press any image to add it to your collection.
          </Text>
          <Pressable
            style={[styles.button, {backgroundColor: theme.colors.button1}]}
            onPress={onDismiss}>
            <Text style={[styles.buttonText, {color: theme.colors.buttonText1}]}>
              Got It
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
