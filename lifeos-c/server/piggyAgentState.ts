export type AgentState =
  | 'Idle'
  | 'Observing'
  | 'Thinking'
  | 'Planning'
  | 'Executing'
  | 'Waiting'
  | 'Reflecting'
  | 'Learning';

/**
 * Transition the agent's main state loop and log the change in the database.
 */
export function transitionAgentState(userData: any, state: AgentState): void {
  if (!userData) return;
  userData.agentState = state;
  console.log(`[AGENT STATE] Transitioned to: ${state}`);
}
