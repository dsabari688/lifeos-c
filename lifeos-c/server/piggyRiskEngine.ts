import { queryGroq } from "./piggyClient.js";

export interface RiskFactor {
  risk: string;                 // Name of the risk (e.g., Burnout, Budget Risk)
  probability: number;          // Probability as a percentage (0 to 100)
  reason: string;               // Why this risk is flagged
  suggestedMitigation: string;  // How to mitigate or resolve the risk
}

/**
 * Scans user context logs and queries to detect and analyze high-probability risks.
 */
export async function runRiskEngine(
  userQuery: string,
  contextSummary: string
): Promise<RiskFactor[]> {
  const prompt = `You are the Piggy AI Risk Engine.
Analyze the user query and the current user context to detect risk factors:
1. Burnout (exceeding focus session capacity)
2. Overworking (lack of rest/sleep duration)
3. Missed Deadlines (impending tasks/exams/flights)
4. Budget Risk (spending exceeding category limits)
5. Habit Failure (declining consistency, repeated skips)
6. Goal Failure (lagging behind progress rates)
7. Conflicting Schedules (multiple overlaps)
8. Sleep Issues (insufficient hours)

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object containing a list of detected risks:
{
  "risks": [
    {
      "risk": "Burnout",
      "probability": 75,
      "reason": "Reason for high burnout probability",
      "suggestedMitigation": "Concrete action user should take"
    }
  ]
}

Only return risks that have a probability of 30% or higher.
Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Risk Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && Array.isArray(result.risks)) {
      return result.risks;
    }
    return [];
  } catch (error) {
    console.error("[RISK ENGINE] Error checking risks:", error);
    return [];
  }
}
