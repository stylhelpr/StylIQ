import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ────────────────────────────────────────────────
  // 📥 POST /api/calendar/sync-native
  // Sync inbound native iOS calendar events
  @Post('sync-native')
  @HttpCode(HttpStatus.CREATED)
  async syncNative(@Req() req, @Body() body: { events?: any[] }) {
    const userId = req.user.userId;

    if (!Array.isArray(body?.events)) {
      return { ok: false, error: 'invalid_payload' };
    }

    const res = await this.calendarService.syncNativeEvents({
      user_id: userId,
      events: body.events,
    });

    return res;
  }

  // ────────────────────────────────────────────────
  // 📤 GET /api/calendar/user
  // Retrieve all stored events for a user
  @Get('user')
  @HttpCode(HttpStatus.OK)
  async getUserEvents(@Req() req) {
    const user_id = req.user.userId;
    const events = await this.calendarService.getEventsForUser(user_id);

    return { ok: true, count: events.length, events };
  }

  // ────────────────────────────────────────────────
  // ➕ POST /api/calendar/event
  // Create a single calendar event
  @Post('event')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(
    @Req() req,
    @Body()
    body: {
      title: string;
      start_date: string;
      end_date?: string;
      location?: string;
      notes?: string;
    },
  ) {
    const user_id = req.user.userId;
    console.log('📅 POST /calendar/event received:', { user_id, ...body });

    if (!body?.title || !body?.start_date) {
      console.warn('⚠️ Missing required fields:', { title: !!body?.title, start_date: !!body?.start_date });
      return { ok: false, error: 'missing_required_fields' };
    }

    try {
      const event = await this.calendarService.createEvent({ user_id, ...body });
      console.log('✅ Event created successfully:', event);
      return { ok: true, event };
    } catch (err) {
      console.error('❌ Failed to create event:', err);
      return { ok: false, error: 'database_error' };
    }
  }

  // ────────────────────────────────────────────────
  // 🗑️ DELETE /api/calendar/event/:event_id
  // Delete a single calendar event
  @Delete('event/:event_id')
  @HttpCode(HttpStatus.OK)
  async deleteEvent(
    @Req() req,
    @Param('event_id') event_id: string,
  ) {
    const user_id = req.user.userId;
    console.log('🗑️ DELETE /calendar/event received:', { user_id, event_id });

    if (!event_id) {
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
