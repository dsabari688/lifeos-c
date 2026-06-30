import { queryGroq } from "./piggyClient.js";

export interface ConfidenceScore {
  confidence: number; // percentage (e.g. 90)
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Evaluates the confidence score, reason, and risk level of a proposed response
 * against the current user context using the Groq model.
 */
export async function scoreConfidence(
  query: string,
  reply: string,
  contextSummary: string
): Promise<ConfidenceScore> {
  const prompt = `Analyze the user's request, the active user context, and the proposed AI response.
Evaluate the confidence of the AI response on a scale of 0 to 100.
Consider if the AI has sufficient data to answer fully, whether it makes any assumptions, and the potential risk of error.

User Request: "${query}"
Active User Context Details:
${contextSummary}

Proposed AI Response:
"${reply}"

Return a JSON object containing:
- "confidence": number (integer between 0 and 100)
- "reason": string (short description of why this confidence level was assigned, e.g., "Uses complete user history." or "Not enough information.")
- "riskLevel": "low" | "medium" | "high" (based on confidence: low for >=80, medium for 50-79, high for <50)

Format strictly as JSON. No markdown other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are an analytical verification module. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    return {
      confidence: typeof result.confidence === 'number' ? result.confidence : 50,
      reason: result.reason || "Unable to determine confidence reasons.",
      riskLevel: result.riskLevel || "medium"
    };
  } catch (error) {
    console.error("Confidence score generation error:", error);
    return {
      confidence: 75,
      reason: "Evaluator service unavailable. Standard confidence fallback applied.",
      riskLevel: "medium"
    };
  }
}
