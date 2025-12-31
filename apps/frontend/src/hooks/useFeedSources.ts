import {useEffect, useMemo, useState, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiClient} from '../lib/apiClient';

export type FeedSource = {
  id: string; // stable id
  name: string; // human-friendly name
  url: string; // RSS/Atom url
  enabled: boolean; // whether to include in feed
  isDefault?: boolean; // optional flag to mark defaults
};

const STORAGE_KEY = '@fashion_feed_sources_v1';
const keyFor = (userId: string) => `${STORAGE_KEY}:${userId}`;

// 🌟 Default feeds shown to new users
const DEFAULT_SOURCES: FeedSource[] = [
  {
    id: 'vogue-uk',
    name: 'Vogue UK',
    url: 'https://www.vogue.co.uk/feed/rss',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'gq-style',
    name: 'GQ Style',
    url: 'https://www.gq.com/feed/rss',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'fashionista',
    name: 'Fashionista',
    url: 'https://fashionista.com/feed',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'fibre-2',
    name: 'Fibre2',
    url: 'https://feeds.feedburner.com/fibre2fashion/fashion-news',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'ny-mg',
    name: 'NY Mag',
    url: 'https://feeds.feedburner.com/nymag/fashion',
    enabled: true,
    isDefault: true,
  },
];

function idFor(url: string) {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname)
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  } catch {
    return 'id-' + Math.random().toString(36).slice(2);
  }
}

export function useFeedSources({userId}: {userId: string}) {
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧼 Reset state when user changes
  useEffect(() => {
    setSources([]);
    setLoading(true);
  }, [userId]);

  // 📥 Load feeds from backend, local storage, or defaults
  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        // 1️⃣ Try backend first
        let serverData: FeedSource[] | null = null;
        try {
          const res = await apiClient.get(`/users/${userId}/feed-sources`);
          serverData = res.data;
        } catch (err) {
          console.log('⚠️ Could not fetch server feed sources:', err);
        }

        if (serverData && Array.isArray(serverData) && serverData.length) {
          setSources(serverData);
          setLoading(false);
          return;
        }

        // 2️⃣ Try local storage
        const raw = await AsyncStorage.getItem(keyFor(userId));
        if (raw) {
          const saved: FeedSource[] = JSON.parse(raw);
          if (saved.length > 0) {
            setSources(saved);
            setLoading(false);
            return;
          }
        }

        // 3️⃣ Fallback: use defaults for brand-new users
        console.log('🌟 No feeds found — seeding default sources.');
        setSources(DEFAULT_SOURCES);
      } catch (err) {
        console.error('❌ Feed source load failed:', err);
        setSources(DEFAULT_SOURCES); // fallback even if request fails
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // 💾 Persist any source changes to local storage + backend
  useEffect(() => {
    if (loading) return;

    // Save to local
    AsyncStorage.setItem(keyFor(userId), JSON.stringify(sources)).catch(
      () => {},
    );

    // Save to backend
    (async () => {
      try {
        await apiClient.put(`/users/${userId}/feed-sources`, {sources});
      } catch (err) {
        console.log('⚠️ Failed to sync sources with server:', err);
      }
    })();
  }, [sources, loading, userId]);

  // 📊 Helpers
  const enabled = useMemo(() => sources.filter(s => s.enabled), [sources]);

  const addSource = useCallback(
    (name: string, url: string) => {
      const trimmed = url.trim();
      if (!/^https?:\/\//i.test(trimmed))
        throw new Error('Enter a valid http(s) URL');
      if (sources.some(s => s.url === trimmed))
        throw new Error('Feed already exists');

      const id = idFor(trimmed);
      setSources(prev => [
        ...prev,
        {id, name: name.trim() || trimmed, url: trimmed, enabled: true},
      ]);
    },
    [sources],
  );

  const toggleSource = useCallback((id: string, value: boolean) => {
    setSources(prev =>
      prev.map(s => (s.id === id ? {...s, enabled: value} : s)),
    );
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  }, []);

  const renameSource = useCallback((id: string, name: string) => {
    setSources(prev =>
      prev.map(s => (s.id === id ? {...s, name: name.trim() || s.name} : s)),
    );
  }, []);

  const resetToDefaults = useCallback(() => {
    console.log('🔄 Resetting feed sources to defaults');
    setSources(DEFAULT_SOURCES);
  }, []);

  return {
    sources,
    enabled,
    loading,
    addSource,
    toggleSource,
    removeSource,
    renameSource,
    resetToDefaults,
    setSources,
  };
}

///////////////

// import {useEffect, useMemo, useState, useCallback} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';

// export type FeedSource = {
//   id: string; // stable id
//   name: string; // human-friendly name
//   url: string; // RSS/Atom url
//   enabled: boolean; // whether to include in feed
// };

// const STORAGE_KEY = '@fashion_feed_sources_v1';
// const keyFor = (userId: string) => `${STORAGE_KEY}:${userId}`;

// // ⛔️ no defaults anymore for new users
// const DEFAULT_SOURCES: FeedSource[] = [];

// function idFor(url: string) {
//   try {
//     const u = new URL(url);
//     return (u.hostname + u.pathname)
//       .replace(/[^a-z0-9]+/gi, '-')
//       .replace(/^-+|-+$/g, '')
//       .toLowerCase();
//   } catch {
//     return 'id-' + Math.random().toString(36).slice(2);
//   }
// }

// export function useFeedSources({userId}: {userId: string}) {
//   const [sources, setSources] = useState<FeedSource[]>([]);
//   const [loading, setLoading] = useState(true);

//   // 🧼 clear state whenever user changes
//   useEffect(() => {
//     setSources([]);
//     setLoading(true);
//   }, [userId]);

//   // 📥 load feeds from server or local storage
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         // 1) server
//         let serverData: FeedSource[] | null = null;
//         try {
//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/feed-sources`,
//           );
//           if (res.ok) serverData = await res.json();
//         } catch {}

//         if (serverData && Array.isArray(serverData) && serverData.length) {
//           setSources(serverData);
//           setLoading(false);
//           return;
//         }

//         // 2) local
//         const raw = await AsyncStorage.getItem(keyFor(userId));
//         if (raw) {
//           const saved: FeedSource[] = JSON.parse(raw);
//           setSources(saved); // ✅ just what user saved — no merging
//           setLoading(false);
//           return;
//         }

//         // 3) fallback
//         setSources([]);
//       } catch {
//         setSources([]);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [userId]);

//   // 💾 persist to local + server whenever sources change
//   useEffect(() => {
//     if (loading) return;
//     AsyncStorage.setItem(keyFor(userId), JSON.stringify(sources)).catch(
//       () => {},
//     );
//     (async () => {
//       try {
//         await fetch(`${API_BASE_URL}/users/${userId}/feed-sources`, {
//           method: 'PUT',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({sources}),
//         });
//       } catch {}
//     })();
//   }, [sources, loading, userId]);

//   // helpers
//   const enabled = useMemo(() => sources.filter(s => s.enabled), [sources]);

//   const addSource = useCallback(
//     (name: string, url: string) => {
//       const trimmed = url.trim();
//       if (!/^https?:\/\//i.test(trimmed))
//         throw new Error('Enter a valid http(s) URL');
//       if (sources.some(s => s.url === trimmed))
//         throw new Error('Feed already exists');
//       const id = idFor(trimmed);
//       setSources(prev => [
//         ...prev,
//         {id, name: name.trim() || trimmed, url: trimmed, enabled: true},
//       ]);
//     },
//     [sources],
//   );

//   const toggleSource = useCallback((id: string, value: boolean) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, enabled: value} : s)),
//     );
//   }, []);

//   const removeSource = useCallback((id: string) => {
//     setSources(prev => prev.filter(s => s.id !== id));
//   }, []);

//   const renameSource = useCallback((id: string, name: string) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, name: name.trim() || s.name} : s)),
//     );
//   }, []);

//   const resetToDefaults = useCallback(() => {
//     setSources([]); // ✅ clear all feeds
//   }, []);

//   return {
//     sources,
//     enabled,
//     loading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//     setSources,
//   };
// }

//////////////////

// import {useEffect, useMemo, useState, useCallback} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';

// export type FeedSource = {
//   id: string;
//   name: string;
//   url: string;
//   enabled: boolean;
// };

// const STORAGE_KEY = '@fashion_feed_sources_v1';
// const keyFor = (userId: string) => `${STORAGE_KEY}:${userId}`;

// // ⛔️ No defaults anymore for new users
// const DEFAULT_SOURCES: FeedSource[] = [];

// function idFor(url: string) {
//   try {
//     const u = new URL(url);
//     return (u.hostname + u.pathname)
//       .replace(/[^a-z0-9]+/gi, '-')
//       .replace(/^-+|-+$/g, '')
//       .toLowerCase();
//   } catch {
//     return 'id-' + Math.random().toString(36).slice(2);
//   }
// }

// export function useFeedSources({userId}: {userId: string}) {
//   const [sources, setSources] = useState<FeedSource[]>([]);
//   const [loading, setLoading] = useState(true);

//   // 🔁 Reset when switching users
//   useEffect(() => {
//     setSources([]);
//     setLoading(true);
//   }, [userId]);

//   // load saved or seed defaults
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         // 1) Try server
//         let serverData: FeedSource[] | null = null;
//         try {
//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/feed-sources`,
//           );
//           if (res.ok) serverData = await res.json();
//         } catch {}

//         if (serverData && Array.isArray(serverData) && serverData.length) {
//           setSources(serverData);
//           setLoading(false);
//           return;
//         }

//         // 2) Try local storage
//         const raw = await AsyncStorage.getItem(keyFor(userId));
//         if (raw) {
//           const saved: FeedSource[] = JSON.parse(raw);
//           setSources(saved); // ✅ no merging with defaults
//           setLoading(false);
//           return;
//         }

//         // 3) Fallback to none
//         setSources([]);
//       } catch {
//         setSources([]);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [userId]);

//   // persist
//   useEffect(() => {
//     if (loading) return;
//     AsyncStorage.setItem(keyFor(userId), JSON.stringify(sources)).catch(
//       () => {},
//     );
//     (async () => {
//       try {
//         await fetch(`${API_BASE_URL}/users/${userId}/feed-sources`, {
//           method: 'PUT',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({sources}),
//         });
//       } catch {}
//     })();
//   }, [sources, loading, userId]);

//   const enabled = useMemo(() => sources.filter(s => s.enabled), [sources]);

//   const addSource = useCallback(
//     (name: string, url: string) => {
//       const trimmed = url.trim();
//       if (!/^https?:\/\//i.test(trimmed))
//         throw new Error('Enter a valid http(s) URL');
//       if (sources.some(s => s.url === trimmed))
//         throw new Error('Feed already exists');
//       const id = idFor(trimmed);
//       setSources(prev => [
//         ...prev,
//         {id, name: name.trim() || trimmed, url: trimmed, enabled: true},
//       ]);
//     },
//     [sources],
//   );

//   const toggleSource = useCallback((id: string, value: boolean) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, enabled: value} : s)),
//     );
//   }, []);

//   const removeSource = useCallback((id: string) => {
//     setSources(prev => prev.filter(s => s.id !== id));
//   }, []);

//   const renameSource = useCallback((id: string, name: string) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, name: name.trim() || s.name} : s)),
//     );
//   }, []);

//   const resetToDefaults = useCallback(() => {
//     setSources([]); // ✅ clear to none
//   }, []);

//   return {
//     sources,
//     enabled,
//     loading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//     setSources,
//   };
// }

////////////////////

// import {useEffect, useMemo, useState, useCallback} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';

// export type FeedSource = {
//   id: string; // stable id
//   name: string; // human-friendly name
//   url: string; // RSS/Atom url
//   enabled: boolean; // whether to include in feed
// };

// const STORAGE_KEY = '@fashion_feed_sources_v1';
// const keyFor = (userId: string) => `${STORAGE_KEY}:${userId}`;

// const DEFAULT_SOURCES: FeedSource[] = [
//   // {
//   //   id: 'the-cut',
//   //   name: 'The Cut',
//   //   url: 'https://feeds.feedburner.com/nymag/fashion',
//   //   enabled: true,
//   // },
//   // {
//   //   id: 'fashionista',
//   //   name: 'Fashionista',
//   //   url: 'https://fashionista.com/.rss/excerpt',
//   //   enabled: true,
//   // },
//   // {
//   //   id: 'fibre2fashion',
//   //   name: 'Fibre2Fashion',
//   //   url: 'https://feeds.feedburner.com/fibre2fashion/fashion-news',
//   //   enabled: true,
//   // },
//   // {
//   //   id: 'highsnobiety',
//   //   name: 'Highsnobiety',
//   //   url: 'https://www.highsnobiety.com/feed',
//   //   enabled: true,
//   // },
//   // {
//   //   id: 'hypebeast',
//   //   name: 'Hypebeast',
//   //   url: 'https://hypebeast.com/feed',
//   //   enabled: true,
//   // },
//   // {
//   //   id: 'vogue-uk',
//   //   name: 'Vogue UK',
//   //   url: 'https://www.vogue.co.uk/feed/rss',
//   //   enabled: true,
//   // },
// ];

// function idFor(url: string) {
//   try {
//     const u = new URL(url);
//     return (u.hostname + u.pathname)
//       .replace(/[^a-z0-9]+/gi, '-')
//       .replace(/^-+|-+$/g, '')
//       .toLowerCase();
//   } catch {
//     return 'id-' + Math.random().toString(36).slice(2);
//   }
// }

// export function useFeedSources({userId}: {userId: string}) {
//   const [sources, setSources] = useState<FeedSource[]>(DEFAULT_SOURCES);
//   const [loading, setLoading] = useState(true);

//   // load saved or seed defaults
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         // 1) Try server
//         let serverData: FeedSource[] | null = null;
//         try {
//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/feed-sources`,
//           );
//           if (res.ok) serverData = await res.json();
//         } catch {}

//         if (serverData && Array.isArray(serverData) && serverData.length) {
//           setSources(serverData);
//           setLoading(false);
//           return;
//         }

//         // 2) Try local storage
//         const raw = await AsyncStorage.getItem(keyFor(userId));
//         if (raw) {
//           const saved: FeedSource[] = JSON.parse(raw);
//           const byUrl = new Map<string, FeedSource>();
//           for (const d of DEFAULT_SOURCES) byUrl.set(d.url, d);
//           for (const s of saved) byUrl.set(s.url, s);
//           setSources([...byUrl.values()]);
//           setLoading(false);
//           return;
//         }

//         // 3) Fallback to defaults
//         setSources(DEFAULT_SOURCES);
//       } catch {
//         setSources(DEFAULT_SOURCES);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [userId]);

//   // persist
//   useEffect(() => {
//     if (loading) return;
//     AsyncStorage.setItem(keyFor(userId), JSON.stringify(sources)).catch(
//       () => {},
//     );
//     (async () => {
//       try {
//         await fetch(`${API_BASE_URL}/users/${userId}/feed-sources`, {
//           method: 'PUT',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({sources}),
//         });
//       } catch {}
//     })();
//   }, [sources, loading, userId]);

//   const enabled = useMemo(() => sources.filter(s => s.enabled), [sources]);

//   const addSource = useCallback(
//     (name: string, url: string) => {
//       const trimmed = url.trim();
//       if (!/^https?:\/\//i.test(trimmed))
//         throw new Error('Enter a valid http(s) URL');
//       if (sources.some(s => s.url === trimmed))
//         throw new Error('Feed already exists');
//       const id = idFor(trimmed);
//       setSources(prev => [
//         ...prev,
//         {id, name: name.trim() || trimmed, url: trimmed, enabled: true},
//       ]);
//     },
//     [sources],
//   );

//   const toggleSource = useCallback((id: string, value: boolean) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, enabled: value} : s)),
//     );
//   }, []);

//   const removeSource = useCallback((id: string) => {
//     setSources(prev => prev.filter(s => s.id !== id));
//   }, []);

//   const renameSource = useCallback((id: string, name: string) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, name: name.trim() || s.name} : s)),
//     );
//   }, []);

//   const resetToDefaults = useCallback(() => {
//     setSources(DEFAULT_SOURCES);
//   }, []);

//   return {
//     sources,
//     enabled,
//     loading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//     setSources,
//   };
// }

////////////////

// import {useEffect, useMemo, useState, useCallback} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';

// export type FeedSource = {
//   id: string; // stable id
//   name: string; // human-friendly name
//   url: string; // RSS/Atom url
//   enabled: boolean; // whether to include in feed
// };

// const STORAGE_KEY = '@fashion_feed_sources_v1';
// const keyFor = (userId: string) => `${STORAGE_KEY}:${userId}`;

// const DEFAULT_SOURCES: FeedSource[] = [
//   // {
//   //   id: 'the-cut',
//   //   name: 'The Cut',
//   //   url: 'https://feeds.feedburner.com/nymag/fashion',
//   //   enabled: true,
//   // },
//   // {
//   //   id: 'fashionista',
//   //   name: 'Fashionista',
//   //   url: 'https://fashionista.com/.rss/excerpt',
//   //   enabled: true,
//   // },
//   // {
//   //   id: 'fibre2fashion',
//   //   name: 'Fibre2Fashion',
//   //   url: 'https://feeds.feedburner.com/fibre2fashion/fashion-news',
//   //   enabled: true,
//   // },
//   // {
//   //   id: 'highsnobiety',
//   //   name: 'Highsnobiety',
//   //   url: 'https://www.highsnobiety.com/feed',
//   //   enabled: true,
//   // },
//   // {
//   //   id: 'hypebeast',
//   //   name: 'Hypebeast',
//   //   url: 'https://hypebeast.com/feed',
//   //   enabled: true,
//   // },
//   // {
//   //   id: 'vogue-uk',
//   //   name: 'Vogue UK',
//   //   url: 'https://www.vogue.co.uk/feed/rss',
//   //   enabled: true,
//   // },
// ];

// function idFor(url: string) {
//   try {
//     const u = new URL(url);
//     return (u.hostname + u.pathname)
//       .replace(/[^a-z0-9]+/gi, '-')
//       .replace(/^-+|-+$/g, '')
//       .toLowerCase();
//   } catch {
//     return 'id-' + Math.random().toString(36).slice(2);
//   }
// }

// export function useFeedSources({userId}: {userId: string}) {
//   const [sources, setSources] = useState<FeedSource[]>(DEFAULT_SOURCES);
//   const [loading, setLoading] = useState(true);

//   // load saved or seed defaults
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         // 1) Try server
//         let serverData: FeedSource[] | null = null;
//         try {
//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/feed-sources`,
//           );
//           if (res.ok) serverData = await res.json();
//         } catch {}

//         if (serverData && Array.isArray(serverData) && serverData.length) {
//           setSources(serverData);
//           setLoading(false);
//           return;
//         }

//         // 2) Try local storage
//         const raw = await AsyncStorage.getItem(keyFor(userId));
//         if (raw) {
//           const saved: FeedSource[] = JSON.parse(raw);
//           const byUrl = new Map<string, FeedSource>();
//           for (const d of DEFAULT_SOURCES) byUrl.set(d.url, d);
//           for (const s of saved) byUrl.set(s.url, s);
//           setSources([...byUrl.values()]);
//           setLoading(false);
//           return;
//         }

//         // 3) Fallback to defaults
//         setSources(DEFAULT_SOURCES);
//       } catch {
//         setSources(DEFAULT_SOURCES);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [userId]);

//   // persist
//   useEffect(() => {
//     if (loading) return;
//     AsyncStorage.setItem(keyFor(userId), JSON.stringify(sources)).catch(
//       () => {},
//     );
//     (async () => {
//       try {
//         await fetch(`${API_BASE_URL}/users/${userId}/feed-sources`, {
//           method: 'PUT',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({sources}),
//         });
//       } catch {}
//     })();
//   }, [sources, loading, userId]);

//   const enabled = useMemo(() => sources.filter(s => s.enabled), [sources]);

//   const addSource = useCallback(
//     (name: string, url: string) => {
//       const trimmed = url.trim();
//       if (!/^https?:\/\//i.test(trimmed))
//         throw new Error('Enter a valid http(s) URL');
//       if (sources.some(s => s.url === trimmed))
//         throw new Error('Feed already exists');
//       const id = idFor(trimmed);
//       setSources(prev => [
//         ...prev,
//         {id, name: name.trim() || trimmed, url: trimmed, enabled: true},
//       ]);
//     },
//     [sources],
//   );

//   const toggleSource = useCallback((id: string, value: boolean) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, enabled: value} : s)),
//     );
//   }, []);

//   const removeSource = useCallback((id: string) => {
//     setSources(prev => prev.filter(s => s.id !== id));
//   }, []);

//   const renameSource = useCallback((id: string, name: string) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, name: name.trim() || s.name} : s)),
//     );
//   }, []);

//   const resetToDefaults = useCallback(() => {
//     setSources(DEFAULT_SOURCES);
//   }, []);

//   return {
//     sources,
//     enabled,
//     loading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//     setSources,
//   };
// }

///////////////////////

// import {useEffect, useMemo, useState, useCallback} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {API_BASE_URL} from '../config/api';

// export type FeedSource = {
//   id: string; // stable id
//   name: string; // human-friendly name
//   url: string; // RSS/Atom url
//   enabled: boolean; // whether to include in feed
// };

// const STORAGE_KEY = '@fashion_feed_sources_v1';
// const keyFor = (userId: string) => `${STORAGE_KEY}:${userId}`;

// const DEFAULT_SOURCES: FeedSource[] = [
//   {
//     id: 'the-cut',
//     name: 'The Cut',
//     url: 'https://feeds.feedburner.com/nymag/fashion',
//     enabled: true,
//   },
//   {
//     id: 'fashionista',
//     name: 'Fashionista',
//     url: 'https://fashionista.com/.rss/excerpt',
//     enabled: true,
//   },
//   {
//     id: 'fibre2fashion',
//     name: 'Fibre2Fashion',
//     url: 'https://feeds.feedburner.com/fibre2fashion/fashion-news',
//     enabled: true,
//   },
//   {
//     id: 'highsnobiety',
//     name: 'Highsnobiety',
//     url: 'https://www.highsnobiety.com/feed',
//     enabled: true,
//   },
//   {
//     id: 'hypebeast',
//     name: 'Hypebeast',
//     url: 'https://hypebeast.com/feed',
//     enabled: true,
//   },
//   {
//     id: 'vogue-uk',
//     name: 'Vogue UK',
//     url: 'https://www.vogue.co.uk/feed/rss',
//     enabled: true,
//   },
// ];

// function idFor(url: string) {
//   try {
//     const u = new URL(url);
//     return (u.hostname + u.pathname)
//       .replace(/[^a-z0-9]+/gi, '-')
//       .replace(/^-+|-+$/g, '')
//       .toLowerCase();
//   } catch {
//     return 'id-' + Math.random().toString(36).slice(2);
//   }
// }

// export function useFeedSources({userId}: {userId: string}) {
//   const [sources, setSources] = useState<FeedSource[]>(DEFAULT_SOURCES);
//   const [loading, setLoading] = useState(true);

//   // load saved or seed defaults
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         // 1) Try server
//         let serverData: FeedSource[] | null = null;
//         try {
//           const res = await fetch(
//             `${API_BASE_URL}/users/${userId}/feed-sources`,
//           );
//           if (res.ok) serverData = await res.json();
//         } catch {}

//         if (serverData && Array.isArray(serverData) && serverData.length) {
//           setSources(serverData);
//           setLoading(false);
//           return;
//         }

//         // 2) Try local storage
//         const raw = await AsyncStorage.getItem(keyFor(userId));
//         if (raw) {
//           const saved: FeedSource[] = JSON.parse(raw);
//           const byUrl = new Map<string, FeedSource>();
//           for (const d of DEFAULT_SOURCES) byUrl.set(d.url, d);
//           for (const s of saved) byUrl.set(s.url, s);
//           setSources([...byUrl.values()]);
//           setLoading(false);
//           return;
//         }

//         // 3) Fallback to defaults
//         setSources(DEFAULT_SOURCES);
//       } catch {
//         setSources(DEFAULT_SOURCES);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [userId]);

//   // persist
//   useEffect(() => {
//     if (loading) return;
//     AsyncStorage.setItem(keyFor(userId), JSON.stringify(sources)).catch(
//       () => {},
//     );
//     (async () => {
//       try {
//         await fetch(`${API_BASE_URL}/users/${userId}/feed-sources`, {
//           method: 'PUT',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({sources}),
//         });
//       } catch {}
//     })();
//   }, [sources, loading, userId]);

//   const enabled = useMemo(() => sources.filter(s => s.enabled), [sources]);

//   const addSource = useCallback(
//     (name: string, url: string) => {
//       const trimmed = url.trim();
//       if (!/^https?:\/\//i.test(trimmed))
//         throw new Error('Enter a valid http(s) URL');
//       if (sources.some(s => s.url === trimmed))
//         throw new Error('Feed already exists');
//       const id = idFor(trimmed);
//       setSources(prev => [
//         ...prev,
//         {id, name: name.trim() || trimmed, url: trimmed, enabled: true},
//       ]);
//     },
//     [sources],
//   );

//   const toggleSource = useCallback((id: string, value: boolean) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, enabled: value} : s)),
//     );
//   }, []);

//   const removeSource = useCallback((id: string) => {
//     setSources(prev => prev.filter(s => s.id !== id));
//   }, []);

//   const renameSource = useCallback((id: string, name: string) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, name: name.trim() || s.name} : s)),
//     );
//   }, []);

//   const resetToDefaults = useCallback(() => {
//     setSources(DEFAULT_SOURCES);
//   }, []);

//   return {
//     sources,
//     enabled,
//     loading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//     setSources,
//   };
// }

//////////////////

// import {useEffect, useMemo, useState, useCallback} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export type FeedSource = {
//   id: string; // stable id
//   name: string; // human-friendly name
//   url: string; // RSS/Atom url
//   enabled: boolean; // whether to include in feed
// };

// const STORAGE_KEY = '@fashion_feed_sources_v1';

// const DEFAULT_SOURCES: FeedSource[] = [
//   {
//     id: 'the-cut',
//     name: 'The Cut',
//     url: 'https://feeds.feedburner.com/nymag/fashion',
//     enabled: true,
//   },
//   {
//     id: 'fashionista',
//     name: 'Fashionista',
//     url: 'https://fashionista.com/.rss/excerpt',
//     enabled: true,
//   },
//   {
//     id: 'fibre2fashion',
//     name: 'Fibre2Fashion',
//     url: 'https://feeds.feedburner.com/fibre2fashion/fashion-news',
//     enabled: true,
//   },
//   {
//     id: 'highsnobiety',
//     name: 'Highsnobiety',
//     url: 'https://www.highsnobiety.com/feed',
//     enabled: true,
//   },
//   {
//     id: 'hypebeast',
//     name: 'Hypebeast',
//     url: 'https://hypebeast.com/feed',
//     enabled: true,
//   },
//   {
//     id: 'vogue-uk',
//     name: 'Vogue UK',
//     url: 'https://www.vogue.co.uk/feed/rss',
//     enabled: true,
//   },
// ];

// // simple id helper
// function idFor(url: string) {
//   try {
//     const u = new URL(url);
//     return (u.hostname + u.pathname)
//       .replace(/[^a-z0-9]+/gi, '-')
//       .replace(/^-+|-+$/g, '')
//       .toLowerCase();
//   } catch {
//     return 'id-' + Math.random().toString(36).slice(2);
//   }
// }

// export function useFeedSources(p0: { userId: any; }) {
//   const [sources, setSources] = useState<FeedSource[]>(DEFAULT_SOURCES);
//   const [loading, setLoading] = useState(true);

//   // load saved or seed defaults
//   useEffect(() => {
//     (async () => {
//       try {
//         const raw = await AsyncStorage.getItem(STORAGE_KEY);
//         if (!raw) {
//           setSources(DEFAULT_SOURCES);
//           setLoading(false);
//           return;
//         }
//         const saved: FeedSource[] = JSON.parse(raw);

//         // merge defaults with saved (by url), prefer saved flags/names
//         const byUrl = new Map<string, FeedSource>();
//         for (const d of DEFAULT_SOURCES) byUrl.set(d.url, d);
//         for (const s of saved) byUrl.set(s.url, s);
//         setSources([...byUrl.values()]);
//       } catch {
//         setSources(DEFAULT_SOURCES);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   // persist
//   useEffect(() => {
//     if (loading) return;
//     AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sources)).catch(() => {});
//   }, [sources, loading]);

//   const enabled = useMemo(() => sources.filter(s => s.enabled), [sources]);

//   const addSource = useCallback(
//     (name: string, url: string) => {
//       const trimmed = url.trim();
//       if (!/^https?:\/\//i.test(trimmed))
//         throw new Error('Enter a valid http(s) URL');
//       if (sources.some(s => s.url === trimmed))
//         throw new Error('Feed already exists');
//       const id = idFor(trimmed);
//       setSources(prev => [
//         ...prev,
//         {id, name: name.trim() || trimmed, url: trimmed, enabled: true},
//       ]);
//     },
//     [sources],
//   );

//   const toggleSource = useCallback((id: string, value: boolean) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, enabled: value} : s)),
//     );
//   }, []);

//   const removeSource = useCallback((id: string) => {
//     setSources(prev => prev.filter(s => s.id !== id));
//   }, []);

//   const renameSource = useCallback((id: string, name: string) => {
//     setSources(prev =>
//       prev.map(s => (s.id === id ? {...s, name: name.trim() || s.name} : s)),
//     );
//   }, []);

//   const resetToDefaults = useCallback(() => {
//     setSources(DEFAULT_SOURCES);
//   }, []);

//   return {
//     sources,
//     enabled, // only the enabled sources
//     loading,
//     addSource,
//     toggleSource,
//     removeSource,
//     renameSource,
//     resetToDefaults,
//     setSources,
//   };
// }
