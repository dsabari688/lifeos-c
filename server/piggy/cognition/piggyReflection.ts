import { queryGroq } from "../core/piggyClient.js";
import { transitionWorkflowState } from "../types/piggyWorkflow.js";

export interface ReflectionRecord {
  id: string;
  date: string;
  whatWorked: string;
  whatFailed: string;
  mistakes: string[];
  corrections: string[];
  futureImprovements: string;
  timestamp: string;
}

/**
 * Reviews the completed thinking/execution session and appends a reflection record
 * into the database (userData.reflections).
 */
export async function generateAndSaveReflection(
  userQuery: string,
  finalResponse: string,
  executionLogs: any[],
  retryCount: number,
  userData: any
): Promise<void> {
  transitionWorkflowState(userData, 'Reflecting');

  const executionLogsStr = JSON.stringify(executionLogs, null, 2);
  const prompt = `Analyze the reasoning and execution session for the user query.
Determine what was successful, what failed, any mistakes that occurred (including those resolved during retries), corrections made, and plans for future improvement.

User Query: "${userQuery}"
Final Response: "${finalResponse}"
Tool Execution Logs:
${executionLogsStr}
Retries Executed: ${retryCount}

Return a JSON object containing:
- "whatWorked": string (description of successful aspects)
- "whatFailed": string (description of failures, or "None")
- "mistakes": string[] (list of errors, false starts, or retried items)
- "corrections": string[] (how these errors were fixed)
- "futureImprovements": string (actionable advice for future runs, e.g., "Prioritize sleep constraints before planning")

Output strictly JSON. Do not include markdown other than the JSON object.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Reflection Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    const todayStr = new Date().toISOString().split("T")[0];

    const reflection: ReflectionRecord = {
      id: `refl-${Date.now()}`,
      date: todayStr,
      whatWorked: result.whatWorked || "Session completed successfully.",
      whatFailed: result.whatFailed || "None",
      mistakes: Array.isArray(result.mistakes) ? result.mistakes : [],
      corrections: Array.isArray(result.corrections) ? result.corrections : [],
      futureImprovements: result.futureImprovements || "No specific improvements identified.",
      timestamp: new Date().toISOString()
    };

    if (!userData.reflections) {
      userData.reflections = [];
    }

    userData.reflections.push(reflection);

    // Keep reflections history bounded (last 30)
    if (userData.reflections.length > 30) {
      userData.reflections = userData.reflections.slice(-30);
    }

    console.log("[REFLECTION ENGINE] Post-session reflection recorded.");
  } catch (error) {
    console.error("[REFLECTION ENGINE] Error generating reflection:", error);
  }
}

export interface WorkflowReflection {
  id: string;
  goal: string;
  plan: string;
  execution: string;
  mistakes: string[];
  success: boolean;
  improvements: string;
  timestamp: string;
}

/**
 * Persists high-level tool workflow execution reflections to the database context.
 */
export function saveWorkflowReflection(
  userData: any,
  reflection: Omit<WorkflowReflection, 'id' | 'timestamp'>
): void {
  if (!userData.workflowReflections) {
    userData.workflowReflections = [];
  }
  const record: WorkflowReflection = {
    id: `wf-refl-${Date.now()}`,
    ...reflection,
    timestamp: new Date().toISOString()
  };
  userData.workflowReflections.push(record);

  if (userData.workflowReflections.length > 50) {
    userData.workflowReflections = userData.workflowReflections.slice(-50);
  }
  console.log(`[REFLECTION ENGINE] Saved workflow reflection for goal: "${reflection.goal}"`);
}
