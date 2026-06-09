import rateLimit from "express-rate-limit";

// Global limiter for Restaurant service
// 200 requests per minute
export const restaurantGlobalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: {
    message: "Too many requests from this IP, please try again in a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
