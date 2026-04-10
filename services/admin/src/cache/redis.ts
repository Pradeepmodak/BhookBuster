import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let ready = false;

const getRedisUrl = () => process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const connectRedis = async () => {
  if (client && ready) {
    return client;
  }

  try {
    client = createClient({ url: getRedisUrl() });

    client.on("error", (error) => {
      ready = false;
      console.error("Redis error:", error.message);
    });

    client.on("ready", () => {
      ready = true;
      console.log("Admin service connected to Redis");
    });

    if (!client.isOpen) {
      await client.connect();
    }

    return client;
  } catch (error) {
    ready = false;
    console.warn("Redis unavailable for admin service, continuing without cache.");
    return null;
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  const redis = await connectRedis();

  if (!redis || !ready) {
    return null;
  }

  const value = await redis.get(key);
  return value ? (JSON.parse(value) as T) : null;
};

export const setCache = async (key: string, value: unknown, ttlInSeconds: number) => {
  const redis = await connectRedis();

  if (!redis || !ready) {
    return;
  }

  await redis.set(key, JSON.stringify(value), {
    EX: ttlInSeconds,
  });
};
