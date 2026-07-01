import { dbService } from "../db/index.js";

function getRelativeDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}

export class HabitService {
  public static createHabit(userId: string, body: any): any {
    const newHabit = {
      id: `habit-${Date.now()}`,
      name: body.name || "New Habit",
      frequency: body.frequency || "daily",
      streak: 0,
      logs: [],
      skippedDaysCount: 0,
      icon: body.icon || ""
    };
    dbService.saveHabit(userId, newHabit);
    return newHabit;
  }

  public static toggleHabit(userId: string, habitId: string, body: any): { habit: any; notification: any | null } {
    const db = dbService.getDatabaseState() as any;
    const userData = dbService.getUserData(userId);
    const habit = userData.habits.find((h: any) => h.id === habitId);
    if (!habit) {
      throw new Error("Habit not found");
    }

    const date = body.date || getRelativeDateString(0);
    const logIndex = habit.logs.indexOf(date);
    let completed = false;

    if (!habit.logTimes) habit.logTimes = [];

    if (logIndex > -1) {
      habit.logs.splice(logIndex, 1);
      const timePrefix = date;
      habit.logTimes = habit.logTimes.filter((t: string) => !t.startsWith(timePrefix));
    } else {
      habit.logs.push(date);
      habit.logs.sort();
      habit.logTimes.push(new Date().toISOString());
      completed = true;
    }

    let streak = 0;
    const sortedLogs = [...habit.logs].sort();
    if (sortedLogs.length > 0) {
      let currentStreak = 0;
      let expectedDate = new Date(sortedLogs[sortedLogs.length - 1]);

      for (let i = sortedLogs.length - 1; i >= 0; i--) {
        const logDate = new Date(sortedLogs[i]);
        const diffTime = Math.abs(expectedDate.getTime() - logDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
          currentStreak++;
          expectedDate = logDate;
        } else {
          break;
        }
      }
      streak = currentStreak;
    }
    habit.streak = streak;

    let notification = null;
    if (completed && streak > 0 && streak % 3 === 0) {
      notification = {
        id: `notif-${Date.now()}`,
        title: "Streaks Optimization Active",
        message: `Fantastic consistency! You have unlocked a ${streak}-day streak on '${habit.name}'! J.A.R.V.I.S. recognizes your dedication.`,
        timestamp: new Date().toISOString(),
        type: "streak",
        read: false
      };
      if (!userData.notifications) userData.notifications = [];
      userData.notifications.unshift(notification);
    }

    db.userData[userId] = userData;
    dbService.saveDatabaseState(db);
    return { habit, notification };
  }

  public static deleteHabit(userId: string, habitId: string): void {
    dbService.deleteHabit(userId, habitId);
  }
}
