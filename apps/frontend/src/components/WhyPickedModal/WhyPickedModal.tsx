import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type {WardrobeItem} from '../../hooks/useOutfitSuggestion';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  item: WardrobeItem | undefined;
  reasons: string[];
  section: 'Top' | 'Bottom' | 'Shoes';
};

export default function WhyPickedModal({
  visible,
  onClose,
  item,
  reasons,
  section,
}: Props) {
  const {theme} = useAppTheme();

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.title, {color: theme.colors.foreground}]}>
            Why was this {section.toLowerCase()} picked?
          </Text>

          <ScrollView style={styles.content}>
            {reasons.length > 0 ? (
              reasons.map((reason, index) => (
                <Text
                  key={index}
                  style={[styles.reason, {color: theme.colors.foreground}]}>
                  • {reason}
                </Text>
              ))
            ) : (
              <Text style={[styles.reason, {color: theme.colors.foreground}]}>
                No specific match found, but best available item was chosen.
              </Text>
            )}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#00000099',
    padding: 20,
  },
  modal: {
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  content: {
    maxHeight: 200,
  },
  reason: {
    fontSize: 14,
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  closeText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
