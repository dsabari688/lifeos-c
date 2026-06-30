import { queryGroq } from "../core/piggyClient.js";
import { evaluateToolCall } from "../cognition/piggyResultEvaluator.js";
import { transitionWorkflowState } from "../types/piggyWorkflow.js";
import { initializeTaskState, updateTaskState } from "../types/piggyTaskState.js";

export interface ExecutionStep {
  tool: string;
  args: any;
  expectedResult: string;
}

export interface ExecutionLog {
  tool: string;
  args: any;
  success: boolean;
  actualResult: any;
  difference: string | null;
  qualityScore: number;
  retries: number;
}

/**
 * Plans and executes a series of tool mutations against the user's data to achieve a goal.
 */
export async function executeAgentGoal(
  goalDescription: string,
  contextSummary: string,
  userData: any
): Promise<{ success: boolean; logs: ExecutionLog[]; message: string }> {
  // Step 1: Query Groq to generate a step-by-step execution plan
  transitionWorkflowState(userData, 'Planning');
  console.log(`[EXECUTOR] Planning steps for goal: "${goalDescription}"`);

  const planningPrompt = `You are the Piggy AI Planner and Execution Engine.
Analyze the user's goal and their current database context to determine if any database mutations are needed.
If mutations are needed, break down the goal into a sequence of concrete tool actions.

Available Tools & Parameter Schemas:
1. "createTask": { "title": string, "category"?: string, "date"?: string, "priority"?: string, "time"?: string }
2. "updateTaskStatus": { "title": string, "status": "pending" | "completed" }
3. "deleteTask": { "title": string }
4. "createGoal": { "title": string, "description"?: string, "targetDate"?: string }
5. "updateGoalProgress": { "title": string, "progress": number }
6. "createHabit": { "name": string, "frequency"?: string, "icon"?: string }
7. "logHabit": { "name": string, "date": string }
8. "addExpense": { "description": string, "amount": number, "category"?: string, "date"?: string }
9. "updateBudget": { "category": string, "limit": number }

Important:
- Dates must be in YYYY-MM-DD format.
- If the user's goal is just a general conversation, chat, or query and does not require any tool actions, return an empty steps array.

User Goal: "${goalDescription}"
User Context:
${contextSummary}

Return a JSON object containing:
{
  "steps": [
    {
      "tool": "createTask" | "updateTaskStatus" | "deleteTask" | "createGoal" | "updateGoalProgress" | "createHabit" | "logHabit" | "addExpense" | "updateBudget",
      "args": { ... },
      "expectedResult": "Clear description of the expected database change"
    }
  ]
}

Format strictly as JSON. Output only the JSON block.`;

  let planSteps: ExecutionStep[] = [];
  try {
    const rawPlan = await queryGroq([
      { role: "system", content: "You are the Piggy AI Planning Engine. Output strictly JSON." },
      { role: "user", content: planningPrompt }
    ], 0.1, true);

    const parsedPlan = JSON.parse(rawPlan);
    if (parsedPlan && Array.isArray(parsedPlan.steps)) {
      planSteps = parsedPlan.steps;
    }
  } catch (error) {
    console.error("[EXECUTOR] Planning failed, falling back to conversational mode:", error);
    planSteps = [];
  }

  if (planSteps.length === 0) {
    console.log("[EXECUTOR] No tool steps planned. Proceeding directly to response reasoning.");
    return { success: true, logs: [], message: "No database modifications required." };
  }

  console.log(`[EXECUTOR] Planned ${planSteps.length} steps. Initializing Task State.`);
  const stepDescriptions = planSteps.map(s => `${s.tool}(${JSON.stringify(s.args)})`);
  initializeTaskState(userData, goalDescription, stepDescriptions);

  const logs: ExecutionLog[] = [];
  let isAllSuccessful = true;
  let blockedReason = "";

  for (let i = 0; i < planSteps.length; i++) {
    const step = planSteps[i];
    transitionWorkflowState(userData, 'Executing');

    let retries = 0;
    let stepSuccess = false;
    let actualResult: any = null;
    let evalResult: any = null;

    const maxStepRetries = 3;

    while (!stepSuccess && retries < maxStepRetries) {
      if (retries > 0) {
        console.log(`[EXECUTOR] Retrying step ${i + 1}/${planSteps.length} (Attempt ${retries + 1}/${maxStepRetries})`);
      }

      try {
        // Run the appropriate tool mutation directly on userData
        actualResult = executeToolMutation(step.tool, step.args, userData);
        
        // Evaluate the results
        evalResult = evaluateToolCall(step.tool, step.args, step.expectedResult, actualResult);

        if (evalResult.difference === null && evalResult.qualityScore >= 80) {
          stepSuccess = true;
        } else {
          retries++;
        }
      } catch (err: any) {
        console.error(`[EXECUTOR] Error executing tool ${step.tool}:`, err);
        evalResult = {
          expectedResult: step.expectedResult,
          actualResult: err.message,
          difference: err.message,
          qualityScore: 0
        };
        retries++;
      }
    }

    logs.push({
      tool: step.tool,
      args: step.args,
      success: stepSuccess,
      actualResult,
      difference: evalResult?.difference || null,
      qualityScore: evalResult?.qualityScore || 0,
      retries
    });

    if (stepSuccess) {
      console.log(`[EXECUTOR] Step ${i + 1} succeeded.`);
      const currentTaskState = userData.taskState;
      if (currentTaskState) {
        const completed = [...currentTaskState.completedSteps, stepDescriptions[i]];
        const remaining = currentTaskState.remainingSteps.slice(1);
        updateTaskState(userData, { completedSteps: completed, remainingSteps: remaining });
      }
    } else {
      console.log(`[EXECUTOR] Step ${i + 1} failed or became blocked.`);
      isAllSuccessful = false;
      blockedReason = evalResult?.difference || "Execution discrepancy detected.";
      
      const currentTaskState = userData.taskState;
      if (currentTaskState) {
        const blocked = [...currentTaskState.blockedSteps, stepDescriptions[i]];
        const failed = [...currentTaskState.failedSteps, stepDescriptions[i]];
        const remaining = currentTaskState.remainingSteps.slice(1);
        updateTaskState(userData, { 
          blockedSteps: blocked, 
          failedSteps: failed, 
          remainingSteps: remaining,
          retryCount: currentTaskState.retryCount + retries
        });
      }
      break; // Stop execution workflow upon a blocked/failed step
    }
  }

  return {
    success: isAllSuccessful,
    logs,
    message: isAllSuccessful 
      ? `Successfully executed all ${planSteps.length} planned actions.` 
      : `Execution blocked during step: ${blockedReason}`
  };
}

/**
 * Mutates the database userData record in place based on the tool and arguments.
 */
function executeToolMutation(tool: string, args: any, userData: any): any {
  const timestamp = new Date().toISOString();
  const todayDateStr = timestamp.split("T")[0];

  switch (tool) {
    case "createTask": {
      const newTask = {
        id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: args.title,
        category: args.category || "personal",
        date: args.date || todayDateStr,
        status: args.status || "pending",
        priority: args.priority || "medium",
        time: args.time || "12:00",
        rescheduledCount: 0
      };
      if (!userData.tasks) userData.tasks = [];
      userData.tasks.push(newTask);
      return newTask;
    }

    case "updateTaskStatus": {
      if (!userData.tasks) return { success: false };
      const task = userData.tasks.find((t: any) => 
        t.title.toLowerCase() === args.title.toLowerCase()
      );
      if (task) {
        task.status = args.status;
        return task;
      }
      return { success: false, reason: "Task not found" };
    }

    case "deleteTask": {
      if (!userData.tasks) return { deleted: false };
      const initialLength = userData.tasks.length;
      userData.tasks = userData.tasks.filter((t: any) => 
        t.title.toLowerCase() !== args.title.toLowerCase()
      );
      return { deleted: userData.tasks.length < initialLength };
    }

    case "createGoal": {
      const newGoal = {
        id: `goal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: args.title,
        description: args.description || "",
        targetDate: args.targetDate || "",
        progress: 0,
        status: "active"
      };
      if (!userData.goals) userData.goals = [];
      userData.goals.push(newGoal);
      return newGoal;
    }

    case "updateGoalProgress": {
      if (!userData.goals) return { success: false };
      const goal = userData.goals.find((g: any) => 
        g.title.toLowerCase() === args.title.toLowerCase()
      );
      if (goal) {
        goal.progress = args.progress;
        if (args.progress >= 100) {
          goal.status = "completed";
        }
        return goal;
      }
      return { success: false, reason: "Goal not found" };
    }

    case "createHabit": {
      const newHabit = {
        id: `habit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: args.name,
        frequency: args.frequency || "daily",
        streak: 0,
        logs: [],
        logTimes: [],
        skippedDaysCount: 0,
        icon: args.icon || "activity"
      };
      if (!userData.habits) userData.habits = [];
      userData.habits.push(newHabit);
      return newHabit;
    }

    case "logHabit": {
      if (!userData.habits) return { logged: false };
      const habit = userData.habits.find((h: any) => 
        h.name.toLowerCase() === args.name.toLowerCase()
      );
      if (habit) {
        const dateStr = args.date || todayDateStr;
        if (!habit.logs.includes(dateStr)) {
          habit.logs.push(dateStr);
          habit.logTimes.push(timestamp);
          habit.streak += 1;
          return { logged: true, habit };
        }
        return { logged: true, habit, note: "Already logged" };
      }
      return { logged: false, reason: "Habit not found" };
    }

    case "addExpense": {
      const newExpense = {
        id: `expense-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: args.description,
        amount: parseFloat(args.amount) || 0,
        category: args.category || "general",
        date: args.date || todayDateStr
      };
      if (!userData.expenses) userData.expenses = [];
      userData.expenses.push(newExpense);
      return newExpense;
    }

    case "updateBudget": {
      if (!userData.budgets) userData.budgets = [];
      const existing = userData.budgets.find((b: any) => 
        b.category.toLowerCase() === args.category.toLowerCase()
      );
      if (existing) {
        existing.limit = parseFloat(args.limit);
        return existing;
      } else {
        const newBudget = {
          id: `budget-${Date.now()}`,
          category: args.category,
          limit: parseFloat(args.limit)
        };
        userData.budgets.push(newBudget);
        return newBudget;
      }
    }

    default:
      throw new Error(`Unsupported tool command: ${tool}`);
  }
}
