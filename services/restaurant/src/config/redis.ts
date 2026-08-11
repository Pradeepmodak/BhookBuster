import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

let redisClient: Redis | null = null;

try {
  const url = process.env.REDIS_URL;
  if (url) {
    // Validate it's a proper URL before passing to ioredis
    new URL(url);
    redisClient = new Redis(url, {
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis (ioredis)');
    });

    redisClient.on('error', (err: Error) => {
      console.error('❌ Redis Error:', err.message);
    });

    // Attempt connection but don't block startup
    redisClient.connect().catch((err) => {
      console.warn('⚠️ Redis connection failed, continuing without ioredis cache:', err.message);
      redisClient = null;
    });
  } else {
    console.warn('⚠️ REDIS_URL not set, ioredis cache disabled.');
  }
} catch (err: any) {
  console.warn('⚠️ Invalid REDIS_URL, ioredis cache disabled:', err.message);
  redisClient = null;
}

export { redisClient };
