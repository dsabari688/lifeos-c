import { dbService } from "../db/index.js";

export class SleepService {
  public static saveSleepLog(userId: string, body: any): any {
    const { sleepTime, wakeTime, duration, date } = body;
    const entry = { sleepTime, wakeTime, duration: parseFloat(duration), date };
    dbService.saveSleepLog(userId, entry);
    return entry;
  }

  public static getTodaySleepLog(userId: string): any {
    const sleepLogs = dbService.getSleepLogs(userId);
    const today = new Date().toISOString().split("T")[0];
    return sleepLogs.find((s: any) => s.date === today) || null;
  }
}
