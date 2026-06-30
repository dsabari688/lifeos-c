import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { dbService } from "../db/index.js";
import { repository } from "../db/repository.js";
import { metrics } from "../monitoring/metrics.js";
import { smartCache } from "../db/cache.js";

const router = express.Router();

router.get("/api/admin/metrics", authenticateToken, authorize("Admin"), (req: any, res: any) => {
  const db = dbService.getDatabaseState();
  const totalUsers = db.users?.length || 0;
  const activeUserData = Object.keys(db.userData || {}).length;
  const detailedMetrics = metrics.getMetrics();

  res.json({
    success: true,
    metrics: {
      totalUsers,
      activeUserData,
      uptime: detailedMetrics.uptime,
      memoryUsage: detailedMetrics.memoryUsage,
      dbReads: detailedMetrics.dbReads,
      dbWrites: detailedMetrics.dbWrites,
      cacheHits: detailedMetrics.cacheHits,
      cacheMisses: detailedMetrics.cacheMisses,
      cacheStats: smartCache.getStats(),
      averageResponseTime: detailedMetrics.averageResponseTime,
      slowEndpoints: detailedMetrics.slowEndpoints
    }
  });
});

router.post("/api/admin/backup", authenticateToken, authorize("Admin"), async (req: any, res: any) => {
  try {
    const backupPath = await repository.runBackup();
    res.json({ success: true, message: `Backup created successfully at ${backupPath}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
