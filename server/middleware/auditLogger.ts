import { Request, Response, NextFunction } from "express";
import { recordAuditEvent } from "../security/audit.js";

/**
 * Express middleware to audit log completed requests and log failures.
 * Captures suspicious HTTP status responses (401, 403, 429, 500) with IP and user metadata.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const clientIp = (req.ip || req.headers["x-forwarded-for"] || "unknown") as string;
  const originalEnd = res.end;

  res.end = function (chunk?: any, encoding?: any, cb?: any): any {
    res.end = originalEnd;
    const result = res.end(chunk, encoding, cb);

    const userId = (req as any).user ? (req as any).user.id : undefined;

    // Monitor rates limits, auth errors, forbidden contexts, and crashes
    const suspiciousStatuses = [401, 403, 429, 500];
    if (suspiciousStatuses.includes(res.statusCode)) {
      recordAuditEvent({
        userId,
        ip: clientIp,
        action: `HTTP_STATUS_${res.statusCode}`,
        details: {
          method: req.method,
          url: req.originalUrl,
          userAgent: req.headers["user-agent"]
        },
        status: "failure"
      });
    }

    return result;
  };

  next();
}
