import { DatabaseState, UserData } from "./schema.js";
import { repository, defaultData } from "./repository.js";
import { smartCache } from "./cache.js";
import { CacheCategory } from "./types.js";
import { logger } from "../logger.js";

// Re-export for convenience and schema definition compatibility
export { defaultData };

export class DatabaseService {
  /**
   * Helper to perform a read-modify-write operation on UserData.
   * Now async so write errors surface to callers.
   */
  // 🚦 This line creates a waiting line (queue) for each user so they don't overwrite each other
  private userWriteQueues = new Map<string, Promise<any>>();

  private async updateUserDataInternal(userId: string, modifier: (userData: UserData) => void): Promise<UserData> {
    // 1. Find the current waiting line for this user
    const currentQueue = this.userWriteQueues.get(userId) || Promise.resolve();

    // 2. Add our new update to the back of the line
    const nextTask = currentQueue.then(async () => {
      const userData = repository.getUserData(userId); // Always gets the freshest data!
      modifier(userData);
      await repository.saveUserData(userId, userData);
      return userData;
    }).catch((err) => {
      logger.error(`Write error for user ${userId}`, err);
      throw err;
    });

    // 3. Update the line so the next person waits for us
    this.userWriteQueues.set(userId, nextTask);

    // 4. Return the result when our turn is done
    return nextTask;
  }
  // --- USER PERSISTENCE ---
  public getUserData(userId: string): UserData {
    return repository.getUserData(userId);
  }

  public getUserDataSummary(userId: string): Partial<UserData> {
    return repository.getUserDataSummary(userId);
  }

  public getDatabaseState(): DatabaseState {
    return repository.read();
  }

  public async saveDatabaseState(state: DatabaseState): Promise<void> {
    await repository.write(state);
    // Invalidate caches for all modified users
    state.users.forEach((user) => {
      smartCache.invalidateUser(user.id);
    });
  }

  // --- USER PROFILE ---
  public async updateProfile(userId: string, profile: any): Promise<any> {
    const updated = await this.updateUserDataInternal(userId, (data) => {
      data.profile = { ...data.profile, ...profile };
    });
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return updated.profile;
  }

  // --- TASKS ---
  public getTasks(userId: string): any[] {
    let tasks = smartCache.get<any[]>(userId, "tasks");
    if (!tasks) {
      const data = repository.getUserData(userId);
      tasks = data.tasks || [];
      smartCache.set(userId, "tasks", tasks);
    }
    return tasks;
  }

  public async saveTask(userId: string, task: any): Promise<any> {
    let savedTask = { ...task };
    await this.updateUserDataInternal(userId, (data) => {
      if (!data.tasks) data.tasks = [];
      const index = data.tasks.findIndex((t: any) => t.id === task.id);
      if (index > -1) {
        data.tasks[index] = { ...data.tasks[index], ...task };
        savedTask = data.tasks[index];
      } else {
        if (!task.id) {
          savedTask.id = `task-${Date.now()}`;
        }
        data.tasks.push(savedTask);
      }
    });

    smartCache.invalidate(userId, "tasks");
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return savedTask;
  }

  public async deleteTask(userId: string, taskId: string): Promise<void> {
    await this.updateUserDataInternal(userId, (data) => {
      if (data.tasks) {
        data.tasks = data.tasks.filter((t: any) => t.id !== taskId);
      }
    });
    smartCache.invalidate(userId, "tasks");
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
  }

  // --- HABITS ---
  public getHabits(userId: string): any[] {
    let habits = smartCache.get<any[]>(userId, "habits");
    if (!habits) {
      const data = repository.getUserData(userId);
      habits = data.habits || [];
      smartCache.set(userId, "habits", habits);
    }
    return habits;
  }

  public async saveHabit(userId: string, habit: any): Promise<any> {
    let savedHabit = { ...habit };
    await this.updateUserDataInternal(userId, (data) => {
      if (!data.habits) data.habits = [];
      const index = data.habits.findIndex((h: any) => h.id === habit.id);
      if (index > -1) {
        data.habits[index] = { ...data.habits[index], ...habit };
        savedHabit = data.habits[index];
      } else {
        if (!habit.id) {
          savedHabit.id = `habit-${Date.now()}`;
        }
        data.habits.push(savedHabit);
      }
    });

    smartCache.invalidate(userId, "habits");
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return savedHabit;
  }

  public async deleteHabit(userId: string, habitId: string): Promise<void> {
    await this.updateUserDataInternal(userId, (data) => {
      if (data.habits) {
        data.habits = data.habits.filter((h: any) => h.id !== habitId);
      }
    });
    smartCache.invalidate(userId, "habits");
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
  }

  // --- GOALS ---
  public getGoals(userId: string): any[] {
    let goals = smartCache.get<any[]>(userId, "goals");
    if (!goals) {
      const data = repository.getUserData(userId);
      goals = data.goals || [];
      smartCache.set(userId, "goals", goals);
    }
    return goals;
  }

  public async saveGoal(userId: string, goal: any): Promise<any> {
    let savedGoal = { ...goal };
    await this.updateUserDataInternal(userId, (data) => {
      if (!data.goals) data.goals = [];
      const index = data.goals.findIndex((g: any) => g.id === goal.id);
      if (index > -1) {
        data.goals[index] = { ...data.goals[index], ...goal };
        savedGoal = data.goals[index];
      } else {
        if (!goal.id) {
          savedGoal.id = `goal-${Date.now()}`;
        }
        data.goals.push(savedGoal);
      }
    });

    smartCache.invalidate(userId, "goals");
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return savedGoal;
  }

  public async deleteGoal(userId: string, goalId: string): Promise<void> {
    await this.updateUserDataInternal(userId, (data) => {
      if (data.goals) {
        data.goals = data.goals.filter((g: any) => g.id !== goalId);
      }
    });
    smartCache.invalidate(userId, "goals");
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
  }

  // --- EXPENSES ---
  public getExpenses(userId: string): any[] {
    let expenses = smartCache.get<any[]>(userId, "expenses");
    if (!expenses) {
      const data = repository.getUserData(userId);
      expenses = data.expenses || [];
      smartCache.set(userId, "expenses", expenses);
    }
    return expenses;
  }

  public async saveExpense(userId: string, expense: any): Promise<any> {
    let savedExpense = { ...expense };
    await this.updateUserDataInternal(userId, (data) => {
      if (!data.expenses) data.expenses = [];
      const index = data.expenses.findIndex((e: any) => e.id === expense.id);
      if (index > -1) {
        data.expenses[index] = { ...data.expenses[index], ...expense };
        savedExpense = data.expenses[index];
      } else {
        if (!expense.id) {
          savedExpense.id = `exp-${Date.now()}`;
        }
        data.expenses.push(savedExpense);
      }
    });

    smartCache.invalidate(userId, "expenses");
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return savedExpense;
  }

  // --- BUDGETS ---
  public getBudgets(userId: string): any[] {
    const data = repository.getUserData(userId);
    return data.budgets || [];
  }

  public async saveBudget(userId: string, category: string, limit: number): Promise<any[]> {
    const data = await this.updateUserDataInternal(userId, (userData) => {
      if (!userData.budgets) userData.budgets = [];
      const index = userData.budgets.findIndex((b: any) => b.category === category);
      if (index > -1) {
        userData.budgets[index].limit = limit;
      } else {
        userData.budgets.push({ category, limit });
      }
    });
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return data.budgets;
  }

  // --- SLEEP ---
  public getSleepLogs(userId: string): any[] {
    let sleepLogs = smartCache.get<any[]>(userId, "sleep");
    if (!sleepLogs) {
      const data = repository.getUserData(userId);
      sleepLogs = data.sleepLogs || [];
      smartCache.set(userId, "sleep", sleepLogs);
    }
    return sleepLogs;
  }

  public async saveSleepLog(userId: string, log: any): Promise<any> {
    await this.updateUserDataInternal(userId, (data) => {
      if (!data.sleepLogs) data.sleepLogs = [];
      const index = data.sleepLogs.findIndex((s: any) => s.date === log.date);
      if (index > -1) {
        data.sleepLogs[index] = log;
      } else {
        data.sleepLogs.push(log);
      }
    });

    smartCache.invalidate(userId, "sleep");
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return log;
  }

  // --- MOOD ---
  public getMoodLogs(userId: string): any[] {
    let moods = smartCache.get<any[]>(userId, "mood");
    if (!moods) {
      const data = repository.getUserData(userId);
      moods = data.moods || [];
      smartCache.set(userId, "mood", moods);
    }
    return moods;
  }

  public async saveMoodLog(userId: string, moodLog: any): Promise<any> {
    let savedMood = { ...moodLog };
    await this.updateUserDataInternal(userId, (data) => {
      if (!data.moods) data.moods = [];
      if (!moodLog.id) {
        savedMood.id = `mood-${Date.now()}`;
      }
      data.moods.push(savedMood);
    });

    smartCache.invalidate(userId, "mood");
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return savedMood;
  }

  // --- REFLECTIONS ---
  public getReflections(userId: string): any[] {
    const data = repository.getUserData(userId);
    return data.reflections || [];
  }

  public async saveReflection(userId: string, reflection: any): Promise<any> {
    await this.updateUserDataInternal(userId, (data) => {
      if (!data.reflections) data.reflections = [];
      data.reflections.push(reflection);
    });

    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return reflection;
  }

  // --- CHAT HISTORY ---
  public getChatHistory(userId: string): any[] {
    const data = repository.getUserData(userId);
    return data.chatHistory || [];
  }

  public async saveChatHistory(userId: string, chatHistory: any[]): Promise<void> {
    await this.updateUserDataInternal(userId, (data) => {
      data.chatHistory = chatHistory;
    });
    smartCache.invalidate(userId, "piggyContext");
  }

  // --- NOTIFICATIONS ---
  public async addNotification(userId: string, notification: any): Promise<any> {
    await this.updateUserDataInternal(userId, (data) => {
      if (!data.notifications) data.notifications = [];
      data.notifications.unshift(notification);
    });
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return notification;
  }

  public async clearUnreadNotifications(userId: string): Promise<void> {
    await this.updateUserDataInternal(userId, (data) => {
      if (data.notifications) {
        data.notifications.forEach((n: any) => {
          n.read = true;
        });
      }
    });
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
  }

  // --- USER IN-MEMORY PATTERNS ---
  public getUserPatterns(userId: string): any {
    const data = repository.getUserData(userId);
    return data.userPatterns;
  }

  public async saveUserPatterns(userId: string, patterns: any): Promise<void> {
    await this.updateUserDataInternal(userId, (data) => {
      data.userPatterns = patterns;
    });
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
  }

  // --- PIGGY CACHED DASHBOARD / CONTEXT HELPER ---
  public getCachedDashboard(userId: string, generator: () => any): any {
    let dashboard = smartCache.get(userId, "dashboard");
    if (!dashboard) {
      dashboard = generator();
      smartCache.set(userId, "dashboard", dashboard);
    }
    return dashboard;
  }

  public getCachedPiggyContext(userId: string, generator: () => any): any {
    let context = smartCache.get(userId, "piggyContext");
    if (!context) {
      context = generator();
      smartCache.set(userId, "piggyContext", context);
    }
    return context;
  }
}

// Export singleton instance of DatabaseService
export const dbService = new DatabaseService();

// --- BACKWARD COMPATIBILITY EXPORTS ---
export function readDB(): DatabaseState {
  return repository.read();
}

export async function writeDB(state: DatabaseState): Promise<void> {
  await repository.write(state);
}

export function getUserData(db: DatabaseState, userId: string): UserData {
  return repository.getUserData(userId);
}
