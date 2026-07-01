

// --- Consolidated from piggyCognitiveTypes.ts ---
export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'active' | 'completed' | 'on_hold';
  targetDate?: string;
  subtasks: { id: string; title: string; status: 'pending' | 'completed' }[];
}

export type ExecutionState =
  | 'Pending'
  | 'Planning'
  | 'Running'
  | 'Waiting'
  | 'Retrying'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

export interface Action {
  id: string;
  toolId: string;
  action: string;
  args: Record<string, string | number | boolean | undefined>;
  dependencies: string[];
  executionOrder: number;
  state: ExecutionState;
  expectedResult: string;
  actualResult?: any;
  difference?: string | null;
  qualityScore?: number;
  retryCount: number;
  priority?: string;
}

export interface ToolResult {
  success: boolean;
  actualResult: string;
  difference: string | null;
  qualityScore: number;
  durationMs: number;
  retries: number;
}

export interface ExecutionPlan {
  goal: string;
  steps: Action[];
  dependencies: string[];
  resources: string[];
  estimatedTimeMinutes: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  fallbackPlan?: string;
  rollbackPlan?: string;
}

export interface ReasoningResult {
  goal: string;
  facts: string[];
  unknowns: string[];
  assumptions: string[];
  risks: string[];
  constraints: string[];
  possibleSolutions: string[];
  confidence: number; // 0.0 to 1.0
  chosenSolution: string;
  reasoningTrace: string[];
}

export interface Recommendation {
  id: string;
  type: 'task' | 'habit' | 'schedule' | 'budget' | 'goal' | 'health' | 'learning';
  recommendation: string;
  reason: string;
  benefit: string;
  risk: string;
  confidence: number; // 0 to 100
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  smartResponse: string;
}

export interface VerificationResult {
  valid: boolean;
  verificationReport: string;
  confidenceScore: number; // 0 to 100
  verificationErrors: string[];
  repairSuggestions: string[];
}

export interface Reflection {
  lessonsLearned: string[];
  possibleImprovements: string[];
  futureOptimizations: string[];
}

export interface Prediction {
  predictions: string[];
  confidence: number; // 0 to 100
  reasons: string[];
  recommendedActions: string[];
}

export interface TaskNode {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  dependencies: string[];
}

export interface TaskGraph {
  nodes: TaskNode[];
  edges: { source: string; target: string; relationship: string }[];
}

export interface MemoryNode {
  id: string;
  fact: string;
  category: string;
  timestamp: string;
}

export interface ContextNode {
  key: string;
  value: string;
  timestamp: string;
}

export interface WorkflowInstance {
  id: string;
  goal: string;
  steps: Action[];
  state: ExecutionState;
  retryCount: number;
  startTime: string;
  endTime?: string;
  confidence: number;
}

// --- Consolidated from piggyTaskState.ts ---
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

// --- Consolidated from piggyToolTypes.ts ---
export interface ToolInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  requiredInputs: ToolInput[];
  permissions: string[];
  timeout: number; // in milliseconds
  retryCount: number;
  supportedActions: string[];
}
// --- Consolidated from piggyWorkflow.ts ---
export type AgentWorkflowState =
  | 'Idle'
  | 'Thinking'
  | 'Planning'
  | 'Executing'
  | 'Verifying'
  | 'Retrying'
  | 'Completed'
  | 'Reflecting'
  | 'Memory Update';

export interface WorkflowHistoryEntry {
  state: AgentWorkflowState;
  timestamp: string;
}

/**
 * Transitions the agent's workflow state and records the entry in history.
 */
export function transitionWorkflowState(userData: any, newState: AgentWorkflowState): void {
  if (!userData) return;

  userData.agentWorkflowState = newState;

  if (!userData.agentWorkflowHistory) {
    userData.agentWorkflowHistory = [];
  }

  userData.agentWorkflowHistory.push({
    state: newState,
    timestamp: new Date().toISOString()
  });

  // Limit history size to prevent DB bloat (keep last 50 transitions)
  if (userData.agentWorkflowHistory.length > 50) {
    userData.agentWorkflowHistory = userData.agentWorkflowHistory.slice(-50);
  }

  console.log(`[WORKFLOW STATE] Transitioned to: ${newState}`);
}