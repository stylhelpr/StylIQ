// apps/mobile/src/storage/notifications.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppNotification = {
  id: string;
  title?: string;
  message: string;
  timestamp: string; // ISO
  read?: boolean;
  category?: 'news' | 'outfit' | 'weather' | 'care' | 'other';
  deeplink?: string; // e.g. myapp://news/123
  data?: Record<string, string>;
};

const key = (userId: string) => `notifications:${userId}`;
const rid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ---- lightweight pub/sub so screens can live-update ----
type Listener = (list: AppNotification[]) => void;
const listeners = new Set<Listener>();
function emit(list: AppNotification[]) {
  for (const fn of Array.from(listeners)) fn(list);
}
export function subscribeNotifications(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---- utils ----
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
function sortDesc(a: AppNotification, b: AppNotification) {
  return a.timestamp < b.timestamp ? 1 : -1;
}

// ---- API ----
export async function loadNotifications(
  userId: string,
): Promise<AppNotification[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  const list = (safeParse<AppNotification[]>(raw) ?? []).sort(sortDesc);
  return list;
}

async function save(userId: string, list: AppNotification[]) {
  const sorted = [...list].sort(sortDesc);
  await AsyncStorage.setItem(key(userId), JSON.stringify(sorted));
  emit(sorted);
}

export async function addNotification(
  userId: string,
  n: Partial<AppNotification>,
) {
  if (!userId) return;
  const list = await loadNotifications(userId);

  // primary dedupe by id, secondary dedupe by deeplink+message
  const id = n.id ?? rid();
  const exists =
    list.some(x => x.id === id) ||
    (!!n.deeplink &&
      !!n.message &&
      list.some(x => x.deeplink === n.deeplink && x.message === n.message));
  if (exists) return;

  const item: AppNotification = {
    id,
    title: n.title?.toString(),
    message: (n.message ?? '').toString(),
    timestamp: n.timestamp ?? new Date().toISOString(),
    read: false,
    category: (n.category as AppNotification['category']) ?? 'other',
    deeplink: n.deeplink,
    data: n.data ?? {},
  };

  const next = [item, ...list].slice(0, 200); // cap to last 200
  await save(userId, next);
}

export async function markRead(userId: string, id: string) {
  const list = await loadNotifications(userId);
  const next = list.map(n => (n.id === id ? {...n, read: true} : n));
  await save(userId, next);
}

export async function markAllRead(userId: string) {
  const list = await loadNotifications(userId);
  await save(
    userId,
    list.map(n => ({...n, read: true})),
  );
}

export async function clearAll(userId: string) {
  await AsyncStorage.removeItem(key(userId));
  emit([]);
}

export async function getUnreadCount(userId: string) {
  const list = await loadNotifications(userId);
  return list.filter(n => !n.read).length;
}

///////////////////

// import AsyncStorage from '@react-native-async-storage/async-storage';

// export type AppNotification = {
//   id: string;
//   title?: string;
//   message: string;
//   timestamp: string; // ISO
//   read?: boolean;
//   category?: 'news' | 'outfit' | 'weather' | 'care' | 'other';
//   deeplink?: string; // e.g. myapp://news/123
//   data?: Record<string, string>;
// };

// const key = (userId: string) => `notifications:${userId}`;

// const rid = () =>
//   `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// export async function loadNotifications(
//   userId: string,
// ): Promise<AppNotification[]> {
//   const raw = await AsyncStorage.getItem(key(userId));
//   return raw ? JSON.parse(raw) : [];
// }

// async function save(userId: string, list: AppNotification[]) {
//   await AsyncStorage.setItem(key(userId), JSON.stringify(list));
// }

// export async function addNotification(
//   userId: string,
//   n: Partial<AppNotification>,
// ) {
//   if (!userId) return;
//   const list = await loadNotifications(userId);

//   const id = n.id ?? rid();
//   if (list.some(x => x.id === id)) return; // dedupe by id

//   const item: AppNotification = {
//     id,
//     title: n.title,
//     message: n.message ?? '',
//     timestamp: n.timestamp ?? new Date().toISOString(),
//     read: false,
//     category: (n.category as AppNotification['category']) ?? 'other',
//     deeplink: n.deeplink,
//     data: n.data ?? {},
//   };

//   const next = [item, ...list].slice(0, 200); // cap
//   await save(userId, next);
// }

// export async function markRead(userId: string, id: string) {
//   const list = await loadNotifications(userId);
//   const next = list.map(n => (n.id === id ? {...n, read: true} : n));
//   await save(userId, next);
// }

// export async function markAllRead(userId: string) {
//   const list = await loadNotifications(userId);
//   await save(
//     userId,
//     list.map(n => ({...n, read: true})),
//   );
// }

// export async function clearAll(userId: string) {
//   await AsyncStorage.removeItem(key(userId));
// }
