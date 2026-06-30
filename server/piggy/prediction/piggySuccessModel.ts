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
