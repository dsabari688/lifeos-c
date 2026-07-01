import { describe, it, expect, vi } from 'vitest';
import {
  extractLearntPreferences,
  discoverBehavioralPatterns,
  observeUserData,
  evaluateToolCall,
  saveWorkflowReflection,
  evaluateObservationsAndAct,
  runDecisionEngine,
  runReasoningEngine,
  runRecommendationEngine,
  generateAndSaveReflection,
  ObservationSummary
} from './agentCognition.js';
import { queryGroq } from '../core/piggyClient.js';

vi.mock('../core/piggyClient.js', () => ({
  queryGroq: vi.fn().mockImplementation((messages: any) => {
    const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";

    if (systemMsg.includes("Decision Engine")) {
      return JSON.stringify({
        decision: "Answer",
        reason: "Direct informational answer",
        confidence: 0.95,
        priority: "Medium"
      });
    }
    if (systemMsg.includes("Reasoning Engine")) {
      return JSON.stringify({
        goal: "Help with schedule",
        facts: ["User has tasks"],
        unknowns: [],
        assumptions: ["Good sleep"],
        risks: ["Overwork"],
        constraints: ["Budget"],
        possibleSolutions: ["Reschedule"],
        confidence: 0.9,
        chosenSolution: "Reschedule tasks",
        reasoningTrace: ["Analyzed query"]
      });
    }
    if (systemMsg.includes("Recommendation Engine")) {
      return JSON.stringify({
        recommendations: [{ id: "rec-1", type: "schedule", recommendation: "Morning coding" }]
      });
    }
    if (systemMsg.includes("Reflection Engine")) {
      return JSON.stringify({
        whatWorked: "Query answered",
        whatFailed: "None",
        mistakes: [],
        corrections: [],
        futureImprovements: "Use more context"
      });
    }
    return JSON.stringify({});
  })
}));

vi.mock('../personality/agentPersonality.js', () => ({
  processEvent: vi.fn().mockResolvedValue({ triggered: true, actionTaken: "Done" })
}));

vi.mock('../planning/agentPlanning.js', () => ({
  runPlanningEngine: vi.fn().mockResolvedValue(null),
  optimizePlan: vi.fn().mockResolvedValue(null)
}));

vi.mock('../prediction/agentPrediction.js', () => ({
  runPredictiveAnalytics: vi.fn().mockReturnValue({
    burnoutProbability: 80,
    budgetOverflowProbability: 85,
    deadlineFailureProbability: 55,
    predictedSleepQuality: "good",
    predictedEnergyLevel: 75,
    goalPredictions: []
  }),
  runOpportunityEngine: vi.fn().mockResolvedValue([]),
  runPriorityEngine: vi.fn().mockResolvedValue({ priority: "High", reason: "test", breakdown: { mentalLoad: 5 } }),
  runScenarioEngine: vi.fn().mockResolvedValue(null)
}));

vi.mock('../safety/agentSafety.js', () => ({
  runRiskEngine: vi.fn().mockResolvedValue([])
}));

describe("Learnt Preferences Extraction", () => {
  it("extracts best study hours from task completion data", () => {
    const userData = {
      tasks: [
        { status: "completed", time: "19:00" },
        { status: "completed", time: "19:30" },
        { status: "completed", time: "09:00" },
        { status: "pending", time: "14:00" }
      ],
      habits: [],
      focusSessions: [],
      sleepLogs: [],
      expenses: []
    };

    const prefs = extractLearntPreferences(userData);
    expect(prefs.bestStudyHours).toBe("19:00 - 22:00");
  });

  it("extracts best workout times from exercise habit log times", () => {
    const userData = {
      tasks: [],
      habits: [{
        name: "Exercise Workout",
        logTimes: [
          new Date(2026, 5, 25, 18, 0).toISOString(),
          new Date(2026, 5, 26, 18, 30).toISOString(),
          new Date(2026, 5, 27, 8, 0).toISOString()
        ],
        logs: []
      }],
      focusSessions: [],
      sleepLogs: [],
      expenses: []
    };

    const prefs = extractLearntPreferences(userData);
    expect(prefs.bestWorkoutTimes).toBe("18:00 - 20:00");
  });

  it("calculates sleep impact factor from sleep-habit correlation", () => {
    const dateStr = (d: number) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      return dt.toISOString().split("T")[0];
    };

    const userData = {
      tasks: [],
      habits: [
        { name: "Read", logs: [dateStr(1), dateStr(2), dateStr(3)], logTimes: [] },
      ],
      focusSessions: [],
      sleepLogs: [
        { date: dateStr(1), duration: 8.0 },
        { date: dateStr(2), duration: 8.0 },
        { date: dateStr(3), duration: 8.0 },
        { date: dateStr(4), duration: 5.0 }
      ],
      expenses: []
    };

    const prefs = extractLearntPreferences(userData);
    // Good sleep days have completions, poor sleep day doesn't -> positive correlation
    expect(prefs.sleepImpactFactor).toBeGreaterThan(0.3);
  });

  it("calculates focus impact factor", () => {
    const userData = {
      tasks: [
        { status: "completed" },
        { status: "completed" }
      ],
      habits: [],
      focusSessions: [{ durationMinutes: 60 }],
      sleepLogs: [],
      expenses: [{ amount: 100, category: "food" }]
    };

    const prefs = extractLearntPreferences(userData);
    expect(prefs.focusImpactFactor).toBeGreaterThan(0.4);
    expect(prefs.budgetHabitsSummary).toContain("food");
  });

  it("returns defaults when data is empty", () => {
    const prefs = extractLearntPreferences({});
    expect(prefs.bestStudyHours).toBe("9:00 - 12:00");
    expect(prefs.bestWorkoutTimes).toBe("08:00 - 10:00");
    expect(prefs.sleepImpactFactor).toBe(0.45);
  });
});

describe("Behavioral Pattern Discovery", () => {
  it("detects morning productivity cycle", () => {
    const morningTimes = Array(15).fill(null).map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(8);
      return d.toISOString();
    });

    const userData = {
      habits: [{ name: "Exercise", logTimes: morningTimes, logs: [] }],
      sleepLogs: [],
      moods: []
    };

    const patterns = discoverBehavioralPatterns(userData);
    expect(patterns.some(p => p.description === "Early Morning Focus Window")).toBe(true);
  });

  it("detects evening productivity cycle", () => {
    const eveningTimes = Array(15).fill(null).map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(20);
      return d.toISOString();
    });

    const userData = {
      habits: [{ name: "Code", logTimes: eveningTimes, logs: [] }],
      sleepLogs: [],
      moods: []
    };

    const patterns = discoverBehavioralPatterns(userData);
    expect(patterns.some(p => p.description === "Evening Deep Work Window")).toBe(true);
  });

  it("detects sleep duration decline", () => {
    const userData = {
      habits: [],
      sleepLogs: [
        { duration: 8.0 }, { duration: 8.0 }, { duration: 8.0 },
        { duration: 8.0 }, { duration: 8.0 }, { duration: 8.0 },
        // Recent 3 are low
        { duration: 5.5 }, { duration: 5.0 }, { duration: 5.5 }
      ],
      moods: []
    };

    const patterns = discoverBehavioralPatterns(userData);
    expect(patterns.some(p => p.description === "Decline in Sleep Duration")).toBe(true);
  });

  it("returns balanced routine fallback when no patterns detected", () => {
    const userData = { habits: [], sleepLogs: [], moods: [] };
    const patterns = discoverBehavioralPatterns(userData);

    expect(patterns.length).toBe(1);
    expect(patterns[0].description).toBe("Balanced Routine Cycle");
    expect(patterns[0].significance).toBe("low");
  });
});

describe("User Data Observation", () => {
  it("compiles observation summary with burnout, budget, and deadline warnings", () => {
    const userData = {
      tasks: [
        { status: "pending" },
        { status: "completed" }
      ],
      goals: [
        { status: "active" },
        { status: "completed" }
      ],
      habits: [],
      sleepLogs: [],
      moods: []
    };

    const summary = observeUserData(userData);
    expect(summary.pendingTaskCount).toBe(1);
    expect(summary.activeGoalCount).toBe(1);
    // Mock returns burnout:80 > 65, budget:85 > 75, deadline:55 > 50
    expect(summary.observations.some(o => o.includes("Burnout warning"))).toBe(true);
    expect(summary.observations.some(o => o.includes("Budget overrun"))).toBe(true);
    expect(summary.observations.some(o => o.includes("Task congestion"))).toBe(true);
  });
});

describe("Tool Call Evaluation", () => {
  it("evaluates createTask success", () => {
    const result = evaluateToolCall("createTask", { title: "Fix bug" }, "any", { title: "Fix bug" });
    expect(result.qualityScore).toBe(100);
    expect(result.difference).toBeNull();
  });

  it("evaluates createTask failure", () => {
    const result = evaluateToolCall("createTask", { title: "Fix bug" }, "any", { title: "Other" });
    expect(result.qualityScore).toBe(0);
    expect(result.difference).toContain("not found");
  });

  it("evaluates updateTaskStatus success", () => {
    const result = evaluateToolCall("updateTaskStatus", { status: "completed" }, "any", { status: "completed" });
    expect(result.qualityScore).toBe(100);
  });

  it("evaluates updateTaskStatus failure", () => {
    const result = evaluateToolCall("updateTaskStatus", { status: "completed" }, "any", { status: "pending" });
    expect(result.qualityScore).toBe(30);
  });

  it("evaluates deleteTask success", () => {
    const result = evaluateToolCall("deleteTask", { id: "t1" }, "any", { deleted: true });
    expect(result.qualityScore).toBe(100);
  });

  it("evaluates deleteTask failure", () => {
    const result = evaluateToolCall("deleteTask", { id: "t1" }, "any", { deleted: false });
    expect(result.qualityScore).toBe(0);
  });

  it("evaluates createGoal failure", () => {
    const result = evaluateToolCall("createGoal", { title: "Learn React" }, "any", { title: "other" });
    expect(result.qualityScore).toBe(10);
  });

  it("evaluates updateGoalProgress mismatch", () => {
    const result = evaluateToolCall("updateGoalProgress", { progress: 50 }, "any", { progress: 30 });
    expect(result.qualityScore).toBe(50);
  });

  it("evaluates createHabit failure", () => {
    const result = evaluateToolCall("createHabit", { name: "Meditate" }, "any", { name: "other" });
    expect(result.qualityScore).toBe(0);
  });

  it("evaluates logHabit failure", () => {
    const result = evaluateToolCall("logHabit", { date: "2026-07-01" }, "any", { logged: false });
    expect(result.qualityScore).toBe(20);
  });

  it("evaluates addExpense mismatch", () => {
    const result = evaluateToolCall("addExpense", { amount: 100 }, "any", { amount: 50 });
    expect(result.qualityScore).toBe(40);
  });

  it("performs generic keyword match for unknown tools", () => {
    const result = evaluateToolCall("unknownTool", {}, "expected result with keywords", { data: "something else entirely different" });
    expect(result.qualityScore).toBeLessThan(100);
  });

  it("skips generic check when expected is 'any'", () => {
    const result = evaluateToolCall("unknownTool", {}, "any", { data: "something" });
    expect(result.qualityScore).toBe(100);
    expect(result.difference).toBeNull();
  });
});

describe("Workflow Reflection", () => {
  it("saves reflection and trims history to 50", () => {
    const userData: any = { workflowReflections: Array(50).fill({ id: "old", goal: "old" }) };

    saveWorkflowReflection(userData, {
      goal: "Test goal",
      plan: "Plan A",
      execution: "Executed",
      mistakes: [],
      success: true,
      improvements: "None"
    });

    expect(userData.workflowReflections.length).toBe(50);
    expect(userData.workflowReflections[49].goal).toBe("Test goal");
  });

  it("creates workflowReflections array if missing", () => {
    const userData: any = {};
    saveWorkflowReflection(userData, {
      goal: "First", plan: "", execution: "", mistakes: [], success: true, improvements: ""
    });

    expect(userData.workflowReflections).toHaveLength(1);
  });
});

describe("Observation Reactor", () => {
  it("dispatches events for high burnout and budget overflow", async () => {
    const { processEvent } = await import('../personality/agentPersonality.js');
    const userData: any = { moods: [{ mood: "stressed" }] };

    const obs: ObservationSummary = {
      burnoutProbability: 80,
      budgetOverflowProbability: 85,
      deadlineFailureProbability: 20,
      pendingTaskCount: 3,
      activeGoalCount: 2,
      warningsCount: 2,
      observations: []
    };

    await evaluateObservationsAndAct(userData, obs);

    expect(processEvent).toHaveBeenCalledWith("poor_sleep", expect.anything(), userData);
    expect(processEvent).toHaveBeenCalledWith("budget_exceeded", expect.anything(), userData);
    expect(processEvent).toHaveBeenCalledWith("low_mood", expect.anything(), userData);
  });
});

describe("Async Engines", () => {
  it("runDecisionEngine returns parsed decision", async () => {
    const result = await runDecisionEngine("Help me plan", "reasoning", "context");
    expect(result.decision).toBe("Answer");
    expect(result.confidence).toBe(0.95);
  });

  it("runDecisionEngine handles errors with fallback", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API fail"));
    const result = await runDecisionEngine("test", "test", "test");
    expect(result.decision).toBe("Answer");
    expect(result.reason).toContain("Fallback");
  });

  it("runReasoningEngine returns parsed reasoning", async () => {
    const result = await runReasoningEngine("Help schedule", "context");
    expect(result.goal).toBe("Help with schedule");
    expect(result.chosenSolution).toBe("Reschedule tasks");
  });

  it("runReasoningEngine handles errors with fallback", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API fail"));
    const result = await runReasoningEngine("test", "test");
    expect(result.goal).toBe("Assist productivity cockpit");
  });

  it("runRecommendationEngine returns recommendations", async () => {
    const result = await runRecommendationEngine("Optimize my schedule", "context");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("rec-1");
  });

  it("runRecommendationEngine handles errors", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API fail"));
    const result = await runRecommendationEngine("test", "test");
    expect(result).toEqual([]);
  });

  it("generateAndSaveReflection saves reflection record", async () => {
    const userData: any = {};
    await generateAndSaveReflection("query", "response", [], 0, userData);

    expect(userData.reflections).toBeDefined();
    expect(userData.reflections).toHaveLength(1);
    expect(userData.reflections[0].whatWorked).toBe("Query answered");
  });

  it("generateAndSaveReflection trims history to 30", async () => {
    const userData: any = { reflections: Array(30).fill({ id: "old" }) };
    await generateAndSaveReflection("query", "response", [], 0, userData);

    expect(userData.reflections.length).toBe(30);
  });

  it("generateAndSaveReflection handles errors", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API fail"));
    const userData: any = {};
    await generateAndSaveReflection("query", "response", [], 0, userData);

    expect(userData.reflections).toBeUndefined();
  });
});
