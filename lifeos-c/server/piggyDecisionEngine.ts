import { queryGroq } from "./piggyClient.js";

export type AgentDecision =
  | 'Answer'
  | 'Ask question'
  | 'Recommend'
  | 'Create task'
  | 'Schedule'
  | 'Reminder'
  | 'Warn'
  | 'Do nothing';

export interface DecisionResult {
  decision: AgentDecision;
  reason: string;
  confidence: number; // 0.0 to 1.0
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

/**
 * Evaluates context and reasoning to select the most appropriate strategy action.
 */
export async function runDecisionEngine(
  userQuery: string,
  reasoningSummary: string,
  contextSummary: string
): Promise<DecisionResult> {
  const prompt = `You are the Piggy AI Strategic Decision Engine.
Given the user's message, current cognitive reasoning summary, and context, choose the primary strategic action to take.

Possible Strategic Actions:
- "Answer": Direct informational answer to a clear query
- "Ask question": Request missing details or clarify ambiguous requests
- "Recommend": Propose tasks, habits, schedules, budgets, or goal changes
- "Create task": Propose adding tasks to the checklist
- "Schedule": Propose calendar scheduling adjustments
- "Reminder": Suggest setting a critical alert
- "Warn": Flag high-risk actions, burnout, or budget overruns
- "Do nothing": Acknowledge statement without action

User Message: "${userQuery}"
Reasoning Summary: "${reasoningSummary}"
Context:
${contextSummary}

Return a JSON object:
{
  "decision": "Answer" | "Ask question" | "Recommend" | "Create task" | "Schedule" | "Reminder" | "Warn" | "Do nothing",
  "reason": "Detailed reason why this action is selected",
  "confidence": 0.0 to 1.0,
  "priority": "Critical" | "High" | "Medium" | "Low"
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Decision Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    return {
      decision: result.decision || "Answer",
      reason: result.reason || "Standard default assistant reply.",
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.9,
      priority: result.priority || "Medium"
    };
  } catch (error) {
    console.error("[DECISION ENGINE] Error executing decision logic:", error);
    return {
      decision: "Answer",
      reason: "Fallback decision handler invoked due to service interruption.",
      confidence: 0.8,
      priority: "Medium"
    };
  }
}
