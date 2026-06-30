import rateLimit from "express-rate-limit";

// Authentication endpoints: 10 attempts per 15 minutes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

// AI / Jarvis query endpoints: 30 attempts per minute
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many AI queries from this IP. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false
});

// General application REST APIs: 100 requests per minute
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many API operations from this IP. Rate limit exceeded." },
  standardHeaders: true,
  legacyHeaders: false
});
