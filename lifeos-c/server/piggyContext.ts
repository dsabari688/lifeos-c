// Piggy AI v4.0 — User Context Module
import { 
  synthesizeAIDashboard, 
  detectUpcomingDeadlines, 
  calculateHabitPatterns, 
  calculateHabitRisk 
} from "./piggyIntelligence.js";

export interface PiggyUserContext {
  profile: {
    name: string;
    email: string;
    aiPersonality: string;
    budgetLimit: number;
  };
  metrics: {
    healthScore: number;
    consistency: number;
    momentum: number;
    goalProgress: number;
    energy: number;
    burnoutRisk: number;
    peakWindow: string;
    bestStudyDuration: number;
  };
  upcomingDeadlines: any[];
  activeGoals: any[];
  tasksList: string[];
  habitsList: string[];
  financialBudgets: string[];
  recentSleepLogs: string[];
  recentMoodLogs: string[];
  currentView: string;
  highlightedEntity: string;
}

/**
 * Merges all current user telemetry, database entities, and frontend active view states 
 * into a single unified context structure.
 */
export function collectUserContext(userData: any, activeContext: any = {}): PiggyUserContext {
  const cockpit = synthesizeAIDashboard(userData);
  const deadlines = detectUpcomingDeadlines(userData);
  const activeGoals = (userData.goals || []).filter((g: any) => g.status === "active");

  // Format task lists
  const tasksList = (userData.tasks || []).map((t: any) => 
    `[Category: ${t.category}, Title: ${t.title}, Date: ${t.date}, Status: ${t.status}, Rescheduled Count: ${t.rescheduledCount || 0}]`
  );

  // Format habit patterns
  const habitsList = (userData.habits || []).map((h: any) => {
    const patterns = calculateHabitPatterns(h, userData.sleepLogs || [], userData.moods || []);
    const risk = calculateHabitRisk(h, userData.sleepLogs || [], userData.moods || [], userData);
    return `[Habit: ${h.name}, Streak: ${h.streak} days, 30D Completion: ${patterns.overallCompletion}%, Risk: ${risk.riskPercent}%, Reasons: ${risk.reasons.join(", ")}]`;
  });

  // Budget calculations
  const spendByCategory: Record<string, number> = {};
  (userData.expenses || []).forEach((e: any) => {
    spendByCategory[e.category] = (spendByCategory[e.category] || 0) + e.amount;
  });
  const financialBudgets = (userData.budgets || []).map((b: any) => {
    const currentSpend = spendByCategory[b.category] || 0;
    return `[Category: ${b.category}, Limit: $${b.limit}, CurrentSpend: $${currentSpend.toFixed(2)}]`;
  });

  // Recent sleep
  const recentSleepLogs = (userData.sleepLogs || []).slice(-3).map((s: any) => 
    `[Date: ${s.date}, Sleep Time: ${s.sleepTime}, Wake Time: ${s.wakeTime}, Duration: ${s.duration}h]`
  );

  // Recent mood
  const recentMoodLogs = (userData.moods || []).slice(-3).map((m: any) => 
    `[Date: ${m.createdAt.slice(0, 10)}, Mood: ${m.mood}, Note: ${m.note || "none"}]`
  );

  // Highlighted entity parsing
  let highlightedEntity = "None";
  if (activeContext?.selectedTaskName) {
    highlightedEntity = `Task '${activeContext.selectedTaskName}' (ID: ${activeContext.selectedTaskId})`;
  } else if (activeContext?.selectedHabitName) {
    highlightedEntity = `Habit '${activeContext.selectedHabitName}' (ID: ${activeContext.selectedHabitId})`;
  }

  return {
    profile: {
      name: userData.profile?.name || "User",
      email: userData.profile?.email || "",
      aiPersonality: userData.profile?.aiPersonality || "Logical",
      budgetLimit: userData.profile?.budgetLimit || 1000
    },
    metrics: {
      healthScore: cockpit.healthScore || 0,
      consistency: cockpit.consistency || 0,
      momentum: cockpit.momentum || 0,
      goalProgress: cockpit.goalProgress || 0,
      energy: cockpit.energy || 0,
      burnoutRisk: cockpit.burnoutRisk || 0,
      peakWindow: cockpit.energyData?.peakWindow || "8:00 - 11:00",
      bestStudyDuration: cockpit.energyData?.bestStudyDuration || 25
    },
    upcomingDeadlines: deadlines,
    activeGoals,
    tasksList,
    habitsList,
    financialBudgets,
    recentSleepLogs,
    recentMoodLogs,
    currentView: activeContext?.currentView || "dashboard",
    highlightedEntity
  };
}
