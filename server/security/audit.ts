import { winstonLogger } from "../logger.js";

export interface AuditLogEntry {
  userId?: string;
  ip: string;
  action: string;
  details?: Record<string, any>;
  status: "success" | "failure";
}

/**
 * Emits a structured audit log entry to tracing logs.
 */
export function recordAuditEvent(entry: AuditLogEntry): void {
  const auditMessage = {
    timestamp: new Date().toISOString(),
    event: "AUDIT_LOG",
    ...entry
  };

  if (entry.status === "failure") {
    winstonLogger.warn(
      `[Audit Failure] Action: ${entry.action} | IP: ${entry.ip} | User: ${entry.userId || "guest"} | Details: ${JSON.stringify(entry.details || {})}`,
      auditMessage
    );
  } else {
    winstonLogger.info(
      `[Audit Success] Action: ${entry.action} | IP: ${entry.ip} | User: ${entry.userId || "guest"}`,
      auditMessage
    );
  }
}
