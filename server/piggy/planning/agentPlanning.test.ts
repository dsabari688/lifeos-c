// server/piggy/planning/agentPlanning.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runPlanningEngine, updateLongTermGoals, updateActiveMissions, autoTrackGoalProgress, optimizePlan } from './agentPlanning.js';
import { queryGroq } from '../core/piggyClient.js';

// Correct mock (adjust path if needed)
vi.mock('../core/piggyClient.js', () => ({
  queryGroq: vi.fn().mockImplementation((messages: any) => {
    const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
    const userMsg = messages.find((m: any) => m.role === "user")?.content || "";

    if (systemMsg.includes("Goal Breakdown Assistant")) {
      return JSON.stringify({
        subtasks: [
          { title: "Milestone 1" },
          { title: "Milestone 2" }
        ]
      });
    }

    if (systemMsg.includes("Semantic Goal Tracker")) {
      return JSON.stringify({
        completedSubtaskIds: ["st-mock-2"]
      });
    }

    if (systemMsg.includes("Plan Optimizer")) {
      return JSON.stringify({
        goal: "Optimized plan",
        steps: [
          { id: "step-1", action: "create", state: "Pending", priority: "Medium" }
        ],
        dependencies: [],
        resources: [],
        estimatedTimeMinutes: 60,
        priority: "Medium"
      });
    }

    if (systemMsg.includes("Planning Engine")) {
      if (userMsg.includes("hello") || userMsg.includes("no plan")) {
        return JSON.stringify({ hasPlan: false });
      }
      if (userMsg.includes("too many heavy tasks")) {
        return JSON.stringify({
          hasPlan: true,
          plan: {
            goal: "Too many heavy tasks",
            steps: [
              { id: "step-1", action: "create", state: "Pending", priority: "High" },
              { id: "step-2", action: "create", state: "Pending", priority: "Critical" },
              { id: "step-3", action: "create", state: "Pending", priority: "High" },
              { id: "step-4", action: "create", state: "Pending", priority: "Critical" },
              { id: "step-5", action: "create", state: "Pending", priority: "High" },
              { id: "step-6", action: "create", state: "Pending", priority: "Low" }
            ],
            estimatedTimeMinutes: 120,
            priority: "High"
          }
        });
      }
      return JSON.stringify({
        hasPlan: true,
        plan: {
          goal: "Plan my schedule to learn TypeScript modules today",
          steps: [{ id: "step-1", action: "create", state: "Pending" }],
          estimatedTimeMinutes: 120,
          priority: "High"
        }
      });
    }
    return JSON.stringify({ error: "Unknown request" });
  })
}));

describe("Planning Engine", () => {
  it("returns fallback when no plan possible", async () => {
    const result = await runPlanningEngine("hello, no plan needed", "User is stressed");
    expect(result).toBeNull();
  });

  it("returns valid plan when goal is feasible", async () => {
    const result = await runPlanningEngine("Plan my schedule to learn TypeScript modules today", "User is focused");
    expect(result).not.toBeNull();
    expect(result?.goal).toContain("TypeScript");
  });

  it("limits plan to maximum 4 heavy tasks and keeps light tasks", async () => {
    const result = await runPlanningEngine("too many heavy tasks", "User has 5 pending tasks");
    expect(result).not.toBeNull();
    if (result) {
      expect(result.steps.length).toBe(5);
      const heavySteps = result.steps.filter(s => s.priority === "High" || s.priority === "Critical");
      expect(heavySteps.length).toBe(4);
      expect(result.steps.find(s => s.id === "step-5")).toBeUndefined(); // skipped because it was the 5th heavy task
      expect(result.steps.find(s => s.id === "step-6")).toBeDefined(); // kept because it is Low priority
    }
  });

  it("optimizes an execution plan", async () => {
    const originalPlan = {
      goal: "Test plan",
      steps: [],
      dependencies: [],
      resources: [],
      estimatedTimeMinutes: 60,
      priority: "Medium" as const
    };
    const result = await optimizePlan(originalPlan, "context");
    expect(result).not.toBeNull();
    expect(result.goal).toBe("Optimized plan");
  });

  it("handles errors in planning engine and optimizer gracefully", async () => {
    const mockQueryGroq = vi.mocked(queryGroq);

    // Test planning engine error
    mockQueryGroq.mockRejectedValueOnce(new Error("Planning Groq API error"));
    const planResult = await runPlanningEngine("Plan", "context");
    expect(planResult).toBeNull();

    // Test optimizer error
    mockQueryGroq.mockRejectedValueOnce(new Error("Optimizer Groq API error"));
    const originalPlan = {
      goal: "Test plan",
      steps: [],
      dependencies: [],
      resources: [],
      estimatedTimeMinutes: 60,
      priority: "Medium" as const
    };
    const optimizeResult = await optimizePlan(originalPlan, "context");
    expect(optimizeResult).toEqual(originalPlan);
  });
});

describe("Goals and Mission Updates", () => {
  it("initializes project roadmaps and maps milestones when strategic goals are updated", () => {
    const userData = {
      goals: [
        { id: "goal-1", title: "Write Dissertation", status: "active" },
        { id: "goal-2", title: "Build Startup", status: "completed" }
      ],
      projects: [] as any[]
    };

    updateLongTermGoals(userData);
    expect(userData.projects.length).toBe(2);

    const p1 = userData.projects.find(p => p.goalId === "goal-1");
    expect(p1.status).toBe("active");

    const p2 = userData.projects.find(p => p.goalId === "goal-2");
    expect(p2.status).toBe("completed");
    expect(p2.milestones.every((m: any) => m.completed)).toBe(true);
  });

  it("tracks active missions and calculates progress, predictions, and budget-related risk scores", async () => {
    const userData = {
      missions: [
        { id: "mission-react", title: "Learn React & TS Architecture", progress: 0, dependencies: [], nextActions: [], riskScore: 0, completionPrediction: "" },
        { id: "mission-budget", title: "Save Money & Capital Audit", progress: 0, dependencies: [], nextActions: [], riskScore: 0, completionPrediction: "" }
      ],
      tasks: [
        { title: "Learn React widgets", status: "completed" } // 1 completed out of 1 matching task -> 100% progress
      ],
      expenses: [
        { amount: 500, category: "general" },
        { amount: 600, category: "rent" }
      ],
      profile: { budgetLimit: 1000 }
    };

    await updateActiveMissions(userData);

    const m1 = userData.missions.find(m => m.id === "mission-react");
    expect(m1.progress).toBe(100);
    expect(m1.completionPrediction).toBe(new Date().toISOString().split("T")[0]); // checks progress >= 100 branch
    
    const m2 = userData.missions.find(m => m.id === "mission-budget");
    // total spent: 1100, budget limit: 1000. 1100 > 1000 * 0.8, so riskScore should be elevated
    expect(m2.riskScore).toBeGreaterThan(15);
  });
});

describe("Goal Tracker Integration", () => {
  it("automatically tracks goal progress via task matching and semantic evaluation", async () => {
    const userData = {
      goals: [
        {
          id: "goal-1",
          title: "Launch LifeOS App",
          status: "active",
          subtasks: [] as any[],
          progress: 0
        }
      ],
      tasks: [
        { title: "Milestone 1", status: "completed" }
      ]
    };

    // 1. Initial breakdown via queryGroq breakdown Assistant
    await autoTrackGoalProgress("Init goals", userData);
    const g = userData.goals[0];
    expect(g.subtasks.length).toBe(2);
    // subtasks created by mock: "Milestone 1" (matches completed task title) and "Milestone 2"
    expect(g.subtasks[0].title).toBe("Milestone 1");
    // "Milestone 1" matches "Milestone 1" completed task title -> marked completed
    expect(g.subtasks[0].status).toBe("completed");
    expect(g.subtasks[1].status).toBe("pending");
    expect(g.progress).toBe(50);

    // 2. Semantic evaluation: update subtask IDs for mock semantic completed ids checking
    g.subtasks[1].id = "st-mock-2";
    await autoTrackGoalProgress("I have done Milestone 2", userData);
    expect(g.subtasks[1].status).toBe("completed");
    expect(g.progress).toBe(100);
    expect(g.status).toBe("completed");
  });

  it("handles errors in goal tracker breakdown and semantic checks gracefully", async () => {
    const mockQueryGroq = vi.mocked(queryGroq);
    const userData = {
      goals: [
        {
          id: "goal-1",
          title: "Launch LifeOS App",
          status: "active",
          subtasks: [] as any[],
          progress: 0
        }
      ]
    };

    // 1. Test goal breakdown parse error
    mockQueryGroq.mockResolvedValueOnce("{malformed_json");
    await autoTrackGoalProgress("Init goals", userData);
    expect(userData.goals[0].subtasks.length).toBe(0);

    // 2. Test semantic check parse error
    userData.goals[0].subtasks = [{ id: "st-1", title: "Milestone", status: "pending" }];
    mockQueryGroq.mockResolvedValueOnce("{malformed_json");
    await autoTrackGoalProgress("I did it", userData);
    expect(userData.goals[0].subtasks[0].status).toBe("pending");
  });
});