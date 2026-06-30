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

export type ExecutionState =
  | 'Pending'
  | 'Planning'
  | 'Running'
  | 'Waiting'
  | 'Retrying'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

export interface ActionStep {
  id: string;
  toolId: string;
  action: string;
  args: any;
  dependencies: string[]; // step IDs
  executionOrder: number;
  state: ExecutionState;
  expectedResult: string;
  actualResult?: any;
  difference?: string | null;
  qualityScore?: number;
  retryCount: number;
}

export interface WorkflowInstance {
  id: string;
  goal: string;
  steps: ActionStep[];
  state: ExecutionState;
  retryCount: number;
  startTime: string;
  endTime?: string;
  confidence: number;
}
