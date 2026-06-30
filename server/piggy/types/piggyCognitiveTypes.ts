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
