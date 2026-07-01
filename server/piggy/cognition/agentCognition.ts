import { processEvent } from "../personality/agentPersonality.js";
import { queryGroq } from "../core/piggyClient.js";
import { optimizePlan, runPlanningEngine } from "../planning/agentPlanning.js";
import { OpportunityFactor, runOpportunityEngine, runPredictiveAnalytics, PriorityEvaluation, runPriorityEngine, ScenarioAnalysis, runScenarioEngine } from "../prediction/agentPrediction.js";
import { RiskFactor, runRiskEngine } from "../safety/agentSafety.js";
import { ExecutionPlan, ReasoningResult, Recommendation, transitionWorkflowState } from "../types/agentTypes.js";

// --- Consolidated from piggyDecisionEngine.ts ---

export type AgentDecision =
  | 'Answer'
  | 'Ask question'
  | 'Recommend'
  | 'Create task'
  | 'Schedule'
  | 'Reminder'
  | 'Warn'
  | 'Do nothing';

export interface DecisionResult {
  decision: AgentDecision;
  reason: string;
  confidence: number; // 0.0 to 1.0
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

/**
 * Evaluates context and reasoning to select the most appropriate strategy action.
 */
export async function runDecisionEngine(
  userQuery: string,
  reasoningSummary: string,
  contextSummary: string
): Promise<DecisionResult> {
  const prompt = `You are the Piggy AI Strategic Decision Engine.
Given the user's message, current cognitive reasoning summary, and context, choose the primary strategic action to take.

Possible Strategic Actions:
- "Answer": Direct informational answer to a clear query
- "Ask question": Request missing details or clarify ambiguous requests
- "Recommend": Propose tasks, habits, schedules, budgets, or goal changes
- "Create task": Propose adding tasks to the checklist
- "Schedule": Propose calendar scheduling adjustments
- "Reminder": Suggest setting a critical alert
- "Warn": Flag high-risk actions, burnout, or budget overruns
- "Do nothing": Acknowledge statement without action

User Message: "${userQuery}"
Reasoning Summary: "${reasoningSummary}"
Context:
${contextSummary}

Return a JSON object:
{
  "decision": "Answer" | "Ask question" | "Recommend" | "Create task" | "Schedule" | "Reminder" | "Warn" | "Do nothing",
  "reason": "Detailed reason why this action is selected",
  "confidence": 0.0 to 1.0,
  "priority": "Critical" | "High" | "Medium" | "Low"
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Decision Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    return {
      decision: result.decision || "Answer",
      reason: result.reason || "Standard default assistant reply.",
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.9,
      priority: result.priority || "Medium"
    };
  } catch (error) {
    console.error("[DECISION ENGINE] Error executing decision logic:", error);
    return {
      decision: "Answer",
      reason: "Fallback decision handler invoked due to service interruption.",
      confidence: 0.8,
      priority: "Medium"
    };
  }
}

// --- Consolidated from piggyDecisionLoop.ts ---

/**
 * Reviews compiled observations and fires corresponding automated reactions.
 */
export async function evaluateObservationsAndAct(
  userData: any,
  observation: ObservationSummary
): Promise<void> {
  console.log("[DECISION LOOP] Scanning observations for reactive event triggers...");

  // 1. React to high burnout risk
  if (observation.burnoutProbability > 75) {
    await processEvent("poor_sleep", { duration: 5.5 }, userData);
  }

  // 2. React to budget risks
  if (observation.budgetOverflowProbability > 80) {
    await processEvent("budget_exceeded", { category: "general" }, userData);
  }

  // 3. React to low mood/energy
  if (userData.moods && userData.moods.length > 0) {
    const lastMood = userData.moods[userData.moods.length - 1];
    if (lastMood.mood === "stressed" || lastMood.mood === "😞") {
      await processEvent("low_mood", {}, userData);
    }
  }

  console.log("[DECISION LOOP] Finished processing observations reaction rules.");
}

// --- Consolidated from piggyLearning.ts ---
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

// --- Consolidated from piggyObservation.ts ---

export interface ObservationSummary {
  burnoutProbability: number;
  budgetOverflowProbability: number;
  deadlineFailureProbability: number;
  pendingTaskCount: number;
  activeGoalCount: number;
  warningsCount: number;
  observations: string[];
}

/**
 * Scans the database state to compile alerts, risks, opportunities, and pending tasks.
 */
export function observeUserData(userData: any): ObservationSummary {
  const predictions = runPredictiveAnalytics(userData);
  const patterns = discoverBehavioralPatterns(userData);
  const tasks = userData.tasks || [];
  const goals = userData.goals || [];

  const pendingTaskCount = tasks.filter((t: any) => t.status === "pending").length;
  const activeGoalCount = goals.filter((g: any) => g.status === "active").length;

  const observations: string[] = [];

  if (predictions.burnoutProbability > 65) {
    observations.push(`Burnout warning: telemetry indicates elevated risk levels of ${predictions.burnoutProbability}%.`);
  }
  if (predictions.budgetOverflowProbability > 75) {
    observations.push(`Budget overrun risk: projected monthly spend is pacing near limits (Probability: ${predictions.budgetOverflowProbability}%).`);
  }
  if (predictions.deadlineFailureProbability > 50) {
    observations.push(`Task congestion warning: upcoming task deadlines are congested (Congestion index: ${predictions.deadlineFailureProbability}%).`);
  }

  patterns.forEach(pat => {
    if (pat.significance === 'high') {
      observations.push(`Observation: "${pat.description}" detected based on historical compliance. Details: ${pat.evidence}`);
    }
  });

  return {
    burnoutProbability: predictions.burnoutProbability,
    budgetOverflowProbability: predictions.budgetOverflowProbability,
    deadlineFailureProbability: predictions.deadlineFailureProbability,
    pendingTaskCount,
    activeGoalCount,
    warningsCount: observations.length,
    observations
  };
}

// --- Consolidated from piggyPatternDiscovery.ts ---
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

// --- Consolidated from piggyReasoning.ts ---

// Keep legacy protocol string constant for prompt builder compatibility
export const PIGGY_REASONING_PROTOCOL = `AI Internal Reasoning Protocol:
Before drafting your final response to the user, you MUST internally run through the following cognitive reasoning checkpoints. You do not need to print these checkpoints in your output unless the user explicitly requests to "show your reasoning" or "explain your thinking".

1. Query Interpretation: Analyze the user's input. Identify the underlying emotional state (stressed, motivated, casual) and intent.
2. Intent Decoupling: Determine what the user actually needs (e.g. scheduling adjustments, motivation, task reorganization) versus what they are explicitly requesting.
3. Memory Uplink: Query your relevant memory vault. Check if there are weeks-old constraints, preferences, or goals that impact this specific conversation.
4. Analytics Scan: Retrieve the user's current metrics (burnout risk, focus averages, sleep, mood).
5. Adaptive Loop Review: Assess whether the user has ignored or accepted recommendations in this category before.
6. Outcome ROI Audit: Check if similar actions previously improved consistency, and recall the ROI percentage.
7. Calendar Constraint Check: Identify any immediate deadlines or exams in the next 3 to 5 days.
8. Plan Optimality Evaluation: Determine if the user's current course of action is optimal given their temporal context and cognitive metrics.
9. Refutation & Challenge: If the plan is suboptimal, formulate a polite but firm direct challenge explaining the exact bottleneck.
10. Synthesis: Formulate a better, highly customized alternative action plan (such as rescheduling, skipping non-essentials, or buffer padding).
11. Telemetry Verification: Ground your recommended solution with clear, historical telemetry evidence (e.g. sleep duration correlations or morning vs evening completion ratios).`;

/**
 * Executes a deep reasoning session to evaluate WHY the user is asking.
 * Output includes Goal, Facts, Unknowns, Assumptions, Risks, Constraints,
 * Solutions, Confidence, and Reasoning Trace.
 */
export async function runReasoningEngine(
  userQuery: string,
  contextSummary: string
): Promise<ReasoningResult> {
  const prompt = `You are the Piggy AI Reasoning Engine.
Analyze the user request and user database context to formulate a structured reasoning profile.
Identify the objectives, constraints, risks, assumptions, and choose the best strategy.

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object matching this schema:
{
  "goal": "Core objective the user wants to achieve",
  "facts": ["Verified facts known from context"],
  "unknowns": ["Details currently unknown or missing"],
  "assumptions": ["Assumptions made to facilitate reasoning"],
  "risks": ["Potential risks or failure conditions"],
  "constraints": ["Schedule, sleep, work, or budget constraints"],
  "possibleSolutions": ["Alternative solutions evaluated"],
  "confidence": 0.0 to 1.0 (contextual confidence level),
  "chosenSolution": "The selected strategy for execution",
  "reasoningTrace": ["Step-by-step trace of how this solution was decided"]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const rawResult = await queryGroq([
      { role: "system", content: "You are the Piggy AI Reasoning Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(rawResult);
    return {
      goal: result.goal || "Assist productivity cockpit",
      facts: Array.isArray(result.facts) ? result.facts : [],
      unknowns: Array.isArray(result.unknowns) ? result.unknowns : [],
      assumptions: Array.isArray(result.assumptions) ? result.assumptions : [],
      risks: Array.isArray(result.risks) ? result.risks : [],
      constraints: Array.isArray(result.constraints) ? result.constraints : [],
      possibleSolutions: Array.isArray(result.possibleSolutions) ? result.possibleSolutions : [],
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.85,
      chosenSolution: result.chosenSolution || "Conversational response",
      reasoningTrace: Array.isArray(result.reasoningTrace) ? result.reasoningTrace : ["Query interpreted."]
    };
  } catch (error) {
    console.error("[REASONING ENGINE] Error running reasoning:", error);
    return {
      goal: "Assist productivity cockpit",
      facts: ["User submitted a request"],
      unknowns: [],
      assumptions: [],
      risks: [],
      constraints: [],
      possibleSolutions: ["Direct chat response"],
      confidence: 0.8,
      chosenSolution: "Direct chat response",
      reasoningTrace: ["Cognitive fallback initialized."]
    };
  }
}

// --- Consolidated from piggyRecommendation.ts ---

/**
 * Evaluates context telemetry to generate proactive, explainable recommendations.
 */
export async function runRecommendationEngine(
  userQuery: string,
  contextSummary: string
): Promise<Recommendation[]> {
  const prompt = `You are the Piggy AI Recommendation Engine.
Scan the user request and user database context to formulate proactive recommendations.
Every recommendation must explain the WHY (Explainable AI) and follow the Smart Response style (data-backed).

User Query: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object containing the recommendations list:
{
  "recommendations": [
    {
      "id": "rec-1",
      "type": "schedule",
      "recommendation": "Execute coding session between 8:00 AM and 10:00 AM",
      "reason": "Your sleep average was 7.5 hours and your historical morning completion index is highest before 11 AM.",
      "benefit": "Saves 30 minutes of drag and capitalizes on your peak morning energy window.",
      "risk": "Minimal risk, but can conflict if early morning alerts interrupt sleep.",
      "confidence": 90,
      "priority": "High" | "Critical" | "Medium" | "Low",
      "smartResponse": "I recommend executing your coding tasks tomorrow between 8 AM and 10 AM because your morning focus efficiency score is 25% higher compared to evening slots."
    }
  ]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Recommendation Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && Array.isArray(result.recommendations)) {
      return result.recommendations;
    }
    return [];
  } catch (error) {
    console.error("[RECOMMENDATION ENGINE] Error running recommendations:", error);
    return [];
  }
}

// --- Consolidated from piggyReflection.ts ---

export interface ReflectionRecord {
  id: string;
  date: string;
  whatWorked: string;
  whatFailed: string;
  mistakes: string[];
  corrections: string[];
  futureImprovements: string;
  timestamp: string;
}

/**
 * Reviews the completed thinking/execution session and appends a reflection record
 * into the database (userData.reflections).
 */
export async function generateAndSaveReflection(
  userQuery: string,
  finalResponse: string,
  executionLogs: any[],
  retryCount: number,
  userData: any
): Promise<void> {
  transitionWorkflowState(userData, 'Reflecting');

  const executionLogsStr = JSON.stringify(executionLogs, null, 2);
  const prompt = `Analyze the reasoning and execution session for the user query.
Determine what was successful, what failed, any mistakes that occurred (including those resolved during retries), corrections made, and plans for future improvement.

User Query: "${userQuery}"
Final Response: "${finalResponse}"
Tool Execution Logs:
${executionLogsStr}
Retries Executed: ${retryCount}

Return a JSON object containing:
- "whatWorked": string (description of successful aspects)
- "whatFailed": string (description of failures, or "None")
- "mistakes": string[] (list of errors, false starts, or retried items)
- "corrections": string[] (how these errors were fixed)
- "futureImprovements": string (actionable advice for future runs, e.g., "Prioritize sleep constraints before planning")

Output strictly JSON. Do not include markdown other than the JSON object.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Reflection Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    const todayStr = new Date().toISOString().split("T")[0];

    const reflection: ReflectionRecord = {
      id: `refl-${Date.now()}`,
      date: todayStr,
      whatWorked: result.whatWorked || "Session completed successfully.",
      whatFailed: result.whatFailed || "None",
      mistakes: Array.isArray(result.mistakes) ? result.mistakes : [],
      corrections: Array.isArray(result.corrections) ? result.corrections : [],
      futureImprovements: result.futureImprovements || "No specific improvements identified.",
      timestamp: new Date().toISOString()
    };

    if (!userData.reflections) {
      userData.reflections = [];
    }

    userData.reflections.push(reflection);

    // Keep reflections history bounded (last 30)
    if (userData.reflections.length > 30) {
      userData.reflections = userData.reflections.slice(-30);
    }

    console.log("[REFLECTION ENGINE] Post-session reflection recorded.");
  } catch (error) {
    console.error("[REFLECTION ENGINE] Error generating reflection:", error);
  }
}

export interface WorkflowReflection {
  id: string;
  goal: string;
  plan: string;
  execution: string;
  mistakes: string[];
  success: boolean;
  improvements: string;
  timestamp: string;
}

/**
 * Persists high-level tool workflow execution reflections to the database context.
 */
export function saveWorkflowReflection(
  userData: any,
  reflection: Omit<WorkflowReflection, 'id' | 'timestamp'>
): void {
  if (!userData.workflowReflections) {
    userData.workflowReflections = [];
  }
  const record: WorkflowReflection = {
    id: `wf-refl-${Date.now()}`,
    ...reflection,
    timestamp: new Date().toISOString()
  };
  userData.workflowReflections.push(record);

  if (userData.workflowReflections.length > 50) {
    userData.workflowReflections = userData.workflowReflections.slice(-50);
  }
  console.log(`[REFLECTION ENGINE] Saved workflow reflection for goal: "${reflection.goal}"`);
}

// --- Consolidated from piggyResultEvaluator.ts ---
export interface ToolEvaluationResult {
  expectedResult: string;
  actualResult: string;
  difference: string | null;
  qualityScore: number; // 0 to 100
}

/**
 * Evaluates a tool's actual execution result against the expected outcome.
 * Returns a quality score and details of any discrepancies.
 */
export function evaluateToolCall(
  toolName: string,
  args: any,
  expectedResult: string,
  actualResult: any
): ToolEvaluationResult {
  const actualStr = JSON.stringify(actualResult);
  const expectedNormalized = expectedResult.toLowerCase();
  const actualNormalized = actualStr.toLowerCase();

  let difference: string | null = null;
  let qualityScore = 100;

  // Perform specific validations based on the tool executed
  if (toolName === "createTask") {
    const title = args.title ? args.title.toLowerCase() : "";
    if (title && !actualNormalized.includes(title)) {
      difference = `Expected task "${args.title}" to be created, but it was not found in database state.`;
      qualityScore = 0;
    }
  } else if (toolName === "updateTaskStatus") {
    const expectedStatus = args.status ? args.status.toLowerCase() : "";
    if (expectedStatus && !actualNormalized.includes(expectedStatus)) {
      difference = `Expected task status to be updated to "${args.status}", but status was not matched.`;
      qualityScore = 30;
    }
  } else if (toolName === "deleteTask") {
    if (actualResult.deleted === false) {
      difference = `Expected task with ID "${args.id}" to be deleted, but task still exists.`;
      qualityScore = 0;
    }
  } else if (toolName === "createGoal") {
    const title = args.title ? args.title.toLowerCase() : "";
    if (title && !actualNormalized.includes(title)) {
      difference = `Expected goal "${args.title}" to be created, but goal was missing.`;
      qualityScore = 10;
    }
  } else if (toolName === "updateGoalProgress") {
    if (actualResult.progress !== args.progress) {
      difference = `Expected goal progress to be ${args.progress}%, but got ${actualResult.progress}%.`;
      qualityScore = 50;
    }
  } else if (toolName === "createHabit") {
    const name = args.name ? args.name.toLowerCase() : "";
    if (name && !actualNormalized.includes(name)) {
      difference = `Expected habit "${args.name}" to be created, but it was not registered.`;
      qualityScore = 0;
    }
  } else if (toolName === "logHabit") {
    if (!actualResult.logged) {
      difference = `Expected habit logs to include date "${args.date}", but log registration was not found.`;
      qualityScore = 20;
    }
  } else if (toolName === "addExpense") {
    const amount = args.amount;
    if (amount && actualResult.amount !== amount) {
      difference = `Expected expense amount to be ${amount}, but got ${actualResult.amount}.`;
      qualityScore = 40;
    }
  }

  // Generic keyword match check for safety
  if (!difference && expectedNormalized && expectedNormalized !== "any") {
    const expectedWords = expectedNormalized.split(/\s+/).filter(w => w.length > 3);
    if (expectedWords.length > 0) {
      const matchCount = expectedWords.filter(word => actualNormalized.includes(word)).length;
      const ratio = matchCount / expectedWords.length;
      if (ratio < 0.5) {
        difference = `Actual result did not match the expected keywords. Expected: "${expectedResult}"`;
        qualityScore = Math.round(ratio * 100);
      }
    }
  }

  return {
    expectedResult,
    actualResult: actualStr,
    difference,
    qualityScore
  };
}

// --- Consolidated from piggyThinking.ts ---

export interface ThinkingSession {
  reasoning: ReasoningResult;
  decision: DecisionResult;
  priority: PriorityEvaluation;
  risks: RiskFactor[];
  opportunities: OpportunityFactor[];
  plan: ExecutionPlan | null;
  scenarios: ScenarioAnalysis | null;
  recommendations: Recommendation[];
}

/**
 * Orchestrates the cognitive thinking pipeline:
 * User Query -> Reasoning -> Decision -> Priority -> Risks -> Opportunities -> Planning -> Scenarios -> Recommendations -> Final Strategic Response
 */
export async function runThinkingPipeline(
  userQuery: string,
  contextSummary: string,
  chatHistory: any[],
  baseSystemPrompt: string
): Promise<{ reply: string; session: ThinkingSession }> {
  console.log("[THINKING ENGINE] Initializing strategic pipeline...");

  // 1. Run Reasoning Engine
  const reasoning = await runReasoningEngine(userQuery, contextSummary);

  // 2. Run Decision Engine
  const decision = await runDecisionEngine(userQuery, reasoning.chosenSolution, contextSummary);

  // 3. Run Priority Engine
  const priority = await runPriorityEngine(userQuery, contextSummary);

  // 4. Run Risk Engine
  const risks = await runRiskEngine(userQuery, contextSummary);

  // 5. Run Opportunity Engine
  const opportunities = await runOpportunityEngine(userQuery, contextSummary);

  // 6. Run Planning Engine
  let plan = await runPlanningEngine(userQuery, contextSummary);
  let scenarios: ScenarioAnalysis | null = null;

  if (plan) {
    console.log("[THINKING ENGINE] Planning engine generated a plan. Optimizing steps...");
    plan = await optimizePlan(plan, contextSummary);
    
    console.log("[THINKING ENGINE] Simulating scenarios for the plan...");
    scenarios = await runScenarioEngine(userQuery, plan.goal, contextSummary);
  }

  // 7. Run Recommendation Engine
  const recommendations = await runRecommendationEngine(userQuery, contextSummary);

  const session: ThinkingSession = {
    reasoning,
    decision,
    priority,
    risks,
    opportunities,
    plan,
    scenarios,
    recommendations
  };

  // 8. Generate final strategic, explained response backed by all engines
  const thinkingInsightsText = `
### EXECUTIVE ASSISTANT COGNITIVE INSIGHTS:
- Goal Identified: ${reasoning.goal}
- Facts: ${reasoning.facts.join(", ") || "None"}
- Unknowns: ${reasoning.unknowns.join(", ") || "None"}
- Assumptions: ${reasoning.assumptions.join(", ") || "None"}
- Strategic Chosen Solution: ${reasoning.chosenSolution} (Confidence: ${Math.round(reasoning.confidence * 100)}%)
- Priority Grade: ${priority.priority} (Mental load impact: ${priority.breakdown.mentalLoad}/10)
- Highlighted Risks:
${risks.map(r => `  * [${r.risk} (Prob: ${r.probability}%)]: ${r.reason} | Mitigation: ${r.suggestedMitigation}`).join("\n") || "  * None"}
- Highlighted Opportunities:
${opportunities.map(o => `  * [${o.opportunity}]: Benefit: ${o.benefit} | Detail: ${o.estimatedBenefit}`).join("\n") || "  * None"}
${plan ? `
- Optimized Actions Plan: "${plan.goal}"
${plan.steps.map(s => `  Step ${s.executionOrder}: ${s.args.title || s.action} (${s.toolId}) - depends on [${s.dependencies.join(", ") || "none"}]`).join("\n")}
- Scenario Projections:
  * Best Case: ${scenarios?.bestCase.outcome} (Likelihood: ${scenarios?.bestCase.likelihood})
  * Worst Case: ${scenarios?.worstCase.outcome} (Likelihood: ${scenarios?.worstCase.likelihood}) | Recovery: ${scenarios?.recoveryPlan.join(", ")}
` : ""}
- Proactive Strategic Recommendations:
${recommendations.map(rec => `  * [${rec.type}]: ${rec.recommendation} | Smart explanation: ${rec.smartResponse}`).join("\n") || "  * None"}
`;

  console.log("[THINKING ENGINE] Strategic insights formulated. Generating final response prompt.");

  const responsePrompt = `You are Piggy, a sophisticated, factual, and slightly British strategic life executive assistant.
You MUST respond as a strategic helper, not a basic chat interface.
Leverage the calculated cognitive insights below to form your reply.
Explain the WHY behind your recommendations and frame scheduling advice in the Smart Response style (supported by data, energy windows, or completion ratios).

Calculated Cognitive Insights for current turn:
${thinkingInsightsText}

Response Guidelines:
- Answer in plain conversational English. Keep your tone natural, professional, and supportive.
- Avoid listing raw markdown JSON outputs directly, but incorporate the plan, risks, and recommendations gracefully.
- Do not output bulleted lists or headings in your response. Formulate your answer as a cohesive, helpful coaching paragraph.`;

  const finalReply = await queryGroq([
    { role: "system", content: baseSystemPrompt },
    ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
    { role: "user", content: userQuery },
    { role: "system", content: responsePrompt }
  ], 0.6);

  return {
    reply: finalReply,
    session
  };
}