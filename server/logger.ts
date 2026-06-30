import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";
import { AsyncLocalStorage } from "async_hooks";

// Create storage context for tracing request IDs across async boundaries
export const loggerStorage = new AsyncLocalStorage<{ requestId: string }>();

const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format to append Request ID automatically if inside execution context
const traceFormat = winston.format((info) => {
  const store = loggerStorage.getStore();
  if (store && store.requestId) {
    info.requestId = store.requestId;
  } else {
    info.requestId = "system";
  }
  return info;
});

const logFormat = winston.format.combine(
  traceFormat(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  traceFormat(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, stack }) => {
    const traceStr = requestId && requestId !== "system" ? ` [TraceID: ${requestId}]` : "";
    return `[${timestamp}] [${level}]${traceStr}: ${message}${stack ? `\n${stack}` : ""}`;
  })
);

export const winstonLogger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    // Rotated file transport for info and general logs
    new DailyRotateFile({
      filename: path.join(logsDir, "info-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "info"
    }),
    // Rotated file transport specifically for errors
    new DailyRotateFile({
      filename: path.join(logsDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error"
    })
  ]
});

// Adapter export to support existing calls to logger.info, logger.error, etc.
export const logger = {
  info: (message: string, ...args: any[]) => {
    const formatted = args.length > 0 ? `${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}` : message;
    winstonLogger.info(formatted);
  },
  warn: (message: string, ...args: any[]) => {
    const formatted = args.length > 0 ? `${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}` : message;
    winstonLogger.warn(formatted);
  },
  error: (message: string, ...args: any[]) => {
    const formatted = args.length > 0 ? `${message} ${args.map(a => typeof a === 'object' ? (a instanceof Error ? a.stack : JSON.stringify(a)) : a).join(' ')}` : message;
    winstonLogger.error(formatted);
  },
  debug: (message: string, ...args: any[]) => {
    const formatted = args.length > 0 ? `${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}` : message;
    winstonLogger.debug(formatted);
  }
};
