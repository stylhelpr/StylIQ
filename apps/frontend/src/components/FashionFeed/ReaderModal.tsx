import React, {useRef, useLayoutEffect, useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {
  SECURE_WEBVIEW_DEFAULTS,
  createOnShouldStartLoadWithRequest,
} from '../../config/webViewDefaults';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
import {BlurView} from '@react-native-community/blur';
import {useGlobalStyles} from '../..//styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

const {height} = Dimensions.get('window');

export default function ReaderModal({
  visible,
  url,
  title,
  onClose,
}: {
  visible: boolean;
  url?: string;
  title?: string;
  onClose: () => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropRef = useRef<any>(null);
  const isClosingRef = useRef(false);

  const {theme, setSkin} = useAppTheme();
  const globalStyles = useGlobalStyles();

  const insets = useSafeAreaInsets();

  // Reset animation synchronously when modal opens
  useLayoutEffect(() => {
    if (visible) {
      // console.log('📖 ReaderModal visible - resetting translateY to 0');
      translateY.setValue(0);
      isClosingRef.current = false;
    }
  }, [visible]);

  // Also reset on modal show event (fires after animation completes)
  const handleOnShow = () => {
    // console.log('✅ Modal onShow fired - resetting translateY');
    translateY.setValue(0);
  };

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-start',
      paddingTop: insets.top,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.background,
    },
    panel: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.5,
      shadowRadius: 24,
      shadowOffset: {width: 0, height: -8},
      elevation: 20,
    },
    closeIcon: {
      position: 'absolute',
      top: 11,
      right: 18,
      zIndex: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.muted,
      padding: 6,
    },
    gestureZone: {
      position: 'absolute',
      top: 56,
      height: 80,
      width: '100%',
      zIndex: 10,
      backgroundColor: 'transparent',
    },
    header: {
      marginTop: 4,
      height: 56,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      borderBottomColor: 'rgba(255,255,255,0.08)',
      borderBottomWidth: StyleSheet.hairlineWidth,
      zIndex: 5,
    },
    title: {
      color: '#fff',
      fontWeight: tokens.fontWeight.bold,
      fontSize: 17,
      flex: 1,
      textAlign: 'left',
      paddingRight: 50, // Leave space for close icon
    },
  });

  // ✅ Unified close logic for swipe & buttons
  const handleClose = () => {
    if (isClosingRef.current) return;
    // console.log('🚪 handleClose - instant close');
    onClose();
  };

  // ✅ PanResponder logic for swipe-down
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 100 || g.vy > 0.3) {
          handleClose();
        }
      },
    }),
  ).current;

  if (!url) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      onRequestClose={handleClose}
      onShow={handleOnShow}>
      <View style={styles.modalContainer}>
        {/* Dim backdrop */}
        <Animatable.View
          ref={backdropRef}
          animation="fadeIn"
          duration={300}
          style={styles.backdrop}
        />

        {/* 📜 Animated panel */}
        <Animated.View
          style={[
            styles.panel,
            {
              transform: [{translateY}],
              width: '100%',
              height: '100%',
            },
          ]}>
          {/* ❌ Floating close button ABOVE gesture zone */}
          <TouchableOpacity
            style={[styles.closeIcon]}
            onPress={handleClose}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <MaterialIcons name="close" size={22} color={'black'} />
          </TouchableOpacity>

          {/* ✅ Swipe gesture zone */}
          <View
            {...panResponder.panHandlers}
            style={[styles.gestureZone]}
            onStartShouldSetResponder={() => true}
          />

          {/* 🍏 Header */}
          <View
            style={[
              styles.header,
              {backgroundColor: theme.colors.background}, // 👈 solid color same as modal
            ]}>
            <Text
              numberOfLines={1}
              style={[styles.title, {color: theme.colors.foreground}]}>
              {title || 'Article'}
            </Text>
          </View>

          {/* 🌐 WebView */}
          {/* SECURITY: Uses SECURE_WEBVIEW_DEFAULTS to block dangerous schemes */}
          <Animatable.View
            animation="fadeIn"
            delay={250}
            duration={800}
            style={{flex: 1, paddingHorizontal: 4}}>
            <WebView
              {...SECURE_WEBVIEW_DEFAULTS}
              originWhitelist={['https://*', 'http://*']}
              onShouldStartLoadWithRequest={createOnShouldStartLoadWithRequest({
                allowHttp: true,
              })}
              source={{uri: url || ''}}
              style={{flex: 1}}
              decelerationRate="normal"
              bounces={true}
              scrollEnabled={true}
              // onLoadStart={() => console.log('🌐 WebView load start')}
              // onLoadEnd={() => console.log('🌐 WebView load end')}
            />
          </Animatable.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

///////////////

// import React, {useRef, useLayoutEffect, useState} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   Dimensions,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
// import {BlurView} from '@react-native-community/blur';
// import {useGlobalStyles} from '../..//styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

// const {height} = Dimensions.get('window');

// export default function ReaderModal({
//   visible,
//   url,
//   title,
//   onClose,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   const translateY = useRef(new Animated.Value(0)).current;
//   const backdropRef = useRef<any>(null);
//   const isClosingRef = useRef(false);

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const insets = useSafeAreaInsets();

//   // Reset animation synchronously when modal opens
//   useLayoutEffect(() => {
//     if (visible) {
//       console.log('📖 ReaderModal visible - resetting translateY to 0');
//       translateY.setValue(0);
//       isClosingRef.current = false;
//     }
//   }, [visible]);

//   // Also reset on modal show event (fires after animation completes)
//   const handleOnShow = () => {
//     console.log('✅ Modal onShow fired - resetting translateY');
//     translateY.setValue(0);
//   };

//   const styles = StyleSheet.create({
//     modalContainer: {
//       flex: 1,
//       backgroundColor: 'transparent',
//       justifyContent: 'flex-start',
//       paddingTop: insets.top,
//     },
//     backdrop: {
//       ...StyleSheet.absoluteFill,
//       backgroundColor: theme.colors.background,
//     },
//     panel: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       borderTopLeftRadius: 24,
//       borderTopRightRadius: 24,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.5,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: -8},
//       elevation: 20,
//     },
//     closeIcon: {
//       position: 'absolute',
//       top: 11, // 👈 Sits ABOVE gesture zone
//       right: 18,
//       zIndex: 20,
//       backgroundColor: 'white',
//       borderRadius: 20,
//       padding: 6,
//     },
//     gestureZone: {
//       position: 'absolute',
//       top: 56,
//       height: 80,
//       width: '100%',
//       zIndex: 10,
//       backgroundColor: 'transparent',
//     },
//     header: {
//       marginTop: 35, // 👈 Push header BELOW swipe zone
//       height: 56,
//       alignItems: 'center',
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       borderBottomColor: 'rgba(255,255,255,0.08)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       zIndex: 5,
//     },
//     title: {
//       color: '#fff',
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 17,
//       flex: 1,
//       textAlign: 'left',
//     },
//   });

//   // ✅ Unified close logic for swipe & buttons
//   const handleClose = () => {
//     if (isClosingRef.current) return;
//     console.log('🚪 handleClose - instant close');
//     onClose();
//   };

//   // ✅ PanResponder logic for swipe-down
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         }
//       },
//     }),
//   ).current;

//   if (!url) return null;

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="slide"
//       presentationStyle="overFullScreen"
//       statusBarTranslucent={true}
//       hardwareAccelerated={true}
//       onRequestClose={handleClose}
//       onShow={handleOnShow}>
//       <View style={styles.modalContainer}>
//         {/* Dim backdrop */}
//         <Animatable.View
//           ref={backdropRef}
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         {/* 📜 Animated panel */}
//         <Animated.View
//           style={[
//             styles.panel,
//             {
//               transform: [{translateY}],
//               width: '100%',
//               height: '100%',
//             },
//           ]}>
//           {/* ❌ Floating close button ABOVE gesture zone */}
//           <TouchableOpacity
//             style={[styles.closeIcon]}
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               handleClose();
//             }}
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <MaterialIcons name="close" size={22} color={'black'} />
//           </TouchableOpacity>

//           {/* ✅ Swipe gesture zone */}
//           <View
//             {...panResponder.panHandlers}
//             style={[styles.gestureZone]}
//             onStartShouldSetResponder={() => true}
//           />

//           {/* 🍏 Header */}
//           <View
//             style={[
//               styles.header,
//               {backgroundColor: theme.colors.background}, // 👈 solid color same as modal
//             ]}>
//             <Text
//               numberOfLines={1}
//               style={[styles.title, {color: theme.colors.foreground}]}>
//               {title || 'Article'}
//             </Text>
//           </View>

//           {/* 🌐 WebView */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}>
//             <WebView
//               source={{uri: url || ''}}
//               style={{flex: 1}}
//               decelerationRate="normal"
//               bounces={true}
//               scrollEnabled={true}
//               onLoadStart={() => console.log('🌐 WebView load start')}
//               onLoadEnd={() => console.log('🌐 WebView load end')}
//             />
//           </Animatable.View>
//         </Animated.View>
//       </View>
//     </Modal>
//   );
// }

/////////////////

// import React, {useRef, useEffect, useState} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   Dimensions,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
// import {BlurView} from '@react-native-community/blur';
// import {useGlobalStyles} from '../..//styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

// const {height} = Dimensions.get('window');

// export default function ReaderModal({
//   visible,
//   url,
//   title,
//   onClose,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   const translateY = useRef(new Animated.Value(0)).current;
//   const backdropRef = useRef<any>(null);
//   const isClosingRef = useRef(false);

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const insets = useSafeAreaInsets();

//   // Reset animation when modal opens
//   useEffect(() => {
//     if (visible) {
//       translateY.setValue(0);
//       isClosingRef.current = false;
//     }
//   }, [visible, translateY]);

//   const styles = StyleSheet.create({
//     modalContainer: {
//       flex: 1,
//       backgroundColor: 'transparent',
//       justifyContent: 'flex-start',
//       paddingTop: insets.top - 0,
//     },
//     backdrop: {
//       ...StyleSheet.absoluteFill,
//       backgroundColor: theme.colors.background,
//     },
//     panel: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       borderTopLeftRadius: 24,
//       borderTopRightRadius: 24,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.5,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: -8},
//       elevation: 20,
//     },
//     closeIcon: {
//       position: 'absolute',
//       top: 0, // 👈 Sits ABOVE gesture zone
//       right: 20,
//       zIndex: 20,
//       backgroundColor: 'white',
//       borderRadius: 20,
//       padding: 6,
//     },
//     gestureZone: {
//       position: 'absolute',
//       top: 56,
//       height: 80,
//       width: '100%',
//       zIndex: 10,
//       backgroundColor: 'transparent',
//     },
//     header: {
//       marginTop: 35, // 👈 Push header BELOW swipe zone
//       height: 56,
//       alignItems: 'center',
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       borderBottomColor: 'rgba(255,255,255,0.08)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       zIndex: 5,
//     },
//     title: {
//       color: '#fff',
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 17,
//       flex: 1,
//       textAlign: 'left',
//     },
//   });

//   // ✅ Unified close logic for swipe & buttons
//   const handleClose = () => {
//     if (isClosingRef.current) return;
//     console.log('🚪 handleClose - instant close');
//     onClose();
//   };

//   // ✅ PanResponder logic for swipe-down
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         }
//       },
//     }),
//   ).current;

//   if (!url) return null;

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="slide"
//       presentationStyle="overFullScreen"
//       statusBarTranslucent={true}
//       hardwareAccelerated={true}
//       onRequestClose={handleClose}
//       onShow={() => console.log('✅ Modal onShow fired')}>
//       <SafeAreaView style={styles.modalContainer}>
//         {/* Dim backdrop */}
//         <Animatable.View
//           ref={backdropRef}
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />
//         <View
//           style={{
//             // height: insets.top - 60, // ⬅️ 56 is about the old navbar height
//             backgroundColor: theme.colors.background, // same tone as old nav
//           }}
//         />

//         {/* 📜 Animated panel */}
//         <Animated.View
//           style={[
//             styles.panel,
//             {
//               transform: [{translateY}],
//               width: '100%',
//               height: '100%',
//             },
//           ]}>
//           {/* ❌ Floating close button ABOVE gesture zone */}
//           <TouchableOpacity
//             style={[styles.closeIcon]}
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactLight');
//               handleClose();
//             }}
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <MaterialIcons name="close" size={22} color={'black'} />
//           </TouchableOpacity>

//           {/* ✅ Swipe gesture zone */}
//           <View
//             {...panResponder.panHandlers}
//             style={[styles.gestureZone]}
//             onStartShouldSetResponder={() => true}
//           />

//           {/* 🍏 Header */}
//           <View
//             style={[
//               styles.header,
//               {backgroundColor: theme.colors.background}, // 👈 solid color same as modal
//             ]}>
//             <Text
//               numberOfLines={1}
//               style={[styles.title, {color: theme.colors.foreground}]}>
//               {title || 'Article'}
//             </Text>
//           </View>

//           {/* 🌐 WebView */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}>
//             <WebView
//               source={{uri: url || ''}}
//               style={{flex: 1}}
//               onLoadStart={() => console.log('🌐 WebView load start')}
//               onLoadEnd={() => console.log('🌐 WebView load end')}
//             />
//           </Animatable.View>
//         </Animated.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

////////////////////

// import React, {useRef, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   Dimensions,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
// import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
// import {BlurView} from '@react-native-community/blur';
// import {useGlobalStyles} from '../..//styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// const {height} = Dimensions.get('window');

// export default function ReaderModal({
//   visible,
//   url,
//   title,
//   onClose,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   if (!url) return null;

//   const translateY = useRef(new Animated.Value(0)).current;

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     modalContainer: {
//       flex: 1,
//       backgroundColor: 'transparent',
//       justifyContent: 'flex-end',
//     },
//     backdrop: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: theme.colors.background,
//     },
//     panel: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       borderTopLeftRadius: 24,
//       borderTopRightRadius: 24,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.5,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: -8},
//       elevation: 20,
//     },
//     closeIcon: {
//       position: 'absolute',
//       top: 0, // 👈 Sits ABOVE gesture zone
//       right: 20,
//       zIndex: 20,
//       backgroundColor: 'black',
//       borderRadius: 20,
//       padding: 6,
//     },
//     gestureZone: {
//       position: 'absolute',
//       top: 56,
//       height: 80,
//       width: '100%',
//       zIndex: 10,
//       backgroundColor: 'transparent',
//     },
//     header: {
//       marginTop: 35, // 👈 Push header BELOW swipe zone
//       height: 56,
//       alignItems: 'center',
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       borderBottomColor: 'rgba(255,255,255,0.08)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       zIndex: 5,
//     },
//     title: {
//       color: '#fff',
//       fontWeight: '800',
//       fontSize: 17,
//       flex: 1,
//       textAlign: 'left',
//     },
//   });

//   // 🔁 Reset position whenever modal opens
//   useEffect(() => {
//     if (visible) {
//       console.log('✅ Modal visible - resetting translateY');
//       translateY.setValue(0);
//     }
//   }, [visible, translateY]);

//   // ✅ Unified close logic for swipe & buttons
//   const handleClose = () => {
//     console.log('🚪 handleClose triggered');
//     Animated.timing(translateY, {
//       toValue: height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         console.log('✅ Animation complete - calling onClose()');
//         translateY.setValue(0);
//         onClose();
//       }
//     });
//   };

//   // ✅ PanResponder logic for swipe-down
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderGrant: () => console.log('👆 Gesture start detected'),
//       onPanResponderMove: (_e, g) => {
//         console.log('📦 Moving DY:', g.dy);
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         console.log('📉 Released dy:', g.dy, 'vy:', g.vy);
//         if (g.dy > 100 || g.vy > 0.3) {
//           console.log('✅ Swipe down threshold passed — closing');
//           handleClose();
//         } else {
//           console.log('↩️ Snap back');
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       onRequestClose={handleClose}
//       onShow={() => console.log('✅ Modal onShow fired')}>
//       <SafeAreaView style={styles.modalContainer}>
//         {/* Dim backdrop */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         {/* 📜 Animated panel */}
//         <Animated.View
//           style={[
//             styles.panel,
//             {
//               transform: [{translateY}],
//               width: '100%',
//               height: '100%',
//             },
//           ]}>
//           {/* ❌ Floating close button ABOVE gesture zone */}
//           <TouchableOpacity
//             style={[styles.closeIcon]}
//             onPress={() => {
//               ReactNativeHapticFeedback.trigger('impactMedium');
//               handleClose();
//             }}
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </TouchableOpacity>

//           {/* ✅ Swipe gesture zone */}
//           <View
//             {...panResponder.panHandlers}
//             style={[styles.gestureZone]}
//             onStartShouldSetResponder={() => true}
//           />

//           {/* 🍏 Header */}
//           <View
//             style={[
//               styles.header,
//               {backgroundColor: theme.colors.background}, // 👈 solid color same as modal
//             ]}>
//             <Text
//               numberOfLines={1}
//               style={[styles.title, {color: theme.colors.foreground}]}>
//               {title || 'Article'}
//             </Text>
//           </View>

//           {/* 🌐 WebView */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}>
//             <WebView
//               source={{uri: url}}
//               style={{flex: 1}}
//               onLoadStart={() => console.log('🌐 WebView load start')}
//               onLoadEnd={() => console.log('🌐 WebView load end')}
//             />
//           </Animatable.View>
//         </Animated.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

/////////////////

// import React, {useRef, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   Dimensions,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {BlurView} from '@react-native-community/blur';
// import {useGlobalStyles} from '../..//styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// const {height} = Dimensions.get('window');

// export default function ReaderModal({
//   visible,
//   url,
//   title,
//   onClose,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   if (!url) return null;

//   const translateY = useRef(new Animated.Value(0)).current;

//   const {theme, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     modalContainer: {
//       flex: 1,
//       backgroundColor: 'transparent',
//       justifyContent: 'flex-end',
//     },
//     backdrop: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: theme.colors.background,
//     },
//     panel: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//       borderTopLeftRadius: 24,
//       borderTopRightRadius: 24,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.5,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: -8},
//       elevation: 20,
//     },
//     closeIcon: {
//       position: 'absolute',
//       top: 0, // 👈 Sits ABOVE gesture zone
//       right: 20,
//       zIndex: 20,
//       backgroundColor: 'black',
//       borderRadius: 20,
//       padding: 6,
//     },
//     gestureZone: {
//       position: 'absolute',
//       top: 56,
//       height: 80,
//       width: '100%',
//       zIndex: 10,
//       backgroundColor: 'transparent',
//     },
//     header: {
//       marginTop: 35, // 👈 Push header BELOW swipe zone
//       height: 56,
//       alignItems: 'center',
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       borderBottomColor: 'rgba(255,255,255,0.08)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       zIndex: 5,
//     },
//     title: {
//       color: '#fff',
//       fontWeight: '800',
//       fontSize: 17,
//       flex: 1,
//       textAlign: 'left',
//     },
//   });

//   // 🔁 Reset position whenever modal opens
//   useEffect(() => {
//     if (visible) {
//       console.log('✅ Modal visible - resetting translateY');
//       translateY.setValue(0);
//     }
//   }, [visible, translateY]);

//   // ✅ Unified close logic for swipe & buttons
//   const handleClose = () => {
//     console.log('🚪 handleClose triggered');
//     Animated.timing(translateY, {
//       toValue: height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         console.log('✅ Animation complete - calling onClose()');
//         translateY.setValue(0);
//         onClose();
//       }
//     });
//   };

//   // ✅ PanResponder logic for swipe-down
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderGrant: () => console.log('👆 Gesture start detected'),
//       onPanResponderMove: (_e, g) => {
//         console.log('📦 Moving DY:', g.dy);
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         console.log('📉 Released dy:', g.dy, 'vy:', g.vy);
//         if (g.dy > 100 || g.vy > 0.3) {
//           console.log('✅ Swipe down threshold passed — closing');
//           handleClose();
//         } else {
//           console.log('↩️ Snap back');
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       onRequestClose={handleClose}
//       onShow={() => console.log('✅ Modal onShow fired')}>
//       <SafeAreaView style={styles.modalContainer}>
//         {/* Dim backdrop */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         {/* 📜 Animated panel */}
//         <Animated.View
//           style={[
//             styles.panel,
//             {
//               transform: [{translateY}],
//               width: '100%',
//               height: '100%',
//             },
//           ]}>
//           {/* ❌ Floating close button ABOVE gesture zone */}
//           <TouchableOpacity
//             style={[styles.closeIcon]}
//             onPress={handleClose}
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </TouchableOpacity>

//           {/* ✅ Swipe gesture zone */}
//           <View
//             {...panResponder.panHandlers}
//             style={[styles.gestureZone]}
//             onStartShouldSetResponder={() => true}
//           />

//           {/* 🍏 Header */}
//           <BlurView
//             style={styles.header}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={styles.title}>
//               {title || 'Article'}
//             </Text>
//           </BlurView>

//           {/* 🌐 WebView */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}>
//             <WebView
//               source={{uri: url}}
//               style={{flex: 1}}
//               onLoadStart={() => console.log('🌐 WebView load start')}
//               onLoadEnd={() => console.log('🌐 WebView load end')}
//             />
//           </Animatable.View>
//         </Animated.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

/////////////////

// import React, {useRef, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   Dimensions,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {BlurView} from '@react-native-community/blur';

// const {height} = Dimensions.get('window');

// export default function ReaderModal({
//   visible,
//   url,
//   title,
//   onClose,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   if (!url) return null;

//   const translateY = useRef(new Animated.Value(0)).current;

//   const styles = StyleSheet.create({
//     modalContainer: {
//       flex: 1,
//       backgroundColor: 'transparent',
//       justifyContent: 'flex-end',
//     },
//     backdrop: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.55)',
//     },
//     panel: {
//       flex: 1,
//       backgroundColor: '#000',
//       borderTopLeftRadius: 24,
//       borderTopRightRadius: 24,
//       overflow: 'hidden',
//       shadowColor: '#000',
//       shadowOpacity: 0.5,
//       shadowRadius: 24,
//       shadowOffset: {width: 0, height: -8},
//       elevation: 20,
//     },
//     closeIcon: {
//       position: 'absolute',
//       top: 0, // 👈 Sits ABOVE gesture zone
//       right: 20,
//       zIndex: 20,
//       backgroundColor: 'rgba(0,0,0,0.6)',
//       borderRadius: 20,
//       padding: 6,
//     },
//     gestureZone: {
//       position: 'absolute',
//       top: 56,
//       height: 80,
//       width: '100%',
//       zIndex: 10,
//       backgroundColor: 'transparent',
//     },
//     header: {
//       marginTop: 40, // 👈 Push header BELOW swipe zone
//       height: 56,
//       alignItems: 'center',
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       paddingHorizontal: 16,
//       borderBottomColor: 'rgba(255,255,255,0.08)',
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       zIndex: 5,
//     },
//     title: {
//       color: '#fff',
//       fontWeight: '800',
//       fontSize: 17,
//       flex: 1,
//       textAlign: 'left',
//     },
//   });

//   // 🔁 Reset position whenever modal opens
//   useEffect(() => {
//     if (visible) {
//       console.log('✅ Modal visible - resetting translateY');
//       translateY.setValue(0);
//     }
//   }, [visible, translateY]);

//   // ✅ Unified close logic for swipe & buttons
//   const handleClose = () => {
//     console.log('🚪 handleClose triggered');
//     Animated.timing(translateY, {
//       toValue: height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         console.log('✅ Animation complete - calling onClose()');
//         translateY.setValue(0);
//         onClose();
//       }
//     });
//   };

//   // ✅ PanResponder logic for swipe-down
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderGrant: () => console.log('👆 Gesture start detected'),
//       onPanResponderMove: (_e, g) => {
//         console.log('📦 Moving DY:', g.dy);
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         console.log('📉 Released dy:', g.dy, 'vy:', g.vy);
//         if (g.dy > 100 || g.vy > 0.3) {
//           console.log('✅ Swipe down threshold passed — closing');
//           handleClose();
//         } else {
//           console.log('↩️ Snap back');
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       onRequestClose={handleClose}
//       onShow={() => console.log('✅ Modal onShow fired')}>
//       <SafeAreaView style={styles.modalContainer}>
//         {/* Dim backdrop */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         {/* 📜 Animated panel */}
//         <Animated.View
//           style={[
//             styles.panel,
//             {
//               transform: [{translateY}],
//               width: '100%',
//               height: '100%',
//               backgroundColor: 'yellow',
//             },
//           ]}>
//           {/* ❌ Floating close button ABOVE gesture zone */}
//           <TouchableOpacity
//             style={[styles.closeIcon, {backgroundColor: 'red'}]}
//             onPress={handleClose}
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <MaterialIcons name="close" size={28} color="#fff" />
//           </TouchableOpacity>

//           {/* ✅ Swipe gesture zone */}
//           <View
//             {...panResponder.panHandlers}
//             // style={[styles.gestureZone, {backgroundColor: 'blue'}]}
//             style={[styles.gestureZone]}
//             onStartShouldSetResponder={() => true}
//           />

//           {/* 🍏 Header */}
//           <BlurView
//             style={styles.header}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={styles.title}>
//               {title || 'Article'}
//             </Text>
//           </BlurView>

//           {/* 🌐 WebView */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}>
//             <WebView
//               source={{uri: url}}
//               style={{flex: 1}}
//               onLoadStart={() => console.log('🌐 WebView load start')}
//               onLoadEnd={() => console.log('🌐 WebView load end')}
//             />
//           </Animatable.View>
//         </Animated.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

//////////////////////

// import React, {useRef} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   Dimensions,
//   Animated,
//   PanResponder,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {BlurView} from '@react-native-community/blur';

// const {height} = Dimensions.get('window');

// export default function ReaderModal({
//   visible,
//   url,
//   onClose,
//   title,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   if (!url) return null;

//   // ✅ vertical swipe animated value
//   const translateY = useRef(new Animated.Value(0)).current;

//   // ✅ PanResponder for swipe down
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 10,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy); // only down
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 120 || g.vy > 0.4) {
//           // ✅ close if swiped far or fast enough
//           Animated.timing(translateY, {
//             toValue: height,
//             duration: 220,
//             useNativeDriver: true,
//           }).start(onClose);
//         } else {
//           // ✅ snap back if not enough
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       onRequestClose={onClose}>
//       <SafeAreaView style={styles.modalContainer}>
//         {/* Background overlay */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         {/* ✅ Animated panel with swipe-down gesture */}
//         <Animated.View
//           {...panResponder.panHandlers}
//           style={[
//             styles.panel,
//             {
//               transform: [{translateY}],
//               width: '100%',
//               height: '100%',
//             },
//           ]}>
//           {/* Frosted header */}
//           <BlurView
//             style={styles.header}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={styles.title}>
//               {title || 'Article'}
//             </Text>
//             <AppleTouchFeedback
//               onPress={onClose}
//               hapticStyle="impactLight"
//               hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//               <Text style={styles.close}>Done</Text>
//             </AppleTouchFeedback>
//           </BlurView>

//           {/* Animated WebView */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}>
//             <WebView source={{uri: url}} style={{flex: 1}} />
//           </Animatable.View>
//         </Animated.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   modalContainer: {
//     flex: 1,
//     backgroundColor: 'transparent',
//     justifyContent: 'flex-end',
//   },
//   backdrop: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.55)',
//   },
//   panel: {
//     flex: 1,
//     backgroundColor: '#000',
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOpacity: 0.5,
//     shadowRadius: 24,
//     shadowOffset: {width: 0, height: -8},
//     elevation: 20,
//   },
//   header: {
//     height: 56,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     borderBottomColor: 'rgba(255,255,255,0.08)',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   title: {
//     color: '#fff',
//     fontWeight: '800',
//     fontSize: 17,
//     flex: 1,
//     textAlign: 'left',
//   },
//   close: {
//     color: '#0A84FF',
//     fontWeight: '700',
//     fontSize: 16,
//     marginLeft: 12,
//   },
// });

////////////////

// import React from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   Animated,
//   Dimensions,
//   Pressable,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import * as Animatable from 'react-native-animatable';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {BlurView} from '@react-native-community/blur';

// const {height} = Dimensions.get('window');

// export default function ReaderModal({
//   visible,
//   url,
//   onClose,
//   title,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   if (!url) return null;

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       onRequestClose={onClose}>
//       <SafeAreaView style={styles.modalContainer}>
//         {/* Background overlay */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         {/* Sliding panel */}
//         <Animatable.View
//           animation="slideInUp"
//           duration={650}
//           easing="ease-out-cubic"
//           style={styles.panel}>
//           {/* Frosted header */}
//           <BlurView
//             style={styles.header}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={styles.title}>
//               {title || 'Article'}
//             </Text>
//             <AppleTouchFeedback
//               onPress={onClose}
//               hapticStyle="impactLight"
//               hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//               <Text style={styles.close}>Done</Text>
//             </AppleTouchFeedback>
//           </BlurView>

//           {/* Animated WebView */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}>
//             <WebView source={{uri: url}} style={{flex: 1}} />
//           </Animatable.View>
//         </Animatable.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   modalContainer: {
//     flex: 1,
//     backgroundColor: 'transparent',
//     justifyContent: 'flex-end',
//   },
//   backdrop: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.55)',
//   },
//   panel: {
//     flex: 1,
//     backgroundColor: '#000',
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOpacity: 0.5,
//     shadowRadius: 24,
//     shadowOffset: {width: 0, height: -8},
//     elevation: 20,
//   },
//   header: {
//     height: 56,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     borderBottomColor: 'rgba(255,255,255,0.08)',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   title: {
//     color: '#fff',
//     fontWeight: '800',
//     fontSize: 17,
//     flex: 1,
//     textAlign: 'left',
//   },
//   close: {
//     color: '#0A84FF',
//     fontWeight: '700',
//     fontSize: 16,
//     marginLeft: 12,
//   },
// });

/////////////////////

// import React from 'react';
// import {
//   Modal,
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   SafeAreaView,
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// export default function ReaderModal({
//   visible,
//   url,
//   onClose,
//   title,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   if (!url) return null;
//   return (
//     <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
//       <SafeAreaView style={styles.sa}>
//         <View style={styles.header}>
//           <Text numberOfLines={1} style={styles.title}>
//             {title || 'Article'}
//           </Text>
//           <AppleTouchFeedback
//             onPress={onClose}
//             hapticStyle="impactLight"
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <Text style={styles.close}>Done</Text>
//           </AppleTouchFeedback>
//         </View>
//         <WebView source={{uri: url}} style={{flex: 1}} />
//       </SafeAreaView>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   sa: {flex: 1, backgroundColor: '#000'},
//   header: {
//     height: 48,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 12,
//     borderBottomColor: 'rgba(255,255,255,0.08)',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   title: {color: '#fff', fontWeight: '700', fontSize: 16, flex: 1},
//   close: {color: '#0A84FF', fontWeight: '700', marginLeft: 12},
// });

/////////////////

// import React from 'react';
// import {
//   Modal,
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   SafeAreaView,
// } from 'react-native';
// import {WebView} from 'react-native-webview';

// export default function ReaderModal({
//   visible,
//   url,
//   onClose,
//   title,
// }: {
//   visible: boolean;
//   url?: string;
//   title?: string;
//   onClose: () => void;
// }) {
//   if (!url) return null;
//   return (
//     <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
//       <SafeAreaView style={styles.sa}>
//         <View style={styles.header}>
//           <Text numberOfLines={1} style={styles.title}>
//             {title || 'Article'}
//           </Text>
//           <TouchableOpacity
//             onPress={onClose}
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <Text style={styles.close}>Done</Text>
//           </TouchableOpacity>
//         </View>
//         <WebView source={{uri: url}} style={{flex: 1}} />
//       </SafeAreaView>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   sa: {flex: 1, backgroundColor: '#000'},
//   header: {
//     height: 48,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 12,
//     borderBottomColor: 'rgba(255,255,255,0.08)',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//   },
//   title: {color: '#fff', fontWeight: '700', fontSize: 16, flex: 1},
//   close: {color: '#0A84FF', fontWeight: '700', marginLeft: 12},
// });
