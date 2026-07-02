import cron from "node-cron";
import { dbService } from "../db/index.js";
import { logger } from "../logger.js";

/**
 * Initializes and schedules background cron jobs.
 */
export function startJobs() {
  logger.info("Initializing scheduled background jobs...");

  // Daily habit conformance checklist nudges running at 9 PM (21:00) every day
  cron.schedule("0 21 * * *", async () => {
    logger.info("[LifeOS Cron] Running daily habit conformance checklist at 21:00...");
    const db = dbService.getDatabaseState();
    const todayStr = new Date().toISOString().split("T")[0];
    let changes = false;

    Object.keys(db.userData || {}).forEach((userId) => {
      const userData = dbService.getUserData(userId);
      if (userData && userData.habits) {
        userData.habits.forEach((habit: any) => {
          if (!habit.logs.includes(todayStr)) {
            const notification = {
              id: `nudge-${Date.now()}-${habit.id}`,
              title: "⚠️ Streak Risk Warning",
              message: `Sir, daily review time is approaching. Your habit '${habit.name}' is not yet completed today. Maintain your streak!`,
              timestamp: new Date().toISOString(),
              type: "warning" as const,
              read: false
            };
            const alreadyNudged = userData.notifications.some((n: any) => n.id.includes(habit.id) && n.timestamp.startsWith(todayStr));
            if (!alreadyNudged) {
              userData.notifications.unshift(notification);
              db.userData[userId] = userData;
              changes = true;
            }
          }
        });
      }
    });

    if (changes) {
      await dbService.saveDatabaseState(db);
      logger.info("[LifeOS Cron] Daily review streak risk warnings deployed.");
    } else {
      logger.info("[LifeOS Cron] Daily checklist run completed: no actions required.");
    }
  });
}
