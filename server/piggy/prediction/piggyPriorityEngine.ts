import { queryGroq } from "../core/piggyClient.js";

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface PriorityEvaluation {
  priority: PriorityLevel;
  reason: string;
  breakdown: {
    deadlineImpact: number;  // 1 to 10 scale
    habitImpact: number;     // 1 to 10 scale
    goalImpact: number;      // 1 to 10 scale
    mentalLoad: number;      // 1 to 10 scale
    financialImpact: number; // 1 to 10 scale
  };
}

/**
 * Assesses the priority levels of the user's situation and requests.
 */
export async function runPriorityEngine(
  userQuery: string,
  contextSummary: string
): Promise<PriorityEvaluation> {
  const prompt = `You are the Piggy AI Priority Engine.
Evaluate the user's current situation or request across multiple priority aspects: deadlines, importance, urgency, habit impact, goal impact, mental load, and financial impact.

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Determine:
1. Impact scores (from 1 to 10) for: deadlines, habits, goals, mental load, and financial impact.
2. The overall computed Priority Level: "Critical" | "High" | "Medium" | "Low".
3. A concise reason backing the priority level assignment.

Return a JSON object matching this schema:
{
  "priority": "Critical" | "High" | "Medium" | "Low",
  "reason": "Clear explanation of the overall priority assessment",
  "breakdown": {
    "deadlineImpact": 5,
    "habitImpact": 5,
    "goalImpact": 5,
    "mentalLoad": 5,
    "financialImpact": 5
  }
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Priority Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    return {
      priority: result.priority || "Medium",
      reason: result.reason || "Determined default priority balance.",
      breakdown: result.breakdown || {
        deadlineImpact: 5,
        habitImpact: 5,
        goalImpact: 5,
        mentalLoad: 5,
        financialImpact: 5
      }
    };
  } catch (error) {
    console.error("[PRIORITY ENGINE] Error running priority scoring:", error);
    return {
      priority: "Medium",
      reason: "Prioritizer service unavailable. Defaulting to Medium.",
      breakdown: {
        deadlineImpact: 5,
        habitImpact: 5,
        goalImpact: 5,
        mentalLoad: 5,
        financialImpact: 5
      }
    };
  }
}
