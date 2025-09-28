import {
  Controller,
  Get,
  Query,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { FeedsScrapeService } from './feeds.scrap.service';

@Controller('feeds')
export class FeedScrapeController {
  constructor(private readonly feedsScrapeService: FeedsScrapeService) {}

  @Get('scrape')
  async scrape(@Query('url') url: string) {
    if (!url) throw new BadRequestException('Missing URL');

    try {
      return await this.feedsScrapeService.scrapeUrl(url);
    } catch (err) {
      console.error('❌ Scrape failed:', err.message || err);
      throw new InternalServerErrorException({
        message: 'Could not scrape site.',
        error: err.message || 'Unknown error',
      });
    }
  }
}

//////////////////

// import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
// import * as puppeteer from 'puppeteer';
// import * as cheerio from 'cheerio';

// @Controller('feeds')
// export class FeedScrapeController {
//   @Get('scrape')
//   async scrape(@Query('url') url: string) {
//     if (!url) throw new BadRequestException('Missing url');

//     let target = url.trim();
//     if (!/^https?:\/\//i.test(target)) {
//       target = `https://${target}`;
//     }

//     console.log('🕷️ SCRAPING URL:', target);

//     // 🧪 Step 1: HEAD check before launching Puppeteer
//     try {
//       const head = await fetch(target, { method: 'HEAD' });
//       if (!head.ok) {
//         throw new BadRequestException(
//           `Article not accessible: ${head.status} ${head.statusText}`,
//         );
//       }
//     } catch (e) {
//       console.error('❌ HEAD check failed:', e.message || e);
//       throw new BadRequestException('Could not reach the target URL.');
//     }

//     let browser: puppeteer.Browser | null = null;

//     try {
//       // 🧠 Launch Puppeteer
//       browser = await puppeteer.launch({
//         headless: true,
//         args: [
//           '--no-sandbox',
//           '--disable-setuid-sandbox',
//           '--disable-blink-features=AutomationControlled',
//         ],
//       });

//       const page = await browser.newPage();

//       await page.setUserAgent(
//         'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//       );
//       await page.setViewport({ width: 1280, height: 800 });

//       // 📡 Debug network & page events
//       page.on('console', (msg) => console.log('🪵 PAGE LOG:', msg.text()));
//       page.on('pageerror', (err) =>
//         console.error('💥 PAGE ERROR:', err.message),
//       );
//       page.on('response', (res) =>
//         console.log(`🌐 RESPONSE [${res.status()}] ${res.url()}`),
//       );
//       page.on('requestfailed', (req) =>
//         console.error(
//           `❌ REQUEST FAILED: ${req.url()} - ${req.failure()?.errorText}`,
//         ),
//       );

//       // 🚀 Navigate
//       console.log('🚀 Navigating to:', target);
//       const response = await page.goto(target, {
//         waitUntil: 'domcontentloaded',
//         timeout: 60000,
//       });

//       if (!response) {
//         throw new BadRequestException('No response from site.');
//       }

//       const status = response.status();
//       console.log('📡 Status:', status);
//       console.log('📡 Final URL:', response.url());

//       if (status === 404) {
//         throw new BadRequestException(
//           'This article no longer exists or was removed (404).',
//         );
//       }
//       if (!response.ok()) {
//         throw new BadRequestException(
//           `Failed to fetch site: ${status} ${response.statusText()}`,
//         );
//       }

//       // ⏱️ Wait extra time for JS-rendered content
//       console.log('⏱️ Waiting 5s for JS-rendered content...');
//       await new Promise((resolve) => setTimeout(resolve, 5000));

//       // 📄 Grab HTML
//       const html = await page.content();
//       const $ = cheerio.load(html);

//       // 🔍 Canonical URL fallback
//       const canonical = $('link[rel="canonical"]').attr('href');
//       if (canonical && canonical !== target) {
//         console.log('🔁 Canonical URL detected:', canonical);
//       }

//       // 🧠 Try common article selectors
//       const selectors = [
//         'article',
//         'main',
//         '[role="main"]',
//         '.article-content',
//         '.story-content',
//         '.post-content',
//         '.c-article-body',
//       ];

//       let content = '';
//       for (const sel of selectors) {
//         const section = $(sel).text().trim();
//         console.log(`🔎 Selector "${sel}" length:`, section.length);
//         if (section.length > 500) {
//           content = section;
//           break;
//         }
//       }

//       // 🪄 Fallback: largest <p> block
//       if (!content) {
//         console.log('⚠️ Using fallback: largest <p> block...');
//         let largest = '';
//         $('p').each((_, el) => {
//           const text = $(el).text().trim();
//           if (text.length > largest.length) largest = text;
//         });
//         content = largest || 'No readable content found.';
//       }

//       console.log('✅ Final content length:', content.length);

//       return {
//         url: canonical || target,
//         content,
//         length: content.length,
//         message:
//           content.length > 50
//             ? '✅ Article scraped successfully'
//             : '⚠️ No main article content detected',
//       };
//     } catch (err: any) {
//       console.error('❌ Feed scrape failed:', err.message || err);
//       throw new BadRequestException(
//         `Could not scrape site: ${err.message || 'Unknown error'}`,
//       );
//     } finally {
//       if (browser) await browser.close();
//     }
//   }
// }

///////////////////

// SCRAPER WORKING REALLY GREAT BELOW - KEEP

// import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
// import * as puppeteer from 'puppeteer';
// import * as cheerio from 'cheerio';

// @Controller('feeds')
// export class FeedScrapeController {
//   @Get('scrape')
//   async scrape(@Query('url') url: string) {
//     if (!url) throw new BadRequestException('Missing url');

//     let target = url.trim();
//     if (!/^https?:\/\//i.test(target)) {
//       target = `https://${target}`;
//     }

//     console.log('🕷️ SCRAPING URL:', target);

//     let browser: puppeteer.Browser | null = null;

//     try {
//       // 🧠 Launch Chromium with real-browser fingerprint
//       browser = await puppeteer.launch({
//         headless: false, // ✅ looks more like a real browser
//         args: [
//           '--no-sandbox',
//           '--disable-setuid-sandbox',
//           '--disable-blink-features=AutomationControlled',
//           '--window-size=1280,800',
//           '--disable-dev-shm-usage',
//         ],
//       });

//       const page = await browser.newPage();

//       // 🔒 Disguise automation signals
//       await page.evaluateOnNewDocument(() => {
//         Object.defineProperty(navigator, 'webdriver', { get: () => false });
//         Object.defineProperty(navigator, 'languages', {
//           get: () => ['en-US', 'en'],
//         });
//         Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
//       });

//       // 🧠 Set UA & viewport
//       await page.setUserAgent(
//         'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//       );
//       await page.setViewport({ width: 1280, height: 800 });

//       // 📡 Trace network events for debugging
//       page.on('console', (msg) => console.log('🪵 PAGE LOG:', msg.text()));
//       page.on('pageerror', (err) =>
//         console.error('💥 PAGE ERROR:', err.message),
//       );
//       page.on('response', (res) =>
//         console.log(`🌐 RESPONSE [${res.status()}] ${res.url()}`),
//       );
//       page.on('requestfailed', (req) =>
//         console.error(
//           `❌ REQUEST FAILED: ${req.url()} - ${req.failure()?.errorText}`,
//         ),
//       );

//       // ⏱️ Go to URL
//       console.log('🚀 Navigating to:', target);
//       const response = await page.goto(target, {
//         waitUntil: 'networkidle2',
//         timeout: 90000,
//       });

//       if (!response) {
//         console.error('❌ No response object returned by goto()');
//         throw new BadRequestException('No response from site.');
//       }

//       // 📊 Log response info
//       console.log('📡 Status:', response.status());
//       console.log('📡 StatusText:', response.statusText());
//       console.log('📡 Final URL:', response.url());
//       console.log('📡 Headers:', response.headers());

//       if (!response.ok()) {
//         throw new BadRequestException(
//           `Failed to fetch site: ${response.status()} ${response.statusText()}`,
//         );
//       }

//       // 💤 Wait extra time for JS-rendered content
//       console.log('⏱️ Waiting 6s for JS-rendered content...');
//       await new Promise((resolve) => setTimeout(resolve, 6000));

//       // 📄 Get final DOM HTML
//       const html = await page.content();
//       const $ = cheerio.load(html);

//       // 🧠 Try known article selectors
//       const selectors = [
//         'article',
//         'main',
//         '[role="main"]',
//         '.article-content',
//         '.story-content',
//         '.post-content',
//         '.c-article-body',
//         '.content',
//       ];

//       let content = '';
//       for (const sel of selectors) {
//         const section = $(sel).text().trim();
//         console.log(`🔎 Selector "${sel}" length:`, section.length);
//         if (section.length > 500) {
//           content = section;
//           break;
//         }
//       }

//       // 🪄 Fallback: largest <p> block
//       if (!content) {
//         console.log('⚠️ Using fallback: largest <p> block...');
//         let largest = '';
//         $('p').each((_, el) => {
//           const text = $(el).text().trim();
//           if (text.length > largest.length) largest = text;
//         });
//         content = largest || 'No readable content found.';
//       }

//       console.log('✅ Final content length:', content.length);

//       return {
//         url: target,
//         content,
//         length: content.length,
//         message:
//           content.length > 50
//             ? '✅ Article scraped successfully'
//             : '⚠️ No main article content detected',
//       };
//     } catch (err: any) {
//       console.error('❌ Feed scrape failed:', err.message || err);
//       throw new BadRequestException(
//         `Could not scrape site: ${err.message || 'Unknown error'}`,
//       );
//     } finally {
//       if (browser) {
//         await browser.close();
//       }
//     }
//   }
// }

////////////////////

// import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
// import * as puppeteer from 'puppeteer';
// import * as cheerio from 'cheerio';

// @Controller('feeds')
// export class FeedScrapeController {
//   @Get('scrape')
//   async scrape(@Query('url') url: string) {
//     if (!url) throw new BadRequestException('Missing url');

//     let target = url.trim();
//     if (!/^https?:\/\//i.test(target)) {
//       target = `https://${target}`;
//     }

//     console.log('🕷️ SCRAPING URL:', target);

//     let browser: puppeteer.Browser | null = null;

//     try {
//       // 🧠 Launch Chromium with real-browser fingerprint
//       browser = await puppeteer.launch({
//         headless: false, // ✅ looks more like a real browser
//         args: [
//           '--no-sandbox',
//           '--disable-setuid-sandbox',
//           '--disable-blink-features=AutomationControlled',
//           '--window-size=1280,800',
//           '--disable-dev-shm-usage',
//         ],
//       });

//       const page = await browser.newPage();

//       // 🔒 Disguise automation signals
//       await page.evaluateOnNewDocument(() => {
//         Object.defineProperty(navigator, 'webdriver', { get: () => false });
//         Object.defineProperty(navigator, 'languages', {
//           get: () => ['en-US', 'en'],
//         });
//         Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
//       });

//       // 🧠 Set UA & viewport
//       await page.setUserAgent(
//         'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//       );
//       await page.setViewport({ width: 1280, height: 800 });

//       // 📡 Trace network events for debugging
//       page.on('console', (msg) => console.log('🪵 PAGE LOG:', msg.text()));
//       page.on('pageerror', (err) =>
//         console.error('💥 PAGE ERROR:', err.message),
//       );
//       page.on('response', (res) =>
//         console.log(`🌐 RESPONSE [${res.status()}] ${res.url()}`),
//       );
//       page.on('requestfailed', (req) =>
//         console.error(
//           `❌ REQUEST FAILED: ${req.url()} - ${req.failure()?.errorText}`,
//         ),
//       );

//       // ⏱️ Go to URL
//       console.log('🚀 Navigating to:', target);
//       const response = await page.goto(target, {
//         waitUntil: 'networkidle2',
//         timeout: 90000,
//       });

//       if (!response) {
//         console.error('❌ No response object returned by goto()');
//         throw new BadRequestException('No response from site.');
//       }

//       // 📊 Log response info
//       console.log('📡 Status:', response.status());
//       console.log('📡 StatusText:', response.statusText());
//       console.log('📡 Final URL:', response.url());
//       console.log('📡 Headers:', response.headers());

//       if (!response.ok()) {
//         throw new BadRequestException(
//           `Failed to fetch site: ${response.status()} ${response.statusText()}`,
//         );
//       }

//       // 💤 Wait extra time for JS-rendered content
//       console.log('⏱️ Waiting 6s for JS-rendered content...');
//       await new Promise((resolve) => setTimeout(resolve, 6000));

//       // 📄 Get final DOM HTML
//       const html = await page.content();
//       const $ = cheerio.load(html);

//       // 🧠 Try known article selectors
//       const selectors = [
//         'article',
//         'main',
//         '[role="main"]',
//         '.article-content',
//         '.story-content',
//         '.post-content',
//         '.c-article-body',
//         '.content',
//       ];

//       let content = '';
//       for (const sel of selectors) {
//         const section = $(sel).text().trim();
//         console.log(`🔎 Selector "${sel}" length:`, section.length);
//         if (section.length > 500) {
//           content = section;
//           break;
//         }
//       }

//       // 🪄 Fallback: largest <p> block
//       if (!content) {
//         console.log('⚠️ Using fallback: largest <p> block...');
//         let largest = '';
//         $('p').each((_, el) => {
//           const text = $(el).text().trim();
//           if (text.length > largest.length) largest = text;
//         });
//         content = largest || 'No readable content found.';
//       }

//       console.log('✅ Final content length:', content.length);

//       return {
//         url: target,
//         content,
//         length: content.length,
//         message:
//           content.length > 50
//             ? '✅ Article scraped successfully'
//             : '⚠️ No main article content detected',
//       };
//     } catch (err: any) {
//       console.error('❌ Feed scrape failed:', err.message || err);
//       throw new BadRequestException(
//         `Could not scrape site: ${err.message || 'Unknown error'}`,
//       );
//     } finally {
//       if (browser) {
//         await browser.close();
//       }
//     }
//   }
// }

/////////////

// import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
// import * as cheerio from 'cheerio';

// @Controller('feeds')
// export class FeedScrapeController {
//   @Get('scrape')
//   async scrape(@Query('url') url: string) {
//     if (!url) throw new BadRequestException('Missing url');

//     // ✅ Normalize URL
//     let target = url.trim();
//     if (!/^https?:\/\//i.test(target)) {
//       target = `https://${target}`;
//     }

//     console.log('🕷️ SCRAPING URL:', target);

//     try {
//       // 🛰️ Fetch article HTML with browser-like headers
//       const res = await fetch(target, {
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//           Accept:
//             'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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

//       // 🧠 Attempt to extract main article content
//       let content = '';

//       // Priority 1: <article> tag
//       if ($('article').length) {
//         content = $('article').text();
//       }

//       // Priority 2: <main> content block
//       if (!content && $('main').length) {
//         content = $('main').text();
//       }

//       // Priority 3: Divs with known content classes
//       if (!content) {
//         const candidates = [
//           'div[itemprop="articleBody"]',
//           '.article-content',
//           '.content__body',
//           '.post-content',
//           '.entry-content',
//           '.story-body',
//           '.main-content',
//           '.article-body',
//         ];
//         for (const selector of candidates) {
//           if ($(selector).length) {
//             content = $(selector).text();
//             break;
//           }
//         }
//       }

//       // Fallback: try body text if nothing matched
//       if (!content) {
//         content = $('body').text();
//       }

//       // 🧹 Clean up text
//       content = content.replace(/\s+/g, ' ').trim();

//       if (!content || content.length < 100) {
//         throw new BadRequestException(
//           'Could not extract readable content from this article.',
//         );
//       }

//       return { content };
//     } catch (err: any) {
//       console.error('❌ Feed scrape failed:', err.message || err);
//       throw new BadRequestException('Could not scrape site.');
//     }
//   }
// }

////////////////////

// import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
// import * as cheerio from 'cheerio';
// import fetch from 'node-fetch';

// type ScrapedArticle = {
//   title: string;
//   url: string;
//   image?: string;
//   summary?: string;
//   publishedAt?: string;
//   source: string;
// };

// @Controller('feeds')
// export class FeedScrapeController {
//   @Get('scrape')
//   async scrape(@Query('url') url: string) {
//     if (!url) throw new BadRequestException('Missing url');

//     let target = url.trim();
//     if (!/^https?:\/\//i.test(target)) {
//       target = `https://${target}`;
//     }

//     console.log('🕷️ SCRAPING URL:', target);

//     try {
//       // 🛰️ Fetch the page HTML
//       const res = await fetch(target, {
//         headers: {
//           'User-Agent':
//             'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//           Accept:
//             'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

//       // 🧠 Try to infer article metadata from common tags
//       const title =
//         $('meta[property="og:title"]').attr('content') ||
//         $('meta[name="twitter:title"]').attr('content') ||
//         $('title').first().text() ||
//         '';

//       const image =
//         $('meta[property="og:image"]').attr('content') ||
//         $('meta[name="twitter:image"]').attr('content') ||
//         $('img').first().attr('src') ||
//         undefined;

//       const summary =
//         $('meta[name="description"]').attr('content') ||
//         $('meta[property="og:description"]').attr('content') ||
//         $('meta[name="twitter:description"]').attr('content') ||
//         $('p').first().text() ||
//         '';

//       const publishedAt =
//         $('meta[property="article:published_time"]').attr('content') ||
//         $('time[datetime]').attr('datetime') ||
//         undefined;

//       // 🧠 Fallback: Try to extract main article section text
//       const mainContent = this.extractMainContent($);

//       const article: ScrapedArticle = {
//         title: title.trim(),
//         url: target,
//         image,
//         summary: (summary || mainContent.slice(0, 300)).trim(),
//         publishedAt,
//         source: new URL(target).hostname,
//       };

//       return {
//         feed: [article],
//         count: 1,
//         message: 'Feed scraped successfully',
//       };
//     } catch (err: any) {
//       console.error('❌ Feed scrape failed:', err.message || err);
//       throw new BadRequestException('Could not scrape site.');
//     }
//   }

//   // 🧪 Try to pull meaningful article text from the DOM
//   private extractMainContent($: cheerio.CheerioAPI): string {
//     const selectors = [
//       'article',
//       'main',
//       '[role="main"]',
//       '.post-content',
//       '.entry-content',
//       '.article-body',
//       '.story-body',
//     ];

//     for (const sel of selectors) {
//       const text = $(sel).text().trim();
//       if (text.length > 200) return text;
//     }

//     return $('body').text().replace(/\s+/g, ' ').trim();
//   }
// }
