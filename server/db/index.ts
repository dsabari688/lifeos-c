import { DatabaseState, UserData } from "./schema.js";
import { repository, defaultData } from "./repository.js";
import { smartCache } from "./cache.js";
import { CacheCategory } from "./types.js";
import { logger } from "../logger.js";

// Re-export for convenience and schema definition compatibility
export { defaultData };

export class DatabaseService {
  /**
   * Helper to perform a read-modify-write operation on UserData
   */
  private updateUserDataInternal(userId: string, modifier: (userData: UserData) => void): UserData {
    const userData = repository.getUserData(userId);
    modifier(userData);
    repository.saveUserData(userId, userData);
    return userData;
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

  public saveDatabaseState(state: DatabaseState): void {
    repository.write(state);
    // Invalidate caches for all modified users if applicable
    state.users.forEach((user) => {
      smartCache.invalidateUser(user.id);
    });
  }

  // --- USER PROFILE ---
  public updateProfile(userId: string, profile: any): any {
    const updated = this.updateUserDataInternal(userId, (data) => {
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

  public saveTask(userId: string, task: any): any {
    let savedTask = { ...task };
    this.updateUserDataInternal(userId, (data) => {
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

  public deleteTask(userId: string, taskId: string): void {
    this.updateUserDataInternal(userId, (data) => {
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

  public saveHabit(userId: string, habit: any): any {
    let savedHabit = { ...habit };
    this.updateUserDataInternal(userId, (data) => {
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

  public deleteHabit(userId: string, habitId: string): void {
    this.updateUserDataInternal(userId, (data) => {
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

  public saveGoal(userId: string, goal: any): any {
    let savedGoal = { ...goal };
    this.updateUserDataInternal(userId, (data) => {
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

  public deleteGoal(userId: string, goalId: string): void {
    this.updateUserDataInternal(userId, (data) => {
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

  public saveExpense(userId: string, expense: any): any {
    let savedExpense = { ...expense };
    this.updateUserDataInternal(userId, (data) => {
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

  public saveBudget(userId: string, category: string, limit: number): any[] {
    const data = this.updateUserDataInternal(userId, (userData) => {
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

  public saveSleepLog(userId: string, log: any): any {
    this.updateUserDataInternal(userId, (data) => {
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

  public saveMoodLog(userId: string, moodLog: any): any {
    let savedMood = { ...moodLog };
    this.updateUserDataInternal(userId, (data) => {
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
    // Reflections are lazy loaded, no cache necessary but fetched dynamically
    const data = repository.getUserData(userId);
    return data.reflections || [];
  }

  public saveReflection(userId: string, reflection: any): any {
    this.updateUserDataInternal(userId, (data) => {
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

  public saveChatHistory(userId: string, chatHistory: any[]): void {
    this.updateUserDataInternal(userId, (data) => {
      data.chatHistory = chatHistory;
    });
    // Invalidate piggyContext as chat events modify active states
    smartCache.invalidate(userId, "piggyContext");
  }

  // --- NOTIFICATIONS ---
  public addNotification(userId: string, notification: any): any {
    this.updateUserDataInternal(userId, (data) => {
      if (!data.notifications) data.notifications = [];
      data.notifications.unshift(notification);
    });
    smartCache.invalidate(userId, "dashboard");
    smartCache.invalidate(userId, "piggyContext");
    return notification;
  }

  public clearUnreadNotifications(userId: string): void {
    this.updateUserDataInternal(userId, (data) => {
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

  public saveUserPatterns(userId: string, patterns: any): void {
    this.updateUserDataInternal(userId, (data) => {
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

export function writeDB(state: DatabaseState): void {
  repository.write(state);
}

export function getUserData(db: DatabaseState, userId: string): UserData {
  return repository.getUserData(userId);
}
