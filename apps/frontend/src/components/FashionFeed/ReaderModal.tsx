import React, {useRef, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import {WebView} from 'react-native-webview';
import * as Animatable from 'react-native-animatable';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {BlurView} from '@react-native-community/blur';

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
  if (!url) return null;

  const translateY = useRef(new Animated.Value(0)).current;

  // 🔁 Reset position whenever modal opens
  useEffect(() => {
    if (visible) {
      console.log('✅ Modal visible - resetting translateY');
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  // ✅ Unified close logic for swipe & Done
  const handleClose = () => {
    console.log('🚪 handleClose triggered');
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) {
        console.log('✅ Animation complete - calling onClose()');
        translateY.setValue(0);
        onClose();
      }
    });
  };

  // ✅ PanResponder logic for swipe-down
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
      onPanResponderGrant: () => {
        console.log('👆 Gesture start detected');
      },
      onPanResponderMove: (_e, g) => {
        console.log('📦 Moving DY:', g.dy);
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        console.log('📉 Released dy:', g.dy, 'vy:', g.vy);
        if (g.dy > 100 || g.vy > 0.3) {
          console.log('✅ Swipe down threshold passed — closing');
          handleClose();
        } else {
          console.log('↩️ Snap back');
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      onShow={() => console.log('✅ Modal onShow fired')}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Dim backdrop */}
        <Animatable.View
          animation="fadeIn"
          duration={300}
          style={styles.backdrop}
        />

        {/* Animated panel */}
        <Animated.View
          style={[
            styles.panel,
            {transform: [{translateY}], width: '100%', height: '100%'},
          ]}>
          {/* ✅ Gesture capture zone */}
          <View
            {...panResponder.panHandlers}
            style={styles.gestureZone}
            onStartShouldSetResponder={() => true}
          />

          {/* 🍏 Header */}
          <BlurView
            style={styles.header}
            blurType="dark"
            blurAmount={20}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
            <Text numberOfLines={1} style={styles.title}>
              {title || 'Article'}
            </Text>

            {/* ✅ Done button also closes via handleClose */}
            <AppleTouchFeedback
              onPress={handleClose}
              hapticStyle="impactLight"
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <Text style={styles.close}>Done</Text>
            </AppleTouchFeedback>
          </BlurView>

          {/* 🌐 WebView */}
          <Animatable.View
            animation="fadeIn"
            delay={250}
            duration={800}
            style={{flex: 1}}>
            <WebView
              source={{uri: url}}
              style={{flex: 1}}
              onLoadStart={() => console.log('🌐 WebView load start')}
              onLoadEnd={() => console.log('🌐 WebView load end')}
            />
          </Animatable.View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    flex: 1,
    backgroundColor: '#000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: -8},
    elevation: 20,
  },
  gestureZone: {
    position: 'absolute',
    top: 0,
    height: 80,
    width: '100%',
    zIndex: 10,
    backgroundColor: 'transparent', // 👈 keep invisible, captures touches
  },
  header: {
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
    fontWeight: '800',
    fontSize: 17,
    flex: 1,
    textAlign: 'left',
  },
  close: {
    color: '#0A84FF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 12,
  },
});

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
// } from 'react-native';
// import {WebView} from 'react-native-webview';
// import * as Animatable from 'react-native-animatable';
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

//   // 🔁 Reset position whenever modal opens
//   useEffect(() => {
//     if (visible) {
//       translateY.setValue(0);
//     }
//   }, [visible, translateY]);

//   // ✅ Unified close logic
//   const handleClose = () => {
//     Animated.timing(translateY, {
//       toValue: height,
//       duration: 220,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         translateY.setValue(0);
//         onClose();
//       }
//     });
//   };

//   // ✅ PanResponder logic
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderGrant: () => {
//         console.log('👆 Gesture start detected');
//       },
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
//       onRequestClose={handleClose}>
//       <SafeAreaView style={styles.modalContainer}>
//         {/* Dim backdrop */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         {/* Animated panel */}
//         <Animated.View
//           style={[
//             styles.panel,
//             {transform: [{translateY}], width: '100%', height: '100%'},
//           ]}>
//           {/* ✅ Gesture capture zone (swipe-down works even over WebView) */}
//           <View
//             {...panResponder.panHandlers}
//             style={styles.gestureZone}
//             onStartShouldSetResponder={() => true}
//           />

//           {/* Header */}
//           <BlurView
//             style={styles.header}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={styles.title}>
//               {title || 'Article'}
//             </Text>
//             <AppleTouchFeedback
//               onPress={handleClose}
//               hapticStyle="impactLight"
//               hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//               <Text style={styles.close}>Done</Text>
//             </AppleTouchFeedback>
//           </BlurView>

//           {/* Web content */}
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
//   gestureZone: {
//     position: 'absolute',
//     top: 0,
//     height: 80, // 👈 Swipe zone height (tweak if needed)
//     width: '100%',
//     zIndex: 10,
//     backgroundColor: 'transparent',
//   },
//   header: {
//     height: 56,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     borderBottomColor: 'rgba(255,255,255,0.08)',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     zIndex: 5,
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

////////////////////

// import React, {useRef, useEffect, useState} from 'react';
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
//   const [swiping, setSwiping] = useState(false);

//   useEffect(() => {
//     if (visible) {
//       console.log('✅ Modal visible - resetting translateY');
//       translateY.setValue(0);
//     }
//   }, [visible]);

//   const handleClose = () => {
//     console.log('🚪 handleClose triggered');
//     Animated.timing(translateY, {
//       toValue: height,
//       duration: 250,
//       useNativeDriver: true,
//     }).start(({finished}) => {
//       if (finished) {
//         console.log('✅ Animation complete - calling onClose()');
//         translateY.setValue(0);
//         onClose();
//       }
//     });
//   };

//   // 🪵 PanResponder with detailed logs
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => {
//         console.log('👆 TOUCH START detected');
//         return true;
//       },
//       onMoveShouldSetPanResponder: (_, g) => {
//         console.log('📍 onMoveShouldSetPanResponder triggered:', g.dy);
//         return Math.abs(g.dy) > 2; // even tiny drags
//       },
//       onPanResponderGrant: () => {
//         console.log('✋ Pan GRANTED — gesture started');
//         setSwiping(true);
//       },
//       onPanResponderMove: (_, g) => {
//         console.log('📦 MOVING dy:', g.dy);
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_, g) => {
//         console.log('📉 RELEASE dy:', g.dy, 'vy:', g.vy);
//         setSwiping(false);
//         if (g.dy > 100 || g.vy > 0.3) {
//           console.log('✅ Swipe passed threshold — closing');
//           handleClose();
//         } else {
//           console.log('↩️ Swipe too short — snapping back');
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//       onPanResponderTerminate: () => {
//         console.log('❌ Pan TERMINATED');
//         setSwiping(false);
//       },
//     }),
//   ).current;

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       onShow={() => console.log('✅ Modal onShow fired')}
//       onRequestClose={handleClose}>
//       <SafeAreaView style={styles.modalContainer}>
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         {/* 🪩 Entire panel now listens for touch */}
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
//           {/* 🔥 Visual target zone */}
//           <View style={styles.gestureZone}>
//             <Text style={{color: '#fff', fontSize: 14}}>⬇️ SWIPE HERE</Text>
//           </View>

//           {/* 🍏 Header */}
//           <BlurView
//             style={styles.header}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={styles.title}>
//               {title || 'Article'}
//             </Text>
//             <AppleTouchFeedback
//               onPress={handleClose}
//               hapticStyle="impactLight"
//               hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//               <Text style={styles.close}>Done</Text>
//             </AppleTouchFeedback>
//           </BlurView>

//           {/* 🌐 WebView */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}
//             pointerEvents={swiping ? 'none' : 'auto'}>
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
//   gestureZone: {
//     width: '100%',
//     height: 80,
//     backgroundColor: 'rgba(255,0,0,0.3)', // 🔥 red swipe area
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   header: {
//     height: 56,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     borderBottomColor: 'rgba(255,255,255,0.08)',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     zIndex: 5,
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

//////////////////

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
