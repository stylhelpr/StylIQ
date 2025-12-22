import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class CalendarService {
  // ─────────────────────────────────────────────────────────────
  // 🧱 Ensure table exists
  private async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_calendar_events (
        user_id uuid NOT NULL,
        event_id text NOT NULL,
        title text,
        start_date timestamptz,
        end_date timestamptz,
        location text,
        notes text,
        updated_at timestamptz DEFAULT now(),
        PRIMARY KEY (user_id, event_id)
      );
    `);
  }

  // ─────────────────────────────────────────────────────────────
  // 🔄 Sync events from native iOS calendar
  // ─────────────────────────────────────────────────────────────
  // 🔄 Sync events from native iOS calendar (with deletions)
  async syncNativeEvents(dto: { user_id: string; events: any[] }) {
    const { user_id, events } = dto;

    if (!user_id || !Array.isArray(events)) {
      console.warn('⚠️ Missing user_id or invalid events array');
      return { ok: false, error: 'invalid_payload' };
    }

    await this.ensureTable();

    // 1️⃣ Get existing events for this user
    const existingRes = await pool.query(
      `SELECT event_id FROM user_calendar_events WHERE user_id = $1;`,
      [user_id],
    );
    const existingIds = existingRes.rows.map((r) => r.event_id);
    const incomingIds = events.map((e) => e.id);

    // 2️⃣ Detect which events were deleted in iOS
    // IMPORTANT: Don't delete app-created events (styliq_ prefix) - they have their own lifecycle
    const deletedIds = existingIds.filter(
      (id) => !incomingIds.includes(id) && !id.startsWith('styliq_'),
    );

    // 3️⃣ Delete them from DB (only iOS-synced events, not app-created ones)
    if (deletedIds.length > 0) {
      await pool.query(
        `DELETE FROM user_calendar_events WHERE user_id = $1 AND event_id = ANY($2::text[]);`,
        [user_id, deletedIds],
      );
      console.log(`🗑️ Removed ${deletedIds.length} deleted iOS events`);
    }

    // 4️⃣ Upsert all remaining events (insert or update)
    let inserted = 0;
    for (const e of events) {
      try {
        await pool.query(
          `
        INSERT INTO user_calendar_events
          (user_id, event_id, title, start_date, end_date, location, notes, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,now())
        ON CONFLICT (user_id, event_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          location = EXCLUDED.location,
          notes = EXCLUDED.notes,
          updated_at = now();
      `,
          [
            user_id,
            e.id,
            e.title || '(no title)',
            e.startDate ? new Date(e.startDate) : null,
            e.endDate ? new Date(e.endDate) : null,
            e.location || '',
            e.notes || '',
          ],
        );
        inserted++;
      } catch (err) {
        console.error('❌ Failed to insert calendar event:', e.id, err);
      }
    }

    // 5️⃣ Return structured summary
    return {
      ok: true,
      synced: inserted,
      deleted: deletedIds.length,
      totalInIOS: events.length,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 📥 Fetch all stored events (optional helper)
  async getEventsForUser(user_id: string) {
    await this.ensureTable();
    const { rows } = await pool.query(
      `
      SELECT event_id, title, start_date, end_date, location, notes, updated_at
      FROM user_calendar_events
      WHERE user_id = $1
      ORDER BY start_date ASC;
    `,
      [user_id],
    );
    return rows;
  }

  // ─────────────────────────────────────────────────────────────
  // 🧹 Cleanup old events (optional maintenance)
  async cleanupOldEvents(days = 60) {
    await this.ensureTable();
    const { rowCount } = await pool.query(
      `DELETE FROM user_calendar_events WHERE start_date < now() - interval '${days} days';`,
    );
    console.log(`🧹 Removed ${rowCount} expired calendar events`);
  }

  // ─────────────────────────────────────────────────────────────
  // ➕ Create a single calendar event
  async createEvent(dto: {
    user_id: string;
    title: string;
    start_date: string;
    end_date?: string;
    location?: string;
    notes?: string;
  }) {
    console.log('📅 CalendarService.createEvent called with:', dto);
    await this.ensureTable();

    // Generate a unique event_id for app-created events
    const event_id = `styliq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('📅 Generated event_id:', event_id);

    const params = [
      dto.user_id,
      event_id,
      dto.title,
      new Date(dto.start_date),
      dto.end_date ? new Date(dto.end_date) : new Date(dto.start_date),
      dto.location || '',
      dto.notes || '',
    ];
    console.log('📅 Insert params:', params);

    const { rows } = await pool.query(
      `
      INSERT INTO user_calendar_events
        (user_id, event_id, title, start_date, end_date, location, notes, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      RETURNING *;
      `,
      params,
    );

    console.log('📅 Insert result:', rows[0]);
    return rows[0];
  }

  // ─────────────────────────────────────────────────────────────
  // 🗑️ Delete a single calendar event
  async deleteEvent(dto: { user_id: string; event_id: string }) {
    await this.ensureTable();

    const { rowCount } = await pool.query(
      `DELETE FROM user_calendar_events WHERE user_id = $1 AND event_id = $2;`,
      [dto.user_id, dto.event_id],
    );

    console.log(`🗑️ Deleted event ${dto.event_id} for user ${dto.user_id}`);
    return { ok: true, deleted: rowCount === 1 };
  }
}

//////////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Injectable()
// export class CalendarService {
//   // ─────────────────────────────────────────────────────────────
//   // 🧱 Ensure table exists
//   private async ensureTable() {
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS user_calendar_events (
//         user_id uuid NOT NULL,
//         event_id text NOT NULL,
//         title text,
//         start_date timestamptz,
//         end_date timestamptz,
//         location text,
//         notes text,
//         updated_at timestamptz DEFAULT now(),
//         PRIMARY KEY (user_id, event_id)
//       );
//     `);
//   }

//   // ─────────────────────────────────────────────────────────────
//   // 🔄 Sync events from native iOS calendar
//   async syncNativeEvents(dto: { user_id: string; events: any[] }) {
//     const { user_id, events } = dto;

//     if (!user_id || !Array.isArray(events)) {
//       console.warn('⚠️ Missing user_id or invalid events array');
//       return { ok: false, error: 'invalid_payload' };
//     }

//     await this.ensureTable();

//     let inserted = 0;

//     for (const e of events) {
//       try {
//         await pool.query(
//           `
//           INSERT INTO user_calendar_events
//             (user_id, event_id, title, start_date, end_date, location, notes, updated_at)
//           VALUES ($1,$2,$3,$4,$5,$6,$7,now())
//           ON CONFLICT (user_id, event_id)
//           DO UPDATE SET
//             title = EXCLUDED.title,
//             start_date = EXCLUDED.start_date,
//             end_date = EXCLUDED.end_date,
//             location = EXCLUDED.location,
//             notes = EXCLUDED.notes,
//             updated_at = now();
//         `,
//           [
//             user_id,
//             e.id,
//             e.title || '(no title)',
//             e.startDate ? new Date(e.startDate) : null,
//             e.endDate ? new Date(e.endDate) : null,
//             e.location || '',
//             e.notes || '',
//           ],
//         );
//         inserted++;
//       } catch (err) {
//         console.error('❌ Failed to insert calendar event:', e.id, err);
//       }
//     }

//     console.log(
//       `✅ Synced ${inserted}/${events.length} events for user ${user_id}`,
//     );
//     return { ok: true, count: inserted };
//   }

//   // ─────────────────────────────────────────────────────────────
//   // 📥 Fetch all stored events (optional helper)
//   async getEventsForUser(user_id: string) {
//     await this.ensureTable();
//     const { rows } = await pool.query(
//       `
//       SELECT event_id, title, start_date, end_date, location, notes, updated_at
//       FROM user_calendar_events
//       WHERE user_id = $1
//       ORDER BY start_date ASC;
//     `,
//       [user_id],
//     );
//     return rows;
//   }

//   // ─────────────────────────────────────────────────────────────
//   // 🧹 Cleanup old events (optional maintenance)
//   async cleanupOldEvents(days = 60) {
//     await this.ensureTable();
//     const { rowCount } = await pool.query(
//       `DELETE FROM user_calendar_events WHERE start_date < now() - interval '${days} days';`,
//     );
//     console.log(`🧹 Removed ${rowCount} expired calendar events`);
//   }
// }
