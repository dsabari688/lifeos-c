export interface ExecutionLogEntry {
  id: string;
  workflowId: string;
  tool: string;
  executionTimeMs: number;
  success: boolean;
  failureReason: string | null;
  retryCount: number;
  confidence: number;
  timestamp: string;
}

/**
 * Appends execution audit logs to the user database context (userData.executionLogs).
 */
export function logExecution(
  userData: any,
  entry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>
): void {
  if (!userData.executionLogs) {
    userData.executionLogs = [];
  }

  const logRecord: ExecutionLogEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...entry,
    timestamp: new Date().toISOString()
  };

  userData.executionLogs.push(logRecord);

  // Keep logs list bounded (last 100 entries)
  if (userData.executionLogs.length > 100) {
    userData.executionLogs = userData.executionLogs.slice(-100);
  }

  console.log(`[EXECUTION LOGGER] Saved log for workflow: ${entry.workflowId} | tool: ${entry.tool} | success: ${entry.success}`);
}
