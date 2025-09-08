import { Pool } from 'pg';
const DECAY = 0.9; // weekly; run daily
const DAILY_DECAY = Math.pow(DECAY, 1 / 7);

export async function runDecay(
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),
) {
  const now = new Date().toISOString();
  for (const table of [
    'user_pref_feature',
    'user_pref_item',
    'global_item_quality',
    'global_feature_quality',
  ]) {
    await pool.query(
      `UPDATE ${table} SET score = score * $1, updated_at = $2`,
      [DAILY_DECAY, now],
    );
  }
  await pool.end();
}

if (require.main === module) {
  runDecay()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
