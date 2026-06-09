import rateLimit from "express-rate-limit";

// Strict limiter for login and registration endpoints
// 5 attempts per 15 minutes
export const authStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many login attempts from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General limiter for other auth endpoints
// 100 requests per 15 minutes
export const authGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
