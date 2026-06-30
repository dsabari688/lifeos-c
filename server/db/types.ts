import { DatabaseState, UserData } from "./schema.js";

export interface CacheItem<T = any> {
  data: T;
  expiresAt: number;
}

export type CacheCategory =
  | "dashboard"
  | "habits"
  | "goals"
  | "expenses"
  | "piggyContext"
  | "sleep"
  | "mood"
  | "tasks";

export interface CacheStats {
  hits: number;
  misses: number;
  hitRatio: number;
}

export interface MetricEntry {
  endpoint: string;
  duration: number;
  timestamp: string;
}

export interface MetricsData {
  dbReads: number;
  dbWrites: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  uptime: number;
  slowEndpoints: MetricEntry[];
}

export interface IRepository {
  read(): DatabaseState;
  write(data: DatabaseState): void;
  getUserData(userId: string): UserData;
  getUserDataSummary(userId: string): Partial<UserData>;
  saveUserData(userId: string, data: UserData): void;
  runBackup(): Promise<string>;
}
