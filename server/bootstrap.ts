 import app, { configureStaticAssets } from "./app.js";
import { env } from "./security/index.js";
import { dbService } from "./db/index.js";
import { startBackgroundAgent, initializeScheduler } from "./piggy/background/agentBackground.js";
import { startJobs } from "./jobs/scheduler.js";
import { logger } from "./logger.js";
 export async function bootstrap() {
    try {
      // 1. Configure SPA routing and Vite middlewares
      await configureStaticAssets(app);

      // 2. Start listening on designated port
      const server = app.listen(env.PORT, "0.0.0.0", () => {
        logger.info(`================================================================`);
        logger.info(`   LifeOS Backend Server successfully running on http://localhost:${env.PORT}`);
        logger.info(`================================================================`);

        // 3. Start background agents and periodic cognitive tasks
        const db = dbService.getDatabaseState();
        logger.info("Initializing Piggy background cognitive loop...");
        startBackgroundAgent(db, (data: any) => dbService.saveDatabaseState(data));

        logger.info("Initializing Piggy automation event loops scheduler...");
        initializeScheduler(db, (data: any) => dbService.saveDatabaseState(data));

        // 4. Start standard cron jobs
        startJobs();
      });

      // Process-level uncaught exception handlers (Observability & Reliability)
      process.on("uncaughtException", (error) => {
        logger.error("CRITICAL: Uncaught Exception detected:", error);
        setTimeout(() => process.exit(1), 1000);
      });

      process.on("unhandledRejection", (reason, promise) => {
        logger.error("CRITICAL: Unhandled Promise Rejection at:", promise, "reason:", reason);
      });

      // Graceful Shutdown Sequence
      const gracefulShutdown = (signal: string) => {
        logger.warn(`Received ${signal}. Initiating graceful server shutdown...`);
        server.close(() => {
          logger.info("HTTP Server closed. Process terminating cleanly.");
          process.exit(0);
        });

        // Force terminate after 10 seconds if connections hang open
        setTimeout(() => {
          logger.error("Graceful shutdown timeout exceeded. Enforcing immediate exit.");
          process.exit(1);
        }, 10000).unref();
      };

      process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
      process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    } catch (error) {
      logger.error("Failed to bootstrap LifeOS server:", error);
      process.exit(1);
    }
  }

  bootstrap();