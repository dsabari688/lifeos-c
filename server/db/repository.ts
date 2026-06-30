import fs from "fs";
import path from "path";
import { DB_FILE } from "../config/env.js";
import { DatabaseState, UserData } from "./schema.js";
import { IRepository } from "./types.js";
import { metrics } from "../monitoring/metrics.js";
import { logger } from "../logger.js";
import { runRetroactiveMigration } from "./migrations.js";

export const defaultData = (): UserData => ({
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
      timestamp: new Date().toISOString(),
      type: "chat"
    }
  ],
  notifications: []
});

class WriteQueue {
  private queue: Promise<any> = Promise.resolve();

  public enqueue<T>(task: () => Promise<T> | T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

export class JSONRepository implements IRepository {
  private dbState: DatabaseState | null = null;
  private readonly dbFilePath: string;
  private readonly backupDirPath: string;
  private readonly writeQueue = new WriteQueue();

  constructor() {
    this.dbFilePath = DB_FILE;
    this.backupDirPath = path.join(process.cwd(), "backup");
    this.initialize();
  }

  private initialize(): void {
    try {
      if (!fs.existsSync(this.dbFilePath)) {
        logger.info(`[Repository] Database file not found. Seeding new database at ${this.dbFilePath}`);
        const defaultState: DatabaseState = { users: [], userData: {} };
        fs.mkdirSync(path.dirname(this.dbFilePath), { recursive: true });
        fs.writeFileSync(this.dbFilePath, JSON.stringify(defaultState, null, 2), "utf-8");
        this.dbState = defaultState;
      } else {
        const raw = fs.readFileSync(this.dbFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.users || !parsed.userData) {
          throw new Error("Invalid or corrupted database schema.");
        }
        this.dbState = parsed;
        logger.info(`[Repository] Database successfully loaded into memory from ${this.dbFilePath}`);
      }
    } catch (error) {
      logger.error("[Repository] Critical failure initializing database file:", error);
      const restored = this.restoreFromLatestBackup();
      if (restored) {
        logger.info("[Repository] Database successfully self-healed and restored from latest backup.");
      } else {
        logger.error("[Repository] Self-healing failed or no backups exist. Seeding blank database.");
        this.dbState = { users: [], userData: {} };
      }
    }
  }

  private restoreFromLatestBackup(): boolean {
    try {
      if (!fs.existsSync(this.backupDirPath)) return false;
      const files = fs.readdirSync(this.backupDirPath)
        .filter((file) => file.startsWith("database-") && file.endsWith(".json"))
        .map((file) => ({
          name: file,
          filepath: path.join(this.backupDirPath, file),
          time: fs.statSync(path.join(this.backupDirPath, file)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);

      for (const file of files) {
        try {
          const raw = fs.readFileSync(file.filepath, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && parsed.users && parsed.userData) {
            fs.writeFileSync(this.dbFilePath, raw, "utf-8");
            this.dbState = parsed;
            logger.info(`[Repository] Successfully self-healed database from backup: ${file.name}`);
            return true;
          }
        } catch (e) {
          logger.error(`[Repository] Backup file ${file.name} is also corrupted, checking next. Error:`, e);
        }
      }
    } catch (err) {
      logger.error("[Repository] Error scanning backups for self-healing:", err);
    }
    return false;
  }

  public read(): DatabaseState {
    metrics.recordDbRead();
    if (!this.dbState) {
      this.initialize();
    }
    // Return a deep copy to ensure immutability and prevent direct in-memory mutation
    return JSON.parse(JSON.stringify(this.dbState));
  }

  public async write(data: DatabaseState): Promise<void> {
    metrics.recordDbWrite();
    const tempFilePath = `${this.dbFilePath}.tmp`;

    await this.writeQueue.enqueue(async () => {
      try {
        const rawContent = JSON.stringify(data, null, 2);
        await fs.promises.writeFile(tempFilePath, rawContent, "utf-8");

        const checkRaw = await fs.promises.readFile(tempFilePath, "utf-8");
        const verifiedData = JSON.parse(checkRaw);
        if (!verifiedData || typeof verifiedData !== "object" || !verifiedData.users || !verifiedData.userData) {
          throw new Error("Temporary file validation failed: invalid schema structure.");
        }

        await fs.promises.rename(tempFilePath, this.dbFilePath);
        this.dbState = data;
        logger.info("[Repository] Database write transaction completed atomically in background queue.");

        this.runBackup().catch((err) => {
          logger.error("[Repository] Automatic backup failed:", err);
        });
      } catch (error) {
        logger.error("[Repository] Critical atomic write failure. Original database remains untouched. Error:", error);
        if (fs.existsSync(tempFilePath)) {
          try {
            await fs.promises.unlink(tempFilePath);
          } catch (unlinkErr) {
            logger.error("[Repository] Failed to delete temp file:", unlinkErr);
          }
        }
        throw new Error("Database save operation failed: atomic write integrity check failed.");
      }
    });
  }

  public getUserData(userId: string): UserData {
    if (!this.dbState) {
      this.initialize();
    }
    const db = this.dbState!;
    if (!db.userData) {
      db.userData = {};
    }

    if (!db.userData[userId]) {
      const defaults = defaultData();
      const userProfile = db.users?.find((u) => u.id === userId);
      db.userData[userId] = {
        ...defaults,
        profile: {
          ...defaults.profile,
          name: userProfile?.name || "New User",
          email: userProfile?.email || "",
          avatar: userProfile?.avatarUrl || defaults.profile.avatar
        }
      };
    }

    // Run migrations/seeding
    runRetroactiveMigration(db, userId);

    return JSON.parse(JSON.stringify(db.userData[userId]));
  }

  public getUserDataSummary(userId: string): Partial<UserData> {
    const fullData = this.getUserData(userId);
    // Lazy load: Return only summary fields, omit massive chatHistory and reflections
    return {
      profile: fullData.profile,
      tasks: fullData.tasks,
      habits: fullData.habits,
      goals: fullData.goals,
      expenses: fullData.expenses,
      budgets: fullData.budgets,
      notifications: fullData.notifications,
      moods: fullData.moods ? fullData.moods.slice(-7) : [], // only last 7 logs
      sleepLogs: fullData.sleepLogs ? fullData.sleepLogs.slice(-7) : [], // only last 7 logs
      chatHistory: fullData.chatHistory ? fullData.chatHistory.slice(-5) : [], // only last 5 messages for dashboard preview
      userPatterns: fullData.userPatterns
    };
  }

  public saveUserData(userId: string, data: UserData): void {
    if (!this.dbState) {
      this.initialize();
    }
    this.dbState!.userData[userId] = data;
    this.write(this.dbState!);
  }

  public async runBackup(): Promise<string> {
    if (!fs.existsSync(this.dbFilePath)) {
      throw new Error(`Database source file does not exist: ${this.dbFilePath}`);
    }

    if (!fs.existsSync(this.backupDirPath)) {
      fs.mkdirSync(this.backupDirPath, { recursive: true });
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const timestamp = `${yyyy}-${mm}-${dd}-${hh}-${min}`;
    const destPath = path.join(this.backupDirPath, `database-${timestamp}.json`);

    fs.copyFileSync(this.dbFilePath, destPath);
    logger.info(`[Backup] Database backup saved to: ${destPath}`);

    // Maintain only the last 20 backups
    try {
      const files = fs.readdirSync(this.backupDirPath)
        .filter((file) => file.startsWith("database-") && file.endsWith(".json"))
        .map((file) => ({
          name: file,
          filepath: path.join(this.backupDirPath, file),
          time: fs.statSync(path.join(this.backupDirPath, file)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time); // newest first

      if (files.length > 20) {
        const toDelete = files.slice(20);
        toDelete.forEach((file) => {
          fs.unlinkSync(file.filepath);
          logger.info(`[Backup] Purged old backup file: ${file.name}`);
        });
      }
    } catch (cleanupErr) {
      logger.error("[Backup] Failed to clean up old backups:", cleanupErr);
    }

    return destPath;
  }
}

// Export singleton repository
export const repository = new JSONRepository();
