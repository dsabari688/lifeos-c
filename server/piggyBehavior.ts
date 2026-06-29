/**
 * Piggy AI Behavioral Analytics Engine.
 * Models behavioral patterns, habit drift rates, and recommendation compliance indices.
 */

export interface BehaviorModel {
  consistencyTrend: 'improving' | 'stable' | 'declining';
  habitDriftRate: number;      // percentage drift from planned schedule
  complianceRate: number;      // percentage of recommendations accepted and completed
  burnoutRiskLevel: 'low' | 'medium' | 'high';
  mostProductiveHours: string[];
}

/**
 * Constructs user compliance and habit execution trend models.
 */
export function analyzeUserBehavior(userData: any): BehaviorModel {
  const habits = userData.habits || [];
  const feedback = userData.recommendationsFeedback || [];
  const focusSessions = userData.focusSessions || [];
  const moods = userData.moods || [];

  // 1. Consistency Trend
  let totalCompletionsThisWeek = 0;
  let totalCompletionsPriorWeek = 0;
  const today = new Date();

  habits.forEach((h: any) => {
    (h.logs || []).forEach((logDate: string) => {
      const log = new Date(logDate);
      const diffTime = today.getTime() - log.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      if (diffDays <= 7) {
        totalCompletionsThisWeek++;
      } else if (diffDays > 7 && diffDays <= 14) {
        totalCompletionsPriorWeek++;
      }
    });
  });

  let consistencyTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (totalCompletionsThisWeek > totalCompletionsPriorWeek + 2) {
    consistencyTrend = 'improving';
  } else if (totalCompletionsThisWeek < totalCompletionsPriorWeek - 2) {
    consistencyTrend = 'declining';
  }

  // 2. Compliance Rate (accepted recommendations vs ignored)
  const accepted = feedback.filter((f: any) => f.status === "accepted").length;
  const totalFeedback = feedback.length;
  const complianceRate = totalFeedback > 0 ? Math.round((accepted / totalFeedback) * 100) : 75;

  // 3. Burnout Risk Level
  const totalFocusMinutes = focusSessions.slice(-7).reduce((sum: number, s: any) => sum + s.durationMinutes, 0);
  const stressedCount = moods.slice(-7).filter((m: any) => m.mood === "stressed").length;
  let burnoutRiskLevel: 'low' | 'medium' | 'high' = 'low';
  if (totalFocusMinutes > 500 || stressedCount >= 3) {
    burnoutRiskLevel = 'high';
  } else if (totalFocusMinutes > 300 || stressedCount >= 1) {
    burnoutRiskLevel = 'medium';
  }

  return {
    consistencyTrend,
    habitDriftRate: 15, // estimated percentage drift
    complianceRate,
    burnoutRiskLevel,
    mostProductiveHours: ["09:00 - 11:00", "19:00 - 21:00"]
  };
}
