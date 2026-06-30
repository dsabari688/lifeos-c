import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { dbService } from "../db/index.js";
import { validateBody } from "../middleware/validate.js";
import { taskSchema } from "../validators/task.schema.js";
import { habitSchema } from "../validators/habit.schema.js";
import { goalSchema } from "../validators/goal.schema.js";
import { expenseSchema, budgetSchema } from "../validators/expense.schema.js";
import { sleepSchema } from "../validators/sleep.schema.js";

const router = express.Router();

function getRelativeDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}

// --- CORE DATA RESOLUTION ---
router.get("/api/data", authenticateToken, (req: any, res: any) => {
  res.json(dbService.getUserDataSummary(req.user.id));
});

router.post("/api/profile", authenticateToken, (req: any, res: any) => {
  const profile = dbService.updateProfile(req.user.id, req.body);
  res.json({ success: true, profile });
});

// --- GOALS API ---
router.post("/api/goals", authenticateToken, validateBody(goalSchema), (req: any, res: any) => {
  const newGoal = {
    id: `goal-${Date.now()}`,
    title: req.body.title || "New Goal",
    description: req.body.description || "",
    targetDate: req.body.targetDate || getRelativeDateString(30),
    progress: req.body.progress || 0,
    status: req.body.status || "active"
  };
  dbService.saveGoal(req.user.id, newGoal);
  res.json({ success: true, goal: newGoal });
});

router.put("/api/goals/:id", authenticateToken, validateBody(goalSchema.partial()), (req: any, res: any) => {
  const goals = dbService.getGoals(req.user.id);
  const index = goals.findIndex((g: any) => g.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Goal not found" });

  const updatedGoal = { ...goals[index], ...req.body };
  dbService.saveGoal(req.user.id, updatedGoal);
  res.json({ success: true, goal: updatedGoal });
});

router.delete("/api/goals/:id", authenticateToken, (req: any, res: any) => {
  dbService.deleteGoal(req.user.id, req.params.id);
  res.json({ success: true });
});

// --- FOCUS SCORE SYSTEM ---
router.post("/api/focus-score", authenticateToken, (req: any, res: any) => {
  const { durationMinutes = 25, completedTasks = 0, distractions = 0 } = req.body;
  const score = Math.min(100, Math.max(0, (durationMinutes * 2) + (completedTasks * 10) - distractions));

  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);
  if (!userData.focusSessions) userData.focusSessions = [];

  const session = {
    durationMinutes,
    completedTasks,
    distractions,
    score,
    timestamp: new Date().toISOString()
  };
  userData.focusSessions.push(session);
  db.userData[req.user.id] = userData;
  dbService.saveDatabaseState(db);

  res.json({ score, durationMinutes, createdAt: new Date() });
});

router.get("/api/focus-score/history", authenticateToken, (req: any, res: any) => {
  const userData = dbService.getUserData(req.user.id);
  res.json({ history: userData.focusSessions || [] });
});

// --- TASKS API ---
router.post("/api/tasks", authenticateToken, validateBody(taskSchema), (req: any, res: any) => {
  const newTask = {
    id: `task-${Date.now()}`,
    title: req.body.title || "Untitled Task",
    category: req.body.category || "important-not-urgent",
    date: req.body.date || getRelativeDateString(0),
    time: req.body.time || "12:00",
    recurType: req.body.recurType || "none",
    status: req.body.status || "pending",
    rescheduledCount: 0
  };
  dbService.saveTask(req.user.id, newTask);
  res.json({ success: true, task: newTask });
});

router.put("/api/tasks/:id", authenticateToken, validateBody(taskSchema.partial()), (req: any, res: any) => {
  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);
  const index = userData.tasks.findIndex((t: any) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Task not found" });

  const existingTask = userData.tasks[index];
  const oldStatus = existingTask.status;
  const newStatus = req.body.status;

  if (newStatus === "completed" && oldStatus !== "completed") {
    const hour = new Date().getHours().toString();
    if (!userData.userPatterns) {
      userData.userPatterns = {
        taskCompletionByHour: {},
        mostProductiveDay: "Tuesday",
        mostSkippedHabit: "Exercise",
        avgTasksCompletedPerDay: 4.2,
        streakBreakDays: ["Sunday"],
        spendingByCategory: {},
        focusSessionAvgMinutes: 47,
        goalProgressRate: 0.65
      };
    }
    if (!userData.userPatterns.taskCompletionByHour) {
      userData.userPatterns.taskCompletionByHour = {};
    }
    userData.userPatterns.taskCompletionByHour[hour] = (userData.userPatterns.taskCompletionByHour[hour] || 0) + 1;
  }

  let notification = null;
  if (newStatus === "skipped" || req.body.rescheduled) {
    const newDate = req.body.newDate;
    if (!newDate) return res.status(400).json({ error: "Reschedule date is required for skipped tasks." });

    existingTask.originalDate = existingTask.originalDate || existingTask.date;
    existingTask.date = newDate;
    existingTask.status = "pending";
    existingTask.rescheduledCount = (existingTask.rescheduledCount || 0) + 1;

    notification = {
      id: `notif-${Date.now()}`,
      title: "Anti-Abandonment Warning",
      message: `Skipped task forced to reschedule. Re-assigned '${existingTask.title}' to ${newDate} (Reschedule #${existingTask.rescheduledCount}).`,
      timestamp: new Date().toISOString(),
      type: "reminder",
      read: false
    };
    userData.notifications.unshift(notification);
  } else {
    userData.tasks[index] = { ...existingTask, ...req.body };
  }

  db.userData[req.user.id] = userData;
  dbService.saveDatabaseState(db);
  res.json({ success: true, task: userData.tasks[index], notification });
});

router.delete("/api/tasks/:id", authenticateToken, (req: any, res: any) => {
  dbService.deleteTask(req.user.id, req.params.id);
  res.json({ success: true });
});

// --- HABITS API ---
router.post("/api/habits", authenticateToken, validateBody(habitSchema), (req: any, res: any) => {
  const newHabit = {
    id: `habit-${Date.now()}`,
    name: req.body.name || "New Habit",
    frequency: req.body.frequency || "daily",
    streak: 0,
    logs: [],
    skippedDaysCount: 0,
    icon: req.body.icon || ""
  };
  dbService.saveHabit(req.user.id, newHabit);
  res.json({ success: true, habit: newHabit });
});

router.post("/api/habits/:id/toggle", authenticateToken, (req: any, res: any) => {
  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);
  const habit = userData.habits.find((h: any) => h.id === req.params.id);
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const date = req.body.date || getRelativeDateString(0);
  const logIndex = habit.logs.indexOf(date);
  let completed = false;

  if (!habit.logTimes) habit.logTimes = [];

  if (logIndex > -1) {
    habit.logs.splice(logIndex, 1);
    const timePrefix = date;
    habit.logTimes = habit.logTimes.filter((t: string) => !t.startsWith(timePrefix));
  } else {
    habit.logs.push(date);
    habit.logs.sort();
    habit.logTimes.push(new Date().toISOString());
    completed = true;
  }

  let streak = 0;
  const sortedLogs = [...habit.logs].sort();
  if (sortedLogs.length > 0) {
    let currentStreak = 0;
    let expectedDate = new Date(sortedLogs[sortedLogs.length - 1]);

    for (let i = sortedLogs.length - 1; i >= 0; i--) {
      const logDate = new Date(sortedLogs[i]);
      const diffTime = Math.abs(expectedDate.getTime() - logDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        currentStreak++;
        expectedDate = logDate;
      } else {
        break;
      }
    }
    streak = currentStreak;
  }
  habit.streak = streak;

  let notification = null;
  if (completed && streak > 0 && streak % 3 === 0) {
    notification = {
      id: `notif-${Date.now()}`,
      title: "Streaks Optimization Active",
      message: `Fantastic consistency! You have unlocked a ${streak}-day streak on '${habit.name}'! J.A.R.V.I.S. recognizes your dedication.`,
      timestamp: new Date().toISOString(),
      type: "streak",
      read: false
    };
    userData.notifications.unshift(notification);
  }

  db.userData[req.user.id] = userData;
  dbService.saveDatabaseState(db);
  res.json({ success: true, habit, notification });
});

router.delete("/api/habits/:id", authenticateToken, (req: any, res: any) => {
  dbService.deleteHabit(req.user.id, req.params.id);
  res.json({ success: true });
});

// --- EXPENSES API ---
router.post("/api/expenses", authenticateToken, validateBody(expenseSchema), (req: any, res: any) => {
  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);
  const category = req.body.category || "misc";
  const amount = parseFloat(req.body.amount) || 0;

  const newExpense = {
    id: `exp-${Date.now()}`,
    amount,
    category,
    note: req.body.note || "",
    date: req.body.date || getRelativeDateString(0),
    isImpulsive: req.body.isImpulsive || false
  };

  userData.expenses.push(newExpense);

  const budget = userData.budgets.find((b: any) => b.category === category);
  const totalCategorySpend = userData.expenses
    .filter((e: any) => e.category === category && e.date.substring(0, 7) === newExpense.date.substring(0, 7))
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  let requiresExplanation = false;
  let notification = null;

  if (budget && totalCategorySpend > budget.limit) {
    requiresExplanation = true;
    notification = {
      id: `notif-${Date.now()}`,
      title: `Financial Budget Exceeded: ${category.toUpperCase()}`,
      message: `Aggregate spend ($${totalCategorySpend.toFixed(2)}) crossed your $${budget.limit} monthly allowance! Auditing explanation required.`,
      timestamp: new Date().toISOString(),
      type: "budget",
      read: false
    };
    userData.notifications.unshift(notification);
  }

  if (!userData.userPatterns) {
    userData.userPatterns = {
      taskCompletionByHour: {},
      mostProductiveDay: "Tuesday",
      mostSkippedHabit: "Exercise",
      avgTasksCompletedPerDay: 4.2,
      streakBreakDays: ["Sunday"],
      spendingByCategory: {},
      focusSessionAvgMinutes: 47,
      goalProgressRate: 0.65
    };
  }
  if (!userData.userPatterns.spendingByCategory) {
    userData.userPatterns.spendingByCategory = {};
  }
  userData.userPatterns.spendingByCategory[category] = (userData.userPatterns.spendingByCategory[category] || 0) + amount;

  db.userData[req.user.id] = userData;
  dbService.saveDatabaseState(db);
  res.json({ success: true, expense: newExpense, requiresExplanation, totalSpend: totalCategorySpend, notification });
});

router.post("/api/expenses/:id/explain", authenticateToken, (req: any, res: any) => {
  const db = dbService.getDatabaseState();
  const userData = dbService.getUserData(req.user.id);
  const expense = userData.expenses.find((e: any) => e.id === req.params.id);
  if (!expense) return res.status(404).json({ error: "Expense not found" });

  expense.isImpulsive = true;
  expense.explanation = req.body.explanation || "No explanation provided.";

  db.userData[req.user.id] = userData;
  dbService.saveDatabaseState(db);
  res.json({ success: true, expense });
});

// --- BUDGETS API ---
router.post("/api/budgets", authenticateToken, validateBody(budgetSchema), (req: any, res: any) => {
  const budgets = dbService.saveBudget(req.user.id, req.body.category, req.body.limit);
  res.json({ success: true, budgets });
});

// --- NOTIFICATIONS API ---
router.post("/api/notifications/clear-unread", authenticateToken, (req: any, res: any) => {
  dbService.clearUnreadNotifications(req.user.id);
  res.json({ success: true });
});

// --- SLEEP API ---
router.post("/api/sleep", authenticateToken, validateBody(sleepSchema), (req: any, res: any) => {
  const { sleepTime, wakeTime, duration, date } = req.body;
  const entry = { sleepTime, wakeTime, duration: parseFloat(duration), date };
  dbService.saveSleepLog(req.user.id, entry);
  res.json({ success: true, sleepLog: entry });
});

router.get("/api/sleep/today", authenticateToken, (req: any, res: any) => {
  const sleepLogs = dbService.getSleepLogs(req.user.id);
  const today = new Date().toISOString().split("T")[0];
  const log = sleepLogs.find((s: any) => s.date === today);
  res.json(log || null);
});

export default router;
