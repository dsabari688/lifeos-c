import { describe, it, expect } from 'vitest';
import {
  getDaysBetween,
  calculateHabitPatterns,
  calculateHabitRisk,
  calculateEnergyLevels,
  calculateCorrelations,
  calculateGoalPacing,
  checkAchievements,
  synthesizeAIDashboard,
  detectUpcomingDeadlines,
  generateSeedData,
  evaluateOutcomeMetrics
} from './piggyIntelligence.js';

describe("getDaysBetween", () => {
  it("calculates positive days between two dates", () => {
    expect(getDaysBetween("2026-07-01", "2026-07-05")).toBe(4);
  });

  it("returns 0 for same date", () => {
    expect(getDaysBetween("2026-07-01", "2026-07-01")).toBe(0);
  });

  it("returns 0 when end is before start (clamped)", () => {
    expect(getDaysBetween("2026-07-05", "2026-07-01")).toBe(0);
  });
});

describe("Habit Pattern Intelligence", () => {
  const today = new Date();
  const getDateAgo = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  };

  it("returns defaults for empty logs", () => {
    const result = calculateHabitPatterns({ logs: [], logTimes: [], streak: 0 }, [], []);
    expect(result.overallCompletion).toBe(0);
    expect(result.morningPercent).toBe(0);
    expect(result.momentum).toBe("Stable");
  });

  it("calculates completion rate, time distribution, and momentum", () => {
    const morningTime = (d: number) => {
      const dt = new Date(today); dt.setDate(dt.getDate() - d); dt.setHours(8);
      return dt.toISOString();
    };
    const eveningTime = (d: number) => {
      const dt = new Date(today); dt.setDate(dt.getDate() - d); dt.setHours(20);
      return dt.toISOString();
    };

    const habit = {
      logs: [getDateAgo(1), getDateAgo(2), getDateAgo(3), getDateAgo(4), getDateAgo(5)],
      logTimes: [morningTime(1), morningTime(2), morningTime(3), eveningTime(4), eveningTime(5)],
      streak: 5
    };

    const result = calculateHabitPatterns(habit, [], []);
    expect(result.overallCompletion).toBeGreaterThan(0);
    expect(result.morningPercent).toBe(60); // 3 morning / 5 total
    expect(result.nightPercent).toBe(40);  // 2 evening / 5 total
    expect(result.currentStreak).toBe(5);
  });

  it("detects increasing momentum when recent week has more completions", () => {
    const habit = {
      logs: [getDateAgo(1), getDateAgo(2), getDateAgo(3), getDateAgo(4), getDateAgo(5), getDateAgo(6)],
      logTimes: [],
      streak: 6
    };

    const result = calculateHabitPatterns(habit, [], []);
    expect(result.momentum).toBe("Increasing");
  });

  it("detects declining momentum when prior week had more completions", () => {
    const habit = {
      logs: [getDateAgo(8), getDateAgo(9), getDateAgo(10), getDateAgo(11), getDateAgo(12), getDateAgo(13)],
      logTimes: [],
      streak: 0
    };

    const result = calculateHabitPatterns(habit, [], []);
    expect(result.momentum).toBe("Declining");
  });

  it("calculates longest streak across consecutive days", () => {
    const habit = {
      logs: [getDateAgo(5), getDateAgo(4), getDateAgo(3), getDateAgo(1)], // 3 consecutive then gap then 1
      logTimes: [],
      streak: 1
    };

    const result = calculateHabitPatterns(habit, [], []);
    expect(result.longestStreak).toBe(3);
  });
});

describe("Habit Risk Calculation", () => {
  it("returns base risk for habits with no logs", () => {
    const result = calculateHabitRisk({ name: "Test", logs: [] }, [], [], {});
    expect(result.riskPercent).toBe(30);
    expect(result.successProbability).toBe(80);
  });

  it("increases risk for poor sleep and declining momentum", () => {
    const today = new Date();
    const getDateAgo = (d: number) => {
      const dt = new Date(today); dt.setDate(dt.getDate() - d);
      return dt.toISOString().split("T")[0];
    };

    const habit = {
      name: "Study",
      logs: [getDateAgo(8), getDateAgo(9), getDateAgo(10)], // declining momentum (prior week only)
      logTimes: [],
      streak: 0
    };
    const sleepLogs = [
      { duration: 8.0 },
      { duration: 8.0 },
      { duration: 5.5 } // below average -> +15 risk
    ];

    const result = calculateHabitRisk(habit, sleepLogs, [], {});
    expect(result.riskPercent).toBeGreaterThan(25);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("generates evening workout recommendation for exercise with ignored morning suggestions", () => {
    const today = new Date();
    const habit = {
      name: "Exercise Workout",
      logs: [today.toISOString().split("T")[0]],
      logTimes: [],
      streak: 5
    };

    const userData = {
      recommendationsFeedback: [
        { text: "Morning Workout exercise", status: "ignored" },
        { text: "Morning Workout exercise", status: "ignored" }
      ]
    };

    const result = calculateHabitRisk(habit, [], [], userData);
    expect(result.recommendation).toContain("evening");
    expect(result.reasons.some((r: string) => r.includes("ignored"))).toBe(true);
  });

  it("generates reading-specific recommendation with ignored evening suggestions", () => {
    const today = new Date();
    const habit = { name: "Read 20 pages", logs: [today.toISOString().split("T")[0]], logTimes: [], streak: 5 };

    const userData = {
      recommendationsFeedback: [
        { text: "Evening Reading suggestion", status: "ignored" },
        { text: "Evening Reading suggestion", status: "ignored" }
      ]
    };

    const result = calculateHabitRisk(habit, [], [], userData);
    expect(result.recommendation).toContain("11:30 AM");
  });

  it("generates meditation-specific recommendation with ignored suggestions", () => {
    const today = new Date();
    const habit = { name: "Mindfulness Meditation", logs: [today.toISOString().split("T")[0]], logTimes: [], streak: 5 };

    const userData = {
      recommendationsFeedback: [
        { text: "Meditation suggestion", status: "ignored" },
        { text: "Meditation suggestion", status: "ignored" }
      ]
    };

    const result = calculateHabitRisk(habit, [], [], userData);
    expect(result.recommendation).toContain("Breathing");
  });
});

describe("Energy Level Calculations", () => {
  it("identifies peak window from task completions", () => {
    const tasks = [
      { status: "completed", time: "20:00" },
      { status: "completed", time: "20:30" },
      { status: "completed", time: "09:00" }
    ];

    const result = calculateEnergyLevels(tasks, []);
    expect(result.peakWindow).toBe("20:00 - 23:00");
    expect(result.bestStudyDuration).toBe(25); // default
  });

  it("identifies best study duration from focus sessions", () => {
    const sessions = [
      { durationMinutes: 50, completedTasks: 2, distractions: 0, score: 95, timestamp: "" },
      { durationMinutes: 50, completedTasks: 1, distractions: 1, score: 90, timestamp: "" },
      { durationMinutes: 25, completedTasks: 1, distractions: 0, score: 70, timestamp: "" }
    ];

    const result = calculateEnergyLevels([], sessions);
    expect(result.bestStudyDuration).toBe(50);
  });
});

describe("Habit Correlations", () => {
  it("generates correlations for meditation + exercise + reading", () => {
    const habits = [
      { name: "Meditation", logs: [] },
      { name: "Exercise Workout", logs: [] },
      { name: "Read 20 pages", logs: [] }
    ];

    const result = calculateCorrelations(habits, [{ duration: 7 }], [{ durationMinutes: 60, completedTasks: 1, distractions: 0, score: 80, timestamp: "" }], [{ status: "completed" }]);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(c => c.cause.includes("Meditation"))).toBe(true);
    expect(result.some(c => c.effect.includes("Mood"))).toBe(true);
  });

  it("returns default correlations when no habits match", () => {
    const result = calculateCorrelations([], [], [], []);
    expect(result.length).toBe(4);
    expect(result[0].cause).toBe("Meditation");
  });
});

describe("Goal Pacing", () => {
  it("returns on track for goal with no deadline", () => {
    const result = calculateGoalPacing({ progress: 50 });
    expect(result.statusText).toBe("No deadline set");
  });

  it("detects behind schedule goal", () => {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() + 5);

    const result = calculateGoalPacing({ progress: 10, targetDate: pastDate.toISOString().split("T")[0] });
    expect(result.statusText).toContain("Behind");
    expect(result.sessionsNeeded).toBeGreaterThan(0);
  });
});

describe("Achievements", () => {
  it("unlocks reading achievement for 20+ day streak", () => {
    const achievements = checkAchievements(
      { budgetLimit: 1000 },
      [{ name: "Read 20 pages", streak: 25, logs: Array(25).fill("date") }],
      [{ durationMinutes: 200, completedTasks: 1, distractions: 0, score: 80, timestamp: "" }],
      [{ amount: 500 }]
    );

    expect(achievements[0].unlocked).toBe(true); // 30 day reader
    expect(achievements[2].unlocked).toBe(true); // Deep work (200 >= 150)
    expect(achievements[3].unlocked).toBe(true); // Expense saver (500 < 1000)
  });

  it("unlocks consistency master for high completion rate", () => {
    const achievements = checkAchievements(
      {},
      [{ name: "A", streak: 0, logs: Array(25).fill("d") }],
      [],
      []
    );
    expect(achievements[1].unlocked).toBe(true); // 25/30 = 83% >= 75%
  });
});

describe("AI Dashboard Synthesis", () => {
  it("synthesizes dashboard metrics from comprehensive user data", () => {
    const today = new Date().toISOString().split("T")[0];
    const userData = {
      habits: [{ name: "Read", streak: 5, logs: [today], logTimes: [] }],
      tasks: [
        { status: "completed", time: "09:00" },
        { status: "pending" }
      ],
      focusSessions: [{ durationMinutes: 50, score: 85, timestamp: "" }],
      sleepLogs: [{ duration: 7.5, date: today }],
      moods: [{ mood: "happy" }],
      expenses: [{ amount: 50 }],
      goals: [{ progress: 60, status: "active" }],
      profile: {}
    };

    const dashboard = synthesizeAIDashboard(userData);
    expect(dashboard.healthScore).toBeGreaterThan(0);
    expect(dashboard.consistency).toBeGreaterThan(0);
    expect(dashboard.momentum).toBeGreaterThan(0);
    expect(dashboard.goalProgress).toBe(60);
    expect(dashboard.energyData.peakWindow).toBeDefined();
  });

  it("returns sensible defaults for empty user data", () => {
    const dashboard = synthesizeAIDashboard({});
    expect(dashboard.healthScore).toBeGreaterThan(0);
    expect(dashboard.consistency).toBeGreaterThan(0);
  });
});

describe("Deadline Detection", () => {
  it("detects task deadlines within 3 days", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const userData = {
      tasks: [
        { title: "Submit exam paper", status: "pending", date: tomorrow.toISOString().split("T")[0] },
        { title: "Buy groceries", status: "pending", date: tomorrow.toISOString().split("T")[0] } // no deadline keyword
      ],
      goals: [],
      aiMemory: []
    };

    const deadlines = detectUpcomingDeadlines(userData);
    expect(deadlines.length).toBe(1);
    expect(deadlines[0].type).toBe("task");
  });

  it("detects goal deadlines within 5 days", () => {
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);

    const userData = {
      tasks: [],
      goals: [
        { title: "Learn React", status: "active", targetDate: inThreeDays.toISOString().split("T")[0] },
        { title: "Archived", status: "completed", targetDate: inThreeDays.toISOString().split("T")[0] }
      ],
      aiMemory: []
    };

    const deadlines = detectUpcomingDeadlines(userData);
    expect(deadlines.length).toBe(1);
    expect(deadlines[0].type).toBe("goal");
  });

  it("returns empty for no upcoming deadlines", () => {
    const farDate = new Date();
    farDate.setDate(farDate.getDate() + 30);

    const userData = {
      tasks: [{ title: "Exam", status: "pending", date: farDate.toISOString().split("T")[0] }],
      goals: [],
      aiMemory: []
    };

    const deadlines = detectUpcomingDeadlines(userData);
    expect(deadlines.length).toBe(0);
  });
});

describe("Seed Data Generator", () => {
  it("generates comprehensive seed data", () => {
    const seed = generateSeedData("test-user");
    expect(seed.sleepLogs.length).toBe(31);
    expect(seed.moods.length).toBe(31);
    expect(seed.habits.length).toBe(3);
    expect(seed.focusSessions.length).toBeGreaterThan(0);
    expect(seed.goals.length).toBe(2);
    expect(seed.expenses.length).toBe(16);
    expect(seed.tasks.length).toBe(5);
    expect(seed.aiMemory.length).toBe(4);
    expect(seed.recommendationsFeedback.length).toBe(5);
    expect(seed.monthlySnapshots.length).toBe(3);
  });
});

describe("Outcome Metrics Evaluator", () => {
  it("updates targetMetricAfter for accepted feedback with matching habit", () => {
    const today = new Date();
    const daysAgo10 = new Date(today); daysAgo10.setDate(today.getDate() - 10);

    const userData = {
      habits: [{
        id: "h1",
        name: "Read",
        logs: [
          new Date(today.getTime() - 1 * 86400000).toISOString().split("T")[0],
          new Date(today.getTime() - 2 * 86400000).toISOString().split("T")[0],
          new Date(today.getTime() - 5 * 86400000).toISOString().split("T")[0]
        ],
        streak: 3
      }],
      recommendationsFeedback: [
        { habitId: "h1", status: "accepted", timestamp: daysAgo10.toISOString(), baselineRateBefore: 50 }
      ]
    };

    evaluateOutcomeMetrics(userData);
    expect(userData.recommendationsFeedback[0].targetMetricAfter).toBeDefined();
    expect(userData.recommendationsFeedback[0].targetMetricAfter).toBeGreaterThanOrEqual(50);
  });

  it("skips non-accepted feedback", () => {
    const userData = {
      habits: [{ id: "h1", name: "Read", logs: [], streak: 0 }],
      recommendationsFeedback: [
        { habitId: "h1", status: "ignored", timestamp: new Date().toISOString(), baselineRateBefore: 50 }
      ]
    };

    evaluateOutcomeMetrics(userData);
    // targetMetricAfter should not be set
    expect(userData.recommendationsFeedback[0].targetMetricAfter).toBeUndefined();
  });
});
