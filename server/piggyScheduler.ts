import cron from "node-cron";
import { piggyAgentInstance } from "./piggyAgent.js";

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
