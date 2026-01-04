import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Image,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import {useAppTheme} from '../../context/ThemeContext';
import {useUUID} from '../../context/UUIDContext';
import {useMessagingSocket, SocketMessage, CommunityNotification} from '../../hooks/useSocket';
import {addToInbox} from '../../utils/notificationInbox';
import {queryClient} from '../../lib/queryClient';

type Props = {
  onTapNotification?: (senderId: string, senderName: string, senderAvatar: string) => void;
};

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
  if (url.includes('pravatar.cc')) return false;
  if (url.includes('placeholder')) return false;
  return true;
};

export default function MessageNotificationBanner({onTapNotification}: Props) {
  const {theme} = useAppTheme();
  const insets = useSafeAreaInsets();
  const userId = useUUID();

  const [notification, setNotification] = useState<SocketMessage | null>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((message: SocketMessage) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setNotification(message);

    // Haptic feedback
    ReactNativeHapticFeedback.trigger('notificationSuccess', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

    // Slide in
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    // Auto-dismiss after 4 seconds
    timeoutRef.current = setTimeout(() => {
      dismissNotification();
    }, 4000);
  }, [slideAnim]);

  const dismissNotification = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setNotification(null);
    });
  }, [slideAnim]);

  const handleTap = useCallback(() => {
    if (notification && onTapNotification) {
      dismissNotification();
      onTapNotification(
        notification.sender_id,
        notification.sender_name,
        notification.sender_avatar,
      );
    }
  }, [notification, onTapNotification, dismissNotification]);

  // Handle new messages from WebSocket
  const handleNewMessage = useCallback(
    async (message: SocketMessage) => {
      console.log('🔔 Global message received:', message);

      // Don't show notification for messages I sent
      if (message.sender_id === userId) return;

      // Show in-app banner
      showNotification(message);

      // Add to notification inbox
      await addToInbox({
        user_id: userId || undefined,
        id: `msg-${message.id}`,
        title: message.sender_name,
        message: message.content,
        timestamp: message.created_at,
        category: 'message',
        deeplink: `stylhelpr://chat/${message.sender_id}`,
        data: {
          senderId: message.sender_id,
          senderName: message.sender_name,
          senderAvatar: message.sender_avatar,
        },
        read: false,
      });

      // Invalidate unread count query
      queryClient.invalidateQueries({queryKey: ['unread-count']});
      queryClient.invalidateQueries({queryKey: ['conversations']});
    },
    [userId, showNotification],
  );

  // Handle community notifications (like, comment, follow) - SAME PATTERN as DM messages
  const handleCommunityNotification = useCallback(
    async (notification: CommunityNotification) => {
      console.log('🔔 Community notification received:', notification);

      // Add to notification inbox with category: 'message' (goes to Community Messages)
      await addToInbox({
        user_id: userId || undefined,
        id: notification.id,
        title: notification.title,
        message: notification.message,
        timestamp: notification.created_at,
        category: 'message',
        deeplink: notification.postId
          ? `stylhelpr://community/post/${notification.postId}`
          : undefined,
        data: {
          type: notification.type,
          senderId: notification.senderId,
          senderName: notification.senderName,
          senderAvatar: notification.senderAvatar,
          postId: notification.postId || '',
        },
        read: false,
      });

      console.log('✅ Community notification added to inbox');
    },
    [userId],
  );

  // Connect to global socket for message AND community notifications
  useMessagingSocket(
    userId,
    handleNewMessage,
    undefined,
    undefined,
    undefined,
    handleCommunityNotification,
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!notification) return null;

  const hasRealAvatar = isRealAvatar(notification.sender_avatar);
  const initials = getInitials(notification.sender_name);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: theme.colors.surface,
          transform: [{translateY: slideAnim}],
        },
      ]}>
      <Pressable style={styles.content} onPress={handleTap}>
        {/* Avatar */}
        {hasRealAvatar ? (
          <Image
            source={{uri: notification.sender_avatar}}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.initialsAvatar]}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
        )}

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text
            style={[styles.senderName, {color: theme.colors.foreground}]}
            numberOfLines={1}>
            {notification.sender_name}
          </Text>
          <Text
            style={[styles.messageText, {color: theme.colors.foreground3}]}
            numberOfLines={1}>
            {notification.content}
          </Text>
        </View>

        {/* Tap hint */}
        <Text style={[styles.tapHint, {color: theme.colors.button1}]}>
          Tap to reply
        </Text>
      </Pressable>

      {/* Progress bar for auto-dismiss */}
      <View style={[styles.progressBar, {backgroundColor: theme.colors.button1}]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  initialsAvatar: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressBar: {
    height: 3,
    width: '100%',
  },
});
