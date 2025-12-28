// Pure TypeScript service (NO React hooks)

import AsyncStorage from '@react-native-async-storage/async-storage';

// UUID v4 generator that works in React Native (no crypto.getRandomValues needed)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface QueuedEvent {
  client_event_id: string; // UUID v4 (idempotency key)
  event_type: string;
  event_ts: string; // ISO 8601
  canonical_url: string;
  domain: string;
  title_sanitized?: string;
  session_id?: string;
  payload: Record<string, any>;
  is_sent: boolean;
  attempt_count: number;
  last_error?: string;
  last_attempt_at?: number;
  created_at: number;
}

/**
 * In-memory queue with AsyncStorage persistence.
 *
 * Note: For production scale (1M+ events), use SQLite.
 * For MVP, AsyncStorage is acceptable with caveat:
 * - Not transactional across multiple keys
 * - Sync failures require manual retry
 */
export class AnalyticsQueueService {
  private static readonly QUEUE_KEY = 'analytics-queue';
  private events: QueuedEvent[] = [];
  private isLoaded = false;

  /**
   * Load queue from AsyncStorage (call once on app start).
   */
  async load() {
    try {
      const data = await AsyncStorage.getItem(AnalyticsQueueService.QUEUE_KEY);
      this.events = data ? JSON.parse(data) : [];
      this.isLoaded = true;
      // console.log(
      //   `[AnalyticsQueue] Loaded ${this.events.length} events from storage`,
      // );
    } catch (err) {
      // console.error(`[AnalyticsQueue] Load failed: ${err.message}`);
      this.events = [];
      this.isLoaded = true;
    }
  }

  /**
   * Queue a new event (before sync).
   */
  queueEvent(
    event: Omit<
      QueuedEvent,
      'client_event_id' | 'is_sent' | 'attempt_count' | 'created_at'
    >,
  ): QueuedEvent {
    const queuedEvent: QueuedEvent = {
      ...event,
      client_event_id: generateUUID(), // ✅ Generate UUID here (React Native compatible)
      is_sent: false,
      attempt_count: 0,
      created_at: Date.now(),
    };

    // console.log('[AnalyticsQueue] 📥 Event queued:', queuedEvent.event_type, queuedEvent.client_event_id);

    this.events.push(queuedEvent);
    this.persist();
    // console.log('[AnalyticsQueue] 💾 Total events in queue:', this.events.length);
    return queuedEvent;
  }

  /**
   * Get pending events (not yet sent).
   */
  getPendingEvents(): QueuedEvent[] {
    return this.events.filter((e) => !e.is_sent && e.attempt_count < 10);
  }

  /**
   * Mark events as sent (by client_event_id).
   */
  markAsSent(clientEventIds: string[]) {
    const clientIdSet = new Set(clientEventIds);
    for (const event of this.events) {
      if (clientIdSet.has(event.client_event_id)) {
        event.is_sent = true;
      }
    }
    this.persist();
  }

  /**
   * Mark event as failed and increment retry count.
   */
  markFailed(clientEventId: string, error: string) {
    const event = this.events.find((e) => e.client_event_id === clientEventId);
    if (event) {
      event.attempt_count++;
      event.last_error = error;
      event.last_attempt_at = Date.now();
      this.persist();
    }
  }

  /**
   * Clear entire queue (used on GDPR delete or consent decline).
   */
  clear() {
    this.events = [];
    this.persist();
    // console.log('[AnalyticsQueue] Queue cleared');
  }

  /**
   * Persist to AsyncStorage.
   */
  private async persist() {
    try {
      await AsyncStorage.setItem(
        AnalyticsQueueService.QUEUE_KEY,
        JSON.stringify(this.events),
      );
    } catch (err) {
      // console.error(`[AnalyticsQueue] Persist failed: ${err.message}`);
    }
  }
}

export const analyticsQueue = new AnalyticsQueueService();
