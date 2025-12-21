import React, {useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import {useAppTheme} from '../context/ThemeContext';
import {tokens} from '../styles/tokens/tokens';
import {fontScale, moderateScale} from '../utils/scale';
import {useUUID} from '../context/UUIDContext';
import {useConversations, Conversation} from '../hooks/useMessaging';

type Props = {
  navigate: (screen: string, params?: any) => void;
};

const h = (type: 'selection' | 'impactLight' | 'impactMedium') =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

// Helper to get initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Check if avatar is a real image URL (not a placeholder)
const isRealAvatar = (url: string | null | undefined): boolean => {
  if (!url) return false;
  // Filter out pravatar placeholders
  if (url.includes('pravatar.cc')) return false;
  if (url.includes('placeholder')) return false;
  return true;
};

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
};

export default function MessagesScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUserId = useUUID();

  const {
    data: conversations,
    isLoading,
    refetch,
  } = useConversations(currentUserId || '');

  const openChat = useCallback(
    (conversation: Conversation) => {
      h('selection');
      navigate('ChatScreen', {
        recipientId: conversation.other_user_id,
        recipientName: conversation.other_user_name,
        recipientAvatar: conversation.other_user_avatar,
      });
    },
    [navigate],
  );

  const renderConversation = ({item}: {item: Conversation}) => {
    const hasRealAvatar = isRealAvatar(item.other_user_avatar);
    const initials = getInitials(item.other_user_name);
    const hasUnread = item.unread_count > 0;

    return (
      <Pressable
        style={[
          styles.conversationItem,
          {backgroundColor: hasUnread ? theme.colors.surface : 'transparent'},
        ]}
        onPress={() => openChat(item)}>
        {/* Avatar - tapping navigates to profile */}
        <Pressable
          onPress={() => {
            navigate('UserProfileScreen', {
              userId: item.other_user_id,
              userName: item.other_user_name,
              userAvatar: item.other_user_avatar,
            });
          }}>
          {hasRealAvatar ? (
            <Image source={{uri: item.other_user_avatar}} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.initialsAvatar]}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          )}
        </Pressable>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.userName,
                {
                  color: theme.colors.foreground,
                  fontWeight: hasUnread ? '700' : '600',
                },
              ]}
              numberOfLines={1}>
              {item.other_user_name}
            </Text>
            <Text
              style={[
                styles.timestamp,
                {
                  color: hasUnread
                    ? theme.colors.button1
                    : theme.colors.foreground3,
                },
              ]}>
              {formatRelativeTime(item.last_message_at)}
            </Text>
          </View>
          <View style={styles.messagePreviewRow}>
            <Text
              style={[
                styles.messagePreview,
                {
                  color: hasUnread
                    ? theme.colors.foreground
                    : theme.colors.foreground3,
                  fontWeight: hasUnread ? '500' : '400',
                },
              ]}
              numberOfLines={1}>
              {item.last_sender_id === currentUserId ? 'You: ' : ''}
              {item.last_message}
            </Text>
            {hasUnread && (
              <View
                style={[
                  styles.unreadBadge,
                  {backgroundColor: theme.colors.button1},
                ]}>
                <Text style={styles.unreadCount}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Chevron */}
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={theme.colors.foreground3}
        />
      </Pressable>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: moderateScale(tokens.spacing.md),
      paddingTop: insets.top + 70,
      paddingBottom: moderateScale(tokens.spacing.md),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.surface,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: moderateScale(tokens.spacing.sm),
    },
    headerTitle: {
      flex: 1,
      fontSize: fontScale(tokens.fontSize.xl),
      fontWeight: tokens.fontWeight.bold,
      color: theme.colors.foreground,
    },
    listContent: {
      paddingBottom: insets.bottom + 100,
    },
    conversationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: moderateScale(tokens.spacing.md),
      paddingVertical: moderateScale(tokens.spacing.sm),
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginRight: moderateScale(tokens.spacing.sm),
      borderWidth: 1,
      borderColor: 'white',
    },
    initialsAvatar: {
      backgroundColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    initialsText: {
      color: '#fff',
      fontSize: fontScale(tokens.fontSize.lg),
      fontWeight: tokens.fontWeight.bold,
    },
    conversationContent: {
      flex: 1,
      marginRight: moderateScale(tokens.spacing.xs),
    },
    conversationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    userName: {
      flex: 1,
      fontSize: fontScale(tokens.fontSize.base),
      marginRight: moderateScale(tokens.spacing.xs),
    },
    timestamp: {
      fontSize: fontScale(tokens.fontSize.xs),
    },
    messagePreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    messagePreview: {
      flex: 1,
      fontSize: fontScale(tokens.fontSize.sm),
    },
    unreadBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: moderateScale(tokens.spacing.xs),
    },
    unreadCount: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: moderateScale(tokens.spacing.xl),
    },
    emptyIcon: {
      marginBottom: moderateScale(tokens.spacing.md),
    },
    emptyTitle: {
      fontSize: fontScale(tokens.fontSize.lg),
      fontWeight: tokens.fontWeight.semiBold,
      color: theme.colors.foreground,
      marginBottom: moderateScale(tokens.spacing.xs),
      textAlign: 'center',
    },
    emptyText: {
      fontSize: fontScale(tokens.fontSize.sm),
      color: theme.colors.foreground3,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            h('selection');
            navigate('CommunityShowcaseScreen');
          }}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.button1} />
        </View>
      ) : conversations && conversations.length > 0 ? (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={item => item.other_user_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="chat-bubble-outline"
            size={64}
            color={theme.colors.foreground3}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>
            Start a conversation by tapping "Send Message" on someone's post in
            the Community
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

//////////////

// import React, {useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   Pressable,
//   Image,
//   ActivityIndicator,
// } from 'react-native';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// import {useAppTheme} from '../context/ThemeContext';
// import {tokens} from '../styles/tokens/tokens';
// import {fontScale, moderateScale} from '../utils/scale';
// import {useUUID} from '../context/UUIDContext';
// import {useConversations, Conversation} from '../hooks/useMessaging';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const h = (type: 'selection' | 'impactLight' | 'impactMedium') =>
//   ReactNativeHapticFeedback.trigger(type, {
//     enableVibrateFallback: true,
//     ignoreAndroidSystemSettings: false,
//   });

// // Helper to get initials from name
// const getInitials = (name: string): string => {
//   const parts = name.trim().split(' ').filter(Boolean);
//   if (parts.length === 0) return '?';
//   if (parts.length === 1) return parts[0][0].toUpperCase();
//   return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
// };

// // Check if avatar is a real image URL (not a placeholder)
// const isRealAvatar = (url: string | null | undefined): boolean => {
//   if (!url) return false;
//   // Filter out pravatar placeholders
//   if (url.includes('pravatar.cc')) return false;
//   if (url.includes('placeholder')) return false;
//   return true;
// };

// // Format relative time
// const formatRelativeTime = (dateString: string): string => {
//   const date = new Date(dateString);
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffMins = Math.floor(diffMs / 60000);
//   const diffHours = Math.floor(diffMs / 3600000);
//   const diffDays = Math.floor(diffMs / 86400000);

//   if (diffMins < 1) return 'now';
//   if (diffMins < 60) return `${diffMins}m`;
//   if (diffHours < 24) return `${diffHours}h`;
//   if (diffDays < 7) return `${diffDays}d`;
//   return date.toLocaleDateString();
// };

// export default function MessagesScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const insets = useSafeAreaInsets();
//   const currentUserId = useUUID();

//   const {data: conversations, isLoading, refetch} = useConversations(currentUserId || '');

//   const openChat = useCallback(
//     (conversation: Conversation) => {
//       h('selection');
//       navigate('ChatScreen', {
//         recipientId: conversation.other_user_id,
//         recipientName: conversation.other_user_name,
//         recipientAvatar: conversation.other_user_avatar,
//       });
//     },
//     [navigate],
//   );

//   const renderConversation = ({item}: {item: Conversation}) => {
//     const hasRealAvatar = isRealAvatar(item.other_user_avatar);
//     const initials = getInitials(item.other_user_name);
//     const hasUnread = item.unread_count > 0;

//     return (
//       <Pressable
//         style={[
//           styles.conversationItem,
//           {backgroundColor: hasUnread ? theme.colors.surface : 'transparent'},
//         ]}
//         onPress={() => openChat(item)}>
//         {/* Avatar */}
//         {hasRealAvatar ? (
//           <Image
//             source={{uri: item.other_user_avatar}}
//             style={styles.avatar}
//           />
//         ) : (
//           <View style={[styles.avatar, styles.initialsAvatar]}>
//             <Text style={styles.initialsText}>{initials}</Text>
//           </View>
//         )}

//         {/* Content */}
//         <View style={styles.conversationContent}>
//           <View style={styles.conversationHeader}>
//             <Text
//               style={[
//                 styles.userName,
//                 {
//                   color: theme.colors.foreground,
//                   fontWeight: hasUnread ? '700' : '600',
//                 },
//               ]}
//               numberOfLines={1}>
//               {item.other_user_name}
//             </Text>
//             <Text
//               style={[
//                 styles.timestamp,
//                 {color: hasUnread ? theme.colors.button1 : theme.colors.foreground3},
//               ]}>
//               {formatRelativeTime(item.last_message_at)}
//             </Text>
//           </View>
//           <View style={styles.messagePreviewRow}>
//             <Text
//               style={[
//                 styles.messagePreview,
//                 {
//                   color: hasUnread ? theme.colors.foreground : theme.colors.foreground3,
//                   fontWeight: hasUnread ? '500' : '400',
//                 },
//               ]}
//               numberOfLines={1}>
//               {item.last_sender_id === currentUserId ? 'You: ' : ''}
//               {item.last_message}
//             </Text>
//             {hasUnread && (
//               <View style={[styles.unreadBadge, {backgroundColor: theme.colors.button1}]}>
//                 <Text style={styles.unreadCount}>
//                   {item.unread_count > 99 ? '99+' : item.unread_count}
//                 </Text>
//               </View>
//             )}
//           </View>
//         </View>

//         {/* Chevron */}
//         <MaterialIcons
//           name="chevron-right"
//           size={24}
//           color={theme.colors.foreground3}
//         />
//       </Pressable>
//     );
//   };

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingTop: insets.top + 70,
//       paddingBottom: moderateScale(tokens.spacing.md),
//       borderBottomWidth: StyleSheet.hairlineWidth,
//       borderBottomColor: theme.colors.surface,
//     },
//     backButton: {
//       width: 40,
//       height: 40,
//       borderRadius: 20,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginRight: moderateScale(tokens.spacing.sm),
//     },
//     headerTitle: {
//       flex: 1,
//       fontSize: fontScale(tokens.fontSize.xl),
//       fontWeight: tokens.fontWeight.bold,
//       color: theme.colors.foreground,
//     },
//     listContent: {
//       paddingBottom: insets.bottom + 100,
//     },
//     conversationItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.md),
//       paddingVertical: moderateScale(tokens.spacing.sm),
//     },
//     avatar: {
//       width: 56,
//       height: 56,
//       borderRadius: 28,
//       marginRight: moderateScale(tokens.spacing.sm),
//     },
//     initialsAvatar: {
//       backgroundColor: '#000',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     initialsText: {
//       color: '#fff',
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.bold,
//     },
//     conversationContent: {
//       flex: 1,
//       marginRight: moderateScale(tokens.spacing.xs),
//     },
//     conversationHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 4,
//     },
//     userName: {
//       flex: 1,
//       fontSize: fontScale(tokens.fontSize.base),
//       marginRight: moderateScale(tokens.spacing.xs),
//     },
//     timestamp: {
//       fontSize: fontScale(tokens.fontSize.xs),
//     },
//     messagePreviewRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     messagePreview: {
//       flex: 1,
//       fontSize: fontScale(tokens.fontSize.sm),
//     },
//     unreadBadge: {
//       minWidth: 20,
//       height: 20,
//       borderRadius: 10,
//       paddingHorizontal: 6,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginLeft: moderateScale(tokens.spacing.xs),
//     },
//     unreadCount: {
//       color: '#fff',
//       fontSize: 11,
//       fontWeight: '700',
//     },
//     emptyContainer: {
//       flex: 1,
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingHorizontal: moderateScale(tokens.spacing.xl),
//     },
//     emptyIcon: {
//       marginBottom: moderateScale(tokens.spacing.md),
//     },
//     emptyTitle: {
//       fontSize: fontScale(tokens.fontSize.lg),
//       fontWeight: tokens.fontWeight.semiBold,
//       color: theme.colors.foreground,
//       marginBottom: moderateScale(tokens.spacing.xs),
//       textAlign: 'center',
//     },
//     emptyText: {
//       fontSize: fontScale(tokens.fontSize.sm),
//       color: theme.colors.foreground3,
//       textAlign: 'center',
//     },
//     loadingContainer: {
//       flex: 1,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//   });

//   return (
//     <SafeAreaView style={styles.container} edges={['left', 'right']}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Pressable
//           style={styles.backButton}
//           onPress={() => {
//             h('selection');
//             navigate('CommunityShowcaseScreen');
//           }}>
//           <MaterialIcons
//             name="arrow-back"
//             size={24}
//             color={theme.colors.foreground}
//           />
//         </Pressable>
//         <Text style={styles.headerTitle}>Messages</Text>
//       </View>

//       {/* Content */}
//       {isLoading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color={theme.colors.button1} />
//         </View>
//       ) : conversations && conversations.length > 0 ? (
//         <FlatList
//           data={conversations}
//           renderItem={renderConversation}
//           keyExtractor={item => item.other_user_id}
//           contentContainerStyle={styles.listContent}
//           showsVerticalScrollIndicator={false}
//           onRefresh={refetch}
//           refreshing={isLoading}
//         />
//       ) : (
//         <View style={styles.emptyContainer}>
//           <MaterialIcons
//             name="chat-bubble-outline"
//             size={64}
//             color={theme.colors.foreground3}
//             style={styles.emptyIcon}
//           />
//           <Text style={styles.emptyTitle}>No messages yet</Text>
//           <Text style={styles.emptyText}>
//             Start a conversation by tapping "Send Message" on someone's post in the Community
//           </Text>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// }
