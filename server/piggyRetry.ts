import { queryGroq } from "./piggyClient.js";
import { verifyResponse } from "./piggyVerifier.js";
import { scoreConfidence } from "./piggyConfidence.js";
import { transitionWorkflowState } from "./piggyWorkflow.js";

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
