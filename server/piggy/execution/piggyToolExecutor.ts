import { routeToolCall } from "./piggyToolRouter.js";
import { toolRegistry } from "./piggyToolRegistry.js";

/**
 * Executes a tool call, wrapping it in execution guards such as timeouts and retry handlers.
 */
export async function executeToolWithGuard(
  toolId: string,
  args: any,
  userData: any
): Promise<{ success: boolean; result: any; duration: number; retriesUsed: number }> {
  const tool = toolRegistry[toolId];
  const timeoutMs = tool?.definition.timeout || 5000;
  const maxRetries = tool?.definition.retryCount || 3;

  let retriesUsed = 0;
  let success = false;
  let result: any = null;
  const startTime = Date.now();

  while (!success && retriesUsed < maxRetries) {
    try {
      const executionPromise = routeToolCall(toolId, args, userData);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout of ${timeoutMs}ms exceeded`)), timeoutMs)
      );

      result = await Promise.race([executionPromise, timeoutPromise]);
      success = true;
    } catch (error: any) {
      retriesUsed++;
      console.warn(`[TOOL EXECUTOR] Attempt ${retriesUsed}/${maxRetries} failed for tool "${toolId}":`, error.message);
      if (retriesUsed >= maxRetries) {
        result = { success: false, error: error.message };
      }
    }
  }

  const duration = Date.now() - startTime;
  return {
    success,
    result,
    duration,
    retriesUsed
  };
}
