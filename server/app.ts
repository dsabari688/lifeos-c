import express from "express";
import path from "path";
import cors from "cors";

// Security Module Auditing & Env verification
import { env, auditSecrets } from "./security/index.js";
auditSecrets();

// Security Middlewares imports
import { securityHeaders } from "./middleware/securityHeaders.js";
import { sanitizeRequest } from "./middleware/sanitize.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { auditLogger } from "./middleware/auditLogger.js";
import { performanceMiddleware } from "./middleware/performance.js";
import { errorHandlerMiddleware } from "./middleware/errorHandler.js";

// Import route modules
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import dataRoutes from "./routes/data.routes.js";
import moodRoutes from "./routes/mood.js";
import aiRoutes from "./routes/ai.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// 1. Mount security headers (Helmet, Permissions-Policy, HSTS)
app.use(securityHeaders);

// 2. Harden CORS using whitelist validation (Wildcard '*' is blocked in production)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      if (env.CORS_WHITELIST.split(",").includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation: Origin '${origin}' is unauthorized.`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "X-XSRF-TOKEN"]
  })
);

// 3. Mount size limits to defend against large payload buffering DoS attacks
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 4. Request IDs correlation tracing
app.use(requestIdMiddleware);

// 5. Global Audit Logger (intercepts response statuses and captures anomalies)
app.use(auditLogger);

// 6. Deep XSS & NoSQL sanitization
app.use(sanitizeRequest);

// 7. Request latencies and 30-second execution timeouts middleware
app.use(performanceMiddleware);

// Ensure charset=utf-8 on every JSON response
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// 8. General API Rate Limiting applied to REST routes
app.use("/api", apiRateLimiter);

// Serve uploads folder statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Register routes
app.use(healthRoutes);
app.use(authRoutes);
app.use(dataRoutes);
app.use(moodRoutes);
app.use(aiRoutes);
app.use(mediaRoutes);
app.use(adminRoutes);

/**
 * Configures the SPA client static asset serving.
 * Uses Vite in development or serves the built index.html from dist/ in production.
 */
export async function configureStaticAssets(expressApp: express.Application) {
  if (env.NODE_ENV !== "production") {
    const vite = await import("vite");
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(viteServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    expressApp.use(express.static(distPath));
    expressApp.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Centered error handling middleware mounted at the very end
  expressApp.use(errorHandlerMiddleware);
}

export default app;
