/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {Camera, useCameraDevices} from 'react-native-vision-camera';
import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {tokens} from '../styles/tokens/tokens';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {getInferredCategory} from '../utils/categoryUtils';

interface Props {
  onClose?: () => void;
  onOutfitGenerated?: (data: any) => void;
}

export default function BarcodeScannerScreen({
  onClose,
  onOutfitGenerated,
}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {userId} = useUUID();

  const devices = useCameraDevices();
  const device = Array.isArray(devices)
    ? devices.find(d => d.position === 'back')
    : devices.back;
  const cameraRef = useRef<Camera>(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);

  /* ---- Request camera permission ---- */
  useEffect(() => {
    (async () => {
      const permission =
        Platform.OS === 'ios'
          ? await Camera.requestCameraPermission()
          : await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.CAMERA,
            );
      setHasPermission(permission === 'authorized' || permission === 'granted');
    })();
  }, []);

  /* ---- Capture photo and decode barcode ---- */
  const captureAndDecode = useCallback(async () => {
    if (!cameraRef.current) return;
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'speed',
      });

      const form = new FormData();
      form.append('file', {
        uri: `file://${photo.path}`,
        type: 'image/jpeg',
        name: 'barcode.jpg',
      });

      console.log('📸 Uploading photo to decode...');
      const res = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();

      console.log('🧠 Barcode decode result:', data);

      if (!data?.barcode) {
        Alert.alert(
          'No barcode detected',
          'Try again with clearer focus or lighting.',
        );
        return;
      }

      const barcode = data.barcode;
      console.log('✅ Detected barcode:', barcode);
      await handleScan(barcode);
    } catch (err) {
      console.warn('❌ captureAndDecode error:', err);
      Alert.alert('Error', 'Unable to capture or decode barcode.');
    } finally {
      setLoading(false);
    }
  }, [cameraRef]);

  /* ---- Fetch product info for decoded barcode ---- */
  /* ---- Fetch product info for decoded barcode (via backend fallback) ---- */
  const handleScan = useCallback(async (barcode: string) => {
    setLoading(true);
    try {
      console.log('🔎 Fetching product from backend:', barcode);

      const res = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({upc: barcode}),
      });

      if (!res.ok) {
        console.warn('⚠️ lookup-barcode failed with', res.status);
        Alert.alert('Error', 'Failed to fetch product info from backend.');
        return;
      }

      const data = await res.json();
      console.log('📦 Backend product lookup result:', data);

      if (!data?.name) {
        Alert.alert('Not Found', 'No product data for this barcode.');
        return;
      }

      const normalized = {
        name: data.name,
        brand: data.brand,
        image: data.image,
        category: data.category,
      };

      setScannedItems(prev =>
        prev.find(p => p.name === normalized.name)
          ? prev
          : [...prev, normalized],
      );
    } catch (err) {
      console.warn('❌ handleScan error:', err);
      Alert.alert('Error', 'Failed to fetch product info.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---- Build AI Outfit ---- */
  const buildOutfitFromScans = useCallback(async () => {
    if (scannedItems.length === 0) {
      Alert.alert('No items', 'Scan at least one product first.');
      return;
    }
    setBuilding(true);
    try {
      const payload = scannedItems.map(s => ({
        name: s.name,
        brand: s.brand,
        image_url: s.image,
        ...getInferredCategory(s.name),
      }));

      const res = await fetch(`${API_BASE_URL}/ai/recreate-from-barcodes`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({items: payload, user_id: userId}),
      });

      const data = await res.json();
      onOutfitGenerated?.(data);
    } catch (err) {
      console.warn('❌ buildOutfitFromScans error:', err);
      Alert.alert('Error', 'Failed to generate outfit.');
    } finally {
      setBuilding(false);
    }
  }, [scannedItems, userId, onOutfitGenerated]);

  /* ---- Render ---- */
  if (!hasPermission || !device) {
    return (
      <SafeAreaView
        style={[
          globalStyles.center,
          {backgroundColor: theme.colors.background},
        ]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{color: theme.colors.foreground, marginTop: 8}}>
          Loading camera...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
      <Camera
        ref={cameraRef}
        style={{flex: 1}}
        device={device}
        isActive={true}
        photo={true}
      />

      {loading && (
        <View
          style={{
            ...globalStyles.loadingOverlay,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <ActivityIndicator size="large" color={theme.colors.foreground} />
        </View>
      )}

      {/* Footer */}
      <View
        style={{
          borderTopWidth: tokens.borderWidth.sm,
          borderTopColor: theme.colors.surfaceBorder,
          backgroundColor: theme.colors.surface,
        }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}>
          <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
            Scanned Items ({scannedItems.length})
          </Text>
          {onClose && (
            <TouchableOpacity onPress={onClose}>
              <Text style={{color: theme.colors.foreground}}>Close</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Thumbnails */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{padding: 8}}>
          {scannedItems.map((s, i) => (
            <View key={i} style={{alignItems: 'center', marginRight: 12}}>
              {s.image ? (
                <Image
                  source={{uri: s.image}}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: tokens.borderRadius.md,
                    borderWidth: tokens.borderWidth.sm,
                    borderColor: theme.colors.surfaceBorder,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 70,
                    height: 70,
                    backgroundColor: theme.colors.surface,
                    borderRadius: tokens.borderRadius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{color: theme.colors.foreground, fontSize: 12}}>
                    No Img
                  </Text>
                </View>
              )}
              <Text
                numberOfLines={1}
                style={{
                  color: theme.colors.foreground,
                  fontSize: 11,
                  marginTop: 4,
                  width: 70,
                  textAlign: 'center',
                }}>
                {s.brand || 'Brand'}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Buttons */}
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginHorizontal: 16,
            marginBottom: 16,
          }}>
          <AppleTouchFeedback onPress={captureAndDecode}>
            <View
              style={{
                flex: 1,
                backgroundColor: theme.colors.primary,
                borderRadius: tokens.borderRadius.lg,
                paddingVertical: 14,
                alignItems: 'center',
              }}>
              <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
                Capture Barcode
              </Text>
            </View>
          </AppleTouchFeedback>

          <AppleTouchFeedback onPress={buildOutfitFromScans}>
            <View
              style={{
                flex: 1,
                backgroundColor: theme.colors.accent,
                borderRadius: tokens.borderRadius.lg,
                paddingVertical: 14,
                alignItems: 'center',
              }}>
              {building ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
                  Build Outfit
                </Text>
              )}
            </View>
          </AppleTouchFeedback>
        </View>
      </View>
    </SafeAreaView>
  );
}

/////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ScrollView,
//   Image,
//   ActivityIndicator,
//   Alert,
//   SafeAreaView,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {getInferredCategory} from '../utils/categoryUtils';

// interface Props {
//   onClose?: () => void;
//   onOutfitGenerated?: (data: any) => void;
// }

// export default function BarcodeScannerScreen({
//   onClose,
//   onOutfitGenerated,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {userId} = useUUID();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [scannedItems, setScannedItems] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [building, setBuilding] = useState(false);

//   /* ---- Request camera permission ---- */
//   useEffect(() => {
//     (async () => {
//       const permission =
//         Platform.OS === 'ios'
//           ? await Camera.requestCameraPermission()
//           : await PermissionsAndroid.request(
//               PermissionsAndroid.PERMISSIONS.CAMERA,
//             );
//       setHasPermission(permission === 'authorized' || permission === 'granted');
//     })();
//   }, []);

//   /* ---- Capture photo and decode barcode ---- */
//   const captureAndDecode = useCallback(async () => {
//     if (!cameraRef.current) return;
//     setLoading(true);
//     try {
//       const photo = await cameraRef.current.takePhoto({
//         qualityPrioritization: 'speed',
//       });

//       const form = new FormData();
//       form.append('file', {
//         uri: `file://${photo.path}`,
//         type: 'image/jpeg',
//         name: 'barcode.jpg',
//       });

//       console.log('📸 Uploading photo to decode...');
//       const res = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const data = await res.json();

//       console.log('🧠 Barcode decode result:', data);

//       if (!data?.barcode) {
//         Alert.alert(
//           'No barcode detected',
//           'Try again with clearer focus or lighting.',
//         );
//         return;
//       }

//       const barcode = data.barcode;
//       console.log('✅ Detected barcode:', barcode);
//       await handleScan(barcode);
//     } catch (err) {
//       console.warn('❌ captureAndDecode error:', err);
//       Alert.alert('Error', 'Unable to capture or decode barcode.');
//     } finally {
//       setLoading(false);
//     }
//   }, [cameraRef]);

//   /* ---- Fetch product info for decoded barcode ---- */
//   const handleScan = useCallback(async (barcode: string) => {
//     setLoading(true);
//     try {
//       const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
//       console.log('🔎 Fetching product:', url);

//       const res = await fetch(url);
//       const text = await res.text();

//       let json: any;
//       try {
//         json = JSON.parse(text);
//       } catch {
//         Alert.alert(
//           'API Error',
//           'UPCItemDB returned invalid response. Try again.',
//         );
//         return;
//       }

//       const item = json.items?.[0];
//       if (!item) {
//         Alert.alert('Not Found', 'No product data for this barcode.');
//         return;
//       }

//       const normalized = {
//         name: item.title,
//         brand: item.brand,
//         image: item.images?.[0],
//         category: item.category,
//       };

//       setScannedItems(prev =>
//         prev.find(p => p.name === normalized.name)
//           ? prev
//           : [...prev, normalized],
//       );
//     } catch (err) {
//       console.warn('❌ handleScan error:', err);
//       Alert.alert('Error', 'Failed to fetch product info.');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   /* ---- Build AI Outfit ---- */
//   const buildOutfitFromScans = useCallback(async () => {
//     if (scannedItems.length === 0) {
//       Alert.alert('No items', 'Scan at least one product first.');
//       return;
//     }
//     setBuilding(true);
//     try {
//       const payload = scannedItems.map(s => ({
//         name: s.name,
//         brand: s.brand,
//         image_url: s.image,
//         ...getInferredCategory(s.name),
//       }));

//       const res = await fetch(`${API_BASE_URL}/ai/recreate-from-barcodes`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({items: payload, user_id: userId}),
//       });

//       const data = await res.json();
//       onOutfitGenerated?.(data);
//     } catch (err) {
//       console.warn('❌ buildOutfitFromScans error:', err);
//       Alert.alert('Error', 'Failed to generate outfit.');
//     } finally {
//       setBuilding(false);
//     }
//   }, [scannedItems, userId, onOutfitGenerated]);

//   /* ---- Render ---- */
//   if (!hasPermission || !device) {
//     return (
//       <SafeAreaView
//         style={[
//           globalStyles.center,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text style={{color: theme.colors.foreground, marginTop: 8}}>
//           Loading camera...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <Camera
//         ref={cameraRef}
//         style={{flex: 1}}
//         device={device}
//         isActive={true}
//         photo={true}
//       />

//       {loading && (
//         <View
//           style={{
//             ...globalStyles.loadingOverlay,
//             alignItems: 'center',
//             justifyContent: 'center',
//           }}>
//           <ActivityIndicator size="large" color={theme.colors.foreground} />
//         </View>
//       )}

//       {/* Footer */}
//       <View
//         style={{
//           borderTopWidth: tokens.borderWidth.sm,
//           borderTopColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface,
//         }}>
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             paddingVertical: 8,
//           }}>
//           <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//             Scanned Items ({scannedItems.length})
//           </Text>
//           {onClose && (
//             <TouchableOpacity onPress={onClose}>
//               <Text style={{color: theme.colors.foreground}}>Close</Text>
//             </TouchableOpacity>
//           )}
//         </View>

//         {/* Thumbnails */}
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={{padding: 8}}>
//           {scannedItems.map((s, i) => (
//             <View key={i} style={{alignItems: 'center', marginRight: 12}}>
//               {s.image ? (
//                 <Image
//                   source={{uri: s.image}}
//                   style={{
//                     width: 70,
//                     height: 70,
//                     borderRadius: tokens.borderRadius.md,
//                     borderWidth: tokens.borderWidth.sm,
//                     borderColor: theme.colors.surfaceBorder,
//                   }}
//                 />
//               ) : (
//                 <View
//                   style={{
//                     width: 70,
//                     height: 70,
//                     backgroundColor: theme.colors.surface,
//                     borderRadius: tokens.borderRadius.md,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                   }}>
//                   <Text style={{color: theme.colors.foreground, fontSize: 12}}>
//                     No Img
//                   </Text>
//                 </View>
//               )}
//               <Text
//                 numberOfLines={1}
//                 style={{
//                   color: theme.colors.foreground,
//                   fontSize: 11,
//                   marginTop: 4,
//                   width: 70,
//                   textAlign: 'center',
//                 }}>
//                 {s.brand || 'Brand'}
//               </Text>
//             </View>
//           ))}
//         </ScrollView>

//         {/* Buttons */}
//         <View
//           style={{
//             flexDirection: 'row',
//             gap: 8,
//             marginHorizontal: 16,
//             marginBottom: 16,
//           }}>
//           <AppleTouchFeedback onPress={captureAndDecode}>
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: theme.colors.primary,
//                 borderRadius: tokens.borderRadius.lg,
//                 paddingVertical: 14,
//                 alignItems: 'center',
//               }}>
//               <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
//                 Capture Barcode
//               </Text>
//             </View>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback onPress={buildOutfitFromScans}>
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: theme.colors.accent,
//                 borderRadius: tokens.borderRadius.lg,
//                 paddingVertical: 14,
//                 alignItems: 'center',
//               }}>
//               {building ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
//                   Build Outfit
//                 </Text>
//               )}
//             </View>
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

/////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ScrollView,
//   Image,
//   ActivityIndicator,
//   Alert,
//   SafeAreaView,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {getInferredCategory} from '../utils/categoryUtils';

// interface Props {
//   onClose?: () => void;
//   onOutfitGenerated?: (data: any) => void;
// }

// export default function BarcodeScannerScreen({
//   onClose,
//   onOutfitGenerated,
// }: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const {userId} = useUUID();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [scannedItems, setScannedItems] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [building, setBuilding] = useState(false);

//   /* ---- Request camera permission ---- */
//   useEffect(() => {
//     (async () => {
//       const permission =
//         Platform.OS === 'ios'
//           ? await Camera.requestCameraPermission()
//           : await PermissionsAndroid.request(
//               PermissionsAndroid.PERMISSIONS.CAMERA,
//             );
//       setHasPermission(permission === 'authorized' || permission === 'granted');
//     })();
//   }, []);

//   /* ---- Capture photo and decode barcode ---- */
//   const captureAndDecode = useCallback(async () => {
//     if (!cameraRef.current) return;
//     setLoading(true);
//     try {
//       const photo = await cameraRef.current.takePhoto({
//         qualityPrioritization: 'speed',
//       });

//       const form = new FormData();
//       form.append('file', {
//         uri: `file://${photo.path}`,
//         type: 'image/jpeg',
//         name: 'barcode.jpg',
//       });

//       console.log('📸 Uploading photo to decode...');
//       const res = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const data = await res.json();

//       console.log('🧠 Barcode decode result:', data);

//       if (!data?.barcode) {
//         Alert.alert(
//           'No barcode detected',
//           'Try again with clearer focus or lighting.',
//         );
//         return;
//       }

//       const barcode = data.barcode;
//       console.log('✅ Detected barcode:', barcode);
//       await handleScan(barcode);
//     } catch (err) {
//       console.warn('❌ captureAndDecode error:', err);
//       Alert.alert('Error', 'Unable to capture or decode barcode.');
//     } finally {
//       setLoading(false);
//     }
//   }, [cameraRef]);

//   /* ---- Fetch product info for decoded barcode ---- */
//   const handleScan = useCallback(async (barcode: string) => {
//     setLoading(true);
//     try {
//       const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
//       console.log('🔎 Fetching product:', url);

//       const res = await fetch(url);
//       const text = await res.text();

//       let json: any;
//       try {
//         json = JSON.parse(text);
//       } catch {
//         Alert.alert(
//           'API Error',
//           'UPCItemDB returned invalid response. Try again.',
//         );
//         return;
//       }

//       const item = json.items?.[0];
//       if (!item) {
//         Alert.alert('Not Found', 'No product data for this barcode.');
//         return;
//       }

//       const normalized = {
//         name: item.title,
//         brand: item.brand,
//         image: item.images?.[0],
//         category: item.category,
//       };

//       setScannedItems(prev =>
//         prev.find(p => p.name === normalized.name)
//           ? prev
//           : [...prev, normalized],
//       );
//     } catch (err) {
//       console.warn('❌ handleScan error:', err);
//       Alert.alert('Error', 'Failed to fetch product info.');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   /* ---- Build AI Outfit ---- */
//   const buildOutfitFromScans = useCallback(async () => {
//     if (scannedItems.length === 0) {
//       Alert.alert('No items', 'Scan at least one product first.');
//       return;
//     }
//     setBuilding(true);
//     try {
//       const payload = scannedItems.map(s => ({
//         name: s.name,
//         brand: s.brand,
//         image_url: s.image,
//         ...getInferredCategory(s.name),
//       }));

//       const res = await fetch(`${API_BASE_URL}/ai/recreate-from-barcodes`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({items: payload, user_id: userId}),
//       });

//       const data = await res.json();
//       onOutfitGenerated?.(data);
//     } catch (err) {
//       console.warn('❌ buildOutfitFromScans error:', err);
//       Alert.alert('Error', 'Failed to generate outfit.');
//     } finally {
//       setBuilding(false);
//     }
//   }, [scannedItems, userId, onOutfitGenerated]);

//   /* ---- Render ---- */
//   if (!hasPermission || !device) {
//     return (
//       <SafeAreaView
//         style={[
//           globalStyles.center,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.primary} />
//         <Text style={{color: theme.colors.foreground, marginTop: 8}}>
//           Loading camera...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <Camera
//         ref={cameraRef}
//         style={{flex: 1}}
//         device={device}
//         isActive={true}
//         photo={true}
//       />

//       {loading && (
//         <View
//           style={{
//             ...globalStyles.loadingOverlay,
//             alignItems: 'center',
//             justifyContent: 'center',
//           }}>
//           <ActivityIndicator size="large" color={theme.colors.foreground} />
//         </View>
//       )}

//       {/* Footer */}
//       <View
//         style={{
//           borderTopWidth: tokens.borderWidth.sm,
//           borderTopColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface,
//         }}>
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             paddingVertical: 8,
//           }}>
//           <Text style={{color: theme.colors.foreground, fontWeight: '600'}}>
//             Scanned Items ({scannedItems.length})
//           </Text>
//           {onClose && (
//             <TouchableOpacity onPress={onClose}>
//               <Text style={{color: theme.colors.foreground}}>Close</Text>
//             </TouchableOpacity>
//           )}
//         </View>

//         {/* Thumbnails */}
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={{padding: 8}}>
//           {scannedItems.map((s, i) => (
//             <View key={i} style={{alignItems: 'center', marginRight: 12}}>
//               {s.image ? (
//                 <Image
//                   source={{uri: s.image}}
//                   style={{
//                     width: 70,
//                     height: 70,
//                     borderRadius: tokens.borderRadius.md,
//                     borderWidth: tokens.borderWidth.sm,
//                     borderColor: theme.colors.surfaceBorder,
//                   }}
//                 />
//               ) : (
//                 <View
//                   style={{
//                     width: 70,
//                     height: 70,
//                     backgroundColor: theme.colors.surface,
//                     borderRadius: tokens.borderRadius.md,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                   }}>
//                   <Text style={{color: theme.colors.foreground, fontSize: 12}}>
//                     No Img
//                   </Text>
//                 </View>
//               )}
//               <Text
//                 numberOfLines={1}
//                 style={{
//                   color: theme.colors.foreground,
//                   fontSize: 11,
//                   marginTop: 4,
//                   width: 70,
//                   textAlign: 'center',
//                 }}>
//                 {s.brand || 'Brand'}
//               </Text>
//             </View>
//           ))}
//         </ScrollView>

//         {/* Buttons */}
//         <View
//           style={{
//             flexDirection: 'row',
//             gap: 8,
//             marginHorizontal: 16,
//             marginBottom: 16,
//           }}>
//           <AppleTouchFeedback onPress={captureAndDecode}>
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: theme.colors.primary,
//                 borderRadius: tokens.borderRadius.lg,
//                 paddingVertical: 14,
//                 alignItems: 'center',
//               }}>
//               <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
//                 Capture Barcode
//               </Text>
//             </View>
//           </AppleTouchFeedback>

//           <AppleTouchFeedback onPress={buildOutfitFromScans}>
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: theme.colors.accent,
//                 borderRadius: tokens.borderRadius.lg,
//                 paddingVertical: 14,
//                 alignItems: 'center',
//               }}>
//               {building ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
//                   Build Outfit
//                 </Text>
//               )}
//             </View>
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }
