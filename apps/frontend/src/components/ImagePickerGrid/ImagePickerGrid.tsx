import React, {useState} from 'react';
import {
  View,
  Image,
  Platform,
  PermissionsAndroid,
  ScrollView,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
import {useGlobalStyles} from '../../styles/useGlobalStyles';

type Props = {
  onSelectImage?: (uri: string) => void;
  onSelectImages?: (uris: string[]) => void;
  selectedUri?: string | null;
};

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function humanBytes(n: number) {
  const mb = n / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function splitBySize(assets: Asset[]) {
  const accepted: Asset[] = [];
  const rejected: Asset[] = [];
  for (const a of assets) {
    const size = a.fileSize ?? 0;
    if (size && size > MAX_IMAGE_BYTES) rejected.push(a);
    else accepted.push(a);
  }
  return {accepted, rejected};
}

export default function ImagePickerGrid({
  onSelectImage,
  onSelectImages,
  selectedUri,
}: Props) {
  const [photos, setPhotos] = useState<Asset[]>([]);
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const isBatchMode = !!onSelectImages;

  const styles = StyleSheet.create({
    imagePickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 8,
    },
    buttonWrapper: {flex: 1, marginHorizontal: 4, maxWidth: 180, minWidth: 120},
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    buttonPrimary: {
      paddingVertical: 9,
      paddingHorizontal: 5,
      borderRadius: tokens.borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.button1,
    },
    thumbnail: {
      width: 100,
      height: 100,
      margin: 4,
      borderRadius: 8,
      backgroundColor: '#eee',
    },
  });

  const requestAndroidPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    ]);
    return (
      granted['android.permission.CAMERA'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.READ_EXTERNAL_STORAGE'] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  };

  const takePhoto = async () => {
    if (!(await requestAndroidPermissions())) return;
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 2048,
      maxHeight: 2048,
    });
    if (result.assets?.length) {
      const {accepted, rejected} = splitBySize(result.assets);
      if (rejected.length) {
        Alert.alert(
          'Image too large',
          `Some photos exceed 20 MB.\nLargest: ${humanBytes(
            rejected[0].fileSize ?? 0,
          )}`,
        );
      }
      if (!accepted.length) return;

      if (!isBatchMode) {
        setPhotos(accepted); // ✅ overwrite, not append
      }
      const first = accepted[0]?.uri;
      if (first) onSelectImage?.(first);
    }
  };

  const pickFromGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 2048,
      maxHeight: 2048,
      selectionLimit: 0,
    });
    if (result.assets?.length) {
      const {accepted, rejected} = splitBySize(result.assets);
      if (rejected.length) {
        Alert.alert(
          'Some images skipped',
          `${rejected.length} exceeded 20 MB.\nLargest: ${humanBytes(
            rejected[0].fileSize ?? 0,
          )}`,
        );
      }
      if (!accepted.length) return;

      const uris = accepted.map(a => a.uri).filter(Boolean) as string[];

      if (isBatchMode) {
        onSelectImages?.(uris); // ✅ parent handles display
      } else {
        setPhotos(accepted); // ✅ overwrite local state
        if (uris[0]) onSelectImage?.(uris[0]);
      }
    }
  };

  const recordVideo = async () => {
    if (!(await requestAndroidPermissions())) return;
    await launchCamera({mediaType: 'video', videoQuality: 'high'});
  };

  return (
    <View style={{marginBottom: 2, width: '100%'}}>
      <View style={styles.imagePickerRow}>
        {[
          {label: 'Take Photo', onPress: takePhoto},
          {label: 'Photo Library', onPress: pickFromGallery},
        ].map(({label, onPress}) => (
          <View key={label} style={styles.buttonWrapper}>
            <AppleTouchFeedback
              onPress={onPress}
              hapticStyle="impactMedium"
              style={styles.buttonPrimary}>
              <Text style={globalStyles.buttonPrimaryText}>{label}</Text>
            </AppleTouchFeedback>
          </View>
        ))}
      </View>
    </View>
  );
}

///////////////////

// //BELOW HERE IS LOGIC TO KEEP FOR BATCH UPLOAD ITEMS - KEEP VERSION 2

// import React, {useState} from 'react';
// import {
//   View,
//   Image,
//   Platform,
//   PermissionsAndroid,
//   ScrollView,
//   StyleSheet,
//   Alert,
//   Text,
//   TouchableOpacity,
// } from 'react-native';
// import {
//   launchCamera,
//   launchImageLibrary,
//   Asset,
//   ImageLibraryOptions,
//   CameraOptions,
// } from 'react-native-image-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// type Props = {
//   onSelectImage?: (uri: string) => void;
//   onSelectImages?: (uris: string[]) => void; // ➕ batch support
//   selectedUri?: string | null;
// };

// // ⛔️ Vertex/Gemini practical per-image limit (~20MB)
// const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// function humanBytes(n: number) {
//   if (!n && n !== 0) return '';
//   const mb = n / (1024 * 1024);
//   return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
// }

// function splitBySize(assets: Asset[]) {
//   const accepted: Asset[] = [];
//   const rejected: Asset[] = [];
//   for (const a of assets) {
//     const size = a.fileSize ?? 0; // if unknown, we accept (most phones return fileSize)
//     if (size && size > MAX_IMAGE_BYTES) rejected.push(a);
//     else accepted.push(a);
//   }
//   return {accepted, rejected};
// }

// export default function ImagePickerGrid({
//   onSelectImage,
//   onSelectImages,
//   selectedUri,
// }: Props) {
//   const [photos, setPhotos] = useState<Asset[]>([]);
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     imagePickerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       width: '100%',
//       marginLeft: -12,
//       marginBottom: 8,
//     },
//     buttonWrapper: {flex: 1, marginHorizontal: 4, maxWidth: 180, minWidth: 120},
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//     },
//     buttonPrimary: {
//       paddingVertical: 9,
//       paddingHorizontal: 5,
//       borderRadius: 8,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     thumbnail: {
//       width: 100,
//       height: 100,
//       margin: 4,
//       borderRadius: 8,
//       backgroundColor: '#eee',
//     },
//   });

//   const requestAndroidPermissions = async () => {
//     if (Platform.OS !== 'android') return true;
//     const granted = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.CAMERA,
//       PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//     ]);
//     const ok =
//       granted['android.permission.CAMERA'] ===
//         PermissionsAndroid.RESULTS.GRANTED &&
//       granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
//         PermissionsAndroid.RESULTS.GRANTED &&
//       granted['android.permission.READ_EXTERNAL_STORAGE'] ===
//         PermissionsAndroid.RESULTS.GRANTED;
//     if (!ok)
//       Alert.alert(
//         'Permissions required',
//         'Camera + storage permissions are needed.',
//       );
//     return ok;
//   };

//   const takePhoto = async () => {
//     if (!(await requestAndroidPermissions())) return;
//     const options: CameraOptions = {
//       mediaType: 'photo',
//       quality: 1,
//       includeBase64: false,
//       saveToPhotos: true,
//     };
//     const result = await launchCamera(options);
//     if (result.assets?.length) {
//       // 🔎 size gate
//       const {accepted, rejected} = splitBySize(result.assets);
//       if (rejected.length) {
//         const biggest = rejected.reduce((m, a) =>
//           (a.fileSize ?? 0) > (m.fileSize ?? 0) ? a : m,
//         );
//         Alert.alert(
//           'Image too large',
//           `One or more photos exceed 20 MB and were skipped.\nLargest: ${humanBytes(
//             biggest.fileSize ?? 0,
//           )}`,
//         );
//       }
//       if (!accepted.length) return;

//       setPhotos(curr => [...curr, ...accepted]);
//       const first = accepted[0]?.uri;
//       if (first) onSelectImage?.(first); // single from camera
//     }
//   };

//   const pickFromGallery = async () => {
//     const options: ImageLibraryOptions = {
//       mediaType: 'photo',
//       quality: 1,
//       selectionLimit: 0, // ➕ allow multi-select
//       includeBase64: false,
//     };
//     const result = await launchImageLibrary(options);
//     if (result.assets?.length) {
//       // 🔎 size gate
//       const {accepted, rejected} = splitBySize(result.assets);
//       if (rejected.length) {
//         const count = rejected.length;
//         const biggest = rejected.reduce((m, a) =>
//           (a.fileSize ?? 0) > (m.fileSize ?? 0) ? a : m,
//         );
//         Alert.alert(
//           'Some images skipped',
//           `${count} image${count > 1 ? 's' : ''} exceeded 20 MB and ${
//             count > 1 ? 'were' : 'was'
//           } skipped.\nLargest: ${humanBytes(biggest.fileSize ?? 0)}`,
//         );
//       }
//       if (!accepted.length) {
//         Alert.alert('No images added', 'All selected images exceeded 20 MB.');
//         return;
//       }

//       setPhotos(curr => [...curr, ...accepted]);

//       const uris = accepted.map(a => a.uri).filter((u): u is string => !!u);

//       if (uris.length > 1 && onSelectImages) {
//         onSelectImages(uris); // ➕ send all selected (≤20MB each)
//       } else if (uris[0]) {
//         onSelectImage?.(uris[0]); // fallback to single
//       }
//     }
//   };

//   const recordVideo = async () => {
//     if (!(await requestAndroidPermissions())) return;
//     const options: CameraOptions = {
//       mediaType: 'video',
//       videoQuality: 'high',
//       durationLimit: 60,
//       saveToPhotos: true,
//     };
//     const result = await launchCamera(options);
//     if (result.assets?.length) setPhotos(curr => [...curr, ...result.assets!]);
//   };

//   return (
//     <View style={{marginBottom: 2, width: '100%'}}>
//       <View style={styles.imagePickerRow}>
//         {[
//           {label: 'Take Photo', onPress: takePhoto},
//           {label: 'Record Video', onPress: recordVideo},
//           {label: 'Photo Library', onPress: pickFromGallery},
//         ].map(({label, onPress}) => (
//           <View key={label} style={styles.buttonWrapper}>
//             <AppleTouchFeedback
//               onPress={onPress}
//               hapticStyle="impactMedium"
//               style={styles.buttonPrimary}>
//               <Text style={globalStyles.buttonPrimaryText}>{label}</Text>
//             </AppleTouchFeedback>
//           </View>
//         ))}
//       </View>

//       {!selectedUri && photos.length > 0 && !onSelectImages && (
//         <ScrollView contentContainerStyle={styles.grid}>
//           {photos
//             .filter((p): p is Asset & {uri: string} => !!p.uri)
//             .map((photo, idx) => (
//               <TouchableOpacity
//                 key={photo.uri + idx}
//                 onPress={() => onSelectImage?.(photo.uri!)}>
//                 <Image
//                   source={{uri: photo.uri}}
//                   style={styles.thumbnail}
//                   resizeMode="cover"
//                 />
//               </TouchableOpacity>
//             ))}
//         </ScrollView>
//       )}
//     </View>
//   );
// }

////////////////////////

// //BELOW HERE IS LOGIC TO KEEP FOR BATCH UPLOAD ITEMS - KEEP VERSION 1

// import React, {useState} from 'react';
// import {
//   View,
//   Image,
//   Platform,
//   PermissionsAndroid,
//   ScrollView,
//   StyleSheet,
//   Alert,
//   Text,
//   TouchableOpacity,
// } from 'react-native';
// import {
//   launchCamera,
//   launchImageLibrary,
//   Asset,
//   ImageLibraryOptions,
//   CameraOptions,
// } from 'react-native-image-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// type Props = {
//   onSelectImage?: (uri: string) => void;
//   onSelectImages?: (uris: string[]) => void; // ➕ batch support
//   selectedUri?: string | null;
// };

// export default function ImagePickerGrid({
//   onSelectImage,
//   onSelectImages,
//   selectedUri,
// }: Props) {
//   const [photos, setPhotos] = useState<Asset[]>([]);
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     imagePickerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       width: '100%',
//     },
//     buttonWrapper: {flex: 1, marginHorizontal: 4, maxWidth: 180, minWidth: 100},
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//     },
//     buttonPrimary: {
//       paddingVertical: 9,
//       paddingHorizontal: 5,
//       borderRadius: 8,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     thumbnail: {
//       width: 100,
//       height: 100,
//       margin: 4,
//       borderRadius: 8,
//       backgroundColor: '#eee',
//     },
//   });

//   const requestAndroidPermissions = async () => {
//     if (Platform.OS !== 'android') return true;
//     const granted = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.CAMERA,
//       PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//     ]);
//     const ok =
//       granted['android.permission.CAMERA'] ===
//         PermissionsAndroid.RESULTS.GRANTED &&
//       granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
//         PermissionsAndroid.RESULTS.GRANTED &&
//       granted['android.permission.READ_EXTERNAL_STORAGE'] ===
//         PermissionsAndroid.RESULTS.GRANTED;
//     if (!ok)
//       Alert.alert(
//         'Permissions required',
//         'Camera + storage permissions are needed.',
//       );
//     return ok;
//   };

//   const takePhoto = async () => {
//     if (!(await requestAndroidPermissions())) return;
//     const options: CameraOptions = {
//       mediaType: 'photo',
//       quality: 1,
//       includeBase64: false,
//       saveToPhotos: true,
//     };
//     const result = await launchCamera(options);
//     if (result.assets?.length) {
//       setPhotos(curr => [...curr, ...result.assets!]);
//       const first = result.assets[0]?.uri;
//       if (first) onSelectImage?.(first); // single from camera
//     }
//   };

//   const pickFromGallery = async () => {
//     const options: ImageLibraryOptions = {
//       mediaType: 'photo',
//       quality: 1,
//       selectionLimit: 0, // ➕ allow multi-select
//       includeBase64: false,
//     };
//     const result = await launchImageLibrary(options);
//     if (result.assets?.length) {
//       setPhotos(curr => [...curr, ...result.assets!]);
//       const uris = result.assets
//         .map(a => a.uri)
//         .filter((u): u is string => !!u);
//       if (uris.length > 1 && onSelectImages) {
//         onSelectImages(uris); // ➕ send all selected
//       } else if (uris[0]) {
//         onSelectImage?.(uris[0]); // fallback to single
//       }
//     }
//   };

//   const recordVideo = async () => {
//     if (!(await requestAndroidPermissions())) return;
//     const options: CameraOptions = {
//       mediaType: 'video',
//       videoQuality: 'high',
//       durationLimit: 60,
//       saveToPhotos: true,
//     };
//     const result = await launchCamera(options);
//     if (result.assets?.length) setPhotos(curr => [...curr, ...result.assets!]);
//   };

//   return (
//     <View style={{marginBottom: 20, width: '100%'}}>
//       <View style={styles.imagePickerRow}>
//         {[
//           {label: 'Take Photo', onPress: takePhoto},
//           {label: 'Record Video', onPress: recordVideo},
//           {label: 'Photo Library', onPress: pickFromGallery},
//         ].map(({label, onPress}) => (
//           <View key={label} style={styles.buttonWrapper}>
//             <AppleTouchFeedback
//               onPress={onPress}
//               hapticStyle="impactMedium"
//               style={styles.buttonPrimary}>
//               <Text style={globalStyles.buttonPrimaryText}>{label}</Text>
//             </AppleTouchFeedback>
//           </View>
//         ))}
//       </View>

//       {!selectedUri && (
//         <ScrollView contentContainerStyle={styles.grid}>
//           {photos
//             .filter((p): p is Asset & {uri: string} => !!p.uri)
//             .map((photo, idx) => (
//               <TouchableOpacity
//                 key={photo.uri + idx}
//                 onPress={() => onSelectImage?.(photo.uri!)}>
//                 <Image
//                   source={{uri: photo.uri}}
//                   style={styles.thumbnail}
//                   resizeMode="cover"
//                 />
//               </TouchableOpacity>
//             ))}
//         </ScrollView>
//       )}
//     </View>
//   );
// }

/////////////////////

//BELOW HERE IS LOGIC TO KEEP FOR SINGLE UPLOAD ITEMS - KEEP VERSION 1

// import React, {useState} from 'react';
// import {
//   View,
//   Image,
//   Platform,
//   PermissionsAndroid,
//   ScrollView,
//   StyleSheet,
//   Alert,
//   Text,
//   TouchableOpacity,
// } from 'react-native';
// import {
//   launchCamera,
//   launchImageLibrary,
//   Asset,
//   ImageLibraryOptions,
//   CameraOptions,
// } from 'react-native-image-picker';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   onSelectImage?: (uri: string) => void;
//   selectedUri?: string | null;
// };

// export default function ImagePickerGrid({onSelectImage, selectedUri}: Props) {
//   const [photos, setPhotos] = useState<Asset[]>([]);
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     imagePickerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       width: '100%',
//     },
//     buttonWrapper: {
//       flex: 1,
//       marginHorizontal: 4,
//       maxWidth: 180,
//       minWidth: 100,
//     },
//     buttonSpacer: {
//       width: 8,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//     },
//     buttonPrimary: {
//       paddingVertical: 9,
//       paddingHorizontal: 5,
//       borderRadius: 8,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: theme.colors.button1,
//     },
//     thumbnail: {
//       width: 100,
//       height: 100,
//       margin: 4,
//       borderRadius: 8,
//       backgroundColor: '#eee',
//     },
//   });

//   // Add marginRight to all buttons except the last
//   const buttonMarginStyle = (index: number) =>
//     index !== 2 ? {marginRight: 8} : undefined;

//   const requestAndroidPermissions = async () => {
//     if (Platform.OS !== 'android') return true;
//     const granted = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.CAMERA,
//       PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//     ]);
//     const ok =
//       granted['android.permission.CAMERA'] ===
//         PermissionsAndroid.RESULTS.GRANTED &&
//       granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
//         PermissionsAndroid.RESULTS.GRANTED &&
//       granted['android.permission.READ_EXTERNAL_STORAGE'] ===
//         PermissionsAndroid.RESULTS.GRANTED;
//     if (!ok)
//       Alert.alert(
//         'Permissions required',
//         'Camera + storage permissions are needed.',
//       );
//     return ok;
//   };

//   const takePhoto = async () => {
//     if (!(await requestAndroidPermissions())) return;
//     const options: CameraOptions = {
//       mediaType: 'photo',
//       quality: 1,
//       includeBase64: false,
//       saveToPhotos: true,
//     };
//     const result = await launchCamera(options);
//     if (result.assets?.length) {
//       setPhotos(curr => [...curr, ...result.assets!]);
//       if (onSelectImage && result.assets[0].uri) {
//         onSelectImage(result.assets[0].uri);
//       }
//     }
//   };

//   const pickFromGallery = async () => {
//     const options: ImageLibraryOptions = {
//       mediaType: 'photo',
//       quality: 1,
//       selectionLimit: 0,
//       includeBase64: false,
//     };
//     const result = await launchImageLibrary(options);
//     if (result.assets?.length) {
//       setPhotos(curr => [...curr, ...result.assets!]);
//       if (onSelectImage && result.assets[0].uri) {
//         onSelectImage(result.assets[0].uri);
//       }
//     }
//   };

//   const recordVideo = async () => {
//     if (!(await requestAndroidPermissions())) return;
//     const options: CameraOptions = {
//       mediaType: 'video',
//       videoQuality: 'high',
//       durationLimit: 60,
//       saveToPhotos: true,
//     };
//     const result = await launchCamera(options);
//     if (result.assets?.length) {
//       setPhotos(curr => [...curr, ...result.assets!]);
//     }
//   };

//   return (
//     <View style={{marginBottom: 20, width: '100%'}}>
//       <View style={styles.imagePickerRow}>
//         {[
//           {label: 'Take Photo', onPress: takePhoto},
//           {label: 'Record Video', onPress: recordVideo},
//           {label: 'Photo Library', onPress: pickFromGallery},
//         ].map(({label, onPress}) => (
//           <View key={label} style={styles.buttonWrapper}>
//             <AppleTouchFeedback
//               onPress={onPress}
//               hapticStyle="impactMedium"
//               style={styles.buttonPrimary}>
//               <Text style={globalStyles.buttonPrimaryText}>{label}</Text>
//             </AppleTouchFeedback>
//           </View>
//         ))}
//       </View>

//       {!selectedUri && (
//         <ScrollView contentContainerStyle={styles.grid}>
//           {photos
//             .filter((photo): photo is Asset & {uri: string} => !!photo.uri)
//             .map((photo, idx) => (
//               <TouchableOpacity
//                 key={photo.uri + idx}
//                 onPress={() => onSelectImage?.(photo.uri)}>
//                 <Image
//                   source={{uri: photo.uri}}
//                   style={styles.thumbnail}
//                   resizeMode="cover"
//                 />
//               </TouchableOpacity>
//             ))}
//         </ScrollView>
//       )}
//     </View>
//   );
// }
