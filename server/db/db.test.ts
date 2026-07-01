import { describe, it, expect, beforeEach, vi } from "vitest";
import { dbService, readDB, writeDB, getUserData } from "./index.js";
import { smartCache } from "./cache.js";
import { runRetroactiveMigration } from "./migrations.js";
import { repository } from "./repository.js";

describe("Database Service & Caching Tests", () => {
  const testUserId = "test-user-123";

  beforeEach(() => {
    smartCache.clearAll();
  });

  it("should retrieve user profile data and defaults", () => {
    const data = dbService.getUserData(testUserId);
    expect(data).toBeDefined();
    expect(data.profile.name).toBe("New User");

    const cachedTasks = dbService.getTasks(testUserId);
    expect(cachedTasks).toBeInstanceOf(Array);
  });

  it("should save, retrieve, and delete tasks cleanly, invalidating caches", () => {
    const newTask = {
      title: "Test Tactical Mission",
      category: "high",
      date: "2026-07-01",
      time: "10:00",
      recurType: "none",
      status: "pending"
    };

    // Save new task (no ID)
    const saved = dbService.saveTask(testUserId, newTask);
    expect(saved.id).toBeDefined();
    expect(saved.title).toBe(newTask.title);

    // Save existing task (has ID)
    saved.title = "Modified Tactical Mission";
    const updated = dbService.saveTask(testUserId, saved);
    expect(updated.title).toBe("Modified Tactical Mission");

    const tasks = dbService.getTasks(testUserId);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.find((t: any) => t.id === saved.id)).toBeDefined();

    // Delete task
    dbService.deleteTask(testUserId, saved.id);
    const updatedTasks = dbService.getTasks(testUserId);
    expect(updatedTasks.find((t: any) => t.id === saved.id)).toBeUndefined();
  });

  it("should save, retrieve, and delete goals cleanly, invalidating caches", () => {
    const newGoal = {
      title: "Study TypeScript Modules",
      description: "Perform modular refactoring of workspace",
      targetDate: "2026-09-30",
      progress: 10,
      status: "active"
    };

    const saved = dbService.saveGoal(testUserId, newGoal);
    expect(saved.id).toBeDefined();
    expect(saved.title).toBe(newGoal.title);

    const goals = dbService.getGoals(testUserId);
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.find((g: any) => g.id === saved.id)).toBeDefined();

    // Update goal progress
    saved.progress = 50;
    const updated = dbService.saveGoal(testUserId, saved);
    expect(updated.progress).toBe(50);

    // Delete goal
    dbService.deleteGoal(testUserId, saved.id);
    const updatedGoals = dbService.getGoals(testUserId);
    expect(updatedGoals.find((g: any) => g.id === saved.id)).toBeUndefined();
  });

  it("should update profile cleanly", () => {
    const originalProfile = dbService.getUserData(testUserId).profile;
    const newProfile = { name: "Updated Name", budgetLimit: 1500 };
    const updated = dbService.updateProfile(testUserId, newProfile);
    expect(updated.name).toBe("Updated Name");
    expect(updated.budgetLimit).toBe(1500);

    // Restore original profile
    dbService.updateProfile(testUserId, originalProfile);
  });

  it("should save, retrieve, and delete habits cleanly", () => {
    const habit = { title: "Drink Water", streak: 5 };
    // Save new habit
    const saved = dbService.saveHabit(testUserId, habit);
    expect(saved.id).toBeDefined();
    expect(saved.title).toBe("Drink Water");

    // Save existing habit
    saved.title = "Drink More Water";
    const updated = dbService.saveHabit(testUserId, saved);
    expect(updated.title).toBe("Drink More Water");

    const habits = dbService.getHabits(testUserId);
    expect(habits.some((h: any) => h.id === saved.id)).toBe(true);

    dbService.deleteHabit(testUserId, saved.id);
    const updatedHabits = dbService.getHabits(testUserId);
    expect(updatedHabits.some((h: any) => h.id === saved.id)).toBe(false);
  });

  it("should save and retrieve expenses", () => {
    const expense = { category: "food", amount: 12.50 };
    const saved = dbService.saveExpense(testUserId, expense);
    expect(saved.id).toBeDefined();
    expect(saved.amount).toBe(12.50);

    const expenses = dbService.getExpenses(testUserId);
    expect(expenses.some((e: any) => e.id === saved.id)).toBe(true);
  });

  it("should save and retrieve budgets", () => {
    // Test updating existing budget category
    dbService.saveBudget(testUserId, "food", 400);
    let budgets = dbService.getBudgets(testUserId);
    const foodBudget = budgets.find((b: any) => b.category === "food");
    expect(foodBudget).toBeDefined();
    expect(foodBudget.limit).toBe(400);

    // Test creating new budget category (hits else branch)
    dbService.saveBudget(testUserId, "electronics", 800);
    budgets = dbService.getBudgets(testUserId);
    const electroBudget = budgets.find((b: any) => b.category === "electronics");
    expect(electroBudget).toBeDefined();
    expect(electroBudget.limit).toBe(800);
  });

  it("should save and retrieve sleep logs", () => {
    const log = { date: "2026-07-01", sleepTime: "22:00", wakeTime: "06:00", duration: 8 };
    const saved = dbService.saveSleepLog(testUserId, log);
    expect(saved.duration).toBe(8);

    // Test saving sleep log on same date (updates it)
    const log2 = { date: "2026-07-01", sleepTime: "23:00", wakeTime: "07:00", duration: 9 };
    const saved2 = dbService.saveSleepLog(testUserId, log2);
    expect(saved2.duration).toBe(9);

    const logs = dbService.getSleepLogs(testUserId);
    expect(logs.some((l: any) => l.date === "2026-07-01")).toBe(true);
  });

  it("should save and retrieve mood logs", () => {
    const moodLog = { mood: "Happy", note: "Great day", createdAt: "2026-07-01T12:00:00Z" };
    const saved = dbService.saveMoodLog(testUserId, moodLog);
    expect(saved.id).toBeDefined();
    expect(saved.mood).toBe("Happy");

    const logs = dbService.getMoodLogs(testUserId);
    expect(logs.some((l: any) => l.id === saved.id)).toBe(true);
  });

  it("should save and retrieve reflections", () => {
    const reflection = { content: "Good week", rating: 5 };
    const saved = dbService.saveReflection(testUserId, reflection);
    expect(saved.content).toBe("Good week");

    const reflections = dbService.getReflections(testUserId);
    expect(reflections.some((r: any) => r.content === "Good week")).toBe(true);
  });

  it("should save and retrieve chat history", () => {
    const history = [{ role: "user", content: "hello" }];
    dbService.saveChatHistory(testUserId, history);
    const retrieved = dbService.getChatHistory(testUserId);
    expect(retrieved).toEqual(history);
  });

  it("should add and clear notifications", () => {
    const notification = { title: "Goal Met", read: false };
    const saved = dbService.addNotification(testUserId, notification);
    expect(saved.title).toBe("Goal Met");

    dbService.clearUnreadNotifications(testUserId);
    const userData = dbService.getUserData(testUserId);
    expect(userData.notifications.every((n: any) => n.read)).toBe(true);
  });

  it("should save and retrieve user patterns", () => {
    const patterns = { peakPerformanceHour: "20:00" };
    dbService.saveUserPatterns(testUserId, patterns);
    const retrieved = dbService.getUserPatterns(testUserId);
    expect(retrieved).toEqual(patterns);
  });

  it("should use cache for dashboard and context helpers", () => {
    const generator = vi.fn().mockReturnValue({ test: "data" });
    const res1 = dbService.getCachedDashboard(testUserId, generator);
    const res2 = dbService.getCachedDashboard(testUserId, generator);

    expect(res1).toEqual({ test: "data" });
    expect(res2).toEqual({ test: "data" });
    expect(generator).toHaveBeenCalledTimes(1);

    const contextGen = vi.fn().mockReturnValue({ context: "value" });
    const ctx1 = dbService.getCachedPiggyContext(testUserId, contextGen);
    const ctx2 = dbService.getCachedPiggyContext(testUserId, contextGen);

    expect(ctx1).toEqual({ context: "value" });
    expect(ctx2).toEqual({ context: "value" });
    expect(contextGen).toHaveBeenCalledTimes(1);
  });

  it("should read and save database state", () => {
    const state = dbService.getDatabaseState();
    expect(state.users).toBeDefined();
    expect(state.userData).toBeDefined();

    const spyInvalidate = vi.spyOn(smartCache, "invalidateUser");
    dbService.saveDatabaseState(state);
    expect(spyInvalidate).toHaveBeenCalled();
    spyInvalidate.mockRestore();
  });

  it("should support backward compatibility exports", () => {
    const state = readDB();
    expect(state).toBeDefined();

    const data = getUserData(state, testUserId);
    expect(data).toBeDefined();

    expect(() => writeDB(state)).not.toThrow();
  });

  // --- SmartCache specific coverage tests ---
  it("should handle expired keys and lazy deletion in SmartCache", () => {
    smartCache.set(testUserId, "tasks", ["task1"]);
    const cacheKey = (smartCache as any).getCacheKey(testUserId, "tasks");
    const cachedItem = (smartCache as any).cacheStore.get(cacheKey);
    if (cachedItem) {
      cachedItem.expiresAt = Date.now() - 1000; // Mock expiration
    }

    const expired = smartCache.get(testUserId, "tasks");
    expect(expired).toBeNull();
  });

  it("should compute cache stats correctly", () => {
    smartCache.clearAll();
    smartCache.set(testUserId, "tasks", ["task1"]);
    smartCache.get(testUserId, "tasks"); // hit
    smartCache.get(testUserId, "habits"); // miss
    const stats = smartCache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRatio).toBe(0.5);
  });

  it("should invalidate all keys for a user", () => {
    smartCache.set(testUserId, "tasks", ["task1"]);
    smartCache.set(testUserId, "habits", ["habit1"]);
    smartCache.invalidateUser(testUserId);
    expect(smartCache.get(testUserId, "tasks")).toBeNull();
    expect(smartCache.get(testUserId, "habits")).toBeNull();
  });

  it("should run retroactive migrations correctly", () => {
    const db: any = {
      userData: {
        "migrate-user": {
          focusSessions: [{ id: "1" }],
          sleepLogs: [],
          moods: [{ mood: "Happy" }],
          habits: [],
          goals: [{ title: "Goal" }],
          expenses: [],
          tasks: [{ title: "Task" }],
          aiMemory: [],
          recommendationsFeedback: [{ id: "1" }],
          monthlySnapshots: [],
          reflections: [{ id: "1" }],
          userPatterns: { somePattern: true }
        }
      }
    };

    runRetroactiveMigration(db, "non-existent-user");

    runRetroactiveMigration(db, "migrate-user");

    const userData = db.userData["migrate-user"];
    expect(userData.focusSessions).toEqual([{ id: "1" }]);
    expect(userData.sleepLogs.length).toBeGreaterThan(0);
    expect(userData.moods).toEqual([{ mood: "Happy" }]);
    expect(userData.habits.length).toBeGreaterThan(0);
    expect(userData.goals).toEqual([{ title: "Goal" }]);
    expect(userData.expenses.length).toBeGreaterThan(0);
    expect(userData.tasks).toEqual([{ title: "Task" }]);
    expect(userData.aiMemory.length).toBeGreaterThan(0);
    expect(userData.recommendationsFeedback).toEqual([{ id: "1" }]);
    expect(userData.monthlySnapshots.length).toBeGreaterThan(0);
    expect(userData.reflections).toEqual([{ id: "1" }]);
    expect(userData.userPatterns).toEqual({ somePattern: true });
  });

  it("should handle default TTL for unknown categories in SmartCache", () => {
    smartCache.set(testUserId, "unknown-cat" as any, "data");
    const val = smartCache.get(testUserId, "unknown-cat" as any);
    expect(val).toBe("data");
  });

  it("should handle 0 hit ratio when no checks have run in SmartCache", () => {
    smartCache.clearAll();
    const stats = smartCache.getStats();
    expect(stats.hitRatio).toBe(0);
  });

  // --- Branch coverage helpers for missing lists/methods ---
  it("should initialize lists and handle missing lists correctly when saving/deleting", () => {
    // Fetch and explicitly clear lists
    const userData = dbService.getUserData(testUserId);
    userData.tasks = undefined as any;
    userData.habits = undefined as any;
    userData.goals = undefined as any;
    userData.expenses = undefined as any;
    userData.budgets = undefined as any;
    userData.sleepLogs = undefined as any;
    userData.moods = undefined as any;
    userData.reflections = undefined as any;
    userData.notifications = undefined as any;
    repository.saveUserData(testUserId, userData);

    // Save with undefined arrays to trigger "if (!data.xxx) data.xxx = [];" branches
    dbService.saveTask(testUserId, { title: "Task on undefined" });
    dbService.saveHabit(testUserId, { title: "Habit on undefined" });
    dbService.saveGoal(testUserId, { title: "Goal on undefined" });
    dbService.saveExpense(testUserId, { category: "food", amount: 10 });
    dbService.saveBudget(testUserId, "food", 100);
    dbService.saveSleepLog(testUserId, { date: "2026-07-02", duration: 8 });
    dbService.saveMoodLog(testUserId, { mood: "Calm" });
    dbService.saveReflection(testUserId, { content: "Reflection" });
    dbService.addNotification(testUserId, { title: "Notif" });

    const updatedData = dbService.getUserData(testUserId);
    expect(updatedData.tasks.length).toBeGreaterThan(0);
    expect(updatedData.habits.length).toBeGreaterThan(0);
    expect(updatedData.goals.length).toBeGreaterThan(0);
    expect(updatedData.expenses.length).toBeGreaterThan(0);
    expect(updatedData.budgets.length).toBeGreaterThan(0);
    expect(updatedData.sleepLogs.length).toBeGreaterThan(0);
    expect(updatedData.moods.length).toBeGreaterThan(0);
    expect(updatedData.reflections.length).toBeGreaterThan(0);
    expect(updatedData.notifications.length).toBeGreaterThan(0);

    // Now set arrays to undefined again and delete to trigger "if (data.xxx) { ... }" else branches
    const dataForDelete = dbService.getUserData(testUserId);
    dataForDelete.tasks = undefined as any;
    dataForDelete.habits = undefined as any;
    dataForDelete.goals = undefined as any;
    repository.saveUserData(testUserId, dataForDelete);

    expect(() => dbService.deleteTask(testUserId, "any-id")).not.toThrow();
    expect(() => dbService.deleteHabit(testUserId, "any-id")).not.toThrow();
    expect(() => dbService.deleteGoal(testUserId, "any-id")).not.toThrow();
  });
});
