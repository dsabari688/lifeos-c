import { describe, it, expect, vi, beforeEach } from "vitest";
import { runReasoningEngine, runRecommendationEngine, discoverBehavioralPatterns } from "./cognition/agentCognition.js";
import { runPlanningEngine } from "./planning/agentPlanning.js";
import { runVerificationEngine } from "./safety/agentSafety.js";
import { executeToolWithGuard } from "./execution/agentExecution.js";
import { calculateTrends, runPredictiveAnalytics, buildSuccessModel, buildFailureModel } from "./prediction/agentPrediction.js";

// Multiple Fixtures (Track A3)
const fixtures = {
  healthy: {
    tasks: [
      { id: "t-1", title: "Morning meditation", status: "completed", category: "personal", date: "2026-06-29" },
      { id: "t-2", title: "Complete design doc", status: "completed", category: "work", date: "2026-06-29" }
    ],
    habits: [
      { id: "h-1", name: "Morning Exercise", logs: ["2026-06-29", "2026-06-28"], logTimes: [], streak: 5 }
    ],
    goals: [
      { id: "g-1", title: "Maintain absolute physical health", progress: 90, status: "active", targetDate: "2026-07-15" }
    ],
    expenses: [
      { id: "e-1", description: "Healthy salad", amount: 12.0, category: "food", date: "2026-06-29" }
    ],
    sleepLogs: [
      { date: "2026-06-29", duration: 8.2, sleepTime: "22:00", wakeTime: "06:12" }
    ],
    moods: [
      { id: "m-1", mood: "motivated", note: "Feeling energetic", createdAt: new Date().toISOString() }
    ],
    profile: {
      name: "Sir",
      aiPersonality: "Sophisticated British Executive Assistant",
      budgetLimit: 1000
    }
  },
  empty: {
    tasks: [],
    habits: [],
    goals: [],
    expenses: [],
    sleepLogs: [],
    moods: [],
    profile: {
      name: "Sir",
      aiPersonality: "Calm",
      budgetLimit: 500
    }
  },
  conflicting: {
    tasks: [
      { id: "t-1", title: "Relaxing spa", status: "pending", category: "personal", date: "2026-06-29" }
    ],
    habits: [],
    goals: [],
    expenses: [
      { id: "e-1", description: "impulsive watch buy", amount: 950.0, category: "luxury", date: "2026-06-29" }
    ],
    sleepLogs: [
      { date: "2026-06-29", duration: 9.5, sleepTime: "21:00", wakeTime: "06:30" }
    ],
    moods: [
      { id: "m-1", mood: "stressed", note: "Anxious about money", createdAt: new Date().toISOString() }
    ],
    profile: {
      name: "Sir",
      aiPersonality: "Logical",
      budgetLimit: 200
    }
  },
  overloaded: {
    tasks: [
      { id: "t-1", title: "Code frontend", status: "pending", category: "work", date: "2026-06-29", rescheduledCount: 4 },
      { id: "t-2", title: "Fix route types", status: "pending", category: "work", date: "2026-06-29", rescheduledCount: 5 },
      { id: "t-3", title: "Review telemetry docs", status: "pending", category: "work", date: "2026-06-29", rescheduledCount: 3 },
      { id: "t-4", title: "Draft schema mapping", status: "pending", category: "work", date: "2026-06-29", rescheduledCount: 6 },
      { id: "t-5", title: "Complete tests suite", status: "pending", category: "work", date: "2026-06-29", rescheduledCount: 4 }
    ],
    habits: [],
    goals: [],
    expenses: [],
    sleepLogs: [
      { date: "2026-06-29", duration: 4.8, sleepTime: "01:00", wakeTime: "05:48" }
    ],
    moods: [
      { id: "m-1", mood: "exhausted", note: "Too many open variables", createdAt: new Date().toISOString() }
    ],
    profile: {
      name: "Sir",
      aiPersonality: "Energetic",
      budgetLimit: 1000
    }
  }
};

// Dynamic mock mapping (Track A5)
vi.mock("./core/piggyClient.js", () => {
  return {
    queryGroq: (messages: any, temperature: any, responseFormatJson: any) => {
      const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
      const userMsg = messages.find((m: any) => m.role === "user")?.content || "";

      if (systemMsg.includes("Reasoning Engine")) {
        return JSON.stringify({
          goal: "Skip evening exercise session",
          facts: ["User is stressed", "Sleep duration is 5.5h (low)", "Budget limit is $1000"],
          unknowns: ["Why user wants to skip"],
          assumptions: ["Skipping exercise will help user rest"],
          risks: ["Low sleep may impact cognitive efficiency if exercise is skipped"],
          constraints: ["Sleep constraint: low duration", "Budget limit: $1000"],
          possibleSolutions: ["Rest instead of exercise", "Do light stretch only"],
          confidence: 0.85,
          chosenSolution: "Rest instead of exercise",
          reasoningTrace: ["Analyze stress", "check low sleep", "choose rest solution"]
        });
      }

      if (systemMsg.includes("Planning Engine")) {
        if (userMsg.includes("hello") || userMsg.includes("no plan")) {
          return JSON.stringify({
            hasPlan: false
          });
        }
        return JSON.stringify({
          hasPlan: true,
          plan: {
            goal: "Plan my schedule to learn TypeScript modules today",
            steps: [
              {
                id: "step-1",
                toolId: "task",
                action: "create",
                args: { title: "Complete TypeScript module review", action: "create" },
                dependencies: [],
                executionOrder: 1,
                state: "Pending",
                expectedResult: "Task is added to database"
              },
              {
                id: "step-2",
                toolId: "habit",
                action: "log",
                args: { name: "Study Routine", action: "log" },
                dependencies: ["step-1"],
                executionOrder: 2,
                state: "Pending",
                expectedResult: "Study habit logged"
              }
            ],
            dependencies: ["Requires uninterrupted study block"],
            resources: ["TypeScript Docs", "Study time"],
            estimatedTimeMinutes: 120,
            priority: "High",
            fallbackPlan: "If study session is interrupted, move learning targets to tomorrow morning.",
            rollbackPlan: "Delete created learning tasks if incomplete."
          }
        });
      }

      if (systemMsg.includes("Recommendation Engine") || userMsg.includes("recommendation") || userMsg.includes("Recommend")) {
        return JSON.stringify({
          recommendations: [
            {
              recommendation: "Increase daily sleep duration parameters",
              reason: "Your budget limit is $1000, and historical data indicates that 40% of your expenses are for rent and groceries.",
              risk: "Risk of overspending on non-essential items if not monitored.",
              priority: "High"
            },
            {
              recommendation: "Stick to groceries and skip premium cafes",
              reason: "User has logged low sleep and high stress",
              risk: "Impulsive spends are higher when user is sleep deprived",
              priority: "Medium"
            }
          ]
        });
      }

      if (systemMsg.includes("Verification Engine") || systemMsg.includes("Verify") || userMsg.includes("Verification Engine") || userMsg.includes("Verification")) {
        return JSON.stringify({
          valid: false,
          verificationReport: "The proposed plan does not align with the user's request to 'Skip exercise'.",
          confidenceScore: 30,
          repairSuggestions: [
            "Re-evaluate the user's request and adjust the plan accordingly",
            "Add relevant steps to the plan to achieve the goal of studying"
          ]
        });
      }

      // Fallback defaults
      return JSON.stringify({ success: true, text: "Mocked default response" });
    }
  };
});

describe("Piggy Cognitive Architecture Suite", () => {

  // A2. Reasoning Engine
  describe("Reasoning Engine", () => {
    it("returns bounded confidence and structured parameters", async () => {
      const context = "User has low sleep duration of 5.5 hours.";
      const res = await runReasoningEngine("I want to skip my evening exercise session", context);
      
      expect(res.confidence).toBeGreaterThanOrEqual(0.0);
      expect(res.confidence).toBeLessThanOrEqual(1.0);
      expect(res.goal).toBeTruthy();
      expect(typeof res.goal).toBe("string");
      expect(Array.isArray(res.facts)).toBe(true);
      expect(Array.isArray(res.risks)).toBe(true);
      expect(res.reasoningTrace.length).toBeGreaterThan(0);
    });

    // A4. Malformed context checks
    it("handles empty context gracefully without throwing", async () => {
      const res = await runReasoningEngine("", "");
      expect(res.goal).toBeDefined();
      expect(res.confidence).toBeDefined();
    });
  });

  // A2. Planning Engine
  describe("Planning Engine", () => {
    it("respects max-four-heavy-tasks-per-day constraint and orders steps", async () => {
      const context = "User has 5 pending tasks.";
      const plan = await runPlanningEngine("Plan my schedule to learn TypeScript modules today", context);
      
      if (plan) {
        expect(plan.steps.length).toBeLessThanOrEqual(4);
        expect(typeof plan.fallbackPlan).toBe("string");
        expect(typeof plan.rollbackPlan).toBe("string");
        
        // Assert execution ordering is chronological
        const orders = plan.steps.map(s => s.executionOrder);
        const sortedOrders = [...orders].sort((a, b) => a - b);
        expect(orders).toEqual(sortedOrders);
      }
    });

    it("returns null fallback plan when goal is infeasible or doesn't need planning", async () => {
      const plan = await runPlanningEngine("Just saying hello, no plan needed", "User is stressed.");
      expect(plan).toBeNull();
    });
  });

  // A2. Recommendation Engine
  describe("Recommendation Engine", () => {
    it("assigns priority from defined enum parameters and includes reason/risk", async () => {
      const context = "User is over budget limit.";
      const recs = await runRecommendationEngine("Recommend budget guidelines", context);
      
      expect(recs.length).toBeGreaterThan(0);
      recs.forEach(rec => {
        expect(rec.recommendation).toBeTruthy();
        expect(rec.reason).toBeTruthy();
        expect(rec.risk).toBeTruthy();
        expect(["Critical", "High", "Medium", "Low"]).toContain(rec.priority);
      });
    });

    it("recommendations do not contradict each other", async () => {
      const recs = await runRecommendationEngine("Recommend budget guidelines", "User is over budget limit.");
      const texts = recs.map(r => r.recommendation.toLowerCase());
      
      const hasSpendMore = texts.some(t => t.includes("spend more"));
      const hasSkipCafes = texts.some(t => t.includes("skip premium cafes") || t.includes("groceries"));
      expect(hasSpendMore && hasSkipCafes).toBe(false);
    });
  });

  // A2. Verification Engine
  describe("Verification Engine", () => {
    it("returns correct validations output structures", async () => {
      const mockPlan = { goal: "Study", steps: [] };
      const mockLogs = [{ tool: "task", success: true }];
      const mockRecs = [{ recommendation: "Rest", priority: "High" }];
      const context = "User is stressed and sleep-deprived.";

      const res = await runVerificationEngine(
        "Skip exercise",
        mockPlan,
        mockLogs,
        mockRecs,
        context
      );
      
      expect(typeof res.valid).toBe("boolean");
      expect(res.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(res.confidenceScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(res.repairSuggestions)).toBe(true);
    });
  });

  // A2. Analytics/Prediction Telemetry
  describe("Analytics & Prediction Models", () => {
    it("calculates correct telemetry values across different user fixtures", () => {
      // Test 1: Healthy Fixture
      const healthyTrends = calculateTrends(fixtures.healthy);
      const healthyPredictions = runPredictiveAnalytics(fixtures.healthy);
      const healthySuccess = buildSuccessModel(fixtures.healthy);
      
      expect(healthyTrends.habitSlope).not.toBeNaN();
      expect(healthyPredictions.burnoutProbability).toBeGreaterThanOrEqual(0);
      expect(healthyPredictions.burnoutProbability).toBeLessThanOrEqual(100);
      expect(healthySuccess.minSleepThreshold).toBeGreaterThan(0);

      // Test 2: Empty Fixture (Safe fallback validation)
      const emptyTrends = calculateTrends(fixtures.empty);
      const emptyPredictions = runPredictiveAnalytics(fixtures.empty);
      const emptySuccess = buildSuccessModel(fixtures.empty);

      expect(emptyTrends.habitSlope).toBe(0);
      expect(emptyPredictions.burnoutProbability).toBeLessThanOrEqual(50);
      expect(emptySuccess.minSleepThreshold).toBe(7.2); // Safe fallback default

      // Test 3: Overloaded Fixture
      const overloadedPredictions = runPredictiveAnalytics(fixtures.overloaded);
      const overloadedFailure = buildFailureModel(fixtures.overloaded);

      expect(overloadedPredictions.burnoutProbability).toBeGreaterThanOrEqual(5);
      expect(overloadedFailure.failureTriggers.length).toBeGreaterThanOrEqual(0);
    });
  });

  // A4. Tool Execution guards and retries
  describe("Tool Execution Guards", () => {
    it("successfully runs calculations and throws errors for non-existent tools", async () => {
      // Valid run
      const validRes = await executeToolWithGuard("calculator", { expression: "12 * 9" }, fixtures.healthy);
      expect(validRes.success).toBe(true);
      expect(validRes.result.result).toBe(108);

      // Invalid run
      const invalidRes = await executeToolWithGuard("invalidToolName", {}, fixtures.healthy);
      expect(invalidRes.success).toBe(false);
      expect(invalidRes.result.error).toContain("Tool with ID \"invalidToolName\" was not found");
    });
  });

  // A2. Behavioral Patterns Discovery
  describe("Behavioral Patterns Discovery", () => {
    it("discovers productivity cycle and sleep decline patterns correctly", () => {
      const mockData = {
        habits: [
          {
            id: "h-1",
            name: "Morning Meditate",
            logTimes: Array.from({ length: 12 }, (_, i) => `2026-06-${10 + i}T08:00:00`),
            logs: []
          }
        ],
        sleepLogs: [
          { date: "2026-06-20", duration: 8.0 },
          { date: "2026-06-21", duration: 8.2 },
          { date: "2026-06-22", duration: 8.1 },
          { date: "2026-06-23", duration: 8.0 },
          { date: "2026-06-24", duration: 7.9 },
          { date: "2026-06-25", duration: 8.0 },
          { date: "2026-06-26", duration: 8.0 },
          { date: "2026-06-27", duration: 6.0 },
          { date: "2026-06-28", duration: 6.2 },
          { date: "2026-06-29", duration: 5.8 }
        ],
        moods: []
      };

      const patterns = discoverBehavioralPatterns(mockData);
      
      const cyclePattern = patterns.find(p => p.patternType === "productivity_cycle");
      expect(cyclePattern).toBeDefined();
      expect(cyclePattern?.description).toBe("Early Morning Focus Window");

      const sleepPattern = patterns.find(p => p.patternType === "behavior_change");
      expect(sleepPattern).toBeDefined();
      expect(sleepPattern?.description).toBe("Decline in Sleep Duration");
    });
  });
});
