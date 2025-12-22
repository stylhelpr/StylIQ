import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
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

  // ────────────────────────────────────────────────
  // ➕ POST /api/calendar/event
  // Create a single calendar event
  @Post('event')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(
    @Body()
    body: {
      user_id: string;
      title: string;
      start_date: string;
      end_date?: string;
      location?: string;
      notes?: string;
    },
  ) {
    console.log('📅 POST /calendar/event received:', body);

    if (!body?.user_id || !body?.title || !body?.start_date) {
      console.warn('⚠️ Missing required fields:', { user_id: !!body?.user_id, title: !!body?.title, start_date: !!body?.start_date });
      return { ok: false, error: 'missing_required_fields' };
    }

    try {
      const event = await this.calendarService.createEvent(body);
      console.log('✅ Event created successfully:', event);
      return { ok: true, event };
    } catch (err) {
      console.error('❌ Failed to create event:', err);
      return { ok: false, error: 'database_error' };
    }
  }

  // ────────────────────────────────────────────────
  // 🗑️ DELETE /api/calendar/event/:user_id/:event_id
  // Delete a single calendar event
  @Delete('event/:user_id/:event_id')
  @HttpCode(HttpStatus.OK)
  async deleteEvent(
    @Param('user_id') user_id: string,
    @Param('event_id') event_id: string,
  ) {
    console.log('🗑️ DELETE /calendar/event received:', { user_id, event_id });

    if (!user_id || !event_id) {
      return { ok: false, error: 'missing_required_params' };
    }

    try {
      const result = await this.calendarService.deleteEvent({ user_id, event_id });
      console.log('✅ Event deleted:', result);
      return result;
    } catch (err) {
      console.error('❌ Failed to delete event:', err);
      return { ok: false, error: 'database_error' };
    }
  }
}
