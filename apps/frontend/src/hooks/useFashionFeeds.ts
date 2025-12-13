import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {XMLParser} from 'fast-xml-parser';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config/api';

export type Article = {
  id: string;
  title: string;
  link: string;
  source: string;
  image?: string;
  summary?: string;
  publishedAt?: string;
};

export type Source = {name: string; url: string};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
});

// Cache configuration
const CACHE_KEY = 'fashionFeeds_cache';
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// In-memory cache for instant access across remounts
let memoryCache: {articles: Article[]; timestamp: number} | null = null;

async function loadCachedArticles(): Promise<Article[] | null> {
  // Check memory cache first (instant)
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_EXPIRY_MS) {
    return memoryCache.articles;
  }

  // Fall back to AsyncStorage
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const {articles, timestamp} = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
        memoryCache = {articles, timestamp};
        return articles;
      }
    }
  } catch (e) {
    console.log('📰 Cache read failed:', e);
  }
  return null;
}

async function saveCachedArticles(articles: Article[]): Promise<void> {
  const timestamp = Date.now();
  memoryCache = {articles, timestamp};
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({articles, timestamp}));
  } catch (e) {
    console.log('📰 Cache write failed:', e);
  }
}

function getFirst<T>(val: any): T | undefined {
  if (!val) return undefined;
  return Array.isArray(val) ? (val[0] as T) : (val as T);
}

function extractImageFromItem(item: any): string | undefined {
  const media = item['media:content'] || item['media:thumbnail'];
  if (media?.url) return media.url;
  const enclosure = item.enclosure;
  if (enclosure?.url) return enclosure.url;
  const html = (item['content:encoded'] || item.description || '') as string;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}

function normalizeItem(raw: any, sourceName: string): Article | null {
  const title = getFirst<string>(raw.title) || '';
  const link = getFirst<string>(raw.link) || '';

  if (!title || !link) return null;

  const published =
    getFirst<string>(raw.pubDate) ||
    getFirst<string>(raw.published) ||
    getFirst<string>(raw.updated);
  const publishedISO = published ? dayjs(published).toISOString() : undefined;

  const summary =
    getFirst<string>(raw.summary) || getFirst<string>(raw.description);
  const image = extractImageFromItem(raw);

  return {
    id: `${sourceName}:${link}`,
    title: title.replace(/\s+/g, ' ').trim(),
    link,
    source: sourceName,
    image,
    summary: summary ? summary.replace(/<[^>]*>/g, '').trim() : undefined,
    publishedAt: publishedISO,
  };
}

// Fetch with timeout - don't let one slow feed block everything
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {...options, signal: controller.signal});
    clearTimeout(timeoutId);
    return res;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function fetchFeed(src: Source): Promise<Article[]> {
  const TIMEOUT_MS = 8000; // 8 second timeout per feed

  try {
    const res = await fetchWithTimeout(src.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        Accept:
          'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://www.google.com',
      },
    }, TIMEOUT_MS);

    if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
    const text = await res.text();
    return parseFeedXml(text, src.name);
  } catch {
    // Try backend proxy as fallback (also with timeout)
    try {
      const proxyUrl = `${API_BASE_URL}/feeds/fetch?url=${encodeURIComponent(src.url)}`;
      const res = await fetchWithTimeout(proxyUrl, {}, TIMEOUT_MS);
      if (!res.ok) return [];
      const text = await res.text();
      return parseFeedXml(text, src.name);
    } catch {
      console.log(`📰 Feed ${src.name} timed out or failed`);
      return []; // Return empty instead of blocking
    }
  }
}

function parseFeedXml(xml: string, sourceName: string): Article[] {
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel || parsed?.feed;
  if (!channel) return [];
  const items = channel.item || channel.entry || [];
  return (items || [])
    .map(raw => normalizeItem(raw, sourceName))
    .filter(Boolean) as Article[];
}

function buildTrending(articles: Article[], windowHours = 72): string[] {
  const cutoff = dayjs().subtract(windowHours, 'hour');
  const tally = new Map<string, number>();

  for (const a of articles) {
    if (a.publishedAt && dayjs(a.publishedAt).isBefore(cutoff)) continue;
    const text = `${a.title} ${a.summary ?? ''}`.toLowerCase();
    const words = text
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(
        w =>
          w.length >= 3 &&
          ![
            'the',
            'and',
            'for',
            'with',
            'from',
            'that',
            'this',
            'are',
            'was',
            'you',
            'your',
            'into',
            'after',
            'about',
            'have',
            'over',
            'style',
            'fashion',
            'show',
            'week',
            'news',
            'brand',
            'launch',
          ].includes(w),
      );

    const phrases = [];
    if (/(nyfw|new\s+york\s+fashion\s+week)/i.test(text)) phrases.push('NYFW');
    if (/(pfw|paris\s+fashion\s+week)/i.test(text))
      phrases.push('Paris Fashion Week');
    if (/(lfw|london\s+fashion\s+week)/i.test(text))
      phrases.push('London Fashion Week');
    if (/(mfw|milan\s+fashion\s+week)/i.test(text))
      phrases.push('Milan Fashion Week');

    for (const w of words.slice(0, 25)) tally.set(w, (tally.get(w) ?? 0) + 1);
    for (const p of phrases) tally.set(p, (tally.get(p) ?? 0) + 3);
  }

  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([k]) => k);
}

export function useFashionFeeds(sources: Source[], opts?: {userId?: string}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const initialLoadDone = useRef(false);

  // Load cached articles immediately on mount
  useEffect(() => {
    const loadCache = async () => {
      const cached = await loadCachedArticles();
      if (cached && cached.length > 0 && articles.length === 0) {
        setArticles(cached);
      }
    };
    loadCache();
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (!sources || sources.length === 0) {
      loadingRef.current = false;
      return;
    }

    // Only show loading spinner if we have no cached articles
    if (articles.length === 0) {
      setLoading(true);
    }
    if (isRefresh) {
      setRefreshing(true);
    }
    setError(null);

    try {
      // Fetch feeds in parallel but update state progressively
      const feedPromises = sources.map(async (src) => {
        try {
          const feedArticles = await fetchFeed(src);
          return feedArticles;
        } catch {
          return [];
        }
      });

      // Use Promise.allSettled to not block on slow feeds
      const results = await Promise.allSettled(feedPromises);

      const newArticles: Article[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          newArticles.push(...result.value);
        }
      }

      const merged = [...newArticles]
        .filter(a => !!a.title && !!a.link)
        .reduce<Article[]>((acc, cur) => {
          if (!acc.find(x => x.id === cur.id)) acc.push(cur);
          return acc;
        }, [])
        .sort((a, b) => {
          const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
          const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
          return bt - at;
        });

      setArticles(merged);

      // Cache the results for next time
      if (merged.length > 0) {
        saveCachedArticles(merged);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load feeds');
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
      initialLoadDone.current = true;
    }
  }, [sources, articles.length]);

  useEffect(() => {
    // Only fetch if we don't have cached data or it's stale
    const shouldFetch = async () => {
      const cached = await loadCachedArticles();
      if (!cached || cached.length === 0) {
        load();
      } else if (!initialLoadDone.current) {
        // We have cache, but still refresh in background
        setArticles(cached);
        // Delay background refresh slightly to prioritize UI
        setTimeout(() => load(), 500);
      }
    };
    shouldFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sources), opts?.userId]);

  const trending = useMemo(() => buildTrending(articles), [articles]);

  return {
    articles,
    trending,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    loadMore: () => {},
    hasMore: false,
  };
}

//////////////

// import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// import {XMLParser} from 'fast-xml-parser';
// import dayjs from 'dayjs';
// import {API_BASE_URL} from '../config/api';

// export type Article = {
//   id: string;
//   title: string;
//   link: string;
//   source: string;
//   image?: string;
//   summary?: string;
//   publishedAt?: string;
// };

// export type Source = {name: string; url: string};

// const parser = new XMLParser({
//   ignoreAttributes: false,
//   attributeNamePrefix: '',
//   allowBooleanAttributes: true,
// });

// function getFirst<T>(val: any): T | undefined {
//   if (!val) return undefined;
//   return Array.isArray(val) ? (val[0] as T) : (val as T);
// }

// function extractImageFromItem(item: any): string | undefined {
//   const media = item['media:content'] || item['media:thumbnail'];
//   if (media?.url) return media.url;
//   const enclosure = item.enclosure;
//   if (enclosure?.url) return enclosure.url;
//   const html = (item['content:encoded'] || item.description || '') as string;
//   const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
//   return match?.[1];
// }

// function normalizeItem(raw: any, sourceName: string): Article | null {
//   const title = getFirst<string>(raw.title) || '';

//   // 🧠 Try multiple fallbacks for link:
//   let link = getFirst<string>(raw.link) || '';

//   // Sometimes it's an object like: link: { '#text': 'https://...' }
//   if (typeof link === 'object' && link['#text']) {
//     link = link['#text'];
//   }

//   // Some feeds wrap it inside atom:link with href attr
//   if (!link && raw['atom:link']?.href) {
//     link = raw['atom:link'].href;
//   }

//   // Sometimes GUID is actually the URL
//   if (!link && raw.guid && /^https?:\/\//.test(raw.guid)) {
//     link = raw.guid;
//   }

//   // Try description content (sometimes includes <a href="...">)
//   if (!link && raw.description) {
//     const match = raw.description.match(/https?:\/\/[^\s"']+/);
//     if (match) link = match[0];
//   }

//   // 🚨 Log why item is dropped (for debugging)
//   if (!title || !link) {
//     console.warn(
//       `⚠️ Dropping item from ${sourceName} — missing title/link`,
//       raw,
//     );
//     return null;
//   }

//   const published =
//     getFirst<string>(raw.pubDate) ||
//     getFirst<string>(raw.published) ||
//     getFirst<string>(raw.updated);
//   const publishedISO = published ? dayjs(published).toISOString() : undefined;

//   const summary =
//     getFirst<string>(raw.summary) || getFirst<string>(raw.description);
//   const image = extractImageFromItem(raw);

//   return {
//     id: `${sourceName}:${link}`,
//     title: title.replace(/\s+/g, ' ').trim(),
//     link,
//     source: sourceName,
//     image,
//     summary: summary ? summary.replace(/<[^>]*>/g, '').trim() : undefined,
//     publishedAt: publishedISO,
//   };
// }

// // ✅ Attempt direct fetch → fallback to backend proxy (returns XML too)
// async function fetchFeed(src: Source): Promise<Article[]> {
//   console.log(`🌐 Attempting direct fetch for: ${src.url}`);

//   const tryDirect = async () => {
//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), 15000);
//     try {
//       const res = await fetch(src.url, {
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
//           Accept:
//             'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
//           'Accept-Language': 'en-US,en;q=0.9',
//           Referer: 'https://www.google.com',
//           'Cache-Control': 'no-cache',
//         },
//         signal: controller.signal,
//       });

//       console.log(`📡 Direct response for ${src.name}:`, res.status);

//       if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
//       const text = await res.text();
//       console.log(`📥 Direct XML length for ${src.name}:`, text.length);
//       clearTimeout(timeout);
//       return parseFeedXml(text, src.name);
//     } catch (e) {
//       console.warn(`⚠️ Direct feed fetch failed for ${src.url}:`, e);
//       clearTimeout(timeout);
//       return [];
//     }
//   };

//   const tryBackend = async () => {
//     console.log(`🌐 Attempting backend proxy fetch for: ${src.url}`);
//     try {
//       const proxyUrl = `${API_BASE_URL}/feeds/fetch?url=${encodeURIComponent(
//         src.url,
//       )}`;
//       const res = await fetch(proxyUrl);
//       console.log(`📡 Proxy response for ${src.name}:`, res.status);
//       if (!res.ok) throw new Error(`Backend HTTP ${res.status}`);
//       const text = await res.text();
//       console.log(`📥 Proxy XML length for ${src.name}:`, text.length);
//       return parseFeedXml(text, src.name);
//     } catch (e) {
//       console.error(`❌ Backend proxy failed for ${src.url}:`, e);
//       return [];
//     }
//   };

//   const direct = await tryDirect();
//   if (direct.length > 0) {
//     console.log(
//       `✅ Using direct feed data for ${src.name} (${direct.length} articles)`,
//     );
//     return direct;
//   }

//   const backend = await tryBackend();
//   console.log(
//     `✅ Using backend feed data for ${src.name} (${backend.length} articles)`,
//   );
//   return backend;
// }
// function parseFeedXml(xml: string, sourceName: string): Article[] {
//   const parsed = parser.parse(xml);

//   // Handle both RSS and Atom formats robustly
//   let channel = parsed?.rss?.channel || parsed?.feed;
//   if (Array.isArray(channel)) channel = channel[0];
//   if (!channel) return [];

//   // Handle multiple item/entry array structures
//   let items = channel.item || channel.entry || [];
//   if (Array.isArray(items) === false) items = [items];
//   if (!items || items.length === 0) {
//     console.warn(
//       `⚠️ No items found for ${sourceName}`,
//       JSON.stringify(channel, null, 2),
//     );
//     return [];
//   }

//   const list: Article[] = [];
//   for (const raw of items) {
//     const a = normalizeItem(raw, sourceName);
//     if (a) list.push(a);
//   }

//   console.log(`📦 Parsed ${list.length} articles for ${sourceName}`);
//   return list;
// }

// function buildTrending(articles: Article[], windowHours = 72): string[] {
//   const cutoff = dayjs().subtract(windowHours, 'hour');
//   const tally = new Map<string, number>();

//   for (const a of articles) {
//     if (a.publishedAt && dayjs(a.publishedAt).isBefore(cutoff)) continue;
//     const text = `${a.title} ${a.summary ?? ''}`.toLowerCase();
//     const words = text
//       .replace(/[^a-z0-9\s-]/g, ' ')
//       .split(/\s+/)
//       .filter(
//         w =>
//           w.length >= 3 &&
//           ![
//             'the',
//             'and',
//             'for',
//             'with',
//             'from',
//             'that',
//             'this',
//             'are',
//             'was',
//             'you',
//             'your',
//             'into',
//             'after',
//             'about',
//             'have',
//             'over',
//             'style',
//             'fashion',
//             'show',
//             'week',
//             'news',
//             'brand',
//             'launch',
//           ].includes(w),
//       );

//     const phrases = [];
//     if (/(nyfw|new\s+york\s+fashion\s+week)/i.test(text)) phrases.push('NYFW');
//     if (/(pfw|paris\s+fashion\s+week)/i.test(text))
//       phrases.push('Paris Fashion Week');
//     if (/(lfw|london\s+fashion\s+week)/i.test(text))
//       phrases.push('London Fashion Week');
//     if (/(mfw|milan\s+fashion\s+week)/i.test(text))
//       phrases.push('Milan Fashion Week');

//     for (const w of words.slice(0, 25)) tally.set(w, (tally.get(w) ?? 0) + 1);
//     for (const p of phrases) tally.set(p, (tally.get(p) ?? 0) + 3);
//   }

//   return [...tally.entries()]
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 12)
//     .map(([k]) => k);
// }

// export function useFashionFeeds(sources: Source[], opts?: {userId?: string}) {
//   const [articles, setArticles] = useState<Article[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const pageRef = useRef(1);

//   const load = useCallback(async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       const batches = await Promise.all(sources.map(fetchFeed));
//       const merged = [...batches.flat()]
//         .filter(a => !!a.title && !!a.link)
//         .reduce<Article[]>((acc, cur) => {
//           if (!acc.find(x => x.link === cur.link)) acc.push(cur);
//           return acc;
//         }, [])
//         .sort((a, b) => {
//           const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
//           const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
//           return bt - at;
//         });

//       setArticles(merged);
//       pageRef.current = 1;
//     } catch (e: any) {
//       setError(e?.message ?? 'Failed to load feeds');
//     } finally {
//       setLoading(false);
//     }
//   }, [JSON.stringify(sources)]);

//   const refresh = useCallback(() => load(), [load]);

//   const pageSize = 20;
//   const paged = useMemo(
//     () => articles.slice(0, pageRef.current * pageSize),
//     [articles],
//   );

//   const loadMore = useCallback(() => {
//     pageRef.current += 1;
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load, opts?.userId]);

//   const trending = useMemo(() => buildTrending(articles, 72), [articles]);

//   return {
//     articles: paged,
//     trending,
//     loading,
//     error,
//     refresh,
//     loadMore,
//     hasMore: paged.length < articles.length,
//   };
// }

/////////////////////

// import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// import {XMLParser} from 'fast-xml-parser';
// import dayjs from 'dayjs';
// import {API_BASE_URL} from '../config/api';

// export type Article = {
//   id: string;
//   title: string;
//   link: string;
//   source: string;
//   image?: string;
//   summary?: string;
//   publishedAt?: string;
// };

// export type Source = {name: string; url: string};

// const parser = new XMLParser({
//   ignoreAttributes: false,
//   attributeNamePrefix: '',
//   allowBooleanAttributes: true,
// });

// function getFirst<T>(val: any): T | undefined {
//   if (!val) return undefined;
//   return Array.isArray(val) ? (val[0] as T) : (val as T);
// }

// function extractImageFromItem(item: any): string | undefined {
//   const media = item['media:content'] || item['media:thumbnail'];
//   if (media?.url) return media.url;
//   const enclosure = item.enclosure;
//   if (enclosure?.url) return enclosure.url;
//   const html = (item['content:encoded'] || item.description || '') as string;
//   const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
//   return match?.[1];
// }

// function normalizeItem(raw: any, sourceName: string): Article | null {
//   const title = getFirst<string>(raw.title) || '';
//   const link = getFirst<string>(raw.link) || '';
//   if (!title || !link) return null;

//   const published =
//     getFirst<string>(raw.pubDate) ||
//     getFirst<string>(raw.published) ||
//     getFirst<string>(raw.updated);
//   const publishedISO = published ? dayjs(published).toISOString() : undefined;

//   const summary =
//     getFirst<string>(raw.summary) || getFirst<string>(raw.description);
//   const image = extractImageFromItem(raw);

//   return {
//     id: `${sourceName}:${link}`,
//     title: title.replace(/\s+/g, ' ').trim(),
//     link,
//     source: sourceName,
//     image,
//     summary: summary ? summary.replace(/<[^>]*>/g, '').trim() : undefined,
//     publishedAt: publishedISO,
//   };
// }

// // ✅ Attempt direct fetch → fallback to backend proxy (returns XML too)
// async function fetchFeed(src: Source): Promise<Article[]> {
//   console.log(`🌐 Attempting direct fetch for: ${src.url}`);

//   const tryDirect = async () => {
//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), 15000);
//     try {
//       const res = await fetch(src.url, {
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
//           Accept:
//             'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
//           'Accept-Language': 'en-US,en;q=0.9',
//           Referer: 'https://www.google.com',
//           'Cache-Control': 'no-cache',
//         },
//         signal: controller.signal,
//       });

//       console.log(`📡 Direct response for ${src.name}:`, res.status);

//       if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
//       const text = await res.text();
//       console.log(`📥 Direct XML length for ${src.name}:`, text.length);
//       clearTimeout(timeout);
//       return parseFeedXml(text, src.name);
//     } catch (e) {
//       console.warn(`⚠️ Direct feed fetch failed for ${src.url}:`, e);
//       clearTimeout(timeout);
//       return [];
//     }
//   };

//   const tryBackend = async () => {
//     console.log(`🌐 Attempting backend proxy fetch for: ${src.url}`);
//     try {
//       const proxyUrl = `${API_BASE_URL}/feeds/fetch?url=${encodeURIComponent(
//         src.url,
//       )}`;
//       const res = await fetch(proxyUrl);
//       console.log(`📡 Proxy response for ${src.name}:`, res.status);
//       if (!res.ok) throw new Error(`Backend HTTP ${res.status}`);
//       const text = await res.text();
//       console.log(`📥 Proxy XML length for ${src.name}:`, text.length);
//       return parseFeedXml(text, src.name);
//     } catch (e) {
//       console.error(`❌ Backend proxy failed for ${src.url}:`, e);
//       return [];
//     }
//   };

//   const direct = await tryDirect();
//   if (direct.length > 0) {
//     console.log(
//       `✅ Using direct feed data for ${src.name} (${direct.length} articles)`,
//     );
//     return direct;
//   }

//   const backend = await tryBackend();
//   console.log(
//     `✅ Using backend feed data for ${src.name} (${backend.length} articles)`,
//   );
//   return backend;
// }

// function parseFeedXml(xml: string, sourceName: string): Article[] {
//   const parsed = parser.parse(xml);
//   const channel = parsed?.rss?.channel || parsed?.feed;
//   if (!channel) return [];

//   const items = channel.item || channel.entry || [];
//   const list: Article[] = [];
//   for (const raw of items) {
//     const a = normalizeItem(raw, sourceName);
//     if (a) list.push(a);
//   }
//   return list;
// }

// function buildTrending(articles: Article[], windowHours = 72): string[] {
//   const cutoff = dayjs().subtract(windowHours, 'hour');
//   const tally = new Map<string, number>();

//   for (const a of articles) {
//     if (a.publishedAt && dayjs(a.publishedAt).isBefore(cutoff)) continue;
//     const text = `${a.title} ${a.summary ?? ''}`.toLowerCase();
//     const words = text
//       .replace(/[^a-z0-9\s-]/g, ' ')
//       .split(/\s+/)
//       .filter(
//         w =>
//           w.length >= 3 &&
//           ![
//             'the',
//             'and',
//             'for',
//             'with',
//             'from',
//             'that',
//             'this',
//             'are',
//             'was',
//             'you',
//             'your',
//             'into',
//             'after',
//             'about',
//             'have',
//             'over',
//             'style',
//             'fashion',
//             'show',
//             'week',
//             'news',
//             'brand',
//             'launch',
//           ].includes(w),
//       );

//     const phrases = [];
//     if (/(nyfw|new\s+york\s+fashion\s+week)/i.test(text)) phrases.push('NYFW');
//     if (/(pfw|paris\s+fashion\s+week)/i.test(text))
//       phrases.push('Paris Fashion Week');
//     if (/(lfw|london\s+fashion\s+week)/i.test(text))
//       phrases.push('London Fashion Week');
//     if (/(mfw|milan\s+fashion\s+week)/i.test(text))
//       phrases.push('Milan Fashion Week');

//     for (const w of words.slice(0, 25)) tally.set(w, (tally.get(w) ?? 0) + 1);
//     for (const p of phrases) tally.set(p, (tally.get(p) ?? 0) + 3);
//   }

//   return [...tally.entries()]
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 12)
//     .map(([k]) => k);
// }

// export function useFashionFeeds(sources: Source[], opts?: {userId?: string}) {
//   const [articles, setArticles] = useState<Article[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const pageRef = useRef(1);

//   const load = useCallback(async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       const batches = await Promise.all(sources.map(fetchFeed));
//       const merged = [...batches.flat()]
//         .filter(a => !!a.title && !!a.link)
//         .reduce<Article[]>((acc, cur) => {
//           if (!acc.find(x => x.link === cur.link)) acc.push(cur);
//           return acc;
//         }, [])
//         .sort((a, b) => {
//           const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
//           const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
//           return bt - at;
//         });

//       setArticles(merged);
//       pageRef.current = 1;
//     } catch (e: any) {
//       setError(e?.message ?? 'Failed to load feeds');
//     } finally {
//       setLoading(false);
//     }
//   }, [JSON.stringify(sources)]);

//   const refresh = useCallback(() => load(), [load]);

//   const pageSize = 20;
//   const paged = useMemo(
//     () => articles.slice(0, pageRef.current * pageSize),
//     [articles],
//   );

//   const loadMore = useCallback(() => {
//     pageRef.current += 1;
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load, opts?.userId]);

//   const trending = useMemo(() => buildTrending(articles, 72), [articles]);

//   return {
//     articles: paged,
//     trending,
//     loading,
//     error,
//     refresh,
//     loadMore,
//     hasMore: paged.length < articles.length,
//   };
// }

//////////////////

// import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// import {XMLParser} from 'fast-xml-parser';
// import dayjs from 'dayjs';
// import {API_BASE_URL} from '../config/api';

// export type Article = {
//   id: string;
//   title: string;
//   link: string;
//   source: string;
//   image?: string;
//   summary?: string;
//   publishedAt?: string;
// };

// export type Source = {name: string; url: string};

// const parser = new XMLParser({
//   ignoreAttributes: false,
//   attributeNamePrefix: '',
//   allowBooleanAttributes: true,
// });

// function getFirst<T>(val: any): T | undefined {
//   if (!val) return undefined;
//   return Array.isArray(val) ? (val[0] as T) : (val as T);
// }

// function extractImageFromItem(item: any): string | undefined {
//   const media = item['media:content'] || item['media:thumbnail'];
//   if (media?.url) return media.url;
//   const enclosure = item.enclosure;
//   if (enclosure?.url) return enclosure.url;
//   const html = (item['content:encoded'] || item.description || '') as string;
//   const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
//   return match?.[1];
// }

// function normalizeItem(raw: any, sourceName: string): Article | null {
//   const title = getFirst<string>(raw.title) || '';
//   const link = getFirst<string>(raw.link) || '';
//   if (!title || !link) return null;

//   const published =
//     getFirst<string>(raw.pubDate) ||
//     getFirst<string>(raw.published) ||
//     getFirst<string>(raw.updated);
//   const publishedISO = published ? dayjs(published).toISOString() : undefined;

//   const summary =
//     getFirst<string>(raw.summary) || getFirst<string>(raw.description);
//   const image = extractImageFromItem(raw);

//   return {
//     id: `${sourceName}:${link}`,
//     title: title.replace(/\s+/g, ' ').trim(),
//     link,
//     source: sourceName,
//     image,
//     summary: summary ? summary.replace(/<[^>]*>/g, '').trim() : undefined,
//     publishedAt: publishedISO,
//   };
// }

// // 🔥 Try direct fetch → fallback to backend proxy if blocked
// async function fetchFeed(src: Source): Promise<Article[]> {
//   const tryDirect = async () => {
//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), 15000);
//     try {
//       const res = await fetch(src.url, {
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
//           Accept:
//             'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
//           'Accept-Language': 'en-US,en;q=0.9',
//           Referer: 'https://www.google.com',
//           'Cache-Control': 'no-cache',
//         },
//         signal: controller.signal,
//       });

//       if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
//       const text = await res.text();
//       clearTimeout(timeout);
//       return parseFeedXml(text, src.name);
//     } catch (e) {
//       console.warn(`⚠️ Direct feed fetch failed for ${src.url}:`, e);
//       clearTimeout(timeout);
//       return [];
//     }
//   };

//   const tryBackend = async () => {
//     try {
//       const res = await fetch(
//         `${API_BASE_URL}/feeds/fetch?url=${encodeURIComponent(src.url)}`,
//       );
//       if (!res.ok) throw new Error(`Backend HTTP ${res.status}`);
//       const json = await res.json();
//       return json.items || [];
//     } catch (e) {
//       console.error(`❌ Backend proxy failed for ${src.url}:`, e);
//       return [];
//     }
//   };

//   const direct = await tryDirect();
//   return direct.length > 0 ? direct : await tryBackend();
// }

// function parseFeedXml(xml: string, sourceName: string): Article[] {
//   const parsed = parser.parse(xml);
//   const channel = parsed?.rss?.channel || parsed?.feed;
//   if (!channel) return [];

//   const items = channel.item || channel.entry || [];
//   const list: Article[] = [];
//   for (const raw of items) {
//     const a = normalizeItem(raw, sourceName);
//     if (a) list.push(a);
//   }
//   return list;
// }

// function buildTrending(articles: Article[], windowHours = 72): string[] {
//   const cutoff = dayjs().subtract(windowHours, 'hour');
//   const tally = new Map<string, number>();

//   for (const a of articles) {
//     if (a.publishedAt && dayjs(a.publishedAt).isBefore(cutoff)) continue;
//     const text = `${a.title} ${a.summary ?? ''}`.toLowerCase();
//     const words = text
//       .replace(/[^a-z0-9\s-]/g, ' ')
//       .split(/\s+/)
//       .filter(
//         w =>
//           w.length >= 3 &&
//           ![
//             'the',
//             'and',
//             'for',
//             'with',
//             'from',
//             'that',
//             'this',
//             'are',
//             'was',
//             'you',
//             'your',
//             'into',
//             'after',
//             'about',
//             'have',
//             'over',
//             'style',
//             'fashion',
//             'show',
//             'week',
//             'news',
//             'brand',
//             'launch',
//           ].includes(w),
//       );

//     const phrases = [];
//     if (/(nyfw|new\s+york\s+fashion\s+week)/i.test(text)) phrases.push('NYFW');
//     if (/(pfw|paris\s+fashion\s+week)/i.test(text))
//       phrases.push('Paris Fashion Week');
//     if (/(lfw|london\s+fashion\s+week)/i.test(text))
//       phrases.push('London Fashion Week');
//     if (/(mfw|milan\s+fashion\s+week)/i.test(text))
//       phrases.push('Milan Fashion Week');

//     for (const w of words.slice(0, 25)) tally.set(w, (tally.get(w) ?? 0) + 1);
//     for (const p of phrases) tally.set(p, (tally.get(p) ?? 0) + 3);
//   }

//   return [...tally.entries()]
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 12)
//     .map(([k]) => k);
// }

// export function useFashionFeeds(sources: Source[], opts?: {userId?: string}) {
//   const [articles, setArticles] = useState<Article[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const pageRef = useRef(1);

//   const load = useCallback(async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       const batches = await Promise.all(sources.map(fetchFeed));
//       const merged = [...batches.flat()]
//         .filter(a => !!a.title && !!a.link)
//         .reduce<Article[]>((acc, cur) => {
//           if (!acc.find(x => x.link === cur.link)) acc.push(cur);
//           return acc;
//         }, [])
//         .sort((a, b) => {
//           const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
//           const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
//           return bt - at;
//         });

//       setArticles(merged);
//       pageRef.current = 1;
//     } catch (e: any) {
//       setError(e?.message ?? 'Failed to load feeds');
//     } finally {
//       setLoading(false);
//     }
//   }, [JSON.stringify(sources)]);

//   const refresh = useCallback(() => load(), [load]);

//   const pageSize = 20;
//   const paged = useMemo(
//     () => articles.slice(0, pageRef.current * pageSize),
//     [articles],
//   );

//   const loadMore = useCallback(() => {
//     pageRef.current += 1;
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load, opts?.userId]);

//   const trending = useMemo(() => buildTrending(articles, 72), [articles]);

//   return {
//     articles: paged,
//     trending,
//     loading,
//     error,
//     refresh,
//     loadMore,
//     hasMore: paged.length < articles.length,
//   };
// }

//////////////////

// import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// import {XMLParser} from 'fast-xml-parser';
// import dayjs from 'dayjs';

// export type Article = {
//   id: string;
//   title: string;
//   link: string;
//   source: string;
//   image?: string;
//   summary?: string;
//   publishedAt?: string;
// };

// export type Source = {name: string; url: string};

// const parser = new XMLParser({
//   ignoreAttributes: false,
//   attributeNamePrefix: '',
//   allowBooleanAttributes: true,
// });

// function getFirst<T>(val: any): T | undefined {
//   if (!val) return undefined;
//   return Array.isArray(val) ? (val[0] as T) : (val as T);
// }

// function extractImageFromItem(item: any): string | undefined {
//   const media = item['media:content'] || item['media:thumbnail'];
//   if (media?.url) return media.url;
//   const enclosure = item.enclosure;
//   if (enclosure?.url) return enclosure.url;
//   const html = (item['content:encoded'] || item.description || '') as string;
//   const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
//   return match?.[1];
// }

// function normalizeItem(raw: any, sourceName: string): Article | null {
//   const title = getFirst<string>(raw.title) || '';
//   const link = getFirst<string>(raw.link) || '';
//   if (!title || !link) return null;

//   const published =
//     getFirst<string>(raw.pubDate) ||
//     getFirst<string>(raw.published) ||
//     getFirst<string>(raw.updated);
//   const publishedISO = published ? dayjs(published).toISOString() : undefined;

//   const summary =
//     getFirst<string>(raw.summary) || getFirst<string>(raw.description);
//   const image = extractImageFromItem(raw);

//   return {
//     id: `${sourceName}:${link}`,
//     title: title.replace(/\s+/g, ' ').trim(),
//     link,
//     source: sourceName,
//     image,
//     summary: summary ? summary.replace(/<[^>]*>/g, '').trim() : undefined,
//     publishedAt: publishedISO,
//   };
// }

// async function fetchFeed(src: Source): Promise<Article[]> {
//   const res = await fetch(src.url, {
//     headers: {
//       'User-Agent':
//         'StylHelpr-FashionFeed/1.0 (+https://stylhelpr.com; React Native RSS fetcher)',
//       Accept: 'application/rss+xml, application/xml, text/xml, */*',
//     },
//   });
//   const text = await res.text();
//   const xml = parser.parse(text);

//   const channel = xml?.rss?.channel || xml?.feed;
//   if (!channel) return [];

//   const items = channel.item || channel.entry || [];
//   const list: Article[] = [];

//   for (const raw of items) {
//     const a = normalizeItem(raw, src.name);
//     if (a) list.push(a);
//   }
//   return list;
// }

// function buildTrending(articles: Article[], windowHours = 72): string[] {
//   const cutoff = dayjs().subtract(windowHours, 'hour');
//   const tally = new Map<string, number>();

//   for (const a of articles) {
//     if (a.publishedAt && dayjs(a.publishedAt).isBefore(cutoff)) continue;
//     const text = `${a.title} ${a.summary ?? ''}`.toLowerCase();
//     const words = text
//       .replace(/[^a-z0-9\s-]/g, ' ')
//       .split(/\s+/)
//       .filter(
//         w =>
//           w.length >= 3 &&
//           ![
//             'the',
//             'and',
//             'for',
//             'with',
//             'from',
//             'that',
//             'this',
//             'are',
//             'was',
//             'you',
//             'your',
//             'into',
//             'after',
//             'about',
//             'have',
//             'over',
//             'style',
//             'fashion',
//             'show',
//             'week',
//             'news',
//             'brand',
//             'launch',
//           ].includes(w),
//       );

//     const phrases = [];
//     if (/(nyfw|new\s+york\s+fashion\s+week)/i.test(text)) phrases.push('NYFW');
//     if (/(pfw|paris\s+fashion\s+week)/i.test(text))
//       phrases.push('Paris Fashion Week');
//     if (/(lfw|london\s+fashion\s+week)/i.test(text))
//       phrases.push('London Fashion Week');
//     if (/(mfw|milan\s+fashion\s+week)/i.test(text))
//       phrases.push('Milan Fashion Week');

//     for (const w of words.slice(0, 25)) tally.set(w, (tally.get(w) ?? 0) + 1);
//     for (const p of phrases) tally.set(p, (tally.get(p) ?? 0) + 3);
//   }

//   return [...tally.entries()]
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 12)
//     .map(([k]) => k);
// }

// export function useFashionFeeds(sources: Source[], opts?: {userId?: string}) {
//   const [articles, setArticles] = useState<Article[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const pageRef = useRef(1);

//   const load = useCallback(async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       const batches = await Promise.all(sources.map(fetchFeed));
//       const merged = [...batches.flat()]
//         .filter(a => !!a.title && !!a.link)
//         .reduce<Article[]>((acc, cur) => {
//           if (!acc.find(x => x.link === cur.link)) acc.push(cur);
//           return acc;
//         }, [])
//         .sort((a, b) => {
//           const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
//           const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
//           return bt - at;
//         });

//       setArticles(merged);
//       pageRef.current = 1;
//     } catch (e: any) {
//       setError(e?.message ?? 'Failed to load feeds');
//     } finally {
//       setLoading(false);
//     }
//   }, [JSON.stringify(sources)]);

//   const refresh = useCallback(() => load(), [load]);

//   const pageSize = 20;
//   const paged = useMemo(
//     () => articles.slice(0, pageRef.current * pageSize),
//     [articles],
//   );

//   const loadMore = useCallback(() => {
//     pageRef.current += 1;
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load, opts?.userId]);

//   const trending = useMemo(() => buildTrending(articles, 72), [articles]);

//   return {
//     articles: paged,
//     trending,
//     loading,
//     error,
//     refresh,
//     loadMore,
//     hasMore: paged.length < articles.length,
//   };
// }

/////////////////

// import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// import {XMLParser} from 'fast-xml-parser';
// import dayjs from 'dayjs';

// export type Article = {
//   id: string;
//   title: string;
//   link: string;
//   source: string;
//   image?: string;
//   summary?: string;
//   publishedAt?: string; // ISO
// };

// type Source = {name: string; url: string};

// const SOURCES: Source[] = [
//   // ✅ Official RSS pages
//   {name: 'The Cut', url: 'https://feeds.feedburner.com/nymag/fashion'}, // from NYMag’s RSS hub
//   {name: 'Fashionista', url: 'https://fashionista.com/.rss/excerpt'}, // feedspot lists this path
//   {
//     name: 'Fibre2Fashion',
//     url: 'https://feeds.feedburner.com/fibre2fashion/fashion-news',
//   },
//   // Common “WP-style” feeds (work well; toggle off if any issues)
//   {name: 'Highsnobiety', url: 'https://www.highsnobiety.com/feed'},
//   {name: 'Hypebeast', url: 'https://hypebeast.com/feed'},
//   // Vogue UK provides a feed endpoint
//   {name: 'Vogue UK', url: 'https://www.vogue.co.uk/feed/rss'},
// ];

// const parser = new XMLParser({
//   ignoreAttributes: false,
//   attributeNamePrefix: '',
//   allowBooleanAttributes: true,
// });

// function getFirst<T>(val: any): T | undefined {
//   if (!val) return undefined;
//   return Array.isArray(val) ? (val[0] as T) : (val as T);
// }

// function extractImageFromItem(item: any): string | undefined {
//   // Support <media:content url="...">, <enclosure url="...">, content:encoded <img>, or description <img>
//   const media = item['media:content'] || item['media:thumbnail'];
//   if (media?.url) return media.url;
//   const enclosure = item.enclosure;
//   if (enclosure?.url) return enclosure.url;

//   const html = (item['content:encoded'] || item.description || '') as string;
//   const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
//   return match?.[1];
// }

// function normalizeItem(raw: any, sourceName: string): Article | null {
//   const title = getFirst<string>(raw.title) || '';
//   const link = getFirst<string>(raw.link) || '';
//   if (!title || !link) return null;

//   const published =
//     getFirst<string>(raw.pubDate) ||
//     getFirst<string>(raw.published) ||
//     getFirst<string>(raw.updated);
//   const publishedISO = published ? dayjs(published).toISOString() : undefined;

//   const summary =
//     getFirst<string>(raw.summary) || getFirst<string>(raw.description);
//   const image = extractImageFromItem(raw);

//   return {
//     id: `${sourceName}:${link}`,
//     title: title.replace(/\s+/g, ' ').trim(),
//     link,
//     source: sourceName,
//     image,
//     summary: summary ? summary.replace(/<[^>]*>/g, '').trim() : undefined,
//     publishedAt: publishedISO,
//   };
// }

// async function fetchFeed(src: Source): Promise<Article[]> {
//   const res = await fetch(src.url, {
//     headers: {
//       // some feeds prefer a UA
//       'User-Agent':
//         'StylHelpr-FashionFeed/1.0 (+https://stylhelpr.com; React Native RSS fetcher)',
//       Accept: 'application/rss+xml, application/xml, text/xml, */*',
//     },
//   });
//   const text = await res.text();
//   const xml = parser.parse(text);

//   // supports both RSS 2.0 and Atom layouts
//   const channel = xml?.rss?.channel || xml?.feed;
//   if (!channel) return [];

//   const items = channel.item || channel.entry || [];
//   const list: Article[] = [];

//   for (const raw of items) {
//     const a = normalizeItem(raw, src.name);
//     if (a) list.push(a);
//   }
//   return list;
// }

// function buildTrending(articles: Article[], windowHours = 72): string[] {
//   const cutoff = dayjs().subtract(windowHours, 'hour');
//   const tally = new Map<string, number>();

//   for (const a of articles) {
//     if (a.publishedAt && dayjs(a.publishedAt).isBefore(cutoff)) continue;
//     const text = `${a.title} ${a.summary ?? ''}`.toLowerCase();

//     // quick keyword candidates (strip punctuation)
//     const words = text
//       .replace(/[^a-z0-9\s-]/g, ' ')
//       .split(/\s+/)
//       .filter(
//         w =>
//           w.length >= 3 &&
//           ![
//             'the',
//             'and',
//             'for',
//             'with',
//             'from',
//             'that',
//             'this',
//             'are',
//             'was',
//             'you',
//             'your',
//             'into',
//             'after',
//             'about',
//             'have',
//             'over',
//             'style',
//             'fashion',
//             'show',
//             'week',
//             'news',
//             'brand',
//             'launch',
//           ].includes(w),
//       );

//     // prefer multi-word “key phrases” we care about
//     const phrases = [];
//     const nyfw = /(nyfw|new\s+york\s+fashion\s+week)/i.test(text);
//     const pfw = /(pfw|paris\s+fashion\s+week)/i.test(text);
//     const lfw = /(lfw|london\s+fashion\s+week)/i.test(text);
//     const mfw = /(mfw|milan\s+fashion\s+week)/i.test(text);

//     if (nyfw) phrases.push('NYFW');
//     if (pfw) phrases.push('Paris Fashion Week');
//     if (lfw) phrases.push('London Fashion Week');
//     if (mfw) phrases.push('Milan Fashion Week');

//     // top words
//     for (const w of words.slice(0, 25)) {
//       tally.set(w, (tally.get(w) ?? 0) + 1);
//     }
//     for (const p of phrases) {
//       tally.set(p, (tally.get(p) ?? 0) + 3); // boost phrases
//     }
//   }

//   return [...tally.entries()]
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 12)
//     .map(([k]) => k);
// }

// export function useFashionFeeds() {
//   const [articles, setArticles] = useState<Article[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const pageRef = useRef(1);

//   const load = useCallback(async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       const batches = await Promise.all(SOURCES.map(fetchFeed));
//       const merged = [...batches.flat()]
//         .filter(a => !!a.title && !!a.link)
//         .reduce<Article[]>((acc, cur) => {
//           if (!acc.find(x => x.link === cur.link)) acc.push(cur);
//           return acc;
//         }, [])
//         .sort((a, b) => {
//           const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
//           const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
//           return bt - at;
//         });

//       setArticles(merged);
//       pageRef.current = 1;
//     } catch (e: any) {
//       setError(e?.message ?? 'Failed to load feeds');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const refresh = useCallback(() => load(), [load]);

//   // simple client-side pagination (20 per “page”)
//   const pageSize = 20;
//   const paged = useMemo(
//     () => articles.slice(0, pageRef.current * pageSize),
//     [articles],
//   );

//   const loadMore = useCallback(() => {
//     pageRef.current += 1;
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load]);

//   const trending = useMemo(() => buildTrending(articles, 72), [articles]);

//   return {
//     articles: paged,
//     trending,
//     loading,
//     error,
//     refresh,
//     loadMore,
//     hasMore: paged.length < articles.length,
//   };
// }
