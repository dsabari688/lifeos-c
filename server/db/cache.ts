import { CacheCategory, CacheItem, CacheStats } from "./types.js";
import { metrics } from "../monitoring/metrics.js";
import { logger } from "../logger.js";

export class SmartCache {
  private cacheStore = new Map<string, CacheItem>();
  private hits = 0;
  private misses = 0;

  // TTL values in seconds
  private readonly ttls: Record<CacheCategory, number> = {
    dashboard: 60,
    habits: 30,
    goals: 60,
    expenses: 60,
    piggyContext: 120,
    sleep: 60,
    mood: 60,
    tasks: 60
  };

  private getCacheKey(userId: string, category: CacheCategory): string {
    return `${userId}:${category}`;
  }

  public get<T>(userId: string, category: CacheCategory): T | null {
    const key = this.getCacheKey(userId, category);
    const item = this.cacheStore.get(key);

    if (!item) {
      this.misses++;
      metrics.recordCacheMiss();
      return null;
    }

    if (Date.now() > item.expiresAt) {
      // Lazy deletion
      this.cacheStore.delete(key);
      this.misses++;
      metrics.recordCacheMiss();
      logger.debug(`[Cache] Expired key: ${key}`);
      return null;
    }

    this.hits++;
    metrics.recordCacheHit();
    logger.debug(`[Cache] Hit key: ${key}`);
    return item.data as T;
  }

  public set<T>(userId: string, category: CacheCategory, data: T): void {
    const key = this.getCacheKey(userId, category);
    const ttlSeconds = this.ttls[category] || 60;
    const expiresAt = Date.now() + ttlSeconds * 1000;

    this.cacheStore.set(key, { data, expiresAt });
    logger.debug(`[Cache] Set key: ${key} (TTL: ${ttlSeconds}s)`);
  }

  public invalidate(userId: string, category: CacheCategory): void {
    const key = this.getCacheKey(userId, category);
    if (this.cacheStore.delete(key)) {
      logger.debug(`[Cache] Invalidated key: ${key}`);
    }
  }

  public invalidateUser(userId: string): void {
    const categories: CacheCategory[] = [
      "dashboard",
      "habits",
      "goals",
      "expenses",
      "piggyContext",
      "sleep",
      "mood",
      "tasks"
    ];
    categories.forEach((cat) => this.invalidate(userId, cat));
    logger.info(`[Cache] Invalidated all cache for user ${userId}`);
  }

  public getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? parseFloat((this.hits / total).toFixed(4)) : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRatio
    };
  }

  public clearAll(): void {
    this.cacheStore.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info("[Cache] Entire cache cleared.");
  }
}

// Export a singleton instance
export const smartCache = new SmartCache();
