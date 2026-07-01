import { describe, it, expect } from 'vitest';
import {
  initializeTaskState,
  getTaskState,
  updateTaskState,
  transitionWorkflowState
} from './agentTypes.js';

describe("Task Execution Memory", () => {
  it("initializes task state with defaults and attaches to userData", () => {
    const userData: any = {};
    const state = initializeTaskState(userData, "Build dashboard", ["step-1", "step-2"]);

    expect(state.currentTask).toBe("Build dashboard");
    expect(state.remainingSteps).toEqual(["step-1", "step-2"]);
    expect(state.completedSteps).toEqual([]);
    expect(state.blockedSteps).toEqual([]);
    expect(state.failedSteps).toEqual([]);
    expect(state.retryCount).toBe(0);
    expect(userData.taskState).toBe(state);
  });

  it("initializes task state with no steps", () => {
    const userData: any = {};
    const state = initializeTaskState(userData, "Quick task");
    expect(state.remainingSteps).toEqual([]);
    expect(state.currentTask).toBe("Quick task");
  });

  it("getTaskState returns existing state if present", () => {
    const userData: any = {
      taskState: {
        currentTask: "Existing task",
        completedSteps: ["done-1"],
        remainingSteps: ["todo-1"],
        blockedSteps: [],
        failedSteps: [],
        retryCount: 2
      }
    };

    const state = getTaskState(userData);
    expect(state.currentTask).toBe("Existing task");
    expect(state.retryCount).toBe(2);
  });

  it("getTaskState creates default idle state when none exists", () => {
    const userData: any = {};
    const state = getTaskState(userData);

    expect(state.currentTask).toBe("");
    expect(state.completedSteps).toEqual([]);
    expect(state.remainingSteps).toEqual([]);
    expect(userData.taskState).toBe(state);
  });

  it("updateTaskState merges partial updates", () => {
    const userData: any = {};
    initializeTaskState(userData, "Original", ["s1", "s2"]);

    const updated = updateTaskState(userData, {
      completedSteps: ["s1"],
      remainingSteps: ["s2"],
      retryCount: 1
    });

    expect(updated.currentTask).toBe("Original");
    expect(updated.completedSteps).toEqual(["s1"]);
    expect(updated.remainingSteps).toEqual(["s2"]);
    expect(updated.retryCount).toBe(1);
  });

  it("updateTaskState creates state first if none exists", () => {
    const userData: any = {};
    const updated = updateTaskState(userData, { currentTask: "New task" });

    expect(updated.currentTask).toBe("New task");
    expect(updated.completedSteps).toEqual([]);
  });
});

describe("Workflow State Transitions", () => {
  it("transitions state and records history", () => {
    const userData: any = {};
    transitionWorkflowState(userData, "Planning");

    expect(userData.agentWorkflowState).toBe("Planning");
    expect(userData.agentWorkflowHistory).toHaveLength(1);
    expect(userData.agentWorkflowHistory[0].state).toBe("Planning");
    expect(userData.agentWorkflowHistory[0].timestamp).toBeDefined();
  });

  it("appends multiple transitions to history", () => {
    const userData: any = {};
    transitionWorkflowState(userData, "Planning");
    transitionWorkflowState(userData, "Executing");
    transitionWorkflowState(userData, "Verifying");

    expect(userData.agentWorkflowState).toBe("Verifying");
    expect(userData.agentWorkflowHistory).toHaveLength(3);
  });

  it("trims history to 50 entries when exceeding limit", () => {
    const userData: any = { agentWorkflowHistory: [] };

    // Fill with 50 entries
    for (let i = 0; i < 50; i++) {
      userData.agentWorkflowHistory.push({ state: "Idle", timestamp: new Date().toISOString() });
    }

    // The 51st transition should trigger trimming
    transitionWorkflowState(userData, "Completed");
    expect(userData.agentWorkflowHistory.length).toBe(50);
    expect(userData.agentWorkflowHistory[49].state).toBe("Completed");
  });

  it("handles null userData gracefully", () => {
    // Should not throw
    expect(() => transitionWorkflowState(null, "Idle")).not.toThrow();
  });
});
