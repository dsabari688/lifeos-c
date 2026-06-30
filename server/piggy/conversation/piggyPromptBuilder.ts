// Piggy AI v4.0 — Modular Prompt Builder Module
import { PIGGY_PERSONALITY } from "../personality/piggyPersonality.js";
import { PIGGY_RESPONSE_RULES } from "../personality/piggyResponseRules.js";
import { PIGGY_EXAMPLES, FewShotExample } from "./piggyExamples.js";
import { generateObservations } from "./piggyInsights.js";
import { collectUserContext } from "../core/piggyContext.js";
import { PIGGY_REASONING_PROTOCOL } from "../cognition/piggyReasoning.js";
import { retrieveRelevantMemories } from "../memory/piggyMemory.js";

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
