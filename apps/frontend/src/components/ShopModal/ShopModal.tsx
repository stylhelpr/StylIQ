/* eslint-disable react-native/no-inline-styles */
import React, {useState, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  Animated,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {WebView} from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import IntegratedShopOverlay from './IntegratedShopOverlay';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {SafeAreaView} from 'react-native-safe-area-context';

export default function ShopModal({
  visible,
  onClose,
  results,
}: {
  visible: boolean;
  onClose: () => void;
  results: any[];
}) {
  const {theme} = useAppTheme();
  const [shopUrl, setShopUrl] = useState<string | null>(null);
  const globalStyles = useGlobalStyles();
  const translateY = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  // Reset animation when modal opens
  React.useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      isClosingRef.current = false;
    }
  }, [visible, translateY]);

  // Handle close with animation
  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    ReactNativeHapticFeedback.trigger('impactLight');

    // Animate modal down before closing
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // PanResponder for swipe-down to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => {
        const shouldRespond = Math.abs(g.dy) > 8;
        console.log('🎯 onMoveShouldSetPanResponder:', {dy: g.dy, shouldRespond});
        return shouldRespond;
      },
      onPanResponderMove: (_e, g) => {
        console.log('📍 onPanResponderMove:', {dy: g.dy, vy: g.vy});
      },
      onPanResponderRelease: (_e, g) => {
        console.log('🔓 onPanResponderRelease:', {dy: g.dy, vy: g.vy, threshold: g.dy > 100 || g.vy > 0.3});
        if (g.dy > 100 || g.vy > 0.3) {
          handleClose();
        }
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Animated.View
          style={{
            width: '100%',
            maxWidth: '100%',
            height: '90%',
            transform: [{translateY}],
          }}>
          <Animatable.View
            animation="fadeInUp"
            duration={300}
            style={{
              width: '100%',
              maxWidth: '100%',
              height: '100%',
              backgroundColor: theme.colors.background,
              borderRadius: tokens.borderRadius['2xl'],
              overflow: 'hidden',
              padding: tokens.spacing.md,
            }}>
            {/* Swipe gesture zone */}
            <View
              {...panResponder.panHandlers}
              onStartShouldSetResponder={() => true}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 80,
                zIndex: 10,
                backgroundColor: 'transparent',
              }}
            />

            {/* Close */}
            <TouchableOpacity
              onPress={() => {
                handleClose();
              }}
            style={{
              position: 'absolute',
              top: 8,
              right: 20,
              zIndex: 999,
              backgroundColor: theme.colors.foreground,
              borderRadius: 24,
              padding: 6,
            }}>
            <MaterialIcons
              name="close"
              size={22}
              color={theme.colors.background}
            />
          </TouchableOpacity>

          {/* Product Grid */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text
              numberOfLines={1}
              style={[globalStyles.sectionTitle, {marginTop: 0}]}>
              Shop the Vibe
            </Text>

            {results.length === 0 ? (
              <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text
                  style={{
                    color: theme.colors.foreground,
                    marginTop: 12,
                    opacity: 0.7,
                  }}>
                  Fetching products...
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  paddingBottom: 80,
                }}>
                {results.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      ReactNativeHapticFeedback.trigger('impactMedium');
                      setShopUrl(item.shopUrl);
                    }}
                    activeOpacity={0.85}
                    style={{
                      // width: '49.0%',
                      // marginBottom: tokens.spacing.xsm,
                      width: '49.5%',
                      marginBottom: tokens.spacing.nano,
                      backgroundColor: theme.colors.surface,
                      // borderWidth: tokens.borderWidth.lg,
                      // borderColor: theme.colors.surfaceBorder,
                      // borderRadius: tokens.borderRadius.md,
                      overflow: 'hidden',
                    }}>
                    {/* 🖼️ Product Image (consistent aspect ratio) */}
                    <View
                      style={{
                        width: '100%',
                        aspectRatio: 3 / 4,
                        backgroundColor: theme.colors.surface,
                        overflow: 'hidden',
                      }}>
                      <Image
                        source={{uri: item.image}}
                        style={{
                          width: '100%',
                          height: '100%',
                          position: 'absolute',
                        }}
                        resizeMode="cover"
                      />

                      {/* 💎 Click to Buy Button */}
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 10,
                          alignSelf: 'center',
                          backgroundColor: 'rgba(255, 255, 255, 0.63)',
                          // borderRadius: tokens.borderRadius.lg,
                          borderRadius: tokens.borderRadius.sm,
                          borderWidth: tokens.borderWidth.md,
                          borderColor: 'black',
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                        }}>
                        <Text
                          style={{
                            color: 'black',
                            fontWeight: '700',
                            fontSize: 13,
                            letterSpacing: 0.2,
                          }}>
                          Click to Buy →
                        </Text>
                      </View>
                    </View>

                    {/* 🧾 Product Info */}
                    <View style={{padding: 8}}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: theme.colors.foreground,
                          fontWeight: '400',
                          fontSize: 13,
                          textTransform: 'uppercase',
                        }}>
                        {item.name}
                      </Text>
                      {item.brand && (
                        <Text
                          numberOfLines={1}
                          style={{
                            color: theme.colors.foreground,
                            opacity: 0.7,
                            fontSize: 11,
                            fontWeight: '500',
                            marginTop: 6,
                          }}>
                          {item.brand}
                        </Text>
                      )}
                      {item.price && (
                        <Text
                          style={{
                            color: theme.colors.primary,
                            fontWeight: '500',
                            fontSize: 12,
                            marginTop: 6,
                          }}>
                          {item.price}
                        </Text>
                      )}
                      {/* {item.source && (
                        <Text
                          style={{
                            color: theme.colors.foreground,
                            opacity: 0.6,
                            fontSize: 10,
                            marginTop: 2,
                          }}>
                          Source: {item.source}
                        </Text>
                      )} */}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
          </Animatable.View>
        </Animated.View>

        {/* WebView modal */}
        <IntegratedShopOverlay
          visible={!!shopUrl}
          onClose={() => setShopUrl(null)}
          url={shopUrl}
        />
      </View>
    </Modal>
  );
}

//////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
//   SafeAreaView,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import IntegratedShopOverlay from './IntegratedShopOverlay';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// export default function ShopModal({
//   visible,
//   onClose,
//   results,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   results: any[];
// }) {
//   const {theme} = useAppTheme();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const globalStyles = useGlobalStyles();

//   if (!visible) return null;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: 'rgba(0,0,0,0.6)',
//           justifyContent: 'center',
//           alignItems: 'center',
//           paddingVertical: tokens.spacing.sm,
//           // padding: tokens.spacing.sm,
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           duration={300}
//           style={{
//             width: '100%',
//             maxWidth: '100%',
//             height: '90%',
//             backgroundColor: theme.colors.background,
//             borderRadius: tokens.borderRadius['2xl'],
//             overflow: 'hidden',
//             padding: tokens.spacing.md,
//           }}>
//           {/* Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 8,
//               right: 20,
//               zIndex: 999,
//               backgroundColor: theme.colors.foreground,
//               borderRadius: 24,
//               padding: 6,
//             }}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.background}
//             />
//           </TouchableOpacity>

//           {/* Product Grid */}
//           <ScrollView showsVerticalScrollIndicator={false}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 0}]}>
//               Shop the Vibe
//             </Text>

//             {results.length === 0 ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                   }}>
//                   Fetching products...
//                 </Text>
//               </View>
//             ) : (
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'space-between',
//                   paddingBottom: 80,
//                 }}>
//                 {results.map((item, idx) => (
//                   <TouchableOpacity
//                     key={idx}
//                     onPress={() => {
//                       ReactNativeHapticFeedback.trigger('impactMedium');
//                       setShopUrl(item.shopUrl);
//                     }}
//                     activeOpacity={0.85}
//                     style={{
//                       width: '49.0%',
//                       marginBottom: tokens.spacing.xsm,
//                       backgroundColor: theme.colors.surface,
//                       borderWidth: tokens.borderWidth.lg,
//                       borderColor: theme.colors.surfaceBorder,
//                       borderRadius: tokens.borderRadius.md,
//                       overflow: 'hidden',
//                     }}>
//                     {/* 🖼️ Product Image (consistent aspect ratio) */}
//                     <View
//                       style={{
//                         width: '100%',
//                         aspectRatio: 3 / 4,
//                         backgroundColor: theme.colors.surface,
//                         overflow: 'hidden',
//                       }}>
//                       <Image
//                         source={{uri: item.image}}
//                         style={{
//                           width: '100%',
//                           height: '100%',
//                           position: 'absolute',
//                         }}
//                         resizeMode="cover"
//                       />

//                       {/* 💎 Click to Buy Button */}
//                       <View
//                         style={{
//                           position: 'absolute',
//                           bottom: 10,
//                           alignSelf: 'center',
//                           backgroundColor: 'rgba(255,255,255,0.75)',
//                           borderRadius: tokens.borderRadius.lg,
//                           borderWidth: tokens.borderWidth.hairline,
//                           borderColor: 'black',
//                           paddingVertical: 8,
//                           paddingHorizontal: 14,
//                         }}>
//                         <Text
//                           style={{
//                             color: 'black',
//                             fontWeight: '700',
//                             fontSize: 13,
//                             letterSpacing: 0.2,
//                           }}>
//                           Click to Buy →
//                         </Text>
//                       </View>
//                     </View>

//                     {/* 🧾 Product Info */}
//                     <View style={{padding: 8}}>
//                       <Text
//                         numberOfLines={1}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontWeight: '400',
//                           fontSize: 13,
//                         }}>
//                         {item.name}
//                       </Text>
//                       {item.brand && (
//                         <Text
//                           numberOfLines={1}
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.7,
//                             fontSize: 11,
//                             marginTop: 6,
//                           }}>
//                           {item.brand}
//                         </Text>
//                       )}
//                       {item.price && (
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '700',
//                             fontSize: 13,
//                             marginTop: 6,
//                           }}>
//                           {item.price}
//                         </Text>
//                       )}
//                       {/* {item.source && (
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.6,
//                             fontSize: 10,
//                             marginTop: 2,
//                           }}>
//                           Source: {item.source}
//                         </Text>
//                       )} */}
//                     </View>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* WebView modal */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import IntegratedShopOverlay from './IntegratedShopOverlay';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// export default function ShopModal({
//   visible,
//   onClose,
//   results,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   results: any[];
// }) {
//   const {theme} = useAppTheme();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const globalStyles = useGlobalStyles();

//   if (!visible) return null;

//   const hasResults = results && results.length > 0;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: 'rgba(0,0,0,0.6)',
//           justifyContent: 'center',
//           alignItems: 'center',
//           paddingVertical: tokens.spacing.sm,
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           duration={300}
//           style={{
//             width: '100%',
//             height: '90%',
//             backgroundColor: theme.colors.background,
//             borderRadius: tokens.borderRadius['2xl'],
//             overflow: 'hidden',
//             padding: tokens.spacing.md,
//           }}>
//           {/* ✖️ Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 8,
//               right: 20,
//               zIndex: 999,
//               backgroundColor: theme.colors.foreground,
//               borderRadius: 24,
//               padding: 6,
//             }}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.background}
//             />
//           </TouchableOpacity>

//           {/* 🛍️ Header */}
//           <Text
//             numberOfLines={1}
//             style={[
//               globalStyles.sectionTitle,
//               {marginTop: 0, marginBottom: tokens.spacing.md},
//             ]}>
//             Shop the Vibe
//           </Text>

//           <ScrollView showsVerticalScrollIndicator={false}>
//             {!hasResults ? (
//               <View
//                 style={{
//                   flex: 1,
//                   alignItems: 'center',
//                   marginTop: 60,
//                   paddingHorizontal: 20,
//                 }}>
//                 <MaterialIcons
//                   name="search-off"
//                   size={48}
//                   color={theme.colors.foreground2}
//                 />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 15,
//                     marginTop: 14,
//                   }}>
//                   No matching products found
//                 </Text>
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     opacity: 0.6,
//                     fontSize: 13,
//                     textAlign: 'center',
//                     marginTop: 6,
//                     lineHeight: 20,
//                   }}>
//                   Try simplifying your prompt, e.g. “men flannel shirt” or
//                   “casual plaid shirt”.
//                 </Text>
//               </View>
//             ) : (
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'space-between',
//                   paddingBottom: 80,
//                 }}>
//                 {results.map((item, idx) => (
//                   <TouchableOpacity
//                     key={idx}
//                     onPress={() => {
//                       ReactNativeHapticFeedback.trigger('impactMedium');
//                       setShopUrl(item.shopUrl);
//                     }}
//                     activeOpacity={0.85}
//                     style={{
//                       width: '49.6%',
//                       marginBottom: tokens.spacing.md,
//                       backgroundColor: theme.colors.surface,
//                       borderWidth: tokens.borderWidth.hairline,
//                       borderColor: theme.colors.inputBorder,
//                       borderRadius: tokens.borderRadius.md,
//                       overflow: 'hidden',
//                     }}>
//                     {/* 🖼️ Product Image */}
//                     <Image
//                       source={{uri: item.image}}
//                       style={{width: '100%', aspectRatio: 3 / 4}}
//                       resizeMode="cover"
//                     />

//                     {/* 💎 Click to Buy Overlay */}
//                     <View
//                       pointerEvents="none"
//                       style={{
//                         position: 'absolute',
//                         bottom: 10,
//                         alignSelf: 'center',
//                         backgroundColor: 'rgba(255,255,255,0.75)',
//                         borderRadius: tokens.borderRadius.lg,
//                         borderWidth: tokens.borderWidth.hairline,
//                         borderColor: 'black',
//                         paddingVertical: 8,
//                         paddingHorizontal: 14,
//                       }}>
//                       <Text
//                         style={{
//                           color: 'black',
//                           fontWeight: '700',
//                           fontSize: 13,
//                           letterSpacing: 0.2,
//                         }}>
//                         Click to Buy →
//                       </Text>
//                     </View>

//                     {/* 🧾 Product Info */}
//                     <View style={{padding: 8}}>
//                       <Text
//                         numberOfLines={1}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontWeight: '500',
//                           fontSize: 13,
//                         }}>
//                         {item.name}
//                       </Text>
//                       {item.brand && (
//                         <Text
//                           numberOfLines={1}
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.7,
//                             fontSize: 11,
//                             marginTop: 4,
//                           }}>
//                           {item.brand}
//                         </Text>
//                       )}
//                       {item.price && (
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '700',
//                             fontSize: 13,
//                             marginTop: 6,
//                           }}>
//                           {item.price}
//                         </Text>
//                       )}
//                     </View>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* 🌐 WebView Modal */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

/////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
//   SafeAreaView,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import IntegratedShopOverlay from './IntegratedShopOverlay';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// export default function ShopModal({
//   visible,
//   onClose,
//   results,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   results: any[];
// }) {
//   const {theme} = useAppTheme();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const globalStyles = useGlobalStyles();

//   if (!visible) return null;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: 'rgba(0,0,0,0.6)',
//           justifyContent: 'center',
//           alignItems: 'center',
//           paddingVertical: tokens.spacing.sm,
//           // padding: tokens.spacing.sm,
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           duration={300}
//           style={{
//             width: '100%',
//             maxWidth: '100%',
//             height: '90%',
//             backgroundColor: theme.colors.background,
//             borderRadius: tokens.borderRadius['2xl'],
//             overflow: 'hidden',
//             padding: tokens.spacing.md,
//           }}>
//           {/* Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 8,
//               right: 20,
//               zIndex: 999,
//               backgroundColor: theme.colors.foreground,
//               borderRadius: 24,
//               padding: 6,
//             }}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.background}
//             />
//           </TouchableOpacity>

//           {/* Product Grid */}
//           <ScrollView showsVerticalScrollIndicator={false}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 0}]}>
//               Shop the Vibe
//             </Text>

//             {results.length === 0 ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                   }}>
//                   Fetching products...
//                 </Text>
//               </View>
//             ) : (
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'space-between',
//                   paddingBottom: 80,
//                 }}>
//                 {results.map((item, idx) => (
//                   <TouchableOpacity
//                     key={idx}
//                     onPress={() => {
//                       ReactNativeHapticFeedback.trigger('impactMedium');
//                       setShopUrl(item.shopUrl);
//                     }}
//                     activeOpacity={0.85}
//                     style={{
//                       width: '48%',
//                       marginBottom: tokens.spacing.md,
//                       backgroundColor: theme.colors.surface,
//                       borderRadius: tokens.borderRadius.md,
//                       overflow: 'hidden',
//                       borderColor: theme.colors.surfaceBorder,
//                       borderWidth: tokens.borderWidth.md,
//                     }}>
//                     {/* 🖼️ Product Image */}
//                     <View style={{position: 'relative'}}>
//                       <Image
//                         source={{uri: item.image}}
//                         style={{
//                           width: '100%',
//                           height: 180,
//                           borderTopLeftRadius: tokens.borderRadius.lg,
//                           borderTopRightRadius: tokens.borderRadius.lg,
//                         }}
//                         resizeMode="cover"
//                       />

//                       {/* 💎 Click to Buy Button (simple frosted look without blur) */}
//                       <View
//                         style={{
//                           position: 'absolute',
//                           bottom: 10,
//                           alignSelf: 'center',
//                           backgroundColor: 'rgba(255,255,255,0.7)', // ← soft translucent “glass” layer
//                           borderRadius: tokens.borderRadius.lg,
//                           borderWidth: tokens.borderWidth.md,
//                           borderColor: theme.colors.background, // ← faint glass edge highlight
//                           paddingVertical: 9,
//                           paddingHorizontal: 14,
//                           shadowColor: '#000',
//                           shadowOpacity: 0.25,
//                           shadowRadius: 6,
//                           shadowOffset: {width: 0, height: 2},
//                           backdropFilter: 'blur(4px)', // iOS-only visual cue (safe to leave in)
//                         }}>
//                         <Text
//                           style={{
//                             color: 'black',
//                             fontWeight: '700',
//                             fontSize: 13,
//                             letterSpacing: 0.2,
//                             textShadowColor: 'rgba(0,0,0,0.0)', // gives text lift over light backgrounds
//                             textShadowRadius: 2,
//                           }}>
//                           Click to Buy →
//                         </Text>
//                       </View>
//                     </View>

//                     {/* 🧾 Product Info */}
//                     <View style={{padding: 8}}>
//                       <Text
//                         numberOfLines={1}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontWeight: '600',
//                           fontSize: 13,
//                         }}>
//                         {item.name}
//                       </Text>
//                       {item.brand && (
//                         <Text
//                           numberOfLines={1}
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.7,
//                             fontSize: 11,
//                             marginTop: 2,
//                           }}>
//                           {item.brand}
//                         </Text>
//                       )}
//                       {item.price && (
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '600',
//                             fontSize: 13,
//                             marginTop: 4,
//                           }}>
//                           {item.price}
//                         </Text>
//                       )}
//                       {item.source && (
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.6,
//                             fontSize: 10,
//                             marginTop: 2,
//                           }}>
//                           Source: {item.source}
//                         </Text>
//                       )}
//                     </View>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* WebView modal */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
//   SafeAreaView,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import IntegratedShopOverlay from './IntegratedShopOverlay';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// export default function ShopModal({
//   visible,
//   onClose,
//   results,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   results: any[];
// }) {
//   const {theme} = useAppTheme();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const globalStyles = useGlobalStyles();

//   if (!visible) return null;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: 'rgba(0,0,0,0.6)',
//           justifyContent: 'center',
//           alignItems: 'center',
//           padding: tokens.spacing.sm,
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           duration={300}
//           style={{
//             width: '100%',
//             maxWidth: 700,
//             height: '90%',
//             backgroundColor: theme.colors.background,
//             borderRadius: tokens.borderRadius['2xl'],
//             overflow: 'hidden',
//             padding: tokens.spacing.md,
//           }}>
//           {/* Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 8,
//               right: 20,
//               zIndex: 999,
//               backgroundColor: theme.colors.foreground,
//               borderRadius: 24,
//               padding: 6,
//             }}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.background}
//             />
//           </TouchableOpacity>

//           {/* Product Grid */}
//           <ScrollView showsVerticalScrollIndicator={false}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 0}]}>
//               Shop the Vibe
//             </Text>

//             {results.length === 0 ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                   }}>
//                   Fetching products...
//                 </Text>
//               </View>
//             ) : (
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'space-between',
//                   paddingBottom: 80,
//                 }}>
//                 {results.map((item, idx) => (
//                   <TouchableOpacity
//                     key={idx}
//                     onPress={() => {
//                       ReactNativeHapticFeedback.trigger('impactMedium');
//                       setShopUrl(item.shopUrl);
//                     }}
//                     activeOpacity={0.85}
//                     style={{
//                       width: '48%',
//                       marginBottom: tokens.spacing.md,
//                       backgroundColor: theme.colors.surface,
//                       borderRadius: tokens.borderRadius.lg,
//                       overflow: 'hidden',
//                       borderColor: theme.colors.muted,
//                       borderWidth: tokens.borderWidth.md,
//                     }}>
//                     <Image
//                       source={{uri: item.image}}
//                       style={{
//                         width: '100%',
//                         height: 180,
//                         borderTopLeftRadius: tokens.borderRadius.lg,
//                         borderTopRightRadius: tokens.borderRadius.lg,
//                       }}
//                       resizeMode="cover"
//                     />
//                     <View style={{padding: 8}}>
//                       <Text
//                         numberOfLines={1}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontWeight: '600',
//                           fontSize: 13,
//                         }}>
//                         {item.name}
//                       </Text>
//                       {item.brand && (
//                         <Text
//                           numberOfLines={1}
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.7,
//                             fontSize: 11,
//                             marginTop: 2,
//                           }}>
//                           {item.brand}
//                         </Text>
//                       )}
//                       {item.price && (
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '600',
//                             fontSize: 13,
//                             marginTop: 4,
//                           }}>
//                           {item.price}
//                         </Text>
//                       )}
//                       {item.source && (
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.6,
//                             fontSize: 10,
//                             marginTop: 2,
//                           }}>
//                           Source: {item.source}
//                         </Text>
//                       )}
//                     </View>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* WebView modal */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }

///////////////////////////

// /* eslint-disable react-native/no-inline-styles */
// import React, {useState} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
//   SafeAreaView,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {WebView} from 'react-native-webview';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import IntegratedShopOverlay from './IntegratedShopOverlay';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// export default function ShopModal({
//   visible,
//   onClose,
//   results,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   results: any[];
// }) {
//   const {theme} = useAppTheme();
//   const [shopUrl, setShopUrl] = useState<string | null>(null);
//   const globalStyles = useGlobalStyles();

//   if (!visible) return null;

//   return (
//     <Modal visible={visible} animationType="fade" transparent>
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: 'rgba(0,0,0,0.5)',
//           justifyContent: 'center',
//           alignItems: 'center',
//           padding: tokens.spacing.sm,
//         }}>
//         <Animatable.View
//           animation="fadeInUp"
//           duration={300}
//           style={{
//             width: '100%',
//             maxWidth: 700,
//             height: '90%',
//             backgroundColor: theme.colors.surface,
//             borderRadius: tokens.borderRadius['2xl'],
//             overflow: 'hidden',
//             padding: tokens.spacing.md,
//           }}>
//           {/* Close */}
//           <TouchableOpacity
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               onClose();
//             }}
//             style={{
//               position: 'absolute',
//               top: 5,
//               right: 20,
//               zIndex: 999,
//               backgroundColor: theme.colors.foreground,
//               borderRadius: 24,
//               padding: 6,
//             }}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.background}
//             />
//           </TouchableOpacity>

//           {/* Product Grid */}
//           <ScrollView showsVerticalScrollIndicator={false}>
//             <Text
//               numberOfLines={1}
//               style={[globalStyles.sectionTitle, {marginTop: 40}]}>
//               Shop the Vibe
//             </Text>

//             {results.length === 0 ? (
//               <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
//                 <ActivityIndicator size="large" color={theme.colors.primary} />
//                 <Text
//                   style={{
//                     color: theme.colors.foreground,
//                     marginTop: 12,
//                     opacity: 0.7,
//                   }}>
//                   Fetching products...
//                 </Text>
//               </View>
//             ) : (
//               <View
//                 style={{
//                   flexDirection: 'row',
//                   flexWrap: 'wrap',
//                   justifyContent: 'space-between',
//                   paddingBottom: 80,
//                 }}>
//                 {results.map((item, idx) => (
//                   <TouchableOpacity
//                     key={idx}
//                     onPress={() => {
//                       ReactNativeHapticFeedback.trigger('impactMedium');
//                       setShopUrl(item.shopUrl);
//                     }}
//                     activeOpacity={0.85}
//                     style={{
//                       width: '48%',
//                       marginBottom: tokens.spacing.md,
//                       backgroundColor: theme.colors.surface2,
//                       borderRadius: tokens.borderRadius.lg,
//                       overflow: 'hidden',
//                     }}>
//                     <Image
//                       source={{uri: item.image}}
//                       style={{
//                         width: '100%',
//                         height: 180,
//                         borderTopLeftRadius: tokens.borderRadius.lg,
//                         borderTopRightRadius: tokens.borderRadius.lg,
//                       }}
//                       resizeMode="cover"
//                     />
//                     <View style={{padding: 8}}>
//                       <Text
//                         numberOfLines={1}
//                         style={{
//                           color: theme.colors.foreground,
//                           fontWeight: '600',
//                           fontSize: 13,
//                         }}>
//                         {item.name}
//                       </Text>
//                       {item.brand && (
//                         <Text
//                           numberOfLines={1}
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.7,
//                             fontSize: 11,
//                             marginTop: 2,
//                           }}>
//                           {item.brand}
//                         </Text>
//                       )}
//                       {item.price && (
//                         <Text
//                           style={{
//                             color: theme.colors.primary,
//                             fontWeight: '600',
//                             fontSize: 13,
//                             marginTop: 4,
//                           }}>
//                           {item.price}
//                         </Text>
//                       )}
//                       {item.source && (
//                         <Text
//                           style={{
//                             color: theme.colors.foreground,
//                             opacity: 0.6,
//                             fontSize: 10,
//                             marginTop: 2,
//                           }}>
//                           Source: {item.source}
//                         </Text>
//                       )}
//                     </View>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}
//           </ScrollView>
//         </Animatable.View>

//         {/* WebView modal */}
//         <IntegratedShopOverlay
//           visible={!!shopUrl}
//           onClose={() => setShopUrl(null)}
//           url={shopUrl}
//         />
//       </View>
//     </Modal>
//   );
// }
