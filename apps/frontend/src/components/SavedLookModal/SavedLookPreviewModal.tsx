// components/SavedLookModal/SavedLookPreviewModal.tsx
import React from 'react';
import {Modal, View, Image, Text, StyleSheet, Alert} from 'react-native';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {tokens} from '../../styles/tokens/tokens';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {API_BASE_URL} from '../../config/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  look: {id: string; name: string; image_url: string} | null;
};

export default function SavedLookPreviewModal({visible, onClose, look}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/saved-looks/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Delete failed:', data);
        throw new Error(data?.message || 'Failed to delete saved look');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['savedOutfits']});
      onClose();
    },
    onError: (err: any) => {
      Alert.alert(
        'Error',
        err?.message || 'Could not delete the saved look. Please try again.',
      );
    },
  });

  const handleDelete = () => {
    if (!look?.id) {
      Alert.alert('Error', 'Look ID is missing — cannot delete.');
      return;
    }
    Alert.alert(
      'Delete Saved Look',
      'Are you sure you want to delete this saved look?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(look.id),
        },
      ],
    );
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    image: {
      width: '100%',
      height: undefined,
      aspectRatio: 3 / 4,
      borderRadius: 12,
      marginBottom: 12,
    },
    name: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginTop: 12,
      textAlign: 'center',
    },
    url: {
      fontSize: 12,
      color: theme.colors.foreground2,
      marginTop: 4,
      textAlign: 'center',
    },
    button: {
      marginTop: 16,
      backgroundColor: theme.colors.button1,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    deleteButton: {
      marginTop: 16,
      backgroundColor: theme.colors.error || '#D32F2F',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
  });

  if (!look) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            globalStyles.cardStyles1,
            {
              width: '90%',
              borderRadius: tokens.borderRadius['2xl'],
              alignItems: 'center',
              borderColor: theme.colors.surfaceBorder,
            },
          ]}>
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 18,
              paddingHorizontal: 6,
            }}>
            <Image
              source={{uri: look.image_url}}
              style={styles.image}
              resizeMode="contain"
            />
            <Text style={styles.name}>{look.name}</Text>
            <Text style={styles.url} numberOfLines={1}>
              {look.image_url}
            </Text>

            <View
              style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              {/* ✅ Close Button (resets on press) */}
              {/* ✅ Close Button */}
              <View>
                <AppleTouchFeedback
                  hapticStyle="impactLight"
                  onPress={onClose}
                  style={[styles.button]}>
                  <Text style={styles.buttonText}>Close</Text>
                </AppleTouchFeedback>
              </View>

              {/* 🗑️ Delete Button */}
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={handleDelete}
                style={[styles.deleteButton, {marginLeft: 40}]}>
                <Text style={styles.buttonText}>
                  {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
                </Text>
              </AppleTouchFeedback>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/////////////////////

// // components/SavedLookModal/SavedLookPreviewModal.tsx
// import React from 'react';
// import {Modal, View, Image, Text, StyleSheet, Alert} from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useMutation, useQueryClient} from '@tanstack/react-query';
// import {API_BASE_URL} from '../../config/api';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   look: {id: string; name: string; image_url: string} | null;
// };

// export default function SavedLookPreviewModal({visible, onClose, look}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       const res = await fetch(`${API_BASE_URL}/saved-looks/${id}`, {
//         method: 'DELETE',
//       });
//       const data = await res.json().catch(() => ({}));
//       if (!res.ok) {
//         console.error('Delete failed:', data);
//         throw new Error(data?.message || 'Failed to delete saved look');
//       }
//       return data;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['savedOutfits']});
//       onClose();
//     },
//     onError: (err: any) => {
//       Alert.alert(
//         'Error',
//         err?.message || 'Could not delete the saved look. Please try again.',
//       );
//     },
//   });

//   const handleDelete = () => {
//     if (!look?.id) {
//       Alert.alert('Error', 'Look ID is missing — cannot delete.');
//       return;
//     }
//     Alert.alert(
//       'Delete Saved Look',
//       'Are you sure you want to delete this saved look?',
//       [
//         {text: 'Cancel', style: 'cancel'},
//         {
//           text: 'Delete',
//           style: 'destructive',
//           onPress: () => deleteMutation.mutate(look.id),
//         },
//       ],
//     );
//   };

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.7)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 20,
//     },
//     image: {
//       width: '100%',
//       height: undefined,
//       aspectRatio: 3 / 4,
//       borderRadius: 12,
//       marginBottom: 12,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginTop: 12,
//       textAlign: 'center',
//     },
//     url: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       marginTop: 4,
//       textAlign: 'center',
//     },
//     button: {
//       marginTop: 16,
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 10,
//       paddingHorizontal: 20,
//       borderRadius: 8,
//     },
//     deleteButton: {
//       marginTop: 16,
//       backgroundColor: theme.colors.error || '#D32F2F',
//       paddingVertical: 10,
//       paddingHorizontal: 20,
//       borderRadius: 8,
//     },
//     buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
//   });

//   if (!look) return null;

//   return (
//     <Modal visible={visible} transparent animationType="fade">
//       <View style={styles.overlay}>
//         <View
//           style={[
//             globalStyles.cardStyles1,
//             {
//               width: '90%',
//               borderRadius: tokens.borderRadius['2xl'],
//               alignItems: 'center',
//               borderColor: theme.colors.surfaceBorder,
//             },
//           ]}>
//           <View
//             style={{
//               alignItems: 'center',
//               paddingVertical: 18,
//               paddingHorizontal: 6,
//             }}>
//             <Image
//               source={{uri: look.image_url}}
//               style={styles.image}
//               resizeMode="contain"
//             />
//             <Text style={styles.name}>{look.name}</Text>
//             <Text style={styles.url} numberOfLines={1}>
//               {look.image_url}
//             </Text>

//             <View
//               style={{flexDirection: 'row', justifyContent: 'space-between'}}>
//               {/* ✅ Close Button (resets on press) */}
//               {/* ✅ Close Button */}
//               <View>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={onClose}
//                   style={[styles.button]}>
//                   <Text style={styles.buttonText}>Close</Text>
//                 </AppleTouchFeedback>
//               </View>

//               {/* 🗑️ Delete Button */}
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={handleDelete}
//                 style={[styles.deleteButton, {marginLeft: 40}]}>
//                 <Text style={styles.buttonText}>
//                   {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
//                 </Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// }

///////////////////

// // components/SavedLookModal/SavedLookPreviewModal.tsx
// import React from 'react';
// import {Modal, View, Image, Text, StyleSheet, Alert} from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useMutation, useQueryClient} from '@tanstack/react-query';
// import {API_BASE_URL} from '../../config/api';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   look: {id: string; name: string; image_url: string} | null;
// };

// export default function SavedLookPreviewModal({visible, onClose, look}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       const res = await fetch(`${API_BASE_URL}/saved-looks/${id}`, {
//         method: 'DELETE',
//       });
//       const data = await res.json().catch(() => ({}));
//       if (!res.ok) {
//         console.error('Delete failed:', data);
//         throw new Error(data?.message || 'Failed to delete saved look');
//       }
//       return data;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({queryKey: ['savedOutfits']});
//       onClose();
//     },
//     onError: (err: any) => {
//       Alert.alert(
//         'Error',
//         err?.message || 'Could not delete the saved look. Please try again.',
//       );
//     },
//   });

//   const handleDelete = () => {
//     if (!look?.id) {
//       Alert.alert('Error', 'Look ID is missing — cannot delete.');
//       return;
//     }
//     Alert.alert(
//       'Delete Saved Look',
//       'Are you sure you want to delete this saved look?',
//       [
//         {text: 'Cancel', style: 'cancel'},
//         {
//           text: 'Delete',
//           style: 'destructive',
//           onPress: () => deleteMutation.mutate(look.id),
//         },
//       ],
//     );
//   };

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.7)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 20,
//     },
//     image: {
//       width: '100%',
//       height: undefined,
//       aspectRatio: 3 / 4,
//       borderRadius: 12,
//       marginBottom: 12,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginTop: 12,
//       textAlign: 'center',
//     },
//     url: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       marginTop: 4,
//       textAlign: 'center',
//     },
//     button: {
//       marginTop: 16,
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 10,
//       paddingHorizontal: 20,
//       borderRadius: 8,
//     },
//     deleteButton: {
//       marginTop: 10,
//       backgroundColor: theme.colors.danger || '#D32F2F',
//       paddingVertical: 10,
//       paddingHorizontal: 20,
//       borderRadius: 8,
//     },
//     buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
//   });

//   if (!look) return null;

//   return (
//     <Modal visible={visible} transparent animationType="fade">
//       <View style={styles.overlay}>
//         <View
//           style={[
//             globalStyles.cardStyles1,
//             {
//               width: '90%',
//               borderRadius: tokens.borderRadius['2xl'],
//               alignItems: 'center',
//               borderColor: theme.colors.surfaceBorder,
//             },
//           ]}>
//           <View
//             style={{
//               alignItems: 'center',
//               paddingVertical: 18,
//               paddingHorizontal: 6,
//             }}>
//             <Image
//               source={{uri: look.image_url}}
//               style={styles.image}
//               resizeMode="contain"
//             />
//             <Text style={styles.name}>{look.name}</Text>
//             <Text style={styles.url} numberOfLines={1}>
//               {look.image_url}
//             </Text>

//             {/* ✅ Close Button */}
//             <View style={{marginBottom: -4}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={onClose}
//                 style={[styles.button]}>
//                 <Text style={styles.buttonText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>

//             {/* 🗑️ Delete Button */}
//             <AppleTouchFeedback
//               hapticStyle="impactLight"
//               onPress={handleDelete}
//               style={[styles.deleteButton]}>
//               <Text style={styles.buttonText}>
//                 {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
//               </Text>
//             </AppleTouchFeedback>
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// }

////////////////

// // components/SavedLookModal/SavedLookPreviewModal.tsx
// import React from 'react';
// import {Modal, View, Image, Text, StyleSheet} from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   look: {name: string; image_url: string} | null;
// };

// export default function SavedLookPreviewModal({visible, onClose, look}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.7)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 20,
//     },
//     image: {
//       width: '100%',
//       height: undefined,
//       aspectRatio: 3 / 4,
//       borderRadius: 12,
//       marginBottom: 12,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginTop: 12,
//       textAlign: 'center',
//     },
//     url: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       marginTop: 4,
//       textAlign: 'center',
//     },
//     button: {
//       marginTop: 16,
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 10,
//       paddingHorizontal: 20,
//       borderRadius: 8,
//     },
//     buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
//   });

//   if (!look) return null;

//   return (
//     <Modal visible={visible} transparent animationType="fade">
//       <View style={styles.overlay}>
//         <View
//           style={[
//             globalStyles.cardStyles1,
//             {
//               width: '90%',
//               borderRadius: tokens.borderRadius['2xl'],
//               alignItems: 'center',
//               borderColor: theme.colors.surfaceBorder,
//             },
//           ]}>
//           <View
//             style={{
//               alignItems: 'center',
//               paddingVertical: 18,
//               paddingHorizontal: 6,
//             }}>
//             <Image
//               source={{uri: look.image_url}}
//               style={styles.image}
//               resizeMode="contain"
//             />
//             <Text style={styles.name}>{look.name}</Text>
//             <Text style={styles.url} numberOfLines={1}>
//               {look.image_url}
//             </Text>

//             {/* ✅ light haptic on close */}
//             <View style={{marginBottom: -4}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={onClose}
//                 style={[styles.button]}>
//                 <Text style={styles.buttonText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// }

/////////////////

// // components/SavedLookModal/SavedLookPreviewModal.tsx
// import React from 'react';
// import {Modal, View, Image, Text, StyleSheet} from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   look: {name: string; image_url: string} | null;
// };

// export default function SavedLookPreviewModal({visible, onClose, look}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.7)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       padding: 20,
//     },
//     image: {
//       width: '100%',
//       height: undefined,
//       aspectRatio: 3 / 4,
//       borderRadius: 12,
//       marginBottom: 12,
//     },
//     name: {
//       fontSize: 18,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginTop: 12,
//       textAlign: 'center',
//     },
//     url: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       marginTop: 4,
//       textAlign: 'center',
//     },
//     button: {
//       marginTop: 16,
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 10,
//       paddingHorizontal: 20,
//       borderRadius: 8,
//     },
//     buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
//   });

//   if (!look) return null;

//   return (
//     <Modal visible={visible} transparent animationType="fade">
//       <View style={styles.overlay}>
//         <View
//           style={[
//             globalStyles.cardStyles1,
//             {
//               width: '90%',
//               borderRadius: tokens.borderRadius['2xl'],
//               alignItems: 'center',
//               borderColor: theme.colors.surfaceBorder,
//             },
//           ]}>
//           <View
//             style={{
//               alignItems: 'center',
//               paddingVertical: 18,
//               paddingHorizontal: 6,
//             }}>
//             <Image
//               source={{uri: look.image_url}}
//               style={styles.image}
//               resizeMode="contain"
//             />
//             <Text style={styles.name}>{look.name}</Text>
//             <Text style={styles.url} numberOfLines={1}>
//               {look.image_url}
//             </Text>

//             {/* ✅ light haptic on close */}
//             <View style={{marginBottom: -4}}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={onClose}
//                 style={[styles.button]}>
//                 <Text style={styles.buttonText}>Close</Text>
//               </AppleTouchFeedback>
//             </View>
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// }
