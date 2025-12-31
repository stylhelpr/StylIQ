// utils/notificationInbox.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const INBOX_KEY = 'notifications';
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

export async function loadInbox(userId?: string): Promise<AppNotification[]> {
  // First load from local storage
  const raw = await AsyncStorage.getItem(INBOX_KEY);
  const local: AppNotification[] = raw ? JSON.parse(raw) : [];

  // If we have a userId, also fetch from backend and merge
  if (userId) {
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
      // Save merged list locally
      await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(deduped.slice(0, cap)));
      return deduped;
    } catch (err) {
      console.warn('⚠️ Failed to fetch notifications from backend:', err);
    }
  }

  return local;
}

export async function saveInbox(list: AppNotification[]) {
  // ✅ Deduplicate before saving
  const seen = new Set<string>();
  const deduped = list.filter(n => {
    const key = n.id || `${n.title}-${n.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(deduped.slice(0, cap)));
  notifySubscribers(); // 🔥 Notify listeners whenever inbox changes
}

/**
 * ✅ Adds a notification to the local inbox (AsyncStorage)
 * ✅ And also mirrors it to your backend (optional best practice)
 */
export async function addToInbox(n: AppNotification & {user_id?: string}) {
  console.log('📥 addToInbox called with:', {
    id: n.id,
    title: n.title,
    category: n.category,
    dataType: n.data?.type,
  });

  const list = await loadInbox();
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
  await saveInbox(next);
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
  // First mark as read in backend
  try {
    await apiClient.post('/notifications/mark-read', {id});
  } catch (err) {
    console.warn('⚠️ Failed to mark read in backend:', err);
  }

  // Then update local storage
  const list = await loadInbox(userId);
  const updated = list.map(n => (n.id === id ? {...n, read: true} : n));
  await saveInbox(updated);
}

export async function markAllRead(userId: string) {
  // First mark all as read in backend (await it!)
  try {
    await apiClient.post('/notifications/mark-all-read', {});
    console.log('☁️ Backend mark-all-read completed');
  } catch (err) {
    console.warn('⚠️ Failed to mark all read in backend:', err);
  }

  // Then update local storage
  const list = await loadInbox(userId);
  await saveInbox(list.map(n => ({...n, read: true})));
}

export async function clearAll(userId: string) {
  // First clear from backend
  try {
    await apiClient.post('/notifications/clear-all', {});
    console.log('☁️ Backend clear-all completed');
  } catch (err) {
    console.warn('⚠️ Failed to clear all in backend:', err);
  }

  // Then clear local storage
  await AsyncStorage.removeItem(INBOX_KEY);
  notifySubscribers();
}

////////////////////

// // utils/notificationInbox.ts
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export type AppNotification = {
//   id: string;
//   title?: string;
//   message: string;
//   timestamp: string;
//   category?: 'news' | 'outfit' | 'weather' | 'care' | 'other';
//   deeplink?: string;
//   data?: Record<string, string>;
//   read?: boolean;
// };

// const INBOX_KEY = 'notifications';
// const cap = 200;

// // 🔔 Simple subscriber system for live updates
// let subscribers: (() => void)[] = [];

// export function subscribeInboxChange(cb: () => void) {
//   subscribers.push(cb);
//   return () => {
//     subscribers = subscribers.filter(fn => fn !== cb);
//   };
// }

// function notifySubscribers() {
//   subscribers.forEach(fn => fn());
// }

// export async function loadInbox(): Promise<AppNotification[]> {
//   const raw = await AsyncStorage.getItem(INBOX_KEY);
//   return raw ? JSON.parse(raw) : [];
// }

// export async function saveInbox(list: AppNotification[]) {
//   // ✅ Deduplicate before saving
//   const seen = new Set<string>();
//   const deduped = list.filter(n => {
//     const key = n.id || `${n.title}-${n.message}`;
//     if (seen.has(key)) return false;
//     seen.add(key);
//     return true;
//   });

//   await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(deduped.slice(0, cap)));
//   notifySubscribers(); // 🔥 Notify listeners whenever inbox changes
// }

// export async function addToInbox(n: AppNotification) {
//   const list = await loadInbox();

//   // ✅ Skip duplicates
//   const duplicate = list.find(
//     x => x.id === n.id || (x.title === n.title && x.message === n.message),
//   );
//   if (duplicate) {
//     console.log('⚠️ Skipping duplicate notification:', n.id || n.title);
//     return;
//   }

//   const next = [n, ...list].slice(0, cap);
//   await saveInbox(next);
// }

// export async function markRead(userId: string, id: string) {
//   const list = await loadInbox();
//   const updated = list.map(n => (n.id === id ? {...n, read: true} : n));
//   await saveInbox(updated);
// }

// export async function markAllRead() {
//   const list = await loadInbox();
//   await saveInbox(list.map(n => ({...n, read: true})));
// }

// export async function clearAll() {
//   await AsyncStorage.removeItem(INBOX_KEY);
//   notifySubscribers(); // ✅ Also notify listeners here
// }
