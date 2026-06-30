import { describe, it, expect, beforeEach } from "vitest";
import { dbService } from "./index.js";
import { smartCache } from "./cache.js";

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

    const saved = dbService.saveTask(testUserId, newTask);
    expect(saved.id).toBeDefined();
    expect(saved.title).toBe(newTask.title);

    const tasks = dbService.getTasks(testUserId);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.find((t: any) => t.id === saved.id)).toBeDefined();

    // Delete task
    dbService.deleteTask(testUserId, saved.id);
    const updatedTasks = dbService.getTasks(testUserId);
    expect(updatedTasks.find((t: any) => t.id === saved.id)).toBeUndefined();
  });
});
