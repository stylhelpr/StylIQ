import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Parser from 'rss-parser';
import { Pool } from 'pg';
import { NotificationsService } from '../notifications/notifications.service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🔔 Sources to watch (names MUST match what users follow via your Feeds UI)
const SOURCES: Array<{ name: string; url: string }> = [
  { name: 'Vogue', url: 'https://www.vogue.com/feed/rss' },
  { name: 'GQ', url: 'https://www.gq.com/feed/rss' },
  // add more…
];

@Injectable()
export class FeedsCronService {
  private readonly log = new Logger(FeedsCronService.name);
  private parser = new Parser();

  constructor(private readonly notifications: NotificationsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollFeeds() {
    await this.ensureTables();

    for (const src of SOURCES) {
      try {
        const feed = await this.parser.parseURL(src.url);

        for (const item of (feed.items || []).slice(0, 10)) {
          const url = (item.link || '').trim();
          const title = (item.title || '').trim();
          if (!url || !title) continue;

          // dedupe: only notify once per (source,url)
          const inserted = await this.tryMarkSeen(src.name, url);
          if (!inserted) continue;

          await this.notifications.notifyFollowersOfSourceArticle({
            source: src.name,
            title,
            url,
            image: (item as any).enclosure?.url || undefined,
          });
        }
      } catch (e) {
        this.log.warn(`Feed error for ${src.name}: ${e}`);
      }
    }
  }

  private async ensureTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feed_seen (
        source  text NOT NULL,
        url     text NOT NULL,
        seen_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (source, url)
      );
    `);
  }

  private async tryMarkSeen(source: string, url: string): Promise<boolean> {
    const res = await pool.query(
      `INSERT INTO feed_seen (source, url) VALUES ($1,$2)
       ON CONFLICT (source, url) DO NOTHING`,
      [source, url],
    );
    return res.rowCount > 0;
  }
}
