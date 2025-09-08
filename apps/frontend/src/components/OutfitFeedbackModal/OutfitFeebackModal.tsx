// OutfitFeedbackModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'outfit_feedback_logs';

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
  // New props for structured submission
  userId: string;
  topId?: string;
  bottomId?: string;
  shoesId?: string;
};

export default function OutfitFeedbackModal({
  visible,
  onClose,
  feedbackData,
  setFeedbackData,
  toggleTag,
  REASON_TAGS,
  theme,
  userId,
  topId,
  bottomId,
  shoesId,
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
    tagChip: {
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginBottom: 8,
      marginRight: 8,
    },
    tagWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginBottom: 12,
    },
  });

  // Legacy local log fallback (used only if network fails)
  const storeFeedbackLocal = async () => {
    const feedbackEntry = {
      timestamp: Date.now(),
      feedback: feedbackData.feedback,
      tags: feedbackData.tags,
      reason: feedbackData.reason,
    };
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(feedbackEntry);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {
      console.error('Failed to save feedback locally:', e);
    }
  };

  const handleDone = async () => {
    if (feedbackData.feedback) {
      const payload = {
        user_id: userId,
        outfit_id:
          `${topId ?? ''}:${bottomId ?? ''}:${shoesId ?? ''}` || 'ad-hoc',
        rating: feedbackData.feedback,
        notes: JSON.stringify({
          reason: feedbackData.reason,
          tags: feedbackData.tags,
          selected_item_ids: {
            top: topId,
            bottom: bottomId,
            shoes: shoesId,
          },
        }),
      };

      try {
        const API =
          Platform.OS === 'android'
            ? 'http://10.0.2.2:3001/api'
            : 'http://localhost:3001/api';

        const res = await fetch(`${API}/feedback/rate`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        });

        const j = await res.json().catch(() => ({}));
        console.log('✅ Feedback POST', res.status, j);
      } catch (err) {
        console.warn('❌ Feedback POST failed, storing local', err);
        await storeFeedbackLocal();
      }
    }
    setFeedbackData({feedback: null, tags: [], reason: ''});
    onClose();
  };

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

              <View style={styles.tagWrap}>
                {REASON_TAGS.map(tag => {
                  const selected = feedbackData.tags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[
                        styles.tagChip,
                        {
                          borderColor: selected ? '#333' : '#999',
                          backgroundColor: selected ? 'grey' : 'black',
                        },
                      ]}>
                      <Text style={{color: theme.colors.foreground}}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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

          <TouchableOpacity style={styles.closeBtn} onPress={handleDone}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

///////////////////

// // OutfitFeedbackModal.tsx
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
//   /** Optional: handled by parent for structured learning.
//    *  If omitted, this component falls back to local AsyncStorage logging. */
//   onSubmit?: (data: {
//     feedback: Exclude<FeedbackType, null>;
//     tags: string[];
//     reason: string;
//   }) => Promise<void> | void;
// };

// export default function OutfitFeedbackModal({
//   visible,
//   onClose,
//   feedbackData,
//   setFeedbackData,
//   toggleTag,
//   REASON_TAGS,
//   theme,
//   onSubmit,
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
//     tagChip: {
//       borderWidth: 1,
//       borderRadius: 20,
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       marginBottom: 8,
//       marginRight: 8,
//     },
//     tagWrap: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'center',
//       marginBottom: 12,
//     },
//   });

//   // Legacy local log fallback (used only if parent doesn't provide onSubmit)
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
//       if (onSubmit) {
//         await onSubmit({
//           feedback: feedbackData.feedback,
//           tags: feedbackData.tags,
//           reason: feedbackData.reason,
//         });
//       } else {
//         await storeFeedback(); // fallback (local only)
//       }
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

//               <View style={styles.tagWrap}>
//                 {REASON_TAGS.map(tag => {
//                   const selected = feedbackData.tags.includes(tag);
//                   return (
//                     <TouchableOpacity
//                       key={tag}
//                       onPress={() => toggleTag(tag)}
//                       style={[
//                         styles.tagChip,
//                         {
//                           borderColor: selected ? '#333' : '#999',
//                           backgroundColor: selected ? 'grey' : 'black',
//                         },
//                       ]}>
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

///////////////////////

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

/////////////////////

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
