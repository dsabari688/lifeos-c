// Piggy AI v4.0 — Insights Module
import { calculateHabitPatterns, calculateHabitRisk, getDaysBetween } from "./piggyIntelligence.js";
import { calculateTrends } from "./piggyTrendAnalysis.js";
import { runPredictiveAnalytics } from "./piggyPrediction.js";

/**
 * Translates numeric telemetry and logs into semantic, qualitative observations
 * that the AI can easily reason about.
 */
export function generateObservations(userData: any): string[] {
  const observations: string[] = [];
  const today = new Date();

  // 1. Habit Insights
  const habits = userData.habits || [];
  let strongestHabit = "None";
  let highestCompletion = -1;
  
  habits.forEach((h: any) => {
    const patterns = calculateHabitPatterns(h, userData.sleepLogs || [], userData.moods || []);
    const risk = calculateHabitRisk(h, userData.sleepLogs || [], userData.moods || [], userData);

    if (patterns.overallCompletion > highestCompletion && patterns.overallCompletion > 70) {
      highestCompletion = patterns.overallCompletion;
      strongestHabit = h.name;
    }

    if (patterns.overallCompletion < 50 && h.logs.length > 0) {
      observations.push(`Consistency index for '${h.name}' is low, currently sitting at ${patterns.overallCompletion}%.`);
    }

    // Time of day correlation
    if (patterns.morningPercent > patterns.nightPercent + 25) {
      observations.push(`Morning slots are significantly more successful for '${h.name}' (${patterns.morningPercent}%) than evening slots.`);
    } else if (patterns.nightPercent > patterns.morningPercent + 25) {
      observations.push(`Evening slots are significantly more successful for '${h.name}' (${patterns.nightPercent}%) than morning slots.`);
    }

    // Risk alerts
    if (risk.riskPercent > 60) {
      observations.push(`Warning: '${h.name}' has a high failure risk of ${risk.riskPercent}% today. Reason: ${risk.reasons.join(", ")}.`);
    }
  });

  if (strongestHabit !== "None") {
    observations.push(`'${strongestHabit}' is your strongest habit over the past month with ${highestCompletion}% consistency.`);
  }

  // 2. Sleep & Mood Insights
  const sleepLogs = userData.sleepLogs || [];
  const moods = userData.moods || [];
  
  if (sleepLogs.length > 0) {
    const avgSleep = sleepLogs.reduce((sum: number, log: any) => sum + (log.duration || 8), 0) / sleepLogs.length;
    const lastSleep = sleepLogs[sleepLogs.length - 1];
    
    if (lastSleep && lastSleep.duration < avgSleep - 1.2) {
      observations.push(`Recent sleep duration of ${lastSleep.duration} hours was significantly below your historical average of ${avgSleep.toFixed(1)} hours.`);
    }
  }

  const recentMoods = moods.slice(-5);
  const stressedCount = recentMoods.filter((m: any) => m.mood === "stressed" || m.mood === "😡").length;
  if (stressedCount >= 2) {
    observations.push(`Stress indicators are elevated recently. Mood telemetry logs show multiple 'stressed' ratings.`);
  }

  // 3. Task Rescheduling Insights
  const tasks = userData.tasks || [];
  const highlyRescheduled = tasks.filter((t: any) => t.status === "pending" && t.rescheduledCount >= 2);
  highlyRescheduled.forEach((t: any) => {
    observations.push(`Task '${t.title}' has been deferred ${t.rescheduledCount} times, indicating potential procrastination blockers.`);
  });

  // 4. Recommendation & Adaptive Learning Engine Insights
  const feedback = userData.recommendationsFeedback || [];
  const accepted = feedback.filter((f: any) => f.status === "accepted").length;
  const ignored = feedback.filter((f: any) => f.status === "ignored").length;
  
  if (accepted > 0) {
    // Look at the average ROI improvement
    const improvedFeedback = feedback.filter((f: any) => f.status === "accepted" && f.targetMetricAfter);
    if (improvedFeedback.length > 0) {
      const avgImprovement = improvedFeedback.reduce((sum: number, f: any) => sum + (f.targetMetricAfter - f.baselineRateBefore), 0) / improvedFeedback.length;
      if (avgImprovement > 0) {
        observations.push(`Executing AI recommendations has improved your overall routine consistency by an average of ${Math.round(avgImprovement)}%.`);
      }
    }
  }

  // Detect specific workout learning shifts
  const workoutRejections = feedback.filter((f: any) => 
    f.text.toLowerCase().includes("morning") && 
    (f.text.toLowerCase().includes("workout") || f.text.toLowerCase().includes("exercise")) && 
    f.status === "ignored"
  ).length;
  
  if (workoutRejections >= 2) {
    observations.push(`Learning override active: morning workout suggestions are shifted to evening because morning prompts were ignored repeatedly.`);
  }

  // 5. Budget Insights
  const expenses = userData.expenses || [];
  const budgetLimit = userData.profile?.budgetLimit || 1200;
  const totalSpent = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const spentPct = Math.round((totalSpent / budgetLimit) * 100);

  if (spentPct >= 85) {
    observations.push(`Attention: Budget utilization is high, currently sitting at ${spentPct}% ($${totalSpent.toFixed(2)} of $${budgetLimit} limit).`);
  }

  const impulsiveCount = expenses.filter((e: any) => e.isImpulsive).length;
  if (impulsiveCount >= 2) {
    observations.push(`Impulse buying patterns detected. You logged ${impulsiveCount} spontaneous purchases recently.`);
  }

  // 6. Add Predictor & Trend Analysis Insights
  try {
    const trends = calculateTrends(userData);
    const predictions = runPredictiveAnalytics(userData);

    if (trends.habitSlope !== 0) {
      observations.push(`Consistency index is ${trends.habitSlope > 0 ? 'increasing' : 'declining'} by ${Math.abs(trends.habitSlope)}% week-over-week.`);
    }
    if (predictions.burnoutProbability > 65) {
      observations.push(`Burnout warning: telemetry models suggest an elevated burnout risk level of ${predictions.burnoutProbability}%.`);
    }
  } catch (err) {}

  // Ensure fallback default observations exist if list is empty
  if (observations.length === 0) {
    observations.push("Your weekly and monthly execution metrics remain stable and within standard parameters.");
    observations.push("No immediate scheduling conflicts or habit risk patterns detected.");
  }

  return observations;
}
