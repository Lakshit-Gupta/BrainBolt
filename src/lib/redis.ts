import Redis from 'ioredis';

declare global {
  var redis: Redis | undefined;
}

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying, trigger fallback
      return Math.min(times * 200, 1000);
    },
    lazyConnect: false,
    enableOfflineQueue: false,
  });

  client.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  client.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  return client;
}

// Singleton: reuse existing connection across hot reloads in dev
// In production, module is only loaded once so this is equivalent
const redis: Redis = globalThis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.redis = redis;
}

export default redis;
