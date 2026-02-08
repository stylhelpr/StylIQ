// apps/backend-nest/src/scheduled-outfit/outfit-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { pool } from '../db/pool';

@Injectable()
export class OutfitCronService {
  private readonly log = new Logger(OutfitCronService.name);

  constructor(private readonly notify: NotificationsService) {}

  // runs every minute; fire anything due and not yet notified
  @Cron('*/1 * * * *')
  async sendDueOutfitAlerts() {
    try {
      // 1) fetch due, not yet notified
      const { rows } = await pool.query(
        `
        SELECT
          so.id,
          so.user_id,
          so.scheduled_for,
          COALESCE(co.name, ai.name, 'your planned outfit') AS outfit_name
        FROM scheduled_outfits so
        LEFT JOIN custom_outfits co ON so.custom_outfit_id = co.id
        LEFT JOIN outfit_suggestions ai ON so.ai_outfit_id = ai.id
        WHERE so.notified_at IS NULL
          AND so.scheduled_for <= now()
        ORDER BY so.scheduled_for ASC
        LIMIT 500
        `,
      );

      if (!rows.length) return;

      // 2) send pushes
      for (const r of rows) {
        await this.notify.sendPushToUser(
          r.user_id,
          'Outfit Reminder',
          `Wear ${r.outfit_name} 👕`,
          { type: 'outfit', scheduled_outfit_id: String(r.id) },
        );
      }

      // 3) mark notified
      const ids = rows.map((r) => r.id);
      await pool.query(
        `UPDATE scheduled_outfits SET notified_at = now() WHERE id = ANY($1::uuid[])`,
        [ids],
      );

      this.log.log(`Sent ${rows.length} outfit reminder(s).`);
    } catch (e) {
      this.log.error('sendDueOutfitAlerts failed', e);
    }
  }
}
