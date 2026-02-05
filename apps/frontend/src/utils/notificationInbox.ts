// utils/notificationInbox.ts
// MULTI-ACCOUNT: All notification inbox operations are user-scoped

import {UserScopedStorage} from '../storage/userScopedStorage';
import {apiClient} from '../lib/apiClient';

export type AppNotification = {
  id: string;
  title?: string;
  message: string;
  timestamp: string;
  category?: 'news' | 'outfit' | 'weather' | 'care' | 'message' | 'other';
  deeplink?: string;
  data?: Record<string, string>;
  read?: boolean;
};

const INBOX_KEY = 'notificationInbox';
const cap = 200;

// 🔔 Simple subscriber system for live updates
let subscribers: (() => void)[] = [];

export function subscribeInboxChange(cb: () => void) {
  subscribers.push(cb);
  return () => {
    subscribers = subscribers.filter(fn => fn !== cb);
  };
}

function notifySubscribers() {
  subscribers.forEach(fn => fn());
}

/**
 * Load inbox from user-scoped storage and merge with backend
 */
export async function loadInbox(userId: string): Promise<AppNotification[]> {
  if (!userId) {
    console.warn('[notificationInbox] loadInbox called without userId');
    return [];
  }

  // First load from user-scoped local storage
  const raw = await UserScopedStorage.getItem(userId, INBOX_KEY);
  const local: AppNotification[] = raw ? JSON.parse(raw) : [];

  // Also fetch from backend and merge
  try {
    const res = await apiClient.get('/notifications/inbox');
    const remote: AppNotification[] = res.data;
    // Merge: combine remote + local, dedupe by id
    const merged = [...remote, ...local];
    const seen = new Set<string>();
    const deduped = merged.filter(n => {
      const key = n.id || `${n.title}-${n.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Save merged list locally (user-scoped)
    await UserScopedStorage.setItem(userId, INBOX_KEY, JSON.stringify(deduped.slice(0, cap)));
    return deduped;
  } catch (err) {
    console.warn('⚠️ Failed to fetch notifications from backend:', err);
  }

  return local;
}

/**
 * Save inbox to user-scoped storage
 */
export async function saveInbox(userId: string, list: AppNotification[]) {
  if (!userId) {
    console.warn('[notificationInbox] saveInbox called without userId');
    return;
  }

  // ✅ Deduplicate before saving
  const seen = new Set<string>();
  const deduped = list.filter(n => {
    const key = n.id || `${n.title}-${n.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await UserScopedStorage.setItem(userId, INBOX_KEY, JSON.stringify(deduped.slice(0, cap)));
  notifySubscribers(); // 🔥 Notify listeners whenever inbox changes
}

/**
 * ✅ Adds a notification to the local inbox (user-scoped)
 * ✅ And also mirrors it to your backend (optional best practice)
 */
export async function addToInbox(userId: string, n: AppNotification & {user_id?: string}) {
  if (!userId) {
    console.warn('[notificationInbox] addToInbox called without userId');
    return;
  }

  console.log('📥 addToInbox called with:', {
    id: n.id,
    title: n.title,
    category: n.category,
    dataType: n.data?.type,
  });

  const list = await loadInbox(userId);
  console.log('📋 Current inbox count:', list.length);

  // ✅ Skip duplicates locally
  const duplicate = list.find(
    x => x.id === n.id || (x.title === n.title && x.message === n.message),
  );
  if (duplicate) {
    console.log('⚠️ Skipping duplicate notification:', n.id || n.title);
    return;
  }

  const next = [n, ...list].slice(0, cap);
  await saveInbox(userId, next);
  console.log('✅ Notification saved! New inbox count:', next.length);

  // 🆕 Mirror notification to backend (non-breaking optional best practice)
  try {
    if (n.user_id) {
      await apiClient.post('/notifications/save', n);
      console.log('☁️ Notification mirrored to backend');
    }
  } catch (err) {
    console.warn('⚠️ Failed to persist notification to backend:', err);
  }
}

export async function markRead(userId: string, id: string) {
  if (!userId) {
    console.warn('[notificationInbox] markRead called without userId');
    return;
  }

  // First mark as read in backend
  try {
    await apiClient.post('/notifications/mark-read', {id});
  } catch (err) {
    console.warn('⚠️ Failed to mark read in backend:', err);
  }

  // Then update local storage
  const list = await loadInbox(userId);
  const updated = list.map(n => (n.id === id ? {...n, read: true} : n));
  await saveInbox(userId, updated);
}

/**
 * Delete a single notification from inbox
 */
export async function deleteFromInbox(userId: string, id: string) {
  if (!userId) {
    console.warn('[notificationInbox] deleteFromInbox called without userId');
    return;
  }

  // First delete from backend
  try {
    await apiClient.post('/notifications/delete', {id});
    console.log('☁️ Notification deleted from backend:', id);
  } catch (err) {
    console.warn('⚠️ Failed to delete from backend:', err);
  }

  // Then remove from local storage
  const list = await loadInbox(userId);
  const filtered = list.filter(n => n.id !== id);
  await saveInbox(userId, filtered);
  console.log('🗑️ Notification deleted locally:', id);
}

export async function markAllRead(userId: string) {
  if (!userId) {
    console.warn('[notificationInbox] markAllRead called without userId');
    return;
  }

  // First mark all as read in backend (await it!)
  try {
    await apiClient.post('/notifications/mark-all-read', {});
    console.log('☁️ Backend mark-all-read completed');
  } catch (err) {
    console.warn('⚠️ Failed to mark all read in backend:', err);
  }

  // Then update local storage
  const list = await loadInbox(userId);
  await saveInbox(userId, list.map(n => ({...n, read: true})));
}

export async function clearAll(userId: string) {
  if (!userId) {
    console.warn('[notificationInbox] clearAll called without userId');
    return;
  }

  // First clear from backend
  try {
    await apiClient.post('/notifications/clear-all', {});
    console.log('☁️ Backend clear-all completed');
  } catch (err) {
    console.warn('⚠️ Failed to clear all in backend:', err);
  }

  // Then clear local storage (user-scoped)
  await UserScopedStorage.removeItem(userId, INBOX_KEY);
  notifySubscribers();
}
