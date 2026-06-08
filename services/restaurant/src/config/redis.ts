import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

export const redisClient = new (Redis as any)(process.env.REDIS_URL as string);

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis (ioredis)');
});

redisClient.on('error', (err: Error) => {
  console.error('❌ Redis Error:', err);
});
