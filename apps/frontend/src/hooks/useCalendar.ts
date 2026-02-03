import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '../lib/apiClient';

const CALENDAR_BASE = '/calendar';
const SCHEDULED_OUTFITS_BASE = '/scheduled-outfits';
const OUTFIT_BASE = '/outfit';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface CalendarEvent {
  event_id: string;
  id?: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  location?: string;
  notes?: string;
  ios_event_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduledOutfitData {
  id: string;
  ai_outfit_id?: string;
  custom_outfit_id?: string;
  scheduled_for: string;
}

export interface NormalizedOutfitItem {
  id: string;
  image: string;
  name?: string;
}

export interface NormalizedOutfit {
  id: string;
  name?: string;
  plannedDate: string;
  type: 'ai' | 'custom';
  top?: NormalizedOutfitItem | null;
  bottom?: NormalizedOutfitItem | null;
  shoes?: NormalizedOutfitItem | null;
  allItems?: NormalizedOutfitItem[];
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// Calendar Events Hooks
// ─────────────────────────────────────────────────────────────

/**
 * Fetch calendar events for a user
 */
export function useCalendarEvents(userId: string) {
  return useQuery<CalendarEvent[], Error>({
    queryKey: ['calendar-events', userId],
    queryFn: async () => {
      const res = await apiClient.get(`${CALENDAR_BASE}/user`);
      return res.data.events || [];
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Create a new calendar event
 */
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      title,
      startDate,
      endDate,
      location,
      notes,
    }: {
      userId: string;
      title: string;
      startDate: string;
      endDate: string;
      location?: string;
      notes?: string;
    }) => {
      const res = await apiClient.post(`${CALENDAR_BASE}/event`, {
        user_id: userId,
        title,
        start_date: startDate,
        end_date: endDate,
        location,
        notes,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      if (data.ok && data.event) {
        // Optimistically add the new event to the cache
        queryClient.setQueryData<CalendarEvent[]>(
          ['calendar-events', variables.userId],
          (old) => {
            const newEvent: CalendarEvent = {
              ...data.event,
              event_id: data.event.event_id,
              id: data.event.event_id,
              start_date: data.event.start_date
                ? new Date(data.event.start_date).toISOString()
                : variables.startDate,
              end_date: data.event.end_date
                ? new Date(data.event.end_date).toISOString()
                : variables.endDate,
            };
            return old ? [...old, newEvent] : [newEvent];
          },
        );
      }
    },
  });
}

/**
 * Delete a calendar event
 */
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      eventId,
    }: {
      userId: string;
      eventId: string;
    }) => {
      const res = await apiClient.delete(
        `${CALENDAR_BASE}/event/${eventId}`,
      );
      return {deleted: res.data.deleted, eventId, userId};
    },
    onMutate: async ({userId, eventId}) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({queryKey: ['calendar-events', userId]});

      // Snapshot previous value
      const previousEvents = queryClient.getQueryData<CalendarEvent[]>([
        'calendar-events',
        userId,
      ]);

      // Optimistically remove from cache
      queryClient.setQueryData<CalendarEvent[]>(
        ['calendar-events', userId],
        (old) => old?.filter((e) => (e.event_id || e.id) !== eventId),
      );

      return {previousEvents, userId};
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousEvents) {
        queryClient.setQueryData(
          ['calendar-events', variables.userId],
          context.previousEvents,
        );
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Scheduled Outfits Hooks
// ─────────────────────────────────────────────────────────────

/**
 * Fetch scheduled outfits for a user (combines AI outfits, custom outfits, and schedule data)
 */
export function useScheduledOutfits(userId: string, apiBaseUrl: string) {
  return useQuery<NormalizedOutfit[], Error>({
    queryKey: ['scheduled-outfits', userId],
    queryFn: async () => {
      // Fetch all three endpoints in parallel
      const [aiRes, customRes, scheduledRes] = await Promise.all([
        apiClient.get(`${OUTFIT_BASE}/suggestions`),
        apiClient.get(`${OUTFIT_BASE}/custom`),
        apiClient.get(`${SCHEDULED_OUTFITS_BASE}`),
      ]);

      const aiData = aiRes.data;
      const customData = customRes.data;
      const scheduledData: ScheduledOutfitData[] = scheduledRes.data;

      // Build schedule map
      const scheduleMap: Record<string, string> = {};
      for (const s of scheduledData) {
        if (s.ai_outfit_id) scheduleMap[s.ai_outfit_id] = s.scheduled_for;
        else if (s.custom_outfit_id)
          scheduleMap[s.custom_outfit_id] = s.scheduled_for;
      }

      const normalizeImageUrl = (url?: string | null) =>
        url?.startsWith('http') ? url : `${apiBaseUrl}${url || ''}`;

      const normalize = (o: any, isCustom: boolean): NormalizedOutfit | null => {
        const plannedDate = scheduleMap[o.id];
        if (!plannedDate) return null;

        const top = o.top ? {...o.top, image: normalizeImageUrl(o.top.image)} : null;
        const bottom = o.bottom
          ? {...o.bottom, image: normalizeImageUrl(o.bottom.image)}
          : null;
        const shoes = o.shoes
          ? {...o.shoes, image: normalizeImageUrl(o.shoes.image)}
          : null;

        // Build allItems: use existing array if available (custom outfits), otherwise construct from top/bottom/shoes
        let allItems: NormalizedOutfitItem[];
        if (o.allItems && Array.isArray(o.allItems)) {
          // Custom outfits with allItems from backend - normalize image URLs
          allItems = o.allItems
            .filter((item: any) => item?.id && item?.image)
            .map((item: any) => ({
              id: item.id,
              name: item.name,
              image: normalizeImageUrl(item.image),
            }));
        } else {
          // AI outfits - build from top/bottom/shoes
          allItems = [top, bottom, shoes].filter(
            (item): item is NormalizedOutfitItem => item !== null && !!item.image,
          );
        }

        return {
          ...o,
          plannedDate,
          type: isCustom ? 'custom' : 'ai',
          top,
          bottom,
          shoes,
          allItems,
        };
      };

      const outfits = [
        ...aiData.map((o: any) => normalize(o, false)),
        ...customData.map((o: any) => normalize(o, true)),
      ].filter(Boolean) as NormalizedOutfit[];

      return outfits;
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Delete a scheduled outfit
 */
export function useDeleteScheduledOutfit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      outfitId,
    }: {
      userId: string;
      outfitId: string;
    }) => {
      const res = await apiClient.delete(SCHEDULED_OUTFITS_BASE, {
        data: {user_id: userId, outfit_id: outfitId},
      });
      return {outfitId, userId, success: res.status === 200};
    },
    onMutate: async ({userId, outfitId}) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['scheduled-outfits', userId],
      });

      // Snapshot previous value
      const previousOutfits = queryClient.getQueryData<NormalizedOutfit[]>([
        'scheduled-outfits',
        userId,
      ]);

      // Optimistically remove from cache
      queryClient.setQueryData<NormalizedOutfit[]>(
        ['scheduled-outfits', userId],
        (old) => old?.filter((o) => o.id !== outfitId),
      );

      return {previousOutfits, userId};
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousOutfits) {
        queryClient.setQueryData(
          ['scheduled-outfits', variables.userId],
          context.previousOutfits,
        );
      }
    },
  });
}

/**
 * Sync deleted outfit events (for events deleted in iOS Calendar)
 */
export function useSyncDeletedOutfitEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      outfitId,
    }: {
      userId: string;
      outfitId: string;
    }) => {
      const res = await apiClient.delete(SCHEDULED_OUTFITS_BASE, {
        data: {user_id: userId, outfit_id: outfitId},
      });
      return {outfitId, userId};
    },
    onSuccess: (_, variables) => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: ['scheduled-outfits', variables.userId],
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Utility hooks for cache management
// ─────────────────────────────────────────────────────────────

/**
 * Hook to get query client for manual cache operations
 */
export function useCalendarQueryClient() {
  return useQueryClient();
}

/**
 * Invalidate all calendar-related queries for a user
 */
export function useInvalidateCalendarData() {
  const queryClient = useQueryClient();

  return (userId: string) => {
    queryClient.invalidateQueries({queryKey: ['calendar-events', userId]});
    queryClient.invalidateQueries({queryKey: ['scheduled-outfits', userId]});
  };
}
