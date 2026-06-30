/**
 * Piggy AI Pattern Discovery Engine.
 * Detects behavioral changes, hidden dependencies, and productivity cycles.
 */

export interface BehaviorPattern {
  patternType: 'productivity_cycle' | 'hidden_habit' | 'behavior_change' | 'seasonal';
  description: string;
  evidence: string;
  significance: 'low' | 'medium' | 'high';
}

/**
 * Scans telemetry database to extract hidden habits and routine triggers.
 */
export function discoverBehavioralPatterns(userData: any): BehaviorPattern[] {
  const patterns: BehaviorPattern[] = [];
  const habits = userData.habits || [];
  const sleepLogs = userData.sleepLogs || [];
  const moods = userData.moods || [];

  // 1. Productivity Cycle Detection
  let morningCompletions = 0;
  let nightCompletions = 0;

  habits.forEach((h: any) => {
    (h.logTimes || []).forEach((tStr: string) => {
      const hour = new Date(tStr).getHours();
      if (hour >= 5 && hour < 12) {
        morningCompletions++;
      } else if (hour >= 18 || hour < 5) {
        nightCompletions++;
      }
    });
  });

  if (morningCompletions > nightCompletions + 10) {
    patterns.push({
      patternType: 'productivity_cycle',
      description: "Early Morning Focus Window",
      evidence: `You completed ${morningCompletions} habit milestones before 12:00 PM compared to ${nightCompletions} in the evening.`,
      significance: 'high'
    });
  } else if (nightCompletions > morningCompletions + 10) {
    patterns.push({
      patternType: 'productivity_cycle',
      description: "Evening Deep Work Window",
      evidence: `You completed ${nightCompletions} habit milestones after 6:00 PM compared to ${morningCompletions} in the morning.`,
      significance: 'high'
    });
  }

  // 2. Hidden Habit Skip Patterns (e.g. Sunday skips)
  habits.forEach((h: any) => {
    const logs = h.logs || [];
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const skipsByDay: Record<string, number> = {
      Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0
    };

    // Look back past 4 weeks
    for (let i = 1; i <= 4; i++) {
      weekdays.forEach(dayName => {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - (i * 7));
        const dayIndex = weekdays.indexOf(dayName);
        const offset = dayIndex - checkDate.getDay();
        checkDate.setDate(checkDate.getDate() + offset);

        const checkStr = checkDate.toISOString().split("T")[0];
        if (!logs.includes(checkStr)) {
          skipsByDay[dayName]++;
        }
      });
    }

    Object.entries(skipsByDay).forEach(([day, count]) => {
      if (count >= 3) {
        patterns.push({
          patternType: 'hidden_habit',
          description: `Weekend Skip Pattern for "${h.name}"`,
          evidence: `You skipped "${h.name}" on ${count} of the past 4 ${day}s.`,
          significance: 'medium'
        });
      }
    });
  });

  // 3. Behavior Shift (e.g. recent sleep drops)
  if (sleepLogs.length > 5) {
    const recentSleep = sleepLogs.slice(-3).reduce((sum: number, s: any) => sum + s.duration, 0) / 3;
    const historicSleep = sleepLogs.slice(-10, -3).reduce((sum: number, s: any) => sum + s.duration, 0) / Math.max(1, sleepLogs.slice(-10, -3).length);
    if (recentSleep < historicSleep - 1.0) {
      patterns.push({
        patternType: 'behavior_change',
        description: "Decline in Sleep Duration",
        evidence: `Your average sleep duration fell to ${recentSleep.toFixed(1)}h over the past 3 days (compared to ${historicSleep.toFixed(1)}h baseline).`,
        significance: 'high'
      });
    }
  }

  // Fallback defaults
  if (patterns.length === 0) {
    patterns.push({
      patternType: 'productivity_cycle',
      description: "Balanced Routine Cycle",
      evidence: "Habit completions are evenly distributed between morning and evening blocks.",
      significance: 'low'
    });
  }

  return patterns;
}
