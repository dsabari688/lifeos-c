import { describe, it, expect } from "vitest";
import { dbService } from "../../../db/index.js";

describe("Database Concurrency", () => {
  it("should safely handle two saves at the exact same time without losing data", async () => {
    const testUserId = "test-user-123";

    // 1. Try to save two tasks at the exact same time!
    const task1 = dbService.saveTask(testUserId, { id: "task-1", title: "First Task" });
    const task2 = dbService.saveTask(testUserId, { id: "task-2", title: "Second Task" });

    // Wait for both to finish saving
    await Promise.all([task1, task2]);

    // 2. Fetch the tasks to see what actually saved
    const tasks = dbService.getTasks(testUserId);

    // 3. If our queue works, BOTH tasks should be there!
    // Before your fix, one of these would be missing.
    expect(tasks.length).toBeGreaterThanOrEqual(2);
    expect(tasks.find((t: any) => t.id === "task-1")).toBeDefined();
    expect(tasks.find((t: any) => t.id === "task-2")).toBeDefined();
  });
});