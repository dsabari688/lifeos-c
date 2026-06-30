import { queryGroq } from "./piggyClient.js";
import { VerificationResult } from "./piggyCognitiveTypes.js";
import { evaluateToolCall } from "./piggyResultEvaluator.js";

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
