import { dbService } from "../db/index.js";

function getRelativeDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}

export class GoalService {
  public static createGoal(userId: string, body: any): any {
    const newGoal = {
      id: `goal-${Date.now()}`,
      title: body.title || "New Goal",
      description: body.description || "",
      targetDate: body.targetDate || getRelativeDateString(30),
      progress: body.progress || 0,
      status: body.status || "active"
    };
    dbService.saveGoal(userId, newGoal);
    return newGoal;
  }

  public static updateGoal(userId: string, goalId: string, body: any): any {
    const goals = dbService.getGoals(userId);
    const index = goals.findIndex((g: any) => g.id === goalId);
    if (index === -1) {
      throw new Error("Goal not found");
    }

    const updatedGoal = { ...goals[index], ...body };
    dbService.saveGoal(userId, updatedGoal);
    return updatedGoal;
  }

  public static deleteGoal(userId: string, goalId: string): void {
    dbService.deleteGoal(userId, goalId);
  }
}
