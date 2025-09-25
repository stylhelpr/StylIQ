// utils/notificationInbox.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppNotification = {
  id: string;
  title?: string;
  message: string;
  timestamp: string;
  category?: 'news' | 'outfit' | 'weather' | 'care' | 'other';
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

export async function loadInbox(): Promise<AppNotification[]> {
  const raw = await AsyncStorage.getItem(INBOX_KEY);
  return raw ? JSON.parse(raw) : [];
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

export async function addToInbox(n: AppNotification) {
  const list = await loadInbox();

  // ✅ Skip duplicates
  const duplicate = list.find(
    x => x.id === n.id || (x.title === n.title && x.message === n.message),
  );
  if (duplicate) {
    console.log('⚠️ Skipping duplicate notification:', n.id || n.title);
    return;
  }

  const next = [n, ...list].slice(0, cap);
  await saveInbox(next);
}

export async function markRead(userId: string, id: string) {
  const list = await loadInbox();
  const updated = list.map(n => (n.id === id ? {...n, read: true} : n));
  await saveInbox(updated);
}

export async function markAllRead() {
  const list = await loadInbox();
  await saveInbox(list.map(n => ({...n, read: true})));
}

export async function clearAll() {
  await AsyncStorage.removeItem(INBOX_KEY);
  notifySubscribers(); // ✅ Also notify listeners here
}

/////////////////////

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

// export async function loadInbox(): Promise<AppNotification[]> {
//   const raw = await AsyncStorage.getItem(INBOX_KEY);
//   return raw ? JSON.parse(raw) : [];
// }

// export async function saveInbox(list: AppNotification[]) {
//   // ✅ Always enforce uniqueness before saving
//   const seen = new Set<string>();
//   const deduped = list.filter(n => {
//     const key = n.id || `${n.title}-${n.message}`;
//     if (seen.has(key)) return false;
//     seen.add(key);
//     return true;
//   });
//   await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(deduped.slice(0, cap)));
// }

// export async function addToInbox(n: AppNotification) {
//   const list = await loadInbox();

//   // ✅ Don’t add duplicates by ID or by same message text
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
// }

///////////////////

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

// export async function loadInbox(): Promise<AppNotification[]> {
//   const raw = await AsyncStorage.getItem(INBOX_KEY);
//   return raw ? JSON.parse(raw) : [];
// }

// export async function saveInbox(list: AppNotification[]) {
//   await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(list));
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
// }
