import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';

const NOTIFICATIONS_BASE = '/notifications';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  push_enabled: boolean;
  following_realtime: boolean;
  brands_realtime: boolean;
  breaking_realtime: boolean;
  digest_hour: number;
}

// ─────────────────────────────────────────────────────────────
// Followed Sources Hook
// ─────────────────────────────────────────────────────────────

/**
 * Fetch the list of sources the user is following for notifications
 */
export function useFollowedSources(userId: string) {
  return useQuery<Set<string>, Error>({
    queryKey: ['notification-follows', userId],
    queryFn: async () => {
      const res = await apiClient.get(
        `${NOTIFICATIONS_BASE}/follows?user_id=${encodeURIComponent(userId)}`,
      );
      const list: string[] = Array.isArray(res.data?.sources)
        ? res.data.sources
        : [];
      return new Set(list.map(s => s.toLowerCase()));
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Follow a notification source
 */
export function useFollowSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({userId, source}: {userId: string; source: string}) => {
      await apiClient.post(`${NOTIFICATIONS_BASE}/follow`, {
        user_id: userId,
        source,
      });
      return {userId, source};
    },
    onMutate: async ({userId, source}) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['notification-follows', userId],
      });

      // Snapshot previous value
      const previousFollows = queryClient.getQueryData<Set<string>>([
        'notification-follows',
        userId,
      ]);

      // Optimistically add to follows
      queryClient.setQueryData<Set<string>>(
        ['notification-follows', userId],
        old => {
          const newSet = new Set(old);
          newSet.add(source.toLowerCase());
          return newSet;
        },
      );

      return {previousFollows, userId};
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousFollows) {
        queryClient.setQueryData(
          ['notification-follows', variables.userId],
          context.previousFollows,
        );
      }
    },
  });
}

/**
 * Unfollow a notification source
 */
export function useUnfollowSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({userId, source}: {userId: string; source: string}) => {
      await apiClient.post(`${NOTIFICATIONS_BASE}/unfollow`, {
        user_id: userId,
        source,
      });
      return {userId, source};
    },
    onMutate: async ({userId, source}) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['notification-follows', userId],
      });

      // Snapshot previous value
      const previousFollows = queryClient.getQueryData<Set<string>>([
        'notification-follows',
        userId,
      ]);

      // Optimistically remove from follows
      queryClient.setQueryData<Set<string>>(
        ['notification-follows', userId],
        old => {
          const newSet = new Set(old);
          newSet.delete(source.toLowerCase());
          return newSet;
        },
      );

      return {previousFollows, userId};
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousFollows) {
        queryClient.setQueryData(
          ['notification-follows', variables.userId],
          context.previousFollows,
        );
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Notification Preferences Hook
// ─────────────────────────────────────────────────────────────

/**
 * Fetch notification preferences for a user
 */
export function useNotificationPreferences(userId: string) {
  return useQuery<NotificationPreferences, Error>({
    queryKey: ['notification-preferences', userId],
    queryFn: async () => {
      // Try GET first, then POST to create if needed
      let res;
      try {
        res = await apiClient.get(
          `${NOTIFICATIONS_BASE}/preferences/get?user_id=${encodeURIComponent(userId)}`,
        );
      } catch {
        // Create preferences if they don't exist
        res = await apiClient.post(`${NOTIFICATIONS_BASE}/preferences`, {
          user_id: userId,
        });
      }

      const json = res.data;
      return {
        push_enabled: json.push_enabled ?? true,
        following_realtime: json.following_realtime ?? false,
        brands_realtime: json.brands_realtime ?? false,
        breaking_realtime: json.breaking_realtime ?? true,
        digest_hour: Number(json.digest_hour ?? 8),
      };
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      preferences,
    }: {
      userId: string;
      preferences: Partial<NotificationPreferences>;
    }) => {
      await apiClient.post(`${NOTIFICATIONS_BASE}/preferences`, {
        user_id: userId,
        ...preferences,
      });
      return {userId, preferences};
    },
    onMutate: async ({userId, preferences}) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['notification-preferences', userId],
      });

      // Snapshot previous value
      const previousPrefs = queryClient.getQueryData<NotificationPreferences>([
        'notification-preferences',
        userId,
      ]);

      // Optimistically update preferences
      queryClient.setQueryData<NotificationPreferences>(
        ['notification-preferences', userId],
        old =>
          old
            ? {...old, ...preferences}
            : {
                push_enabled: true,
                following_realtime: false,
                brands_realtime: false,
                breaking_realtime: true,
                digest_hour: 8,
                ...preferences,
              },
      );

      return {previousPrefs, userId};
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousPrefs) {
        queryClient.setQueryData(
          ['notification-preferences', variables.userId],
          context.previousPrefs,
        );
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Preferred Brands Hook
// ─────────────────────────────────────────────────────────────

/**
 * Fetch preferred brands from style profile
 */
export function usePreferredBrands(userId: string) {
  return useQuery<string[], Error>({
    queryKey: ['preferred-brands', userId],
    queryFn: async () => {
      const res = await apiClient.get('/style-profile/brands');
      return Array.isArray(res.data.brands) ? res.data.brands : [];
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute
  });
}

// ─────────────────────────────────────────────────────────────
// Send Test Notification
// ─────────────────────────────────────────────────────────────

/**
 * Send a test push notification
 */
export function useSendTestNotification() {
  return useMutation({
    mutationFn: async ({
      userId,
      title,
      body,
      data,
    }: {
      userId: string;
      title: string;
      body: string;
      data: Record<string, any>;
    }) => {
      const res = await apiClient.post(`${NOTIFICATIONS_BASE}/test`, {
        user_id: userId,
        title,
        body,
        data,
      });
      return res.data;
    },
  });
}
