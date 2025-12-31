import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import { TrackItemDto, UpdatePriceAlertDto, UpdatePriceDto } from './dto/track-item.dto';

@Injectable()
export class PriceTrackingService {
  constructor(private readonly db: DatabaseService) {}

  async initializeDatabase() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS price_tracking (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        title VARCHAR(255) NOT NULL,
        brand VARCHAR(100),
        source VARCHAR(100) NOT NULL,
        current_price DECIMAL(10, 2) NOT NULL,
        target_price DECIMAL(10, 2),
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_checked TIMESTAMP,
        alert_sent BOOLEAN DEFAULT false,
        UNIQUE(user_id, url)
      );

      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        tracking_id INTEGER NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,
        price DECIMAL(10, 2) NOT NULL,
        recorded_at TIMESTAMP DEFAULT NOW(),
        user_updated BOOLEAN DEFAULT true
      );

      CREATE INDEX IF NOT EXISTS idx_price_tracking_user ON price_tracking(user_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_tracking ON price_history(tracking_id);
    `;

    try {
      await this.db.query(createTableQuery);
      // console.log('✅ Price tracking tables initialized');
    } catch (error) {
      // console.log('ℹ️ Price tracking tables already exist');
    }
  }

  async addPriceTracking(userId: string, item: TrackItemDto) {
    const query = `
      INSERT INTO price_tracking
      (user_id, url, title, brand, source, current_price, target_price, enabled, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
      ON CONFLICT (user_id, url)
      DO UPDATE SET
        current_price = $6,
        target_price = COALESCE($7, price_tracking.target_price),
        enabled = true,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await this.db.query(query, [
      userId,
      item.url,
      item.title,
      item.brand,
      item.source,
      item.currentPrice,
      item.targetPrice || null,
    ]);

    const tracking = result.rows[0];

    // Record initial price in history
    await this.db.query(
      'INSERT INTO price_history (tracking_id, price, user_updated) VALUES ($1, $2, true)',
      [tracking.id, item.currentPrice],
    );

    return tracking;
  }

  async getPriceAlerts(userId: string) {
    const query = `
      SELECT
        pt.*,
        COALESCE(json_agg(
          json_build_object(
            'id', ph.id,
            'price', ph.price,
            'recordedAt', ph.recorded_at
          ) ORDER BY ph.recorded_at DESC
        ) FILTER (WHERE ph.id IS NOT NULL), '[]'::json) as priceHistory
      FROM price_tracking pt
      LEFT JOIN price_history ph ON pt.id = ph.tracking_id
      WHERE pt.user_id = $1 AND pt.enabled = true
      GROUP BY pt.id
      ORDER BY pt.updated_at DESC;
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  async updatePriceAlert(userId: string, trackingId: number, update: UpdatePriceAlertDto) {
    const query = `
      UPDATE price_tracking
      SET
        target_price = COALESCE($3, target_price),
        enabled = COALESCE($4, enabled),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;

    const result = await this.db.query(query, [
      trackingId,
      userId,
      update.targetPrice || null,
      update.enabled !== undefined ? update.enabled : null,
    ]);

    return result.rows[0];
  }

  async updatePrice(userId: string, trackingId: number, priceUpdate: UpdatePriceDto) {
    // Update current price
    const updateQuery = `
      UPDATE price_tracking
      SET
        current_price = $3,
        alert_sent = false,
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;

    const result = await this.db.query(updateQuery, [trackingId, userId, priceUpdate.price]);
    const tracking = result.rows[0];

    // Record in history
    await this.db.query(
      'INSERT INTO price_history (tracking_id, price, user_updated) VALUES ($1, $2, true)',
      [trackingId, priceUpdate.price],
    );

    return tracking;
  }

  async removePriceTracking(userId: string, trackingId: number) {
    const query = `
      UPDATE price_tracking
      SET enabled = false, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;

    const result = await this.db.query(query, [trackingId, userId]);
    return result.rows[0];
  }

  async getPriceHistory(userId: string, trackingId: number) {
    const query = `
      SELECT ph.* FROM price_history ph
      JOIN price_tracking pt ON ph.tracking_id = pt.id
      WHERE ph.tracking_id = $1 AND pt.user_id = $2
      ORDER BY ph.recorded_at DESC
      LIMIT 100;
    `;

    const result = await this.db.query(query, [trackingId, userId]);
    return result.rows;
  }

  async checkPriceAlerts(userId: string) {
    const query = `
      SELECT * FROM price_tracking
      WHERE user_id = $1
      AND enabled = true
      AND target_price IS NOT NULL
      AND current_price <= target_price
      AND alert_sent = false;
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  async markAlertSent(trackingId: number) {
    const query = `
      UPDATE price_tracking
      SET alert_sent = true, last_checked = NOW()
      WHERE id = $1;
    `;

    await this.db.query(query, [trackingId]);
  }

  async getAllTrackingsToCheck() {
    const query = `
      SELECT * FROM price_tracking
      WHERE enabled = true
      AND target_price IS NOT NULL
      AND (last_checked IS NULL OR last_checked < NOW() - INTERVAL '1 hour');
    `;

    const result = await this.db.query(query);
    return result.rows;
  }
}
