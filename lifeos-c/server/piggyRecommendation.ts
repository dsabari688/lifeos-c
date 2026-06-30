import { queryGroq } from "./piggyClient.js";
import { Recommendation } from "./piggyCognitiveTypes.js";

/**
 * Evaluates context telemetry to generate proactive, explainable recommendations.
 */
export async function runRecommendationEngine(
  userQuery: string,
  contextSummary: string
): Promise<Recommendation[]> {
  const prompt = `You are the Piggy AI Recommendation Engine.
Scan the user request and user database context to formulate proactive recommendations.
Every recommendation must explain the WHY (Explainable AI) and follow the Smart Response style (data-backed).

User Query: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object containing the recommendations list:
{
  "recommendations": [
    {
      "id": "rec-1",
      "type": "schedule",
      "recommendation": "Execute coding session between 8:00 AM and 10:00 AM",
      "reason": "Your sleep average was 7.5 hours and your historical morning completion index is highest before 11 AM.",
      "benefit": "Saves 30 minutes of drag and capitalizes on your peak morning energy window.",
      "risk": "Minimal risk, but can conflict if early morning alerts interrupt sleep.",
      "confidence": 90,
      "priority": "High" | "Critical" | "Medium" | "Low",
      "smartResponse": "I recommend executing your coding tasks tomorrow between 8 AM and 10 AM because your morning focus efficiency score is 25% higher compared to evening slots."
    }
  ]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Recommendation Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && Array.isArray(result.recommendations)) {
      return result.recommendations;
    }
    return [];
  } catch (error) {
    console.error("[RECOMMENDATION ENGINE] Error running recommendations:", error);
    return [];
  }
}
