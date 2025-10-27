/**
 * Logger utility for AgentMesh Cloud Orchestrator
 * Centralized logging configuration using Winston
 */

import winston from 'winston';
import { config } from '@/config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: config.logging.level,
    format: config.logging.format === 'json' 
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      : format,
  }),
];

// Add file transport if enabled
if (config.logging.file.enabled) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.file.path,
      level: config.logging.level,
      maxsize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Log uncaught exceptions
logger.exceptions.handle(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  })
);

// Log unhandled promise rejections
logger.rejections.handle(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  })
);

// Export logger instance
export default logger;