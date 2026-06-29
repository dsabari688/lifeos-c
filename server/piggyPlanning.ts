import { queryGroq } from "./piggyClient.js";
import { ExecutionPlan, Action } from "./piggyCognitiveTypes.js";

/**
 * Converts reasoning output into an executable, structured plan with priorities,
 * dependencies, fallback paths, and rollback tasks.
 */
export async function runPlanningEngine(
  userQuery: string,
  contextSummary: string
): Promise<ExecutionPlan | null> {
  const prompt = `You are the Piggy AI Planning Engine.
If the user request is a goal or project needing a sequence of actions, build a structured plan.
If the query is a simple question or chat that doesn't need a plan, return a JSON object with "hasPlan": false.

Available Tools & Action Schema:
- "task": { "title": string, "category"?: string, "date"?: string, "priority"?: string, "time"?: string }
- "habit": { "name": string, "frequency"?: string, "icon"?: string }
- "goal": { "title": string, "description"?: string, "targetDate"?: string }
- "expense": { "description": string, "amount": number, "category"?: string }
- "calendar": { "action": "read" }
- "reminder": { "title": string, "message"?: string }
- "notification": { "action": "clear" | "read" }
- "memory": { "action": "write" | "delete", "fact": string }
- "search": { "query": string }
- "analytics": { "action": "get_metrics" }
- "sleep": { "sleepTime": string, "wakeTime": string, "duration": number }
- "mood": { "mood": string, "note"?: string }
- "profile": { "action": "update", "name"?: string, "aiPersonality"?: string, "budgetLimit"?: number }

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object:
{
  "hasPlan": true,
  "plan": {
    "goal": "Core objective of the plan",
    "steps": [
      {
        "id": "step-1",
        "toolId": "task",
        "action": "create",
        "args": { "title": "Revise React router", "action": "create" },
        "dependencies": [],
        "executionOrder": 1,
        "state": "Pending",
        "expectedResult": "Task is added to checklist"
      }
    ],
    "dependencies": ["List of overall plan dependency statements"],
    "resources": ["Resources required, e.g. Books, APIs, Focus time"],
    "estimatedTimeMinutes": 180,
    "priority": "Critical" | "High" | "Medium" | "Low",
    "fallbackPlan": "Fallback description if execution gets blocked",
    "rollbackPlan": "Rollback description to clean up database state if execution fails"
  }
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Planning Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && result.hasPlan === true && result.plan) {
      return result.plan;
    }
    return null;
  } catch (error) {
    console.error("[PLANNING ENGINE] Error generating plan:", error);
    return null;
  }
}
