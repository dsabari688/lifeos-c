import { MetricsData, MetricEntry } from "../db/types.js";
import { logger } from "../logger.js";

class MetricsTracker {
  private dbReads = 0;
  private dbWrites = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private responseTimes: number[] = [];
  private slowEndpoints: MetricEntry[] = [];
  private readonly startUptime = Date.now();

  // SLA Targets in milliseconds
  private readonly slaTargets: Record<string, number> = {
    "/api/piggy/dashboard": 100,
    "/api/tasks": 50,
    "/api/habits": 50,
    "/api/jarvis/chat": 15000, // Chat can take longer due to LLM calls
    "/api/auth": 50,
    "default": 100
  };

  public recordDbRead(): void {
    this.dbReads++;
  }

  public recordDbWrite(): void {
    this.dbWrites++;
  }

  public recordCacheHit(): void {
    this.cacheHits++;
  }

  public recordCacheMiss(): void {
    this.cacheMisses++;
  }

  public recordResponseTime(endpoint: string, duration: number): void {
    this.responseTimes.push(duration);
    // Keep list of last 500 response times for moving average
    if (this.responseTimes.length > 500) {
      this.responseTimes.shift();
    }

    // Check SLA violation
    let target = this.slaTargets.default;
    for (const key of Object.keys(this.slaTargets)) {
      if (endpoint.startsWith(key)) {
        target = this.slaTargets[key];
        break;
      }
    }

    if (duration > target) {
      const entry: MetricEntry = {
        endpoint,
        duration,
        timestamp: new Date().toISOString()
      };
      this.slowEndpoints.push(entry);
      if (this.slowEndpoints.length > 50) {
        this.slowEndpoints.shift();
      }
      logger.warn(`[SLA VIOLATION] Endpoint ${endpoint} completed in ${duration}ms (target: <${target}ms)`);
    }
  }

  public getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return parseFloat((sum / this.responseTimes.length).toFixed(2));
  }

  public getMetrics(): MetricsData {
    const memory = process.memoryUsage();
    return {
      dbReads: this.dbReads,
      dbWrites: this.dbWrites,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      averageResponseTime: this.getAverageResponseTime(),
      memoryUsage: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external
      },
      uptime: parseFloat(((Date.now() - this.startUptime) / 1000).toFixed(2)),
      slowEndpoints: [...this.slowEndpoints]
    };
  }
}

export const metrics = new MetricsTracker();
