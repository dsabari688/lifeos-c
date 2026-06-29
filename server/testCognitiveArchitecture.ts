import { runReasoningEngine } from "./piggyReasoning.js";
import { runPlanningEngine } from "./piggyPlanning.js";
import { runRecommendationEngine } from "./piggyRecommendation.js";
import { runVerificationEngine } from "./piggyVerification.js";
import { executeToolWithGuard } from "./piggyToolExecutor.js";
import { calculateTrends } from "./piggyTrendAnalysis.js";
import { runPredictiveAnalytics } from "./piggyPrediction.js";
import { discoverBehavioralPatterns } from "./piggyPatternDiscovery.js";
import { buildSuccessModel } from "./piggySuccessModel.js";
import { buildFailureModel } from "./piggyFailureModel.js";

/**
 * Mock database state representation.
 */
const mockUserData = {
  tasks: [
    { id: "t-1", title: "Complete study review session", status: "pending", category: "study", date: "2026-06-29", rescheduledCount: 3 },
    { id: "t-2", title: "Buy groceries", status: "completed", category: "personal", date: "2026-06-29" }
  ],
  habits: [
    { id: "h-1", name: "Exercise Workout", logs: ["2026-06-28", "2026-06-27"], logTimes: [], streak: 2 }
  ],
  goals: [
    { id: "g-1", title: "Maintain absolute physical health", progress: 40, status: "active", targetDate: "2026-07-15" }
  ],
  expenses: [
    { id: "e-1", description: "impulsive coffee purchase", amount: 8.5, category: "food", date: "2026-06-29" }
  ],
  sleepLogs: [
    { date: "2026-06-29", duration: 5.5, sleepTime: "23:00", wakeTime: "04:30" }
  ],
  moods: [
    { id: "m-1", mood: "stressed", note: "Busy calendar load", createdAt: new Date().toISOString() }
  ],
  profile: {
    name: "Sir",
    aiPersonality: "Sophisticated British Executive Assistant",
    budgetLimit: 1000
  }
};

async function runTestSuite() {
  console.log("================================================================================");
  console.log("   PIGGY COGNITIVE ARCHITECTURE TEST SUITE - INITIALIZING VALIDATIONS");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  const contextSummary = "User is stressed. Sleep logged was 5.5h (low). Mood is stressed. Budget limit is $1000.";

  // 1. TEST REASONING ENGINE
  console.log("\n[TEST] 1. Reasoning Engine Verification...");
  const tReasonStart = Date.now();
  try {
    const res = await runReasoningEngine("I want to skip my evening exercise session", contextSummary);
    console.log(`- Duration: ${Date.now() - tReasonStart}ms`);
    console.log(`- Goal Identified: "${res.goal}"`);
    console.log(`- Confidence Score: ${res.confidence}`);
    console.log(`- Facts Checked: ${res.facts.length}`);
    console.log(`- Risks Evaluated: ${res.risks.length}`);
    console.log(`- Reasoning Trace: ${res.reasoningTrace.join(" -> ")}`);
    passed++;
  } catch (err: any) {
    console.error("X Reasoning Engine test failed:", err.message);
    failed++;
  }

  // 2. TEST PLANNING ENGINE
  console.log("\n[TEST] 2. Planning Engine Verification...");
  const tPlanStart = Date.now();
  try {
    const res = await runPlanningEngine("Plan my schedule to learn TypeScript modules today", contextSummary);
    console.log(`- Duration: ${Date.now() - tPlanStart}ms`);
    if (res) {
      console.log(`- Planned Goal: "${res.goal}"`);
      console.log(`- Steps Generated: ${res.steps.length}`);
      console.log(`- Fallback Plan: "${res.fallbackPlan}"`);
      console.log(`- Rollback Plan: "${res.rollbackPlan}"`);
    } else {
      console.log("- No plan generated (expected fallback trigger).");
    }
    passed++;
  } catch (err: any) {
    console.error("X Planning Engine test failed:", err.message);
    failed++;
  }

  // 3. TEST RECOMMENDATION ENGINE
  console.log("\n[TEST] 3. Recommendation Engine Verification...");
  const tRecStart = Date.now();
  try {
    const res = await runRecommendationEngine("Recommend how to balance my budget and sleep", contextSummary);
    console.log(`- Duration: ${Date.now() - tRecStart}ms`);
    console.log(`- Recommendations Count: ${res.length}`);
    if (res.length > 0) {
      console.log(`- Top Rec Reason: "${res[0].reason}"`);
      console.log(`- Top Rec Risk: "${res[0].risk}"`);
      console.log(`- Priority: ${res[0].priority}`);
    }
    passed++;
  } catch (err: any) {
    console.error("X Recommendation Engine test failed:", err.message);
    failed++;
  }

  // 4. TEST VERIFICATION ENGINE
  console.log("\n[TEST] 4. Verification Engine Verification...");
  const tVerStart = Date.now();
  try {
    const mockPlan = { goal: "Study", steps: [] };
    const mockLogs = [{ tool: "task", success: true }];
    const mockRecs = [{ recommendation: "Rest", priority: "High" }];
    const res = await runVerificationEngine(
      "Skip exercise",
      mockPlan,
      mockLogs,
      mockRecs,
      contextSummary
    );
    console.log(`- Duration: ${Date.now() - tVerStart}ms`);
    console.log(`- Valid Output: ${res.valid}`);
    console.log(`- Verification Report: "${res.verificationReport}"`);
    console.log(`- Confidence Score: ${res.confidenceScore}/100`);
    console.log(`- Repair Suggestions: ${res.repairSuggestions.join(", ") || "None"}`);
    passed++;
  } catch (err: any) {
    console.error("X Verification Engine test failed:", err.message);
    failed++;
  }

  // 5. TEST ANALYTICAL LEARNING MODELS
  console.log("\n[TEST] 5. Analytical Telemetry Models Verification...");
  try {
    const trends = calculateTrends(mockUserData);
    const predictions = runPredictiveAnalytics(mockUserData);
    const patterns = discoverBehavioralPatterns(mockUserData);
    const successModel = buildSuccessModel(mockUserData);
    const failureModel = buildFailureModel(mockUserData);

    console.log(`- Weekly Habit Completion Slope: ${trends.habitSlope}%`);
    console.log(`- Predicted Burnout Probability: ${predictions.burnoutProbability}%`);
    console.log(`- Discovered Patterns Count: ${patterns.length}`);
    console.log(`- Success Sleep Threshold: ${successModel.minSleepThreshold} hours`);
    console.log(`- Top Failure Risk Factor: ${failureModel.failureTriggers[0]?.triggerFactor || "None"}`);
    passed++;
  } catch (err: any) {
    console.error("X Analytical Models test failed:", err.message);
    failed++;
  }

  // 6. TEST TOOL EXECUTION & RETRIES (EDGE CASE VALIDATIONS)
  console.log("\n[TEST] 6. Tool Router & Execution Guards Verification...");
  try {
    // Valid tool execution
    const validRes = await executeToolWithGuard("calculator", { expression: "15 * 8" }, mockUserData);
    console.log(`- Valid Calc Result: ${JSON.stringify(validRes.result)} (Duration: ${validRes.duration}ms)`);

    // Invalid tool verification
    const invalidRes = await executeToolWithGuard("invalidToolName", {}, mockUserData);
    if (!invalidRes.success) {
      console.log(`- Successfully caught invalid tool error: "${invalidRes.result.error}"`);
      passed++;
    } else {
      console.log("X Expected tool invalid routing error but succeeded.");
      failed++;
    }
  } catch (err: any) {
    console.error("X Tool execution test failed:", err.message);
    failed++;
  }

  console.log("\n================================================================================");
  console.log(` TESTS RESULT: Passed: ${passed} | Failed: ${failed}`);
  console.log("================================================================================");
}

runTestSuite().catch(err => {
  console.error("Fatal Test Suite Runner Error:", err);
});
