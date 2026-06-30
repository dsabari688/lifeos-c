import helmet from "helmet";
import { Request, Response, NextFunction } from "express";

const helmetHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://ai.google.dev", "https://ai.studio"],
      connectSrc: ["'self'", "https://api.groq.com", "http://127.0.0.1:5001", "http://localhost:5001"],
      frameAncestors: ["'none'"] // clickjacking prevention
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
});

/**
 * Production-ready security headers middleware.
 * Enforces Helmet security policy and restricts device feature access.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  helmetHeaders(req, res, (err) => {
    if (err) return next(err);
    
    // Enforce permissions policy and manual XSS blocking options
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });
}
