import { dbService } from "../db/index.js";

function getRelativeDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}

export class TaskService {
  // 1. Changed to 'public static async'
  public static async createTask(userId: string, body: any): Promise<any> {
    const newTask = {
      id: `task-${Date.now()}`,
      title: body.title || "Untitled Task",
      category: body.category || "important-not-urgent",
      date: body.date || getRelativeDateString(0),
      time: body.time || "12:00",
      recurType: body.recurType || "none",
      status: body.status || "pending",
      rescheduledCount: 0
    };
    
    // 2. Added 'await' so the server waits for the save to finish!
    await dbService.saveTask(userId, newTask);
    return newTask;
  }

  public static async updateTask(userId: string, taskId: string, body: any): Promise<{ task: any; notification: any | null }> {
    const db = dbService.getDatabaseState() as any;
    const userData = dbService.getUserData(userId);
    const index = userData.tasks.findIndex((t: any) => t.id === taskId);
    if (index === -1) {
      throw new Error("Task not found");
    }

    const existingTask = userData.tasks[index];
    const oldStatus = existingTask.status;
    const newStatus = body.status;

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

    let notification = null;
    if (newStatus === "skipped" || body.rescheduled) {
      const newDate = body.newDate;
      if (!newDate) {
        throw new Error("Reschedule date is required for skipped tasks.");
      }

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
      if (!userData.notifications) userData.notifications = [];
      userData.notifications.unshift(notification);
    } else {
      userData.tasks[index] = { ...existingTask, ...body };
    }

    db.userData[userId] = userData;
    await dbService.saveDatabaseState(db);
    return { task: userData.tasks[index], notification };
  }

  public static deleteTask(userId: string, taskId: string): void {
    dbService.deleteTask(userId, taskId);
  }
}
