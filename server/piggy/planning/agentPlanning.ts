import { queryGroq } from "../core/piggyClient.js";
import { Action, ExecutionPlan } from "../types/agentTypes.js";

// --- Consolidated from piggyGoalTracker.ts ---

export interface GoalSubtask {
  id: string;
  title: string;
  status: 'pending' | 'completed';
}

/**
 * Automatically maps long-term goals into sub-milestones and tracks their completion
 * status based on completed tasks or conversational signals in the user query.
 */
export async function autoTrackGoalProgress(
  userQuery: string,
  userData: any
): Promise<void> {
  const goals = userData.goals || [];
  const activeGoals = goals.filter((g: any) => g.status === "active");

  if (activeGoals.length === 0) return;

  for (const goal of activeGoals) {
    // 1. Initialize subtask breakdown if not already defined
    if (!goal.subtasks || goal.subtasks.length === 0) {
      console.log(`[GOAL TRACKER] Breaking down new active goal: "${goal.title}"`);
      const breakdownPrompt = `Break down this long-term goal into 4 to 6 specific, actionable milestones or sub-components.
Goal: "${goal.title}"
Description: "${goal.description || ""}"

Return a JSON object containing:
{
  "subtasks": [
    { "title": "Milestone title" }
  ]
}

Format strictly as JSON. Output only the JSON block.`;

      try {
        const rawBreakdown = await queryGroq([
          { role: "system", content: "You are the Piggy AI Goal Breakdown Assistant. Output strictly JSON." },
          { role: "user", content: breakdownPrompt }
        ], 0.1, true);

        const parsed = JSON.parse(rawBreakdown);
        if (parsed && Array.isArray(parsed.subtasks)) {
          goal.subtasks = parsed.subtasks.map((st: any, idx: number) => ({
            id: `st-${Date.now()}-${idx}`,
            title: st.title,
            status: 'pending'
          }));
        }
      } catch (err) {
        console.error(`[GOAL TRACKER] Error breaking down goal "${goal.title}":`, err);
        continue;
      }
    }

    // 2. Scan completed tasks in checklist to find matches
    const completedTasks = (userData.tasks || []).filter((t: any) => t.status === "completed");
    let progressChanged = false;

    if (goal.subtasks && goal.subtasks.length > 0) {
      for (const subtask of goal.subtasks) {
        if (subtask.status === "pending") {
          const matchedTask = completedTasks.find((t: any) =>
            t.title.toLowerCase().includes(subtask.title.toLowerCase()) ||
            subtask.title.toLowerCase().includes(t.title.toLowerCase())
          );

          if (matchedTask) {
            subtask.status = "completed";
            progressChanged = true;
            console.log(`[GOAL TRACKER] Subtask marked completed via task match: "${subtask.title}"`);
          }
        }
      }
    }

    // 3. Perform semantic lookup on the user query to detect completions
    if (!progressChanged && userQuery && goal.subtasks && goal.subtasks.length > 0) {
      const semanticCheckPrompt = `Check if the user claims to have completed any of these goal subtasks.
Goal: "${goal.title}"
User Message: "${userQuery}"
Subtasks Checklist:
${goal.subtasks.map((st: any) => `- [${st.status}] ${st.title} (ID: ${st.id})`).join("\n")}

If any subtasks were completed, list their IDs in the array. If none, return an empty array.
Return a JSON object containing:
{
  "completedSubtaskIds": ["st-id-1"]
}

Format strictly as JSON. Output only the JSON block.`;

      try {
        const checkRaw = await queryGroq([
          { role: "system", content: "You are the Piggy AI Semantic Goal Tracker. Output strictly JSON." },
          { role: "user", content: semanticCheckPrompt }
        ], 0.1, true);

        const checkRes = JSON.parse(checkRaw);
        if (checkRes && Array.isArray(checkRes.completedSubtaskIds)) {
          for (const id of checkRes.completedSubtaskIds) {
            const sub = goal.subtasks.find((st: any) => st.id === id);
            if (sub && sub.status === "pending") {
              sub.status = "completed";
              progressChanged = true;
              console.log(`[GOAL TRACKER] Subtask marked completed semantically: "${sub.title}"`);
            }
          }
        }
      } catch (err) {
        console.error(`[GOAL TRACKER] Semantic check error for goal "${goal.title}":`, err);
      }
    }

    // 4. Update the goal progress rate
    if (goal.subtasks && goal.subtasks.length > 0) {
      const total = goal.subtasks.length;
      const completed = goal.subtasks.filter((st: any) => st.status === "completed").length;
      const calculatedProgress = Math.round((completed / total) * 100);

      if (goal.progress !== calculatedProgress) {
        goal.progress = calculatedProgress;
        if (calculatedProgress >= 100) {
          goal.status = "completed";
        }
        console.log(`[GOAL TRACKER] Progress for goal "${goal.title}" set to ${calculatedProgress}%`);
      }
    }
  }
}

// --- Consolidated from piggyLongTermGoals.ts ---
export interface LongTermProject {
  id: string;
  title: string;
  goalId: string;
  milestones: { id: string; name: string; completed: boolean }[];
  status: 'active' | 'completed' | 'on_hold';
}

/**
 * Initializes and updates user projects linked to strategic goals.
 */
export function updateLongTermGoals(userData: any): void {
  if (!userData.projects) {
    userData.projects = [];
  }

  const goals = userData.goals || [];
  const tasks = userData.tasks || [];

  goals.forEach((goal: any) => {
    let project = userData.projects.find((p: any) => p.goalId === goal.id);

    if (!project) {
      // Create project node linked to goal
      project = {
        id: `proj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `${goal.title} Project Roadmap`,
        goalId: goal.id,
        milestones: [
          { id: `ms-1-${Date.now()}`, name: "Setup Phase", completed: false },
          { id: `ms-2-${Date.now()}`, name: "Development Milestone", completed: false },
          { id: `ms-3-${Date.now()}`, name: "Final Release Verification", completed: false }
        ],
        status: goal.status === "completed" ? "completed" : "active"
      };
      userData.projects.push(project);
    }

    // Update project status if goal is completed
    if (goal.status === "completed") {
      project.status = "completed";
      project.milestones.forEach((m: any) => m.completed = true);
    }
  });
}

// --- Consolidated from piggyMissionManager.ts ---

export interface Mission {
  id: string;
  title: string;
  objective: string;
  progress: number;            // 0 to 100
  dependencies: string[];      // mission/task IDs
  nextActions: string[];       // immediate actions
  riskScore: number;           // 0 to 100
  completionPrediction: string;// target completion date
}

/**
 * Proactively initializes or updates the status of active long-running missions.
 */
export async function updateActiveMissions(userData: any): Promise<void> {
  if (!userData.missions) {
    // Seed default missions representing long-term targets
    userData.missions = [
      {
        id: "mission-react",
        title: "Learn React & TS Architecture",
        objective: "Build front-end user cockpit screens using modular design systems.",
        progress: 35,
        dependencies: [],
        nextActions: ["Complete dashboard widgets task", "Refactor settings view"],
        riskScore: 20,
        completionPrediction: "2026-07-20"
      },
      {
        id: "mission-budget",
        title: "Save Money & Capital Audit",
        objective: "Manage expenses, audit impulsive spending patterns, and stay within limits.",
        progress: 60,
        dependencies: [],
        nextActions: ["Clear subscription expenses", "Review budget categories limits"],
        riskScore: 45,
        completionPrediction: "2026-07-15"
      }
    ];
  }

  const tasks = userData.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.status === "completed");

  for (const mission of userData.missions) {
    // Calculate progress based on tasks supporting this mission title keywords
    const keywords = mission.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
    const relatedTasks = tasks.filter((t: any) =>
      keywords.some((k: string) => t.title.toLowerCase().includes(k))
    );

    if (relatedTasks.length > 0) {
      const completedRelated = relatedTasks.filter((t: any) => t.status === "completed").length;
      mission.progress = Math.round((completedRelated / relatedTasks.length) * 100);
    }

    // Dynamic Risk Score calculation based on user burnout and budget warnings
    let riskScore = 15;
    const isBudgetMission = mission.title.toLowerCase().includes("save") || mission.title.toLowerCase().includes("budget");
    if (isBudgetMission) {
      const expenses = userData.expenses || [];
      const totalSpent = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
      const budgetLimit = userData.profile?.budgetLimit || 1200;
      if (totalSpent > budgetLimit * 0.8) {
        riskScore += 50;
      }
    }

    // Calculate prediction completed date
    if (mission.progress < 100 && relatedTasks.length > 0) {
      const daysElapsed = 15; // mock
      const rate = mission.progress / Math.max(1, daysElapsed);
      const remainingDays = Math.ceil((100 - mission.progress) / Math.max(0.01, rate));
      const estCompletion = new Date();
      estCompletion.setDate(estCompletion.getDate() + remainingDays);
      mission.completionPrediction = estCompletion.toISOString().split("T")[0];
    } else if (mission.progress >= 100) {
      mission.completionPrediction = new Date().toISOString().split("T")[0];
    }

    mission.riskScore = Math.max(5, Math.min(95, riskScore));
  }
}

// --- Consolidated from piggyPlannerBuilder.ts ---

/**
 * Optimizes a generated plan by merging duplicates, balancing workload,
 * grouping similar tasks, and reducing context switching.
 */
export async function optimizePlan(
  plan: ExecutionPlan,
  contextSummary: string
): Promise<ExecutionPlan> {
  const prompt = `You are the Piggy AI Plan Optimizer.
Take this structured execution plan and refine it to be highly efficient.
Your optimizations MUST:
1. Merge duplicate or highly overlapping steps.
2. Remove unnecessary or redundant steps.
3. Group similar actions together to reduce context switching.
4. Balance workload and check dependencies.

Original Plan:
${JSON.stringify(plan, null, 2)}

User Context:
${contextSummary}

Return the optimized plan in the exact same JSON schema:
{
  "goal": "Core objective of the plan",
  "steps": [
    {
      "id": "step-1",
      "toolId": "task",
      "action": "create",
      "args": { "title": "Revise React router", "action": "create" },
      "dependencies": [],
      "executionOrder": 1,
      "state": "Pending",
      "expectedResult": "Task is added to checklist"
    }
  ],
  "dependencies": ["List of overall plan dependency statements"],
  "resources": ["Resources required"],
  "estimatedTimeMinutes": 180,
  "priority": "Critical" | "High" | "Medium" | "Low",
  "fallbackPlan": "Fallback description",
  "rollbackPlan": "Rollback description"
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Plan Optimizer. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && Array.isArray(result.steps)) {
      return result;
    }
    return plan;
  } catch (error) {
    console.error("[PLAN OPTIMIZER] Error optimizing plan:", error);
    return plan;
  }
}

// --- Consolidated from piggyPlanning.ts ---

/**
 * Converts reasoning output into an executable, structured plan with priorities,
 * dependencies, fallback paths, and rollback tasks.
 */
export async function runPlanningEngine(
  userQuery: string,
  contextSummary: string
): Promise<ExecutionPlan | null> {
  const prompt = `You are the Piggy AI Planning Engine.
If the user request is a goal or project needing a sequence of actions, build a structured plan.
If the query is a simple question or chat that doesn't need a plan, return a JSON object with "hasPlan": false.

Available Tools & Action Schema:
- "task": { "title": string, "category"?: string, "date"?: string, "priority"?: string, "time"?: string }
- "habit": { "name": string, "frequency"?: string, "icon"?: string }
- "goal": { "title": string, "description"?: string, "targetDate"?: string }
- "expense": { "description": string, "amount": number, "category"?: string }
- "calendar": { "action": "read" }
- "reminder": { "title": string, "message"?: string }
- "notification": { "action": "clear" | "read" }
- "memory": { "action": "write" | "delete", "fact": string }
- "search": { "query": string }
- "analytics": { "action": "get_metrics" }
- "sleep": { "sleepTime": string, "wakeTime": string, "duration": number }
- "mood": { "mood": string, "note"?: string }
- "profile": { "action": "update", "name"?: string, "aiPersonality"?: string, "budgetLimit"?: number }

User Message: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object:
{
  "hasPlan": true,
  "plan": {
    "goal": "Core objective of the plan",
    "steps": [
      {
        "id": "step-1",
        "toolId": "task",
        "action": "create",
        "args": { "title": "Revise React router", "action": "create" },
        "dependencies": [],
        "executionOrder": 1,
        "state": "Pending",
        "expectedResult": "Task is added to checklist"
      }
    ],
    "dependencies": ["List of overall plan dependency statements"],
    "resources": ["Resources required, e.g. Books, APIs, Focus time"],
    "estimatedTimeMinutes": 180,
    "priority": "Critical" | "High" | "Medium" | "Low",
    "fallbackPlan": "Fallback description if execution gets blocked",
    "rollbackPlan": "Rollback description to clean up database state if execution fails"
  }
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Planning Engine. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && result.hasPlan === true && result.plan) {
      let plan = result.plan;
      plan = limitHeavyTasks(plan);   // Apply heavy task limit
      return plan;
    }
    return null;
    return null;
  } catch (error) {
    console.error("[PLANNING ENGINE] Error generating plan:", error);
    return null;
  }

}
/**
 * Limits the number of high-effort tasks in a plan to prevent burnout.
 */
export function limitHeavyTasks(plan: ExecutionPlan): ExecutionPlan {
  const MAX_HEAVY_TASKS = 4;

  const heavySteps = plan.steps.filter(s =>
    s.priority === "High" || s.priority === "Critical"
  );

  if (heavySteps.length <= MAX_HEAVY_TASKS) {
    return plan;
  }

  // Keep only first 4 heavy + all low/medium
  const limitedSteps = plan.steps.filter((s, index) => {
    const isHeavy = s.priority === "High" || s.priority === "Critical";
    return !isHeavy || heavySteps.indexOf(s) < MAX_HEAVY_TASKS;
  });

  return {
    ...plan,
    steps: limitedSteps
  };
}