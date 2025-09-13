import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {XMLParser} from 'fast-xml-parser';
import dayjs from 'dayjs';

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

async function fetchFeed(src: Source): Promise<Article[]> {
  const res = await fetch(src.url, {
    headers: {
      'User-Agent':
        'StylHelpr-FashionFeed/1.0 (+https://stylhelpr.com; React Native RSS fetcher)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
  });
  const text = await res.text();
  const xml = parser.parse(text);

  const channel = xml?.rss?.channel || xml?.feed;
  if (!channel) return [];

  const items = channel.item || channel.entry || [];
  const list: Article[] = [];

  for (const raw of items) {
    const a = normalizeItem(raw, src.name);
    if (a) list.push(a);
  }
  return list;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(1);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const batches = await Promise.all(sources.map(fetchFeed));
      const merged = [...batches.flat()]
        .filter(a => !!a.title && !!a.link)
        .reduce<Article[]>((acc, cur) => {
          if (!acc.find(x => x.link === cur.link)) acc.push(cur);
          return acc;
        }, [])
        .sort((a, b) => {
          const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
          const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
          return bt - at;
        });

      setArticles(merged);
      pageRef.current = 1;
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load feeds');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(sources)]);

  const refresh = useCallback(() => load(), [load]);

  const pageSize = 20;
  const paged = useMemo(
    () => articles.slice(0, pageRef.current * pageSize),
    [articles],
  );

  const loadMore = useCallback(() => {
    pageRef.current += 1;
  }, []);

  useEffect(() => {
    load();
  }, [load, opts?.userId]);

  const trending = useMemo(() => buildTrending(articles, 72), [articles]);

  return {
    articles: paged,
    trending,
    loading,
    error,
    refresh,
    loadMore,
    hasMore: paged.length < articles.length,
  };
}

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
