import express, { Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";
import { dbService } from "../db/index.js";
import { validateBody } from "../middleware/validate.js";
import { taskSchema } from "../validators/task.schema.js";
import { habitSchema } from "../validators/habit.schema.js";
import { goalSchema } from "../validators/goal.schema.js";
import { expenseSchema, budgetSchema } from "../validators/expense.schema.js";
import { sleepSchema } from "../validators/sleep.schema.js";

// Services
import { TaskService } from "../services/taskService.js";
import { HabitService } from "../services/habitService.js";
import { GoalService } from "../services/goalService.js";
import { ExpenseService } from "../services/expenseService.js";
import { SleepService } from "../services/sleepService.js";
import { logger } from "../logger.js";

const router = express.Router();

// --- CORE DATA RESOLUTION ---
router.get("/api/data", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const summary = dbService.getUserDataSummary(req.user!.id);
    res.json(summary);
  } catch (error: any) {
    logger.error("GET /api/data error:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve user data." });
  }
});

router.post("/api/profile", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const profile = dbService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, profile });
  } catch (error: any) {
    logger.error("POST /api/profile error:", error);
    res.status(500).json({ error: error.message || "Failed to update profile." });
  }
});

// --- GOALS API ---
router.post("/api/goals", authenticateToken, validateBody(goalSchema), (req: AuthRequest, res: Response) => {
  try {
    const goal = GoalService.createGoal(req.user!.id, req.body);
    res.json({ success: true, goal });
  } catch (error: any) {
    logger.error("POST /api/goals error:", error);
    res.status(500).json({ error: error.message || "Failed to create goal." });
  }
});

router.put("/api/goals/:id", authenticateToken, validateBody(goalSchema.partial()), (req: AuthRequest, res: Response) => {
  try {
    const goal = GoalService.updateGoal(req.user!.id, req.params.id as string, req.body);
    res.json({ success: true, goal });
  } catch (error: any) {
    logger.error("PUT /api/goals error:", error);
    res.status(500).json({ error: error.message || "Failed to update goal." });
  }
});

router.delete("/api/goals/:id", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    GoalService.deleteGoal(req.user!.id, req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    logger.error("DELETE /api/goals error:", error);
    res.status(500).json({ error: error.message || "Failed to delete goal." });
  }
});

// --- FOCUS SCORE SYSTEM ---
router.post("/api/focus-score", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { durationMinutes = 25, completedTasks = 0, distractions = 0 } = req.body;
    const score = Math.min(100, Math.max(0, (durationMinutes * 2) + (completedTasks * 10) - distractions));

    const db = dbService.getDatabaseState() as any;
    const userData = dbService.getUserData(req.user!.id);
    if (!userData.focusSessions) userData.focusSessions = [];

    const session = {
      durationMinutes,
      completedTasks,
      distractions,
      score,
      timestamp: new Date().toISOString()
    };
    userData.focusSessions.push(session);
    db.userData[req.user!.id] = userData;
    dbService.saveDatabaseState(db);

    res.json({ score, durationMinutes, createdAt: new Date() });
  } catch (error: any) {
    logger.error("POST /api/focus-score error:", error);
    res.status(500).json({ error: error.message || "Failed to save focus score." });
  }
});

router.get("/api/focus-score/history", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userData = dbService.getUserData(req.user!.id);
    res.json({ history: userData.focusSessions || [] });
  } catch (error: any) {
    logger.error("GET /api/focus-score/history error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch focus history." });
  }
});

// --- TASKS API ---
router.post("/api/tasks", authenticateToken, validateBody(taskSchema), (req: AuthRequest, res: Response) => {
  try {
    const task = TaskService.createTask(req.user!.id, req.body);
    res.json({ success: true, task });
  } catch (error: any) {
    logger.error("POST /api/tasks error:", error);
    res.status(500).json({ error: error.message || "Failed to create task." });
  }
});

router.put("/api/tasks/:id", authenticateToken, validateBody(taskSchema.partial()), (req: AuthRequest, res: Response) => {
  try {
    const { task, notification } = TaskService.updateTask(req.user!.id, req.params.id as string, req.body);
    res.json({ success: true, task, notification });
  } catch (error: any) {
    logger.error("PUT /api/tasks error:", error);
    res.status(500).json({ error: error.message || "Failed to update task." });
  }
});

router.delete("/api/tasks/:id", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    TaskService.deleteTask(req.user!.id, req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    logger.error("DELETE /api/tasks error:", error);
    res.status(500).json({ error: error.message || "Failed to delete task." });
  }
});

// --- HABITS API ---
router.post("/api/habits", authenticateToken, validateBody(habitSchema), (req: AuthRequest, res: Response) => {
  try {
    const habit = HabitService.createHabit(req.user!.id, req.body);
    res.json({ success: true, habit });
  } catch (error: any) {
    logger.error("POST /api/habits error:", error);
    res.status(500).json({ error: error.message || "Failed to create habit." });
  }
});

router.post("/api/habits/:id/toggle", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { habit, notification } = HabitService.toggleHabit(req.user!.id, req.params.id as string, req.body);
    res.json({ success: true, habit, notification });
  } catch (error: any) {
    logger.error("POST /api/habits/toggle error:", error);
    res.status(500).json({ error: error.message || "Failed to toggle habit." });
  }
});

router.delete("/api/habits/:id", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    HabitService.deleteHabit(req.user!.id, req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    logger.error("DELETE /api/habits error:", error);
    res.status(500).json({ error: error.message || "Failed to delete habit." });
  }
});

// --- EXPENSES API ---
router.post("/api/expenses", authenticateToken, validateBody(expenseSchema), (req: AuthRequest, res: Response) => {
  try {
    const result = ExpenseService.addExpense(req.user!.id, req.body);
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.error("POST /api/expenses error:", error);
    res.status(500).json({ error: error.message || "Failed to add expense." });
  }
});

router.post("/api/expenses/:id/explain", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const expense = ExpenseService.explainExpense(req.user!.id, req.params.id as string, req.body.explanation);
    res.json({ success: true, expense });
  } catch (error: any) {
    logger.error("POST /api/expenses/explain error:", error);
    res.status(500).json({ error: error.message || "Failed to explain expense." });
  }
});

// --- BUDGETS API ---
router.post("/api/budgets", authenticateToken, validateBody(budgetSchema), (req: AuthRequest, res: Response) => {
  try {
    const budgets = ExpenseService.saveBudget(req.user!.id, req.body.category, req.body.limit);
    res.json({ success: true, budgets });
  } catch (error: any) {
    logger.error("POST /api/budgets error:", error);
    res.status(500).json({ error: error.message || "Failed to save budget." });
  }
});

// --- NOTIFICATIONS API ---
router.post("/api/notifications/clear-unread", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    dbService.clearUnreadNotifications(req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error("POST /api/notifications/clear-unread error:", error);
    res.status(500).json({ error: error.message || "Failed to clear notifications." });
  }
});

// --- SLEEP API ---
router.post("/api/sleep", authenticateToken, validateBody(sleepSchema), (req: AuthRequest, res: Response) => {
  try {
    const sleepLog = SleepService.saveSleepLog(req.user!.id, req.body);
    res.json({ success: true, sleepLog });
  } catch (error: any) {
    logger.error("POST /api/sleep error:", error);
    res.status(500).json({ error: error.message || "Failed to save sleep log." });
  }
});

router.get("/api/sleep/today", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const log = SleepService.getTodaySleepLog(req.user!.id);
    res.json(log);
  } catch (error: any) {
    logger.error("GET /api/sleep/today error:", error);
    res.status(500).json({ error: error.message || "Failed to get sleep log." });
  }
});

// --- BACKUP RESTORE API ---
router.post("/api/data/import", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== "object") {
      return res.status(400).json({ error: "Invalid backup data structure." });
    }

    if (!Array.isArray(backupData.tasks) || !Array.isArray(backupData.habits) || !Array.isArray(backupData.goals)) {
      return res.status(400).json({ error: "Invalid database schema template." });
    }

    const db = dbService.getDatabaseState() as any;
    db[req.user!.id] = {
      ...db[req.user!.id],
      profile: { ...db[req.user!.id]?.profile, ...backupData.profile },
      tasks: backupData.tasks,
      habits: backupData.habits,
      goals: backupData.goals,
      expenses: backupData.expenses || [],
      budgets: backupData.budgets || [],
      notifications: backupData.notifications || [],
      chatHistory: backupData.chatHistory || []
    };

    dbService.saveDatabaseState(db);
    res.json({ success: true, message: "System state restored from backup parameters." });
  } catch (error: any) {
    logger.error("POST /api/data/import error:", error);
    res.status(500).json({ error: error.message || "Failed to import backup data." });
  }
});

export default router;
