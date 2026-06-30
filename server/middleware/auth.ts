import { verifyToken } from "../security/jwt.js";
import { logger } from "../logger.js";

/**
 * Express middleware to validate JWT access tokens in the Authorization header.
 */
export function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required. Operation rejected." });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    logger.warn(`[Auth Check] Token validation failed: ${err.message}`);
    return res.status(403).json({ error: "Invalid or expired token. Authentication failed." });
  }
}
