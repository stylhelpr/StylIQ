// src/utils/redisClient.ts
import { Redis } from '@upstash/redis';
import { getSecret } from '../config/secrets';

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    client = new Redis({
      url: getSecret('UPSTASH_REDIS_REST_URL'),
      token: getSecret('UPSTASH_REDIS_REST_TOKEN'),
    });
  }
  return client;
}

// Legacy export for backward compatibility - proxy to lazy client
export const redis = new Proxy({} as Redis, {
  get(_, prop: keyof Redis) {
    return getRedisClient()[prop];
  },
});
