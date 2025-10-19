// BELOW HERE WORKING SPOOF BROWSER CODE - KEEP

// src/feeds/feed-discover.controller.ts

import {
  Controller,
  Get,
  Query,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as cheerio from 'cheerio';

type FeedHit = { title: string; href: string };
type DebugLine =
  | { t: 't'; msg: string; data?: any }
  | { t: 'error'; msg: string; data?: any };

function pushDbg(dbg: DebugLine[], t: DebugLine['t'], msg: string, data?: any) {
  dbg.push({ t, msg, ...(data === undefined ? {} : { data }) });
}

const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

@Controller('feeds')
export class FeedDiscoverController {
  // ─────────────────────────────────────────────────────────────
  // GET /feeds/discover?url=… | ?brand=…&debug=1
  // Finds RSS/Atom feeds for a site (or brand name) with deep debug.
  // ─────────────────────────────────────────────────────────────
  @Get('discover')
  async discover(
    @Query('url') url?: string,
    @Query('brand') brand?: string,
    @Query('debug') debug?: string,
  ) {
    const debugOn = String(debug).toLowerCase() === '1' || debug === 'true';
    const dbg: DebugLine[] = [];

    pushDbg(dbg, 't', 'endpoint_called', { url, brand, debugOn });

    if (!url && !brand) {
      throw new BadRequestException('Missing url or brand');
    }

    // 1) Resolve direct URL or brand → domain
    let target: string | undefined = url?.trim();
    if (!target && brand) {
      pushDbg(dbg, 't', 'resolving_brand', { brand });
      const resolved = await this.resolveBrandToUrl(brand, dbg);
      target = resolved ?? undefined;
      pushDbg(dbg, 't', 'brand_resolved', { resolved: target });
      if (!target) {
        const err = `Could not resolve a site for brand "${brand}"`;
        if (debugOn) return { ok: false, error: err, debug: dbg };
        throw new BadRequestException(err);
      }
    }

    // 2) Normalize protocol
    if (target && !/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
      pushDbg(dbg, 't', 'protocol_added', { target });
    }
    if (!target) {
      const err = 'Could not resolve target URL';
      if (debugOn) return { ok: false, error: err, debug: dbg };
      throw new BadRequestException(err);
    }
    const finalTarget = target;
    pushDbg(dbg, 't', 'final_target', { finalTarget });

    try {
      // 3) Fetch homepage HTML (mobile UA helps bypass some WAF/CDNs)
      pushDbg(dbg, 't', 'fetch_homepage_start', { finalTarget });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(finalTarget, {
        headers: {
          'User-Agent': IOS_SAFARI_UA,
          Accept:
            'text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://www.google.com',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      pushDbg(dbg, 't', 'fetch_homepage_done', {
        status: res.status,
        statusText: res.statusText,
        urlAfterRedirects: (res as any).url || finalTarget,
        contentType: res.headers.get('content-type'),
      });

      if (!res.ok) {
        const err = `Failed to fetch site: ${res.status} ${res.statusText}`;
        if (debugOn) return { ok: false, error: err, debug: dbg };
        throw new BadRequestException(err);
      }

      const body = await res.text();
      pushDbg(dbg, 't', 'html_loaded', { length: body.length });

      const $ = cheerio.load(body);
      const feeds: FeedHit[] = [];

      // 4) <link> discovery
      pushDbg(dbg, 't', 'scan_link_tags_start');
      const linkSel =
        'link[type="application/rss+xml"], link[type="application/atom+xml"]';
      $(linkSel).each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).attr('title');
        if (href) {
          const full = new URL(href, finalTarget).href;
          feeds.push({ title: title || href, href: full });
          pushDbg(dbg, 't', 'feed_link_found', { full, title: title || null });
        }
      });
      pushDbg(dbg, 't', 'scan_link_tags_done', { count: feeds.length });

      // 5) <a> discovery
      pushDbg(dbg, 't', 'scan_anchor_tags_start');
      $('a[href*=".xml"], a[href*="/feed"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href && (href.endsWith('.xml') || href.includes('/feed'))) {
          const abs = new URL(href, finalTarget).href;
          if (!feeds.some((f) => f.href === abs)) {
            feeds.push({ title: $(el).text() || abs, href: abs });
            pushDbg(dbg, 't', 'feed_anchor_found', { abs });
          }
        }
      });
      pushDbg(dbg, 't', 'scan_anchor_tags_done', { count: feeds.length });

      // 6) Common candidates
      const candidates = [
        '/feed',
        '/feed/rss',
        '/feed/rss.xml',
        '/feed/index.xml',
        '/rss',
        '/rss.xml',
        '/rss/latest.xml',
        '/atom.xml',
        '/index.xml',
        '/feeds/rss.xml',
        '/feeds/all.xml',
        '/feed.atom',
        '/feed.rss',
        '/blog/rss.xml',
        '/articles/rss.xml',
        '/news/rss.xml',
      ];

      pushDbg(dbg, 't', 'candidate_probe_start', {
        candidates: candidates.length,
      });
      for (const path of candidates) {
        const candidateUrl = new URL(path, finalTarget).href;
        const valid = await this.isValidFeed(candidateUrl, dbg);
        if (valid && !feeds.some((f) => f.href === candidateUrl)) {
          feeds.push({ title: candidateUrl, href: candidateUrl });
          pushDbg(dbg, 't', 'candidate_valid', { candidateUrl });
        } else {
          pushDbg(dbg, 't', 'candidate_invalid', { candidateUrl });
        }
      }
      pushDbg(dbg, 't', 'candidate_probe_done', { total: feeds.length });

      // 7) Known domain hints
      const domain = new URL(finalTarget).hostname.replace(/^www\./i, '');
      pushDbg(dbg, 't', 'domain', { domain });
      const hints: string[] = [];

      if (domain.includes('thecut.com')) {
        const known = 'https://feeds.feedburner.com/nymag/fashion';
        const valid = await this.isValidFeed(known, dbg);
        pushDbg(dbg, 't', 'known_check', { known, valid });
        if (valid) feeds.push({ title: 'NYMag Fashion Feed', href: known });
        else hints.push(known);
      }

      // 8) Dedupe
      const deduped = feeds.filter(
        (f, i, arr) => arr.findIndex((x) => x.href === f.href) === i,
      );
      pushDbg(dbg, 't', 'deduped', {
        before: feeds.length,
        after: deduped.length,
      });

      return {
        ok: true,
        feed: deduped.length ? deduped[0].href : null,
        feeds: deduped,
        hints,
        count: deduped.length,
        message: deduped.length
          ? 'Feeds found ✅'
          : 'No feeds found. Try entering a known feed URL manually.',
        ...(debugOn ? { debug: dbg } : {}),
      };
    } catch (err: any) {
      pushDbg(dbg, 'error', 'discover_failed', {
        error: err?.message || String(err),
      });
      if (debugOn)
        return { ok: false, error: err?.message || String(err), debug: dbg };
      throw new InternalServerErrorException('Could not fetch or parse site.');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ✅ FIXED: GET /feeds/fetch?url=…
  // Works with Fastify — no @Res(), returns directly.
  // ─────────────────────────────────────────────────────────────
  @Get('fetch')
  async proxy(@Query('url') url: string) {
    if (!url) throw new BadRequestException('Missing feed URL');

    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const upstream = await fetch(target, {
        headers: {
          'User-Agent': IOS_SAFARI_UA,
          Accept:
            'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://www.google.com',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!upstream.ok) {
        throw new InternalServerErrorException(
          `Feed fetch failed: ${upstream.status} ${upstream.statusText}`,
        );
      }

      const ct =
        upstream.headers.get('content-type') ||
        'application/xml; charset=utf-8';
      const xmlText = await upstream.text();

      // ✅ Return object with proper headers for Fastify
      return {
        headers: { 'content-type': ct },
        body: xmlText,
      };
    } catch (e: any) {
      clearTimeout(timeout);
      throw new InternalServerErrorException(
        `Could not fetch feed: ${e?.message || String(e)}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private async isValidFeed(url: string, dbg?: DebugLine[]): Promise<boolean> {
    pushDbg(dbg ?? [], 't', 'check_feed_start', { url });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': IOS_SAFARI_UA,
          Accept:
            'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://www.google.com',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const ct = res.headers.get('content-type') || '';
      const txt = await res.text();

      const looksXml =
        ct.includes('xml') ||
        txt.includes('<rss') ||
        txt.includes('<feed') ||
        txt.includes('<rdf:RDF');

      pushDbg(dbg ?? [], 't', 'check_feed_result', {
        url: (res as any).url || url,
        status: res.status,
        contentType: ct,
        bodyPreview: txt.slice(0, 240),
        looksXml,
      });

      return res.ok && looksXml;
    } catch (e: any) {
      clearTimeout(timeout);
      pushDbg(dbg ?? [], 'error', 'check_feed_failed', {
        url,
        error: e?.message || String(e),
      });
      return false;
    }
  }

  private async resolveBrandToUrl(
    brand: string,
    dbg?: DebugLine[],
  ): Promise<string | undefined> {
    const slug = brand.trim().toLowerCase().replace(/\s+/g, '');
    const patterns = [
      `https://www.${slug}.com`,
      `https://${slug}.com`,
      `https://www.${slug}.co`,
      `https://${slug}.co`,
      `https://www.${slug}.net`,
      `https://${slug}.net`,
    ];

    for (const u of patterns) {
      try {
        pushDbg(dbg ?? [], 't', 'try_brand_url', { url: u });
        const res = await fetch(u, { method: 'HEAD', redirect: 'follow' });
        pushDbg(dbg ?? [], 't', 'brand_url_result', {
          tried: u,
          status: res.status,
          ok: res.ok,
          final: (res as any).url || u,
        });
        if (res.ok) return (res as any).url || u;
      } catch (e: any) {
        pushDbg(dbg ?? [], 'error', 'brand_url_error', {
          url: u,
          error: e?.message || String(e),
        });
      }
    }
    return undefined;
  }
}

/////////////////

// BELOW HERE WORKING FEED CODE - KEEP

// import {
//   Controller,
//   Get,
//   Query,
//   BadRequestException,
//   InternalServerErrorException,
// } from '@nestjs/common';
// import * as cheerio from 'cheerio';

// @Controller('feeds')
// export class FeedDiscoverController {
//   @Get('discover')
//   async discover(@Query('url') url?: string, @Query('brand') brand?: string) {
//     if (!url && !brand) {
//       throw new BadRequestException('Missing url or brand');
//     }

//     // ✅ Step 1: Try direct URL, fallback to brand resolution
//     let target: string | undefined = url?.trim();

//     if (!target && brand) {
//       const resolved = await this.resolveBrandToUrl(brand);
//       target = resolved ?? undefined;
//       if (!target) {
//         throw new BadRequestException(
//           `Could not resolve a site for brand "${brand}"`,
//         );
//       }
//     }

//     // ✅ Step 2: Ensure protocol
//     if (target && !/^https?:\/\//i.test(target)) {
//       target = `https://${target}`;
//     }

//     // ✅ Step 3: Final guaranteed URL
//     if (!target) {
//       throw new BadRequestException('Could not resolve target URL');
//     }
//     const finalTarget: string = target;

//     console.log('🌐 FEED DISCOVER CALLED for', finalTarget);

//     try {
//       // 🛰️ Fetch homepage HTML
//       const res = await fetch(finalTarget, {
//         headers: {
//           'User-Agent': this.UA,
//           Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
//         },
//         redirect: 'follow',
//       });

//       if (!res.ok) {
//         throw new BadRequestException(
//           `Failed to fetch site: ${res.statusText}`,
//         );
//       }

//       const body = await res.text();
//       const $ = cheerio.load(body);
//       const feeds: { title: string; href: string }[] = [];

//       // 🧠 1️⃣ Look for <link> tags
//       $(
//         'link[type="application/rss+xml"], link[type="application/atom+xml"]',
//       ).each((_, el) => {
//         const href = $(el).attr('href');
//         if (href) {
//           feeds.push({
//             title: $(el).attr('title') || href,
//             href: new URL(href, finalTarget).href,
//           });
//         }
//       });

//       // 🧠 2️⃣ Look for <a> tags that hint at feeds
//       $('a[href*=".xml"], a[href*="/feed"]').each((_, el) => {
//         const href = $(el).attr('href');
//         if (href && (href.endsWith('.xml') || href.includes('/feed'))) {
//           const abs = new URL(href, finalTarget).href;
//           if (!feeds.some((f) => f.href === abs)) {
//             feeds.push({ title: $(el).text() || abs, href: abs });
//           }
//         }
//       });

//       // 🧠 3️⃣ Try common RSS/Atom feed paths
//       const candidates = [
//         '/feed',
//         '/feed/rss',
//         '/feed/rss.xml',
//         '/feed/index.xml',
//         '/rss',
//         '/rss.xml',
//         '/rss/latest.xml',
//         '/atom.xml',
//         '/index.xml',
//         '/feeds/rss.xml',
//         '/feeds/all.xml',
//         '/feed.atom',
//         '/feed.rss',
//         '/blog/rss.xml',
//         '/articles/rss.xml',
//         '/news/rss.xml',
//       ];

//       for (const path of candidates) {
//         const candidateUrl = new URL(path, finalTarget).href;
//         if (await this.isValidFeed(candidateUrl)) {
//           if (!feeds.some((f) => f.href === candidateUrl)) {
//             feeds.push({ title: candidateUrl, href: candidateUrl });
//           }
//         }
//       }

//       // 🧠 4️⃣ Known domain hints
//       const domain = new URL(finalTarget).hostname.replace('www.', '');
//       const hints: string[] = [];

//       if (domain.includes('thecut.com')) {
//         const known = 'https://feeds.feedburner.com/nymag/fashion';
//         if (await this.isValidFeed(known)) {
//           feeds.push({ title: 'NYMag Fashion Feed', href: known });
//         } else {
//           hints.push(known);
//         }
//       }

//       // ✅ Final result
//       return {
//         feed: feeds.length ? feeds[0].href : null,
//         feeds,
//         hints,
//         count: feeds.length,
//         message: feeds.length
//           ? 'Feeds found'
//           : 'No feeds found. Try entering a known feed URL manually.',
//       };
//     } catch (err: any) {
//       console.error('❌ Feed discovery failed:', err.message || err);
//       throw new InternalServerErrorException('Could not fetch or parse site.');
//     }
//   }

//   // ✅ Verify if URL is a valid RSS or Atom feed
//   private async isValidFeed(url: string): Promise<boolean> {
//     try {
//       const res = await fetch(url, {
//         method: 'GET',
//         redirect: 'follow',
//         headers: {
//           'User-Agent': this.UA,
//           Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
//         },
//       });
//       if (!res.ok) return false;

//       const contentType = res.headers.get('content-type') || '';
//       const text = await res.text();
//       return (
//         contentType.includes('xml') ||
//         text.includes('<rss') ||
//         text.includes('<feed')
//       );
//     } catch {
//       return false;
//     }
//   }

//   // 🔍 Try to resolve a brand name → official homepage URL
//   private async resolveBrandToUrl(brand: string): Promise<string | undefined> {
//     console.log(`🔍 Attempting to resolve brand "${brand}"...`);

//     // Common patterns for official sites
//     const patterns = [
//       `https://www.${brand.toLowerCase()}.com`,
//       `https://${brand.toLowerCase()}.com`,
//       `https://www.${brand.toLowerCase()}.co`,
//       `https://${brand.toLowerCase()}.co`,
//       `https://www.${brand.toLowerCase()}.net`,
//       `https://${brand.toLowerCase()}.net`,
//     ];

//     // Try them one by one (HEAD request to avoid downloading pages)
//     for (const url of patterns) {
//       try {
//         const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
//         if (res.ok) {
//           console.log(`✅ Brand "${brand}" resolved to: ${url}`);
//           return url;
//         }
//       } catch {
//         // ignore errors and try next
//       }
//     }

//     console.log(`⚠️ Could not resolve a site for brand "${brand}"`);
//     return undefined;
//   }

//   private readonly UA =
//     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
// }

//////////////////////

// import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
// import * as cheerio from 'cheerio';

// @Controller('feeds')
// export class FeedDiscoverController {
//   @Get('discover')
//   async discover(@Query('url') url: string) {
//     if (!url) throw new BadRequestException('Missing url');

//     let target = url.trim();
//     if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

//     console.log('🌐 FEED DISCOVER CALLED for', target);

//     try {
//       // 🛰️ Fetch homepage
//       const res = await fetch(target, {
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//           Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
//         },
//         redirect: 'follow',
//       });

//       if (!res.ok)
//         throw new BadRequestException(
//           `Failed to fetch site: ${res.statusText}`,
//         );

//       const body = await res.text();
//       const $ = cheerio.load(body);
//       const feeds: { title: string; href: string }[] = [];

//       // 🧠 1️⃣ Look for <link> tags
//       $(
//         'link[type="application/rss+xml"], link[type="application/atom+xml"]',
//       ).each((_, el) => {
//         const href = $(el).attr('href');
//         if (href) {
//           feeds.push({
//             title: $(el).attr('title') || href,
//             href: new URL(href, target).href,
//           });
//         }
//       });

//       // 🧠 2️⃣ Look for <a> with common patterns
//       $('a[href*=".xml"], a[href*="/feed"]').each((_, el) => {
//         const href = $(el).attr('href');
//         if (href && (href.endsWith('.xml') || href.includes('/feed'))) {
//           const abs = new URL(href, target).href;
//           if (!feeds.some((f) => f.href === abs)) {
//             feeds.push({ title: $(el).text() || abs, href: abs });
//           }
//         }
//       });

//       // 🧠 3️⃣ Try standard candidate paths
//       const candidates = [
//         '/feed',
//         '/feed/rss',
//         '/feed/rss.xml',
//         '/feed/index.xml',
//         '/rss',
//         '/rss.xml',
//         '/rss/latest.xml',
//         '/atom.xml',
//         '/index.xml',
//         '/feeds/rss.xml',
//         '/feeds/all.xml',
//         '/feed.atom',
//         '/feed.rss',
//         '/blog/rss.xml',
//         '/articles/rss.xml',
//         '/news/rss.xml',
//       ];

//       for (const path of candidates) {
//         const candidateUrl = new URL(path, target).href;
//         if (await this.isValidFeed(candidateUrl)) {
//           if (!feeds.some((f) => f.href === candidateUrl)) {
//             feeds.push({ title: candidateUrl, href: candidateUrl });
//           }
//         }
//       }

//       // 🧠 4️⃣ Try known feedburner or parent site hints
//       const domain = new URL(target).hostname.replace('www.', '');
//       const hints: string[] = [];

//       // Example: nymag runs The Cut
//       if (domain.includes('thecut.com')) {
//         const known = 'https://feeds.feedburner.com/nymag/fashion';
//         if (await this.isValidFeed(known)) {
//           feeds.push({ title: 'NYMag Fashion Feed', href: known });
//         } else {
//           hints.push(known);
//         }
//       }

//       // ✅ Final decision
//       return {
//         feed: feeds.length ? feeds[0].href : null,
//         feeds,
//         hints,
//         count: feeds.length,
//         message: feeds.length
//           ? 'Feeds found'
//           : 'No feeds found. Try entering a known feed URL manually.',
//       };
//     } catch (err: any) {
//       console.error('❌ Feed discovery failed:', err.message || err);
//       throw new BadRequestException('Could not fetch or parse site.');
//     }
//   }

//   // ✅ Validate if URL is a real RSS/Atom feed
//   private async isValidFeed(url: string): Promise<boolean> {
//     try {
//       const res = await fetch(url, {
//         method: 'GET',
//         redirect: 'follow',
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//           Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
//         },
//       });
//       if (!res.ok) return false;

//       const contentType = res.headers.get('content-type') || '';
//       const text = await res.text();
//       return (
//         contentType.includes('xml') ||
//         text.includes('<rss') ||
//         text.includes('<feed')
//       );
//     } catch {
//       return false;
//     }
//   }
// }

//////////////////

// import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
// import * as cheerio from 'cheerio';

// @Controller('feeds')
// export class FeedDiscoverController {
//   @Get('discover')
//   async discover(@Query('url') url: string) {
//     if (!url) throw new BadRequestException('Missing url');

//     // ✅ Normalize URL
//     let target = url.trim();
//     if (!/^https?:\/\//i.test(target)) {
//       target = `https://${target}`;
//     }

//     console.log(`🌐 FEED DISCOVER CALLED for ${target}`);

//     try {
//       // 🛰️ Fetch homepage HTML
//       const res = await fetch(target, {
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//           Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
//         },
//         redirect: 'follow',
//       });

//       if (!res.ok) {
//         throw new BadRequestException(
//           `Failed to fetch site: ${res.statusText}`,
//         );
//       }

//       const html = await res.text();
//       const $ = cheerio.load(html);
//       const foundFeeds: string[] = [];

//       // 🧠 Stage 1: Look for <link> tags
//       $(
//         'link[type="application/rss+xml"], link[type="application/atom+xml"]',
//       ).each((_, el) => {
//         const href = $(el).attr('href');
//         if (href) {
//           const abs = new URL(href, target).href;
//           foundFeeds.push(abs);
//           console.log(`🔗 Found feed via <link>: ${abs}`);
//         }
//       });

//       // 🧠 Stage 2: Look for <a> tags pointing to .xml or /feed
//       $('a[href*=".xml"], a[href*="/feed"]').each((_, el) => {
//         const href = $(el).attr('href');
//         if (href && (href.endsWith('.xml') || href.includes('/feed'))) {
//           const abs = new URL(href, target).href;
//           if (!foundFeeds.includes(abs)) {
//             foundFeeds.push(abs);
//             console.log(`🔗 Found feed via <a>: ${abs}`);
//           }
//         }
//       });

//       // 🧠 Stage 3: Try common feed URL patterns
//       if (foundFeeds.length === 0) {
//         console.log(`⚙️ No feeds found via HTML. Trying fallback patterns...`);
//         const candidates = [
//           '/feed',
//           '/feed/rss',
//           '/feed/rss.xml',
//           '/feed/index.xml',
//           '/rss',
//           '/rss.xml',
//           '/atom.xml',
//           '/index.xml',
//           '/feeds/rss.xml',
//           '/feeds/all.xml',
//           '/feed.atom',
//           '/feed.rss',
//           '/blog/rss.xml',
//           '/articles/rss.xml',
//           '/news/rss.xml',
//           '/rss/latest.xml',
//         ];

//         for (const path of candidates) {
//           const candidateUrl = new URL(path, target).href;
//           const valid = await this.isValidFeed(candidateUrl);
//           console.log(
//             `📡 Checking ${candidateUrl} -> ${valid ? '✅ valid' : '❌ not valid'}`,
//           );
//           if (valid) {
//             foundFeeds.push(candidateUrl);
//             break; // stop once we find one
//           }
//         }
//       }

//       // 🧠 If still nothing, go to DuckDuckGo fallback
//       if (foundFeeds.length === 0) {
//         console.log(`🔎 No feeds from site. Trying DuckDuckGo discovery...`);
//         const externalFeed = await this.searchExternalFeeds(target);
//         if (externalFeed) {
//           foundFeeds.push(externalFeed);
//         }
//       }

//       // ✅ Pick the single "best" feed (first one we found)
//       const bestFeed = foundFeeds[0] || null;

//       return {
//         feed: bestFeed,
//         count: bestFeed ? 1 : 0,
//         message: bestFeed
//           ? 'Feed found'
//           : 'No feeds found. Try entering a direct RSS URL manually.',
//       };
//     } catch (err: any) {
//       console.error('❌ Feed discovery failed:', err.message || err);
//       throw new BadRequestException('Could not fetch or parse site.');
//     }
//   }

//   // 🧪 Validate if a URL is a valid feed by checking its content
//   private async isValidFeed(url: string): Promise<boolean> {
//     try {
//       const res = await fetch(url, {
//         method: 'GET',
//         redirect: 'follow',
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//           Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
//         },
//       });

//       if (!res.ok) return false;

//       const contentType = res.headers.get('content-type') || '';
//       const text = await res.text();
//       return (
//         contentType.includes('xml') ||
//         contentType.includes('rss') ||
//         text.includes('<rss') ||
//         text.includes('<feed')
//       );
//     } catch {
//       return false;
//     }
//   }
//   // 🔍 Stage 4: Search DuckDuckGo for external feeds (FeedBurner, Substack, Medium, etc.)
//   private async searchExternalFeeds(target: string): Promise<string | null> {
//     try {
//       const hostname = new URL(target).hostname.replace(/^www\./, '');
//       const query = `site:${hostname} rss OR feed OR xml OR atom`;
//       const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
//       console.log(`🔎 Searching DuckDuckGo: ${searchUrl}`);

//       // Small delay to avoid being blocked
//       await this.sleep(500);

//       const res = await fetch(searchUrl, {
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//           Accept: 'text/html',
//         },
//       });

//       if (!res.ok) {
//         console.log(`⚠️ DuckDuckGo request failed: ${res.statusText}`);
//         return null;
//       }

//       const html = await res.text();
//       const $ = cheerio.load(html);
//       const candidates: string[] = [];

//       $('a.result__a').each((_, el) => {
//         const href = $(el).attr('href');
//         if (href && this.looksLikeFeed(href)) {
//           candidates.push(href);
//           console.log(`🔗 Candidate from DuckDuckGo: ${href}`);
//         }
//       });

//       // 🧠 Validate candidates and pick the first valid feed
//       for (const c of candidates) {
//         console.log(`📡 Validating external candidate: ${c}`);
//         if (await this.isValidFeed(c)) {
//           console.log(`✅ External feed validated: ${c}`);
//           return c;
//         }
//       }

//       console.log('⚠️ No external feeds validated.');
//       return null;
//     } catch (e: any) {
//       console.error(`❌ DuckDuckGo discovery failed: ${e.message}`);
//       return null;
//     }
//   }

//   // 🧪 Heuristic: Check if a URL looks like a feed
//   private looksLikeFeed(url: string): boolean {
//     const lower = url.toLowerCase();
//     return (
//       lower.includes('feed') ||
//       lower.includes('rss') ||
//       lower.endsWith('.xml') ||
//       lower.includes('atom') ||
//       lower.includes('feedburner')
//     );
//   }

//   // 🕐 Utility: Sleep for a given ms (used before DuckDuckGo request)
//   private async sleep(ms: number): Promise<void> {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }
// }

//////////////////

// import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
// import * as cheerio from 'cheerio';

// @Controller('feeds')
// export class FeedDiscoverController {
//   @Get('discover')
//   async discover(@Query('url') url: string) {
//     if (!url) throw new BadRequestException('Missing url');

//     // ✅ Normalize URL
//     let target = url.trim();
//     if (!/^https?:\/\//i.test(target)) {
//       target = `https://${target}`;
//     }

//     try {
//       console.log('🌐 FEED DISCOVER CALLED for', target);

//       // 🛰️ Fetch homepage HTML
//       const res = await fetch(target, {
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//           Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
//         },
//         redirect: 'follow',
//       });

//       if (!res.ok) {
//         throw new BadRequestException(
//           `Failed to fetch site: ${res.statusText}`,
//         );
//       }

//       const body = await res.text();
//       const $ = cheerio.load(body);
//       const feeds: { title: string; href: string }[] = [];

//       // 🧠 1️⃣ Look for <link> RSS/Atom tags
//       $(
//         'link[type="application/rss+xml"], link[type="application/atom+xml"]',
//       ).each((_, el) => {
//         const href = $(el).attr('href');
//         if (href) {
//           const fullHref = new URL(href, target).href;
//           console.log('🔗 Found <link> RSS candidate:', fullHref);
//           feeds.push({
//             title: $(el).attr('title') || href,
//             href: fullHref,
//           });
//         }
//       });

//       // 🧠 2️⃣ Look for <a> links pointing to XML/feed paths
//       $('a[href*=".xml"], a[href*="/feed"]').each((_, el) => {
//         const href = $(el).attr('href');
//         if (href && (href.endsWith('.xml') || href.includes('/feed'))) {
//           const abs = new URL(href, target).href;
//           if (!feeds.some((f) => f.href === abs)) {
//             console.log('🔗 Found <a> RSS candidate:', abs);
//             feeds.push({ title: $(el).text() || abs, href: abs });
//           }
//         }
//       });

//       // 🧠 3️⃣ Smart fallback guessing
//       if (feeds.length === 0) {
//         console.log('⚙️ No feeds found via HTML. Trying fallback patterns...');

//         const candidates = [
//           '/feed',
//           '/feed/rss',
//           '/feed/rss.xml',
//           '/feed/all.xml',
//           '/feed/rss/all.xml',
//           '/rss',
//           '/rss.xml',
//           '/rss/all.xml',
//           '/rss/index.xml',
//           '/rss/news.xml',
//           '/rss/latest.xml',
//           '/feed/index.xml',
//           '/feeds/rss.xml',
//           '/feeds/all.xml',
//           '/blog/rss.xml',
//           '/articles/rss.xml',
//           '/index.xml',
//           '/feed.atom',
//           '/feed.rss',
//           '/atom.xml',
//           '/news/rss.xml',
//         ];

//         for (const path of candidates) {
//           const candidateUrl = new URL(path, target).href;
//           console.log('🔍 Trying candidate:', candidateUrl);
//           const ok = await this.isValidFeed(candidateUrl);
//           console.log(
//             '📊 Result for',
//             candidateUrl,
//             ':',
//             ok ? '✅ valid' : '❌ not valid',
//           );
//           if (ok) {
//             feeds.push({ title: candidateUrl, href: candidateUrl });
//           }
//         }
//       }

//       // 🧠 4️⃣ Extra heuristic: try known root-domain feeds (e.g. The Cut -> NYMag)
//       if (feeds.length === 0) {
//         try {
//           const hostname = new URL(target).hostname.replace(/^www\./, '');
//           if (hostname.includes('thecut.com') || hostname.includes('gq.com')) {
//             const knownAlt = 'https://www.nymag.com/rss/all.xml';
//             console.log('🔎 Trying known alternate feed:', knownAlt);
//             const ok = await this.isValidFeed(knownAlt);
//             console.log(
//               '📊 Known alt result:',
//               ok ? '✅ valid' : '❌ not valid',
//             );
//             if (ok) {
//               feeds.push({ title: 'NYMag Master Feed', href: knownAlt });
//             }
//           }
//         } catch (e) {
//           console.log('⚠️ Root-domain heuristic failed:', e);
//         }
//       }

//       return {
//         feeds,
//         count: feeds.length,
//         message: feeds.length
//           ? 'Feeds found'
//           : 'No feeds found. Try entering a direct RSS URL manually.',
//       };
//     } catch (err: any) {
//       console.error('❌ Feed discovery failed:', err.message || err);
//       throw new BadRequestException('Could not fetch or parse site.');
//     }
//   }

//   // 🧪 Helper: check if a candidate URL is a valid RSS/Atom feed
//   private async isValidFeed(url: string): Promise<boolean> {
//     try {
//       const res = await fetch(url, {
//         method: 'GET',
//         redirect: 'follow',
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//           Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
//         },
//       });

//       const contentType = res.headers.get('content-type') || '';
//       const text = await res.text();

//       console.log('📡 Checking', url);
//       console.log('📡 Status:', res.status);
//       console.log('📡 Content-Type:', contentType);
//       console.log('📡 Body snippet:', text.slice(0, 200));

//       if (!res.ok) return false;

//       return (
//         contentType.includes('xml') ||
//         contentType.includes('text') ||
//         text.includes('<rss') ||
//         text.includes('<feed')
//       );
//     } catch (e: any) {
//       console.log('❌ Error validating feed', url, e.message);
//       return false;
//     }
//   }
// }

/////////////////

// import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
// import * as cheerio from 'cheerio';

// @Controller('feeds')
// export class FeedDiscoverController {
//   @Get('discover')
//   async discover(@Query('url') url: string) {
//     if (!url) throw new BadRequestException('Missing url');

//     // ✅ Normalize URL
//     let target = url.trim();
//     if (!/^https?:\/\//i.test(target)) {
//       target = `https://${target}`;
//     }

//     try {
//       // 🛰️ Fetch homepage HTML
//       const res = await fetch(target, {
//         headers: { 'User-Agent': 'StylHelprFeedDiscovery/1.0' },
//         redirect: 'follow',
//       });
//       if (!res.ok) {
//         throw new BadRequestException(
//           `Failed to fetch site: ${res.statusText}`,
//         );
//       }

//       const body = await res.text();
//       const $ = cheerio.load(body);
//       const feeds: { title: string; href: string }[] = [];

//       // 🧠 1️⃣ Standard <link> tags
//       $(
//         'link[type="application/rss+xml"], link[type="application/atom+xml"]',
//       ).each((_, el) => {
//         const href = $(el).attr('href');
//         if (href) {
//           feeds.push({
//             title: $(el).attr('title') || href,
//             href: new URL(href, target).href,
//           });
//         }
//       });

//       // 🧠 2️⃣ Fallback: <a> tags linking to feeds
//       $('a[href*=".xml"], a[href*="/feed"]').each((_, el) => {
//         const href = $(el).attr('href');
//         if (href && (href.endsWith('.xml') || href.includes('/feed'))) {
//           const abs = new URL(href, target).href;
//           if (!feeds.some((f) => f.href === abs)) {
//             feeds.push({ title: $(el).text() || abs, href: abs });
//           }
//         }
//       });

//       // 🧠 3️⃣ Smart guessing: common feed URLs if none found
//       if (feeds.length === 0) {
//         const candidates = [
//           '/feed',
//           '/feed/rss',
//           '/feed/rss.xml',
//           '/rss',
//           '/rss.xml',
//           '/atom.xml',
//           '/index.xml',
//         ];
//         for (const path of candidates) {
//           const candidateUrl = new URL(path, target).href;
//           if (await this.isValidFeed(candidateUrl)) {
//             feeds.push({ title: candidateUrl, href: candidateUrl });
//           }
//         }
//       }

//       return {
//         feeds,
//         count: feeds.length,
//         message: feeds.length
//           ? 'Feeds found'
//           : 'No feeds found. Try entering a direct RSS URL manually.',
//       };
//     } catch (err: any) {
//       console.error('❌ Feed discovery failed:', err.message || err);
//       throw new BadRequestException('Could not fetch or parse site.');
//     }
//   }

//   // 🧪 Helper: HEAD/GET candidate feed URLs and validate if XML RSS/Atom
//   private async isValidFeed(url: string): Promise<boolean> {
//     try {
//       const res = await fetch(url, { method: 'GET', redirect: 'follow' });
//       if (!res.ok) return false;

//       const contentType = res.headers.get('content-type') || '';
//       if (!contentType.includes('xml')) return false;

//       const text = await res.text();
//       return text.includes('<rss') || text.includes('<feed');
//     } catch {
//       return false;
//     }
//   }
// }

/////////////////

// import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
// import * as cheerio from 'cheerio';

// @Controller('feeds')
// export class FeedDiscoverController {
//   @Get('discover')
//   async discover(@Query('url') url: string) {
//     if (!url) throw new BadRequestException('Missing url');

//     // ✅ Normalize URL if user pastes without protocol
//     let target = url;
//     if (!/^https?:\/\//i.test(target)) {
//       target = `https://${target}`;
//     }

//     try {
//       // 🛰️ Fetch the HTML of the site
//       const res = await fetch(target, {
//         headers: { 'User-Agent': 'StylHelprFeedDiscovery/1.0' },
//       });

//       if (!res.ok) {
//         throw new BadRequestException(
//           `Failed to fetch site: ${res.statusText}`,
//         );
//       }

//       const body = await res.text();
//       const $ = cheerio.load(body);

//       const feeds: { title: string; href: string }[] = [];

//       // 🧠 1. Standard <link> tags for RSS/Atom
//       $(
//         'link[type="application/rss+xml"], link[type="application/atom+xml"]',
//       ).each((_, el) => {
//         const href = $(el).attr('href');
//         if (href) {
//           feeds.push({
//             title: $(el).attr('title') || href,
//             href: new URL(href, target).href,
//           });
//         }
//       });

//       // 🧠 2. Fallback: look for <a> tags that link to feeds
//       $('a[href*=".xml"], a[href*="/feed"]').each((_, el) => {
//         const href = $(el).attr('href');
//         if (href && (href.endsWith('.xml') || href.includes('/feed'))) {
//           const abs = new URL(href, target).href;
//           if (!feeds.some((f) => f.href === abs)) {
//             feeds.push({ title: $(el).text() || abs, href: abs });
//           }
//         }
//       });

//       return {
//         feeds,
//         count: feeds.length,
//         message: feeds.length ? 'Feeds found' : 'No feeds found for this site.',
//       };
//     } catch (err: any) {
//       console.error('❌ Feed discovery failed:', err.message || err);
//       throw new BadRequestException('Could not fetch or parse site.');
//     }
//   }
// }
