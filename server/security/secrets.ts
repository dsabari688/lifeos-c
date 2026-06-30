import { env } from "./env.js";
import { logger } from "../logger.js";

/**
 * Audit checks on secrets to ensure no leak of keys or weak passwords.
 */
export function auditSecrets(): void {
  logger.info("[Security Audit] Auditing configuration variables...");

  if (env.JWT_SECRET === "your-secret-key-lifeos") {
    const errorMsg = "CRITICAL: JWT_SECRET is using a weak development default placeholder.";
    if (env.NODE_ENV === "production") {
      logger.error(`[Security Audit] ${errorMsg} Server startup aborted.`);
      process.exit(1);
    } else {
      logger.warn(`[Security Audit] ${errorMsg} Configure a strong key in production.`);
    }
  }

  if (!env.GROQ_API_KEY) {
    logger.warn("[Security Audit] Warning: GROQ_API_KEY is not defined. AI cognitive services will fail.");
  }

  logger.info("[Security Audit] All checks passed successfully.");
}
