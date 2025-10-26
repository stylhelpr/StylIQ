import React, {useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import type {AppNotification} from '../../storage/notifications';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {fontScale, moderateScale} from '../../utils/scale';
import {tokens} from '../../styles/tokens/tokens';

const SWIPE_THRESHOLD = 70;
const DELETE_BUTTON_WIDTH = 88;
const EDGE_GUARD = 24; // ⬅️ keep left edge free for iOS back swipe

const iconFor = (c?: AppNotification['category']) => {
  switch (c) {
    case 'news':
      return '📰';
    case 'outfit':
      return '👗';
    case 'weather':
      return '☔';
    case 'care':
      return '🧼';
    default:
      return '🔔';
  }
};

// 🍏 Apple-accurate date + time formatter
const formatAppleTime = (ts: string) => {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const isToday = now.toDateString() === date.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();

  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  if (isToday) {
    return time; // ✅ only time for today
  } else if (isYesterday) {
    return `Yesterday, ${time}`;
  } else if (diffDays < 7) {
    const weekday = new Intl.DateTimeFormat('en-US', {weekday: 'long'}).format(
      date,
    );
    return `${weekday}, ${time}`;
  } else {
    const fullDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
    return `${fullDate}, ${time}`;
  }
};

type Props = {
  n: AppNotification;
  onPress: () => void;
  onDelete: (id: string) => void;
};

export default function NotificationCard({n, onPress, onDelete}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const isUnread = !n.read;

  const panX = useRef(new Animated.Value(0)).current;
  const deleteVisible = useRef(false);

  const triggerHaptic = () => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      // ❗️Do not capture gestures that START within the iOS back-swipe edge
      onMoveShouldSetPanResponder: (e, g) =>
        e.nativeEvent.pageX > EDGE_GUARD && Math.abs(g.dx) > 4,
      onMoveShouldSetPanResponderCapture: (e, g) =>
        e.nativeEvent.pageX > EDGE_GUARD && Math.abs(g.dx) > 4,

      onPanResponderMove: (_e, g) => {
        if (g.dx < 0) {
          panX.setValue(Math.max(g.dx, -DELETE_BUTTON_WIDTH));
        }
      },
      onPanResponderRelease: (_e, g) => {
        const velocityTrigger = g.vx < -0.15;
        const distanceTrigger = g.dx < -50;
        if (velocityTrigger || distanceTrigger) {
          deleteVisible.current = true;
          Animated.timing(panX, {
            toValue: -DELETE_BUTTON_WIDTH,
            duration: 180,
            useNativeDriver: true,
          }).start();
        } else {
          deleteVisible.current = false;
          Animated.timing(panX, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const handleDeletePress = () => {
    triggerHaptic();
    onDelete(n.id);
  };

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 20,
      marginBottom: 6,
    },
    deleteButton: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: DELETE_BUTTON_WIDTH,
      backgroundColor: '#FF3B30',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: theme.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
      backgroundColor: theme.colors.surface,
    },
    cardUnread: {
      backgroundColor: theme.isDark
        ? theme.colors.surface
        : theme.colors.background,
      borderColor: theme.colors.button3,
      borderWidth: theme.borderWidth['2xl'],
    },
    left: {
      width: 32,
      alignItems: 'center',
      marginRight: 10,
      paddingTop: 2,
      position: 'relative',
    },
    unreadDot: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.button1,
    },
    icon: {fontSize: 20},
    center: {flex: 1},
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 16,
      fontWeight: isUnread ? '700' : '500',
      color: theme.colors.foreground,
      flexShrink: 1,
      paddingRight: 8,
    },
    time: {
      fontSize: 12,
      color: theme.colors.foreground2,
      textAlign: 'right',
    },
    message: {
      fontSize: 14,
      lineHeight: 19,
      color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
      marginTop: 4,
    },
    outfitName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginLeft: 4,
    },
  });

  const outfitName = n?.data?.outfit_name;
  const [prefix, parsedName] = n.message.includes(':')
    ? n.message.split(':')
    : [n.message, ''];

  return (
    <View style={styles.container}>
      <View style={styles.deleteButton}>
        <TouchableOpacity
          onPress={handleDeletePress}
          style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{transform: [{translateX: panX}]}}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.9}
          style={[styles.card, isUnread && styles.cardUnread]}>
          <View style={styles.left}>
            <Text style={styles.icon}>{iconFor(n.category)}</Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          <View style={styles.center}>
            {/* 🍏 Title row + timestamp (aligned like iOS) */}
            <View style={styles.headerRow}>
              {n.title ? (
                <Text numberOfLines={1} style={styles.title}>
                  {n.title}
                </Text>
              ) : (
                <View />
              )}

              <Text style={styles.time}>{formatAppleTime(n.timestamp)}</Text>
            </View>

            <Text numberOfLines={2} style={styles.message}>
              {prefix}
              {outfitName || parsedName ? (
                <>
                  :{' '}
                  <Text style={styles.outfitName}>
                    "{outfitName || parsedName.trim()}"
                  </Text>
                </>
              ) : null}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

//////////////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SWIPE_THRESHOLD = 70;
// const DELETE_BUTTON_WIDTH = 88;

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// // 🍏 Apple-style timestamp formatter
// // 🍏 Apple-accurate date + time formatter
// const formatAppleTime = (ts: string) => {
//   const date = new Date(ts);
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffDays = diffMs / (1000 * 60 * 60 * 24);

//   const isToday = now.toDateString() === date.toDateString();
//   const yesterday = new Date();
//   yesterday.setDate(now.getDate() - 1);
//   const isYesterday = yesterday.toDateString() === date.toDateString();

//   const time = new Intl.DateTimeFormat('en-US', {
//     hour: 'numeric',
//     minute: '2-digit',
//     hour12: true,
//   }).format(date);

//   if (isToday) {
//     return time; // ✅ only time for today
//   } else if (isYesterday) {
//     return `Yesterday, ${time}`;
//   } else if (diffDays < 7) {
//     const weekday = new Intl.DateTimeFormat('en-US', {weekday: 'long'}).format(
//       date,
//     );
//     return `${weekday}, ${time}`;
//   } else {
//     const fullDate = new Intl.DateTimeFormat('en-US', {
//       month: 'short',
//       day: 'numeric',
//     }).format(date);
//     return `${fullDate}, ${time}`;
//   }
// };

// type Props = {
//   n: AppNotification;
//   onPress: () => void;
//   onDelete: (id: string) => void;
// };

// export default function NotificationCard({n, onPress, onDelete}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   const panX = useRef(new Animated.Value(0)).current;
//   const deleteVisible = useRef(false);

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
//       onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4,
//       onPanResponderMove: (_, g) => {
//         if (g.dx < 0) {
//           panX.setValue(Math.max(g.dx, -DELETE_BUTTON_WIDTH));
//         }
//       },
//       onPanResponderRelease: (_, g) => {
//         const velocityTrigger = g.vx < -0.15;
//         const distanceTrigger = g.dx < -50;
//         if (velocityTrigger || distanceTrigger) {
//           deleteVisible.current = true;
//           Animated.timing(panX, {
//             toValue: -DELETE_BUTTON_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           deleteVisible.current = false;
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 160,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleDeletePress = () => {
//     triggerHaptic();
//     onDelete(n.id);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       position: 'relative',
//       overflow: 'hidden',
//       borderRadius: 20,
//       marginBottom: 6,
//     },
//     deleteButton: {
//       position: 'absolute',
//       right: 0,
//       top: 0,
//       bottom: 0,
//       width: DELETE_BUTTON_WIDTH,
//       backgroundColor: '#FF3B30',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     deleteText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       paddingHorizontal: 14,
//       paddingVertical: 12,
//       borderRadius: 20,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       // shadowColor: '#000',
//       // shadowOpacity: 0.08,
//       // shadowRadius: 6,
//       // elevation: 1,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth['2xl'],
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//     },
//     title: {
//       fontSize: 16,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//       flexShrink: 1,
//       paddingRight: 8,
//     },
//     time: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       textAlign: 'right',
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//   });

//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <View style={styles.container}>
//       <View style={styles.deleteButton}>
//         <TouchableOpacity
//           onPress={handleDeletePress}
//           style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//           <Text style={styles.deleteText}>Delete</Text>
//         </TouchableOpacity>
//       </View>

//       <Animated.View
//         {...panResponder.panHandlers}
//         style={{transform: [{translateX: panX}]}}>
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.9}
//           style={[styles.card, isUnread && styles.cardUnread]}>
//           <View style={styles.left}>
//             <Text style={styles.icon}>{iconFor(n.category)}</Text>
//             {isUnread && <View style={styles.unreadDot} />}
//           </View>

//           <View style={styles.center}>
//             {/* 🍏 Title row + timestamp (aligned like iOS) */}
//             <View style={styles.headerRow}>
//               {n.title ? (
//                 <Text numberOfLines={1} style={styles.title}>
//                   {n.title}
//                 </Text>
//               ) : (
//                 <View />
//               )}

//               <Text style={styles.time}>{formatAppleTime(n.timestamp)}</Text>
//             </View>

//             <Text numberOfLines={2} style={styles.message}>
//               {prefix}
//               {outfitName || parsedName ? (
//                 <>
//                   :{' '}
//                   <Text style={styles.outfitName}>
//                     "{outfitName || parsedName.trim()}"
//                   </Text>
//                 </>
//               ) : null}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     </View>
//   );
// }

//////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SWIPE_THRESHOLD = 70;
// const DELETE_BUTTON_WIDTH = 88;

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// // 🍏 Apple-style timestamp formatter
// // 🍏 Apple-accurate date + time formatter
// const formatAppleTime = (ts: string) => {
//   const date = new Date(ts);
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffDays = diffMs / (1000 * 60 * 60 * 24);

//   const isToday = now.toDateString() === date.toDateString();
//   const yesterday = new Date();
//   yesterday.setDate(now.getDate() - 1);
//   const isYesterday = yesterday.toDateString() === date.toDateString();

//   const time = new Intl.DateTimeFormat('en-US', {
//     hour: 'numeric',
//     minute: '2-digit',
//     hour12: true,
//   }).format(date);

//   if (isToday) {
//     return time; // ✅ only time for today
//   } else if (isYesterday) {
//     return `Yesterday, ${time}`;
//   } else if (diffDays < 7) {
//     const weekday = new Intl.DateTimeFormat('en-US', {weekday: 'long'}).format(
//       date,
//     );
//     return `${weekday}, ${time}`;
//   } else {
//     const fullDate = new Intl.DateTimeFormat('en-US', {
//       month: 'short',
//       day: 'numeric',
//     }).format(date);
//     return `${fullDate}, ${time}`;
//   }
// };

// type Props = {
//   n: AppNotification;
//   onPress: () => void;
//   onDelete: (id: string) => void;
// };

// export default function NotificationCard({n, onPress, onDelete}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   const panX = useRef(new Animated.Value(0)).current;
//   const deleteVisible = useRef(false);

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
//       onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4,
//       onPanResponderMove: (_, g) => {
//         if (g.dx < 0) {
//           panX.setValue(Math.max(g.dx, -DELETE_BUTTON_WIDTH));
//         }
//       },
//       onPanResponderRelease: (_, g) => {
//         const velocityTrigger = g.vx < -0.15;
//         const distanceTrigger = g.dx < -50;
//         if (velocityTrigger || distanceTrigger) {
//           deleteVisible.current = true;
//           Animated.timing(panX, {
//             toValue: -DELETE_BUTTON_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           deleteVisible.current = false;
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 160,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleDeletePress = () => {
//     triggerHaptic();
//     onDelete(n.id);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       position: 'relative',
//       overflow: 'hidden',
//       borderRadius: 16,
//       marginBottom: 6,
//     },
//     deleteButton: {
//       position: 'absolute',
//       right: 0,
//       top: 0,
//       bottom: 0,
//       width: DELETE_BUTTON_WIDTH,
//       backgroundColor: '#FF3B30',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     deleteText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       paddingHorizontal: 14,
//       paddingVertical: 12,
//       borderRadius: 16,
//       // borderWidth: theme.borderWidth.md,
//       // borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       // shadowColor: '#000',
//       // shadowOpacity: 0.08,
//       // shadowRadius: 6,
//       // elevation: 1,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth['2xl'],
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//     },
//     title: {
//       fontSize: 16,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//       flexShrink: 1,
//       paddingRight: 8,
//     },
//     time: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       textAlign: 'right',
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//   });

//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <View style={styles.container}>
//       <View style={styles.deleteButton}>
//         <TouchableOpacity
//           onPress={handleDeletePress}
//           style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//           <Text style={styles.deleteText}>Delete</Text>
//         </TouchableOpacity>
//       </View>

//       <Animated.View
//         {...panResponder.panHandlers}
//         style={{transform: [{translateX: panX}]}}>
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.9}
//           style={[styles.card, isUnread && styles.cardUnread]}>
//           <View style={styles.left}>
//             <Text style={styles.icon}>{iconFor(n.category)}</Text>
//             {isUnread && <View style={styles.unreadDot} />}
//           </View>

//           <View style={styles.center}>
//             {/* 🍏 Title row + timestamp (aligned like iOS) */}
//             <View style={styles.headerRow}>
//               {n.title ? (
//                 <Text numberOfLines={1} style={styles.title}>
//                   {n.title}
//                 </Text>
//               ) : (
//                 <View />
//               )}

//               <Text style={styles.time}>{formatAppleTime(n.timestamp)}</Text>
//             </View>

//             <Text numberOfLines={2} style={styles.message}>
//               {prefix}
//               {outfitName || parsedName ? (
//                 <>
//                   :{' '}
//                   <Text style={styles.outfitName}>
//                     "{outfitName || parsedName.trim()}"
//                   </Text>
//                 </>
//               ) : null}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     </View>
//   );
// }

////////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SWIPE_THRESHOLD = 70;
// const DELETE_BUTTON_WIDTH = 88;

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// // 🍏 Apple-style timestamp formatter
// // 🍏 Apple-accurate date + time formatter
// const formatAppleTime = (ts: string) => {
//   const date = new Date(ts);
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffDays = diffMs / (1000 * 60 * 60 * 24);

//   const isToday = now.toDateString() === date.toDateString();
//   const yesterday = new Date();
//   yesterday.setDate(now.getDate() - 1);
//   const isYesterday = yesterday.toDateString() === date.toDateString();

//   const time = new Intl.DateTimeFormat('en-US', {
//     hour: 'numeric',
//     minute: '2-digit',
//     hour12: true,
//   }).format(date);

//   if (isToday) {
//     return time; // ✅ only time for today
//   } else if (isYesterday) {
//     return `Yesterday, ${time}`;
//   } else if (diffDays < 7) {
//     const weekday = new Intl.DateTimeFormat('en-US', {weekday: 'long'}).format(
//       date,
//     );
//     return `${weekday}, ${time}`;
//   } else {
//     const fullDate = new Intl.DateTimeFormat('en-US', {
//       month: 'short',
//       day: 'numeric',
//     }).format(date);
//     return `${fullDate}, ${time}`;
//   }
// };

// type Props = {
//   n: AppNotification;
//   onPress: () => void;
//   onDelete: (id: string) => void;
// };

// export default function NotificationCard({n, onPress, onDelete}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   const panX = useRef(new Animated.Value(0)).current;
//   const deleteVisible = useRef(false);

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
//       onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4,
//       onPanResponderMove: (_, g) => {
//         if (g.dx < 0) {
//           panX.setValue(Math.max(g.dx, -DELETE_BUTTON_WIDTH));
//         }
//       },
//       onPanResponderRelease: (_, g) => {
//         const velocityTrigger = g.vx < -0.15;
//         const distanceTrigger = g.dx < -50;
//         if (velocityTrigger || distanceTrigger) {
//           deleteVisible.current = true;
//           Animated.timing(panX, {
//             toValue: -DELETE_BUTTON_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           deleteVisible.current = false;
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 160,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleDeletePress = () => {
//     triggerHaptic();
//     onDelete(n.id);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       position: 'relative',
//       overflow: 'hidden',
//       borderRadius: 16,
//       marginBottom: 6,
//     },
//     deleteButton: {
//       position: 'absolute',
//       right: 0,
//       top: 0,
//       bottom: 0,
//       width: DELETE_BUTTON_WIDTH,
//       backgroundColor: '#FF3B30',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     deleteText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       paddingHorizontal: 14,
//       paddingVertical: 12,
//       borderRadius: 16,
//       // borderWidth: theme.borderWidth.md,
//       // borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       // shadowColor: '#000',
//       // shadowOpacity: 0.08,
//       // shadowRadius: 6,
//       // elevation: 1,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth['2xl'],
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//     },
//     title: {
//       fontSize: 16,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//       flexShrink: 1,
//       paddingRight: 8,
//     },
//     time: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       textAlign: 'right',
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//   });

//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <View style={styles.container}>
//       <View style={styles.deleteButton}>
//         <TouchableOpacity
//           onPress={handleDeletePress}
//           style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//           <Text style={styles.deleteText}>Delete</Text>
//         </TouchableOpacity>
//       </View>

//       <Animated.View
//         {...panResponder.panHandlers}
//         style={{transform: [{translateX: panX}]}}>
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.9}
//           style={[styles.card, isUnread && styles.cardUnread]}>
//           <View style={styles.left}>
//             <Text style={styles.icon}>{iconFor(n.category)}</Text>
//             {isUnread && <View style={styles.unreadDot} />}
//           </View>

//           <View style={styles.center}>
//             {/* 🍏 Title row + timestamp (aligned like iOS) */}
//             <View style={styles.headerRow}>
//               {n.title ? (
//                 <Text numberOfLines={1} style={styles.title}>
//                   {n.title}
//                 </Text>
//               ) : (
//                 <View />
//               )}

//               <Text style={styles.time}>{formatAppleTime(n.timestamp)}</Text>
//             </View>

//             <Text numberOfLines={2} style={styles.message}>
//               {prefix}
//               {outfitName || parsedName ? (
//                 <>
//                   :{' '}
//                   <Text style={styles.outfitName}>
//                     "{outfitName || parsedName.trim()}"
//                   </Text>
//                 </>
//               ) : null}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     </View>
//   );
// }

////////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SWIPE_THRESHOLD = 70;
// const DELETE_BUTTON_WIDTH = 88;

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// // 🍏 Apple-style timestamp formatter
// // 🍏 Apple-accurate date + time formatter
// const formatAppleTime = (ts: string) => {
//   const date = new Date(ts);
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffDays = diffMs / (1000 * 60 * 60 * 24);

//   const isToday = now.toDateString() === date.toDateString();
//   const yesterday = new Date();
//   yesterday.setDate(now.getDate() - 1);
//   const isYesterday = yesterday.toDateString() === date.toDateString();

//   const time = new Intl.DateTimeFormat('en-US', {
//     hour: 'numeric',
//     minute: '2-digit',
//     hour12: true,
//   }).format(date);

//   if (isToday) {
//     return time; // ✅ only time for today
//   } else if (isYesterday) {
//     return `Yesterday, ${time}`;
//   } else if (diffDays < 7) {
//     const weekday = new Intl.DateTimeFormat('en-US', {weekday: 'long'}).format(
//       date,
//     );
//     return `${weekday}, ${time}`;
//   } else {
//     const fullDate = new Intl.DateTimeFormat('en-US', {
//       month: 'short',
//       day: 'numeric',
//     }).format(date);
//     return `${fullDate}, ${time}`;
//   }
// };

// type Props = {
//   n: AppNotification;
//   onPress: () => void;
//   onDelete: (id: string) => void;
// };

// export default function NotificationCard({n, onPress, onDelete}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   const panX = useRef(new Animated.Value(0)).current;
//   const deleteVisible = useRef(false);

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
//       onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4,
//       onPanResponderMove: (_, g) => {
//         if (g.dx < 0) {
//           panX.setValue(Math.max(g.dx, -DELETE_BUTTON_WIDTH));
//         }
//       },
//       onPanResponderRelease: (_, g) => {
//         const velocityTrigger = g.vx < -0.15;
//         const distanceTrigger = g.dx < -50;
//         if (velocityTrigger || distanceTrigger) {
//           deleteVisible.current = true;
//           Animated.timing(panX, {
//             toValue: -DELETE_BUTTON_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           deleteVisible.current = false;
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 160,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleDeletePress = () => {
//     triggerHaptic();
//     onDelete(n.id);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       position: 'relative',
//       overflow: 'hidden',
//       borderRadius: 16,
//       marginBottom: 6,
//     },
//     deleteButton: {
//       position: 'absolute',
//       right: 0,
//       top: 0,
//       bottom: 0,
//       width: DELETE_BUTTON_WIDTH,
//       backgroundColor: '#FF3B30',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     deleteText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       padding: 14,
//       borderRadius: 16,
//       // borderWidth: theme.borderWidth.md,
//       // borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       // shadowColor: '#000',
//       // shadowOpacity: 0.08,
//       // shadowRadius: 6,
//       // elevation: 1,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth.lg,
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     headerRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//     },
//     title: {
//       fontSize: 16,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//       flexShrink: 1,
//       paddingRight: 8,
//     },
//     time: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//       textAlign: 'right',
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//   });

//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <View style={styles.container}>
//       <View style={styles.deleteButton}>
//         <TouchableOpacity
//           onPress={handleDeletePress}
//           style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//           <Text style={styles.deleteText}>Delete</Text>
//         </TouchableOpacity>
//       </View>

//       <Animated.View
//         {...panResponder.panHandlers}
//         style={{transform: [{translateX: panX}]}}>
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.9}
//           style={[styles.card, isUnread && styles.cardUnread]}>
//           <View style={styles.left}>
//             <Text style={styles.icon}>{iconFor(n.category)}</Text>
//             {isUnread && <View style={styles.unreadDot} />}
//           </View>

//           <View style={styles.center}>
//             {/* 🍏 Title row + timestamp (aligned like iOS) */}
//             <View style={styles.headerRow}>
//               {n.title ? (
//                 <Text numberOfLines={1} style={styles.title}>
//                   {n.title}
//                 </Text>
//               ) : (
//                 <View />
//               )}

//               <Text style={styles.time}>{formatAppleTime(n.timestamp)}</Text>
//             </View>

//             <Text numberOfLines={2} style={styles.message}>
//               {prefix}
//               {outfitName || parsedName ? (
//                 <>
//                   :{' '}
//                   <Text style={styles.outfitName}>
//                     "{outfitName || parsedName.trim()}"
//                   </Text>
//                 </>
//               ) : null}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     </View>
//   );
// }

//////////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SWIPE_THRESHOLD = 70;
// const DELETE_BUTTON_WIDTH = 88;

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// type Props = {
//   n: AppNotification;
//   onPress: () => void;
//   onDelete: (id: string) => void;
// };

// export default function NotificationCard({n, onPress, onDelete}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   // 🔥 Animation & swipe state
//   const panX = useRef(new Animated.Value(0)).current;
//   const deleteVisible = useRef(false);

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
//       onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4,

//       onPanResponderMove: (_, g) => {
//         // ✅ Only allow swiping left (negative X)
//         if (g.dx < 0) {
//           panX.setValue(Math.max(g.dx, -DELETE_BUTTON_WIDTH));
//         }
//       },

//       onPanResponderRelease: (_, g) => {
//         // ✅ Easiest possible swipe: velocity OR distance
//         const velocityTrigger = g.vx < -0.15; // Quick flick
//         const distanceTrigger = g.dx < -50; // Lowered from 70 → 50

//         if (velocityTrigger || distanceTrigger) {
//           // triggerHaptic();
//           deleteVisible.current = true;
//           Animated.timing(panX, {
//             toValue: -DELETE_BUTTON_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           deleteVisible.current = false;
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 160,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleDeletePress = () => {
//     triggerHaptic();
//     onDelete(n.id);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       position: 'relative',
//       overflow: 'hidden',
//       borderRadius: 16,
//       marginBottom: 12,
//     },
//     deleteButton: {
//       position: 'absolute',
//       right: 0,
//       top: 0,
//       bottom: 0,
//       width: DELETE_BUTTON_WIDTH,
//       backgroundColor: '#FF3B30',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     deleteText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       padding: 14,
//       borderRadius: 16,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 1,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth.lg,
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     title: {
//       fontSize: 16,
//       marginBottom: 2,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//     time: {
//       fontSize: 12,
//       marginTop: 8,
//       color: theme.colors.foreground2,
//     },
//   });

//   // ✅ Extract outfit name cleanly
//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <View style={styles.container}>
//       {/* 🔴 Delete background */}
//       <View style={styles.deleteButton}>
//         <TouchableOpacity
//           onPress={handleDeletePress}
//           style={{
//             flex: 1,
//             justifyContent: 'center',
//             alignItems: 'center',
//           }}>
//           <Text style={styles.deleteText}>Delete</Text>
//         </TouchableOpacity>
//       </View>

//       {/* 📱 Swipeable notification card */}
//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[{transform: [{translateX: panX}]}]}>
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.9}
//           style={[styles.card, isUnread && styles.cardUnread]}>
//           <View style={styles.left}>
//             <Text style={styles.icon}>{iconFor(n.category)}</Text>
//             {isUnread && <View style={styles.unreadDot} />}
//           </View>

//           <View style={styles.center}>
//             {n.title ? (
//               <Text numberOfLines={1} style={styles.title}>
//                 {n.title}
//               </Text>
//             ) : null}

//             <Text numberOfLines={2} style={styles.message}>
//               {prefix}
//               {outfitName || parsedName ? (
//                 <>
//                   :{' '}
//                   <Text style={styles.outfitName}>
//                     "{outfitName || parsedName.trim()}"
//                   </Text>
//                 </>
//               ) : null}
//             </Text>

//             <Text style={styles.time}>
//               {new Date(n.timestamp).toLocaleString()}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     </View>
//   );
// }

/////////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SWIPE_THRESHOLD = 70;
// const DELETE_BUTTON_WIDTH = 88;

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// type Props = {
//   n: AppNotification;
//   onPress: () => void;
//   onDelete: (id: string) => void;
// };

// export default function NotificationCard({n, onPress, onDelete}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   // 🔥 Animation & swipe state
//   const panX = useRef(new Animated.Value(0)).current;
//   const deleteVisible = useRef(false);

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
//       onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4,

//       onPanResponderMove: (_, g) => {
//         // ✅ Only allow swiping left (negative X)
//         if (g.dx < 0) {
//           panX.setValue(Math.max(g.dx, -DELETE_BUTTON_WIDTH));
//         }
//       },

//       onPanResponderRelease: (_, g) => {
//         // ✅ Easiest possible swipe: velocity OR distance
//         const velocityTrigger = g.vx < -0.15; // Quick flick
//         const distanceTrigger = g.dx < -50; // Lowered from 70 → 50

//         if (velocityTrigger || distanceTrigger) {
//           // triggerHaptic();
//           deleteVisible.current = true;
//           Animated.timing(panX, {
//             toValue: -DELETE_BUTTON_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           deleteVisible.current = false;
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 160,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleDeletePress = () => {
//     triggerHaptic();
//     onDelete(n.id);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       position: 'relative',
//       overflow: 'hidden',
//       borderRadius: 16,
//       marginBottom: 12,
//     },
//     deleteButton: {
//       position: 'absolute',
//       right: 0,
//       top: 0,
//       bottom: 0,
//       width: DELETE_BUTTON_WIDTH,
//       backgroundColor: '#FF3B30',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     deleteText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       padding: 14,
//       borderRadius: 16,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 1,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth.lg,
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     title: {
//       fontSize: 16,
//       marginBottom: 2,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//     time: {
//       fontSize: 12,
//       marginTop: 8,
//       color: theme.colors.foreground2,
//     },
//   });

//   // ✅ Extract outfit name cleanly
//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <View style={styles.container}>
//       {/* 🔴 Delete background */}
//       <View style={styles.deleteButton}>
//         <TouchableOpacity
//           onPress={handleDeletePress}
//           style={{
//             flex: 1,
//             justifyContent: 'center',
//             alignItems: 'center',
//           }}>
//           <Text style={styles.deleteText}>Delete</Text>
//         </TouchableOpacity>
//       </View>

//       {/* 📱 Swipeable notification card */}
//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[{transform: [{translateX: panX}]}]}>
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.9}
//           style={[styles.card, isUnread && styles.cardUnread]}>
//           <View style={styles.left}>
//             <Text style={styles.icon}>{iconFor(n.category)}</Text>
//             {isUnread && <View style={styles.unreadDot} />}
//           </View>

//           <View style={styles.center}>
//             {n.title ? (
//               <Text numberOfLines={1} style={styles.title}>
//                 {n.title}
//               </Text>
//             ) : null}

//             <Text numberOfLines={2} style={styles.message}>
//               {prefix}
//               {outfitName || parsedName ? (
//                 <>
//                   :{' '}
//                   <Text style={styles.outfitName}>
//                     "{outfitName || parsedName.trim()}"
//                   </Text>
//                 </>
//               ) : null}
//             </Text>

//             <Text style={styles.time}>
//               {new Date(n.timestamp).toLocaleString()}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     </View>
//   );
// }

////////////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SWIPE_THRESHOLD = 70;
// const DELETE_BUTTON_WIDTH = 88;

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// type Props = {
//   n: AppNotification;
//   onPress: () => void;
//   onDelete: (id: string) => void;
// };

// export default function NotificationCard({n, onPress, onDelete}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   // 🔥 Animation & swipe state
//   const panX = useRef(new Animated.Value(0)).current;
//   const deleteVisible = useRef(false);

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
//       onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4,

//       onPanResponderMove: (_, g) => {
//         // ✅ Only allow swiping left (negative X)
//         if (g.dx < 0) {
//           panX.setValue(Math.max(g.dx, -DELETE_BUTTON_WIDTH));
//         }
//       },

//       onPanResponderRelease: (_, g) => {
//         // ✅ Easiest possible swipe: velocity OR distance
//         const velocityTrigger = g.vx < -0.15; // Quick flick
//         const distanceTrigger = g.dx < -50; // Lowered from 70 → 50

//         if (velocityTrigger || distanceTrigger) {
//           triggerHaptic();
//           deleteVisible.current = true;
//           Animated.timing(panX, {
//             toValue: -DELETE_BUTTON_WIDTH,
//             duration: 180,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           deleteVisible.current = false;
//           Animated.timing(panX, {
//             toValue: 0,
//             duration: 160,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {
//           toValue: 0,
//           useNativeDriver: true,
//         }).start();
//       },
//     }),
//   ).current;

//   const handleDeletePress = () => {
//     triggerHaptic();
//     onDelete(n.id);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       position: 'relative',
//       overflow: 'hidden',
//       borderRadius: 16,
//       marginBottom: 12,
//     },
//     deleteButton: {
//       position: 'absolute',
//       right: 0,
//       top: 0,
//       bottom: 0,
//       width: DELETE_BUTTON_WIDTH,
//       backgroundColor: '#FF3B30',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     deleteText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       padding: 14,
//       borderRadius: 16,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 1,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth.lg,
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     title: {
//       fontSize: 16,
//       marginBottom: 2,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//     time: {
//       fontSize: 12,
//       marginTop: 8,
//       color: theme.colors.foreground2,
//     },
//   });

//   // ✅ Extract outfit name cleanly
//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <View style={styles.container}>
//       {/* 🔴 Delete background */}
//       <View style={styles.deleteButton}>
//         <TouchableOpacity
//           onPress={handleDeletePress}
//           style={{
//             flex: 1,
//             justifyContent: 'center',
//             alignItems: 'center',
//           }}>
//           <Text style={styles.deleteText}>Delete</Text>
//         </TouchableOpacity>
//       </View>

//       {/* 📱 Swipeable notification card */}
//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[{transform: [{translateX: panX}]}]}>
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.9}
//           style={[styles.card, isUnread && styles.cardUnread]}>
//           <View style={styles.left}>
//             <Text style={styles.icon}>{iconFor(n.category)}</Text>
//             {isUnread && <View style={styles.unreadDot} />}
//           </View>

//           <View style={styles.center}>
//             {n.title ? (
//               <Text numberOfLines={1} style={styles.title}>
//                 {n.title}
//               </Text>
//             ) : null}

//             <Text numberOfLines={2} style={styles.message}>
//               {prefix}
//               {outfitName || parsedName ? (
//                 <>
//                   :{' '}
//                   <Text style={styles.outfitName}>
//                     "{outfitName || parsedName.trim()}"
//                   </Text>
//                 </>
//               ) : null}
//             </Text>

//             <Text style={styles.time}>
//               {new Date(n.timestamp).toLocaleString()}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     </View>
//   );
// }

//////////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SWIPE_THRESHOLD = 70;
// const DELETE_BUTTON_WIDTH = 88;

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// export default function NotificationCard({
//   n,
//   onPress,
//   onDelete,
// }: {
//   n: AppNotification;
//   onPress: () => void;
//   onDelete: (id: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   const panX = useRef(new Animated.Value(0)).current;
//   const deleteVisible = useRef(false);

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
//       onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4,

//       onPanResponderMove: (_, g) => {
//         if (g.dx < 0) {
//           panX.setValue(Math.max(g.dx, -DELETE_BUTTON_WIDTH));
//         }
//       },

//       onPanResponderRelease: (_, g) => {
//         if (g.dx < -SWIPE_THRESHOLD) {
//           triggerHaptic();
//           deleteVisible.current = true;
//           Animated.spring(panX, {
//             toValue: -DELETE_BUTTON_WIDTH,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           deleteVisible.current = false;
//           Animated.spring(panX, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
//       },
//     }),
//   ).current;

//   const handleDeletePress = () => {
//     triggerHaptic();
//     onDelete(n.id);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       position: 'relative',
//       overflow: 'hidden',
//       borderRadius: 16,
//       marginBottom: 12,
//     },
//     deleteButton: {
//       position: 'absolute',
//       right: 0,
//       top: 0,
//       bottom: 0,
//       width: DELETE_BUTTON_WIDTH,
//       backgroundColor: '#FF3B30',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     deleteText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       padding: 14,
//       borderRadius: 16,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 1,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth.lg,
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     title: {
//       fontSize: 16,
//       marginBottom: 2,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//     time: {
//       fontSize: 12,
//       marginTop: 8,
//       color: theme.colors.foreground2,
//     },
//   });

//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <View style={styles.container}>
//       {/* Red delete background */}
//       <View style={styles.deleteButton}>
//         <TouchableOpacity
//           onPress={handleDeletePress}
//           style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//           <Text style={styles.deleteText}>Delete</Text>
//         </TouchableOpacity>
//       </View>

//       {/* Swipeable card */}
//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[{transform: [{translateX: panX}]}]}>
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.9}
//           style={[styles.card, isUnread && styles.cardUnread]}>
//           <View style={styles.left}>
//             <Text style={styles.icon}>{iconFor(n.category)}</Text>
//             {isUnread && <View style={styles.unreadDot} />}
//           </View>
//           <View style={styles.center}>
//             {n.title ? (
//               <Text numberOfLines={1} style={styles.title}>
//                 {n.title}
//               </Text>
//             ) : null}

//             <Text numberOfLines={2} style={styles.message}>
//               {prefix}
//               {outfitName || parsedName ? (
//                 <>
//                   :{' '}
//                   <Text style={styles.outfitName}>
//                     "{outfitName || parsedName.trim()}"
//                   </Text>
//                 </>
//               ) : null}
//             </Text>

//             <Text style={styles.time}>
//               {new Date(n.timestamp).toLocaleString()}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     </View>
//   );
// }

/////////////////////

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import SwipeableCard from '../../components/SwipeableCard/SwipeableCard';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const DELETE_BUTTON_WIDTH = 88;

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// export default function NotificationCard({
//   n,
//   onPress,
//   onDelete,
// }: {
//   n: AppNotification;
//   onPress: () => void;
//   onDelete: (id: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   const styles = StyleSheet.create({
//     container: {
//       position: 'relative',
//       overflow: 'hidden',
//       borderRadius: 16,
//       marginBottom: 12,
//     },
//     deleteBackground: {
//       position: 'absolute',
//       right: 0,
//       top: 0,
//       bottom: 0,
//       width: DELETE_BUTTON_WIDTH,
//       backgroundColor: '#FF3B30',
//       alignItems: 'center',
//       justifyContent: 'center',
//       borderRadius: 16,
//     },
//     deleteText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       padding: 14,
//       borderRadius: 16,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 1,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth.lg,
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     title: {
//       fontSize: 16,
//       marginBottom: 2,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//     time: {
//       fontSize: 12,
//       marginTop: 8,
//       color: theme.colors.foreground2,
//     },
//   });

//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <View style={styles.container}>
//       <SwipeableCard
//         deleteThreshold={0.12}
//         deleteBackground={
//           <View style={styles.deleteBackground}>
//             <TouchableOpacity
//               onPress={() => onDelete(n.id)}
//               style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//               <Text style={styles.deleteText}>Delete</Text>
//             </TouchableOpacity>
//           </View>
//         }
//         onSwipeLeft={() => onDelete(n.id)}>
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.9}
//           style={[styles.card, isUnread && styles.cardUnread]}>
//           <View style={styles.left}>
//             <Text style={styles.icon}>{iconFor(n.category)}</Text>
//             {isUnread && <View style={styles.unreadDot} />}
//           </View>
//           <View style={styles.center}>
//             {n.title ? (
//               <Text numberOfLines={1} style={styles.title}>
//                 {n.title}
//               </Text>
//             ) : null}

//             <Text numberOfLines={2} style={styles.message}>
//               {prefix}
//               {outfitName || parsedName ? (
//                 <>
//                   :{' '}
//                   <Text style={styles.outfitName}>
//                     "{outfitName || parsedName.trim()}"
//                   </Text>
//                 </>
//               ) : null}
//             </Text>

//             <Text style={styles.time}>
//               {new Date(n.timestamp).toLocaleString()}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </SwipeableCard>
//     </View>
//   );
// }

////////////////////////

// import React, {useRef} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   PanResponder,
//   TouchableOpacity,
// } from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// const SWIPE_THRESHOLD = 70;
// const DELETE_BUTTON_WIDTH = 88;

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// export default function NotificationCard({
//   n,
//   onPress,
//   onDelete,
// }: {
//   n: AppNotification;
//   onPress: () => void;
//   onDelete: (id: string) => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   const panX = useRef(new Animated.Value(0)).current;
//   const deleteVisible = useRef(false);

//   const triggerHaptic = () => {
//     ReactNativeHapticFeedback.trigger('impactLight', {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
//       onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4,

//       onPanResponderMove: (_, g) => {
//         if (g.dx < 0) {
//           panX.setValue(Math.max(g.dx, -DELETE_BUTTON_WIDTH));
//         }
//       },

//       onPanResponderRelease: (_, g) => {
//         if (g.dx < -SWIPE_THRESHOLD) {
//           triggerHaptic();
//           deleteVisible.current = true;
//           Animated.spring(panX, {
//             toValue: -DELETE_BUTTON_WIDTH,
//             useNativeDriver: true,
//           }).start();
//         } else {
//           deleteVisible.current = false;
//           Animated.spring(panX, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },

//       onPanResponderTerminate: () => {
//         Animated.spring(panX, {toValue: 0, useNativeDriver: true}).start();
//       },
//     }),
//   ).current;

//   const handleDeletePress = () => {
//     triggerHaptic();
//     onDelete(n.id);
//   };

//   const styles = StyleSheet.create({
//     container: {
//       position: 'relative',
//       overflow: 'hidden',
//       borderRadius: 16,
//       marginBottom: 12,
//     },
//     deleteButton: {
//       position: 'absolute',
//       right: 0,
//       top: 0,
//       bottom: 0,
//       width: DELETE_BUTTON_WIDTH,
//       backgroundColor: '#FF3B30',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     deleteText: {
//       color: '#fff',
//       fontSize: 17,
//       fontWeight: '600',
//     },
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       padding: 14,
//       borderRadius: 16,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 1,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth.lg,
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     title: {
//       fontSize: 16,
//       marginBottom: 2,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//     time: {
//       fontSize: 12,
//       marginTop: 8,
//       color: theme.colors.foreground2,
//     },
//   });

//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <View style={styles.container}>
//       {/* Red delete background */}
//       <View style={styles.deleteButton}>
//         <TouchableOpacity
//           onPress={handleDeletePress}
//           style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
//           <Text style={styles.deleteText}>Delete</Text>
//         </TouchableOpacity>
//       </View>

//       {/* Swipeable card */}
//       <Animated.View
//         {...panResponder.panHandlers}
//         style={[{transform: [{translateX: panX}]}]}>
//         <TouchableOpacity
//           onPress={onPress}
//           activeOpacity={0.9}
//           style={[styles.card, isUnread && styles.cardUnread]}>
//           <View style={styles.left}>
//             <Text style={styles.icon}>{iconFor(n.category)}</Text>
//             {isUnread && <View style={styles.unreadDot} />}
//           </View>
//           <View style={styles.center}>
//             {n.title ? (
//               <Text numberOfLines={1} style={styles.title}>
//                 {n.title}
//               </Text>
//             ) : null}

//             <Text numberOfLines={2} style={styles.message}>
//               {prefix}
//               {outfitName || parsedName ? (
//                 <>
//                   :{' '}
//                   <Text style={styles.outfitName}>
//                     "{outfitName || parsedName.trim()}"
//                   </Text>
//                 </>
//               ) : null}
//             </Text>

//             <Text style={styles.time}>
//               {new Date(n.timestamp).toLocaleString()}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     </View>
//   );
// }

//////////////////////

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// export default function NotificationCard({
//   n,
//   onPress,
// }: {
//   n: AppNotification;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   const styles = StyleSheet.create({
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       padding: 14,
//       borderRadius: 16,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 1,
//       marginBottom: 12,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? // ? 'rgba(0,122,255,0.12)'
//           // : 'rgba(0,122,255,0.08)',
//           theme.colors.surface
//         : theme.colors.background,
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth.lg,
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     title: {
//       fontSize: 16,
//       marginBottom: 2,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     outfitName: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginLeft: 4,
//     },
//     time: {
//       fontSize: 12,
//       marginTop: 8,
//       color: theme.colors.foreground2,
//     },
//   });

//   // ✅ Extract outfit name cleanly: Prefer payload, fallback to parsing
//   const outfitName = n?.data?.outfit_name;
//   const [prefix, parsedName] = n.message.includes(':')
//     ? n.message.split(':')
//     : [n.message, ''];

//   return (
//     <TouchableOpacity
//       onPress={onPress}
//       activeOpacity={0.9}
//       style={[styles.card, isUnread && styles.cardUnread]}>
//       <View style={styles.left}>
//         <Text style={styles.icon}>{iconFor(n.category)}</Text>
//         {isUnread && <View style={styles.unreadDot} />}
//       </View>
//       <View style={styles.center}>
//         {n.title ? (
//           <Text numberOfLines={1} style={styles.title}>
//             {n.title}
//           </Text>
//         ) : null}

//         {/* ✅ Styled message with bold outfit name */}
//         <Text numberOfLines={2} style={styles.message}>
//           {prefix}
//           {outfitName || parsedName ? (
//             <>
//               :{' '}
//               <Text style={styles.outfitName}>
//                 "{outfitName || parsedName.trim()}"
//               </Text>
//             </>
//           ) : null}
//         </Text>

//         <Text style={styles.time}>
//           {new Date(n.timestamp).toLocaleString()}
//         </Text>
//       </View>
//     </TouchableOpacity>
//   );
// }

////////////////

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// export default function NotificationCard({
//   n,
//   onPress,
// }: {
//   n: AppNotification;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   const styles = StyleSheet.create({
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       padding: 14,
//       borderRadius: 16,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 1,
//       marginBottom: 12,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? 'rgba(0,122,255,0.12)'
//         : 'rgba(0,122,255,0.08)',
//       borderColor: theme.colors.button3,
//       borderWidth: theme.borderWidth.lg,
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: theme.colors.button1,
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     title: {
//       fontSize: 16,
//       marginBottom: 2,
//       fontWeight: isUnread ? '700' : '500',
//       color: theme.colors.foreground,
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     time: {
//       fontSize: 12,
//       marginTop: 8,
//       color: theme.colors.foreground2,
//     },
//   });

//   return (
//     <TouchableOpacity
//       onPress={onPress}
//       activeOpacity={0.9}
//       style={[styles.card, isUnread && styles.cardUnread]}>
//       <View style={styles.left}>
//         <Text style={styles.icon}>{iconFor(n.category)}</Text>
//         {isUnread && <View style={styles.unreadDot} />}
//       </View>
//       <View style={styles.center}>
//         {n.title ? (
//           <Text numberOfLines={1} style={styles.title}>
//             {n.title}
//           </Text>
//         ) : null}
//         <Text numberOfLines={2} style={styles.message}>
//           {n.message}
//         </Text>
//         <Text style={styles.time}>
//           {new Date(n.timestamp).toLocaleString()}
//         </Text>
//       </View>
//     </TouchableOpacity>
//   );
// }

///////////////////

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// export default function NotificationCard({
//   n,
//   onPress,
// }: {
//   n: AppNotification;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const isUnread = !n.read;

//   const styles = StyleSheet.create({
//     card: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       padding: 14,
//       borderRadius: 16,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 1,
//       marginBottom: 12,
//     },
//     cardUnread: {
//       backgroundColor: theme.isDark
//         ? 'rgba(0,122,255,0.12)'
//         : 'rgba(0,122,255,0.08)', // subtle blue tint
//       borderColor: '#007AFF', // system blue border for unread
//       borderWidth: theme.borderWidth.lg,
//     },
//     left: {
//       width: 32,
//       alignItems: 'center',
//       marginRight: 10,
//       paddingTop: 2,
//       position: 'relative',
//     },
//     unreadDot: {
//       position: 'absolute',
//       top: -4,
//       right: -4,
//       width: 10,
//       height: 10,
//       borderRadius: 5,
//       backgroundColor: '#007AFF',
//     },
//     icon: {fontSize: 20},
//     center: {flex: 1},
//     title: {
//       fontSize: 16,
//       marginBottom: 2,
//       fontWeight: isUnread ? '700' : '500', // bold for unread
//       color: theme.colors.foreground,
//     },
//     message: {
//       fontSize: 14,
//       lineHeight: 19,
//       color: isUnread ? theme.colors.foreground : theme.colors.foreground3,
//       marginTop: 4,
//     },
//     time: {
//       fontSize: 12,
//       marginTop: 8,
//       color: theme.colors.foreground2,
//     },
//   });

//   return (
//     <TouchableOpacity
//       onPress={onPress}
//       activeOpacity={0.9}
//       style={[styles.card, isUnread && styles.cardUnread]}>
//       <View style={styles.left}>
//         <Text style={styles.icon}>{iconFor(n.category)}</Text>
//         {isUnread && <View style={styles.unreadDot} />}
//       </View>
//       <View style={styles.center}>
//         {n.title ? (
//           <Text numberOfLines={1} style={styles.title}>
//             {n.title}
//           </Text>
//         ) : null}
//         <Text numberOfLines={2} style={styles.message}>
//           {n.message}
//         </Text>
//         <Text style={styles.time}>
//           {new Date(n.timestamp).toLocaleString()}
//         </Text>
//       </View>
//     </TouchableOpacity>
//   );
// }

////////////////

// import React from 'react';
// import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
// import type {AppNotification} from '../../storage/notifications';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// const iconFor = (c?: AppNotification['category']) => {
//   switch (c) {
//     case 'news':
//       return '📰';
//     case 'outfit':
//       return '👗';
//     case 'weather':
//       return '☔';
//     case 'care':
//       return '🧼';
//     default:
//       return '🔔';
//   }
// };

// export default function NotificationCard({
//   n,
//   onPress,
// }: {
//   n: AppNotification;
//   onPress: () => void;
// }) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const styles = StyleSheet.create({
//     card: {
//       flexDirection: 'row',
//       gap: 10,
//       padding: 12,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 14,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//       shadowColor: '#000',
//       shadowOpacity: 0.2,
//       shadowRadius: 10,
//       elevation: 2,
//       marginBottom: 12,
//     },
//     cardUnread: {
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.buttonText1,
//       borderWidth: theme.borderWidth['2xl'],
//     },
//     left: {width: 28, alignItems: 'center', paddingTop: 2},
//     icon: {fontSize: 18},
//     center: {flex: 1},
//     title: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 15,
//       marginBottom: 2,
//     },
//     message: {
//       color: theme.colors.foreground3,
//       fontSize: 14,
//       lineHeight: 18,
//       marginTop: 6,
//     },
//     time: {color: theme.colors.foreground2, fontSize: 12, marginTop: 6},
//   });

//   return (
//     <TouchableOpacity
//       onPress={onPress}
//       activeOpacity={0.9}
//       style={[styles.card, !n.read && styles.cardUnread]}>
//       <View style={styles.left}>
//         <Text style={styles.icon}>{iconFor(n.category)}</Text>
//       </View>
//       <View style={styles.center}>
//         {n.title ? (
//           <Text numberOfLines={1} style={styles.title}>
//             {n.title}
//           </Text>
//         ) : null}
//         <Text numberOfLines={2} style={styles.message}>
//           {n.message}
//         </Text>
//         <Text style={styles.time}>
//           {new Date(n.timestamp).toLocaleString()}
//         </Text>
//       </View>
//     </TouchableOpacity>
//   );
// }
