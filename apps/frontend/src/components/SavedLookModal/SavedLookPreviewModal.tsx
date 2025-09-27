import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Image,
  Text,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
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

  // ✅ local editable state for name
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (look) setNewName(look.name || '');
  }, [look]);

  // 🗑️ DELETE mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/saved-looks/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || 'Failed to delete saved look');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['savedOutfits']});
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not delete the saved look.');
    },
  });

  // ✏️ UPDATE mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!look?.id) throw new Error('Missing look ID');
      const res = await fetch(`${API_BASE_URL}/saved-looks/${look.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: newName}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || 'Failed to update look name');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['savedOutfits']});
      Alert.alert('✅ Updated', 'Look name updated successfully.');
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not update the saved look.');
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
    nameInput: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginTop: 12,
      textAlign: 'center',
      paddingVertical: 8,
      width: '80%',
      borderWidth: theme.borderWidth.hairline,
      borderColor: theme.colors.buttonText1,
      paddingHorizontal: 20,
      marginBottom: 12,
      borderRadius: tokens.borderRadius.sm,
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
    saveButton: {
      marginTop: 12,
      backgroundColor: theme.colors.button1 || '#a704ffff',
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

            {/* ✏️ Editable name field */}
            <TextInput
              style={[styles.nameInput]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter look name"
              placeholderTextColor={theme.colors.foreground2}
            />

            <Text style={styles.url} numberOfLines={1}>
              {look.image_url}
            </Text>

            {/* 💾 Save Changes Button */}
            <AppleTouchFeedback
              hapticStyle="impactLight"
              onPress={() => updateMutation.mutate()}
              style={[styles.saveButton]}>
              <Text style={styles.buttonText}>
                {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
              </Text>
            </AppleTouchFeedback>

            <View
              style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              {/* ✅ Close Button */}
              <View>
                <AppleTouchFeedback
                  hapticStyle="impactLight"
                  onPress={onClose}
                  style={[
                    styles.button,
                    {
                      backgroundColor: theme.colors.surface3,
                      paddingHorizontal: 25.0,
                    },
                  ]}>
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

/////////////////

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
