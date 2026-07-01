import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../security/jwt.js";
import { logger } from "../logger.js";

export interface AuthRequest extends Request {
  user: any;
}

/**
 * Express middleware to validate JWT access tokens in the Authorization header.
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required. Operation rejected." });
  }

  try {
    const decoded = verifyToken(token) as any;
    req.user = decoded;
    next();
  } catch (err: any) {
    logger.warn(`[Auth Check] Token validation failed: ${err.message}`);
    return res.status(403).json({ error: "Invalid or expired token. Authentication failed." });
  }
}
