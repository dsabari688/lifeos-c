import { Request, Response, NextFunction } from "express";
import { logger } from "../logger.js";
import { NODE_ENV } from "../config/env.js";

/**
 * Global Express centralized error handling middleware.
 * Masks stack traces and system secrets in production environments.
 */
export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const reqId = req.id || "N/A";
  logger.error(`[ReqID: ${reqId}] Centralized Exception Captured:`, err);

  const status = err.status || err.statusCode || 500;
  
  // Mask stack traces and detailed error exceptions in production environments
  const isProduction = NODE_ENV === "production";
  const userMessage = isProduction && status === 500 
    ? "Internal Server Error" 
    : err.message || "An unexpected error occurred.";

  res.status(status).json({
    success: false,
    error: {
      message: userMessage,
      requestId: req.id,
      status
    }
  });
}
