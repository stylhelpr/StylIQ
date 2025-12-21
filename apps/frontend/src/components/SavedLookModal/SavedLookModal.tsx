import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import {useUUID} from '../../context/UUIDContext';
import {API_BASE_URL} from '../../config/api';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useQueryClient} from '@tanstack/react-query';
import * as ImagePicker from 'react-native-image-picker';
import {uploadImageToGCS} from '../../api/uploadImageToGCS';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
};

const h = (type: string) =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

export default function SaveLookModal({visible, onClose, onSave}: Props) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const userId = useUUID();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!visible) {
      setUrl('');
      setName('');
      setPreview(null);
    }
  }, [visible]);

  const handleUpload = async () => {
    h('impactLight');
    const result = await ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
    });

    if (result?.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.uri) {
        setUrl(asset.uri);
        setPreview(asset.uri);
      }
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    if (!url || !userId) return;
    h('impactMedium');

    try {
      setUploading(true);

      // Upload local file to GCS first to get a public URL
      let imageUrl = url;

      if (url.startsWith('file://') || url.startsWith('ph://') || url.startsWith('assets-library://')) {
        console.log('📤 Uploading local image to GCS...');
        const filename = `saved-look-${Date.now()}.jpg`;
        const userIdStr = typeof userId === 'string' ? userId : (userId as any)?.uuid || String(userId);
        const uploadResult = await uploadImageToGCS({
          localUri: url,
          filename,
          userId: userIdStr,
        });
        imageUrl = uploadResult.publicUrl;
        console.log('✅ Uploaded to GCS:', imageUrl);
      }

      const res = await fetch(`${API_BASE_URL}/saved-looks`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          image_url: imageUrl,
          name: name || 'Saved Look',
        }),
      });

      const data = await res.json();
      console.log('✅ Saved look:', data);

      h('notificationSuccess');
      queryClient.invalidateQueries({queryKey: ['savedOutfits']});

      setUrl('');
      setName('');
      setPreview(null);
      onSave?.();
      onClose();
    } catch (err) {
      console.error('❌ Failed to save look:', err);
      h('notificationError');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    h('selection');
    setUrl('');
    setName('');
    setPreview(null);
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    card: {
      width: '85%',
      backgroundColor: theme.colors.surface,
      paddingVertical: 36,
      paddingHorizontal: 22,
      borderRadius: tokens.borderRadius['2xl'],
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 14,
      textAlign: 'center',
      color: theme.colors.foreground,
    },
    description: {
      paddingHorizontal: 1,
      marginBottom: 17,
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
      textAlign: 'center',
      lineHeight: 21,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.inputText1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
      fontSize: 16,
      color: theme.colors.foreground,
    },
    primaryButton: {
      backgroundColor: theme.colors.button1 || '#990affff',
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: {width: 0, height: 4},
      elevation: 3,
      marginTop: 20,
    },
    primaryButtonText: {
      color: theme.colors.buttonText1,
      fontSize: 17,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    secondaryButton: {
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      marginTop: 12,
      backgroundColor: 'transparent',
    },
    secondaryButtonText: {
      color: theme.colors.buttonText1 || '#007AFF',
      fontSize: 17,
      fontWeight: '500',
    },
    uploadButton: {
      backgroundColor: theme.colors.button4 || '#E5E5EA',
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: {width: 0, height: 3},
      elevation: 2,
      marginTop: 10,
    },
    uploadButtonText: {
      color: theme.colors.buttonText1 || '#ffffffff',
      fontSize: 17,
      fontWeight: '600',
    },
    preview: {
      width: '100%',
      height: 180,
      borderRadius: 14,
      marginBottom: 14,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.card, globalStyles.cardStyles1]}>
          <Text style={styles.title}>Save a Look</Text>

          <Text style={styles.description}>
            Find any image online, press and hold it, and tap “Copy” — then
            paste it into the Image Address below. You can also take a
            screenshot, or press and hold the image and tap “Save to Photos”,
            then tap “Upload from Camera Roll” to add it here.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Name (optional)"
            placeholderTextColor={theme.colors.muted}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Image Address"
            placeholderTextColor={theme.colors.muted}
            value={url}
            onChangeText={setUrl}
          />

          {/* 🖼️ Preview if selected */}
          {preview && <Image source={{uri: preview}} style={styles.preview} />}

          {/* 📸 Upload Button — now styled as a full Apple-level button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              globalStyles.buttonPrimary,
              {
                marginBottom: 10,
                backgroundColor: theme.colors.button4,
                marginTop: 2,
              },
            ]}
            onPress={handleUpload}>
            <Text
              style={{
                color: theme.colors.buttonText1,
                fontSize: 15,
                fontWeight: '600',
              }}>
              Upload from Camera Roll
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            style={[globalStyles.buttonPrimary, {marginBottom: 10}, (uploading || !url) && {opacity: 0.6}]}
            disabled={!url || uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.buttonText1} />
            ) : (
              <Text
                style={{
                  color: theme.colors.buttonText1,
                  fontSize: 15,
                  fontWeight: '600',
                }}>
                Save
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCancel}
            style={[
              globalStyles.buttonPrimary,
              {backgroundColor: theme.colors.surface3},
            ]}>
            <Text
              style={{
                color: theme.colors.foreground,
                fontSize: 15,
                fontWeight: '600',
              }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   TextInput,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useQueryClient} from '@tanstack/react-query';
// import * as ImagePicker from 'react-native-image-picker';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SaveLookModal({visible, onClose}: Props) {
//   const [url, setUrl] = useState('');
//   const [name, setName] = useState('');
//   const [preview, setPreview] = useState<string | null>(null);
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     if (!visible) {
//       setUrl('');
//       setName('');
//       setPreview(null);
//     }
//   }, [visible]);

//   const handleUpload = async () => {
//     h('impactLight');
//     const result = await ImagePicker.launchImageLibrary({
//       mediaType: 'photo',
//       quality: 0.9,
//     });

//     if (result?.assets && result.assets.length > 0) {
//       const asset = result.assets[0];
//       if (asset.uri) {
//         setUrl(asset.uri);
//         setPreview(asset.uri);
//       }
//     }
//   };

//   const handleSave = async () => {
//     if (!url || !userId) return;
//     h('impactMedium');

//     try {
//       const res = await fetch(`${API_BASE_URL}/saved-looks`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: url,
//           name: name || 'Saved Look',
//         }),
//       });

//       const data = await res.json();
//       console.log('✅ Saved look:', data);

//       h('notificationSuccess');
//       queryClient.invalidateQueries({queryKey: ['savedOutfits']});

//       setUrl('');
//       setName('');
//       setPreview(null);
//       onClose();
//     } catch (err) {
//       console.error('❌ Failed to save look:', err);
//       h('notificationError');
//     }
//   };

//   const handleCancel = () => {
//     h('selection');
//     setUrl('');
//     setName('');
//     setPreview(null);
//     onClose();
//   };

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.6)',
//     },
//     card: {
//       width: '85%',
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 36,
//       paddingHorizontal: 22,
//       borderRadius: tokens.borderRadius['2xl'],
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '800',
//       marginBottom: 14,
//       textAlign: 'center',
//       color: theme.colors.foreground,
//     },
//     description: {
//       paddingHorizontal: 1,
//       marginBottom: 17,
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       lineHeight: 21,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.inputText1,
//       borderRadius: 10,
//       padding: 12,
//       marginBottom: 14,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     primaryButton: {
//       backgroundColor: theme.colors.button1 || '#990affff',
//       paddingVertical: 14,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 8,
//       shadowOffset: {width: 0, height: 4},
//       elevation: 3,
//       marginTop: 20,
//     },
//     primaryButtonText: {
//       color: theme.colors.buttonText1,
//       fontSize: 17,
//       fontWeight: '600',
//       letterSpacing: 0.2,
//     },
//     secondaryButton: {
//       paddingVertical: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 14,
//       marginTop: 12,
//       backgroundColor: 'transparent',
//     },
//     secondaryButtonText: {
//       color: theme.colors.buttonText1 || '#007AFF',
//       fontSize: 17,
//       fontWeight: '500',
//     },
//     uploadButton: {
//       backgroundColor: theme.colors.button4 || '#E5E5EA',
//       paddingVertical: 14,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.12,
//       shadowRadius: 6,
//       shadowOffset: {width: 0, height: 3},
//       elevation: 2,
//       marginTop: 10,
//     },
//     uploadButtonText: {
//       color: theme.colors.buttonText1 || '#ffffffff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     preview: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//       marginBottom: 14,
//     },
//   });

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={styles.overlay}>
//         <View style={[styles.card, globalStyles.cardStyles1]}>
//           <Text style={styles.title}>Save a Look</Text>

//           <Text style={styles.description}>
//             Find any image online, press and hold it, and tap “Copy” — then
//             paste it into the Image Address below. You can also take a
//             screenshot, or press and hold the image and tap “Save to Photos”,
//             then tap “Upload from Camera Roll” to add it here.
//           </Text>

//           <TextInput
//             style={styles.input}
//             placeholder="Name (optional)"
//             placeholderTextColor={theme.colors.muted}
//             value={name}
//             onChangeText={setName}
//           />

//           <TextInput
//             style={styles.input}
//             placeholder="Image Address"
//             placeholderTextColor={theme.colors.muted}
//             value={url}
//             onChangeText={setUrl}
//           />

//           {/* 🖼️ Preview if selected */}
//           {preview && <Image source={{uri: preview}} style={styles.preview} />}

//           {/* 📸 Upload Button — now styled as a full Apple-level button */}
//           <TouchableOpacity
//             activeOpacity={0.8}
//             style={[
//               globalStyles.buttonPrimary,
//               {
//                 marginBottom: 10,
//                 backgroundColor: theme.colors.button4,
//                 marginTop: 2,
//               },
//             ]}
//             onPress={handleUpload}>
//             <Text
//               style={{
//                 color: theme.colors.buttonText1,
//                 fontSize: 15,
//                 fontWeight: '600',
//               }}>
//               Upload from Camera Roll
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             activeOpacity={0.8}
//             onPress={handleSave}
//             // style={[styles.primaryButton, !url && {opacity: 0.5}]}
//             style={[globalStyles.buttonPrimary, {marginBottom: 10}]}
//             disabled={!url}>
//             <Text
//               style={{
//                 color: theme.colors.buttonText1,
//                 fontSize: 15,
//                 fontWeight: '600',
//               }}>
//               Save
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             activeOpacity={0.7}
//             onPress={handleCancel}
//             style={[
//               globalStyles.buttonPrimary,
//               {backgroundColor: theme.colors.surface3},
//             ]}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontSize: 15,
//                 fontWeight: '600',
//               }}>
//               Cancel
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }

///////////////

// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   TextInput,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useQueryClient} from '@tanstack/react-query';
// import * as ImagePicker from 'react-native-image-picker';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SaveLookModal({visible, onClose}: Props) {
//   const [url, setUrl] = useState('');
//   const [name, setName] = useState('');
//   const [preview, setPreview] = useState<string | null>(null);
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     if (!visible) {
//       setUrl('');
//       setName('');
//       setPreview(null);
//     }
//   }, [visible]);

//   const handleUpload = async () => {
//     h('impactLight');
//     const result = await ImagePicker.launchImageLibrary({
//       mediaType: 'photo',
//       quality: 0.9,
//     });

//     if (result?.assets && result.assets.length > 0) {
//       const asset = result.assets[0];
//       if (asset.uri) {
//         setUrl(asset.uri);
//         setPreview(asset.uri);
//       }
//     }
//   };

//   const handleSave = async () => {
//     if (!url || !userId) return;
//     h('impactMedium');

//     try {
//       const res = await fetch(`${API_BASE_URL}/saved-looks`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: url,
//           name: name || 'Saved Look',
//         }),
//       });

//       const data = await res.json();
//       console.log('✅ Saved look:', data);

//       h('notificationSuccess');
//       queryClient.invalidateQueries({queryKey: ['savedOutfits']});

//       setUrl('');
//       setName('');
//       setPreview(null);
//       onClose();
//     } catch (err) {
//       console.error('❌ Failed to save look:', err);
//       h('notificationError');
//     }
//   };

//   const handleCancel = () => {
//     h('selection');
//     setUrl('');
//     setName('');
//     setPreview(null);
//     onClose();
//   };

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.6)',
//     },
//     card: {
//       width: '85%',
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 36,
//       paddingHorizontal: 22,
//       borderRadius: tokens.borderRadius['2xl'],
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '800',
//       marginBottom: 14,
//       textAlign: 'center',
//       color: theme.colors.foreground,
//     },
//     description: {
//       paddingHorizontal: 1,
//       marginBottom: 17,
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       lineHeight: 21,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.inputText1,
//       borderRadius: 10,
//       padding: 12,
//       marginBottom: 14,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     primaryButton: {
//       backgroundColor: theme.colors.button1 || '#990affff',
//       paddingVertical: 14,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 8,
//       shadowOffset: {width: 0, height: 4},
//       elevation: 3,
//       marginTop: 20,
//     },
//     primaryButtonText: {
//       color: theme.colors.buttonText1,
//       fontSize: 17,
//       fontWeight: '600',
//       letterSpacing: 0.2,
//     },
//     secondaryButton: {
//       paddingVertical: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 14,
//       marginTop: 12,
//       backgroundColor: 'transparent',
//     },
//     secondaryButtonText: {
//       color: theme.colors.buttonText1 || '#007AFF',
//       fontSize: 17,
//       fontWeight: '500',
//     },
//     uploadButton: {
//       backgroundColor: theme.colors.button4 || '#E5E5EA',
//       paddingVertical: 14,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.12,
//       shadowRadius: 6,
//       shadowOffset: {width: 0, height: 3},
//       elevation: 2,
//       marginTop: 10,
//     },
//     uploadButtonText: {
//       color: theme.colors.buttonText1 || '#ffffffff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     preview: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//       marginBottom: 14,
//     },
//   });

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={styles.overlay}>
//         <View style={[styles.card, globalStyles.cardStyles1]}>
//           <Text style={styles.title}>Save a Look</Text>

//           <Text style={styles.description}>
//             Find any image online, press and hold it, and tap “Copy” — then
//             paste it into the Image Address below. You can also take a
//             screenshot, or press and hold the image and tap “Save to Photos”,
//             then tap “Upload from Camera Roll” to add it here.
//           </Text>

//           <TextInput
//             style={styles.input}
//             placeholder="Name (optional)"
//             placeholderTextColor={theme.colors.muted}
//             value={name}
//             onChangeText={setName}
//           />

//           <TextInput
//             style={styles.input}
//             placeholder="Image Address"
//             placeholderTextColor={theme.colors.muted}
//             value={url}
//             onChangeText={setUrl}
//           />

//           {/* 🖼️ Preview if selected */}
//           {preview && <Image source={{uri: preview}} style={styles.preview} />}

//           {/* 📸 Upload Button — now styled as a full Apple-level button */}
//           <TouchableOpacity
//             activeOpacity={0.8}
//             style={[
//               globalStyles.buttonPrimary,
//               {
//                 marginBottom: 16,
//                 backgroundColor: theme.colors.button4,
//                 marginTop: 2,
//               },
//             ]}
//             onPress={handleUpload}>
//             <Text style={{color: theme.colors.buttonText1}}>
//               Upload from Camera Roll
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             activeOpacity={0.8}
//             onPress={handleSave}
//             // style={[styles.primaryButton, !url && {opacity: 0.5}]}
//             style={[globalStyles.buttonPrimary, {marginBottom: 16}]}
//             disabled={!url}>
//             <Text style={{color: theme.colors.buttonText1}}>Save</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             activeOpacity={0.7}
//             onPress={handleCancel}
//             style={[
//               globalStyles.buttonPrimary,
//               {backgroundColor: theme.colors.surface3},
//             ]}>
//             <Text style={{color: theme.colors.foreground}}>Cancel</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }

//////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   TextInput,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useQueryClient} from '@tanstack/react-query';
// import * as ImagePicker from 'react-native-image-picker';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SaveLookModal({visible, onClose}: Props) {
//   const [url, setUrl] = useState('');
//   const [name, setName] = useState('');
//   const [preview, setPreview] = useState<string | null>(null);
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     if (!visible) {
//       setUrl('');
//       setName('');
//       setPreview(null);
//     }
//   }, [visible]);

//   const handleUpload = async () => {
//     h('impactLight');
//     const result = await ImagePicker.launchImageLibrary({
//       mediaType: 'photo',
//       quality: 0.9,
//     });

//     if (result?.assets && result.assets.length > 0) {
//       const asset = result.assets[0];
//       if (asset.uri) {
//         setUrl(asset.uri);
//         setPreview(asset.uri);
//       }
//     }
//   };

//   const handleSave = async () => {
//     if (!url || !userId) return;
//     h('impactMedium');

//     try {
//       const res = await fetch(`${API_BASE_URL}/saved-looks`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: url,
//           name: name || 'Saved Look',
//         }),
//       });

//       const data = await res.json();
//       console.log('✅ Saved look:', data);

//       h('notificationSuccess');
//       queryClient.invalidateQueries({queryKey: ['savedOutfits']});

//       setUrl('');
//       setName('');
//       setPreview(null);
//       onClose();
//     } catch (err) {
//       console.error('❌ Failed to save look:', err);
//       h('notificationError');
//     }
//   };

//   const handleCancel = () => {
//     h('selection');
//     setUrl('');
//     setName('');
//     setPreview(null);
//     onClose();
//   };

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.6)',
//     },
//     card: {
//       width: '85%',
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 36,
//       paddingHorizontal: 22,
//       borderRadius: tokens.borderRadius['2xl'],
//     },
//     title: {
//       fontSize: 20,
//       fontWeight: '700',
//       marginBottom: 18,
//       textAlign: 'center',
//       color: theme.colors.foreground,
//     },
//     description: {
//       paddingHorizontal: 1,
//       marginBottom: 17,
//       fontSize: 14,
//       fontWeight: '400',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       lineHeight: 21,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.inputText1,
//       borderRadius: 10,
//       padding: 12,
//       marginBottom: 14,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     primaryButton: {
//       backgroundColor: theme.colors.button1 || '#990affff',
//       paddingVertical: 14,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 8,
//       shadowOffset: {width: 0, height: 4},
//       elevation: 3,
//       marginTop: 20,
//     },
//     primaryButtonText: {
//       color: theme.colors.foreground,
//       fontSize: 17,
//       fontWeight: '600',
//       letterSpacing: 0.2,
//     },
//     secondaryButton: {
//       paddingVertical: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 14,
//       marginTop: 12,
//       backgroundColor: 'transparent',
//     },
//     secondaryButtonText: {
//       color: theme.colors.foreground || '#007AFF',
//       fontSize: 17,
//       fontWeight: '500',
//     },
//     uploadButton: {
//       backgroundColor: theme.colors.button4 || '#E5E5EA',
//       paddingVertical: 14,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.12,
//       shadowRadius: 6,
//       shadowOffset: {width: 0, height: 3},
//       elevation: 2,
//       marginTop: 10,
//     },
//     uploadButtonText: {
//       color: theme.colors.foreground || '#ffffffff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     preview: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//       marginBottom: 14,
//     },
//   });

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={styles.overlay}>
//         <View style={[styles.card, globalStyles.cardStyles1]}>
//           <Text style={styles.title}>Save a Look</Text>

//           <Text style={styles.description}>
//             Find any image online, press and hold it, and tap “Copy” — then
//             paste it into the Image Address below. You can also take a
//             screenshot, or press and hold the image and tap “Save to Photos”,
//             then tap “Upload from Camera Roll” to add it here.
//           </Text>

//           <TextInput
//             style={styles.input}
//             placeholder="Name (optional)"
//             placeholderTextColor={theme.colors.muted}
//             value={name}
//             onChangeText={setName}
//           />

//           <TextInput
//             style={styles.input}
//             placeholder="Image Address"
//             placeholderTextColor={theme.colors.muted}
//             value={url}
//             onChangeText={setUrl}
//           />

//           {/* 🖼️ Preview if selected */}
//           {preview && <Image source={{uri: preview}} style={styles.preview} />}

//           {/* 📸 Upload Button — now styled as a full Apple-level button */}
//           <TouchableOpacity
//             activeOpacity={0.8}
//             style={[
//               globalStyles.buttonPrimary,
//               {
//                 marginBottom: 16,
//                 backgroundColor: theme.colors.button4,
//                 marginTop: 2,
//               },
//             ]}
//             onPress={handleUpload}>
//             <Text style={{color: theme.colors.foreground}}>
//               Upload from Camera Roll
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             activeOpacity={0.8}
//             onPress={handleSave}
//             // style={[styles.primaryButton, !url && {opacity: 0.5}]}
//             style={[globalStyles.buttonPrimary, {marginBottom: 16}]}
//             disabled={!url}>
//             <Text style={{color: theme.colors.foreground}}>Save</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             activeOpacity={0.7}
//             onPress={handleCancel}
//             style={[
//               globalStyles.buttonPrimary,
//               {backgroundColor: theme.colors.surface3},
//             ]}>
//             <Text style={{color: theme.colors.foreground}}>Cancel</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }

/////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   TextInput,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useQueryClient} from '@tanstack/react-query';
// import * as ImagePicker from 'react-native-image-picker';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SaveLookModal({visible, onClose}: Props) {
//   const [url, setUrl] = useState('');
//   const [name, setName] = useState('');
//   const [preview, setPreview] = useState<string | null>(null);
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     if (!visible) {
//       setUrl('');
//       setName('');
//       setPreview(null);
//     }
//   }, [visible]);

//   const handleUpload = async () => {
//     h('impactLight');
//     const result = await ImagePicker.launchImageLibrary({
//       mediaType: 'photo',
//       quality: 0.9,
//     });

//     if (result?.assets && result.assets.length > 0) {
//       const asset = result.assets[0];
//       if (asset.uri) {
//         setUrl(asset.uri);
//         setPreview(asset.uri);
//       }
//     }
//   };

//   const handleSave = async () => {
//     if (!url || !userId) return;
//     h('impactMedium');

//     try {
//       const res = await fetch(`${API_BASE_URL}/saved-looks`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: url,
//           name: name || 'Saved Look',
//         }),
//       });

//       const data = await res.json();
//       console.log('✅ Saved look:', data);

//       h('notificationSuccess');
//       queryClient.invalidateQueries({queryKey: ['savedOutfits']});

//       setUrl('');
//       setName('');
//       setPreview(null);
//       onClose();
//     } catch (err) {
//       console.error('❌ Failed to save look:', err);
//       h('notificationError');
//     }
//   };

//   const handleCancel = () => {
//     h('selection');
//     setUrl('');
//     setName('');
//     setPreview(null);
//     onClose();
//   };

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.6)',
//     },
//     card: {
//       width: '85%',
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 36,
//       paddingHorizontal: 22,
//       borderRadius: tokens.borderRadius['2xl'],
//     },
//     title: {
//       fontSize: 20,
//       fontWeight: '700',
//       marginBottom: 18,
//       textAlign: 'center',
//       color: theme.colors.foreground,
//     },
//     description: {
//       paddingHorizontal: 1,
//       marginBottom: 17,
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       lineHeight: 20,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.inputText1,
//       borderRadius: 10,
//       padding: 12,
//       marginBottom: 14,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     primaryButton: {
//       backgroundColor: theme.colors.accent || '#0A84FF',
//       paddingVertical: 14,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 8,
//       shadowOffset: {width: 0, height: 4},
//       elevation: 3,
//       marginTop: 20,
//     },
//     primaryButtonText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//       letterSpacing: 0.2,
//     },
//     secondaryButton: {
//       paddingVertical: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 14,
//       marginTop: 12,
//       backgroundColor: 'transparent',
//     },
//     secondaryButtonText: {
//       color: theme.colors.foreground || '#007AFF',
//       fontSize: 17,
//       fontWeight: '500',
//     },
//     uploadButton: {
//       backgroundColor: theme.colors.buttonSecondary || '#E5E5EA',
//       paddingVertical: 14,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.12,
//       shadowRadius: 6,
//       shadowOffset: {width: 0, height: 3},
//       elevation: 2,
//       marginTop: 10,
//     },
//     uploadButtonText: {
//       color: theme.colors.foreground || '#000',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     preview: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//       marginBottom: 14,
//     },
//   });

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={styles.overlay}>
//         <View style={[styles.card, globalStyles.cardStyles1]}>
//           <Text style={styles.title}>Save a Look</Text>

//           <Text style={styles.description}>
//             Find any image online, right-click "Copy Image Address", paste it
//             below — or upload a photo from your camera roll.
//           </Text>

//           <TextInput
//             style={styles.input}
//             placeholder="Name (optional)"
//             placeholderTextColor={theme.colors.muted}
//             value={name}
//             onChangeText={setName}
//           />

//           <TextInput
//             style={styles.input}
//             placeholder="Image Address"
//             placeholderTextColor={theme.colors.muted}
//             value={url}
//             onChangeText={setUrl}
//           />

//           {/* 🖼️ Preview if selected */}
//           {preview && <Image source={{uri: preview}} style={styles.preview} />}

//           {/* 📸 Upload Button — now styled as a full Apple-level button */}
//           <TouchableOpacity
//             activeOpacity={0.8}
//             style={styles.uploadButton}
//             onPress={handleUpload}>
//             <Text style={styles.uploadButtonText}>Upload from Camera Roll</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             activeOpacity={0.8}
//             onPress={handleSave}
//             style={[styles.primaryButton, !url && {opacity: 0.5}]}
//             disabled={!url}>
//             <Text style={styles.primaryButtonText}>Save</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             activeOpacity={0.7}
//             onPress={handleCancel}
//             style={styles.secondaryButton}>
//             <Text style={styles.secondaryButtonText}>Cancel</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }

///////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   TextInput,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useQueryClient} from '@tanstack/react-query';
// import * as ImagePicker from 'react-native-image-picker';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SaveLookModal({visible, onClose}: Props) {
//   const [url, setUrl] = useState('');
//   const [name, setName] = useState('');
//   const [preview, setPreview] = useState<string | null>(null);
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     if (!visible) {
//       setUrl('');
//       setName('');
//       setPreview(null);
//     }
//   }, [visible]);

//   const handleUpload = async () => {
//     h('impactLight');
//     const result = await ImagePicker.launchImageLibrary({
//       mediaType: 'photo',
//       quality: 0.9,
//     });

//     if (result?.assets && result.assets.length > 0) {
//       const asset = result.assets[0];
//       if (asset.uri) {
//         setUrl(asset.uri);
//         setPreview(asset.uri);
//       }
//     }
//   };

//   const handleSave = async () => {
//     if (!url || !userId) return;
//     h('impactMedium');

//     try {
//       const res = await fetch(`${API_BASE_URL}/saved-looks`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: url,
//           name: name || 'Saved Look',
//         }),
//       });

//       const data = await res.json();
//       console.log('✅ Saved look:', data);

//       h('notificationSuccess');
//       queryClient.invalidateQueries({queryKey: ['savedOutfits']});

//       setUrl('');
//       setName('');
//       setPreview(null);
//       onClose();
//     } catch (err) {
//       console.error('❌ Failed to save look:', err);
//       h('notificationError');
//     }
//   };

//   const handleCancel = () => {
//     h('selection');
//     setUrl('');
//     setName('');
//     setPreview(null);
//     onClose();
//   };

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.6)',
//     },
//     card: {
//       width: '85%',
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 36,
//       paddingHorizontal: 22,
//       borderRadius: tokens.borderRadius['2xl'],
//     },
//     title: {
//       fontSize: 20,
//       fontWeight: '700',
//       marginBottom: 18,
//       textAlign: 'center',
//       color: theme.colors.foreground,
//     },
//     description: {
//       paddingHorizontal: 1,
//       marginBottom: 17,
//       fontSize: 13,
//       fontWeight: '400',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       lineHeight: 20,
//     },
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.inputText1,
//       borderRadius: 10,
//       padding: 12,
//       marginBottom: 14,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     primaryButton: {
//       backgroundColor: theme.colors.accent || '#0A84FF',
//       paddingVertical: 14,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.15,
//       shadowRadius: 8,
//       shadowOffset: {width: 0, height: 4},
//       elevation: 3,
//       marginTop: 20,
//     },
//     primaryButtonText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//       letterSpacing: 0.2,
//     },
//     secondaryButton: {
//       paddingVertical: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 14,
//       marginTop: 12,
//       backgroundColor: 'transparent',
//     },
//     secondaryButtonText: {
//       color: theme.colors.foreground || '#007AFF',
//       fontSize: 17,
//       fontWeight: '500',
//     },
//     uploadButton: {
//       backgroundColor: theme.colors.surfaceVariant || 'rgba(0,0,0,0.05)',
//       paddingVertical: 14,
//       borderRadius: 14,
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderWidth: 1,
//       borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
//       marginTop: 6,
//       marginBottom: 14,
//     },
//     uploadButtonText: {
//       color: theme.colors.foreground || '#007AFF',
//       fontSize: 16,
//       fontWeight: '500',
//     },
//     preview: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//       marginBottom: 14,
//     },
//   });

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={styles.overlay}>
//         <View style={[styles.card, globalStyles.cardStyles1]}>
//           <Text style={styles.title}>Save a Look</Text>

//           <Text style={styles.description}>
//             Find any image online, right-click "Copy Image Address", paste it
//             below — or upload a photo from your camera roll.
//           </Text>

//           <TextInput
//             style={styles.input}
//             placeholder="Name (optional)"
//             placeholderTextColor={theme.colors.muted}
//             value={name}
//             onChangeText={setName}
//           />

//           <TextInput
//             style={styles.input}
//             placeholder="Image Address"
//             placeholderTextColor={theme.colors.muted}
//             value={url}
//             onChangeText={setUrl}
//           />

//           {/* 🖼️ Preview if selected */}
//           {preview && <Image source={{uri: preview}} style={styles.preview} />}

//           {/* 📸 Upload Button (moved below inputs, above Save) */}
//           <TouchableOpacity
//             activeOpacity={0.8}
//             style={styles.uploadButton}
//             onPress={handleUpload}>
//             <Text style={styles.uploadButtonText}>Upload from Camera Roll</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             activeOpacity={0.8}
//             onPress={handleSave}
//             style={[styles.primaryButton, !url && {opacity: 0.5}]}
//             disabled={!url}>
//             <Text style={styles.primaryButtonText}>Save</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             activeOpacity={0.7}
//             onPress={handleCancel}
//             style={styles.secondaryButton}>
//             <Text style={styles.secondaryButtonText}>Cancel</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }

///////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   TextInput,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useQueryClient} from '@tanstack/react-query';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SaveLookModal({visible, onClose}: Props) {
//   const [url, setUrl] = useState('');
//   const [name, setName] = useState('');
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient(); // ✅ add query client

//   // 🧹 Automatically clear fields when modal becomes hidden
//   useEffect(() => {
//     if (!visible) {
//       setUrl('');
//       setName('');
//     }
//   }, [visible]);

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.6)',
//     },
//     card: {
//       width: '85%',
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 12,
//     },
//     title: {fontSize: 18, fontWeight: '700', marginBottom: 18},
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.inputText1,
//       borderRadius: 6,
//       padding: 10,
//       marginBottom: 12,
//     },
//     button: {
//       backgroundColor: theme.colors.button1,
//       padding: 12,
//       borderRadius: 6,
//       alignItems: 'center',
//     },
//     buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
//   });

//   const handleSave = async () => {
//     if (!url || !userId) return;

//     h('impactMedium'); // haptic on save tap

//     try {
//       const res = await fetch(`${API_BASE_URL}/saved-looks`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: url,
//           name: name || 'Saved Look',
//         }),
//       });
//       const data = await res.json();
//       console.log('✅ Saved look:', data);

//       h('notificationSuccess'); // success confirmation

//       // ✅ Tell React Query to refresh data immediately
//       queryClient.invalidateQueries({queryKey: ['savedOutfits']});

//       // ✅ Reset fields after successful save
//       setUrl('');
//       setName('');
//       onClose();
//     } catch (err) {
//       console.error('❌ Failed to save look:', err);
//       h('notificationError'); // error feedback
//     }
//   };

//   const handleCancel = () => {
//     h('selection'); // light tap on cancel
//     // ✅ Reset fields when canceling
//     setUrl('');
//     setName('');
//     onClose();
//   };

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={[styles.overlay]}>
//         <View
//           style={[
//             styles.card,
//             globalStyles.cardStyles1,
//             {
//               paddingVertical: 36,
//               paddingHorizontal: 22,
//               borderRadius: tokens.borderRadius['2xl'],
//             },
//           ]}>
//           <Text
//             style={[
//               styles.title,
//               {textAlign: 'center', color: theme.colors.foreground},
//             ]}>
//             Save a Look
//           </Text>

//           <Text
//             style={[
//               globalStyles.label,
//               {
//                 paddingHorizontal: 1,
//                 marginBottom: 17,
//                 fontSize: 12,
//                 fontWeight: '400',
//                 color: theme.colors.foreground,
//               },
//             ]}>
//             Find any image online, right-click "Copy Image Address", then paste
//             that address into the "Image Address" field below to save a look.
//           </Text>

//           <TextInput
//             style={[styles.input, {color: theme.colors.foreground}]}
//             placeholder="Name (optional)"
//             placeholderTextColor={theme.colors.muted}
//             value={name}
//             onChangeText={setName}
//           />

//           <TextInput
//             style={[styles.input, {color: theme.colors.foreground}]}
//             placeholder="Image Address"
//             placeholderTextColor={theme.colors.muted}
//             value={url}
//             onChangeText={setUrl}
//           />

//           <TouchableOpacity
//             style={[styles.button, {marginVertical: 4, marginTop: 10}]}
//             onPress={handleSave}>
//             <Text style={styles.buttonText}>Save</Text>
//           </TouchableOpacity>

//           <TouchableOpacity onPress={handleCancel}>
//             <Text
//               style={[
//                 {
//                   color: theme.colors.foreground,
//                   marginTop: 10,
//                   textAlign: 'center',
//                 },
//               ]}>
//               Cancel
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }

/////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   TextInput,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useQueryClient} from '@tanstack/react-query';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SaveLookModal({visible, onClose}: Props) {
//   const [url, setUrl] = useState('');
//   const [name, setName] = useState('');
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient(); // ✅ add query client

//   // 🧹 Automatically clear fields when modal becomes hidden
//   useEffect(() => {
//     if (!visible) {
//       setUrl('');
//       setName('');
//     }
//   }, [visible]);

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.6)',
//     },
//     card: {
//       width: '85%',
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 12,
//     },
//     title: {fontSize: 18, fontWeight: '700', marginBottom: 18},
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.inputText1,
//       borderRadius: 6,
//       padding: 10,
//       marginBottom: 12,
//     },
//     button: {
//       backgroundColor: theme.colors.button1,
//       padding: 12,
//       borderRadius: 6,
//       alignItems: 'center',
//     },
//     buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
//   });

//   const handleSave = async () => {
//     if (!url || !userId) return;

//     h('impactMedium'); // haptic on save tap

//     try {
//       const res = await fetch(`${API_BASE_URL}/saved-looks`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: url,
//           name: name || 'Saved Look',
//         }),
//       });
//       const data = await res.json();
//       console.log('✅ Saved look:', data);

//       h('notificationSuccess'); // success confirmation

//       // ✅ Tell React Query to refresh data immediately
//       queryClient.invalidateQueries({queryKey: ['savedOutfits']});

//       // ✅ Reset fields after successful save
//       setUrl('');
//       setName('');
//       onClose();
//     } catch (err) {
//       console.error('❌ Failed to save look:', err);
//       h('notificationError'); // error feedback
//     }
//   };

//   const handleCancel = () => {
//     h('selection'); // light tap on cancel
//     // ✅ Reset fields when canceling
//     setUrl('');
//     setName('');
//     onClose();
//   };

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={[styles.overlay]}>
//         <View
//           style={[
//             styles.card,
//             globalStyles.cardStyles1,
//             {
//               paddingVertical: 36,
//               paddingHorizontal: 22,
//               borderRadius: tokens.borderRadius['2xl'],
//             },
//           ]}>
//           <Text
//             style={[
//               styles.title,
//               {textAlign: 'center', color: theme.colors.foreground},
//             ]}>
//             Save a Look
//           </Text>

//           <Text
//             style={[
//               globalStyles.label,
//               {
//                 paddingHorizontal: 1,
//                 marginBottom: 17,
//                 fontSize: 12,
//                 fontWeight: '400',
//                 color: theme.colors.foreground,
//               },
//             ]}>
//             Find any image online, right-click "Copy Image Address", then paste
//             that address into the "Image Address" field below to save a look.
//           </Text>

//           <TextInput
//             style={[styles.input, {color: theme.colors.foreground}]}
//             placeholder="Name (optional)"
//             placeholderTextColor={theme.colors.muted}
//             value={name}
//             onChangeText={setName}
//           />

//           <TextInput
//             style={[styles.input, {color: theme.colors.foreground}]}
//             placeholder="Image Address"
//             placeholderTextColor={theme.colors.muted}
//             value={url}
//             onChangeText={setUrl}
//           />

//           <TouchableOpacity
//             style={[styles.button, {marginVertical: 4, marginTop: 10}]}
//             onPress={handleSave}>
//             <Text style={styles.buttonText}>Save</Text>
//           </TouchableOpacity>

//           <TouchableOpacity onPress={handleCancel}>
//             <Text
//               style={[
//                 {
//                   color: theme.colors.foreground,
//                   marginTop: 10,
//                   textAlign: 'center',
//                 },
//               ]}>
//               Cancel
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }

//////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   TextInput,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
// } from 'react-native';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useUUID} from '../../context/UUIDContext';
// import {API_BASE_URL} from '../../config/api';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {useQueryClient} from '@tanstack/react-query';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
// };

// const h = (type: string) =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// export default function SaveLookModal({visible, onClose}: Props) {
//   const [url, setUrl] = useState('');
//   const [name, setName] = useState('');
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const queryClient = useQueryClient(); // ✅ add query client

//   // 🧹 Automatically clear fields when modal becomes hidden
//   useEffect(() => {
//     if (!visible) {
//       setUrl('');
//       setName('');
//     }
//   }, [visible]);

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.6)',
//     },
//     card: {
//       width: '85%',
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 12,
//     },
//     title: {fontSize: 18, fontWeight: '700', marginBottom: 18},
//     input: {
//       borderWidth: 1,
//       borderColor: theme.colors.inputText1,
//       borderRadius: 6,
//       padding: 10,
//       marginBottom: 12,
//     },
//     button: {
//       backgroundColor: theme.colors.button1,
//       padding: 12,
//       borderRadius: 6,
//       alignItems: 'center',
//     },
//     buttonText: {color: theme.colors.buttonText1, fontWeight: '600'},
//   });

//   const handleSave = async () => {
//     if (!url || !userId) return;

//     h('impactMedium'); // haptic on save tap

//     try {
//       const res = await fetch(`${API_BASE_URL}/saved-looks`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: url,
//           name: name || 'Saved Look',
//         }),
//       });
//       const data = await res.json();
//       console.log('✅ Saved look:', data);

//       h('notificationSuccess'); // success confirmation

//       // ✅ Tell React Query to refresh data immediately
//       queryClient.invalidateQueries({queryKey: ['savedOutfits']});

//       // ✅ Reset fields after successful save
//       setUrl('');
//       setName('');
//       onClose();
//     } catch (err) {
//       console.error('❌ Failed to save look:', err);
//       h('notificationError'); // error feedback
//     }
//   };

//   const handleCancel = () => {
//     h('selection'); // light tap on cancel
//     // ✅ Reset fields when canceling
//     setUrl('');
//     setName('');
//     onClose();
//   };

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={[styles.overlay]}>
//         <View
//           style={[
//             styles.card,
//             globalStyles.cardStyles1,
//             {
//               paddingVertical: 36,
//               paddingHorizontal: 22,
//               borderRadius: tokens.borderRadius['2xl'],
//             },
//           ]}>
//           <Text
//             style={[
//               styles.title,
//               {textAlign: 'center', color: theme.colors.foreground},
//             ]}>
//             Save a Look
//           </Text>

//           <Text
//             style={[
//               globalStyles.label,
//               {
//                 paddingHorizontal: 1,
//                 marginBottom: 17,
//                 fontSize: 12,
//                 fontWeight: '400',
//                 color: theme.colors.foreground,
//               },
//             ]}>
//             Find any image online, right-click "Copy Image Address", then paste
//             that address into the "Image Address" field below to save a look.
//           </Text>

//           <TextInput
//             style={[styles.input, {color: theme.colors.foreground}]}
//             placeholder="Name (optional)"
//             placeholderTextColor={theme.colors.muted}
//             value={name}
//             onChangeText={setName}
//           />

//           <TextInput
//             style={[styles.input, {color: theme.colors.foreground}]}
//             placeholder="Image Address"
//             placeholderTextColor={theme.colors.muted}
//             value={url}
//             onChangeText={setUrl}
//           />

//           <TouchableOpacity
//             style={[styles.button, {marginVertical: 4, marginTop: 10}]}
//             onPress={handleSave}>
//             <Text style={styles.buttonText}>Save</Text>
//           </TouchableOpacity>

//           <TouchableOpacity onPress={handleCancel}>
//             <Text
//               style={[
//                 {
//                   color: theme.colors.foreground,
//                   marginTop: 10,
//                   textAlign: 'center',
//                 },
//               ]}>
//               Cancel
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }
