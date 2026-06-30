import { Request, Response, NextFunction } from "express";
import { metrics } from "../monitoring/metrics.js";
import { logger } from "../logger.js";

/**
 * Performance middleware to track endpoint execution latencies,
 * log resource footprints, and enforce a strict 30-second execution timeout.
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage().heapUsed;

  // Enforce 30-second API Gateway execution timeout
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      logger.error(`[API Timeout] Request ${req.method} ${req.path} timed out after 30 seconds.`);
      
      // Emit timeout event so that handlers (e.g. AI controllers) can abort operations
      req.emit("timeout");
      
      res.status(503).json({
        success: false,
        message: "Gateway Timeout: Request execution exceeded the 30-second boundary."
      });
    }
  }, 30 * 1000);

  res.on("finish", () => {
    clearTimeout(timeoutId);

    const diff = process.hrtime(startTime);
    const durationMs = parseFloat(((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2));
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDeltaKb = parseFloat(((endMemory - startMemory) / 1024).toFixed(2));

    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    
    // Record into global telemetry metrics
    metrics.recordResponseTime(req.route?.path || req.path, durationMs);

    const logMessage = `[API Perf] ${endpoint} - ${res.statusCode} | Duration: ${durationMs}ms | Memory Delta: ${memoryDeltaKb > 0 ? "+" : ""}${memoryDeltaKb}KB`;
    
    if (durationMs > 200) {
      logger.warn(logMessage);
    } else {
      logger.info(logMessage);
    }
  });

  next();
}
