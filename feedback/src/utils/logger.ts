import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(meta).length > 0) {
    msg += ` ${JSON.stringify(meta, null, 2)}`;
  }
  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    config.logging.format === 'json' ? json() : devFormat
  ),
  defaultMeta: {
    service: 'feedback-collector',
    version: '1.0.0',
  },
  transports: [
    new winston.transports.Console({
      format: config.nodeEnv === 'development' 
        ? combine(colorize(), devFormat)
        : json()
    }),
  ],
});

// Add file transport in production
if (config.nodeEnv === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: json()
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: json()
  }));
}

// Create child loggers for different modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

export default logger;
