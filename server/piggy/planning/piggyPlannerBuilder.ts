import { queryGroq } from "../core/piggyClient.js";
import { ExecutionPlan } from "../types/piggyCognitiveTypes.js";

/**
 * Optimizes a generated plan by merging duplicates, balancing workload,
 * grouping similar tasks, and reducing context switching.
 */
export async function optimizePlan(
  plan: ExecutionPlan,
  contextSummary: string
): Promise<ExecutionPlan> {
  const prompt = `You are the Piggy AI Plan Optimizer.
Take this structured execution plan and refine it to be highly efficient.
Your optimizations MUST:
1. Merge duplicate or highly overlapping steps.
2. Remove unnecessary or redundant steps.
3. Group similar actions together to reduce context switching.
4. Balance workload and check dependencies.

Original Plan:
${JSON.stringify(plan, null, 2)}

User Context:
${contextSummary}

Return the optimized plan in the exact same JSON schema:
{
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
  "resources": ["Resources required"],
  "estimatedTimeMinutes": 180,
  "priority": "Critical" | "High" | "Medium" | "Low",
  "fallbackPlan": "Fallback description",
  "rollbackPlan": "Rollback description"
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Plan Optimizer. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && Array.isArray(result.steps)) {
      return result;
    }
    return plan;
  } catch (error) {
    console.error("[PLAN OPTIMIZER] Error optimizing plan:", error);
    return plan;
  }
}
