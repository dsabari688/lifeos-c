import { evaluateToolCall } from "../cognition/agentCognition.js";
import { queryGroq } from "../core/piggyClient.js";
import { verifyStepExecution } from "../safety/agentSafety.js";
import { Action, ExecutionState, WorkflowInstance, initializeTaskState, updateTaskState, ToolDefinition, transitionWorkflowState } from "../types/agentTypes.js";

// --- Consolidated from piggyActionExecutor.ts ---

/**
 * Executes a structured multi-tool workflow.
 * Analyzes dependencies and executes steps in parallel or sequential chains.
 */
export async function runWorkflowActions(
  workflow: WorkflowInstance,
  userData: any
): Promise<WorkflowInstance> {
  const workflowId = workflow.id;
  const steps = workflow.steps;
  
  console.log(`[ACTION EXECUTOR] Starting workflow: "${workflow.goal}" (Steps: ${steps.length})`);
  workflow.state = "Running";
  workflow.startTime = new Date().toISOString();

  // Helper to check if dependencies of a step are successfully completed
  const dependenciesMet = (step: Action, completedStepIds: Set<string>): boolean => {
    return step.dependencies.every(depId => completedStepIds.has(depId));
  };

  const completedStepIds = new Set<string>();
  const failedStepIds = new Set<string>();

  let executionQueue = [...steps];

  // Loop until all possible steps are executed or blocked
  while (executionQueue.length > 0) {
    // Find steps that are ready (all dependencies met) and are in Pending state
    const readySteps = executionQueue.filter(
      s => s.state === "Pending" && dependenciesMet(s, completedStepIds)
    );

    // Cancel steps whose dependencies have failed
    const blockedSteps = executionQueue.filter(
      s => s.state === "Pending" && s.dependencies.some(depId => failedStepIds.has(depId))
    );

    blockedSteps.forEach(s => {
      s.state = "Cancelled";
      failedStepIds.add(s.id);
      console.log(`[ACTION EXECUTOR] Step cancelled due to failed dependency: ${s.toolId}`);
    });

    if (readySteps.length === 0) {
      // If we still have queue items but none are ready/blocked, we have a circular dependency or finished.
      break;
    }

    // Execute ready steps in parallel
    console.log(`[ACTION EXECUTOR] Executing round of ${readySteps.length} parallel steps...`);
    
    await Promise.all(
      readySteps.map(async (step) => {
        step.state = "Running";
        let stepCompleted = false;
        
        while (!stepCompleted && step.retryCount < 3) {
          const startTime = Date.now();
          
          // Execute individual tool
          const runRes = await executeToolWithGuard(step.toolId, step.args, userData);
          const duration = Date.now() - startTime;
          
          // Run Verification Engine
          const verification = verifyStepExecution(step.toolId, step.args, step.expectedResult, runRes.result);

          step.actualResult = runRes.result;
          step.difference = verification.difference;
          step.qualityScore = verification.qualityScore;

          // Log the execution
          logExecution(userData, {
            workflowId,
            tool: step.toolId,
            executionTimeMs: duration,
            success: verification.valid,
            failureReason: verification.difference,
            retryCount: step.retryCount,
            confidence: workflow.confidence
          });

          if (verification.valid) {
            step.state = "Completed";
            stepCompleted = true;
            completedStepIds.add(step.id);
            console.log(`[ACTION EXECUTOR] Step completed: ${step.toolId}`);
          } else {
            step.retryCount += 1;
            if (step.retryCount < 3) {
              step.state = "Retrying";
              console.log(`[ACTION EXECUTOR] Step verification failed. Retrying: ${step.toolId} (Attempt ${step.retryCount + 1}/3)`);
            } else {
              step.state = "Failed";
              failedStepIds.add(step.id);
              console.error(`[ACTION EXECUTOR] Step failed permanently after max retries: ${step.toolId}`);
            }
          }
        }
      })
    );

    // Remove executed/processed steps from queue
    executionQueue = executionQueue.filter(s => s.state === "Pending");
  }

  // Update overall workflow state
  const hasFailed = steps.some(s => s.state === "Failed");
  const hasCancelled = steps.some(s => s.state === "Cancelled");
  
  if (hasFailed) {
    workflow.state = "Failed";
  } else if (hasCancelled) {
    workflow.state = "Cancelled";
  } else {
    workflow.state = "Completed";
  }

  workflow.endTime = new Date().toISOString();
  console.log(`[ACTION EXECUTOR] Workflow execution finished. Outcome State: ${workflow.state}`);
  return workflow;
}

// --- Consolidated from piggyExecutionLogger.ts ---
export interface ExecutionLogEntry {
  id: string;
  workflowId: string;
  tool: string;
  executionTimeMs: number;
  success: boolean;
  failureReason: string | null;
  retryCount: number;
  confidence: number;
  timestamp: string;
}

/**
 * Appends execution audit logs to the user database context (userData.executionLogs).
 */
export function logExecution(
  userData: any,
  entry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>
): void {
  if (!userData.executionLogs) {
    userData.executionLogs = [];
  }

  const logRecord: ExecutionLogEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...entry,
    timestamp: new Date().toISOString()
  };

  userData.executionLogs.push(logRecord);

  // Keep logs list bounded (last 100 entries)
  if (userData.executionLogs.length > 100) {
    userData.executionLogs = userData.executionLogs.slice(-100);
  }

  console.log(`[EXECUTION LOGGER] Saved log for workflow: ${entry.workflowId} | tool: ${entry.tool} | success: ${entry.success}`);
}

// --- Consolidated from piggyExecutor.ts ---

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

// --- Consolidated from piggyToolExecutor.ts ---

/**
 * Executes a tool call, wrapping it in execution guards such as timeouts and retry handlers.
 */
export async function executeToolWithGuard(
  toolId: string,
  args: any,
  userData: any
): Promise<{ success: boolean; result: any; duration: number; retriesUsed: number }> {
  const tool = toolRegistry[toolId];
  const timeoutMs = tool?.definition.timeout || 5000;
  const maxRetries = tool?.definition.retryCount || 3;

  let retriesUsed = 0;
  let success = false;
  let result: any = null;
  const startTime = Date.now();

  while (!success && retriesUsed < maxRetries) {
    try {
      const executionPromise = routeToolCall(toolId, args, userData);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout of ${timeoutMs}ms exceeded`)), timeoutMs)
      );

      result = await Promise.race([executionPromise, timeoutPromise]);
      success = true;
    } catch (error: any) {
      retriesUsed++;
      console.warn(`[TOOL EXECUTOR] Attempt ${retriesUsed}/${maxRetries} failed for tool "${toolId}":`, error.message);
      if (retriesUsed >= maxRetries) {
        result = { success: false, error: error.message };
      }
    }
  }

  const duration = Date.now() - startTime;
  return {
    success,
    result,
    duration,
    retriesUsed
  };
}

// --- Consolidated from piggyToolRegistry.ts ---

export interface ToolRegistryEntry {
  definition: ToolDefinition & { examples: string[] };
  execute: (args: any, userData: any) => Promise<any>;
}

export const toolRegistry: Record<string, ToolRegistryEntry> = {
  task: {
    definition: {
      id: "task",
      name: "Task Tool",
      description: "Manage, create, or update task entities in the checklist.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create | update | delete" }
      ],
      permissions: ["write_tasks"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create", "update", "delete"],
      examples: ["{ action: 'create', title: 'Buy milk' }"]
    },
    execute: async (args, userData) => {
      const todayDateStr = new Date().toISOString().split("T")[0];
      if (!userData.tasks) userData.tasks = [];

      if (args.action === "create") {
        const newTask = {
          id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: args.title || "Untitled Task",
          category: args.category || "personal",
          date: args.date || todayDateStr,
          status: args.status || "pending",
          priority: args.priority || "medium",
          time: args.time || "12:00",
          rescheduledCount: 0
        };
        userData.tasks.push(newTask);
        return newTask;
      } else if (args.action === "update") {
        const task = userData.tasks.find((t: any) => 
          (args.id && t.id === args.id) || 
          (args.title && t.title.toLowerCase() === args.title.toLowerCase())
        );
        if (task) {
          if (args.status) task.status = args.status;
          if (args.rescheduledCount !== undefined) task.rescheduledCount = args.rescheduledCount;
          return task;
        }
        return { success: false, reason: "Task not found" };
      } else if (args.action === "delete") {
        const initialLength = userData.tasks.length;
        userData.tasks = userData.tasks.filter((t: any) => 
          !(args.id && t.id === args.id) && 
          !(args.title && t.title.toLowerCase() === args.title.toLowerCase())
        );
        return { deleted: userData.tasks.length < initialLength };
      }
      throw new Error(`Unsupported Task Action: ${args.action}`);
    }
  },
  habit: {
    definition: {
      id: "habit",
      name: "Habit Tool",
      description: "Manage, create, or log habits consistency.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create | log | delete" }
      ],
      permissions: ["write_habits"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create", "log", "delete"],
      examples: ["{ action: 'log', name: 'Exercise Workout' }"]
    },
    execute: async (args, userData) => {
      const todayDateStr = new Date().toISOString().split("T")[0];
      if (!userData.habits) userData.habits = [];

      if (args.action === "create") {
        const newHabit = {
          id: `habit-${Date.now()}`,
          name: args.name || "New Habit",
          frequency: args.frequency || "daily",
          streak: 0,
          logs: [],
          logTimes: [],
          skippedDaysCount: 0,
          icon: args.icon || "activity"
        };
        userData.habits.push(newHabit);
        return newHabit;
      } else if (args.action === "log") {
        const habit = userData.habits.find((h: any) => 
          (args.id && h.id === args.id) || 
          (args.name && h.name.toLowerCase() === args.name.toLowerCase())
        );
        if (habit) {
          const logDate = args.date || todayDateStr;
          if (!habit.logs.includes(logDate)) {
            habit.logs.push(logDate);
            habit.logTimes.push(new Date().toISOString());
            habit.streak += 1;
            return { logged: true, habit };
          }
          return { logged: true, habit, note: "Already logged" };
        }
        return { logged: false, reason: "Habit not found" };
      } else if (args.action === "delete") {
        const initialLength = userData.habits.length;
        userData.habits = userData.habits.filter((h: any) => 
          !(args.id && h.id === args.id) && 
          !(args.name && h.name.toLowerCase() === args.name.toLowerCase())
        );
        return { deleted: userData.habits.length < initialLength };
      }
      throw new Error(`Unsupported Habit Action: ${args.action}`);
    }
  },
  goal: {
    definition: {
      id: "goal",
      name: "Goal Tool",
      description: "Manage user goals and progress levels.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create | update | delete" }
      ],
      permissions: ["write_goals"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create", "update", "delete"],
      examples: ["{ action: 'update', title: 'Learn React', progress: 50 }"]
    },
    execute: async (args, userData) => {
      if (!userData.goals) userData.goals = [];

      if (args.action === "create") {
        const newGoal = {
          id: `goal-${Date.now()}`,
          title: args.title || "New Goal",
          description: args.description || "",
          targetDate: args.targetDate || "",
          progress: 0,
          status: "active"
        };
        userData.goals.push(newGoal);
        return newGoal;
      } else if (args.action === "update") {
        const goal = userData.goals.find((g: any) => 
          (args.id && g.id === args.id) || 
          (args.title && g.title.toLowerCase() === args.title.toLowerCase())
        );
        if (goal) {
          if (args.progress !== undefined) goal.progress = args.progress;
          if (args.status) goal.status = args.status;
          return goal;
        }
        return { success: false, reason: "Goal not found" };
      } else if (args.action === "delete") {
        const initialLength = userData.goals.length;
        userData.goals = userData.goals.filter((g: any) => 
          !(args.id && g.id === args.id) && 
          !(args.title && g.title.toLowerCase() === args.title.toLowerCase())
        );
        return { deleted: userData.goals.length < initialLength };
      }
      throw new Error(`Unsupported Goal Action: ${args.action}`);
    }
  },
  expense: {
    definition: {
      id: "expense",
      name: "Expense Tool",
      description: "Log expenses and balance budget utilization.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create | delete" }
      ],
      permissions: ["write_expenses"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create", "delete"],
      examples: ["{ action: 'create', amount: 15, category: 'food', description: 'coffee' }"]
    },
    execute: async (args, userData) => {
      if (!userData.expenses) userData.expenses = [];
      const todayDateStr = new Date().toISOString().split("T")[0];

      if (args.action === "create") {
        const newExpense = {
          id: `expense-${Date.now()}`,
          description: args.description || "Uncategorized Purchase",
          amount: parseFloat(args.amount) || 0,
          category: args.category || "general",
          date: args.date || todayDateStr
        };
        userData.expenses.push(newExpense);
        return newExpense;
      } else if (args.action === "delete") {
        const initialLength = userData.expenses.length;
        userData.expenses = userData.expenses.filter((e: any) => e.id !== args.id);
        return { deleted: userData.expenses.length < initialLength };
      }
      throw new Error(`Unsupported Expense Action: ${args.action}`);
    }
  },
  calendar: {
    definition: {
      id: "calendar",
      name: "Calendar Tool",
      description: "Read or verify scheduled events.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "read" }
      ],
      permissions: ["read_calendar"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["read"],
      examples: ["{ action: 'read' }"]
    },
    execute: async (args, userData) => {
      const deadlines = userData.tasks?.filter((t: any) => t.date && t.status === "pending") || [];
      return { events: deadlines.slice(0, 15) };
    }
  },
  reminder: {
    definition: {
      id: "reminder",
      name: "Reminder Tool",
      description: "Set reminders or alert buffers.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create" }
      ],
      permissions: ["write_notifications"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create"],
      examples: ["{ action: 'create', title: 'Call client', message: 'Urgent task buffer check' }"]
    },
    execute: async (args, userData) => {
      if (!userData.notifications) userData.notifications = [];
      const newReminder = {
        id: `remind-${Date.now()}`,
        type: "reminder",
        title: args.title || "Reminder Alert",
        message: args.message || "Executive reminder buffer trigger.",
        timestamp: new Date().toISOString(),
        unread: true
      };
      userData.notifications.push(newReminder);
      return newReminder;
    }
  },
  notification: {
    definition: {
      id: "notification",
      name: "Notification Tool",
      description: "Acknowledge or clear notification messages.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "clear | read" }
      ],
      permissions: ["write_notifications"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["clear", "read"],
      examples: ["{ action: 'clear' }"]
    },
    execute: async (args, userData) => {
      if (!userData.notifications) userData.notifications = [];
      if (args.action === "clear") {
        userData.notifications = [];
        return { cleared: true };
      } else if (args.action === "read") {
        userData.notifications.forEach((n: any) => n.unread = false);
        return { success: true };
      }
      throw new Error(`Unsupported Notification Action: ${args.action}`);
    }
  },
  memory: {
    definition: {
      id: "memory",
      name: "Memory Tool",
      description: "Manually write preferences or constraints to memories.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "write | delete" }
      ],
      permissions: ["write_memory"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["write", "delete"],
      examples: ["{ action: 'write', fact: 'I prefer morning workout sessions', category: 'preference' }"]
    },
    execute: async (args, userData) => {
      if (!userData.aiMemory) userData.aiMemory = [];
      if (args.action === "write") {
        const newMem = {
          id: `mem-${Date.now()}`,
          fact: args.fact,
          category: args.category || "preference",
          timestamp: new Date().toISOString()
        };
        userData.aiMemory.push(newMem);
        return newMem;
      } else if (args.action === "delete") {
        userData.aiMemory = userData.aiMemory.filter((m: any) => m.id !== args.id);
        return { deleted: true };
      }
      throw new Error(`Unsupported Memory Action: ${args.action}`);
    }
  },
  search: {
    definition: {
      id: "search",
      name: "Search Tool",
      description: "Simulate Web search or deep database lookup.",
      requiredInputs: [
        { name: "query", type: "string", required: true, description: "Search query" }
      ],
      permissions: ["read_data"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["query"],
      examples: ["{ query: 'React' }"]
    },
    execute: async (args, userData) => {
      const q = args.query.toLowerCase();
      const matchedTasks = (userData.tasks || []).filter((t: any) => t.title.toLowerCase().includes(q));
      const matchedGoals = (userData.goals || []).filter((g: any) => g.title.toLowerCase().includes(q));
      return { matches: { tasks: matchedTasks, goals: matchedGoals } };
    }
  },
  analytics: {
    definition: {
      id: "analytics",
      name: "Analytics Tool",
      description: "Retrieve habit completions rates and routine trends.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "get_metrics" }
      ],
      permissions: ["read_data"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["get_metrics"],
      examples: ["{ action: 'get_metrics' }"]
    },
    execute: async (args, userData) => {
      return {
        habitCompletion30D: 76,
        avgSleep7D: 7.4,
        burnoutScore: 42,
        energyPeakHour: "09:00"
      };
    }
  },
  sleep: {
    definition: {
      id: "sleep",
      name: "Sleep Tool",
      description: "Log sleeping logs and calculate rest duration parameters.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create" }
      ],
      permissions: ["write_sleep"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create"],
      examples: ["{ action: 'create', sleepTime: '23:30', wakeTime: '07:15', duration: 7.7 }"]
    },
    execute: async (args, userData) => {
      if (!userData.sleepLogs) userData.sleepLogs = [];
      const newSleep = {
        sleepTime: args.sleepTime || "23:00",
        wakeTime: args.wakeTime || "07:00",
        duration: parseFloat(args.duration) || 8.0,
        date: args.date || new Date().toISOString().split("T")[0]
      };
      userData.sleepLogs.push(newSleep);
      return newSleep;
    }
  },
  mood: {
    definition: {
      id: "mood",
      name: "Mood Tool",
      description: "Log daily moods and register feelings metrics.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create" }
      ],
      permissions: ["write_mood"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["create"],
      examples: ["{ action: 'create', mood: 'happy', note: 'Productive work completed' }"]
    },
    execute: async (args, userData) => {
      if (!userData.moods) userData.moods = [];
      const newMood = {
        id: `mood-${Date.now()}`,
        mood: args.mood || "good",
        note: args.note || "",
        createdAt: new Date().toISOString()
      };
      userData.moods.push(newMood);
      return newMood;
    }
  },
  profile: {
    definition: {
      id: "profile",
      name: "Profile Tool",
      description: "Update user cockpit preferences.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "update" }
      ],
      permissions: ["write_profile"],
      timeout: 5000,
      retryCount: 3,
      supportedActions: ["update"],
      examples: ["{ action: 'update', aiPersonality: 'Factual' }"]
    },
    execute: async (args, userData) => {
      if (!userData.profile) userData.profile = {};
      if (args.name) userData.profile.name = args.name;
      if (args.aiPersonality) userData.profile.aiPersonality = args.aiPersonality;
      if (args.budgetLimit) userData.profile.budgetLimit = parseFloat(args.budgetLimit);
      return userData.profile;
    }
  },
  notes: {
    definition: {
      id: "notes",
      name: "Notes Tool",
      description: "Save, retrieve, or append quick informational notes.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "write | read" }
      ],
      permissions: ["write_notes"],
      timeout: 5000,
      retryCount: 2,
      supportedActions: ["write", "read"],
      examples: ["{ action: 'write', title: 'Meeting notes', content: 'Discuss database schema' }"]
    },
    execute: async (args, userData) => {
      if (!userData.notes) userData.notes = [];
      if (args.action === "write") {
        const newNote = {
          id: `note-${Date.now()}`,
          title: args.title || "Quick Note",
          content: args.content || "",
          timestamp: new Date().toISOString()
        };
        userData.notes.push(newNote);
        return newNote;
      } else if (args.action === "read") {
        return { notes: userData.notes };
      }
      throw new Error(`Unsupported Notes Action: ${args.action}`);
    }
  },
  email: {
    definition: {
      id: "email",
      name: "Email Tool",
      description: "Simulate sending status reports or reading messages.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "send | read" }
      ],
      permissions: ["use_email"],
      timeout: 8000,
      retryCount: 2,
      supportedActions: ["send", "read"],
      examples: ["{ action: 'send', recipient: 'sir@lifeos.com', subject: 'Weekly brief status' }"]
    },
    execute: async (args, userData) => {
      console.log(`[EMAIL TOOL] Simulating email to ${args.recipient || "user"} | subject: ${args.subject}`);
      return { sent: true, recipient: args.recipient || "user", timestamp: new Date().toISOString() };
    }
  },
  browser: {
    definition: {
      id: "browser",
      name: "Browser Tool",
      description: "Simulate loading web pages or documentation resources.",
      requiredInputs: [
        { name: "url", type: "string", required: true, description: "Target website URL" }
      ],
      permissions: ["use_browser"],
      timeout: 10000,
      retryCount: 2,
      supportedActions: ["fetch"],
      examples: ["{ url: 'https://react.dev' }"]
    },
    execute: async (args, userData) => {
      console.log(`[BROWSER TOOL] Simulating page loading for: ${args.url}`);
      return { status: 200, content: `Loaded content description for URL: ${args.url}` };
    }
  },
  weather: {
    definition: {
      id: "weather",
      name: "Weather Tool",
      description: "Retrieve local forecast to balance exercise routines.",
      requiredInputs: [
        { name: "location", type: "string", required: true, description: "City name" }
      ],
      permissions: ["read_data"],
      timeout: 5000,
      retryCount: 2,
      supportedActions: ["fetch"],
      examples: ["{ location: 'London' }"]
    },
    execute: async (args, userData) => {
      return { location: args.location, temperature: "19°C", condition: "Partly Cloudy", workoutOptimal: true };
    }
  },
  calculator: {
    definition: {
      id: "calculator",
      name: "Calculator Tool",
      description: "Solve complex arithmetic equations and budgets ROI totals.",
      requiredInputs: [
        { name: "expression", type: "string", required: true, description: "Math expression" }
      ],
      permissions: ["read_data"],
      timeout: 3000,
      retryCount: 2,
      supportedActions: ["calculate"],
      examples: ["{ expression: '120 * 1.34' }"]
    },
    execute: async (args, userData) => {
      try {
        // Safe evaluation of simple math expression
        const cleanExpression = args.expression.replace(/[^0-9+\-*/().\s]/g, "");
        const mathResult = Function(`"use strict"; return (${cleanExpression})`)();
        return { expression: args.expression, result: mathResult };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  },
  codeRunner: {
    definition: {
      id: "codeRunner",
      name: "Code Runner Tool",
      description: "Safely runs mock sandboxed code blocks to verify scripts.",
      requiredInputs: [
        { name: "code", type: "string", required: true, description: "JS code snippet" }
      ],
      permissions: ["run_code"],
      timeout: 6000,
      retryCount: 2,
      supportedActions: ["run"],
      examples: ["{ code: 'console.log(\"Hello\");' }"]
    },
    execute: async (args, userData) => {
      console.log(`[CODE RUNNER] Mock running: ${args.code}`);
      return { output: "Execution success.", exitCode: 0 };
    }
  },
  fileManager: {
    definition: {
      id: "fileManager",
      name: "File Manager Tool",
      description: "Manages mock workspace files inside userData.",
      requiredInputs: [
        { name: "action", type: "string", required: true, description: "create | read | delete" }
      ],
      permissions: ["write_files"],
      timeout: 5000,
      retryCount: 2,
      supportedActions: ["create", "read", "delete"],
      examples: ["{ action: 'create', filename: 'todo.txt', content: 'Clean workspace' }"]
    },
    execute: async (args, userData) => {
      if (!userData.files) userData.files = [];
      if (args.action === "create") {
        const fileRecord = {
          filename: args.filename,
          content: args.content || "",
          updatedAt: new Date().toISOString()
        };
        userData.files.push(fileRecord);
        return fileRecord;
      } else if (args.action === "read") {
        const file = userData.files.find((f: any) => f.filename === args.filename);
        return file || { success: false, reason: "File not found" };
      } else if (args.action === "delete") {
        userData.files = userData.files.filter((f: any) => f.filename !== args.filename);
        return { deleted: true };
      }
      throw new Error(`Unsupported FileManager Action: ${args.action}`);
    }
  }
};

// --- Consolidated from piggyToolRouter.ts ---

/**
 * Dispatches a tool execution request to its registered handler.
 */
export async function routeToolCall(
  toolId: string,
  args: any,
  userData: any
): Promise<any> {
  const tool = toolRegistry[toolId];
  if (!tool) {
    throw new Error(`Tool with ID "${toolId}" was not found in the Piggy Tool Registry.`);
  }

  // Ensure tool action argument is synchronized
  if (!args.action && tool.definition.supportedActions.length > 0) {
    args.action = tool.definition.supportedActions[0];
  }

  console.log(`[TOOL ROUTER] Routing to: ${tool.definition.name} (${toolId}) with action: ${args.action}`);
  return await tool.execute(args, userData);
}

// --- Consolidated from piggyToolSelector.ts ---

/**
 * Automatically decides which tools to select, why, and their execution sequence
 * based on the user's goal and current context.
 */
export async function selectToolsForGoal(
  userQuery: string,
  contextSummary: string
): Promise<Partial<Action>[]> {
  // Format tool definitions as context payload
  const toolsPayload = Object.values(toolRegistry).map(entry => ({
    id: entry.definition.id,
    name: entry.definition.name,
    description: entry.definition.description,
    supportedActions: entry.definition.supportedActions,
    requiredInputs: entry.definition.requiredInputs
  }));

  const prompt = `You are the Piggy AI Autonomous Tool Selector.
Analyze the user query and database context. Decide if any tool operations are required to fulfill the request.
Here are the available tools:
${JSON.stringify(toolsPayload, null, 2)}

Important Rules:
- If no tool calls are needed, return an empty steps list: {"steps": []}.
- Dates must be formatted as YYYY-MM-DD.
- Build dependencies if a step requires the output of a prior step.
- Set executionOrder correctly.

User Request: "${userQuery}"
Context Summary:
${contextSummary}

Return a JSON object:
{
  "steps": [
    {
      "id": "step-1",
      "toolId": "task",
      "action": "create",
      "args": { "title": "Revise React router", "category": "personal", "action": "create" },
      "dependencies": [],
      "executionOrder": 1,
      "expectedResult": "Task is added to user tasks"
    }
  ]
}

Output strictly JSON. Do not include markdown formatting wrappers other than the JSON block.`;

  try {
    const response = await queryGroq([
      { role: "system", content: "You are the Piggy AI Tool Selector. Output strictly JSON." },
      { role: "user", content: prompt }
    ], 0.1, true);

    const result = JSON.parse(response);
    if (result && Array.isArray(result.steps)) {
      return result.steps;
    }
    return [];
  } catch (error) {
    console.error("[TOOL SELECTOR] Error selecting tools:", error);
    return [];
  }
}