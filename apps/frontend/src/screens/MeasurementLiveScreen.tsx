// MeasurementLiveScreen.tsx
// StylIQ

import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {fontScale, moderateScale} from '../utils/scale';
import ARKitView from '../components/features/ARKitView';
import useLiveMeasurement from '../components/features/useLiveMeasurement';
import GhostOverlay from '../components/features/GhostOverlay';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// ✅ Responsive imports
import {useResponsive} from '../hooks/useResponsive';
import {useResponsiveTheme} from '../theme/responsiveTheme';

type Props = {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
};

export function MeasurementLiveScreen({navigate, goBack}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const joints = useLiveMeasurement();

  // ✅ Responsive helpers
  const {isXS, isSM} = useResponsive();
  const {spacing, typography} = useResponsiveTheme();

  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleBack = () => {
    if (goBack) {
      goBack();
    } else {
      navigate('StyleProfileScreen');
    }
  };

  // Onboarding data
  const onboardingData = [
    {
      id: '1',
      emoji: '📱',
      title: 'Position Yourself',
      description:
        'Stand 5-6 feet away from your device in a well-lit area. Ensure your entire body is visible in the frame.',
      gradient: ['#8B5CF6', '#6366F1'],
    },
    {
      id: '2',
      emoji: '👤',
      title: 'Follow the Overlay',
      description:
        'Align your body with the ghost mannequin overlay on screen. This helps ensure accurate measurements.',
      gradient: ['#EC4899', '#8B5CF6'],
    },
    {
      id: '3',
      emoji: '📏',
      title: 'Stay Still',
      description:
        'Keep your body as still as possible while the app tracks your key points for precise measurements.',
      gradient: ['#F59E0B', '#EC4899'],
    },
    {
      id: '4',
      emoji: '✨',
      title: 'Tips for Success',
      description:
        '• Wear form-fitting clothes\n• Remove bulky items\n• Use a plain background\n• Keep arms slightly away from body',
      gradient: ['#10B981', '#F59E0B'],
    },
  ];

  const {width: SCREEN_WIDTH} = Dimensions.get('window');

  const handleNext = () => {
    if (currentPage < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentPage + 1,
        animated: true,
      });
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSkip = () => {
    setShowHelpModal(false);
    setCurrentPage(0);
  };

  const handleGetStarted = () => {
    setShowHelpModal(false);
    setCurrentPage(0);
  };

  const onViewableItemsChanged = useRef(({viewableItems}: any) => {
    if (viewableItems.length > 0) {
      setCurrentPage(viewableItems[0].index || 0);
    }
  }).current;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    debugText: {
      color: theme.colors.foreground,
      fontSize: 16,
    },
    button: {
      position: 'absolute',
      bottom: 100,
      alignSelf: 'center', // ✅ works now that parent is relative
      backgroundColor: theme.colors.button1,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      width: 300, // or '85%' for responsive
    },
    buttonText: {
      color: theme.colors.buttonText1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      {/* Native ARKit camera feed */}
      <ARKitView style={StyleSheet.absoluteFill} />

      <View
        style={[globalStyles.backContainer, {marginTop: 152, paddingLeft: 16}]}>
        <AppleTouchFeedback onPress={handleBack} hapticStyle="impactMedium">
          <MaterialIcons
            name="arrow-back"
            size={moderateScale(26)}
            color={theme.colors.buttonText1}
          />
        </AppleTouchFeedback>
        <Text
          style={[
            globalStyles.backText,
            {
              marginLeft: spacing.sm,
              fontSize: typography.body,
              color: theme.colors.buttonText1,
            },
          ]}>
          Back
        </Text>
      </View>

      {/* Help icon button */}
      <View
        style={{
          position: 'absolute',
          top: 140,
          right: 16,
        }}>
        <AppleTouchFeedback
          onPress={() => setShowHelpModal(true)}
          hapticStyle="impactLight">
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcons
              name="help-outline"
              size={moderateScale(24)}
              color={theme.colors.buttonText1}
            />
          </View>
        </AppleTouchFeedback>
      </View>

      {/* Ghost mannequin overlay */}
      <GhostOverlay joints={joints} />

      {/* Debug text */}
      {/* <View style={styles.debugBox}>
        <Text style={styles.debugText}>
          Tracking joints: {Object.keys(joints).length}
        </Text>
      </View> */}

      {/* 🔥 Add this — direct button to launch front pose flow */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigate('MeasurementFrontScreen')}>
        <Text style={styles.buttonText}>Ready To Measure</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigate('MeasurementJointsAutoScreen')}>
        {/* <Text>Go Auto</Text> */}
      </TouchableOpacity>

      {/* Swipeable Onboarding Modal */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        transparent
        onRequestClose={handleSkip}>
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background,
          }}>
          {/* Close Button */}
          <TouchableOpacity
            onPress={handleSkip}
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcons
              name="close"
              size={24}
              color={theme.colors.foreground}
            />
          </TouchableOpacity>

          {/* Swipeable Cards */}
          <FlatList
            ref={flatListRef}
            data={onboardingData}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{
              itemVisiblePercentThreshold: 50,
            }}
            keyExtractor={item => item.id}
            renderItem={({item, index}) => (
              <View
                style={{
                  width: SCREEN_WIDTH,
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 40,
                }}>
                {/* Emoji Icon with gradient background */}
                <View
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    backgroundColor: theme.colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 40,
                    shadowColor: item.gradient[0],
                    shadowOffset: {width: 0, height: 10},
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    borderWidth: 3,
                    borderColor: item.gradient[0] + '40',
                  }}>
                  <Text style={{fontSize: 70}}>{item.emoji}</Text>
                </View>

                {/* Title */}
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '800',
                    color: theme.colors.foreground,
                    textAlign: 'center',
                    marginBottom: 16,
                    letterSpacing: -0.5,
                  }}>
                  {item.title}
                </Text>

                {/* Description */}
                <Text
                  style={{
                    fontSize: 17,
                    color: theme.colors.foreground2,
                    textAlign: 'center',
                    lineHeight: 26,
                    paddingHorizontal: 20,
                  }}>
                  {item.description}
                </Text>
              </View>
            )}
          />

          {/* Page Indicators (Dots) */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              paddingBottom: 40,
            }}>
            {onboardingData.map((_, index) => (
              <Animated.View
                key={index}
                style={{
                  width: currentPage === index ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    currentPage === index
                      ? theme.colors.button1
                      : theme.colors.foreground,
                  marginHorizontal: 4,
                  opacity: currentPage === index ? 1 : 0.5,
                }}
              />
            ))}
          </View>

          {/* Bottom Buttons */}
          <View
            style={{
              paddingHorizontal: 40,
              paddingBottom: 50,
              gap: 12,
            }}>
            {currentPage === onboardingData.length - 1 ? (
              // Last page - Show "Get Started" button
              <TouchableOpacity
                onPress={handleGetStarted}
                style={{
                  backgroundColor: theme.colors.button1,
                  paddingVertical: 18,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: theme.colors.button1,
                  shadowOffset: {width: 0, height: 8},
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                }}>
                <Text
                  style={{
                    color: theme.colors.buttonText1,
                    fontSize: 18,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                  }}>
                  Get Started
                </Text>
              </TouchableOpacity>
            ) : (
              // Not last page - Show "Next" and "Skip" buttons
              <>
                <TouchableOpacity
                  onPress={handleNext}
                  style={{
                    backgroundColor: theme.colors.button1,
                    paddingVertical: 18,
                    borderRadius: 16,
                    alignItems: 'center',
                    shadowColor: theme.colors.button1,
                    shadowOffset: {width: 0, height: 8},
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                  }}>
                  <Text
                    style={{
                      color: theme.colors.buttonText1,
                      fontSize: 18,
                      fontWeight: '700',
                      letterSpacing: 0.5,
                    }}>
                    Next
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSkip}
                  style={{
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}>
                  <Text
                    style={{
                      color: theme.colors.foreground2,
                      fontSize: 16,
                      fontWeight: '600',
                    }}>
                    Skip
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/////////////////////

// // MeasurementLiveScreen.tsx
// // StylIQ

// import React, {useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Modal,
//   FlatList,
//   Dimensions,
//   Animated,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// // ✅ Responsive imports
// import {useResponsive} from '../hooks/useResponsive';
// import {useResponsiveTheme} from '../theme/responsiveTheme';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   goBack?: () => void;
// };

// export function MeasurementLiveScreen({navigate, goBack}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();

//   // ✅ Responsive helpers
//   const {isXS, isSM} = useResponsive();
//   const {spacing, typography} = useResponsiveTheme();

//   // Help modal state
//   const [showHelpModal, setShowHelpModal] = useState(false);
//   const [currentPage, setCurrentPage] = useState(0);
//   const flatListRef = useRef<FlatList>(null);

//   const handleBack = () => {
//     if (goBack) {
//       goBack();
//     } else {
//       navigate('StyleProfileScreen');
//     }
//   };

//   // Onboarding data
//   const onboardingData = [
//     {
//       id: '1',
//       emoji: '📱',
//       title: 'Position Yourself',
//       description:
//         'Stand 5-6 feet away from your device in a well-lit area. Ensure your entire body is visible in the frame.',
//       gradient: ['#8B5CF6', '#6366F1'],
//     },
//     {
//       id: '2',
//       emoji: '👤',
//       title: 'Follow the Overlay',
//       description:
//         'Align your body with the ghost mannequin overlay on screen. This helps ensure accurate measurements.',
//       gradient: ['#EC4899', '#8B5CF6'],
//     },
//     {
//       id: '3',
//       emoji: '📏',
//       title: 'Stay Still',
//       description:
//         'Keep your body as still as possible while the app tracks your key points for precise measurements.',
//       gradient: ['#F59E0B', '#EC4899'],
//     },
//     {
//       id: '4',
//       emoji: '✨',
//       title: 'Tips for Success',
//       description:
//         '• Wear form-fitting clothes\n• Remove bulky items\n• Use a plain background\n• Keep arms slightly away from body',
//       gradient: ['#10B981', '#F59E0B'],
//     },
//   ];

//   const {width: SCREEN_WIDTH} = Dimensions.get('window');

//   const handleNext = () => {
//     if (currentPage < onboardingData.length - 1) {
//       flatListRef.current?.scrollToIndex({
//         index: currentPage + 1,
//         animated: true,
//       });
//       setCurrentPage(currentPage + 1);
//     }
//   };

//   const handleSkip = () => {
//     setShowHelpModal(false);
//     setCurrentPage(0);
//   };

//   const handleGetStarted = () => {
//     setShowHelpModal(false);
//     setCurrentPage(0);
//   };

//   const onViewableItemsChanged = useRef(({viewableItems}: any) => {
//     if (viewableItems.length > 0) {
//       setCurrentPage(viewableItems[0].index || 0);
//     }
//   }).current;

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: '#000',
//     },
//     debugText: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//     button: {
//       position: 'absolute',
//       bottom: 100,
//       alignSelf: 'center', // ✅ works now that parent is relative
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 14,
//       paddingHorizontal: 32,
//       borderRadius: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//       width: 300, // or '85%' for responsive
//     },
//     buttonText: {
//       color: theme.colors.buttonText1,
//       textAlign: 'center',
//       fontSize: 18,
//       fontWeight: '600',
//     },
//   });

//   return (
//     <View style={styles.container}>
//       {/* Native ARKit camera feed */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <View
//         style={[globalStyles.backContainer, {marginTop: 180, paddingLeft: 16}]}>
//         <AppleTouchFeedback onPress={handleBack} hapticStyle="impactMedium">
//           <MaterialIcons
//             name="arrow-back"
//             size={moderateScale(26)}
//             color={theme.colors.button3}
//           />
//         </AppleTouchFeedback>
//         <Text
//           style={[
//             globalStyles.backText,
//             {marginLeft: spacing.sm, fontSize: typography.body},
//           ]}>
//           Back
//         </Text>
//       </View>

//       {/* Help icon button */}
//       <View
//         style={{
//           position: 'absolute',
//           top: 140,
//           right: 16,
//         }}>
//         <AppleTouchFeedback
//           onPress={() => setShowHelpModal(true)}
//           hapticStyle="impactLight">
//           <View
//             style={{
//               width: 44,
//               height: 44,
//               borderRadius: 22,
//               backgroundColor: 'rgba(0, 0, 0, 0.3)',
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}>
//             <MaterialIcons
//               name="help-outline"
//               size={moderateScale(24)}
//               color={theme.colors.buttonText1}
//             />
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       {/* Ghost mannequin overlay */}
//       <GhostOverlay joints={joints} />

//       {/* Debug text */}
//       {/* <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Tracking joints: {Object.keys(joints).length}
//         </Text>
//       </View> */}

//       {/* 🔥 Add this — direct button to launch front pose flow */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigate('MeasurementFrontScreen')}>
//         <Text style={styles.buttonText}>Ready To Measure</Text>
//       </TouchableOpacity>

//       <TouchableOpacity onPress={() => navigate('MeasurementJointsAutoScreen')}>
//         {/* <Text>Go Auto</Text> */}
//       </TouchableOpacity>

//       {/* Swipeable Onboarding Modal */}
//       <Modal
//         visible={showHelpModal}
//         animationType="slide"
//         transparent
//         onRequestClose={handleSkip}>
//         <View
//           style={{
//             flex: 1,
//             backgroundColor: theme.colors.background,
//           }}>
//           {/* Close Button */}
//           <TouchableOpacity
//             onPress={handleSkip}
//             style={{
//               position: 'absolute',
//               top: 50,
//               right: 20,
//               zIndex: 10,
//               width: 40,
//               height: 40,
//               borderRadius: 20,
//               backgroundColor: 'rgba(0, 0, 0, 0.3)',
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}>
//             <MaterialIcons
//               name="close"
//               size={24}
//               color={theme.colors.foreground}
//             />
//           </TouchableOpacity>

//           {/* Swipeable Cards */}
//           <FlatList
//             ref={flatListRef}
//             data={onboardingData}
//             horizontal
//             pagingEnabled
//             showsHorizontalScrollIndicator={false}
//             onViewableItemsChanged={onViewableItemsChanged}
//             viewabilityConfig={{
//               itemVisiblePercentThreshold: 50,
//             }}
//             keyExtractor={item => item.id}
//             renderItem={({item, index}) => (
//               <View
//                 style={{
//                   width: SCREEN_WIDTH,
//                   flex: 1,
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                   paddingHorizontal: 40,
//                 }}>
//                 {/* Emoji Icon with gradient background */}
//                 <View
//                   style={{
//                     width: 140,
//                     height: 140,
//                     borderRadius: 70,
//                     backgroundColor: theme.colors.surface,
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     marginBottom: 40,
//                     shadowColor: item.gradient[0],
//                     shadowOffset: {width: 0, height: 10},
//                     shadowOpacity: 0.3,
//                     shadowRadius: 20,
//                     borderWidth: 3,
//                     borderColor: item.gradient[0] + '40',
//                   }}>
//                   <Text style={{fontSize: 70}}>{item.emoji}</Text>
//                 </View>

//                 {/* Title */}
//                 <Text
//                   style={{
//                     fontSize: 32,
//                     fontWeight: '800',
//                     color: theme.colors.foreground,
//                     textAlign: 'center',
//                     marginBottom: 16,
//                     letterSpacing: -0.5,
//                   }}>
//                   {item.title}
//                 </Text>

//                 {/* Description */}
//                 <Text
//                   style={{
//                     fontSize: 17,
//                     color: theme.colors.foreground2,
//                     textAlign: 'center',
//                     lineHeight: 26,
//                     paddingHorizontal: 20,
//                   }}>
//                   {item.description}
//                 </Text>
//               </View>
//             )}
//           />

//           {/* Page Indicators (Dots) */}
//           <View
//             style={{
//               flexDirection: 'row',
//               justifyContent: 'center',
//               alignItems: 'center',
//               paddingBottom: 40,
//             }}>
//             {onboardingData.map((_, index) => (
//               <Animated.View
//                 key={index}
//                 style={{
//                   width: currentPage === index ? 24 : 8,
//                   height: 8,
//                   borderRadius: 4,
//                   backgroundColor:
//                     currentPage === index
//                       ? theme.colors.button1
//                       : theme.colors.surface2,
//                   marginHorizontal: 4,
//                   opacity: currentPage === index ? 1 : 0.5,
//                 }}
//               />
//             ))}
//           </View>

//           {/* Bottom Buttons */}
//           <View
//             style={{
//               paddingHorizontal: 40,
//               paddingBottom: 50,
//               gap: 12,
//             }}>
//             {currentPage === onboardingData.length - 1 ? (
//               // Last page - Show "Get Started" button
//               <TouchableOpacity
//                 onPress={handleGetStarted}
//                 style={{
//                   backgroundColor: theme.colors.button1,
//                   paddingVertical: 18,
//                   borderRadius: 16,
//                   alignItems: 'center',
//                   shadowColor: theme.colors.button1,
//                   shadowOffset: {width: 0, height: 8},
//                   shadowOpacity: 0.3,
//                   shadowRadius: 12,
//                 }}>
//                 <Text
//                   style={{
//                     color: theme.colors.buttonText1,
//                     fontSize: 18,
//                     fontWeight: '700',
//                     letterSpacing: 0.5,
//                   }}>
//                   Get Started
//                 </Text>
//               </TouchableOpacity>
//             ) : (
//               // Not last page - Show "Next" and "Skip" buttons
//               <>
//                 <TouchableOpacity
//                   onPress={handleNext}
//                   style={{
//                     backgroundColor: theme.colors.button1,
//                     paddingVertical: 18,
//                     borderRadius: 16,
//                     alignItems: 'center',
//                     shadowColor: theme.colors.button1,
//                     shadowOffset: {width: 0, height: 8},
//                     shadowOpacity: 0.3,
//                     shadowRadius: 12,
//                   }}>
//                   <Text
//                     style={{
//                       color: theme.colors.buttonText1,
//                       fontSize: 18,
//                       fontWeight: '700',
//                       letterSpacing: 0.5,
//                     }}>
//                     Next
//                   </Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={handleSkip}
//                   style={{
//                     paddingVertical: 14,
//                     alignItems: 'center',
//                   }}>
//                   <Text
//                     style={{
//                       color: theme.colors.foreground2,
//                       fontSize: 16,
//                       fontWeight: '600',
//                     }}>
//                     Skip
//                   </Text>
//                 </TouchableOpacity>
//               </>
//             )}
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

///////////////////

// // MeasurementLiveScreen.tsx
// // StylIQ

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// // ✅ Responsive imports
// import {useResponsive} from '../hooks/useResponsive';
// import {useResponsiveTheme} from '../theme/responsiveTheme';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   goBack?: () => void;
// };

// export function MeasurementLiveScreen({navigate, goBack}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();

//   // ✅ Responsive helpers
//   const {isXS, isSM} = useResponsive();
//   const {spacing, typography} = useResponsiveTheme();

//   const handleBack = () => {
//     if (goBack) {
//       goBack();
//     } else {
//       navigate('StyleProfileScreen');
//     }
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: '#000',
//     },
//     debugText: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//     button: {
//       position: 'absolute',
//       bottom: 100,
//       alignSelf: 'center', // ✅ works now that parent is relative
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 14,
//       paddingHorizontal: 32,
//       borderRadius: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//       width: 300, // or '85%' for responsive
//     },
//     buttonText: {
//       color: theme.colors.buttonText1,
//       textAlign: 'center',
//       fontSize: 18,
//       fontWeight: '600',
//     },
//   });

//   return (
//     <View style={styles.container}>
//       {/* Native ARKit camera feed */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       <View
//         style={[globalStyles.backContainer, {marginTop: 180, paddingLeft: 16}]}>
//         <AppleTouchFeedback onPress={handleBack} hapticStyle="impactMedium">
//           <MaterialIcons
//             name="arrow-back"
//             size={moderateScale(26)}
//             color={theme.colors.button3}
//           />
//         </AppleTouchFeedback>
//         <Text
//           style={[
//             globalStyles.backText,
//             {marginLeft: spacing.sm, fontSize: typography.body},
//           ]}>
//           Back
//         </Text>
//       </View>

//       {/* Ghost mannequin overlay */}
//       <GhostOverlay joints={joints} />

//       {/* Debug text */}
//       {/* <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Tracking joints: {Object.keys(joints).length}
//         </Text>
//       </View> */}

//       {/* 🔥 Add this — direct button to launch front pose flow */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigate('MeasurementFrontScreen')}>
//         <Text style={styles.buttonText}>Ready To Measure</Text>
//       </TouchableOpacity>

//       <TouchableOpacity onPress={() => navigate('MeasurementJointsAutoScreen')}>
//         {/* <Text>Go Auto</Text> */}
//       </TouchableOpacity>
//     </View>
//   );
// }

/////////////////

// // MeasurementLiveScreen.tsx
// // StylIQ

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// type Props = {navigate: (screen: string, params?: any) => void};

// export function MeasurementLiveScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: '#000',
//     },
//     debugText: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//     button: {
//       position: 'absolute',
//       bottom: 100,
//       alignSelf: 'center', // ✅ works now that parent is relative
//       backgroundColor: theme.colors.button1,
//       paddingVertical: 14,
//       paddingHorizontal: 32,
//       borderRadius: 12,
//       justifyContent: 'center',
//       alignItems: 'center',
//       width: 300, // or '85%' for responsive
//     },
//     buttonText: {
//       color: theme.colors.buttonText1,
//       textAlign: 'center',
//       fontSize: 18,
//       fontWeight: '600',
//     },
//   });

//   return (
//     <View style={styles.container}>
//       {/* Native ARKit camera feed */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* Ghost mannequin overlay */}
//       <GhostOverlay joints={joints} />

//       {/* Debug text */}
//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Tracking joints: {Object.keys(joints).length}
//         </Text>
//       </View>

//       {/* 🔥 Add this — direct button to launch front pose flow */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigate('MeasurementFrontScreen')}>
//         <Text style={styles.buttonText}>Ready To Measure</Text>
//       </TouchableOpacity>

//       <TouchableOpacity onPress={() => navigate('MeasurementJointsAutoScreen')}>
//         <Text>Go Auto</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

/////////////////

// // MeasurementLiveScreen.tsx
// // StylIQ

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// type Props = {navigate: (screen: string, params?: any) => void};

// export function MeasurementLiveScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const joints = useLiveMeasurement();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: '#000',
//     },
//     debugText: {
//       color: theme.colors.foreground,
//       fontSize: 16,
//     },
//     button: {
//       position: 'absolute',
//       bottom: 80,
//       left: 0,
//       right: 0,
//       alignSelf: 'center',
//       backgroundColor: theme.colors.button1,
//       paddingHorizontal: 20,
//       paddingVertical: 12,
//       borderRadius: 12,
//     },
//     buttonText: {
//       color: theme.colors.buttonText1,
//       textAlign: 'center',
//       fontSize: 18,
//       fontWeight: '600',
//     },
//   });

//   return (
//     <View style={styles.container}>
//       {/* Native ARKit camera feed */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* Ghost mannequin overlay */}
//       <GhostOverlay joints={joints} />

//       {/* Debug text */}
//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Tracking joints: {Object.keys(joints).length}
//         </Text>
//       </View>

//       {/* 🔥 Add this — direct button to launch front pose flow */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigate('MeasurementFrontScreen')}>
//         <Text style={styles.buttonText}>Ready To Measure</Text>
//       </TouchableOpacity>

//       <TouchableOpacity onPress={() => navigate('MeasurementJointsAutoScreen')}>
//         <Text>Go Auto</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

///////////////////

// // MeasurementLiveScreen.tsx
// // StylIQ

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

// import ARKitView from '../components/features/ARKitView';
// import useLiveMeasurement from '../components/features/useLiveMeasurement';
// import GhostOverlay from '../components/features/GhostOverlay';
// type Props = {navigate: (screen: string, params?: any) => void};

// export function MeasurementLiveScreen({navigate}: Props) {
//   const joints = useLiveMeasurement();

//   return (
//     <View style={styles.container}>
//       {/* Native ARKit camera feed */}
//       <ARKitView style={StyleSheet.absoluteFill} />

//       {/* Ghost mannequin overlay */}
//       <GhostOverlay joints={joints} />

//       {/* Debug text */}
//       <View style={styles.debugBox}>
//         <Text style={styles.debugText}>
//           Tracking joints: {Object.keys(joints).length}
//         </Text>
//       </View>

//       {/* 🔥 Add this — direct button to launch front pose flow */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigate('MeasurementFrontScreen')}>
//         <Text style={styles.buttonText}>Test Front Pose</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   debugBox: {
//     position: 'absolute',
//     top: 40,
//     left: 20,
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     backgroundColor: 'rgba(0,0,0,0.4)',
//     borderRadius: 8,
//   },
//   debugText: {
//     color: '#fff',
//     fontSize: 16,
//   },
//   button: {
//     position: 'absolute',
//     bottom: 80,
//     left: 0,
//     right: 0,
//     alignSelf: 'center',
//     backgroundColor: '#0A84FF',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 12,
//   },
//   buttonText: {
//     color: '#fff',
//     textAlign: 'center',
//     fontSize: 18,
//     fontWeight: '600',
//   },
// });
