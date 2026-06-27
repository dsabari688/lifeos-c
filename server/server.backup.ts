import express from "express";
declare global {
  namespace Express {
    interface Request {
      user: any;
    }
  }
}
import path from "path";
import fs from "fs";
import * as vite from "vite";
const createViteServer = vite.createServer;
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import multer from "multer";

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


// Lazy-loaded Gemini AI client
let aiInstance: GoogleGenAI | null = null;
function getGeminiAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
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

// Generate logs helper for seed
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
  tasks: [
    {
      id: "task-1",
      title: "Morning Cardio Workout (30 mins)",
      category: "important-not-urgent",
      date: getRelativeDateString(0),
      time: "07:00",
      recurType: "daily",
      status: "completed",
      rescheduledCount: 0
    },
    {
      id: "task-2",
      title: "Review Financial Portfolio & Budget",
      category: "urgent-important",
      date: getRelativeDateString(0),
      time: "10:30",
      recurType: "none",
      status: "pending",
      rescheduledCount: 0
    },
    {
      id: "task-3",
      title: "System Architecture Design Study",
      category: "important-not-urgent",
      date: getRelativeDateString(0),
      time: "14:00",
      recurType: "weekly",
      status: "completed",
      rescheduledCount: 0
    },
    {
      id: "task-4",
      title: "Rescheduled skipped task: Dental checkup",
      category: "not-urgent-not-important",
      date: getRelativeDateString(0),
      time: "16:00",
      recurType: "none",
      status: "pending",
      originalDate: getRelativeDateString(-2),
      rescheduledCount: 1
    }
  ],
  habits: [
    {
      id: "habit-1",
      name: "Deep Work Coding (2hrs)",
      frequency: "daily",
      streak: 5,
      logs: generateSuccessLogs(5),
      skippedDaysCount: 0
    },
    {
      id: "habit-2",
      name: "Meditation & Focus Practice",
      frequency: "daily",
      streak: 3,
      logs: generateSuccessLogs(3),
      skippedDaysCount: 1
    },
    {
      id: "habit-3",
      name: "Read Technical Articles",
      frequency: "daily",
      streak: 12,
      logs: generateSuccessLogs(12),
      skippedDaysCount: 0
    },
    {
      id: "habit-4",
      name: "No Emotional Splurges",
      frequency: "daily",
      streak: 8,
      logs: generateSuccessLogs(8),
      skippedDaysCount: 0
    }
  ],
  goals: [], // Array added to track Strategic Goals
  expenses: [
    {
      id: "exp-1",
      amount: 14.50,
      category: "food",
      note: "Healthy grain bowl lunch",
      date: getRelativeDateString(0),
      isImpulsive: false
    },
    {
      id: "exp-2",
      amount: 5.20,
      category: "transportation",
      note: "Metro subway commute",
      date: getRelativeDateString(0),
      isImpulsive: false
    },
    {
      id: "exp-3",
      amount: 120.00,
      category: "shopping",
      note: "Ergonomic keyboard upgrade",
      date: getRelativeDateString(-1),
      isImpulsive: true,
      explanation: "Mandatory office upgrade to reduce carpal tunnel pain."
    },
    {
      id: "exp-4",
      amount: 42.50,
      category: "entertainment",
      note: "Synthwave VR concerts ticket",
      date: getRelativeDateString(-2),
      isImpulsive: true,
      explanation: "Impulse late night buy, looked exceptionally fun."
    }
  ],
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
      content: "Welcome Alex. LifeOS is fully configured. I have compiled today's tasks and updated your habits streak logs. I am J.A.R.V.I.S — your cognitive life advisor.",
      timestamp: getRelativeTimeString(0),
      type: "chat"
    }
  ],
  notifications: [
    {
      id: "notif-1",
      title: "J.A.R.V.I.S. Core Online",
      message: "Initialization succeeded. Tap the micro-wave dynamic orb below at any time to query me or dictate status logs.",
      timestamp: getRelativeTimeString(0),
      type: "reminder",
      read: false
    },
    {
      id: "notif-2",
      title: "Budget Status Alert",
      message: "You have utilized 68% of your aggregate Entertainment budget. Spend conscientiously.",
      timestamp: getRelativeTimeString(-3),
      type: "budget",
      read: true
    },
    {
      id: "notif-3",
      title: "Streak Milestone!",
      message: "Your habit 'Read Technical Articles' has reached a robust consistency of 12 consecutive days.",
      timestamp: getRelativeTimeString(-24),
      type: "streak",
      read: false
    }
  ]
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
    
    // Auto-migrate old single-user database layout to new multi-user structure
    if (parsed && !parsed.users) {
      const alexId = "alex-mercer-id";
      const alexUser = {
        id: alexId,
        name: parsed.profile?.name || "Alex Mercer",
        email: parsed.profile?.email || "alex.mercer@stark.corp",
        passwordHash: "$2b$10$wKzPZ6f71dJ/rK6p1p1eOePqQ9Z2yL1cMh2uJ3gJ3k6o9G2O8.L2j", // default password: "password"
        avatarUrl: parsed.profile?.avatar || null,
        createdAt: new Date().toISOString()
      };

      const alexData = {
        profile: parsed.profile || defaultData().profile,
        tasks: parsed.tasks || defaultData().tasks,
        habits: parsed.habits || defaultData().habits,
        goals: parsed.goals || defaultData().goals,
        expenses: parsed.expenses || defaultData().expenses,
        budgets: parsed.budgets || defaultData().budgets,
        chatHistory: parsed.chatHistory || defaultData().chatHistory,
        notifications: parsed.notifications || defaultData().notifications,
        userPatterns: parsed.userPatterns || {
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

      const migrated = {
        users: [alexUser],
        userData: {
          [alexId]: alexData
        }
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(migrated, null, 2));
      return migrated;
    }

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
    db.userData[userId] = {
      profile: {
        ...defaults.profile,
        name: userProfile?.name || "New User",
        email: userProfile?.email || "",
        avatar: userProfile?.avatarUrl || ""
      },
      tasks: [],
      habits: [],
      goals: [],
      expenses: [],moods: [],
      budgets: defaults.budgets,
      chatHistory: [
        {
          id: `chat-${Date.now()}`,
          role: "assistant",
          content: `Welcome ${userProfile?.name || "Sir"}. LifeOS is fully configured. I am J.A.R.V.I.S — your cognitive life advisor.`,
          timestamp: new Date().toISOString(),
          type: "chat"
        }
      ],
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
  }
  return db.userData[userId];
}


// --- API ENDPOINTS ---

// --- AUTHENTICATION MODULE ---

// REGISTER — Step 1: Send OTP
app.post('/api/auth/register', async (req: any, res: any) => {
  const { name, email, password } = req.body;
  const db = readDB();

  if (!db.users) db.users = [];

  // Check if user exists
  if (db.users.find((u: any) => u.email === email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expiry: Date.now() + 5 * 60 * 1000 }; // 5 min expiry

  // Send OTP email with console log fallback
  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'LifeOS — Verify your account',
        html: `
          <h2>Welcome to LifeOS</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing: 8px; color: #F5A623;">${otp}</h1>
          <p>This code expires in 5 minutes.</p>
        `
      });
      console.log(`[LifeOS OTP] Email sent successfully to ${email}`);
    } else {
      console.log(`\n===============================================\n[LifeOS OTP WARNING] SMTP is not configured in .env. Logged OTP for ${email}: ${otp}\n===============================================\n`);
    }
  } catch (mailError: any) {
    console.error("Nodemailer failed. Falling back to console log. Error:", mailError.message);
    console.log(`\n===============================================\n[LifeOS OTP FALLBACK] Logged OTP for ${email}: ${otp}\n===============================================\n`);
  }

  // Temporarily store pending user
  otpStore[email + '_data'] = {
    otp: JSON.stringify({ name, email, password }),
    expiry: Date.now() + 5 * 60 * 1000
  };

  res.json({ message: 'OTP sent to email' });
});

// REGISTER — Step 2: Verify OTP
app.post('/api/auth/verify-otp', async (req: any, res: any) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record || record.otp !== otp || Date.now() > record.expiry) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  const pendingRecord = otpStore[email + '_data'];
  if (!pendingRecord) {
    return res.status(400).json({ error: 'Pending registration expired or missing.' });
  }

  // Create user
  const pendingData = JSON.parse(pendingRecord.otp);
  const passwordHash = await bcrypt.hash(pendingData.password, 10);
  const db = readDB();

  const newUser = {
    id: `user-${Date.now()}`,
    name: pendingData.name,
    email: pendingData.email,
    passwordHash,
    avatarUrl: null,
    createdAt: new Date().toISOString()
  };

  if (!db.users) db.users = [];
  db.users.push(newUser);
  writeDB(db);

  // Clean up OTP
  delete otpStore[email];
  delete otpStore[email + '_data'];

  // Issue JWT
  const token = jwt.sign({ id: newUser.id, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
  
  // Seed default user space
  getUserData(db, newUser.id);
  writeDB(db);

  res.json({ token, user: { name: newUser.name, email: newUser.email, avatarUrl: null, id: newUser.id } });
});

// LOGIN
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

// PROFILE PHOTO UPLOAD
app.post('/api/profile/avatar', authenticateToken, upload.single('avatar'), (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const db = readDB();
  const user = db.users?.find((u: any) => u.id === req.user.id);
  if (user) {
    user.avatarUrl = avatarUrl;
    // Sync the profile.avatar in userData as well
    const userData = getUserData(db, req.user.id);
    if (userData && userData.profile) {
      userData.profile.avatar = avatarUrl;
    }
    writeDB(db);
  }
  res.json({ avatarUrl });
});

// Fetch absolute current state
app.get("/api/data", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  res.json(getUserData(db, req.user.id));
});

// Update profile details
app.post("/api/profile", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  userData.profile = { ...userData.profile, ...req.body };
  writeDB(db);
  res.json({ success: true, profile: userData.profile });
});
// --- GOALS API MODULE ---

// Create Goal
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

// Update Goal
app.put("/api/goals/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  if (!userData.goals) userData.goals = [];
  const index = userData.goals.findIndex((g: any) => g.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Goal not found" });
  }

  userData.goals[index] = { ...userData.goals[index], ...req.body };
  writeDB(db);
  res.json({ success: true, goal: userData.goals[index] });
});

// Delete Goal
app.delete("/api/goals/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  if (!userData.goals) userData.goals = [];
  userData.goals = userData.goals.filter((g: any) => g.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- TASKS API MODULE ---

// Create task
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

// Modify task (handles status, behavioral pattern mapping, and Anti-Abandonment forced reschedule)
app.put("/api/tasks/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const index = userData.tasks.findIndex((t: any) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  const existingTask = userData.tasks[index];
  const oldStatus = existingTask.status;
  const newStatus = req.body.status;

  // Pattern Tracking: completed task hourly audit
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

  // Anti-Abandonment check
  let notification = null;
  if (newStatus === "skipped" || req.body.rescheduled) {
    const newDate = req.body.newDate;
    if (!newDate) {
      return res.status(400).json({ error: "Reschedule date is required for skipped tasks." });
    }
    existingTask.originalDate = existingTask.originalDate || existingTask.date;
    existingTask.date = newDate;
    existingTask.status = "pending";
    existingTask.rescheduledCount = (existingTask.rescheduledCount || 0) + 1;

    // Trigger notification
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
    // Standard update
    userData.tasks[index] = { ...existingTask, ...req.body };
  }

  writeDB(db);
  res.json({ success: true, task: userData.tasks[index], notification });
});

// Delete task
app.delete("/api/tasks/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  userData.tasks = userData.tasks.filter((t: any) => t.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- HABITS API MODULE ---

// Create habit
app.post("/api/habits", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const newHabit = {
    id: `habit-${Date.now()}`,
    name: req.body.name || "New Habit",
    frequency: req.body.frequency || "daily",
    streak: 0,
    logs: [],
    skippedDaysCount: 0
  };
  userData.habits.push(newHabit);
  writeDB(db);
  res.json({ success: true, habit: newHabit });
});

// Complete/toggle habit for a date
app.post("/api/habits/:id/toggle", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const habit = userData.habits.find((h: any) => h.id === req.params.id);
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const date = req.body.date || getRelativeDateString(0);
  const logIndex = habit.logs.indexOf(date);
  let completed = false;

  if (logIndex > -1) {
    // Un-toggle completion
    habit.logs.splice(logIndex, 1);
  } else {
    // Toggle completed
    habit.logs.push(date);
    habit.logs.sort();
    completed = true;
  }

  // Calculate Streak
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

  // Motivation celebration logic
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

// Delete habit
app.delete("/api/habits/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  userData.habits = userData.habits.filter((h: any) => h.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- EXPENSES API MODULE ---

// Create expense with budget check & feedback flags
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

  // Analyze Budget Bounds
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

  // Update behavior pattern spending limits
  if (!userData.userPatterns) {
    userData.userPatterns = { taskCompletionByHour: {}, mostProductiveDay: "Tuesday", mostSkippedHabit: "Exercise", avgTasksCompletedPerDay: 4.2, streakBreakDays: ["Sunday"], spendingByCategory: {}, focusSessionAvgMinutes: 47, goalProgressRate: 0.65 };
  }
  if (!userData.userPatterns.spendingByCategory) userData.userPatterns.spendingByCategory = {};
  userData.userPatterns.spendingByCategory[category] = (userData.userPatterns.spendingByCategory[category] || 0) + amount;

  writeDB(db);
  res.json({ success: true, expense: newExpense, requiresExplanation, totalSpend: totalCategorySpend, notification });
});

// Save explanation for impulsive/overbudget expense
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

// Update category budgets
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

// Clear read notifications
app.post("/api/notifications/clear-unread", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  userData.notifications.forEach((n: any) => n.read = true);
  writeDB(db);
  res.json({ success: true });
});

// --- GOOGLE GEMINI AI COACH / J.A.R.V.I.S CHAT // Helper for peak focus window
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

  const db = readDB();
  const userData = getUserData(db, req.user.id);
  
  // Format stats string to serve as perfect contextual prompt
  const taskSummary = userData.tasks.map((t: any) => `[Priority: ${t.category}, Title: ${t.title}, Date: ${t.date}, Status: ${t.status}, ID: ${t.id}, Rescheduled Count: ${t.rescheduledCount}]`).join("\n");
  const habitSummary = userData.habits.map((h: any) => `[Habit: ${h.name}, Streak: ${h.streak} days, Completed Days: ${h.logs.length}, Skipped Days Count: ${h.skippedDaysCount}, ID: ${h.id}]`).join("\n");
  
  // Expenses summary by category
  const spendByCategory: Record<string, number> = {};
  userData.expenses.forEach((e: any) => {
    spendByCategory[e.category] = (spendByCategory[e.category] || 0) + e.amount;
  });
  const financialSummary = userData.budgets.map((b: any) => {
    const currentSpend = spendByCategory[b.category] || 0;
    return `[Category: ${b.category}, Limit: $${b.limit}, CurrentSpend: $${currentSpend.toFixed(2)}]`;
  }).join("\n");

  const systemPrompt = `You are Piggy — an advanced AI life coordinator and discipline butler for the user ${req.user.name}.
Your character is highly polished, elegant, supportive yet factual, and slightly British (like Tony Stark's assistant J.A.R.V.I.S.).
Your main purpose is to analyze ${req.user.name}'s life data, organize tasks, celebrate streaks, warn about budget overages, detect behavioral pitfalls, and advise corrective operations.

## USER BEHAVIOR PATTERNS (learned from history):
- Peak productivity hours: ${getPeakHours(userData.userPatterns)}
- Most productive day: ${userData.userPatterns?.mostProductiveDay || "Tuesday"}
- Average tasks completed per day: ${userData.userPatterns?.avgTasksCompletedPerDay || 4.2}
- Most skipped habit: ${userData.userPatterns?.mostSkippedHabit || "Exercise"}
- Streak break pattern: Often misses on ${userData.userPatterns?.streakBreakDays?.join(', ') || "Sunday"}
- Current goal progress rate: ${Math.round((userData.userPatterns?.goalProgressRate || 0.65) * 100)}%

## CURRENT STATE DATASET:
- Name: ${req.user.name}
- Email: ${req.user.email}
- Monthly aggregate budget limit: $${userData.profile.budgetLimit}
- Core personality profile preference: ${userData.profile.aiPersonality}

--- Tasks list currently recorded in Database:
${taskSummary}

--- Habit structures current streaking data:
${habitSummary}

--- Financial Category budgets and current accumulated monthly cost:
${financialSummary}

Always respond to queries in character, addressing the user as "Sir" or "${req.user.name}".
Keep responses relatively short, highly scannable, deeply descriptive, and formatted with markdown bullet points where appropriate (max 200 words unless detail requested).
Reference the user's name naturally in conversation. Proactively warn if the user is on a streak-break day pattern, and suggest scheduling hard tasks during peak focus windows.

--- Active User Context Interface:
The user is currently viewing the page: ${activeContext?.currentView || "dashboard"}.
Current UI state focus context indicators:
- Focused/Highlighted Task: ${activeContext?.selectedTaskName ? `'${activeContext.selectedTaskName}' (ID: ${activeContext.selectedTaskId})` : "None"}
- Focused/Highlighted Habit: ${activeContext?.selectedHabitName ? `'${activeContext.selectedHabitName}' (ID: ${activeContext.selectedHabitId})` : "None"}

--- Command Execution Protocols (Crucial Context Resolution):
If the user specifies an action like "delete that task", "complete this habit", "decommission task", "mark habit as done":
1. Resolve the target entity using the Highlighted indicators above first. E.g. "delete that task" refers to the Focused Task ID.
2. If there is ambiguity (e.g. user says "delete that task" but Focused/Highlighted Task is None, or there are multiple potential entries to resolve), you MUST ask a clarifying question: "Sir, I notice no task is actively selected in your Missions terminal. Which specific task would you like me to decommission?" and do NOT append any action tags.
3. If an action is clearly authorized, append this trigger tag at the very end of your response so the backend can execute it: '[TRIGGER_ACTION: DELETE_TASK_id]' or '[TRIGGER_ACTION: TOGGLE_TASK_id]' or '[TRIGGER_ACTION: COMPLETE_HABIT_id]' (replace id with the resolved entity ID). Keep this tag completely clean.`;

  let actionOutput = null;

  try {
    const ai = getGeminiAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.6,
      }
    });

    let aiText = response.text || "Cognitive interface error, Sir. I was unable to compile the reply.";
    
    // Perform action extraction
    const actionRegex = /\[TRIGGER_ACTION:\s*(DELETE_TASK|TOGGLE_TASK|COMPLETE_HABIT)_([a-zA-Z0-9\-]+)\]/;
    const match = aiText.match(actionRegex);
    
    if (match) {
      const type = match[1];
      const id = match[2];
      actionOutput = { type, id };
      
      // Execute database changes
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

    // Save conversation history
    const userMsg = { id: `chat-${Date.now()}`, role: "user" as const, content: message, timestamp: new Date().toISOString() };
    const assistantMsg = { id: `chat-${Date.now() + 1}`, role: "assistant" as const, content: aiText, timestamp: new Date().toISOString() };
    userData.chatHistory.push(userMsg, assistantMsg);
    
    if (userData.chatHistory.length > 30) {
      userData.chatHistory = userData.chatHistory.slice(-30);
    }
    
    writeDB(db);
    res.json({ success: true, reply: aiText, history: userData.chatHistory, actionTriggered: actionOutput });

  } catch (error: any) {
    console.error("Gemini AI API Error:", error.message);
    
    // Offline simulation mode supports real action triggering as well for full reliability
    let fallbackText = "";
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes("delete that") || lowerMsg.includes("decommission")) {
      if (activeContext?.selectedTaskId) {
        userData.tasks = userData.tasks.filter((t: any) => t.id !== activeContext.selectedTaskId);
        fallbackText = `Sir, as requested, I have successfully decommissioned the task '${activeContext.selectedTaskName}'. (Simulated Offline Mode)`;
        actionOutput = { type: "DELETE_TASK", id: activeContext.selectedTaskId };
      } else {
        fallbackText = `Sir, I am unable to decommission a task. There is no active task highlighted in your tactical terminal. (Simulated Offline Mode)`;
      }
    } else if (lowerMsg.includes("complete") || lowerMsg.includes("toggle")) {
      if (lowerMsg.includes("habit") && activeContext?.selectedHabitId) {
        const h = userData.habits.find((habit: any) => habit.id === activeContext.selectedHabitId);
        if (h) {
          const todayStr = new Date().toISOString().split("T")[0];
          if (!h.logs.includes(todayStr)) {
            h.logs.push(todayStr);
            h.streak += 1;
          }
        }
        fallbackText = `Compliance successfully logged, Sir. I have set your habit '${activeContext.selectedHabitName}' as complete for today. (Simulated Offline Mode)`;
        actionOutput = { type: "COMPLETE_HABIT", id: activeContext.selectedHabitId };
      } else if (activeContext?.selectedTaskId) {
        const t = userData.tasks.find((task: any) => task.id === activeContext.selectedTaskId);
        if (t) t.status = t.status === "completed" ? "pending" : "completed";
        fallbackText = `Tactical update logged. Task '${activeContext.selectedTaskName}' marker toggled. (Simulated Offline Mode)`;
        actionOutput = { type: "TOGGLE_TASK", id: activeContext.selectedTaskId };
      } else {
        fallbackText = `Sir, checking daily parameters... Your coding focus is strong, but budget allowances are near threshold limits. I advise absolute discipline. (Simulated Offline Mode)`;
      }
    } else {
      fallbackText = `Indeed, Sir. I have parsed your task schedule and habit lists. I am online and stand ready to assist your productivity cockpit. (Simulated Offline Mode)`;
    }
    
    const userMsg = { id: `chat-${Date.now()}`, role: "user" as const, content: message, timestamp: new Date().toISOString() };
    const assistantMsg = { id: `chat-${Date.now() + 1}`, role: "assistant" as const, content: fallbackText, timestamp: new Date().toISOString() };
    userData.chatHistory.push(userMsg, assistantMsg);
    
    writeDB(db);
    res.json({ 
      success: true, 
      reply: fallbackText, 
      history: userData.chatHistory, 
      simulated: true, 
      actionTriggered: actionOutput,
      errorInfo: "Configure GEMINI_API_KEY in panel for real-time generative capabilities." 
    });
  }
});

// --- MODULE 11: SMART PLANNING ENGINE ---
app.post("/api/smart-planner", authenticateToken, async (req: any, res: any) => {
  const { workHours, sleepHours, personalPriorities, exercisePreference } = req.body;
  const db = readDB();
  const userData = getUserData(db, req.user.id);

  const basePrompt = `Generate a detailed, custom-optimized timeline layout for tomorrow's daily plan based on these parameters:
- Core Work/Study Hours: ${workHours || "9 AM to 5 PM"}
- Targeted Sleep Duration: ${sleepHours || "8 hours"}
- Exercise Category Preference: ${exercisePreference || "Morning cardio"}
- Personal Goal Priorities: ${personalPriorities || "Coding, reading articles, financial balance"}

Critical Operational planning rules you MUST always adhere to:
1. MAX 4 critical/high-priority cognitive focus sessions allowed in the daily timeline to prevent exhaustion.
2. Respect peak biological productivity hours: schedule heaviest studies or reviews during peak windows (Peak runs ${getPeakHours(userData.userPatterns)}).
3. Protect active daily habits: allocate dedicated space for active routines (e.g. 'Deep Work Coding', 'Read Technical Articles', etc.).
4. Add transition buffer time: always schedule 15 to 30 minutes of Rest or Nourish buffer after any intense Focus sessions.
5. Strict midnight boundary: never schedule any tasks, workouts, or reviews past 24:00 (midnight). Ensure ${req.user.name} is asleep.

Incorporate our core active habit routines in the system:
${userData.habits.map((h: any) => h.name).join(", ")}

Generate a complete timeline list with specific hourly frames from 06:00 to 23:30.
Formulate a concluding J.A.R.V.I.S wisdom quote to prevent study or spending exhaustion.
Return response in JSON format matching this schema:
{
  "heading": "string",
  "timeline": [{ "timeSlot": "string", "taskTitle": "string", "category": "string (Focus / Workout / Rest / Nourish / Study)" }],
  "butlerAdvice": "string"
}`;

  try {
    const ai = getGeminiAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: basePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            heading: { type: Type.STRING },
            timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeSlot: { type: Type.STRING },
                  taskTitle: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["timeSlot", "taskTitle", "category"]
              }
            },
            butlerAdvice: { type: Type.STRING }
          },
          required: ["heading", "timeline", "butlerAdvice"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json({ success: true, plan: parsedData });

  } catch (error: any) {
    console.error("Smart Planner Gemini Error:", error.message);
    
    // Responsive, high-fidelity fallback plan
    const fallbackPlan = {
      heading: "Cognitive Heuristic Routine 01A (Optimized Offline Flow)",
      timeline: [
        { timeSlot: "06:30 - 07:15", taskTitle: "Morning Hydration & Routine Cardio", category: "Workout" },
        { timeSlot: "07:30 - 08:30", taskTitle: "Aesthetic Breakfast & Task Audit", category: "Nourish" },
        { timeSlot: "09:00 - 12:30", taskTitle: "Deep Work Coding Session (Habit Active)", category: "Focus" },
        { timeSlot: "12:30 - 13:30", taskTitle: "Recharge & Ambient Dining Walk", category: "Rest" },
        { timeSlot: "14:00 - 17:00", taskTitle: "Primary Professional Commits & Core Review", category: "Focus" },
        { timeSlot: "17:30 - 18:30", taskTitle: "Read Technical Articles Study (Habit Active)", category: "Study" },
        { timeSlot: "19:00 - 20:30", taskTitle: "Culinary Prep & Ledger Audit (No splurges check)", category: "Nourish" },
        { timeSlot: "21:00 - 21:30", taskTitle: "Daily Planning & Evening Reflection", category: "Focus" },
        { timeSlot: "22:00 - 22:30", taskTitle: "Pre-Sleep Meditation Practice", category: "Rest" }
      ],
      butlerAdvice: "Consistency is not about flawless performance, sir. It is about a disciplined re-engagement. (Simulated Offline Mode)"
    };
    res.json({ success: true, plan: fallbackPlan, simulated: true });
  }
});

// --- MODULE 12: PREDICTIVE INTELLIGENCE & FORECASTING ---
app.post("/api/predictive-outcomes", authenticateToken, async (req: any, res: any) => {
  const { primaryGoal, timeframeMonths } = req.body;
  if (!primaryGoal) return res.status(400).json({ error: "Goal is required." });

  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const currentStreak = Math.max(...userData.habits.map((h: any) => h.streak), 0);
  const tasksCompletedCount = userData.tasks.filter((t: any) => t.status === "completed").length;
  const tasksPendingCount = userData.tasks.filter((t: any) => t.status === "pending").length;
  const skippedCount = userData.tasks.reduce((sum: number, t: any) => sum + (t.rescheduledCount || 0), 0);

  const basePrompt = `Analyze ${req.user.name}'s historical habits and schedule completion metrics to forecast outcomes.
Current state parameters:
- Targeted Milestone Goal: "${primaryGoal}"
- Timeframe target: ${timeframeMonths || 6} months
- Current maximum habit streak: ${currentStreak} days
- Standard tasks completed: ${tasksCompletedCount}
- Tasks pending execution: ${tasksPendingCount}
- Anti-Abandonment forced reschedule count (skipped tasks rescheduled): ${skippedCount} items

Conduct a mathematical outcome analysis of achieving this goal on time, calculating probabilities, critical bottlenecks, and proactive advice to maximize output parameters.
Return response in JSON format matching this schema:
{
  "targetGoal": "string",
  "probabilityPercent": number,
  "timelineForecast": "string (Detailed assessment of weekly development trends)",
  "bottlenecks": ["string"],
  "proactiveAdvice": "string"
}`;

  try {
    const ai = getGeminiAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: basePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetGoal: { type: Type.STRING },
            probabilityPercent: { type: Type.NUMBER },
            timelineForecast: { type: Type.STRING },
            bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
            proactiveAdvice: { type: Type.STRING }
          },
          required: ["targetGoal", "probabilityPercent", "timelineForecast", "bottlenecks", "proactiveAdvice"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json({ success: true, forecast: parsedData });

  } catch (error: any) {
    console.error("Predictive Engine Gemini Error:", error.message);
    
    const totalCount = tasksCompletedCount + tasksPendingCount;
    const ratio = totalCount > 0 ? (tasksCompletedCount / totalCount) : 0.75;
    const calculatedProb = Math.min(Math.round((ratio * 80) + (currentStreak * 1.5) - (skippedCount * 3)), 95);

    const fallbackForecast = {
      targetGoal: primaryGoal,
      probabilityPercent: Math.max(calculatedProb, 45),
      timelineForecast: `A statistical parsing suggests a stable trajectory. Your solid core habit streak of ${currentStreak} days provides a robust foundational behavioral anchor. However, the accumulation of ${skippedCount} skipped tasks acts as a drag metric. (Simulated Offline Mode)`,
      bottlenecks: [
        `Cumulative scheduling overhead: skipped tasks carried over create congestion.`,
        `Splurge budget thresholds: high Entertainment expenditure risks financial stress.`,
        `Streak depletion vulnerability: failing to log consecutive study tasks reduces momentum.`
      ],
      proactiveAdvice: `Sir, limit task additions to critical modules only for the next 7 days. Ensure task statuses are cleanly decided before 20:00. This maintains mental clarity throughout your target timeframe. (Simulated Offline Mode)`
    };
    res.json({ success: true, forecast: fallbackForecast, simulated: true });
  }
});

// --- MODULE 13: PROACTIVE INSIGHTS ENGINE (DAILY BRIEF) ---
app.get('/api/jarvis/daily-brief', authenticateToken, async (req: any, res: any) => {
  const db = readDB();
  const userData = getUserData(db, req.user.id);
  const insights = [];

  // Check yesterday's habit completion
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toISOString().split('T')[0];
  
  userData.habits.forEach((habit: any) => {
    if (!habit.logs?.includes(yDate)) {
      insights.push(`⚠️ You missed "${habit.name}" yesterday — your streak of ${habit.streak} days is at risk.`);
    }
  });

  // Check if today is a historically bad day
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  if (userData.userPatterns?.streakBreakDays?.includes(today)) {
    insights.push(`📊 Historical pattern detected: You tend to miss habits on ${today}s. Stay vigilant today.`);
  }

  // Budget alert
  const spent = userData.expenses.reduce((a: any, b: any) => a + b.amount, 0);
  const remaining = userData.profile.budgetLimit - spent;
  if (remaining < userData.profile.budgetLimit * 0.2) {
    insights.push(`💸 Budget alert: Only $${remaining.toFixed(2)} remaining this month (${Math.round(remaining / userData.profile.budgetLimit * 100)}%).`);
  }

  // Goal progress
  if (userData.goals) {
    userData.goals.forEach((goal: any) => {
      const daysLeft = getDaysUntilDeadline(goal.targetDate);
      if (goal.progress < 30 && daysLeft < 14) {
        insights.push(`🎯 Goal "${goal.title}" is at ${goal.progress}% with only ${daysLeft} days left.`);
      }
    });
  }

  // Peak hour reminder
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

// --- MODULE 14: MORNING BRIEF ---
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

  const briefText = `Good morning, ${req.user.name}. Today is ${dayName}, ${dateStr}. You have ${urgentTasks.length} urgent tasks on your deck. Your highest priority is "${topTask.title}". Your habit streak for "${longestStreakHabit.name}" is currently at ${longestStreakHabit.streak} days — let's keep it alive today. Your monthly budget is ${budgetPercent}% utilized, with $${remaining.toFixed(2)} remaining. Based on your behavioral patterns, your peak focus window starts at ${getPeakHours(userData.userPatterns).split(' ')[0]}. Shall we build your schedule for today?`;

  res.json({ briefText, generatedAt: new Date().toISOString() });
});

// --- MODULE 15: GEMINI VISION RECEIPT SCANNER ---
app.post('/api/expenses/scan-receipt', authenticateToken, upload.single('receipt'), async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: "No receipt image uploaded." });
  }

  try {
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = imageData.toString('base64');
    const ai = getGeminiAI();

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: base64Image
          }
        },
        "Extract expense information from this receipt image. Analyze carefully. Return ONLY a JSON object that strictly adheres to the requested schema structure."
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            merchant: { type: Type.STRING },
            category: { type: Type.STRING },
            date: { type: Type.STRING },
            note: { type: Type.STRING }
          },
          required: ["amount", "merchant", "category", "date", "note"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    // Ensure category maps to valid database tags
    const allowed = ['food', 'transportation', 'shopping', 'education', 'healthcare', 'entertainment', 'misc'];
    if (!allowed.includes(parsed.category)) {
      if (parsed.category === 'transport') parsed.category = 'transportation';
      else if (parsed.category === 'health') parsed.category = 'healthcare';
      else parsed.category = 'misc';
    }

    res.json(parsed);

  } catch (error: any) {
    console.error("Receipt Scan Gemini Error:", error.message);
    const fallbackScan = {
      amount: 24.50,
      merchant: "LifeOS Scanner (Offline)",
      category: "shopping",
      date: new Date().toISOString().split("T")[0],
      note: "Receipt scanner processed in offline simulation mode."
    };
    res.json(fallbackScan);
  }
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

startServer();

// =========================
// MOOD TRACKER
// =========================

app.post("/api/mood", authenticateToken, (req, res)=>{

const {mood,note}=req.body;

const db=readDB();

const userData=getUserData(
db,
req.user.id
);


if(!userData.moods){
userData.moods=[];
}


const entry={
id:Date.now().toString(),
mood,
note:note || "",
createdAt:new Date().toISOString()
};


userData.moods.push(entry);

writeDB(db);


res.json({
success:true,
mood:entry
});

});



app.get("/api/mood/today", authenticateToken,(req,res)=>{

const db=readDB();

const userData=getUserData(
db,
req.user.id
);


const today=
new Date()
.toISOString()
.slice(0,10);


const mood=
userData.moods?.find(
(m:any)=>
m.createdAt.startsWith(today)
);


res.json(mood || null);

});



