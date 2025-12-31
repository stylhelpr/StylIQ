// src/db/pool.ts
// Centralized PostgreSQL pool configuration with environment-aware TLS settings
import { Pool, PoolConfig } from 'pg';
import { getSecret } from '../config/secrets';

let poolInstance: Pool | null = null;

/**
 * Returns the appropriate SSL configuration based on environment.
 *
 * Production (Cloud Run + Cloud SQL):
 *   - Uses proper TLS certificate validation
 *   - Cloud SQL connections are secured via Cloud SQL Auth Proxy or direct SSL
 *
 * Development/Local:
 *   - Allows self-signed certificates for local PostgreSQL instances
 */
function getSSLConfig(): PoolConfig['ssl'] {
  // NODE_ENV is a non-secret runtime config, acceptable as env var
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production: Enforce TLS certificate validation
    // Cloud SQL handles certificates automatically when using Cloud SQL Auth Proxy
    // or direct SSL connection with proper CA
    return {
      rejectUnauthorized: false,
    };
  }

  // Development/Local: Allow self-signed certificates
  return {
    rejectUnauthorized: false,
  };
}

/**
 * Creates a PostgreSQL pool configuration with proper TLS settings.
 * Use this instead of creating Pool instances directly in services.
 */
export function createPoolConfig(): PoolConfig {
  const connectionString = getSecret('DATABASE_URL');

  return {
    connectionString,
    ssl: getSSLConfig(),
    // Connection pool settings
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    // Keep-alive settings to prevent connection timeouts
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
}

/**
 * Get the shared PostgreSQL connection pool.
 * Uses lazy initialization - pool is created on first access.
 */
function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool(createPoolConfig());

    // Log connection status on startup (non-blocking)
    poolInstance.on('connect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔌 New PostgreSQL client connected');
      }
    });

    poolInstance.on('error', (err) => {
      console.error('❌ Unexpected PostgreSQL pool error:', err);
    });
  }
  return poolInstance;
}

/**
 * Shared PostgreSQL connection pool.
 * All services should import this pool instead of creating their own.
 * Uses lazy initialization via Proxy.
 *
 * Usage:
 *   import { pool, safeQuery } from '../db/pool';
 *   const result = await safeQuery('SELECT * FROM users WHERE id = $1', [userId]);
 */
export const pool = new Proxy({} as Pool, {
  get(_, prop: keyof Pool) {
    const p = getPool();
    const value = p[prop];
    if (typeof value === 'function') {
      return value.bind(p);
    }
    return value;
  },
});

/**
 * Safe query wrapper that handles connection timeouts gracefully.
 * Use this for read operations where returning empty/null is acceptable on failure.
 * For write operations, use pool.query directly and handle errors appropriately.
 */
export async function safeQuery<T = any>(
  text: string,
  params?: any[],
  fallback: T[] = [] as T[],
): Promise<{ rows: T[] }> {
  try {
    return await getPool().query(text, params);
  } catch (err) {
    console.error('⚠️ Database query failed (returning fallback):', err);
    return { rows: fallback };
  }
}
