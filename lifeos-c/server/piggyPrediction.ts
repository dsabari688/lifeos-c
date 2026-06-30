/**
 * Piggy AI Prediction Engine.
 * Implements predictive heuristics to forecast habit success, goal completions, burnout levels, and budget leaks.
 */

export interface GoalPrediction {
  goalId: string;
  title: string;
  predictedCompletionDate: string;
  probabilityOfSuccess: number;
}

export interface PredictiveMetrics {
  burnoutProbability: number;          // 0 to 100
  budgetOverflowProbability: number;   // 0 to 100
  predictedSleepQuality: 'poor' | 'fair' | 'good';
  predictedEnergyLevel: number;         // 0 to 100
  deadlineFailureProbability: number;   // 0 to 100
  goalPredictions: GoalPrediction[];
}

/**
 * Predicts user metrics and risks based on telemetry history.
 */
export function runPredictiveAnalytics(userData: any): PredictiveMetrics {
  const today = new Date();
  const sleepLogs = userData.sleepLogs || [];
  const moods = userData.moods || [];
  const expenses = userData.expenses || [];
  const budgetLimit = userData.profile?.budgetLimit || 1200;
  const tasks = userData.tasks || [];
  const goals = userData.goals || [];
  const focusSessions = userData.focusSessions || [];

  // 1. Burnout Probability
  const totalFocusMinutes = focusSessions.slice(-7).reduce((sum: number, s: any) => sum + s.durationMinutes, 0);
  const stressCount = moods.slice(-7).filter((m: any) => m.mood === "stressed" || m.mood === "😡").length;
  let burnoutProbability = Math.min(95, Math.round((totalFocusMinutes / 600) * 40 + (stressCount * 15)));
  burnoutProbability = Math.max(5, burnoutProbability);

  // 2. Budget Overflow Probability
  const totalSpent = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const daysInMonth = 30;
  const daysElapsed = Math.max(1, Math.min(30, new Date().getDate()));
  const dailySpendRate = totalSpent / daysElapsed;
  const projectedMonthlySpend = dailySpendRate * daysInMonth;
  let budgetOverflowProbability = 0;
  if (projectedMonthlySpend > budgetLimit) {
    budgetOverflowProbability = Math.min(98, Math.round(((projectedMonthlySpend - budgetLimit) / budgetLimit) * 100 + 50));
  } else {
    budgetOverflowProbability = Math.max(5, Math.round((totalSpent / budgetLimit) * 50));
  }

  // 3. Predicted Sleep Quality
  let predictedSleepQuality: 'poor' | 'fair' | 'good' = 'good';
  if (sleepLogs.length > 0) {
    const avgSleep = sleepLogs.reduce((sum: number, log: any) => sum + log.duration, 0) / sleepLogs.length;
    const lastSleep = sleepLogs[sleepLogs.length - 1];
    if (lastSleep && lastSleep.duration < 6.0) {
      predictedSleepQuality = 'poor';
    } else if (lastSleep && lastSleep.duration < avgSleep - 0.5) {
      predictedSleepQuality = 'fair';
    }
  }

  // 4. Predicted Energy Level
  let predictedEnergyLevel = 75;
  if (predictedSleepQuality === 'poor') {
    predictedEnergyLevel -= 25;
  } else if (predictedSleepQuality === 'fair') {
    predictedEnergyLevel -= 10;
  }
  if (stressCount > 1) {
    predictedEnergyLevel -= 15;
  }
  predictedEnergyLevel = Math.max(15, Math.min(98, predictedEnergyLevel));

  // 5. Deadline Failure Probability
  const pendingTasks = tasks.filter((t: any) => t.status === "pending");
  const overdueTasks = pendingTasks.filter((t: any) => new Date(t.date) < today);
  let deadlineFailureProbability = Math.min(95, Math.round((overdueTasks.length / Math.max(1, pendingTasks.length)) * 50 + (pendingTasks.length * 5)));
  deadlineFailureProbability = Math.max(5, deadlineFailureProbability);

  // 6. Goal Predictions
  const goalPredictions: GoalPrediction[] = goals.map((g: any) => {
    const progress = g.progress || 0;
    const targetDate = g.targetDate ? new Date(g.targetDate) : null;
    let predictedCompletionDate = g.targetDate || "N/A";
    let probabilityOfSuccess = 70;

    if (targetDate) {
      const diffTime = targetDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0) {
        const progressRatePerDay = progress / Math.max(1, (60 - daysLeft)); // Assuming 60 days standard target duration
        const daysToFinish = (100 - progress) / Math.max(0.01, progressRatePerDay);
        
        const estDate = new Date();
        estDate.setDate(today.getDate() + daysToFinish);
        predictedCompletionDate = estDate.toISOString().split("T")[0];

        if (daysToFinish <= daysLeft) {
          probabilityOfSuccess = Math.min(98, Math.round(80 + (daysLeft - daysToFinish)));
        } else {
          probabilityOfSuccess = Math.max(10, Math.round(50 - (daysToFinish - daysLeft) * 2));
        }
      } else {
        probabilityOfSuccess = progress >= 100 ? 100 : 5;
      }
    }

    return {
      goalId: g.id,
      title: g.title,
      predictedCompletionDate,
      probabilityOfSuccess
    };
  });

  return {
    burnoutProbability,
    budgetOverflowProbability,
    predictedSleepQuality,
    predictedEnergyLevel,
    deadlineFailureProbability,
    goalPredictions
  };
}
