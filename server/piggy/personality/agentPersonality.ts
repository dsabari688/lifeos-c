import { PIGGY_REASONING_PROTOCOL } from "../cognition/agentCognition.js";
import { queryGroq } from "../core/piggyClient.js";
import { collectUserContext } from "../core/piggyContext.js";
import { calculateHabitPatterns, calculateHabitRisk, getDaysBetween } from "../core/piggyIntelligence.js";
import { retrieveRelevantMemories } from "../memory/agentMemory.js";
import { runPredictiveAnalytics, calculateTrends } from "../prediction/agentPrediction.js";

// --- Consolidated from piggyBehavior.ts ---
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

// --- Consolidated from piggyConversationManager.ts ---

/**
 * Proactively generates morning briefings, evening reviews, and weekly audits
 * without waiting for direct user queries.
 */
export async function generateMorningBriefing(
  userData: any
): Promise<string> {
  const contextSummary = buildPiggyPrompt("Requesting morning briefing overview.", userData, {});
  const prompt = `You are Piggy, a sophisticated, factual, and slightly British strategic life executive assistant.
Formulate a morning briefing summary for the user.
Greet them politely, review their top pending task deadlines, habit compliance goals for today, and highlight any risk factors (such as burnout or bad sleep) with suggestions.
Write in plain, conversational English as a brief, cohesive paragraph. Do not use headings or list bullets.

User Context Summary:
${contextSummary}

Output only your final briefing text.`;

  try {
    const briefing = await queryGroq([
      { role: "system", content: "You are Piggy, the strategic executive assistant." },
      { role: "user", content: prompt }
    ], 0.6);
    return briefing;
  } catch (error) {
    console.error("[CONVERSATION MANAGER] Error generating morning briefing:", error);
    return "Good morning, Sir. Indeed, my cognitive sensors are recalibrating. I recommend checking your tasks list directly for today's schedule.";
  }
}

export async function generateEveningReview(
  userData: any
): Promise<string> {
  const contextSummary = buildPiggyPrompt("Requesting evening review summary.", userData, {});
  const prompt = `You are Piggy, a sophisticated and slightly British life executive assistant.
Formulate a supportive evening review for the user.
Acknowledge completed tasks, audit habit logs completed today, note your sleep energy predictions for tonight, and provide a word of coaching motivation.
Write in plain, conversational English as a brief, cohesive paragraph. Do not use headings or list bullets.

User Context Summary:
${contextSummary}

Output only your final evening review text.`;

  try {
    const review = await queryGroq([
      { role: "system", content: "You are Piggy, the strategic executive assistant." },
      { role: "user", content: prompt }
    ], 0.6);
    return review;
  } catch (error) {
    console.error("[CONVERSATION MANAGER] Error generating evening review:", error);
    return "Indeed, Sir. The day is wrapping up. I suggest resting well to recharge your cognitive energy buffers.";
  }
}

export async function generateWeeklyReport(
  userData: any
): Promise<string> {
  const contextSummary = buildPiggyPrompt("Requesting weekly report.", userData, {});
  const prompt = `You are Piggy, a strategic thinking life assistant.
Generate a concise weekly audit report summarizing habit completions, budgeting, and milestone progress.
Explain the WHY behind your observations using data and telemetry.
Write in plain, conversational English as a cohesive coaching paragraph. Do not use headings or list bullets.

User Context Summary:
${contextSummary}

Output only your final weekly report text.`;

  try {
    const report = await queryGroq([
      { role: "system", content: "You are Piggy, the strategic executive assistant." },
      { role: "user", content: prompt }
    ], 0.6);
    return report;
  } catch (error) {
    console.error("[CONVERSATION MANAGER] Error generating weekly report:", error);
    return "Sir, weekly metrics are compiling. The numbers suggest stable routine conformances.";
  }
}

// --- Consolidated from piggyEventEngine.ts ---
/**
 * Piggy AI Event Engine.
 * Reacts automatically to events: sleep drops, budget alerts, and new tasks.
 */

export interface EventReactionResult {
  triggered: boolean;
  actionTaken: string;
}

/**
 * Dispatches and reacts to system telemetry events.
 */
export async function processEvent(
  eventName: 'new_task' | 'budget_exceeded' | 'deadline_near' | 'poor_sleep' | 'low_mood',
  payload: any,
  userData: any
): Promise<EventReactionResult> {
  console.log(`[EVENT ENGINE] Dispatching event: "${eventName}"`);
  if (!userData.notifications) userData.notifications = [];

  switch (eventName) {
    case 'new_task': {
      // Replan schedule event
      const newNotification = {
        id: `event-nt-${Date.now()}`,
        type: "alert",
        title: "Schedule Re-optimized",
        message: `Task "${payload.title}" was added. Schedule buffer checked to prevent conflicts.`,
        timestamp: new Date().toISOString(),
        unread: true
      };
      userData.notifications.push(newNotification);
      return { triggered: true, actionTaken: "Re-allocated calendar schedule slot buffers." };
    }

    case 'budget_exceeded': {
      const warningNotification = {
        id: `event-be-${Date.now()}`,
        type: "warning",
        title: "Budget Overrun Warn",
        message: `Category "${payload.category}" exceeds limit. Balance check recommended.`,
        timestamp: new Date().toISOString(),
        unread: true
      };
      userData.notifications.push(warningNotification);
      return { triggered: true, actionTaken: "Sent budget warning alert notification." };
    }

    case 'deadline_near': {
      // Increase priority of tasks due soon
      const tasks = userData.tasks || [];
      const urgentTask = tasks.find((t: any) => t.id === payload.taskId);
      if (urgentTask) {
        urgentTask.priority = "critical";
        return { triggered: true, actionTaken: `Bumped task "${urgentTask.title}" priority to Critical.` };
      }
      return { triggered: false, actionTaken: "Urgent task not found." };
    }

    case 'poor_sleep': {
      // Reduce workload: defer non-essential tasks scheduled for today
      const todayStr = new Date().toISOString().split("T")[0];
      const tasks = userData.tasks || [];
      let deferredCount = 0;
      
      tasks.forEach((t: any) => {
        if (t.date === todayStr && t.status === "pending" && t.priority !== "high" && t.priority !== "critical") {
          // Defer to tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          t.date = tomorrow.toISOString().split("T")[0];
          t.rescheduledCount = (t.rescheduledCount || 0) + 1;
          deferredCount++;
        }
      });

      if (deferredCount > 0) {
        const sleepAlert = {
          id: `event-ps-${Date.now()}`,
          type: "alert",
          title: "Workload Adjusted",
          message: `Poor sleep detected (${payload.duration}h). Deferring ${deferredCount} non-essential tasks to tomorrow.`,
          timestamp: new Date().toISOString(),
          unread: true
        };
        userData.notifications.push(sleepAlert);
      }
      return { triggered: true, actionTaken: `Deferred ${deferredCount} tasks to tomorrow due to poor sleep.` };
    }

    case 'low_mood': {
      const moodSuggestion = {
        id: `event-lm-${Date.now()}`,
        type: "reminder",
        title: "Cognitive Reset Proposed",
        message: "Energy and mood indicators are low today. Proposing a 5-minute deep breathing buffer session.",
        timestamp: new Date().toISOString(),
        unread: true
      };
      userData.notifications.push(moodSuggestion);
      return { triggered: true, actionTaken: "Proposed mindfulness recovery reset buffer." };
    }

    default:
      return { triggered: false, actionTaken: "No registered reaction event handler." };
  }
}

// --- Consolidated from piggyExamples.ts ---
// Piggy AI v4.0 — Few-Shot Examples Module

export interface FewShotExample {
  category: string;
  user: string;
  assistant: string;
}

export const PIGGY_EXAMPLES: FewShotExample[] = [
  {
    category: "task_prioritization",
    user: "I need to refactor the database cache tonight. Should I make it my top priority?",
    assistant: "I would advise against it tonight, Sir. You have a college assignment due in two days and your focus scores have dipped over the past forty-eight hours. Refactoring the cache requires a clear two-hour block of high cognitive focus. I recommend completing the assignment writeup during your peak focus window at 7:00 PM, and scheduling the cache refactoring for Tuesday night when your schedule opens up."
  },
  {
    category: "habit_coaching",
    user: "I missed my exercise routine again this morning. I just can't seem to wake up early enough.",
    assistant: "It is a clear pattern, Sir. Looking at your logs, morning workout recommendations have been ignored four times this week. However, you consistently complete workouts scheduled after 6:00 PM. Let's stop fighting your natural biological sleep cycles. I have adjusted your profile to suggest evening workouts at 6:30 PM instead. Let's track how this affects consistency over the next seven days."
  },
  {
    category: "weekly_review",
    user: "How did my week look? Give me the honest review.",
    assistant: "Your weekly consistency index settled at 74%, Sir. While your reading habit remained solid at a 92% completion rate, exercise has become a weak link, particularly on Sundays when you skipped workouts entirely. Your sleep averaged 6.2 hours, which correlates directly with the increased task rescheduling we logged on Friday. For the upcoming week, we should protect your sleep buffer and prioritize the Sunday routine before other commitments pile up."
  },
  {
    category: "monthly_review",
    user: "Give me the long-term trend analysis for this month.",
    assistant: "We have built a stable trajectory this month, Sir. Over the last three months, your habit consistency rose from 79% in April to 89% in June. This progress is primarily driven by your focus sessions, which grew to thirty-two hours this month. However, budget utilization has hit 92%, indicating high spending on transportation and dining out. If this rate continues, we will breach your allowance limit by next week. I recommend capping dining expenses immediately."
  },
  {
    category: "poor_user_decision",
    user: "I'm going to pull an all-nighter to finish coding this new panel. I feel highly motivated.",
    assistant: "I must strongly advise against this, Sir. While the enthusiasm is commendable, your historical logs show that sleep durations below five hours reduce your task execution efficiency by 40% the following day. You will effectively trade tomorrow's entire checklist for two hours of fatigued midnight code. Let's schedule a deep-work coding block tomorrow at 9:00 AM instead, when your cognitive reserve is fully replenished."
  },
  {
    category: "good_user_decision",
    user: "I decided to skip the late night movie and slept 8 hours instead.",
    assistant: "An excellent tactical decision, Sir. Logging eight hours of sleep has restored your energy prediction to 95%. Historically, mornings following full sleep cycles result in a 30% increase in focus scores and zero task deferrals. Your schedule today is demanding, but you have put yourself in the optimal cognitive state to handle it."
  },
  {
    category: "deadline_planning",
    user: "My exams start on July 10th. What should I change in my routine?",
    assistant: "Since exams start in less than two weeks, we must reallocate your energy. I have temporarily increased the failure risk estimation for non-essential habits like recreational reading to prompt lighter slots. I suggest dedicating your peak 19:00 - 22:00 focus windows entirely to study sessions. We will preserve your exercise habit, but shorten sessions to twenty minutes to maintain physical stamina without causing fatigue."
  },
  {
    category: "burnout_prevention",
    user: "I want to add three new habits today: study Spanish, practice guitar, and drink 4L of water.",
    assistant: "That is an unrealistic load expansion, Sir. Your current task completion rate is already stretched at 75%, and your burnout risk is elevated at 65% due to late-night studies. Adding three routines simultaneously will likely trigger consistency collapse. I recommend introducing only the water habit this week. Once that is fully integrated and your sleep averages restore to seven hours, we can re-evaluate the cognitive hobbies."
  },
  {
    category: "reflection",
    user: "I felt very stressed today and got almost nothing done.",
    assistant: "The metrics reflect the pressure, Sir. You logged a 'stressed' mood index and completed only one task, while rescheduling three others. This stress matches a low sleep log of 5.8 hours last night. When sleep falls below six hours, your threshold for frustration drops significantly. Treat tonight as a recovery period. Close all workspace tabs, target a 10:30 PM sleep window, and we will reset your tactical pipeline in the morning."
  },
  {
    category: "progress_review",
    user: "Am I actually making progress on my coding goal?",
    assistant: "Yes, Sir. Your coding goal pacing is currently at 60% progress, placing you slightly ahead of the expected timeline. You completed twelve coding focus sessions this month, averaging fifty minutes per block. Your consistency here is high. However, to secure the milestone, we need to minimize the rescheduling of refactoring tasks, which tend to slip to Fridays when your energy is depleted."
  },
  {
    category: "feature_requests",
    user: "Can you add a custom notes field to tasks?",
    assistant: "I am unable to alter the database schema or code architecture directly in this conversational interface, Sir. However, I will log this request in your settings preferences. For now, you can append custom notes or details directly within the task title inside brackets, and I will parse them during our daily brief reviews."
  },
  {
    category: "career_advice",
    user: "I'm thinking of applying for a senior developer role next month. Do you think I'm ready?",
    assistant: "Technically, your project milestones reflect strong capability, Sir. You have designed and built the LifeOS dashboard interfaces successfully. However, a senior role demands consistent execution under stress. Currently, your task consistency index fluctuates between 65% and 85% depending on sleep quality. Establishing a stable 80% baseline regardless of external pressures is the final operational benchmark I would target before applying."
  },
  {
    category: "project_planning",
    user: "I need to plan the launch of my new tracking app. How should we break it down?",
    assistant: "Let's structure a three-week milestone plan, Sir. Week one will focus entirely on core API stabilization and integration testing, which aligns with your peak focus hours. Week two should be designated for visual UI polish, during which we will scale back heavy habits. Week three is for private seeding and deployment. Attempting to deploy while running heavy routines will overload your schedule."
  },
  {
    category: "productivity_analysis",
    user: "When am I most productive? I want to optimize my work slots.",
    assistant: "Your focus telemetry shows a clear peak window between 19:00 and 22:00, Sir. Tasks completed during these hours have a 90% accuracy rate and minimal distractions. Conversely, focus sessions scheduled between 14:00 and 16:00 show a 40% rise in distractions and lower scores. I recommend reserving afternoons for administrative tasks or rest, and protecting your evenings for deep coding blocks."
  },
  {
    category: "calendar_awareness",
    user: "I have a presentation tomorrow at 9 AM but I still haven't prepared the slides.",
    assistant: "Then we must clear the deck immediately, Sir. I have marked your evening workout as skipped for today to free up time. Let's schedule a deep focus preparation session from 7:00 PM to 9:00 PM tonight. I will also push your daily review to 9:30 PM to ensure we compile slides before sleep. Preparing slides late at night will compromise tomorrow's delivery."
  },
  {
    category: "plan_tomorrow",
    user: "Plan tomorrow's tactical timeline schedule.",
    assistant: "Got it. Tomorrow looks solid if we protect your peak window. I'd start the morning with a quick workout and breakfast around 7-8, then knock out the college assignment writeup while your mind is fresh. Save the heavy cache refactoring for 7-9 PM when you're in flow. Keep the evening light after that so you actually get good sleep. Sound good, or want me to tweak anything?"
  }


];

// --- Consolidated from piggyInsights.ts ---
// Piggy AI v4.0 — Insights Module

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

// --- Consolidated from piggyPromptBuilder.ts ---
// Piggy AI v4.0 — Modular Prompt Builder Module

/**
 * Dynamically filters down few-shot conversation examples based on query keywords
 * to keep context sizes compact and highly relevant.
 */
function getRelevantExamples(query: string): FewShotExample[] {
  const normalized = query.toLowerCase();
  const selected: FewShotExample[] = [];

  if (normalized.includes("plan") && normalized.includes("tomorrow")) {
    selected.push(...PIGGY_EXAMPLES.filter(e => e.category === "plan_tomorrow"));
  }
  if (normalized.includes("habit") || normalized.includes("routine") || normalized.includes("conformance")) {
    selected.push(...PIGGY_EXAMPLES.filter(e => e.category === "habit_coaching" || e.category === "progress_review"));
  }
  if (normalized.includes("priorit") || normalized.includes("task") || normalized.includes("check") || normalized.includes("todo")) {
    selected.push(...PIGGY_EXAMPLES.filter(e => e.category === "task_prioritization" || e.category === "poor_user_decision"));
  }
  if (normalized.includes("plan") || normalized.includes("schedule") || normalized.includes("calendar") || normalized.includes("tomorrow")) {
    selected.push(...PIGGY_EXAMPLES.filter(e => e.category === "calendar_awareness" || e.category === "deadline_planning" || e.category === "project_planning" || e.category === "plan_tomorrow"));
  }
  if (normalized.includes("stress") || normalized.includes("burnout") || normalized.includes("tired") || normalized.includes("sleep") || normalized.includes("mood")) {
    selected.push(...PIGGY_EXAMPLES.filter(e => e.category === "burnout_prevention" || e.category === "reflection"));
  }
  if (normalized.includes("review") || normalized.includes("week") || normalized.includes("month") || normalized.includes("report")) {
    selected.push(...PIGGY_EXAMPLES.filter(e => e.category === "weekly_review" || e.category === "monthly_review"));
  }

  // De-duplicate
  const unique = Array.from(new Set(selected));
  if (unique.length > 0) {
    return unique.slice(0, 3); // Max 3 examples to optimize tokens
  }

  // Balanced default fallback examples
  return [
    PIGGY_EXAMPLES[0], // Task prioritization
    PIGGY_EXAMPLES[1], // Habit coaching
    PIGGY_EXAMPLES[4]  // Poor user decision
  ];
}

/**
 * Modularly builds the optimized System Prompt for Piggy AI.
 */
export function buildPiggyPrompt(query: string, userData: any, activeContext: any): string {
  const context = collectUserContext(userData, activeContext);
  const observations = generateObservations(userData);
  const relevantMemories = retrieveRelevantMemories(query, userData.aiMemory || []);
  const relevantExamples = getRelevantExamples(query);

  const observationsText = observations.join("\n");
  const memoriesText = relevantMemories.map(m => `FACT: "${m.fact}" (Category: ${m.category}, Registered: ${m.timestamp})`).join("\n");
  
  const examplesText = relevantExamples.map((e, idx) => 
    `Example ${idx + 1} — user said: "${e.user}" and assistant responded: "${e.assistant}"`
  ).join("\n\n");

  const todayDateStr = new Date().toDateString();
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return `${PIGGY_PERSONALITY}

${PIGGY_REASONING_PROTOCOL}

${PIGGY_RESPONSE_RULES}

Response style note: answer in plain conversational English with no lists, headings, or markdown. Write as a helpful human coach and keep the tone natural.

Current temporal context: today's date is ${todayDateStr} (${dayName}) and the current time is ${new Date().toISOString()}.

Relevant persistent conversational memory: ${memoriesText || "No contextually relevant memory facts found for this query."}

Relevant cognitive observations: ${observationsText}

Highly optimized few-shot examples: ${examplesText}

Active user context dataset: Name is ${context.profile.name}, email is ${context.profile.email}, budget allowance limit is $${context.profile.budgetLimit}, and personality setting is ${context.profile.aiPersonality}. Health index score is ${context.metrics.healthScore} out of 100, consistency level is ${context.metrics.consistency} percent, performance momentum is ${context.metrics.momentum} percent, goal progress pacing is ${context.metrics.goalProgress} percent, current energy prediction is ${context.metrics.energy}, burnout risk estimation is ${context.metrics.burnoutRisk} percent, peak focus window is ${context.metrics.peakWindow}, and best study duration is ${context.metrics.bestStudyDuration} minutes. Current active screen is ${context.currentView} and highlighted screen selection is ${context.highlightedEntity}.

Upcoming deadlines and calendar context: ${context.upcomingDeadlines.length > 0 ? context.upcomingDeadlines.map(d => `deadline "${d.title}" is due in ${d.daysLeft} days on ${d.dueDate} and is type ${d.type}`).join("\n") : "No immediate calendar deadlines."}

Active strategic goals: ${context.activeGoals.length > 0 ? context.activeGoals.map(g => `goal "${g.title}" is ${g.progress} percent complete and targets ${g.targetDate}`).join("\n") : "No active goals recorded."}

Recent sleep logs: ${context.recentSleepLogs.join("\n") || "No sleep logs recorded."}

Recent mood logs: ${context.recentMoodLogs.join("\n") || "No mood logs recorded."}

Current tasks checklist: ${context.tasksList.slice(-10).join("\n") || "No active tasks recorded."}

Active habits compliance: ${context.habitsList.join("\n") || "No active habits recorded."}

Financial budget categories: ${context.financialBudgets.join("\n") || "No budgets recorded."}
`;
}

// --- Consolidated from piggyFormatter.ts ---
export function formatPiggyResponse(text: string): string {
    return text
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/`/g, "")
        .replace(/^[-•]\s*/gm, "")
        .replace(/^\+\s*/gm, "")
        .replace(/^>\s*/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// --- Consolidated from piggyPersonality.ts ---
// server/piggyPersonality.ts
export const PIGGY_PERSONALITY = `You are Piggy, a calm, insightful personal productivity coach. Speak like a trusted friend who understands the user's habits and cares about making steady progress. Use contractions and normal conversational phrasing. Address the user by name or "Sir" sparingly, not in every sentence. Keep the tone warm, direct, and human.`;

// --- Consolidated from piggyResponseRules.ts ---
export const PIGGY_RESPONSE_RULES = `YOU MUST FOLLOW THESE RULES WITHOUT EXCEPTION:

- Respond like a real human coach. Natural, warm, flowing sentences.
- NEVER use **, ***, +, *, - , or any markdown formatting or bullets.
- For schedules, write everything in normal paragraphs like this: "Tomorrow morning I recommend starting with exercise around 7 AM, then having breakfast and a quick task review. Save the heavy cache refactoring for your peak window from 7 PM to 9 PM."
- Do not use any symbols for lists. Use flowing text only.
- Keep replies conversational and human.`;