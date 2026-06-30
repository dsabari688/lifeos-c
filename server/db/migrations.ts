import { DatabaseState } from "./schema.js";
import { generateSeedData } from "../piggy/core/piggyIntelligence.js";

/**
 * Runs retroactive data migrations for a user, filling in missing metrics,
 * logs, or focus sessions from the AI seed data.
 */
export function runRetroactiveMigration(db: DatabaseState, userId: string): void {
  const userData = db.userData[userId];
  if (!userData) return;

  const seed = generateSeedData(userId);

  if (!userData.focusSessions) {
    userData.focusSessions = seed.focusSessions || [];
  }
  if (!userData.sleepLogs || userData.sleepLogs.length === 0) {
    userData.sleepLogs = seed.sleepLogs || [];
  }
  if (!userData.moods || userData.moods.length === 0) {
    userData.moods = seed.moods || [];
  }
  if (!userData.habits || userData.habits.length === 0) {
    userData.habits = seed.habits || [];
  }
  if (!userData.goals || userData.goals.length === 0) {
    userData.goals = seed.goals || [];
  }
  if (!userData.expenses || userData.expenses.length === 0) {
    userData.expenses = seed.expenses || [];
  }
  if (!userData.tasks || userData.tasks.length === 0) {
    userData.tasks = seed.tasks || [];
  }
  if (!userData.aiMemory || userData.aiMemory.length === 0) {
    userData.aiMemory = seed.aiMemory || [];
  }
  if (!userData.recommendationsFeedback || userData.recommendationsFeedback.length === 0) {
    userData.recommendationsFeedback = seed.recommendationsFeedback || [];
  }
  if (!userData.monthlySnapshots || userData.monthlySnapshots.length === 0) {
    userData.monthlySnapshots = seed.monthlySnapshots || [];
  }
  if (!userData.reflections) {
    userData.reflections = [];
  }
  if (!userData.userPatterns) {
    userData.userPatterns = {
      taskCompletionByHour: {},
      mostProductiveDay: "Tuesday",
      mostSkippedHabit: "Exercise",
      avgTasksCompletedPerDay: 4.2,
      streakBreakDays: ["Sunday"],
      spendingByCategory: {},
      focusSessionAvgMinutes: 47,
      goalProgressRate: 0.65
    };
  }
}
