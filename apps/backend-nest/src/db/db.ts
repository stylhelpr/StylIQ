// src/db/db.ts
// Re-export the centralized pool for backward compatibility
export { pool } from './pool';

////////////////////

// src/db/db.ts
// import { Pool } from 'pg';

// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });
