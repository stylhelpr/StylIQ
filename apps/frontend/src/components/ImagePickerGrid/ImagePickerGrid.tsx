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
  ImageLibraryOptions,
  CameraOptions,
} from 'react-native-image-picker';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';

type Props = {
  onSelectImage?: (uri: string) => void;
  selectedUri?: string | null;
};

export default function ImagePickerGrid({onSelectImage, selectedUri}: Props) {
  const [photos, setPhotos] = useState<Asset[]>([]);
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const styles = StyleSheet.create({
    imagePickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    buttonWrapper: {
      flex: 1,
      marginHorizontal: 4,
      maxWidth: 180,
      minWidth: 100,
    },
    buttonSpacer: {
      width: 8,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    buttonPrimary: {
      paddingVertical: 9,
      paddingHorizontal: 5,
      borderRadius: 8,
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

  // Add marginRight to all buttons except the last
  const buttonMarginStyle = (index: number) =>
    index !== 2 ? {marginRight: 8} : undefined;

  const requestAndroidPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    ]);
    const ok =
      granted['android.permission.CAMERA'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.READ_EXTERNAL_STORAGE'] ===
        PermissionsAndroid.RESULTS.GRANTED;
    if (!ok)
      Alert.alert(
        'Permissions required',
        'Camera + storage permissions are needed.',
      );
    return ok;
  };

  const takePhoto = async () => {
    if (!(await requestAndroidPermissions())) return;
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 1,
      includeBase64: false,
      saveToPhotos: true,
    };
    const result = await launchCamera(options);
    if (result.assets?.length) {
      setPhotos(curr => [...curr, ...result.assets!]);
      if (onSelectImage && result.assets[0].uri) {
        onSelectImage(result.assets[0].uri);
      }
    }
  };

  const pickFromGallery = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1,
      selectionLimit: 0,
      includeBase64: false,
    };
    const result = await launchImageLibrary(options);
    if (result.assets?.length) {
      setPhotos(curr => [...curr, ...result.assets!]);
      if (onSelectImage && result.assets[0].uri) {
        onSelectImage(result.assets[0].uri);
      }
    }
  };

  const recordVideo = async () => {
    if (!(await requestAndroidPermissions())) return;
    const options: CameraOptions = {
      mediaType: 'video',
      videoQuality: 'high',
      durationLimit: 60,
      saveToPhotos: true,
    };
    const result = await launchCamera(options);
    if (result.assets?.length) {
      setPhotos(curr => [...curr, ...result.assets!]);
    }
  };

  return (
    <View style={{marginBottom: 20, width: '100%'}}>
      <View style={styles.imagePickerRow}>
        {[
          {label: 'Take Photo', onPress: takePhoto},
          {label: 'Record Video', onPress: recordVideo},
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

      {!selectedUri && (
        <ScrollView contentContainerStyle={styles.grid}>
          {photos
            .filter((photo): photo is Asset & {uri: string} => !!photo.uri)
            .map((photo, idx) => (
              <TouchableOpacity
                key={photo.uri + idx}
                onPress={() => onSelectImage?.(photo.uri)}>
                <Image
                  source={{uri: photo.uri}}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
        </ScrollView>
      )}
    </View>
  );
}

///////////////////

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
//       width: '100%',
//     },
//     buttonWrapper: {
//       flex: 1,
//     },
//     buttonSpacer: {
//       width: 8,
//     },
//     grid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
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
//         ].map(({label, onPress}, i) => (
//           <React.Fragment key={label}>
//             {i !== 0 && <View style={styles.buttonSpacer} />}
//             <View style={styles.buttonWrapper}>
//               <AppleTouchFeedback
//                 onPress={onPress}
//                 hapticStyle="impactMedium"
//                 style={globalStyles.buttonPrimary}>
//                 <Text style={globalStyles.buttonPrimaryText}>{label}</Text>
//               </AppleTouchFeedback>
//             </View>
//           </React.Fragment>
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
