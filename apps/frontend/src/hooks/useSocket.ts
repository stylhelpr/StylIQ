import {useEffect, useRef, useCallback} from 'react';
import {io, Socket} from 'socket.io-client';
import {API_BASE_URL} from '../config/api';

// Extract base URL without /api suffix
const getSocketUrl = () => {
  if (!API_BASE_URL) {
    console.warn('API_BASE_URL is undefined');
    return 'http://localhost:3001';
  }
  return API_BASE_URL.replace('/api', '');
};

export interface SocketMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
}

export interface CommunityNotification {
  id: string;
  type: 'like' | 'comment' | 'follow';
  title: string;
  message: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  postId?: string;
  created_at: string;
}

export function useMessagingSocket(
  userId: string | null,
  onNewMessage?: (message: SocketMessage) => void,
  onMessageSent?: (message: SocketMessage) => void,
  onUserTyping?: (data: {userId: string; isTyping: boolean}) => void,
  onMessagesRead?: (data: {readBy: string}) => void,
  onCommunityNotification?: (notification: CommunityNotification) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  // Use refs for callbacks to avoid reconnecting when they change
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageSentRef = useRef(onMessageSent);
  const onUserTypingRef = useRef(onUserTyping);
  const onMessagesReadRef = useRef(onMessagesRead);
  const onCommunityNotificationRef = useRef(onCommunityNotification);

  // Keep refs updated
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageSentRef.current = onMessageSent;
    onUserTypingRef.current = onUserTyping;
    onMessagesReadRef.current = onMessagesRead;
    onCommunityNotificationRef.current = onCommunityNotification;
  }, [onNewMessage, onMessageSent, onUserTyping, onMessagesRead, onCommunityNotification]);

  useEffect(() => {
    if (!userId) return;

    // Don't reconnect if already connected with same userId
    if (socketRef.current?.connected) {
      // console.log('🔌 Socket already connected, skipping reconnect');
      return;
    }

    const socketUrl = getSocketUrl();
    // console.log('🔌 Connecting to socket:', socketUrl, 'for user:', userId);

    // Connect to the messaging namespace
    const socket = io(`${socketUrl}/messaging`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      forceNew: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // console.log('✅ Socket connected:', socket.id, 'for user:', userId);
      isConnectedRef.current = true;

      // Join with userId to receive messages
      socket.emit('join', {userId});
    });

    socket.on('disconnect', reason => {
      // console.log('❌ Socket disconnected:', reason);
      isConnectedRef.current = false;
    });

    socket.on('connect_error', error => {
      // console.error('🔴 Socket connection error:', error.message);
    });

    // Listen for new messages
    socket.on('new_message', (message: SocketMessage) => {
      // console.log('📨 Received new message:', message);
      onNewMessageRef.current?.(message);
    });

    // Listen for sent message confirmation (for multi-device sync)
    socket.on('message_sent', (message: SocketMessage) => {
      // console.log('📤 Message sent confirmed:', message);
      onMessageSentRef.current?.(message);
    });

    // Listen for typing indicators
    socket.on('user_typing', (data: {userId: string; isTyping: boolean}) => {
      onUserTypingRef.current?.(data);
    });

    // Listen for read receipts
    socket.on('messages_read', (data: {readBy: string}) => {
      onMessagesReadRef.current?.(data);
    });

    // Listen for community notifications (like, comment, follow)
    socket.on('community_notification', (notification: CommunityNotification) => {
      // console.log('🔔 Received community notification:', notification);
      onCommunityNotificationRef.current?.(notification);
    });

    return () => {
      // console.log('🔌 Disconnecting socket for user:', userId);
      socket.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    };
  }, [userId]); // Only reconnect when userId changes

  // Send typing indicator
  const sendTyping = useCallback(
    (recipientId: string, isTyping: boolean) => {
      if (socketRef.current?.connected && userId) {
        socketRef.current.emit('typing', {
          senderId: userId,
          recipientId,
          isTyping,
        });
      }
    },
    [userId],
  );

  // Mark messages as read
  const markRead = useCallback(
    (otherUserId: string) => {
      if (socketRef.current?.connected && userId) {
        socketRef.current.emit('mark_read', {
          userId,
          otherUserId,
        });
      }
    },
    [userId],
  );

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
    sendTyping,
    markRead,
  };
}
