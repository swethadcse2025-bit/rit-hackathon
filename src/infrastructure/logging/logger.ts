import * as winston from "winston";
import * as path from "path";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "surgisense-ai-backend" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          return `[${timestamp}] ${level}: ${message} ${stack ? `\n${stack}` : ""} ${Object.keys(meta).length > 1 ? JSON.stringify(meta) : ""}`;
        })
      )
    }),
    new winston.transports.File({ 
      filename: path.join("logs", "error.log"), 
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: path.join("logs", "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});
