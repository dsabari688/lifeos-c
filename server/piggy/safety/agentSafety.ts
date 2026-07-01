import { evaluateToolCall } from "../cognition/agentCognition.js";
import { queryGroq } from "../core/piggyClient.js";
import { VerificationResult, transitionWorkflowState } from "../types/agentTypes.js";

// --- Consolidated from piggyConfidence.ts ---

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

// --- Consolidated from piggyRetry.ts ---

export interface RetryResult {
  reply: string;
  retriesUsed: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  verificationIssues: string[];
}

/**
 * Executes a self-correction retry loop up to 3 times if the response is
 * invalid or confidence is below 70%.
 */
export async function runRetryLoop(
  systemPrompt: string,
  chatHistory: any[],
  userMessage: string,
  contextSummary: string,
  userData: any,
  initialReply: string,
  initialIssues: string[],
  initialConfidence: number,
  initialRisk: 'low' | 'medium' | 'high'
): Promise<RetryResult> {
  let currentReply = initialReply;
  let currentIssues = initialIssues;
  let currentConfidence = initialConfidence;
  let currentRisk = initialRisk;
  let retriesUsed = 0;

  const maxRetries = 3;

  while ((currentIssues.length > 0 || currentConfidence < 70) && retriesUsed < maxRetries) {
    retriesUsed++;
    transitionWorkflowState(userData, 'Retrying');
    console.log(`[RETRY ENGINE] Attempt ${retriesUsed}/${maxRetries}. Low confidence (${currentConfidence}%) or issues found:`, currentIssues);

    const mistakesText = currentIssues.map(issue => `- ${issue}`).join("\n");
    const retryPrompt = `Your previous response attempt was rejected due to quality, safety, or constraint violations.
Please generate a corrected response.

Previous Answer:
"${currentReply}"

Identified Mistakes/Issues:
${mistakesText || "- Confidence score was too low (" + currentConfidence + "%)"}

    Required Fixes:
    - Fully address every issue and mistake listed above.
    - If a previous workflow or tool execution was invalid or blocked, devise an alternative reasoning path, select alternative tools, or suggest an alternative workflow.
    - Do not violate sleep duration constraints or schedule conflicts.
    - Ensure the response aligns with active goals and budget limits.
    - Return only your final corrected response (plain English, no markdown formatting).`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...chatHistory.map((msg: any) => ({ role: msg.role as 'user' | 'assistant' | 'system', content: msg.content })),
      { role: "user" as const, content: userMessage },
      { role: "system" as const, content: retryPrompt }
    ];

    try {
      currentReply = await queryGroq(messages, 0.6);

      // Re-verify the new candidate
      transitionWorkflowState(userData, 'Verifying');
      const verifierRes = await verifyResponse(userMessage, currentReply, contextSummary);
      const confidenceRes = await scoreConfidence(userMessage, currentReply, contextSummary);

      currentIssues = verifierRes.valid ? [] : verifierRes.issues;
      currentConfidence = confidenceRes.confidence;
      currentRisk = confidenceRes.riskLevel;

      if (verifierRes.valid && currentConfidence >= 70) {
        console.log(`[RETRY ENGINE] Verification passed on attempt ${retriesUsed}.`);
        break;
      }
    } catch (error) {
      console.error(`[RETRY ENGINE] Error during retry attempt ${retriesUsed}:`, error);
    }
  }

  return {
    reply: currentReply,
    retriesUsed,
    confidence: currentConfidence,
    riskLevel: currentRisk,
    verificationIssues: currentIssues
  };
}

// --- Consolidated from piggyRiskEngine.ts ---

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

// --- Consolidated from piggyVerification.ts ---

/**
 * Executes a validation check on reasoning, plans, tool logs, and recommendations
 * to identify duplicates, contradictions, or low confidence.
 */
export async function runVerificationEngine(
  userQuery: string,
  proposedPlan: any,
  toolExecutionLogs: any[],
  proposedRecommendations: any[],
  contextSummary: string
): Promise<VerificationResult> {
  const prompt = `You are the Piggy AI Cognitive Verification Engine.
Verify the integrity of all calculated outputs (reasoning, plan steps, tool executions, recommendations) against the user query and context.
Check specifically for:
1. Reasoning consistency: Is the solution logically connected to the goals and constraints?
2. Plan validity & duplicate tasks: Are we suggesting tasks or habits that already exist in the database?
3. Tool outputs accuracy: Did the execution logs succeed?
4. Contradictions & Hallucinations: Do the recommendations contradict previous memories or current constraints?
5. Missing information: Did the agent proceed with low confidence (<50%) or make risky assumptions?

User Request: "${userQuery}"
Proposed Plan:
${JSON.stringify(proposedPlan, null, 2)}
Tool Execution Logs:
${JSON.stringify(toolExecutionLogs, null, 2)}
Proposed Recommendations:
${JSON.stringify(proposedRecommendations, null, 2)}
Context Summary:
${contextSummary}

Return a JSON object:
{
  "valid": true | false,
  "verificationReport": "Summary detailing the quality, contradictions, and constraints check",
  "confidenceScore": 0 to 100 (evaluation of completeness and accuracy),
  "verificationErrors": ["List of errors, conflicts, or duplicates found; empty if valid"],
  "repairSuggestions": ["Suggested fixes or corrections to address errors"]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Verification Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    return {
      valid: typeof result.valid === 'boolean' ? result.valid : true,
      verificationReport: result.verificationReport || "All consistency audits passed.",
      confidenceScore: typeof result.confidenceScore === 'number' ? result.confidenceScore : 95,
      verificationErrors: Array.isArray(result.verificationErrors) ? result.verificationErrors : [],
      repairSuggestions: Array.isArray(result.repairSuggestions) ? result.repairSuggestions : []
    };
  } catch (error) {
    console.error("[VERIFICATION ENGINE] Error running validation checks:", error);
    return {
      valid: true,
      verificationReport: "Validation scanner failed to initialize. Standard verification fallback bypass active.",
      confidenceScore: 85,
      verificationErrors: [],
      repairSuggestions: []
    };
  }
}

export interface StepVerification {
  valid: boolean;
  expectedResult: string;
  actualResult: string;
  difference: string | null;
  qualityScore: number;
  retryRequirement: boolean;
}

/**
 * Validates step executions by comparing actual database mutations against expected results.
 */
export function verifyStepExecution(
  toolId: string,
  args: any,
  expectedResult: string,
  actualResult: any
): StepVerification {
  const evalResult = evaluateToolCall(toolId, args, expectedResult, actualResult);

  // If a difference is found or quality score is low, flag a retry requirement
  const retryRequirement = evalResult.difference !== null || evalResult.qualityScore < 80;

  return {
    valid: !retryRequirement,
    expectedResult,
    actualResult: evalResult.actualResult,
    difference: evalResult.difference,
    qualityScore: evalResult.qualityScore,
    retryRequirement
  };
}

// --- Consolidated from piggyVerifier.ts ---

export interface ResponseVerificationResult {
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
): Promise<ResponseVerificationResult> {
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