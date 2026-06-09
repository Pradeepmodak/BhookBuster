import rateLimit from "express-rate-limit";

// Global limiter for AI Gateway
// 50 requests per minute to prevent token exhaustion
export const aiGatewayLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: {
    message: "Too many AI requests from this IP, please try again in a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
