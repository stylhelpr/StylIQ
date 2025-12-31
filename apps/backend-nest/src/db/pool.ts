// src/db/pool.ts
// Centralized PostgreSQL pool configuration with production-safe TLS handling

import { Pool, PoolConfig } from 'pg';

/**
 * Returns the appropriate SSL configuration based on environment.
 *
 * Production (Cloud Run + Cloud SQL):
 *   - TLS is enforced by the platform (Cloud SQL Auth Proxy / connector)
 *   - DO NOT override SSL settings or disable cert verification
 *
 * Development / Local:
 *   - Allows self-signed certificates or non-TLS local Postgres
 */
function getSSLConfig(): PoolConfig['ssl'] {
  if (process.env.NODE_ENV === 'production') {
    /**
     * IMPORTANT:
     * In production, we deliberately return `undefined`.
     *
     * Cloud Run + Cloud SQL already enforce TLS with proper
     * certificate validation. Overriding SSL config here
     * increases risk and can accidentally disable verification.
     */
    return undefined;
  }

  /**
   * Local development:
   * Allow self-signed certs or non-TLS Postgres.
   */
  return { rejectUnauthorized: false };
}

/**
 * Creates a PostgreSQL pool configuration with correct TLS behavior.
 * All services must use this instead of creating their own pools.
 */
export function createPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return {
    connectionString,
    ssl: getSSLConfig(),

    // Pool tuning
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,

    // Keep connections alive in Cloud Run
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  };
}

/**
 * Shared PostgreSQL connection pool.
 *
 * Usage:
 *   import { pool, safeQuery } from '../db/pool';
 *   const result = await safeQuery('SELECT * FROM users WHERE id = $1', [userId]);
 */
export const pool = new Pool(createPoolConfig());

// Log connections only outside production
pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔌 PostgreSQL client connected');
  }
});

// Avoid leaking sensitive DB metadata in production logs
pool.on('error', (err) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ PostgreSQL pool error:', err);
  }
});

/**
 * Safe query wrapper for READ operations where failure is non-fatal.
 * DO NOT use this for writes.
 */
export async function safeQuery<T = any>(
  text: string,
  params?: any[],
  fallback: T[] = [] as T[],
): Promise<{ rows: T[] }> {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('⚠️ Database query failed (returning fallback):', err);
    }
    return { rows: fallback };
  }
}

/////////////////

// // src/db/pool.ts
// // Centralized PostgreSQL pool configuration with environment-aware TLS settings
// import { Pool, PoolConfig } from 'pg';

// /**
//  * Returns the appropriate SSL configuration based on environment.
//  *
//  * Production (Cloud Run + Cloud SQL):
//  *   - Uses proper TLS certificate validation
//  *   - Cloud SQL connections are secured via Cloud SQL Auth Proxy or direct SSL
//  *
//  * Development/Local:
//  *   - Allows self-signed certificates for local PostgreSQL instances
//  */
// function getSSLConfig(): PoolConfig['ssl'] {
//   const isProduction = process.env.NODE_ENV === 'production';

//   if (isProduction) {
//     // Production: Enforce TLS certificate validation
//     // Cloud SQL handles certificates automatically when using Cloud SQL Auth Proxy
//     // or direct SSL connection with proper CA
//     return {
//       // rejectUnauthorized: true,
//       rejectUnauthorized: false,
//     };
//   }

//   // Development/Local: Allow self-signed certificates
//   return {
//     rejectUnauthorized: false,
//   };
// }

// /**
//  * Creates a PostgreSQL pool configuration with proper TLS settings.
//  * Use this instead of creating Pool instances directly in services.
//  */
// export function createPoolConfig(): PoolConfig {
//   const connectionString = process.env.DATABASE_URL;

//   if (!connectionString) {
//     throw new Error('DATABASE_URL environment variable is not set');
//   }

//   return {
//     connectionString,
//     ssl: getSSLConfig(),
//     // Connection pool settings
//     max: 10,
//     idleTimeoutMillis: 30000,
//     connectionTimeoutMillis: 30000,
//     // Keep-alive settings to prevent connection timeouts
//     keepAlive: true,
//     keepAliveInitialDelayMillis: 10000,
//   };
// }

// /**
//  * Shared PostgreSQL connection pool.
//  * All services should import this pool instead of creating their own.
//  *
//  * Usage:
//  *   import { pool, safeQuery } from '../db/pool';
//  *   const result = await safeQuery('SELECT * FROM users WHERE id = $1', [userId]);
//  */
// export const pool = new Pool(createPoolConfig());

// // Log connection status on startup (non-blocking)
// pool.on('connect', () => {
//   if (process.env.NODE_ENV !== 'production') {
//     console.log('🔌 New PostgreSQL client connected');
//   }
// });

// pool.on('error', (err) => {
//   console.error('❌ Unexpected PostgreSQL pool error:', err);
// });

// /**
//  * Safe query wrapper that handles connection timeouts gracefully.
//  * Use this for read operations where returning empty/null is acceptable on failure.
//  * For write operations, use pool.query directly and handle errors appropriately.
//  */
// export async function safeQuery<T = any>(
//   text: string,
//   params?: any[],
//   fallback: T[] = [] as T[],
// ): Promise<{ rows: T[] }> {
//   try {
//     return await pool.query(text, params);
//   } catch (err) {
//     console.error('⚠️ Database query failed (returning fallback):', err);
//     return { rows: fallback };
//   }
// }
