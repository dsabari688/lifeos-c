import rateLimit from "express-rate-limit";

// General API rate limit: 100 requests / 15 minutes
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

// AI / Jarvis / Vision / Piggy endpoints: 20 attempts per minute
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many AI queries from this IP. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false
});

// Authentication endpoints (login / verify / register): 5 attempts per 15 minutes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});
