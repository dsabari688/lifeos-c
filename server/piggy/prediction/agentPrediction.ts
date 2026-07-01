import { queryGroq } from "../core/piggyClient.js";

// --- Consolidated from piggyFailureModel.ts ---
/**
 * Piggy AI Failure Predictor Model.
 * Evaluates conditions (such as low sleep, consecutive skips, stressful mood ratings)
 * under which habit or task failures are highly probable.
 */

export interface FailureTrigger {
  triggerFactor: string;
  probabilityIncrease: number; // percentage increase in failure risk
  description: string;
}

export interface FailureModelResult {
  failureTriggers: FailureTrigger[];
  criticalFailureRiskHours: string[];
  failureMitigationAdvice: string;
}

/**
 * Builds the failure model based on historical skips and workload telemetry.
 */
export function buildFailureModel(userData: any): FailureModelResult {
  const sleepLogs = userData.sleepLogs || [];
  const moods = userData.moods || [];

  const failureTriggers: FailureTrigger[] = [];

  // 1. Sleep deprivation trigger
  if (sleepLogs.length > 0) {
    const lowSleepDays = sleepLogs.filter((s: any) => s.duration < 6.2).length;
    if (lowSleepDays > 0) {
      failureTriggers.push({
        triggerFactor: "sleep_deprivation",
        probabilityIncrease: 35,
        description: "Sleep duration below 6.2 hours raises habit failure rate by 35%."
      });
    }
  }

  // 2. High stress trigger
  const stressDays = moods.filter((m: any) => m.mood === "stressed").length;
  if (stressDays > 0) {
    failureTriggers.push({
      triggerFactor: "elevated_stress",
      probabilityIncrease: 25,
      description: "Mood index logged as 'stressed' increases schedule compliance failures by 25%."
    });
  }

  // Default triggers if no database logs are rich enough
  if (failureTriggers.length === 0) {
    failureTriggers.push({
      triggerFactor: "fatigue_drift",
      probabilityIncrease: 15,
      description: "Skipping buffer blocks after focus sessions increases procrastination by 15%."
    });
  }

  const criticalFailureRiskHours = ["15:00 - 17:00", "22:00 - 00:00"];
  const failureMitigationAdvice = "Proactively insert 10-minute recovery slots after focus sessions and maintain sleep targets above 7.0 hours.";

  return {
    failureTriggers,
    criticalFailureRiskHours,
    failureMitigationAdvice
  };
}

// --- Consolidated from piggyOpportunityEngine.ts ---

export interface OpportunityFactor {
  opportunity: string;        // Opportunity name (e.g., Early Focus Window)
  benefit: string;            // The advantage (e.g., Save $20, Accelerate goal by 2 days)
  difficulty: 'low' | 'medium' | 'high';
  estimatedBenefit: string;   // Explanation of estimated benefit
}

/**
 * Searches the user's data context to spot scheduling, savings, or habit acceleration opportunities.
 */
export async function runOpportunityEngine(
  userQuery: string,
  contextSummary: string
): Promise<OpportunityFactor[]> {
  const prompt = `You are the Piggy AI Opportunity Engine.
Analyze the user query and the current user context to detect proactive opportunities:
1. Free Time / Buffer gaps in schedule
2. Unused Focus Blocks (during peak energy hours)
3. Streak Opportunities (habits close to completing high milestones)
4. Budget Savings (underutilized categories)
5. Goal Acceleration (quick wins to boost goal progression)
6. Learning Opportunities (topics of interest/skills)

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object containing a list of detected opportunities:
{
  "opportunities": [
    {
      "opportunity": "Early Morning Coding",
      "benefit": "Unlocks 2 hours of quiet focus",
      "difficulty": "medium",
      "estimatedBenefit": "Accelerates your Learn React goal by completing tasks in high peak hours"
    }
  ]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Opportunity Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && Array.isArray(result.opportunities)) {
      return result.opportunities;
    }
    return [];
  } catch (error) {
    console.error("[OPPORTUNITY ENGINE] Error checking opportunities:", error);
    return [];
  }
}

// --- Consolidated from piggyPrediction.ts ---
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

// --- Consolidated from piggyPriorityEngine.ts ---

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface PriorityEvaluation {
  priority: PriorityLevel;
  reason: string;
  breakdown: {
    deadlineImpact: number;  // 1 to 10 scale
    habitImpact: number;     // 1 to 10 scale
    goalImpact: number;      // 1 to 10 scale
    mentalLoad: number;      // 1 to 10 scale
    financialImpact: number; // 1 to 10 scale
  };
}

/**
 * Assesses the priority levels of the user's situation and requests.
 */
export async function runPriorityEngine(
  userQuery: string,
  contextSummary: string
): Promise<PriorityEvaluation> {
  const prompt = `You are the Piggy AI Priority Engine.
Evaluate the user's current situation or request across multiple priority aspects: deadlines, importance, urgency, habit impact, goal impact, mental load, and financial impact.

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Determine:
1. Impact scores (from 1 to 10) for: deadlines, habits, goals, mental load, and financial impact.
2. The overall computed Priority Level: "Critical" | "High" | "Medium" | "Low".
3. A concise reason backing the priority level assignment.

Return a JSON object matching this schema:
{
  "priority": "Critical" | "High" | "Medium" | "Low",
  "reason": "Clear explanation of the overall priority assessment",
  "breakdown": {
    "deadlineImpact": 5,
    "habitImpact": 5,
    "goalImpact": 5,
    "mentalLoad": 5,
    "financialImpact": 5
  }
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Priority Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    return {
      priority: result.priority || "Medium",
      reason: result.reason || "Determined default priority balance.",
      breakdown: result.breakdown || {
        deadlineImpact: 5,
        habitImpact: 5,
        goalImpact: 5,
        mentalLoad: 5,
        financialImpact: 5
      }
    };
  } catch (error) {
    console.error("[PRIORITY ENGINE] Error running priority scoring:", error);
    return {
      priority: "Medium",
      reason: "Prioritizer service unavailable. Defaulting to Medium.",
      breakdown: {
        deadlineImpact: 5,
        habitImpact: 5,
        goalImpact: 5,
        mentalLoad: 5,
        financialImpact: 5
      }
    };
  }
}

// --- Consolidated from piggyScenarioEngine.ts ---

export interface ScenarioAnalysis {
  bestCase: {
    outcome: string;
    likelihood: string;
  };
  expectedCase: {
    outcome: string;
    likelihood: string;
  };
  worstCase: {
    outcome: string;
    likelihood: string;
  };
  recoveryPlan: string[];
}

/**
 * Evaluates possible outcomes (Best, Expected, Worst cases) and creates a backup recovery plan.
 */
export async function runScenarioEngine(
  userQuery: string,
  planTitle: string,
  contextSummary: string
): Promise<ScenarioAnalysis> {
  const prompt = `You are the Piggy AI Scenario Analysis Engine.
Analyze the user's query and the proposed plan: "${planTitle || "General tasks schedule"}".
Outline three scenarios:
1. Best Case: What happens if everything goes perfectly?
2. Expected Case: What is the most realistic outcome?
3. Worst Case: What happens if barriers, interruptions, or low energy block the plan?
Include a clear, actionable Recovery Plan with recovery steps if the Worst Case happens.

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object:
{
  "bestCase": { "outcome": "Description of perfect flow", "likelihood": "e.g., 20%" },
  "expectedCase": { "outcome": "Description of expected flow", "likelihood": "e.g., 60%" },
  "worstCase": { "outcome": "Description of worst case barriers", "likelihood": "e.g., 20%" },
  "recoveryPlan": [
    "Recovery step 1",
    "Recovery step 2"
  ]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Scenario Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    return {
      bestCase: result.bestCase || { outcome: "Flawless milestone execution.", likelihood: "15%" },
      expectedCase: result.expectedCase || { outcome: "Standard milestone completion with minor delays.", likelihood: "70%" },
      worstCase: result.worstCase || { outcome: "Missed deadlines due to overworking or context switching.", likelihood: "15%" },
      recoveryPlan: Array.isArray(result.recoveryPlan) ? result.recoveryPlan : ["Break tasks into 15-minute intervals.", "Reschedule non-essential blocks to the weekend."]
    };
  } catch (error) {
    console.error("[SCENARIO ENGINE] Error generating scenarios:", error);
    return {
      bestCase: { outcome: "Optimistic completion.", likelihood: "20%" },
      expectedCase: { outcome: "Balanced progress.", likelihood: "60%" },
      worstCase: { outcome: "Disrupted workflow.", likelihood: "20%" },
      recoveryPlan: ["Buffer tasks with 30-minute gaps.", "Engage focus mode."]
    };
  }
}

// --- Consolidated from piggySuccessModel.ts ---
/**
 * Piggy AI Success Predictor Model.
 * Evaluates the correlation of positive variables (high sleep hours, good mood, focus sessions)
 * during successful habit logs.
 */

export interface SuccessFactors {
  minSleepThreshold: number;   // minimum sleep duration that guarantees success
  preferredMoods: string[];     // moods associated with high success
  optimalFocusMinutes: number; // focus minutes associated with high success
  successConditionsSummary: string;
}

/**
 * Learns the conditions for habit and task execution success.
 */
export function buildSuccessModel(userData: any): SuccessFactors {
  const sleepLogs = userData.sleepLogs || [];
  const focusSessions = userData.focusSessions || [];
  const habits = userData.habits || [];

  // General heuristics:
  // Find average sleep on days where habits were completed
  let totalSleepOnSuccess = 0;
  let successSleepCount = 0;

  habits.forEach((h: any) => {
    (h.logs || []).forEach((logDate: string) => {
      const sleepOnDay = sleepLogs.find((s: any) => s.date === logDate);
      if (sleepOnDay) {
        totalSleepOnSuccess += sleepOnDay.duration;
        successSleepCount++;
      }
    });
  });

  const minSleepThreshold = successSleepCount > 0 ? parseFloat((totalSleepOnSuccess / successSleepCount).toFixed(1)) : 7.2;

  // Optimal focus duration
  const successfulFocusDurations = focusSessions.filter((s: any) => s.score >= 80).map((s: any) => s.durationMinutes);
  const optimalFocusMinutes = successfulFocusDurations.length > 0
    ? Math.round(successfulFocusDurations.reduce((a: number, b: number) => a + b, 0) / successfulFocusDurations.length)
    : 45;

  const preferredMoods = ["happy", "good", "neutral"];
  const successConditionsSummary = `Success rates peak when sleep duration exceeds ${minSleepThreshold} hours and daily focus matches ${optimalFocusMinutes} minutes.`;

  return {
    minSleepThreshold,
    preferredMoods,
    optimalFocusMinutes,
    successConditionsSummary
  };
}

// --- Consolidated from piggyTrendAnalysis.ts ---
/**
 * Piggy AI Trend Analysis Engine.
 * Computes slope shifts and moving averages for long-term consistency telemetry.
 */

export interface TrendMetrics {
  habitSlope: number;         // percentage completion rate change week-over-week
  focusDurationSlope: number; // minutes change week-over-week
  moodSlope: number;          // rating score change week-over-week
  trendSummary: string;
}

/**
 * Calculates long-term trend slopes for habit compliance, focus times, and mood scores.
 */
export function calculateTrends(userData: any): TrendMetrics {
  const habits = userData.habits || [];
  const focusSessions = userData.focusSessions || [];
  const moods = userData.moods || [];
  const today = new Date();

  // Helper to filter logs in range
  const countLogsInRange = (logs: string[], startDaysAgo: number, endDaysAgo: number): number => {
    return logs.filter((lStr: string) => {
      const logDate = new Date(lStr);
      const diff = (today.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
      return diff >= startDaysAgo && diff < endDaysAgo;
    }).length;
  };

  // 1. Habit compliance slope
  let week1Completions = 0;
  let week2Completions = 0;
  habits.forEach((h: any) => {
    week1Completions += countLogsInRange(h.logs || [], 0, 7);
    week2Completions += countLogsInRange(h.logs || [], 7, 14);
  });
  const maxPossibleWeekly = habits.length * 7 || 1;
  const week1Rate = (week1Completions / maxPossibleWeekly) * 100;
  const week2Rate = (week2Completions / maxPossibleWeekly) * 100;
  const habitSlope = Math.round(week1Rate - week2Rate);

  // 2. Focus duration slope
  let week1FocusMins = 0;
  let week2FocusMins = 0;
  focusSessions.forEach((s: any) => {
    const sDate = new Date(s.timestamp);
    const diff = (today.getTime() - sDate.getTime()) / (1000 * 3600 * 24);
    if (diff < 7) {
      week1FocusMins += s.durationMinutes;
    } else if (diff >= 7 && diff < 14) {
      week2FocusMins += s.durationMinutes;
    }
  });
  const focusDurationSlope = week1FocusMins - week2FocusMins;

  // 3. Mood slope
  const moodValues: Record<string, number> = {
    happy: 5, good: 4, neutral: 3, sad: 2, stressed: 1
  };
  let week1MoodSum = 0, week1MoodCount = 0;
  let week2MoodSum = 0, week2MoodCount = 0;
  moods.forEach((m: any) => {
    const mDate = new Date(m.createdAt);
    const diff = (today.getTime() - mDate.getTime()) / (1000 * 3600 * 24);
    const val = moodValues[m.mood?.toLowerCase()] || 3;
    if (diff < 7) {
      week1MoodSum += val;
      week1MoodCount++;
    } else if (diff >= 7 && diff < 14) {
      week2MoodSum += val;
      week2MoodCount++;
    }
  });
  const week1MoodAvg = week1MoodCount > 0 ? week1MoodSum / week1MoodCount : 3;
  const week2MoodAvg = week2MoodCount > 0 ? week2MoodSum / week2MoodCount : 3;
  const moodSlope = parseFloat((week1MoodAvg - week2MoodAvg).toFixed(2));

  // 4. Trend summary
  let trendSummary = "Your routines show steady development.";
  if (habitSlope < -10) {
    trendSummary = "Consistency rates have dropped by over 10% this week. Rescheduling adjustments recommended.";
  } else if (habitSlope > 10) {
    trendSummary = "Consistency rates improved by over 10% this week. Performance momentum is high.";
  }

  return {
    habitSlope,
    focusDurationSlope,
    moodSlope,
    trendSummary
  };
}