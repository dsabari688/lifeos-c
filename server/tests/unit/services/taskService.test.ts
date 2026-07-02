import { describe, it, expect, vi } from "vitest";
import { TaskService } from "../../../services/taskService.js";
import { dbService } from "../../../db/index.js";

// We "mock" the dbService so we don't touch your real database
vi.mock("../../../db/index.js", () => ({
  dbService: {
    saveTask: vi.fn(),
  },
}));

describe("TaskService", () => {
  it("should create a task and save it to the database", async () => {
    const userId = "test-user-123";
    const taskData = { title: "Test Task" };

    const task = await TaskService.createTask(userId, taskData);

    // Verify the database was called
    expect(dbService.saveTask).toHaveBeenCalled();
    // Verify the task object has the title we passed in
    expect(task.title).toBe("Test Task");
  });
});