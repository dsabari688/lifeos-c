import { runAutonomousAgentLoop } from "./piggyAutonomy.js";

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
