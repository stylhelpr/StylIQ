/* eslint-disable react-native/no-inline-styles */
import React, {useRef, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {BlurView} from '@react-native-community/blur';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';

const {height} = Dimensions.get('window');

export default function AllSavedLooksModal({
  visible,
  onClose,
  savedLooks,
  recreateLook,
  openShopModal,
}: {
  visible: boolean;
  onClose: () => void;
  savedLooks: any[];
  recreateLook?: (params: {image_url: string; tags?: string[]}) => void;
  openShopModal?: (tags?: string[]) => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
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
      top: 0,
      right: 20,
      zIndex: 20,
      backgroundColor: 'black',
      borderRadius: 20,
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
      marginTop: 35,
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
      color: theme.colors.foreground,
      fontWeight: '800',
      fontSize: 17,
      flex: 1,
      textAlign: 'left',
    },
  });

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) {
        translateY.setValue(0);
        onClose();
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 100 || g.vy > 0.3) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalContainer} pointerEvents="box-none">
        <Animatable.View
          animation="fadeIn"
          duration={300}
          style={styles.backdrop}
        />

        <Animated.View
          style={[
            styles.panel,
            {
              transform: [{translateY}],
              width: '100%',
              height: '100%',
            },
          ]}
          pointerEvents="box-none">
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={handleClose}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <MaterialIcons
              name="close"
              size={22}
              color={theme.colors.buttonText1}
            />
          </TouchableOpacity>

          <View
            {...panResponder.panHandlers}
            pointerEvents="box-only"
            style={styles.gestureZone}
          />

          <BlurView
            style={styles.header}
            blurType="dark"
            blurAmount={20}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
            <Text numberOfLines={1} style={styles.title}>
              All Saved Looks
            </Text>
          </BlurView>

          <Animatable.View
            animation="fadeIn"
            delay={250}
            duration={800}
            style={{flex: 1}}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingBottom: 80,
              }}>
              {savedLooks.map((look, index) => (
                <Animatable.View
                  key={look.id || index}
                  animation="fadeInUp"
                  delay={index * 50}
                  useNativeDriver
                  style={{
                    width: '48%',
                    marginBottom: 12,
                    borderRadius: tokens.borderRadius.md,
                    overflow: 'hidden',
                    backgroundColor: theme.colors.surface,
                  }}>
                  <Image
                    source={{uri: look.image_url}}
                    style={{width: '100%', height: 180}}
                    resizeMode="cover"
                  />

                  {/* 🏷️ Tags */}
                  {look.tags?.length > 0 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        paddingHorizontal: 8,
                        marginTop: 4,
                      }}>
                      {look.tags.map((t, i) => (
                        <View
                          key={`${t}-${i}`}
                          style={{
                            backgroundColor: theme.colors.surface2,
                            borderRadius: 10,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            margin: 2,
                          }}>
                          <Text
                            style={{
                              color: theme.colors.foreground,
                              fontSize: 11,
                            }}>
                            #{t}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 🔘 Action buttons */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingHorizontal: 8,
                      paddingVertical: 8,
                    }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        recreateLook &&
                        recreateLook({
                          image_url: look.image_url,
                          tags: look.tags,
                        })
                      }
                      style={{
                        backgroundColor: theme.colors.button1,
                        borderRadius: tokens.borderRadius.md,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                      }}>
                      <Text
                        style={{
                          color: 'white',
                          fontWeight: '600',
                          fontSize: 12,
                        }}>
                        Recreate
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        openShopModal &&
                        openShopModal(
                          look.tags && look.tags.length > 0
                            ? look.tags
                            : ['outfit', 'fashion', 'style'],
                        )
                      }
                      style={{
                        backgroundColor: theme.colors.surface3,
                        borderRadius: tokens.borderRadius.md,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                      }}>
                      <Text
                        style={{
                          color: theme.colors.foreground,
                          fontWeight: '600',
                          fontSize: 12,
                        }}>
                        Shop the vibe
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={{
                      paddingHorizontal: 8,
                      paddingBottom: 10,
                      color: theme.colors.foreground,
                      fontWeight: '600',
                      fontSize: 13,
                    }}
                    numberOfLines={1}>
                    {look.name || 'Unnamed Look'}
                  </Text>
                </Animatable.View>
              ))}
            </ScrollView>
          </Animatable.View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

////////////////////

// import React, {useRef, useEffect} from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   StyleSheet,
//   SafeAreaView,
//   Animated,
//   Dimensions,
//   PanResponder,
//   TouchableOpacity,
//   ScrollView,
//   Image,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {BlurView} from '@react-native-community/blur';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../../styles/tokens/tokens';
// import {useAppTheme} from '../../context/ThemeContext';

// const {height} = Dimensions.get('window');

// export default function AllSavedLooksModal({
//   visible,
//   onClose,
//   savedLooks,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   savedLooks: any[];
// }) {
//   const translateY = useRef(new Animated.Value(0)).current;
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     modalContainer: {
//       flex: 1,
//       backgroundColor: 'transparent',
//       justifyContent: 'flex-end',
//     },
//     backdrop: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(0,0,0,0.7)',
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
//       top: 0,
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
//       marginTop: 35,
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
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 17,
//       flex: 1,
//       textAlign: 'left',
//     },
//   });

//   // 🔁 Reset translation when opening
//   useEffect(() => {
//     if (visible) translateY.setValue(0);
//   }, [visible, translateY]);

//   // ✅ Handle close animation
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

//   // ✅ Swipe-down pan responder
//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
//       onPanResponderMove: (_e, g) => {
//         if (g.dy > 0) translateY.setValue(g.dy);
//       },
//       onPanResponderRelease: (_e, g) => {
//         if (g.dy > 100 || g.vy > 0.3) {
//           handleClose();
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     }),
//   ).current;

//   if (!visible) return null;

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       presentationStyle="overFullScreen" // ✅ ensures independent gesture layer
//       onRequestClose={handleClose}>
//       <SafeAreaView style={styles.modalContainer} pointerEvents="box-none">
//         {/* Dim backdrop */}
//         <Animatable.View
//           animation="fadeIn"
//           duration={300}
//           style={styles.backdrop}
//         />

//         {/* Animated content panel */}
//         <Animated.View
//           style={[
//             styles.panel,
//             {
//               transform: [{translateY}],
//               width: '100%',
//               height: '100%',
//             },
//           ]}
//           pointerEvents="box-none">
//           {/* ❌ Floating close button */}
//           <TouchableOpacity
//             style={styles.closeIcon}
//             onPress={handleClose}
//             hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
//             <MaterialIcons
//               name="close"
//               size={22}
//               color={theme.colors.buttonText1}
//             />
//           </TouchableOpacity>

//           {/* ✅ Gesture zone — captures swipe events */}
//           <View
//             {...panResponder.panHandlers}
//             pointerEvents="box-only"
//             style={styles.gestureZone}
//           />

//           {/* 🍏 Header */}
//           <BlurView
//             style={styles.header}
//             blurType="dark"
//             blurAmount={20}
//             reducedTransparencyFallbackColor="rgba(0,0,0,0.85)">
//             <Text numberOfLines={1} style={styles.title}>
//               All Saved Looks
//             </Text>
//           </BlurView>

//           {/* 🖼️ Scrollable image grid */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={250}
//             duration={800}
//             style={{flex: 1}}>
//             <ScrollView
//               showsVerticalScrollIndicator={false}
//               contentContainerStyle={{
//                 flexDirection: 'row',
//                 flexWrap: 'wrap',
//                 justifyContent: 'space-between',
//                 paddingHorizontal: 12,
//                 paddingBottom: 80,
//               }}>
//               {savedLooks.map((look, index) => (
//                 <Animatable.View
//                   key={look.id || index}
//                   animation="fadeInUp"
//                   delay={index * 50}
//                   useNativeDriver
//                   style={{
//                     width: '48%',
//                     marginBottom: 12,
//                     borderRadius: tokens.borderRadius.md,
//                     overflow: 'hidden',
//                     backgroundColor: theme.colors.surface,
//                   }}>
//                   <Image
//                     source={{uri: look.image_url}}
//                     style={{width: '100%', height: 180}}
//                     resizeMode="cover"
//                   />
//                   <Text
//                     style={{
//                       padding: 8,
//                       color: theme.colors.foreground,
//                       fontWeight: '600',
//                       fontSize: 13,
//                     }}
//                     numberOfLines={1}>
//                     {look.name || 'Unnamed Look'}
//                   </Text>
//                 </Animatable.View>
//               ))}
//             </ScrollView>
//           </Animatable.View>
//         </Animated.View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

//////////////////////

// import React from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   Image,
//   StyleSheet,
//   PanResponder,
//   Animated,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   savedLooks: any[];
//   theme: any;
// };

// const AllSavedLooksModal: React.FC<Props> = ({
//   visible,
//   onClose,
//   savedLooks,
//   theme,
// }) => {
//   const translateY = React.useRef(new Animated.Value(0)).current;

//   const panResponder = React.useMemo(
//     () =>
//       PanResponder.create({
//         onMoveShouldSetPanResponder: (_, gestureState) =>
//           Math.abs(gestureState.dy) > 10,
//         onPanResponderMove: (_, gestureState) => {
//           if (gestureState.dy > 0) {
//             translateY.setValue(gestureState.dy);
//           }
//         },
//         onPanResponderRelease: (_, gestureState) => {
//           if (gestureState.dy > 120) {
//             Animated.timing(translateY, {
//               toValue: 600,
//               duration: 200,
//               useNativeDriver: true,
//             }).start(() => {
//               onClose();
//               translateY.setValue(0);
//             });
//           } else {
//             Animated.spring(translateY, {
//               toValue: 0,
//               useNativeDriver: true,
//               bounciness: 6,
//             }).start();
//           }
//         },
//       }),
//     [onClose, translateY],
//   );

//   const styles = StyleSheet.create({
//     overlay: {
//       flex: 1,
//       justifyContent: 'flex-start',
//       alignItems: 'center',
//       backgroundColor: 'rgba(0,0,0,0.6)',
//     },
//     card: {
//       width: '100%',
//       flex: 1,
//       backgroundColor: theme.colors.surface,
//       borderTopLeftRadius: tokens.borderRadius['2xl'],
//       borderTopRightRadius: tokens.borderRadius['2xl'],
//       overflow: 'hidden',
//       paddingTop: 60,
//     },
//     header: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: 20,
//       marginBottom: 10,
//     },
//     title: {
//       fontSize: 18,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//   });

//   return (
//     <Modal visible={visible} transparent animationType="slide">
//       <View style={styles.overlay}>
//         <Animated.View
//           style={[styles.card, {transform: [{translateY}]}]}
//           {...panResponder.panHandlers}>
//           {/* Header */}
//           <View style={styles.header}>
//             <Text style={styles.title}>All Saved Looks</Text>
//             <AppleTouchFeedback hapticStyle="impactLight" onPress={onClose}>
//               <Icon name="close" size={26} color={theme.colors.foreground} />
//             </AppleTouchFeedback>
//           </View>

//           {/* Image Grid */}
//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{
//               flexDirection: 'row',
//               flexWrap: 'wrap',
//               justifyContent: 'space-between',
//               paddingHorizontal: 12,
//               paddingBottom: 80,
//             }}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id || index}
//                 animation="fadeInUp"
//                 delay={index * 50}
//                 useNativeDriver
//                 style={{
//                   width: '48%',
//                   marginBottom: 12,
//                   borderRadius: tokens.borderRadius.md,
//                   overflow: 'hidden',
//                   backgroundColor: theme.colors.surface3,
//                 }}>
//                 <Image
//                   source={{uri: look.image_url}}
//                   style={{width: '100%', height: 180}}
//                   resizeMode="cover"
//                 />
//                 <Text
//                   style={{
//                     padding: 8,
//                     color: theme.colors.foreground,
//                     fontWeight: '600',
//                     fontSize: 13,
//                   }}
//                   numberOfLines={1}>
//                   {look.name || 'Unnamed Look'}
//                 </Text>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         </Animated.View>
//       </View>
//     </Modal>
//   );
// };

// export default AllSavedLooksModal;

///////////////////

// import React from 'react';
// import {View, Text, ScrollView, Image, Modal} from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   savedLooks: any[];
//   theme: any;
// };

// const AllSavedLooksModal: React.FC<Props> = ({
//   visible,
//   onClose,
//   savedLooks,
//   theme,
// }) => {
//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="slide"
//       onRequestClose={onClose}>
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: theme.colors.background,
//           paddingTop: 60,
//         }}>
//         {/* Header */}
//         <View
//           style={{
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             paddingHorizontal: 20,
//             marginBottom: 10,
//           }}>
//           <Text
//             style={{
//               fontSize: 18,
//               fontWeight: '700',
//               color: theme.colors.foreground,
//             }}>
//             All Saved Looks
//           </Text>
//           <AppleTouchFeedback hapticStyle="impactLight" onPress={onClose}>
//             <Icon name="close" size={26} color={theme.colors.foreground} />
//           </AppleTouchFeedback>
//         </View>

//         {/* Image Grid */}
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{
//             flexDirection: 'row',
//             flexWrap: 'wrap',
//             justifyContent: 'space-between',
//             paddingHorizontal: 12,
//             paddingBottom: 80,
//           }}>
//           {savedLooks.map((look, index) => (
//             <Animatable.View
//               key={look.id || index}
//               animation="fadeInUp"
//               delay={index * 50}
//               useNativeDriver
//               style={{
//                 width: '48%',
//                 marginBottom: 12,
//                 borderRadius: tokens.borderRadius.md,
//                 overflow: 'hidden',
//                 backgroundColor: theme.colors.surface,
//               }}>
//               <Image
//                 source={{uri: look.image_url}}
//                 style={{width: '100%', height: 180}}
//                 resizeMode="cover"
//               />
//               <Text
//                 style={{
//                   padding: 8,
//                   color: theme.colors.foreground,
//                   fontWeight: '600',
//                   fontSize: 13,
//                 }}
//                 numberOfLines={1}>
//                 {look.name || 'Unnamed Look'}
//               </Text>
//             </Animatable.View>
//           ))}
//         </ScrollView>
//       </View>
//     </Modal>
//   );
// };

// export default AllSavedLooksModal;
