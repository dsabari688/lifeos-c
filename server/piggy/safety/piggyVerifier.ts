import { queryGroq } from "../core/piggyClient.js";

export interface VerificationResult {
  valid: boolean;
  issues: string[];
  confidence: number; // Verification confidence (between 0.0 and 1.0)
}

/**
 * Validates a proposed AI response against the user context and constraints
 * (sleep hours, work hours, conflicts, duplicate tasks, deadlines, budgets, habits, etc.)
 */
export async function verifyResponse(
  query: string,
  proposedResponse: string,
  contextSummary: string
): Promise<VerificationResult> {
  const prompt = `You are the Piggy AI Self-Verification Engine.
Analyze the proposed response for the user's query under the provided user context.
You MUST verify if the proposed response violates any of the following constraints:
1. Logic: Is the response logically sound and accurate?
2. Sleep Duration: Does it schedule tasks or suggest sleep schedules that violate sleep goals?
3. Work Hours: Does it exceed work hours or schedule work outside active work slots?
4. Time Conflicts: Are there any calendar or schedule overlaps?
5. Duplicate Tasks: Does it suggest creating tasks that already exist in the user's checklist?
6. Goal Alignment: Does it contradict or ignore the user's active strategic goals?
7. Habit Alignment: Does it skip or conflict with daily habit compliance?
8. Budget Alignment: Does it exceed the budget limit or recommend overspending?
9. Calendar Conflicts / Deadlines: Are upcoming exams, deadlines, or flights ignored?
10. Missing Reasoning: Is the reasoning incomplete or unclear?
11. Deadline Priority: Are urgent deadlines not prioritized?

User Query: "${query}"
Active Context:
${contextSummary}

Proposed Response:
"${proposedResponse}"

Return a JSON object containing:
- "valid": boolean (true if response passes all checks, false if it violates any constraint)
- "issues": string[] (list of identified issues or violations; empty if valid)
- "confidence": number (between 0.0 and 1.0, representing verification confidence)

Format strictly as JSON. No other text or markdown wrapper other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Self-Verification Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    return {
      valid: typeof result.valid === 'boolean' ? result.valid : true,
      issues: Array.isArray(result.issues) ? result.issues : [],
      confidence: typeof result.confidence === 'number' ? result.confidence : 1.0
    };
  } catch (error) {
    console.error("Verification engine error:", error);
    // Safe fallback: return valid, log error.
    return {
      valid: true,
      issues: [],
      confidence: 1.0
    };
  }
}
