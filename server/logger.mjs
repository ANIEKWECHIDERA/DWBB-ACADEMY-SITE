import fs from "node:fs";
import path from "node:path";

import winston from "winston";

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
const logDir = path.resolve(process.env.LOG_DIR || path.join(process.cwd(), "server/logs"));

fs.mkdirSync(logDir, { recursive: true });

const loggerFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: {
    service: "dwbb-academy-server",
    environment: process.env.NODE_ENV || "development",
  },
  format: loggerFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logDir, "exceptions.log"),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logDir, "rejections.log"),
    }),
  ],
});

export function childLogger(meta = {}) {
  return logger.child(meta);
}
