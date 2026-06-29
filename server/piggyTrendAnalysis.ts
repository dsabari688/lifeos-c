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
      return diff >= endDaysAgo && diff < startDaysAgo;
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
