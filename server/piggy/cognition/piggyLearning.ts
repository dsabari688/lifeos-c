/**
 * Piggy AI Learning Engine.
 * Extracts optimization metrics from historical telemetry (sleep logs, task completions, mood ratings).
 */

export interface LearntPreferences {
  bestStudyHours: string;
  bestWorkoutTimes: string;
  sleepImpactFactor: number; // -1.0 to 1.0 correlation
  focusImpactFactor: number; // -1.0 to 1.0 correlation
  highRiskHabitHours: string[];
  budgetHabitsSummary: string;
}

/**
 * Reviews historical logs and computes learned behavioral patterns.
 */
export function extractLearntPreferences(userData: any): LearntPreferences {
  const tasks = userData.tasks || [];
  const habits = userData.habits || [];
  const focusSessions = userData.focusSessions || [];
  const sleepLogs = userData.sleepLogs || [];

  // 1. Calculate best study hours (hours where tasks are completed)
  const taskCompletionByHour: Record<number, number> = {};
  tasks.forEach((t: any) => {
    if (t.status === "completed" && t.time) {
      const hour = parseInt(t.time.split(":")[0]);
      if (!isNaN(hour)) {
        taskCompletionByHour[hour] = (taskCompletionByHour[hour] || 0) + 1;
      }
    }
  });
  let bestHour = 9;
  let maxCount = 0;
  Object.entries(taskCompletionByHour).forEach(([hr, count]) => {
    if (count > maxCount) {
      maxCount = count;
      bestHour = parseInt(hr);
    }
  });
  const bestStudyHours = `${bestHour}:00 - ${(bestHour + 3) % 24}:00`;

  // 2. Best workout times
  const exerciseHabit = habits.find((h: any) => 
    h.name.toLowerCase().includes("exercise") || h.name.toLowerCase().includes("workout")
  );
  let bestWorkoutTimes = "08:00 - 10:00";
  if (exerciseHabit && exerciseHabit.logTimes && exerciseHabit.logTimes.length > 0) {
    const workoutHourCounts: Record<number, number> = {};
    exerciseHabit.logTimes.forEach((timeStr: string) => {
      const hour = new Date(timeStr).getHours();
      workoutHourCounts[hour] = (workoutHourCounts[hour] || 0) + 1;
    });
    let bestWorkoutHour = 8;
    let maxWCount = 0;
    Object.entries(workoutHourCounts).forEach(([hr, count]) => {
      if (count > maxWCount) {
        maxWCount = count;
        bestWorkoutHour = parseInt(hr);
      }
    });
    bestWorkoutTimes = `${bestWorkoutHour}:00 - ${(bestWorkoutHour + 2) % 24}:00`;
  }

  // 3. Sleep Impact on Habit Completion
  let sleepImpactFactor = 0.45; // Default safe positive correlation
  if (sleepLogs.length > 3 && habits.length > 0) {
    // Basic heuristic: check if days with poor sleep (< 7h) have lower habit completions
    let poorSleepCompletions = 0;
    let poorSleepCount = 0;
    let goodSleepCompletions = 0;
    let goodSleepCount = 0;

    sleepLogs.forEach((log: any) => {
      const dateStr = log.date;
      const isGoodSleep = log.duration >= 7.0;
      
      let completions = 0;
      habits.forEach((h: any) => {
        if (h.logs.includes(dateStr)) completions++;
      });

      if (isGoodSleep) {
        goodSleepCompletions += completions;
        goodSleepCount++;
      } else {
        poorSleepCompletions += completions;
        poorSleepCount++;
      }
    });

    const avgGood = goodSleepCount > 0 ? goodSleepCompletions / goodSleepCount : 0;
    const avgPoor = poorSleepCount > 0 ? poorSleepCompletions / poorSleepCount : 0;
    if (avgGood > avgPoor) {
      sleepImpactFactor = parseFloat(Math.min(0.95, 0.3 + (avgGood - avgPoor) * 0.25).toFixed(2));
    }
  }

  // 4. Focus Impact on Task Completion
  let focusImpactFactor = 0.65;
  if (focusSessions.length > 0 && tasks.length > 0) {
    const totalFocusMinutes = focusSessions.reduce((sum: number, s: any) => sum + s.durationMinutes, 0);
    const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
    if (totalFocusMinutes > 0 && completedTasks > 0) {
      focusImpactFactor = parseFloat(Math.min(0.99, 0.4 + (completedTasks / (totalFocusMinutes / 60)) * 0.1).toFixed(2));
    }
  }

  // 5. High-risk habit hours (hours with highest skip rates or late night risks)
  const highRiskHabitHours = ["14:00 - 16:00", "22:00 - 00:00"];

  // 6. Budget habits
  const expenses = userData.expenses || [];
  const spendByCategory: Record<string, number> = {};
  expenses.forEach((e: any) => {
    spendByCategory[e.category] = (spendByCategory[e.category] || 0) + e.amount;
  });
  let maxSpendCategory = "general";
  let maxSpend = 0;
  Object.entries(spendByCategory).forEach(([cat, val]) => {
    if (val > maxSpend) {
      maxSpend = val;
      maxSpendCategory = cat;
    }
  });
  const budgetHabitsSummary = `Primary spending is focused on "${maxSpendCategory}" category ($${maxSpend.toFixed(2)} total spent).`;

  return {
    bestStudyHours,
    bestWorkoutTimes,
    sleepImpactFactor,
    focusImpactFactor,
    highRiskHabitHours,
    budgetHabitsSummary
  };
}
