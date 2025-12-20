import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef, useCallback} from 'react';
import {apiClient} from '../lib/apiClient';

const BASE = '/messaging';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
}

export interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string;
  last_message: string;
  last_sender_id: string;
  last_message_at: string;
  unread_count: number;
}

// Get messages with a specific user
export function useMessages(userId: string, otherUserId: string, limit = 50) {
  return useQuery<Message[], Error>({
    queryKey: ['messages', userId, otherUserId],
    queryFn: async () => {
      const res = await apiClient.get(
        `${BASE}/messages/${otherUserId}?userId=${userId}&limit=${limit}`,
      );
      return res.data;
    },
    enabled: !!userId && !!otherUserId,
    staleTime: 0, // Always refetch when needed
  });
}

// Poll for new messages (returns only new messages since last check)
export function useNewMessages(
  userId: string,
  otherUserId: string,
  since: string,
  enabled = true,
) {
  return useQuery<Message[], Error>({
    queryKey: ['new-messages', userId, otherUserId, since],
    queryFn: async () => {
      const res = await apiClient.get(
        `${BASE}/messages/${otherUserId}/new?userId=${userId}&since=${encodeURIComponent(since)}`,
      );
      return res.data;
    },
    enabled: enabled && !!userId && !!otherUserId && !!since,
    staleTime: 0,
  });
}

// Hook that polls for new messages every 3 seconds
export function useMessagePolling(
  userId: string,
  otherUserId: string,
  onNewMessages: (messages: Message[]) => void,
) {
  const queryClient = useQueryClient();
  const lastTimestampRef = useRef<string>(new Date().toISOString());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const pollNewMessages = useCallback(async () => {
    if (!userId || !otherUserId) return;

    try {
      const res = await apiClient.get(
        `${BASE}/messages/${otherUserId}/new?userId=${userId}&since=${encodeURIComponent(lastTimestampRef.current)}`,
      );
      const newMessages: Message[] = res.data;

      if (newMessages.length > 0) {
        // Update the last timestamp to the newest message
        const newestMessage = newMessages[newMessages.length - 1];
        lastTimestampRef.current = newestMessage.created_at;

        // Call the callback with new messages
        onNewMessages(newMessages);

        // Invalidate related queries
        queryClient.invalidateQueries({queryKey: ['conversations']});
        queryClient.invalidateQueries({queryKey: ['unread-count']});
      }
    } catch (error) {
      console.error('Error polling for messages:', error);
    }
  }, [userId, otherUserId, onNewMessages, queryClient]);

  useEffect(() => {
    if (!userId || !otherUserId) return;

    // Start polling every 3 seconds
    pollingRef.current = setInterval(pollNewMessages, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [userId, otherUserId, pollNewMessages]);

  // Update the timestamp when needed (e.g., when initial messages are loaded)
  const updateLastTimestamp = useCallback((timestamp: string) => {
    lastTimestampRef.current = timestamp;
  }, []);

  return {updateLastTimestamp};
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      senderId,
      recipientId,
      content,
    }: {
      senderId: string;
      recipientId: string;
      content: string;
    }) => {
      const res = await apiClient.post(`${BASE}/send`, {
        senderId,
        recipientId,
        content,
      });
      return res.data as Message;
    },
    onSuccess: (_, variables) => {
      // Invalidate messages cache to show the new message
      queryClient.invalidateQueries({
        queryKey: ['messages', variables.senderId, variables.recipientId],
      });
      queryClient.invalidateQueries({queryKey: ['conversations']});
    },
  });
}

// Get list of conversations
export function useConversations(userId: string) {
  return useQuery<Conversation[], Error>({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      const res = await apiClient.get(`${BASE}/conversations?userId=${userId}`);
      return res.data;
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
}

// Get unread message count
export function useUnreadCount(userId: string) {
  return useQuery<number, Error>({
    queryKey: ['unread-count', userId],
    queryFn: async () => {
      const res = await apiClient.get(`${BASE}/unread-count?userId=${userId}`);
      return res.data.count;
    },
    enabled: !!userId,
    staleTime: 10000, // 10 seconds
  });
}
