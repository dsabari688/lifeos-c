import { Request, Response, NextFunction } from "express";
import { deepSanitize } from "../security/sanitizer.js";

/**
 * Deep parameter sanitizer middleware.
 * Neutralizes XSS scripting and NoSQL injection patterns across req body, query, and params.
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = deepSanitize(req.body);
  }
  if (req.query) {
    const sanitizedQuery = deepSanitize(req.query);
    Object.defineProperty(req, "query", {
      value: sanitizedQuery,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  if (req.params) {
    const sanitizedParams = deepSanitize(req.params);
    Object.defineProperty(req, "params", {
      value: sanitizedParams,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
}
