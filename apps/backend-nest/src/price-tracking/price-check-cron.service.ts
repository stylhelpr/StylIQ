import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceTrackingService } from './price-tracking.service';
import { DatabaseService } from '../db/database.service';

@Injectable()
export class PriceCheckCronService implements OnModuleInit {
  constructor(
    private readonly priceTrackingService: PriceTrackingService,
    private readonly db: DatabaseService,
  ) {}

  async onModuleInit() {
    // Initialize database tables on startup
    await this.priceTrackingService.initializeDatabase();
  }

  // @Cron(CronExpression.EVERY_HOUR)
  async checkPriceAlerts() {
    try {
      console.log('🔔 Price alert check started...');

      const trackings = await this.priceTrackingService.getAllTrackingsToCheck();

      for (const tracking of trackings) {
        if (tracking.current_price <= tracking.target_price && !tracking.alert_sent) {
          console.log(`✅ Price drop alert for: ${tracking.title} - $${tracking.current_price}`);

          // Mark alert as sent (in production, would send push notification here)
          await this.priceTrackingService.markAlertSent(tracking.id);

          // TODO: Send push notification via Firebase
          // const notificationsService = this.modulesRef.get(NotificationsService);
          // await notificationsService.sendPriceDropNotification(tracking);
        }
      }

      console.log('✅ Price alert check completed');
    } catch (error) {
      console.error('❌ Price alert check failed:', error);
    }
  }
}
