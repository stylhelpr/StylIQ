import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import type {AppNotification} from '../../storage/notifications';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';

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

export default function NotificationCard({
  n,
  onPress,
}: {
  n: AppNotification;
  onPress: () => void;
}) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const isUnread = !n.read;

  const styles = StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      borderRadius: 16,
      borderWidth: theme.borderWidth.md,
      borderColor: theme.colors.surfaceBorder,
      backgroundColor: theme.colors.surface,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 1,
      marginBottom: 12,
    },
    cardUnread: {
      backgroundColor: theme.isDark
        ? // ? 'rgba(0,122,255,0.12)'
          // : 'rgba(0,122,255,0.08)',
          theme.colors.surface
        : theme.colors.background,
      borderColor: theme.colors.button3,
      borderWidth: theme.borderWidth.lg,
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
    title: {
      fontSize: 16,
      marginBottom: 2,
      fontWeight: isUnread ? '700' : '500',
      color: theme.colors.foreground,
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
    time: {
      fontSize: 12,
      marginTop: 8,
      color: theme.colors.foreground2,
    },
  });

  // ✅ Extract outfit name cleanly: Prefer payload, fallback to parsing
  const outfitName = n?.data?.outfit_name;
  const [prefix, parsedName] = n.message.includes(':')
    ? n.message.split(':')
    : [n.message, ''];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.card, isUnread && styles.cardUnread]}>
      <View style={styles.left}>
        <Text style={styles.icon}>{iconFor(n.category)}</Text>
        {isUnread && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.center}>
        {n.title ? (
          <Text numberOfLines={1} style={styles.title}>
            {n.title}
          </Text>
        ) : null}

        {/* ✅ Styled message with bold outfit name */}
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

        <Text style={styles.time}>
          {new Date(n.timestamp).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

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
