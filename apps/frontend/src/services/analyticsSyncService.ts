// Pure TypeScript service (NO React hooks)

import { analyticsQueue, QueuedEvent } from './analyticsQueue';
import { LOCAL_IP } from '../config/localIP';

const BATCH_SIZE = 500;
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB
const BACKOFF_DELAYS = [1000, 2000, 5000, 10000, 30000, 60000]; // Max 10 retries

export class AnalyticsSyncService {
  /**
   * Sync pending analytics events to backend.
   *
   * Guarantees:
   * - Only syncs if tracking consent is 'accepted'
   * - Idempotent (uses client_event_id as key)
   * - Retry with exponential backoff
   * - Mark sent only after server ACK
   */
  static async syncEvents(
    authToken: string, // JWT from Auth0
    trackingConsent: 'accepted' | 'declined' | 'pending',
  ): Promise<{ accepted: number; duplicates: number; rejected: number }> {
    console.log('[Analytics Sync] 🚀 SYNC STARTED', { trackingConsent, hasAuthToken: !!authToken });

    // ✅ CONSENT GATE: Don't sync if not accepted
    if (trackingConsent !== 'accepted') {
      console.log('[Analytics Sync] ❌ Tracking not accepted, skipping sync');
      return { accepted: 0, duplicates: 0, rejected: 0 };
    }

    const pendingEvents = analyticsQueue.getPendingEvents();
    console.log('[Analytics Sync] 📦 Pending events:', pendingEvents.length);

    if (pendingEvents.length === 0) {
      console.log('[Analytics Sync] ⏭️ No pending events, skipping');
      return { accepted: 0, duplicates: 0, rejected: 0 };
    }

    let totalAccepted = 0;
    let totalDuplicates = 0;
    let totalRejected = 0;

    // Batch events (max 500 per request)
    for (let i = 0; i < pendingEvents.length; i += BATCH_SIZE) {
      const batch = pendingEvents.slice(i, i + BATCH_SIZE);
      const payloadSize = JSON.stringify(batch).length;

      if (payloadSize > MAX_PAYLOAD_SIZE) {
        console.warn(
          `[Analytics Sync] Batch ${i} exceeds max payload size, skipping`,
        );
        continue;
      }

      try {
        const ack = await this.sendBatch(authToken, batch);
        totalAccepted += ack.accepted_client_event_ids.length;
        totalDuplicates += ack.duplicate_count;
        totalRejected += ack.rejected.length;

        // ✅ Mark sent by client_event_id (deterministic)
        analyticsQueue.markAsSent(ack.accepted_client_event_ids);

        console.log(
          `[Analytics Sync] Batch ${i} sent: accepted=${ack.accepted_client_event_ids.length}, dup=${ack.duplicate_count}, rejected=${ack.rejected.length}`,
        );
      } catch (err) {
        console.error(`[Analytics Sync] Batch ${i} failed:`, err);

        // Retry failed events with backoff
        for (const event of batch) {
          analyticsQueue.markFailed(event.client_event_id, String(err));
          const backoffIndex = Math.min(
            event.attempt_count,
            BACKOFF_DELAYS.length - 1,
          );
          const delay = BACKOFF_DELAYS[backoffIndex];

          console.log(
            `[Analytics Sync] Retry scheduled for ${event.client_event_id} in ${delay}ms`,
          );

          // Schedule retry
          setTimeout(() => {
            this.syncEvents(authToken, trackingConsent);
          }, delay);
        }
      }
    }

    console.log(
      `[Analytics Sync Complete] accepted=${totalAccepted}, duplicates=${totalDuplicates}, rejected=${totalRejected}`,
    );

    return {
      accepted: totalAccepted,
      duplicates: totalDuplicates,
      rejected: totalRejected,
    };
  }

  /**
   * Send single batch to backend.
   */
  private static async sendBatch(
    authToken: string,
    events: QueuedEvent[],
  ): Promise<{
    accepted_client_event_ids: string[];
    duplicate_count: number;
    rejected: Array<{ client_event_id: string; reason: string }>;
    server_timestamp_ms: number;
  }> {
    const API_BASE_URL = `http://${LOCAL_IP}:3001`;

    // Use test endpoint in development (no auth required)
    // Switch to production endpoint when deploying
    const isDevelopment = __DEV__;
    const endpoint = isDevelopment
      ? `${API_BASE_URL}/api/shopping/analytics/test/events/batch`
      : `${API_BASE_URL}/api/shopping/analytics/events/batch`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Only add auth token for production endpoint
    if (!isDevelopment) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    console.log('[Analytics Sync] 📤 Sending', events.length, 'events to', isDevelopment ? 'TEST' : 'PROD', 'endpoint');

    // Filter out internal queue fields before sending to backend
    const cleanedEvents = events.map((event) => ({
      client_event_id: event.client_event_id,
      event_type: event.event_type,
      event_ts: event.event_ts,
      canonical_url: event.canonical_url,
      domain: event.domain,
      title_sanitized: event.title_sanitized,
      session_id: event.session_id,
      payload: event.payload,
    }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        events: cleanedEvents,
        client_id: 'device-id-or-session-uuid',
        client_batch_timestamp_ms: Date.now(),
      }),
    });

    console.log('[Analytics Sync] 📨 Response status:', response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Analytics Sync] ❌ HTTP error:', response.status, errText);
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const result = await response.json();
    console.log('[Analytics Sync] ✅ Response:', result);
    return result;
  }
}
