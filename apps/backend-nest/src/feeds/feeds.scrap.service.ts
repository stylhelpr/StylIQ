import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as xml2js from 'xml2js';

@Injectable()
export class FeedsScrapeService {
  private readonly UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  async scrapeUrl(url: string) {
    const isRss = url.endsWith('.xml') || url.includes('/feed');

    if (isRss) {
      return this.scrapeRss(url);
    } else {
      return this.scrapeArticle(url);
    }
  }

  /** 📰 RSS FEED PARSER */
  private async scrapeRss(url: string) {
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': this.UA,
          Accept: 'application/rss+xml, text/xml',
        },
        timeout: 15000,
      });

      const result = await xml2js.parseStringPromise(data, {
        mergeAttrs: true,
      });
      const channel = result?.rss?.channel?.[0];
      if (!channel) throw new BadRequestException('Invalid RSS feed format');

      const items = (channel.item || []).map((item: any) => ({
        title: item.title?.[0] || '',
        link: item.link?.[0] || '',
        pubDate: item.pubDate?.[0] || '',
        description: item.description?.[0] || '',
        image:
          item['media:content']?.[0]?.url ||
          item.enclosure?.[0]?.url ||
          this.extractImageFromDesc(item.description?.[0]) ||
          null,
      }));

      return {
        type: 'rss',
        title: channel.title?.[0] || '',
        description: channel.description?.[0] || '',
        siteLink: channel.link?.[0] || '',
        items,
      };
    } catch (err) {
      console.error('❌ RSS scrape failed:', err.message);
      throw new BadRequestException(`Failed to parse RSS feed: ${err.message}`);
    }
  }

  /** 🕷️ ARTICLE SCRAPER */
  private async scrapeArticle(url: string) {
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': this.UA, Accept: 'text/html' },
        timeout: 20000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(data);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().trim() ||
        '';

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';

      const images: string[] = [];
      $('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src && !images.includes(src) && src.startsWith('http')) {
          images.push(src);
        }
      });

      const articleText = this.extractMainText($);

      return {
        type: 'article',
        url,
        title,
        description,
        images,
        content: articleText,
        wordCount: articleText.split(/\s+/).length,
      };
    } catch (err) {
      console.error('❌ Article scrape failed:', err.message);
      throw new BadRequestException(`Failed to scrape article: ${err.message}`);
    }
  }

  /** 🧠 Extract readable article text */
  private extractMainText($: cheerio.CheerioAPI): string {
    let article = $('article');
    if (!article.length) article = $('main');
    if (!article.length) article = $('body');

    return article
      .find('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .join('\n\n');
  }

  /** 🖼️ Extract image from HTML description */
  private extractImageFromDesc(desc: string): string | null {
    if (!desc) return null;
    const match = desc.match(/<img[^>]+src="([^">]+)"/);
    return match ? match[1] : null;
  }
}
