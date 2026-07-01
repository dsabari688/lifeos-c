import { describe, it, expect, vi, beforeEach } from 'vitest';
import { metrics } from './metrics.js';
import { logger } from '../logger.js';

vi.mock('../logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }
}));

describe('MetricsTracker', () => {
  beforeEach(() => {
    (metrics as any).dbReads = 0;
    (metrics as any).dbWrites = 0;
    (metrics as any).cacheHits = 0;
    (metrics as any).cacheMisses = 0;
    (metrics as any).responseTimes = [];
    (metrics as any).slowEndpoints = [];
    vi.clearAllMocks();
  });

  it('should initialize with default zero values', () => {
    const data = metrics.getMetrics();
    expect(data.dbReads).toBe(0);
    expect(data.dbWrites).toBe(0);
    expect(data.cacheHits).toBe(0);
    expect(data.cacheMisses).toBe(0);
    expect(data.averageResponseTime).toBe(0);
    expect(data.slowEndpoints).toEqual([]);
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(data.memoryUsage.rss).toBeGreaterThan(0);
  });

  it('should record db reads and writes', () => {
    metrics.recordDbRead();
    metrics.recordDbRead();
    metrics.recordDbWrite();
    const data = metrics.getMetrics();
    expect(data.dbReads).toBe(2);
    expect(data.dbWrites).toBe(1);
  });

  it('should record cache hits and misses', () => {
    metrics.recordCacheHit();
    metrics.recordCacheMiss();
    metrics.recordCacheMiss();
    const data = metrics.getMetrics();
    expect(data.cacheHits).toBe(1);
    expect(data.cacheMisses).toBe(2);
  });

  it('should calculate average response time correctly', () => {
    metrics.recordResponseTime('/api/tasks', 40);
    metrics.recordResponseTime('/api/tasks', 45);
    expect(metrics.getAverageResponseTime()).toBe(42.5);
  });

  it('should handle responseTimes shift when exceeding 500 entries', () => {
    for (let i = 0; i < 505; i++) {
      metrics.recordResponseTime('/api/auth', 10);
    }
    const internalResponseTimes = (metrics as any).responseTimes;
    expect(internalResponseTimes.length).toBe(500);
  });

  it('should trigger SLA warning and record slow endpoint when threshold is breached', () => {
    // /api/tasks threshold is 50ms, so 60ms should breach it
    metrics.recordResponseTime('/api/tasks', 60);

    const data = metrics.getMetrics();
    expect(data.slowEndpoints).toHaveLength(1);
    expect(data.slowEndpoints[0].endpoint).toBe('/api/tasks');
    expect(data.slowEndpoints[0].duration).toBe(60);
    expect(data.slowEndpoints[0].timestamp).toBeDefined();

    // Verify logger warning
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[SLA VIOLATION] Endpoint /api/tasks completed in 60ms')
    );
  });

  it('should support different SLA thresholds for different endpoints', () => {
    // /api/jarvis/chat SLA threshold is 15000ms. A 1000ms call should NOT violate it.
    metrics.recordResponseTime('/api/jarvis/chat', 1000);
    expect(metrics.getMetrics().slowEndpoints).toHaveLength(0);

    // /api/piggy/dashboard SLA threshold is 100ms. A 150ms call should violate it.
    metrics.recordResponseTime('/api/piggy/dashboard', 150);
    expect(metrics.getMetrics().slowEndpoints).toHaveLength(1);
  });

  it('should shift slowEndpoints when exceeding 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      metrics.recordResponseTime('/api/tasks', 100);
    }
    const data = metrics.getMetrics();
    expect(data.slowEndpoints.length).toBe(50);
  });
});
