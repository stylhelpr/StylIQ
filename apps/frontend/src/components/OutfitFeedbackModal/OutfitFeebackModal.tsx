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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';

const STORAGE_KEY = 'outfit_feedback_logs';

type FeedbackType = 'like' | 'dislike' | null;

type Props = {
  visible: boolean;
  onClose: () => void;
  feedbackData: {feedback: FeedbackType; tags: string[]; reason: string};
  setFeedbackData: React.Dispatch<
    React.SetStateAction<{
      feedback: FeedbackType;
      tags: string[];
      reason: string;
    }>
  >;
  toggleTag: (tag: string) => void;
  REASON_TAGS: string[];
  theme: {colors: {background: string; foreground: string; muted: string}};

  // NEW (tiny) wiring
  apiBaseUrl?: string; // e.g. 'http://localhost:3001/api'
  userId?: string; // auth/user id
  requestId?: string | null; // generation request_id (if you have it)
  outfitId?: string | null; // optional explicit outfit_id
  outfitItemIds?: string[]; // the 2–3 item ids in the shown outfit
};

export default function OutfitFeedbackModal({
  visible,
  onClose,
  feedbackData,
  setFeedbackData,
  toggleTag,
  REASON_TAGS,
  // theme,
  apiBaseUrl,
  userId,
  requestId,
  outfitId,
  outfitItemIds,
}: Props) {
  const globalStyles = useGlobalStyles();
  const {theme} = useAppTheme();

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
      paddingVertical: 30,
      backgroundColor: theme.colors.surface,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 14,
      textAlign: 'center',
    },
    subtext: {fontSize: 15, textAlign: 'center', fontWeight: '400'},
    thumbRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginVertical: 14,
    },
    input: {
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.foreground,
      borderRadius: 10,
      paddingVertical: 16,
      paddingHorizontal: 12,
      width: '90%',
      color: theme.colors.foreground,
      fontSize: 16,
      fontWeight: '400',
      marginBottom: 14,
    },
    closeBtn: {
      marginTop: 4,
      alignSelf: 'center',
      paddingVertical: 12,
      paddingHorizontal: 34,
      backgroundColor: theme.colors.button1,
      borderRadius: tokens.borderRadius.md,
    },
    closeText: {color: theme.colors.foreground, fontWeight: '600'},
  });

  const storeFeedback = async () => {
    const entry = {
      timestamp: Date.now(),
      feedback: feedbackData.feedback,
      tags: feedbackData.tags,
      reason: feedbackData.reason,
      user_id: userId,
      request_id: requestId,
      outfit_id: outfitId ?? (outfitItemIds?.join('_') || 'active'),
      item_ids: outfitItemIds ?? [],
    };
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(entry);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {
      console.error('Failed to save feedback:', e);
    }
  };

  const postFeedback = async () => {
    // Only post if we have the basics
    if (
      !apiBaseUrl ||
      !userId ||
      !feedbackData.feedback ||
      !(outfitItemIds && outfitItemIds.length)
    )
      return;

    const payload = {
      user_id: userId,
      outfit_id: outfitId ?? requestId ?? 'active',
      rating: feedbackData.feedback, // 'like' | 'dislike'
      item_ids: outfitItemIds, // simple per-item learning
      notes: feedbackData.reason || undefined,
      // request_id: requestId,                // uncomment if your backend accepts it
      // tags: feedbackData.tags,              // uncomment if your backend accepts it
    };

    try {
      await fetch(`${apiBaseUrl}/feedback/rate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('Feedback POST failed:', e);
    }
  };

  const handleDone = async () => {
    if (feedbackData.feedback) {
      await storeFeedback(); // local log (always)
      await postFeedback(); // fire-and-forget to backend (when wired)
    }
    setFeedbackData({feedback: null, tags: [], reason: ''});
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, {borderRadius: tokens.borderRadius.xl}]}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.foreground,
              },
            ]}>
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
                size={38}
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
              <View style={{marginLeft: 16}}>
                <MaterialIcons
                  name="thumb-down"
                  size={38}
                  color={feedbackData.feedback === 'dislike' ? 'red' : 'gray'}
                />
              </View>
            </TouchableOpacity>
          </View>

          {feedbackData.feedback && (
            <>
              <Text
                style={[
                  styles.subtext,
                  {
                    color: theme.colors.foreground,
                    marginBottom: 16,
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
                  marginBottom: 12,
                }}>
                {REASON_TAGS.map(tag => {
                  const selected = feedbackData.tags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={{
                        borderColor: selected
                          ? theme.colors.surfaceBorder
                          : '#999',
                        borderWidth: 1,
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        backgroundColor: selected ? 'grey' : 'black',
                        marginBottom: 10,
                        marginRight: 8,
                      }}>
                      <Text style={{color: theme.colors.buttonText1}}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: -5,
                }}>
                <TextInput
                  placeholder="Add any comments or suggestions..."
                  placeholderTextColor={theme.colors.muted}
                  value={feedbackData.reason}
                  onChangeText={text =>
                    setFeedbackData(prev => ({...prev, reason: text}))
                  }
                  style={[styles.input]}
                  multiline
                />
              </View>
            </>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={handleDone}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

///////////////////

// import React from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   TouchableOpacity,
//   TextInput,
//   StyleSheet,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const STORAGE_KEY = 'outfit_feedback_logs';

// type FeedbackType = 'like' | 'dislike' | null;

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   feedbackData: {
//     feedback: FeedbackType;
//     tags: string[];
//     reason: string;
//   };
//   setFeedbackData: React.Dispatch<
//     React.SetStateAction<{
//       feedback: FeedbackType;
//       tags: string[];
//       reason: string;
//     }>
//   >;
//   toggleTag: (tag: string) => void;
//   REASON_TAGS: string[];
//   theme: {
//     colors: {
//       background: string;
//       foreground: string;
//       muted: string;
//     };
//   };
// };

// export default function OutfitFeedbackModal({
//   visible,
//   onClose,
//   feedbackData,
//   setFeedbackData,
//   toggleTag,
//   REASON_TAGS,
//   theme,
// }: Props) {
//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 20,
//     },
//     modal: {
//       width: '100%',
//       borderRadius: 16,
//       padding: 20,
//     },
//     title: {
//       fontSize: 18,
//       fontWeight: '600',
//       marginBottom: 10,
//       textAlign: 'center',
//     },
//     subtext: {
//       fontSize: 14,
//       textAlign: 'center',
//     },
//     thumbRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       gap: 20,
//       marginVertical: 16,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: '#ccc',
//       borderRadius: 10,
//       padding: 10,
//       width: '100%',
//       color: theme.colors.foreground,
//       marginTop: 12,
//     },
//     closeBtn: {
//       marginTop: 20,
//       alignSelf: 'center',
//       paddingVertical: 8,
//       paddingHorizontal: 20,
//       backgroundColor: '#007AFF',
//       borderRadius: 8,
//     },
//     closeText: {
//       color: 'white',
//       fontWeight: '600',
//     },
//   });

//   const storeFeedback = async () => {
//     const feedbackEntry = {
//       timestamp: Date.now(),
//       feedback: feedbackData.feedback,
//       tags: feedbackData.tags,
//       reason: feedbackData.reason,
//     };
//     try {
//       const existing = await AsyncStorage.getItem(STORAGE_KEY);
//       const parsed = existing ? JSON.parse(existing) : [];
//       parsed.push(feedbackEntry);
//       await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
//     } catch (e) {
//       console.error('Failed to save feedback:', e);
//     }
//   };

//   const handleDone = async () => {
//     if (feedbackData.feedback) {
//       await storeFeedback();
//     }
//     setFeedbackData({feedback: null, tags: [], reason: ''});
//     onClose();
//   };

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={styles.overlay}>
//         <View
//           style={[styles.modal, {backgroundColor: theme.colors.background}]}>
//           <Text style={[styles.title, {color: theme.colors.foreground}]}>
//             Rate this outfit
//           </Text>

//           <Text style={[styles.subtext, {color: theme.colors.foreground}]}>
//             What did you think of this outfit?
//           </Text>

//           <View style={styles.thumbRow}>
//             <TouchableOpacity
//               onPress={() =>
//                 setFeedbackData(prev => ({
//                   ...prev,
//                   feedback: prev.feedback === 'like' ? null : 'like',
//                 }))
//               }>
//               <MaterialIcons
//                 name="thumb-up"
//                 size={30}
//                 color={feedbackData.feedback === 'like' ? 'green' : 'gray'}
//               />
//             </TouchableOpacity>
//             <TouchableOpacity
//               onPress={() =>
//                 setFeedbackData(prev => ({
//                   ...prev,
//                   feedback: prev.feedback === 'dislike' ? null : 'dislike',
//                 }))
//               }>
//               <MaterialIcons
//                 name="thumb-down"
//                 size={30}
//                 color={feedbackData.feedback === 'dislike' ? 'red' : 'gray'}
//               />
//             </TouchableOpacity>
//           </View>

//           {feedbackData.feedback && (
//             <>
//               <Text
//                 style={[
//                   styles.subtext,
//                   {
//                     color: theme.colors.foreground,
//                     marginTop: 8,
//                     marginBottom: 8,
//                   },
//                 ]}>
//                 Why did you{' '}
//                 {feedbackData.feedback === 'like' ? 'like' : 'dislike'} it?
//               </Text>

//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'center',

//                   marginBottom: 12,
//                 }}>
//                 {REASON_TAGS.map(tag => {
//                   const selected = feedbackData.tags.includes(tag);
//                   return (
//                     <TouchableOpacity
//                       key={tag}
//                       onPress={() => toggleTag(tag)}
//                       style={{
//                         borderColor: selected ? '#333' : '#999',
//                         borderWidth: 1,
//                         borderRadius: 20,
//                         paddingHorizontal: 12,
//                         paddingVertical: 6,
//                         backgroundColor: selected ? 'grey' : 'black',
//                         marginBottom: 8,
//                         marginRight: 8,
//                       }}>
//                       <Text style={{color: theme.colors.foreground}}>
//                         {tag}
//                       </Text>
//                     </TouchableOpacity>
//                   );
//                 })}
//               </View>

//               <TextInput
//                 placeholder="Add any comments or suggestions..."
//                 placeholderTextColor={theme.colors.muted}
//                 value={feedbackData.reason}
//                 onChangeText={text =>
//                   setFeedbackData(prev => ({...prev, reason: text}))
//                 }
//                 style={styles.input}
//                 multiline
//               />
//             </>
//           )}

//           <TouchableOpacity style={styles.closeBtn} onPress={handleDone}>
//             <Text style={styles.closeText}>Done</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }
