import { synthesizeAIDashboard } from "./piggyIntelligence.js";

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
