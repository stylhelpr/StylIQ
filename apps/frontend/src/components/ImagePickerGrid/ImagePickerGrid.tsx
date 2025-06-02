import React, {useState} from 'react';
import {
  View,
  Button,
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

type Props = {
  onSelectImage?: (uri: string) => void;
};

export default function ImagePickerGrid({onSelectImage}: Props) {
  const [photos, setPhotos] = useState<Asset[]>([]);

  const styles = StyleSheet.create({
    container: {flex: 1},
    buttons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    thumbnail: {
      width: 100,
      height: 100,
      margin: 4,
      borderRadius: 8,
      backgroundColor: '#eee',
    },
    imagePickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
      marginBottom: 4,
    },
    imagePickerButton: {
      flex: 1,
      backgroundColor: '#405de6',
      paddingVertical: 6,
      borderRadius: 10,
      alignItems: 'center',
    },
    imagePickerText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
  });

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
      saveToPhotos: true,
    };
    const result = await launchCamera(options);
    if (result.assets?.length) {
      setPhotos(curr => [...curr, ...result.assets!]);
      if (onSelectImage && result.assets[0].uri) {
        onSelectImage(result.assets[0].uri); // ✅ auto-select first
      }
    }
  };

  const pickFromGallery = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: 0,
    };
    const result = await launchImageLibrary(options);
    if (result.assets?.length) {
      setPhotos(curr => [...curr, ...result.assets!]);
      if (onSelectImage && result.assets[0].uri) {
        onSelectImage(result.assets[0].uri); // ✅ auto-select first
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
    <View style={styles.container}>
      <View style={styles.imagePickerRow}>
        <TouchableOpacity style={styles.imagePickerButton} onPress={takePhoto}>
          <Text style={styles.imagePickerText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.imagePickerButton}
          onPress={recordVideo}>
          <Text style={styles.imagePickerText}>Record Video</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.imagePickerButton}
          onPress={pickFromGallery}>
          <Text style={styles.imagePickerText}>Photo Library</Text>
        </TouchableOpacity>
      </View>

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
    </View>
  );
}

////////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Button,
//   Image,
//   Platform,
//   PermissionsAndroid,
//   ScrollView,
//   StyleSheet,
//   Alert,
//   TouchableOpacity,
// } from 'react-native';
// import {
//   launchCamera,
//   launchImageLibrary,
//   Asset,
//   ImageLibraryOptions,
//   CameraOptions,
// } from 'react-native-image-picker';

// type Props = {
//   onSelectImage?: (uri: string) => void;
// };

// export default function ImagePickerGrid({onSelectImage}: Props) {
//   const [photos, setPhotos] = useState<Asset[]>([]);

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
//       saveToPhotos: true,
//     };
//     const result = await launchCamera(options);
//     if (result.assets?.length) {
//       setPhotos(curr => [...curr, ...result.assets!]);
//       if (onSelectImage && result.assets[0].uri) {
//         onSelectImage(result.assets[0].uri); // ✅ auto-select first
//       }
//     }
//   };

//   const pickFromGallery = async () => {
//     const options: ImageLibraryOptions = {
//       mediaType: 'photo',
//       selectionLimit: 0,
//     };
//     const result = await launchImageLibrary(options);
//     if (result.assets?.length) {
//       setPhotos(curr => [...curr, ...result.assets!]);
//       if (onSelectImage && result.assets[0].uri) {
//         onSelectImage(result.assets[0].uri); // ✅ auto-select first
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
//     <View style={styles.container}>
//       <View style={styles.buttons}>
//         <View style={{flex: 1, marginHorizontal: 4}}>
//           <Button title="Take Photo" onPress={takePhoto} />
//         </View>
//         <View style={{flex: 1, marginHorizontal: 4}}>
//           <Button title="Record Video" onPress={recordVideo} />
//         </View>
//         <View style={{flex: 1, marginHorizontal: 4}}>
//           <Button title="Choose from Library" onPress={pickFromGallery} />
//         </View>
//       </View>

//       <ScrollView contentContainerStyle={styles.grid}>
//         {photos
//           .filter((photo): photo is Asset & {uri: string} => !!photo.uri)
//           .map((photo, idx) => (
//             <TouchableOpacity
//               key={photo.uri + idx}
//               onPress={() => onSelectImage?.(photo.uri)}>
//               <Image
//                 source={{uri: photo.uri}}
//                 style={styles.thumbnail}
//                 resizeMode="cover"
//               />
//             </TouchableOpacity>
//           ))}
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, padding: 16, backgroundColor: '#fff'},
//   buttons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   grid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'flex-start',
//   },
//   thumbnail: {
//     width: 100,
//     height: 100,
//     margin: 4,
//     borderRadius: 8,
//     backgroundColor: '#eee',
//   },
// });
