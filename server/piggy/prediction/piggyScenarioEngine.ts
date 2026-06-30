import { queryGroq } from "../core/piggyClient.js";

export interface ScenarioAnalysis {
  bestCase: {
    outcome: string;
    likelihood: string;
  };
  expectedCase: {
    outcome: string;
    likelihood: string;
  };
  worstCase: {
    outcome: string;
    likelihood: string;
  };
  recoveryPlan: string[];
}

/**
 * Evaluates possible outcomes (Best, Expected, Worst cases) and creates a backup recovery plan.
 */
export async function runScenarioEngine(
  userQuery: string,
  planTitle: string,
  contextSummary: string
): Promise<ScenarioAnalysis> {
  const prompt = `You are the Piggy AI Scenario Analysis Engine.
Analyze the user's query and the proposed plan: "${planTitle || "General tasks schedule"}".
Outline three scenarios:
1. Best Case: What happens if everything goes perfectly?
2. Expected Case: What is the most realistic outcome?
3. Worst Case: What happens if barriers, interruptions, or low energy block the plan?
Include a clear, actionable Recovery Plan with recovery steps if the Worst Case happens.

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object:
{
  "bestCase": { "outcome": "Description of perfect flow", "likelihood": "e.g., 20%" },
  "expectedCase": { "outcome": "Description of expected flow", "likelihood": "e.g., 60%" },
  "worstCase": { "outcome": "Description of worst case barriers", "likelihood": "e.g., 20%" },
  "recoveryPlan": [
    "Recovery step 1",
    "Recovery step 2"
  ]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Scenario Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    return {
      bestCase: result.bestCase || { outcome: "Flawless milestone execution.", likelihood: "15%" },
      expectedCase: result.expectedCase || { outcome: "Standard milestone completion with minor delays.", likelihood: "70%" },
      worstCase: result.worstCase || { outcome: "Missed deadlines due to overworking or context switching.", likelihood: "15%" },
      recoveryPlan: Array.isArray(result.recoveryPlan) ? result.recoveryPlan : ["Break tasks into 15-minute intervals.", "Reschedule non-essential blocks to the weekend."]
    };
  } catch (error) {
    console.error("[SCENARIO ENGINE] Error generating scenarios:", error);
    return {
      bestCase: { outcome: "Optimistic completion.", likelihood: "20%" },
      expectedCase: { outcome: "Balanced progress.", likelihood: "60%" },
      worstCase: { outcome: "Disrupted workflow.", likelihood: "20%" },
      recoveryPlan: ["Buffer tasks with 30-minute gaps.", "Engage focus mode."]
    };
  }
}
