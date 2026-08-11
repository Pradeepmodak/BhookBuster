import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let ready = false;
let connectionAttempted = false;

const getRedisUrl = () => process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const CACHE_TTL = {
  stats: 60,
  lists: 60 * 5,
  trends: 60 * 5,
} as const;

export const connectRedis = async () => {
  // If already connected and ready, return the client
  if (client && ready) {
    return client;
  }

  // If we already tried and failed, don't keep retrying on every request
  if (connectionAttempted && !ready) {
    return null;
  }

  connectionAttempted = true;

  try {
    const url = getRedisUrl();
    // Validate URL before attempting connection
    new URL(url);

    client = createClient({ url, socket: { reconnectStrategy: false, connectTimeout: 5000 } });

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
  } catch (_error: any) {
    ready = false;
    client = null;
    console.warn("Redis unavailable for rider service, continuing without cache.", _error?.message);
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
