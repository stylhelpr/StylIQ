import {useEffect, useMemo, useState, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FeedSource = {
  id: string; // stable id
  name: string; // human-friendly name
  url: string; // RSS/Atom url
  enabled: boolean; // whether to include in feed
};

const STORAGE_KEY = '@fashion_feed_sources_v1';

const DEFAULT_SOURCES: FeedSource[] = [
  {
    id: 'the-cut',
    name: 'The Cut',
    url: 'https://feeds.feedburner.com/nymag/fashion',
    enabled: true,
  },
  {
    id: 'fashionista',
    name: 'Fashionista',
    url: 'https://fashionista.com/.rss/excerpt',
    enabled: true,
  },
  {
    id: 'fibre2fashion',
    name: 'Fibre2Fashion',
    url: 'https://feeds.feedburner.com/fibre2fashion/fashion-news',
    enabled: true,
  },
  {
    id: 'highsnobiety',
    name: 'Highsnobiety',
    url: 'https://www.highsnobiety.com/feed',
    enabled: true,
  },
  {
    id: 'hypebeast',
    name: 'Hypebeast',
    url: 'https://hypebeast.com/feed',
    enabled: true,
  },
  {
    id: 'vogue-uk',
    name: 'Vogue UK',
    url: 'https://www.vogue.co.uk/feed/rss',
    enabled: true,
  },
];

// simple id helper
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

export function useFeedSources() {
  const [sources, setSources] = useState<FeedSource[]>(DEFAULT_SOURCES);
  const [loading, setLoading] = useState(true);

  // load saved or seed defaults
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setSources(DEFAULT_SOURCES);
          setLoading(false);
          return;
        }
        const saved: FeedSource[] = JSON.parse(raw);

        // merge defaults with saved (by url), prefer saved flags/names
        const byUrl = new Map<string, FeedSource>();
        for (const d of DEFAULT_SOURCES) byUrl.set(d.url, d);
        for (const s of saved) byUrl.set(s.url, s);
        setSources([...byUrl.values()]);
      } catch {
        setSources(DEFAULT_SOURCES);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // persist
  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sources)).catch(() => {});
  }, [sources, loading]);

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
    setSources(DEFAULT_SOURCES);
  }, []);

  return {
    sources,
    enabled, // only the enabled sources
    loading,
    addSource,
    toggleSource,
    removeSource,
    renameSource,
    resetToDefaults,
    setSources,
  };
}

////////////////

// // apps/mobile/src/hooks/useFeedSources.ts
// import {useEffect, useMemo, useState, useCallback} from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export type FeedSource = {
//   id: string; // stable id
//   name: string; // human-friendly name
//   url: string; // RSS/Atom url
//   enabled: boolean; // whether to include in feed
// };

// const STORAGE_KEY = '@fashion_feed_sources_v1';

// // Apple-News-y defaults (you can edit this list)
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

// export function useFeedSources() {
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
