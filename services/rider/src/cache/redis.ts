import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let ready = false;

const getRedisUrl = () => process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const CACHE_TTL = {
  stats: 60,
  lists: 60 * 5,
  trends: 60 * 5,
} as const;

export const connectRedis = async () => {
  if (client && ready) {
    return client;
  }

  try {
    client = createClient({ url: getRedisUrl() });

    client.on("error", (error: any) => {
      ready = false;
      console.error("Redis error:", error.message);
    });

    client.on("ready", () => {
      ready = true;
      console.log("Rider service connected to Redis");
    });

    if (!client.isOpen) {
      await client.connect();
    }

    return client;
  } catch (_error) {
    ready = false;
    console.warn("Redis unavailable for rider service, continuing without cache.");
    return null;
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const redis = await connectRedis();
    if (!redis || !ready) {
      return null;
    }

    const value = await redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (_error) {
    console.warn(`Redis read skipped for ${key}`);
    return null;
  }
};

export const setCache = async (key: string, value: unknown, ttlInSeconds: number) => {
  try {
    const redis = await connectRedis();
    if (!redis || !ready) {
      return;
    }

    await redis.set(key, JSON.stringify(value), {
      EX: ttlInSeconds,
    });
  } catch (_error) {
    console.warn(`Redis write skipped for ${key}`);
  }
};

export const deleteCache = async (key: string) => {
  try {
    const redis = await connectRedis();
    if (!redis || !ready) {
      return;
    }

    await redis.del(key);
  } catch (_error) {
    console.warn(`Redis delete skipped for ${key}`);
  }
};

export const withCache = async <T>({
  key,
  ttl,
  fetcher,
}: {
  key: string;
  ttl: number;
  fetcher: () => Promise<T>;
}): Promise<{ data: T; cached: boolean }> => {
  const cached = await getCache<T>(key);
  if (cached) {
    return { data: cached, cached: true };
  }

  const data = await fetcher();
  await setCache(key, data, ttl);
  return { data, cached: false };
};
