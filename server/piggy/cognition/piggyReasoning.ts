import { queryGroq } from "../core/piggyClient.js";
import { ReasoningResult } from "../types/piggyCognitiveTypes.js";

// Keep legacy protocol string constant for prompt builder compatibility
export const PIGGY_REASONING_PROTOCOL = `AI Internal Reasoning Protocol:
Before drafting your final response to the user, you MUST internally run through the following cognitive reasoning checkpoints. You do not need to print these checkpoints in your output unless the user explicitly requests to "show your reasoning" or "explain your thinking".

1. Query Interpretation: Analyze the user's input. Identify the underlying emotional state (stressed, motivated, casual) and intent.
2. Intent Decoupling: Determine what the user actually needs (e.g. scheduling adjustments, motivation, task reorganization) versus what they are explicitly requesting.
3. Memory Uplink: Query your relevant memory vault. Check if there are weeks-old constraints, preferences, or goals that impact this specific conversation.
4. Analytics Scan: Retrieve the user's current metrics (burnout risk, focus averages, sleep, mood).
5. Adaptive Loop Review: Assess whether the user has ignored or accepted recommendations in this category before.
6. Outcome ROI Audit: Check if similar actions previously improved consistency, and recall the ROI percentage.
7. Calendar Constraint Check: Identify any immediate deadlines or exams in the next 3 to 5 days.
8. Plan Optimality Evaluation: Determine if the user's current course of action is optimal given their temporal context and cognitive metrics.
9. Refutation & Challenge: If the plan is suboptimal, formulate a polite but firm direct challenge explaining the exact bottleneck.
10. Synthesis: Formulate a better, highly customized alternative action plan (such as rescheduling, skipping non-essentials, or buffer padding).
11. Telemetry Verification: Ground your recommended solution with clear, historical telemetry evidence (e.g. sleep duration correlations or morning vs evening completion ratios).`;

/**
 * Executes a deep reasoning session to evaluate WHY the user is asking.
 * Output includes Goal, Facts, Unknowns, Assumptions, Risks, Constraints,
 * Solutions, Confidence, and Reasoning Trace.
 */
export async function runReasoningEngine(
  userQuery: string,
  contextSummary: string
): Promise<ReasoningResult> {
  const prompt = `You are the Piggy AI Reasoning Engine.
Analyze the user request and user database context to formulate a structured reasoning profile.
Identify the objectives, constraints, risks, assumptions, and choose the best strategy.

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object matching this schema:
{
  "goal": "Core objective the user wants to achieve",
  "facts": ["Verified facts known from context"],
  "unknowns": ["Details currently unknown or missing"],
  "assumptions": ["Assumptions made to facilitate reasoning"],
  "risks": ["Potential risks or failure conditions"],
  "constraints": ["Schedule, sleep, work, or budget constraints"],
  "possibleSolutions": ["Alternative solutions evaluated"],
  "confidence": 0.0 to 1.0 (contextual confidence level),
  "chosenSolution": "The selected strategy for execution",
  "reasoningTrace": ["Step-by-step trace of how this solution was decided"]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const rawResult = await queryGroq([
      { role: "system", content: "You are the Piggy AI Reasoning Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(rawResult);
    return {
      goal: result.goal || "Assist productivity cockpit",
      facts: Array.isArray(result.facts) ? result.facts : [],
      unknowns: Array.isArray(result.unknowns) ? result.unknowns : [],
      assumptions: Array.isArray(result.assumptions) ? result.assumptions : [],
      risks: Array.isArray(result.risks) ? result.risks : [],
      constraints: Array.isArray(result.constraints) ? result.constraints : [],
      possibleSolutions: Array.isArray(result.possibleSolutions) ? result.possibleSolutions : [],
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.85,
      chosenSolution: result.chosenSolution || "Conversational response",
      reasoningTrace: Array.isArray(result.reasoningTrace) ? result.reasoningTrace : ["Query interpreted."]
    };
  } catch (error) {
    console.error("[REASONING ENGINE] Error running reasoning:", error);
    return {
      goal: "Assist productivity cockpit",
      facts: ["User submitted a request"],
      unknowns: [],
      assumptions: [],
      risks: [],
      constraints: [],
      possibleSolutions: ["Direct chat response"],
      confidence: 0.8,
      chosenSolution: "Direct chat response",
      reasoningTrace: ["Cognitive fallback initialized."]
    };
  }
}
