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
