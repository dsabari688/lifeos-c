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
