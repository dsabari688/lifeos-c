import { describe, it, expect, vi } from 'vitest';
import {
  analyzeUserBehavior,
  processEvent,
  generateObservations,
  formatPiggyResponse,
  generateMorningBriefing,
  generateEveningReview,
  generateWeeklyReport,
  PIGGY_EXAMPLES
} from './agentPersonality.js';
import { queryGroq } from '../core/piggyClient.js';

// Mock all dependencies
vi.mock('../core/piggyClient.js', () => ({
  queryGroq: vi.fn().mockResolvedValue("Mock AI response from Piggy.")
}));

vi.mock('../core/piggyContext.js', () => ({
  collectUserContext: vi.fn().mockReturnValue({
    profile: { name: "Test", email: "t@t.com", aiPersonality: "Logical", budgetLimit: 1000 },
    metrics: { healthScore: 80, consistency: 75, momentum: 85, goalProgress: 60, energy: 70, burnoutRisk: 30, peakWindow: "9-11", bestStudyDuration: 50 },
    upcomingDeadlines: [], activeGoals: [], tasksList: [], habitsList: [],
    financialBudgets: [], recentSleepLogs: [], recentMoodLogs: [],
    currentView: "dashboard", highlightedEntity: "None"
  })
}));

vi.mock('../core/piggyIntelligence.js', () => ({
  calculateHabitPatterns: vi.fn().mockReturnValue({
    overallCompletion: 45,
    morningPercent: 70,
    afternoonPercent: 10,
    nightPercent: 20,
    bestWeekday: "Monday",
    worstWeekday: "Sunday",
    longestStreak: 10,
    currentStreak: 5,
    consistencyScore: 60,
    momentum: "Stable"
  }),
  calculateHabitRisk: vi.fn().mockReturnValue({
    riskPercent: 65,
    reasons: ["Skipped on 3 Sundays"],
    recommendation: "Schedule before 9 AM",
    successProbability: 70,
    confidencePercent: 80
  }),
  getDaysBetween: vi.fn().mockReturnValue(2)
}));

vi.mock('../memory/agentMemory.js', () => ({
  retrieveRelevantMemories: vi.fn().mockReturnValue([])
}));

vi.mock('../prediction/agentPrediction.js', () => ({
  calculateTrends: vi.fn().mockReturnValue({ habitSlope: 15, trendSummary: "improved" }),
  runPredictiveAnalytics: vi.fn().mockReturnValue({
    burnoutProbability: 70,
    budgetOverflowProbability: 50,
    deadlineFailureProbability: 30,
    predictedSleepQuality: "good",
    predictedEnergyLevel: 75,
    goalPredictions: []
  })
}));

describe("User Behavior Analysis", () => {
  const today = new Date();
  const getDateAgo = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  };

  it("detects improving consistency trend", () => {
    const userData = {
      habits: [{
        logs: [getDateAgo(1), getDateAgo(2), getDateAgo(3), getDateAgo(4), getDateAgo(5), getDateAgo(6)],
        // 6 logs this week, 0 prior week -> improving
      }],
      recommendationsFeedback: [
        { status: "accepted" },
        { status: "ignored" }
      ],
      focusSessions: [{ durationMinutes: 100 }],
      moods: [{ mood: "happy" }]
    };

    const result = analyzeUserBehavior(userData);
    expect(result.consistencyTrend).toBe("improving");
    expect(result.complianceRate).toBe(50); // 1/2 = 50%
    expect(result.burnoutRiskLevel).toBe("low"); // 100 min < 300
  });

  it("detects declining consistency trend", () => {
    const userData = {
      habits: [{
        logs: [getDateAgo(8), getDateAgo(9), getDateAgo(10), getDateAgo(11), getDateAgo(12), getDateAgo(13)],
        // 0 this week, 6 prior week -> declining
      }],
      recommendationsFeedback: [],
      focusSessions: [],
      moods: []
    };

    const result = analyzeUserBehavior(userData);
    expect(result.consistencyTrend).toBe("declining");
    expect(result.complianceRate).toBe(75); // default when no feedback
  });

  it("detects high burnout risk from excessive focus and stress", () => {
    const userData = {
      habits: [],
      recommendationsFeedback: [],
      focusSessions: Array(7).fill({ durationMinutes: 80 }), // 560 min > 500
      moods: [{ mood: "stressed" }, { mood: "stressed" }, { mood: "stressed" }]
    };

    const result = analyzeUserBehavior(userData);
    expect(result.burnoutRiskLevel).toBe("high");
  });

  it("detects medium burnout risk", () => {
    const userData = {
      habits: [],
      recommendationsFeedback: [],
      focusSessions: [{ durationMinutes: 350 }], // > 300
      moods: []
    };

    const result = analyzeUserBehavior(userData);
    expect(result.burnoutRiskLevel).toBe("medium");
  });
});

describe("Event Processing", () => {
  it("handles new_task event", async () => {
    const userData: any = {};
    const result = await processEvent("new_task", { title: "Fix bugs" }, userData);

    expect(result.triggered).toBe(true);
    expect(userData.notifications).toHaveLength(1);
    expect(userData.notifications[0].title).toBe("Schedule Re-optimized");
  });

  it("handles budget_exceeded event", async () => {
    const userData: any = {};
    const result = await processEvent("budget_exceeded", { category: "food" }, userData);

    expect(result.triggered).toBe(true);
    expect(userData.notifications[0].type).toBe("warning");
  });

  it("handles deadline_near event with found task", async () => {
    const userData: any = {
      tasks: [{ id: "t1", title: "Submit report", priority: "low" }]
    };
    const result = await processEvent("deadline_near", { taskId: "t1" }, userData);

    expect(result.triggered).toBe(true);
    expect(userData.tasks[0].priority).toBe("critical");
  });

  it("handles deadline_near event with missing task", async () => {
    const userData: any = { tasks: [] };
    const result = await processEvent("deadline_near", { taskId: "nonexistent" }, userData);

    expect(result.triggered).toBe(false);
  });

  it("handles poor_sleep event and defers non-essential tasks", async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const userData: any = {
      tasks: [
        { date: todayStr, status: "pending", priority: "low", title: "Read book" },
        { date: todayStr, status: "pending", priority: "high", title: "Critical meeting" },
        { date: todayStr, status: "completed", priority: "low", title: "Done task" }
      ]
    };
    const result = await processEvent("poor_sleep", { duration: 4.5 }, userData);

    expect(result.triggered).toBe(true);
    // Only the first task should be deferred (low priority + pending + today)
    expect(userData.tasks[0].date).not.toBe(todayStr);
    expect(userData.tasks[0].rescheduledCount).toBe(1);
    // High priority task should not be deferred
    expect(userData.tasks[1].date).toBe(todayStr);
    expect(userData.notifications).toHaveLength(1);
  });

  it("handles poor_sleep with no deferrable tasks", async () => {
    const userData: any = { tasks: [] };
    const result = await processEvent("poor_sleep", { duration: 4.5 }, userData);

    expect(result.triggered).toBe(true);
    expect(userData.notifications).toHaveLength(0);
  });

  it("handles low_mood event", async () => {
    const userData: any = {};
    const result = await processEvent("low_mood", {}, userData);

    expect(result.triggered).toBe(true);
    expect(userData.notifications[0].title).toBe("Cognitive Reset Proposed");
  });

  it("handles unknown event type with default case", async () => {
    const userData: any = {};
    const result = await processEvent("unknown_event" as any, {}, userData);

    expect(result.triggered).toBe(false);
    expect(result.actionTaken).toContain("No registered");
  });
});

describe("Observation Generation", () => {
  it("generates observations for habits with low completion and high risk", () => {
    const userData = {
      habits: [{ name: "Exercise", logs: ["2026-06-01"], streak: 5 }],
      sleepLogs: [],
      moods: [],
      tasks: [],
      expenses: [],
      profile: { budgetLimit: 1000 },
      recommendationsFeedback: []
    };

    const observations = generateObservations(userData);
    // Should include low consistency and high risk warning
    expect(observations.some(o => o.includes("Consistency index"))).toBe(true);
    expect(observations.some(o => o.includes("failure risk"))).toBe(true);
  });

  it("generates stress observations for repeated stressed moods", () => {
    const userData = {
      habits: [],
      sleepLogs: [],
      moods: [{ mood: "stressed" }, { mood: "stressed" }],
      tasks: [],
      expenses: [],
      profile: {},
      recommendationsFeedback: []
    };

    const observations = generateObservations(userData);
    expect(observations.some(o => o.includes("Stress indicators"))).toBe(true);
  });

  it("generates observations for highly rescheduled tasks", () => {
    const userData = {
      habits: [],
      sleepLogs: [],
      moods: [],
      tasks: [{ title: "Refactor code", status: "pending", rescheduledCount: 3 }],
      expenses: [],
      profile: {},
      recommendationsFeedback: []
    };

    const observations = generateObservations(userData);
    expect(observations.some(o => o.includes("Refactor code") && o.includes("deferred"))).toBe(true);
  });

  it("generates budget warning when spending is high", () => {
    const userData = {
      habits: [],
      sleepLogs: [],
      moods: [],
      tasks: [],
      expenses: [{ amount: 900, isImpulsive: false }],
      profile: { budgetLimit: 1000 },
      recommendationsFeedback: []
    };

    const observations = generateObservations(userData);
    expect(observations.some(o => o.includes("Budget utilization"))).toBe(true);
  });

  it("generates impulse spending alert", () => {
    const userData = {
      habits: [],
      sleepLogs: [],
      moods: [],
      tasks: [],
      expenses: [{ amount: 50, isImpulsive: true }, { amount: 30, isImpulsive: true }],
      profile: { budgetLimit: 5000 },
      recommendationsFeedback: []
    };

    const observations = generateObservations(userData);
    expect(observations.some(o => o.includes("Impulse buying"))).toBe(true);
  });

  it("generates recommendation ROI and workout shift observations", () => {
    const userData = {
      habits: [],
      sleepLogs: [],
      moods: [],
      tasks: [],
      expenses: [],
      profile: { budgetLimit: 5000 },
      recommendationsFeedback: [
        { status: "accepted", targetMetricAfter: 80, baselineRateBefore: 60, text: "test" },
        { status: "ignored", text: "Morning Workout exercise suggestion", targetMetricAfter: null, baselineRateBefore: 50 },
        { status: "ignored", text: "Morning Workout exercise suggestion", targetMetricAfter: null, baselineRateBefore: 50 }
      ]
    };

    const observations = generateObservations(userData);
    expect(observations.some(o => o.includes("improved your overall"))).toBe(true);
    expect(observations.some(o => o.includes("morning workout"))).toBe(true);
  });

  it("generates burnout warning from prediction engine", () => {
    // The mock returns burnoutProbability: 70 which is > 65
    const userData = {
      habits: [],
      sleepLogs: [],
      moods: [],
      tasks: [],
      expenses: [],
      profile: {},
      recommendationsFeedback: []
    };

    const observations = generateObservations(userData);
    expect(observations.some(o => o.includes("Burnout warning"))).toBe(true);
  });

  it("generates morning-dominant habit observation", () => {
    const userData = {
      habits: [{ name: "Exercise", logs: ["2026-06-30"], streak: 5 }],
      sleepLogs: [],
      moods: [],
      tasks: [],
      expenses: [],
      profile: { budgetLimit: 5000 },
      recommendationsFeedback: []
    };

    // Mock returns morningPercent: 70, nightPercent: 20 -> diff > 25, should trigger morning-dominant observation
    const observations = generateObservations(userData);
    expect(observations.some(o => o.includes("Morning slots") || o.includes("Consistency"))).toBe(true);
  });

  it("detects sleep below average observation", () => {
    const userData = {
      habits: [],
      sleepLogs: [
        { duration: 8.0 },
        { duration: 8.0 },
        { duration: 8.0 },
        { duration: 5.0 } // last sleep far below avg of 7.25
      ],
      moods: [],
      tasks: [],
      expenses: [],
      profile: {},
      recommendationsFeedback: []
    };

    const observations = generateObservations(userData);
    expect(observations.some(o => o.includes("sleep duration") && o.includes("below"))).toBe(true);
  });
});

describe("Response Formatter", () => {
  it("strips markdown formatting from response text", () => {
    const input = "**Bold** and *italic* with `code` and\n- bullet\n+ plus\n> blockquote\n\n\n\nTriple newline";
    const result = formatPiggyResponse(input);

    expect(result).not.toContain("**");
    expect(result).not.toContain("*");
    expect(result).not.toContain("`");
    expect(result).not.toContain("- ");
    expect(result).not.toContain("+ ");
    expect(result).not.toContain("> ");
    expect(result).not.toContain("\n\n\n");
  });
});

describe("Conversation Generators", () => {
  it("generates morning briefing successfully", async () => {
    const result = await generateMorningBriefing({ profile: {} });
    expect(result).toBe("Mock AI response from Piggy.");
  });

  it("generates evening review successfully", async () => {
    const result = await generateEveningReview({ profile: {} });
    expect(result).toBe("Mock AI response from Piggy.");
  });

  it("generates weekly report successfully", async () => {
    const result = await generateWeeklyReport({ profile: {} });
    expect(result).toBe("Mock AI response from Piggy.");
  });

  it("returns fallback on morning briefing error", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API error"));
    const result = await generateMorningBriefing({ profile: {} });
    expect(result).toContain("Good morning");
  });

  it("returns fallback on evening review error", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API error"));
    const result = await generateEveningReview({ profile: {} });
    expect(result).toContain("day is wrapping up");
  });

  it("returns fallback on weekly report error", async () => {
    vi.mocked(queryGroq).mockRejectedValueOnce(new Error("API error"));
    const result = await generateWeeklyReport({ profile: {} });
    expect(result).toContain("weekly metrics");
  });
});

describe("PIGGY_EXAMPLES", () => {
  it("contains expected example categories", () => {
    expect(PIGGY_EXAMPLES.length).toBeGreaterThan(10);
    const categories = PIGGY_EXAMPLES.map(e => e.category);
    expect(categories).toContain("task_prioritization");
    expect(categories).toContain("habit_coaching");
    expect(categories).toContain("plan_tomorrow");
    expect(categories).toContain("burnout_prevention");
  });
});
