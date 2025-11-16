import React, {useState, useRef, useEffect} from 'react';
import {View, Text, StyleSheet, Animated, Platform} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppTheme} from '../../context/ThemeContext';
import {useAuth0} from 'react-native-auth0';
import type {Screen} from '../../navigation/types';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {fontScale, moderateScale} from '../../utils/scale';
import {tokens} from '../../styles/tokens/tokens';
import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

type Props = {
  navigate: (screen: Screen) => void;
  showSettings?: boolean;
  scrollY?: Animated.Value;
};

export default function GlobalHeader({
  navigate,
  showSettings = false,
  scrollY,
}: Props) {
  const {theme} = useAppTheme();
  const {clearSession} = useAuth0();
  const [menuOpen, setMenuOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  const handleLogout = async () => {
    try {
      await clearSession();
      navigate('Login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  // 🔹 Dropdown animation
  useEffect(() => {
    if (menuOpen) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menuOpen]);

  // 🔹 Scroll fade for title
  const stylHelprOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 60],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })
    : 1;

  // 🔹 Subtle top gradient (for depth)
  const gradientOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 120],
        outputRange: [0.08, 0.12],
        extrapolate: 'clamp',
      })
    : 0.1;

  const isiOS25OrLower =
    Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) <= 25;

  const getTintColor = () =>
    theme.mode === 'light' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.44)';

  const styles = StyleSheet.create({
    safeArea: {
      backgroundColor: 'transparent',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999,
    },
    gradientOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 110,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      opacity: 0.1,
    },
    header: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: moderateScale(tokens.spacing.md),
      paddingVertical: 10,
      backgroundColor: 'transparent',
    },
    title: {
      fontSize: fontScale(tokens.fontSize['2xl']),
      fontWeight: tokens.fontWeight.extraBold,
      color: theme.colors.foreground,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
      zIndex: 100,
    },
    glassButton: {
      width: 35,
      height: 35,
      borderRadius: 21,
      marginLeft: 20,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.foreground,
    },
    dropdown: {
      position: 'absolute',
      top: 48,
      right: 0,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      zIndex: 200,
      borderColor: theme.colors.muted,
      borderWidth: tokens.borderWidth.hairline,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
    },
    dropdownText: {
      marginLeft: 8,
      color: theme.colors.foreground,
      fontSize: 15,
    },
  });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* 🔹 Subtle depth overlay */}
      <Animated.View
        pointerEvents="none"
        style={[styles.gradientOverlay, {opacity: gradientOpacity}]}
      />

      <View style={styles.header}>
        <View
          style={{position: 'relative', height: 28, justifyContent: 'center'}}>
          <Animated.Text
            style={[
              styles.title,
              {position: 'absolute', opacity: stylHelprOpacity},
            ]}>
            StylHelpr
          </Animated.Text>
        </View>

        <View style={styles.iconRow}>
          {[
            {
              name: 'notifications-none',
              action: () => navigate('Notifications'),
            },
            // {
            //   name: 'OnboardingScreen',
            //   action: () => navigate('OnboardingScreen'),
            // },
            {name: 'videocam', action: () => navigate('VideoFeedScreen')},
            {
              name: 'smart-toy',
              action: () => navigate('AiStylistChatScreen'),
              tint: theme.colors.button1,
              innerColor: theme.colors.buttonText1,
            },
            {name: 'event-note', action: () => navigate('Planner')},
            {
              name: 'menu',
              action: () => setMenuOpen(prev => !prev),
            },
          ].map((icon, idx) => (
            <AppleTouchFeedback
              key={idx}
              hapticStyle="impactLight"
              onPress={icon.action}>
              {isLiquidGlassSupported && !isiOS25OrLower ? (
                <LiquidGlassView
                  style={styles.glassButton}
                  effect="clear"
                  tintColor={getTintColor()}
                  colorScheme={theme.mode === 'light' ? 'light' : 'dark'}>
                  <MaterialIcons
                    name={icon.name}
                    size={22}
                    color={icon.innerColor || theme.colors.buttonText1}
                  />
                </LiquidGlassView>
              ) : (
                // 🔹 Fallback for iOS 25 and lower or unsupported devices
                <View
                  style={[
                    styles.glassButton,
                    {
                      backgroundColor: 'rgba(0, 0, 0, 0.48)',
                      borderColor: theme.colors.muted,
                      shadowColor: '#000',
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      shadowOffset: {width: 0, height: 2},
                    },
                  ]}>
                  <MaterialIcons
                    name={icon.name}
                    size={22}
                    color={icon.innerColor || theme.colors.buttonText1}
                  />
                </View>
              )}
            </AppleTouchFeedback>
          ))}

          {menuOpen && (
            <Animated.View
              style={[
                styles.dropdown,
                {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
              ]}>
              <AppleTouchFeedback
                hapticStyle="impactLight"
                onPress={() => {
                  setMenuOpen(false);
                  navigate('Profile');
                }}
                style={styles.dropdownItem}>
                <MaterialIcons
                  name="person"
                  size={19}
                  color={theme.colors.primary}
                />
                <Text style={styles.dropdownText}>Profile</Text>
              </AppleTouchFeedback>

              <AppleTouchFeedback
                hapticStyle="notificationWarning"
                onPress={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                style={styles.dropdownItem}>
                <MaterialIcons
                  name="logout"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={styles.dropdownText}>Log Out</Text>
              </AppleTouchFeedback>
            </Animated.View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

////////////////

// import React, {useState, useRef, useEffect} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';
// import {LiquidGlassView, isLiquidGlassSupported} from '@callstack/liquid-glass';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value;
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();
//   const [menuOpen, setMenuOpen] = useState(false);
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const slideAnim = useRef(new Animated.Value(-10)).current;

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   // 🔹 Dropdown animation
//   useEffect(() => {
//     if (menuOpen) {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 1,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: 0,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     } else {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 0,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: -10,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   }, [menuOpen]);

//   // 🔹 Scroll fade for title
//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   // 🔹 Subtle top gradient (for depth)
//   const gradientOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 120],
//         outputRange: [0.08, 0.12],
//         extrapolate: 'clamp',
//       })
//     : 0.1;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: 'transparent',
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       zIndex: 999,
//     },
//     gradientOverlay: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       height: 110,
//       backgroundColor: 'rgba(0, 0, 0, 0)',
//       opacity: 0.1,
//     },
//     header: {
//       width: '100%',
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingVertical: 10,
//       backgroundColor: 'transparent',
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       position: 'relative',
//       zIndex: 100,
//     },
//     glassButton: {
//       width: 35,
//       height: 35,
//       borderRadius: 21,
//       marginLeft: 20,
//       alignItems: 'center',
//       justifyContent: 'center',
//       overflow: 'hidden',
//       borderWidth: tokens.borderWidth.hairline,
//       borderColor: theme.colors.foreground,
//     },
//     dropdown: {
//       position: 'absolute',
//       top: 48,
//       right: 0,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       shadowColor: '#000',
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       elevation: 6,
//       paddingVertical: 6,
//       paddingHorizontal: 10,
//       zIndex: 200,
//       borderColor: theme.colors.muted,
//       borderWidth: tokens.borderWidth.hairline,
//     },
//     dropdownItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 14,
//     },
//     dropdownText: {
//       marginLeft: 8,
//       color: theme.colors.foreground,
//       fontSize: 15,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       {/* 🔹 Subtle depth overlay */}
//       <Animated.View
//         pointerEvents="none"
//         style={[styles.gradientOverlay, {opacity: gradientOpacity}]}
//       />

//       <View style={styles.header}>
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: stylHelprOpacity},
//             ]}>
//             StylHelpr
//           </Animated.Text>
//         </View>

//         <View style={styles.iconRow}>
//           {[
//             {
//               name: 'notifications-none',
//               action: () => navigate('Notifications'),
//             },
//             {name: 'videocam', action: () => navigate('VideoFeedScreen')},
//             {
//               name: 'smart-toy',
//               action: () => navigate('AiStylistChatScreen'),
//               tint: theme.colors.button1,
//               innerColor: theme.colors.buttonText1,
//             },
//             {name: 'event-note', action: () => navigate('Planner')},
//             {
//               name: 'menu',
//               action: () => setMenuOpen(prev => !prev),
//             },
//           ].map((icon, idx) => (
//             <AppleTouchFeedback
//               key={idx}
//               hapticStyle="impactLight"
//               onPress={icon.action}>
//               <LiquidGlassView
//                 style={styles.glassButton}
//                 // interactive
//                 effect="clear"
//                 tintColor="rgba(0, 0, 0, 0.44)"
//                 colorScheme="system">
//                 <MaterialIcons
//                   name={icon.name}
//                   size={22}
//                   color={icon.innerColor || theme.colors.buttonText1}
//                 />
//               </LiquidGlassView>
//             </AppleTouchFeedback>
//           ))}

//           {menuOpen && (
//             <Animated.View
//               style={[
//                 styles.dropdown,
//                 {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
//               ]}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   navigate('Profile');
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="person"
//                   size={19}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Profile</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   handleLogout();
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="logout"
//                   size={18}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Log Out</Text>
//               </AppleTouchFeedback>
//             </Animated.View>
//           )}
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

////////////////////

// import React, {useState, useRef, useEffect} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value;
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();
//   const [menuOpen, setMenuOpen] = useState(false);
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const slideAnim = useRef(new Animated.Value(-10)).current;

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   // 🔹 Animate dropdown open/close
//   useEffect(() => {
//     if (menuOpen) {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 1,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: 0,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     } else {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 0,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: -10,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   }, [menuOpen, fadeAnim, slideAnim]);

//   // 🔹 Scroll fade for title
//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   // 🔹 Subtle top gradient fade (Hulu/Apple style)
//   const gradientOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 120],
//         outputRange: [0.08, 0.12],
//         extrapolate: 'clamp',
//       })
//     : 0.1;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: 'transparent',
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       zIndex: 999,
//     },
//     gradientOverlay: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       height: 110,
//       backgroundColor: 'rgba(0, 0, 0, 0)',
//       opacity: 0.1,
//     },
//     header: {
//       width: '100%',
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       paddingVertical: 10,
//       backgroundColor: 'transparent',
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: moderateScale(tokens.spacing.nano),
//       marginLeft: moderateScale(tokens.spacing.md2),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.md,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: moderateScale(tokens.spacing.nano),
//       marginRight: moderateScale(tokens.spacing.xsm),
//       marginLeft: moderateScale(tokens.spacing.sm),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.md,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       position: 'relative',
//       zIndex: 100,
//     },
//     iconButton: {
//       marginHorizontal: moderateScale(tokens.spacing.xs),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.md,
//       padding: moderateScale(tokens.spacing.nano),
//       borderRadius: 24,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     dropdown: {
//       position: 'absolute',
//       top: 48,
//       right: 0,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       shadowColor: '#000',
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       elevation: 6,
//       paddingVertical: 6,
//       paddingHorizontal: 10,
//       zIndex: 200,
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//     },
//     dropdownItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 10,
//     },
//     dropdownText: {
//       marginLeft: 8,
//       color: theme.colors.foreground,
//       fontSize: 15,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       {/* 🔹 Subtle top fade overlay (like Hulu) */}
//       <Animated.View
//         pointerEvents="none"
//         style={[
//           styles.gradientOverlay,
//           {
//             opacity: gradientOpacity,
//           },
//         ]}
//       />

//       {/* 🔹 Header content */}
//       <View style={styles.header}>
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: stylHelprOpacity},
//             ]}>
//             StylHelpr
//           </Animated.Text>
//         </View>

//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={22}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('VideoFeedScreen')}>
//             <MaterialIcons
//               name="videocam"
//               size={22}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={21}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: -4}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={21} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => setMenuOpen(prev => !prev)}>
//             <MaterialIcons name="menu" size={22} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           {menuOpen && (
//             <Animated.View
//               style={[
//                 styles.dropdown,
//                 {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
//               ]}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   navigate('Profile');
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="person"
//                   size={19}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Profile</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   handleLogout();
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="logout"
//                   size={18}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Log Out</Text>
//               </AppleTouchFeedback>
//             </Animated.View>
//           )}
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

////////////////////

// import React, {useState, useRef, useEffect} from 'react';
// import {View, Text, StyleSheet, Animated, Platform} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {BlurView} from '@react-native-community/blur';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value;
//   enableBlur?: boolean; // optional toggle for frosted glass look
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
//   enableBlur = true,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();
//   const [menuOpen, setMenuOpen] = useState(false);
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const slideAnim = useRef(new Animated.Value(-10)).current;

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   // 🔹 Animate dropdown open/close
//   useEffect(() => {
//     if (menuOpen) {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 1,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: 0,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     } else {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 0,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: -10,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   }, [menuOpen, fadeAnim, slideAnim]);

//   // 🔹 Scroll animations for Apple-style fade
//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   // Optional blur fade intensity
//   const blurOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 100],
//         outputRange: [0.3, 1],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: 'transparent',
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       zIndex: 999,
//     },
//     header: {
//       width: '100%',
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       paddingVertical: 10,
//       backgroundColor: 'transparent',
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: moderateScale(tokens.spacing.nano),
//       marginLeft: moderateScale(tokens.spacing.md2),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: moderateScale(tokens.spacing.nano),
//       marginRight: moderateScale(tokens.spacing.xsm),
//       marginLeft: moderateScale(tokens.spacing.sm),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       position: 'relative',
//       zIndex: 100,
//     },
//     iconButton: {
//       marginHorizontal: moderateScale(tokens.spacing.xs),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       padding: moderateScale(tokens.spacing.nano),
//       borderRadius: 24,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     dropdown: {
//       position: 'absolute',
//       top: 48,
//       right: 0,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       shadowColor: '#000',
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       elevation: 6,
//       paddingVertical: 6,
//       paddingHorizontal: 10,
//       zIndex: 200,
//     },
//     dropdownItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 10,
//     },
//     dropdownText: {
//       marginLeft: 8,
//       color: theme.colors.foreground,
//       fontSize: 15,
//     },
//     blurWrapper: {
//       ...StyleSheet.absoluteFillObject,
//       overflow: 'hidden',
//       borderBottomWidth: 0.3,
//       borderColor: 'rgba(255,255,255,0.15)',
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       {/* 🔹 Frosted background (optional) */}
//       {enableBlur && (
//         <Animated.View
//           style={[styles.blurWrapper, {opacity: blurOpacity}]}
//           pointerEvents="none">
//           <BlurView
//             style={StyleSheet.absoluteFill}
//             blurType={Platform.OS === 'ios' ? 'light' : 'dark'}
//             blurAmount={25}
//             reducedTransparencyFallbackColor="rgba(255,255,255,0.05)"
//           />
//         </Animated.View>
//       )}

//       <View style={styles.header}>
//         {/* 🔹 Left Title */}
//         <View
//           style={{
//             position: 'relative',
//             height: 28,
//             justifyContent: 'center',
//           }}>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: stylHelprOpacity},
//             ]}>
//             StylHelpr
//           </Animated.Text>
//         </View>

//         {/* 🔹 Right Side Icons + Hamburger Menu */}
//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={22}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('VideoFeedScreen')}>
//             <MaterialIcons
//               name="videocam"
//               size={22}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={21}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: -4}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={21} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           {/* 🍔 Hamburger Menu */}
//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => setMenuOpen(prev => !prev)}>
//             <MaterialIcons name="menu" size={22} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           {/* 🔽 Animated Dropdown */}
//           {menuOpen && (
//             <Animated.View
//               style={[
//                 styles.dropdown,
//                 {
//                   opacity: fadeAnim,
//                   transform: [{translateY: slideAnim}],
//                 },
//               ]}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   navigate('Profile');
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="person"
//                   size={19}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Profile</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   handleLogout();
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="logout"
//                   size={18}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Log Out</Text>
//               </AppleTouchFeedback>
//             </Animated.View>
//           )}
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

//////////////////

// import React, {useState, useRef, useEffect} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value;
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();
//   const [menuOpen, setMenuOpen] = useState(false);
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const slideAnim = useRef(new Animated.Value(-10)).current;

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   // 🔹 Animate dropdown open/close
//   useEffect(() => {
//     if (menuOpen) {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 1,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: 0,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     } else {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 0,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: -10,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   }, [menuOpen, fadeAnim, slideAnim]);

//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   const searchOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [0, 1],
//         extrapolate: 'clamp',
//       })
//     : 0;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//       zIndex: 50,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       marginBottom: 14,
//       paddingVertical: 4,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       zIndex: 50,
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: moderateScale(tokens.spacing.nano),
//       marginLeft: moderateScale(tokens.spacing.md2),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: moderateScale(tokens.spacing.nano),
//       marginRight: moderateScale(tokens.spacing.xsm),
//       marginLeft: moderateScale(tokens.spacing.sm),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       position: 'relative',
//       zIndex: 100,
//     },
//     iconButton: {
//       marginHorizontal: moderateScale(tokens.spacing.xs),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       padding: moderateScale(tokens.spacing.nano),
//       borderRadius: 24,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     dropdown: {
//       position: 'absolute',
//       top: 48,
//       right: 0,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       shadowColor: '#000',
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       elevation: 6,
//       paddingVertical: 6,
//       paddingHorizontal: 10,
//       zIndex: 200,
//     },
//     dropdownItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 10,
//     },
//     dropdownText: {
//       marginLeft: 8,
//       color: theme.colors.foreground,
//       fontSize: 15,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               // {position: 'absolute', opacity: stylHelprOpacity},
//               {
//                 position: 'absolute',
//                 opacity: stylHelprOpacity,
//                 fontSize: fontScale(tokens.fontSize['2xl']),
//               },
//             ]}>
//             StylHelpr
//           </Animated.Text>
//         </View>

//         {/* 🔹 Right Side Icons + Hamburger Menu */}
//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={22}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('VideoFeedScreen')}>
//             <MaterialIcons
//               name="videocam"
//               size={22}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={21}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: -4}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={21} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           {/* 🍔 Hamburger Menu */}
//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => setMenuOpen(prev => !prev)}>
//             <MaterialIcons name="menu" size={22} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           {/* 🔽 Animated Dropdown */}
//           {menuOpen && (
//             <Animated.View
//               style={[
//                 styles.dropdown,
//                 {
//                   opacity: fadeAnim,
//                   transform: [{translateY: slideAnim}],
//                 },
//               ]}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   navigate('Profile');
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="person"
//                   size={19}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Profile</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   handleLogout();
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="logout"
//                   size={18}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Log Out</Text>
//               </AppleTouchFeedback>
//             </Animated.View>
//           )}
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

//////////////////

// import React, {useState, useRef, useEffect} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value;
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();
//   const [menuOpen, setMenuOpen] = useState(false);
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const slideAnim = useRef(new Animated.Value(-10)).current;

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   // 🔹 Animate dropdown open/close
//   useEffect(() => {
//     if (menuOpen) {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 1,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: 0,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     } else {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 0,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: -10,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   }, [menuOpen, fadeAnim, slideAnim]);

//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   const searchOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [0, 1],
//         extrapolate: 'clamp',
//       })
//     : 0;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//       zIndex: 50,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: moderateScale(tokens.spacing.md1),
//       marginBottom: 14,
//       paddingVertical: 4,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       zIndex: 50,
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: moderateScale(tokens.spacing.nano),
//       marginLeft: moderateScale(tokens.spacing.md2),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: moderateScale(tokens.spacing.nano),
//       marginRight: moderateScale(tokens.spacing.xsm),
//       marginLeft: moderateScale(tokens.spacing.sm),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       position: 'relative',
//       zIndex: 100,
//     },
//     iconButton: {
//       marginHorizontal: moderateScale(tokens.spacing.xs),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       padding: moderateScale(tokens.spacing.nano),
//       borderRadius: 24,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     dropdown: {
//       position: 'absolute',
//       top: 48,
//       right: 0,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       shadowColor: '#000',
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       elevation: 6,
//       paddingVertical: 6,
//       paddingHorizontal: 10,
//       zIndex: 200,
//     },
//     dropdownItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 10,
//     },
//     dropdownText: {
//       marginLeft: 8,
//       color: theme.colors.foreground,
//       fontSize: 15,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               // {position: 'absolute', opacity: stylHelprOpacity},
//               {
//                 position: 'absolute',
//                 opacity: stylHelprOpacity,
//                 fontSize: fontScale(tokens.fontSize['2xl']),
//               },
//             ]}>
//             StylHelpr
//           </Animated.Text>
//         </View>

//         {/* 🔹 Right Side Icons + Hamburger Menu */}
//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={22}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={21}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: -4}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={21} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           {/* 🍔 Hamburger Menu */}
//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => setMenuOpen(prev => !prev)}>
//             <MaterialIcons name="menu" size={22} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           {/* 🔽 Animated Dropdown */}
//           {menuOpen && (
//             <Animated.View
//               style={[
//                 styles.dropdown,
//                 {
//                   opacity: fadeAnim,
//                   transform: [{translateY: slideAnim}],
//                 },
//               ]}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   navigate('Profile');
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="person"
//                   size={19}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Profile</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   handleLogout();
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="logout"
//                   size={18}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Log Out</Text>
//               </AppleTouchFeedback>
//             </Animated.View>
//           )}
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

/////////////////////

// import React, {useState, useRef, useEffect} from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value;
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();
//   const [menuOpen, setMenuOpen] = useState(false);
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const slideAnim = useRef(new Animated.Value(-10)).current;

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   // 🔹 Animate dropdown open/close
//   useEffect(() => {
//     if (menuOpen) {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 1,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: 0,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     } else {
//       Animated.parallel([
//         Animated.timing(fadeAnim, {
//           toValue: 0,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//         Animated.timing(slideAnim, {
//           toValue: -10,
//           duration: 120,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   }, [menuOpen, fadeAnim, slideAnim]);

//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   const searchOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [0, 1],
//         extrapolate: 'clamp',
//       })
//     : 0;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//       zIndex: 50,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       marginBottom: 8,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//       zIndex: 50,
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: moderateScale(tokens.spacing.nano),
//       marginLeft: moderateScale(tokens.spacing.md2),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: moderateScale(tokens.spacing.nano),
//       marginRight: moderateScale(tokens.spacing.xsm),
//       marginLeft: moderateScale(tokens.spacing.sm),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       position: 'relative',
//       zIndex: 100,
//     },
//     iconButton: {
//       marginHorizontal: moderateScale(tokens.spacing.xs),
//       borderColor: theme.colors.foreground,
//       borderWidth: tokens.borderWidth.hairline,
//       padding: moderateScale(tokens.spacing.nano),
//       borderRadius: 24,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     dropdown: {
//       position: 'absolute',
//       top: 48,
//       right: 0,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       shadowColor: '#000',
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       elevation: 6,
//       paddingVertical: 6,
//       paddingHorizontal: 10,
//       zIndex: 200,
//     },
//     dropdownItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 10,
//     },
//     dropdownText: {
//       marginLeft: 8,
//       color: theme.colors.foreground,
//       fontSize: 15,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               // {position: 'absolute', opacity: stylHelprOpacity},
//               {
//                 position: 'absolute',
//                 opacity: stylHelprOpacity,
//                 fontSize: fontScale(tokens.fontSize['2xl']),
//               },
//             ]}>
//             StylHelpr
//           </Animated.Text>
//         </View>

//         {/* 🔹 Right Side Icons + Hamburger Menu */}
//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={22}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={21}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: -4}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={21} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           {/* 🍔 Hamburger Menu */}
//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactMedium"
//             onPress={() => setMenuOpen(prev => !prev)}>
//             <MaterialIcons name="menu" size={22} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           {/* 🔽 Animated Dropdown */}
//           {menuOpen && (
//             <Animated.View
//               style={[
//                 styles.dropdown,
//                 {
//                   opacity: fadeAnim,
//                   transform: [{translateY: slideAnim}],
//                 },
//               ]}>
//               <AppleTouchFeedback
//                 hapticStyle="impactLight"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   navigate('Profile');
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="person"
//                   size={19}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Profile</Text>
//               </AppleTouchFeedback>

//               <AppleTouchFeedback
//                 hapticStyle="notificationWarning"
//                 onPress={() => {
//                   setMenuOpen(false);
//                   handleLogout();
//                 }}
//                 style={styles.dropdownItem}>
//                 <MaterialIcons
//                   name="logout"
//                   size={18}
//                   color={theme.colors.primary}
//                 />
//                 <Text style={styles.dropdownText}>Log Out</Text>
//               </AppleTouchFeedback>
//             </Animated.View>
//           )}
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

////////////////////////

// import React from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value;
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   const searchOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [0, 1],
//         extrapolate: 'clamp',
//       })
//     : 0;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       // ✅ add a small fixed buffer below the safe area for notch devices
//       // paddingTop: moderateScale(tokens.spacing.quark),
//       // paddingBottom: moderateScale(tokens.spacing.quark),
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: moderateScale(tokens.spacing.xxs),
//       marginLeft: moderateScale(tokens.spacing.sm),
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: moderateScale(tokens.spacing.nano),
//       marginRight: moderateScale(tokens.spacing.xsm),
//       marginLeft: moderateScale(tokens.spacing.xxs),
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       marginHorizontal: moderateScale(tokens.spacing.quark), // even space between all icons
//       padding: moderateScale(tokens.spacing.nano), // keeps hit area consistent
//       borderRadius: 24,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: stylHelprOpacity},
//             ]}>
//             StylHelpr
//           </Animated.Text>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: searchOpacity},
//             ]}>
//             Search Wardrobe Items
//           </Animated.Text>
//         </View>

//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={28}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={20}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: -4}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={30} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={16}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

//////////////////////

// import React from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value;
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   const searchOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [0, 1],
//         extrapolate: 'clamp',
//       })
//     : 0;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       // ✅ add a small fixed buffer below the safe area for notch devices
//       // paddingTop: moderateScale(tokens.spacing.quark),
//       // paddingBottom: moderateScale(tokens.spacing.quark),
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: moderateScale(tokens.spacing.xxs),
//       marginLeft: moderateScale(tokens.spacing.sm),
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: moderateScale(tokens.spacing.nano),
//       marginRight: moderateScale(tokens.spacing.xsm),
//       marginLeft: moderateScale(tokens.spacing.xxs),
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       marginHorizontal: moderateScale(tokens.spacing.quark), // even space between all icons
//       padding: moderateScale(tokens.spacing.nano), // keeps hit area consistent
//       borderRadius: 24,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: stylHelprOpacity},
//             ]}>
//             StylHelpr
//           </Animated.Text>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: searchOpacity},
//             ]}>
//             Search Wardrobe Items
//           </Animated.Text>
//         </View>

//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={28}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={20}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: -4}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={30} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={16}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

/////////////////

// import React from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value;
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   const searchOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [0, 1],
//         extrapolate: 'clamp',
//       })
//     : 0;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       // ✅ add a small fixed buffer below the safe area for notch devices
//       // paddingTop: moderateScale(tokens.spacing.quark),
//       // paddingBottom: moderateScale(tokens.spacing.quark),
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: moderateScale(tokens.spacing.xxs),
//       marginLeft: moderateScale(tokens.spacing.xsm),
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: moderateScale(tokens.spacing.nano),
//       marginRight: moderateScale(tokens.spacing.xxs),
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       // marginLeft: moderateScale(tokens.spacing.sm), // even space between all icons
//       padding: moderateScale(tokens.spacing.nano), // keeps hit area consistent
//       borderRadius: 24,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: stylHelprOpacity},
//             ]}>
//             StylHelpr
//           </Animated.Text>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: searchOpacity},
//             ]}>
//             Search Wardrobe Items
//           </Animated.Text>
//         </View>

//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={27}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Search')}>
//             <Icon name="search" size={33} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={19}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: -4}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={29} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

//////////////////////

// import React from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value;
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   const searchOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [0, 1],
//         extrapolate: 'clamp',
//       })
//     : 0;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       // ✅ add a small fixed buffer below the safe area for notch devices
//       paddingTop: moderateScale(tokens.spacing.sm),
//       paddingBottom: moderateScale(tokens.spacing.quark),
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']),
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: moderateScale(tokens.spacing.xxs),
//       marginLeft: moderateScale(tokens.spacing.xsm),
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: moderateScale(tokens.spacing.nano),
//       marginRight: moderateScale(tokens.spacing.xxs),
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       // marginLeft: moderateScale(tokens.spacing.sm), // even space between all icons
//       padding: moderateScale(tokens.spacing.nano), // keeps hit area consistent
//       borderRadius: 24,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: stylHelprOpacity},
//             ]}>
//             StylHelpr
//           </Animated.Text>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: searchOpacity},
//             ]}>
//             Search Wardrobe Items
//           </Animated.Text>
//         </View>

//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={26}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Search')}>
//             <Icon name="search" size={31} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={17}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={27} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={13}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={13}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

/////////////////////

// import React from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {fontScale, moderateScale} from '../../utils/scale';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value; // 👈 accept scroll value
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   // 🍎 Animated crossfade
//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   const searchOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [0, 1],
//         extrapolate: 'clamp',
//       })
//     : 0;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingTop: moderateScale(tokens.spacing.quark),
//       paddingBottom: moderateScale(tokens.spacing.quark),
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     title: {
//       fontSize: fontScale(tokens.fontSize['2xl']), // ✅ Responsive font size
//       fontWeight: tokens.fontWeight.extraBold,
//       color: theme.colors.foreground,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: moderateScale(tokens.spacing.xxs),
//       marginLeft: moderateScale(tokens.spacing.xs),
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: moderateScale(tokens.spacing.xxs),
//       marginLeft: moderateScale(tokens.spacing.xs),
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconButton: {
//       marginLeft: moderateScale(tokens.spacing.md1),
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         {/* 🍎 Swap between "StylHelpr" and "Search Wardrobe Items" */}
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: stylHelprOpacity},
//             ]}>
//             StylHelpr
//           </Animated.Text>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: searchOpacity},
//             ]}>
//             Search Wardrobe Items
//           </Animated.Text>
//         </View>

//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={26}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Search')}>
//             <Icon name="search" size={32} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={18}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: 6}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={26} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={13}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={13}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

//////////////////////

// import React from 'react';
// import {View, Text, StyleSheet, Animated} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
//   scrollY?: Animated.Value; // 👈 accept scroll value
// };

// export default function GlobalHeader({
//   navigate,
//   showSettings = false,
//   scrollY,
// }: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   // 🍎 Animated crossfade
//   const stylHelprOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [1, 0],
//         extrapolate: 'clamp',
//       })
//     : 1;

//   const searchOpacity = scrollY
//     ? scrollY.interpolate({
//         inputRange: [0, 60],
//         outputRange: [0, 1],
//         extrapolate: 'clamp',
//       })
//     : 0;

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 0,
//       paddingBottom: 0,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//       backgroundColor: theme.colors.background,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: -5,
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginTop: -4,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: 6,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconButton: {
//       marginLeft: 18,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         {/* 🍎 Swap between "StylHelpr" and "Search Wardrobe Items" */}
//         <View
//           style={{position: 'relative', height: 28, justifyContent: 'center'}}>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: stylHelprOpacity},
//             ]}>
//             StylHelpr
//           </Animated.Text>
//           <Animated.Text
//             style={[
//               styles.title,
//               {position: 'absolute', opacity: searchOpacity},
//             ]}>
//             Search Wardrobe Items
//           </Animated.Text>
//         </View>

//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={26}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Search')}>
//             <Icon name="search" size={32} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={18}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: 6}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={26} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={13}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={13}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

/////////////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();
//   const {user, clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 0, // ✅ keep tight to safe area
//       paddingBottom: 0, // ✅ shrink height even further
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//       backgroundColor: theme.colors.background,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: -5, // ✅ pull icons up just ~1px more
//       backgroundColor: theme.colors.background,
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginTop: -4, // ✅ nudge text up ~2px to align with icon row
//     },

//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: 6,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },

//     iconButton: {
//       marginLeft: 18,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <Text style={styles.title}>StylHelpr</Text>

//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={26}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Search')}>
//             <Icon name="search" size={32} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={18}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           {/* Planner */}
//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: 6}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={26} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={13}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={13}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

//////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();
//   const {user, clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 0, // ✅ keep tight to safe area
//       paddingBottom: 0, // ✅ shrink height even further
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//       backgroundColor: theme.colors.background,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: -5, // ✅ pull icons up just ~1px more
//       backgroundColor: 'red',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginTop: -4, // ✅ nudge text up ~2px to align with icon row
//     },

//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: 6,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },

//     iconButton: {
//       marginLeft: 18,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <Text style={styles.title}>StylHelpr</Text>

//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={28}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Search')}>
//             <Icon name="search" size={34} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={20}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           {/* Planner */}
//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: 6}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={28} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

///////////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();
//   const {user, clearSession} = useAuth0();
//   const insets = useSafeAreaInsets(); // 👈 read safe area for Dynamic Island / notch

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 0, // ✅ Bring it right up against the safe area
//       paddingBottom: 14,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: 6,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       marginLeft: 18,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <Text style={styles.title}>StylHelpr</Text>

//         <View style={[styles.iconRow, {backgroundColor: 'red'}]}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={28}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Search')}>
//             <Icon name="search" size={34} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={20}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           {/* Planner */}
//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: 6}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={28} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

/////////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const styles = StyleSheet.create({
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 52,
//       paddingBottom: 14,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: 6,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       marginLeft: 18,
//     },
//   });

//   return (
//     <View style={styles.header}>
//       <Text style={styles.title}>StylHelpr</Text>

//       <View style={[styles.iconRow, {backgroundColor: 'red'}]}>
//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Notifications')}>
//           <Icon
//             name="notifications-none"
//             size={28}
//             color={theme.colors.primary}
//           />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Search')}>
//           <Icon name="search" size={34} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle2}
//           hapticStyle="impactLight"
//           onPress={() => navigate('AiStylistChatScreen')}>
//           <MaterialIcons
//             name="smart-toy"
//             size={20}
//             color={theme.colors.buttonText1}
//           />
//         </AppleTouchFeedback>

//         {/* Planner */}
//         <AppleTouchFeedback
//           style={[styles.iconButton, {marginRight: 6}]}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Planner')}>
//           <Icon name="event-note" size={28} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Profile')}>
//           <MaterialIcons name="person" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="notificationWarning"
//           onPress={handleLogout}>
//           <MaterialIcons name="logout" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>
//       </View>
//     </View>
//   );
// }

///////////////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const styles = StyleSheet.create({
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 52,
//       paddingBottom: 14,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       marginLeft: 18,
//     },
//   });

//   return (
//     <View style={styles.header}>
//       <Text style={styles.title}>StylHelpr</Text>

//       <View style={styles.iconRow}>
//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Notifications')}>
//           <Icon
//             name="notifications-none"
//             size={28}
//             color={theme.colors.primary}
//           />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Search')}>
//           <Icon name="search" size={34} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('AiStylistChatScreen')}>
//           <MaterialIcons
//             name="smart-toy"
//             size={32}
//             // color="rgba(102, 0, 197, 1)"
//             color={theme.colors.button1}
//           />
//         </AppleTouchFeedback>

//         {/* ⬇️ NEW: Planner */}
//         <AppleTouchFeedback
//           style={[styles.iconButton, {marginRight: 6}]}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Planner')}>
//           <Icon name="event-note" size={28} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Profile')}>
//           <MaterialIcons name="person" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="impactMedium"
//           onPress={handleLogout}>
//           <MaterialIcons name="logout" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>
//       </View>
//     </View>
//   );
// }

//////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const styles = StyleSheet.create({
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 52,
//       paddingBottom: 14,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     iconCircle: {
//       backgroundColor: 'rgb(47, 47, 47)',
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: '#fff',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       marginLeft: 18,
//     },
//   });

//   return (
//     <View style={styles.header}>
//       <Text style={styles.title}>StylHelpr</Text>

//       <View style={styles.iconRow}>
//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Notifications')}>
//           <Icon
//             name="notifications-none"
//             size={28}
//             color={theme.colors.primary}
//           />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Search')}>
//           <Icon name="search" size={34} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         {/* ⬇️ NEW: Planner */}
//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Planner')}>
//           <Icon name="event-note" size={28} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Profile')}>
//           <MaterialIcons name="person" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="impactMedium"
//           onPress={handleLogout}>
//           <MaterialIcons name="logout" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>
//       </View>
//     </View>
//   );
// }

/////////////////

// import React from 'react';
// import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();

//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       console.log('Logged out successfully');
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const styles = StyleSheet.create({
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 52,
//       paddingBottom: 14,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     iconCircle: {
//       backgroundColor: 'rgb(47, 47, 47)',
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: '#fff',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       marginLeft: 18,
//     },
//     avatar: {
//       width: 23,
//       height: 23,
//       borderRadius: 14,
//       borderWidth: 1,
//       borderColor: '#666',
//       marginLeft: 18,
//     },
//   });

//   return (
//     <View style={styles.header}>
//       <Text style={styles.title}>StylHelpr</Text>

//       <View style={styles.iconRow}>
//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Notifications')}>
//           <Icon
//             name="notifications-none"
//             size={28}
//             color={theme.colors.primary}
//           />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Search')}>
//           <Icon name="search" size={34} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Profile')}>
//           <MaterialIcons name="person" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="impactMedium"
//           onPress={handleLogout}>
//           <MaterialIcons name="logout" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>
//       </View>
//     </View>
//   );
// }
