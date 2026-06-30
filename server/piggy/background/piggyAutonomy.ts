import { observeUserData } from "../cognition/piggyObservation.js";
import { runBackgroundAutomations } from "./piggyAutomation.js";
import { updateActiveMissions } from "../planning/piggyMissionManager.js";
import { transitionAgentState } from "./piggyAgentState.js";
import { evaluateObservationsAndAct } from "../cognition/piggyDecisionLoop.js";

/**
 * Triggers a complete autonomous agent cycle:
 * Observe -> Think -> Reason -> Plan -> Execute -> Verify -> Reflect -> Learn -> Sleep.
 */
export async function runAutonomousAgentLoop(userData: any): Promise<any> {
  console.log("[AUTONOMY] Triggering continuous agent execution loop...");

  // 1. Observe state
  transitionAgentState(userData, "Observing");
  const observation = observeUserData(userData);

  // 2. Think / Reason states
  transitionAgentState(userData, "Thinking");
  await evaluateObservationsAndAct(userData, observation);

  // 3. Planning state
  transitionAgentState(userData, "Planning");

  // 4. Executing database adjustments
  transitionAgentState(userData, "Executing");
  await updateActiveMissions(userData);
  await runBackgroundAutomations(userData);

  // 5. Reflecting / Learning states
  transitionAgentState(userData, "Reflecting");
  transitionAgentState(userData, "Learning");

  // 6. Return back to Idle/Sleep
  transitionAgentState(userData, "Idle");

  console.log("[AUTONOMY] Autonomous loop execution finalized.");
  return observation;
}
