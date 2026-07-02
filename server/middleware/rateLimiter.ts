import rateLimit from "express-rate-limit";

// Helper to get user ID from the request token
const getUserId = (req: any) => req.user?.id || req.ip;

// General API rate limit: 100 requests / 15 minutes
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => getUserId(req), // Now tracks by User ID!
  message: { error: "Too many requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

// AI / Jarvis / Vision / Piggy endpoints: 20 attempts per minute
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => getUserId(req), // Now tracks by User ID!
  message: { error: "Too many AI queries. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false
});

// Authentication endpoints: 5 attempts per 15 minutes
// Keep this one by IP, because users aren't logged in yet!
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});