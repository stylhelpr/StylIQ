import { Pool } from 'pg';
import { getSecret } from './config/secrets';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getSecret('DATABASE_URL'),
    });
  }
  return pool;
}

async function insertData() {
  const client = await getPool().connect();
  try {
    // Get a real user
    const userRes = await client.query('SELECT id FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      console.error('❌ No users in database');
      return;
    }

    const userId = userRes.rows[0].id;
    console.log('✅ Using user:', userId);

    // Insert test analytics events
    const events = [
      {
        user_id: userId,
        client_event_id: '11111111-1111-1111-1111-111111111111',
        event_type: 'page_view',
        event_ts: new Date().toISOString(),
        canonical_url: 'https://styliq.com/products/blue-shirt',
        domain: 'styliq.com',
        title_sanitized: 'Blue Shirt Size M',
        session_id: 'session-001',
        payload: { dwell_time_sec: 45, scroll_depth_pct: 65 },
      },
      {
        user_id: userId,
        client_event_id: '22222222-2222-2222-2222-222222222222',
        event_type: 'bookmark',
        event_ts: new Date().toISOString(),
        canonical_url: 'https://styliq.com/products/blue-shirt',
        domain: 'styliq.com',
        title_sanitized: 'Blue Shirt Size M',
        session_id: 'session-001',
        payload: { category: 'tops', brand: 'Gap' },
      },
      {
        user_id: userId,
        client_event_id: '33333333-3333-3333-3333-333333333333',
        event_type: 'size_click',
        event_ts: new Date().toISOString(),
        canonical_url: 'https://styliq.com/products/blue-shirt',
        domain: 'styliq.com',
        title_sanitized: 'Blue Shirt Size M',
        session_id: 'session-001',
        payload: { size_clicked: 'M' },
      },
    ];

    for (const event of events) {
      const result = await client.query(
        `INSERT INTO shopping_analytics_events
          (user_id, client_event_id, event_type, event_ts, canonical_url, domain, title_sanitized, session_id, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id, client_event_id) DO NOTHING
         RETURNING id`,
        [
          event.user_id,
          event.client_event_id,
          event.event_type,
          event.event_ts,
          event.canonical_url,
          event.domain,
          event.title_sanitized,
          event.session_id,
          JSON.stringify(event.payload),
        ]
      );

      if (result.rows.length > 0) {
        console.log(`✅ Inserted ${event.event_type}: ${result.rows[0].id}`);
      } else {
        console.log(`⏭️ Skipped duplicate ${event.event_type}: ${event.client_event_id}`);
      }
    }

    // Verify
    const countRes = await client.query(
      'SELECT COUNT(*) FROM shopping_analytics_events WHERE user_id = $1 AND is_deleted = FALSE',
      [userId]
    );
    console.log(`\n✅ Total events in DB: ${countRes.rows[0].count}`);

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await getPool().end();
  }
}

insertData();
