import express from "express";
import path from "path";
import fs from "fs";
import * as vite from "vite";
const createViteServer = vite.createServer;
import OpenAI from "openai";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import multer from "multer";
import cron from "node-cron";
import {
  generateSeedData,
  calculateHabitPatterns,
  calculateHabitRisk,
  calculateEnergyLevels,
  calculateCorrelations,
  calculateGoalPacing,
  checkAchievements,
  synthesizeAIDashboard,
  getDaysBetween,
  detectUpcomingDeadlines,
  evaluateOutcomeMetrics
} from "./piggyIntelligence.js";
import { buildPiggyPrompt } from "./piggyPromptBuilder.js";
import { formatPiggyResponse } from "./piggyFormatter.js";
import { transitionWorkflowState } from "./piggyWorkflow.js";
import { executeAgentGoal } from "./piggyExecutor.js";
import { verifyResponse } from "./piggyVerifier.js";
import { scoreConfidence } from "./piggyConfidence.js";
import { runRetryLoop } from "./piggyRetry.js";
import { generateAndSaveReflection } from "./piggyReflection.js";
import { parseAndSaveMemoryUpdates } from "./piggyMemoryUpdater.js";
import { autoTrackGoalProgress } from "./piggyGoalTracker.js";
import { queryGroq } from "./piggyClient.js";
import { runThinkingPipeline } from "./piggyThinking.js";
import { startBackgroundAgent } from "./piggyBackground.js";
import { initializeScheduler } from "./piggyScheduler.js";
import { runAutonomousAgentLoop } from "./piggyAutonomy.js";


declare global {
  namespace Express {
    interface Request {
      user: any;
    }
  }
}

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-lifeos";
const otpStore: Record<string, { otp: string; expiry: number; data?: string }> = {};

// Safe transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || ""
  }
});

// Configure Multer for avatar file uploads
const uploadDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

const app = express();
const PORT = 5001;
const DB_FILE = path.join(process.cwd(), "lifeos_db.json");

app.use(express.json({ limit: "10mb" }));

// On every JSON response, ensure charset
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// Serve the uploads folder statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// JWT authorization middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// --- GROQ AI INITIALIZATION ---
let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is required");
    }
    // Point the OpenAI SDK to Groq's servers
    openaiInstance = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });
  }
  return openaiInstance;
}

// Format dates relative to current date for seeding
function getRelativeDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}

function getRelativeTimeString(hoursOffset: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursOffset);
  return d.toISOString();
}

function generateSuccessLogs(length: number): string[] {
  const logs: string[] = [];
  for (let i = length - 1; i >= 0; i--) {
    logs.push(getRelativeDateString(-i));
  }
  return logs;
}

// Initial Data Seed
const defaultData = () => ({
  profile: {
    name: "Alex Mercer",
    email: "alex.mercer@stark.corp",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120",
    budgetLimit: 1200,
    aiPersonality: "Logical",
    dailyPlanningReminderTime: "21:00",
    hasPlannedTomorrow: false,
    listeningMode: "push-to-talk",
    proactiveModeEnabled: true,
    maxProactiveNudges: 2,
    dailyReviewTime: "21:30",
    learnedPatterns: [
      "Peak cognitive focus observed between 19:00 - 22:00 hours for coding studies.",
      "Skipping morning cardio blocks exhibits an 18% average reduction in task consistency index.",
      "Late-night eating category shows high susceptibility to emotional impulse buys (average $38/spend).",
      "Goal streak consistency rises by 42% when tasks are completed prior to 20:00 hours."
    ]
  },
  tasks: [],
  habits: [],
  goals: [],
  expenses: [],
  budgets: [
    { category: "food", limit: 300 },
    { category: "transportation", limit: 100 },
    { category: "shopping", limit: 250 },
    { category: "education", limit: 200 },
    { category: "healthcare", limit: 100 },
    { category: "entertainment", limit: 150 },
    { category: "misc", limit: 100 }
  ],
  chatHistory: [
    {
      id: "chat-1",
      role: "assistant",
      content: "Welcome to LifeOS. I am fully configured and online. I am J.A.R.V.I.S — your cognitive life advisor.",
      timestamp: getRelativeTimeString(0),
      type: "chat"
    }
  ],
  notifications: []
});

// Database utilities
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const data = { users: [], userData: {} };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
      return data;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error("Error reading database file", err);
    return { users: [], userData: {} };
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database file", err);
  }
}

// User data resolution helper
function getUserData(db: any, userId: string) {
  if (!db.userData) {
    db.userData = {};
  }
  if (!db.userData[userId]) {
    const defaults = defaultData();
    const userProfile = db.users?.find((u: any) => u.id === userId);
    const seed = generateSeedData(userId);
    db.userData[userId] = {
      profile: {
        ...defaults.profile,
        name: userProfile?.name || "New User",
        email: userProfile?.email || "",
        avatar: userProfile?.avatarUrl || ""
      },
      tasks: seed.tasks,
      habits: seed.habits,
      goals: seed.goals,
      expenses: seed.expenses,
      moods: seed.moods,
      sleepLogs: seed.sleepLogs,
      focusSessions: seed.focusSessions,
      aiMemory: seed.aiMemory,
      recommendationsFeedback: seed.recommendationsFeedback,
      monthlySnapshots: seed.monthlySnapshots,
      reflections: [],
      budgets: defaults.budgets,
      chatHistory: defaults.chatHistory,
      notifications: [],
      userPatterns: {
        taskCompletionByHour: {},
        mostProductiveDay: "Tuesday",
        mostSkippedHabit: "Exercise",
        avgTasksCompletedPerDay: 4.2,
        streakBreakDays: ["Sunday"],
        spendingByCategory: {},
        focusSessionAvgMinutes: 47,
        goalProgressRate: 0.65
      }
    };
  } else {
    // Retroactively seed existing user if they lack the new features
    const seed = generateSeedData(userId);
    if (!db.userData[userId].focusSessions) {
      db.userData[userId].focusSessions = seed.focusSessions;
    }
    if (!db.userData[userId].sleepLogs || db.userData[userId].sleepLogs.length === 0) {
      db.userData[userId].sleepLogs = seed.sleepLogs;
    }
    if (!db.userData[userId].moods || db.userData[userId].moods.length === 0) {
      db.userData[userId].moods = seed.moods;
    }
    if (!db.userData[userId].habits || db.userData[userId].habits.length === 0) {
      db.userData[userId].habits = seed.habits;
    }
    if (!db.userData[userId].goals || db.userData[userId].goals.length === 0) {
      db.userData[userId].goals = seed.goals;
    }
    if (!db.userData[userId].expenses || db.userData[userId].expenses.length === 0) {
      db.userData[userId].expenses = seed.expenses;
    }
    if (!db.userData[userId].tasks || db.userData[userId].tasks.length === 0) {
      db.userData[userId].tasks = seed.tasks;
    }
    if (!db.userData[userId].aiMemory || db.userData[userId].aiMemory.length === 0) {
      db.userData[userId].aiMemory = seed.aiMemory;
    }
    if (!db.userData[userId].recommendationsFeedback || db.userData[userId].recommendationsFeedback.length === 0) {
      db.userData[userId].recommendationsFeedback = seed.recommendationsFeedback;
    }
    if (!db.userData[userId].monthlySnapshots || db.userData[userId].monthlySnapshots.length === 0) {
      db.userData[userId].monthlySnapshots = seed.monthlySnapshots;
    }
    if (!db.userData[userId].reflections) {
      db.userData[userId].reflections = [];
    }
  }
  return db.userData[userId];
}

// --- AUTHENTICATION MODULE ---
app.post('/api/auth/register', async (req: any, res: any) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });

  const db = readDB();
  if (!db.users) db.users = [];
  if (db.users.find((u: any) => u.email === email)) return res.status(400).json({ error: 'Email already registered' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expiry: Date.now() + 5 * 60 * 1000 };

  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'LifeOS — Verify your account',
        html: `<h2>Welcome to LifeOS</h2><p>Your verification code is:</p><h1 style="letter-spacing: 8px; color: #F5A623;">${otp}</h1><p>This code expires in 5 minutes.</p>`
      });
      console.log(`[LifeOS OTP] Email sent successfully to ${email}`);
    } else {
      console.log(`\n[LifeOS OTP WARNING] SMTP is not configured. Logged OTP for ${email}: ${otp}\n`);
    }
  } catch (mailError: any) {
    console.error("Nodemailer failed. Error:", mailError.message);
    console.log(`\n[LifeOS OTP FALLBACK] Logged OTP for ${email}: ${otp}\n`);
  }

  otpStore[email + '_data'] = { otp: JSON.stringify({ name, email, password }), expiry: Date.now() + 5 * 60 * 1000 };
  res.json({ message: 'OTP sent to email' });
});

app.post('/api/auth/verify-otp', async (req: any, res: any) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record || record.otp !== otp || Date.now() > record.expiry) return res.status(400).json({ error: 'Invalid or expired OTP' });
  const pendingRecord = otpStore[email + '_data'];
  if (!pendingRecord) return res.status(400).json({ error: 'Pending registration expired or missing.' });

  const pendingData = JSON.parse(pendingRecord.otp);
  const passwordHash = await bcrypt.hash(pendingData.password, 10);
  const db = readDB();

  const newUser = { id: `user-${Date.now()}`, name: pendingData.name, email: pendingData.email, passwordHash, avatarUrl: null, createdAt: new Date().toISOString() };
  if (!db.users) db.users = [];
  db.users.push(newUser);
  writeDB(db);

  delete otpStore[email];
  delete otpStore[email + '_data'];

  const token = jwt.sign({ id: newUser.id, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
  getUserData(db, newUser.id);
  writeDB(db);

  res.json({ token, user: { name: newUser.name, email: newUser.email, avatarUrl: null, id: newUser.id } });
});

app.post('/api/auth/login', async (req: any, res: any) => {
  const { email, password } = req.body;
  const db = readDB();

  if (!db.users) db.users = [];
  const user = db.users.find((u: any) => u.email === email);

  if (!user) return res.status(401).json({ error: 'User not found' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Wrong password' });

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { name: user.name, email: user.email, avatarUrl: user.avatarUrl, id: user.id } });
});

app.post('/api/profile/avatar', authenticateToken, upload.single('avatar'), (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const db = readDB();
  const user = db.users?.find((u: any) => u.id === req.user.id);
  if (user) {
    user.avatarUrl = avatarUrl;
    const userData = getUserData(db, req.user.id);
    if (userData && userData.profile) userData.profile.avatar = avatarUrl;
    writeDB(db);
  }
  res.json({ avatarUrl });
});

app.get("/api/data", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  res.json(getUserData(db, req.user.id));
});

app.post("/api/profile", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  userData.profile = { ...userData.profile, ...req.body };
  writeDB(db);
  res.json({ success: true, profile: userData.profile });
});

// --- GOALS API MODULE ---
app.post("/api/goals", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const newGoal = {
    id: `goal-${Date.now()}`,
    title: req.body.title || "New Goal",
    description: req.body.description || "",
    targetDate: req.body.targetDate || getRelativeDateString(30),
    progress: req.body.progress || 0,
    status: req.body.status || "active"
  };
  if (!userData.goals) userData.goals = [];
  userData.goals.push(newGoal);
  writeDB(db);
  res.json({ success: true, goal: newGoal });
});

app.put("/api/goals/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  if (!userData.goals) userData.goals = [];
  const index = userData.goals.findIndex((g: any) => g.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Goal not found" });

  userData.goals[index] = { ...userData.goals[index], ...req.body };
  writeDB(db);
  res.json({ success: true, goal: userData.goals[index] });
});

app.delete("/api/goals/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  if (!userData.goals) userData.goals = [];
  userData.goals = userData.goals.filter((g: any) => g.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// Focus score system
app.post("/api/focus-score", authenticateToken, (req: any, res: any) => {
  const { durationMinutes = 25, completedTasks = 0, distractions = 0 } = req.body;
  const score = Math.min(100, Math.max(0, (durationMinutes * 2) + (completedTasks * 10) - distractions));

  const db = readDB();
  const userData = getUserData(db, req.user.id);
  if (!userData.focusSessions) userData.focusSessions = [];

  const session = {
    durationMinutes,
    completedTasks,
    distractions,
    score,
    timestamp: new Date().toISOString()
  };
  userData.focusSessions.push(session);
  writeDB(db);

  res.json({ score, durationMinutes, createdAt: new Date() });
});

app.get("/api/focus-score/history", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  res.json({ history: userData.focusSessions || [] });
});

// --- TASKS API MODULE ---
app.post("/api/tasks", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
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
  userData.tasks.push(newTask);
  writeDB(db);
  res.json({ success: true, task: newTask });
});

app.put("/api/tasks/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const index = userData.tasks.findIndex((t: any) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Task not found" });

  const existingTask = userData.tasks[index];
  const oldStatus = existingTask.status;
  const newStatus = req.body.status;

  if (newStatus === "completed" && oldStatus !== "completed") {
    const hour = new Date().getHours().toString();
    if (!userData.userPatterns) userData.userPatterns = { taskCompletionByHour: {}, mostProductiveDay: "Tuesday", mostSkippedHabit: "Exercise", avgTasksCompletedPerDay: 4.2, streakBreakDays: ["Sunday"], spendingByCategory: {}, focusSessionAvgMinutes: 47, goalProgressRate: 0.65 };
    if (!userData.userPatterns.taskCompletionByHour) userData.userPatterns.taskCompletionByHour = {};
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

  writeDB(db);
  res.json({ success: true, task: userData.tasks[index], notification });
});

app.delete("/api/tasks/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  userData.tasks = userData.tasks.filter((t: any) => t.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- HABITS API MODULE ---
app.post("/api/habits", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const newHabit = {
    id: `habit-${Date.now()}`,
    name: req.body.name || "New Habit",
    frequency: req.body.frequency || "daily",
    streak: 0,
    logs: [],
    skippedDaysCount: 0,
    icon: req.body.icon || ""
  };
  userData.habits.push(newHabit);
  writeDB(db);
  res.json({ success: true, habit: newHabit });
});

app.post("/api/habits/:id/toggle", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
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

  writeDB(db);
  res.json({ success: true, habit, notification });
});

app.delete("/api/habits/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  userData.habits = userData.habits.filter((h: any) => h.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- EXPENSES API MODULE ---
app.post("/api/expenses", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
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
    userData.userPatterns = { taskCompletionByHour: {}, mostProductiveDay: "Tuesday", mostSkippedHabit: "Exercise", avgTasksCompletedPerDay: 4.2, streakBreakDays: ["Sunday"], spendingByCategory: {}, focusSessionAvgMinutes: 47, goalProgressRate: 0.65 };
  }
  if (!userData.userPatterns.spendingByCategory) userData.userPatterns.spendingByCategory = {};
  userData.userPatterns.spendingByCategory[category] = (userData.userPatterns.spendingByCategory[category] || 0) + amount;

  writeDB(db);
  res.json({ success: true, expense: newExpense, requiresExplanation, totalSpend: totalCategorySpend, notification });
});

app.post("/api/expenses/:id/explain", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const expense = userData.expenses.find((e: any) => e.id === req.params.id);
  if (!expense) return res.status(404).json({ error: "Expense not found" });

  expense.isImpulsive = true;
  expense.explanation = req.body.explanation || "No explanation provided.";

  writeDB(db);
  res.json({ success: true, expense });
});

app.post("/api/budgets", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const { category, limit } = req.body;
  const index = userData.budgets.findIndex((b: any) => b.category === category);
  if (index > -1) {
    userData.budgets[index].limit = limit;
  } else {
    userData.budgets.push({ category, limit });
  }
  writeDB(db);
  res.json({ success: true, budgets: userData.budgets });
});

app.post("/api/notifications/clear-unread", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  userData.notifications.forEach((n: any) => n.read = true);
  writeDB(db);
  res.json({ success: true });
});

// --- GROQ / J.A.R.V.I.S CHAT ---
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

app.post("/api/jarvis/chat", authenticateToken, async (req: any, res: any) => {
  const { message, activeContext } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required." });

  const startTime = Date.now();
  const db = readDB();
  const userData = getUserData(db, req.user.id);

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
    writeDB(db);

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
    writeDB(db);
    res.json({ success: true, reply: fallbackText, history: userData.chatHistory, simulated: true });
  }
});


// --- GROQ SMART PLANNING ENGINE ---
app.post("/api/smart-planner", authenticateToken, async (req: any, res: any) => {
  const { workHours, sleepHours, personalPriorities, exercisePreference } = req.body;
  const db = readDB();
  const userData = getUserData(db, req.user.id);

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

// --- GROQ PREDICTIVE INTELLIGENCE ---
app.post("/api/predictive-outcomes", authenticateToken, async (req: any, res: any) => {
  const { primaryGoal, timeframeMonths } = req.body;
  if (!primaryGoal) return res.status(400).json({ error: "Goal is required." });

  const db = readDB();
  const userData = getUserData(db, req.user.id);
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

app.get('/api/jarvis/daily-brief', authenticateToken, async (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const insights = [];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toISOString().split('T')[0];

  userData.habits.forEach((habit: any) => {
    if (!habit.logs?.includes(yDate)) {
      insights.push(`⚠️ You missed "${habit.name}" yesterday — your streak of ${habit.streak} days is at risk.`);
    }
  });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
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
      const hardTask = userData.tasks.find((t: any) => t.status === 'pending' && t.category === 'urgent-important');
      if (hardTask) {
        insights.push(`⚡ You're in your peak focus window right now. Perfect time to tackle "${hardTask.title}".`);
      }
    }
  }

  res.json({ insights, generatedAt: new Date().toISOString() });
});

app.get('/api/jarvis/morning-brief', authenticateToken, async (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const urgentTasks = userData.tasks.filter((t: any) => t.status === 'pending' && t.category === 'urgent-important');
  const topTask = urgentTasks[0] || userData.tasks.find((t: any) => t.status === 'pending') || { title: "No pending tasks logged, Sir." };

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

  const briefText = `Good morning, ${req.user.name}. Today is ${dayName}, ${dateStr}.${sleepText} You have ${urgentTasks.length} urgent tasks on your deck. Your highest priority is "${topTask.title}". Your habit streak for "${longestStreakHabit.name}" is currently at ${longestStreakHabit.streak} days — let's keep it alive today. Your monthly budget is ${budgetPercent}% utilized, with $${remaining.toFixed(2)} remaining. Based on your behavioral patterns, your peak focus window starts at ${getPeakHours(userData.userPatterns).split(' ')[0]}. Shall we build your schedule for today?`;

  res.json({ briefText, generatedAt: new Date().toISOString() });
});

app.get('/api/analytics/weekly-review', authenticateToken, async (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);

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

// --- GROQ VISION RECEIPT SCANNER ---
app.post('/api/expenses/scan-receipt', authenticateToken, upload.single('receipt'), async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: "No receipt image uploaded." });
  }

  try {
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = imageData.toString('base64');
    const ai = getOpenAI();

    const response = await ai.chat.completions.create({
      // We must use Groq's vision model for image tasks
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: "text", text: 'Extract expense information from this receipt image. Return ONLY a JSON object with the schema: {"amount": number, "merchant": string, "category": string, "date": string, "note": string}.' },
            { type: "image_url", image_url: { url: `data:${req.file.mimetype};base64,${base64Image}` } }
          ]
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    const allowed = ['food', 'transportation', 'shopping', 'education', 'healthcare', 'entertainment', 'misc'];
    if (!allowed.includes(parsed.category)) {
      if (parsed.category === 'transport') parsed.category = 'transportation';
      else if (parsed.category === 'health') parsed.category = 'healthcare';
      else parsed.category = 'misc';
    }

    res.json(parsed);

  } catch (error: any) {
    console.error("Receipt Scan Groq Error:", error.message);
    const fallbackScan = {
      amount: 24.50,
      merchant: "LifeOS Scanner (Offline)",
      category: "shopping",
      date: new Date().toISOString().split("T")[0],
      note: "Receipt scanner processed in offline simulation mode due to Vision API limit/error."
    };
    res.json(fallbackScan);
  }
});
// --- PROACTIVE NUDGE ENGINE ---
app.post("/api/jarvis/trigger-nudge", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);

  // Get today's name (e.g., "Sunday")
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
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

  if (nudgesGenerated > 0) writeDB(db);

  res.json({
    success: true,
    nudgesGenerated,
    message: nudgesGenerated > 0 ? `Deployed ${nudgesGenerated} proactive warnings.` : "Operational baseline stable. No risks detected."
  });
});
// --- TRACKNET VISION BRIDGE ---
app.post('/api/vision/track', authenticateToken, upload.single('video'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: "No video payload detected." });

  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
    const formData = new FormData();
    formData.append('video', fileBlob, req.file.filename);

    const pythonResponse = await fetch('http://127.0.0.1:5002/api/track', {
      method: 'POST',
      body: formData
    });

    const result = await pythonResponse.json();
    res.json(result);
  } catch (error: any) {
    console.error("TrackNet Communication Failure:", error.message);
    res.status(500).json({ error: "Visual cortex offline or unreachable." });
  }
});
// =========================
// PIGGY AI v3.0 INTELLIGENCE ENDPOINTS
// =========================
app.get("/api/piggy/dashboard", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);

  // Calculate dynamic outcomes for accepted recommendations
  evaluateOutcomeMetrics(userData);
  writeDB(db);

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

  res.json({
    success: true,
    cockpit,
    habitsData,
    correlations,
    achievements,
    aiMemory: userData.aiMemory || [],
    recommendationsFeedback: userData.recommendationsFeedback || [],
    monthlySnapshots: userData.monthlySnapshots || [],
    deadlines
  });
});

app.get("/api/piggy/coaching", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
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

app.get("/api/piggy/reflections", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  res.json({ success: true, reflections: userData.reflections || [] });
});

app.post("/api/piggy/reflection/generate", authenticateToken, async (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const todayStr = new Date().toISOString().split("T")[0];

  if (!userData.reflections) userData.reflections = [];
  const existing = userData.reflections.find((r: any) => r.date === todayStr);
  if (existing) {
    return res.json({ success: true, reflection: existing });
  }

  const completedHabits = userData.habits.filter((h: any) => h.logs.includes(todayStr)).length;
  const totalHabits = userData.habits.length;

  const todaySleep = userData.sleepLogs.find((s: any) => s.date === todayStr)?.duration || 7.5;
  const todayMood = userData.moods.find((m: any) => m.createdAt.startsWith(todayStr))?.mood || "good";
  const todayFocusSessions = userData.focusSessions.filter((s: any) => s.timestamp.startsWith(todayStr));
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
  writeDB(db);

  res.json({ success: true, reflection });
});

// Add new memory to user vault (Sub-Engine 1)
app.post("/api/piggy/memory", authenticateToken, (req: any, res: any) => {
  const { fact, category } = req.body;
  if (!fact || !category) return res.status(400).json({ error: "Fact and category are required." });

  const db = readDB();
  const userData = getUserData(db, req.user.id);
  if (!userData.aiMemory) userData.aiMemory = [];

  const newFact = {
    id: `mem-${Date.now()}`,
    fact,
    category,
    timestamp: new Date().toISOString()
  };

  userData.aiMemory.push(newFact);
  writeDB(db);
  res.json({ success: true, fact: newFact });
});

// Delete memory from user vault (Sub-Engine 1)
app.delete("/api/piggy/memory/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  if (!userData.aiMemory) userData.aiMemory = [];

  userData.aiMemory = userData.aiMemory.filter((m: any) => m.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// Log suggestion feedback loop (Sub-Engine 2 & 3)
app.post("/api/piggy/feedback", authenticateToken, (req: any, res: any) => {
  const { text, type, status, habitId } = req.body;
  if (!text || !status) return res.status(400).json({ error: "Text and status are required." });

  const db = readDB();
  const userData = getUserData(db, req.user.id);
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
  writeDB(db);
  res.json({ success: true, feedback: newFeedback });
});

// Proactive autonomous loops trigger
app.post("/api/agent/autonomous-loop", authenticateToken, async (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const observation = await runAutonomousAgentLoop(userData);
  writeDB(db);
  res.json({ success: true, observation });
});

// Setup Vite & static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

// Cron job to run at 9 PM (21:00) every day for daily habit completion checks
cron.schedule("0 21 * * *", () => {
  console.log("[LifeOS Cron] Running daily habit conformance checklist at 21:00...");
  const db = readDB();
  const todayStr = new Date().toISOString().split("T")[0];
  let changes = false;

  Object.keys(db.userData || {}).forEach((userId) => {
    const userData = db.userData[userId];
    if (userData && userData.habits) {
      userData.habits.forEach((habit: any) => {
        if (!habit.logs.includes(todayStr)) {
          const notification = {
            id: `nudge-${Date.now()}-${habit.id}`,
            title: "⚠️ Streak Risk Warning",
            message: `Sir, daily review time is approaching. Your habit '${habit.name}' is not yet completed today. Maintain your streak!`,
            timestamp: new Date().toISOString(),
            type: "warning" as const,
            read: false
          };
          const alreadyNudged = userData.notifications.some((n: any) => n.id.includes(habit.id) && n.timestamp.startsWith(todayStr));
          if (!alreadyNudged) {
            userData.notifications.unshift(notification);
            changes = true;
          }
        }
      });
    }
  });

  if (changes) {
    writeDB(db);
  }
});

startServer().then(() => {
  const db = readDB();
  startBackgroundAgent(db, writeDB);
  initializeScheduler(db, writeDB);
});

// =========================
// MOOD TRACKER
// =========================
app.post("/api/mood", authenticateToken, (req, res) => {
  const { mood, note } = req.body;
  const db = readDB();
  const userData = getUserData(db, req.user.id);

  if (!userData.moods) userData.moods = [];

  const entry = {
    id: Date.now().toString(),
    mood,
    note: note || "",
    createdAt: new Date().toISOString()
  };

  userData.moods.push(entry);
  writeDB(db);

  res.json({ success: true, mood: entry });
});

app.get("/api/mood/today", authenticateToken, (req, res) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const today = new Date().toISOString().slice(0, 10);
  const mood = userData.moods?.find((m: any) => m.createdAt.startsWith(today));
  res.json(mood || null);
});

// =========================
// SLEEP TRACKER
// =========================
app.post("/api/sleep", authenticateToken, (req: any, res: any) => {
  const { sleepTime, wakeTime, duration, date } = req.body;
  const db = readDB();
  const userData = getUserData(db, req.user.id);

  if (!userData.sleepLogs) userData.sleepLogs = [];
  const index = userData.sleepLogs.findIndex((s: any) => s.date === date);
  const entry = { sleepTime, wakeTime, duration: parseFloat(duration), date };

  if (index > -1) {
    userData.sleepLogs[index] = entry;
  } else {
    userData.sleepLogs.push(entry);
  }

  writeDB(db);
  res.json({ success: true, sleepLog: entry });
});

app.get("/api/sleep/today", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const today = new Date().toISOString().split("T")[0];
  if (!userData.sleepLogs) userData.sleepLogs = [];
  const log = userData.sleepLogs.find((s: any) => s.date === today);
  res.json(log || null);
});
