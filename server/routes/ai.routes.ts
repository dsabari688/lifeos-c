import express from "express";
import OpenAI from "openai";
import { authenticateToken } from "../middleware/auth.js";
import { dbService } from "../db/index.js";
import { GROQ_API_KEY } from "../config/env.js";
import { validateBody } from "../middleware/validate.js";
import { chatSchema } from "../validators/ai.schema.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

// Piggy imports from their new modular paths
import {
  calculateHabitPatterns,
  calculateHabitRisk,
  calculateCorrelations,
  checkAchievements,
  synthesizeAIDashboard,
  getDaysBetween,
  detectUpcomingDeadlines,
  evaluateOutcomeMetrics
} from "../piggy/core/piggyIntelligence.js";
import { buildPiggyPrompt } from "../piggy/conversation/piggyPromptBuilder.js";
import { formatPiggyResponse } from "../piggy/personality/piggyFormatter.js";
import { transitionWorkflowState } from "../piggy/types/piggyWorkflow.js";
import { executeAgentGoal } from "../piggy/execution/piggyExecutor.js";
import { verifyResponse } from "../piggy/safety/piggyVerifier.js";
import { scoreConfidence } from "../piggy/safety/piggyConfidence.js";
import { runRetryLoop } from "../piggy/safety/piggyRetry.js";
import { generateAndSaveReflection } from "../piggy/cognition/piggyReflection.js";
import { parseAndSaveMemoryUpdates } from "../piggy/memory/piggyMemoryUpdater.js";
import { autoTrackGoalProgress } from "../piggy/planning/piggyGoalTracker.js";
import { runThinkingPipeline } from "../piggy/cognition/piggyThinking.js";
import { runAutonomousAgentLoop } from "../piggy/background/piggyAutonomy.js";

const router = express.Router();

// --- GROQ AI INITIALIZATION ---
let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable is required");
    }
    openaiInstance = new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    });
  }
  return openaiInstance;
}

// Helpers local to AI routes
function getPeakHours(userPatterns: any): string {
  if (!userPatterns || !userPatterns.taskCompletionByHour) return "19:00 - 22:00";
  const hours = Object.entries(userPatterns.taskCompletionByHour);
  if (hours.length === 0) return "19:00 - 22:00";
  hours.sort((a: any, b: any) => (b[1] as number) - (a[1] as number));
  const peakHour = parseInt(hours[0][0]);
  return `${peakHour}:00 - ${peakHour + 2}:00`;
}

function getDaysUntilDeadline(dateStr: string): number {
  if (!dateStr) return 99;
  const deadline = new Date(dateStr);
  const diffTime = deadline.getTime() - new Date().getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// --- J.A.R.V.I.S CHAT ---
router.post("/api/jarvis/chat", authenticateToken, aiRateLimiter, validateBody(chatSchema), async (req: any, res: any) => {
  const { message, activeContext } = req.body;

  const startTime = Date.now();
  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);

  console.log(`[PIPELINE START] Processing chat request: "${message}"`);

  // 1. Initial State: Idle -> Thinking
  transitionWorkflowState(userData, "Thinking");

  let retriesCount = 0;
  let toolUsageLogs: any[] = [];
  let verificationTime = 0;
  let reasoningTime = 0;
  let responseConfidence = 100;
  let responseRisk = "low";
  let verificationIssues: string[] = [];

  try {
    // 2. Goal Tracking: Update sub-milestones based on completed tasks or conversational cues
    await autoTrackGoalProgress(message, userData);

    // 3. Execution Engine: Planning & Executing database tool mutations
    const contextSummary = buildPiggyPrompt(message, userData, activeContext);
    const execResult = await executeAgentGoal(message, contextSummary, userData);
    toolUsageLogs = execResult.logs;

    // Build fresh context summary after database changes (so the LLM gets the updated task/goal states)
    const updatedContextSummary = buildPiggyPrompt(message, userData, activeContext);

    // 4. Chat Reasoning Step (Generating response via cognitive assistant pipeline)
    transitionWorkflowState(userData, "Thinking");
    const reasoningStart = Date.now();
    const systemPrompt = buildPiggyPrompt(message, userData, activeContext);

    const thinkingResult = await runThinkingPipeline(
      message,
      updatedContextSummary,
      userData.chatHistory,
      systemPrompt
    );
    let aiText = thinkingResult.reply;
    reasoningTime = Date.now() - reasoningStart;

    // 5. Verification & Confidence Engine
    transitionWorkflowState(userData, "Verifying");
    const verificationStart = Date.now();

    const verifierRes = await verifyResponse(message, aiText, updatedContextSummary);
    const confidenceRes = await scoreConfidence(message, aiText, updatedContextSummary);
    verificationTime = Date.now() - verificationStart;

    verificationIssues = verifierRes.valid ? [] : verifierRes.issues;
    responseConfidence = confidenceRes.confidence;
    responseRisk = confidenceRes.riskLevel;

    // 6. Retry correction loop if verification failed or confidence is below 70%
    if (verificationIssues.length > 0 || responseConfidence < 70) {
      const retryResult = await runRetryLoop(
        systemPrompt,
        userData.chatHistory,
        message,
        updatedContextSummary,
        userData,
        aiText,
        verificationIssues,
        responseConfidence,
        responseRisk as 'low' | 'medium' | 'high'
      );
      aiText = retryResult.reply;
      retriesCount = retryResult.retriesUsed;
      responseConfidence = retryResult.confidence;
      responseRisk = retryResult.riskLevel;
      verificationIssues = retryResult.verificationIssues;
    }

    // 7. Actions: Check if there are any traditional bracket triggers generated in the final response
    const actionRegex = /\[TRIGGER_ACTION:\s*(DELETE_TASK|TOGGLE_TASK|COMPLETE_HABIT)_([a-zA-Z0-9\-]+)\]/;
    const match = aiText.match(actionRegex);
    let actionOutput = null;
    if (match) {
      const type = match[1];
      const id = match[2];
      actionOutput = { type, id };

      if (type === "DELETE_TASK") {
        userData.tasks = userData.tasks.filter((t: any) => t.id !== id);
      } else if (type === "TOGGLE_TASK") {
        const t = userData.tasks.find((task: any) => task.id === id);
        if (t) t.status = t.status === "completed" ? "pending" : "completed";
      } else if (type === "COMPLETE_HABIT") {
        const h = userData.habits.find((habit: any) => habit.id === id);
        if (h) {
          const todayStr = new Date().toISOString().split("T")[0];
          if (!h.logs.includes(todayStr)) {
            h.logs.push(todayStr);
            h.streak += 1;
          }
        }
      }
      aiText = aiText.replace(actionRegex, "").trim();
    }

    // Format Piggy output style (British polite personality formatter)
    aiText = formatPiggyResponse(aiText);

    // Transition state to completed
    transitionWorkflowState(userData, "Completed");

    // 8. Reflection Engine
    await generateAndSaveReflection(message, aiText, toolUsageLogs, retriesCount, userData);

    // 9. Memory Updater (Auto-learn habits, deadlines, goals)
    await parseAndSaveMemoryUpdates(message, aiText, userData);

    // 10. Pipeline Log & Summary metrics
    const executionDuration = Date.now() - startTime;
    console.log(`[PIPELINE COMPLETE]
  - Message: "${message}"
  - Execution Duration: ${executionDuration}ms
  - Reasoning Duration: ${reasoningTime}ms
  - Verification Duration: ${verificationTime}ms
  - Retries: ${retriesCount}
  - Confidence Score: ${responseConfidence}%
  - Risk Level: ${responseRisk}
  - Tools Used: ${toolUsageLogs.map(l => l.tool).join(", ") || "None"}
  - Verification Issues remaining: ${verificationIssues.length}`);

    // Clean up current workflow state to Idle
    transitionWorkflowState(userData, "Idle");

    // Update history
    const userMsg = { id: `chat-${Date.now()}`, role: "user" as const, content: message, timestamp: new Date().toISOString() };
    const assistantMsg = { id: `chat-${Date.now() + 1}`, role: "assistant" as const, content: aiText, timestamp: new Date().toISOString() };
    userData.chatHistory.push(userMsg, assistantMsg);

    if (userData.chatHistory.length > 30) {
      userData.chatHistory = userData.chatHistory.slice(-30);
    }

    // Save DB
    db.userData[req.user.id] = userData;
    dbService.saveDatabaseState(db);

    res.json({
      success: true,
      reply: aiText,
      history: userData.chatHistory,
      actionTriggered: actionOutput,
      metrics: {
        executionDuration,
        reasoningTime,
        verificationTime,
        retries: retriesCount,
        confidence: responseConfidence,
        riskLevel: responseRisk,
        issues: verificationIssues
      }
    });

  } catch (error: any) {
    console.error("Pipeline Error:", error);
    transitionWorkflowState(userData, "Idle");

    let fallbackText = `Indeed, Sir. I am online and stand ready to assist your productivity cockpit. (Simulated Offline Mode)`;
    const userMsg = { id: `chat-${Date.now()}`, role: "user" as const, content: message, timestamp: new Date().toISOString() };
    const assistantMsg = { id: `chat-${Date.now() + 1}`, role: "assistant" as const, content: fallbackText, timestamp: new Date().toISOString() };
    userData.chatHistory.push(userMsg, assistantMsg);
    
    db.userData[req.user.id] = userData;
    dbService.saveDatabaseState(db);
    
    res.json({ success: true, reply: fallbackText, history: userData.chatHistory, simulated: true });
  }
});

// --- SMART PLANNING ENGINE ---
router.post("/api/smart-planner", authenticateToken, async (req: any, res: any) => {
  const { workHours, sleepHours, personalPriorities, exercisePreference } = req.body;
  const userData = dbService.getUserData(req.user.id);

  const deadlines = detectUpcomingDeadlines(userData);
  const deadlinesText = deadlines.map((dl: any) => `- DEADLINE: "${dl.title}" in ${dl.daysLeft} days (Due: ${dl.dueDate}, Type: ${dl.type})`).join("\n");

  const basePrompt = `Generate a detailed, custom-optimized timeline layout for tomorrow's daily plan based on these parameters:
- Core Work/Study Hours: ${workHours || "9 AM to 5 PM"}
- Targeted Sleep Duration: ${sleepHours || "8 hours"}
- Exercise Category Preference: ${exercisePreference || "Morning cardio"}
- Personal Goal Priorities: ${personalPriorities || "Coding, reading articles, financial balance"}
- Upcoming Deadlines / Calendar Context:
${deadlinesText || "No upcoming exams or immediate deadlines."}

Critical Operational planning rules you MUST always adhere to:
1. MAX 4 critical/high-priority cognitive focus sessions allowed in the daily timeline to prevent exhaustion.
2. Respect peak biological productivity hours: schedule heaviest studies or reviews during peak windows (Peak runs ${getPeakHours(userData.userPatterns)}).
3. Protect active daily habits: allocate dedicated space for active routines.
4. Add transition buffer time: always schedule 15 to 30 minutes of Rest or Nourish buffer after any intense Focus sessions.
5. Strict midnight boundary: never schedule any tasks past 24:00.
6. Calendar/Deadline Awareness: If there is an active upcoming deadline or exam (e.g. within 5 days), prioritize study/preparation sessions related to that deadline, pad focus buffers, and schedule lighter or essential-only exercise.

Return response in JSON format matching this schema strictly:
{
  "heading": "string",
  "timeline": [{ "timeSlot": "string", "taskTitle": "string", "category": "string (Focus / Workout / Rest / Nourish / Study)" }],
  "butlerAdvice": "string"
}`;

  try {
    const ai = getOpenAI();
    const response = await ai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: basePrompt }],
      temperature: 0.6,
      response_format: { type: "json_object" }
    });

    const parsedData = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    res.json({ success: true, plan: parsedData });

  } catch (error: any) {
    console.error("Smart Planner Groq Error:", error.message);
    res.json({ success: false, error: "Failed to generate plan." });
  }
});

// --- PREDICTIVE OUTCOMES ---
router.post("/api/predictive-outcomes", authenticateToken, async (req: any, res: any) => {
  const { primaryGoal, timeframeMonths } = req.body;
  if (!primaryGoal) return res.status(400).json({ error: "Goal is required." });

  const userData = dbService.getUserData(req.user.id);
  const currentStreak = Math.max(...userData.habits.map((h: any) => h.streak), 0);
  const tasksCompletedCount = userData.tasks.filter((t: any) => t.status === "completed").length;
  const tasksPendingCount = userData.tasks.filter((t: any) => t.status === "pending").length;
  const skippedCount = userData.tasks.reduce((sum: number, t: any) => sum + (t.rescheduledCount || 0), 0);

  const basePrompt = `Analyze ${req.user.name}'s historical habits to forecast outcomes.
Parameters:
- Goal: "${primaryGoal}"
- Timeframe: ${timeframeMonths || 6} months
- Max habit streak: ${currentStreak} days
- Tasks completed: ${tasksCompletedCount}
- Tasks pending: ${tasksPendingCount}
- Skipped/Rescheduled: ${skippedCount} items

Return response in JSON format matching this schema:
{
  "targetGoal": "string",
  "probabilityPercent": number,
  "timelineForecast": "string",
  "bottlenecks": ["string"],
  "proactiveAdvice": "string"
}`;

  try {
    const ai = getOpenAI();
    const response = await ai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: basePrompt }],
      temperature: 0.6,
      response_format: { type: "json_object" }
    });

    const parsedData = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    res.json({ success: true, forecast: parsedData });

  } catch (error: any) {
    console.error("Predictive Engine Groq Error:", error.message);
    res.json({ success: false, error: "Failed to generate forecast." });
  }
});

// --- J.A.R.V.I.S BRIEF ENDPOINTS ---
router.get("/api/jarvis/daily-brief", authenticateToken, async (req: any, res: any) => {
  const userData = dbService.getUserData(req.user.id);
  const insights = [];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toISOString().split("T")[0];

  userData.habits.forEach((habit: any) => {
    if (!habit.logs?.includes(yDate)) {
      insights.push(`⚠️ You missed "${habit.name}" yesterday — your streak of ${habit.streak} days is at risk.`);
    }
  });

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  if (userData.userPatterns?.streakBreakDays?.includes(today)) {
    insights.push(`📊 Historical pattern detected: You tend to miss habits on ${today}s. Stay vigilant today.`);
  }

  const spent = userData.expenses.reduce((a: any, b: any) => a + b.amount, 0);
  const remaining = userData.profile.budgetLimit - spent;
  if (remaining < userData.profile.budgetLimit * 0.2) {
    insights.push(`💸 Budget alert: Only $${remaining.toFixed(2)} remaining this month (${Math.round(remaining / userData.profile.budgetLimit * 100)}%).`);
  }

  if (userData.goals) {
    userData.goals.forEach((goal: any) => {
      const daysLeft = getDaysUntilDeadline(goal.targetDate);
      if (goal.progress < 30 && daysLeft < 14) {
        insights.push(`🎯 Goal "${goal.title}" is at ${goal.progress}% with only ${daysLeft} days left.`);
      }
    });
  }

  const currentHour = new Date().getHours();
  const peakHours = getPeakHours(userData.userPatterns);
  const peakMatches = peakHours.match(/^(\d+):00/);
  if (peakMatches) {
    const peakStart = parseInt(peakMatches[1]);
    if (currentHour >= peakStart && currentHour <= peakStart + 2) {
      const hardTask = userData.tasks.find((t: any) => t.status === "pending" && t.category === "urgent-important");
      if (hardTask) {
        insights.push(`⚡ You're in your peak focus window right now. Perfect time to tackle "${hardTask.title}".`);
      }
    }
  }

  res.json({ insights, generatedAt: new Date().toISOString() });
});

router.get("/api/jarvis/morning-brief", authenticateToken, async (req: any, res: any) => {
  const userData = dbService.getUserData(req.user.id);

  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const urgentTasks = userData.tasks.filter((t: any) => t.status === "pending" && t.category === "urgent-important");
  const topTask = urgentTasks[0] || userData.tasks.find((t: any) => t.status === "pending") || { title: "No pending tasks logged, Sir." };

  let longestStreakHabit = { name: "Meditation", streak: 0 };
  if (userData.habits.length > 0) {
    const sortedHabits = [...userData.habits].sort((a: any, b: any) => b.streak - a.streak);
    longestStreakHabit = sortedHabits[0];
  }

  const spent = userData.expenses.reduce((a: any, b: any) => a + b.amount, 0);
  const remaining = userData.profile.budgetLimit - spent;
  const budgetPercent = Math.round((spent / userData.profile.budgetLimit) * 100);

  const todayStr = new Date().toISOString().split("T")[0];
  if (!userData.sleepLogs) userData.sleepLogs = [];
  const sleepLog = userData.sleepLogs.find((s: any) => s.date === todayStr);
  const sleepText = sleepLog ? ` You logged ${sleepLog.duration} hours of sleep.` : "";

  const briefText = `Good morning, ${req.user.name}. Today is ${dayName}, ${dateStr}.${sleepText} You have ${urgentTasks.length} urgent tasks on your deck. Your highest priority is "${topTask.title}". Your habit streak for "${longestStreakHabit.name}" is currently at ${longestStreakHabit.streak} days — let's keep it alive today. Your monthly budget is ${budgetPercent}% utilized, with $${remaining.toFixed(2)} remaining. Based on your behavioral patterns, your peak focus window starts at ${getPeakHours(userData.userPatterns).split(" ")[0]}. Shall we build your schedule for today?`;

  res.json({ briefText, generatedAt: new Date().toISOString() });
});

router.get("/api/analytics/weekly-review", authenticateToken, async (req: any, res: any) => {
  const userData = dbService.getUserData(req.user.id);

  // Calculate past 7 days dates
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  // Tasks completed in the past 7 days
  const tasksCompleted = userData.tasks.filter((t: any) => t.status === "completed" && dates.includes(t.date)).length;

  // Tasks skipped (rescheduledCount > 0 and date in past 7 days)
  const tasksSkipped = userData.tasks.filter((t: any) => t.rescheduledCount > 0 && dates.includes(t.date)).length;

  // Habit consistency
  let totalPossible = userData.habits.length * 7;
  let totalDone = 0;
  userData.habits.forEach((h: any) => {
    h.logs.forEach((logDate: string) => {
      if (dates.includes(logDate)) {
        totalDone++;
      }
    });
  });
  const habitConsistency = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 100;

  // Best / worst habits
  let bestHabit = "None";
  let worstHabit = "None";
  if (userData.habits.length > 0) {
    const habitsStats = userData.habits.map((h: any) => {
      const doneCount = h.logs.filter((logDate: string) => dates.includes(logDate)).length;
      return { name: h.name, doneCount };
    });
    // Sort descending for best, ascending for worst
    habitsStats.sort((a: any, b: any) => b.doneCount - a.doneCount);
    bestHabit = habitsStats[0].doneCount > 0 ? habitsStats[0].name : "None";

    // For worst habit, sort ascending
    const habitsStatsAsc = [...habitsStats].sort((a: any, b: any) => a.doneCount - b.doneCount);
    worstHabit = habitsStatsAsc[0].name;
  }

  // Money spent in the past 7 days
  const moneySpent = userData.expenses
    .filter((e: any) => dates.includes(e.date))
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  // Budget status
  const totalLimit = userData.budgets.reduce((sum: number, b: any) => sum + b.limit, 0);
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const totalMonthSpent = userData.expenses
    .filter((e: any) => e.date.substring(0, 7) === currentMonthStr)
    .reduce((sum: number, e: any) => sum + e.amount, 0);
  const budgetStatus = totalMonthSpent > totalLimit ? "Over allowance limit" : `$${(totalLimit - totalMonthSpent).toFixed(2)} remaining allowance`;

  // Goal progress
  const goalProgress = (userData.goals || []).map((g: any) => ({
    title: g.title,
    progress: g.progress,
    status: g.status
  }));

  // Piggy weekly insight via Groq
  let piggyInsight = "Factual metrics compiled, Sir. Piggy notes satisfactory developmental conformance.";
  try {
    const prompt = `Analyze user ${req.user.name}'s weekly productivity and finance metrics:
- Tasks completed: ${tasksCompleted}
- Tasks skipped/rescheduled: ${tasksSkipped}
- Habits consistency: ${habitConsistency}% (Best: "${bestHabit}", Worst: "${worstHabit}")
- Money spent in past 7 days: $${moneySpent.toFixed(2)} (Monthly status: ${budgetStatus})
Provide a concise, elegant, British butler style diagnostic analysis paragraph.
Keep it strictly under 3 sentences. Do not use markdown format.`;

    const ai = getOpenAI();
    const response = await ai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6
    });
    piggyInsight = response.choices?.[0]?.message?.content || piggyInsight;
  } catch (error: any) {
    console.error("Weekly review insight AI error:", error.message);
  }

  res.json({
    tasksCompleted,
    tasksSkipped,
    habitConsistency,
    bestHabit,
    worstHabit,
    moneySpent,
    budgetStatus,
    goalProgress,
    piggyInsight
  });
});

router.post("/api/jarvis/trigger-nudge", authenticateToken, (req: any, res: any) => {
  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);

  // Get today's name (e.g., "Sunday")
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const isRiskDay = userData.userPatterns?.streakBreakDays?.includes(today);

  let nudgesGenerated = 0;

  userData.habits.forEach((habit: any) => {
    // Only protect habits that have an active streak
    if (habit.streak > 2 && isRiskDay) {
      const todayStr = new Date().toISOString().split("T")[0];

      // If the habit hasn't been completed today, trigger the alarm
      if (!habit.logs.includes(todayStr)) {
        const notification = {
          id: `nudge-${Date.now()}-${habit.id}`,
          title: "⚠️ Streak Risk Detected",
          message: `Sir, historical data indicates a high probability of abandoning '${habit.name}' on ${today}s. You have a ${habit.streak}-day streak on the line. Execute immediately to maintain momentum.`,
          timestamp: new Date().toISOString(),
          type: "warning",
          read: false
        };

        // Prevent duplicate nudges for the same habit on the same day
        const alreadyNudged = userData.notifications.some((n: any) => n.id.includes(habit.id) && n.timestamp.startsWith(todayStr));

        if (!alreadyNudged) {
          userData.notifications.unshift(notification);
          nudgesGenerated++;
        }
      }
    }
  });

  if (nudgesGenerated > 0) {
    db.userData[req.user.id] = userData;
    dbService.saveDatabaseState(db);
  }

  res.json({
    success: true,
    nudgesGenerated,
    message: nudgesGenerated > 0 ? `Deployed ${nudgesGenerated} proactive warnings.` : "Operational baseline stable. No risks detected."
  });
});

// --- PIGGY AI ENDPOINTS ---
router.get("/api/piggy/dashboard", authenticateToken, (req: any, res: any) => {
  const cachedData = dbService.getCachedDashboard(req.user.id, () => {
    const db = dbService.getDatabaseState();
    const userData = dbService.getUserData(req.user.id);

    // Calculate dynamic outcomes for accepted recommendations
    evaluateOutcomeMetrics(userData);
    
    db.userData[req.user.id] = userData;
    dbService.saveDatabaseState(db);

    const cockpit = synthesizeAIDashboard(userData);

    const habitsData = userData.habits.map((h: any) => {
      const patterns = calculateHabitPatterns(h, userData.sleepLogs || [], userData.moods || []);
      const risk = calculateHabitRisk(h, userData.sleepLogs || [], userData.moods || [], userData);
      return {
        id: h.id,
        name: h.name,
        icon: h.icon,
        streak: h.streak,
        patterns,
        risk
      };
    });

    const correlations = calculateCorrelations(userData.habits || [], userData.sleepLogs || [], userData.focusSessions || [], userData.tasks || []);
    const achievements = checkAchievements(userData.profile || {}, userData.habits || [], userData.focusSessions || [], userData.expenses || []);
    const deadlines = detectUpcomingDeadlines(userData);

    return {
      success: true,
      cockpit,
      habitsData,
      correlations,
      achievements,
      aiMemory: userData.aiMemory || [],
      recommendationsFeedback: userData.recommendationsFeedback || [],
      monthlySnapshots: userData.monthlySnapshots || [],
      deadlines
    };
  });

  res.json(cachedData);
});

router.get("/api/piggy/coaching", authenticateToken, (req: any, res: any) => {
  const userData = dbService.getUserData(req.user.id);
  const today = new Date();

  const last7DaysLogs = userData.habits.reduce((acc: number, h: any) => {
    const logs7 = h.logs.filter((l: string) => getDaysBetween(l, today) <= 7);
    return acc + logs7.length;
  }, 0);
  const maxPossibleLogs7 = (userData.habits.length * 7) || 1;
  const weeklyCompletionRate = Math.round((last7DaysLogs / maxPossibleLogs7) * 100);

  let bestHabit = "None";
  let highestRate = -1;
  let weakestHabit = "None";
  let lowestRate = 101;

  userData.habits.forEach((h: any) => {
    const rate = (h.logs.filter((l: string) => getDaysBetween(l, today) <= 30).length / 30) * 100;
    if (rate > highestRate) {
      highestRate = rate;
      bestHabit = h.name;
    }
    if (rate < lowestRate) {
      lowestRate = rate;
      weakestHabit = h.name;
    }
  });

  const monthlyTrends = (userData.monthlySnapshots || []).map((m: any) => ({
    month: m.month,
    completion: m.habitConsistency
  }));

  monthlyTrends.push({
    month: "Current (30D)",
    completion: weeklyCompletionRate
  });

  res.json({
    success: true,
    weeklyCoach: {
      completionRate: weeklyCompletionRate,
      bestHabit,
      weakestHabit,
      mostImproved: userData.habits[2]?.name || "Mindfulness Meditation",
      wins: "+15% consistency in reading",
      watchOut: "Sunday morning skip pattern",
      recommendedFocus: "Maintain early morning scheduling"
    },
    monthlyTrends
  });
});

router.get("/api/piggy/reflections", authenticateToken, (req: any, res: any) => {
  res.json({ success: true, reflections: dbService.getReflections(req.user.id) });
});

router.post("/api/piggy/reflection/generate", authenticateToken, async (req: any, res: any) => {
  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);
  const todayStr = new Date().toISOString().split("T")[0];

  if (!userData.reflections) userData.reflections = [];
  const existing = userData.reflections.find((r: any) => r.date === todayStr);
  if (existing) {
    return res.json({ success: true, reflection: existing });
  }

  const completedHabits = userData.habits.filter((h: any) => h.logs.includes(todayStr)).length;
  const totalHabits = userData.habits.length;

  const todaySleep = userData.sleepLogs?.find((s: any) => s.date === todayStr)?.duration || 7.5;
  const todayMood = userData.moods?.find((m: any) => m.createdAt.startsWith(todayStr))?.mood || "good";
  const todayFocusSessions = userData.focusSessions?.filter((s: any) => s.timestamp.startsWith(todayStr)) || [];
  const todayFocusMinutes = todayFocusSessions.reduce((sum: number, s: any) => sum + s.durationMinutes, 0);

  const prompt = `Write a short personal diary entry for today based on these achievements:
- Habits completed: ${completedHabits}/${totalHabits}
- Mood rating: ${todayMood}
- Sleep logged: ${todaySleep} hours
- Focus minutes completed: ${todayFocusMinutes} minutes
Roleplay as Piggy, a sophisticated, factual, and slightly British life butler.
Keep it extremely concise (under 4 sentences), starting with 'Today:' and using elegant language. Do not use any markdown formatting.`;

  let reflectionText = `Today, you completed ${completedHabits} of ${totalHabits} habits with a ${todayMood} cognitive disposition. Focus mode registered ${todayFocusMinutes} active minutes, Sir.`;
  try {
    const ai = getOpenAI();
    const response = await ai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6
    });
    reflectionText = response.choices?.[0]?.message?.content || reflectionText;
  } catch (error: any) {
    console.error("Reflection Generation Error:", error.message);
  }

  const reflection = {
    date: todayStr,
    completedHabitsCount: completedHabits,
    totalHabitsCount: totalHabits,
    mood: todayMood,
    focusMinutes: todayFocusMinutes,
    reflectionText,
    timestamp: new Date().toISOString()
  };

  userData.reflections.push(reflection);
  
  db.userData[req.user.id] = userData;
  dbService.saveDatabaseState(db);

  res.json({ success: true, reflection });
});

router.post("/api/piggy/memory", authenticateToken, (req: any, res: any) => {
  const { fact, category } = req.body;
  if (!fact || !category) return res.status(400).json({ error: "Fact and category are required." });

  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);
  if (!userData.aiMemory) userData.aiMemory = [];

  const newFact = {
    id: `mem-${Date.now()}`,
    fact,
    category,
    timestamp: new Date().toISOString()
  };

  userData.aiMemory.push(newFact);
  
  db.userData[req.user.id] = userData;
  dbService.saveDatabaseState(db);
  
  res.json({ success: true, fact: newFact });
});

router.delete("/api/piggy/memory/:id", authenticateToken, (req: any, res: any) => {
  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);
  if (!userData.aiMemory) userData.aiMemory = [];

  userData.aiMemory = userData.aiMemory.filter((m: any) => m.id !== req.params.id);
  
  db.userData[req.user.id] = userData;
  dbService.saveDatabaseState(db);
  
  res.json({ success: true });
});

router.post("/api/piggy/feedback", authenticateToken, (req: any, res: any) => {
  const { text, type, status, habitId } = req.body;
  if (!text || !status) return res.status(400).json({ error: "Text and status are required." });

  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);
  if (!userData.recommendationsFeedback) userData.recommendationsFeedback = [];

  let baseline = 50;
  if (habitId) {
    const habit = userData.habits.find((h: any) => h.id === habitId);
    if (habit) {
      const patterns = calculateHabitPatterns(habit, userData.sleepLogs || [], userData.moods || []);
      baseline = patterns.overallCompletion;
    }
  }

  const newFeedback = {
    id: `feed-${Date.now()}`,
    text,
    type: type || "habit_timing",
    status,
    timestamp: new Date().toISOString(),
    baselineRateBefore: baseline,
    habitId: habitId || undefined
  };

  userData.recommendationsFeedback.push(newFeedback);
  
  db.userData[req.user.id] = userData;
  dbService.saveDatabaseState(db);
  
  res.json({ success: true, feedback: newFeedback });
});

router.post("/api/agent/autonomous-loop", authenticateToken, async (req: any, res: any) => {
  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);
  const observation = await runAutonomousAgentLoop(userData);
  
  db.userData[req.user.id] = userData;
  dbService.saveDatabaseState(db);
  
  res.json({ success: true, observation });
});

export default router;
