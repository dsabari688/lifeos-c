import { runPredictiveAnalytics } from "./piggyPrediction.js";
import { discoverBehavioralPatterns } from "./piggyPatternDiscovery.js";

export interface ObservationSummary {
  burnoutProbability: number;
  budgetOverflowProbability: number;
  deadlineFailureProbability: number;
  pendingTaskCount: number;
  activeGoalCount: number;
  warningsCount: number;
  observations: string[];
}

/**
 * Scans the database state to compile alerts, risks, opportunities, and pending tasks.
 */
export function observeUserData(userData: any): ObservationSummary {
  const predictions = runPredictiveAnalytics(userData);
  const patterns = discoverBehavioralPatterns(userData);
  const tasks = userData.tasks || [];
  const goals = userData.goals || [];

  const pendingTaskCount = tasks.filter((t: any) => t.status === "pending").length;
  const activeGoalCount = goals.filter((g: any) => g.status === "active").length;

  const observations: string[] = [];

  if (predictions.burnoutProbability > 65) {
    observations.push(`Burnout warning: telemetry indicates elevated risk levels of ${predictions.burnoutProbability}%.`);
  }
  if (predictions.budgetOverflowProbability > 75) {
    observations.push(`Budget overrun risk: projected monthly spend is pacing near limits (Probability: ${predictions.budgetOverflowProbability}%).`);
  }
  if (predictions.deadlineFailureProbability > 50) {
    observations.push(`Task congestion warning: upcoming task deadlines are congested (Congestion index: ${predictions.deadlineFailureProbability}%).`);
  }

  patterns.forEach(pat => {
    if (pat.significance === 'high') {
      observations.push(`Observation: "${pat.description}" detected based on historical compliance. Details: ${pat.evidence}`);
    }
  });

  return {
    burnoutProbability: predictions.burnoutProbability,
    budgetOverflowProbability: predictions.budgetOverflowProbability,
    deadlineFailureProbability: predictions.deadlineFailureProbability,
    pendingTaskCount,
    activeGoalCount,
    warningsCount: observations.length,
    observations
  };
}
