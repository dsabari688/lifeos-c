import { dbService } from "../db/index.js";

function getRelativeDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}

export class ExpenseService {
  public static addExpense(userId: string, body: any): { expense: any; requiresExplanation: boolean; totalSpend: number; notification: any | null } {
    const db = dbService.getDatabaseState() as any;
    const userData = dbService.getUserData(userId);
    const category = body.category || "misc";
    const amount = parseFloat(body.amount) || 0;

    const newExpense = {
      id: `exp-${Date.now()}`,
      amount,
      category,
      note: body.note || "",
      date: body.date || getRelativeDateString(0),
      isImpulsive: body.isImpulsive || false
    };

    if (!userData.expenses) userData.expenses = [];
    userData.expenses.push(newExpense);

    const budget = userData.budgets?.find((b: any) => b.category === category);
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
      if (!userData.notifications) userData.notifications = [];
      userData.notifications.unshift(notification);
    }

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
    if (!userData.userPatterns.spendingByCategory) {
      userData.userPatterns.spendingByCategory = {};
    }
    userData.userPatterns.spendingByCategory[category] = (userData.userPatterns.spendingByCategory[category] || 0) + amount;

    db.userData[userId] = userData;
    dbService.saveDatabaseState(db);

    return { expense: newExpense, requiresExplanation, totalSpend: totalCategorySpend, notification };
  }

  public static explainExpense(userId: string, expenseId: string, explanation: string): any {
    const db = dbService.getDatabaseState() as any;
    const userData = dbService.getUserData(userId);
    const expense = userData.expenses.find((e: any) => e.id === expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }

    expense.isImpulsive = true;
    expense.explanation = explanation || "No explanation provided.";

    db.userData[userId] = userData;
    dbService.saveDatabaseState(db);
    return expense;
  }

  public static saveBudget(userId: string, category: string, limit: number): any {
    return dbService.saveBudget(userId, category, limit);
  }
}
