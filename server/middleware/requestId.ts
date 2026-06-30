import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

import { loggerStorage } from "../logger.js";

/**
 * Middleware to append a unique X-Request-ID to request and response headers.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.id = reqId;
  res.setHeader("x-request-id", reqId);
  
  // Trace all logging calls in downstream middleware and routers
  loggerStorage.run({ requestId: reqId }, () => {
    next();
  });
}
