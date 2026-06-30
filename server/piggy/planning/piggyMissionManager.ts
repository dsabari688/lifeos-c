import { queryGroq } from "../core/piggyClient.js";

export interface Mission {
  id: string;
  title: string;
  objective: string;
  progress: number;            // 0 to 100
  dependencies: string[];      // mission/task IDs
  nextActions: string[];       // immediate actions
  riskScore: number;           // 0 to 100
  completionPrediction: string;// target completion date
}

/**
 * Proactively initializes or updates the status of active long-running missions.
 */
export async function updateActiveMissions(userData: any): Promise<void> {
  if (!userData.missions) {
    // Seed default missions representing long-term targets
    userData.missions = [
      {
        id: "mission-react",
        title: "Learn React & TS Architecture",
        objective: "Build front-end user cockpit screens using modular design systems.",
        progress: 35,
        dependencies: [],
        nextActions: ["Complete dashboard widgets task", "Refactor settings view"],
        riskScore: 20,
        completionPrediction: "2026-07-20"
      },
      {
        id: "mission-budget",
        title: "Save Money & Capital Audit",
        objective: "Manage expenses, audit impulsive spending patterns, and stay within limits.",
        progress: 60,
        dependencies: [],
        nextActions: ["Clear subscription expenses", "Review budget categories limits"],
        riskScore: 45,
        completionPrediction: "2026-07-15"
      }
    ];
  }

  const tasks = userData.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.status === "completed");

  for (const mission of userData.missions) {
    // Calculate progress based on tasks supporting this mission title keywords
    const keywords = mission.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
    const relatedTasks = tasks.filter((t: any) => 
      keywords.some((k: string) => t.title.toLowerCase().includes(k))
    );

    if (relatedTasks.length > 0) {
      const completedRelated = relatedTasks.filter((t: any) => t.status === "completed").length;
      mission.progress = Math.round((completedRelated / relatedTasks.length) * 100);
    }

    // Dynamic Risk Score calculation based on user burnout and budget warnings
    let riskScore = 15;
    const isBudgetMission = mission.title.toLowerCase().includes("save") || mission.title.toLowerCase().includes("budget");
    if (isBudgetMission) {
      const expenses = userData.expenses || [];
      const totalSpent = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
      const budgetLimit = userData.profile?.budgetLimit || 1200;
      if (totalSpent > budgetLimit * 0.8) {
        riskScore += 50;
      }
    }

    // Calculate prediction completed date
    if (mission.progress < 100 && relatedTasks.length > 0) {
      const daysElapsed = 15; // mock
      const rate = mission.progress / Math.max(1, daysElapsed);
      const remainingDays = Math.ceil((100 - mission.progress) / Math.max(0.01, rate));
      const estCompletion = new Date();
      estCompletion.setDate(estCompletion.getDate() + remainingDays);
      mission.completionPrediction = estCompletion.toISOString().split("T")[0];
    } else if (mission.progress >= 100) {
      mission.completionPrediction = new Date().toISOString().split("T")[0];
    }

    mission.riskScore = Math.max(5, Math.min(95, riskScore));
  }
}
