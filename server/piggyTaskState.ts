export interface TaskExecutionMemory {
  currentTask: string;
  completedSteps: string[];
  remainingSteps: string[];
  blockedSteps: string[];
  failedSteps: string[];
  retryCount: number;
}

/**
 * Initializes or resets the task execution memory.
 */
export function initializeTaskState(userData: any, currentTask: string, steps: string[] = []): TaskExecutionMemory {
  const state: TaskExecutionMemory = {
    currentTask,
    completedSteps: [],
    remainingSteps: steps,
    blockedSteps: [],
    failedSteps: [],
    retryCount: 0
  };
  userData.taskState = state;
  return state;
}

/**
 * Gets the current task execution memory or creates a default idle state.
 */
export function getTaskState(userData: any): TaskExecutionMemory {
  if (!userData.taskState) {
    userData.taskState = {
      currentTask: "",
      completedSteps: [],
      remainingSteps: [],
      blockedSteps: [],
      failedSteps: [],
      retryCount: 0
    };
  }
  return userData.taskState;
}

/**
 * Updates the task execution memory with new values.
 */
export function updateTaskState(userData: any, updates: Partial<TaskExecutionMemory>): TaskExecutionMemory {
  const state = getTaskState(userData);
  Object.assign(state, updates);
  userData.taskState = state;
  return state;
}
