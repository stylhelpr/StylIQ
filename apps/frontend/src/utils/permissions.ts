import {Platform, Alert} from 'react-native';
import {
  check,
  request,
  openSettings,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';

/* -------------------------------------------------------------------------- */
/* 🎥 Camera + Photo Library                                                  */
/* -------------------------------------------------------------------------- */

const getCameraPermission = () =>
  Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

const getLibraryPermission = () =>
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.PHOTO_LIBRARY
    : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

export async function ensureCameraAndLibraryPermissions(): Promise<boolean> {
  const cameraPerm = getCameraPermission();
  const libraryPerm = getLibraryPermission();

  // --- CAMERA ---
  let camStatus = await check(cameraPerm);
  if (camStatus === RESULTS.DENIED || camStatus === RESULTS.LIMITED) {
    camStatus = await request(cameraPerm);
  }

  if (camStatus !== RESULTS.GRANTED) {
    Alert.alert(
      'Camera Permission',
      'We need access to your camera to take photos.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open Settings', onPress: () => openSettings()},
      ],
    );
    return false;
  }

  // --- LIBRARY ---
  let libStatus = await check(libraryPerm);
  if (libStatus === RESULTS.DENIED || libStatus === RESULTS.LIMITED) {
    libStatus = await request(libraryPerm);
  }

  if (libStatus !== RESULTS.GRANTED) {
    Alert.alert(
      'Photo Library Permission',
      'We need access to your library to pick existing images.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open Settings', onPress: () => openSettings()},
      ],
    );
    return false;
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* 📍 Location                                                                */
/* -------------------------------------------------------------------------- */

const getLocationPermission = () =>
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

export async function ensureLocationPermission(): Promise<boolean> {
  const locationPerm = getLocationPermission();
  let status = await check(locationPerm);

  switch (status) {
    case RESULTS.GRANTED:
      return true;

    case RESULTS.DENIED:
    case RESULTS.LIMITED: {
      // Request will trigger the real iOS system prompt if not permanently denied
      const newStatus = await request(locationPerm);
      return newStatus === RESULTS.GRANTED;
    }

    case RESULTS.BLOCKED: {
      // User permanently denied or removed permission in Settings
      Alert.alert(
        'Location Permission Blocked',
        'To enable weather-based outfit suggestions, please allow location access in Settings.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: () => openSettings()},
        ],
      );
      return false;
    }

    default:
      return false;
  }
}

/////////////////

// import {Platform, Alert} from 'react-native';
// import {
//   check,
//   request,
//   openSettings,
//   PERMISSIONS,
//   RESULTS,
// } from 'react-native-permissions';

// const getCameraPermission = () =>
//   Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

// const getLibraryPermission = () =>
//   Platform.OS === 'ios'
//     ? PERMISSIONS.IOS.PHOTO_LIBRARY
//     : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

// const getLocationPermission = () =>
//   Platform.OS === 'ios'
//     ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
//     : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

// export async function ensureCameraAndLibraryPermissions(): Promise<boolean> {
//   const cameraPerm = getCameraPermission();
//   const libraryPerm = getLibraryPermission();

//   let camStatus = await check(cameraPerm);
//   if (camStatus === RESULTS.DENIED || camStatus === RESULTS.LIMITED) {
//     camStatus = await request(cameraPerm);
//   }
//   if (camStatus !== RESULTS.GRANTED) {
//     Alert.alert(
//       'Camera Permission',
//       'We need access to your camera to take photos.',
//       [
//         {text: 'Cancel', style: 'cancel'},
//         {text: 'Open Settings', onPress: () => openSettings()},
//       ],
//     );
//     return false;
//   }

//   let libStatus = await check(libraryPerm);
//   if (libStatus === RESULTS.DENIED || libStatus === RESULTS.LIMITED) {
//     libStatus = await request(libraryPerm);
//   }
//   if (libStatus !== RESULTS.GRANTED) {
//     Alert.alert(
//       'Photo Library Permission',
//       'We need access to your library to pick existing images.',
//       [
//         {text: 'Cancel', style: 'cancel'},
//         {text: 'Open Settings', onPress: () => openSettings()},
//       ],
//     );
//     return false;
//   }

//   return true;
// }

// export async function ensureLocationPermission(): Promise<boolean> {
//   const locationPerm = getLocationPermission();

//   let locStatus = await check(locationPerm);
//   if (locStatus === RESULTS.DENIED || locStatus === RESULTS.LIMITED) {
//     locStatus = await request(locationPerm);
//   }

//   if (locStatus !== RESULTS.GRANTED) {
//     Alert.alert(
//       'Location Permission',
//       'We need your location to show local weather.',
//       [
//         {text: 'Cancel', style: 'cancel'},
//         {text: 'Open Settings', onPress: () => openSettings()},
//       ],
//     );
//     return false;
//   }

//   return true;
// }
