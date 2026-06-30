import { queryGroq } from "../core/piggyClient.js";
import { runReasoningEngine } from "./piggyReasoning.js";
import { runDecisionEngine, DecisionResult } from "./piggyDecisionEngine.js";
import { runPriorityEngine, PriorityEvaluation } from "../prediction/piggyPriorityEngine.js";
import { runRiskEngine, RiskFactor } from "../safety/piggyRiskEngine.js";
import { runOpportunityEngine, OpportunityFactor } from "../prediction/piggyOpportunityEngine.js";
import { runPlanningEngine } from "../planning/piggyPlanning.js";
import { optimizePlan } from "../planning/piggyPlannerBuilder.js";
import { runScenarioEngine, ScenarioAnalysis } from "../prediction/piggyScenarioEngine.js";
import { runRecommendationEngine } from "./piggyRecommendation.js";
import { ReasoningResult, ExecutionPlan, Recommendation } from "../types/piggyCognitiveTypes.js";

export interface ThinkingSession {
  reasoning: ReasoningResult;
  decision: DecisionResult;
  priority: PriorityEvaluation;
  risks: RiskFactor[];
  opportunities: OpportunityFactor[];
  plan: ExecutionPlan | null;
  scenarios: ScenarioAnalysis | null;
  recommendations: Recommendation[];
}

/**
 * Orchestrates the cognitive thinking pipeline:
 * User Query -> Reasoning -> Decision -> Priority -> Risks -> Opportunities -> Planning -> Scenarios -> Recommendations -> Final Strategic Response
 */
export async function runThinkingPipeline(
  userQuery: string,
  contextSummary: string,
  chatHistory: any[],
  baseSystemPrompt: string
): Promise<{ reply: string; session: ThinkingSession }> {
  console.log("[THINKING ENGINE] Initializing strategic pipeline...");

  // 1. Run Reasoning Engine
  const reasoning = await runReasoningEngine(userQuery, contextSummary);

  // 2. Run Decision Engine
  const decision = await runDecisionEngine(userQuery, reasoning.chosenSolution, contextSummary);

  // 3. Run Priority Engine
  const priority = await runPriorityEngine(userQuery, contextSummary);

  // 4. Run Risk Engine
  const risks = await runRiskEngine(userQuery, contextSummary);

  // 5. Run Opportunity Engine
  const opportunities = await runOpportunityEngine(userQuery, contextSummary);

  // 6. Run Planning Engine
  let plan = await runPlanningEngine(userQuery, contextSummary);
  let scenarios: ScenarioAnalysis | null = null;

  if (plan) {
    console.log("[THINKING ENGINE] Planning engine generated a plan. Optimizing steps...");
    plan = await optimizePlan(plan, contextSummary);
    
    console.log("[THINKING ENGINE] Simulating scenarios for the plan...");
    scenarios = await runScenarioEngine(userQuery, plan.goal, contextSummary);
  }

  // 7. Run Recommendation Engine
  const recommendations = await runRecommendationEngine(userQuery, contextSummary);

  const session: ThinkingSession = {
    reasoning,
    decision,
    priority,
    risks,
    opportunities,
    plan,
    scenarios,
    recommendations
  };

  // 8. Generate final strategic, explained response backed by all engines
  const thinkingInsightsText = `
### EXECUTIVE ASSISTANT COGNITIVE INSIGHTS:
- Goal Identified: ${reasoning.goal}
- Facts: ${reasoning.facts.join(", ") || "None"}
- Unknowns: ${reasoning.unknowns.join(", ") || "None"}
- Assumptions: ${reasoning.assumptions.join(", ") || "None"}
- Strategic Chosen Solution: ${reasoning.chosenSolution} (Confidence: ${Math.round(reasoning.confidence * 100)}%)
- Priority Grade: ${priority.priority} (Mental load impact: ${priority.breakdown.mentalLoad}/10)
- Highlighted Risks:
${risks.map(r => `  * [${r.risk} (Prob: ${r.probability}%)]: ${r.reason} | Mitigation: ${r.suggestedMitigation}`).join("\n") || "  * None"}
- Highlighted Opportunities:
${opportunities.map(o => `  * [${o.opportunity}]: Benefit: ${o.benefit} | Detail: ${o.estimatedBenefit}`).join("\n") || "  * None"}
${plan ? `
- Optimized Actions Plan: "${plan.goal}"
${plan.steps.map(s => `  Step ${s.executionOrder}: ${s.args.title || s.action} (${s.toolId}) - depends on [${s.dependencies.join(", ") || "none"}]`).join("\n")}
- Scenario Projections:
  * Best Case: ${scenarios?.bestCase.outcome} (Likelihood: ${scenarios?.bestCase.likelihood})
  * Worst Case: ${scenarios?.worstCase.outcome} (Likelihood: ${scenarios?.worstCase.likelihood}) | Recovery: ${scenarios?.recoveryPlan.join(", ")}
` : ""}
- Proactive Strategic Recommendations:
${recommendations.map(rec => `  * [${rec.type}]: ${rec.recommendation} | Smart explanation: ${rec.smartResponse}`).join("\n") || "  * None"}
`;

  console.log("[THINKING ENGINE] Strategic insights formulated. Generating final response prompt.");

  const responsePrompt = `You are Piggy, a sophisticated, factual, and slightly British strategic life executive assistant.
You MUST respond as a strategic helper, not a basic chat interface.
Leverage the calculated cognitive insights below to form your reply.
Explain the WHY behind your recommendations and frame scheduling advice in the Smart Response style (supported by data, energy windows, or completion ratios).

Calculated Cognitive Insights for current turn:
${thinkingInsightsText}

Response Guidelines:
- Answer in plain conversational English. Keep your tone natural, professional, and supportive.
- Avoid listing raw markdown JSON outputs directly, but incorporate the plan, risks, and recommendations gracefully.
- Do not output bulleted lists or headings in your response. Formulate your answer as a cohesive, helpful coaching paragraph.`;

  const finalReply = await queryGroq([
    { role: "system", content: baseSystemPrompt },
    ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
    { role: "user", content: userQuery },
    { role: "system", content: responsePrompt }
  ], 0.6);

  return {
    reply: finalReply,
    session
  };
}
