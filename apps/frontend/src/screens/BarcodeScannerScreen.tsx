/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Image,
  ScrollView,
  Modal,
  Linking,
  Animated,
} from 'react-native';
import {Camera, useCameraDevices} from 'react-native-vision-camera';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as Animatable from 'react-native-animatable';
import {useAppTheme} from '../context/ThemeContext';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {tokens} from '../styles/tokens/tokens';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import IntegratedShopOverlay from '../components/ShopModal/IntegratedShopOverlay';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

export default function BarcodeScannerScreen({
  navigate,
  goBack,
  onClose,
}: {
  onClose?: () => void;
}) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const userId = useUUID();

  const insets = useSafeAreaInsets();

  const devices = useCameraDevices();
  const device = Array.isArray(devices)
    ? devices.find(d => d.position === 'back')
    : devices.back;
  const cameraRef = useRef<Camera>(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outfitResult, setOutfitResult] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [flashAnim] = useState(new Animated.Value(0));
  const [toastVisible, setToastVisible] = useState(false);
  const [shopUrl, setShopUrl] = useState<string | null>(null);
  const [shopOverlayVisible, setShopOverlayVisible] = useState(false);

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

  /* ---- Flash overlay animation ---- */
  const triggerFlash = useCallback(() => {
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [flashAnim]);

  /* ---- Capture photo ---- */
  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    ReactNativeHapticFeedback.trigger('impactMedium');
    triggerFlash();

    const photo = await cameraRef.current.takePhoto({
      qualityPrioritization: 'speed',
    });
    console.log('📸 Photo captured:', photo.path);

    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1500);

    setCapturedPhoto(`file://${photo.path}`);
    setConfirmVisible(true);
  }, [cameraRef, triggerFlash]);

  /* ---- Confirm and process ---- */
  const processCapturedPhoto = useCallback(async () => {
    if (!capturedPhoto) return;
    setConfirmVisible(false);
    setLoading(true);

    try {
      const form = new FormData();
      form.append('file', {
        uri: capturedPhoto,
        type: 'image/jpeg',
        name: 'barcode.jpg',
      });

      console.log('📸 Uploading photo to decode...');
      const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
        method: 'POST',
        body: form,
      });
      const decodeData = await decodeRes.json();
      console.log('🧠 Barcode decode result:', decodeData);

      if (decodeData?.barcode) {
        const barcode = decodeData.barcode;
        const productRes = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({upc: barcode}),
        });
        const product = await productRes.json();

        if (!product?.name) {
          Alert.alert('Not Found', 'No product data found.');
          return;
        }

        const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            user_id: userId,
            tags: [product.name, product.brand, product.category].filter(
              Boolean,
            ),
          }),
        });

        const outfit = await recreateRes.json();
        ReactNativeHapticFeedback.trigger('impactMedium');
        setOutfitResult(outfit);
        setModalVisible(true);
        return;
      }

      if (decodeData?.inferred?.name) {
        const item = decodeData.inferred;
        const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            user_id: userId,
            tags: [item.name, item.brand, item.category, item.material].filter(
              Boolean,
            ),
          }),
        });

        const outfit = await recreateRes.json();
        ReactNativeHapticFeedback.trigger('impactMedium');
        setOutfitResult(outfit);
        setModalVisible(true);
        return;
      }

      Alert.alert('No barcode detected', 'Try again with clearer focus.');
    } catch (err) {
      console.warn('❌ processCapturedPhoto error:', err);
      Alert.alert('Error', 'Unable to process image.');
    } finally {
      setLoading(false);
      setCapturedPhoto(null);
    }
  }, [capturedPhoto, userId]);

  /* ---- Render ---- */
  if (!hasPermission || !device) {
    return (
      <SafeAreaView
        style={[
          globalStyles.centeredSection,
          {backgroundColor: theme.colors.background},
        ]}>
        <ActivityIndicator size="large" color={theme.colors.foreground} />
        <Text style={{color: theme.colors.foreground, marginTop: 8}}>
          Loading camera...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
      <View style={[globalStyles.screen, globalStyles.container]}>
        <View
          style={{
            height: insets.top + 0, // ⬅️ 56 is about the old navbar height
            backgroundColor: theme.colors.background, // same tone as old nav
          }}
        />
        <Text style={globalStyles.header}>Barcode Scanner</Text>
        {/* 🔙 Back Button */}
        <View
          style={[
            globalStyles.backContainer,
            {
              marginTop: 12,
              paddingLeft: 8,
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}>
          <AppleTouchFeedback
            onPress={() => {
              try {
                // ✅ Always try props first
                if (onClose) return onClose();
                if (goBack) return goBack();

                // ✅ Fallback: force navigation to ClosetScreen
                navigate && navigate('Wardrobe');
              } catch (e) {
                console.warn('Back navigation failed:', e);
              }
            }}
            hapticStyle="impactMedium"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: 16,
            }}>
            <MaterialIcons
              name="arrow-back"
              size={26}
              color={theme.colors.button3}
            />
            <Text
              style={[
                globalStyles.backText,
                {marginLeft: 8, fontSize: 16, color: theme.colors.button1},
              ]}>
              Back
            </Text>
          </AppleTouchFeedback>
        </View>

        {/* 📸 Camera */}
        <Camera
          ref={cameraRef}
          style={{
            flexGrow: 1,
            height: '65%', // 👈 increase this percentage for more camera height
            overflow: 'hidden',
            marginTop: 70,
          }}
          device={device}
          isActive={!modalVisible && !confirmVisible}
          photo={true}
        />
        {/* ⚡ Flash overlay */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors.foreground,
            opacity: flashAnim,
          }}
        />

        {/* ✅ Photo captured toast */}
        {toastVisible && (
          <Animatable.View
            animation="fadeInUp"
            duration={200}
            style={{
              position: 'absolute',
              bottom: 130,
              alignSelf: 'center',
              backgroundColor: 'rgba(0,0,0,0.7)',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
            }}>
            <Text style={{color: '#fff', fontWeight: '600'}}>
              Photo captured ✓
            </Text>
          </Animatable.View>
        )}

        {/* ⏳ Loading spinner */}
        {loading && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: tokens.borderRadius.lg,
            }}>
            <ActivityIndicator size="large" color={theme.colors.foreground} />
            <Text
              style={{
                color: theme.colors.foreground,
                marginTop: 16,
                fontSize: 14,
                opacity: 0.8,
              }}>
              Photo taken. Processing look...
            </Text>
          </View>
        )}

        {/* 🔘 Capture button */}
        {!modalVisible && !confirmVisible && (
          <View
            style={{
              borderTopWidth: tokens.borderWidth.sm,
              borderTopColor: theme.colors.surfaceBorder,
              backgroundColor: theme.colors.background,
              paddingHorizontal: 16,
              paddingTop: 22,
              // 👇 Raise the entire block a bit higher on the screen:
              paddingBottom:
                Platform.OS === 'ios'
                  ? Math.max(insets.bottom, 12) + 8 // adds safe-area + 8px gap
                  : 24, // Android baseline
              marginBottom: 100, // 👈 pulls the block higher visually
            }}>
            <AppleTouchFeedback onPress={capturePhoto} hapticStyle="none">
              <View
                style={{
                  backgroundColor: theme.colors.button1,
                  borderRadius: tokens.borderRadius.lg,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    color: theme.colors.foreground,
                    fontWeight: '600',
                    fontSize: 16,
                  }}>
                  Scan to Style It
                </Text>
              </View>
            </AppleTouchFeedback>

            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={{marginTop: 12, alignItems: 'center'}}>
                <Text style={{color: theme.colors.foreground}}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 📸 Confirm Photo Modal */}
        <Modal visible={confirmVisible} animationType="fade" transparent>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.8)',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 20,
            }}>
            {capturedPhoto && (
              <Image
                source={{uri: capturedPhoto}}
                style={{
                  width: '90%',
                  height: 400,
                  borderRadius: tokens.borderRadius.lg,
                  marginBottom: 20,
                }}
                resizeMode="cover"
              />
            )}
            <View style={{width: '90%'}}>
              <TouchableOpacity
                onPress={processCapturedPhoto}
                style={{
                  backgroundColor: theme.colors.button1,
                  paddingVertical: 14,
                  borderRadius: tokens.borderRadius.lg,
                  alignItems: 'center',
                  marginBottom: 10,
                }}>
                <Text
                  style={{
                    color: theme.colors.foreground,
                    fontWeight: '600',
                  }}>
                  Analyze / Style It
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setCapturedPhoto(null);
                  setConfirmVisible(false);
                }}
                style={{
                  backgroundColor: theme.colors.surface3,
                  paddingVertical: 14,
                  borderRadius: tokens.borderRadius.lg,
                  alignItems: 'center',
                  marginBottom: 10,
                }}>
                <Text style={{color: theme.colors.foreground}}>
                  Retake Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setCapturedPhoto(null);
                  setConfirmVisible(false);
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.colors.muted,
                  paddingVertical: 14,
                  borderRadius: tokens.borderRadius.lg,
                  marginBottom: 10,
                }}>
                <Text style={{color: theme.colors.foreground, opacity: 0.6}}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 🪞 Result Modal */}
        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setModalVisible(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.6)',
              justifyContent: 'flex-end',
            }}>
            {/* 🔹 Backdrop Touchable to close modal */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setModalVisible(false)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />

            {/* 🔹 Modal Content (keeps its own touch area) */}
            <Animatable.View
              animation="slideInUp"
              duration={450}
              easing="ease-out"
              style={{
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: tokens.borderRadius.xl,
                borderTopRightRadius: tokens.borderRadius.xl,
                paddingTop: 16,
                paddingBottom: 20,
                maxHeight: '75%',
              }}>
              <ScrollView contentContainerStyle={{paddingHorizontal: 16}}>
                <Text
                  style={{
                    color: theme.colors.foreground,
                    fontWeight: '600',
                    fontSize: 17,
                    marginBottom: 12,
                    textAlign: 'center',
                  }}>
                  Your Styled Look
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}>
                  {outfitResult?.outfit?.map((item: any, i: number) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.9}
                      onPress={() => {
                        if (item.shopUrl) {
                          ReactNativeHapticFeedback.trigger('impactMedium');
                          setModalVisible(false); // 👈 close the Styled Look modal
                          setTimeout(() => {
                            setShopUrl(item.shopUrl);
                            setShopOverlayVisible(true); // 👈 then show the overlay
                          }, 250); // small delay lets close animation finish
                        }
                      }}
                      style={{
                        width: '30%',
                        marginBottom: 12,
                        alignItems: 'center',
                      }}>
                      {item.image && (
                        <Image
                          source={{uri: item.image}}
                          style={{
                            width: '100%',
                            height: 90,
                            borderRadius: tokens.borderRadius.md,
                          }}
                          resizeMode="cover"
                        />
                      )}
                      <Text
                        numberOfLines={2}
                        style={{
                          color: theme.colors.foreground,
                          fontSize: 12,
                          marginTop: 4,
                          textAlign: 'center',
                        }}>
                        {item.category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {outfitResult?.style_note && (
                  <Text
                    style={{
                      marginTop: 6,
                      color: theme.colors.foreground,
                      fontSize: 13,
                      lineHeight: 18,
                      textAlign: 'center',
                    }}>
                    {outfitResult.style_note}
                  </Text>
                )}
              </ScrollView>

              {/* 🔘 Close button or other actions here */}
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setOutfitResult(null);
                }}
                style={{
                  alignItems: 'center',
                  paddingVertical: 14,
                  backgroundColor: theme.colors.button1,
                  marginTop: 12,
                  borderRadius: tokens.borderRadius.lg,
                  marginHorizontal: 16,
                }}>
                <Text
                  style={{color: theme.colors.foreground, fontWeight: '600'}}>
                  Scan Another
                </Text>
              </TouchableOpacity>
            </Animatable.View>
          </View>
        </Modal>
      </View>

      {/* 🛍️ Shop Overlay */}
      {shopOverlayVisible && (
        <IntegratedShopOverlay
          visible={shopOverlayVisible}
          url={shopUrl}
          onClose={() => setShopOverlayVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   PermissionsAndroid,
//   Platform,
//   Image,
//   ScrollView,
//   Modal,
//   Linking,
//   Animated,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import IntegratedShopOverlay from '../components/ShopModal/IntegratedShopOverlay';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

// export default function BarcodeScannerScreen({
//   navigate,
//   goBack,
//   onClose,
// }: {
//   onClose?: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const insets = useSafeAreaInsets();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [outfitResult, setOutfitResult] = useState<any | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [confirmVisible, setConfirmVisible] = useState(false);
//   const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
//   const [flashAnim] = useState(new Animated.Value(0));
//   const [toastVisible, setToastVisible] = useState(false);
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const [shopOverlayVisible, setShopOverlayVisible] = useState(false);

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

//   /* ---- Flash overlay animation ---- */
//   const triggerFlash = useCallback(() => {
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 80,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 200,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, [flashAnim]);

//   /* ---- Capture photo ---- */
//   const capturePhoto = useCallback(async () => {
//     if (!cameraRef.current) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     triggerFlash();

//     const photo = await cameraRef.current.takePhoto({
//       qualityPrioritization: 'speed',
//     });
//     console.log('📸 Photo captured:', photo.path);

//     setToastVisible(true);
//     setTimeout(() => setToastVisible(false), 1500);

//     setCapturedPhoto(`file://${photo.path}`);
//     setConfirmVisible(true);
//   }, [cameraRef, triggerFlash]);

//   /* ---- Confirm and process ---- */
//   const processCapturedPhoto = useCallback(async () => {
//     if (!capturedPhoto) return;
//     setConfirmVisible(false);
//     setLoading(true);

//     try {
//       const form = new FormData();
//       form.append('file', {
//         uri: capturedPhoto,
//         type: 'image/jpeg',
//         name: 'barcode.jpg',
//       });

//       console.log('📸 Uploading photo to decode...');
//       const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const decodeData = await decodeRes.json();
//       console.log('🧠 Barcode decode result:', decodeData);

//       if (decodeData?.barcode) {
//         const barcode = decodeData.barcode;
//         const productRes = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({upc: barcode}),
//         });
//         const product = await productRes.json();

//         if (!product?.name) {
//           Alert.alert('Not Found', 'No product data found.');
//           return;
//         }

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [product.name, product.brand, product.category].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       if (decodeData?.inferred?.name) {
//         const item = decodeData.inferred;
//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [item.name, item.brand, item.category, item.material].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       Alert.alert('No barcode detected', 'Try again with clearer focus.');
//     } catch (err) {
//       console.warn('❌ processCapturedPhoto error:', err);
//       Alert.alert('Error', 'Unable to process image.');
//     } finally {
//       setLoading(false);
//       setCapturedPhoto(null);
//     }
//   }, [capturedPhoto, userId]);

//   /* ---- Render ---- */
//   if (!hasPermission || !device) {
//     return (
//       <SafeAreaView
//         style={[
//           globalStyles.centeredSection,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.foreground} />
//         <Text style={{color: theme.colors.foreground, marginTop: 8}}>
//           Loading camera...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <View style={[globalStyles.screen, globalStyles.container]}>
//         <View
//           style={{
//             height: insets.top + 0, // ⬅️ 56 is about the old navbar height
//             backgroundColor: theme.colors.background, // same tone as old nav
//           }}
//         />
//         <Text style={globalStyles.header}>Barcode Scanner</Text>
//         {/* 🔙 Back Button */}
//         <View
//           style={[
//             globalStyles.backContainer,
//             {
//               marginTop: 12,
//               paddingLeft: 8,
//               flexDirection: 'row',
//               alignItems: 'center',
//             },
//           ]}>
//           <AppleTouchFeedback
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactMedium');

//               try {
//                 // ✅ Always try props first
//                 if (onClose) return onClose();
//                 if (goBack) return goBack();

//                 // ✅ Fallback: force navigation to ClosetScreen
//                 navigate && navigate('ClosetScreen');
//               } catch (e) {
//                 console.warn('Back navigation failed:', e);
//               }
//             }}
//             hapticStyle="impactMedium"
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               marginLeft: 16,
//             }}>
//             <MaterialIcons
//               name="arrow-back"
//               size={26}
//               color={theme.colors.button3}
//             />
//             <Text
//               style={[
//                 globalStyles.backText,
//                 {marginLeft: 8, fontSize: 16, color: theme.colors.button1},
//               ]}>
//               Back
//             </Text>
//           </AppleTouchFeedback>
//         </View>

//         {/* 📸 Camera */}
//         <Camera
//           ref={cameraRef}
//           style={{
//             flexGrow: 1,
//             height: '65%', // 👈 increase this percentage for more camera height
//             overflow: 'hidden',
//             marginTop: 70,
//           }}
//           device={device}
//           isActive={!modalVisible && !confirmVisible}
//           photo={true}
//         />
//         {/* ⚡ Flash overlay */}
//         <Animated.View
//           pointerEvents="none"
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: theme.colors.foreground,
//             opacity: flashAnim,
//           }}
//         />

//         {/* ✅ Photo captured toast */}
//         {toastVisible && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={200}
//             style={{
//               position: 'absolute',
//               bottom: 130,
//               alignSelf: 'center',
//               backgroundColor: 'rgba(0,0,0,0.7)',
//               paddingHorizontal: 16,
//               paddingVertical: 10,
//               borderRadius: 20,
//             }}>
//             <Text style={{color: '#fff', fontWeight: '600'}}>
//               Photo captured ✓
//             </Text>
//           </Animatable.View>
//         )}

//         {/* ⏳ Loading spinner */}
//         {loading && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'rgba(0,0,0,0.4)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               borderRadius: tokens.borderRadius.lg,
//             }}>
//             <ActivityIndicator size="large" color={theme.colors.foreground} />
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 marginTop: 16,
//                 fontSize: 14,
//                 opacity: 0.8,
//               }}>
//               Photo taken. Processing look...
//             </Text>
//           </View>
//         )}

//         {/* 🔘 Capture button */}
//         {!modalVisible && !confirmVisible && (
//           <View
//             style={{
//               borderTopWidth: tokens.borderWidth.sm,
//               borderTopColor: theme.colors.surfaceBorder,
//               backgroundColor: theme.colors.background,
//               paddingHorizontal: 16,
//               paddingTop: 22,
//               // 👇 Raise the entire block a bit higher on the screen:
//               paddingBottom:
//                 Platform.OS === 'ios'
//                   ? Math.max(insets.bottom, 12) + 8 // adds safe-area + 8px gap
//                   : 24, // Android baseline
//               marginBottom: 100, // 👈 pulls the block higher visually
//             }}>
//             <AppleTouchFeedback onPress={capturePhoto}>
//               <View
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   borderRadius: tokens.borderRadius.lg,
//                   paddingVertical: 14,
//                   alignItems: 'center',
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 16,
//                   }}>
//                   Scan to Style It
//                 </Text>
//               </View>
//             </AppleTouchFeedback>

//             {onClose && (
//               <TouchableOpacity
//                 onPress={onClose}
//                 style={{marginTop: 12, alignItems: 'center'}}>
//                 <Text style={{color: theme.colors.foreground}}>Close</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {/* 📸 Confirm Photo Modal */}
//         <Modal visible={confirmVisible} animationType="fade" transparent>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.8)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingHorizontal: 20,
//             }}>
//             {capturedPhoto && (
//               <Image
//                 source={{uri: capturedPhoto}}
//                 style={{
//                   width: '90%',
//                   height: 400,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 20,
//                 }}
//                 resizeMode="cover"
//               />
//             )}
//             <View style={{width: '90%'}}>
//               <TouchableOpacity
//                 onPress={processCapturedPhoto}
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                   }}>
//                   Analyze / Style It
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   backgroundColor: theme.colors.surface3,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground}}>
//                   Retake Photo
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   backgroundColor: theme.colors.muted,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground, opacity: 0.6}}>
//                   Cancel
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>

//         {/* 🪞 Result Modal */}
//         <Modal
//           visible={modalVisible}
//           animationType="fade"
//           transparent
//           onRequestClose={() => setModalVisible(false)}>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'flex-end',
//             }}>
//             {/* 🔹 Backdrop Touchable to close modal */}
//             <TouchableOpacity
//               activeOpacity={1}
//               onPress={() => setModalVisible(false)}
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />

//             {/* 🔹 Modal Content (keeps its own touch area) */}
//             <Animatable.View
//               animation="slideInUp"
//               duration={450}
//               easing="ease-out"
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 borderTopLeftRadius: tokens.borderRadius.xl,
//                 borderTopRightRadius: tokens.borderRadius.xl,
//                 paddingTop: 16,
//                 paddingBottom: 20,
//                 maxHeight: '75%',
//               }}>
//               <ScrollView contentContainerStyle={{paddingHorizontal: 16}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 17,
//                     marginBottom: 12,
//                     textAlign: 'center',
//                   }}>
//                   Your Styled Look
//                 </Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                     marginBottom: 12,
//                   }}>
//                   {outfitResult?.outfit?.map((item: any, i: number) => (
//                     <TouchableOpacity
//                       key={i}
//                       activeOpacity={0.9}
//                       onPress={() => {
//                         if (item.shopUrl) {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           setModalVisible(false); // 👈 close the Styled Look modal
//                           setTimeout(() => {
//                             setShopUrl(item.shopUrl);
//                             setShopOverlayVisible(true); // 👈 then show the overlay
//                           }, 250); // small delay lets close animation finish
//                         }
//                       }}
//                       style={{
//                         width: '30%',
//                         marginBottom: 12,
//                         alignItems: 'center',
//                       }}>
//                       {item.image && (
//                         <Image
//                           source={{uri: item.image}}
//                           style={{
//                             width: '100%',
//                             height: 90,
//                             borderRadius: tokens.borderRadius.md,
//                           }}
//                           resizeMode="cover"
//                         />
//                       )}
//                       <Text
//                         numberOfLines={2}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 12,
//                           marginTop: 4,
//                           textAlign: 'center',
//                         }}>
//                         {item.category}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>

//                 {outfitResult?.style_note && (
//                   <Text
//                     style={{
//                       marginTop: 6,
//                       color: theme.colors.foreground,
//                       fontSize: 13,
//                       lineHeight: 18,
//                       textAlign: 'center',
//                     }}>
//                     {outfitResult.style_note}
//                   </Text>
//                 )}
//               </ScrollView>

//               {/* 🔘 Close button or other actions here */}
//               <TouchableOpacity
//                 onPress={() => {
//                   setModalVisible(false);
//                   setOutfitResult(null);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   paddingVertical: 14,
//                   backgroundColor: theme.colors.button1,
//                   marginTop: 12,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginHorizontal: 16,
//                 }}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                   Scan Another
//                 </Text>
//               </TouchableOpacity>
//             </Animatable.View>
//           </View>
//         </Modal>
//       </View>

//       {/* 🛍️ Shop Overlay */}
//       {shopOverlayVisible && (
//         <IntegratedShopOverlay
//           visible={shopOverlayVisible}
//           url={shopUrl}
//           onClose={() => setShopOverlayVisible(false)}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

///////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   PermissionsAndroid,
//   Platform,
//   Image,
//   ScrollView,
//   Modal,
//   Linking,
//   Animated,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import IntegratedShopOverlay from '../components/ShopModal/IntegratedShopOverlay';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

// export default function BarcodeScannerScreen({
//   navigate,
//   goBack,
//   onClose,
// }: {
//   onClose?: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const insets = useSafeAreaInsets();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [outfitResult, setOutfitResult] = useState<any | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [confirmVisible, setConfirmVisible] = useState(false);
//   const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
//   const [flashAnim] = useState(new Animated.Value(0));
//   const [toastVisible, setToastVisible] = useState(false);
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const [shopOverlayVisible, setShopOverlayVisible] = useState(false);

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

//   /* ---- Flash overlay animation ---- */
//   const triggerFlash = useCallback(() => {
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 80,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 200,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, [flashAnim]);

//   /* ---- Capture photo ---- */
//   const capturePhoto = useCallback(async () => {
//     if (!cameraRef.current) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     triggerFlash();

//     const photo = await cameraRef.current.takePhoto({
//       qualityPrioritization: 'speed',
//     });
//     console.log('📸 Photo captured:', photo.path);

//     setToastVisible(true);
//     setTimeout(() => setToastVisible(false), 1500);

//     setCapturedPhoto(`file://${photo.path}`);
//     setConfirmVisible(true);
//   }, [cameraRef, triggerFlash]);

//   /* ---- Confirm and process ---- */
//   const processCapturedPhoto = useCallback(async () => {
//     if (!capturedPhoto) return;
//     setConfirmVisible(false);
//     setLoading(true);

//     try {
//       const form = new FormData();
//       form.append('file', {
//         uri: capturedPhoto,
//         type: 'image/jpeg',
//         name: 'barcode.jpg',
//       });

//       console.log('📸 Uploading photo to decode...');
//       const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const decodeData = await decodeRes.json();
//       console.log('🧠 Barcode decode result:', decodeData);

//       if (decodeData?.barcode) {
//         const barcode = decodeData.barcode;
//         const productRes = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({upc: barcode}),
//         });
//         const product = await productRes.json();

//         if (!product?.name) {
//           Alert.alert('Not Found', 'No product data found.');
//           return;
//         }

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [product.name, product.brand, product.category].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       if (decodeData?.inferred?.name) {
//         const item = decodeData.inferred;
//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [item.name, item.brand, item.category, item.material].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       Alert.alert('No barcode detected', 'Try again with clearer focus.');
//     } catch (err) {
//       console.warn('❌ processCapturedPhoto error:', err);
//       Alert.alert('Error', 'Unable to process image.');
//     } finally {
//       setLoading(false);
//       setCapturedPhoto(null);
//     }
//   }, [capturedPhoto, userId]);

//   /* ---- Render ---- */
//   if (!hasPermission || !device) {
//     return (
//       <SafeAreaView
//         style={[
//           globalStyles.centeredSection,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.foreground} />
//         <Text style={{color: theme.colors.foreground, marginTop: 8}}>
//           Loading camera...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <View style={[globalStyles.screen, globalStyles.container]}>
//         <View
//           style={{
//             height: insets.top + 0, // ⬅️ 56 is about the old navbar height
//             backgroundColor: theme.colors.background, // same tone as old nav
//           }}
//         />
//         <Text style={globalStyles.header}>Barcode Scanner</Text>
//         {/* 🔙 Back Button */}
//         <View
//           style={[
//             globalStyles.backContainer,
//             {
//               marginTop: 12,
//               paddingLeft: 8,
//               flexDirection: 'row',
//               alignItems: 'center',
//             },
//           ]}>
//           <AppleTouchFeedback
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactMedium');

//               try {
//                 // ✅ Always try props first
//                 if (onClose) return onClose();
//                 if (goBack) return goBack();

//                 // ✅ Fallback: force navigation to ClosetScreen
//                 navigate && navigate('ClosetScreen');
//               } catch (e) {
//                 console.warn('Back navigation failed:', e);
//               }
//             }}
//             hapticStyle="impactMedium"
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               marginLeft: 16,
//             }}>
//             <MaterialIcons
//               name="arrow-back"
//               size={26}
//               color={theme.colors.button3}
//             />
//             <Text
//               style={[
//                 globalStyles.backText,
//                 {marginLeft: 8, fontSize: 16, color: theme.colors.button1},
//               ]}>
//               Back
//             </Text>
//           </AppleTouchFeedback>
//         </View>

//         {/* 📸 Camera */}
//         <Camera
//           ref={cameraRef}
//           style={{
//             flexGrow: 1,
//             height: '85%', // 👈 increase this percentage for more camera height
//             overflow: 'hidden',
//             marginTop: 0,
//           }}
//           device={device}
//           isActive={!modalVisible && !confirmVisible}
//           photo={true}
//         />
//         {/* ⚡ Flash overlay */}
//         <Animated.View
//           pointerEvents="none"
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: theme.colors.foreground,
//             opacity: flashAnim,
//           }}
//         />

//         {/* ✅ Photo captured toast */}
//         {toastVisible && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={200}
//             style={{
//               position: 'absolute',
//               bottom: 130,
//               alignSelf: 'center',
//               backgroundColor: 'rgba(0,0,0,0.7)',
//               paddingHorizontal: 16,
//               paddingVertical: 10,
//               borderRadius: 20,
//             }}>
//             <Text style={{color: '#fff', fontWeight: '600'}}>
//               Photo captured ✓
//             </Text>
//           </Animatable.View>
//         )}

//         {/* ⏳ Loading spinner */}
//         {loading && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'rgba(0,0,0,0.4)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               borderRadius: tokens.borderRadius.lg,
//             }}>
//             <ActivityIndicator size="large" color={theme.colors.foreground} />
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 marginTop: 16,
//                 fontSize: 14,
//                 opacity: 0.8,
//               }}>
//               Photo taken. Processing look...
//             </Text>
//           </View>
//         )}

//         {/* 🔘 Capture button */}
//         {!modalVisible && !confirmVisible && (
//           <View
//             style={{
//               borderTopWidth: tokens.borderWidth.sm,
//               borderTopColor: theme.colors.surfaceBorder,
//               backgroundColor: theme.colors.background,
//               paddingHorizontal: 16,
//               paddingTop: 20,
//               paddingBottom: 40, // 👈 adds extra space below the button
//               marginTop: 3, // 👈 pushes the whole block further down
//             }}>
//             <AppleTouchFeedback onPress={capturePhoto}>
//               <View
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   borderRadius: tokens.borderRadius.lg,
//                   paddingVertical: 14,
//                   alignItems: 'center',
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 16,
//                   }}>
//                   Scan to Style It
//                 </Text>
//               </View>
//             </AppleTouchFeedback>

//             {onClose && (
//               <TouchableOpacity
//                 onPress={onClose}
//                 style={{marginTop: 12, alignItems: 'center'}}>
//                 <Text style={{color: theme.colors.foreground}}>Close</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {/* 📸 Confirm Photo Modal */}
//         <Modal visible={confirmVisible} animationType="fade" transparent>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.8)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingHorizontal: 20,
//             }}>
//             {capturedPhoto && (
//               <Image
//                 source={{uri: capturedPhoto}}
//                 style={{
//                   width: '90%',
//                   height: 400,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 20,
//                 }}
//                 resizeMode="cover"
//               />
//             )}
//             <View style={{width: '90%'}}>
//               <TouchableOpacity
//                 onPress={processCapturedPhoto}
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                   }}>
//                   Analyze / Style It
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   backgroundColor: theme.colors.surface3,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground}}>
//                   Retake Photo
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   backgroundColor: theme.colors.muted,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground, opacity: 0.6}}>
//                   Cancel
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>

//         {/* 🪞 Result Modal */}
//         <Modal
//           visible={modalVisible}
//           animationType="fade"
//           transparent
//           onRequestClose={() => setModalVisible(false)}>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'flex-end',
//             }}>
//             {/* 🔹 Backdrop Touchable to close modal */}
//             <TouchableOpacity
//               activeOpacity={1}
//               onPress={() => setModalVisible(false)}
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />

//             {/* 🔹 Modal Content (keeps its own touch area) */}
//             <Animatable.View
//               animation="slideInUp"
//               duration={450}
//               easing="ease-out"
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 borderTopLeftRadius: tokens.borderRadius.xl,
//                 borderTopRightRadius: tokens.borderRadius.xl,
//                 paddingTop: 16,
//                 paddingBottom: 20,
//                 maxHeight: '75%',
//               }}>
//               <ScrollView contentContainerStyle={{paddingHorizontal: 16}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 17,
//                     marginBottom: 12,
//                     textAlign: 'center',
//                   }}>
//                   Your Styled Look
//                 </Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                     marginBottom: 12,
//                   }}>
//                   {outfitResult?.outfit?.map((item: any, i: number) => (
//                     <TouchableOpacity
//                       key={i}
//                       activeOpacity={0.9}
//                       onPress={() => {
//                         if (item.shopUrl) {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           setModalVisible(false); // 👈 close the Styled Look modal
//                           setTimeout(() => {
//                             setShopUrl(item.shopUrl);
//                             setShopOverlayVisible(true); // 👈 then show the overlay
//                           }, 250); // small delay lets close animation finish
//                         }
//                       }}
//                       style={{
//                         width: '30%',
//                         marginBottom: 12,
//                         alignItems: 'center',
//                       }}>
//                       {item.image && (
//                         <Image
//                           source={{uri: item.image}}
//                           style={{
//                             width: '100%',
//                             height: 90,
//                             borderRadius: tokens.borderRadius.md,
//                           }}
//                           resizeMode="cover"
//                         />
//                       )}
//                       <Text
//                         numberOfLines={2}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 12,
//                           marginTop: 4,
//                           textAlign: 'center',
//                         }}>
//                         {item.category}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>

//                 {outfitResult?.style_note && (
//                   <Text
//                     style={{
//                       marginTop: 6,
//                       color: theme.colors.foreground,
//                       fontSize: 13,
//                       lineHeight: 18,
//                       textAlign: 'center',
//                     }}>
//                     {outfitResult.style_note}
//                   </Text>
//                 )}
//               </ScrollView>

//               {/* 🔘 Close button or other actions here */}
//               <TouchableOpacity
//                 onPress={() => {
//                   setModalVisible(false);
//                   setOutfitResult(null);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   paddingVertical: 14,
//                   backgroundColor: theme.colors.button1,
//                   marginTop: 12,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginHorizontal: 16,
//                 }}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                   Scan Another
//                 </Text>
//               </TouchableOpacity>
//             </Animatable.View>
//           </View>
//         </Modal>
//       </View>

//       {/* 🛍️ Shop Overlay */}
//       {shopOverlayVisible && (
//         <IntegratedShopOverlay
//           visible={shopOverlayVisible}
//           url={shopUrl}
//           onClose={() => setShopOverlayVisible(false)}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

//////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   SafeAreaView,
//   PermissionsAndroid,
//   Platform,
//   Image,
//   ScrollView,
//   Modal,
//   Linking,
//   Animated,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import IntegratedShopOverlay from '../components/ShopModal/IntegratedShopOverlay';

// export default function BarcodeScannerScreen({
//   navigate,
//   goBack,
//   onClose,
// }: {
//   onClose?: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [outfitResult, setOutfitResult] = useState<any | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [confirmVisible, setConfirmVisible] = useState(false);
//   const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
//   const [flashAnim] = useState(new Animated.Value(0));
//   const [toastVisible, setToastVisible] = useState(false);
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const [shopOverlayVisible, setShopOverlayVisible] = useState(false);

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

//   /* ---- Flash overlay animation ---- */
//   const triggerFlash = useCallback(() => {
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 80,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 200,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, [flashAnim]);

//   /* ---- Capture photo ---- */
//   const capturePhoto = useCallback(async () => {
//     if (!cameraRef.current) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     triggerFlash();

//     const photo = await cameraRef.current.takePhoto({
//       qualityPrioritization: 'speed',
//     });
//     console.log('📸 Photo captured:', photo.path);

//     setToastVisible(true);
//     setTimeout(() => setToastVisible(false), 1500);

//     setCapturedPhoto(`file://${photo.path}`);
//     setConfirmVisible(true);
//   }, [cameraRef, triggerFlash]);

//   /* ---- Confirm and process ---- */
//   const processCapturedPhoto = useCallback(async () => {
//     if (!capturedPhoto) return;
//     setConfirmVisible(false);
//     setLoading(true);

//     try {
//       const form = new FormData();
//       form.append('file', {
//         uri: capturedPhoto,
//         type: 'image/jpeg',
//         name: 'barcode.jpg',
//       });

//       console.log('📸 Uploading photo to decode...');
//       const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const decodeData = await decodeRes.json();
//       console.log('🧠 Barcode decode result:', decodeData);

//       if (decodeData?.barcode) {
//         const barcode = decodeData.barcode;
//         const productRes = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({upc: barcode}),
//         });
//         const product = await productRes.json();

//         if (!product?.name) {
//           Alert.alert('Not Found', 'No product data found.');
//           return;
//         }

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [product.name, product.brand, product.category].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       if (decodeData?.inferred?.name) {
//         const item = decodeData.inferred;
//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [item.name, item.brand, item.category, item.material].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       Alert.alert('No barcode detected', 'Try again with clearer focus.');
//     } catch (err) {
//       console.warn('❌ processCapturedPhoto error:', err);
//       Alert.alert('Error', 'Unable to process image.');
//     } finally {
//       setLoading(false);
//       setCapturedPhoto(null);
//     }
//   }, [capturedPhoto, userId]);

//   /* ---- Render ---- */
//   if (!hasPermission || !device) {
//     return (
//       <SafeAreaView
//         style={[
//           globalStyles.centeredSection,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.foreground} />
//         <Text style={{color: theme.colors.foreground, marginTop: 8}}>
//           Loading camera...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <View style={[globalStyles.screen, globalStyles.container]}>
//         <Text style={globalStyles.header}>Barcode Scanner</Text>
//         {/* 🔙 Back Button */}
//         <View
//           style={[
//             globalStyles.backContainer,
//             {
//               marginTop: 12,
//               paddingLeft: 8,
//               flexDirection: 'row',
//               alignItems: 'center',
//             },
//           ]}>
//           <AppleTouchFeedback
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactMedium');

//               try {
//                 // ✅ Always try props first
//                 if (onClose) return onClose();
//                 if (goBack) return goBack();

//                 // ✅ Fallback: force navigation to ClosetScreen
//                 navigate && navigate('ClosetScreen');
//               } catch (e) {
//                 console.warn('Back navigation failed:', e);
//               }
//             }}
//             hapticStyle="impactMedium"
//             style={{
//               flexDirection: 'row',
//               alignItems: 'center',
//               marginLeft: 16,
//             }}>
//             <MaterialIcons
//               name="arrow-back"
//               size={26}
//               color={theme.colors.button3}
//             />
//             <Text
//               style={[
//                 globalStyles.backText,
//                 {marginLeft: 8, fontSize: 16, color: theme.colors.button1},
//               ]}>
//               Back
//             </Text>
//           </AppleTouchFeedback>
//         </View>

//         {/* 📸 Camera */}
//         <Camera
//           ref={cameraRef}
//           style={{
//             flexGrow: 1,
//             height: '85%', // 👈 increase this percentage for more camera height
//             overflow: 'hidden',
//             marginTop: 0,
//           }}
//           device={device}
//           isActive={!modalVisible && !confirmVisible}
//           photo={true}
//         />
//         {/* ⚡ Flash overlay */}
//         <Animated.View
//           pointerEvents="none"
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: theme.colors.foreground,
//             opacity: flashAnim,
//           }}
//         />

//         {/* ✅ Photo captured toast */}
//         {toastVisible && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={200}
//             style={{
//               position: 'absolute',
//               bottom: 130,
//               alignSelf: 'center',
//               backgroundColor: 'rgba(0,0,0,0.7)',
//               paddingHorizontal: 16,
//               paddingVertical: 10,
//               borderRadius: 20,
//             }}>
//             <Text style={{color: '#fff', fontWeight: '600'}}>
//               Photo captured ✓
//             </Text>
//           </Animatable.View>
//         )}

//         {/* ⏳ Loading spinner */}
//         {loading && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'rgba(0,0,0,0.4)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               borderRadius: tokens.borderRadius.lg,
//             }}>
//             <ActivityIndicator size="large" color={theme.colors.foreground} />
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 marginTop: 16,
//                 fontSize: 14,
//                 opacity: 0.8,
//               }}>
//               Photo taken. Processing look...
//             </Text>
//           </View>
//         )}

//         {/* 🔘 Capture button */}
//         {!modalVisible && !confirmVisible && (
//           <View
//             style={{
//               borderTopWidth: tokens.borderWidth.sm,
//               borderTopColor: theme.colors.surfaceBorder,
//               backgroundColor: theme.colors.background,
//               paddingHorizontal: 16,
//               paddingTop: 20,
//               paddingBottom: 40, // 👈 adds extra space below the button
//               marginTop: 3, // 👈 pushes the whole block further down
//             }}>
//             <AppleTouchFeedback onPress={capturePhoto}>
//               <View
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   borderRadius: tokens.borderRadius.lg,
//                   paddingVertical: 14,
//                   alignItems: 'center',
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 16,
//                   }}>
//                   Scan to Style It
//                 </Text>
//               </View>
//             </AppleTouchFeedback>

//             {onClose && (
//               <TouchableOpacity
//                 onPress={onClose}
//                 style={{marginTop: 12, alignItems: 'center'}}>
//                 <Text style={{color: theme.colors.foreground}}>Close</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {/* 📸 Confirm Photo Modal */}
//         <Modal visible={confirmVisible} animationType="fade" transparent>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.8)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingHorizontal: 20,
//             }}>
//             {capturedPhoto && (
//               <Image
//                 source={{uri: capturedPhoto}}
//                 style={{
//                   width: '90%',
//                   height: 400,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 20,
//                 }}
//                 resizeMode="cover"
//               />
//             )}
//             <View style={{width: '90%'}}>
//               <TouchableOpacity
//                 onPress={processCapturedPhoto}
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                   }}>
//                   Analyze / Style It
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   backgroundColor: theme.colors.surface3,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground}}>
//                   Retake Photo
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   backgroundColor: theme.colors.muted,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground, opacity: 0.6}}>
//                   Cancel
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>

//         {/* 🪞 Result Modal */}
//         <Modal
//           visible={modalVisible}
//           animationType="fade"
//           transparent
//           onRequestClose={() => setModalVisible(false)}>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'flex-end',
//             }}>
//             {/* 🔹 Backdrop Touchable to close modal */}
//             <TouchableOpacity
//               activeOpacity={1}
//               onPress={() => setModalVisible(false)}
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />

//             {/* 🔹 Modal Content (keeps its own touch area) */}
//             <Animatable.View
//               animation="slideInUp"
//               duration={450}
//               easing="ease-out"
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 borderTopLeftRadius: tokens.borderRadius.xl,
//                 borderTopRightRadius: tokens.borderRadius.xl,
//                 paddingTop: 16,
//                 paddingBottom: 20,
//                 maxHeight: '75%',
//               }}>
//               <ScrollView contentContainerStyle={{paddingHorizontal: 16}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 17,
//                     marginBottom: 12,
//                     textAlign: 'center',
//                   }}>
//                   Your Styled Look
//                 </Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                     marginBottom: 12,
//                   }}>
//                   {outfitResult?.outfit?.map((item: any, i: number) => (
//                     <TouchableOpacity
//                       key={i}
//                       activeOpacity={0.9}
//                       onPress={() => {
//                         if (item.shopUrl) {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           setModalVisible(false); // 👈 close the Styled Look modal
//                           setTimeout(() => {
//                             setShopUrl(item.shopUrl);
//                             setShopOverlayVisible(true); // 👈 then show the overlay
//                           }, 250); // small delay lets close animation finish
//                         }
//                       }}
//                       style={{
//                         width: '30%',
//                         marginBottom: 12,
//                         alignItems: 'center',
//                       }}>
//                       {item.image && (
//                         <Image
//                           source={{uri: item.image}}
//                           style={{
//                             width: '100%',
//                             height: 90,
//                             borderRadius: tokens.borderRadius.md,
//                           }}
//                           resizeMode="cover"
//                         />
//                       )}
//                       <Text
//                         numberOfLines={2}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 12,
//                           marginTop: 4,
//                           textAlign: 'center',
//                         }}>
//                         {item.category}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>

//                 {outfitResult?.style_note && (
//                   <Text
//                     style={{
//                       marginTop: 6,
//                       color: theme.colors.foreground,
//                       fontSize: 13,
//                       lineHeight: 18,
//                       textAlign: 'center',
//                     }}>
//                     {outfitResult.style_note}
//                   </Text>
//                 )}
//               </ScrollView>

//               {/* 🔘 Close button or other actions here */}
//               <TouchableOpacity
//                 onPress={() => {
//                   setModalVisible(false);
//                   setOutfitResult(null);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   paddingVertical: 14,
//                   backgroundColor: theme.colors.button1,
//                   marginTop: 12,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginHorizontal: 16,
//                 }}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                   Scan Another
//                 </Text>
//               </TouchableOpacity>
//             </Animatable.View>
//           </View>
//         </Modal>
//       </View>

//       {/* 🛍️ Shop Overlay */}
//       {shopOverlayVisible && (
//         <IntegratedShopOverlay
//           visible={shopOverlayVisible}
//           url={shopUrl}
//           onClose={() => setShopOverlayVisible(false)}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

///////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   SafeAreaView,
//   PermissionsAndroid,
//   Platform,
//   Image,
//   ScrollView,
//   Modal,
//   Linking,
//   Animated,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import IntegratedShopOverlay from '../components/ShopModal/IntegratedShopOverlay';

// export default function BarcodeScannerScreen({
//   onClose,
// }: {
//   onClose?: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [outfitResult, setOutfitResult] = useState<any | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [confirmVisible, setConfirmVisible] = useState(false);
//   const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
//   const [flashAnim] = useState(new Animated.Value(0));
//   const [toastVisible, setToastVisible] = useState(false);
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const [shopOverlayVisible, setShopOverlayVisible] = useState(false);

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

//   /* ---- Flash overlay animation ---- */
//   const triggerFlash = useCallback(() => {
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 80,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 200,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, [flashAnim]);

//   /* ---- Capture photo ---- */
//   const capturePhoto = useCallback(async () => {
//     if (!cameraRef.current) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     triggerFlash();

//     const photo = await cameraRef.current.takePhoto({
//       qualityPrioritization: 'speed',
//     });
//     console.log('📸 Photo captured:', photo.path);

//     setToastVisible(true);
//     setTimeout(() => setToastVisible(false), 1500);

//     setCapturedPhoto(`file://${photo.path}`);
//     setConfirmVisible(true);
//   }, [cameraRef, triggerFlash]);

//   /* ---- Confirm and process ---- */
//   const processCapturedPhoto = useCallback(async () => {
//     if (!capturedPhoto) return;
//     setConfirmVisible(false);
//     setLoading(true);

//     try {
//       const form = new FormData();
//       form.append('file', {
//         uri: capturedPhoto,
//         type: 'image/jpeg',
//         name: 'barcode.jpg',
//       });

//       console.log('📸 Uploading photo to decode...');
//       const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const decodeData = await decodeRes.json();
//       console.log('🧠 Barcode decode result:', decodeData);

//       if (decodeData?.barcode) {
//         const barcode = decodeData.barcode;
//         const productRes = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({upc: barcode}),
//         });
//         const product = await productRes.json();

//         if (!product?.name) {
//           Alert.alert('Not Found', 'No product data found.');
//           return;
//         }

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [product.name, product.brand, product.category].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       if (decodeData?.inferred?.name) {
//         const item = decodeData.inferred;
//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [item.name, item.brand, item.category, item.material].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       Alert.alert('No barcode detected', 'Try again with clearer focus.');
//     } catch (err) {
//       console.warn('❌ processCapturedPhoto error:', err);
//       Alert.alert('Error', 'Unable to process image.');
//     } finally {
//       setLoading(false);
//       setCapturedPhoto(null);
//     }
//   }, [capturedPhoto, userId]);

//   /* ---- Render ---- */
//   if (!hasPermission || !device) {
//     return (
//       <SafeAreaView
//         style={[
//           globalStyles.centeredSection,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.foreground} />
//         <Text style={{color: theme.colors.foreground, marginTop: 8}}>
//           Loading camera...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <View style={[globalStyles.screen, globalStyles.container]}>
//         <Text style={globalStyles.header}>Barcode Scanner</Text>

//         {/* 📸 Camera */}
//         <Camera
//           ref={cameraRef}
//           style={{
//             flexGrow: 1,
//             height: '90%', // 👈 increase this percentage for more camera height
//             overflow: 'hidden',
//             marginTop: 0,
//           }}
//           device={device}
//           isActive={!modalVisible && !confirmVisible}
//           photo={true}
//         />
//         {/* ⚡ Flash overlay */}
//         <Animated.View
//           pointerEvents="none"
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: theme.colors.foreground,
//             opacity: flashAnim,
//           }}
//         />

//         {/* ✅ Photo captured toast */}
//         {toastVisible && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={200}
//             style={{
//               position: 'absolute',
//               bottom: 130,
//               alignSelf: 'center',
//               backgroundColor: 'rgba(0,0,0,0.7)',
//               paddingHorizontal: 16,
//               paddingVertical: 10,
//               borderRadius: 20,
//             }}>
//             <Text style={{color: '#fff', fontWeight: '600'}}>
//               Photo captured ✓
//             </Text>
//           </Animatable.View>
//         )}

//         {/* ⏳ Loading spinner */}
//         {loading && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'rgba(0,0,0,0.4)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               borderRadius: tokens.borderRadius.lg,
//             }}>
//             <ActivityIndicator size="large" color={theme.colors.foreground} />
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 marginTop: 16,
//                 fontSize: 14,
//                 opacity: 0.8,
//               }}>
//               Photo taken. Processing look...
//             </Text>
//           </View>
//         )}

//         {/* 🔘 Capture button */}
//         {!modalVisible && !confirmVisible && (
//           <View
//             style={{
//               borderTopWidth: tokens.borderWidth.sm,
//               borderTopColor: theme.colors.surfaceBorder,
//               backgroundColor: theme.colors.background,
//               paddingHorizontal: 16,
//               paddingTop: 20,
//               paddingBottom: 40, // 👈 adds extra space below the button
//               marginTop: 3, // 👈 pushes the whole block further down
//             }}>
//             <AppleTouchFeedback onPress={capturePhoto}>
//               <View
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   borderRadius: tokens.borderRadius.lg,
//                   paddingVertical: 14,
//                   alignItems: 'center',
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 16,
//                   }}>
//                   Scan to Style It
//                 </Text>
//               </View>
//             </AppleTouchFeedback>

//             {onClose && (
//               <TouchableOpacity
//                 onPress={onClose}
//                 style={{marginTop: 12, alignItems: 'center'}}>
//                 <Text style={{color: theme.colors.foreground}}>Close</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {/* 📸 Confirm Photo Modal */}
//         <Modal visible={confirmVisible} animationType="fade" transparent>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.8)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingHorizontal: 20,
//             }}>
//             {capturedPhoto && (
//               <Image
//                 source={{uri: capturedPhoto}}
//                 style={{
//                   width: '90%',
//                   height: 400,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 20,
//                 }}
//                 resizeMode="cover"
//               />
//             )}
//             <View style={{width: '90%'}}>
//               <TouchableOpacity
//                 onPress={processCapturedPhoto}
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                   }}>
//                   Analyze / Style It
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   backgroundColor: theme.colors.surface3,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground}}>
//                   Retake Photo
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   backgroundColor: theme.colors.muted,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground, opacity: 0.6}}>
//                   Cancel
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>

//         {/* 🪞 Result Modal */}
//         <Modal
//           visible={modalVisible}
//           animationType="fade"
//           transparent
//           onRequestClose={() => setModalVisible(false)}>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'flex-end',
//             }}>
//             {/* 🔹 Backdrop Touchable to close modal */}
//             <TouchableOpacity
//               activeOpacity={1}
//               onPress={() => setModalVisible(false)}
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />

//             {/* 🔹 Modal Content (keeps its own touch area) */}
//             <Animatable.View
//               animation="slideInUp"
//               duration={450}
//               easing="ease-out"
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 borderTopLeftRadius: tokens.borderRadius.xl,
//                 borderTopRightRadius: tokens.borderRadius.xl,
//                 paddingTop: 16,
//                 paddingBottom: 20,
//                 maxHeight: '75%',
//               }}>
//               <ScrollView contentContainerStyle={{paddingHorizontal: 16}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 17,
//                     marginBottom: 12,
//                     textAlign: 'center',
//                   }}>
//                   Your Styled Look
//                 </Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                     marginBottom: 12,
//                   }}>
//                   {outfitResult?.outfit?.map((item: any, i: number) => (
//                     <TouchableOpacity
//                       key={i}
//                       activeOpacity={0.9}
//                       onPress={() => {
//                         if (item.shopUrl) {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           setModalVisible(false); // 👈 close the Styled Look modal
//                           setTimeout(() => {
//                             setShopUrl(item.shopUrl);
//                             setShopOverlayVisible(true); // 👈 then show the overlay
//                           }, 250); // small delay lets close animation finish
//                         }
//                       }}
//                       style={{
//                         width: '30%',
//                         marginBottom: 12,
//                         alignItems: 'center',
//                       }}>
//                       {item.image && (
//                         <Image
//                           source={{uri: item.image}}
//                           style={{
//                             width: '100%',
//                             height: 90,
//                             borderRadius: tokens.borderRadius.md,
//                           }}
//                           resizeMode="cover"
//                         />
//                       )}
//                       <Text
//                         numberOfLines={2}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 12,
//                           marginTop: 4,
//                           textAlign: 'center',
//                         }}>
//                         {item.category}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>

//                 {outfitResult?.style_note && (
//                   <Text
//                     style={{
//                       marginTop: 6,
//                       color: theme.colors.foreground,
//                       fontSize: 13,
//                       lineHeight: 18,
//                       textAlign: 'center',
//                     }}>
//                     {outfitResult.style_note}
//                   </Text>
//                 )}
//               </ScrollView>

//               {/* 🔘 Close button or other actions here */}
//               <TouchableOpacity
//                 onPress={() => {
//                   setModalVisible(false);
//                   setOutfitResult(null);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   paddingVertical: 14,
//                   backgroundColor: theme.colors.button1,
//                   marginTop: 12,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginHorizontal: 16,
//                 }}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                   Scan Another
//                 </Text>
//               </TouchableOpacity>
//             </Animatable.View>
//           </View>
//         </Modal>
//       </View>

//       {/* 🛍️ Shop Overlay */}
//       {shopOverlayVisible && (
//         <IntegratedShopOverlay
//           visible={shopOverlayVisible}
//           url={shopUrl}
//           onClose={() => setShopOverlayVisible(false)}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   SafeAreaView,
//   PermissionsAndroid,
//   Platform,
//   Image,
//   ScrollView,
//   Modal,
//   Linking,
//   Animated,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import IntegratedShopOverlay from '../components/ShopModal/IntegratedShopOverlay';

// export default function BarcodeScannerScreen({
//   onClose,
// }: {
//   onClose?: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [outfitResult, setOutfitResult] = useState<any | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [confirmVisible, setConfirmVisible] = useState(false);
//   const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
//   const [flashAnim] = useState(new Animated.Value(0));
//   const [toastVisible, setToastVisible] = useState(false);
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const [shopOverlayVisible, setShopOverlayVisible] = useState(false);

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

//   /* ---- Flash overlay animation ---- */
//   const triggerFlash = useCallback(() => {
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 80,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 200,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, [flashAnim]);

//   /* ---- Capture photo ---- */
//   const capturePhoto = useCallback(async () => {
//     if (!cameraRef.current) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     triggerFlash();

//     const photo = await cameraRef.current.takePhoto({
//       qualityPrioritization: 'speed',
//     });
//     console.log('📸 Photo captured:', photo.path);

//     setToastVisible(true);
//     setTimeout(() => setToastVisible(false), 1500);

//     setCapturedPhoto(`file://${photo.path}`);
//     setConfirmVisible(true);
//   }, [cameraRef, triggerFlash]);

//   /* ---- Confirm and process ---- */
//   const processCapturedPhoto = useCallback(async () => {
//     if (!capturedPhoto) return;
//     setConfirmVisible(false);
//     setLoading(true);

//     try {
//       const form = new FormData();
//       form.append('file', {
//         uri: capturedPhoto,
//         type: 'image/jpeg',
//         name: 'barcode.jpg',
//       });

//       console.log('📸 Uploading photo to decode...');
//       const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const decodeData = await decodeRes.json();
//       console.log('🧠 Barcode decode result:', decodeData);

//       if (decodeData?.barcode) {
//         const barcode = decodeData.barcode;
//         const productRes = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({upc: barcode}),
//         });
//         const product = await productRes.json();

//         if (!product?.name) {
//           Alert.alert('Not Found', 'No product data found.');
//           return;
//         }

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [product.name, product.brand, product.category].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       if (decodeData?.inferred?.name) {
//         const item = decodeData.inferred;
//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [item.name, item.brand, item.category, item.material].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       Alert.alert('No barcode detected', 'Try again with clearer focus.');
//     } catch (err) {
//       console.warn('❌ processCapturedPhoto error:', err);
//       Alert.alert('Error', 'Unable to process image.');
//     } finally {
//       setLoading(false);
//       setCapturedPhoto(null);
//     }
//   }, [capturedPhoto, userId]);

//   /* ---- Render ---- */
//   if (!hasPermission || !device) {
//     return (
//       <SafeAreaView
//         style={[
//           globalStyles.centeredSection,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.foreground} />
//         <Text style={{color: theme.colors.foreground, marginTop: 8}}>
//           Loading camera...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <View style={[globalStyles.screen, globalStyles.container]}>
//         <Text style={globalStyles.header}>Barcode Scanner</Text>

//         {/* 📸 Camera */}
//         <Camera
//           ref={cameraRef}
//           style={{
//             flexGrow: 1,
//             height: '90%', // 👈 increase this percentage for more camera height
//             borderRadius: tokens.borderRadius.lg,
//             overflow: 'hidden',
//             marginTop: 0,
//           }}
//           device={device}
//           isActive={!modalVisible && !confirmVisible}
//           photo={true}
//         />
//         {/* ⚡ Flash overlay */}
//         <Animated.View
//           pointerEvents="none"
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: theme.colors.foreground,
//             opacity: flashAnim,
//           }}
//         />

//         {/* ✅ Photo captured toast */}
//         {toastVisible && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={200}
//             style={{
//               position: 'absolute',
//               bottom: 130,
//               alignSelf: 'center',
//               backgroundColor: 'rgba(0,0,0,0.7)',
//               paddingHorizontal: 16,
//               paddingVertical: 10,
//               borderRadius: 20,
//             }}>
//             <Text style={{color: '#fff', fontWeight: '600'}}>
//               Photo captured ✓
//             </Text>
//           </Animatable.View>
//         )}

//         {/* ⏳ Loading spinner */}
//         {loading && (
//           <View
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               right: 0,
//               bottom: 0,
//               backgroundColor: 'rgba(0,0,0,0.4)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               borderRadius: tokens.borderRadius.lg,
//             }}>
//             <ActivityIndicator size="large" color={theme.colors.foreground} />
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 marginTop: 16,
//                 fontSize: 14,
//                 opacity: 0.8,
//               }}>
//               Photo taken. Processing look...
//             </Text>
//           </View>
//         )}

//         {/* 🔘 Capture button */}
//         {!modalVisible && !confirmVisible && (
//           <View
//             style={{
//               borderTopWidth: tokens.borderWidth.sm,
//               borderTopColor: theme.colors.surfaceBorder,
//               backgroundColor: theme.colors.background,
//               paddingHorizontal: 16,
//               paddingTop: 20,
//               paddingBottom: 40, // 👈 adds extra space below the button
//               marginTop: 3, // 👈 pushes the whole block further down
//             }}>
//             <AppleTouchFeedback onPress={capturePhoto}>
//               <View
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   borderRadius: tokens.borderRadius.lg,
//                   paddingVertical: 14,
//                   alignItems: 'center',
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 16,
//                   }}>
//                   Scan to Style It
//                 </Text>
//               </View>
//             </AppleTouchFeedback>

//             {onClose && (
//               <TouchableOpacity
//                 onPress={onClose}
//                 style={{marginTop: 12, alignItems: 'center'}}>
//                 <Text style={{color: theme.colors.foreground}}>Close</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {/* 📸 Confirm Photo Modal */}
//         <Modal visible={confirmVisible} animationType="fade" transparent>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.8)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingHorizontal: 20,
//             }}>
//             {capturedPhoto && (
//               <Image
//                 source={{uri: capturedPhoto}}
//                 style={{
//                   width: '90%',
//                   height: 400,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 20,
//                 }}
//                 resizeMode="cover"
//               />
//             )}
//             <View style={{width: '90%'}}>
//               <TouchableOpacity
//                 onPress={processCapturedPhoto}
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                   }}>
//                   Analyze / Style It
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   backgroundColor: theme.colors.surface3,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground}}>
//                   Retake Photo
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   backgroundColor: theme.colors.muted,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground, opacity: 0.6}}>
//                   Cancel
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>

//         {/* 🪞 Result Modal */}
//         <Modal
//           visible={modalVisible}
//           animationType="fade"
//           transparent
//           onRequestClose={() => setModalVisible(false)}>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'flex-end',
//             }}>
//             {/* 🔹 Backdrop Touchable to close modal */}
//             <TouchableOpacity
//               activeOpacity={1}
//               onPress={() => setModalVisible(false)}
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//               }}
//             />

//             {/* 🔹 Modal Content (keeps its own touch area) */}
//             <Animatable.View
//               animation="slideInUp"
//               duration={450}
//               easing="ease-out"
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 borderTopLeftRadius: tokens.borderRadius.xl,
//                 borderTopRightRadius: tokens.borderRadius.xl,
//                 paddingTop: 16,
//                 paddingBottom: 20,
//                 maxHeight: '75%',
//               }}>
//               <ScrollView contentContainerStyle={{paddingHorizontal: 16}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 17,
//                     marginBottom: 12,
//                     textAlign: 'center',
//                   }}>
//                   Your Styled Look
//                 </Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                     marginBottom: 12,
//                   }}>
//                   {outfitResult?.outfit?.map((item: any, i: number) => (
//                     <TouchableOpacity
//                       key={i}
//                       activeOpacity={0.9}
//                       onPress={() => {
//                         if (item.shopUrl) {
//                           ReactNativeHapticFeedback.trigger('impactMedium');
//                           setModalVisible(false); // 👈 close the Styled Look modal
//                           setTimeout(() => {
//                             setShopUrl(item.shopUrl);
//                             setShopOverlayVisible(true); // 👈 then show the overlay
//                           }, 250); // small delay lets close animation finish
//                         }
//                       }}
//                       style={{
//                         width: '30%',
//                         marginBottom: 12,
//                         alignItems: 'center',
//                       }}>
//                       {item.image && (
//                         <Image
//                           source={{uri: item.image}}
//                           style={{
//                             width: '100%',
//                             height: 90,
//                             borderRadius: tokens.borderRadius.md,
//                           }}
//                           resizeMode="cover"
//                         />
//                       )}
//                       <Text
//                         numberOfLines={2}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 12,
//                           marginTop: 4,
//                           textAlign: 'center',
//                         }}>
//                         {item.category}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>

//                 {outfitResult?.style_note && (
//                   <Text
//                     style={{
//                       marginTop: 6,
//                       color: theme.colors.foreground,
//                       fontSize: 13,
//                       lineHeight: 18,
//                       textAlign: 'center',
//                     }}>
//                     {outfitResult.style_note}
//                   </Text>
//                 )}
//               </ScrollView>

//               {/* 🔘 Close button or other actions here */}
//               <TouchableOpacity
//                 onPress={() => {
//                   setModalVisible(false);
//                   setOutfitResult(null);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   paddingVertical: 14,
//                   backgroundColor: theme.colors.button1,
//                   marginTop: 12,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginHorizontal: 16,
//                 }}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                   Scan Another
//                 </Text>
//               </TouchableOpacity>
//             </Animatable.View>
//           </View>
//         </Modal>
//       </View>

//       {/* 🛍️ Shop Overlay */}
//       {shopOverlayVisible && (
//         <IntegratedShopOverlay
//           visible={shopOverlayVisible}
//           url={shopUrl}
//           onClose={() => setShopOverlayVisible(false)}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

///////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   SafeAreaView,
//   PermissionsAndroid,
//   Platform,
//   Image,
//   ScrollView,
//   Modal,
//   Linking,
//   Animated,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// export default function BarcodeScannerScreen({
//   onClose,
// }: {
//   onClose?: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [outfitResult, setOutfitResult] = useState<any | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [confirmVisible, setConfirmVisible] = useState(false);
//   const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
//   const [flashAnim] = useState(new Animated.Value(0));
//   const [toastVisible, setToastVisible] = useState(false);

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

//   /* ---- Flash overlay animation ---- */
//   const triggerFlash = useCallback(() => {
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 80,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 200,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, [flashAnim]);

//   /* ---- Capture photo ---- */
//   const capturePhoto = useCallback(async () => {
//     if (!cameraRef.current) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     triggerFlash();

//     const photo = await cameraRef.current.takePhoto({
//       qualityPrioritization: 'speed',
//     });
//     console.log('📸 Photo captured:', photo.path);

//     setToastVisible(true);
//     setTimeout(() => setToastVisible(false), 1500);

//     setCapturedPhoto(`file://${photo.path}`);
//     setConfirmVisible(true);
//   }, [cameraRef, triggerFlash]);

//   /* ---- Confirm and process ---- */
//   const processCapturedPhoto = useCallback(async () => {
//     if (!capturedPhoto) return;
//     setConfirmVisible(false);
//     setLoading(true);

//     try {
//       const form = new FormData();
//       form.append('file', {
//         uri: capturedPhoto,
//         type: 'image/jpeg',
//         name: 'barcode.jpg',
//       });

//       console.log('📸 Uploading photo to decode...');
//       const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const decodeData = await decodeRes.json();
//       console.log('🧠 Barcode decode result:', decodeData);

//       if (decodeData?.barcode) {
//         const barcode = decodeData.barcode;
//         const productRes = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({upc: barcode}),
//         });
//         const product = await productRes.json();

//         if (!product?.name) {
//           Alert.alert('Not Found', 'No product data found.');
//           return;
//         }

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [product.name, product.brand, product.category].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       if (decodeData?.inferred?.name) {
//         const item = decodeData.inferred;
//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [item.name, item.brand, item.category, item.material].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       Alert.alert('No barcode detected', 'Try again with clearer focus.');
//     } catch (err) {
//       console.warn('❌ processCapturedPhoto error:', err);
//       Alert.alert('Error', 'Unable to process image.');
//     } finally {
//       setLoading(false);
//       setCapturedPhoto(null);
//     }
//   }, [capturedPhoto, userId]);

//   /* ---- Render ---- */
//   if (!hasPermission || !device) {
//     return (
//       <SafeAreaView
//         style={[
//           globalStyles.centeredSection,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.foreground} />
//         <Text style={{color: theme.colors.foreground, marginTop: 8}}>
//           Loading camera...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <View style={[globalStyles.screen, globalStyles.container]}>
//         <Text style={globalStyles.header}>Barcode Scanner</Text>

//         {/* 📸 Camera */}
//         <Camera
//           ref={cameraRef}
//           style={{flex: 1, marginTop: -20}}
//           device={device}
//           isActive={!modalVisible && !confirmVisible}
//           photo={true}
//         />

//         {/* ⚡ Flash overlay */}
//         <Animated.View
//           pointerEvents="none"
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: theme.colors.foreground,
//             opacity: flashAnim,
//           }}
//         />

//         {/* ✅ Photo captured toast */}
//         {toastVisible && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={200}
//             style={{
//               position: 'absolute',
//               bottom: 130,
//               alignSelf: 'center',
//               backgroundColor: 'rgba(0,0,0,0.7)',
//               paddingHorizontal: 16,
//               paddingVertical: 10,
//               borderRadius: 20,
//             }}>
//             <Text style={{color: '#fff', fontWeight: '600'}}>
//               Photo captured ✓
//             </Text>
//           </Animatable.View>
//         )}

//         {/* ⏳ Loading spinner */}
//         {loading && (
//           <View style={[{alignItems: 'center', justifyContent: 'center'}]}>
//             <ActivityIndicator size="large" color={theme.colors.foreground} />
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 marginTop: 18,
//                 marginBottom: 18,
//                 fontSize: 14,
//                 opacity: 0.7,
//               }}>
//               Photo taken. Processing look...
//             </Text>
//           </View>
//         )}

//         {/* 🔘 Capture button */}
//         {!modalVisible && !confirmVisible && (
//           <View
//             style={{
//               borderTopWidth: tokens.borderWidth.sm,
//               borderTopColor: theme.colors.surfaceBorder,
//               backgroundColor: theme.colors.background,
//               padding: 16,
//             }}>
//             <AppleTouchFeedback onPress={capturePhoto}>
//               <View
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   borderRadius: tokens.borderRadius.lg,
//                   paddingVertical: 14,
//                   alignItems: 'center',
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 16,
//                   }}>
//                   Scan to Style It
//                 </Text>
//               </View>
//             </AppleTouchFeedback>

//             {onClose && (
//               <TouchableOpacity
//                 onPress={onClose}
//                 style={{marginTop: 12, alignItems: 'center'}}>
//                 <Text style={{color: theme.colors.foreground}}>Close</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {/* 📸 Confirm Photo Modal */}
//         <Modal visible={confirmVisible} animationType="fade" transparent>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.8)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingHorizontal: 20,
//             }}>
//             {capturedPhoto && (
//               <Image
//                 source={{uri: capturedPhoto}}
//                 style={{
//                   width: '90%',
//                   height: 400,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 20,
//                 }}
//                 resizeMode="cover"
//               />
//             )}
//             <View style={{width: '90%'}}>
//               <TouchableOpacity
//                 onPress={processCapturedPhoto}
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                   }}>
//                   Analyze / Style It
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   backgroundColor: theme.colors.surface,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground}}>
//                   Retake Photo
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{alignItems: 'center'}}>
//                 <Text style={{color: theme.colors.foreground, opacity: 0.6}}>
//                   Cancel
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>

//         {/* 🪞 Result Modal */}
//         <Modal
//           visible={modalVisible}
//           animationType="fade"
//           transparent
//           onRequestClose={() => setModalVisible(false)}>
//           <TouchableOpacity
//             activeOpacity={1}
//             onPressOut={() => setModalVisible(false)}
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'flex-end',
//             }}>
//             <Animatable.View
//               animation="slideInUp"
//               duration={450}
//               easing="ease-out"
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 borderTopLeftRadius: tokens.borderRadius.xl,
//                 borderTopRightRadius: tokens.borderRadius.xl,
//                 paddingTop: 16,
//                 paddingBottom: 20,
//                 maxHeight: '75%',
//               }}>
//               <ScrollView contentContainerStyle={{paddingHorizontal: 16}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 17,
//                     marginBottom: 12,
//                     textAlign: 'center',
//                   }}>
//                   Your Styled Look
//                 </Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                     marginBottom: 12,
//                   }}>
//                   {outfitResult?.outfit?.map((item: any, i: number) => (
//                     <TouchableOpacity
//                       key={i}
//                       onPress={() =>
//                         item.shopUrl && Linking.openURL(item.shopUrl)
//                       }
//                       style={{
//                         width: '30%',
//                         marginBottom: 12,
//                         alignItems: 'center',
//                       }}>
//                       {item.image && (
//                         <Image
//                           source={{uri: item.image}}
//                           style={{
//                             width: '100%',
//                             height: 90,
//                             borderRadius: tokens.borderRadius.md,
//                           }}
//                           resizeMode="cover"
//                         />
//                       )}
//                       <Text
//                         numberOfLines={2}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 12,
//                           marginTop: 4,
//                           textAlign: 'center',
//                         }}>
//                         {item.category}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>

//                 {outfitResult?.style_note && (
//                   <Text
//                     style={{
//                       marginTop: 6,
//                       color: theme.colors.foreground,
//                       fontSize: 13,
//                       lineHeight: 18,
//                       textAlign: 'center',
//                     }}>
//                     {outfitResult.style_note}
//                   </Text>
//                 )}
//               </ScrollView>

//               {/* 💾 Save to Wardrobe */}
//               <TouchableOpacity
//                 onPress={async () => {
//                   try {
//                     const inferredItem =
//                       outfitResult?.source_item || outfitResult?.inferred_item;
//                     if (!inferredItem)
//                       return Alert.alert(
//                         'Nothing to save',
//                         'No item info found.',
//                       );
//                     const res = await fetch(`${API_BASE_URL}/wardrobe`, {
//                       method: 'POST',
//                       headers: {'Content-Type': 'application/json'},
//                       body: JSON.stringify({
//                         user_id: userId,
//                         name: inferredItem.name,
//                         brand: inferredItem.brand,
//                         category: inferredItem.category,
//                         color: inferredItem.color,
//                         image_url: inferredItem.image || null,
//                       }),
//                     });
//                     const data = await res.json();
//                     ReactNativeHapticFeedback.trigger('notificationSuccess');
//                     Alert.alert(
//                       'Added',
//                       `${data.name} saved to your wardrobe.`,
//                     );
//                   } catch (err) {
//                     Alert.alert('Error', 'Unable to save item.');
//                   }
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   paddingVertical: 14,
//                   backgroundColor: theme.colors.button1,
//                   marginTop: 10,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginHorizontal: 16,
//                 }}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                   Add to My Wardrobe
//                 </Text>
//               </TouchableOpacity>

//               {/* 👗 See with My Wardrobe */}
//               <TouchableOpacity
//                 onPress={async () => {
//                   try {
//                     const res = await fetch(`${API_BASE_URL}/ai/suggest`, {
//                       method: 'POST',
//                       headers: {'Content-Type': 'application/json'},
//                       body: JSON.stringify({
//                         user_id: userId,
//                         context: 'combine_scanned_with_wardrobe',
//                       }),
//                     });
//                     const combo = await res.json();
//                     setOutfitResult(combo);
//                     ReactNativeHapticFeedback.trigger('impactMedium');
//                   } catch (err) {
//                     Alert.alert(
//                       'Error',
//                       'Could not generate personalized outfit.',
//                     );
//                   }
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   paddingVertical: 14,
//                   backgroundColor: theme.colors.button1,
//                   borderWidth: tokens.borderWidth.sm,
//                   borderColor: theme.colors.surfaceBorder,
//                   marginTop: 10,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginHorizontal: 16,
//                 }}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                   See with My Wardrobe
//                 </Text>
//               </TouchableOpacity>

//               {/* 🔄 Scan Another */}
//               <TouchableOpacity
//                 onPress={() => {
//                   setModalVisible(false);
//                   setOutfitResult(null);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   paddingVertical: 14,
//                   backgroundColor: theme.colors.button1,
//                   marginTop: 12,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginHorizontal: 16,
//                 }}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                   Scan Another
//                 </Text>
//               </TouchableOpacity>
//             </Animatable.View>
//           </TouchableOpacity>
//         </Modal>
//       </View>
//     </SafeAreaView>
//   );
// }

/////////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   SafeAreaView,
//   PermissionsAndroid,
//   Platform,
//   Image,
//   ScrollView,
//   Modal,
//   Linking,
//   Animated,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// export default function BarcodeScannerScreen({
//   onClose,
// }: {
//   onClose?: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [outfitResult, setOutfitResult] = useState<any | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [confirmVisible, setConfirmVisible] = useState(false);
//   const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
//   const [flashAnim] = useState(new Animated.Value(0)); // ⚡ Flash overlay opacity

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

//   /* ---- Flash overlay animation ---- */
//   const triggerFlash = useCallback(() => {
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 80,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 200,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, [flashAnim]);

//   /* ---- Capture, show confirm modal ---- */
//   const capturePhoto = useCallback(async () => {
//     if (!cameraRef.current) return;
//     ReactNativeHapticFeedback.trigger('impactMedium');
//     triggerFlash();

//     const photo = await cameraRef.current.takePhoto({
//       qualityPrioritization: 'speed',
//     });
//     console.log('📸 Photo captured:', photo.path);

//     setCapturedPhoto(`file://${photo.path}`);
//     setConfirmVisible(true);
//   }, [cameraRef, triggerFlash]);

//   /* ---- Confirm and proceed ---- */
//   const processCapturedPhoto = useCallback(async () => {
//     if (!capturedPhoto) return;
//     setConfirmVisible(false);
//     setLoading(true);

//     try {
//       const form = new FormData();
//       form.append('file', {
//         uri: capturedPhoto,
//         type: 'image/jpeg',
//         name: 'barcode.jpg',
//       });

//       console.log('📸 Uploading photo to decode...');
//       const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const decodeData = await decodeRes.json();
//       console.log('🧠 Barcode decode result:', decodeData);

//       // ✅ Case 1: Barcode detected
//       if (decodeData?.barcode) {
//         const barcode = decodeData.barcode;
//         const productRes = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({upc: barcode}),
//         });
//         const product = await productRes.json();

//         if (!product?.name) {
//           Alert.alert('Not Found', 'No product data found.');
//           return;
//         }

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [product.name, product.brand, product.category].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       // ✅ Case 2: AI inferred clothing info
//       if (decodeData?.inferred?.name) {
//         const item = decodeData.inferred;
//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [item.name, item.brand, item.category, item.material].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       Alert.alert('No barcode detected', 'Try again with clearer focus.');
//     } catch (err) {
//       console.warn('❌ processCapturedPhoto error:', err);
//       Alert.alert('Error', 'Unable to process image.');
//     } finally {
//       setLoading(false);
//       setCapturedPhoto(null);
//     }
//   }, [capturedPhoto, userId]);

//   /* ---- Render ---- */
//   if (!hasPermission || !device) {
//     return (
//       <SafeAreaView
//         style={[
//           globalStyles.centeredSection,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.foreground} />
//         <Text style={{color: theme.colors.foreground, marginTop: 8}}>
//           Loading camera...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <View style={[globalStyles.screen, globalStyles.container]}>
//         <Text style={globalStyles.header}>Barcode Scanner</Text>

//         {/* 📸 Camera */}
//         <Camera
//           ref={cameraRef}
//           style={{flex: 1, marginTop: -20}}
//           device={device}
//           isActive={!modalVisible && !confirmVisible}
//           photo={true}
//         />

//         {/* ⚡ Flash overlay */}
//         <Animated.View
//           pointerEvents="none"
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: theme.colors.foreground,
//             opacity: flashAnim,
//           }}
//         />

//         {/* ⏳ Loading spinner overlay */}
//         {loading && (
//           <View style={[{alignItems: 'center', justifyContent: 'center'}]}>
//             <ActivityIndicator size="large" color={theme.colors.foreground} />
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 marginTop: 8,
//                 fontSize: 14,
//                 opacity: 0.7,
//               }}>
//               Photo taken. Processing look...
//             </Text>
//           </View>
//         )}

//         {/* 🔘 Capture button */}
//         {!modalVisible && !confirmVisible && (
//           <View
//             style={{
//               borderTopWidth: tokens.borderWidth.sm,
//               borderTopColor: theme.colors.surfaceBorder,
//               backgroundColor: theme.colors.surface,
//               padding: 16,
//             }}>
//             <AppleTouchFeedback onPress={capturePhoto}>
//               <View
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   borderRadius: tokens.borderRadius.lg,
//                   paddingVertical: 14,
//                   alignItems: 'center',
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 16,
//                   }}>
//                   Scan to Style It
//                 </Text>
//               </View>
//             </AppleTouchFeedback>

//             {onClose && (
//               <TouchableOpacity
//                 onPress={onClose}
//                 style={{marginTop: 12, alignItems: 'center'}}>
//                 <Text style={{color: theme.colors.foreground}}>Close</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {/* 📸 Confirm Photo Modal */}
//         <Modal visible={confirmVisible} animationType="fade" transparent>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.8)',
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingHorizontal: 20,
//             }}>
//             {capturedPhoto && (
//               <Image
//                 source={{uri: capturedPhoto}}
//                 style={{
//                   width: '90%',
//                   height: 400,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginBottom: 20,
//                 }}
//                 resizeMode="cover"
//               />
//             )}
//             <View style={{width: '90%'}}>
//               <TouchableOpacity
//                 onPress={processCapturedPhoto}
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                   }}>
//                   Analyze / Style It
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{
//                   backgroundColor: theme.colors.surface,
//                   paddingVertical: 14,
//                   borderRadius: tokens.borderRadius.lg,
//                   alignItems: 'center',
//                   marginBottom: 10,
//                 }}>
//                 <Text style={{color: theme.colors.foreground}}>
//                   Retake Photo
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => {
//                   setCapturedPhoto(null);
//                   setConfirmVisible(false);
//                 }}
//                 style={{alignItems: 'center'}}>
//                 <Text style={{color: theme.colors.foreground, opacity: 0.6}}>
//                   Cancel
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </Modal>

//         {/* 🪞 Result Modal */}
//         <Modal
//           visible={modalVisible}
//           animationType="fade"
//           transparent
//           onRequestClose={() => setModalVisible(false)}>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'flex-end',
//             }}>
//             <Animatable.View
//               animation="slideInUp"
//               duration={450}
//               easing="ease-out"
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 borderTopLeftRadius: tokens.borderRadius.xl,
//                 borderTopRightRadius: tokens.borderRadius.xl,
//                 paddingTop: 16,
//                 paddingBottom: 20,
//                 maxHeight: '75%',
//               }}>
//               <ScrollView contentContainerStyle={{paddingHorizontal: 16}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 17,
//                     marginBottom: 12,
//                     textAlign: 'center',
//                   }}>
//                   Your Styled Look
//                 </Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                     marginBottom: 12,
//                   }}>
//                   {outfitResult?.outfit?.map((item: any, i: number) => (
//                     <TouchableOpacity
//                       key={i}
//                       onPress={() =>
//                         item.shopUrl && Linking.openURL(item.shopUrl)
//                       }
//                       style={{
//                         width: '30%',
//                         marginBottom: 12,
//                         alignItems: 'center',
//                       }}>
//                       {item.image && (
//                         <Image
//                           source={{uri: item.image}}
//                           style={{
//                             width: '100%',
//                             height: 90,
//                             borderRadius: tokens.borderRadius.md,
//                           }}
//                           resizeMode="cover"
//                         />
//                       )}
//                       <Text
//                         numberOfLines={2}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 12,
//                           marginTop: 4,
//                           textAlign: 'center',
//                         }}>
//                         {item.category}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>

//                 {outfitResult?.style_note && (
//                   <Text
//                     style={{
//                       marginTop: 6,
//                       color: theme.colors.foreground,
//                       fontSize: 13,
//                       lineHeight: 18,
//                       textAlign: 'center',
//                     }}>
//                     {outfitResult.style_note}
//                   </Text>
//                 )}
//               </ScrollView>

//               <TouchableOpacity
//                 onPress={() => {
//                   setModalVisible(false);
//                   setOutfitResult(null);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   paddingVertical: 14,
//                   backgroundColor: theme.colors.button1,
//                   marginTop: 12,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginHorizontal: 16,
//                 }}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                   Scan Another
//                 </Text>
//               </TouchableOpacity>
//             </Animatable.View>
//           </View>
//         </Modal>
//       </View>
//     </SafeAreaView>
//   );
// }

///////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   SafeAreaView,
//   PermissionsAndroid,
//   Platform,
//   Image,
//   ScrollView,
//   Modal,
//   Linking,
//   Animated,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// export default function BarcodeScannerScreen({
//   onClose,
// }: {
//   onClose?: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [outfitResult, setOutfitResult] = useState<any | null>(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [flashAnim] = useState(new Animated.Value(0)); // ⚡ Flash overlay opacity

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

//   /* ---- Flash overlay animation ---- */
//   const triggerFlash = useCallback(() => {
//     Animated.sequence([
//       Animated.timing(flashAnim, {
//         toValue: 1,
//         duration: 80,
//         useNativeDriver: true,
//       }),
//       Animated.timing(flashAnim, {
//         toValue: 0,
//         duration: 200,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, [flashAnim]);

//   /* ---- Capture & Decode Barcode or Clothing Label ---- */
//   const captureAndDecode = useCallback(async () => {
//     if (!cameraRef.current) return;
//     setLoading(true);

//     try {
//       // 💥 Actual capture moment — give feedback right here
//       ReactNativeHapticFeedback.trigger('impactMedium');
//       triggerFlash();

//       const photo = await cameraRef.current.takePhoto({
//         qualityPrioritization: 'speed',
//       });

//       console.log('📸 Photo captured:', photo.path);

//       // After photo is taken, show “Processing…” spinner (no need to hold camera)
//       const form = new FormData();
//       form.append('file', {
//         uri: `file://${photo.path}`,
//         type: 'image/jpeg',
//         name: 'barcode.jpg',
//       });

//       const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const decodeData = await decodeRes.json();
//       console.log('🧠 Barcode decode result:', decodeData);

//       // ✅ Case 1: Barcode detected
//       if (decodeData?.barcode) {
//         const barcode = decodeData.barcode;
//         const productRes = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({upc: barcode}),
//         });
//         const product = await productRes.json();

//         if (!product?.name) {
//           Alert.alert('Not Found', 'No product data found.');
//           return;
//         }

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [product.name, product.brand, product.category].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       // ✅ Case 2: AI inferred clothing info
//       if (decodeData?.inferred?.name) {
//         const item = decodeData.inferred;
//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [item.name, item.brand, item.category, item.material].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         ReactNativeHapticFeedback.trigger('impactMedium');
//         setOutfitResult(outfit);
//         setModalVisible(true);
//         return;
//       }

//       Alert.alert('No barcode detected', 'Try again with clearer focus.');
//     } catch (err) {
//       console.warn('❌ captureAndDecode error:', err);
//       Alert.alert('Error', 'Unable to process image.');
//     } finally {
//       setLoading(false);
//     }
//   }, [cameraRef, userId, triggerFlash]);

//   /* ---- Render ---- */
//   if (!hasPermission || !device) {
//     return (
//       <SafeAreaView
//         style={[
//           globalStyles.centeredSection,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <ActivityIndicator size="large" color={theme.colors.foreground} />
//         <Text style={{color: theme.colors.foreground, marginTop: 8}}>
//           Loading camera...
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
//       <View style={[globalStyles.screen, globalStyles.container]}>
//         <Text style={globalStyles.header}>Barcode Scanner</Text>
//         {/* 📸 Camera */}
//         <Camera
//           ref={cameraRef}
//           style={{flex: 1, marginTop: -20}}
//           device={device}
//           isActive={!modalVisible}
//           photo={true}
//         />

//         {/* ⚡ Flash overlay */}
//         <Animated.View
//           pointerEvents="none"
//           style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: theme.colors.foreground,
//             opacity: flashAnim,
//           }}
//         />

//         {/* ⏳ Loading spinner overlay */}
//         {loading && (
//           <View style={[{alignItems: 'center', justifyContent: 'center'}]}>
//             <ActivityIndicator size="large" color={theme.colors.foreground} />
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 marginTop: 8,
//                 fontSize: 14,
//                 opacity: 0.7,
//               }}>
//               Photo taken. Processing look...
//             </Text>
//           </View>
//         )}

//         {/* 🔘 Capture button */}
//         {!modalVisible && (
//           <View
//             style={{
//               borderTopWidth: tokens.borderWidth.sm,
//               borderTopColor: theme.colors.surfaceBorder,
//               backgroundColor: theme.colors.surface,
//               padding: 16,
//             }}>
//             <AppleTouchFeedback onPress={captureAndDecode}>
//               <View
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   borderRadius: tokens.borderRadius.lg,
//                   paddingVertical: 14,
//                   alignItems: 'center',
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 16,
//                   }}>
//                   Scan to Style It
//                 </Text>
//               </View>
//             </AppleTouchFeedback>

//             {onClose && (
//               <TouchableOpacity
//                 onPress={onClose}
//                 style={{marginTop: 12, alignItems: 'center'}}>
//                 <Text style={{color: theme.colors.foreground}}>Close</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {/* 🪞 Result Modal */}
//         <Modal
//           visible={modalVisible}
//           animationType="fade"
//           transparent
//           onRequestClose={() => setModalVisible(false)}>
//           <View
//             style={{
//               flex: 1,
//               backgroundColor: 'rgba(0,0,0,0.6)',
//               justifyContent: 'flex-end',
//             }}>
//             <Animatable.View
//               animation="slideInUp"
//               duration={450}
//               easing="ease-out"
//               style={{
//                 backgroundColor: theme.colors.surface,
//                 borderTopLeftRadius: tokens.borderRadius.xl,
//                 borderTopRightRadius: tokens.borderRadius.xl,
//                 paddingTop: 16,
//                 paddingBottom: 20,
//                 maxHeight: '75%',
//               }}>
//               <ScrollView contentContainerStyle={{paddingHorizontal: 16}}>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 17,
//                     marginBottom: 12,
//                     textAlign: 'center',
//                   }}>
//                   Your Styled Look
//                 </Text>

//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     flexWrap: 'wrap',
//                     justifyContent: 'space-between',
//                     marginBottom: 12,
//                   }}>
//                   {outfitResult?.outfit?.map((item: any, i: number) => (
//                     <TouchableOpacity
//                       key={i}
//                       onPress={() =>
//                         item.shopUrl && Linking.openURL(item.shopUrl)
//                       }
//                       style={{
//                         width: '30%',
//                         marginBottom: 12,
//                         alignItems: 'center',
//                       }}>
//                       {item.image && (
//                         <Image
//                           source={{uri: item.image}}
//                           style={{
//                             width: '100%',
//                             height: 90,
//                             borderRadius: tokens.borderRadius.md,
//                           }}
//                           resizeMode="cover"
//                         />
//                       )}
//                       <Text
//                         numberOfLines={2}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontSize: 12,
//                           marginTop: 4,
//                           textAlign: 'center',
//                         }}>
//                         {item.category}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>

//                 {outfitResult?.style_note && (
//                   <Text
//                     style={{
//                       marginTop: 6,
//                       color: theme.colors.foreground,
//                       fontSize: 13,
//                       lineHeight: 18,
//                       textAlign: 'center',
//                     }}>
//                     {outfitResult.style_note}
//                   </Text>
//                 )}
//               </ScrollView>

//               <TouchableOpacity
//                 onPress={() => {
//                   setModalVisible(false);
//                   setOutfitResult(null);
//                 }}
//                 style={{
//                   alignItems: 'center',
//                   paddingVertical: 14,
//                   backgroundColor: theme.colors.button1,
//                   marginTop: 12,
//                   borderRadius: tokens.borderRadius.lg,
//                   marginHorizontal: 16,
//                 }}>
//                 <Text
//                   style={{color: theme.colors.foreground, fontWeight: '600'}}>
//                   Scan Another
//                 </Text>
//               </TouchableOpacity>
//             </Animatable.View>
//           </View>
//         </Modal>
//       </View>
//     </SafeAreaView>
//   );
// }

/////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   SafeAreaView,
//   PermissionsAndroid,
//   Platform,
//   Image,
//   ScrollView,
// } from 'react-native';
// import {Camera, useCameraDevices} from 'react-native-vision-camera';
// import {useAppTheme} from '../context/ThemeContext';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {tokens} from '../styles/tokens/tokens';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// export default function BarcodeScannerScreen({
//   onClose,
// }: {
//   onClose?: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID(); // ✅ fix destructuring

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [outfitResult, setOutfitResult] = useState<any | null>(null);

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

//   /* ---- Capture & Decode Barcode or Clothing Label ---- */
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
//       const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const decodeData = await decodeRes.json();
//       console.log('🧠 Barcode decode result:', decodeData);

//       // ✅ Case 1: Standard barcode
//       if (decodeData?.barcode) {
//         const barcode = decodeData.barcode;
//         console.log('✅ Detected barcode:', barcode);

//         // 🔧 fixed endpoint (POST)
//         const productRes = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({upc: barcode}),
//         });
//         const product = await productRes.json();
//         console.log('📦 Product:', product);

//         if (!product?.name) {
//           Alert.alert('Not Found', 'No product data found.');
//           return;
//         }

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [product.name, product.brand, product.category].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         console.log('🧥 AI outfit result:', outfit);
//         setOutfitResult(outfit);
//         return;
//       }

//       // ✅ Case 2: AI inferred clothing info (no barcode)
//       if (decodeData?.inferred?.name) {
//         const item = decodeData.inferred;
//         console.log('🧠 Inferred clothing item:', item);

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [item.name, item.brand, item.category, item.material].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         console.log('🧥 AI outfit result (from inferred):', outfit);
//         setOutfitResult(outfit);
//         return;
//       }

//       Alert.alert('No barcode detected', 'Try again with clearer focus.');
//     } catch (err) {
//       console.warn('❌ captureAndDecode error:', err);
//       Alert.alert('Error', 'Unable to process image.');
//     } finally {
//       setLoading(false);
//     }
//   }, [cameraRef, userId]);

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
//         isActive={!outfitResult}
//         photo={true}
//       />

//       {loading && (
//         <View
//           style={[
//             globalStyles.loadingOverlay,
//             {alignItems: 'center', justifyContent: 'center'},
//           ]}>
//           <ActivityIndicator size="large" color={theme.colors.foreground} />
//         </View>
//       )}

//       {/* --- Outfit Result Viewer --- */}
//       {outfitResult && (
//         <View
//           style={{
//             position: 'absolute',
//             bottom: 0,
//             left: 0,
//             right: 0,
//             backgroundColor: theme.colors.surface,
//             borderTopWidth: tokens.borderWidth.sm,
//             borderTopColor: theme.colors.surfaceBorder,
//             paddingTop: 16,
//             maxHeight: '65%',
//           }}>
//           <ScrollView contentContainerStyle={{paddingHorizontal: 16}}>
//             <Text
//               style={{
//                 color: theme.colors.foreground,
//                 fontWeight: '600',
//                 fontSize: 16,
//                 marginBottom: 12,
//               }}>
//               Your Styled Look
//             </Text>

//             <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
//               {outfitResult?.outfit?.map((item: any, i: number) => (
//                 <View key={i} style={{width: '30%'}}>
//                   {item.image && (
//                     <Image
//                       source={{uri: item.image}}
//                       style={{
//                         width: '100%',
//                         height: 90,
//                         borderRadius: tokens.borderRadius.md,
//                       }}
//                       resizeMode="cover"
//                     />
//                   )}
//                   <Text
//                     numberOfLines={2}
//                     style={{
//                       color: theme.colors.foreground,
//                       fontSize: 12,
//                       marginTop: 4,
//                       textAlign: 'center',
//                     }}>
//                     {item.category}
//                   </Text>
//                 </View>
//               ))}
//             </View>

//             {outfitResult?.style_note && (
//               <Text
//                 style={{
//                   marginTop: 14,
//                   color: theme.colors.foreground,
//                   fontSize: 13,
//                   lineHeight: 18,
//                 }}>
//                 {outfitResult.style_note}
//               </Text>
//             )}
//           </ScrollView>

//           <TouchableOpacity
//             onPress={() => setOutfitResult(null)}
//             style={{
//               alignItems: 'center',
//               paddingVertical: 14,
//               backgroundColor: theme.colors.primary,
//               marginTop: 12,
//             }}>
//             <Text style={{color: '#fff', fontWeight: '600'}}>Scan Another</Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       {!outfitResult && (
//         <View
//           style={{
//             borderTopWidth: tokens.borderWidth.sm,
//             borderTopColor: theme.colors.surfaceBorder,
//             backgroundColor: theme.colors.surface,
//             padding: 16,
//           }}>
//           <AppleTouchFeedback onPress={captureAndDecode}>
//             <View
//               style={{
//                 backgroundColor: theme.colors.primary,
//                 borderRadius: tokens.borderRadius.lg,
//                 paddingVertical: 14,
//                 alignItems: 'center',
//               }}>
//               <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
//                 Scan to Style It
//               </Text>
//             </View>
//           </AppleTouchFeedback>

//           {onClose && (
//             <TouchableOpacity
//               onPress={onClose}
//               style={{marginTop: 12, alignItems: 'center'}}>
//               <Text style={{color: theme.colors.foreground}}>Close</Text>
//             </TouchableOpacity>
//           )}
//         </View>
//       )}
//     </SafeAreaView>
//   );
// }

////////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useEffect, useState, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
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
//   const userId = useUUID();

//   const devices = useCameraDevices();
//   const device = Array.isArray(devices)
//     ? devices.find(d => d.position === 'back')
//     : devices.back;
//   const cameraRef = useRef<Camera>(null);

//   const [hasPermission, setHasPermission] = useState(false);
//   const [loading, setLoading] = useState(false);

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

//   /* ---- Capture & Decode Barcode or Clothing Label ---- */
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
//       const decodeRes = await fetch(`${API_BASE_URL}/ai/decode-barcode`, {
//         method: 'POST',
//         body: form,
//       });
//       const decodeData = await decodeRes.json();
//       console.log('🧠 Barcode decode result:', decodeData);

//       // ✅ Case 1: Standard barcode
//       if (decodeData?.barcode) {
//         const barcode = decodeData.barcode;
//         console.log('✅ Detected barcode:', barcode);

//         const productRes = await fetch(
//           `${API_BASE_URL}/ai/lookup-product?upc=${barcode}`,
//         );
//         const product = await productRes.json();
//         console.log('📦 Product:', product);

//         if (!product?.name) {
//           Alert.alert('Not Found', 'No product data found.');
//           return;
//         }

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [product.name, product.brand, product.category].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         console.log('🧥 AI outfit result:', outfit);
//         onOutfitGenerated?.(outfit);
//         return;
//       }

//       // ✅ Case 2: AI inferred clothing info (no barcode)
//       if (decodeData?.inferred?.name) {
//         const item = decodeData.inferred;
//         console.log('🧠 Inferred clothing item:', item);

//         const recreateRes = await fetch(`${API_BASE_URL}/ai/recreate`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             tags: [item.name, item.brand, item.category, item.material].filter(
//               Boolean,
//             ),
//           }),
//         });

//         const outfit = await recreateRes.json();
//         console.log('🧥 AI outfit result (from inferred):', outfit);
//         onOutfitGenerated?.(outfit);
//         return;
//       }

//       // ❌ Case 3: Nothing readable
//       Alert.alert(
//         'No barcode detected',
//         'Try again with clearer focus or lighting.',
//       );
//     } catch (err) {
//       console.warn('❌ captureAndDecode error:', err);
//       Alert.alert('Error', 'Unable to process image.');
//     } finally {
//       setLoading(false);
//     }
//   }, [cameraRef, userId, onOutfitGenerated]);

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
//           style={[
//             globalStyles.loadingOverlay,
//             {alignItems: 'center', justifyContent: 'center'},
//           ]}>
//           <ActivityIndicator size="large" color={theme.colors.foreground} />
//         </View>
//       )}

//       <View
//         style={{
//           borderTopWidth: tokens.borderWidth.sm,
//           borderTopColor: theme.colors.surfaceBorder,
//           backgroundColor: theme.colors.surface,
//           padding: 16,
//         }}>
//         <AppleTouchFeedback onPress={captureAndDecode}>
//           <View
//             style={{
//               backgroundColor: theme.colors.primary,
//               borderRadius: tokens.borderRadius.lg,
//               paddingVertical: 14,
//               alignItems: 'center',
//             }}>
//             <Text style={{color: '#fff', fontWeight: '600', fontSize: 16}}>
//               Scan to Style It
//             </Text>
//           </View>
//         </AppleTouchFeedback>

//         {onClose && (
//           <TouchableOpacity
//             onPress={onClose}
//             style={{marginTop: 12, alignItems: 'center'}}>
//             <Text style={{color: theme.colors.foreground}}>Close</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </SafeAreaView>
//   );
// }

//////////////////

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
//   /* ---- Fetch product info for decoded barcode (via backend fallback) ---- */
//   const handleScan = useCallback(async (barcode: string) => {
//     setLoading(true);
//     try {
//       console.log('🔎 Fetching product from backend:', barcode);

//       const res = await fetch(`${API_BASE_URL}/ai/lookup-barcode`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({upc: barcode}),
//       });

//       if (!res.ok) {
//         console.warn('⚠️ lookup-barcode failed with', res.status);
//         Alert.alert('Error', 'Failed to fetch product info from backend.');
//         return;
//       }

//       const data = await res.json();
//       console.log('📦 Backend product lookup result:', data);

//       if (!data?.name) {
//         Alert.alert('Not Found', 'No product data for this barcode.');
//         return;
//       }

//       const normalized = {
//         name: data.name,
//         brand: data.brand,
//         image: data.image,
//         category: data.category,
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
