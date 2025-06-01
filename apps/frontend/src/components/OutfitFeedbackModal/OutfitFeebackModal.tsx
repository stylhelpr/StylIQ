import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type FeedbackType = 'like' | 'dislike' | null;

type Props = {
  visible: boolean;
  onClose: () => void;
  feedbackData: {
    feedback: FeedbackType;
    tags: string[];
    reason: string;
  };
  setFeedbackData: React.Dispatch<
    React.SetStateAction<{
      feedback: FeedbackType;
      tags: string[];
      reason: string;
    }>
  >;
  toggleTag: (tag: string) => void;
  REASON_TAGS: string[];
  theme: {
    colors: {
      background: string;
      foreground: string;
      muted: string;
    };
  };
};

export default function OutfitFeedbackModal({
  visible,
  onClose,
  feedbackData,
  setFeedbackData,
  toggleTag,
  REASON_TAGS,
  theme,
}: Props) {
  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modal: {
      width: '100%',
      borderRadius: 16,
      padding: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 10,
      textAlign: 'center',
    },
    subtext: {
      fontSize: 14,
      textAlign: 'center',
    },
    thumbRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      marginVertical: 16,
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 10,
      padding: 10,
      width: '100%',
      color: theme.colors.foreground,
      marginTop: 12,
    },
    closeBtn: {
      marginTop: 20,
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 20,
      backgroundColor: '#007AFF',
      borderRadius: 8,
    },
    closeText: {
      color: 'white',
      fontWeight: '600',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View
          style={[styles.modal, {backgroundColor: theme.colors.background}]}>
          <Text style={[styles.title, {color: theme.colors.foreground}]}>
            Rate this outfit
          </Text>

          <Text style={[styles.subtext, {color: theme.colors.foreground}]}>
            What did you think of this outfit?
          </Text>

          <View style={styles.thumbRow}>
            <TouchableOpacity
              onPress={() =>
                setFeedbackData(prev => ({
                  ...prev,
                  feedback: prev.feedback === 'like' ? null : 'like',
                }))
              }>
              <MaterialIcons
                name="thumb-up"
                size={30}
                color={feedbackData.feedback === 'like' ? 'green' : 'gray'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                setFeedbackData(prev => ({
                  ...prev,
                  feedback: prev.feedback === 'dislike' ? null : 'dislike',
                }))
              }>
              <MaterialIcons
                name="thumb-down"
                size={30}
                color={feedbackData.feedback === 'dislike' ? 'red' : 'gray'}
              />
            </TouchableOpacity>
          </View>

          {feedbackData.feedback && (
            <>
              <Text
                style={[
                  styles.subtext,
                  {
                    color: theme.colors.foreground,
                    marginTop: 8,
                    marginBottom: 8,
                  },
                ]}>
                Why did you{' '}
                {feedbackData.feedback === 'like' ? 'like' : 'dislike'} it?
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}>
                {REASON_TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={{
                      borderColor: feedbackData.tags.includes(tag)
                        ? '#333'
                        : '#999',
                      borderWidth: 1,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: feedbackData.tags.includes(tag)
                        ? '#ddd'
                        : '#fff',
                      marginBottom: 8,
                    }}>
                    <Text>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder="Add any comments or suggestions..."
                placeholderTextColor={theme.colors.muted}
                value={feedbackData.reason}
                onChangeText={text =>
                  setFeedbackData(prev => ({...prev, reason: text}))
                }
                style={styles.input}
                multiline
              />
            </>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
