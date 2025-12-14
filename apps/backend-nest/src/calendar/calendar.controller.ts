import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ────────────────────────────────────────────────
  // 📥 POST /api/calendar/sync-native
  // Sync inbound native iOS calendar events
  @Post('sync-native')
  @HttpCode(HttpStatus.CREATED)
  async syncNative(@Body() body: { userId?: string; events?: any[] }) {
    // console.log('📥 /calendar/sync-native received:', {
    //   userId: body?.userId,
    //   eventCount: body?.events?.length ?? 0,
    //   sample: body?.events?.[0] ?? null,
    // });

    if (!body?.userId || !Array.isArray(body?.events)) {
      // console.warn('⚠️ Invalid request payload received:', body);
      return { ok: false, error: 'invalid_payload' };
    }

    const res = await this.calendarService.syncNativeEvents({
      user_id: body.userId,
      events: body.events,
    });

    // console.log('📤 /calendar/sync-native response:', res);
    return res;
  }

  // ────────────────────────────────────────────────
  // 📤 GET /api/calendar/user/:user_id
  // Retrieve all stored events for a user
  @Get('user/:user_id')
  @HttpCode(HttpStatus.OK)
  async getUserEvents(@Param('user_id') user_id: string) {
    // console.log(`📡 Fetching stored events for user: ${user_id}`);
    const events = await this.calendarService.getEventsForUser(user_id);

    // console.log(`📦 Retrieved ${events.length} events for ${user_id}`);
    return { ok: true, count: events.length, events };
  }
}
