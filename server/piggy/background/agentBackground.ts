import { evaluateObservationsAndAct, observeUserData } from "../cognition/agentCognition.js";
import { generateEveningReview, generateMorningBriefing, generateWeeklyReport } from "../personality/agentPersonality.js";
import { synthesizeAIDashboard } from "../core/piggyIntelligence.js";
import { updateActiveMissions } from "../planning/agentPlanning.js";
import cron from "node-cron";

// --- Consolidated from piggyAgent.ts ---

/**
 * Piggy Agent main class orchestrator.
 * Encapsulates the agent's capabilities to run loop cycles, generate briefs, and review telemetry.
 */
export class PiggyAgent {
  /**
   * Triggers the Observe-Think-Reason-Plan-Execute autonomous loop.
   */
  public async executeCycle(userData: any): Promise<any> {
    return await runAutonomousAgentLoop(userData);
  }

  /**
   * Proactively triggers morning briefing text generation.
   */
  public async getMorningBrief(userData: any): Promise<string> {
    return await generateMorningBriefing(userData);
  }

  /**
   * Proactively triggers evening review summary text generation.
   */
  public async getEveningReview(userData: any): Promise<string> {
    return await generateEveningReview(userData);
  }

  /**
   * Proactively triggers weekly report text generation.
   */
  public async getWeeklyReport(userData: any): Promise<string> {
    return await generateWeeklyReport(userData);
  }
}

export const piggyAgentInstance = new PiggyAgent();

// --- Consolidated from piggyAgentState.ts ---
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

// --- Consolidated from piggyAutomation.ts ---

/**
 * Executes automated background audits (financial, habit health, goal health)
 * and logs reports in user database notifications.
 */
export async function runBackgroundAutomations(userData: any): Promise<void> {
  console.log("[AUTOMATION ENGINE] Executing background automation routines...");
  if (!userData.notifications) userData.notifications = [];

  const cockpit = synthesizeAIDashboard(userData);
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Goal & Habit Health Audit (Proactive warnings)
  if (cockpit.healthScore < 60) {
    const healthAudit = {
      id: `auto-ha-${Date.now()}`,
      type: "alert",
      title: "Routine Audit Warning",
      message: `Your overall productivity health score dropped to ${cockpit.healthScore}%. Buffer adjustments proposed.`,
      timestamp: new Date().toISOString(),
      unread: true
    };
    userData.notifications.push(healthAudit);
  }

  // 2. Financial Audit
  const expenses = userData.expenses || [];
  const budgetLimit = userData.profile?.budgetLimit || 1200;
  const totalSpent = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

  if (totalSpent > budgetLimit * 0.9) {
    const budgetAudit = {
      id: `auto-fa-${Date.now()}`,
      type: "warning",
      title: "Financial Audit Warning",
      message: `Critically high spending ($${totalSpent.toFixed(2)} out of $${budgetLimit}). Avoid spontaneous category purchases today.`,
      timestamp: new Date().toISOString(),
      unread: true
    };
    userData.notifications.push(budgetAudit);
  }

  // Maintain notifications list length bounded
  if (userData.notifications.length > 50) {
    userData.notifications = userData.notifications.slice(-50);
  }

  console.log("[AUTOMATION ENGINE] Background audit analysis finalized.");
}

// --- Consolidated from piggyAutonomy.ts ---

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

// --- Consolidated from piggyBackground.ts ---

/**
 * Initiates simulated background execution loops for all active database users.
 */
export function startBackgroundAgent(db: any, writeDBCallback: (data: any) => void): void {
  console.log("[BACKGROUND AGENT] Background execution thread starting up...");

  // Runs a background loop check every 10 minutes
  setInterval(async () => {
    console.log("[BACKGROUND AGENT] Commencing automated background analytics loop checks...");
    const userIds = Object.keys(db.userData || {});
    let dbUpdated = false;

    for (const userId of userIds) {
      try {
        const userData = db.userData[userId];
        if (userData) {
          await runAutonomousAgentLoop(userData);
          dbUpdated = true;
        }
      } catch (error) {
        console.error(`[BACKGROUND AGENT] Error executing autonomous cycle for user ${userId}:`, error);
      }
    }

    if (dbUpdated) {
      writeDBCallback(db);
    }
  }, 10 * 60 * 1000);
}

// --- Consolidated from piggyScheduler.ts ---

/**
 * Initializes cron schedulers to proactively append morning briefings,
 * evening reviews, and weekly reports.
 */
export function initializeScheduler(
  db: any,
  writeDBCallback: (data: any) => void
): void {
  console.log("[SCHEDULER] Setting up cron schedules for automated reports...");

  // Morning Briefing: Run every day at 7:00 AM
  cron.schedule("0 7 * * *", async () => {
    console.log("[SCHEDULER] Triggering morning briefing cron job...");
    const userIds = Object.keys(db.userData || {});
    let updated = false;

    for (const userId of userIds) {
      try {
        const userData = db.userData[userId];
        if (userData) {
          const brief = await piggyAgentInstance.getMorningBrief(userData);
          if (!userData.notifications) userData.notifications = [];
          userData.notifications.push({
            id: `brief-m-${Date.now()}`,
            type: "alert",
            title: "Your Morning Briefing",
            message: brief,
            timestamp: new Date().toISOString(),
            unread: true
          });
          updated = true;
        }
      } catch (error) {
        console.error("[SCHEDULER] Error compiling morning brief:", error);
      }
    }

    if (updated) {
      writeDBCallback(db);
    }
  });

  // Evening Review: Run every day at 9:00 PM
  cron.schedule("0 21 * * *", async () => {
    console.log("[SCHEDULER] Triggering evening review cron job...");
    const userIds = Object.keys(db.userData || {});
    let updated = false;

    for (const userId of userIds) {
      try {
        const userData = db.userData[userId];
        if (userData) {
          const review = await piggyAgentInstance.getEveningReview(userData);
          if (!userData.notifications) userData.notifications = [];
          userData.notifications.push({
            id: `brief-e-${Date.now()}`,
            type: "alert",
            title: "Your Evening Review",
            message: review,
            timestamp: new Date().toISOString(),
            unread: true
          });
          updated = true;
        }
      } catch (error) {
        console.error("[SCHEDULER] Error compiling evening review:", error);
      }
    }

    if (updated) {
      writeDBCallback(db);
    }
  });

  // Weekly Audit: Run every Sunday at 8:00 PM
  cron.schedule("0 20 * * 0", async () => {
    console.log("[SCHEDULER] Triggering weekly audit cron job...");
    const userIds = Object.keys(db.userData || {});
    let updated = false;

    for (const userId of userIds) {
      try {
        const userData = db.userData[userId];
        if (userData) {
          const report = await piggyAgentInstance.getWeeklyReport(userData);
          if (!userData.notifications) userData.notifications = [];
          userData.notifications.push({
            id: `brief-w-${Date.now()}`,
            type: "alert",
            title: "Your Weekly Report",
            message: report,
            timestamp: new Date().toISOString(),
            unread: true
          });
          updated = true;
        }
      } catch (error) {
        console.error("[SCHEDULER] Error compiling weekly report:", error);
      }
    }

    if (updated) {
      writeDBCallback(db);
    }
  });
}