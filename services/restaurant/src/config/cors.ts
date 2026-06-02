import type { CorsOptions } from "cors";

const DEFAULT_CORS_ORIGIN = "http://localhost:5173,http://localhost:5174";

export const getAllowedOrigins = (): string[] =>
  (process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const corsOptions: CorsOptions = {
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-internal-key"],
  origin(origin, callback) {
    if (!origin || getAllowedOrigins().includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
};
